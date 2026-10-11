/* Sound: files from GAME_CONFIG.sounds when given, otherwise every effect and
   the music loop are synthesized with WebAudio (zero audio files needed). */
window.Sound = (() => {
  const C = window.GAME_CONFIG;
  let ctx = null, sfxBus = null, musicBus = null;
  let sfxOn = true, musicOn = true, unlocked = false, rate = 1;
  const fileCache = {};
  let musicEl = null, musicTimer = null, musicStep = 0, nextNoteTime = 0;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      const comp = ctx.createDynamicsCompressor();
      comp.connect(ctx.destination);
      sfxBus = ctx.createGain(); sfxBus.gain.value = 0.6; sfxBus.connect(comp);
      musicBus = ctx.createGain(); musicBus.gain.value = 0.1; musicBus.connect(comp);
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }
  function tone(freq, dur, { type = "sine", vol = 0.3, slide = null, delay = 0, bus = sfxBus, attack = 0.005 } = {}) {
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, { vol = 0.2, freq = 1200, q = 0.8, delay = 0, sweep = null, type = "bandpass" } = {}) {
    const t = ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(freq, t);
    if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(sfxBus);
    src.start(t);
  }
  const semis = n => Math.pow(2, n / 12);
  // major pentatonic ladder: each perfect in a streak climbs one step
  const LADDER = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28, 31, 33, 36];

  const synth = {
    click() { tone(700, 0.05, { type: "square", vol: 0.05 }); tone(1050, 0.05, { type: "triangle", vol: 0.06, delay: 0.03 }); },
    place() {
      tone(180, 0.1, { type: "sine", vol: 0.4, slide: 90 });
      noise(0.05, { vol: 0.15, freq: 1400, q: 1.2 });
    },
    chop() {
      noise(0.12, { vol: 0.28, freq: 2600, sweep: 700, q: 1.4 });
      tone(140, 0.12, { type: "triangle", vol: 0.25, slide: 70 });
    },
    perfect(streak = 1) {
      const f = 392 * semis(LADDER[Math.min(streak - 1, LADDER.length - 1)]);
      tone(f, 0.35, { type: "triangle", vol: 0.22 });
      tone(f * 2, 0.25, { type: "sine", vol: 0.08, delay: 0.02 });
      if (streak >= 4) tone(f * 1.5, 0.3, { type: "sine", vol: 0.07, delay: 0.06 });
      tone(160, 0.08, { type: "sine", vol: 0.25, slide: 90 });
    },
    miss() {
      noise(0.5, { vol: 0.25, freq: 900, sweep: 120, q: 0.8 });
      [0, -3, -7, -12].forEach((s, i) => tone(330 * semis(s), 0.3, { type: "triangle", vol: 0.14, delay: 0.1 + i * 0.13 }));
    },
    coin() { tone(1319, 0.08, { type: "square", vol: 0.06 }); tone(1760, 0.2, { type: "square", vol: 0.06, delay: 0.07 }); },
    power() { [0, 7, 12, 19].forEach((s, i) => tone(523 * semis(s), 0.18, { type: "sine", vol: 0.14, delay: i * 0.05 })); noise(0.4, { vol: 0.06, freq: 5000, q: 0.5 }); },
    slowmo() { tone(600, 0.6, { type: "sine", vol: 0.18, slide: 150 }); noise(0.6, { vol: 0.08, freq: 2000, sweep: 300, q: 1 }); },
    shield() { tone(880, 0.25, { type: "triangle", vol: 0.15, slide: 1320 }); tone(1320, 0.4, { type: "sine", vol: 0.08, delay: 0.1 }); },
    whoosh() { noise(0.35, { vol: 0.15, freq: 300, sweep: 3000, q: 0.9 }); },
    newbest() { [0, 4, 7, 12, 16].forEach((s, i) => tone(523 * semis(s), 0.18, { type: "square", vol: 0.06, delay: i * 0.07 })); },
    unlock() { [0, 7, 12, 16, 19].forEach((s, i) => tone(523 * semis(s), 0.2, { type: "square", vol: 0.05, delay: i * 0.07 })); },
    milestone() {
      [0, 4, 7, 12, 7, 12, 16, 19, 24].forEach((s, i) => tone(392 * semis(s), 0.22, { type: "triangle", vol: 0.15, delay: i * 0.07 }));
      noise(0.8, { vol: 0.05, freq: 7000, q: 0.5, delay: 0.4 });
    }
  };

  function play(name, arg) {
    if (!sfxOn) return;
    const file = C.sounds && C.sounds[name];
    if (file) {
      try {
        const base = fileCache[name] || (fileCache[name] = new Audio(file));
        const a = base.cloneNode(); a.volume = 0.7; a.play().catch(() => {});
        return;
      } catch (e) { /* fall back to synth */ }
    }
    if (!ensure() || !synth[name]) return;
    synth[name](arg);
  }

  // ---- music: airy lo-fi loop (Fmaj7 Em7 Dm7 Cmaj7) ------------------------
  const BPM = 84;
  const chords = [[5, 9, 12, 16], [4, 7, 11, 14], [2, 5, 9, 12], [0, 4, 7, 11]];
  function scheduleMusic() {
    const STEP = 60 / (BPM * rate) / 2;
    while (nextNoteTime < ctx.currentTime + 0.25) {
      const bar = Math.floor(musicStep / 8) % chords.length, ch = chords[bar];
      const delay = nextNoteTime - ctx.currentTime;
      if (musicStep % 8 === 0) {
        tone(65.4 * semis(ch[0]), 1.6, { type: "sine", vol: 0.5, bus: musicBus, delay });
        ch.forEach(n => tone(261.6 * semis(n), 1.5, { type: "sine", vol: 0.07, bus: musicBus, delay, attack: 0.3 }));
      }
      if (musicStep % 2 === 1 && Math.random() < 0.7) {
        const n = ch[Math.floor(Math.random() * 4)] + 12;
        tone(261.6 * semis(n), 0.3, { type: "triangle", vol: 0.12, bus: musicBus, delay });
      }
      musicStep++;
      nextNoteTime += STEP;
    }
  }
  function startMusic() {
    if (!musicOn) return;
    if (C.sounds && C.sounds.music) {
      if (!musicEl) { musicEl = new Audio(C.sounds.music); musicEl.loop = true; musicEl.volume = 0.35; }
      musicEl.play().catch(() => {});
      return;
    }
    if (!ensure() || musicTimer) return;
    nextNoteTime = ctx.currentTime + 0.05;
    musicTimer = setInterval(scheduleMusic, 80);
  }
  function stopMusic() {
    if (musicEl) musicEl.pause();
    if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
  }
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { stopMusic(); if (ctx) ctx.suspend(); }
    else if (musicOn && unlocked) { if (ctx) ctx.resume(); startMusic(); }
  });
  function unlock() { if (unlocked) return; unlocked = true; ensure(); startMusic(); }
  ["pointerdown", "keydown"].forEach(ev => window.addEventListener(ev, unlock, { passive: true }));

  return {
    play,
    setSfx(on) { sfxOn = on; },
    setMusic(on) { musicOn = on; on && unlocked ? startMusic() : stopMusic(); },
    // slow-mo drags the music tempo down
    setRate(r) { rate = r; if (musicEl) musicEl.playbackRate = r; }
  };
})();

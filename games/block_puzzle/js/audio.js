/* Sound: files from GAME_CONFIG.sounds when given, otherwise every effect and
   the music loop are synthesized with WebAudio (zero audio files needed). */
window.Sound = (() => {
  const C = window.GAME_CONFIG;
  let ctx = null, sfxBus = null, musicBus = null;
  let sfxOn = true, musicOn = true, unlocked = false;
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

  const synth = {
    click() { tone(700, 0.05, { type: "square", vol: 0.05 }); tone(1050, 0.05, { type: "triangle", vol: 0.06, delay: 0.03 }); },
    pick() { tone(520, 0.08, { type: "triangle", vol: 0.12, slide: 780 }); },
    place() {
      tone(150, 0.12, { type: "sine", vol: 0.45, slide: 70 });
      noise(0.06, { vol: 0.18, freq: 900, q: 1.5 });
      tone(880, 0.05, { type: "triangle", vol: 0.06, delay: 0.01 });
    },
    invalid() { tone(180, 0.12, { type: "square", vol: 0.06, slide: 120 }); },
    clear({ lines = 1, combo = 1 } = {}) {
      // rising arpeggio: more lines = more notes, higher combo = higher key
      const root = 392 * semis(Math.min(combo - 1, 10));
      const steps = [0, 4, 7, 12, 16, 19, 24];
      for (let i = 0; i < Math.min(2 + lines, steps.length); i++)
        tone(root * semis(steps[i]), 0.22, { type: "triangle", vol: 0.16, delay: i * 0.045 });
      noise(0.35, { vol: 0.12, freq: 5000, sweep: 1500, q: 0.6 });
      tone(90, 0.25, { type: "sine", vol: 0.3, slide: 45 });
    },
    praise(level = 2) {
      const ch = level >= 4 ? [0, 4, 7, 11, 14] : [0, 4, 7, 12];
      ch.forEach((s, i) => tone(523 * semis(s), 0.4, { type: "sawtooth", vol: 0.04, delay: i * 0.02 }));
      ch.forEach((s, i) => tone(523 * semis(s), 0.35, { type: "triangle", vol: 0.08, delay: 0.12 + i * 0.05 }));
    },
    gem() { tone(1568, 0.1, { type: "sine", vol: 0.15 }); tone(2093, 0.25, { type: "sine", vol: 0.12, delay: 0.06 }); },
    star(i = 0) { tone(659 * semis(i * 4), 0.3, { type: "triangle", vol: 0.18 }); tone(1318 * semis(i * 4), 0.3, { type: "sine", vol: 0.08, delay: 0.04 }); },
    win() {
      [0, 4, 7, 12, 7, 12, 16, 19, 24].forEach((s, i) => tone(392 * semis(s), 0.22, { type: "triangle", vol: 0.15, delay: i * 0.08 }));
      noise(0.8, { vol: 0.05, freq: 7000, q: 0.5, delay: 0.4 });
    },
    unlock() { [0, 7, 12, 16, 19].forEach((s, i) => tone(523 * semis(s), 0.2, { type: "square", vol: 0.05, delay: i * 0.07 })); },
    newbest() { [0, 4, 7, 12, 16].forEach((s, i) => tone(523 * semis(s), 0.18, { type: "square", vol: 0.06, delay: i * 0.07 })); },
    gameover() { [7, 3, 0, -5].forEach((s, i) => tone(330 * semis(s), 0.35, { type: "triangle", vol: 0.16, delay: i * 0.17 })); },
    bomb() {
      noise(0.6, { vol: 0.5, freq: 400, sweep: 60, q: 0.5, type: "lowpass" });
      tone(110, 0.5, { type: "sine", vol: 0.5, slide: 35 });
    },
    rotate() { noise(0.15, { vol: 0.12, freq: 800, sweep: 2600, q: 1.5 }); tone(660, 0.08, { type: "triangle", vol: 0.08, delay: 0.05 }); },
    whoosh() { noise(0.35, { vol: 0.15, freq: 300, sweep: 3000, q: 0.9 }); },
    coin() { tone(1319, 0.08, { type: "square", vol: 0.06 }); tone(1760, 0.2, { type: "square", vol: 0.06, delay: 0.07 }); }
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

  // ---- music: chill arcade loop in A minor (Am F C G) ----------------------
  const BPM = 96, STEP = 60 / BPM / 4; // sixteenth notes
  const chords = [[-3, 0, 4], [-7, -3, 0], [0, 4, 7], [-5, -1, 2]];
  const arp = [0, 1, 2, 1, 0, 2, 1, 2];
  function scheduleMusic() {
    while (nextNoteTime < ctx.currentTime + 0.2) {
      const bar = Math.floor(musicStep / 16) % chords.length;
      const ch = chords[bar];
      const delay = nextNoteTime - ctx.currentTime;
      if (musicStep % 16 === 0) tone(110 * semis(ch[0] + 12 - 12), 0.9, { type: "triangle", vol: 0.5, bus: musicBus, delay });
      if (musicStep % 8 === 4) tone(110 * semis(ch[0]), 0.3, { type: "sine", vol: 0.35, bus: musicBus, delay });
      if (musicStep % 2 === 0) tone(440 * semis(ch[arp[(musicStep >> 1) % 8]]), 0.16, { type: "sine", vol: 0.22, bus: musicBus, delay });
      if (musicStep % 4 === 2) {
        // soft hat
        const t = ctx.currentTime + delay;
        const len = Math.floor(ctx.sampleRate * 0.03), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
        const s = ctx.createBufferSource(); s.buffer = buf;
        const f = ctx.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 7000;
        const g = ctx.createGain(); g.gain.value = 0.25;
        s.connect(f); f.connect(g); g.connect(musicBus); s.start(t);
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
    musicTimer = setInterval(scheduleMusic, 60);
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
    setMusic(on) { musicOn = on; on && unlocked ? startMusic() : stopMusic(); }
  };
})();

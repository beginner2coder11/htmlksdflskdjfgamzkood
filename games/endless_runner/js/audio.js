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
  const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];

  const synth = {
    click() { tone(800, 0.05, { type: "triangle", vol: 0.08 }); },
    jump() { tone(300, 0.14, { type: "square", vol: 0.07, slide: 620 }); },
    djump() { tone(420, 0.16, { type: "square", vol: 0.07, slide: 900 }); noise(0.12, { vol: 0.05, freq: 3000, q: 1 }); },
    land() { noise(0.06, { vol: 0.08, freq: 500, q: 0.8 }); },
    // consecutive coins climb the scale
    coin(chain = 0) { const f = 988 * semis(SCALE[Math.min(chain, SCALE.length - 1)]); tone(f, 0.07, { type: "square", vol: 0.05 }); tone(f * 1.5, 0.12, { type: "square", vol: 0.045, delay: 0.05 }); },
    stomp() { tone(260, 0.12, { type: "square", vol: 0.1, slide: 120 }); tone(700, 0.12, { type: "triangle", vol: 0.1, delay: 0.05, slide: 1100 }); },
    hit() { noise(0.4, { vol: 0.35, freq: 500, sweep: 90, q: 0.6, type: "lowpass" }); tone(200, 0.4, { type: "sawtooth", vol: 0.1, slide: 60 }); },
    slide() { noise(0.25, { vol: 0.08, freq: 1500, sweep: 600, q: 0.7 }); },
    power() { [0, 4, 7, 12, 16].forEach((s, i) => tone(523 * semis(s), 0.14, { type: "triangle", vol: 0.12, delay: i * 0.05 })); },
    shield() { tone(400, 0.3, { type: "sine", vol: 0.18, slide: 1200 }); tone(1500, 0.3, { type: "sine", vol: 0.06, delay: 0.1 }); },
    rocket() { noise(1.2, { vol: 0.2, freq: 300, sweep: 1600, q: 0.5 }); tone(110, 1, { type: "sawtooth", vol: 0.05, slide: 220 }); },
    whoosh() { noise(0.35, { vol: 0.12, freq: 300, sweep: 3000, q: 0.9 }); },
    newbest() { [0, 4, 7, 12, 16].forEach((s, i) => tone(523 * semis(s), 0.18, { type: "square", vol: 0.06, delay: i * 0.07 })); },
    milestone() { [0, 4, 7, 12, 7, 12, 16, 19].forEach((s, i) => tone(392 * semis(s), 0.2, { type: "triangle", vol: 0.14, delay: i * 0.07 })); },
    unlock() { [0, 7, 12, 16, 19].forEach((s, i) => tone(523 * semis(s), 0.2, { type: "square", vol: 0.05, delay: i * 0.07 })); }
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

  // ---- music: upbeat chiptune loop (C G Am F) --------------------------------
  const BPM = 132;
  const prog = [[0, 4, 7], [7, 11, 14], [9, 12, 16], [5, 9, 12]];
  const mel = [12, 14, 16, 19, 16, 14, 12, 7, 9, 12, 14, 12, 9, 7, 4, 7];
  function scheduleMusic() {
    const STEP = 60 / (BPM * rate) / 2;
    while (nextNoteTime < ctx.currentTime + 0.2) {
      const bar = Math.floor(musicStep / 8) % prog.length, ch = prog[bar];
      const delay = nextNoteTime - ctx.currentTime;
      if (musicStep % 2 === 0) tone(65.4 * semis(ch[0] > 6 ? ch[0] - 12 : ch[0]), 0.16, { type: "triangle", vol: 0.55, bus: musicBus, delay });
      tone(261.6 * semis(ch[musicStep % 3]), 0.07, { type: "square", vol: 0.06, bus: musicBus, delay });
      if (Math.floor(musicStep / 16) % 2 === 1 && musicStep % 2 === 0) tone(523 * semis(mel[(musicStep >> 1) % 16] - 12), 0.14, { type: "square", vol: 0.07, bus: musicBus, delay });
      if (musicStep % 4 === 2) {
        const t = ctx.currentTime + delay, len = Math.floor(ctx.sampleRate * 0.04), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
        const s = ctx.createBufferSource(); s.buffer = buf; const g = ctx.createGain(); g.gain.value = 0.35;
        const f = ctx.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 6000;
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
    setMusic(on) { musicOn = on; on && unlocked ? startMusic() : stopMusic(); },
    setRate(r) { rate = r; if (musicEl) musicEl.playbackRate = r; }
  };
})();

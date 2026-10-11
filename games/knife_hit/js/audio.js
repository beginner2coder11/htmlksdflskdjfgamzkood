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
      sfxBus = ctx.createGain(); sfxBus.gain.value = 0.55; sfxBus.connect(comp);
      musicBus = ctx.createGain(); musicBus.gain.value = 0.08; musicBus.connect(comp);
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
  function noise(dur, { vol = 0.2, freq = 1200, q = 0.8, delay = 0, sweep = null, type = "bandpass", bus = null } = {}) {
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
    src.connect(f); f.connect(g); g.connect(bus || sfxBus);
    src.start(t);
  }
  const semis = n => Math.pow(2, n / 12);

  const synth = {
    click() { tone(800, 0.05, { type: "triangle", vol: 0.08 }); },
    throw() { noise(0.12, { vol: 0.14, freq: 1800, sweep: 5000, q: 1.2 }); },
    // woody thunk; pitch creeps up as the target fills (n = knives stuck)
    hit(n = 0) { const f = 140 + Math.min(12, n || 0) * 8; tone(f, 0.12, { type: "triangle", vol: 0.35, slide: f * 0.6 }); noise(0.08, { vol: 0.22, freq: 900, q: 1.4 }); tone(1800, 0.04, { type: "square", vol: 0.03 }); },
    clang() { [1, 2.76, 5.4].forEach((m, i) => tone(620 * m, 0.5 - i * 0.12, { type: "sine", vol: 0.16 / (i + 1) })); noise(0.15, { vol: 0.2, freq: 5000, q: 2 }); },
    apple() { noise(0.12, { vol: 0.22, freq: 2600, q: 0.9, sweep: 900 }); tone(990, 0.08, { type: "sine", vol: 0.08, delay: 0.04 }); tone(1480, 0.1, { type: "sine", vol: 0.06, delay: 0.09 }); },
    break() { noise(0.5, { vol: 0.35, freq: 700, sweep: 120, q: 0.7, type: "lowpass" }); noise(0.25, { vol: 0.2, freq: 2400, q: 1 }); [0, 4, 7, 12].forEach((s2, i) => tone(523 * semis(s2), 0.16, { type: "square", vol: 0.05, delay: 0.12 + i * 0.05 })); },
    boss() { [0, 0, 3, 7].forEach((s2, i) => tone(110 * semis(s2), 0.28, { type: "sawtooth", vol: 0.1, delay: i * 0.16 })); noise(0.6, { vol: 0.12, freq: 300, q: 0.6, type: "lowpass", delay: 0.48 }); },
    coin() { tone(988, 0.07, { type: "square", vol: 0.05 }); tone(1319, 0.16, { type: "square", vol: 0.05, delay: 0.06 }); },
    win() { [0, 4, 7, 12, 16, 19, 24].forEach((s2, i) => tone(523 * semis(s2), 0.22, { type: "square", vol: 0.05, delay: i * 0.07 })); },
    over() { [0, -3, -7, -12].forEach((s2, i) => tone(330 * semis(s2), 0.3, { type: "triangle", vol: 0.12, delay: i * 0.13 })); },
    unlock() { [0, 7, 12, 16, 19].forEach((s2, i) => tone(523 * semis(s2), 0.2, { type: "square", vol: 0.05, delay: i * 0.07 })); }
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

  // ---- music: driving minor groove (Am F G Em) -----------------------------
  const BPM = 116;
  const prog = [[-3, 0, 4], [-7, -3, 0], [-5, -1, 2], [-8, -5, -1]];
  function scheduleMusic() {
    const STEP = 60 / BPM / 4;
    while (nextNoteTime < ctx.currentTime + 0.2) {
      const bar = Math.floor(musicStep / 16), ch = prog[bar % prog.length], st = musicStep % 16;
      const delay = nextNoteTime - ctx.currentTime;
      if (st % 4 === 0) { tone(55 * semis(ch[0] + 12), 0.18, { type: "sine", vol: 0.6, bus: musicBus, delay, slide: 40 }); }
      if (st % 2 === 1) tone(110 * semis(ch[0]), 0.1, { type: "sawtooth", vol: 0.12, bus: musicBus, delay });
      if (st % 8 === 4) noise(0.08, { vol: 0.5, freq: 3000, q: 0.8, delay, bus: musicBus });
      if (bar % 2 === 1 && (st === 0 || st === 3 || st === 6 || st === 10)) tone(440 * semis(ch[(st >> 1) % 3]), 0.16, { type: "triangle", vol: 0.12, bus: musicBus, delay });
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

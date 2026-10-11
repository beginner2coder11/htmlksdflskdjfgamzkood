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
    click() { tone(800, 0.05, { type: "triangle", vol: 0.08 }); },
    // a glassy "tick" as the ball lifts
    pick() { tone(1250, 0.07, { type: "sine", vol: 0.12, slide: 1650 }); tone(2500, 0.04, { type: "sine", vol: 0.04 }); },
    // the ball clacks lower the deeper it falls (k = slot index)
    drop(k = 0) { const f = 520 + (k || 0) * 90; tone(f, 0.09, { type: "triangle", vol: 0.16, slide: f * 0.7 }); noise(0.04, { vol: 0.08, freq: 3000, q: 2 }); },
    // water: bubbly glug
    pour() { for (let i = 0; i < 5; i++) tone(300 + Math.random() * 300, 0.08, { type: "sine", vol: 0.1, slide: 600 + Math.random() * 400, delay: i * 0.07 }); noise(0.4, { vol: 0.06, freq: 900, q: 1.5 }); },
    reveal() { tone(660, 0.08, { type: "triangle", vol: 0.08 }); tone(990, 0.1, { type: "triangle", vol: 0.08, delay: 0.06 }); },
    tube() { [0, 4, 7, 12].forEach((s, i) => tone(784 * semis(s), 0.22, { type: "sine", vol: 0.12, delay: i * 0.055 })); tone(3136, 0.3, { type: "sine", vol: 0.04, delay: 0.22 }); },
    nope() { tone(220, 0.12, { type: "square", vol: 0.06, slide: 160 }); tone(180, 0.14, { type: "square", vol: 0.05, delay: 0.08, slide: 120 }); },
    undo() { noise(0.2, { vol: 0.1, freq: 2400, sweep: 600, q: 1 }); tone(700, 0.12, { type: "sine", vol: 0.06, slide: 420 }); },
    coin() { tone(988, 0.07, { type: "square", vol: 0.05 }); tone(1319, 0.16, { type: "square", vol: 0.05, delay: 0.06 }); },
    star(i = 0) { tone(880 * semis((i || 0) * 4), 0.25, { type: "triangle", vol: 0.13 }); tone(1760 * semis((i || 0) * 4), 0.2, { type: "sine", vol: 0.05, delay: 0.03 }); },
    win() { [0, 4, 7, 12, 16, 19, 24].forEach((s, i) => tone(523 * semis(s), 0.22, { type: "square", vol: 0.05, delay: i * 0.07 })); [0, 4, 7].forEach(s => tone(523 * semis(s + 12), 0.8, { type: "triangle", vol: 0.06, delay: 0.5 })); },
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

  // ---- music: gentle marimba loop (C Am F G) --------------------------------
  const BPM = 92;
  const prog = [[0, 4, 7], [-3, 0, 4], [-7, -3, 0], [-5, -1, 2]];
  const melody = [12, -1, 7, -1, 9, 7, -1, 4, 5, -1, 4, 2, -1, 0, -1, -1];
  function scheduleMusic() {
    const STEP = 60 / BPM / 4;
    while (nextNoteTime < ctx.currentTime + 0.2) {
      const bar = Math.floor(musicStep / 16), ch = prog[bar % prog.length], s = musicStep % 16;
      const delay = nextNoteTime - ctx.currentTime;
      if (s === 0 || s === 8) tone(130.8 * semis(ch[0]), 0.5, { type: "sine", vol: 0.5, bus: musicBus, delay });
      if (s % 4 === 2) ch.forEach((n, i) => tone(261.6 * semis(n), 0.25, { type: "triangle", vol: 0.12, bus: musicBus, delay: delay + i * 0.012 }));
      const m = melody[(s + bar * 3) % 16];
      if (m >= 0 && bar % 2 === 1) tone(523.3 * semis(m + ch[0] % 12), 0.3, { type: "sine", vol: 0.16, bus: musicBus, delay });
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

/* Sound: files from GAME_CONFIG.sounds when given, otherwise every effect and
   the music loop are synthesized with WebAudio (zero audio files needed). */
window.Sound = (() => {
  const C = window.GAME_CONFIG;
  let ctx = null, sfxBus = null, musicBus = null;
  let sfxOn = true, musicOn = true, unlocked = false, intense = false;
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
      musicBus = ctx.createGain(); musicBus.gain.value = 0.09; musicBus.connect(comp);
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
  function noise(dur, { vol = 0.2, freq = 1200, q = 0.8, delay = 0, sweep = null } = {}) {
    const t = ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.Q.value = q;
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
    select() { tone(660, 0.06, { type: "square", vol: 0.05 }); },
    tick(urgent) { tone(urgent ? 1400 : 1000, 0.04, { type: "square", vol: urgent ? 0.07 : 0.035 }); },
    correct(streak = 1) {
      const up = Math.min(streak - 1, 7);
      [0, 4, 7, 12].forEach((s, i) => tone(523 * semis(s + up), 0.22, { type: "triangle", vol: 0.15, delay: i * 0.06 }));
      noise(0.3, { vol: 0.05, freq: 6000, q: 0.6, delay: 0.15 });
    },
    wrong() { tone(300, 0.18, { type: "sawtooth", vol: 0.08, slide: 160 }); tone(200, 0.3, { type: "square", vol: 0.06, delay: 0.12, slide: 110 }); },
    timeup() { [0, -4, -8].forEach((s, i) => tone(440 * semis(s), 0.2, { type: "square", vol: 0.06, delay: i * 0.12 })); },
    start() { [0, 0, 0, 12].forEach((s, i) => tone(523 * semis(s), i === 3 ? 0.4 : 0.12, { type: "square", vol: 0.07, delay: i * 0.4 })); },
    streak(n = 3) { [0, 7, 12, 16, 19].slice(0, Math.min(5, n)).forEach((s, i) => tone(784 * semis(s), 0.15, { type: "sine", vol: 0.1, delay: i * 0.04 })); },
    lifeline() { tone(500, 0.25, { type: "sine", vol: 0.12, slide: 1200 }); noise(0.25, { vol: 0.06, freq: 3000, q: 1 }); },
    whoosh() { noise(0.3, { vol: 0.12, freq: 400, sweep: 3000, q: 0.9 }); },
    coin() { tone(1319, 0.08, { type: "square", vol: 0.06 }); tone(1760, 0.2, { type: "square", vol: 0.06, delay: 0.07 }); },
    levelup() {
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

  // ---- music: bouncy game-show loop; setIntense() adds drive during questions ----
  const BPM = 112, STEP = 60 / BPM / 2;
  const bass = [0, 0, 7, 7, 5, 5, 7, 4];
  const lead = [12, null, 16, 19, null, 16, 14, null, 12, null, 16, 19, 21, 19, 16, 14];
  function scheduleMusic() {
    while (nextNoteTime < ctx.currentTime + 0.2) {
      const delay = nextNoteTime - ctx.currentTime;
      const b = bass[Math.floor(musicStep / 4) % bass.length];
      if (musicStep % 2 === 0) tone(98 * semis(b), 0.22, { type: "triangle", vol: 0.5, bus: musicBus, delay });
      if (intense && musicStep % 2 === 1) tone(196 * semis(b + 7), 0.08, { type: "square", vol: 0.12, bus: musicBus, delay });
      const l = lead[musicStep % 16];
      if (l !== null && Math.floor(musicStep / 16) % 2 === 1) tone(392 * semis(l - 12 + b), 0.18, { type: "square", vol: 0.07, bus: musicBus, delay });
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
    setIntense(on) { intense = on; }
  };
})();

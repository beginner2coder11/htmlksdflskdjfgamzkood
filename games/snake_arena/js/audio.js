/* Sound: files from GAME_CONFIG.sounds when given, otherwise every effect and
   the music loop are synthesized with WebAudio (zero audio files needed). */
window.Sound = (() => {
  const C = window.GAME_CONFIG;
  let ctx = null, sfxBus = null, musicBus = null;
  let sfxOn = true, musicOn = true, unlocked = false, rate = 1, lastEat = 0;
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
  const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19];
  let eatStep = 0;

  const synth = {
    click() { tone(800, 0.05, { type: "triangle", vol: 0.08 }); },
    // quick pellets climb a little scale; the step resets after a pause
    eat() {
      const now = ctx.currentTime;
      eatStep = now - lastEat < 0.35 ? (eatStep + 1) % SCALE.length : 0;
      lastEat = now;
      tone(660 * semis(SCALE[eatStep]), 0.06, { type: "sine", vol: 0.07 });
    },
    bigEat() { tone(440, 0.15, { type: "triangle", vol: 0.12, slide: 880 }); tone(1320, 0.1, { type: "sine", vol: 0.06, delay: 0.05 }); },
    boost() { noise(0.25, { vol: 0.1, freq: 400, sweep: 1600, q: 0.8 }); },
    kill() { [0, 4, 7, 12].forEach((s, i) => tone(523 * semis(s), 0.16, { type: "square", vol: 0.07, delay: i * 0.05 })); noise(0.3, { vol: 0.12, freq: 2500, q: 0.6 }); },
    death() { noise(0.6, { vol: 0.3, freq: 600, sweep: 80, q: 0.6, type: "lowpass" }); [0, -3, -7, -12].forEach((s, i) => tone(330 * semis(s), 0.3, { type: "triangle", vol: 0.12, delay: 0.1 + i * 0.12 })); },
    power() { [0, 7, 12, 19].forEach((s, i) => tone(523 * semis(s), 0.16, { type: "sine", vol: 0.13, delay: i * 0.05 })); },
    rankUp() { tone(880, 0.1, { type: "triangle", vol: 0.1 }); tone(1175, 0.18, { type: "triangle", vol: 0.1, delay: 0.08 }); },
    whoosh() { noise(0.35, { vol: 0.12, freq: 300, sweep: 3000, q: 0.9 }); },
    newbest() { [0, 4, 7, 12, 16].forEach((s, i) => tone(523 * semis(s), 0.18, { type: "square", vol: 0.06, delay: i * 0.07 })); },
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

  // ---- music: dark synthwave pulse (Am F C G) ------------------------------
  const BPM = 104;
  const prog = [[-3, 0, 4], [-7, -3, 0], [0, 4, 7], [-5, -1, 2]];
  function scheduleMusic() {
    const STEP = 60 / (BPM * rate) / 4;
    while (nextNoteTime < ctx.currentTime + 0.2) {
      const ch = prog[Math.floor(musicStep / 16) % prog.length];
      const delay = nextNoteTime - ctx.currentTime;
      if (musicStep % 2 === 0) tone(55 * semis(ch[0] + 12), 0.12, { type: "sawtooth", vol: 0.18, bus: musicBus, delay });
      if (musicStep % 4 === 0) tone(110 * semis(ch[0]), 0.3, { type: "sine", vol: 0.45, bus: musicBus, delay });
      if (musicStep % 16 === 0) ch.forEach(n => tone(220 * semis(n), 2.2, { type: "triangle", vol: 0.06, bus: musicBus, delay, attack: 0.4 }));
      if (musicStep % 8 === 6) tone(440 * semis(ch[(musicStep >> 3) % 3] + 12), 0.2, { type: "sine", vol: 0.12, bus: musicBus, delay });
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

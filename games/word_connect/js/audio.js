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
  const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19];

  const synth = {
    click() { tone(800, 0.05, { type: "triangle", vol: 0.08 }); },
    // each extra letter in the chain climbs the scale
    select(i = 0) { const f = 523 * semis(SCALE[Math.min(i, SCALE.length - 1)]); tone(f, 0.18, { type: "triangle", vol: 0.14 }); tone(f * 2, 0.1, { type: "sine", vol: 0.04 }); },
    found(len = 3) {
      [0, 4, 7, 12, 16].slice(0, Math.min(5, len - 1)).forEach((s, i) => tone(659 * semis(s), 0.25, { type: "triangle", vol: 0.13, delay: i * 0.06 }));
      tone(1318, 0.4, { type: "sine", vol: 0.05, delay: 0.1 });
    },
    flip() { tone(1200, 0.04, { type: "square", vol: 0.025 }); },
    wrong() { tone(220, 0.12, { type: "square", vol: 0.06, slide: 160 }); tone(180, 0.18, { type: "square", vol: 0.05, delay: 0.1, slide: 120 }); },
    repeat() { tone(660, 0.1, { type: "sine", vol: 0.1 }); tone(660, 0.1, { type: "sine", vol: 0.1, delay: 0.12 }); },
    bonus() { [0, 7, 12].forEach((s, i) => tone(880 * semis(s), 0.15, { type: "sine", vol: 0.12, delay: i * 0.05 })); },
    coin() { tone(1319, 0.08, { type: "square", vol: 0.06 }); tone(1760, 0.2, { type: "square", vol: 0.06, delay: 0.07 }); },
    hint() { [0, 4, 7, 11, 14].forEach((s, i) => tone(1046 * semis(s), 0.2, { type: "sine", vol: 0.07, delay: i * 0.04 })); noise(0.4, { vol: 0.05, freq: 6000, q: 0.6 }); },
    shuffle() { noise(0.3, { vol: 0.14, freq: 500, sweep: 3000, q: 1 }); },
    complete() {
      [0, 4, 7, 12, 7, 12, 16, 19, 24].forEach((s, i) => tone(392 * semis(s), 0.25, { type: "triangle", vol: 0.15, delay: i * 0.08 }));
      noise(0.9, { vol: 0.05, freq: 7000, q: 0.5, delay: 0.4 });
    },
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

  // ---- music: gentle music-box loop ----------------------------------------
  const BPM = 76, STEP = 60 / BPM / 2;
  const chords = [[0, 4, 7], [-3, 0, 4], [-7, -3, 0], [-5, -1, 2]];
  const tune = [12, 11, 7, 9, 7, 4, 5, 7, 9, 7, 4, 2, 4, 5, 4, 0];
  function scheduleMusic() {
    while (nextNoteTime < ctx.currentTime + 0.25) {
      const bar = Math.floor(musicStep / 8) % chords.length, ch = chords[bar];
      const delay = nextNoteTime - ctx.currentTime;
      if (musicStep % 8 === 0) tone(130.8 * semis(ch[0]), 1.8, { type: "sine", vol: 0.45, bus: musicBus, delay });
      if (musicStep % 2 === 0) tone(261.6 * semis(ch[(musicStep >> 1) % 3]), 0.7, { type: "sine", vol: 0.16, bus: musicBus, delay });
      if (Math.floor(musicStep / 16) % 2 === 1 && musicStep % 2 === 1) tone(523 * semis(tune[(musicStep >> 1) % 16] - 12), 0.6, { type: "triangle", vol: 0.12, bus: musicBus, delay });
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
    setMusic(on) { musicOn = on; on && unlocked ? startMusic() : stopMusic(); }
  };
})();

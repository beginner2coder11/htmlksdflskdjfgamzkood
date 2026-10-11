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
    // a bubbly pop, pitched per business
    tap(i = 0) { const f = 440 * semis(((i || 0) * 2) % 12); tone(f, 0.08, { type: "sine", vol: 0.18, slide: f * 1.6 }); },
    // cartoon double-honk when a customer arrives / leaves upset
    honk() { tone(392, 0.09, { type: "square", vol: 0.06 }); tone(330, 0.12, { type: "square", vol: 0.06, delay: 0.12 }); },
    angry() { tone(220, 0.14, { type: "square", vol: 0.08, slide: 180 }); tone(208, 0.22, { type: "square", vol: 0.08, delay: 0.16, slide: 150 }); noise(0.3, { vol: 0.06, freq: 500, q: 0.6, delay: 0.1 }); },
    tip() { [0, 4, 7, 12].forEach((s2, i) => tone(1046 * semis(s2), 0.1, { type: "triangle", vol: 0.07, delay: i * 0.04 })); tone(1568, 0.06, { type: "square", vol: 0.035, delay: 0.18 }); },
    cash() { tone(1568, 0.06, { type: "square", vol: 0.035 }); tone(2093, 0.12, { type: "square", vol: 0.035, delay: 0.05 }); },
    buy() { noise(0.05, { vol: 0.12, freq: 3500, q: 2 }); tone(880, 0.08, { type: "triangle", vol: 0.12 }); tone(1320, 0.12, { type: "triangle", vol: 0.1, delay: 0.06 }); },
    milestone() { [0, 4, 7, 12, 16].forEach((s2, i) => tone(659 * semis(s2), 0.18, { type: "square", vol: 0.05, delay: i * 0.06 })); },
    manager() { tone(1200, 0.12, { type: "sine", vol: 0.1, slide: 1800 }); tone(1800, 0.2, { type: "sine", vol: 0.08, delay: 0.14, slide: 1400 }); [0, 4, 7].forEach(s2 => tone(523 * semis(s2), 0.5, { type: "triangle", vol: 0.06, delay: 0.3 })); },
    upgrade() { tone(300, 0.35, { type: "sawtooth", vol: 0.06, slide: 1200 }); tone(1200, 0.2, { type: "triangle", vol: 0.08, delay: 0.3 }); },
    prestige() { noise(0.6, { vol: 0.12, freq: 400, sweep: 6000, q: 0.8 }); [0, 4, 7, 12, 16, 19, 24].forEach((s2, i) => tone(392 * semis(s2), 0.3, { type: "triangle", vol: 0.07, delay: 0.1 + i * 0.07 })); },
    coin() { tone(988, 0.07, { type: "square", vol: 0.05 }); tone(1319, 0.16, { type: "square", vol: 0.05, delay: 0.06 }); },
    gem() { [0, 7, 12, 19].forEach((s2, i) => tone(1046 * semis(s2), 0.14, { type: "sine", vol: 0.08, delay: i * 0.05 })); },
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

  // ---- music: chill lo-fi loop (Fmaj7 Em7 Dm7 Cmaj7) --------------------------
  const BPM = 84;
  const prog = [[5, 9, 12, 16], [4, 7, 11, 14], [2, 5, 9, 12], [0, 4, 7, 11]];
  const mel = [16, -1, 14, 12, -1, 11, -1, 9, 12, -1, -1, 14, -1, 12, -1, -1];
  function scheduleMusic() {
    const STEP = 60 / BPM / 4;
    while (nextNoteTime < ctx.currentTime + 0.2) {
      const bar = Math.floor(musicStep / 16), ch = prog[bar % prog.length], st = musicStep % 16;
      const swing = st % 2 ? STEP * 0.18 : 0, delay = nextNoteTime - ctx.currentTime + swing;
      if (st === 0) ch.forEach((n, i) => tone(261.6 * semis(n - 12), 1.6, { type: "triangle", vol: 0.07, bus: musicBus, delay: delay + i * 0.02, attack: 0.08 }));
      if (st === 0 || st === 10) tone(65.4 * semis(ch[0]), 0.4, { type: "sine", vol: 0.5, bus: musicBus, delay });
      if (st === 4 || st === 12) noise(0.12, { vol: 0.25, freq: 1800, q: 0.7, delay, bus: musicBus });
      if (st % 2 === 0) noise(0.03, { vol: 0.12, freq: 7000, q: 1, delay, bus: musicBus });
      const m = mel[(st + bar * 5) % 16];
      if (m >= 0 && bar % 4 >= 2) tone(523.3 * semis(m - 12), 0.35, { type: "sine", vol: 0.14, bus: musicBus, delay });
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

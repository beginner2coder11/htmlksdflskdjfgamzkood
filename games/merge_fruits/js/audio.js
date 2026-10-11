/* Sound: uses files from GAME_CONFIG.sounds when given, otherwise synthesizes
   every effect with WebAudio so the template ships with zero audio files. */
window.Sound = (() => {
  const C = window.GAME_CONFIG;
  let ctx = null, sfxBus = null, musicBus = null;
  let sfxOn = true, musicOn = true;
  const fileCache = {};
  let musicEl = null, musicTimer = null, musicStep = 0, nextNoteTime = 0;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      sfxBus = ctx.createGain(); sfxBus.gain.value = 0.55; sfxBus.connect(ctx.destination);
      musicBus = ctx.createGain(); musicBus.gain.value = 0.12; musicBus.connect(ctx.destination);
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
    const len = Math.floor(ctx.sampleRate * dur);
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
    swipe() { noise(0.12, { vol: 0.12, freq: 600, sweep: 2400, q: 1.2 }); },
    spawn() { tone(880, 0.06, { type: "triangle", vol: 0.08 }); },
    click() { tone(660, 0.05, { type: "square", vol: 0.06 }); tone(990, 0.05, { type: "triangle", vol: 0.06, delay: 0.03 }); },
    merge(tier = 2) {
      // pitch climbs one major-scale step per tier so bigger fruit "sounds" bigger
      const steps = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19, 21, 23];
      const f = 330 * semis(steps[Math.min(tier - 1, steps.length - 1)]);
      tone(f * 0.6, 0.09, { type: "sine", vol: 0.35, slide: f * 1.4 });
      tone(f * 1.5, 0.16, { type: "triangle", vol: 0.14, delay: 0.03 });
      noise(0.05, { vol: 0.1, freq: 3000, q: 2 });
    },
    combo(n = 2) {
      [0, 4, 7, 12, 16].slice(0, n + 1).forEach((s, i) =>
        tone(523 * semis(s), 0.14, { type: "triangle", vol: 0.15, delay: i * 0.06 }));
    },
    coin() { tone(1319, 0.08, { type: "square", vol: 0.07 }); tone(1760, 0.22, { type: "square", vol: 0.07, delay: 0.07 }); },
    unlock() {
      [0, 4, 7, 12, 7, 12, 16, 19].forEach((s, i) =>
        tone(392 * semis(s), 0.2, { type: "triangle", vol: 0.16, delay: i * 0.08 }));
      noise(0.6, { vol: 0.05, freq: 6000, q: 0.5, delay: 0.3 });
    },
    newbest() { [0, 4, 7, 12, 16].forEach((s, i) => tone(523 * semis(s), 0.18, { type: "square", vol: 0.06, delay: i * 0.07 })); },
    gameover() { [7, 4, 0, -5].forEach((s, i) => tone(392 * semis(s), 0.32, { type: "triangle", vol: 0.16, delay: i * 0.16 })); },
    smash() { noise(0.25, { vol: 0.3, freq: 300, sweep: 80, q: 0.7 }); tone(120, 0.2, { type: "sine", vol: 0.35, slide: 50 }); },
    whoosh() { noise(0.35, { vol: 0.15, freq: 300, sweep: 3000, q: 0.9 }); },
    error() { tone(200, 0.12, { type: "square", vol: 0.05 }); }
  };

  function play(name, arg) {
    if (!sfxOn) return;
    const file = C.sounds && C.sounds[name];
    if (file) {
      try {
        const base = fileCache[name] || (fileCache[name] = new Audio(file));
        const a = base.cloneNode(); a.volume = 0.7; a.play().catch(() => {});
        return;
      } catch (e) { /* fall through to synth */ }
    }
    if (!ensure() || !synth[name]) return;
    synth[name](arg);
  }

  // --- background music: a light marimba loop in C major pentatonic --------
  const BPM = 104, STEP = 60 / BPM / 2;          // eighth notes
  const chords = [[0, 4, 7], [-3, 0, 4], [-7, -3, 0], [-5, -1, 2]]; // C Am F G
  const melody = [12, null, 9, 7, null, 9, 12, null, 14, 12, null, 9, 7, null, 4, null];

  function scheduleMusic() {
    while (nextNoteTime < ctx.currentTime + 0.2) {
      const bar = Math.floor(musicStep / 8) % chords.length;
      const delay = nextNoteTime - ctx.currentTime;
      const ch = chords[bar];
      if (musicStep % 8 === 0) tone(131 * semis(ch[0]), 0.5, { type: "sine", vol: 0.5, bus: musicBus, delay });
      if (musicStep % 2 === 1) tone(262 * semis(ch[(musicStep >> 1) % 3]), 0.18, { type: "triangle", vol: 0.25, bus: musicBus, delay });
      const m = melody[musicStep % 16];
      if (m !== null && Math.floor(musicStep / 16) % 2 === 1) tone(262 * semis(m), 0.22, { type: "sine", vol: 0.3, bus: musicBus, delay });
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

  // Browsers only allow audio after a user gesture.
  let unlocked = false;
  function unlock() {
    if (unlocked) return;
    unlocked = true;
    ensure();
    startMusic();
  }
  ["pointerdown", "keydown"].forEach(ev => window.addEventListener(ev, unlock, { once: false, passive: true }));

  return {
    play,
    setSfx(on) { sfxOn = on; },
    setMusic(on) { musicOn = on; on && unlocked ? startMusic() : stopMusic(); },
    get sfx() { return sfxOn; },
    get music() { return musicOn; }
  };
})();

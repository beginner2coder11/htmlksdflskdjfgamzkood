/* ==========================================================================
   SOUND — files from GAME_CONFIG.sounds when given, otherwise every effect and
   the synthwave soundtrack are synthesized with WebAudio (zero audio files).
   Sound.play(name, arg) · Sound.setBoss(true) switches to the boss track.
   ========================================================================== */
window.Sound = (() => {
  const C = window.GAME_CONFIG;
  let ctx = null, sfxBus = null, musicBus = null, musicFilter = null;
  let sfxOn = true, musicOn = true, unlocked = false, boss = false;
  const fileCache = {}, lastPlayed = {};
  let musicEl = null, musicTimer = null, step = 0, nextTime = 0;
  let noiseBuf = null;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14; comp.ratio.value = 6;
      comp.connect(ctx.destination);
      sfxBus = ctx.createGain(); sfxBus.gain.value = 0.5; sfxBus.connect(comp);
      musicFilter = ctx.createBiquadFilter(); musicFilter.type = "lowpass"; musicFilter.frequency.value = 2400; musicFilter.Q.value = 2;
      musicBus = ctx.createGain(); musicBus.gain.value = 0.1;
      musicBus.connect(musicFilter); musicFilter.connect(comp);
      // one shared second of white noise (re-used by every noisy effect)
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function tone(freq, dur, { type = "sine", vol = 0.3, slide = null, delay = 0, bus = sfxBus, attack = 0.004, detune = 0 } = {}) {
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t); o.detune.value = detune;
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus);
    o.start(t); o.stop(t + dur + 0.03);
  }
  function noise(dur, { vol = 0.2, freq = 1200, q = 0.8, delay = 0, sweep = null, type = "bandpass", bus = null } = {}) {
    const t = ctx.currentTime + delay;
    const src = ctx.createBufferSource(); src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(freq, t);
    if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(bus || sfxBus);
    src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.02);
  }
  const semis = n => Math.pow(2, n / 12);

  const synth = {
    click() { tone(1200, 0.04, { type: "square", vol: 0.05 }); tone(1800, 0.05, { type: "sine", vol: 0.05, delay: 0.02 }); },
    // pew: a short falling square blip; level makes it brighter
    laser(level = 1) {
      const f = 1500 + level * 120 + Math.random() * 80;
      tone(f, 0.07, { type: "square", vol: 0.035, slide: f * 0.35 });
      if (level >= 3) tone(f * 1.5, 0.05, { type: "sawtooth", vol: 0.012, slide: f * 0.5 });
    },
    missile() { noise(0.25, { vol: 0.07, freq: 600, sweep: 2600, q: 1.5 }); },
    hit() { noise(0.04, { vol: 0.08, freq: 3500, q: 2 }); tone(240, 0.04, { type: "square", vol: 0.03, slide: 160 }); },
    explode(size = 1) {
      noise(0.35 * size, { vol: 0.32, freq: 1600, sweep: 90, q: 0.7, type: "lowpass" });
      tone(120, 0.25 * size, { type: "sine", vol: 0.35, slide: 40 });
      noise(0.08, { vol: 0.15, freq: 4000, q: 1.2 });
    },
    bigExplode() {
      noise(1.4, { vol: 0.5, freq: 900, sweep: 40, q: 0.6, type: "lowpass" });
      tone(70, 1.1, { type: "sine", vol: 0.55, slide: 25 });
      tone(140, 0.5, { type: "sawtooth", vol: 0.1, slide: 40 });
      for (let i = 0; i < 4; i++) noise(0.3, { vol: 0.22, freq: 1800, sweep: 120, q: 0.8, type: "lowpass", delay: 0.15 + i * 0.18 });
    },
    powerup() {
      [0, 4, 7, 12, 16].forEach((s, i) => tone(523 * semis(s), 0.14, { type: "square", vol: 0.05, delay: i * 0.045 }));
      tone(2093, 0.4, { type: "sine", vol: 0.06, delay: 0.22, slide: 3136 });
    },
    coin() { tone(1568, 0.05, { type: "square", vol: 0.035 }); tone(2349, 0.09, { type: "square", vol: 0.03, delay: 0.04 }); },
    shield() { tone(300, 0.6, { type: "sine", vol: 0.15, slide: 1200 }); tone(450, 0.6, { type: "triangle", vol: 0.06, slide: 1800, delay: 0.05 }); },
    shieldHit() { tone(900, 0.2, { type: "sine", vol: 0.12, slide: 300 }); noise(0.1, { vol: 0.08, freq: 5000, q: 3 }); },
    bomb() {
      noise(0.5, { vol: 0.25, freq: 300, sweep: 6000, q: 1 });
      noise(1.6, { vol: 0.55, freq: 1200, sweep: 50, q: 0.5, type: "lowpass", delay: 0.35 });
      tone(55, 1.4, { type: "sine", vol: 0.6, slide: 22, delay: 0.35 });
    },
    warning() {
      for (let i = 0; i < 6; i++) tone(i % 2 ? 660 : 880, 0.32, { type: "sawtooth", vol: 0.07, delay: i * 0.34, attack: 0.02 });
    },
    hurt() { tone(380, 0.35, { type: "sawtooth", vol: 0.16, slide: 70 }); noise(0.3, { vol: 0.25, freq: 800, sweep: 100, type: "lowpass" }); },
    combo(n = 1) { tone(660 * semis(Math.min(12, n)), 0.1, { type: "triangle", vol: 0.06 }); },
    unlock() { [0, 7, 12, 16, 19, 24].forEach((s, i) => tone(523 * semis(s), 0.2, { type: "square", vol: 0.05, delay: i * 0.06 })); },
    win() { [0, 4, 7, 12, 7, 12, 16, 24].forEach((s, i) => tone(392 * semis(s), 0.24, { type: "square", vol: 0.05, delay: i * 0.09 })); },
    over() { [0, -2, -5, -9, -12].forEach((s, i) => tone(330 * semis(s), 0.32, { type: "sawtooth", vol: 0.07, delay: i * 0.15 })); },
    warp() { tone(200, 0.9, { type: "sawtooth", vol: 0.06, slide: 1600 }); noise(0.9, { vol: 0.12, freq: 400, sweep: 5000, q: 2 }); }
  };

  // very frequent sounds are throttled so they never turn into noise
  const MIN_GAP = { laser: 0.055, hit: 0.03, coin: 0.04, explode: 0.03 };
  function play(name, arg) {
    if (!sfxOn) return;
    const file = C.sounds && C.sounds[name];
    if (file) {
      try {
        const base = fileCache[name] || (fileCache[name] = new Audio(file));
        const a = base.cloneNode(); a.volume = 0.6; a.play().catch(() => {});
        return;
      } catch (e) { /* fall back to synth */ }
    }
    if (!ensure() || !synth[name]) return;
    const gap = MIN_GAP[name];
    if (gap) { if (ctx.currentTime - (lastPlayed[name] || 0) < gap) return; lastPlayed[name] = ctx.currentTime; }
    synth[name](arg);
  }

  // ---- music: synthwave. Normal track Am–F–C–G at 112 BPM; boss track Dm–Bb–A, 140 BPM, filter open
  const TRACKS = {
    normal: { bpm: 112, prog: [[-3, 0, 4], [-7, -3, 0], [0, 4, 7], [-5, -1, 2]], lead: [12, 16, 19, 16, 12, 7, 9, 7] },
    boss:   { bpm: 140, prog: [[2, 5, 9], [-2, 2, 5], [0, 4, 7], [-3, 1, 4]], lead: [14, 17, 21, 17, 14, 12, 13, 9] }
  };
  function schedule() {
    const T = TRACKS[boss ? "boss" : "normal"], STEP = 60 / T.bpm / 4;
    while (nextTime < ctx.currentTime + 0.25) {
      const bar = Math.floor(step / 16), st = step % 16, ch = T.prog[bar % T.prog.length];
      const d = nextTime - ctx.currentTime, root = ch[0];
      if (st % 4 === 0) { tone(150, 0.16, { type: "sine", vol: 0.9, slide: 40, bus: musicBus, delay: d }); }          // kick
      if (st === 4 || st === 12) noise(0.16, { vol: 0.55, freq: 1800, q: 0.7, bus: musicBus, delay: d });              // snare
      if (st % 2 === 1) noise(0.04, { vol: boss ? 0.3 : 0.2, freq: 8000, q: 1, type: "highpass", bus: musicBus, delay: d }); // hat
      // driving 8th-note bass arpeggio (octave jumps)
      if (st % 2 === 0) tone(55 * semis(root + (st % 4 === 2 ? 12 : 0)), 0.18, { type: "sawtooth", vol: 0.35, bus: musicBus, delay: d });
      // pad chord on each bar
      if (st === 0) ch.forEach(s => tone(220 * semis(s), 60 / T.bpm * 3.6, { type: "sawtooth", vol: 0.05, bus: musicBus, delay: d, attack: 0.3, detune: 7 }));
      // lead arpeggio on odd bars
      if (bar % 2 === 1 && st % 2 === 0) tone(220 * semis(root + T.lead[(st >> 1) % 8] - 12), 0.14, { type: "square", vol: 0.07, bus: musicBus, delay: d });
      step++; nextTime += STEP;
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
    nextTime = ctx.currentTime + 0.05;
    musicTimer = setInterval(schedule, 70);
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
    setBoss(on) {
      if (boss === on) return;
      boss = on; step = 0;
      if (ctx && musicFilter) musicFilter.frequency.setTargetAtTime(on ? 4200 : 2400, ctx.currentTime, 0.4);
    },
    // muffle the music (pause menu, game over)
    muffle(on) { if (ctx && musicFilter) musicFilter.frequency.setTargetAtTime(on ? 500 : (boss ? 4200 : 2400), ctx.currentTime, 0.15); }
  };
})();

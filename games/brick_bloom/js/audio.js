/* BRICK BLOOM — synthesized marimba-style sound. No audio files.
   Every brick hit plays the next note of a pentatonic scale, so combos sing. */
window.Sound = (() => {
  let ctx = null, master = null, musicGain = null, musicTimer = null;
  let sfxOn = true, musicOn = true;
  const SCALE = [0, 2, 4, 7, 9]; // major pentatonic

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.55; master.connect(ctx.destination);
    musicGain = ctx.createGain(); musicGain.gain.value = 0.16; musicGain.connect(master);
    return ctx;
  }
  const freq = n => 440 * Math.pow(2, (n - 69) / 12);

  // a struck bar: sine + quick-decaying overtone
  function bar(midi, t, vol = 0.5, dest = master, len = 0.5) {
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), g2 = ctx.createGain();
    o.type = "sine"; o.frequency.value = freq(midi);
    o2.type = "sine"; o2.frequency.value = freq(midi) * 4;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.004); g.gain.exponentialRampToValueAtTime(0.001, t + len);
    g2.gain.setValueAtTime(vol * 0.35, t); g2.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    o.connect(g); o2.connect(g2); g.connect(dest); g2.connect(dest);
    o.start(t); o2.start(t); o.stop(t + len + 0.05); o2.stop(t + 0.1);
  }
  function noise(t, len, vol, hp = 800) {
    const b = ctx.createBuffer(1, ctx.sampleRate * len, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = b; f.type = "highpass"; f.frequency.value = hp; g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(master); s.start(t);
  }
  function blip(type, f0, f1, len, vol) {
    const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + len);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + len);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + len + 0.02);
  }

  const play = {
    brick(combo) {
      const i = Math.min(combo, 14), oct = Math.floor(i / 5);
      bar(72 + SCALE[i % 5] + oct * 12, ctx.currentTime, 0.42);
    },
    hard() { bar(60, ctx.currentTime, 0.4, master, 0.25); noise(ctx.currentTime, 0.05, 0.12, 2000); },
    steel() { bar(84, ctx.currentTime, 0.18, master, 0.15); bar(91, ctx.currentTime, 0.12, master, 0.15); },
    paddle() { bar(55, ctx.currentTime, 0.35, master, 0.18); },
    wall() { bar(79, ctx.currentTime, 0.08, master, 0.08); },
    boom() { noise(ctx.currentTime, 0.35, 0.4, 200); blip("triangle", 160, 40, 0.3, 0.4); },
    power() { const t = ctx.currentTime; [0, 4, 7, 12].forEach((n, i) => bar(72 + n, t + i * 0.06, 0.3)); },
    bad() { blip("square", 300, 90, 0.3, 0.12); },
    laser() { blip("square", 1400, 500, 0.08, 0.06); },
    lose() { const t = ctx.currentTime; [67, 64, 60, 55].forEach((n, i) => bar(n, t + i * 0.12, 0.35, master, 0.4)); },
    clear() { const t = ctx.currentTime; [60, 64, 67, 72, 76, 79, 84].forEach((n, i) => bar(n, t + i * 0.07, 0.35, master, 0.7)); },
    star(i) { bar(84 + [0, 4, 7][i], ctx.currentTime, 0.35, master, 0.8); },
    tap() { bar(76, ctx.currentTime, 0.15, master, 0.1); },
    coin() { bar(88, ctx.currentTime, 0.18, master, 0.2); bar(93, ctx.currentTime + 0.05, 0.15, master, 0.2); }
  };

  // Gentle generative marimba loop: random walk over the scale on a fixed grid.
  function startMusic() {
    if (!ctx || musicTimer || !musicOn) return;
    let step = 0, next = ctx.currentTime + 0.1, note = 2;
    const bassLine = [48, 48, 53, 55];
    musicTimer = setInterval(() => {
      while (next < ctx.currentTime + 0.3) {
        if (step % 8 === 0) bar(bassLine[(step / 8) % 4 | 0], next, 0.5, musicGain, 1.2);
        if (step % 2 === 0 || Math.random() < 0.3) {
          note = Math.max(0, Math.min(9, note + [-2, -1, 1, 2, 0][Math.random() * 5 | 0]));
          bar(67 + SCALE[note % 5] + Math.floor(note / 5) * 12, next, 0.22, musicGain, 0.6);
        }
        next += 0.2; step++;
      }
    }, 100);
  }
  function stopMusic() { clearInterval(musicTimer); musicTimer = null; }

  return {
    unlock() { if (!ensure()) return; if (ctx.state === "suspended") ctx.resume(); startMusic(); },
    sfx(name, ...a) { if (!sfxOn || !ensure() || !play[name]) return; try { play[name](...a); } catch (e) {} },
    setSfx(v) { sfxOn = v; },
    setMusic(v) { musicOn = v; if (v) { if (ctx) startMusic(); } else stopMusic(); },
    muffle(v) { if (musicGain && ctx) musicGain.gain.setTargetAtTime(v ? 0.05 : 0.16, ctx.currentTime, 0.2); }
  };
})();

/* DOODLE BRIDGE — synthesized sound: a pencil scratch while you draw, a wooden "tok" when a
   plank lands, little footsteps, a spring "boing", star chimes and a light marimba loop. */
window.Sound = (() => {
  const P = window.GAME_CONFIG.storagePrefix;
  let a, out, mus, loopId = null, sfx = true, music = true, scratch = null, scratchG = null;
  try { sfx = localStorage.getItem(P + "sfx") !== "0"; music = localStorage.getItem(P + "music") !== "0"; } catch (e) {}
  const hz = n => 440 * 2 ** ((n - 69) / 12);
  function up() {
    if (a) { if (a.state === "suspended") a.resume(); return true; }
    const A = window.AudioContext || window.webkitAudioContext; if (!A) return false;
    a = new A(); out = a.createGain(); out.gain.value = 0.6; out.connect(a.destination);
    mus = a.createGain(); mus.gain.value = music ? 0.12 : 0; mus.connect(out);
    return true;
  }
  function tone(type, f0, f1, len, v, at = 0, dest) {
    const s = a.currentTime + at, o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, s); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), s + len);
    g.gain.setValueAtTime(0.0001, s); g.gain.exponentialRampToValueAtTime(v, s + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, s + len);
    o.connect(g); g.connect(dest || out); o.start(s); o.stop(s + len + 0.03);
  }
  // marimba-ish: sine with a quick bright overtone
  function mallet(f, v, at = 0, dest) { tone("sine", f, f, 0.5, v, at, dest); tone("sine", f * 4, f * 4, 0.08, v * 0.3, at, dest); }
  function noise(len, v, f, at = 0, type = "bandpass", q = 1, sweep) {
    const s = a.currentTime + at, c = Math.floor(a.sampleRate * len), b = a.createBuffer(1, c, a.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < c; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / c) ** 2;
    const src = a.createBufferSource(), fl = a.createBiquadFilter(), g = a.createGain();
    src.buffer = b; fl.type = type; fl.frequency.setValueAtTime(f, s); if (sweep) fl.frequency.exponentialRampToValueAtTime(sweep, s + len);
    fl.Q.value = q; g.gain.value = v; src.connect(fl); fl.connect(g); g.connect(out); src.start(s);
  }
  const fx = {
    tok(v = 1) { tone("triangle", 420 + Math.random() * 80, 300, 0.08, 0.12 * v); noise(0.05, 0.15 * v, 1800, 0, "bandpass", 2); },
    step() { tone("sine", 180 + Math.random() * 30, 120, 0.05, 0.05); },
    boing() { tone("sine", 220, 880, 0.25, 0.18); tone("triangle", 440, 1320, 0.25, 0.06, 0.02); },
    go() { [0, 4, 7].forEach((m, i) => mallet(hz(72 + m), 0.14, i * 0.06)); },
    win() { [0, 4, 7, 12, 16, 19, 24].forEach((m, i) => mallet(hz(67 + m), 0.15, i * 0.08)); },
    star(i) { mallet(hz(79 + [0, 4, 7][i]), 0.18); tone("sine", hz(91 + [0, 4, 7][i]), hz(91 + [0, 4, 7][i]), 0.4, 0.05, 0.03); },
    fail() { [7, 4, 0, -5].forEach((m, i) => tone("triangle", hz(64 + m), hz(64 + m) * 0.97, 0.22, 0.1, i * 0.13)); },
    poke() { noise(0.12, 0.3, 2400, 0, "highpass", 0.7); tone("square", 300, 120, 0.15, 0.05); },
    rock() { noise(0.25, 0.25, 260, 0, "lowpass"); },
    undo() { tone("sine", 700, 400, 0.1, 0.08); },
    tap() { tone("sine", 900, 900, 0.04, 0.06); },
    coin() { tone("square", 1568, 1568, 0.05, 0.04); tone("square", 2093, 2093, 0.1, 0.04, 0.05); },
    empty() { tone("sawtooth", 200, 180, 0.15, 0.05); }
  };
  function scratchOn(on) {
    if (!a || !sfx) return;
    if (on && !scratch) {
      const b = a.createBuffer(1, a.sampleRate, a.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (0.6 + 0.4 * Math.sin(i / 300));
      scratch = a.createBufferSource(); scratch.buffer = b; scratch.loop = true;
      const fl = a.createBiquadFilter(); fl.type = "bandpass"; fl.frequency.value = 3200; fl.Q.value = 0.9;
      scratchG = a.createGain(); scratchG.gain.value = 0.0001;
      scratch.connect(fl); fl.connect(scratchG); scratchG.connect(out); scratch.start();
    }
    if (scratchG) scratchG.gain.setTargetAtTime(on ? 0.07 : 0.0001, a.currentTime, 0.03);
  }
  function startMusic() {
    if (!a || loopId || !music) return;
    const prog = [[60, 64, 67], [65, 69, 72], [62, 65, 69], [67, 71, 74]];
    const pat = [0, 1, 2, 1, 0, 2, 1, 2];
    let step = 0, next = a.currentTime + 0.1;
    loopId = setInterval(() => {
      while (next < a.currentTime + 0.35) {
        const at = next - a.currentTime, bar = Math.floor(step / 8) % 4, ch = prog[bar], i = step % 8;
        if (i !== 3 && i !== 7) mallet(hz(ch[pat[i]] + 12), 0.1, at, mus);
        if (i === 0 || i === 4) tone("triangle", hz(ch[0] - 12), hz(ch[0] - 12), 0.35, 0.18, at, mus);
        next += 0.22; step++;
      }
    }, 80);
  }
  return {
    unlock() { if (up()) startMusic(); },
    play(n, ...args) { if (sfx && a && fx[n]) fx[n](...args); },
    scratch: scratchOn,
    get sfx() { return sfx; }, get music() { return music; },
    toggleSfx() { sfx = !sfx; try { localStorage.setItem(P + "sfx", sfx ? "1" : "0"); } catch (e) {} if (!sfx) scratchOn(false); return sfx; },
    toggleMusic() {
      music = !music; try { localStorage.setItem(P + "music", music ? "1" : "0"); } catch (e) {}
      if (a) { mus.gain.setTargetAtTime(music ? 0.12 : 0, a.currentTime, 0.2); if (music) startMusic(); else if (loopId) { clearInterval(loopId); loopId = null; } }
      return music;
    }
  };
})();

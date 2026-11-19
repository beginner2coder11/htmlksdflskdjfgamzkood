/* TURBO RIVALS — synthesized sound: an engine that revs through the gears with your speed,
   tyre squeal in hard corners, nitro roar, bumps, start lights, and a driving synth loop. */
window.Sound = (() => {
  const P = window.GAME_CONFIG.storagePrefix;
  let a, out, mus, eng = null, squeal = null, loopId = null, sfx = true, music = true;
  try { sfx = localStorage.getItem(P + "sfx") !== "0"; music = localStorage.getItem(P + "music") !== "0"; } catch (e) {}
  const hz = n => 440 * 2 ** ((n - 69) / 12);
  function up() {
    if (a) { if (a.state === "suspended") a.resume(); return true; }
    const A = window.AudioContext || window.webkitAudioContext; if (!A) return false;
    a = new A(); out = a.createGain(); out.gain.value = 0.5; out.connect(a.destination);
    mus = a.createGain(); mus.gain.value = music ? 0.08 : 0; mus.connect(out);
    return true;
  }
  function tone(type, f0, f1, len, v, at = 0, dest) {
    const s = a.currentTime + at, o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, s); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), s + len);
    g.gain.setValueAtTime(0.0001, s); g.gain.exponentialRampToValueAtTime(v, s + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, s + len);
    o.connect(g); g.connect(dest || out); o.start(s); o.stop(s + len + 0.03);
  }
  function noise(len, v, f, at = 0, type = "bandpass", q = 1, sweep) {
    const s = a.currentTime + at, c = Math.floor(a.sampleRate * len), b = a.createBuffer(1, c, a.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < c; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / c) ** 2;
    const src = a.createBufferSource(), fl = a.createBiquadFilter(), g = a.createGain();
    src.buffer = b; fl.type = type; fl.frequency.setValueAtTime(f, s); if (sweep) fl.frequency.exponentialRampToValueAtTime(sweep, s + len);
    fl.Q.value = q; g.gain.value = v; src.connect(fl); fl.connect(g); g.connect(out); src.start(s);
  }
  function loopNoise() { const b = a.createBuffer(1, a.sampleRate, a.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; const s = a.createBufferSource(); s.buffer = b; s.loop = true; return s; }
  function engineOn() {
    if (!a || eng) return;
    const o1 = a.createOscillator(), o2 = a.createOscillator(), fl = a.createBiquadFilter(), g = a.createGain();
    o1.type = "sawtooth"; o2.type = "square"; o1.frequency.value = 60; o2.frequency.value = 30.5;
    fl.type = "lowpass"; fl.frequency.value = 600; fl.Q.value = 3; g.gain.value = 0;
    const g2 = a.createGain(); g2.gain.value = 0.4;
    o1.connect(fl); o2.connect(g2); g2.connect(fl); fl.connect(g); g.connect(out); o1.start(); o2.start();
    const n = loopNoise(), nf = a.createBiquadFilter(), ng = a.createGain(); nf.type = "bandpass"; nf.frequency.value = 2400; nf.Q.value = 4; ng.gain.value = 0; n.connect(nf); nf.connect(ng); ng.connect(out); n.start();
    eng = { o1, o2, fl, g }; squeal = ng;
  }
  function engineOff() { if (!eng) return; try { eng.o1.stop(); eng.o2.stop(); } catch (e) {} eng = null; if (squeal) { squeal.gain.value = 0; squeal = null; } }
  // speed 0..1.3, throttle 0/1
  function engine(speed, throttle, skid) {
    if (!a || !eng) return;
    if (!sfx) { eng.g.gain.setTargetAtTime(0, a.currentTime, 0.05); if (squeal) squeal.gain.setTargetAtTime(0, a.currentTime, 0.05); return; }
    const gears = [0, 0.22, 0.42, 0.62, 0.82, 1.4], gi = gears.findIndex((g, i) => speed < gears[i + 1]) , lo = gears[Math.max(0, gi)], hi = gears[Math.max(0, gi) + 1];
    const rpm = 0.35 + 0.65 * ((speed - lo) / (hi - lo || 1));
    const f = 45 + rpm * 110 + gi * 8;
    eng.o1.frequency.setTargetAtTime(f, a.currentTime, 0.04); eng.o2.frequency.setTargetAtTime(f / 2 + 0.5, a.currentTime, 0.04);
    eng.fl.frequency.setTargetAtTime(400 + rpm * 1400 + (throttle ? 600 : 0), a.currentTime, 0.05);
    eng.g.gain.setTargetAtTime(0.05 + (throttle ? 0.07 : 0.02) + speed * 0.03, a.currentTime, 0.06);
    if (squeal) squeal.gain.setTargetAtTime(skid ? 0.05 : 0, a.currentTime, 0.05);
  }
  const fx = {
    beep() { tone("square", 660, 660, 0.25, 0.08); },
    go() { tone("square", 1320, 1320, 0.45, 0.09); },
    nitro() { noise(1.2, 0.35, 300, 0, "bandpass", 0.7, 2600); tone("sawtooth", 90, 220, 0.8, 0.06); },
    boost() { tone("sine", 400, 1400, 0.25, 0.1); noise(0.3, 0.2, 2000, 0, "highpass", 0.8); },
    bump() { noise(0.25, 0.5, 300, 0, "lowpass"); tone("square", 140, 60, 0.18, 0.08); },
    cone() { tone("triangle", 500, 260, 0.12, 0.08); noise(0.1, 0.2, 1200, 0, "bandpass", 2); },
    oil() { noise(0.5, 0.25, 1800, 0, "bandpass", 3, 900); },
    jump() { tone("sine", 200, 500, 0.3, 0.08); },
    land() { noise(0.2, 0.45, 220, 0, "lowpass"); tone("sine", 90, 50, 0.2, 0.15); },
    pass() { tone("sine", 1200, 1600, 0.1, 0.06); tone("sine", 1800, 1800, 0.12, 0.05, 0.07); },
    win() { [0, 4, 7, 12, 16, 19, 24].forEach((m, i) => tone("square", hz(67 + m), hz(67 + m), 0.15, 0.05, i * 0.09)); },
    lose() { [7, 4, 0, -5].forEach((m, i) => tone("triangle", hz(64 + m), hz(64 + m) * 0.97, 0.25, 0.09, i * 0.15)); },
    tap() { tone("sine", 900, 900, 0.04, 0.06); },
    buy() { [0, 7, 12].forEach((m, i) => tone("square", hz(79 + m), hz(79 + m), 0.1, 0.05, i * 0.06)); }
  };
  function startMusic() {
    if (!a || loopId || !music) return;
    const bass = [45, 45, 57, 45, 43, 43, 55, 43, 41, 41, 53, 41, 43, 43, 55, 47];
    let step = 0, next = a.currentTime + 0.1;
    loopId = setInterval(() => {
      while (next < a.currentTime + 0.3) {
        const at = next - a.currentTime, i = step % 16;
        tone("sawtooth", hz(bass[i]), hz(bass[i]), 0.16, 0.12, at, mus);
        if (i % 4 === 2) tone("square", hz(bass[i] + 31), hz(bass[i] + 31), 0.1, 0.03, at, mus);
        if (i % 4 === 0) tone("sine", 110, 45, 0.15, 0.25, at, mus);
        next += 0.13; step++;
      }
    }, 60);
  }
  return {
    unlock() { if (up()) startMusic(); },
    play(n, ...args) { if (sfx && a && fx[n]) fx[n](...args); },
    engineOn, engineOff, engine,
    get sfx() { return sfx; }, get music() { return music; },
    toggleSfx() { sfx = !sfx; try { localStorage.setItem(P + "sfx", sfx ? "1" : "0"); } catch (e) {} return sfx; },
    toggleMusic() { music = !music; try { localStorage.setItem(P + "music", music ? "1" : "0"); } catch (e) {} if (a) { mus.gain.setTargetAtTime(music ? 0.08 : 0, a.currentTime, 0.2); if (music) startMusic(); else if (loopId) { clearInterval(loopId); loopId = null; } } return music; }
  };
})();

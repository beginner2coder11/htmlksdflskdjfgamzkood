/* SUNSET PINBALL — arcade cabinet sounds: solenoid thunks, bell bumpers,
   rubber boings, a rolling-ball rumble and a steel-drum + bass groove. */
window.Sound = (() => {
  let c, master, groove, roll, rollGain, timer, sfx = true, music = true;
  const hz = m => 440 * 2 ** ((m - 69) / 12);
  function start() {
    if (c) return true; const A = window.AudioContext || window.webkitAudioContext; if (!A) return false;
    c = new A(); master = c.createGain(); master.gain.value = 0.5; master.connect(c.destination);
    groove = c.createGain(); groove.gain.value = 0.16; groove.connect(master);
    // continuous filtered noise for the rolling ball; volume follows ball speed
    const b = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    roll = c.createBufferSource(); roll.buffer = b; roll.loop = true;
    const f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 420;
    rollGain = c.createGain(); rollGain.gain.value = 0; roll.connect(f); f.connect(rollGain); rollGain.connect(master); roll.start();
    return true;
  }
  function tone(type, f0, f1, len, vol, at = 0, dest = master) {
    const t = c.currentTime + at, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + len);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + len); o.connect(g); g.connect(dest); o.start(t); o.stop(t + len + 0.02);
  }
  function thump(vol) { const t = c.currentTime, n = c.createBuffer(1, 2400, c.sampleRate), d = n.getChannelData(0); for (let i = 0; i < 2400; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / 2400) ** 4; const s = c.createBufferSource(), g = c.createGain(), f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 900; s.buffer = n; g.gain.value = vol; s.connect(f); f.connect(g); g.connect(master); s.start(t); }
  // steel drum: two inharmonic partials with a fast pitch drop
  function pan(m, at, vol, dest = groove) { tone("sine", hz(m) * 1.02, hz(m), 0.5, vol, at, dest); tone("sine", hz(m) * 2.76, hz(m) * 2.7, 0.18, vol * 0.4, at, dest); }
  const fx = {
    flip: () => { thump(0.5); tone("square", 140, 60, 0.05, 0.08); },
    bumper: () => { tone("triangle", 1320, 1300, 0.25, 0.25); tone("sine", 1980, 1970, 0.4, 0.12); thump(0.3); },
    sling: () => { tone("sine", 300, 900, 0.09, 0.25); thump(0.3); },
    wall: v => tone("sine", 180, 120, 0.05, Math.min(0.2, v)),
    target: () => { tone("square", 700, 350, 0.08, 0.12); thump(0.25); },
    targetsAll: () => [0, 4, 7, 12].forEach((n, i) => pan(72 + n, i * 0.07, 0.4, master)),
    lane: () => tone("triangle", 1046, 1046, 0.15, 0.2),
    laneSet: () => [0, 7, 12, 19].forEach((n, i) => pan(76 + n, i * 0.06, 0.35, master)),
    saucer: () => { tone("sawtooth", 80, 300, 0.6, 0.15); thump(0.5); },
    kick: () => { thump(0.7); tone("sine", 90, 40, 0.2, 0.4); },
    launch: p => { tone("sawtooth", 200, 900 * p + 200, 0.25, 0.12); thump(0.6); },
    charge: () => tone("square", 120, 160, 0.05, 0.03),
    drain: () => [67, 63, 60, 55, 48].forEach((n, i) => tone("triangle", hz(n), hz(n) * 0.98, 0.3, 0.2, i * 0.14)),
    save: () => [72, 76, 79].forEach((n, i) => pan(n, i * 0.08, 0.35, master)),
    mission: () => [60, 64, 67, 72, 76, 79, 84].forEach((n, i) => pan(n, i * 0.08, 0.4, master)),
    jackpot: () => { for (let i = 0; i < 12; i++) pan(72 + [0, 4, 7, 12][i % 4] + Math.floor(i / 4) * 12, i * 0.06, 0.3, master); },
    extra: () => [84, 88, 91, 96].forEach((n, i) => tone("square", hz(n), hz(n), 0.12, 0.08, i * 0.1)),
    over: () => [72, 67, 64, 60, 55, 52, 48].forEach((n, i) => pan(n, i * 0.16, 0.4, master)),
    tap: () => tone("square", 900, 600, 0.04, 0.06)
  };
  function playGroove() {
    if (!c || timer || !music) return;
    const bass = [43, 43, 50, 43, 41, 41, 48, 41], mel = [79, 76, 74, 72, 74, 76, 79, 81];
    let s = 0, next = c.currentTime + 0.1;
    timer = setInterval(() => {
      while (next < c.currentTime + 0.3) {
        const at = next - c.currentTime;
        if (s % 2 === 0) tone("triangle", hz(bass[(s / 2 | 0) % 8]), hz(bass[(s / 2 | 0) % 8]), 0.22, 0.5, at, groove);
        if (s % 4 === 3 || (s % 8 === 5)) pan(mel[(s * 3) % 8], at, 0.35);
        if (s % 2 === 1) { const n = c.createBuffer(1, 900, c.sampleRate), d = n.getChannelData(0); for (let i = 0; i < 900; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / 900); const src = c.createBufferSource(), g = c.createGain(), f = c.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 6000; src.buffer = n; g.gain.value = 0.25; src.connect(f); f.connect(g); g.connect(groove); src.start(next); }
        next += 0.16; s++;
      }
    }, 70);
  }
  return {
    unlock() { if (!start()) return; if (c.state === "suspended") c.resume(); playGroove(); },
    sfx(n, ...a) { if (sfx && start() && fx[n]) try { fx[n](...a); } catch (e) {} },
    rolling(speed) { if (rollGain) rollGain.gain.setTargetAtTime(sfx ? Math.min(0.18, speed / 9000) : 0, c.currentTime, 0.05); },
    setSfx(v) { sfx = v; }, setMusic(v) { music = v; if (!v) { clearInterval(timer); timer = null; } else playGroove(); },
    muffle(v) { if (groove) groove.gain.setTargetAtTime(v ? 0.03 : 0.16, c.currentTime, 0.2); if (v && rollGain) rollGain.gain.value = 0; }
  };
})();

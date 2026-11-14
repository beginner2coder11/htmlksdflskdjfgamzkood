/* TILE FUSE — dry mechanical clicks, typewriter thunks and a minimal pulse.
   Fuse pitch rises with the tile value. Synthesized, no files. */
window.Sound = (() => {
  let a, out, beat, timer, sfx = true, music = true;
  const init = () => {
    if (a) return true; const A = window.AudioContext || window.webkitAudioContext; if (!A) return false;
    a = new A(); out = a.createGain(); out.gain.value = 0.5; out.connect(a.destination);
    beat = a.createGain(); beat.gain.value = 0.12; beat.connect(out); return true;
  };
  function click(freq, len, vol, type = "square", dest = out) {
    const t = a.currentTime, o = a.createOscillator(), g = a.createGain(), f = a.createBiquadFilter();
    o.type = type; o.frequency.value = freq; f.type = "bandpass"; f.frequency.value = freq * 1.5; f.Q.value = 3;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(f); f.connect(g); g.connect(dest); o.start(t); o.stop(t + len + 0.02);
  }
  function noise(len, vol, freq, at = 0, dest = out) {
    const t = a.currentTime + at, b = a.createBuffer(1, a.sampleRate * len, a.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
    const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    s.buffer = b; f.type = "bandpass"; f.frequency.value = freq; g.gain.value = vol; s.connect(f); f.connect(g); g.connect(dest); s.start(t);
  }
  const fx = {
    slide: () => noise(0.05, 0.25, 1800),
    fuse: v => { click(180 * Math.pow(2, v / 6), 0.12, 0.3); noise(0.04, 0.2, 3000); },
    combo: n => { for (let i = 0; i < n; i++) setTimeout(() => click(900 + i * 220, 0.05, 0.15), i * 45); },
    spawn: () => click(2400, 0.015, 0.06, "sine"),
    blocked: () => click(90, 0.08, 0.2),
    undo: () => { click(700, 0.05, 0.15); setTimeout(() => click(500, 0.05, 0.15), 50); },
    smash: () => { noise(0.25, 0.6, 400); click(60, 0.2, 0.4, "triangle"); },
    goal: () => [0, 4, 7, 12, 16].forEach((n, i) => setTimeout(() => click(440 * Math.pow(2, n / 12), 0.18, 0.2, "triangle"), i * 90)),
    over: () => [12, 7, 3, 0].forEach((n, i) => setTimeout(() => click(330 * Math.pow(2, n / 12), 0.25, 0.2, "triangle"), i * 140)),
    tick: () => click(3000, 0.01, 0.08, "sine"),
    tap: () => noise(0.03, 0.2, 2500)
  };
  // 4-on-the-floor pulse: kick + hat, very low in the mix
  function pulse() {
    if (!a || timer || !music) return;
    let step = 0, next = a.currentTime + 0.05;
    timer = setInterval(() => {
      while (next < a.currentTime + 0.25) {
        const t = next;
        if (step % 4 === 0) { const o = a.createOscillator(), g = a.createGain(); o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.15); g.gain.setValueAtTime(0.7, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2); o.connect(g); g.connect(beat); o.start(t); o.stop(t + 0.22); }
        if (step % 4 === 2) { const b = a.createBuffer(1, 2000, a.sampleRate), d = b.getChannelData(0); for (let i = 0; i < 2000; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / 2000); const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(); s.buffer = b; f.type = "highpass"; f.frequency.value = 7000; g.gain.value = 0.3; s.connect(f); f.connect(g); g.connect(beat); s.start(t); }
        if (step % 16 === 14) { const o = a.createOscillator(), g = a.createGain(); o.type = "square"; o.frequency.value = [110, 98, 131, 87][(step / 16 | 0) % 4]; g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3); o.connect(g); g.connect(beat); o.start(t); o.stop(t + 0.32); }
        next += 0.15; step++;
      }
    }, 60);
  }
  return {
    unlock() { if (!init()) return; if (a.state === "suspended") a.resume(); pulse(); },
    sfx(n, ...x) { if (sfx && init() && fx[n]) try { fx[n](...x); } catch (e) {} },
    setSfx(v) { sfx = v; }, setMusic(v) { music = v; if (!v) { clearInterval(timer); timer = null; } else pulse(); },
    muffle(v) { if (beat) beat.gain.setTargetAtTime(v ? 0.02 : 0.12, a.currentTime, 0.1); }
  };
})();

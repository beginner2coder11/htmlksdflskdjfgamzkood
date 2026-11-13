/* MOLE PATROL — leafy rustles, soft digs, a wooden flag "tok", a mole squeak,
   and a pastoral flute-and-pluck tune. */
window.Sound = (() => {
  let a, out, tune, loop, sfx = true, music = true;
  const hz = n => 440 * 2 ** ((n - 69) / 12);
  const up = () => { if (a) return true; const A = window.AudioContext || window.webkitAudioContext; if (!A) return false; a = new A(); out = a.createGain(); out.gain.value = 0.5; out.connect(a.destination); tune = a.createGain(); tune.gain.value = 0.13; tune.connect(out); return true; };
  function o(type, f0, f1, len, v, at = 0, dest = out, vib = 0) { const s = a.currentTime + at, x = a.createOscillator(), g = a.createGain(); x.type = type; x.frequency.setValueAtTime(f0, s); x.frequency.exponentialRampToValueAtTime(Math.max(20, f1), s + len); if (vib) { const l = a.createOscillator(), lg = a.createGain(); l.frequency.value = 5; lg.gain.value = vib; l.connect(lg); lg.connect(x.frequency); l.start(s); l.stop(s + len); } g.gain.setValueAtTime(0.0001, s); g.gain.exponentialRampToValueAtTime(v, s + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, s + len); x.connect(g); g.connect(dest); x.start(s); x.stop(s + len + 0.02); }
  function rustle(len, v, f, at = 0) { const s = a.currentTime + at, c = Math.floor(a.sampleRate * len), b = a.createBuffer(1, c, a.sampleRate), d = b.getChannelData(0); for (let i = 0; i < c; i++) d[i] = (Math.random() * 2 - 1) * Math.random() * (1 - i / c); const src = a.createBufferSource(), fl = a.createBiquadFilter(), g = a.createGain(); src.buffer = b; fl.type = "bandpass"; fl.frequency.value = f; g.gain.value = v; src.connect(fl); fl.connect(g); g.connect(out); src.start(s); }
  const fx = {
    dig: n => { rustle(0.12, 0.4, 2400); if (n > 6) for (let i = 1; i < Math.min(6, n / 6); i++) rustle(0.1, 0.25, 2000 + i * 300, i * 0.05); },
    flag: () => { o("triangle", 700, 500, 0.06, 0.3); },
    unflag: () => o("triangle", 500, 700, 0.06, 0.2),
    chord: () => { rustle(0.2, 0.4, 1800); o("sine", 600, 900, 0.1, 0.12); },
    mole: () => { o("square", 900, 1400, 0.08, 0.12); o("square", 1400, 700, 0.12, 0.12, 0.09); rustle(0.4, 0.6, 500); },
    win: () => [0, 2, 4, 7, 9, 12, 14, 16].forEach((n, i) => o("sine", hz(72 + n), hz(72 + n), 0.4, 0.2, i * 0.09, out, 3)),
    hint: () => [0, 7].forEach((n, i) => o("sine", hz(84 + n), hz(84 + n), 0.3, 0.15, i * 0.08)),
    bad: () => o("triangle", 200, 150, 0.12, 0.2),
    tap: () => rustle(0.04, 0.25, 3500)
  };
  function pastoral() {
    if (!a || loop || !music) return;
    const mel = [74, 76, 79, 81, 79, 76, 74, 72, 74, 76, 74, null, 71, 72, 74, 79, 76, 74, 72, 71, 72, null, null, null];
    const ch = [[55, 59, 62], [52, 55, 60], [48, 52, 55], [50, 54, 57]];
    let s = 0, next = a.currentTime + 0.3;
    loop = setInterval(() => {
      while (next < a.currentTime + 0.5) {
        const at = next - a.currentTime, m = mel[s % mel.length];
        if (m) o("sine", hz(m), hz(m), 0.5, 0.22, at, tune, 4);
        if (s % 2 === 0) ch[Math.floor(s / 6) % 4].forEach((n, i) => o("triangle", hz(n), hz(n), 0.35, 0.12, at + i * 0.04, tune));
        next += 0.32; s++;
      }
    }, 140);
  }
  return {
    unlock() { if (!up()) return; if (a.state === "suspended") a.resume(); pastoral(); },
    sfx(n, ...x) { if (sfx && up() && fx[n]) try { fx[n](...x); } catch (e) {} },
    setSfx(v) { sfx = v; }, setMusic(v) { music = v; if (!v) { clearInterval(loop); loop = null; } else pastoral(); },
    muffle(v) { if (tune) tune.gain.setTargetAtTime(v ? 0.03 : 0.13, a.currentTime, 0.2); }
  };
})();

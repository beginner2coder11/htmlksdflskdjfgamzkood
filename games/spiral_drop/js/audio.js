/* SPIRAL DROP — bouncy rubber "boing", glassy smashes whose pitch climbs with
   the combo, a fever riser and a funky 80s bass + clap loop. */
window.Sound = (() => {
  let a, out, mus, loop, sfx = true, music = true;
  const hz = n => 440 * 2 ** ((n - 69) / 12);
  const up = () => { if (a) return true; const A = window.AudioContext || window.webkitAudioContext; if (!A) return false; a = new A(); out = a.createGain(); out.gain.value = 0.5; out.connect(a.destination); mus = a.createGain(); mus.gain.value = 0.15; mus.connect(out); return true; };
  function o(type, f0, f1, len, vol, at = 0, dest = out) { const s = a.currentTime + at, x = a.createOscillator(), g = a.createGain(); x.type = type; x.frequency.setValueAtTime(f0, s); x.frequency.exponentialRampToValueAtTime(Math.max(20, f1), s + len); g.gain.setValueAtTime(vol, s); g.gain.exponentialRampToValueAtTime(0.0001, s + len); x.connect(g); g.connect(dest); x.start(s); x.stop(s + len + 0.02); }
  function n(len, vol, f, at = 0, type = "bandpass", dest = out) { const s = a.currentTime + at, c = Math.floor(a.sampleRate * len), b = a.createBuffer(1, c, a.sampleRate), d = b.getChannelData(0); for (let i = 0; i < c; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / c) ** 2; const src = a.createBufferSource(), fl = a.createBiquadFilter(), g = a.createGain(); src.buffer = b; fl.type = type; fl.frequency.value = f; g.gain.value = vol; src.connect(fl); fl.connect(g); g.connect(dest); src.start(s); }
  const fx = {
    bounce: () => { o("sine", 180, 420, 0.12, 0.3); o("triangle", 90, 60, 0.08, 0.2); },
    pass: c => { const base = 72 + Math.min(c, 10) * 2; n(0.12, 0.35, 3500); o("triangle", hz(base), hz(base + 12), 0.12, 0.18); },
    smash: () => { n(0.3, 0.7, 1800); o("square", 200, 60, 0.25, 0.15); for (let i = 0; i < 5; i++) o("sine", 2000 + Math.random() * 2500, 900, 0.1, 0.06, i * 0.03); },
    fever: () => o("sawtooth", 200, 1600, 0.6, 0.08),
    die: () => { n(0.4, 0.6, 500); [67, 63, 58, 55].forEach((m, i) => o("square", hz(m), hz(m) * 0.97, 0.18, 0.1, i * 0.12)); },
    win: () => [0, 4, 7, 12, 16, 19, 24].forEach((m, i) => o("square", hz(64 + m), hz(64 + m), 0.14, 0.09, i * 0.07)),
    splat: () => n(0.06, 0.25, 700, 0, "lowpass"),
    tap: () => o("sine", 800, 1200, 0.06, 0.12),
    coin: () => { o("square", 1568, 1568, 0.06, 0.06); o("square", 2093, 2093, 0.1, 0.06, 0.06); }
  };
  function funk() {
    if (!a || loop || !music) return;
    const bass = [40, 40, 52, 40, 43, 45, 47, 52, 38, 38, 50, 38, 43, 45, 47, 50];
    let s = 0, next = a.currentTime + 0.1;
    loop = setInterval(() => {
      while (next < a.currentTime + 0.25) {
        const at = next - a.currentTime;
        if (s % 2 === 0 || s % 16 === 7) o("sawtooth", hz(bass[s % 16]), hz(bass[s % 16]), 0.14, 0.35, at, mus);
        if (s % 8 === 4) n(0.12, 0.6, 1500, at, "bandpass", mus);
        if (s % 4 === 0) o("sine", 110, 40, 0.15, 0.6, at, mus);
        if (s % 2 === 1) n(0.03, 0.25, 8000, at, "highpass", mus);
        if (s % 32 === 0) [64, 67, 71].forEach((m, i) => o("square", hz(m + 12), hz(m + 12), 0.5, 0.05, at + i * 0.01, mus));
        next += 0.13; s++;
      }
    }, 60);
  }
  return {
    unlock() { if (!up()) return; if (a.state === "suspended") a.resume(); funk(); },
    sfx(k, ...x) { if (sfx && up() && fx[k]) try { fx[k](...x); } catch (e) {} },
    setSfx(v) { sfx = v; }, setMusic(v) { music = v; if (!v) { clearInterval(loop); loop = null; } else funk(); },
    muffle(v) { if (mus) mus.gain.setTargetAtTime(v ? 0.03 : 0.15, a.currentTime, 0.2); }
  };
})();

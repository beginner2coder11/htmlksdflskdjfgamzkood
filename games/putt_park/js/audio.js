/* PUTT PARK — putter "tock", cup rattle, splash, birdsong and a music-box waltz. */
window.Sound = (() => {
  let a, out, box, timer, sfx = true, music = true;
  const hz = n => 440 * 2 ** ((n - 69) / 12);
  const up = () => { if (a) return true; const A = window.AudioContext || window.webkitAudioContext; if (!A) return false; a = new A(); out = a.createGain(); out.gain.value = 0.5; out.connect(a.destination); box = a.createGain(); box.gain.value = 0.14; box.connect(out); return true; };
  function t(type, f0, f1, len, v, at = 0, dest = out) { const s = a.currentTime + at, o = a.createOscillator(), g = a.createGain(); o.type = type; o.frequency.setValueAtTime(f0, s); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), s + len); g.gain.setValueAtTime(v, s); g.gain.exponentialRampToValueAtTime(0.0001, s + len); o.connect(g); g.connect(dest); o.start(s); o.stop(s + len + 0.02); }
  function nz(len, v, f, at = 0, type = "bandpass") { const s = a.currentTime + at, c = Math.floor(a.sampleRate * len), b = a.createBuffer(1, c, a.sampleRate), d = b.getChannelData(0); for (let i = 0; i < c; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / c); const src = a.createBufferSource(), fl = a.createBiquadFilter(), g = a.createGain(); src.buffer = b; fl.type = type; fl.frequency.value = f; g.gain.value = v; src.connect(fl); fl.connect(g); g.connect(out); src.start(s); }
  const bell = (n, at, v = 0.3, dest = box) => { t("sine", hz(n), hz(n), 1.2, v, at, dest); t("sine", hz(n) * 3, hz(n) * 3, 0.3, v * 0.25, at, dest); };
  const fx = {
    putt: p => { t("triangle", 900, 400, 0.05, 0.3 + p * 0.3); nz(0.03, 0.3, 2500); },
    wall: v => t("triangle", 600, 300, 0.04, Math.min(0.25, v)),
    bump: () => { t("sine", 500, 900, 0.1, 0.25); },
    sand: () => nz(0.15, 0.25, 900, 0, "lowpass"),
    splash: () => { nz(0.5, 0.5, 700); nz(0.3, 0.3, 2500, 0.1); },
    cup: () => { [0, 0.06, 0.11, 0.15].forEach((d, i) => t("triangle", 700 - i * 60, 500 - i * 50, 0.04, 0.25, d)); },
    lip: () => t("triangle", 800, 500, 0.06, 0.2),
    ace: () => [0, 4, 7, 12, 16, 19].forEach((n, i) => bell(72 + n, i * 0.09, 0.35, out)),
    good: () => [0, 4, 7].forEach((n, i) => bell(76 + n, i * 0.1, 0.3, out)),
    meh: () => bell(69, 0, 0.25, out),
    star: i => bell(84 + [0, 4, 7][i], 0, 0.35, out),
    tap: () => t("sine", 1200, 900, 0.05, 0.1),
    bird: () => { const f = 2500 + Math.random() * 1500; for (let i = 0; i < 3; i++) t("sine", f, f * 1.25, 0.07, 0.03, i * 0.1); }
  };
  function waltz() {
    if (!a || timer || !music) return;
    const mel = [76, 79, 84, 83, 79, 76, 74, 77, 81, 79, 77, 74, 72, 76, 79, 77, 74, 71, 72, 72, 72, null, null, null];
    const bass = [48, 43, 45, 41, 43, 43, 48, 48];
    let s = 0, next = a.currentTime + 0.2;
    timer = setInterval(() => {
      while (next < a.currentTime + 0.4) {
        const at = next - a.currentTime, m = mel[s % mel.length];
        if (m) bell(m, at, 0.22);
        if (s % 3 === 0) bell(bass[(s / 3 | 0) % 8], at, 0.3); else bell(bass[(s / 3 | 0) % 8] + 12 + (s % 3 === 1 ? 4 : 7), at, 0.1);
        if (Math.random() < 0.02) fx.bird();
        next += 0.3; s++;
      }
    }, 120);
  }
  return {
    unlock() { if (!up()) return; if (a.state === "suspended") a.resume(); waltz(); },
    sfx(n, ...x) { if (sfx && up() && fx[n]) try { fx[n](...x); } catch (e) {} },
    setSfx(v) { sfx = v; }, setMusic(v) { music = v; if (!v) { clearInterval(timer); timer = null; } else waltz(); },
    muffle(v) { if (box) box.gain.setTargetAtTime(v ? 0.03 : 0.14, a.currentTime, 0.2); }
  };
})();

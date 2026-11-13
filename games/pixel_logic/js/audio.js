/* PIXEL LOGIC — ink stamps, pencil crosses, a printer roller and a soft
   vibraphone jazz loop. */
window.Sound = (() => {
  let a, out, vib, loop, sfx = true, music = true;
  const hz = n => 440 * 2 ** ((n - 69) / 12);
  const up = () => { if (a) return true; const A = window.AudioContext || window.webkitAudioContext; if (!A) return false; a = new A(); out = a.createGain(); out.gain.value = 0.5; out.connect(a.destination); vib = a.createGain(); vib.gain.value = 0.13; vib.connect(out); return true; };
  function n(len, v, f, at = 0, type = "bandpass", q = 1) { const s = a.currentTime + at, c = Math.floor(a.sampleRate * len), b = a.createBuffer(1, c, a.sampleRate), d = b.getChannelData(0); for (let i = 0; i < c; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / c) ** 2; const src = a.createBufferSource(), fl = a.createBiquadFilter(), g = a.createGain(); src.buffer = b; fl.type = type; fl.frequency.value = f; fl.Q.value = q; g.gain.value = v; src.connect(fl); fl.connect(g); g.connect(out); src.start(s); }
  function bar(m, at, v, dest = vib, len = 1.4) { const s = a.currentTime + at, o = a.createOscillator(), o2 = a.createOscillator(), g = a.createGain(), trem = a.createOscillator(), tg = a.createGain(); o.type = "sine"; o.frequency.value = hz(m); o2.type = "sine"; o2.frequency.value = hz(m) * 4; trem.frequency.value = 5.5; tg.gain.value = 0.25; trem.connect(tg); tg.connect(g.gain); g.gain.setValueAtTime(v, s); g.gain.exponentialRampToValueAtTime(0.0001, s + len); o.connect(g); o2.connect(g); g.connect(dest); [o, o2, trem].forEach(x => { x.start(s); x.stop(s + len); }); }
  const fx = {
    fill: i => { n(0.05, 0.45, 600 + (i % 6) * 60, 0, "lowpass"); },
    cross: () => { n(0.05, 0.25, 4500, 0, "bandpass", 3); n(0.05, 0.25, 4000, 0.05, "bandpass", 3); },
    clear: () => n(0.06, 0.2, 2500, 0, "highpass"),
    line: k => bar(72 + [0, 2, 4, 7, 9, 12, 14, 16][k % 8], 0, 0.25, out, 0.8),
    wrong: () => { bar(50, 0, 0.25, out, 0.4); bar(51, 0.02, 0.2, out, 0.4); },
    print: () => { for (let i = 0; i < 12; i++) n(0.05, 0.25, 900 + (i % 3) * 200, i * 0.05, "bandpass", 2); [0, 4, 7, 11, 14].forEach((m, i) => bar(67 + m, 0.7 + i * 0.1, 0.25, out, 1.6)); },
    hint: () => [0, 7].forEach((m, i) => bar(84 + m, i * 0.06, 0.2, out, 0.6)),
    tap: () => n(0.03, 0.2, 3000, 0, "bandpass", 2)
  };
  function jazz() {
    if (!a || loop || !music) return;
    const ch = [[57, 60, 64, 67], [55, 59, 62, 65], [53, 57, 60, 64], [52, 56, 59, 62]];
    let s = 0, next = a.currentTime + 0.3;
    loop = setInterval(() => {
      while (next < a.currentTime + 0.5) {
        const at = next - a.currentTime, c = ch[Math.floor(s / 8) % 4];
        if (s % 8 === 0) c.forEach((m, i) => bar(m, at + i * 0.02, 0.1, vib, 2.4));
        if (s % 2 === 1 && Math.random() < 0.6) bar(c[Math.floor(Math.random() * 4)] + 12 + (Math.random() < 0.3 ? 2 : 0), at, 0.13, vib, 0.9);
        if (s % 4 === 0) { const o = a.createOscillator(), g = a.createGain(), t0 = a.currentTime + at; o.type = "triangle"; o.frequency.value = hz(c[0] - 12); g.gain.setValueAtTime(0.4, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.6); o.connect(g); g.connect(vib); o.start(t0); o.stop(t0 + 0.7); }
        next += 0.28; s++;
      }
    }, 120);
  }
  return {
    unlock() { if (!up()) return; if (a.state === "suspended") a.resume(); jazz(); },
    sfx(k, ...x) { if (sfx && up() && fx[k]) try { fx[k](...x); } catch (e) {} },
    setSfx(v) { sfx = v; }, setMusic(v) { music = v; if (!v) { clearInterval(loop); loop = null; } else jazz(); },
    muffle(v) { if (vib) vib.gain.setTargetAtTime(v ? 0.03 : 0.13, a.currentTime, 0.2); }
  };
})();

/* CRATE ESCAPE — wooden slides and knocks, a gate creak, and a warm xylophone
   + upright-bass lullaby. */
window.Sound = (() => {
  let a, out, mus, loop, sfx = true, music = true;
  const hz = n => 440 * 2 ** ((n - 69) / 12);
  const up = () => { if (a) return true; const A = window.AudioContext || window.webkitAudioContext; if (!A) return false; a = new A(); out = a.createGain(); out.gain.value = 0.5; out.connect(a.destination); mus = a.createGain(); mus.gain.value = 0.15; mus.connect(out); return true; };
  function knock(f, v, at = 0, len = 0.09) { const s = a.currentTime + at, o = a.createOscillator(), g = a.createGain(); o.type = "triangle"; o.frequency.setValueAtTime(f, s); o.frequency.exponentialRampToValueAtTime(f * 0.6, s + len); g.gain.setValueAtTime(v, s); g.gain.exponentialRampToValueAtTime(0.0001, s + len); o.connect(g); g.connect(out); o.start(s); o.stop(s + len + 0.02); }
  function scrape(len, v, at = 0) { const s = a.currentTime + at, c = Math.floor(a.sampleRate * len), b = a.createBuffer(1, c, a.sampleRate), d = b.getChannelData(0); for (let i = 0; i < c; i++) d[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * i / c) * (0.5 + 0.5 * Math.sin(i / 30)); const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(); src.buffer = b; f.type = "bandpass"; f.frequency.value = 700; f.Q.value = 1.2; g.gain.value = v; src.connect(f); f.connect(g); g.connect(out); src.start(s); }
  function xylo(n, at, v = 0.25, dest = mus) { const s = a.currentTime + at; [1, 3.9].forEach((h, i) => { const o = a.createOscillator(), g = a.createGain(); o.type = "sine"; o.frequency.value = hz(n) * h; g.gain.setValueAtTime(v / (i ? 4 : 1), s); g.gain.exponentialRampToValueAtTime(0.0001, s + (i ? 0.15 : 0.7)); o.connect(g); g.connect(dest); o.start(s); o.stop(s + 0.8); }); }
  const fx = {
    pick: () => knock(520, 0.18), slide: d => scrape(Math.min(0.3, 0.08 + d * 0.05), 0.5),
    drop: () => { knock(220, 0.35); knock(330, 0.12, 0.02); }, bump: () => knock(150, 0.3),
    gate: () => { scrape(0.6, 0.4); [0, 4, 7, 12, 16].forEach((m, i) => xylo(72 + m, 0.3 + i * 0.08, 0.3, out)); },
    undo: () => { knock(400, 0.15); knock(300, 0.12, 0.05); }, hint: () => [0, 7, 12].forEach((m, i) => xylo(84 + m, i * 0.06, 0.2, out)),
    star: i => xylo(84 + [0, 4, 7][i], 0, 0.3, out), tap: () => knock(700, 0.1)
  };
  function lullaby() {
    if (!a || loop || !music) return;
    const mel = [72, 76, 79, 76, 74, 77, 81, 77, 72, 76, 79, 84, 83, 79, 76, 74], bass = [48, 43, 41, 43];
    let s = 0, next = a.currentTime + 0.2;
    loop = setInterval(() => {
      while (next < a.currentTime + 0.4) {
        const at = next - a.currentTime;
        if (s % 2 === 0 || Math.random() < 0.3) xylo(mel[s % 16], at, 0.2);
        if (s % 4 === 0) { const o = a.createOscillator(), g = a.createGain(), t0 = a.currentTime + at; o.type = "sine"; o.frequency.value = hz(bass[(s / 4) % 4 | 0] - 12); g.gain.setValueAtTime(0.5, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.9); o.connect(g); g.connect(mus); o.start(t0); o.stop(t0 + 1); }
        next += 0.3; s++;
      }
    }, 120);
  }
  return {
    unlock() { if (!up()) return; if (a.state === "suspended") a.resume(); lullaby(); },
    sfx(n, ...x) { if (sfx && up() && fx[n]) try { fx[n](...x); } catch (e) {} },
    setSfx(v) { sfx = v; }, setMusic(v) { music = v; if (!v) { clearInterval(loop); loop = null; } else lullaby(); },
    muffle(v) { if (mus) mus.gain.setTargetAtTime(v ? 0.03 : 0.15, a.currentTime, 0.2); }
  };
})();

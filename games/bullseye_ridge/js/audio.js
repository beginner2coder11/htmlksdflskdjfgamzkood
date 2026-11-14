/* BULLSEYE RIDGE — quiet nature sound: bow creak while drawing, string twang,
   arrow whistle, wooden thunk, distant wind and a sparse kalimba melody. */
window.Sound = (() => {
  let a, out, amb, windG, windF, kal, loop, creak = null, sfx = true, music = true;
  const hz = n => 440 * 2 ** ((n - 69) / 12);
  function boot() {
    if (a) return true; const A = window.AudioContext || window.webkitAudioContext; if (!A) return false;
    a = new A(); out = a.createGain(); out.gain.value = 0.55; out.connect(a.destination);
    kal = a.createGain(); kal.gain.value = 0.16; kal.connect(out);
    // looping wind: brown noise through a slowly moving band-pass
    const b = a.createBuffer(1, a.sampleRate * 3, a.sampleRate), d = b.getChannelData(0); let l = 0;
    for (let i = 0; i < d.length; i++) { l = (l + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = l * 3.5; }
    amb = a.createBufferSource(); amb.buffer = b; amb.loop = true; windF = a.createBiquadFilter(); windF.type = "bandpass"; windF.frequency.value = 500; windF.Q.value = 0.6;
    windG = a.createGain(); windG.gain.value = 0.04; amb.connect(windF); windF.connect(windG); windG.connect(out); amb.start();
    return true;
  }
  function tone(type, f0, f1, len, vol, at = 0, dest = out) { const s = a.currentTime + at, o = a.createOscillator(), g = a.createGain(); o.type = type; o.frequency.setValueAtTime(f0, s); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), s + len); g.gain.setValueAtTime(vol, s); g.gain.exponentialRampToValueAtTime(0.0001, s + len); o.connect(g); g.connect(dest); o.start(s); o.stop(s + len + 0.02); }
  function noise(len, vol, f, q = 1, at = 0) { const s = a.currentTime + at, n = Math.floor(a.sampleRate * len), b = a.createBuffer(1, n, a.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n); const src = a.createBufferSource(), fl = a.createBiquadFilter(), g = a.createGain(); src.buffer = b; fl.type = "bandpass"; fl.frequency.value = f; fl.Q.value = q; g.gain.value = vol; src.connect(fl); fl.connect(g); g.connect(out); src.start(s); }
  // kalimba: sine with a short bright attack partial
  function tine(n, at, v = 0.3, dest = kal) { tone("sine", hz(n), hz(n), 1.4, v, at, dest); tone("sine", hz(n) * 5.4, hz(n) * 5.4, 0.08, v * 0.25, at, dest); }
  const fx = {
    draw: () => { if (creak) return; const o = a.createOscillator(), g = a.createGain(), f = a.createBiquadFilter(); o.type = "sawtooth"; o.frequency.value = 38; f.type = "bandpass"; f.frequency.value = 900; f.Q.value = 6; g.gain.value = 0.0; o.connect(f); f.connect(g); g.connect(out); o.start(); creak = { o, g, f }; },
    drawing: p => { if (creak) { creak.g.gain.setTargetAtTime(0.03 * p, a.currentTime, 0.05); creak.f.frequency.setTargetAtTime(700 + p * 900, a.currentTime, 0.05); } },
    release: p => { if (creak) { creak.o.stop(); creak = null; } tone("triangle", 110 + p * 40, 70, 0.35, 0.35); noise(0.08, 0.25, 2500, 2); },
    cancel: () => { if (creak) { creak.o.stop(); creak = null; } },
    whistle: () => { tone("sine", 1900, 1500, 0.7, 0.025); },
    thunk: ring => { noise(0.12, 0.6, 400, 1.5); tone("triangle", 160, 90, 0.15, 0.3); if (ring >= 9) [0, 4, 7, 12].forEach((n, i) => tine(76 + n, 0.1 + i * 0.08, 0.3, out)); },
    miss: () => { noise(0.2, 0.25, 300, 0.7); },
    balloon: () => { noise(0.06, 0.6, 1800, 0.6); tone("sine", 900, 300, 0.12, 0.15); },
    stageWin: () => [0, 2, 4, 7, 9, 12].forEach((n, i) => tine(67 + n, i * 0.12, 0.3, out)),
    stageLose: () => [7, 4, 2, 0].forEach((n, i) => tine(62 + n, i * 0.18, 0.25, out)),
    star: i => tine(84 + [0, 4, 7][i], 0, 0.35, out),
    coin: () => { tine(91, 0, 0.2, out); tine(96, 0.05, 0.2, out); },
    tap: () => tine(88, 0, 0.12, out)
  };
  function melody() {
    if (!a || loop || !music) return;
    const scale = [62, 64, 66, 69, 71, 74, 76, 78];
    let next = a.currentTime + 0.5, idx = 3;
    loop = setInterval(() => {
      while (next < a.currentTime + 0.6) {
        if (Math.random() < 0.62) { idx = Math.max(0, Math.min(7, idx + [-2, -1, 1, 2][Math.floor(Math.random() * 4)])); tine(scale[idx], next - a.currentTime, 0.22); if (Math.random() < 0.25) tine(scale[idx] - 12, next - a.currentTime, 0.18); }
        next += 0.46;
      }
    }, 150);
  }
  return {
    unlock() { if (!boot()) return; if (a.state === "suspended") a.resume(); melody(); },
    sfx(n, ...x) { if (sfx && boot() && fx[n]) try { fx[n](...x); } catch (e) {} },
    wind(ms) { if (windG) { windG.gain.setTargetAtTime(sfx ? 0.03 + Math.abs(ms) * 0.012 : 0, a.currentTime, 0.4); windF.frequency.setTargetAtTime(380 + Math.abs(ms) * 90, a.currentTime, 0.4); } },
    setSfx(v) { sfx = v; if (!v && windG) windG.gain.value = 0; }, setMusic(v) { music = v; if (!v) { clearInterval(loop); loop = null; } else melody(); },
    muffle(v) { if (kal) kal.gain.setTargetAtTime(v ? 0.04 : 0.16, a.currentTime, 0.3); }
  };
})();

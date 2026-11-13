/* FLOW WORKS — metallic ratchet clicks, valve clunks, rushing water, a
   pressure gauge chime and a minimal pulsing synth like a machine room. */
window.Sound = (() => {
  let a, out, hum, loop, sfx = true, music = true;
  const hz = n => 440 * 2 ** ((n - 69) / 12);
  const up = () => { if (a) return true; const A = window.AudioContext || window.webkitAudioContext; if (!A) return false; a = new A(); out = a.createGain(); out.gain.value = 0.5; out.connect(a.destination); hum = a.createGain(); hum.gain.value = 0.1; hum.connect(out); return true; };
  function t(type, f0, f1, len, v, at = 0, dest = out) { const s = a.currentTime + at, o = a.createOscillator(), g = a.createGain(); o.type = type; o.frequency.setValueAtTime(f0, s); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), s + len); g.gain.setValueAtTime(v, s); g.gain.exponentialRampToValueAtTime(0.0001, s + len); o.connect(g); g.connect(dest); o.start(s); o.stop(s + len + 0.02); }
  function n(len, v, f, at = 0, type = "bandpass", q = 2) { const s = a.currentTime + at, c = Math.floor(a.sampleRate * len), b = a.createBuffer(1, c, a.sampleRate), d = b.getChannelData(0); for (let i = 0; i < c; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / c); const src = a.createBufferSource(), fl = a.createBiquadFilter(), g = a.createGain(); src.buffer = b; fl.type = type; fl.frequency.value = f; fl.Q.value = q; g.gain.value = v; src.connect(fl); fl.connect(g); g.connect(out); src.start(s); }
  const fx = {
    turn: () => { n(0.03, 0.4, 5000, 0, "bandpass", 6); t("square", 1800, 1200, 0.02, 0.05); n(0.03, 0.3, 4000, 0.035, "bandpass", 6); },
    lock: () => { t("triangle", 180, 120, 0.12, 0.3); n(0.05, 0.3, 800); },
    join: k => t("sine", hz(72 + Math.min(k, 20)), hz(72 + Math.min(k, 20)), 0.12, 0.06),
    flow: () => { n(1.2, 0.25, 600, 0, "lowpass", 0.5); n(1.0, 0.12, 2400, 0.2, "bandpass", 0.7); },
    win: () => { [0, 7, 12, 16, 19, 24].forEach((m, i) => t("triangle", hz(60 + m), hz(60 + m), 0.4, 0.15, i * 0.08)); t("sine", 880, 880, 1.2, 0.08, 0.5); },
    hint: () => [0, 12].forEach((m, i) => t("sine", hz(84 + m), hz(84 + m), 0.2, 0.12, i * 0.07)),
    star: i => t("triangle", hz(84 + [0, 4, 7][i]), hz(84 + [0, 4, 7][i]), 0.4, 0.2),
    tap: () => n(0.02, 0.3, 6000, 0, "highpass", 1)
  };
  function machine() {
    if (!a || loop || !music) return;
    const seq = [45, 45, 52, 45, 48, 45, 52, 50];
    let s = 0, next = a.currentTime + 0.1;
    loop = setInterval(() => {
      while (next < a.currentTime + 0.3) {
        const at = next - a.currentTime;
        t("sawtooth", hz(seq[s % 8]), hz(seq[s % 8]), 0.18, 0.18, at, hum);
        if (s % 4 === 0) t("sine", 70, 40, 0.2, 0.5, at, hum);
        if (s % 8 === 6) t("sine", hz(seq[(s + 3) % 8] + 24), hz(seq[(s + 3) % 8] + 24), 0.6, 0.06, at, hum);
        next += 0.24; s++;
      }
    }, 90);
  }
  return {
    unlock() { if (!up()) return; if (a.state === "suspended") a.resume(); machine(); },
    sfx(k, ...x) { if (sfx && up() && fx[k]) try { fx[k](...x); } catch (e) {} },
    setSfx(v) { sfx = v; }, setMusic(v) { music = v; if (!v) { clearInterval(loop); loop = null; } else machine(); },
    muffle(v) { if (hum) hum.gain.setTargetAtTime(v ? 0.02 : 0.1, a.currentTime, 0.2); }
  };
})();

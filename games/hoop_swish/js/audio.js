/* HOOP SWISH — ball thumps, rim clanks, net swishes, a spray-can hiss for the
   UI and a boom-bap beat with a dusty bass line. */
window.Sound = (() => {
  let a, out, beat, loop, sfx = true, music = true;
  const hz = n => 440 * 2 ** ((n - 69) / 12);
  const up = () => { if (a) return true; const A = window.AudioContext || window.webkitAudioContext; if (!A) return false; a = new A(); out = a.createGain(); out.gain.value = 0.5; out.connect(a.destination); beat = a.createGain(); beat.gain.value = 0.18; beat.connect(out); return true; };
  function t(type, f0, f1, len, v, at = 0, dest = out) { const s = a.currentTime + at, o = a.createOscillator(), g = a.createGain(); o.type = type; o.frequency.setValueAtTime(f0, s); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), s + len); g.gain.setValueAtTime(v, s); g.gain.exponentialRampToValueAtTime(0.0001, s + len); o.connect(g); g.connect(dest); o.start(s); o.stop(s + len + 0.02); }
  function n(len, v, f, at = 0, type = "bandpass", q = 1, dest = out) { const s = a.currentTime + at, c = Math.floor(a.sampleRate * len), b = a.createBuffer(1, c, a.sampleRate), d = b.getChannelData(0); for (let i = 0; i < c; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / c) ** 1.5; const src = a.createBufferSource(), fl = a.createBiquadFilter(), g = a.createGain(); src.buffer = b; fl.type = type; fl.frequency.value = f; fl.Q.value = q; g.gain.value = v; src.connect(fl); fl.connect(g); g.connect(dest); src.start(s); }
  const fx = {
    shoot: () => { n(0.12, 0.25, 1200, 0, "bandpass", 0.8); t("sine", 160, 90, 0.08, 0.2); },
    bounce: v => { t("sine", 120, 55, 0.18, Math.min(0.6, v)); n(0.05, Math.min(0.3, v * 0.5), 400); },
    rim: v => { t("square", 520, 480, 0.12, Math.min(0.15, v * 0.2)); t("sine", 1240, 1200, 0.3, Math.min(0.15, v * 0.2)); n(0.05, 0.2, 3000, 0, "bandpass", 4); },
    board: v => { n(0.1, Math.min(0.5, v), 700, 0, "bandpass", 1.5); t("triangle", 200, 120, 0.1, 0.15); },
    swish: () => { n(0.35, 0.45, 5000, 0, "highpass", 0.5); n(0.3, 0.3, 2500, 0.05, "bandpass", 0.8); },
    score: k => [0, 4, 7].forEach((m, i) => t("square", hz(72 + m + Math.min(k, 6)), hz(72 + m + Math.min(k, 6)), 0.08, 0.06, i * 0.05)),
    fire: () => { n(0.8, 0.4, 600, 0, "lowpass"); t("sawtooth", 100, 600, 0.6, 0.1); },
    buzzer: () => { t("sawtooth", 220, 220, 0.9, 0.12); t("square", 223, 223, 0.9, 0.08); },
    miss: () => t("triangle", 300, 200, 0.2, 0.15),
    spray: () => n(0.25, 0.3, 7000, 0, "highpass", 0.7),
    tick: () => t("sine", 1800, 1800, 0.03, 0.08)
  };
  function boombap() {
    if (!a || loop || !music) return;
    const bass = [36, 36, 0, 39, 0, 41, 39, 0, 34, 34, 0, 36, 0, 39, 36, 0];
    let s = 0, next = a.currentTime + 0.1;
    loop = setInterval(() => {
      while (next < a.currentTime + 0.3) {
        const at = next - a.currentTime;
        if (s % 8 === 0 || s % 16 === 10) t("sine", 110, 40, 0.25, 0.9, at, beat);
        if (s % 8 === 4) { n(0.18, 0.7, 1800, at, "bandpass", 0.7, beat); n(0.12, 0.4, 5000, at, "highpass", 1, beat); }
        if (s % 2 === 0) n(0.03, s % 4 === 2 ? 0.25 : 0.12, 9000, at, "highpass", 1, beat);
        if (bass[s % 16]) t("triangle", hz(bass[s % 16]), hz(bass[s % 16]), 0.2, 0.5, at, beat);
        next += 0.15; s++;
      }
    }, 60);
  }
  return {
    unlock() { if (!up()) return; if (a.state === "suspended") a.resume(); boombap(); },
    sfx(k, ...x) { if (sfx && up() && fx[k]) try { fx[k](...x); } catch (e) {} },
    setSfx(v) { sfx = v; }, setMusic(v) { music = v; if (!v) { clearInterval(loop); loop = null; } else boombap(); },
    muffle(v) { if (beat) beat.gain.setTargetAtTime(v ? 0.04 : 0.18, a.currentTime, 0.2); }
  };
})();

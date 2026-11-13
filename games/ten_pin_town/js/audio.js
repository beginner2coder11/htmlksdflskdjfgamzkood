/* TEN PIN TOWN — the ball's rumble down the boards, wooden pin clatter, a bell for
   strikes and a soft vibraphone-and-brushes lounge loop (all synthesized). */
window.Sound = (() => {
  let a, out, mus, loop, rum, rumG, sfx = true, music = true;
  const hz = n => 440 * 2 ** ((n - 69) / 12);
  const up = () => {
    if (a) return true;
    const A = window.AudioContext || window.webkitAudioContext; if (!A) return false;
    a = new A(); out = a.createGain(); out.gain.value = 0.55; out.connect(a.destination);
    mus = a.createGain(); mus.gain.value = 0.12; mus.connect(out);
    return true;
  };
  function t(type, f0, f1, len, v, at = 0, dest = out) { const s = a.currentTime + at, o = a.createOscillator(), g = a.createGain(); o.type = type; o.frequency.setValueAtTime(f0, s); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), s + len); g.gain.setValueAtTime(v, s); g.gain.exponentialRampToValueAtTime(0.0001, s + len); o.connect(g); g.connect(dest); o.start(s); o.stop(s + len + 0.02); }
  function n(len, v, f, at = 0, type = "bandpass", q = 1, dest = out) { const s = a.currentTime + at, c = Math.floor(a.sampleRate * len), b = a.createBuffer(1, c, a.sampleRate), d = b.getChannelData(0); for (let i = 0; i < c; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / c) ** 2; const src = a.createBufferSource(), fl = a.createBiquadFilter(), g = a.createGain(); src.buffer = b; fl.type = type; fl.frequency.value = f; fl.Q.value = q; g.gain.value = v; src.connect(fl); fl.connect(g); g.connect(dest); src.start(s); }
  let lastPin = 0;
  const fx = {
    release: () => { n(0.15, 0.4, 300, 0, "lowpass"); t("sine", 90, 60, 0.2, 0.4); rumble(true); },
    pin: v => {   // wooden "tok": a short noise click and two hollow partials
      if (a.currentTime - lastPin < 0.012) return; lastPin = a.currentTime;
      const k = Math.min(1, v / 6), f = 900 + Math.random() * 700;
      n(0.06, 0.25 + k * 0.5, f * 2, 0, "bandpass", 3); t("triangle", f, f * 0.92, 0.09, 0.08 + k * 0.2); t("sine", f * 2.7, f * 2.5, 0.05, 0.05 + k * 0.1);
    },
    kick: v => n(0.08, Math.min(0.4, 0.1 + v * 0.08), 400, 0, "bandpass", 1.5),
    gutter: () => { n(0.5, 0.35, 180, 0, "lowpass"); t("sine", 70, 45, 0.5, 0.3); },
    strike: () => { rumble(false); [0, 4, 7, 12, 16].forEach((m, i) => t("triangle", hz(72 + m), hz(72 + m), 0.35, 0.12, i * 0.07)); t("sine", 2093, 2093, 1.2, 0.12, 0.35); t("sine", 2637, 2637, 1.0, 0.08, 0.38); },
    spare: () => { rumble(false); [0, 7, 12].forEach((m, i) => t("triangle", hz(67 + m), hz(67 + m), 0.3, 0.12, i * 0.08)); },
    aw: () => { rumble(false); t("sawtooth", 330, 220, 0.5, 0.06); },
    tap: () => t("sine", 1320, 1320, 0.05, 0.08),
    coin: () => { t("square", 1568, 1568, 0.06, 0.05); t("square", 2093, 2093, 0.12, 0.05, 0.06); }
  };
  // the roll: low filtered noise that fades out once the ball reaches the pit
  function rumble(on) {
    if (!a) return;
    if (on) {
      if (rum) return;
      const len = 2, b = a.createBuffer(1, a.sampleRate * len, a.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      rum = a.createBufferSource(); rum.buffer = b; rum.loop = true;
      const fl = a.createBiquadFilter(); fl.type = "lowpass"; fl.frequency.value = 160;
      rumG = a.createGain(); rumG.gain.setValueAtTime(0.0001, a.currentTime); rumG.gain.exponentialRampToValueAtTime(0.35, a.currentTime + 0.3);
      rum.connect(fl); fl.connect(rumG); rumG.connect(out); rum.start();
      setTimeout(() => rumble(false), 3600);
    } else if (rum) {
      rumG.gain.setTargetAtTime(0.0001, a.currentTime, 0.15); const r = rum; rum = null; setTimeout(() => { try { r.stop(); } catch (e) {} }, 800);
    }
  }
  // lounge loop: vibraphone seventh chords on a swung shuffle with brushed snare
  function lounge() {
    if (!a || loop || !music) return;
    const chords = [[60, 64, 67, 71], [57, 60, 64, 67], [62, 65, 69, 72], [55, 59, 62, 65]];
    let s = 0, next = a.currentTime + 0.1;
    loop = setInterval(() => {
      while (next < a.currentTime + 0.3) {
        const at = next - a.currentTime, bar = Math.floor(s / 8) % 4, beat = s % 8;
        if (beat === 0 || beat === 5) chords[bar].forEach((m, i) => t("sine", hz(m), hz(m), 1.2, 0.18, at + i * 0.015, mus));
        if (beat % 2 === 0) t("triangle", hz(chords[bar][0] - 24 + (beat === 4 ? 7 : 0)), hz(chords[bar][0] - 24), 0.3, 0.5, at, mus);
        n(0.12, beat % 4 === 2 ? 0.25 : 0.1, 6000, at, "highpass", 0.6, mus);
        next += beat % 2 === 0 ? 0.24 : 0.16; s++;
      }
    }, 60);
  }
  return {
    unlock() { if (!up()) return; if (a.state === "suspended") a.resume(); lounge(); },
    sfx(k, ...x) { if (sfx && up() && fx[k]) try { fx[k](...x); } catch (e) {} },
    setSfx(v) { sfx = v; }, setMusic(v) { music = v; if (!v) { clearInterval(loop); loop = null; } else lounge(); },
    muffle(v) { if (mus) mus.gain.setTargetAtTime(v ? 0.04 : 0.12, a.currentTime, 0.2); }
  };
})();

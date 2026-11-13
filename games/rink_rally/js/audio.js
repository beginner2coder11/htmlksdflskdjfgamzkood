/* RINK RALLY — plastic puck clacks, rim thuds, an air-table hiss, a brassy
   goal stab and a disco bass + hi-hat groove. */
window.Sound = (() => {
  let a, out, mus, air, loop, sfx = true, music = true;
  const hz = n => 440 * 2 ** ((n - 69) / 12);
  function up() {
    if (a) return true; const A = window.AudioContext || window.webkitAudioContext; if (!A) return false;
    a = new A(); out = a.createGain(); out.gain.value = 0.5; out.connect(a.destination); mus = a.createGain(); mus.gain.value = 0.14; mus.connect(out);
    const b = a.createBuffer(1, a.sampleRate * 2, a.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const s = a.createBufferSource(), f = a.createBiquadFilter(); air = a.createGain(); s.buffer = b; s.loop = true; f.type = "highpass"; f.frequency.value = 5000; air.gain.value = 0; s.connect(f); f.connect(air); air.connect(out); s.start();
    return true;
  }
  function t(type, f0, f1, len, v, at = 0, dest = out) { const s = a.currentTime + at, o = a.createOscillator(), g = a.createGain(); o.type = type; o.frequency.setValueAtTime(f0, s); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), s + len); g.gain.setValueAtTime(v, s); g.gain.exponentialRampToValueAtTime(0.0001, s + len); o.connect(g); g.connect(dest); o.start(s); o.stop(s + len + 0.02); }
  function n(len, v, f, at = 0, type = "bandpass", q = 1, dest = out) { const s = a.currentTime + at, c = Math.floor(a.sampleRate * len), b = a.createBuffer(1, c, a.sampleRate), d = b.getChannelData(0); for (let i = 0; i < c; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / c) ** 2; const src = a.createBufferSource(), fl = a.createBiquadFilter(), g = a.createGain(); src.buffer = b; fl.type = type; fl.frequency.value = f; fl.Q.value = q; g.gain.value = v; src.connect(fl); fl.connect(g); g.connect(dest); src.start(s); }
  function brass(m, at, len, v) { [0, 4, 7].forEach(i => { t("sawtooth", hz(m + i), hz(m + i) * 0.99, len, v, at); }); }
  let last = 0;
  const fx = {
    hit: p => { if (a.currentTime - last < 0.03) return; last = a.currentTime; n(0.05, 0.3 + p * 0.5, 2600 + p * 1200, 0, "bandpass", 3); t("triangle", 900 + p * 500, 400, 0.05, 0.15 + p * 0.2); },
    wall: p => { n(0.06, 0.15 + p * 0.35, 900, 0, "bandpass", 2); t("sine", 180, 90, 0.08, 0.1 + p * 0.2); },
    goal: mine => { brass(mine ? 62 : 55, 0, 0.18, 0.06); brass(mine ? 67 : 53, 0.2, 0.5, 0.07); n(0.6, 0.3, 800, 0.05, "lowpass"); },
    win: () => [60, 64, 67, 72, 76].forEach((m, i) => brass(m, i * 0.12, 0.3, 0.05)),
    lose: () => [64, 60, 57, 52].forEach((m, i) => t("triangle", hz(m), hz(m) * 0.97, 0.3, 0.2, i * 0.18)),
    drop: () => { t("sine", 600, 300, 0.12, 0.2); },
    tap: () => n(0.03, 0.3, 4000, 0, "bandpass", 2)
  };
  function groove() {
    if (!a || loop || !music) return;
    const bass = [40, 52, 40, 52, 43, 55, 45, 57, 38, 50, 38, 50, 43, 55, 47, 59];
    let s = 0, next = a.currentTime + 0.1;
    loop = setInterval(() => {
      while (next < a.currentTime + 0.25) {
        const at = next - a.currentTime;
        t("square", hz(bass[s % 16]), hz(bass[s % 16]), 0.11, 0.18, at, mus);
        if (s % 4 === 0) t("sine", 120, 45, 0.18, 0.7, at, mus);
        n(0.03, s % 2 ? 0.18 : 0.08, 8000, at, "highpass", 1, mus);
        if (s % 8 === 4) n(0.12, 0.4, 1800, at, "bandpass", 1, mus);
        if (s % 32 === 28) [64, 67, 71, 74].forEach(m => t("sawtooth", hz(m), hz(m), 0.3, 0.025, at, mus));
        next += 0.125; s++;
      }
    }, 50);
  }
  return {
    unlock() { if (!up()) return; if (a.state === "suspended") a.resume(); groove(); },
    sfx(k, ...x) { if (sfx && up() && fx[k]) try { fx[k](...x); } catch (e) {} },
    air(on) { if (air) air.gain.setTargetAtTime(on && sfx ? 0.012 : 0, a.currentTime, 0.3); },
    setSfx(v) { sfx = v; }, setMusic(v) { music = v; if (!v) { clearInterval(loop); loop = null; } else groove(); },
    muffle(v) { if (mus) mus.gain.setTargetAtTime(v ? 0.03 : 0.14, a.currentTime, 0.2); }
  };
})();

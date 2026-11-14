/* LANE RUSH — engine drone that follows speed, whooshes for near misses,
   coin pings, honks, crash crunch and a laid-back lo-fi chord loop. */
window.Sound = (() => {
  let a, out, eng, engF, engG, lofi, loop, sfx = true, music = true;
  const hz = n => 440 * 2 ** ((n - 69) / 12);
  function boot() {
    if (a) return true; const A = window.AudioContext || window.webkitAudioContext; if (!A) return false;
    a = new A(); out = a.createGain(); out.gain.value = 0.5; out.connect(a.destination);
    lofi = a.createGain(); lofi.gain.value = 0.12; const lp = a.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1400; lofi.connect(lp); lp.connect(out);
    eng = a.createOscillator(); eng.type = "sawtooth"; eng.frequency.value = 60;
    const sub = a.createOscillator(); sub.type = "square"; sub.frequency.value = 30;
    engF = a.createBiquadFilter(); engF.type = "lowpass"; engF.frequency.value = 300; engF.Q.value = 4;
    engG = a.createGain(); engG.gain.value = 0;
    eng.connect(engF); sub.connect(engF); engF.connect(engG); engG.connect(out); eng.start(); sub.start();
    eng._sub = sub; return true;
  }
  function noise(len, vol, f0, f1, at = 0, type = "bandpass") { const s = a.currentTime + at, n = Math.floor(a.sampleRate * len), b = a.createBuffer(1, n, a.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(); src.buffer = b; f.type = type; f.frequency.setValueAtTime(f0, s); f.frequency.exponentialRampToValueAtTime(f1, s + len); g.gain.setValueAtTime(0.0001, s); g.gain.exponentialRampToValueAtTime(vol, s + len * 0.3); g.gain.exponentialRampToValueAtTime(0.0001, s + len); src.connect(f); f.connect(g); g.connect(out); src.start(s); }
  function beep(type, f0, f1, len, vol, at = 0, dest = out) { const s = a.currentTime + at, o = a.createOscillator(), g = a.createGain(); o.type = type; o.frequency.setValueAtTime(f0, s); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), s + len); g.gain.setValueAtTime(vol, s); g.gain.exponentialRampToValueAtTime(0.0001, s + len); o.connect(g); g.connect(dest); o.start(s); o.stop(s + len + 0.02); }
  function epiano(n, at, v, len = 1.6) { beep("sine", hz(n), hz(n), len, v, at, lofi); beep("triangle", hz(n) * 2, hz(n) * 2, len * 0.4, v * 0.2, at, lofi); }
  const fx = {
    near: combo => { noise(0.35, 0.35, 600, 3000 + combo * 200); beep("sine", 600 + combo * 60, 900 + combo * 80, 0.12, 0.08); },
    coin: () => { beep("square", 1568, 1568, 0.06, 0.06); beep("square", 2093, 2093, 0.1, 0.06, 0.05); },
    pickup: () => [0, 4, 7, 12].forEach((n, i) => beep("triangle", hz(72 + n), hz(72 + n), 0.12, 0.15, i * 0.05)),
    honk: () => { beep("square", 370, 360, 0.25, 0.05); beep("square", 466, 455, 0.25, 0.04); },
    crash: () => { noise(0.6, 0.9, 1500, 120, 0, "lowpass"); beep("sawtooth", 120, 40, 0.5, 0.25); for (let i = 0; i < 5; i++) beep("triangle", 2000 + Math.random() * 2000, 800, 0.08, 0.05, 0.05 + i * 0.05); },
    smash: () => { noise(0.3, 0.6, 2000, 300, 0, "lowpass"); beep("sine", 200, 80, 0.2, 0.2); },
    nitro: () => noise(0.5, 0.3, 300, 1800),
    area: () => [0, 7, 12, 16].forEach((n, i) => epiano(67 + n, i * 0.1, 0.25)),
    mission: () => [0, 4, 7, 11, 14].forEach((n, i) => beep("triangle", hz(72 + n), hz(72 + n), 0.2, 0.15, i * 0.07)),
    tap: () => beep("sine", 900, 700, 0.05, 0.1),
    count: hi => beep("square", hi ? 880 : 440, hi ? 880 : 440, hi ? 0.4 : 0.15, 0.1)
  };
  function chill() {
    if (!a || loop || !music) return;
    const chords = [[57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 65], [52, 55, 59, 62]];
    let i = 0, next = a.currentTime + 0.1;
    loop = setInterval(() => {
      while (next < a.currentTime + 0.5) {
        const at = next - a.currentTime, ch = chords[i % 4];
        ch.forEach((n, k) => epiano(n, at + k * 0.03, 0.13, 2.2));
        beep("sine", hz(ch[0] - 12), hz(ch[0] - 12), 0.9, 0.3, at, lofi);
        [0.6, 1.2].forEach(d => epiano(ch[(i + 2) % 4] + 12, at + d, 0.07, 0.6));
        next += 2.0; i++;
      }
    }, 200);
  }
  return {
    unlock() { if (!boot()) return; if (a.state === "suspended") a.resume(); chill(); },
    sfx(n, ...x) { if (sfx && boot() && fx[n]) try { fx[n](...x); } catch (e) {} },
    engine(speed, on, boost) {
      if (!a) return; const t = a.currentTime, f = 40 + speed * 0.14 * (boost ? 1.2 : 1);
      eng.frequency.setTargetAtTime(f, t, 0.1); eng._sub.frequency.setTargetAtTime(f / 2, t, 0.1);
      engF.frequency.setTargetAtTime(200 + speed * (boost ? 1.6 : 0.9), t, 0.1);
      engG.gain.setTargetAtTime(on && sfx ? 0.07 : 0, t, 0.1);
    },
    setSfx(v) { sfx = v; }, setMusic(v) { music = v; if (!v) { clearInterval(loop); loop = null; } else chill(); },
    muffle(v) { if (lofi) lofi.gain.setTargetAtTime(v ? 0.03 : 0.12, a.currentTime, 0.2); }
  };
})();

/* MOON HOPPER — rocket rumble that follows the throttle, teletype blips,
   a master-alarm buzz on low fuel, landing chime and a slow space drone. */
window.Sound = (() => {
  let a, out, rumble, rg, drone, alarmT = 0, sfx = true, music = true;
  const hz = n => 440 * 2 ** ((n - 69) / 12);
  function up() {
    if (a) return true; const A = window.AudioContext || window.webkitAudioContext; if (!A) return false;
    a = new A(); out = a.createGain(); out.gain.value = 0.5; out.connect(a.destination);
    const b = a.createBuffer(1, a.sampleRate * 2, a.sampleRate), d = b.getChannelData(0); let l = 0; for (let i = 0; i < d.length; i++) { l = (l + 0.04 * (Math.random() * 2 - 1)) / 1.04; d[i] = l * 4; }
    rumble = a.createBufferSource(); rumble.buffer = b; rumble.loop = true; const f = a.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 500; rg = a.createGain(); rg.gain.value = 0; rumble.connect(f); f.connect(rg); rg.connect(out); rumble.start();
    drone = a.createGain(); drone.gain.value = 0; drone.connect(out);
    [36, 43, 48].forEach((n, i) => { const o = a.createOscillator(), g = a.createGain(), lfo = a.createOscillator(), lg = a.createGain(); o.type = "sine"; o.frequency.value = hz(n); lfo.frequency.value = 0.07 + i * 0.03; lg.gain.value = 0.25; lfo.connect(lg); lg.connect(g.gain); g.gain.value = 0.3; o.connect(g); g.connect(drone); o.start(); lfo.start(); });
    return true;
  }
  function t(type, f0, f1, len, v, at = 0) { const s = a.currentTime + at, o = a.createOscillator(), g = a.createGain(); o.type = type; o.frequency.setValueAtTime(f0, s); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), s + len); g.gain.setValueAtTime(v, s); g.gain.exponentialRampToValueAtTime(0.0001, s + len); o.connect(g); g.connect(out); o.start(s); o.stop(s + len + 0.02); }
  function boom() { const c = a.sampleRate * 1.2, b = a.createBuffer(1, c, a.sampleRate), d = b.getChannelData(0); for (let i = 0; i < c; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / c) ** 2; const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(); s.buffer = b; f.type = "lowpass"; f.frequency.value = 700; g.gain.value = 0.9; s.connect(f); f.connect(g); g.connect(out); s.start(); }
  const fx = {
    blip: () => t("square", 1800, 1800, 0.03, 0.05),
    type: () => t("square", 900 + Math.random() * 600, 600, 0.02, 0.04),
    alarm: () => { if (a.currentTime - alarmT < 0.6) return; alarmT = a.currentTime; t("square", 880, 880, 0.15, 0.06); t("square", 660, 660, 0.15, 0.06, 0.18); },
    land: () => [0, 7, 12, 16].forEach((m, i) => t("sine", hz(72 + m), hz(72 + m), 0.6, 0.15, i * 0.12)),
    crash: () => { boom(); t("sawtooth", 200, 40, 0.8, 0.2); },
    star: i => t("sine", hz(84 + [0, 4, 7][i]), hz(84 + [0, 4, 7][i]), 0.5, 0.15),
    tap: () => t("square", 1400, 1000, 0.03, 0.05)
  };
  return {
    unlock() { if (!up()) return; if (a.state === "suspended") a.resume(); if (music) drone.gain.setTargetAtTime(0.08, a.currentTime, 2); },
    sfx(n, ...x) { if (sfx && up() && fx[n]) try { fx[n](...x); } catch (e) {} },
    engine(p) { if (rg) rg.gain.setTargetAtTime(sfx ? p * 0.5 : 0, a.currentTime, 0.05); },
    setSfx(v) { sfx = v; if (!v && rg) rg.gain.value = 0; }, setMusic(v) { music = v; if (drone) drone.gain.setTargetAtTime(v ? 0.08 : 0, a.currentTime, 0.5); },
    muffle(v) { if (drone && music) drone.gain.setTargetAtTime(v ? 0.02 : 0.08, a.currentTime, 0.3); if (v) this.engine(0); }
  };
})();

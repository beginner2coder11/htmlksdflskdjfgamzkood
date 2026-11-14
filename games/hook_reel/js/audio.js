/* HOOK & REEL — splash, reel ratchet, bloops for each catch, jellyfish zap,
   coin counting and a gentle shakuhachi-like flute over a water drone. */
window.Sound = (() => {
  let a, out, mus, loop, reelT = 0, sfx = true, music = true;
  const hz = n => 440 * 2 ** ((n - 69) / 12);
  const up = () => { if (a) return true; const A = window.AudioContext || window.webkitAudioContext; if (!A) return false; a = new A(); out = a.createGain(); out.gain.value = 0.5; out.connect(a.destination); mus = a.createGain(); mus.gain.value = 0.12; mus.connect(out); return true; };
  function t(type, f0, f1, len, v, at = 0, dest = out) { const s = a.currentTime + at, o = a.createOscillator(), g = a.createGain(); o.type = type; o.frequency.setValueAtTime(f0, s); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), s + len); g.gain.setValueAtTime(0.0001, s); g.gain.exponentialRampToValueAtTime(v, s + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, s + len); o.connect(g); g.connect(dest); o.start(s); o.stop(s + len + 0.02); }
  function n(len, v, f, at = 0, type = "bandpass") { const s = a.currentTime + at, c = Math.floor(a.sampleRate * len), b = a.createBuffer(1, c, a.sampleRate), d = b.getChannelData(0); for (let i = 0; i < c; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / c); const src = a.createBufferSource(), fl = a.createBiquadFilter(), g = a.createGain(); src.buffer = b; fl.type = type; fl.frequency.value = f; g.gain.value = v; src.connect(fl); fl.connect(g); g.connect(out); src.start(s); }
  function flute(m, at, len, v) { const s = a.currentTime + at, o = a.createOscillator(), g = a.createGain(), vib = a.createOscillator(), vg = a.createGain(); o.type = "sine"; o.frequency.value = hz(m); vib.frequency.value = 5; vg.gain.value = hz(m) * 0.012; vib.connect(vg); vg.connect(o.frequency); g.gain.setValueAtTime(0.0001, s); g.gain.exponentialRampToValueAtTime(v, s + 0.25); g.gain.exponentialRampToValueAtTime(0.0001, s + len); o.connect(g); g.connect(mus); o.start(s); vib.start(s); o.stop(s + len); vib.stop(s + len); n(len * 0.5, v * 0.15, hz(m) * 2, at); }
  const fx = {
    splash: () => { n(0.5, 0.6, 900, 0, "lowpass"); n(0.3, 0.3, 3000, 0.05); },
    reel: () => { if (a.currentTime - reelT < 0.07) return; reelT = a.currentTime; n(0.02, 0.15, 4000); },
    catch: k => { t("sine", 500 + k * 40, 1100 + k * 60, 0.1, 0.25); },
    bump: () => { t("triangle", 300, 150, 0.15, 0.25); n(0.08, 0.2, 800); },
    zap: () => { t("sawtooth", 1200, 200, 0.25, 0.12); n(0.2, 0.2, 5000); },
    coin: () => t("square", 1568, 1568, 0.05, 0.05),
    rare: () => [0, 4, 7, 12, 16].forEach((m, i) => t("sine", hz(76 + m), hz(76 + m), 0.4, 0.15, i * 0.07)),
    turn: () => [72, 67, 60].forEach((m, i) => t("sine", hz(m), hz(m), 0.3, 0.15, i * 0.08)),
    buy: () => [0, 7, 12].forEach((m, i) => t("triangle", hz(72 + m), hz(72 + m), 0.2, 0.15, i * 0.06)),
    tap: () => t("sine", 900, 700, 0.05, 0.1)
  };
  function tune() {
    if (!a || loop || !music) return;
    const scale = [62, 65, 67, 69, 72, 74, 77, 79]; let idx = 3, next = a.currentTime + 0.5;
    loop = setInterval(() => {
      while (next < a.currentTime + 1) { const at = next - a.currentTime; if (Math.random() < 0.7) { idx = Math.max(0, Math.min(7, idx + [-2, -1, 1, 2][Math.floor(Math.random() * 4)])); flute(scale[idx], at, 1.4 + Math.random(), 0.2); } if (Math.random() < 0.3) flute(scale[0] - 12, at, 3, 0.12); next += 1.1 + Math.random() * 0.8; }
    }, 300);
  }
  return {
    unlock() { if (!up()) return; if (a.state === "suspended") a.resume(); tune(); },
    sfx(k, ...x) { if (sfx && up() && fx[k]) try { fx[k](...x); } catch (e) {} },
    setSfx(v) { sfx = v; }, setMusic(v) { music = v; if (!v) { clearInterval(loop); loop = null; } else tune(); },
    muffle(v) { if (mus) mus.gain.setTargetAtTime(v ? 0.03 : 0.12, a.currentTime, 0.3); }
  };
})();

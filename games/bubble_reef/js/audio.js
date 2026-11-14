/* BUBBLE REEF — synthesized underwater sound: bloops, pops, sonar pings and an
   ambient pad heard "through water" (everything runs into a low-pass filter). */
window.Sound = (() => {
  let ctx, out, water, pad, padTimer, sfxOn = true, musicOn = true;
  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    ctx = new AC();
    out = ctx.createGain(); out.gain.value = 0.6; out.connect(ctx.destination);
    water = ctx.createBiquadFilter(); water.type = "lowpass"; water.frequency.value = 2600; water.Q.value = 2; water.connect(out);
    pad = ctx.createGain(); pad.gain.value = 0.0; pad.connect(water);
    return ctx;
  }
  function osc(type, f0, f1, t, len, vol, dest = water) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + len);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + len + 0.05);
  }
  const bloop = (f, t, v = 0.3) => { osc("sine", f, f * 2.4, t, 0.09, v); };
  const S = {
    shoot() { const t = ctx.currentTime; osc("sine", 300, 900, t, 0.12, 0.25); osc("triangle", 1800, 400, t, 0.06, 0.05); },
    bounce() { bloop(700, ctx.currentTime, 0.12); },
    stick() { osc("sine", 220, 160, ctx.currentTime, 0.12, 0.25); },
    pop(i = 0) { const t = ctx.currentTime + i * 0.035; bloop(500 + (i % 8) * 70, t, 0.22); osc("triangle", 2400, 1200, t, 0.03, 0.05); },
    drop(i = 0) { const t = ctx.currentTime + 0.2 + i * 0.04; osc("sine", 900 - i * 20, 300, t, 0.2, 0.12); },
    fish() { const t = ctx.currentTime; [0, 5, 9, 12].forEach((n, i) => osc("sine", 523 * Math.pow(2, n / 12), 523 * Math.pow(2, n / 12) * 1.01, t + i * 0.07, 0.25, 0.2)); },
    boom() { const t = ctx.currentTime; osc("sine", 140, 35, t, 0.6, 0.6); for (let i = 0; i < 8; i++) bloop(300 + Math.random() * 800, t + 0.05 + i * 0.03, 0.12); },
    row() { const t = ctx.currentTime; osc("sawtooth", 90, 60, t, 0.35, 0.15); },
    swap() { bloop(600, ctx.currentTime, 0.15); bloop(800, ctx.currentTime + 0.06, 0.15); },
    sonar() { osc("sine", 1400, 1380, ctx.currentTime, 0.9, 0.18); },
    win() { const t = ctx.currentTime; [0, 4, 7, 11, 14, 19].forEach((n, i) => osc("sine", 392 * Math.pow(2, n / 12), 392 * Math.pow(2, n / 12), t + i * 0.09, 0.6, 0.2)); },
    lose() { const t = ctx.currentTime; [7, 3, 0, -5].forEach((n, i) => osc("triangle", 330 * Math.pow(2, n / 12), 320 * Math.pow(2, n / 12), t + i * 0.15, 0.4, 0.2)); },
    tap() { bloop(900, ctx.currentTime, 0.1); },
    coin() { const t = ctx.currentTime; osc("sine", 1568, 1568, t, 0.15, 0.15); osc("sine", 2093, 2093, t + 0.06, 0.2, 0.12); }
  };
  // ambient: slow chords of soft sines + random bubbling
  function startPad() {
    if (!ctx || padTimer || !musicOn) return;
    pad.gain.setTargetAtTime(0.11, ctx.currentTime, 1);
    const chords = [[48, 55, 62, 67], [45, 52, 60, 64], [41, 48, 57, 64], [43, 50, 59, 62]];
    let i = 0, next = ctx.currentTime;
    const tick = () => {
      if (next < ctx.currentTime + 0.5) {
        chords[i++ % 4].forEach(n => {
          const f = 440 * Math.pow(2, (n - 69) / 12), o = ctx.createOscillator(), g = ctx.createGain();
          o.type = "sine"; o.frequency.value = f; o.detune.value = (Math.random() - 0.5) * 12;
          g.gain.setValueAtTime(0.0001, next); g.gain.exponentialRampToValueAtTime(0.25, next + 1.5); g.gain.exponentialRampToValueAtTime(0.0001, next + 4.2);
          o.connect(g); g.connect(pad); o.start(next); o.stop(next + 4.3);
        });
        next += 4;
      }
      if (Math.random() < 0.25) osc("sine", 400 + Math.random() * 600, 1200 + Math.random() * 800, ctx.currentTime, 0.05, 0.03, pad);
    };
    padTimer = setInterval(tick, 250); tick();
  }
  function stopPad() { clearInterval(padTimer); padTimer = null; if (pad) pad.gain.setTargetAtTime(0, ctx.currentTime, 0.3); }
  return {
    unlock() { if (!ensure()) return; if (ctx.state === "suspended") ctx.resume(); startPad(); },
    sfx(n, ...a) { if (!sfxOn || !ensure() || !S[n]) return; try { S[n](...a); } catch (e) {} },
    setSfx(v) { sfxOn = v; }, setMusic(v) { musicOn = v; v ? ctx && startPad() : stopPad(); },
    muffle(v) { if (water) water.frequency.setTargetAtTime(v ? 500 : 2600, ctx.currentTime, 0.2); }
  };
})();

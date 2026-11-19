/* SANDSTORM SURVIVORS — chiptune sound made in code: square-wave blips for gems, a crunchy
   "pop" when monsters go down (throttled so swarms don't get loud), zaps, booms, a level-up
   fanfare, a boss warning and a pulsing 8-bit loop. */
window.Sound = (() => {
  const P = window.GAME_CONFIG.storagePrefix;
  let a, out, mus, loopId = null, sfx = true, music = true, gemStep = 0, gemT = 0;
  const last = {};
  try { sfx = localStorage.getItem(P + "sfx") !== "0"; music = localStorage.getItem(P + "music") !== "0"; } catch (e) {}
  const hz = n => 440 * 2 ** ((n - 69) / 12);
  function up() { if (a) { if (a.state === "suspended") a.resume(); return true; } const A = window.AudioContext || window.webkitAudioContext; if (!A) return false; a = new A(); out = a.createGain(); out.gain.value = 0.45; out.connect(a.destination); mus = a.createGain(); mus.gain.value = music ? 0.1 : 0; mus.connect(out); return true; }
  function tone(type, f0, f1, len, v, at = 0, dest) { const s = a.currentTime + at, o = a.createOscillator(), g = a.createGain(); o.type = type; o.frequency.setValueAtTime(f0, s); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), s + len); g.gain.setValueAtTime(v, s); g.gain.exponentialRampToValueAtTime(0.0001, s + len); o.connect(g); g.connect(dest || out); o.start(s); o.stop(s + len + 0.02); }
  function noise(len, v, f, at = 0, type = "lowpass") { const s = a.currentTime + at, c = Math.floor(a.sampleRate * len), b = a.createBuffer(1, c, a.sampleRate), d = b.getChannelData(0); for (let i = 0; i < c; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / c); const src = a.createBufferSource(), fl = a.createBiquadFilter(), g = a.createGain(); src.buffer = b; fl.type = type; fl.frequency.value = f; g.gain.value = v; src.connect(fl); fl.connect(g); g.connect(out); src.start(s); }
  const gate = (k, ms) => { const n = performance.now(); if (last[k] && n - last[k] < ms) return false; last[k] = n; return true; };
  const fx = {
    shoot() { if (gate("shoot", 70)) tone("square", 880, 440, 0.06, 0.03); },
    hit() { if (gate("hit", 45)) noise(0.04, 0.12, 2500, 0, "highpass"); },
    pop() { if (gate("pop", 60)) { tone("square", 300, 90, 0.09, 0.05); noise(0.06, 0.1, 900); } },
    gem() { const n = a.currentTime; if (n - gemT > 0.4) gemStep = 0; gemT = n; if (!gate("gem", 35)) return; const m = 76 + [0, 2, 4, 7, 9, 12, 14, 16][Math.min(gemStep++, 7)]; tone("square", hz(m), hz(m), 0.05, 0.03); },
    coin() { tone("square", 1568, 1568, 0.05, 0.035); tone("square", 2093, 2093, 0.09, 0.035, 0.05); },
    zap() { if (gate("zap", 80)) { tone("sawtooth", 1800, 300, 0.12, 0.04); noise(0.08, 0.1, 4000, 0, "highpass"); } },
    boom() { if (gate("boom", 90)) { noise(0.35, 0.35, 400); tone("square", 120, 40, 0.3, 0.07); } },
    shock() { tone("sine", 200, 60, 0.3, 0.15); noise(0.25, 0.15, 600); },
    hurt() { if (gate("hurt", 200)) { tone("square", 200, 100, 0.15, 0.08); } },
    level() { [0, 4, 7, 12, 16].forEach((m, i) => tone("square", hz(72 + m), hz(72 + m), 0.1, 0.05, i * 0.07)); },
    pick() { tone("square", hz(84), hz(84), 0.06, 0.05); tone("square", hz(91), hz(91), 0.1, 0.05, 0.06); },
    chest() { [0, 4, 7, 11, 14, 19, 24].forEach((m, i) => tone("square", hz(67 + m), hz(67 + m), 0.12, 0.05, i * 0.06)); },
    boss() { for (let i = 0; i < 3; i++) { tone("sawtooth", 110, 100, 0.35, 0.08, i * 0.45); tone("square", 220, 210, 0.35, 0.03, i * 0.45); } },
    win() { [0, 4, 7, 12, 7, 12, 16, 19, 24].forEach((m, i) => tone("square", hz(67 + m), hz(67 + m), 0.14, 0.05, i * 0.1)); },
    lose() { [7, 4, 0, -5, -12].forEach((m, i) => tone("triangle", hz(60 + m), hz(60 + m), 0.25, 0.09, i * 0.16)); },
    heal() { tone("sine", hz(76), hz(88), 0.25, 0.08); },
    tap() { tone("square", 660, 660, 0.03, 0.04); }
  };
  function startMusic() {
    if (!a || loopId || !music) return;
    const bass = [45, 45, 52, 45, 43, 43, 50, 43, 41, 41, 48, 41, 40, 40, 47, 44];
    const lead = [69, 72, 76, 72, 67, 71, 74, 71, 65, 69, 72, 69, 64, 68, 71, 76];
    let step = 0, next = a.currentTime + 0.1;
    loopId = setInterval(() => { while (next < a.currentTime + 0.3) { const at = next - a.currentTime, i = step % 16; tone("triangle", hz(bass[i]), hz(bass[i]), 0.17, 0.25, at, mus); if (step % 2 === 0) tone("square", hz(lead[(step / 2) % 16]), hz(lead[(step / 2) % 16]), 0.1, 0.04, at, mus); if (i % 4 === 0) noise(0.05, 0.05, 6000, at, "highpass"); next += 0.16; step++; } }, 60);
  }
  return {
    unlock() { if (up()) startMusic(); },
    play(n) { if (sfx && a && fx[n]) fx[n](); },
    get sfx() { return sfx; }, get music() { return music; },
    toggleSfx() { sfx = !sfx; try { localStorage.setItem(P + "sfx", sfx ? "1" : "0"); } catch (e) {} return sfx; },
    toggleMusic() { music = !music; try { localStorage.setItem(P + "music", music ? "1" : "0"); } catch (e) {} if (a) { mus.gain.setTargetAtTime(music ? 0.1 : 0, a.currentTime, 0.2); if (music) startMusic(); else if (loopId) { clearInterval(loopId); loopId = null; } } return music; }
  };
})();

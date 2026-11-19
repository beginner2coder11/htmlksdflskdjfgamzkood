/* MEADOW KEEPER — synthesized sound: a soft music-box loop, birdsong by day and crickets at
   night, a "bloop" for nectar, a camera shutter, leaf rustles and a fanfare for new visitors. */
window.Sound = (() => {
  const P = window.GAME_CONFIG.storagePrefix;
  let a, out, mus, amb, loopId = null, ambId = null, sfx = true, music = true;
  try { sfx = localStorage.getItem(P + "sfx") !== "0"; music = localStorage.getItem(P + "music") !== "0"; } catch (e) {}
  const hz = n => 440 * 2 ** ((n - 69) / 12);
  function up() {
    if (a) { if (a.state === "suspended") a.resume(); return true; }
    const A = window.AudioContext || window.webkitAudioContext; if (!A) return false;
    a = new A(); out = a.createGain(); out.gain.value = 0.55; out.connect(a.destination);
    mus = a.createGain(); mus.gain.value = music ? 0.11 : 0; mus.connect(out);
    amb = a.createGain(); amb.gain.value = music ? 0.06 : 0; amb.connect(out);
    return true;
  }
  function tone(type, f0, f1, len, v, at = 0, dest) {
    const s = a.currentTime + at, o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, s); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), s + len);
    g.gain.setValueAtTime(0.0001, s); g.gain.exponentialRampToValueAtTime(v, s + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, s + len);
    o.connect(g); g.connect(dest || out); o.start(s); o.stop(s + len + 0.03);
  }
  const bell = (f, v, at = 0, dest) => { tone("sine", f, f, 1.1, v, at, dest); tone("sine", f * 3, f * 3, 0.35, v * 0.25, at, dest); };
  function noise(len, v, f, at = 0, type = "bandpass", q = 1, sweep) {
    const s = a.currentTime + at, c = Math.floor(a.sampleRate * len), b = a.createBuffer(1, c, a.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < c; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / c) ** 2;
    const src = a.createBufferSource(), fl = a.createBiquadFilter(), g = a.createGain();
    src.buffer = b; fl.type = type; fl.frequency.setValueAtTime(f, s); if (sweep) fl.frequency.exponentialRampToValueAtTime(sweep, s + len);
    fl.Q.value = q; g.gain.value = v; src.connect(fl); fl.connect(g); g.connect(out); src.start(s);
  }
  const fx = {
    drop() { tone("sine", 520, 980, 0.09, 0.12); tone("sine", 1200, 1400, 0.06, 0.05, 0.05); },
    shutter() { noise(0.04, 0.4, 3000, 0, "highpass", 0.7); noise(0.06, 0.3, 1800, 0.07, "bandpass", 2); tone("square", 2400, 2400, 0.02, 0.03, 0.02); },
    newSpecies() { [0, 4, 7, 12, 16].forEach((m, i) => bell(hz(74 + m), 0.12, i * 0.09)); },
    place() { tone("sine", 160, 90, 0.15, 0.2); [0, 7].forEach((m, i) => bell(hz(84 + m), 0.06, 0.06 + i * 0.06)); },
    rustle() { noise(0.6, 0.35, 1800, 0, "bandpass", 0.6, 600); noise(0.4, 0.25, 3000, 0.2, "highpass", 0.5); },
    tick() { tone("sine", 900, 900, 0.03, 0.05); },
    buy() { [0, 4, 7].forEach((m, i) => bell(hz(79 + m), 0.09, i * 0.06)); },
    arrive() { bell(hz(88), 0.06); bell(hz(93), 0.05, 0.12); },
    level() { [0, 4, 7, 12, 7, 12, 16, 19].forEach((m, i) => bell(hz(67 + m), 0.11, i * 0.1)); },
    tap() { tone("sine", 700, 700, 0.04, 0.06); },
    no() { tone("triangle", 300, 220, 0.18, 0.08); }
  };
  function startMusic() {
    if (!a || loopId || !music) return;
    const prog = [[60, 64, 67, 71], [57, 60, 64, 67], [65, 69, 72, 76], [62, 65, 69, 72]];
    let step = 0, next = a.currentTime + 0.2;
    loopId = setInterval(() => {
      while (next < a.currentTime + 0.5) {
        const at = next - a.currentTime, bar = Math.floor(step / 8) % 4, ch = prog[bar], i = step % 8;
        if (i === 0) tone("sine", hz(ch[0] - 24), hz(ch[0] - 24), 2.2, 0.16, at, mus);
        if ([0, 2, 3, 5, 6].includes(i)) bell(hz(ch[[0, 2, 1, 3, 2, 1, 2, 3][i]] + 12), 0.07, at, mus);
        next += 0.32; step++;
      }
    }, 120);
    ambId = setInterval(() => {   // birds by day, crickets at night
      if (!a || !music) return;
      if (window.Game && Game.isNight()) { for (let k = 0; k < 3; k++) tone("sine", 4200, 4300, 0.03, 0.02, k * 0.06, amb); }
      else if (Math.random() < 0.5) { const f = 2000 + Math.random() * 1500; for (let k = 0; k < 2 + Math.floor(Math.random() * 3); k++) tone("sine", f * (1 + k * 0.08), f * 1.3, 0.08, 0.05, k * 0.1, amb); }
    }, 1400);
  }
  function stopMusic() { if (loopId) { clearInterval(loopId); clearInterval(ambId); loopId = ambId = null; } }
  return {
    unlock() { if (up()) startMusic(); },
    play(n, ...args) { if (sfx && a && fx[n]) fx[n](...args); },
    get sfx() { return sfx; }, get music() { return music; },
    toggleSfx() { sfx = !sfx; try { localStorage.setItem(P + "sfx", sfx ? "1" : "0"); } catch (e) {} return sfx; },
    toggleMusic() { music = !music; try { localStorage.setItem(P + "music", music ? "1" : "0"); } catch (e) {} if (a) { mus.gain.setTargetAtTime(music ? 0.11 : 0, a.currentTime, 0.2); amb.gain.setTargetAtTime(music ? 0.06 : 0, a.currentTime, 0.2); if (music) startMusic(); else stopMusic(); } return music; }
  };
})();

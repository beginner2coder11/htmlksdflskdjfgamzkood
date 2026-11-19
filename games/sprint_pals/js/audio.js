/* SPRINT PALS — synthesized sound: coin blips that rise in pitch along a coin line, a swoosh
   for lane changes, jump and slide sounds, a crash thud, power-up jingles and an upbeat loop
   that speeds up a little as you run faster. */
window.Sound = (() => {
  const P = window.GAME_CONFIG.storagePrefix;
  let a, out, mus, loopId = null, sfx = true, music = true, tempo = 1, coinStep = 0, coinT = 0;
  try { sfx = localStorage.getItem(P + "sfx") !== "0"; music = localStorage.getItem(P + "music") !== "0"; } catch (e) {}
  const hz = n => 440 * 2 ** ((n - 69) / 12);
  function up() {
    if (a) { if (a.state === "suspended") a.resume(); return true; }
    const A = window.AudioContext || window.webkitAudioContext; if (!A) return false;
    a = new A(); out = a.createGain(); out.gain.value = 0.55; out.connect(a.destination);
    mus = a.createGain(); mus.gain.value = music ? 0.13 : 0; mus.connect(out);
    return true;
  }
  function tone(type, f0, f1, len, v, at = 0, dest) {
    const s = a.currentTime + at, o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, s); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), s + len);
    g.gain.setValueAtTime(0.0001, s); g.gain.exponentialRampToValueAtTime(v, s + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, s + len);
    o.connect(g); g.connect(dest || out); o.start(s); o.stop(s + len + 0.03);
  }
  function noise(len, v, f, at = 0, type = "bandpass", q = 1, sweep) {
    const s = a.currentTime + at, c = Math.floor(a.sampleRate * len), b = a.createBuffer(1, c, a.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < c; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / c) ** 2;
    const src = a.createBufferSource(), fl = a.createBiquadFilter(), g = a.createGain();
    src.buffer = b; fl.type = type; fl.frequency.setValueAtTime(f, s); if (sweep) fl.frequency.exponentialRampToValueAtTime(sweep, s + len);
    fl.Q.value = q; g.gain.value = v; src.connect(fl); fl.connect(g); g.connect(out); src.start(s);
  }
  const SC = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
  const fx = {
    coin() {
      const now = a.currentTime; if (now - coinT > 0.5) coinStep = 0; coinT = now;
      const n = 76 + SC[Math.min(coinStep++, SC.length - 1)];
      tone("square", hz(n), hz(n), 0.07, 0.035); tone("sine", hz(n + 12), hz(n + 12), 0.12, 0.04, 0.02);
    },
    swoosh() { noise(0.14, 0.18, 1600, 0, "bandpass", 1.2, 3000); },
    jump() { tone("sine", 300, 700, 0.16, 0.12); },
    land() { noise(0.08, 0.15, 400, 0, "lowpass"); },
    slide() { noise(0.3, 0.16, 900, 0, "bandpass", 0.8, 300); },
    crash() { noise(0.5, 0.45, 200, 0, "lowpass"); tone("sawtooth", 180, 50, 0.45, 0.12); tone("square", 600, 120, 0.25, 0.05, 0.05); },
    bump() { noise(0.15, 0.3, 300, 0, "lowpass"); tone("sine", 200, 120, 0.15, 0.1); },
    power() { [0, 4, 7, 12, 16].forEach((m, i) => tone("triangle", hz(72 + m), hz(72 + m), 0.18, 0.09, i * 0.05)); },
    shieldPop() { noise(0.3, 0.35, 2500, 0, "highpass", 0.7); tone("sine", 900, 300, 0.25, 0.1); },
    whoosh() { noise(0.6, 0.2, 500, 0, "bandpass", 0.7, 3000); },
    zone() { [0, 7, 12, 16, 19].forEach((m, i) => tone("triangle", hz(67 + m), hz(67 + m), 0.4, 0.09, i * 0.08)); },
    mission() { [0, 4, 7, 12].forEach((m, i) => tone("square", hz(76 + m), hz(76 + m), 0.12, 0.05, i * 0.07)); },
    close() { tone("sine", 1200, 1800, 0.08, 0.05); },
    tap() { tone("sine", 880, 880, 0.04, 0.06); },
    buy() { [0, 7, 12].forEach((m, i) => tone("square", hz(79 + m), hz(79 + m), 0.1, 0.05, i * 0.06)); }
  };
  // upbeat loop: bass + offbeat chords + hats; tempo follows the run speed
  function startMusic() {
    if (!a || loopId || !music) return;
    const prog = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];
    let step = 0, next = a.currentTime + 0.1;
    loopId = setInterval(() => {
      while (next < a.currentTime + 0.3) {
        const at = next - a.currentTime, bar = Math.floor(step / 8) % 4, ch = prog[bar], i = step % 8;
        if (i % 2 === 0) tone("triangle", hz(ch[0] - 12 + (i === 6 ? 7 : 0)), hz(ch[0] - 12), 0.2, 0.22, at, mus);
        if (i % 2 === 1) ch.forEach(m => tone("square", hz(m + 12), hz(m + 12), 0.08, 0.025, at, mus));
        noise(0.03, i % 2 ? 0.05 : 0.025, 8000, at, "highpass", 0.5);
        if (i === 0 || i === 4) tone("sine", 120, 45, 0.14, 0.3, at, mus);
        next += 0.15 / tempo; step++;
      }
    }, 60);
  }
  return {
    unlock() { if (up()) startMusic(); },
    play(n, ...args) { if (sfx && a && fx[n]) fx[n](...args); },
    setTempo(t) { tempo = t; },
    get sfx() { return sfx; }, get music() { return music; },
    toggleSfx() { sfx = !sfx; try { localStorage.setItem(P + "sfx", sfx ? "1" : "0"); } catch (e) {} return sfx; },
    toggleMusic() {
      music = !music; try { localStorage.setItem(P + "music", music ? "1" : "0"); } catch (e) {}
      if (a) { mus.gain.setTargetAtTime(music ? 0.13 : 0, a.currentTime, 0.2); if (music) startMusic(); else if (loopId) { clearInterval(loopId); loopId = null; } }
      return music;
    }
  };
})();

/* SLICE RUSH — sound made in code (WebAudio): blade swishes, juicy squishes (deeper for big fruit), rising combo
   dings, a bomb boom, a thud for a dropped fruit, power-fruit chimes and a bouncy loop. */
window.Sound = (() => {
  const P = window.GAME_CONFIG.storagePrefix;
  let a, out, mus, loopId = null, step = 0, sfx = true, music = true;
  try { sfx = localStorage.getItem(P + "sfx") !== "0"; music = localStorage.getItem(P + "music") !== "0"; } catch (e) {}
  const hz = n => 440 * 2 ** ((n - 69) / 12);
  function up() {
    if (a) { if (a.state === "suspended") a.resume(); return true; }
    const A = window.AudioContext || window.webkitAudioContext; if (!A) return false;
    a = new A(); out = a.createGain(); out.gain.value = 0.5; out.connect(a.destination);
    mus = a.createGain(); mus.gain.value = music ? 0.12 : 0; mus.connect(out); return true;
  }
  function tone(type, f0, f1, len, v, at = 0, dest) {
    const s = a.currentTime + at, o = a.createOscillator(), g = a.createGain(); o.type = type;
    o.frequency.setValueAtTime(f0, s); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), s + len);
    g.gain.setValueAtTime(0.0001, s); g.gain.exponentialRampToValueAtTime(v, s + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, s + len);
    o.connect(g); g.connect(dest || out); o.start(s); o.stop(s + len + 0.03);
  }
  function noise(len, v, f, at = 0, type = "lowpass", q = 0.7) {
    const s = a.currentTime + at, c = Math.max(1, Math.floor(a.sampleRate * len)), b = a.createBuffer(1, c, a.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < c; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / c) ** 2;
    const src = a.createBufferSource(), fl = a.createBiquadFilter(), g = a.createGain(); src.buffer = b; fl.type = type; fl.frequency.value = f; fl.Q.value = q; g.gain.value = v;
    src.connect(fl); fl.connect(g); g.connect(out); src.start(s);
  }
  const bell = (n, v, at = 0, dest) => { tone("sine", hz(n), hz(n), 0.5, v, at, dest); tone("sine", hz(n + 19), hz(n + 19), 0.18, v * 0.25, at, dest); };
  const last = {}; const gate = (k, ms) => { const n = performance.now(); if (last[k] && n - last[k] < ms) return false; last[k] = n; return true; };
  const PENT = [0, 2, 4, 7, 9, 12, 14, 16, 19];
  const fx = {
    tap() { tone("sine", 700, 520, 0.05, 0.05); },
    swish() { if (gate("swish", 90)) noise(0.12, 0.09, 2400 + Math.random() * 1600, 0, "bandpass", 1.4); },
    slice() { if (gate("slice", 25)) { noise(0.08, 0.16, 5200, 0, "highpass", 0.7); tone("sine", 1400, 600, 0.06, 0.03); } },
    squish(r = 1) { if (!gate("squish", 30)) return; noise(0.18, 0.2, 900 / r, 0.01, "lowpass", 1.2); tone("sine", 260 / r, 90 / r, 0.14, 0.12, 0.01); },
    combo(n = 3) { for (let i = 0; i < Math.min(8, n); i++) bell(76 + PENT[i % 9], 0.07, i * 0.06); },
    boom() { noise(0.9, 0.5, 500, 0, "lowpass", 0.6); tone("sine", 120, 35, 0.8, 0.45); noise(0.3, 0.25, 3000, 0, "bandpass", 0.5); },
    miss() { tone("triangle", 200, 90, 0.25, 0.14); },
    whistle() { tone("sine", 2600, 2500, 0.18, 0.08); tone("sine", 2600, 2550, 0.36, 0.08, 0.22); },
    freeze() { [0, 7, 12, 19, 24].forEach((m, i) => bell(84 + m, 0.05, i * 0.05)); noise(0.6, 0.06, 7000, 0, "highpass", 0.6); },
    frenzy() { [0, 4, 7, 12].forEach((m, i) => bell(72 + m, 0.08, i * 0.04)); [0, 4, 7, 12].forEach((m, i) => bell(84 + m, 0.05, 0.2 + i * 0.04)); },
    double() { bell(79, 0.08); bell(91, 0.08, 0.1); },
    coin() { bell(88, 0.08); bell(95, 0.08, 0.07); },
    buy() { [0, 7, 12].forEach((m, i) => bell(79 + m, 0.09, i * 0.06)); },
    best() { [0, 4, 7, 12, 16, 19, 24].forEach((m, i) => bell(67 + m, 0.11, i * 0.08)); },
    over() { [7, 4, 0, -5].forEach((m, i) => tone("triangle", hz(62 + m), hz(62 + m) * 0.98, 0.3, 0.1, i * 0.15)); }
  };
  const BASS = [48, 48, 55, 55, 53, 53, 50, 52];
  const MEL = [72, null, 76, 79, null, 76, 74, null, 72, null, 74, 76, null, 74, 72, null, 69, null, 72, 76, null, 79, 81, null, 79, null, 76, 74, null, 72, null, null];
  function tick() {
    if (!a || !music) return;
    const k = step % 32;
    if (k % 4 === 0) tone("triangle", hz(BASS[(k / 4) | 0]), hz(BASS[(k / 4) | 0]), 0.3, 0.14, 0, mus);
    if (k % 2 === 1) noise(0.04, 0.05, 6000, 0, "highpass", 0.8);
    const n = MEL[k]; if (n && (step / 32 | 0) % 2 === 0) bell(n, 0.16, 0, mus);
    step++;
  }
  return {
    unlock() { if (up() && music && !loopId) loopId = setInterval(tick, 150); },
    play(k, arg) { if (!sfx || !a || !fx[k]) return; try { fx[k](arg); } catch (e) {} },
    get sfx() { return sfx; }, get music() { return music; },
    setSfx(v) { sfx = v; try { localStorage.setItem(P + "sfx", v ? "1" : "0"); } catch (e) {} },
    setMusic(v) { music = v; try { localStorage.setItem(P + "music", v ? "1" : "0"); } catch (e) {} if (mus) mus.gain.value = v ? 0.12 : 0; if (v) this.unlock(); }
  };
})();

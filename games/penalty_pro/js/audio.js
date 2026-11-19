/* PENALTY PRO — sound made in code (WebAudio): the referee's whistle, the thump of the kick, the swish of the
   net, a ringing post, crowd roars and groans, and a stadium drum-and-chant loop. */
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
  const fx = {
    whistle() { tone("sine", 2600, 2500, 0.18, 0.08); tone("sine", 2900, 2800, 0.18, 0.05); tone("sine", 2600, 2550, 0.32, 0.08, 0.22); },
    kick() { noise(0.07, 0.4, 900); tone("sine", 140, 60, 0.12, 0.25); },
    dive() { noise(0.25, 0.08, 1400, 0, "bandpass", 0.8); },
    net() { noise(0.35, 0.18, 3000, 0, "bandpass", 0.6); tone("triangle", 300, 150, 0.2, 0.05); },
    save() { noise(0.08, 0.35, 700); tone("sine", 180, 70, 0.15, 0.2); },
    post() { tone("sine", 1250, 1240, 0.6, 0.12); tone("sine", 1870, 1860, 0.4, 0.06); tone("sine", 640, 630, 0.5, 0.08); },
    cheer() { noise(1.6, 0.22, 1600, 0, "bandpass", 0.5); noise(1.2, 0.1, 3200, 0.1, "bandpass", 0.7); [0, 4, 7, 12].forEach((m, i) => bell(76 + m, 0.06, 0.1 + i * 0.07)); },
    groan() { noise(1.0, 0.14, 500, 0, "lowpass", 0.6); tone("sawtooth", 200, 120, 0.8, 0.025); },
    coin() { bell(88, 0.08); bell(95, 0.08, 0.07); },
    tap() { tone("sine", 700, 500, 0.06, 0.07); },
    buy() { [0, 7, 12].forEach((m, i) => bell(79 + m, 0.09, i * 0.06)); },
    win() { [0, 4, 7, 12, 16, 19, 24].forEach((m, i) => bell(67 + m, 0.12, i * 0.09)); noise(1.6, 0.15, 1800, 0.3, "bandpass", 0.5); },
    lose() { [7, 4, 0, -5].forEach((m, i) => tone("triangle", hz(62 + m), hz(62 + m) * 0.98, 0.32, 0.12, i * 0.17)); }
  };
  const CHANT = [67, null, 67, null, 69, 67, null, 64, null, null, 67, null, 67, null, 69, 72, null, 71, null, null, null, null, null, null];
  function tick() {
    if (!a || !music) return;
    const k = step % 24;
    if (k % 6 === 0 || k % 6 === 3) { tone("sine", 110, 45, 0.18, 0.5, 0, mus); }
    if (k % 6 === 4) noise(0.06, 0.12, 2400, 0, "bandpass", 1.2);
    const n = CHANT[k]; if (n && (step / 24 | 0) % 2 === 0) { tone("sawtooth", hz(n), hz(n), 0.22, 0.05, 0, mus); tone("sine", hz(n - 12), hz(n - 12), 0.22, 0.12, 0, mus); }
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

/* COLOR BY NUMBER — sound made in code (WebAudio): soft bubbly pops that climb a scale while you paint, a soft
   thud for a wrong colour, a chime when a colour is finished, a whoosh for boosters and a calm pad loop. */
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
  let run = 0, runT = 0;
  const fx = {
    tap() { tone("sine", 700, 520, 0.05, 0.05); },
    pick() { tone("sine", 880, 990, 0.06, 0.05); },
    paint() { if (!gate("paint", 28)) return; const now = performance.now(); run = now - runT < 400 ? run + 1 : 0; runT = now; const n = 72 + PENT[run % 9] + (run >= 9 ? 12 : 0); tone("sine", hz(n), hz(n) * 1.02, 0.09, 0.05); },
    wrong() { if (gate("wrong", 80)) tone("triangle", 180, 140, 0.1, 0.06); },
    color() { [0, 4, 7, 12, 16].forEach((m, i) => bell(76 + m, 0.06, i * 0.05)); },
    boost() { noise(0.3, 0.12, 1800, 0, "bandpass", 0.8); [0, 7, 12].forEach((m, i) => bell(79 + m, 0.05, 0.05 + i * 0.05)); },
    zoom() { tone("sine", 500, 800, 0.08, 0.03); },
    replay() { [0, 4, 7, 11, 14].forEach((m, i) => bell(72 + m, 0.05, i * 0.12)); },
    unlock() { [0, 7, 12, 19].forEach((m, i) => bell(76 + m, 0.07, i * 0.06)); },
    coin() { bell(88, 0.08); bell(95, 0.08, 0.07); },
    buy() { [0, 7, 12].forEach((m, i) => bell(79 + m, 0.09, i * 0.06)); },
    win() { [0, 4, 7, 12, 16, 19, 24].forEach((m, i) => bell(67 + m, 0.11, i * 0.09)); }
  };
  const PROG = [[60, 64, 67, 71], [57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 65]];
  const MEL = [76, null, 79, null, 74, null, null, null, 72, null, 74, null, 76, null, null, null, 81, null, 79, null, 76, null, 74, null, 72, null, null, null, null, null, null, null];
  function tick() {
    if (!a || !music) return;
    const k = step % 32;
    if (k % 8 === 0) PROG[(step / 8 | 0) % 4].forEach((n, i) => tone("sine", hz(n - 12), hz(n - 12), 2.2, 0.07, i * 0.02, mus));
    const n = MEL[k]; if (n && (step / 32 | 0) % 2 === 1) bell(n, 0.12, 0, mus);
    step++;
  }
  return {
    unlock() { if (up() && music && !loopId) loopId = setInterval(tick, 260); },
    play(k, arg) { if (!sfx || !a || !fx[k]) return; try { fx[k](arg); } catch (e) {} },
    get sfx() { return sfx; }, get music() { return music; },
    setSfx(v) { sfx = v; try { localStorage.setItem(P + "sfx", v ? "1" : "0"); } catch (e) {} },
    setMusic(v) { music = v; try { localStorage.setItem(P + "music", v ? "1" : "0"); } catch (e) {} if (mus) mus.gain.value = v ? 0.12 : 0; if (v) this.unlock(); }
  };
})();

/* HEX STACKS — sound made in code (WebAudio): a soft "clack" for every tile that flips across (rising in
   pitch along the run), bubbly pops when a run clears, combo chimes, an unlock jingle, a hammer smash and a
   dreamy bell-and-pad loop. */
window.Sound = (() => {
  const P = window.GAME_CONFIG.storagePrefix;
  let a, out, mus, loopId = null, step = 0, sfx = true, music = true;
  try { sfx = localStorage.getItem(P + "sfx") !== "0"; music = localStorage.getItem(P + "music") !== "0"; } catch (e) {}
  const hz = n => 440 * 2 ** ((n - 69) / 12);
  const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28, 31];
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
  const fx = {
    clack(i = 1) { const n = 64 + SCALE[Math.min(SCALE.length - 1, i - 1)]; tone("triangle", hz(n), hz(n) * 0.9, 0.09, 0.12); noise(0.03, 0.1, 2400, 0, "bandpass", 2); },
    drop() { tone("sine", 180, 90, 0.14, 0.2); noise(0.06, 0.15, 900); },
    pick() { tone("sine", 500, 800, 0.08, 0.07); },
    back() { tone("sine", 600, 350, 0.1, 0.06); },
    pop(i = 1) { const n = 76 + SCALE[Math.min(SCALE.length - 1, (i - 1) % 10)]; tone("sine", hz(n) * 0.6, hz(n), 0.08, 0.1); },
    clear() { [0, 4, 7, 12].forEach((m, i) => bell(79 + m, 0.07, i * 0.05)); noise(0.3, 0.05, 7000, 0, "highpass"); },
    combo(c = 2) { const b = 72 + Math.min(5, c) * 2; [0, 7, 12, 16].forEach((m, i) => bell(b + m, 0.09, i * 0.07)); },
    unlock() { [0, 5, 9, 12, 17].forEach((m, i) => bell(76 + m, 0.08, i * 0.06)); },
    smash() { noise(0.35, 0.4, 700); tone("triangle", 140, 50, 0.3, 0.2); noise(0.15, 0.2, 4000, 0.02, "highpass"); },
    swap() { [0, 4, 7].forEach((m, i) => tone("sine", hz(72 + m), hz(72 + m), 0.12, 0.06, i * 0.04)); },
    coin() { bell(88, 0.08); bell(95, 0.08, 0.07); },
    tap() { tone("sine", 700, 500, 0.06, 0.07); },
    buy() { [0, 7, 12].forEach((m, i) => bell(79 + m, 0.09, i * 0.06)); },
    win() { [0, 4, 7, 12, 16, 19, 24].forEach((m, i) => bell(67 + m, 0.12, i * 0.09)); noise(0.6, 0.05, 6000, 0.5, "highpass"); },
    lose() { [7, 4, 0, -5].forEach((m, i) => tone("triangle", hz(62 + m), hz(62 + m) * 0.98, 0.32, 0.12, i * 0.17)); }
  };
  const MEL = [76, null, 79, null, 83, null, 79, 81, null, 76, null, 74, 76, null, null, null, 72, null, 76, null, 79, null, 76, 74, null, 72, null, 69, 71, null, null, null];
  const PAD = [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]];
  function tick() {
    if (!a || !music) return;
    const n = MEL[step % MEL.length]; if (n) bell(n, 0.22, 0, mus);
    if (step % 8 === 0) PAD[(step / 8 | 0) % 4].forEach(p => tone("sine", hz(p - 12), hz(p - 12), 1.6, 0.12, 0, mus));
    step++;
  }
  return {
    unlock() { if (up() && music && !loopId) loopId = setInterval(tick, 230); },
    play(k, arg) { if (!sfx || !a || !fx[k]) return; try { fx[k](arg); } catch (e) {} },
    get sfx() { return sfx; }, get music() { return music; },
    setSfx(v) { sfx = v; try { localStorage.setItem(P + "sfx", v ? "1" : "0"); } catch (e) {} },
    setMusic(v) { music = v; try { localStorage.setItem(P + "music", v ? "1" : "0"); } catch (e) {} if (mus) mus.gain.value = v ? 0.12 : 0; if (v) this.unlock(); }
  };
})();

/* BOLT JAM — sound made in code (WebAudio): ratchet clicks when a screw turns out, a wooden "thock"
   that climbs in pitch as a toolbox fills, metal clinks for spare holes, a clunk + chime when a box
   closes, a whoosh and clatter when a plate drops, and a soft marimba loop. */
window.Sound = (() => {
  const P = window.GAME_CONFIG.storagePrefix;
  let a, out, mus, loopId = null, step = 0, sfx = true, music = true;
  try { sfx = localStorage.getItem(P + "sfx") !== "0"; music = localStorage.getItem(P + "music") !== "0"; } catch (e) {}
  const hz = n => 440 * 2 ** ((n - 69) / 12);
  function up() {
    if (a) { if (a.state === "suspended") a.resume(); return true; }
    const A = window.AudioContext || window.webkitAudioContext; if (!A) return false;
    a = new A(); out = a.createGain(); out.gain.value = 0.5; out.connect(a.destination);
    mus = a.createGain(); mus.gain.value = music ? 0.14 : 0; mus.connect(out); return true;
  }
  function tone(type, f0, f1, len, v, at = 0, dest) {
    const s = a.currentTime + at, o = a.createOscillator(), g = a.createGain(); o.type = type;
    o.frequency.setValueAtTime(f0, s); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), s + len);
    g.gain.setValueAtTime(0.0001, s); g.gain.exponentialRampToValueAtTime(v, s + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, s + len);
    o.connect(g); g.connect(dest || out); o.start(s); o.stop(s + len + 0.03);
  }
  function noise(len, v, f, at = 0, type = "lowpass", q = 0.7) {
    const s = a.currentTime + at, c = Math.max(1, Math.floor(a.sampleRate * len)), b = a.createBuffer(1, c, a.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < c; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / c) ** 2;
    const src = a.createBufferSource(), fl = a.createBiquadFilter(), g = a.createGain(); src.buffer = b; fl.type = type; fl.frequency.value = f; fl.Q.value = q; g.gain.value = v;
    src.connect(fl); fl.connect(g); g.connect(out); src.start(s);
  }
  const mallet = (n, v, at = 0, dest) => { tone("sine", hz(n), hz(n), 0.42, v, at, dest); tone("triangle", hz(n + 12), hz(n + 12), 0.12, v * 0.35, at, dest); };
  const fx = {
    unscrew() { for (let i = 0; i < 5; i++) noise(0.018, 0.22, 2600 + i * 500, i * 0.042, "bandpass", 3); tone("sine", 900, 1600, 0.16, 0.03, 0.02); tone("sine", 520, 260, 0.07, 0.08, 0.24); },
    drop(k = 1) { const n = [62, 66, 69][Math.max(0, Math.min(2, k - 1))]; tone("triangle", hz(n), hz(n - 12), 0.13, 0.22); noise(0.05, 0.18, 900); mallet(n + 12, 0.07, 0.01); },
    clink() { tone("sine", 2100, 2050, 0.18, 0.06); tone("sine", 3150, 3100, 0.12, 0.035, 0.01); noise(0.03, 0.08, 5000, 0, "highpass"); },
    close(c = 1) { noise(0.12, 0.35, 320); tone("triangle", 150, 70, 0.18, 0.2); const base = 72 + Math.min(4, c - 1) * 2; [0, 4, 7, 12].forEach((m, i) => mallet(base + m, 0.09, 0.12 + i * 0.07)); },
    whoosh() { noise(0.25, 0.08, 1200, 0, "bandpass", 0.8); },
    creak() { tone("sawtooth", 180, 150, 0.22, 0.012); },
    fall() { noise(0.35, 0.12, 700, 0, "bandpass", 0.6); noise(0.08, 0.16, 1800, 0.32, "bandpass", 2); noise(0.06, 0.12, 2400, 0.42, "bandpass", 2); },
    blocked() { tone("square", 150, 110, 0.12, 0.05); tone("square", 140, 100, 0.12, 0.04, 0.09); },
    drill() { tone("sawtooth", 220, 900, 0.35, 0.04); noise(0.35, 0.12, 3000, 0, "bandpass", 2); },
    pop() { tone("sine", 500, 1100, 0.12, 0.12); },
    coin() { mallet(88, 0.08); mallet(95, 0.08, 0.07); },
    tap() { tone("sine", 700, 500, 0.06, 0.07); },
    buy() { [0, 7, 12].forEach((m, i) => mallet(79 + m, 0.09, i * 0.06)); },
    win() { [0, 4, 7, 12, 16, 19, 24].forEach((m, i) => mallet(67 + m, 0.12, i * 0.09)); noise(0.6, 0.05, 6000, 0.5, "highpass"); },
    lose() { [7, 4, 0, -5].forEach((m, i) => tone("triangle", hz(62 + m), hz(62 + m) * 0.98, 0.32, 0.12, i * 0.17)); }
  };
  // a gentle marimba loop (pentatonic), 4 bars
  const MEL = [72, null, 76, 79, null, 76, 74, null, 72, null, 69, 72, null, 74, 76, null, 79, null, 81, 79, null, 76, 74, null, 72, 74, null, 76, 74, null, 72, null];
  const BASS = [48, 45, 41, 43];
  function tick() {
    if (!a || !music) return;
    const n = MEL[step % MEL.length]; if (n) mallet(n, 0.25, 0, mus);
    if (step % 8 === 0) { const b = BASS[(step / 8 | 0) % 4]; tone("sine", hz(b), hz(b), 0.9, 0.5, 0, mus); }
    if (step % 2 === 1) noise(0.02, 0.05, 7000, 0, "highpass");
    step++;
  }
  return {
    unlock() { if (up() && music && !loopId) loopId = setInterval(tick, 240); },
    play(k, arg) { if (!sfx || !a || !fx[k]) return; try { fx[k](arg); } catch (e) {} },
    get sfx() { return sfx; }, get music() { return music; },
    setSfx(v) { sfx = v; try { localStorage.setItem(P + "sfx", v ? "1" : "0"); } catch (e) {} },
    setMusic(v) { music = v; try { localStorage.setItem(P + "music", v ? "1" : "0"); } catch (e) {} if (mus) mus.gain.value = v ? 0.14 : 0; if (v) this.unlock(); }
  };
})();

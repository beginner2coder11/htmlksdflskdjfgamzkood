/* LOT ESCAPE — sound made in code (WebAudio): an engine rev when a car pulls out, a reverse beep,
   a crunchy bump with a two-tone horn, a gate chime with a coin, a crane winch, and a bouncy loop. */
window.Sound = (() => {
  const P = window.GAME_CONFIG.storagePrefix;
  let a, out, mus, loopId = null, step = 0, sfx = true, music = true;
  try { sfx = localStorage.getItem(P + "sfx") !== "0"; music = localStorage.getItem(P + "music") !== "0"; } catch (e) {}
  const hz = n => 440 * 2 ** ((n - 69) / 12);
  const last = {}; const gate = (k, ms) => { const n = performance.now(); if (last[k] && n - last[k] < ms) return false; last[k] = n; return true; };
  function up() {
    if (a) { if (a.state === "suspended") a.resume(); return true; }
    const A = window.AudioContext || window.webkitAudioContext; if (!A) return false;
    a = new A(); out = a.createGain(); out.gain.value = 0.5; out.connect(a.destination);
    mus = a.createGain(); mus.gain.value = music ? 0.12 : 0; mus.connect(out); return true;
  }
  function tone(type, f0, f1, len, v, at = 0, dest, attack = 0.006) {
    const s = a.currentTime + at, o = a.createOscillator(), g = a.createGain(); o.type = type;
    o.frequency.setValueAtTime(f0, s); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), s + len);
    g.gain.setValueAtTime(0.0001, s); g.gain.exponentialRampToValueAtTime(v, s + attack); g.gain.exponentialRampToValueAtTime(0.0001, s + len);
    o.connect(g); g.connect(dest || out); o.start(s); o.stop(s + len + 0.03);
  }
  function noise(len, v, f, at = 0, type = "lowpass", q = 0.7) {
    const s = a.currentTime + at, c = Math.max(1, Math.floor(a.sampleRate * len)), b = a.createBuffer(1, c, a.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < c; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / c) ** 1.5;
    const src = a.createBufferSource(), fl = a.createBiquadFilter(), g = a.createGain(); src.buffer = b; fl.type = type; fl.frequency.value = f; fl.Q.value = q; g.gain.value = v;
    src.connect(fl); fl.connect(g); g.connect(out); src.start(s);
  }
  const fx = {
    go() { if (!gate("go", 60)) return; tone("sawtooth", 70, 210, 0.45, 0.05, 0, null, 0.05); tone("square", 55, 140, 0.4, 0.025, 0.02, null, 0.05); noise(0.35, 0.06, 500, 0, "bandpass", 1); },
    reverse() { if (!gate("go", 60)) return; tone("sawtooth", 80, 150, 0.35, 0.04, 0, null, 0.05); tone("sine", 1250, 1250, 0.09, 0.05, 0.02); tone("sine", 1250, 1250, 0.09, 0.05, 0.2); },
    beep() { tone("sine", 1250, 1250, 0.08, 0.04); tone("sine", 1250, 1250, 0.08, 0.04, 0.18); },
    crash() { noise(0.18, 0.4, 600); tone("triangle", 160, 60, 0.2, 0.18); noise(0.08, 0.2, 3000, 0.02, "highpass"); },
    horn() { tone("square", 415, 410, 0.26, 0.05, 0, null, 0.01); tone("square", 520, 515, 0.26, 0.04, 0, null, 0.01); tone("square", 415, 410, 0.18, 0.05, 0.3, null, 0.01); tone("square", 520, 515, 0.18, 0.04, 0.3, null, 0.01); },
    gate() { tone("sine", hz(84), hz(84), 0.25, 0.06); tone("sine", hz(91), hz(91), 0.3, 0.06, 0.08); },
    crane() { tone("sawtooth", 120, 260, 0.9, 0.025, 0, null, 0.1); noise(0.9, 0.04, 1800, 0, "bandpass", 2); },
    pop() { tone("sine", 500, 1100, 0.12, 0.12); },
    coin() { tone("sine", hz(88), hz(88), 0.15, 0.08); tone("sine", hz(95), hz(95), 0.25, 0.08, 0.07); },
    tap() { tone("sine", 700, 500, 0.06, 0.07); },
    buy() { [0, 7, 12].forEach((m, i) => tone("triangle", hz(79 + m), hz(79 + m), 0.2, 0.08, i * 0.06)); },
    heart() { tone("triangle", hz(64), hz(60), 0.25, 0.1); },
    win() { [0, 4, 7, 12, 16, 19, 24].forEach((m, i) => { tone("triangle", hz(67 + m), hz(67 + m), 0.3, 0.1, i * 0.09); tone("sine", hz(79 + m), hz(79 + m), 0.2, 0.04, i * 0.09); }); },
    lose() { [7, 4, 0, -5].forEach((m, i) => tone("triangle", hz(62 + m), hz(62 + m) * 0.98, 0.32, 0.12, i * 0.17)); }
  };
  // a bouncy loop: plucky chords + bass
  const CH = [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]];
  function tick() {
    if (!a || !music) return;
    const bar = (step / 8 | 0) % 4, s = step % 8, ch = CH[bar];
    if (s === 0 || s === 3 || s === 6) tone("sine", hz(ch[0] - 24), hz(ch[0] - 24), 0.3, 0.45, 0, mus);
    if (s % 2 === 1) ch.forEach(n => tone("triangle", hz(n + 12), hz(n + 12), 0.12, 0.08, 0, mus));
    if (s === 4) tone("square", hz(ch[2] + 24), hz(ch[2] + 24), 0.1, 0.04, 0, mus);
    if (s % 2 === 0) noise(0.02, 0.04, 8000, 0, "highpass");
    step++;
  }
  return {
    unlock() { if (up() && music && !loopId) loopId = setInterval(tick, 190); },
    play(k, arg) { if (!sfx || !a || !fx[k]) return; try { fx[k](arg); } catch (e) {} },
    get sfx() { return sfx; }, get music() { return music; },
    setSfx(v) { sfx = v; try { localStorage.setItem(P + "sfx", v ? "1" : "0"); } catch (e) {} },
    setMusic(v) { music = v; try { localStorage.setItem(P + "music", v ? "1" : "0"); } catch (e) {} if (mus) mus.gain.value = v ? 0.12 : 0; if (v) this.unlock(); }
  };
})();

/* BREEZY ISLE — synthesized sound: soft plucked-string island loop, rolling surf,
   little pops for picking things up, a splash and reel click for fishing, and a
   happy jingle when a friend's request is done. No sound files. */
window.Sound = (() => {
  const P = window.GAME_CONFIG.storagePrefix;
  let a, out, mus, amb, loopId = null, waves = null, sfx = true, music = true, night = false;
  try { sfx = localStorage.getItem(P + "sfx") !== "0"; music = localStorage.getItem(P + "music") !== "0"; } catch (e) {}
  const hz = n => 440 * 2 ** ((n - 69) / 12);

  function up() {
    if (a) { if (a.state === "suspended") a.resume(); return true; }
    const A = window.AudioContext || window.webkitAudioContext; if (!A) return false;
    a = new A(); out = a.createGain(); out.gain.value = 0.6; out.connect(a.destination);
    mus = a.createGain(); mus.gain.value = music ? 0.14 : 0; mus.connect(out);
    amb = a.createGain(); amb.gain.value = music ? 0.06 : 0; amb.connect(out);
    return true;
  }
  function tone(type, f0, f1, len, v, at = 0, dest) {
    const s = a.currentTime + at, o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, s); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), s + len);
    g.gain.setValueAtTime(0.0001, s); g.gain.exponentialRampToValueAtTime(v, s + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, s + len);
    o.connect(g); g.connect(dest || out); o.start(s); o.stop(s + len + 0.03);
  }
  // plucked string: a bright attack that dulls quickly (filtered triangle + saw)
  function pluck(f, v, at = 0, dest, len = 0.9) {
    const s = a.currentTime + at, o = a.createOscillator(), o2 = a.createOscillator(), fl = a.createBiquadFilter(), g = a.createGain();
    o.type = "triangle"; o2.type = "sawtooth"; o.frequency.value = f; o2.frequency.value = f * 1.003;
    fl.type = "lowpass"; fl.frequency.setValueAtTime(f * 7, s); fl.frequency.exponentialRampToValueAtTime(f * 1.4, s + 0.25);
    const g2 = a.createGain(); g2.gain.value = 0.25;
    g.gain.setValueAtTime(0.0001, s); g.gain.exponentialRampToValueAtTime(v, s + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, s + len);
    o.connect(fl); o2.connect(g2); g2.connect(fl); fl.connect(g); g.connect(dest || out);
    o.start(s); o2.start(s); o.stop(s + len + 0.05); o2.stop(s + len + 0.05);
  }
  function noise(len, v, f, at = 0, type = "bandpass", q = 1, sweep) {
    const s = a.currentTime + at, c = Math.floor(a.sampleRate * len), b = a.createBuffer(1, c, a.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < c; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / c) ** 2;
    const src = a.createBufferSource(), fl = a.createBiquadFilter(), g = a.createGain();
    src.buffer = b; fl.type = type; fl.frequency.setValueAtTime(f, s); if (sweep) fl.frequency.exponentialRampToValueAtTime(sweep, s + len);
    fl.Q.value = q; g.gain.value = v; src.connect(fl); fl.connect(g); g.connect(out); src.start(s);
  }

  const fx = {
    step()   { tone("sine", 220 + Math.random() * 40, 160, 0.06, 0.03); },
    pick()   { pluck(hz(76), 0.18); pluck(hz(83), 0.12, 0.06); },
    shake()  { noise(0.35, 0.25, 900, 0, "bandpass", 0.8, 2500); },
    drop()   { tone("sine", 520, 260, 0.12, 0.12); },
    dig()    { noise(0.18, 0.3, 500, 0, "lowpass"); noise(0.14, 0.2, 400, 0.18, "lowpass"); },
    find(r)  { [0, 4, 7, 12].slice(0, 2 + (r || 1)).forEach((m, i) => pluck(hz(72 + m), 0.16, i * 0.07)); },
    swish()  { noise(0.22, 0.25, 1500, 0, "bandpass", 1.5, 600); },
    catchBug() { pluck(hz(79), 0.15); pluck(hz(86), 0.12, 0.08); },
    miss()   { tone("sine", 400, 260, 0.2, 0.08); },
    cast()   { noise(0.3, 0.12, 2000, 0, "highpass", 0.5); setTimeout(() => sfx && a && fx.plop(), 450); },
    plop()   { tone("sine", 600, 180, 0.15, 0.2); noise(0.2, 0.15, 900, 0.02, "bandpass", 1); },
    bite()   { tone("square", 880, 880, 0.08, 0.06); tone("square", 1175, 1175, 0.1, 0.06, 0.09); },
    reel()   { tone("triangle", 1400, 1300, 0.025, 0.035); },
    catchFish() { noise(0.4, 0.3, 1200, 0, "bandpass", 0.7, 400); [0, 4, 7, 12, 16].forEach((m, i) => pluck(hz(67 + m), 0.16, 0.1 + i * 0.07)); },
    lost()   { tone("sine", 330, 180, 0.4, 0.1); },
    coin()   { tone("square", 1568, 1568, 0.05, 0.04); tone("square", 2093, 2093, 0.1, 0.04, 0.05); },
    quest()  { [0, 4, 7, 12, 7, 12, 16].forEach((m, i) => pluck(hz(72 + m), 0.17, i * 0.09)); },
    heart()  { pluck(hz(84), 0.12); pluck(hz(88), 0.1, 0.05); },
    tap()    { tone("sine", 900, 900, 0.04, 0.06); },
    talk()   { for (let i = 0; i < 3; i++) tone("triangle", 500 + Math.random() * 300, 480, 0.05, 0.05, i * 0.06); },
    full()   { tone("sawtooth", 220, 200, 0.25, 0.05); },
    unlock() { [0, 7, 12, 16, 19, 24].forEach((m, i) => pluck(hz(60 + m), 0.17, i * 0.08, null, 1.4)); }
  };

  // island loop: a gentle plucked chord pattern with a soft bass, quieter and slower at night
  function startMusic() {
    if (!a || loopId || !music) return;
    const prog = [[60, 64, 67], [57, 60, 64], [65, 69, 72], [67, 71, 74]];
    const pat = [0, 2, 1, 2, 0, 2, 1, 2];
    let step = 0, next = a.currentTime + 0.15;
    loopId = setInterval(() => {
      while (next < a.currentTime + 0.4) {
        const at = next - a.currentTime, bar = Math.floor(step / 8) % 4, ch = prog[bar], i = step % 8;
        if (!night || i % 2 === 0) pluck(hz(ch[pat[i]] + (i === 3 || i === 7 ? 12 : 0)), night ? 0.12 : 0.16, at, mus, 0.7);
        if (i === 0 || i === 4) tone("sine", hz(ch[0] - 24), hz(ch[0] - 24), 0.8, 0.22, at, mus);
        if (!night && (i === 6) && Math.random() < 0.5) pluck(hz(ch[2] + 12), 0.08, at + 0.12, mus, 0.5);
        next += night ? 0.34 : 0.26; step++;
      }
    }, 90);
    startWaves();
  }
  function startWaves() {
    if (!a || waves) return;
    const len = 4, b = a.createBuffer(1, a.sampleRate * len, a.sampleRate), d = b.getChannelData(0);
    let last = 0; for (let i = 0; i < d.length; i++) { last = last * 0.98 + (Math.random() * 2 - 1) * 0.02; d[i] = last * 6; }
    const src = a.createBufferSource(); src.buffer = b; src.loop = true;
    const fl = a.createBiquadFilter(); fl.type = "lowpass"; fl.frequency.value = 900;
    const g = a.createGain(), lfo = a.createOscillator(), lg = a.createGain();
    lfo.frequency.value = 0.12; lg.gain.value = 0.5; lfo.connect(lg); lg.connect(g.gain); g.gain.value = 0.6;
    src.connect(fl); fl.connect(g); g.connect(amb); src.start(); lfo.start();
    waves = src;
  }
  function stopMusic() { if (loopId) { clearInterval(loopId); loopId = null; } }

  return {
    unlock() { if (up()) startMusic(); },
    play(name, ...args) { if (sfx && a && fx[name]) fx[name](...args); },
    setNight(n) { night = n; },
    get sfx() { return sfx; }, get music() { return music; },
    toggleSfx() { sfx = !sfx; try { localStorage.setItem(P + "sfx", sfx ? "1" : "0"); } catch (e) {} return sfx; },
    toggleMusic() {
      music = !music; try { localStorage.setItem(P + "music", music ? "1" : "0"); } catch (e) {}
      if (a) { mus.gain.setTargetAtTime(music ? 0.14 : 0, a.currentTime, 0.2); amb.gain.setTargetAtTime(music ? 0.06 : 0, a.currentTime, 0.2); if (music) startMusic(); else stopMusic(); }
      return music;
    }
  };
})();

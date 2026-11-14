/* GEM MINE — FM crystal chimes, wooden knocks, rock rumbles and a plucked
   dorian arpeggio for music. Everything is synthesized at runtime. */
window.Sound = (() => {
  let ac, bus, verb, mus, timer, on = { sfx: true, music: true };
  const hz = m => 440 * 2 ** ((m - 69) / 12);
  function boot() {
    if (ac) return true;
    const A = window.AudioContext || window.webkitAudioContext; if (!A) return false;
    ac = new A(); bus = ac.createGain(); bus.gain.value = 0.5; bus.connect(ac.destination);
    // cheap "cave" echo
    verb = ac.createDelay(1); verb.delayTime.value = 0.23; const fb = ac.createGain(); fb.gain.value = 0.32; const lp = ac.createBiquadFilter(); lp.frequency.value = 2200;
    verb.connect(lp); lp.connect(fb); fb.connect(verb); lp.connect(bus);
    mus = ac.createGain(); mus.gain.value = 0.13; mus.connect(bus); mus.connect(verb);
    return true;
  }
  function chime(m, t, v = 0.25, len = 0.9, dest) {
    const car = ac.createOscillator(), mod = ac.createOscillator(), mg = ac.createGain(), g = ac.createGain();
    car.frequency.value = hz(m); mod.frequency.value = hz(m) * 3.5; mg.gain.setValueAtTime(hz(m) * 2, t); mg.gain.exponentialRampToValueAtTime(1, t + len);
    mod.connect(mg); mg.connect(car.frequency);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    car.connect(g); g.connect(dest || bus); if (!dest) g.connect(verb);
    car.start(t); mod.start(t); car.stop(t + len); mod.stop(t + len);
  }
  function knock(f, t, v = 0.3) {
    const o = ac.createOscillator(), g = ac.createGain(); o.type = "triangle";
    o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.5, t + 0.08);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1); o.connect(g); g.connect(bus); o.start(t); o.stop(t + 0.12);
  }
  function rumble(t, len, v) {
    const n = ac.createBuffer(1, ac.sampleRate * len, ac.sampleRate), d = n.getChannelData(0);
    let last = 0; for (let i = 0; i < d.length; i++) { last = last * 0.97 + (Math.random() * 2 - 1) * 0.03; d[i] = last * 6 * (1 - i / d.length); }
    const s = ac.createBufferSource(), g = ac.createGain(); s.buffer = n; g.gain.value = v; s.connect(g); g.connect(bus); s.start(t);
  }
  const PENTA = [0, 3, 5, 7, 10];
  const fx = {
    swap: () => knock(420, ac.currentTime, 0.25),
    bad: () => { knock(200, ac.currentTime, 0.3); knock(170, ac.currentTime + 0.09, 0.3); },
    match: (cascade = 0, size = 3) => { const t = ac.currentTime, base = 76 + Math.min(cascade, 8) * 2; for (let i = 0; i < Math.min(size, 5); i++) chime(base + PENTA[i % 5] + (i >= 5 ? 12 : 0), t + i * 0.03, 0.18); },
    land: () => knock(140 + Math.random() * 40, ac.currentTime, 0.08),
    special: () => { const t = ac.currentTime; [0, 7, 12, 19].forEach((n, i) => chime(72 + n, t + i * 0.04, 0.2, 1.2)); },
    line: () => { const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain(); o.type = "sawtooth"; o.frequency.setValueAtTime(300, t); o.frequency.exponentialRampToValueAtTime(2400, t + 0.25); g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3); o.connect(g); g.connect(bus); o.start(t); o.stop(t + 0.32); },
    blast: () => { rumble(ac.currentTime, 0.7, 0.9); knock(80, ac.currentTime, 0.6); },
    prism: () => { const t = ac.currentTime; for (let i = 0; i < 12; i++) chime(84 + PENTA[i % 5] + Math.floor(i / 5) * 12, t + i * 0.04, 0.12, 1.4); },
    ice: () => { chime(96, ac.currentTime, 0.12, 0.3); knock(900, ac.currentTime, 0.1); },
    win: () => { const t = ac.currentTime; [62, 65, 69, 72, 74, 77, 81].forEach((n, i) => chime(n, t + i * 0.1, 0.22, 1.6)); },
    lose: () => { const t = ac.currentTime; [69, 65, 62, 57].forEach((n, i) => chime(n, t + i * 0.18, 0.2, 1.2)); },
    star: i => chime(84 + [0, 3, 7][i], ac.currentTime, 0.3, 1.5),
    coin: () => { chime(91, ac.currentTime, 0.15, 0.4); chime(96, ac.currentTime + 0.07, 0.15, 0.5); },
    tap: () => knock(600, ac.currentTime, 0.12)
  };
  function music() {
    if (!ac || timer || !on.music) return;
    const prog = [[50, 57, 62, 65], [48, 55, 60, 64], [46, 53, 58, 62], [45, 52, 57, 61]];
    let bar = 0, beat = 0, next = ac.currentTime + 0.1;
    timer = setInterval(() => {
      while (next < ac.currentTime + 0.3) {
        const ch = prog[bar % 4], pat = [0, 1, 2, 3, 2, 1, 3, 2];
        chime(ch[pat[beat]] + 12, next, 0.22, 0.8, mus);
        if (beat === 0) chime(ch[0], next, 0.3, 2.2, mus);
        next += 0.24; beat++; if (beat === 8) { beat = 0; bar++; }
      }
    }, 90);
  }
  return {
    unlock() { if (!boot()) return; if (ac.state === "suspended") ac.resume(); music(); },
    sfx(n, ...a) { if (on.sfx && boot() && fx[n]) try { fx[n](...a); } catch (e) {} },
    setSfx(v) { on.sfx = v; }, setMusic(v) { on.music = v; if (!v) { clearInterval(timer); timer = null; } else music(); },
    muffle(v) { if (mus) mus.gain.setTargetAtTime(v ? 0.03 : 0.13, ac.currentTime, 0.2); }
  };
})();

/* BUG BARRICADE — cartoon foley: squirts, slaps, sizzles, tongue "thwip",
   bug squeaks, a kazoo-ish buzz and a bouncy toy-piano march. */
window.Sound = (() => {
  let a, o, m, t, sfx = true, music = true;
  const hz = n => 440 * 2 ** ((n - 69) / 12);
  const up = () => { if (a) return true; const A = window.AudioContext || window.webkitAudioContext; if (!A) return false; a = new A(); o = a.createGain(); o.gain.value = 0.45; o.connect(a.destination); m = a.createGain(); m.gain.value = 0.14; m.connect(o); return true; };
  function sweep(type, f0, f1, len, vol, at = 0, dest = o) { const s = a.currentTime + at, x = a.createOscillator(), g = a.createGain(); x.type = type; x.frequency.setValueAtTime(f0, s); x.frequency.exponentialRampToValueAtTime(Math.max(20, f1), s + len); g.gain.setValueAtTime(vol, s); g.gain.exponentialRampToValueAtTime(0.0001, s + len); x.connect(g); g.connect(dest); x.start(s); x.stop(s + len + 0.02); }
  function hiss(len, vol, f, at = 0, q = 1) { const s = a.currentTime + at, n = Math.floor(a.sampleRate * len), b = a.createBuffer(1, n, a.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n); const src = a.createBufferSource(), fl = a.createBiquadFilter(), g = a.createGain(); src.buffer = b; fl.type = "bandpass"; fl.frequency.value = f; fl.Q.value = q; g.gain.value = vol; src.connect(fl); fl.connect(g); g.connect(o); src.start(s); }
  function toy(n, at, v = 0.25, dest = m) { sweep("sine", hz(n), hz(n), 0.35, v, at, dest); sweep("sine", hz(n) * 4, hz(n) * 4, 0.08, v * 0.3, at, dest); }
  let lastSquirt = 0;
  const fx = {
    squirt: () => { if (a.currentTime - lastSquirt < 0.06) return; lastSquirt = a.currentTime; hiss(0.08, 0.12, 2500, 0, 2); },
    slap: () => { hiss(0.06, 0.5, 900, 0, 0.7); sweep("square", 220, 90, 0.06, 0.12); },
    sizzle: () => hiss(0.15, 0.06, 5000, 0, 0.5),
    thwip: () => { sweep("sine", 300, 1400, 0.09, 0.25); sweep("sine", 1400, 400, 0.1, 0.2, 0.1); },
    honey: () => sweep("sine", 200, 140, 0.25, 0.1),
    squish: () => { sweep("triangle", 900 + Math.random() * 300, 300, 0.08, 0.12); hiss(0.05, 0.12, 1200); },
    boss: () => { for (let i = 0; i < 3; i++) sweep("sawtooth", 160, 120, 0.25, 0.12, i * 0.3); },
    build: () => { hiss(0.12, 0.25, 3000, 0, 0.6); [0, 4, 7].forEach((n, i) => toy(72 + n, i * 0.05, 0.25, o)); },
    upgrade: () => [0, 4, 7, 12].forEach((n, i) => toy(76 + n, i * 0.05, 0.25, o)),
    sell: () => [7, 4, 0].forEach((n, i) => toy(72 + n, i * 0.05, 0.2, o)),
    leak: () => { sweep("sawtooth", 300, 120, 0.3, 0.15); },
    wave: () => { sweep("sawtooth", 220, 330, 0.2, 0.08); sweep("sawtooth", 330, 440, 0.25, 0.08, 0.2); },
    win: () => [0, 4, 7, 12, 7, 12, 16].forEach((n, i) => toy(67 + n, i * 0.11, 0.3, o)),
    lose: () => [7, 6, 5, 4, 0].forEach((n, i) => sweep("sawtooth", hz(60 + n), hz(59 + n), 0.3, 0.1, i * 0.22)),
    coin: () => { toy(88, 0, 0.2, o); toy(91, 0.05, 0.2, o); },
    tap: () => hiss(0.03, 0.2, 3500, 0, 1),
    no: () => sweep("square", 180, 120, 0.12, 0.1)
  };
  function march() {
    if (!a || t || !music) return;
    const mel = [72, 74, 76, 72, 76, 77, 79, null, 79, 81, 79, 77, 76, 72, 74, null], bass = [48, 55, 48, 55, 53, 60, 55, 50];
    let s = 0, next = a.currentTime + 0.1;
    t = setInterval(() => { while (next < a.currentTime + 0.3) { const at = next - a.currentTime; const n = mel[s % 16]; if (n) toy(n, at, 0.2); if (s % 2 === 0) sweep("triangle", hz(bass[(s / 2 | 0) % 8]), hz(bass[(s / 2 | 0) % 8]), 0.18, 0.3, at, m); next += 0.2; s++; } }, 80);
  }
  return {
    unlock() { if (!up()) return; if (a.state === "suspended") a.resume(); march(); },
    sfx(n, ...x) { if (sfx && up() && fx[n]) try { fx[n](...x); } catch (e) {} },
    setSfx(v) { sfx = v; }, setMusic(v) { music = v; if (!v) { clearInterval(t); t = null; } else march(); },
    muffle(v) { if (m) m.gain.setTargetAtTime(v ? 0.03 : 0.14, a.currentTime, 0.2); }
  };
})();

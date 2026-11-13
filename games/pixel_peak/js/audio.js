/* PIXEL PEAK — chiptune: square/triangle/noise channels like an 8-bit handheld. */
window.Sound = (() => {
  let a, out, mus, loop, sfx = true, music = true;
  const hz = n => 440 * 2 ** ((n - 69) / 12);
  const up = () => { if (a) return true; const A = window.AudioContext || window.webkitAudioContext; if (!A) return false; a = new A(); out = a.createGain(); out.gain.value = 0.32; out.connect(a.destination); mus = a.createGain(); mus.gain.value = 0.35; mus.connect(out); return true; };
  function sq(f0, f1, len, v, at = 0, type = "square", dest = out) { const s = a.currentTime + at, o = a.createOscillator(), g = a.createGain(); o.type = type; o.frequency.setValueAtTime(f0, s); if (f1 !== f0) o.frequency.linearRampToValueAtTime(f1, s + len); g.gain.setValueAtTime(v, s); g.gain.setValueAtTime(v, s + len * 0.7); g.gain.linearRampToValueAtTime(0, s + len); o.connect(g); g.connect(dest); o.start(s); o.stop(s + len + 0.01); }
  function noise(len, v, at = 0, dest = out) { const s = a.currentTime + at, c = Math.floor(a.sampleRate * len), b = a.createBuffer(1, c, a.sampleRate), d = b.getChannelData(0); let h = 0; for (let i = 0; i < c; i++) { if (i % 6 === 0) h = Math.random() * 2 - 1; d[i] = h * (1 - i / c); } const src = a.createBufferSource(), g = a.createGain(); src.buffer = b; g.gain.value = v; src.connect(g); g.connect(dest); src.start(s); }
  const fx = {
    jump: () => sq(320, 640, 0.12, 0.25),
    coin: () => { sq(hz(83), hz(83), 0.06, 0.2); sq(hz(88), hz(88), 0.18, 0.2, 0.06); },
    stomp: () => { sq(400, 120, 0.12, 0.3); noise(0.06, 0.3); },
    spring: () => sq(200, 900, 0.25, 0.25, 0, "triangle"),
    hurt: () => { sq(300, 80, 0.3, 0.3); noise(0.2, 0.25); },
    die: () => [72, 67, 63, 60, 55].forEach((n, i) => sq(hz(n), hz(n), 0.12, 0.25, i * 0.12)),
    check: () => [60, 64, 67, 72].forEach((n, i) => sq(hz(n + 12), hz(n + 12), 0.07, 0.2, i * 0.06)),
    flag: () => [60, 64, 67, 72, 76, 79, 84].forEach((n, i) => sq(hz(n), hz(n), 0.1, 0.22, i * 0.08)),
    heart: () => [72, 76, 79, 84].forEach((n, i) => sq(hz(n), hz(n), 0.08, 0.2, i * 0.05, "triangle")),
    blip: () => sq(hz(84), hz(84), 0.04, 0.15),
    select: () => { sq(hz(76), hz(76), 0.05, 0.2); sq(hz(83), hz(83), 0.08, 0.2, 0.05); }
  };
  const SONGS = [
    { lead: [72, 0, 76, 79, 0, 76, 74, 72, 69, 0, 72, 74, 76, 0, 74, 0], bass: [48, 55, 52, 55, 45, 52, 48, 52], tempo: 0.13 },
    { lead: [69, 0, 72, 0, 74, 75, 74, 72, 69, 0, 67, 0, 69, 0, 0, 0], bass: [45, 45, 52, 45, 43, 43, 50, 43], tempo: 0.16 },
    { lead: [79, 76, 72, 76, 79, 84, 83, 79, 77, 74, 71, 74, 77, 81, 79, 0], bass: [48, 52, 43, 47, 41, 45, 43, 47], tempo: 0.12 }
  ];
  let song = 0;
  function play() {
    if (!a || loop || !music) return;
    let s = 0, next = a.currentTime + 0.1;
    loop = setInterval(() => {
      const S = SONGS[song];
      while (next < a.currentTime + 0.25) {
        const at = next - a.currentTime, n = S.lead[s % 16];
        if (n) sq(hz(n), hz(n), S.tempo * 0.9, 0.12, at, "square", mus);
        if (s % 2 === 0) sq(hz(S.bass[(s / 2) % 8 | 0]), hz(S.bass[(s / 2) % 8 | 0]), S.tempo * 1.8, 0.22, at, "triangle", mus);
        if (s % 4 === 2) noise(0.04, 0.12, at, mus);
        next += S.tempo; s++;
      }
    }, 50);
  }
  return {
    unlock() { if (!up()) return; if (a.state === "suspended") a.resume(); play(); },
    sfx(n, ...x) { if (sfx && up() && fx[n]) try { fx[n](...x); } catch (e) {} },
    song(i) { song = i % SONGS.length; },
    setSfx(v) { sfx = v; }, setMusic(v) { music = v; if (!v) { clearInterval(loop); loop = null; } else play(); },
    muffle(v) { if (mus) mus.gain.setTargetAtTime(v ? 0.08 : 0.35, a.currentTime, 0.1); }
  };
})();

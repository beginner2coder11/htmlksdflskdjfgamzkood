/* BEAT LANES — composer + synth + clock.
   compose(song) writes a full song as 16th-note steps (drums, bass, chords, lead).
   The chart in game.js is built from the same steps. play() schedules the song a
   little ahead of the audio clock; pausing suspends the AudioContext so the
   clock (and the notes) freeze together. Without audio it falls back to a timer. */
window.Sound = (() => {
  let a, out, bus, sfxBus, sfx = true, music = true, timer = null, song = null, comp = null, t0 = 0, nextStep = 0;
  let fakeStart = 0, fakePausedAt = 0, fakeOffset = 0, usingFake = false;
  const hz = n => 440 * 2 ** ((n - 69) / 12);
  const SCALES = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10] };
  function up() { if (a) return true; const A = window.AudioContext || window.webkitAudioContext; if (!A) return false; a = new A(); out = a.createGain(); out.gain.value = 0.55; out.connect(a.destination); bus = a.createGain(); bus.gain.value = 0.5; bus.connect(out); sfxBus = a.createGain(); sfxBus.gain.value = 0.4; sfxBus.connect(out); return true; }

  /* ---------- composer ---------- */
  function compose(s) {
    let seed = s.seed * 7919 + 17; const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const sc = SCALES[s.scale] || SCALES.minor, deg = d => s.key + sc[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7);
    const progs = { major: [[0, 4, 5, 3], [0, 5, 3, 4]], minor: [[0, 5, 2, 6], [0, 3, 4, 4]], dorian: [[0, 3, 0, 4], [0, 6, 3, 4]] };
    const prog = progs[s.scale][Math.floor(r() * 2)], steps = [];
    // a 2-bar motif repeats with variations, so the chart feels learnable
    const motif = []; let d = 4; for (let i = 0; i < 32; i++) { const on = i % 2 === 0 ? r() < 0.75 : r() < 0.3; if (on) { d = Math.max(0, Math.min(11, d + [-2, -1, 1, 2, 0, 3, -3][Math.floor(r() * 7)])); motif.push({ d, len: r() < 0.18 ? 4 : r() < 0.4 ? 2 : 1 }); } else motif.push(null); }
    for (let b = 0; b < s.bars; b++) {
      const chordRoot = prog[b % 4], section = b < 2 ? "intro" : b >= s.bars - 2 ? "outro" : (Math.floor(b / 8) % 2 ? "chorus" : "verse");
      for (let i = 0; i < 16; i++) {
        const st = { bar: b, i, section, kick: false, snare: false, hat: false, bass: null, chord: null, lead: null, leadLen: 0 };
        if (s.style === "house") { st.kick = i % 4 === 0; st.snare = i === 4 || i === 12; st.hat = i % 4 === 2; }
        else if (s.style === "break") { st.kick = i === 0 || i === 7 || i === 10; st.snare = i === 4 || i === 12 || (i === 15 && b % 2); st.hat = i % 2 === 0; }
        else { st.kick = i === 0 || i === 8 || (i === 11 && b % 2); st.snare = i === 4 || i === 12; st.hat = i % 2 === 0; }
        if (section === "intro") { st.snare = false; st.kick = i % 8 === 0; }
        if (i % 4 === 0 || (s.style !== "pop" && i % 4 === 3)) st.bass = deg(chordRoot) - 24;
        if (i === 0) st.chord = [deg(chordRoot), deg(chordRoot + 2), deg(chordRoot + 4)];
        const m = motif[(b % 2) * 16 + i];
        if (m && section !== "intro") { st.lead = deg(m.d + chordRoot + (section === "chorus" ? 2 : 0)) + 12; st.leadLen = m.len; }
        steps.push(st);
      }
    }
    return { steps, stepDur: 60 / s.bpm / 4, length: steps.length * (60 / s.bpm / 4) };
  }

  /* ---------- synth voices ---------- */
  function tone(type, f, at, len, v, dest = bus, f1) { const o = a.createOscillator(), g = a.createGain(); o.type = type; o.frequency.setValueAtTime(f, at); if (f1) o.frequency.exponentialRampToValueAtTime(f1, at + len); g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(v, at + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, at + len); o.connect(g); g.connect(dest); o.start(at); o.stop(at + len + 0.02); }
  function noise(at, len, v, f, type = "highpass", dest = bus) { const c = Math.floor(a.sampleRate * len), b = a.createBuffer(1, c, a.sampleRate), d = b.getChannelData(0); for (let i = 0; i < c; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / c) ** 2; const s = a.createBufferSource(), fl = a.createBiquadFilter(), g = a.createGain(); s.buffer = b; fl.type = type; fl.frequency.value = f; g.gain.value = v; s.connect(fl); fl.connect(g); g.connect(dest); s.start(at); }
  function playStep(st, at, dur) {
    if (!music) return;
    if (st.kick) tone("sine", 140, at, 0.3, 0.9, bus, 42);
    if (st.snare) { noise(at, 0.18, 0.5, 1500, "bandpass"); tone("triangle", 220, at, 0.08, 0.2, bus, 160); }
    if (st.hat) noise(at, 0.04, 0.18, 8000);
    if (st.bass != null) { tone("sawtooth", hz(st.bass), at, dur * 3.6, 0.22); tone("sine", hz(st.bass), at, dur * 3.6, 0.35); }
    if (st.chord) st.chord.forEach(n => { tone("triangle", hz(n), at, dur * 15, 0.07); tone("sine", hz(n + 12), at, dur * 14, 0.04); });
    if (st.lead != null) { tone("square", hz(st.lead), at, dur * Math.max(1, st.leadLen) * 0.95, 0.09); tone("sine", hz(st.lead) * 2, at, dur * Math.max(1, st.leadLen), 0.05); }
  }

  /* ---------- clock ---------- */
  // ready(): make sure the AudioContext is running (needs a user tap on phones); falls back to a timer
  function ready() { if (!up()) return Promise.resolve(false); if (a.state === "running") return Promise.resolve(true); a.resume(); return new Promise(res => { let n = 0; const t = setInterval(() => { if (a.state === "running" || ++n > 12) { clearInterval(t); res(a.state === "running"); } }, 40); }); }
  let paused = false, pauseAt = 0, pausedTotal = 0;
  function play(s, c) {
    stop(); song = s; comp = c; paused = false; pausedTotal = 0;
    usingFake = !(a && a.state === "running");
    if (!usingFake) {
      t0 = a.currentTime + 0.6; nextStep = 0;
      timer = setInterval(() => { if (paused) return; while (nextStep < comp.steps.length && t0 + nextStep * comp.stepDur < a.currentTime + 0.3) { const at = t0 + nextStep * comp.stepDur; if (at > a.currentTime - 0.01) playStep(comp.steps[nextStep], at, comp.stepDur); nextStep++; } }, 40);
    }
    fakeStart = performance.now() / 1000 + 0.6;
  }
  function stop() { clearInterval(timer); timer = null; }
  function now() {               // seconds into the song
    if (paused) return pauseAt;
    if (!usingFake) return a.currentTime - t0;
    return performance.now() / 1000 - fakeStart - pausedTotal;
  }
  const fx = {
    hit: (lane, q) => { const f = [880, 988, 1175, 1319][lane]; tone("sine", f * (q === "perfect" ? 2 : 1), a.currentTime, 0.08, 0.12, sfxBus); },
    miss: () => noise(a.currentTime, 0.08, 0.2, 400, "lowpass", sfxBus),
    combo: () => [0, 4, 7, 12].forEach((m, i) => tone("triangle", hz(84 + m), a.currentTime + i * 0.04, 0.15, 0.08, sfxBus)),
    clear: () => [0, 4, 7, 11, 14, 19].forEach((m, i) => tone("triangle", hz(72 + m), a.currentTime + i * 0.08, 0.5, 0.12, sfxBus)),
    fail: () => [7, 3, 0].forEach((m, i) => tone("sawtooth", hz(60 + m), a.currentTime + i * 0.15, 0.3, 0.06, sfxBus)),
    tap: () => tone("sine", 1500, a.currentTime, 0.05, 0.08, sfxBus),
    preview: s => { const c = compose(s); for (let k = 0; k < 32; k++) playStep(c.steps[16 * 4 + k] || c.steps[k], a.currentTime + 0.05 + k * c.stepDur, c.stepDur); }
  };
  return {
    compose, play, stop, now, ready,
    unlock() { if (!up()) return; if (a.state === "suspended" && !paused) a.resume(); },
    pause() { if (paused) return; pauseAt = now(); paused = true; this._p = performance.now() / 1000; if (a && !usingFake) a.suspend(); },
    resume() { if (!paused) return; paused = false; if (a && !usingFake) a.resume(); else pausedTotal += performance.now() / 1000 - this._p; },
    sfx(n, ...x) { if (sfx && up() && fx[n]) try { fx[n](...x); } catch (e) {} },
    setSfx(v) { sfx = v; }, setMusic(v) { music = v; },
    get usingFake() { return usingFake; }
  };
})();

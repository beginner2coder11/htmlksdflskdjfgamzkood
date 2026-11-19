/* PRISM HOP — all sound is synthesized: glassy landing plinks that climb a scale while
   you chain PERFECTs, gem sparkles, a boost whoosh, the Fever riser and a slow dreamy
   pad loop in the background (it changes key with each world). */
window.Sound = (() => {
  const P = (window.GAME_CONFIG.storagePrefix || "ph_");
  let a, out, mus, pad = null, sfx = true, music = true, key = 0, verb;
  try { sfx = localStorage.getItem(P + "sfx") !== "0"; music = localStorage.getItem(P + "music") !== "0"; } catch (e) {}
  const hz = n => 440 * 2 ** ((n - 69) / 12);
  const SCALE = [0, 2, 4, 7, 9];                     // major pentatonic
  const note = i => 72 + SCALE[i % 5] + 12 * Math.floor(i / 5);

  function up() {
    if (a) { if (a.state === "suspended") a.resume(); return true; }
    const A = window.AudioContext || window.webkitAudioContext; if (!A) return false;
    a = new A(); out = a.createGain(); out.gain.value = 0.6; out.connect(a.destination);
    // a cheap shimmer "room": two feedback delays
    verb = a.createGain(); verb.gain.value = 0.28;
    [0.13, 0.21].forEach((d, i) => {
      const dl = a.createDelay(1), fb = a.createGain(), lp = a.createBiquadFilter();
      dl.delayTime.value = d; fb.gain.value = 0.38; lp.type = "lowpass"; lp.frequency.value = 3200 - i * 900;
      verb.connect(dl); dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(out);
    });
    mus = a.createGain(); mus.gain.value = music ? 0.1 : 0; mus.connect(out); mus.connect(verb);
    return true;
  }
  function t(type, f0, f1, len, v, at = 0, dest, wet = true) {
    if (!a) return;
    const s = a.currentTime + at, o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, s); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), s + len);
    g.gain.setValueAtTime(0.0001, s); g.gain.exponentialRampToValueAtTime(v, s + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, s + len);
    o.connect(g); g.connect(dest || out); if (wet && !dest) g.connect(verb);
    o.start(s); o.stop(s + len + 0.03);
  }
  function n(len, v, f, at = 0, type = "bandpass", q = 1, sweepTo) {
    if (!a) return;
    const s = a.currentTime + at, c = Math.floor(a.sampleRate * len), b = a.createBuffer(1, c, a.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < c; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / c) ** 1.5;
    const src = a.createBufferSource(), fl = a.createBiquadFilter(), g = a.createGain();
    src.buffer = b; fl.type = type; fl.frequency.setValueAtTime(f, s); if (sweepTo) fl.frequency.exponentialRampToValueAtTime(sweepTo, s + len);
    fl.Q.value = q; g.gain.value = v; src.connect(fl); fl.connect(g); g.connect(out); src.start(s);
  }

  const fx = {
    land(judge, streak) {
      if (!sfx || !a) return;
      if (judge === "perfect") {
        const i = Math.min(14, streak), f = hz(note(i));
        t("sine", f, f, 0.32, 0.22); t("triangle", f * 2, f * 2, 0.18, 0.06); t("sine", f * 3.01, f * 3, 0.12, 0.04);
      } else if (judge === "great") { const f = hz(69); t("sine", f, f * 0.98, 0.24, 0.18); t("triangle", f * 1.5, f * 1.5, 0.12, 0.05); }
      else { t("sine", 330, 280, 0.2, 0.16); }
      t("sine", 140, 70, 0.12, 0.22, 0, null, false);   // soft thump
    },
    gem() { if (!sfx || !a) return; t("sine", 1760, 1760, 0.1, 0.09); t("sine", 2637, 2637, 0.22, 0.08, 0.05); },
    boost() { if (!sfx || !a) return; n(0.55, 0.35, 400, 0, "bandpass", 1.2, 4000); t("sawtooth", 180, 720, 0.45, 0.05); },
    power() { if (!sfx || !a) return; [0, 4, 7, 12].forEach((m, i) => t("triangle", hz(76 + m), hz(76 + m), 0.22, 0.08, i * 0.05)); },
    shield() { if (!sfx || !a) return; n(0.25, 0.4, 2500, 0, "highpass", 0.7); t("sine", 880, 1320, 0.2, 0.12); },
    fever() { if (!sfx || !a) return; [0, 4, 7, 11, 14, 19, 24].forEach((m, i) => t("triangle", hz(67 + m), hz(67 + m), 0.4, 0.09, i * 0.045)); n(0.9, 0.18, 800, 0, "bandpass", 0.8, 8000); },
    gate() { if (!sfx || !a) return; [0, 7, 12, 16].forEach(m => t("sine", hz(60 + key + m), hz(60 + key + m), 1.4, 0.07)); },
    fall() { if (!sfx || !a) return; t("sine", 520, 90, 0.8, 0.2); n(0.6, 0.2, 300, 0.3, "lowpass"); },
    close() { if (!sfx || !a) return; t("square", 300, 260, 0.12, 0.04); },
    tap() { if (!sfx || !a) return; t("sine", 1100, 1100, 0.05, 0.08, 0, null, false); },
    buy() { if (!sfx || !a) return; [0, 7, 12].forEach((m, i) => t("triangle", hz(79 + m), hz(79 + m), 0.2, 0.08, i * 0.06)); },
    coin() { fx.gem(); }
  };

  // dreamy background pad: four slow chords with a soft bell figure, transposed per world
  function startPad() {
    if (!a || pad || !music) return;
    const prog = [[0, 4, 7, 11], [9, 12, 16, 19], [5, 9, 12, 16], [7, 11, 14, 17]];
    let step = 0, next = a.currentTime + 0.1;
    const id = setInterval(() => {
      if (!a) return;
      while (next < a.currentTime + 0.4) {
        const at = next - a.currentTime, bar = Math.floor(step / 8) % 4, chord = prog[bar];
        if (step % 8 === 0) chord.forEach((m, i) => { t("sine", hz(48 + key + m), hz(48 + key + m), 3.4, 0.11, at + i * 0.03, mus); t("triangle", hz(60 + key + m), hz(60 + key + m), 3.0, 0.035, at + i * 0.03, mus); });
        if (step % 2 === 0 && Math.random() < 0.6) { const m = chord[(step / 2) % 4]; t("sine", hz(72 + key + m), hz(72 + key + m), 0.9, 0.04, at, mus); }
        next += 0.42; step++;
      }
    }, 100);
    pad = id;
  }
  function stopPad() { if (pad) { clearInterval(pad); pad = null; } }

  return {
    unlock() { if (up()) startPad(); },
    play(name, ...args) { if (fx[name]) fx[name](...args); },
    setWorld(i) { key = [0, 3, -2, 5, -4][i % 5]; },
    get sfx() { return sfx; }, get music() { return music; },
    toggleSfx() { sfx = !sfx; try { localStorage.setItem(P + "sfx", sfx ? "1" : "0"); } catch (e) {} return sfx; },
    toggleMusic() {
      music = !music; try { localStorage.setItem(P + "music", music ? "1" : "0"); } catch (e) {}
      if (a) { mus.gain.setTargetAtTime(music ? 0.1 : 0, a.currentTime, 0.2); if (music) startPad(); else stopPad(); }
      return music;
    },
    duck(on) { if (a && music) mus.gain.setTargetAtTime(on ? 0.03 : 0.1, a.currentTime, 0.2); }
  };
})();

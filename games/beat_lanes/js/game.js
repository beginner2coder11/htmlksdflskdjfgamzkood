/* ==========================================================================
   BEAT LANES — chart builder, judge and chrome highway renderer.
   Notes come from the composed song (lead → lanes by pitch, drums fill gaps,
   chords and holds by difficulty). Timing reads Sound.now(), the same clock
   the music is scheduled on.
   ========================================================================== */
window.Game = (() => {
  const CF = window.GAME_CONFIG, WN = CF.windows;
  const cv = document.getElementById("stage"), g = cv.getContext("2d");
  let VW = 400, VH = 800, dpr = 1;
  const hooks = {}, emit = (n, d) => hooks[n] && hooks[n](d);
  let song = null, comp = null, notes = [], diff = "normal", state = "idle", speed = 1, offset = 0;
  let score = 0, combo = 0, maxCombo = 0, counts = { perfect: 0, great: 0, good: 0, miss: 0 }, health = 0.5, held = [null, null, null, null], pressed = [false, false, false, false];
  let fx = [], judge = null, clock = 0, lastNow = 0, revived = false;

  /* ---------- chart ---------- */
  function chart(s, c, d) {
    let seed = s.seed * 31 + d.length * 7; const r = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
    const D = CF.difficulties[d], out = [], lastAt = [-9, -9, -9, -9], minGap = d === "easy" ? 2 : 1;
    let lastStep = -9, lastLane = 1;
    c.steps.forEach((st, k) => {
      const t = k * c.stepDur, on8 = st.i % 2 === 0;
      let lane = null;
      if (st.lead != null && (on8 || r() < D.sixteenths) && r() < D.density * 1.25) lane = ((st.lead % 12) * 7 + st.bar) % 4;
      else if (on8 && (st.snare || st.kick) && r() < D.density * 0.45) lane = st.snare ? 1 + (st.bar % 2) : (st.i % 8 === 0 ? 0 : 3);
      if (lane === null || st.section === "intro") return;
      if (k - lastStep < minGap) return;
      if (lane === lastLane && d !== "hard" && r() < 0.5) lane = (lane + 1 + Math.floor(r() * 3)) % 4;   // fewer repeats on one lane
      if (k - lastAt[lane] < 2) lane = (lane + 2) % 4;
      const len = st.leadLen >= 2 && r() < D.holds ? st.leadLen * c.stepDur : 0;
      out.push({ t, lane, len, judged: false, holding: false, done: false });
      lastAt[lane] = k + Math.round(len / c.stepDur); lastStep = k + (len ? Math.round(len / c.stepDur) : 0); lastLane = lane;
      if (r() < D.chords && !len) { const l2 = (lane + 2) % 4; if (k - lastAt[l2] >= 2) { out.push({ t, lane: l2, len: 0, judged: false }); lastAt[l2] = k; } }
    });
    return out;
  }

  /* ---------- run ---------- */
  function start(s, d, opts = {}) {
    song = s; diff = d; comp = Sound.compose(s); notes = chart(s, comp, d); speed = CF.speed[d] * (opts.speedMul || 1); offset = opts.offset || 0;
    score = 0; combo = 0; maxCombo = 0; counts = { perfect: 0, great: 0, good: 0, miss: 0 }; health = 0.5; held = [null, null, null, null]; fx = []; judge = null; revived = false;
    state = "play"; Sound.play(s, comp); emit("hud");
  }
  const T = () => Sound.now() - offset;
  function grade(q, lane, n) {
    counts[q]++; if (q === "miss") { combo = 0; health = Math.max(0, health - 0.08); Sound.sfx("miss"); }
    else { combo++; maxCombo = Math.max(maxCombo, combo); score += Math.round(CF.points[q] * (1 + Math.min(combo, 100) / 50)); health = Math.min(1, health + (q === "perfect" ? 0.02 : q === "great" ? 0.015 : 0.005)); Sound.sfx("hit", lane, q); burst(lane, q); if (combo % 50 === 0) Sound.sfx("combo"); }
    judge = { q, t: 0, lane }; emit("hud");
    if (health <= 0 && state === "play") fail();
  }
  function press(lane) {
    if (state !== "play") return; pressed[lane] = true;
    const now = T(); let best = null;
    for (const n of notes) { if (n.judged || n.lane !== lane) continue; const dt = n.t - now; if (dt > WN.good) break; if (Math.abs(dt) <= WN.good) { best = n; break; } }
    if (!best) return;
    const e = Math.abs(best.t - now), q = e <= WN.perfect ? "perfect" : e <= WN.great ? "great" : "good";
    best.judged = true; best.err = best.t - now; grade(q, lane, best);
    if (best.len) { best.holding = true; held[lane] = best; }
  }
  function release(lane) {
    pressed[lane] = false; const n = held[lane]; if (!n) return; held[lane] = null;
    const now = T(); if (now < n.t + n.len - 0.12) { n.holding = false; n.broke = true; combo = 0; judge = { q: "miss", t: 0, lane }; counts.miss++; health = Math.max(0, health - 0.05); emit("hud"); } else { n.holding = false; n.done = true; }
  }
  function fail() { state = "failed"; Sound.pause(); Sound.sfx("fail"); emit("failed", { revived }); }
  function finish() {
    state = "done"; Sound.stop(); Sound.sfx("clear");
    const total = notes.length, acc = total ? (counts.perfect + counts.great * 0.7 + counts.good * 0.4) / total : 0;
    const letter = acc >= 0.95 ? "S" : acc >= 0.9 ? "A" : acc >= 0.8 ? "B" : acc >= 0.7 ? "C" : "D";
    emit("done", { score, acc, letter, maxCombo, counts: { ...counts }, total, full: counts.miss === 0, song, diff });
  }
  function update(dt) {
    clock += dt; if (judge) { judge.t += dt; if (judge.t > 0.5) judge = null; }
    fx.forEach(f => { f.t += dt; f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 300 * dt; }); fx = fx.filter(f => f.t < 0.6);
    if (state !== "play") return;
    const now = T();
    for (const n of notes) {
      if (n.t > now + 0.2) break;
      if (!n.judged && now - n.t > WN.good) { n.judged = true; n.missed = true; grade("miss", n.lane, n); }
      if (n.holding) { score += Math.round(CF.points.hold * dt * 10); if (now >= n.t + n.len) { n.holding = false; n.done = true; held[n.lane] = null; burst(n.lane, "perfect"); } }
    }
    if (comp && now > comp.length + 0.8) finish();
  }

  /* ---------- drawing: chrome highway ---------- */
  const lanesX = p => { const w = Math.min(VW * 0.92, 460), x0 = VW / 2 - w / 2, k = 0.5 + 0.5 * p; return [0, 1, 2, 3, 4].map(i => VW / 2 + (x0 + i * w / 4 - VW / 2) * k); };
  const hitY = () => VH * 0.82;
  function yFor(dt) { const fall = CF.leadTime / speed, p = 1 - dt / fall; return { p, y: hitY() * (0.12 + 0.88 * p * p * 0.35 + 0.88 * p * 0.65) }; }
  function burst(lane, q) { const xs = lanesX(1), x = (xs[lane] + xs[lane + 1]) / 2; for (let i = 0; i < (q === "perfect" ? 14 : 8); i++) { const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4, s = 120 + Math.random() * 260; fx.push({ x, y: hitY(), vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0, c: CF.lanes[lane], star: Math.random() < 0.4 }); } }
  function chrome(y0, y1) { const gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, "#ffffff"); gr.addColorStop(0.35, "#c9d4e8"); gr.addColorStop(0.5, "#7d8aa8"); gr.addColorStop(0.62, "#e8eefb"); gr.addColorStop(1, "#a7b3cc"); return gr; }
  function sparkle(x, y, r, c) { g.fillStyle = c; g.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr = i % 2 ? r * 0.25 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fill(); }
  function render() {
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    // iridescent background
    const bg = g.createLinearGradient(0, 0, VW, VH), h = (clock * 12) % 360;
    bg.addColorStop(0, `hsl(${h + 190},80%,86%)`); bg.addColorStop(0.5, `hsl(${h + 260},70%,84%)`); bg.addColorStop(1, `hsl(${h + 320},80%,86%)`);
    g.fillStyle = bg; g.fillRect(0, 0, VW, VH);
    g.fillStyle = "rgba(255,255,255,.35)"; for (let i = 0; i < 18; i++) { const x = (i * 97 + clock * 6 * (i % 3 + 1)) % VW, y = (i * 53) % VH; sparkle(x, y, 2 + (i % 3) * 2, "rgba(255,255,255,.6)"); }
    if (!comp) return;
    // highway
    const top = lanesX(0), bot = lanesX(1), yT = VH * 0.12, yB = hitY() + 40;
    g.fillStyle = "rgba(20,24,48,.55)"; g.beginPath(); g.moveTo(top[0], yT); g.lineTo(top[4], yT); g.lineTo(bot[4] + 10, yB); g.lineTo(bot[0] - 10, yB); g.closePath(); g.fill();
    for (let i = 0; i <= 4; i++) { g.strokeStyle = i % 4 ? "rgba(255,255,255,.25)" : chrome(yT, yB); g.lineWidth = i % 4 ? 1.5 : 5; g.beginPath(); g.moveTo(top[i], yT); g.lineTo(bot[i], yB); g.stroke(); }
    pressed.forEach((p, i) => { if (!p) return; const lg = g.createLinearGradient(0, yT, 0, hitY()); lg.addColorStop(0, "rgba(255,255,255,0)"); lg.addColorStop(1, CF.lanes[i] + "88"); g.fillStyle = lg; g.beginPath(); g.moveTo(top[i], yT); g.lineTo(top[i + 1], yT); g.lineTo(bot[i + 1], hitY()); g.lineTo(bot[i], hitY()); g.fill(); });
    // beat lines
    const now = T(), beat = comp.stepDur * 4;
    for (let b = Math.ceil(now / beat); b * beat < now + CF.leadTime / speed; b++) { const { p, y } = yFor(b * beat - now); if (p < 0) continue; const xs = lanesX(p); g.strokeStyle = `rgba(255,255,255,${0.08 + p * 0.12})`; g.lineWidth = b % 4 ? 1 : 2.5; g.beginPath(); g.moveTo(xs[0], y); g.lineTo(xs[4], y); g.stroke(); }
    // notes
    for (const n of notes) {
      const dt = n.t - now; if (dt > CF.leadTime / speed) break;
      if (n.judged && !n.holding && !(n.len && !n.done && !n.broke && !n.missed)) { if (!n.len || n.done || n.broke || n.missed) continue; }
      const { p, y } = yFor(Math.max(n.holding ? 0 : -0.3, dt)); if (p < 0) continue;
      const xs = lanesX(Math.min(1.05, p)), x0 = xs[n.lane], x1 = xs[n.lane + 1], w = (x1 - x0) * 0.82, cx = (x0 + x1) / 2, hgt = 12 + p * 14;
      if (n.len) { const { y: yEnd, p: pe } = yFor(n.t + n.len - now); const ye = Math.max(VH * 0.12, yEnd); g.fillStyle = CF.lanes[n.lane] + (n.broke ? "44" : "aa"); const xe = lanesX(Math.max(0, pe)); g.beginPath(); g.moveTo(cx - w * 0.18, y); g.lineTo(cx + w * 0.18, y); g.lineTo((xe[n.lane] + xe[n.lane + 1]) / 2 + w * 0.12, ye); g.lineTo((xe[n.lane] + xe[n.lane + 1]) / 2 - w * 0.12, ye); g.fill(); }
      if (n.holding) continue;
      const jg = g.createLinearGradient(0, y - hgt / 2, 0, y + hgt / 2); jg.addColorStop(0, "#ffffff"); jg.addColorStop(0.4, CF.lanes[n.lane]); jg.addColorStop(1, shade(CF.lanes[n.lane], 0.7));
      g.fillStyle = jg; g.beginPath(); g.roundRect(cx - w / 2, y - hgt / 2, w, hgt, hgt / 2); g.fill();
      g.strokeStyle = "rgba(255,255,255,.9)"; g.lineWidth = 2; g.stroke();
      g.fillStyle = "rgba(255,255,255,.75)"; g.beginPath(); g.roundRect(cx - w / 2 + 6, y - hgt / 2 + 3, w * 0.45, hgt * 0.28, hgt * 0.14); g.fill();
    }
    // receptors on the chrome hit bar
    g.fillStyle = chrome(hitY() - 8, hitY() + 8); g.fillRect(bot[0] - 10, hitY() - 6, bot[4] - bot[0] + 20, 12);
    for (let i = 0; i < 4; i++) { const cx = (bot[i] + bot[i + 1]) / 2, r = (bot[i + 1] - bot[i]) * 0.34 * (pressed[i] ? 1.12 : 1); const rg = g.createRadialGradient(cx - r * 0.3, hitY() - r * 0.3, r * 0.1, cx, hitY(), r); rg.addColorStop(0, "#fff"); rg.addColorStop(0.6, pressed[i] ? CF.lanes[i] : "rgba(255,255,255,.35)"); rg.addColorStop(1, "rgba(255,255,255,.1)"); g.fillStyle = rg; g.beginPath(); g.arc(cx, hitY(), r, 0, 7); g.fill(); g.strokeStyle = CF.lanes[i]; g.lineWidth = 3; g.stroke(); }
    fx.forEach(f => { g.globalAlpha = Math.max(0, 1 - f.t / 0.6); f.star ? sparkle(f.x, f.y, 7, "#fff") : (g.fillStyle = f.c, g.beginPath(), g.arc(f.x, f.y, 3.5, 0, 7), g.fill()); }); g.globalAlpha = 1;
    // judgement + combo in chrome type
    if (judge) { const s = 1 + Math.max(0, 0.25 - judge.t) * 1.2; g.save(); g.translate(VW / 2, VH * 0.6); g.scale(s, s); g.globalAlpha = Math.max(0, 1 - judge.t * 2); g.font = "italic 900 34px 'Arial Rounded MT Bold','Avenir Next','Futura',sans-serif"; g.textAlign = "center"; g.fillStyle = judge.q === "miss" ? "#ff5f8f" : chrome(-20, 10); g.strokeStyle = "rgba(40,30,90,.6)"; g.lineWidth = 6; const txt = judge.q.toUpperCase() + (judge.q === "perfect" ? " ✦" : ""); g.strokeText(txt, 0, 0); g.fillText(txt, 0, 0); g.restore(); g.globalAlpha = 1; }
    if (combo >= 5) { g.font = "italic 900 64px 'Arial Rounded MT Bold','Avenir Next',sans-serif"; g.textAlign = "center"; g.fillStyle = chrome(VH * 0.4 - 50, VH * 0.4); g.strokeStyle = "rgba(40,30,90,.5)"; g.lineWidth = 8; g.globalAlpha = 0.85; g.strokeText(combo, VW / 2, VH * 0.42); g.fillText(combo, VW / 2, VH * 0.42); g.font = "800 14px 'Avenir Next',sans-serif"; g.fillStyle = "#fff"; g.fillText("COMBO", VW / 2, VH * 0.42 + 22); g.globalAlpha = 1; }
  }
  function shade(hex, f) { const p = parseInt(hex.slice(1), 16), c = s => Math.round(((p >> s) & 255) * f); return `rgb(${c(16)},${c(8)},${c(0)})`; }

  /* ---------- input: touch zones + keys ---------- */
  const laneOf = x => { const xs = lanesX(1); for (let i = 0; i < 4; i++) if (x < xs[i + 1] + (i === 3 ? 999 : 0)) return Math.max(0, i); return 3; };
  const touches = new Map();
  cv.addEventListener("pointerdown", e => { const r = cv.getBoundingClientRect(), lane = laneOf(e.clientX - r.left); touches.set(e.pointerId, lane); press(lane); });
  const up = e => { const lane = touches.get(e.pointerId); touches.delete(e.pointerId); if (lane !== undefined && ![...touches.values()].includes(lane)) release(lane); };
  cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
  addEventListener("keydown", e => { if (e.repeat) return; const i = CF.keys.indexOf(e.key.toLowerCase()); if (i >= 0) press(i); if (e.key === "Escape" || e.key === "p") emit("pauseKey"); });
  addEventListener("keyup", e => { const i = CF.keys.indexOf(e.key.toLowerCase()); if (i >= 0) release(i); });

  function fit() { VW = innerWidth; VH = innerHeight; dpr = Math.min(2, devicePixelRatio || 1); cv.width = Math.round(VW * dpr); cv.height = Math.round(VH * dpr); cv.style.width = VW + "px"; cv.style.height = VH + "px"; }
  addEventListener("resize", fit); fit();
  let lt = 0; (function loop(t) { const dt = Math.min(0.05, (t - lt) / 1000 || 0.016); lt = t; update(dt); render(); requestAnimationFrame(loop); })(0);

  return {
    on: (n, f) => hooks[n] = f, start, press, release, update, render, chart,
    pause() { if (state === "play") { state = "paused"; Sound.pause(); } }, resume() { if (state === "paused") { state = "play"; Sound.resume(); } },
    revive() { revived = true; health = 0.5; notes.forEach(n => { if (!n.judged && n.t < T() + 1.2) { n.judged = true; } }); state = "play"; Sound.resume(); emit("hud"); },
    quit() { state = "idle"; Sound.stop(); comp = null; },
    get state() { return state; }, get score() { return score; }, get combo() { return combo; }, get health() { return health; }, get notes() { return notes; }, get counts() { return counts; }, now: () => T()
  };
})();

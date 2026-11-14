/* ==========================================================================
   SPIRAL DROP — engine
   A pseudo-3D tower of ring platforms (elliptical annulus slices drawn in
   depth order), a bouncing ball fixed at the front, drag-to-spin, gaps,
   danger slices, fever smash, shards, paint splats and Memphis decor.
   ========================================================================== */
window.Game = (() => {
  const CF = window.GAME_CONFIG, TW = CF.tower, BL = CF.ball, S = TW.slices, SA = Math.PI * 2 / S;
  const W = 400, CX = W / 2, THICK = 16, RB = (TW.outer + TW.inner) / 2 + 6, TILT = TW.tilt;
  const cv = document.getElementById("tower"), g = cv.getContext("2d");
  let H = 760, k = 1, dpr = 1;
  const hooks = {}, emit = (n, d) => hooks[n] && hooks[n](d);

  let level = 1, floors = [], rot = 0, ball = { y: 0, vy: 0, sq: 0 }, camY = 0, state = "idle", paused = false;
  let combo = 0, fever = false, score = 0, passed = 0, pal = CF.palettes[0], skin = CF.balls[0], clock = 0;
  let shards = [], splats = [], texts = [], confetti = [], trail = [], deco = [];
  const top = i => i * TW.spacing;

  /* ---------- level ---------- */
  function rng(seed) { return () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648; }
  const lerp = (a, b, t) => a + (b - a) * t;
  function spec(n) { const t = Math.min(1, (n - 1) / 60); return { floors: Math.round(lerp(CF.curve.floors[0], CF.curve.floors[1], t)), gaps: Math.round(lerp(CF.curve.gaps[0], CF.curve.gaps[1], t) * 10) / 10, danger: n < CF.dangerFrom ? 0 : lerp(CF.curve.danger[0], CF.curve.danger[1], t) }; }
  function build(n) {
    const sp = spec(n), r = rng(n * 7349 + 3); floors = [];
    for (let i = 0; i < sp.floors; i++) {
      const sl = new Array(S).fill("solid");
      const gapLen = Math.max(1, Math.round(sp.gaps + (r() < 0.3 ? 1 : 0)) + (i === 0 ? 1 : 0)), gs = Math.floor(r() * S);
      for (let j = 0; j < gapLen; j++) sl[(gs + j) % S] = "gap";
      let d = Math.floor(sp.danger + r() * 1.2); if (i === 0) d = 0;
      const above = i ? floors[i - 1].sl : null;   // never put danger straight under the gap above: a fair landing always exists
      for (let tries = 0; d > 0 && tries < 40; tries++) { const j = Math.floor(r() * S); if (sl[j] === "solid" && !(above && (above[j] === "gap" || above[(j + 1) % S] === "gap" || above[(j + S - 1) % S] === "gap"))) { sl[j] = "danger"; d--; } }
      floors.push({ sl, broken: 0, tint: i % 2 });
    }
    floors.push({ sl: new Array(S).fill("finish"), broken: 0, finish: true });
    // start the ball resting on floor 0 over a solid slice
    rot = 0; const j = sliceAtBall(); if (floors[0].sl[j] !== "solid") { const s = floors[0].sl.indexOf("solid"); rot += (j - s) * SA; }
  }
  function sliceAtBall() { let a = (Math.PI / 2 - rot) % (Math.PI * 2); if (a < 0) a += Math.PI * 2; return Math.floor(a / SA) % S; }

  function start(n, b) {
    level = n; skin = b; pal = CF.palettes[Math.floor((n - 1) / CF.paletteEvery) % CF.palettes.length];
    build(n); ball = { y: top(0) - BL.r, vy: 0, sq: 0, floor: 0 }; camY = ball.y - H * 0.32;
    combo = 0; fever = false; score = 0; passed = 0; shards = []; splats = []; texts = []; confetti = []; trail = [];
    makeDeco(); state = "play"; paused = false; emit("hud");
  }

  /* ---------- physics ---------- */
  function step(dt) {
    clock += dt;
    if (paused || state === "idle") return;
    if (state === "play") {
      const sub = 4, h = dt / sub;
      for (let s = 0; s < sub && state === "play"; s++) {
        const prev = ball.y; ball.vy = Math.min(BL.maxFall || 720, ball.vy + BL.gravity * h); ball.y += ball.vy * h;
        // the next floor below the ball
        const i = floors.findIndex((f, idx) => !f.broken && top(idx) - BL.r >= prev - 0.01);
        if (i < 0) continue;
        const plane = top(i) - BL.r;
        if (ball.vy > 0 && prev <= plane && ball.y >= plane) contact(i, plane);
      }
    }
    if (state === "won") confetti.forEach(c => { c.t += dt; c.x += c.vx * dt; c.y += c.vy * dt; c.vy += 300 * dt; c.r += c.vr * dt; });
    ball.sq = Math.max(0, ball.sq - dt * 6);
    // camera only ever moves down
    camY = Math.max(camY, ball.y - H * 0.36) * 1;
    const targetCam = ball.y - H * 0.36; if (targetCam > camY) camY += (targetCam - camY) * Math.min(1, dt * 8);
    floors.forEach(f => { if (f.broken) f.broken += dt; });
    shards.forEach(p => { p.t += dt; p.vy += 900 * dt; p.y += p.vy * dt; p.rad += p.vr * dt; p.spin += p.vs * dt; }); shards = shards.filter(p => p.t < 1.2);
    texts.forEach(t => t.t += dt); texts = texts.filter(t => t.t < 0.9);
    if (ball.vy > 600 || fever) { trail.push(ball.y); if (trail.length > 8) trail.shift(); } else if (trail.length) trail.shift();
  }
  function contact(i, plane) {
    const f = floors[i], j = sliceAtBall(), kind = f.sl[j];
    if (f.finish) { ball.y = plane; ball.vy = -Math.sqrt(2 * BL.gravity * BL.bounce); win(); return; }
    if (kind === "gap") { breakFloor(i, false); combo++; passed++; const pts = combo; score += pts; Sound.sfx("pass", combo); texts.push({ s: "+" + pts, y: top(i), t: 0 });
      if (combo >= CF.feverAfter && !fever) { fever = true; Sound.sfx("fever"); emit("fever", true); } emit("hud"); return; }
    if (fever) { breakFloor(i, true); fever = false; emit("fever", false); combo++; passed++; score += combo * 2; texts.push({ s: "SMASH +" + combo * 2, y: top(i), t: 0, big: true }); Sound.sfx("smash"); emit("hud"); return; }
    if (kind === "danger") { ball.y = plane; state = "dead"; Sound.sfx("die"); emit("dead", { level, score, passed, total: floors.length - 1 }); return; }
    // solid: bounce + paint splat
    ball.y = plane; ball.vy = -Math.sqrt(2 * BL.gravity * BL.bounce); ball.sq = 1; combo = 0;
    splats.push({ floor: i, a: Math.PI / 2 - rot + (Math.random() - 0.5) * 0.15, r: 9 + Math.random() * 5, c: skin.color });
    if (splats.length > 40) splats.shift();
    Sound.sfx("bounce");
  }
  function breakFloor(i, smash) {
    const f = floors[i]; f.broken = 0.0001;
    for (let j = 0; j < S; j++) if (f.sl[j] !== "gap") shards.push({ floor: i, j, kind: f.sl[j], tint: f.tint, rad: 0, vr: 160 + Math.random() * 140, vy: -120 - Math.random() * 160, y: 0, t: 0, spin: 0, vs: (Math.random() - 0.5) * 4, a0: j * SA, rot0: rot });
    if (smash) for (let j = 0; j < 14; j++) shards.push({ dust: true, x: CX + (Math.random() - 0.5) * 160, y: 0, floor: i, vy: -200 - Math.random() * 200, vr: 0, rad: 0, t: 0, spin: 0, vs: 0 });
  }
  function win() {
    state = "won"; Sound.sfx("win"); score += 10;
    const cols = pal.deco;
    for (let i = 0; i < 80; i++) confetti.push({ x: CX + (Math.random() - 0.5) * 80, y: ball.y - 20, vx: (Math.random() - 0.5) * 600, vy: -300 - Math.random() * 500, r: 0, vr: (Math.random() - 0.5) * 12, t: 0, c: cols[i % cols.length], shape: i % 3 });
    setTimeout(() => emit("won", { level, score, passed }), 1300);
    emit("hud");
  }

  /* ---------- drawing ---------- */
  function makeDeco() {
    const r = rng(level * 13 + 1); deco = [];
    for (let i = 0; i < 26; i++) deco.push({ x: r() * W, y: r() * 1600, kind: Math.floor(r() * 5), c: pal.deco[Math.floor(r() * pal.deco.length)], s: 0.7 + r() * 0.8, rot: r() * 6 });
  }
  function drawDeco() {
    g.fillStyle = pal.bg; g.fillRect(0, 0, W, H);
    g.lineCap = "round"; g.lineJoin = "round";
    for (const d of deco) {
      const y = ((d.y - camY * 0.25) % 1600 + 1600) % 1600 - 200; if (y < -80 || y > H + 80) continue;
      g.save(); g.translate(d.x, y); g.rotate(d.rot + clock * 0.05); g.scale(d.s, d.s);
      g.strokeStyle = d.c; g.fillStyle = d.c; g.lineWidth = 5;
      if (d.kind === 0) { g.beginPath(); for (let i = 0; i <= 4; i++) g.quadraticCurveTo(i * 14 - 21, i % 2 ? -12 : 12, i * 14 - 14, 0); g.stroke(); }
      if (d.kind === 1) { for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) { g.beginPath(); g.arc(a * 10 - 10, b * 10 - 10, 2.6, 0, 7); g.fill(); } }
      if (d.kind === 2) { g.lineWidth = 4; g.strokeStyle = pal.ink; g.beginPath(); g.moveTo(0, -14); g.lineTo(14, 12); g.lineTo(-14, 12); g.closePath(); g.fillStyle = d.c; g.fill(); g.stroke(); }
      if (d.kind === 3) { g.beginPath(); g.arc(0, 0, 14, 0, Math.PI); g.fill(); g.lineWidth = 3; g.strokeStyle = pal.ink; g.stroke(); }
      if (d.kind === 4) { g.beginPath(); g.moveTo(-24, 0); for (let i = 0; i < 6; i++) g.lineTo(-24 + (i + 1) * 8, i % 2 ? 0 : -9); g.stroke(); }
      g.restore();
    }
  }
  const sy = y => y - camY;
  function slicePath(cy, a0, a1, ro, ri) { g.beginPath(); g.ellipse(CX, cy, ro, ro * TILT, 0, a0, a1); g.ellipse(CX, cy, ri, ri * TILT, 0, a1, a0, true); g.closePath(); }
  function sliceFill(kind, tint, cy, a0, a1) {
    if (kind === "danger") { const gr = g.createLinearGradient(CX - 120, cy, CX + 120, cy + 30); for (let s = 0; s <= 1; s += 0.125) { gr.addColorStop(s, pal.danger[0]); gr.addColorStop(Math.min(1, s + 0.0624), pal.danger[0]); gr.addColorStop(Math.min(1, s + 0.0625), pal.danger[1]); gr.addColorStop(Math.min(1, s + 0.124), pal.danger[1]); } return gr; }
    if (kind === "finish") return Math.floor((a0 / SA) + 0.5) % 2 ? "#ffd23f" : "#ffffff";
    return pal.slices[tint];
  }
  function drawFloor(i, f, part) {
    const cy = sy(top(i)); if (cy < -80 || cy > H + 80) return;
    const off = f.broken ? f.broken : 0; if (off > 0) return;      // shards take over
    for (let j = 0; j < S; j++) {
      const kind = f.sl[j]; if (kind === "gap") continue;
      const a0 = j * SA + rot, a1 = a0 + SA, mid = (a0 + a1) / 2, front = Math.sin(mid) > 0;
      if ((part === "back") === front) continue;
      const fill = sliceFill(kind, f.tint, cy, a0, a1);
      if (front) {   // side wall
        const b0 = Math.max(a0, Math.floor(a0 / (2 * Math.PI)) * 2 * Math.PI), s0 = ((a0 % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI), s1 = s0 + SA;
        const c0 = Math.max(0, s0), c1 = Math.min(Math.PI, s1);
        const parts = [[c0, c1]]; if (s1 > Math.PI * 2) parts.push([0, Math.min(Math.PI, s1 - Math.PI * 2)]);
        for (const [c0, c1] of parts) if (c1 > c0) {
          g.beginPath(); g.ellipse(CX, cy, TW.outer, TW.outer * TILT, 0, c0, c1); g.ellipse(CX, cy + THICK, TW.outer, TW.outer * TILT, 0, c1, c0, true); g.closePath();
          g.fillStyle = kind === "danger" ? pal.danger[0] : kind === "finish" ? "#e0b300" : shadeHex(pal.slices[f.tint], 0.72); g.fill();
          g.strokeStyle = pal.ink; g.lineWidth = 2.5; g.stroke();
        }
      }
      slicePath(cy, a0, a1, TW.outer, TW.inner); g.fillStyle = fill; g.fill(); g.strokeStyle = pal.ink; g.lineWidth = 2.5; g.stroke();
    }
    // paint splats that belong to this floor
    for (const s of splats) if (s.floor === i) { const a = s.a + rot; if ((Math.sin(a) > 0) !== (part === "front")) continue; g.fillStyle = s.c; g.beginPath(); g.ellipse(CX + Math.cos(a) * RB, cy + Math.sin(a) * RB * TILT, s.r, s.r * TILT * 1.4, 0, 0, 7); g.fill(); }
    if (f.finish && part === "front") { g.fillStyle = pal.ink; g.font = "900 16px 'Arial Black','Futura',sans-serif"; g.textAlign = "center"; g.fillText("FINISH", CX, cy + TW.outer * TILT + THICK + 20); }
  }
  function shadeHex(hex, f) { const p = parseInt(hex.slice(1), 16), c = s => Math.round(((p >> s) & 255) * f); return `rgb(${c(16)},${c(8)},${c(0)})`; }
  function drawPole(yTop, yBot) {
    const a = sy(yTop), b = sy(yBot); if (b < -50 || a > H + 50) return;
    g.fillStyle = pal.pole; g.fillRect(CX - TW.inner, a, TW.inner * 2, b - a); g.strokeStyle = pal.ink; g.lineWidth = 2.5; g.strokeRect(CX - TW.inner, a, TW.inner * 2, b - a);
    g.fillStyle = "rgba(255,255,255,.45)"; g.fillRect(CX - TW.inner + 6, a, 6, b - a);
  }
  function drawBall() {
    const bx = CX, by = sy(ball.y) + RB * TILT, r = BL.r, sq = ball.sq;
    trail.forEach((ty, i) => { g.globalAlpha = (i / trail.length) * 0.4; g.fillStyle = fever ? "#ff8a1f" : skin.color; g.beginPath(); g.arc(bx, sy(ty) + RB * TILT, r * (0.5 + i / trail.length * 0.4), 0, 7); g.fill(); });
    g.globalAlpha = 1;
    g.save(); g.translate(bx, by); g.scale(1 + sq * 0.3, 1 - sq * 0.3);
    if (fever) { g.fillStyle = `rgba(255,138,31,${0.4 + Math.sin(clock * 30) * 0.2})`; g.beginPath(); g.arc(0, 0, r + 8, 0, 7); g.fill(); }
    g.fillStyle = fever ? "#ff8a1f" : skin.color; g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill();
    g.fillStyle = pal.ink; g.strokeStyle = pal.ink;
    if (skin.pattern === "dots") [[-4, -4], [4, -1], [-1, 5]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 2, 0, 7); g.fill(); });
    if (skin.pattern === "stripes") { g.save(); g.beginPath(); g.arc(0, 0, r, 0, 7); g.clip(); g.fillStyle = "#fff"; for (let i = -2; i <= 2; i++) g.fillRect(i * 6 - 1.5, -r, 3, r * 2); g.restore(); }
    if (skin.pattern === "half") { g.beginPath(); g.arc(0, 0, r, -Math.PI / 2, Math.PI / 2); g.fill(); }
    if (skin.pattern === "ring") { g.fillStyle = pal.bg; g.beginPath(); g.arc(0, 0, r * 0.4, 0, 7); g.fill(); }
    if (skin.pattern === "zigzag") { g.lineWidth = 2; g.beginPath(); g.moveTo(-r + 2, 0); for (let i = 0; i < 5; i++) g.lineTo(-r + 2 + (i + 1) * (r * 2 - 4) / 5, i % 2 ? 0 : -4); g.stroke(); }
    g.lineWidth = 2.5; g.beginPath(); g.arc(0, 0, r, 0, 7); g.stroke();
    g.fillStyle = "rgba(255,255,255,.7)"; g.beginPath(); g.arc(-r * 0.35, -r * 0.35, r * 0.22, 0, 7); g.fill();
    g.restore();
  }
  function drawShards() {
    for (const p of shards) {
      const cy = sy(top(p.floor) + p.y); g.globalAlpha = Math.max(0, 1 - p.t / 1.2);
      if (p.dust) { g.fillStyle = pal.deco[p.floor % pal.deco.length]; g.fillRect(p.x - 3, cy - 3, 6, 6); continue; }
      const a0 = p.a0 + p.rot0 + p.spin * 0.2, a1 = a0 + SA, mid = (a0 + a1) / 2, dx = Math.cos(mid) * p.rad, dy = Math.sin(mid) * p.rad * TILT;
      g.save(); g.translate(dx, dy); slicePath(cy, a0, a1, TW.outer, TW.inner); g.fillStyle = sliceFill(p.kind, p.tint, cy, a0, a1); g.fill(); g.strokeStyle = pal.ink; g.lineWidth = 2; g.stroke(); g.restore();
    }
    g.globalAlpha = 1;
  }
  function render() {
    g.setTransform(k * dpr, 0, 0, k * dpr, 0, 0);
    drawDeco();
    if (!floors.length) return;
    // bottom → top so nearer (higher) floors overlap lower ones
    const ballFloor = floors.findIndex((f, idx) => !f.broken && top(idx) - BL.r >= ball.y - 0.5);
    for (let i = floors.length - 1; i >= 0; i--) {
      drawFloor(i, floors[i], "back");
      drawPole(i ? top(i - 1) : top(0) - 600, top(i) + (i === floors.length - 1 ? THICK : 0));   // pole passes through the ring
      drawFloor(i, floors[i], "front");
      if (i === ballFloor) drawBall();
    }
    if (ballFloor < 0) drawBall();
    drawShards();
    g.textAlign = "center";
    texts.forEach(t => { g.globalAlpha = 1 - t.t / 0.9; g.font = t.big ? "900 26px 'Arial Black','Futura',sans-serif" : "900 20px 'Arial Black','Futura',sans-serif"; g.lineWidth = 6; g.strokeStyle = pal.ink; g.fillStyle = t.big ? "#ffd23f" : "#fff"; const y = sy(t.y) - 40 - t.t * 40; g.strokeText(t.s, CX + 90, y); g.fillText(t.s, CX + 90, y); });
    g.globalAlpha = 1;
    confetti.forEach(c => { g.save(); g.translate(c.x, sy(c.y)); g.rotate(c.r); g.fillStyle = c.c; g.strokeStyle = pal.ink; g.lineWidth = 1.5; g.beginPath(); if (c.shape === 0) g.rect(-5, -5, 10, 10); else if (c.shape === 1) g.arc(0, 0, 5, 0, 7); else { g.moveTo(0, -6); g.lineTo(6, 5); g.lineTo(-6, 5); g.closePath(); } g.fill(); g.stroke(); g.restore(); });
  }

  /* ---------- input ---------- */
  let lastX = null;
  cv.addEventListener("pointerdown", e => { lastX = e.clientX; emit("touch"); });
  addEventListener("pointermove", e => { if (lastX === null || state !== "play" || paused) return; rot += (e.clientX - lastX) / (cv.getBoundingClientRect().width / W) * CF.spinSpeed; lastX = e.clientX; });
  addEventListener("pointerup", () => lastX = null);
  const held = {};
  addEventListener("keydown", e => { held[e.key] = true; if (e.key === "Escape" || e.key === "p") emit("pauseKey"); });
  addEventListener("keyup", e => held[e.key] = false);
  setInterval(() => { if (state !== "play" || paused) return; if (held.ArrowLeft || held.a) rot -= 0.06; if (held.ArrowRight || held.d) rot += 0.06; }, 16);

  function fit() { const vw = innerWidth, vh = innerHeight; H = Math.max(620, Math.min(920, W * vh / vw)); k = Math.min(vw / W, vh / H); dpr = Math.min(2, devicePixelRatio || 1); cv.width = Math.round(W * k * dpr); cv.height = Math.round(H * k * dpr); cv.style.width = W * k + "px"; cv.style.height = H * k + "px"; }
  addEventListener("resize", fit); fit(); makeDeco();
  let last = 0;
  (function loop(ts) { const dt = Math.min(0.033, (ts - last) / 1000 || 0.016); last = ts; step(dt); render(); requestAnimationFrame(loop); })(0);

  return {
    on: (n, f) => hooks[n] = f, start, step, render, spec, sliceAtBall,
    spin(d) { rot += d; }, set rotation(v) { rot = v; }, get rotation() { return rot; },
    revive() { const i = floors.findIndex((f, idx) => !f.broken && top(idx) - BL.r >= ball.y - 0.5); for (let q = Math.max(0, i); q < Math.min(floors.length - 1, i + 3); q++) floors[q].sl = floors[q].sl.map(s => s === "danger" ? "solid" : s); ball.vy = -Math.sqrt(2 * BL.gravity * BL.bounce); ball.y -= 2; state = "play"; emit("hud"); },
    pause() { paused = true; }, resume() { paused = false; }, quit() { state = "idle"; floors = []; },
    get state() { return state; }, get level() { return level; }, get score() { return score; }, get passed() { return passed; }, get total() { return floors.length - 1; },
    get floors() { return floors; }, get combo() { return combo; }, get fever() { return fever; }, get ballY() { return ball.y; }, get vy() { return ball.vy; }
  };
})();

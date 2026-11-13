/* ==========================================================================
   HOOP SWISH — 3D ball physics with a perspective camera.
   Swipe length/direction → launch velocity (solved so a "perfect" swipe drops
   in), rim as a torus, backboard plane, floor bounces, score detection,
   swish/streak/fire, a sliding hoop, and spray-paint graffiti art.
   ========================================================================== */
window.Game = (() => {
  const CF = window.GAME_CONFIG, CT = CF.court, G = CT.gravity;
  const cv = document.getElementById("court"), g = cv.getContext("2d");
  let VW = 400, VH = 760, dpr = 1, focal = 520, horizon = 300;
  const cam = { x: 0, y: 1.55, z: -1.6 };
  const hooks = {}, emit = (n, d) => hooks[n] && hooks[n](d);

  let mode = "street", state = "idle", score = 0, made = 0, shots = 0, streak = 0, fire = false, timeLeft = 0, paused = false, clock = 0;
  let ball = null, hoopX = 0, hoopV = 0, hoopPh = 0, net = 0, sparks = [], texts = [], trail = [], skin = CF.balls[0], swipe = null, flash = 0, coins = 0;
  const START = { x: 0, y: 1.0, z: 0.4 };

  /* ---------- projection ---------- */
  function P(x, y, z) { const d = Math.max(0.2, z - cam.z), s = focal / d; return [VW / 2 + (x - cam.x) * s, horizon - (y - cam.y) * s, s]; }

  /* ---------- game flow ---------- */
  function start(m, b) {
    mode = m; skin = b || CF.balls[0]; score = 0; made = 0; shots = 0; streak = 0; fire = false; coins = 0; hoopX = 0; hoopV = 0; hoopPh = 0;
    timeLeft = CF.modes[m].time; state = "play"; paused = false; newBall(); emit("hud");
  }
  function newBall() { ball = { x: START.x, y: START.y, z: START.z, vx: 0, vy: 0, vz: 0, spin: 0, flying: false, touched: false, scored: false, below: false, rest: 0 }; trail = []; }
  function shoot(dx, dy, dt) {
    if (!ball || ball.flying || state !== "play" || paused) return;
    const len = -dy / VH; if (len < 0.08) return;              // too short = not a shot
    // the perfect swipe solves the throw to the rim; longer / shorter swipes scale it
    const power = 1 + (len - CF.swipe.perfect) / CF.swipe.perfect * CF.swipe.spread;
    const tx = hoopX, ty = CT.rimY + 0.02, tz = CT.rimZ + 0.06, T = 1.25;   // arrive at the rim centre on the way down
    const dz = tz - ball.z, dyw = ty - ball.y;
    ball.vz = dz / T * (0.92 + power * 0.08);
    ball.vy = (dyw + 0.5 * G * T * T) / T * power;
    ball.vx = (tx - ball.x) / T + (dx / VW) * CF.swipe.aimSlop * 4.2 - (tx - ball.x) / T * 0;
    ball.flying = true; ball.spin = -8; shots++; Sound.sfx("shoot"); emit("hud");
  }

  /* ---------- physics ---------- */
  function stepBall(dt) {
    const b = ball, R = CT.ballR, rimR = CT.rimR, rimY = CT.rimY, rimZ = CT.rimZ;
    const py = b.y;
    b.vy -= G * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt; b.spin *= 0.995;
    // backboard
    const bd = CT.board;
    if (b.z + R > bd.z && b.z < bd.z + 0.2 && Math.abs(b.x - hoopX) < bd.w / 2 && b.y > bd.y0 && b.y < bd.y1 && b.vz > 0) { b.z = bd.z - R; b.vz = -b.vz * 0.55; b.vx *= 0.8; b.touched = true; Sound.sfx("board", Math.abs(b.vz) / 4); }
    // rim: torus = circle of radius rimR at rimY; find the closest point on that circle
    const rx = b.x - hoopX, rz = b.z - rimZ, rl = Math.hypot(rx, rz) || 1e-6;
    const cx = hoopX + rx / rl * rimR, cz = rimZ + rz / rl * rimR, ex = b.x - cx, ey = b.y - rimY, ez = b.z - cz, ed = Math.hypot(ex, ey, ez), tube = 0.012;
    if (ed < R + tube) {
      const nx = ex / ed, ny = ey / ed, nz = ez / ed, vn = b.vx * nx + b.vy * ny + b.vz * nz;
      b.x = cx + nx * (R + tube); b.y = rimY + ny * (R + tube); b.z = cz + nz * (R + tube);
      if (vn < 0) { b.vx -= 1.6 * vn * nx; b.vy -= 1.6 * vn * ny; b.vz -= 1.6 * vn * nz; b.vx *= 0.85; b.vz *= 0.85; b.touched = true; Sound.sfx("rim", -vn); net = Math.max(net, 0.3); }
    }
    // score: passing down through the rim plane inside the hoop
    if (!b.scored && py > rimY && b.y <= rimY && Math.hypot(b.x - hoopX, b.z - rimZ) < rimR - R * 0.35 && b.vy < 0) { b.scored = true; basket(!b.touched); }
    if (b.y < rimY - 0.4) b.below = true;
    // floor
    if (b.y < R) { b.y = R; if (b.vy < -0.5) { Sound.sfx("bounce", -b.vy / 8); b.vy = -b.vy * 0.62; b.vx *= 0.8; b.vz *= 0.8; } else b.vy = 0; b.rest += dt; }
    if (b.z > rimZ + 2.5) { b.vz = -Math.abs(b.vz) * 0.4; }
  }
  function basket(swish) {
    made++; streak++;
    if (streak >= CF.points.fireAfter && !fire) { fire = true; Sound.sfx("fire"); emit("fire", true); }
    const pts = (swish ? CF.points.swish : CF.points.basket) * (fire ? CF.points.fireMult : 1);
    score += pts; coins += swish ? 2 : 1; net = 1; flash = 0.4;
    if (mode === "street" && CF.modes.street.time) timeLeft = Math.min(99, timeLeft + (swish ? CF.points.bonusTime : 0));
    Sound.sfx(swish ? "swish" : "score", streak); if (!swish) setTimeout(() => Sound.sfx("score", streak), 40);
    const [sx, sy] = P(hoopX, CT.rimY, CT.rimZ);
    texts.push({ x: sx, y: sy - 50, s: (swish ? "SWISH! " : "") + "+" + pts, t: 0, big: swish });
    for (let i = 0; i < (swish ? 34 : 16); i++) { const a = Math.random() * 6.28, s = 80 + Math.random() * 240; sparks.push({ x: sx, y: sy, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, t: 0, c: ["#ff3d7f", "#39ff88", "#ffd23f", "#3dc8ff"][i % 4] }); }
    emit("hud");
  }
  function missed() {
    streak = 0; if (fire) { fire = false; emit("fire", false); }
    Sound.sfx("miss"); emit("hud");
    if (mode === "streak") { state = "over"; setTimeout(() => emit("over", { score, made, shots, mode, coins }), 600); }
  }
  function step(dt) {
    clock += dt; if (paused || state === "idle") return;
    sparks.forEach(s => { s.t += dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 400 * dt; }); sparks = sparks.filter(s => s.t < 0.9);
    texts.forEach(t => t.t += dt); texts = texts.filter(t => t.t < 1.1);
    net = Math.max(0, net - dt * 1.8); flash = Math.max(0, flash - dt);
    if (state !== "play") return;
    if (CF.modes[mode].time) { const before = Math.ceil(timeLeft); timeLeft -= dt; if (timeLeft <= 5 && Math.ceil(timeLeft) !== before) Sound.sfx("tick"); if (timeLeft <= 0) { timeLeft = 0; state = "over"; Sound.sfx("buzzer"); setTimeout(() => emit("over", { score, made, shots, mode, coins }), 800); } emit("clock", timeLeft); }
    // the hoop starts to slide once you are scoring well
    if (score >= CF.points.moveFrom) { hoopV = Math.min(0.7, 0.25 + (score - CF.points.moveFrom) * 0.01); hoopPh += hoopV * dt; hoopX = Math.sin(hoopPh) * 0.55; }
    if (ball && ball.flying) {
      const sub = 8; for (let i = 0; i < sub; i++) stepBall(dt / sub);
      const [sx, sy] = P(ball.x, ball.y, ball.z); trail.push(sx, sy); if (trail.length > 20) trail.splice(0, 2);
      if (ball.rest > 0.35 || ball.z < -1 || Math.abs(ball.x) > 4 || (ball.below && ball.y < 0.3 && ball.z > 1)) { if (!ball.scored) missed(); if (state === "play") newBall(); }
    }
  }

  /* ---------- drawing ---------- */
  let wall = null;
  function paintWall() {
    wall = document.createElement("canvas"); wall.width = VW * 2; wall.height = VH * 2; const x = wall.getContext("2d"); x.scale(2, 2);
    const [, wy] = P(0, 0, CT.board.z + 0.6);
    // bricks
    x.fillStyle = "#7a3b2e"; x.fillRect(0, 0, VW, wy);
    for (let r = 0, y = 0; y < wy; r++, y += 16) for (let c = -1, xx = (r % 2) * -14; xx < VW; c++, xx += 28) { x.fillStyle = `hsl(${10 + ((r * 7 + c * 13) % 9)}, 45%, ${30 + ((r * 3 + c * 5) % 7)}%)`; x.fillRect(xx + 1, y + 1, 26, 14); }
    // graffiti tags with drips
    const tag = (txt, tx, ty, size, fill, line, rot) => { x.save(); x.translate(tx, ty); x.rotate(rot); x.font = `900 ${size}px 'Impact','Haettenschweiler','Arial Black',sans-serif`; x.lineJoin = "round"; x.lineWidth = size * 0.22; x.strokeStyle = "#141414"; x.strokeText(txt, 0, 0); x.lineWidth = size * 0.1; x.strokeStyle = line; x.strokeText(txt, 0, 0); x.fillStyle = fill; x.fillText(txt, 0, 0); const w = x.measureText(txt).width; x.fillStyle = fill; for (let i = 0; i < 6; i++) { const dx = (i * 0.17 + 0.05) * w, h = 8 + ((i * 37) % 22); x.fillRect(dx, 2, 3, h); x.beginPath(); x.arc(dx + 1.5, h + 2, 2.5, 0, 7); x.fill(); } x.restore(); };
    tag("SWISH", 18, wy * 0.42, 54, "#39ff88", "#ff3d7f", -0.12); tag("HOOP", VW - 150, wy * 0.3, 46, "#ffd23f", "#3dc8ff", 0.1); tag("24/7", 24, wy * 0.82, 36, "#3dc8ff", "#ffd23f", 0.05);
    x.fillStyle = "rgba(255,255,255,.5)"; for (let i = 0; i < 160; i++) { x.globalAlpha = Math.random() * 0.3; x.beginPath(); x.arc(Math.random() * VW, Math.random() * wy, Math.random() * 1.6, 0, 7); x.fill(); } x.globalAlpha = 1;
    // chain-link fence edge + concrete floor with painted lines
    const floor = x.createLinearGradient(0, wy, 0, VH); floor.addColorStop(0, "#5a5f66"); floor.addColorStop(1, "#3a3e44"); x.fillStyle = floor; x.fillRect(0, wy, VW, VH - wy);
    for (let i = 0; i < 400; i++) { x.fillStyle = `rgba(255,255,255,${Math.random() * 0.06})`; x.fillRect(Math.random() * VW, wy + Math.random() * (VH - wy), 2, 1); }
    x.strokeStyle = "rgba(255,255,255,.7)"; x.lineWidth = 3;
    const line = (pts) => { x.beginPath(); pts.forEach(([a, b, c], i) => { const [sx, sy] = P(a, b, c); i ? x.lineTo(sx, sy) : x.moveTo(sx, sy); }); x.stroke(); };
    line([[-1.8, 0, CT.board.z + 0.3], [-1.8, 0, 1.3], [1.8, 0, 1.3], [1.8, 0, CT.board.z + 0.3]]);
    x.beginPath(); for (let a = 0; a <= Math.PI; a += 0.1) { const [sx, sy] = P(Math.cos(a) * 1.8, 0, 1.3 - Math.sin(a) * 1.8); a ? x.lineTo(sx, sy) : x.moveTo(sx, sy); } x.stroke();
    x.strokeStyle = "rgba(200,205,210,.25)"; x.lineWidth = 1; for (let i = -10; i < VW / 10 + 10; i++) { x.beginPath(); x.moveTo(i * 10, wy - 40); x.lineTo(i * 10 + 40, wy); x.moveTo(i * 10 + 40, wy - 40); x.lineTo(i * 10, wy); x.stroke(); }
  }
  function drawHoop() {
    const bd = CT.board, [bx0, by1] = P(hoopX - bd.w / 2, bd.y1, bd.z), [bx1, by0] = P(hoopX + bd.w / 2, bd.y0, bd.z);
    const [px, pyTop] = P(hoopX, bd.y0, bd.z + 0.1), [, pyBot] = P(hoopX, 0, bd.z + 0.6);
    g.fillStyle = "#2b2f35"; g.fillRect(px - 6, pyTop, 12, pyBot - pyTop);
    g.fillStyle = "rgba(255,255,255,.92)"; g.fillRect(bx0, by1, bx1 - bx0, by0 - by1); g.strokeStyle = "#141414"; g.lineWidth = 4; g.strokeRect(bx0, by1, bx1 - bx0, by0 - by1);
    const [sx0, sy1] = P(hoopX - 0.3, CT.rimY + 0.45, bd.z), [sx1, sy0] = P(hoopX + 0.3, CT.rimY + 0.02, bd.z);
    g.strokeStyle = "#ff5a1f"; g.lineWidth = 4; g.strokeRect(sx0, sy1, sx1 - sx0, sy0 - sy1);
    g.fillStyle = "#ff3d7f"; g.font = "900 13px Impact,'Arial Black',sans-serif"; g.textAlign = "center"; g.fillText("HOOP SWISH", (bx0 + bx1) / 2, by1 + 16);
  }
  function rimPts(front) { const pts = []; for (let i = 0; i <= 24; i++) { const a = front ? Math.PI * i / 24 : Math.PI + Math.PI * i / 24; pts.push(P(hoopX + Math.cos(a) * CT.rimR, CT.rimY, CT.rimZ - Math.sin(a) * CT.rimR)); } return pts; }
  function drawRim(front) {
    const pts = rimPts(front); g.strokeStyle = fire ? "#ffb21f" : "#ff5a1f"; g.lineWidth = Math.max(3, pts[12][2] * 0.03); g.lineCap = "round";
    g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke();
    if (!front) return;
    // net: strings from the rim to a smaller ring below, swaying when it catches the ball
    const sway = Math.sin(clock * 20) * net * 0.05, drop = 0.42 + net * 0.08;
    g.strokeStyle = "rgba(255,255,255,.85)"; g.lineWidth = 1.4;
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, [x1, y1] = P(hoopX + Math.cos(a) * CT.rimR, CT.rimY, CT.rimZ + Math.sin(a) * CT.rimR), [x2, y2] = P(hoopX + Math.cos(a + 0.5) * CT.rimR * 0.6 + sway, CT.rimY - drop, CT.rimZ + Math.sin(a + 0.5) * CT.rimR * 0.6); g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
    for (let k = 1; k <= 3; k++) { g.beginPath(); for (let i = 0; i <= 24; i++) { const a = i / 24 * Math.PI * 2, rr = CT.rimR * (1 - k * 0.13), [x, y] = P(hoopX + Math.cos(a) * rr + sway * k / 3, CT.rimY - drop * k / 3, CT.rimZ + Math.sin(a) * rr); i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
  }
  function drawBall() {
    if (!ball) return;
    const [sx, sy, s] = P(ball.x, ball.y, ball.z), r = CT.ballR * s, [shx, shy, ss] = P(ball.x, 0, ball.z);
    g.fillStyle = `rgba(0,0,0,${Math.max(0.08, 0.35 - ball.y * 0.08)})`; g.beginPath(); g.ellipse(shx, shy, CT.ballR * ss, CT.ballR * ss * 0.35, 0, 0, 7); g.fill();
    if (fire) { g.fillStyle = "rgba(255,140,30,.35)"; g.beginPath(); g.arc(sx, sy, r * 1.6, 0, 7); g.fill(); }
    const gr = g.createRadialGradient(sx - r * 0.3, sy - r * 0.35, r * 0.1, sx, sy, r); gr.addColorStop(0, "#fff"); gr.addColorStop(0.18, skin.base); gr.addColorStop(1, shade(skin.base, 0.55));
    g.fillStyle = gr; g.beginPath(); g.arc(sx, sy, r, 0, 7); g.fill();
    g.save(); g.beginPath(); g.arc(sx, sy, r, 0, 7); g.clip(); g.translate(sx, sy); g.rotate(clock * ball.spin * (ball.flying ? 1 : 0));
    g.strokeStyle = skin.seam; g.lineWidth = Math.max(1, r * 0.08); g.beginPath(); g.moveTo(-r, 0); g.lineTo(r, 0); g.moveTo(0, -r); g.lineTo(0, r); g.stroke();
    g.beginPath(); g.ellipse(-r * 0.9, 0, r * 0.5, r, 0, -1.4, 1.4); g.stroke(); g.beginPath(); g.ellipse(r * 0.9, 0, r * 0.5, r, 0, Math.PI - 1.4, Math.PI + 1.4); g.stroke();
    g.restore();
  }
  function shade(hex, f) { const p = parseInt(hex.slice(1), 16), c = s => Math.round(((p >> s) & 255) * f); return `rgb(${c(16)},${c(8)},${c(0)})`; }
  function render() {
    g.setTransform(dpr, 0, 0, dpr, 0, 0); if (!wall) paintWall(); g.drawImage(wall, 0, 0, VW, VH);
    drawHoop();
    const behind = ball && ball.z > CT.rimZ;
    drawRim(false);
    if (behind) drawBall();
    drawRim(true);
    if (!behind) { for (let i = 0; i < trail.length; i += 2) { g.globalAlpha = i / trail.length * 0.25; g.fillStyle = fire ? "#ffb21f" : "#fff"; g.beginPath(); g.arc(trail[i], trail[i + 1], 4, 0, 7); g.fill(); } g.globalAlpha = 1; drawBall(); }
    sparks.forEach(s => { g.globalAlpha = Math.max(0, 1 - s.t / 0.9); g.fillStyle = s.c; g.fillRect(s.x - 2, s.y - 2, 4, 4); }); g.globalAlpha = 1;
    g.textAlign = "center";
    texts.forEach(t => { g.globalAlpha = Math.max(0, 1 - t.t / 1.1); g.font = `900 ${t.big ? 40 : 30}px Impact,'Arial Black',sans-serif`; g.lineWidth = 7; g.strokeStyle = "#141414"; g.strokeText(t.s, t.x, t.y - t.t * 40); g.fillStyle = t.big ? "#39ff88" : "#ffd23f"; g.fillText(t.s, t.x, t.y - t.t * 40); }); g.globalAlpha = 1;
    if (swipe && swipe.pts.length > 1) { g.strokeStyle = "rgba(255,255,255,.55)"; g.lineWidth = 6; g.lineCap = "round"; g.beginPath(); swipe.pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke(); }
    if (flash) { g.fillStyle = `rgba(255,255,255,${flash * 0.35})`; g.fillRect(0, 0, VW, VH); }
  }

  /* ---------- input ---------- */
  cv.addEventListener("pointerdown", e => { if (state !== "play" || paused || !ball || ball.flying) return; swipe = { x: e.clientX, y: e.clientY, t: performance.now(), pts: [[e.clientX, e.clientY]] }; });
  addEventListener("pointermove", e => { if (swipe) swipe.pts.push([e.clientX, e.clientY]); });
  addEventListener("pointerup", e => { if (!swipe) return; const s = swipe; swipe = null; shoot(e.clientX - s.x, e.clientY - s.y, (performance.now() - s.t) / 1000); });
  addEventListener("keydown", e => { if (e.key === " ") shoot(0, -CF.swipe.perfect * VH, 0.2); if (e.key === "Escape" || e.key === "p") emit("pauseKey"); });

  function fit() { VW = innerWidth; VH = innerHeight; dpr = Math.min(2, devicePixelRatio || 1); cv.width = Math.round(VW * dpr); cv.height = Math.round(VH * dpr); cv.style.width = VW + "px"; cv.style.height = VH + "px"; focal = Math.min(VW * 1.5, VH * 0.92); horizon = VH * 0.47; wall = null; }
  addEventListener("resize", fit); fit();
  let lt = 0; (function loop(t) { const dt = Math.min(0.033, (t - lt) / 1000 || 0.016); lt = t; step(dt); render(); requestAnimationFrame(loop); })(0);

  return {
    on: (n, f) => hooks[n] = f, start, step, render, shoot,
    pause() { paused = true; }, resume() { paused = false; }, quit() { state = "idle"; ball = null; },
    extend(s) { if (mode === "streak") { state = "play"; newBall(); } else { timeLeft += s; state = "play"; newBall(); } },
    get score() { return score; }, get made() { return made; }, get shots() { return shots; }, get streak() { return streak; }, get fire() { return fire; },
    get timeLeft() { return timeLeft; }, get state() { return state; }, get mode() { return mode; }, get ball() { return ball; }, get hoopX() { return hoopX; }, get VH() { return VH; }, get VW() { return VW; }
  };
})();

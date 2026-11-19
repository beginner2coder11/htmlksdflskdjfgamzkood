/* PENALTY PRO — game: the shootout (your shot / their shot, sudden death), swipe-to-shoot and tap-to-dive,
   and the drawing: floodlit stadium, goal frame + net that bulges, the keeper, the rival shooter, the ball.
   Ball and keeper rules are in js/kick.js. Camera: behind the penalty spot, looking at the goal. */
window.Game = (() => {
  const C = window.GAME_CONFIG, K = window.Kick;
  const cv = document.getElementById("view"), ctx = cv.getContext("2d");
  const TAU = Math.PI * 2, NETZ = 12.5;
  // two cameras: when you shoot you stand behind the ball; when you keep, a TV camera further back shows their taker
  const CAMS = { shoot: { y: 1.35, z: -1.7, f: 1.12, hor: 0.42 }, keep: { y: 2.2, z: -5, f: 1.25, hor: 0.36 } };
  let DPR = 1, VW = 0, VH = 0, u = 1, F0 = 500, cam = CAMS.shoot, F = 500, HOR = 300, CAMY = 1.35, CAMZ = -1.7, bgs = {};
  const on = {};
  let mode = "idle", n = 1, D = null, opp = null, kit = C.kits[0], st = null, t = 0, fx = [], texts = [], flash = 0;
  let swipe = null, demo = false, shake = 0, bursts = [];

  const ease = x => x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2;
  const back = x => { const c = 1.7; return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2; };
  function canvasOf(w, h) { const c = document.createElement("canvas"); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
  function P(x, y, z) { const dz = z - CAMZ; const s = F / dz; return { x: VW / 2 + x * s, y: HOR + (CAMY - y) * s, s }; }
  function unproject(px, py, z = K.LINE) { const dz = z - CAMZ; return { x: (px - VW / 2) * dz / F, y: CAMY - (py - HOR) * dz / F }; }

  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1); VW = innerWidth; VH = innerHeight;
    cv.width = VW * DPR; cv.height = VH * DPR; cv.style.width = VW + "px"; cv.style.height = VH + "px";
    u = Math.min(VW / 400, VH / 820, 1.3);
    F0 = Math.min(VW * 1.28, VH * 0.72);
    bgs = {}; for (const k in CAMS) { useCam(k); bgs[k] = bake(); }
    useCam(st && st.turn === "keep" ? "keep" : "shoot");
  }

  function useCam(k) { cam = CAMS[k]; F = F0 * cam.f; HOR = VH * cam.hor; CAMY = cam.y; CAMZ = cam.z; }

  /* ---------- stadium, drawn once per size and camera ---------- */
  function bake() {
    const bg = canvasOf(VW * DPR, VH * DPR); const g = bg.getContext("2d"); g.scale(DPR, DPR);
    const sky = g.createLinearGradient(0, 0, 0, HOR); sky.addColorStop(0, "#0b1430"); sky.addColorStop(1, "#24406e"); g.fillStyle = sky; g.fillRect(0, 0, VW, HOR + 40);
    // stands: three tiers of crowd behind the goal
    let sd = 99; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    const boardY = P(0, 0, 16).y, standTop = HOR - VH * 0.3;
    for (let tier = 0; tier < 3; tier++) {
      const y0 = standTop + tier * (boardY - standTop) / 3, y1 = y0 + (boardY - standTop) / 3;
      g.fillStyle = ["#2a3150", "#323a5e", "#3a446c"][tier]; g.fillRect(0, y0, VW, y1 - y0);
      const cols = ["#ff4d5e", "#ffffff", "#ffc93d", "#3d8bff", "#2fc46e", "#ff7ec8", "#ffd2a8", "#ff9a3d"];
      for (let y = y0 + 4; y < y1 - 2; y += 6 * u) for (let x = rnd() * 6; x < VW; x += 6.5 * u) { g.fillStyle = cols[Math.floor(rnd() * cols.length)]; g.globalAlpha = 0.55 + rnd() * 0.4; g.beginPath(); g.arc(x, y, 1.9 * u, 0, TAU); g.fill(); }
      g.globalAlpha = 1; g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(0, y1 - 3, VW, 3);
    }
    // floodlights
    for (const sx of [0.08, 0.92]) { const x = VW * sx, y = standTop - 20 * u; const gl = g.createRadialGradient(x, y, 0, x, y, 120 * u); gl.addColorStop(0, "rgba(255,255,230,0.95)"); gl.addColorStop(0.15, "rgba(255,250,210,0.5)"); gl.addColorStop(1, "rgba(255,250,210,0)"); g.fillStyle = gl; g.fillRect(x - 120 * u, y - 120 * u, 240 * u, 240 * u); g.fillStyle = "#e8eef8"; g.fillRect(x - 18 * u, y - 8 * u, 36 * u, 16 * u); }
    // ad boards
    const bTop = P(0, 0.9, 16).y; g.fillStyle = "#13213a"; g.fillRect(0, bTop, VW, boardY - bTop);
    const boards = ["PENALTY PRO", "GOAL!", "PENALTY PRO", "TOP BINS", "PENALTY PRO"], bw = VW / 2.4;
    g.font = `900 ${Math.round((boardY - bTop) * 0.55)}px ui-rounded, system-ui, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
    for (let i = -1; i < 4; i++) { const x = i * bw; g.fillStyle = i % 2 ? "#2fc46e" : "#3d8bff"; g.fillRect(x + 2, bTop + 2, bw - 4, boardY - bTop - 4); g.fillStyle = "#ffffff"; g.fillText(boards[(i + 5) % 5], x + bw / 2, (bTop + boardY) / 2); }
    // pitch with mowing stripes
    for (let z = 16; z > CAMZ + 0.3; z -= 1.5) { const a = P(0, 0, z), b = P(0, 0, Math.max(CAMZ + 0.3, z - 1.5)); g.fillStyle = Math.round(z / 1.5) % 2 ? "#3fae4a" : "#36a043"; g.fillRect(0, a.y, VW, b.y - a.y + 1); }
    // lines: goal line, six-yard box, penalty spot
    const line = (pts) => { g.beginPath(); pts.forEach(([x, z], i) => { const p = P(x, 0, z); g[i ? "lineTo" : "moveTo"](p.x, p.y); }); g.stroke(); };
    g.strokeStyle = "rgba(255,255,255,0.85)"; g.lineWidth = 2.5 * u;
    line([[-30, K.LINE], [30, K.LINE]]); line([[-9.16, K.LINE], [-9.16, K.LINE - 5.5], [9.16, K.LINE - 5.5], [9.16, K.LINE]]);
    line([[-20.16, K.LINE], [-20.16, -5.5], [20.16, -5.5], [20.16, K.LINE]]);
    const sp = P(0, 0, 0); g.fillStyle = "#ffffff"; g.beginPath(); g.ellipse(sp.x, sp.y, 0.08 * sp.s, 0.03 * sp.s, 0, 0, TAU); g.fill();
    // light vignette
    const vg = g.createRadialGradient(VW / 2, VH * 0.45, VH * 0.2, VW / 2, VH * 0.5, VH * 0.8); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.35)"); g.fillStyle = vg; g.fillRect(0, 0, VW, VH);
    return bg;
  }

  /* ---------- match ---------- */
  function newMatch(lv, opts = {}) {
    n = lv; D = K.diff(lv); demo = !!opts.demo;
    opp = C.teams[(lv * 7 + 3) % C.teams.length];
    st = { me: [], them: [], turn: "shoot", phase: "intro", pt: 0, ball: null, kp: null, kick: -1, res: null, bulge: 0, impact: null, tap: null, shooterT: 0, over: false };
    fx = []; texts = []; flash = 0; swipe = null; bursts = []; shake = 0;
    on.score && on.score(st, opp);
  }
  const goals = a => a.filter(x => x).length;
  function decided() {
    const m = st.me, o = st.them, N = C.kicks;
    if (m.length <= N && o.length <= N) {
      const mLeft = N - m.length, oLeft = N - o.length;
      if (goals(m) > goals(o) + oLeft) return true;
      if (goals(o) > goals(m) + mLeft) return true;
      return m.length === N && o.length === N && goals(m) !== goals(o);
    }
    return m.length === o.length && goals(m) !== goals(o);                       // sudden death: after each pair
  }
  function nextTurn() {
    if (decided()) { st.over = true; st.phase = "end"; st.pt = 0; return; }
    st.turn = st.me.length > st.them.length ? "keep" : "shoot"; st.phase = "intro"; st.pt = 0; st.ball = null; st.res = null; st.bulge = 0; st.impact = null; st.tap = null; st.kick = -1; st.shooterT = 0;
    st.kp = { dive: null, start: 99, speed: C.keeper.speed, reach: C.keeper.reach };
    useCam(st.turn);
    Sound.play("whistle");
  }

  /* ---------- shooting: swipe ---------- */
  function shoot(tx, ty, T, curl) {
    if (st.phase !== "aim") return;
    const shot = { tx, ty, T, curl };
    st.ball = K.launch(tx, ty, T, curl); st.kp = K.aiKeeper(shot, D); st.kick = 0; st.phase = "flight"; st.pt = 0;
    Sound.play("kick");
  }
  function swipeToShot(pts) {
    const a = pts[0], b = pts[pts.length - 1], dt = Math.max(0.05, (b.t - a.t) / 1000), dist = Math.hypot(b.x - a.x, b.y - a.y);
    if (dist < 40 * u || b.y > a.y - 20 * u) return null;
    const speed = dist / dt / u;
    let { x: tx, y: ty } = unproject(b.x, b.y);
    const T = Math.max(0.5, Math.min(0.92, 1.05 - speed / 2400));
    if (speed > 2600) ty += (speed - 2600) / 900;                       // too hard: sails over
    if (speed < 450) ty = Math.min(ty, 0.12 + (speed / 450) * ty);      // too soft: a roller
    ty = Math.max(0.12, ty);
    // curl: how far the swipe bows out from the straight line start → end
    let dev = 0; const lx = b.x - a.x, ly = b.y - a.y, ll = Math.hypot(lx, ly) || 1;
    for (const p of pts) { const d = ((p.x - a.x) * ly - (p.y - a.y) * lx) / ll; if (Math.abs(d) > Math.abs(dev)) dev = d; }
    const curl = Math.max(-9, Math.min(9, dev / (VW * 0.05) * 3.4));
    return { tx, ty, T, curl };
  }

  /* ---------- keeping: tap where to dive ---------- */
  function dive(px, py) {
    if (st.turn !== "keep" || st.tap || (st.phase !== "runup" && st.phase !== "flight")) return;
    const g = unproject(px, py, K.KZ);
    st.tap = { x: g.x, y: g.y };
    st.kp.dive = Math.abs(g.x) < 0.45 ? null : K.diveTo(g.x, g.y);
    st.kp.start = st.phase === "flight" ? st.pt : 0;
    Sound.play("dive");
  }
  function theirKick() { const s = K.aiShot(D); st.ball = K.launch(s.tx, s.ty, s.T, s.curl); st.kick = 0; st.phase = "flight"; st.pt = 0; Sound.play("kick"); }

  /* ---------- update ---------- */
  function update(dt) {
    t += dt; st.pt += dt; flash = Math.max(0, flash - dt); shake = Math.max(0, shake - dt);
    for (const q of bursts) q.t += dt; bursts = bursts.filter(q => q.t < 0.45);
    if (st.phase === "intro" && st.pt > 0.9) { st.phase = st.turn === "shoot" ? "aim" : "runup"; st.pt = 0; if (demo && st.turn === "shoot") setTimeout(() => demoShot(), 500); }
    if (st.phase === "runup") { st.shooterT = st.pt; if (demo && !st.tap && st.pt > 0.7) demoDive(); if (st.pt > 0.95) theirKick(); }
    if (st.phase === "flight") flight(dt);
    if (st.phase === "result") { after(dt); if (st.pt > 1.5) { (st.turn === "shoot" ? st.me : st.them).push(st.res === "goal"); on.score && on.score(st, opp); nextTurn(); } }
    if (st.phase === "end" && st.pt > 0.8 && !st.reported) { st.reported = true; finish(); }
    for (const q of fx) { q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += (q.g || 0) * dt; if (q.vr) q.r += q.vr * dt; }
    fx = fx.filter(q => q.t < q.life);
    for (const x of texts) x.t += dt; texts = texts.filter(x => x.t < 1.4);
  }
  function flight(dt) {
    const b = st.ball, steps = 4;
    for (let i = 0; i < steps; i++) {
      const h = dt / steps, prevZ = b.z; K.stepBall(b, h); st.kick += h;
      if (prevZ < K.KZ && b.z >= K.KZ && K.saves(st.kp, st.kick, b.x, b.y)) { return result("save"); }
      if (b.z >= K.LINE) { const r = K.judge(b.x, b.y); return result(r); }
    }
  }
  function result(r) {
    const b = st.ball; st.res = r; st.phase = "result"; st.pt = 0;
    const mine = st.turn === "shoot";
    if (r === "goal") { b.vz *= 0.5; b.vx *= 0.5; st.impact = { x: b.x, y: b.y }; Sound.play("net"); Sound.play(mine ? "cheer" : "groan"); if (mine) { confetti(); flash = 0.3; } texts.push({ s: mine ? "GOAL!" : "GOAL", t: 0, col: mine ? "#ffe27a" : "#ffffff" }); }
    else if (r === "save") { const p = K.keeper(st.kp, st.kick); b.vz = -b.vz * 0.22; b.vx = (b.x - p.hip.x) * 3 + (Math.random() - 0.5) * 2; b.vy = 3 + Math.random() * 2; b.ax = 0; Sound.play("save"); Sound.play(mine ? "groan" : "cheer"); hitFx(b, "#ffffff", 0.28); texts.push({ s: mine ? "SAVED" : "GREAT SAVE!", t: 0, col: mine ? "#ffffff" : "#7fe8ff" }); if (!mine) { confetti(); flash = 0.2; } }
    else if (r === "post") { b.vz = -b.vz * 0.35; b.vx = -b.vx * 0.5; b.vy = Math.abs(b.vy) * 0.5 + 1; b.ax = 0; Sound.play("post"); hitFx(b, "#ffe27a", 0.18); Sound.play(mine ? "groan" : "cheer"); texts.push({ s: "POST!", t: 0, col: "#ffffff" }); }
    else { Sound.play(mine ? "groan" : "cheer"); texts.push({ s: mine ? "MISSED" : "MISSED!", t: 0, col: mine ? "#ffffff" : "#7fe8ff" }); }
  }
  function hitFx(b, col, sh) { const p = P(b.x, b.y, Math.min(b.z, K.LINE)); bursts.push({ x: p.x, y: p.y, t: 0, col, r: K.R * p.s }); shake = Math.max(shake, sh); }
  function after(dt) {
    const b = st.ball; if (!b) return;
    b.vy -= K.G * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt; b.spin += dt * 6;
    if (b.y < K.R) { b.y = K.R; b.vy = Math.abs(b.vy) * 0.4; b.vx *= 0.9; b.vz *= 0.85; }
    if (st.res === "goal") { if (b.z > NETZ - 0.2) { b.z = NETZ - 0.2; b.vz = -Math.abs(b.vz) * 0.15; } st.bulge = Math.max(0, 0.6 - st.pt) * 1.4; }
  }
  function finish() {
    const win = goals(st.me) > goals(st.them);
    if (demo) { newMatch(1 + Math.floor(Math.random() * 20), { demo: true }); nextTurn(); return; }
    mode = "over";
    const r = { n, win, me: goals(st.me), them: goals(st.them), saves: st.them.filter(x => !x).length, sd: st.me.length > C.kicks, opp };
    if (win) { Sound.play("win"); confetti(); on.win && on.win(r); } else { Sound.play("lose"); on.lose && on.lose(r); }
  }

  /* ---------- demo (title screen) ---------- */
  function demoShot() { if (st.phase !== "aim") return; const tx = (Math.random() * 2 - 1) * 3.1, ty = 0.3 + Math.random() * 1.8; shoot(tx, ty, 0.6 + Math.random() * 0.2, (Math.random() - 0.5) * 5); }
  function demoDive() { const s = Math.random() < 0.5 ? -1 : 1; st.tap = { x: s * 2.2, y: 0.8 }; st.kp.dive = K.diveTo(s * 2.4, 0.9); st.kp.start = 0.25; }

  /* ---------- drawing ---------- */
  function confetti() { const cols = ["#ff5a6e", "#4d9bff", "#ffcf3d", "#46d47e", "#a77bff", "#ff9640"]; for (let i = 0; i < 90; i++) fx.push({ x: Math.random() * VW, y: -20 - Math.random() * 160, vx: (Math.random() - 0.5) * 160, vy: 140 + Math.random() * 160, g: 120, t: 0, life: 2.6, r: 0, vr: (Math.random() - 0.5) * 12, s: (5 + Math.random() * 5) * u, col: cols[i % cols.length], conf: true }); }
  function render() {
    const sk = shake > 0 ? shake * 26 * u : 0;
    ctx.setTransform(DPR, 0, 0, DPR, (Math.random() - 0.5) * sk * DPR, (Math.random() - 0.5) * sk * DPR);
    ctx.drawImage(bgs[st.turn === "keep" ? "keep" : "shoot"], 0, 0, VW, VH);
    const b = st.ball;
    drawNet();
    if (b && b.z > K.LINE) drawBall(b);
    drawKeeper();
    drawPosts();
    if (b && b.z <= K.LINE) drawBall(b);
    if (!b) drawBall({ x: 0, y: K.R, z: 0, spin: 0 });
    for (const q of bursts) { const e = q.t / 0.45, R2 = q.r * (1.5 + e * 5); ctx.globalAlpha = 1 - e; ctx.strokeStyle = q.col; ctx.lineWidth = 5 * u * (1 - e) + 1; ctx.beginPath(); ctx.arc(q.x, q.y, R2, 0, TAU); ctx.stroke();
      for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + 0.3; ctx.beginPath(); ctx.moveTo(q.x + Math.cos(a) * R2 * 1.1, q.y + Math.sin(a) * R2 * 1.1); ctx.lineTo(q.x + Math.cos(a) * R2 * 1.6, q.y + Math.sin(a) * R2 * 1.6); ctx.stroke(); } }
    ctx.globalAlpha = 1;
    if (st.turn === "keep") drawShooter();
    // swipe trail
    if (swipe && swipe.pts.length > 1) { ctx.strokeStyle = "rgba(255,255,255,0.8)"; ctx.lineWidth = 6 * u; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.beginPath(); swipe.pts.forEach((p, i) => ctx[i ? "lineTo" : "moveTo"](p.x, p.y)); ctx.stroke(); }
    // aim hint
    if (st.phase === "aim" && !swipe && !demo) { const p = P(0, K.R, 0), a = 0.5 + 0.5 * Math.sin(t * 5); ctx.globalAlpha = a; ctx.fillStyle = "#ffffff"; ctx.font = `900 ${Math.round(16 * u)}px ui-rounded, system-ui, sans-serif`; ctx.textAlign = "center"; const ay = p.y - p.s * 0.3 - (t * 40 % 20) * u; ctx.fillText("SWIPE UP TO SHOOT", p.x, ay - 26 * u); ctx.beginPath(); ctx.moveTo(p.x, ay); ctx.lineTo(p.x - 12 * u, ay + 14 * u); ctx.lineTo(p.x + 12 * u, ay + 14 * u); ctx.fill(); ctx.globalAlpha = 1; }
    if (st.turn === "keep" && (st.phase === "runup" || st.phase === "intro") && !st.tap && !demo) { const p = P(0, 1.2, K.KZ); ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 5); ctx.fillStyle = "#ffffff"; ctx.font = `900 ${Math.round(16 * u)}px ui-rounded, system-ui, sans-serif`; ctx.textAlign = "center"; ctx.fillText("TAP WHERE TO DIVE", VW / 2, P(0, 0, K.LINE).y + 30 * u); ctx.globalAlpha = 1; }
    if (st.phase === "intro") banner(st.turn === "shoot" ? "YOUR SHOT" : "SAVE IT!", st.turn === "shoot" ? "#2fc46e" : "#3d8bff", Math.min(1, st.pt / 0.25));
    for (const x of texts) { const e = x.t / 1.4, sz = 54 * u * (x.t < 0.2 ? back(x.t / 0.2) : 1); ctx.globalAlpha = 1 - Math.max(0, e - 0.7) / 0.3; ctx.font = `900 ${Math.round(sz)}px ui-rounded, system-ui, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineWidth = 9 * u; ctx.strokeStyle = "#13213a"; ctx.strokeText(x.s, VW / 2, VH * 0.3); ctx.fillStyle = x.col; ctx.fillText(x.s, VW / 2, VH * 0.3); }
    ctx.globalAlpha = 1;
    for (const q of fx) { ctx.globalAlpha = Math.min(1, (1 - q.t / q.life) * 2); ctx.fillStyle = q.col; ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.r); ctx.fillRect(-q.s / 2, -q.s / 4, q.s, q.s / 2); ctx.restore(); }
    ctx.globalAlpha = 1;
    if (flash > 0) { ctx.fillStyle = `rgba(255,255,255,${flash})`; ctx.fillRect(0, 0, VW, VH); }
  }
  function banner(text, col, k) {
    const w = 240 * u * back(Math.max(0.01, k)), h = 54 * u, y = VH * 0.3;
    ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(VW / 2 - w / 2, y - h / 2, w, h, 18 * u) : ctx.rect(VW / 2 - w / 2, y - h / 2, w, h); ctx.fill();
    ctx.fillStyle = "#ffffff"; ctx.font = `900 ${Math.round(28 * u)}px ui-rounded, system-ui, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(text, VW / 2, y + 1);
  }
  function drawPosts() {
    const H = K.HALF, B = K.BAR;
    const seg = (x1, y1, x2, y2) => { const a = P(x1, y1, K.LINE), c = P(x2, y2, K.LINE); ctx.strokeStyle = "rgba(0,0,0,0.25)"; ctx.lineWidth = 0.14 * a.s; ctx.beginPath(); ctx.moveTo(a.x + 2, a.y + 2); ctx.lineTo(c.x + 2, c.y + 2); ctx.stroke(); ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 0.12 * a.s; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(c.x, c.y); ctx.stroke(); };
    ctx.lineCap = "round"; seg(-H, 0, -H, B); seg(H, 0, H, B); seg(-H, B, H, B);
  }
  function drawNet() {
    const H = K.HALF, B = K.BAR, imp = st.impact, bul = st.bulge;
    const nz = (x, y, z) => { if (!imp || bul <= 0) return z; const d2 = (x - imp.x) ** 2 + (y - imp.y) ** 2; return z + bul * Math.exp(-d2 / 0.5); };
    // the back of the net slopes: deeper at the bottom
    const backZ = y => K.LINE + 1.0 + (1 - y / B) * 0.6;
    ctx.strokeStyle = "rgba(255,255,255,0.45)"; ctx.lineWidth = 1;
    for (let x = -H; x <= H + 0.01; x += 0.3) { ctx.beginPath(); for (let y = 0; y <= B + 0.01; y += 0.3) { const p = P(x, y, nz(x, y, backZ(y))); ctx[y ? "lineTo" : "moveTo"](p.x, p.y); } ctx.stroke(); }
    for (let y = 0; y <= B + 0.01; y += 0.3) { ctx.beginPath(); for (let x = -H; x <= H + 0.01; x += 0.3) { const p = P(x, y, nz(x, y, backZ(y))); ctx[x > -H ? "lineTo" : "moveTo"](p.x, p.y); } ctx.stroke(); }
    // roof + side nets
    for (let x = -H; x <= H + 0.01; x += 0.3) { const a = P(x, B, K.LINE), c = P(x, B, backZ(B)); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(c.x, c.y); ctx.stroke(); }
    for (const sx of [-H, H]) for (let y = 0; y <= B + 0.01; y += 0.3) { const a = P(sx, y, K.LINE), c = P(sx, y, backZ(y)); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(c.x, c.y); ctx.stroke(); }
  }
  function drawBall(b) {
    const p = P(b.x, b.y, b.z), r = K.R * p.s, sh = P(b.x, 0, b.z);
    ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.beginPath(); ctx.ellipse(sh.x, sh.y, r * 1.1, r * 0.35, 0, 0, TAU); ctx.fill();
    const g = ctx.createRadialGradient(p.x - r * 0.35, p.y - r * 0.4, r * 0.1, p.x, p.y, r); g.addColorStop(0, "#ffffff"); g.addColorStop(1, "#c9cfdc");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.clip(); ctx.translate(p.x, p.y); ctx.rotate(b.spin || 0); ctx.fillStyle = "#1e2238";
    const pent = (cx, cy, rr) => { ctx.beginPath(); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i / 5 * TAU; ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); };
    pent(0, 0, r * 0.32); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i / 5 * TAU; pent(Math.cos(a) * r * 0.85, Math.sin(a) * r * 0.85, r * 0.26); }
    ctx.restore(); ctx.strokeStyle = "rgba(0,0,0,0.3)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.stroke();
  }
  /* ---------- the keeper: a jointed figure posed every frame ----------
     Ready: bounces on his toes, shuffles along the line, gloves up (the rival waves his arms to put you off).
     At the kick: a split-step crouch, then the dive from js/kick.js (body + arm reach are the same shapes the save
     test uses), legs pushing off then trailing. Staying central, his gloves follow the ball. After the kick: he
     lands and slides, punches the air after a save, or puts his hands on his head when beaten. */
  const V = (x, y) => ({ x, y }), vAdd = (a, b) => V(a.x + b.x, a.y + b.y), vMul = (a, k) => V(a.x * k, a.y * k), vLerp = (a, b, k) => V(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k);
  const vNorm = a => { const l = Math.hypot(a.x, a.y) || 1; return V(a.x / l, a.y / l); };
  function ik(a, target, l1, l2, bend) {            // two-bone limb: returns the elbow / knee and the end point
    let dx = target.x - a.x, dy = target.y - a.y, d = Math.hypot(dx, dy); const mx = l1 + l2 - 0.002;
    if (d > mx) { dx *= mx / d; dy *= mx / d; d = mx; } d = Math.max(d, 0.001);
    const ang = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)))) * bend, base = Math.atan2(dy, dx);
    return { mid: V(a.x + Math.cos(base + ang) * l1, a.y + Math.sin(base + ang) * l1), end: V(a.x + dx, a.y + dy) };
  }
  function shade(hex, k) { const n = parseInt(hex.slice(1), 16), f = c => Math.max(0, Math.min(255, Math.round(k < 0 ? c * (1 + k) : c + (255 - c) * k))); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; }
  const smooth = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };

  function keeperPose() {
    const kp = st.kp || { dive: null, start: 99, reach: 0.8 }, kicked = st.kick >= 0, inRes = st.phase === "result", rt = inRes ? st.pt : 0;
    const kt = kicked ? st.kick + rt : 0, base = K.keeper(kp, kicked ? kt : 0), dove = base.s > 0.02, sgn = kp.dive ? (Math.sign(kp.dive.x) || 1) : 0;
    let h = V(base.hip.x, base.hip.y), d = V(base.dir.x, base.dir.y);
    const ball = st.ball || { x: 0, y: K.R, z: 0 }, reach = kp.reach || 0.8;
    const calm = kicked ? Math.max(0, 1 - kt / 0.15) : 1;
    let mood = "ready";                                   // ready | set | dive | track | lie | cheer | sad
    if (!dove) {
      h.x += Math.sin(t * 1.7) * 0.26 * calm + Math.sin(t * 4.3) * 0.04 * calm;
      h.y = 0.9 + Math.abs(Math.sin(t * 7)) * 0.05 * calm;
      if (st.turn === "keep" && st.tap && !kicked) { const s = Math.sign(st.tap.x) || 0; h.x = h.x * 0.4 + s * 0.12; d = vNorm(V(s * 0.12, 1)); }   // leaning toward your tap
      if (kicked) { mood = kp.dive ? "set" : "track"; h.y -= 0.12 * Math.sin(Math.PI * Math.min(1, kt / 0.3)); }
    } else mood = "dive";
    // after the kick: land / celebrate / despair
    const saved = st.res === "save", beaten = st.res === "goal";
    if (inRes) {
      if (dove) { const f = smooth(rt / 0.35); h = V(h.x + sgn * 0.25 * f, h.y + (0.24 - h.y) * f); d = vNorm(vLerp(d, V(sgn, 0.12), f)); mood = "lie"; }
      else { mood = beaten ? "sad" : "cheer"; if (saved || st.res === "miss" || st.res === "post") h.y = 0.9 + Math.abs(Math.sin(Math.min(rt, 1.2) * Math.PI / 0.6)) * (saved ? 0.32 : 0.14); }
    }
    const p = V(d.y, -d.x);                               // body "right"
    const neck = vAdd(h, vMul(d, 0.55)), head = vAdd(h, vMul(d, 0.76)), sh = [vAdd(neck, vMul(p, -0.21)), vAdd(neck, vMul(p, 0.21))];
    const hp = [vAdd(h, vMul(p, -0.11)), vAdd(h, vMul(p, 0.11))];
    let hands, feet;
    const wob = Math.sin(t * 9) * 0.03;
    if (mood === "ready" || mood === "set") {
      const wave = st.turn === "shoot" && st.phase === "aim" && (t % 4.2) < 1.3;   // the rival waves his arms to distract you
      hands = wave ? [vAdd(neck, V(-0.42 + Math.sin(t * 13) * 0.14, 0.42)), vAdd(neck, V(0.42 - Math.sin(t * 13) * 0.14, 0.42))]
                   : [vAdd(h, V(-0.46, 0.3 + wob)), vAdd(h, V(0.46, 0.3 - wob))];
      if (mood === "set") hands = [vAdd(h, V(-0.4, 0.22)), vAdd(h, V(0.4, 0.22))];
      const step = Math.sin(t * 1.7 + 1.2) * 0.06 * calm;
      feet = [V(h.x - 0.3 + step, 0.03), V(h.x + 0.3 + step, 0.03)];
    } else if (mood === "track") {
      // gloves go to the ball, but no further than his arms reach (the same reach the save test uses)
      const k = smooth((ball.z - 3) / 7.5), shc = vAdd(h, vMul(d, 0.55)), armL = 0.55 + reach * 0.25;
      const tgt = V(ball.x, Math.max(h.y - 0.3, Math.min(shc.y + 0.25, ball.y))); let off = V(tgt.x - shc.x, tgt.y - shc.y); const L = Math.hypot(off.x, off.y);
      if (L > armL) off = vMul(off, armL / L);
      const c = vAdd(shc, vMul(off, k));
      hands = [vLerp(vAdd(h, V(-0.4, 0.22)), vAdd(c, V(-0.1, 0)), k), vLerp(vAdd(h, V(0.4, 0.22)), vAdd(c, V(0.1, 0)), k)];
      feet = [V(h.x - 0.3, 0.03), V(h.x + 0.3, 0.03)];
    } else if (mood === "dive" || mood === "lie") {
      const far = vAdd(h, vMul(d, 0.75 + reach * 0.55)), k = mood === "lie" ? 1 : smooth(base.s * 1.6);
      // both gloves stretch toward the dive; the leading glove a touch further
      hands = [vAdd(far, vMul(p, -0.09)), vAdd(far, vMul(p, 0.09))];
      if (mood === "lie" && (saved || st.res === "miss" || st.res === "post") && rt > 0.55) hands[sgn > 0 ? 0 : 1] = vAdd(neck, V(0, 0.62 + Math.sin(rt * 14) * 0.05));     // fist in the air
      if (mood === "lie" && beaten && rt > 0.6) hands = hands.map((q, i) => V(q.x, Math.max(0.08, q.y - 0.1 - Math.abs(Math.sin(rt * 9 + i)) * 0.12)));  // thumps the grass
      const pedal = mood === "dive" ? Math.sin(t * 16) * 0.06 : 0, trail = vAdd(h, vMul(d, -0.86));
      const push = [V(-sgn * 0.3, 0.03), V(sgn * 0.2, 0.03)];          // feet start planted, then trail
      feet = [vLerp(push[0], vAdd(trail, vMul(p, -0.13 + pedal)), k), vLerp(push[1], vAdd(vAdd(h, vMul(d, -0.55)), vMul(p, 0.3 * (sgn || 1) - pedal)), k)];
      if (mood === "lie") feet = feet.map(q => V(q.x, Math.max(0.05, q.y)));
    } else if (mood === "cheer") {
      hands = [vAdd(neck, V(-0.3, 0.55 + Math.sin(rt * 12) * 0.05)), vAdd(neck, V(0.3, 0.55 - Math.sin(rt * 12) * 0.05))];
      feet = [V(h.x - 0.22, Math.max(0.03, h.y - 0.86)), V(h.x + 0.22, Math.max(0.03, h.y - 0.86))];
    } else {                                              // sad: hands on head, slumped
      h.y -= Math.min(0.08, rt * 0.2);
      hands = [vAdd(head, V(-0.14, 0.1)), vAdd(head, V(0.14, 0.1))];
      feet = [V(h.x - 0.2, 0.03), V(h.x + 0.2, 0.03)];
    }
    const arms = [ik(sh[0], hands[0], 0.3, 0.3, 1), ik(sh[1], hands[1], 0.3, 0.3, -1)];
    const legs = [ik(hp[0], feet[0], 0.45, 0.45, -1), ik(hp[1], feet[1], 0.45, 0.45, 1)];
    return { h, d, p, neck, head, sh, hp, arms, legs, mood, dove, sgn, ball };
  }

  function drawKeeper() {
    const mine = st.turn === "keep", shirt = mine ? kit.keeper : opp.keeper, shorts = shade(shirt, -0.45);
    const K0 = keeperPose(), sc = P(0, 0, K.KZ).s, S = q => { const r = P(q.x, q.y, K.KZ); return [r.x, r.y]; };
    const line = (a, b, w, col) => { const [ax, ay] = S(a), [bx, by] = S(b); ctx.strokeStyle = col; ctx.lineWidth = w * sc; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke(); };
    const dot = (a, r, col) => { const [x, y] = S(a); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r * sc, 0, TAU); ctx.fill(); };
    const out = "rgba(10,16,30,0.55)";
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    // shadow: shrinks as he leaves the ground
    const [sx, sy] = S(V(K0.h.x, 0)), air = Math.max(0, K0.h.y - 0.3);
    ctx.fillStyle = `rgba(0,0,0,${0.28 - Math.min(0.15, air * 0.12)})`; ctx.beginPath(); ctx.ellipse(sx, sy, (0.55 - Math.min(0.2, air * 0.15)) * sc, 0.1 * sc, 0, 0, TAU); ctx.fill();
    // legs: thigh (shorts → skin), sock, boot
    for (const [i, L] of K0.legs.entries()) {
      line(K0.hp[i], L.mid, 0.2, out); line(L.mid, L.end, 0.17, out);
      line(K0.hp[i], L.mid, 0.17, "#e9b98c"); line(L.mid, L.end, 0.14, shirt);
      line(vLerp(L.mid, L.end, 0.05), vLerp(L.mid, L.end, 0.22), 0.145, "#ffffff");
      const dir = vNorm(V(L.end.x - L.mid.x, L.end.y - L.mid.y)), toe = vAdd(L.end, vMul(V(-dir.y, dir.x), i ? -0.07 : 0.07));
      line(L.end, toe, 0.13, "#1e2238");
    }
    // shorts
    const sp = K0.p, d = K0.d, h = K0.h;
    const poly = (pts, col) => { ctx.fillStyle = col; ctx.beginPath(); pts.forEach((q, i) => { const [x, y] = S(q); ctx[i ? "lineTo" : "moveTo"](x, y); }); ctx.closePath(); ctx.fill(); };
    poly([vAdd(vAdd(h, vMul(sp, -0.2)), vMul(d, 0.1)), vAdd(vAdd(h, vMul(sp, 0.2)), vMul(d, 0.1)), vAdd(vLerp(K0.hp[1], K0.legs[1].mid, 0.35), vMul(sp, 0.09)), vAdd(h, vMul(d, -0.12)), vAdd(vLerp(K0.hp[0], K0.legs[0].mid, 0.35), vMul(sp, -0.09))], shorts);
    // torso: broad shoulders, narrower waist, chest band and collar
    const tor = [vAdd(K0.sh[0], vMul(sp, -0.04)), vAdd(K0.sh[1], vMul(sp, 0.04)), vAdd(vAdd(h, vMul(sp, 0.19)), vMul(d, 0.06)), vAdd(vAdd(h, vMul(sp, -0.19)), vMul(d, 0.06))];
    ctx.strokeStyle = out; ctx.lineWidth = 0.05 * sc; ctx.beginPath(); tor.forEach((q, i) => { const [x, y] = S(q); ctx[i ? "lineTo" : "moveTo"](x, y); }); ctx.closePath(); ctx.stroke();
    poly(tor, shirt);
    poly([vAdd(vAdd(h, vMul(d, 0.36)), vMul(sp, -0.2)), vAdd(vAdd(h, vMul(d, 0.36)), vMul(sp, 0.2)), vAdd(vAdd(h, vMul(d, 0.28)), vMul(sp, 0.195)), vAdd(vAdd(h, vMul(d, 0.28)), vMul(sp, -0.195))], shade(shirt, 0.35));
    poly([vAdd(K0.neck, vMul(sp, -0.08)), vAdd(K0.neck, vMul(sp, 0.08)), vAdd(K0.neck, vMul(d, -0.1))], shade(shirt, -0.3));
    // arms (long sleeves) + big gloves with fingers
    for (const [i, A] of K0.arms.entries()) {
      line(K0.sh[i], A.mid, 0.17, out); line(A.mid, A.end, 0.15, out);
      line(K0.sh[i], A.mid, 0.14, shirt); line(A.mid, A.end, 0.12, shade(shirt, -0.12));
      const fd = vNorm(V(A.end.x - A.mid.x, A.end.y - A.mid.y)), palm = vAdd(A.end, vMul(fd, 0.05));
      dot(palm, 0.115, out); dot(vAdd(A.end, vMul(fd, -0.02)), 0.075, shade(shirt, -0.35));
      dot(palm, 0.1, "#f7f9ff");
      const side = V(-fd.y, fd.x);
      for (const f of [-1, 0, 1]) dot(vAdd(vAdd(palm, vMul(fd, 0.09)), vMul(side, f * 0.05)), 0.042, "#f7f9ff");
      dot(vAdd(palm, vMul(side, (i ? -1 : 1) * 0.09)), 0.035, "#f7f9ff");
      dot(vAdd(palm, vMul(fd, -0.01)), 0.045, "#3dd9a0");
    }
    // head: face, hair, eyes on the ball, mouth by mood
    dot(K0.head, 0.135, out); dot(K0.head, 0.12, "#e9b98c");
    const [hx, hy] = S(K0.head), ang = Math.atan2(d.x, d.y);
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(ang);
    ctx.fillStyle = "#3a2a1e"; ctx.beginPath(); ctx.arc(0, 0, 0.125 * sc, Math.PI * 1.02, Math.PI * 1.98); ctx.fill();
    const b = K0.ball, look = vNorm(V(b.x - K0.head.x, b.y - K0.head.y)), lk = K0.mood === "sad" ? V(0, -0.5) : look;
    const ex = lk.x * Math.cos(-ang) - lk.y * Math.sin(-ang), ey = lk.x * Math.sin(-ang) + lk.y * Math.cos(-ang);
    for (const s2 of [-1, 1]) { ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(s2 * 0.045 * sc, 0.0 * sc, 0.03 * sc, 0, TAU); ctx.fill(); ctx.fillStyle = "#13213a"; ctx.beginPath(); ctx.arc((s2 * 0.045 + ex * 0.012) * sc, (-ey * 0.012) * sc, 0.017 * sc, 0, TAU); ctx.fill();
      ctx.strokeStyle = "#3a2a1e"; ctx.lineWidth = 0.014 * sc; ctx.beginPath(); ctx.moveTo((s2 * 0.045 - 0.025) * sc, (-0.045 - (K0.mood === "sad" ? -0.01 * s2 : 0.008 * s2 * 0)) * sc); ctx.lineTo((s2 * 0.045 + 0.025) * sc, (-0.05 + (K0.mood === "sad" ? 0.012 * s2 : 0.008 * s2)) * sc); ctx.stroke(); }
    ctx.strokeStyle = "#7a3a2a"; ctx.lineWidth = 0.016 * sc; ctx.beginPath();
    if (K0.mood === "cheer" || K0.mood === "dive" || (K0.mood === "lie" && st.res !== "goal")) { ctx.fillStyle = "#7a3a2a"; ctx.ellipse(0, 0.06 * sc, 0.03 * sc, 0.022 * sc, 0, 0, TAU); ctx.fill(); }
    else if (K0.mood === "sad" || st.res === "goal") { ctx.arc(0, 0.085 * sc, 0.03 * sc, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
    else { ctx.moveTo(-0.025 * sc, 0.06 * sc); ctx.lineTo(0.025 * sc, 0.06 * sc); ctx.stroke(); }
    ctx.restore();
  }
  function drawShooter() {
    // their taker runs up from the left and strikes the ball (seen from behind)
    const q = Math.min(1, st.shooterT / 0.95), kicked = st.kick >= 0;
    const x = kicked ? -0.45 + Math.min(0.3, st.pt * 0.6) : -1.5 + 1.05 * ease(q), z = kicked ? -0.35 + Math.min(0.4, st.pt * 0.8) : -1.4 + 1.05 * ease(q);
    const p = P(x, 0, z), s = p.s * 0.85, run = kicked ? 0 : Math.sin(st.shooterT * 16);
    ctx.save(); ctx.translate(p.x, p.y);
    ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.beginPath(); ctx.ellipse(0, 0, 0.35 * s, 0.08 * s, 0, 0, TAU); ctx.fill();
    ctx.lineCap = "round";
    // legs seen from behind: thigh (skin) → sock → boot; the running legs lift alternately, the kicking leg swings through
    const leg = (hx, fx, fy) => {
      ctx.strokeStyle = "#e9b98c"; ctx.lineWidth = 0.14 * s; ctx.beginPath(); ctx.moveTo(hx * s, -0.85 * s); ctx.lineTo(fx * s, (fy - 0.4) * s); ctx.stroke();
      ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 0.13 * s; ctx.beginPath(); ctx.moveTo(fx * s, (fy - 0.42) * s); ctx.lineTo(fx * s, (fy - 0.06) * s); ctx.stroke();
      ctx.strokeStyle = opp.shirt; ctx.lineWidth = 0.13 * s; ctx.beginPath(); ctx.moveTo(fx * s, (fy - 0.42) * s); ctx.lineTo(fx * s, (fy - 0.34) * s); ctx.stroke();
      ctx.fillStyle = "#1e2238"; ctx.beginPath(); ctx.ellipse(fx * s, (fy - 0.03) * s, 0.09 * s, 0.06 * s, 0, 0, TAU); ctx.fill();
    };
    if (kicked) { leg(-0.1, -0.13, 0); leg(0.1, 0.22, -0.38 + Math.min(0.3, st.pt * 0.6)); }
    else { leg(-0.1, -0.12, -Math.max(0, run) * 0.22); leg(0.1, 0.12, -Math.max(0, -run) * 0.22); }
    ctx.fillStyle = opp.shorts; ctx.fillRect(-0.2 * s, -1.0 * s, 0.4 * s, 0.25 * s);
    ctx.fillStyle = opp.shirt; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-0.24 * s, -1.6 * s, 0.48 * s, 0.65 * s, 0.1 * s) : ctx.rect(-0.24 * s, -1.6 * s, 0.48 * s, 0.65 * s); ctx.fill();
    ctx.fillStyle = "#ffffff"; ctx.font = `900 ${Math.round(0.28 * s)}px ui-rounded, system-ui, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(String((st.them.length % 9) + 7), 0, -1.3 * s);
    ctx.strokeStyle = opp.shirt; ctx.lineWidth = 0.12 * s; ctx.beginPath(); ctx.moveTo(-0.22 * s, -1.5 * s); ctx.lineTo(-0.38 * s, (-1.15 + run * 0.1) * s); ctx.moveTo(0.22 * s, -1.5 * s); ctx.lineTo(0.4 * s, (-1.15 - run * 0.1) * s); ctx.stroke();
    ctx.fillStyle = "#3a2a1e"; ctx.beginPath(); ctx.arc(0, -1.78 * s, 0.17 * s, 0, TAU); ctx.fill();
    ctx.restore();
  }

  /* ---------- input ---------- */
  cv.addEventListener("pointerdown", e => {
    Sound.unlock(); if (mode !== "play") return;
    if (st.turn === "shoot" && st.phase === "aim") { swipe = { pts: [{ x: e.clientX, y: e.clientY, t: performance.now() }] }; try { cv.setPointerCapture(e.pointerId); } catch (er) {} }
    else if (st.turn === "keep") dive(e.clientX, e.clientY);
  });
  cv.addEventListener("pointermove", e => { if (swipe) swipe.pts.push({ x: e.clientX, y: e.clientY, t: performance.now() }); });
  cv.addEventListener("pointerup", e => {
    if (!swipe) return; swipe.pts.push({ x: e.clientX, y: e.clientY, t: performance.now() });
    const s = swipeToShot(swipe.pts); swipe = null;
    if (s) shoot(s.tx, s.ty, s.T, s.curl);
  });
  addEventListener("resize", resize);

  let last = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    if ((mode === "play" || mode === "attract") && st) try { update(dt); } catch (e) { console.error(e); }
    if (st && VW) try { render(); } catch (e) { console.error(e); }
  }
  function start(lv) { newMatch(lv); mode = "play"; nextTurn(); }
  function attract() { newMatch(3, { demo: true }); mode = "attract"; nextTurn(); }
  resize(); requestAnimationFrame(frame);

  return {
    on, start, attract, shoot, dive, swipeToShot,
    setKit(id) { kit = C.kits.find(k => k.id === id) || C.kits[0]; },
    pause(p) { if (p && mode === "play") mode = "paused"; else if (!p && mode === "paused") { mode = "play"; last = 0; } },
    step(dt = 1 / 60, k = 1) { for (let i = 0; i < k; i++) update(dt); },
    goalXY: (x, y) => { const p = P(x, y, K.LINE); return [p.x, p.y]; }, ballXY: () => { const p = P(0, K.R, 0); return [p.x, p.y]; },
    get mode() { return mode; }, set mode(v) { mode = v; }, get state() { return st; }, get opp() { return opp; }, get n() { return n; }
  };
})();

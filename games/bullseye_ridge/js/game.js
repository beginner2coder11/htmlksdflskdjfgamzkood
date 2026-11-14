/* ==========================================================================
   BULLSEYE RIDGE — archery engine
   Pull-back aiming with breathing sway, projectile flight with gravity +
   wind, a follow camera with slow motion near the target, rings scoring,
   bobbing targets, bonus balloons and a layered parallax landscape.
   ========================================================================== */
window.Game = (() => {
  const CF = window.GAME_CONFIG, PH = CF.physics;
  const W = 400, GROUND = 600, AX = 60, AY = GROUND - 62;
  const cv = document.getElementById("view"), g = cv.getContext("2d");
  let H = 760, k = 1, dpr = 1;
  const hooks = {}, emit = (n, d) => hooks[n] && hooks[n](d);

  let mode = "stage", stage = 1, bow = CF.bows[0], season = CF.seasons[0];
  let phase = "idle", arrowsLeft = 0, points = 0, shots = [], wind = 0, dist = 30, R = 40, target = { x: 0, y: 0, base: 0, amp: 0, ph: 0 };
  let balloons = [], arrow = null, stuck = [], parts = [], texts = [], leaves = [], ridges = [];
  let cam = { x: 0, y: 0, z: 1 }, camT = { x: 0, y: 0, z: 1 }, tscale = 1, phaseT = 0, clock = 0, tclock = 0, paused = false;
  let aiming = null, aimAngle = -0.35, aimPow = 0, hold = 0, streak = 0, trialHits = 0;

  const lerp = (a, b, t) => a + (b - a) * t;
  function curve(key, n) { const c = CF.curve[key], t = Math.min(1, (n - 1) / (CF.stages - 1)); return lerp(c.start, c.end, t); }
  function rng(seed) { return () => (seed = (seed * 16807) % 2147483647) / 2147483647; }

  /* ---------- landscape (generated once per season) ---------- */
  function buildRidges() {
    const r = rng(stage * 31 + 7);
    ridges = season.hills.map((col, i) => {
      const pts = [], step = 40 + i * 10, amp = 120 - i * 22, base = 330 + i * 60;
      for (let x = -400; x <= 3200; x += step) pts.push([x, base - amp * (0.4 + r() * 0.6) * (i === 0 ? 1.4 : 1)]);
      const trees = []; if (i >= 2) for (let x = -300; x < 3000; x += 30 + r() * 90) trees.push([x, r()]);
      return { col, pts, par: [0.12, 0.25, 0.45, 0.7][i], trees };
    });
  }
  function seasonFor(n) { return CF.seasons[Math.floor((n - 1) / 10) % CF.seasons.length]; }

  /* ---------- shots ---------- */
  function setupShot() {
    if (mode === "trial") { dist = 24 + trialHits * 4; R = Math.max(26, 44 - trialHits * 0.8); wind = (Math.random() * 2 - 1) * Math.min(8, trialHits * 0.5); }
    else { dist = curve("distance", stage) + (Math.random() * 6 - 3); R = curve("radius", stage); const wm = curve("wind", stage); wind = (Math.random() * 2 - 1) * wm; }
    wind = Math.round(wind * 10) / 10;
    target.x = AX + dist * 10; target.base = GROUND - 92; target.y = target.base;
    target.amp = (mode === "stage" && stage >= CF.movingFrom) || (mode === "trial" && trialHits > 8) ? 14 + Math.min(18, (stage - CF.movingFrom) * 0.8) : 0;
    target.ph = Math.random() * 6;
    balloons = [];
    if ((mode === "stage" && stage >= CF.balloonsFrom) || (mode === "trial" && trialHits > 3)) {
      for (let i = 0; i < 2; i++) balloons.push({ x: AX + dist * 10 * (0.45 + Math.random() * 0.4), y: GROUND - 220 - Math.random() * 140, r: 13, c: ["#d98c7a", "#8fb3c9", "#e2c27a"][i % 3], ph: Math.random() * 6, pop: 0 });
    }
    Sound.wind(wind);
    phase = "preview"; phaseT = 0;
    emit("shot", { dist: Math.round(dist), wind, left: arrowsLeft, points });
  }
  function begin(m, n, b) {
    mode = m; stage = n || 1; bow = b; season = mode === "trial" ? CF.seasons[0] : seasonFor(stage);
    buildRidges(); arrowsLeft = mode === "trial" ? 1 : CF.arrowsPerStage; points = 0; shots = []; stuck = []; parts = []; texts = []; streak = 0; trialHits = 0; paused = false;
    leaves = Array.from({ length: 24 }, () => ({ x: Math.random() * 3000, y: Math.random() * GROUND, v: 10 + Math.random() * 20, s: Math.random() * 6 }));
    cam = { x: AX - 110, y: GROUND - H * 0.78, z: 1 }; camT = { ...cam };
    setupShot(); emit("hud");
  }

  /* ---------- aiming ---------- */
  function startAim(x, y) { if (phase !== "aim" || paused) return; aiming = { x, y }; hold = 0; Sound.sfx("draw"); }
  function moveAim(x, y) {
    if (!aiming) return;
    const dx = aiming.x - x, dy = aiming.y - y, len = Math.hypot(dx, dy);
    aimPow = Math.min(1, len / PH.pullMax);
    if (len > 8) aimAngle = Math.max(-1.35, Math.min(0.45, Math.atan2(dy, dx)));
    Sound.sfx("drawing", aimPow);
  }
  function release() {
    if (!aiming) return; aiming = null;
    if (aimPow < 0.15) { aimPow = 0; Sound.sfx("cancel"); return; }
    const a = swayed(), v = aimPow * bow.speed;
    arrow = { x: AX + 14, y: AY, vx: Math.cos(a) * v, vy: Math.sin(a) * v, trail: [], whistle: false };
    Sound.sfx("release", aimPow); aimPow = 0; phase = "flight"; phaseT = 0; arrowsLeft--; emit("hud");
  }
  function swayed() {
    const s = bow.sway * (1 + Math.max(0, hold - 2.5) * 0.9);   // arms tire after 2.5 s
    return aimAngle + (Math.sin(clock * 1.4) * 0.009 + Math.sin(clock * 3.1 + 1) * 0.004) * s;
  }

  /* ---------- flight ---------- */
  function score(ring, kind) {
    points += ring; shots.push(ring);
    if (ring >= 10) { streak++; texts.push({ x: target.x, y: target.y - R - 30, s: streak > 1 ? `BULLSEYE ×${streak}` : "BULLSEYE", t: 0, big: true }); }
    else { streak = 0; texts.push({ x: target.x, y: target.y - R - 24, s: String(ring), t: 0 }); }
    emit("hud");
  }
  function land(kind, ring) {
    phase = "result"; phaseT = 0;
    if (kind === "hit") { score(ring); Sound.sfx("thunk", ring); for (let i = 0; i < 12; i++) parts.push({ x: arrow.x, y: arrow.y, vx: -Math.random() * 160, vy: (Math.random() - 0.5) * 160, t: 0, c: ring >= 9 ? "#e2c27a" : "#c9b59a" }); }
    else { shots.push(0); streak = 0; Sound.sfx("miss"); texts.push({ x: arrow.x, y: arrow.y - 30, s: "miss", t: 0 }); emit("hud"); }
    stuck.push({ x: arrow.x, y: arrow.y, a: Math.atan2(arrow.vy, arrow.vx), onTarget: kind === "hit", dy: arrow.y - target.y, wob: 1 });
    if (mode === "trial") { if (kind === "hit") { trialHits++; arrowsLeft = 1; } }
    arrow = null;
  }
  function stepFlight(dt) {
    const a = arrow, px = a.x, py = a.y;
    a.vy += PH.gravity * dt; a.vx += wind * PH.windForce * dt; a.x += a.vx * dt; a.y += a.vy * dt;
    a.trail.push(a.x, a.y); if (a.trail.length > 40) a.trail.splice(0, 2);
    for (const b of balloons) if (!b.pop && Math.hypot(a.x - b.x, a.y - b.y) < b.r + 3) { b.pop = 0.01; points += CF.balloonPoints; Sound.sfx("balloon"); texts.push({ x: b.x, y: b.y - 20, s: "+" + CF.balloonPoints, t: 0 }); for (let i = 0; i < 10; i++) parts.push({ x: b.x, y: b.y, vx: (Math.random() - 0.5) * 300, vy: (Math.random() - 0.5) * 300, t: 0, c: b.c }); emit("hud"); }
    if (px < target.x && a.x >= target.x) {
      const f = (target.x - px) / (a.x - px), yAt = py + (a.y - py) * f, dy = Math.abs(yAt - target.y);
      if (dy <= R) { a.x = target.x; a.y = yAt; land("hit", Math.max(1, 10 - Math.floor(dy / R * 10))); return; }
    }
    if (a.y >= GROUND) { a.y = GROUND; land("miss"); return; }
    if (a.x > target.x + 600 || a.y < GROUND - 1800) land("miss");
  }

  /* ---------- update ---------- */
  function update(dtReal) {
    clock += dtReal;
    if (paused || phase === "idle") return;
    phaseT += dtReal;
    if (aiming) hold += dtReal;
    tclock += dtReal * (phase === "flight" ? tscale : 1);   // the target slows down with the slow-motion too
    target.y = target.base + (target.amp ? Math.sin(tclock * 1.1 + target.ph) * target.amp : 0);
    stuck.forEach(s => { if (s.onTarget) s.y = target.y + s.dy; s.wob = Math.max(0, s.wob - dtReal * 2.5); });
    balloons.forEach(b => { b.y += Math.sin(clock * 0.8 + b.ph) * 0.15; if (b.pop) b.pop += dtReal; }); balloons = balloons.filter(b => !b.pop || b.pop < 0.25);
    // camera targets per phase
    const aimCam = { x: AX - 110, y: GROUND - H * 0.78, z: 1 };
    if (phase === "preview") {
      const tgt = { x: target.x - W * 0.6, y: GROUND - H * 0.7, z: 1.1 };
      Object.assign(camT, phaseT < 1.3 ? tgt : aimCam);
      if (phaseT > 1.9) phase = "aim";
    } else if (phase === "aim") Object.assign(camT, aimCam);
    else if (phase === "flight" && arrow) {
      const near = target.x - arrow.x < 160 && arrow.x < target.x + 20;
      tscale += ((near ? PH.slowmoNear : 1) - tscale) * Math.min(1, dtReal * 8);
      camT.z = near ? 1.6 : 0.9; camT.x = arrow.x - W / camT.z * 0.55; camT.y = Math.min(GROUND - H / camT.z * 0.8, arrow.y - H / camT.z * 0.5);
      if (!arrow.whistle && phaseT > 0.1) { arrow.whistle = true; Sound.sfx("whistle"); }
      const dt = dtReal * tscale, sub = 4; for (let i = 0; i < sub && arrow; i++) stepFlight(dt / sub);
    } else if (phase === "result") {
      tscale = 1;
      const last = stuck[stuck.length - 1];
      Object.assign(camT, { x: last.x - W / 1.8 * 0.5, y: Math.min(GROUND - H / 1.8 * 0.75, last.y - H / 1.8 * 0.5), z: 1.8 });
      if (phaseT > 1.4) {
        if (arrowsLeft > 0) setupShot();
        else { phase = "done"; finish(); }
      }
    }
    const e = Math.min(1, dtReal * (phase === "flight" ? 10 : 3.2));
    cam.x += (camT.x - cam.x) * e; cam.y += (camT.y - cam.y) * e; cam.z += (camT.z - cam.z) * e;
    parts.forEach(p => { p.t += dtReal; p.x += p.vx * dtReal; p.y += p.vy * dtReal; p.vy += 300 * dtReal; }); parts = parts.filter(p => p.t < 0.9);
    texts.forEach(t => { t.t += dtReal; }); texts = texts.filter(t => t.t < 1.6);
    leaves.forEach(l => { l.y += l.v * dtReal; l.x += (wind * 6 + Math.sin(clock + l.s) * 10) * dtReal; l.s += dtReal; if (l.y > GROUND) { l.y = GROUND - 700; l.x = cam.x + Math.random() * 800; } });
  }
  function finish() {
    if (mode === "trial") { emit("trialOver", { hits: trialHits, points }); return; }
    const pass = Math.round(curve("pass", stage)), ok = points >= pass;
    const stars = !ok ? 0 : points >= 46 ? 3 : points >= pass + 6 ? 2 : 1;
    Sound.sfx(ok ? "stageWin" : "stageLose");
    emit("stageOver", { stage, points, pass, ok, stars, shots: shots.slice() });
  }

  /* ---------- drawing ---------- */
  const S = (x, y) => [(x - cam.x) * cam.z, (y - cam.y) * cam.z];
  function drawWorld() {
    const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, season.sky[0]); sky.addColorStop(1, season.sky[1]);
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    g.fillStyle = "rgba(255,250,240,.9)"; g.beginPath(); g.arc(W * 0.72 - cam.x * 0.03, H * 0.2, 34, 0, 7); g.fill();
    // ridges with parallax (scaled with zoom too, gently)
    ridges.forEach((rd, i) => {
      const z = 1 + (cam.z - 1) * rd.par, ox = cam.x * rd.par, oy = (cam.y - (GROUND - H * 0.78)) * rd.par;
      g.fillStyle = rd.col; g.beginPath(); g.moveTo(-10, H);
      rd.pts.forEach(([x, y]) => g.lineTo((x - ox) * z * 0.5 + 0, (y - oy - (GROUND - H * 0.78)) * z));
      g.lineTo(W + 10, H); g.fill();
      if (rd.trees.length) { g.fillStyle = rd.col; const dark = i === 3 ? "rgba(0,0,0,.12)" : "rgba(0,0,0,.07)"; rd.trees.forEach(([x, r]) => { const sx = (x - ox) * z * 0.5, base = (rd.pts[Math.max(0, Math.min(rd.pts.length - 1, Math.round((x + 400) / (40 + i * 10))))][1] - oy - (GROUND - H * 0.78)) * z; if (sx < -20 || sx > W + 20) return; const h = (18 + r * 22) * z; g.fillStyle = dark; g.beginPath(); g.moveTo(sx, base - h); g.lineTo(sx + h * 0.28, base + 4); g.lineTo(sx - h * 0.28, base + 4); g.fill(); }); }
      const my = (330 + i * 60 - oy - (GROUND - H * 0.78)) * z, mg = g.createLinearGradient(0, my - 30 * z, 0, my + 30 * z);
      mg.addColorStop(0, "rgba(255,255,255,0)"); mg.addColorStop(0.5, season.mist); mg.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = mg; g.fillRect(0, my - 30 * z, W, 60 * z);
    });
    // ground
    const [, gy] = S(0, GROUND);
    g.fillStyle = season.ground; g.fillRect(0, gy, W, H - gy + 10);
    g.strokeStyle = "rgba(0,0,0,.08)"; g.lineWidth = 1;
    for (let x = Math.floor(cam.x / 22) * 22; x < cam.x + W / cam.z + 22; x += 22) { const [sx, sy] = S(x, GROUND); g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + 3 * cam.z, sy - 7 * cam.z); g.stroke(); }
    // distance marks every 10 m
    g.fillStyle = "rgba(255,255,255,.7)"; g.font = `${10 * cam.z}px 'Avenir Next','Helvetica Neue',sans-serif`; g.textAlign = "center";
    for (let m = 10; m < 120; m += 10) { const [sx, sy] = S(AX + m * 10, GROUND); if (sx > -20 && sx < W + 20) { g.fillRect(sx - 0.5, sy, 1, 6 * cam.z); g.fillText(m + " m", sx, sy + 18 * cam.z); } }
  }
  function drawTarget() {
    const [sx, sy] = S(target.x, target.y), r = R * cam.z, [, gy] = S(0, GROUND);
    g.strokeStyle = "#8a6a4a"; g.lineWidth = 4 * cam.z; g.lineCap = "round";
    g.beginPath(); g.moveTo(sx - r * 0.5, gy); g.lineTo(sx, sy); g.lineTo(sx + r * 0.5, gy); g.moveTo(sx + r * 0.15, sy); g.lineTo(sx + r * 0.8, gy); g.stroke();
    const rings = ["#f4f1ea", "#f4f1ea", "#3f4448", "#3f4448", "#7fa3bf", "#7fa3bf", "#d1786a", "#d1786a", "#e2c27a", "#e2c27a"];
    for (let i = 0; i < 10; i++) { g.fillStyle = rings[i]; g.beginPath(); g.arc(sx, sy, r * (1 - i / 10), 0, 7); g.fill(); if (i % 2 === 1) { g.strokeStyle = "rgba(0,0,0,.12)"; g.lineWidth = 1; g.stroke(); } }
    g.fillStyle = "rgba(0,0,0,.25)"; g.beginPath(); g.arc(sx, sy, 1.5 * cam.z, 0, 7); g.fill();
  }
  function drawArrowAt(x, y, a, len = 34, wob = 0) {
    const [sx, sy] = S(x, y); g.save(); g.translate(sx, sy); g.rotate(a + Math.sin(clock * 50) * wob * 0.08); g.scale(cam.z, cam.z);
    g.strokeStyle = "#5a4636"; g.lineWidth = 2; g.beginPath(); g.moveTo(-len, 0); g.lineTo(0, 0); g.stroke();
    g.fillStyle = "#4a4f54"; g.beginPath(); g.moveTo(3, 0); g.lineTo(-4, -2.5); g.lineTo(-4, 2.5); g.fill();
    g.fillStyle = "#d1786a"; g.beginPath(); g.moveTo(-len, 0); g.lineTo(-len - 6, -5); g.lineTo(-len + 4, 0); g.lineTo(-len - 6, 5); g.fill();
    g.restore();
  }
  function drawArcher() {
    const [sx, sy] = S(AX, AY), z = cam.z, a = aiming ? swayed() : aimAngle, pull = aiming ? aimPow : 0;
    g.save(); g.translate(sx, sy); g.scale(z, z);
    g.strokeStyle = "#3f4448"; g.lineWidth = 3; g.lineCap = "round";
    g.beginPath(); g.moveTo(-6, 4); g.lineTo(-10, 62); g.moveTo(-6, 4); g.lineTo(4, 62); g.stroke();      // legs
    g.beginPath(); g.moveTo(-6, 4); g.lineTo(-6, -30); g.stroke();                                            // body
    g.fillStyle = "#e8d9c6"; g.beginPath(); g.arc(-6, -40, 8, 0, 7); g.fill();                               // head
    g.fillStyle = "#7fa89a"; g.fillRect(-11, -33, 11, 5);                                                     // scarf
    g.save(); g.translate(-4, -22); g.rotate(a);
    const bx = 18, pullX = -pull * 22;
    g.strokeStyle = bow.color; g.lineWidth = 3.5; g.beginPath(); g.arc(bx - 24, 0, 30, -0.95, 0.95); g.stroke();           // bow limb
    g.strokeStyle = "rgba(60,60,60,.7)"; g.lineWidth = 1; g.beginPath(); g.moveTo(bx - 24 + Math.cos(-0.95) * 30, Math.sin(-0.95) * 30); g.lineTo(pullX, 0); g.lineTo(bx - 24 + Math.cos(0.95) * 30, Math.sin(0.95) * 30); g.stroke();
    g.strokeStyle = "#3f4448"; g.lineWidth = 3; g.beginPath(); g.moveTo(-2, 0); g.lineTo(bx, 0); g.moveTo(-2, 0); g.lineTo(pullX, 0); g.stroke(); // arms
    if (phase === "aim") { g.strokeStyle = "#5a4636"; g.lineWidth = 2; g.beginPath(); g.moveTo(pullX, 0); g.lineTo(pullX + 36, 0); g.stroke(); g.fillStyle = "#4a4f54"; g.beginPath(); g.moveTo(pullX + 39, 0); g.lineTo(pullX + 33, -2.5); g.lineTo(pullX + 33, 2.5); g.fill(); }
    g.restore(); g.restore();
  }
  function drawGuide() {
    if (!aiming || aimPow < 0.15) return;
    const a = swayed(), v = aimPow * bow.speed; let x = AX + 14, y = AY, vx = Math.cos(a) * v, vy = Math.sin(a) * v;
    const steps = Math.round(60 * bow.guide); g.fillStyle = "rgba(63,68,72,.55)";
    for (let i = 0; i < steps; i++) { for (let j = 0; j < 3; j++) { vy += PH.gravity / 180; x += vx / 180; y += vy / 180; } if (i % 2) continue; const [sx, sy] = S(x, y); g.globalAlpha = 1 - i / steps; g.beginPath(); g.arc(sx, sy, 2.2 * cam.z, 0, 7); g.fill(); }
    g.globalAlpha = 1;
  }
  function render() {
    g.setTransform(k * dpr, 0, 0, k * dpr, 0, 0);
    drawWorld();
    if (phase === "idle") return;
    balloons.forEach(b => { const [sx, sy] = S(b.x, b.y), r = b.r * cam.z * (1 + (b.pop || 0) * 3); g.globalAlpha = b.pop ? 1 - b.pop * 4 : 1; g.strokeStyle = "rgba(63,68,72,.4)"; g.lineWidth = 1; g.beginPath(); g.moveTo(sx, sy + r); g.quadraticCurveTo(sx + 6, sy + r + 20 * cam.z, sx, sy + r + 36 * cam.z); g.stroke(); g.fillStyle = b.c; g.beginPath(); g.ellipse(sx, sy, r * 0.86, r, 0, 0, 7); g.fill(); g.fillStyle = "rgba(255,255,255,.5)"; g.beginPath(); g.arc(sx - r * 0.3, sy - r * 0.35, r * 0.2, 0, 7); g.fill(); g.globalAlpha = 1; });
    drawTarget();
    stuck.forEach(s => drawArrowAt(s.x, s.y, s.a, 34, s.wob));
    drawArcher(); drawGuide();
    if (arrow) {
      g.strokeStyle = "rgba(255,255,255,.65)"; g.lineWidth = 1.5; g.beginPath();
      for (let i = 0; i < arrow.trail.length; i += 2) { const [sx, sy] = S(arrow.trail[i], arrow.trail[i + 1]); i ? g.lineTo(sx, sy) : g.moveTo(sx, sy); } g.stroke();
      drawArrowAt(arrow.x, arrow.y, Math.atan2(arrow.vy, arrow.vx));
    }
    parts.forEach(p => { const [sx, sy] = S(p.x, p.y); g.globalAlpha = 1 - p.t / 0.9; g.fillStyle = p.c; g.fillRect(sx, sy, 3 * cam.z, 2 * cam.z); }); g.globalAlpha = 1;
    // leaves / snow
    g.fillStyle = season.name.startsWith("Winter") ? "rgba(255,255,255,.85)" : season.name.startsWith("Autumn") ? "rgba(196,120,70,.6)" : "rgba(120,150,110,.5)";
    leaves.forEach(l => { const [sx, sy] = S(l.x, l.y); if (sx < -5 || sx > W + 5) return; g.save(); g.translate(sx, sy); g.rotate(l.s); g.fillRect(-2, -1, 4, 2); g.restore(); });
    g.textAlign = "center";
    texts.forEach(t => { const [sx, sy] = S(t.x, t.y - t.t * 20); g.globalAlpha = Math.min(1, (1.6 - t.t) * 2); g.font = t.big ? "300 30px 'Avenir Next','Helvetica Neue',sans-serif" : "300 26px 'Avenir Next','Helvetica Neue',sans-serif"; g.fillStyle = t.big ? "#b8924a" : "#3f4448"; g.fillText(t.s, sx, sy); }); g.globalAlpha = 1;
    if (tscale < 0.8) { g.fillStyle = `rgba(255,255,255,${(1 - tscale) * 0.12})`; g.fillRect(0, 0, W, H); }
  }

  /* ---------- input ---------- */
  const toLocal = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; };
  cv.addEventListener("pointerdown", e => startAim(...toLocal(e)));
  addEventListener("pointermove", e => moveAim(...toLocal(e)));
  addEventListener("pointerup", release);
  addEventListener("keydown", e => { if (e.key === "Escape" || e.key === "p") emit("pauseKey"); });

  function fit() { const vw = innerWidth, vh = innerHeight; H = Math.max(620, Math.min(900, W * vh / vw)); k = Math.min(vw / W, vh / H); dpr = Math.min(2, devicePixelRatio || 1); cv.width = Math.round(W * k * dpr); cv.height = Math.round(H * k * dpr); cv.style.width = W * k + "px"; cv.style.height = H * k + "px"; }
  addEventListener("resize", fit); fit();
  let last = 0;
  (function loop(ts) { const dt = Math.min(0.033, (ts - last) / 1000 || 0.016); last = ts; update(dt); render(); requestAnimationFrame(loop); })(0);

  // a scenic, empty range behind the menus
  season = CF.seasons[0]; buildRidges(); cam = { x: AX - 110, y: GROUND - H * 0.78, z: 1 };

  return {
    on: (n, f) => hooks[n] = f, begin, update, render, curve,
    // testing hook: aim and shoot in one call (angle in radians, power 0–1)
    shoot(angle, power) { if (phase !== "aim") return false; aimAngle = angle; aiming = { x: 0, y: 0 }; aimPow = power; hold = 0; release(); return true; },
    pause() { paused = true; }, resume() { paused = false; },
    extraArrows(n) { arrowsLeft += n; phase = "result"; phaseT = 1.3; emit("hud"); },
    quit() { phase = "idle"; arrow = null; stuck = []; balloons = []; },
    get phase() { return phase; }, get points() { return points; }, get arrowsLeft() { return arrowsLeft; }, get shots() { return shots; }, get wind() { return wind; },
    get dist() { return dist; }, get target() { return target; }, get R() { return R; }, get stage() { return stage; }, get mode() { return mode; }, get trialHits() { return trialHits; }, get streak() { return streak; }
  };
})();

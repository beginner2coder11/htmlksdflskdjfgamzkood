/* ==========================================================================
   BUG BARRICADE — tower defense engine + sketchbook renderer.
   Grid placement, path walking, 5 tower behaviours (bullet, slam, slow, beam,
   tongue), armour, flying bugs, splitting caterpillars, a boss, and "boiling"
   pencil lines that redraw with fresh wobble 8 times a second.
   ========================================================================== */
window.Game = (() => {
  const CF = window.GAME_CONFIG, T = CF.towers, B = CF.bugs;
  const COLS = 10, ROWS = 14, CELL = 40, W = COLS * CELL, H = ROWS * CELL;
  const cv = document.getElementById("field"), g = cv.getContext("2d");
  let zoom = 1, dpr = 1;
  const hooks = {}, emit = (n, d) => hooks[n] && hooks[n](d);

  let map = CF.maps[0], mapIdx = 0, pts = [], segLen = [], total = 0, pathCells = new Set();
  let towers = [], bugs = [], shots = [], fx = [], splats = [];
  let coins = 0, lives = 0, wave = 0, queue = [], spawnT = 0, state = "idle", speed = 1, paused = false, sel = null, clock = 0, boil = 0;

  /* ---------- path ---------- */
  function setMap(i) {
    mapIdx = i; map = CF.maps[i];
    pts = map.path.map(([c, r]) => [c * CELL + CELL / 2, r * CELL + CELL / 2]);
    segLen = []; total = 0;
    for (let k = 0; k < pts.length - 1; k++) { const l = Math.hypot(pts[k + 1][0] - pts[k][0], pts[k + 1][1] - pts[k][1]); segLen.push(l); total += l; }
    pathCells = new Set();
    for (let k = 0; k < map.path.length - 1; k++) {
      let [c, r] = map.path[k]; const [c2, r2] = map.path[k + 1];
      const dc = Math.sign(c2 - c), dr = Math.sign(r2 - r);
      while (true) { pathCells.add(c + "," + r); if (c === c2 && r === r2) break; c += dc; r += dr; }
    }
  }
  function posAt(d) {
    let k = 0; while (k < segLen.length - 1 && d > segLen[k]) { d -= segLen[k]; k++; }
    const f = Math.min(1, d / segLen[k]), [x1, y1] = pts[k], [x2, y2] = pts[k + 1];
    return [x1 + (x2 - x1) * f, y1 + (y2 - y1) * f, Math.atan2(y2 - y1, x2 - x1)];
  }
  const buildable = (c, r) => c >= 0 && r >= 0 && c < COLS && r < ROWS && !pathCells.has(c + "," + r) && !towers.some(t => t.c === c && t.r === r);

  /* ---------- waves ---------- */
  function waveList(w) {
    const list = [], n = Math.round(6 + w * 1.3);
    const pool = ["ant"]; if (w >= 2) pool.push("lady"); if (w >= 4) pool.push("bee"); if (w >= 5) pool.push("beetle"); if (w >= 7) pool.push("cater");
    // themed waves keep it readable: every 3rd wave is a swarm of one type
    const theme = w % 3 === 0 ? pool[Math.floor(w / 3) % pool.length] : null;
    for (let i = 0; i < n; i++) list.push({ type: theme || pool[Math.floor(Math.random() * pool.length)], gap: theme === "ant" ? 0.35 : 0.7 });
    if (w % 10 === 0 || w === CF.wavesPerMap) list.push({ type: "queen", gap: 1.5 });
    return list;
  }
  const hpScale = w => (1 + CF.hpGrowth * (w - 1)) * (1 + mapIdx * 0.2);
  function sendWave() {
    if (state === "over" || state === "won" || wave >= CF.wavesPerMap) return false;
    if (queue.length) return false;
    const early = bugs.length > 0;
    wave++; queue = waveList(wave); spawnT = 0; state = "wave";
    if (early) { coins += CF.earlyCallBonus; emit("float", { text: "+" + CF.earlyCallBonus + " early!" }); }
    if (queue.some(q => q.type === "queen")) { Sound.sfx("boss"); emit("banner", "The Queen Ant is coming!"); } else Sound.sfx("wave");
    emit("hud"); return true;
  }
  function spawn(type, d = 0) {
    const s = B[type], hp = s.hp * hpScale(wave);
    bugs.push({ type, s, hp, max: hp, d, slow: 1, slowT: 0, heat: 0, wob: Math.random() * 6, hit: 0 });
  }

  /* ---------- towers ---------- */
  function build(type, c, r) {
    const cost = T[type].cost[0];
    if (coins < cost || !buildable(c, r)) { Sound.sfx("no"); return false; }
    coins -= cost; towers.push({ type, lvl: 0, c, r, x: c * CELL + CELL / 2, y: r * CELL + CELL / 2, cd: 0, spent: cost, target: null, ang: 0, anim: 0 });
    Sound.sfx("build"); ink(c * CELL + CELL / 2, r * CELL + CELL / 2, T[type].color, 10); emit("hud"); return true;
  }
  function upgrade(t) {
    if (t.lvl >= 2) return false; const cost = T[t.type].cost[t.lvl + 1];
    if (coins < cost) { Sound.sfx("no"); return false; }
    coins -= cost; t.spent += cost; t.lvl++; t.anim = 1; Sound.sfx("upgrade"); ink(t.x, t.y, "#ffd84a", 12); emit("hud"); return true;
  }
  function sell(t) { coins += Math.floor(t.spent * CF.sellBack); towers = towers.filter(x => x !== t); sel = null; Sound.sfx("sell"); emit("hud"); }
  const stat = (t, k) => T[t.type][k][t.lvl];
  function inRange(t, b) { const [x, y] = posAt(b.d); return Math.hypot(x - t.x, y - t.y) <= stat(t, "range"); }
  const canHit = (t, b) => T[t.type].targets === "all" || !b.s.flying;
  function pickTarget(t) { let best = null; for (const b of bugs) if (canHit(t, b) && inRange(t, b) && (!best || b.d > best.d)) best = b; return best; }
  function hurt(b, dmg, pierce = 0) {
    const real = Math.max(0.3, dmg - b.s.armor * (1 - pierce)); b.hp -= real; b.hit = 0.12;
    if (b.hp <= 0 && !b.dead) {
      b.dead = true; coins += b.s.coins; Sound.sfx("squish");
      const [x, y] = posAt(b.d); splats.push({ x, y, r: b.s.size * 1.2, t: 0, color: b.type === "lady" ? "#d8352a" : b.type === "bee" ? "#f2c230" : "#5a4a3a" });
      fx.push({ kind: "coin", x, y, t: 0, text: "+" + b.s.coins });
      if (b.s.splits) for (let i = 0; i < 2; i++) spawn(b.s.splits, b.d - 6 - i * 10);
      emit("hud");
    }
  }
  function towerStep(t, dt) {
    t.cd -= dt; t.anim = Math.max(0, t.anim - dt * 3);
    const k = T[t.type].kind;
    if (k === "slow") {
      for (const b of bugs) if (!b.s.flying && inRange(t, b)) { b.slow = Math.min(b.slow, 1 - stat(t, "slow")); b.slowT = 0.2; if (t.cd <= 0) hurt(b, stat(t, "dmg")); }
      if (t.cd <= 0) t.cd = stat(t, "rate");
      return;
    }
    if (k === "beam") {
      const tg = t.target && !t.target.dead && inRange(t, t.target) ? t.target : pickTarget(t);
      if (tg !== t.target) { t.target = tg; t.heat = 0; }
      if (!tg) return;
      t.heat = Math.min(2.5, t.heat + dt); const [x, y] = posAt(tg.d); t.ang = Math.atan2(y - t.y, x - t.x);
      if (t.cd <= 0) { hurt(tg, stat(t, "dmg") * (1 + t.heat * 0.8), 0.75); t.cd = stat(t, "rate"); if (Math.random() < 0.3) Sound.sfx("sizzle"); }
      return;
    }
    if (t.cd > 0) return;
    if (k === "slam") {
      const hits = bugs.filter(b => !b.s.flying && inRange(t, b)); if (!hits.length) return;
      hits.forEach(b => hurt(b, stat(t, "dmg"))); t.cd = stat(t, "rate"); t.anim = 1;
      Sound.sfx("slap"); fx.push({ kind: "smack", x: t.x, y: t.y, t: 0, r: stat(t, "range") });
      return;
    }
    const tg = pickTarget(t); if (!tg) return;
    const [x, y] = posAt(tg.d); t.ang = Math.atan2(y - t.y, x - t.x); t.cd = stat(t, "rate");
    if (k === "bullet") { shots.push({ x: t.x + Math.cos(t.ang) * 14, y: t.y + Math.sin(t.ang) * 14, tg, dmg: stat(t, "dmg"), sp: 430 }); Sound.sfx("squirt"); }
    if (k === "tongue") { fx.push({ kind: "tongue", x: t.x, y: t.y, tx: x, ty: y, t: 0 }); hurt(tg, stat(t, "dmg"), 0.5); Sound.sfx("thwip"); t.anim = 1; }
  }

  /* ---------- update ---------- */
  function update(dt) {
    clock += dt; boil += dt;
    if (paused || state === "idle") return;
    if (state === "over" || state === "won") { fx.forEach(f => f.t += dt); return; }
    for (let i = 0; i < speed; i++) tick(dt);
  }
  function tick(dt) {
    if (queue.length) { spawnT -= dt; if (spawnT <= 0) { const q = queue.shift(); spawn(q.type); spawnT = q.gap; } }
    for (const b of bugs) {
      if (b.slowT > 0) b.slowT -= dt; else b.slow = 1;
      b.d += b.s.speed * b.slow * dt; b.wob += dt * 10 * b.slow; b.hit = Math.max(0, b.hit - dt);
      if (b.d >= total) { b.dead = true; b.leaked = true; lives -= b.s.lives || 1; Sound.sfx("leak"); emit("leak"); emit("hud"); }
    }
    bugs = bugs.filter(b => !b.dead);
    towers.forEach(t => towerStep(t, dt));
    for (const s of shots) {
      if (s.tg.dead) { s.dead = true; continue; }
      const [x, y] = posAt(s.tg.d), dx = x - s.x, dy = y - s.y, d = Math.hypot(dx, dy);
      if (d < 8) { hurt(s.tg, s.dmg); s.dead = true; fx.push({ kind: "drop", x, y, t: 0 }); continue; }
      s.x += dx / d * s.sp * dt; s.y += dy / d * s.sp * dt;
    }
    shots = shots.filter(s => !s.dead);
    fx.forEach(f => f.t += dt); fx = fx.filter(f => f.t < 0.8);
    splats.forEach(s => s.t += dt); splats = splats.filter(s => s.t < 6);
    if (lives <= 0 && state !== "over") { lives = 0; state = "over"; Sound.sfx("lose"); emit("lost", { wave, map: mapIdx }); return; }
    if (state === "wave" && !queue.length && !bugs.length) {
      if (wave >= CF.wavesPerMap) { state = "won"; Sound.sfx("win"); const st = lives >= CF.start.lives * 0.9 ? 3 : lives >= CF.start.lives * 0.5 ? 2 : 1; emit("won", { map: mapIdx, stars: st, lives }); }
      else { state = "build"; coins += 8 + wave; emit("float", { text: `Wave ${wave} cleared! +${8 + wave}` }); emit("hud"); }
    }
  }

  /* ---------- sketch drawing ---------- */
  const hash = (a, b) => { let h = (a * 374761393 + b * 668265263 + Math.floor(boil * 8) * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296 - 0.5; };
  function pencil(x1, y1, x2, y2, w = 1.6, color = "#2d2a26", j = 1.6) {
    g.strokeStyle = color; g.lineWidth = w; g.lineCap = "round";
    for (let p = 0; p < 2; p++) {
      const mx = (x1 + x2) / 2 + hash(x1 + p, y2) * j * 2, my = (y1 + y2) / 2 + hash(y1 + p, x2) * j * 2;
      g.beginPath(); g.moveTo(x1 + hash(x1, y1 + p) * j, y1 + hash(y1, x1 + p) * j); g.quadraticCurveTo(mx, my, x2 + hash(x2, y2 + p) * j, y2 + hash(y2, x2 + p) * j); g.stroke();
      g.globalAlpha = 0.5;
    }
    g.globalAlpha = 1;
  }
  function scribbleCircle(x, y, r, color = "#2d2a26", w = 1.6) {
    g.strokeStyle = color; g.lineWidth = w; g.beginPath();
    for (let i = 0; i <= 22; i++) { const a = i / 20 * Math.PI * 2, rr = r + hash(x + i, y) * 2.2; i ? g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    g.stroke();
  }
  function marker(x, y, r, color, alpha = 0.85) {
    g.fillStyle = color; g.globalAlpha = alpha; g.beginPath();
    for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2, rr = r + hash(i, x + y) * 2; i ? g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    g.fill(); g.globalAlpha = 1;
  }
  function drawPaper() {
    g.fillStyle = map.paper; g.fillRect(0, 0, W, H);
    g.strokeStyle = "rgba(80,140,210,.16)"; g.lineWidth = 1;
    for (let x = 0; x <= W; x += CELL / 2) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
    for (let y = 0; y <= H; y += CELL / 2) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    g.strokeStyle = "rgba(220,80,80,.35)"; g.beginPath(); g.moveTo(18, 0); g.lineTo(18, H); g.stroke();
  }
  function drawPath() {
    // dirt trail: wide marker band, then two pencil edges
    g.lineJoin = "round"; g.lineCap = "round";
    g.strokeStyle = "rgba(196,160,110,.55)"; g.lineWidth = CELL * 0.86; g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke();
    for (let k = 0; k < pts.length - 1; k++) {
      const [x1, y1] = pts[k], [x2, y2] = pts[k + 1], nx = -(y2 - y1) / segLen[k], ny = (x2 - x1) / segLen[k], o = CELL * 0.43;
      pencil(x1 + nx * o, y1 + ny * o, x2 + nx * o, y2 + ny * o, 1.4, "#6b5236");
      pencil(x1 - nx * o, y1 - ny * o, x2 - nx * o, y2 - ny * o, 1.4, "#6b5236");
    }
    // footprints dots
    g.fillStyle = "rgba(107,82,54,.35)";
    for (let d = 10; d < total; d += 26) { const [x, y, a] = posAt(d); g.beginPath(); g.arc(x + Math.cos(a + 1.57) * 6, y + Math.sin(a + 1.57) * 6, 1.6, 0, 7); g.fill(); }
    const [ex, ey] = pts[pts.length - 1], [lx, ly] = pts[pts.length - 2];
    const bx = Math.max(24, Math.min(W - 24, ex - Math.sign(ex - lx) * 20)), by = Math.max(24, Math.min(H - 24, ey - Math.sign(ey - ly) * 20));
    g.font = "34px system-ui"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("🧺", bx, by);
  }
  function drawBug(b) {
    const [x, y, a] = posAt(b.d), s = b.s.size, leg = Math.sin(b.wob) * 3;
    g.save(); g.translate(x, y); g.rotate(a);
    if (b.s.flying) g.translate(0, Math.sin(clock * 12 + b.wob) * 3 - 6);
    const ink = b.hit ? "#ff3b30" : "#2d2a26";
    const legs = (n, len) => { for (let i = 0; i < n; i++) { const lx = (i - (n - 1) / 2) * s * 0.5, sw = (i % 2 ? leg : -leg); pencil(lx, 0, lx + sw, -len, 1.2, ink, 0.6); pencil(lx, 0, lx - sw, len, 1.2, ink, 0.6); } };
    if (b.type === "ant" || b.type === "queen") {
      legs(3, s * 0.9);
      marker(-s * 0.7, 0, s * 0.45, "#3b2f2a"); marker(0, 0, s * 0.35, "#3b2f2a"); marker(s * 0.6, 0, s * 0.38, "#3b2f2a");
      pencil(s * 0.8, -2, s * 1.2, -s * 0.5, 1, ink, 0.5); pencil(s * 0.8, 2, s * 1.2, s * 0.5, 1, ink, 0.5);
      if (b.type === "queen") { g.rotate(-a); g.font = `${s}px system-ui`; g.fillText("👑", 0, -s * 0.9); g.rotate(a); }
    } else if (b.type === "lady") {
      legs(3, s * 0.8); marker(0, 0, s * 0.8, "#e0392b"); marker(s * 0.7, 0, s * 0.32, "#2d2a26");
      g.fillStyle = "#2d2a26"; [[-3, -4], [-4, 4], [3, -3], [2, 5]].forEach(([dx, dy]) => { g.beginPath(); g.arc(dx * s / 10, dy * s / 10, s * 0.14, 0, 7); g.fill(); });
      pencil(-s * 0.8, 0, s * 0.5, 0, 1, ink, 0.4);
    } else if (b.type === "beetle") {
      legs(3, s * 0.85); marker(0, 0, s * 0.82, "#2f5b56"); marker(s * 0.72, 0, s * 0.35, "#1f2f2c");
      pencil(-s * 0.8, 0, s * 0.4, 0, 1.2, "#cfe8e2", 0.4); scribbleCircle(0, 0, s * 0.82, ink, 1.3);
    } else if (b.type === "bee") {
      g.globalAlpha = 0.6; marker(-2, -s * 0.7, s * 0.5 + Math.sin(clock * 40) * 2, "#d8f0ff"); marker(-2, s * 0.7, s * 0.5 - Math.sin(clock * 40) * 2, "#d8f0ff"); g.globalAlpha = 1;
      marker(0, 0, s * 0.7, "#f2c230");
      g.fillStyle = "#2d2a26"; g.fillRect(-s * 0.3, -s * 0.6, s * 0.22, s * 1.2); g.fillRect(s * 0.15, -s * 0.55, s * 0.2, s * 1.1);
      scribbleCircle(0, 0, s * 0.7, ink, 1.2);
    } else if (b.type === "cater") {
      for (let i = 3; i >= 0; i--) marker(-i * s * 0.5, Math.sin(b.wob + i) * 2, s * 0.42, i === 0 ? "#6dbf4b" : "#8fd166");
      g.fillStyle = "#2d2a26"; g.beginPath(); g.arc(s * 0.12, -3, 1.8, 0, 7); g.arc(s * 0.12, 3, 1.8, 0, 7); g.fill();
    }
    g.restore();
    if (b.hp < b.max) {
      const w = Math.max(16, s * 1.6), p = Math.max(0, b.hp / b.max);
      g.fillStyle = "rgba(45,42,38,.25)"; g.fillRect(x - w / 2, y - s - 10, w, 4);
      g.fillStyle = p > 0.5 ? "#3aa655" : p > 0.25 ? "#f2b632" : "#e8553a"; g.fillRect(x - w / 2, y - s - 10, w * p, 4);
    }
    if (b.slow < 1) { g.fillStyle = "rgba(242,182,50,.5)"; g.beginPath(); g.ellipse(x, y + s * 0.6, s * 0.8, 3, 0, 0, 7); g.fill(); }
  }
  function drawTower(t) {
    const d = T[t.type], bump = t.anim * 4;
    if (d.kind === "slow") { g.fillStyle = "rgba(242,182,50,.12)"; g.beginPath(); g.arc(t.x, t.y, stat(t, "range"), 0, 7); g.fill(); }
    marker(t.x, t.y + 3, 16, "rgba(45,42,38,.18)", 1);
    marker(t.x, t.y, 16 + bump, d.color, 0.9);
    scribbleCircle(t.x, t.y, 16 + bump, "#2d2a26", 1.8);
    g.save(); g.translate(t.x, t.y); if (d.kind === "bullet" || d.kind === "beam") g.rotate(t.ang + Math.PI / 2 * 0);
    g.font = "20px system-ui"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(d.icon, 0, 1); g.restore();
    for (let i = 0; i <= t.lvl; i++) { g.fillStyle = "#ffd84a"; g.beginPath(); g.arc(t.x - 8 + i * 8, t.y + 20, 3, 0, 7); g.fill(); g.strokeStyle = "#2d2a26"; g.lineWidth = 1; g.stroke(); }
    if (d.kind === "beam" && t.target && !t.target.dead) {
      const [x, y] = posAt(t.target.d), w = 2 + t.heat * 2;
      g.strokeStyle = `rgba(255,${200 - t.heat * 50},60,.75)`; g.lineWidth = w + 4; g.beginPath(); g.moveTo(t.x, t.y); g.lineTo(x, y); g.stroke();
      g.strokeStyle = "#fff6c8"; g.lineWidth = w; g.beginPath(); g.moveTo(t.x, t.y); g.lineTo(x, y); g.stroke();
      marker(x, y, 4 + t.heat * 2, "rgba(255,140,30,.6)", 1);
    }
  }
  function render() {
    g.setTransform(zoom * dpr, 0, 0, zoom * dpr, 0, 0);
    drawPaper(); if (!pts.length) return;
    splats.forEach(s => { g.globalAlpha = Math.max(0, 0.5 - s.t / 12); marker(s.x, s.y, s.r, s.color, 1); g.globalAlpha = 1; });
    drawPath();
    if (sel && sel.cell) { const [c, r] = sel.cell; g.setLineDash([5, 5]); g.strokeStyle = "#3a8ee6"; g.lineWidth = 2; g.strokeRect(c * CELL + 3, r * CELL + 3, CELL - 6, CELL - 6); g.setLineDash([]); }
    if (sel && sel.tower) { g.fillStyle = "rgba(58,142,230,.1)"; g.beginPath(); g.arc(sel.tower.x, sel.tower.y, stat(sel.tower, "range"), 0, 7); g.fill(); g.setLineDash([6, 6]); scribbleCircle(sel.tower.x, sel.tower.y, stat(sel.tower, "range"), "#3a8ee6", 1.5); g.setLineDash([]); }
    if (sel && sel.preview) { g.fillStyle = "rgba(58,142,230,.1)"; g.beginPath(); g.arc(sel.preview.x, sel.preview.y, sel.preview.r, 0, 7); g.fill(); }
    towers.forEach(drawTower);
    bugs.slice().sort((a, b) => (a.s.flying ? 1 : 0) - (b.s.flying ? 1 : 0)).forEach(drawBug);
    g.fillStyle = "#3a8ee6"; shots.forEach(s => { g.beginPath(); g.ellipse(s.x, s.y, 4, 3, 0, 0, 7); g.fill(); });
    g.textAlign = "center"; g.textBaseline = "middle";
    fx.forEach(f => {
      const a = 1 - f.t / 0.8;
      if (f.kind === "smack") { g.globalAlpha = a; scribbleCircle(f.x, f.y, f.r * (0.6 + f.t), "#e8553a", 3); g.font = "900 16px 'Marker Felt','Chalkboard SE','Comic Sans MS',cursive"; g.fillStyle = "#e8553a"; g.fillText("SMACK!", f.x, f.y - 28 - f.t * 20); g.globalAlpha = 1; }
      if (f.kind === "tongue" && f.t < 0.2) { pencil(f.x, f.y, f.tx, f.ty, 5, "#ff6f91", 0.8); marker(f.tx, f.ty, 5, "#ff6f91", 1); }
      if (f.kind === "drop") { g.globalAlpha = a; for (let i = 0; i < 4; i++) marker(f.x + Math.cos(i * 1.6) * f.t * 30, f.y + Math.sin(i * 1.6) * f.t * 30, 2, "#3a8ee6", 1); g.globalAlpha = 1; }
      if (f.kind === "coin") { g.globalAlpha = a; g.font = "700 13px 'Marker Felt','Chalkboard SE',cursive"; g.fillStyle = "#b8860b"; g.fillText(f.text, f.x, f.y - 14 - f.t * 30); g.globalAlpha = 1; }
      if (f.kind === "ink") { g.globalAlpha = a; for (let i = 0; i < 8; i++) marker(f.x + Math.cos(i * .8) * f.t * f.r * 4, f.y + Math.sin(i * .8) * f.t * f.r * 4, 3, f.color, 1); g.globalAlpha = 1; }
    });
  }
  function ink(x, y, color, r) { fx.push({ kind: "ink", x, y, color, r, t: 0 }); }

  /* ---------- input ---------- */
  cv.addEventListener("pointerdown", e => {
    if (paused || state === "idle" || state === "over" || state === "won") return;
    const b = cv.getBoundingClientRect(), x = (e.clientX - b.left) / b.width * W, y = (e.clientY - b.top) / b.height * H;
    const c = Math.floor(x / CELL), r = Math.floor(y / CELL);
    const t = towers.find(q => q.c === c && q.r === r);
    if (t) { sel = { tower: t }; emit("select", { tower: t, sx: e.clientX, sy: e.clientY }); Sound.sfx("tap"); return; }
    if (buildable(c, r)) { sel = { cell: [c, r] }; emit("select", { cell: [c, r], sx: e.clientX, sy: e.clientY }); Sound.sfx("tap"); return; }
    sel = null; emit("select", null);
  });
  addEventListener("keydown", e => { if (e.key === "Escape" || e.key === "p") emit("pauseKey"); if (e.key === " " && state !== "idle") { e.preventDefault(); sendWave(); } });

  function fit() {
    const top = 64, bottom = 74, vw = innerWidth, vh = Math.max(200, innerHeight - top - bottom);
    zoom = Math.min(vw / W, vh / H); dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = Math.round(W * zoom * dpr); cv.height = Math.round(H * zoom * dpr);
    cv.style.width = W * zoom + "px"; cv.style.height = H * zoom + "px"; cv.style.top = top + (vh - H * zoom) / 2 + "px";
  }
  addEventListener("resize", fit); fit();
  let last = 0;
  (function loop(ts) { const dt = Math.min(0.05, (ts - last) / 1000 || 0.016); last = ts; update(dt); render(); requestAnimationFrame(loop); })(0);

  return {
    on: (n, f) => hooks[n] = f, update, render, build, upgrade, sell, sendWave, waveList,
    start(i) { setMap(i); towers = []; bugs = []; shots = []; fx = []; splats = []; coins = CF.start.coins; lives = CF.start.lives; wave = 0; queue = []; state = "build"; speed = 1; paused = false; sel = null; emit("hud"); },
    setSpeed(s) { speed = s; }, pause() { paused = true; }, resume() { paused = false; },
    deselect() { sel = null; }, previewRange(cell, type) { sel = { cell, preview: { x: cell[0] * CELL + CELL / 2, y: cell[1] * CELL + CELL / 2, r: T[type].range[0] } }; },
    revive() { lives = 5; state = bugs.length || queue.length ? "wave" : "build"; emit("hud"); },
    quit() { state = "idle"; pts = []; towers = []; bugs = []; },
    stat, buildable,
    get coins() { return coins; }, set coins(v) { coins = v; emit("hud"); }, get lives() { return lives; }, get wave() { return wave; }, get state() { return state; },
    get speed() { return speed; }, get towers() { return towers; }, get bugs() { return bugs; }, get waveActive() { return queue.length > 0; }, get map() { return map; }, get mapIdx() { return mapIdx; }
  };
})();

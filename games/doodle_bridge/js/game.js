/* ==========================================================================
   DOODLE BRIDGE — engine
   Physics: Verlet points. A drawn line becomes a chain of points held together
   by distance constraints to its 1st, 2nd, 3rd, 5th, 8th and 13th neighbours,
   so it keeps its drawn shape like a stiff plank but can still bend and tip.
   The kid, boulders and plank points all collide with the level blocks and
   with each other. Fixed 240 Hz substeps keep it stable.
   ========================================================================== */
window.Game = (() => {
  const C = window.GAME_CONFIG, PH = C.physics, TAU = Math.PI * 2;
  const cv = document.getElementById("view"), ctx = cv.getContext("2d");
  const WW = 600, VIEW_Y = 250, VIEW_H = 660, H_STEP = 1 / 240, ITER = 6, R_NODE = PH.thick, OUT = "#2e2a40";
  const OFFS = [1, 2];
  const RIGID = 0.5;   // how strongly each plank is pulled back to its drawn shape every iteration

  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

  /* ---------- screen fit ---------- */
  let W = 1, H = 1, DPR = 1, k = 1, ox = 0, oy = 0, padTop = 92, padBot = 104;
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, innerWidth); H = Math.max(1, innerHeight);
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); cv.style.width = W + "px"; cv.style.height = H + "px";
    const availH = H - padTop - padBot;
    k = Math.min(W / WW, availH / VIEW_H);
    ox = (W - WW * k) / 2; oy = padTop + (availH - VIEW_H * k) / 2 - VIEW_Y * k;
  }
  addEventListener("resize", resize);
  const toWorld = (sx, sy) => ({ x: (sx - ox) / k, y: (sy - oy) / k });

  /* ---------- state ---------- */
  const on = {};
  let L = null, li = 0, theme = C.worlds[0], mode = "edit", demo = false;
  let solids = [], spikes = [], springs = [], zones = [], boulders = [], strokes = [], kid = null, goal = null;
  let inkUsed = 0, drawing = null, ghost = 0, parts = [], acc = 0, time = 0, runT = 0, endT = 0, stuckT = 0, bestX = 0, stuckSent = false;
  let skin = C.skins[0], pen = C.pens[0];

  function topAt(x) { let t = 1e9; for (const r of solids) if (x >= r[0] && x <= r[0] + r[2] && r[1] < t && r[1] > VIEW_Y) t = r[1]; return t; }
  function load(i, opt = {}) {
    li = clamp(i, 0, C.levels.length - 1); L = C.levels[li]; theme = C.worlds[Math.floor(li / 8) % C.worlds.length];
    solids = L.solids.map(r => r.slice());
    spikes = (L.spikes || []).map(([x0, x1, y]) => [x0, y - 14, x1 - x0, 14]);
    springs = (L.springs || []).map(([x, y]) => ({ x, y, r: [x - 22, y - 12, 44, 12], t: 0 }));
    zones = (L.zones || []).map(z => z.slice());
    boulders = (L.boulders || []).map(([x, y, r]) => ({ x, y, px: x, py: y, r, rot: 0 }));
    goal = { x: L.goal, y: topAt(L.goal) };
    const sy = topAt(L.start);
    kid = { x: L.start, y: sy - 16, px: L.start, py: sy - 16, r: 16, gn: null, walkT: 0, mood: "", air: 0, stepAcc: 0, onSpring: null, dead: false };
    if (!opt.keepStrokes) { strokes = []; inkUsed = 0; }
    else strokes = strokes.map(s => makeStroke(s.orig, s.len));
    mode = "edit"; drawing = null; parts = []; ghost = 0; runT = 0; endT = 0; stuckT = 0; bestX = kid.x; stuckSent = false; acc = 0;
    on.ink && on.ink(inkUsed, L.ink);
    on.mode && on.mode(mode);
  }

  /* ---------- strokes ---------- */
  function resample(pts, sp) {
    const out = [{ x: pts[0].x, y: pts[0].y }]; let carry = 0;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], d = Math.hypot(b.x - a.x, b.y - a.y); if (d < 1e-6) continue;
      let t = sp - carry;
      while (t <= d) { out.push({ x: a.x + (b.x - a.x) * t / d, y: a.y + (b.y - a.y) * t / d }); t += sp; }
      carry = d - (t - sp);
    }
    const last = pts[pts.length - 1], lo = out[out.length - 1];
    if (Math.hypot(last.x - lo.x, last.y - lo.y) > sp * 0.35) out.push({ x: last.x, y: last.y }); else { lo.x = last.x; lo.y = last.y; }
    return out;
  }
  const lenOf = pts => { let s = 0; for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); return s; };
  function makeStroke(orig, len) {
    const rs = resample(orig, PH.spacing);
    const n = rs.map(p => ({ x: p.x, y: p.y, px: p.x, py: p.y }));
    const cons = [];
    for (const o of OFFS) for (let i = 0; i + o < n.length; i++) cons.push([i, i + o, Math.hypot(n[i + o].x - n[i].x, n[i + o].y - n[i].y), o === 1 ? 1 : 0.9]);
    // rest shape around its centre, used to keep the plank rigid (2D shape matching)
    let cx = 0, cy = 0; for (const p of n) { cx += p.x; cy += p.y; } cx /= n.length; cy /= n.length;
    const q = n.map(p => ({ x: p.x - cx, y: p.y - cy }));
    return { orig, len: len ?? lenOf(orig), n, cons, q, born: time };
  }
  function addStroke(pts, count = true) {
    pts = pts.map(p => Array.isArray(p) ? { x: p[0], y: p[1] } : p);
    if (pts.length < 2) return null;
    const s = makeStroke(pts);
    if (s.len < 10) return null;
    strokes.push(s); if (count) inkUsed += s.len;
    Sound.play("tok", 0.7);
    on.ink && on.ink(inkUsed, L.ink);
    return s;
  }

  /* ---------- collision helpers ---------- */
  // push a circle out of an axis-aligned box; returns the contact normal or null
  function circleRect(o, r, b) {
    const cx = clamp(o.x, b[0], b[0] + b[2]), cy = clamp(o.y, b[1], b[1] + b[3]);
    let dx = o.x - cx, dy = o.y - cy, d2 = dx * dx + dy * dy;
    if (d2 > r * r) return null;
    let nx, ny, pen;
    if (d2 > 1e-9) { const d = Math.sqrt(d2); nx = dx / d; ny = dy / d; pen = r - d; }
    else {   // centre inside: leave by the nearest side
      const l = o.x - b[0], rr = b[0] + b[2] - o.x, t = o.y - b[1], bt = b[1] + b[3] - o.y, m = Math.min(l, rr, t, bt);
      if (m === t) { nx = 0; ny = -1; pen = t + r; } else if (m === l) { nx = -1; ny = 0; pen = l + r; } else if (m === rr) { nx = 1; ny = 0; pen = rr + r; } else { nx = 0; ny = 1; pen = bt + r; }
    }
    o.x += nx * pen; o.y += ny * pen;
    return { nx, ny, pen };
  }
  // static friction: slow sliding stops completely, faster sliding is damped
  function stick(o, c) { const vx = o.x - o.px, vy = o.y - o.py, vt = Math.abs(vx * -c.ny + vy * c.nx); friction(o, c.nx, c.ny, vt < 1.2 ? 1 : 0.7); }
  function friction(o, nx, ny, f) { const vx = o.x - o.px, vy = o.y - o.py, tx = -ny, ty = nx, vt = vx * tx + vy * ty; o.px += tx * vt * f; o.py += ty * vt * f; }
  // circle vs segment between two plank points; `share` = how much of the push the circle takes
  function circleSeg(o, r, a, b, share) {
    const ex = b.x - a.x, ey = b.y - a.y, l2 = ex * ex + ey * ey || 1e-9;
    const t = clamp(((o.x - a.x) * ex + (o.y - a.y) * ey) / l2, 0, 1), cx = a.x + ex * t, cy = a.y + ey * t;
    const dx = o.x - cx, dy = o.y - cy, d2 = dx * dx + dy * dy, rr = r + R_NODE;
    if (d2 >= rr * rr || d2 < 1e-9) return null;
    const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, pen = rr - d;
    o.x += nx * pen * share; o.y += ny * pen * share;
    const q = pen * (1 - share);
    a.x -= nx * q * (1 - t); a.y -= ny * q * (1 - t); b.x -= nx * q * t; b.y -= ny * q * t;
    return { nx, ny, pen };
  }
  const blocks = () => solids.concat(spikes, springs.map(s => s.r));

  /* ---------- physics step ---------- */
  function integrate(o, h, damp = 0.999, vmax = 7) {
    let vx = (o.x - o.px) * damp, vy = (o.y - o.py) * damp;
    const v = Math.hypot(vx, vy); if (v > vmax) { vx *= vmax / v; vy *= vmax / v; }
    o.px = o.x; o.py = o.y; o.x += vx; o.y += vy + PH.gravity * h * h;
  }
  function physics(h) {
    const B = blocks();
    for (const s of strokes) for (const p of s.n) integrate(p, h, 0.998);
    for (const b of boulders) integrate(b, h, 0.999);
    integrate(kid, h, 1, 9);
    kid.gn = null; kid.onSpring = null; kid.front = false;
    let kidSpike = false;
    for (let it = 0; it < ITER; it++) {
      const last = it === ITER - 1;
      // keep each plank's shape
      for (const s of strokes) for (const c of s.cons) {
        const a = s.n[c[0]], b = s.n[c[1]], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1e-9, f = (d - c[2]) / d * 0.5 * c[3];
        a.x += dx * f; a.y += dy * f; b.x -= dx * f; b.y -= dy * f;
      }
      // pull each plank back towards its drawn shape (best-fit rotation + translation)
      for (const s of strokes) {
        const n = s.n, m = n.length; let cx = 0, cy = 0;
        for (const p of n) { cx += p.x; cy += p.y; } cx /= m; cy /= m;
        let A = 0, Bq = 0;
        for (let i = 0; i < m; i++) { const px = n[i].x - cx, py = n[i].y - cy, q = s.q[i]; A += px * q.x + py * q.y; Bq += py * q.x - px * q.y; }
        const th = Math.atan2(Bq, A), co = Math.cos(th), si = Math.sin(th);
        for (let i = 0; i < m; i++) { const q = s.q[i], gx = cx + co * q.x - si * q.y, gy = cy + si * q.x + co * q.y; n[i].x += (gx - n[i].x) * RIGID; n[i].y += (gy - n[i].y) * RIGID; }
      }
      // planks against the level and against other planks
      for (const s of strokes) for (const p of s.n) for (const b of B) { const c = circleRect(p, R_NODE, b); if (c && last) stick(p, c); }
      for (let i = 0; i < strokes.length; i++) for (let j = 0; j < strokes.length; j++) {
        if (i === j) continue; const A = strokes[i].n, Bn = strokes[j].n;
        for (const p of A) for (let q = 1; q < Bn.length; q++) { const c = circleSeg(p, R_NODE, Bn[q - 1], Bn[q], 0.5); if (c && last) friction(p, c.nx, c.ny, 0.6); }
      }
      // boulders
      for (const b of boulders) {
        for (const r of B) { const c = circleRect(b, b.r, r); if (c && last) friction(b, c.nx, c.ny, 0.02); }
        for (const s of strokes) for (let q = 1; q < s.n.length; q++) circleSeg(b, b.r, s.n[q - 1], s.n[q], 0.5);
        for (const o of boulders) if (o !== b) { const dx = b.x - o.x, dy = b.y - o.y, d = Math.hypot(dx, dy), m = b.r + o.r; if (d < m && d > 1e-6) { const p = (m - d) / 2; b.x += dx / d * p; b.y += dy / d * p; o.x -= dx / d * p; o.y -= dy / d * p; } }
        if (b.x < b.r - 4) b.x = b.r - 4; if (b.x > WW + 4 - b.r) b.x = WW + 4 - b.r;
      }
      // the kid
      if (!kid.dead) {
        const low = c => { if (c && c.nx < -0.45 && kid.y - c.ny * kid.r > kid.y + 2) kid.front = true; };
        const ground = c => { low(c); if (c && c.ny < -0.35 && (!kid.gn || c.nx < kid.gn.nx - 0.02 || (Math.abs(c.nx - kid.gn.nx) <= 0.02 && c.ny < kid.gn.ny))) kid.gn = c; };
        for (const r of solids) ground(circleRect(kid, kid.r, r));
        for (const sp of springs) if (Math.abs(kid.x - sp.x) < 10 && Math.abs(kid.y + kid.r - sp.y) < 8) kid.onSpring = sp;
        for (const r of spikes) { const o = { x: kid.x, y: kid.y }; if (circleRect(o, kid.r - 3, r)) kidSpike = true; }
        for (const s of strokes) for (let q = 1; q < s.n.length; q++) ground(circleSeg(kid, kid.r, s.n[q - 1], s.n[q], 0.6));
        for (const b of boulders) { const dx = kid.x - b.x, dy = kid.y - b.y, d = Math.hypot(dx, dy), m = kid.r + b.r; if (d < m && d > 1e-6) { const p = m - d, nx = dx / d, ny = dy / d; kid.x += nx * p * 0.5; kid.y += ny * p * 0.5; b.x -= nx * p * 0.5; b.y -= ny * p * 0.5; ground(ny < -0.35 ? { nx, ny } : null); } }
        if (kid.x < kid.r) kid.x = kid.r; if (kid.x > WW - kid.r + 6) kid.x = WW - kid.r + 6;
      }
    }
    // walking: steer the kid's velocity along the ground
    if (!kid.dead) {
      let vx = (kid.x - kid.px) / h, vy = (kid.y - kid.py) / h;
      const walking = mode === "run";
      if (kid.gn) {
        const n = kid.gn, tx = -n.ny, ty = n.nx, vt = vx * tx + vy * ty, vn = vx * n.nx + vy * n.ny;
        const target = walking ? PH.walk : 0, nvt = vt + (target - vt) * (walking ? 0.12 : 0.3);
        vx = tx * nvt + n.nx * Math.max(vn, -30); vy = ty * nvt + n.ny * Math.max(vn, -30);
        kid.air = 0;
        if (kid.onSpring && walking) { vy = -PH.spring; vx = PH.springPush; kid.onSpring.t = 1; Sound.play("boing"); kid.air = 0.01; burst(kid.x, kid.y + 16, "#ffffff", 8); }
      } else { kid.air += h; if (walking) vx += (PH.walk * 1.3 - vx) * 0.004; }
      const sp = Math.hypot(vx, vy); if (sp > 1400) { vx *= 1400 / sp; vy *= 1400 / sp; }
      kid.px = kid.x - vx * h; kid.py = kid.y - vy * h;
      if (walking && kid.gn) { kid.stepAcc += Math.abs(vx) * h; if (kid.stepAcc > 22) { kid.stepAcc = 0; Sound.play("step"); } }
      kid.walkT += walking ? Math.abs(vx) * h * 0.08 : 0;
    }
    for (const b of boulders) b.rot += (b.x - b.px) / b.r;
    // results
    if (mode === "run" && !kid.dead) {
      if (kidSpike) return fail("spikes");
      if (kid.y > 1000) return fail("fall");
      if (kid.gn && kid.x >= goal.x - 22 && Math.abs(kid.y + kid.r - goal.y) < 22) return win();
    }
    // tidy: forget planks and rocks that fell far away
    strokes = strokes.filter(s => s.n.some(p => p.y < 1400));
    boulders = boulders.filter(b => b.y < 1400);
  }

  function win() {
    mode = "win"; endT = 0; kid.mood = "happy";
    const st = inkUsed <= L.stars[0] + 0.5 ? 3 : inkUsed <= L.stars[1] + 0.5 ? 2 : 1;
    for (let i = 0; i < 60; i++) parts.push({ x: goal.x, y: goal.y - 40, vx: (Math.random() - 0.5) * 500, vy: -200 - Math.random() * 500, g: 900, life: 0, max: 1.6 + Math.random(), c: ["#ff7a5c", "#ffd23f", "#5fc7a8", "#4f9fe8", "#ff8fd0"][i % 5], sz: 4 + Math.random() * 4, conf: true, rot: Math.random() * 6 });
    Sound.play("win");
    if (!demo) on.win && on.win({ stars: st, ink: Math.round(inkUsed), level: li });
    on.mode && on.mode(mode);
  }
  function fail(why) {
    mode = "fail"; endT = 0; kid.mood = "oops";
    if (why === "spikes") { kid.dead = true; Sound.play("poke"); burst(kid.x, kid.y, "#ffffff", 14); }
    Sound.play("fail");
    if (!demo) setTimeout(() => on.fail && on.fail(why), 900);
    on.mode && on.mode(mode);
  }
  function burst(x, y, c, n) { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = 60 + Math.random() * 160; parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, g: 300, life: 0, max: 0.5 + Math.random() * 0.3, c, sz: 3 + Math.random() * 3 }); } }

  /* ---------- update ---------- */
  function update(dt) {
    time += dt;
    acc = Math.min(acc + dt, 0.1);
    let n = 0;
    while (acc >= H_STEP && n < 16) { physics(H_STEP); acc -= H_STEP; n++; }
    if (mode === "run") {
      runT += dt;
      if (kid.x > bestX + 4) { bestX = kid.x; stuckT = 0; } else stuckT += dt;
      if (stuckT > 3.5 && !stuckSent) { stuckSent = true; on.stuck && on.stuck(); }
    }
    if (mode === "win" || mode === "fail") endT += dt;
    for (const s of springs) s.t = Math.max(0, s.t - dt * 3);
    for (const p of parts) { p.life += dt; p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.99; if (p.rot != null) p.rot += dt * 8; }
    parts = parts.filter(p => p.life < p.max);
    ghost = Math.max(0, ghost - dt);
    if (demo) demoTick(dt);
  }

  /* ---------- drawing input ---------- */
  const inBox = (p, b, m = 0) => p.x > b[0] - m && p.x < b[0] + b[2] + m && p.y > b[1] - m && p.y < b[1] + b[3] + m;
  function canDraw(p) {
    if (p.x < -10 || p.x > WW + 10 || p.y < VIEW_Y - 60 || p.y > 1000) return false;
    for (const b of solids) if (inBox(p, b, 3)) return false;
    for (const b of spikes) if (inBox(p, b, 3)) return false;
    for (const s of springs) if (inBox(p, s.r, 3)) return false;
    for (const z of zones) if (inBox(p, z, 2)) return false;
    if (Math.hypot(p.x - kid.x, p.y - kid.y) < kid.r + 14) return false;
    for (const b of boulders) if (Math.hypot(p.x - b.x, p.y - b.y) < b.r + 8) return false;
    return true;
  }
  let ptr = null;
  cv.addEventListener("pointerdown", e => {
    if (demo || mode === "win" || mode === "fail" || !L) return;
    Sound.unlock();
    if (inkUsed >= L.ink - 2) { Sound.play("empty"); on.noInk && on.noInk(); return; }
    ptr = e.pointerId; try { cv.setPointerCapture(e.pointerId); } catch (er) {}
    const p = toWorld(e.clientX, e.clientY);
    drawing = { segs: [[]], used: 0 };
    if (canDraw(p)) drawing.segs[0].push(p);
    Sound.scratch(true);
  });
  cv.addEventListener("pointermove", e => { if (drawing && e.pointerId === ptr) extend(toWorld(e.clientX, e.clientY)); });
  const end = e => { if (e.pointerId !== ptr) return; ptr = null; finish(); };
  cv.addEventListener("pointerup", end); cv.addEventListener("pointercancel", end);
  function extend(p) {
    const seg = drawing.segs[drawing.segs.length - 1], last = seg[seg.length - 1];
    if (!last) { if (canDraw(p)) seg.push(p); return; }
    const d = Math.hypot(p.x - last.x, p.y - last.y); if (d < 5) return;
    // walk along the move in small steps so the line can't jump through blocks
    const steps = Math.ceil(d / 4);
    let prev = last;
    for (let i = 1; i <= steps; i++) {
      const q = { x: last.x + (p.x - last.x) * i / steps, y: last.y + (p.y - last.y) * i / steps };
      const left = L.ink - inkUsed - drawing.used;
      const dd = Math.hypot(q.x - prev.x, q.y - prev.y);
      if (left <= 0.5) { finish(); Sound.play("empty"); on.noInk && on.noInk(); return; }
      if (!canDraw(q)) { if (drawing.segs[drawing.segs.length - 1].length) drawing.segs.push([]); prev = null; continue; }
      const cur = drawing.segs[drawing.segs.length - 1];
      if (!prev || !cur.length) { cur.push(q); prev = q; continue; }
      const use = Math.min(dd, left);
      drawing.used += use;
      const qq = use < dd ? { x: prev.x + (q.x - prev.x) * use / dd, y: prev.y + (q.y - prev.y) * use / dd } : q;
      if (i === steps || use < dd) cur.push(qq); else if (Math.hypot(qq.x - cur[cur.length - 1].x, qq.y - cur[cur.length - 1].y) >= 5) cur.push(qq);
      prev = qq;
    }
    on.ink && on.ink(inkUsed + drawing.used, L.ink);
  }
  function finish() {
    Sound.scratch(false);
    if (!drawing) return;
    for (const seg of drawing.segs) if (seg.length >= 2 && lenOf(seg) >= 12) addStroke(seg);
    drawing = null;
    on.ink && on.ink(inkUsed, L.ink);
  }

  /* ---------- demo for the title screen ---------- */
  let dState = null;
  function startDemo() { demo = true; load(0); dState = { t: 0, phase: "draw" }; }
  function demoTick(dt) {
    dState.t += dt;
    if (dState.phase === "draw") {
      const sol = L.sol[0], u = clamp((dState.t - 0.8) / 1.0, 0, 1);
      if (u > 0) { const a = { x: sol[0][0], y: sol[0][1] }, b = { x: sol[1][0], y: sol[1][1] }; drawing = { segs: [[a, { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u }]], used: 0 }; }
      if (u >= 1) { drawing = null; addStroke(sol, true); dState.phase = "wait"; dState.t = 0; }
    } else if (dState.phase === "wait" && dState.t > 0.7) { mode = "run"; dState.phase = "run"; }
    else if ((mode === "win" || mode === "fail") && endT > 2.2) { load(0); dState = { t: 0, phase: "draw" }; }
  }

  /* ---------- render ---------- */
  const W2S = () => ctx.setTransform(DPR * k, 0, 0, DPR * k, DPR * ox, DPR * oy);
  function render() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const T = theme;
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, T.sky[0]); g.addColorStop(0.75, T.sky[1]); g.addColorStop(1, T.sky[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    W2S();
    const x0 = -ox / k - 20, x1 = (W - ox) / k + 20, y0 = -oy / k, y1 = (H - oy) / k;
    // sun or moon
    if (T.night) { for (let i = 0; i < 60; i++) { const x = x0 + hash(i) * (x1 - x0), y = y0 + hash(i + 7) * (VIEW_Y + 260 - y0), tw = 0.5 + 0.5 * Math.sin(time * 2 + i); ctx.fillStyle = `rgba(255,255,255,${0.3 + tw * 0.6})`; ctx.fillRect(x, y, 2.2, 2.2); }
      circleO(470, VIEW_Y + 70, 34, "#fff6d8", 3); ctx.fillStyle = "rgba(220,210,170,0.6)"; ctx.beginPath(); ctx.arc(460, VIEW_Y + 62, 7, 0, TAU); ctx.arc(482, VIEW_Y + 82, 5, 0, TAU); ctx.fill(); }
    else { const sg = ctx.createRadialGradient(470, VIEW_Y + 70, 20, 470, VIEW_Y + 70, 110); sg.addColorStop(0, "rgba(255,255,220,0.8)"); sg.addColorStop(1, "rgba(255,255,220,0)"); ctx.fillStyle = sg; ctx.fillRect(360, VIEW_Y - 40, 220, 220); circleO(470, VIEW_Y + 70, 30, "#fff4c2", 0); }
    // clouds
    for (let i = 0; i < 6; i++) {
      const span = x1 - x0 + 300, x = x0 - 150 + ((hash(i) * 2000 + time * (5 + i * 2)) % span), y = VIEW_Y + 30 + hash(i + 3) * 200, s = 0.7 + hash(i + 9) * 0.7;
      cloud(x, y, s, T.cloud);
    }
    // city skyline, two layers
    skyline(x0, x1, 0, T.city[1], 0.55, null);
    skyline(x0, x1, 1, T.city[0], 0.8, T.night ? T.lit : null);
    // no-doodle zones
    for (const z of zones) zone(z);
    // ghost hint
    if (ghost > 0) { ctx.save(); ctx.globalAlpha = Math.min(1, ghost) * (0.6 + 0.3 * Math.sin(time * 8)); ctx.setLineDash([10, 9]); ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#fff"; ctx.lineWidth = 7; for (const s of L.sol) { ctx.beginPath(); s.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); } ctx.restore(); }
    // level blocks
    for (const r of solids) block(r, T);
    for (const r of spikes) spikeStrip(r);
    for (const s of springs) spring(s);
    flag(goal.x, goal.y);
    // planks
    for (const s of strokes) plank(s.n.map(p => [p.x, p.y]), Math.min(1, (time - s.born) * 6));
    if (drawing) for (const seg of drawing.segs) if (seg.length > 1) { ctx.save(); ctx.globalAlpha = 0.75; plank(seg.map(p => [p.x, p.y]), 1); ctx.restore(); }
    for (const b of boulders) boulder(b);
    drawKid();
    // particles
    for (const p of parts) {
      const a = 1 - p.life / p.max; ctx.globalAlpha = Math.min(1, a * 2);
      if (p.conf) { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.c; ctx.fillRect(-p.sz / 2, -p.sz, p.sz, p.sz * 2); ctx.restore(); }
      else { ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.sz * a, 0, TAU); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
  }
  function circleO(x, y, r, fill, lw = 3) { ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); if (lw) { ctx.strokeStyle = OUT; ctx.lineWidth = lw; ctx.stroke(); } }
  function cloud(x, y, s, col) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const blobs = [[0, 0, 26], [30, 6, 20], [-28, 8, 18], [8, -14, 20]];
    ctx.fillStyle = col; ctx.beginPath(); blobs.forEach(([bx, by, r]) => { ctx.moveTo(bx + r, by); ctx.arc(bx, by, r, 0, TAU); }); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.fillRect(-46, 14, 92, 12);
    ctx.restore();
  }
  function skyline(x0, x1, layer, col, hk, lit) {
    const base = VIEW_Y + 520 + layer * 40;
    for (let i = Math.floor(x0 / 46) - 1; i < x1 / 46 + 1; i++) {
      const h1 = hash(i * 3.1 + layer * 50), w = 34 + h1 * 30, x = i * 46 + hash(i + layer) * 10, hgt = (110 + hash(i * 1.7 + layer) * 220) * hk;
      ctx.fillStyle = col; ctx.fillRect(x, base - hgt, w, hgt + 400);
      if (h1 > 0.7) { ctx.fillRect(x + w / 2 - 3, base - hgt - 26, 6, 26); }
      if (h1 < 0.25) { ctx.beginPath(); ctx.moveTo(x, base - hgt); ctx.lineTo(x + w / 2, base - hgt - 22); ctx.lineTo(x + w, base - hgt); ctx.fill(); }
      if (lit) { ctx.fillStyle = lit; for (let yy = base - hgt + 10; yy < base; yy += 16) for (let xx = x + 6; xx < x + w - 8; xx += 11) if (hash(xx * 0.3 + yy * 0.7) > 0.62) ctx.fillRect(xx, yy, 5, 7); ctx.fillStyle = col; }
    }
  }
  function zone(z) {
    ctx.save();
    ctx.beginPath(); ctx.rect(z[0], z[1], z[2], z[3]); ctx.clip();
    ctx.fillStyle = "rgba(255,90,110,0.12)"; ctx.fillRect(z[0], z[1], z[2], z[3]);
    ctx.strokeStyle = "rgba(255,90,110,0.35)"; ctx.lineWidth = 6;
    for (let x = z[0] - z[3]; x < z[0] + z[2]; x += 22) { ctx.beginPath(); ctx.moveTo(x + (time * 10) % 22, z[1] + z[3]); ctx.lineTo(x + z[3] + (time * 10) % 22, z[1]); ctx.stroke(); }
    ctx.restore();
    ctx.setLineDash([8, 7]); ctx.strokeStyle = "rgba(220,60,90,0.7)"; ctx.lineWidth = 2.5; ctx.strokeRect(z[0], Math.max(z[1], VIEW_Y - 60), z[2], z[3] - Math.max(0, VIEW_Y - 60 - z[1])); ctx.setLineDash([]);
    // a crossed-out pencil in the middle
    const cx = z[0] + z[2] / 2, cy = Math.max(z[1], VIEW_Y) + Math.min(z[3], z[1] + z[3] - VIEW_Y) / 2;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.7); ctx.fillStyle = "rgba(220,60,90,0.75)"; ctx.fillRect(-14, -4, 22, 8); ctx.beginPath(); ctx.moveTo(8, -4); ctx.lineTo(16, 0); ctx.lineTo(8, 4); ctx.fill(); ctx.restore();
    ctx.strokeStyle = "rgba(220,60,90,0.75)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, 18, 0, TAU); ctx.moveTo(cx - 13, cy - 13); ctx.lineTo(cx + 13, cy + 13); ctx.stroke();
  }
  function block(r, T) {
    const [x, y, w, h] = r, hh = Math.min(h, 1600);
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, hh); ctx.clip();
    ctx.fillStyle = T.cliff; ctx.fillRect(x, y, w, hh);
    ctx.fillStyle = T.cliffD; ctx.fillRect(x + w - Math.min(12, w * 0.25), y, 12, hh);
    // streaks and chips
    for (let i = 0; i < w / 18; i++) for (let j = 0; j < 30; j++) {
      const hx = hash(x * 0.37 + i * 7.1 + j * 3.3), hy = hash(y * 0.11 + i * 1.9 + j * 5.7);
      if (hx > 0.55) continue;
      const sx = x + 8 + i * 18 + hx * 6, sy = y + 30 + j * 46 + hy * 20;
      if (sx > x + w - 10) continue;
      ctx.fillStyle = T.cliffD; roundRect(sx, sy, 6, 16 + hy * 22, 3); ctx.fill();
      ctx.strokeStyle = OUT; ctx.globalAlpha = 0.25; ctx.lineWidth = 1.5; ctx.stroke(); ctx.globalAlpha = 1;
    }
    ctx.restore();
    ctx.strokeStyle = OUT; ctx.lineWidth = 3; ctx.strokeRect(x, y, w, hh);
    // grassy cap with a scalloped edge
    if (y > VIEW_Y - 50) {
      ctx.fillStyle = T.grass; ctx.beginPath(); ctx.moveTo(x - 2, y - 3);
      ctx.lineTo(x + w + 2, y - 3); ctx.lineTo(x + w + 2, y + 9);
      for (let xx = x + w; xx > x; xx -= 12) ctx.arc(xx - 6, y + 9, 6, 0, Math.PI);
      ctx.closePath(); ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.fillStyle = T.grassD; ctx.fillRect(x + 1, y + 4, w - 2, 3);
      ctx.strokeStyle = OUT; ctx.lineWidth = 2;
      for (let xx = x + 8; xx < x + w - 6; xx += 23) { if (hash(xx + y) < 0.4) continue; ctx.fillStyle = T.grass; ctx.beginPath(); ctx.moveTo(xx, y - 2); ctx.lineTo(xx + 3, y - 9); ctx.lineTo(xx + 6, y - 2); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    }
  }
  function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function spikeStrip(r) {
    const [x, y, w, h] = r, n = Math.max(1, Math.round(w / 16)), sw = w / n;
    ctx.fillStyle = "#c8d0e0"; ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.lineJoin = "round";
    for (let i = 0; i < n; i++) { ctx.beginPath(); ctx.moveTo(x + i * sw, y + h); ctx.lineTo(x + i * sw + sw / 2, y); ctx.lineTo(x + (i + 1) * sw, y + h); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.moveTo(x + i * sw + sw / 2, y + 3); ctx.lineTo(x + i * sw + sw / 2 - 2, y + h - 2); ctx.lineTo(x + i * sw + sw / 2 - 4, y + h - 2); ctx.fill(); ctx.fillStyle = "#c8d0e0"; }
  }
  function spring(s) {
    const c = s.t, x = s.x, y = s.y, top = y - 12 - c * 10 + (c > 0.5 ? 0 : 0);
    ctx.fillStyle = "#6a7f94"; ctx.strokeStyle = OUT; ctx.lineWidth = 2.5; roundRect(x - 20, y - 5, 40, 5, 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = "#b8c4d0"; ctx.lineWidth = 3; ctx.beginPath(); for (let i = 0; i <= 6; i++) { const yy = y - 5 - (y - 5 - (top + 4)) * i / 6; ctx.lineTo(x + (i % 2 ? 12 : -12), yy); } ctx.stroke();
    ctx.fillStyle = "#ff5f6d"; ctx.strokeStyle = OUT; ctx.lineWidth = 2.5; roundRect(x - 22, top - 4, 44, 8, 4); ctx.fill(); ctx.stroke();
  }
  function flag(x, y) {
    ctx.strokeStyle = OUT; ctx.lineWidth = 2.5; ctx.fillStyle = "#c98a5c";
    roundRect(x + 10, y - 58, 6, 58, 2); ctx.fill(); ctx.stroke();
    roundRect(x - 8, y - 66, 44, 22, 5); ctx.fillStyle = "#f2b06a"; ctx.fill(); ctx.stroke();
    ctx.fillStyle = OUT; ctx.font = "900 11px " + FONT; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("GOAL", x + 14, y - 55);
    // waving flag on top
    ctx.fillStyle = OUT; ctx.fillRect(x + 12, y - 92, 2.5, 28);
    ctx.fillStyle = "#ff5f6d"; ctx.beginPath(); ctx.moveTo(x + 14, y - 92);
    for (let i = 0; i <= 6; i++) ctx.lineTo(x + 14 + i * 4, y - 92 + Math.sin(time * 6 + i * 0.8) * 2.5 + i * 0.4);
    for (let i = 6; i >= 0; i--) ctx.lineTo(x + 14 + i * 4, y - 78 + Math.sin(time * 6 + i * 0.8) * 2.5);
    ctx.closePath(); ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.stroke();
  }
  function plank(pts, grow) {
    if (pts.length < 2) return;
    const th = R_NODE * 2;
    const path = () => { ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); };
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.strokeStyle = OUT; ctx.lineWidth = th + 5 + (1 - grow) * 6; path(); ctx.stroke();
    if (pen.glow) { ctx.save(); ctx.shadowColor = pen.a; ctx.shadowBlur = 14; ctx.strokeStyle = pen.a; ctx.lineWidth = th; path(); ctx.stroke(); ctx.restore(); }
    if (pen.rainbow) { for (let i = 1; i < pts.length; i++) { ctx.strokeStyle = `hsl(${(i * 14 + time * 60) % 360},90%,60%)`; ctx.lineWidth = th; ctx.beginPath(); ctx.moveTo(pts[i - 1][0], pts[i - 1][1]); ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke(); } }
    else { ctx.strokeStyle = pen.a; ctx.lineWidth = th; path(); ctx.stroke(); if (pen.stripe) { ctx.setLineDash([7, 7]); ctx.strokeStyle = pen.b; ctx.lineWidth = th - 3; path(); ctx.stroke(); ctx.setLineDash([]); } }
    ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = 2; ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y - 2) : ctx.moveTo(x, y - 2)); ctx.stroke();
  }
  function boulder(b) {
    ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.rot);
    ctx.fillStyle = "#b8bccb"; ctx.strokeStyle = OUT; ctx.lineWidth = 3;
    ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = i / 10 * TAU, rr = b.r * (0.92 + hash(i + b.r) * 0.1); ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#d8dbe6"; ctx.beginPath(); ctx.ellipse(-b.r * 0.3, -b.r * 0.35, b.r * 0.35, b.r * 0.22, -0.5, 0, TAU); ctx.fill();
    ctx.strokeStyle = "#7f8496"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(b.r * 0.1, -b.r * 0.1); ctx.lineTo(b.r * 0.45, b.r * 0.2); ctx.lineTo(b.r * 0.3, b.r * 0.5); ctx.moveTo(-b.r * 0.5, b.r * 0.2); ctx.lineTo(-b.r * 0.2, b.r * 0.35); ctx.stroke();
    ctx.restore();
  }
  function drawKid() {
    if (kid.dead && endT > 0.6) return;
    ctx.save(); ctx.translate(kid.x, kid.y + kid.r);
    let tilt = 0; if (kid.gn && mode === "run") tilt = Math.atan2(-kid.gn.nx, -kid.gn.ny) * -0.5;
    if (mode === "fail") tilt = Math.sin(time * 20) * 0.3;
    ctx.rotate(tilt);
    if (mode === "win") ctx.translate(0, -Math.abs(Math.sin(endT * 8)) * 14);
    kidArt(ctx, skin, { walk: mode === "run" ? kid.walkT : 0, air: kid.air > 0.08, mood: kid.mood, t: time });
    ctx.restore();
  }
  // the kid: feet at (0,0), about 44 tall, facing right
  function kidArt(g, sk, o) {
    const w = o.walk || 0, sw = Math.sin(w * 6) * (o.walk ? 1 : 0), air = o.air, t = o.t || 0;
    g.lineWidth = 2.2; g.strokeStyle = OUT; g.lineJoin = "round"; g.lineCap = "round";
    const leg = (x, a) => { g.save(); g.translate(x, -11); g.rotate(a); g.fillStyle = sk.pants; rr(g, -3, 0, 6, 9, 2); g.fill(); g.stroke(); g.fillStyle = "#fff"; rr(g, -3, 7, 9, 5, 2); g.fill(); g.stroke(); g.restore(); };
    leg(-4, air ? -0.5 : sw * 0.6); leg(4, air ? 0.4 : -sw * 0.6);
    // body
    g.fillStyle = sk.shirt; rr(g, -9, -24, 18, 15, 5); g.fill(); g.stroke();
    if (sk.hat === "bee") { g.fillStyle = OUT; g.fillRect(-8, -19, 16, 3); g.fillRect(-8, -14, 16, 3); }
    if (sk.hat === "robot") { g.fillStyle = "#ff5f6d"; g.beginPath(); g.arc(0, -17, 2.5, 0, TAU); g.fill(); }
    // arm
    g.save(); g.translate(2, -21); g.rotate(air ? -2.2 : o.mood === "happy" ? -2.6 : -sw * 0.7 + 0.2); g.fillStyle = sk.shirt; rr(g, -2.5, 0, 5, 10, 2.5); g.fill(); g.stroke(); g.fillStyle = sk.skin; g.beginPath(); g.arc(0, 11, 2.6, 0, TAU); g.fill(); g.stroke(); g.restore();
    // head
    const hy = -33;
    if (sk.hat === "helmet") { g.fillStyle = "rgba(200,235,255,0.5)"; g.beginPath(); g.arc(1, hy, 15, 0, TAU); g.fill(); g.stroke(); }
    g.fillStyle = sk.skin; g.beginPath(); g.arc(1, hy, 11, 0, TAU); g.fill(); g.stroke();
    // face
    const eyeY = hy + 1;
    if (o.mood === "happy") { g.beginPath(); g.arc(3, eyeY + 1, 2, Math.PI * 1.1, Math.PI * 1.9); g.moveTo(10, eyeY + 1); g.arc(8, eyeY + 1, 2, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
    else { g.fillStyle = OUT; g.beginPath(); g.arc(3.5, eyeY, 1.6, 0, TAU); g.arc(8.5, eyeY, 1.6, 0, TAU); g.fill(); }
    if (o.mood === "oops") { g.fillStyle = OUT; g.beginPath(); g.ellipse(6, hy + 7, 2, 2.6, 0, 0, TAU); g.fill(); }
    else { g.beginPath(); g.arc(6, hy + 5, 2.4, 0.2, Math.PI - 0.2); g.stroke(); }
    g.fillStyle = "rgba(255,120,140,0.45)"; g.beginPath(); g.ellipse(-2, hy + 4, 2.5, 1.6, 0, 0, TAU); g.fill();
    // hats
    g.lineWidth = 2.2;
    switch (sk.hat) {
      case "beanie": g.fillStyle = sk.a; g.beginPath(); g.arc(1, hy - 5, 11.5, Math.PI, 0); g.closePath(); g.fill(); g.stroke(); g.fillStyle = "#ffffff"; rr(g, -11, hy - 7, 24, 4.5, 2.2); g.fill(); g.stroke(); g.fillStyle = sk.a; g.beginPath(); g.arc(1, hy - 18, 3.5, 0, TAU); g.fill(); g.stroke(); break;
      case "cat": g.fillStyle = sk.a; g.beginPath(); g.arc(1, hy - 1, 12.5, Math.PI * 0.95, Math.PI * 2.05); g.closePath(); g.fill(); g.stroke(); g.beginPath(); g.moveTo(-9, hy - 7); g.lineTo(-8, hy - 18); g.lineTo(-2, hy - 11); g.closePath(); g.fill(); g.stroke(); g.beginPath(); g.moveTo(5, hy - 11); g.lineTo(11, hy - 18); g.lineTo(12, hy - 6); g.closePath(); g.fill(); g.stroke(); break;
      case "helmet": g.strokeStyle = "#ffffff"; g.lineWidth = 2; g.beginPath(); g.arc(-3, hy - 6, 6, Math.PI * 1.1, Math.PI * 1.6); g.stroke(); g.strokeStyle = OUT; g.fillStyle = "#e8eef8"; rr(g, -11, hy + 10, 24, 5, 2); g.fill(); g.stroke(); break;
      case "dino": g.fillStyle = sk.a; g.beginPath(); g.arc(1, hy - 1, 12.5, Math.PI * 0.95, Math.PI * 2.05); g.closePath(); g.fill(); g.stroke(); g.fillStyle = "#ffd23f"; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(-8 + i * 6, hy - 10 - (i === 1 ? 2 : 0)); g.lineTo(-5 + i * 6, hy - 18 - (i === 1 ? 2 : 0)); g.lineTo(-2 + i * 6, hy - 10); g.closePath(); g.fill(); g.stroke(); } break;
      case "chef": g.fillStyle = "#fff"; rr(g, -8, hy - 14, 18, 9, 2); g.fill(); g.stroke(); g.beginPath(); g.arc(-4, hy - 17, 6, 0, TAU); g.arc(6, hy - 17, 6, 0, TAU); g.arc(1, hy - 21, 6, 0, TAU); g.fill(); g.stroke(); g.fillRect(-7, hy - 15, 16, 6); break;
      case "bee": g.fillStyle = sk.a; g.beginPath(); g.arc(1, hy - 2, 11.5, Math.PI, 0); g.closePath(); g.fill(); g.stroke(); g.beginPath(); g.moveTo(-3, hy - 12); g.lineTo(-7, hy - 20); g.moveTo(5, hy - 12); g.lineTo(9, hy - 20); g.stroke(); g.fillStyle = OUT; g.beginPath(); g.arc(-7, hy - 21, 2, 0, TAU); g.arc(9, hy - 21, 2, 0, TAU); g.fill(); g.fillStyle = "rgba(255,255,255,0.8)"; g.beginPath(); g.ellipse(-8, -26, 6, 4, -0.5, 0, TAU); g.fill(); g.stroke(); break;
      case "robot": g.fillStyle = sk.a; rr(g, -11, hy - 12, 24, 9, 3); g.fill(); g.stroke(); g.beginPath(); g.moveTo(1, hy - 12); g.lineTo(1, hy - 19); g.stroke(); g.fillStyle = "#ff5f6d"; g.beginPath(); g.arc(1, hy - 20, 2.6, 0, TAU); g.fill(); g.stroke(); break;
    }
    if (sk.hat === "beanie" || sk.hat === "bee") { g.fillStyle = sk.hair; g.beginPath(); g.ellipse(-9, hy - 1, 2.6, 3.4, 0, 0, TAU); g.fill(); }
  }
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  const FONT = '"Fredoka","Baloo 2","Arial Rounded MT Bold","Trebuchet MS",system-ui,sans-serif';

  /* ---------- loop ---------- */
  let last = performance.now(), paused = false;
  function frame(now) { const dt = Math.min(0.05, (now - last) / 1000); last = now; if (!paused && L) update(dt); if (L) render(); requestAnimationFrame(frame); }
  resize();
  requestAnimationFrame(frame);

  return {
    on, load, startDemo,
    play(i) { demo = false; load(i); },
    go() { if (mode !== "edit") return; mode = "run"; runT = 0; Sound.play("go"); on.mode && on.mode(mode); },
    undo() { if (mode === "win" || !strokes.length) return; const s = strokes.pop(); inkUsed = Math.max(0, inkUsed - s.len); Sound.play("undo"); on.ink && on.ink(inkUsed, L.ink); },
    clear() { if (mode === "win") return; strokes = []; inkUsed = 0; Sound.play("undo"); on.ink && on.ink(inkUsed, L.ink); },
    retry() { load(li, { keepStrokes: true }); },
    reset() { load(li); },
    hint(sec = 4) { ghost = sec; },
    pause(p) { paused = p; last = performance.now(); },
    setSkin(id) { skin = C.skins.find(s => s.id === id) || C.skins[0]; },
    setPen(id) { pen = C.pens.find(s => s.id === id) || C.pens[0]; },
    kidArt, setPadding(t, b) { padTop = t; padBot = b; resize(); },
    get mode() { return mode; }, get level() { return li; }, get ink() { return inkUsed; }, get L() { return L; }, get demo() { return demo; },
    // test hooks
    toScreen(x, y) { return { x: x * k + ox, y: y * k + oy }; },
    addStroke, step(dt = 1 / 60, n = 1) { for (let i = 0; i < n; i++) update(dt); render(); },
    get kid() { return kid; }, get strokes() { return strokes; }, get boulders() { return boulders; }
  };
})();

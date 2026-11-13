/* ==========================================================================
   PUTT PARK — engine + watercolor painter
   Each hole is painted once to an offscreen canvas (paper grain, layered
   translucent washes, ink outlines); the ball, movers and effects draw live.
   ========================================================================== */
window.Game = (() => {
  const CF = window.GAME_CONFIG, PH = CF.physics, W = 400, HH = 640;
  const cv = document.getElementById("green"), g = cv.getContext("2d");
  let zoom = 1, dpr = 1, ox = 0, oy = 0;
  const hooks = {}, emit = (n, d) => hooks[n] && hooks[n](d);

  let course = null, ci = 0, hi = 0, hole = null, segs = [], movers = [], bumpers = [], paint = null;
  let ball = { x: 0, y: 0, vx: 0, vy: 0, s: 1 }, last = { x: 0, y: 0 }, strokes = 0, cards = [], state = "idle", paused = false;
  let aim = null, power = 0, aimAng = 0, clock = 0, still = 0, sinkT = 0, lipT = 0, parts = [], texts = [], ballColor = "#ffffff";

  /* ---------- geometry ---------- */
  const closed = p => p.map((pt, i) => [pt, p[(i + 1) % p.length]]);
  function inPoly(x, y, p) { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const [xi, yi] = p[i], [xj, yj] = p[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; }
  function load(c, h) {
    ci = c; hi = h; course = CF.courses[c]; hole = course.holes[h];
    segs = closed(hole.poly).map(([a, b]) => ({ a, b }));
    (hole.inner || []).forEach(p => closed(p).forEach(([a, b]) => segs.push({ a, b })));
    bumpers = (hole.bumpers || []).map(([x, y, r]) => ({ x, y, r, hit: 0 }));
    movers = (hole.movers || []).map(m => ({ ...m, ph: 0, cx: m.x, cy: m.y }));
    ball = { x: hole.tee[0], y: hole.tee[1], vx: 0, vy: 0, s: 1 }; last = { x: ball.x, y: ball.y };
    strokes = 0; state = "aim"; still = 0; sinkT = 0; parts = []; texts = [];
    paint = painted(); emit("hole", { n: h + 1, name: hole.name, par: hole.par }); emit("hud");
  }

  /* ---------- watercolor painting (once per hole) ---------- */
  function rnd(seed) { return () => (seed = (seed * 9301 + 49297) % 233280) / 233280; }
  function painted() {
    const c = document.createElement("canvas"); c.width = W * 2; c.height = HH * 2;
    const x = c.getContext("2d"); x.scale(2, 2); const r = rnd(ci * 50 + hi * 7 + 3);
    x.fillStyle = course.paper; x.fillRect(0, 0, W, HH);
    for (let i = 0; i < 2200; i++) { x.fillStyle = `rgba(120,100,70,${r() * 0.05})`; x.fillRect(r() * W, r() * HH, 1, 1); }
    const wash = (path, color, layers = 5, spread = 3) => {
      x.fillStyle = color;
      for (let i = 0; i < layers; i++) { x.save(); x.globalAlpha = 0.16; x.translate((r() - 0.5) * spread * 2, (r() - 0.5) * spread * 2); path(); x.fill(); x.restore(); }
      x.globalAlpha = 0.55; path(); x.fill(); x.globalAlpha = 1;
    };
    const polyPath = p => () => { x.beginPath(); p.forEach(([a, b], i) => i ? x.lineTo(a, b) : x.moveTo(a, b)); x.closePath(); };
    const blob = (cx, cy, rad, color, n = 3) => wash(() => { x.beginPath(); for (let i = 0; i <= 16; i++) { const a = i / 16 * Math.PI * 2, rr = rad * (0.85 + r() * 0.3); i ? x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr) : x.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } x.closePath(); }, color, n, 2);
    // rough ground + decorations outside the green
    for (let i = 0; i < 40; i++) blob(r() * W, r() * HH, 30 + r() * 50, course.rough, 2);
    for (let i = 0; i < 26; i++) {
      const px = r() * W, py = r() * HH; if (inPoly(px, py, hole.poly)) continue;
      if (r() < 0.5) { blob(px, py, 14 + r() * 10, course.id === "seaside" ? "#7aa89a" : "#6fa564", 3); blob(px - 4, py - 4, 8, "#9fd18c", 2); }
      else { for (let k = 0; k < 4; k++) blob(px + (r() - 0.5) * 18, py + (r() - 0.5) * 18, 3, ["#f2a7b0", "#f5dc72", "#ffffff", "#a98bd1"][k], 2); }
    }
    // green + mowing stripes
    wash(polyPath(hole.poly), course.grass, 6, 3);
    x.save(); polyPath(hole.poly)(); x.clip();
    for (let y = 0; y < HH; y += 36) { x.fillStyle = course.grass2; x.globalAlpha = 0.18; x.fillRect(0, y, W, 18); }
    x.globalAlpha = 1;
    (hole.slopes || []).forEach(s => { const [x0, y0, x1, y1] = s.r, ang = Math.atan2(s.f[1], s.f[0]); x.strokeStyle = "rgba(255,255,255,.55)"; x.lineWidth = 2; for (let yy = y0 + 25; yy < y1; yy += 40) for (let xx = x0 + 25; xx < x1; xx += 50) { x.save(); x.translate(xx, yy); x.rotate(ang); x.beginPath(); x.moveTo(-8, -5); x.lineTo(0, 0); x.lineTo(-8, 5); x.stroke(); x.restore(); } });
    x.restore();
    (hole.sand || []).forEach(s => blob(s.c[0], s.c[1], s.r, "#ecd5a0", 5));
    (hole.water || []).forEach(([x0, y0, x1, y1]) => { wash(() => { x.beginPath(); x.rect(x0, y0, x1 - x0, y1 - y0); }, "#8ec3e0", 6, 2); x.strokeStyle = "rgba(255,255,255,.7)"; x.lineWidth = 1.5; for (let yy = y0 + 10; yy < y1 - 4; yy += 14) for (let xx = x0 + 8; xx < x1 - 16; xx += 30) { x.beginPath(); x.moveTo(xx, yy); x.quadraticCurveTo(xx + 5, yy - 4, xx + 10, yy); x.quadraticCurveTo(xx + 15, yy + 4, xx + 20, yy); x.stroke(); } });
    // walls: painted wood band + ink line
    const allPolys = [hole.poly, ...(hole.inner || [])];
    allPolys.forEach(p => { x.lineJoin = "round"; x.strokeStyle = "rgba(150,105,70,.55)"; x.lineWidth = 9; polyPath(p)(); x.stroke(); x.strokeStyle = "#4b3a2c"; x.lineWidth = 1.6; polyPath(p)(); x.stroke(); x.save(); x.translate(1.5, 1); x.globalAlpha = 0.4; polyPath(p)(); x.stroke(); x.restore(); });
    allPolys.slice(1).forEach(p => wash(polyPath(p), "#c9a37a", 3, 1));
    // tee mat and cup
    x.fillStyle = "rgba(255,255,255,.5)"; x.beginPath(); x.roundRect(hole.tee[0] - 16, hole.tee[1] - 10, 32, 20, 6); x.fill();
    x.fillStyle = "#2f3a2c"; x.beginPath(); x.ellipse(hole.cup[0], hole.cup[1], PH.cupR, PH.cupR * 0.9, 0, 0, 7); x.fill();
    x.strokeStyle = "rgba(255,255,255,.6)"; x.lineWidth = 1.5; x.stroke();
    return c;
  }

  /* ---------- physics ---------- */
  function closest(a, b, px, py) { const dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / l)); return [a[0] + dx * t, a[1] + dy * t]; }
  function bounceSeg(a, b, e, mvx = 0, mvy = 0) {
    const [cx, cy] = closest(a, b, ball.x, ball.y); let nx = ball.x - cx, ny = ball.y - cy; const d = Math.hypot(nx, ny);
    if (d >= PH.ballR || d === 0) return false; nx /= d; ny /= d;
    ball.x = cx + nx * PH.ballR; ball.y = cy + ny * PH.ballR;
    const rvx = ball.vx - mvx, rvy = ball.vy - mvy, vn = rvx * nx + rvy * ny;
    if (vn < 0) { ball.vx -= (1 + e) * vn * nx; ball.vy -= (1 + e) * vn * ny; if (-vn > 60) Sound.sfx("wall", -vn / 2500); }
    return true;
  }
  function moverRect(m) { const off = Math.sin(m.ph) * m.range; return { x: m.axis === "x" ? m.x + off : m.x, y: m.axis === "y" ? m.y + off : m.y, vx: m.axis === "x" ? Math.cos(m.ph) * m.range * m.speed : 0, vy: m.axis === "y" ? Math.cos(m.ph) * m.range * m.speed : 0 }; }
  const inRect = (x, y, [x0, y0, x1, y1]) => x > x0 && x < x1 && y > y0 && y < y1;
  function stepBall(dt) {
    let fr = PH.grass;
    if ((hole.sand || []).some(s => Math.hypot(ball.x - s.c[0], ball.y - s.c[1]) < s.r)) { fr = PH.sand; if (Math.random() < 0.05 && Math.hypot(ball.vx, ball.vy) > 60) Sound.sfx("sand"); }
    let sloped = false;
    (hole.slopes || []).forEach(s => { if (inRect(ball.x, ball.y, s.r)) { ball.vx += s.f[0] * dt; ball.vy += s.f[1] * dt; sloped = true; } });
    // cup: gentle pull when close and slow, sink if slow enough
    const dx = hole.cup[0] - ball.x, dy = hole.cup[1] - ball.y, dc = Math.hypot(dx, dy), sp = Math.hypot(ball.vx, ball.vy);
    if (dc < PH.cupR * 1.7 && sp < PH.sinkSpeed) { ball.vx += dx / dc * 260 * dt; ball.vy += dy / dc * 260 * dt; }
    if (dc < PH.cupR - 2 && sp < PH.sinkSpeed) { sink(); return; }
    if (dc < PH.cupR && sp >= PH.sinkSpeed && lipT <= 0) { lipT = 0.3; Sound.sfx("lip"); const a = 0.35 * (Math.random() < 0.5 ? -1 : 1), c = Math.cos(a), s = Math.sin(a); [ball.vx, ball.vy] = [ball.vx * c - ball.vy * s, ball.vx * s + ball.vy * c]; }
    const k = Math.max(0, 1 - fr * dt); ball.vx *= k; ball.vy *= k;
    ball.x += ball.vx * dt; ball.y += ball.vy * dt;
    segs.forEach(s => bounceSeg(s.a, s.b, PH.wall));
    movers.forEach(m => { const r = moverRect(m), hw = m.w / 2, hh = m.h / 2, cs = [[r.x - hw, r.y - hh], [r.x + hw, r.y - hh], [r.x + hw, r.y + hh], [r.x - hw, r.y + hh]]; closed(cs).forEach(([a, b]) => bounceSeg(a, b, 0.6, r.vx, r.vy)); });
    bumpers.forEach(b => { const ddx = ball.x - b.x, ddy = ball.y - b.y, d = Math.hypot(ddx, ddy); if (d < b.r + PH.ballR) { const nx = ddx / d, ny = ddy / d; ball.x = b.x + nx * (b.r + PH.ballR); ball.y = b.y + ny * (b.r + PH.ballR); const vn = ball.vx * nx + ball.vy * ny; if (vn < 0) { ball.vx -= (1 + PH.bumper) * vn * nx; ball.vy -= (1 + PH.bumper) * vn * ny; b.hit = 1; Sound.sfx("bump"); } } });
    if ((hole.water || []).some(w => inRect(ball.x, ball.y, w))) splash();
    if (!inPoly(ball.x, ball.y, hole.poly)) { ball.x = last.x; ball.y = last.y; ball.vx = ball.vy = 0; }   // safety: never escape
    return sloped;
  }
  function splash() {
    Sound.sfx("splash"); for (let i = 0; i < 16; i++) { const a = Math.random() * 6.28, s = 40 + Math.random() * 120; parts.push({ x: ball.x, y: ball.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0, c: "#bfe0f2" }); }
    strokes++; texts.push({ x: ball.x, y: ball.y - 20, s: "Splash! +1", t: 0 });
    ball.x = last.x; ball.y = last.y; ball.vx = ball.vy = 0; state = "aim"; emit("hud");
    if (strokes >= PH.maxStrokes) pickUp();
  }
  function sink() {
    state = "sink"; sinkT = 0; ball.vx = ball.vy = 0; Sound.sfx("cup");
    const diff = strokes - hole.par, label = strokes === 1 ? "Hole in one!" : diff <= -2 ? "Eagle!" : diff === -1 ? "Birdie!" : diff === 0 ? "Par" : diff === 1 ? "Bogey" : "+" + diff;
    setTimeout(() => Sound.sfx(strokes === 1 ? "ace" : diff <= 0 ? "good" : "meh"), 250);
    for (let i = 0; i < (diff <= -1 ? 40 : 14); i++) { const a = Math.random() * 6.28, s = 60 + Math.random() * 200; parts.push({ x: hole.cup[0], y: hole.cup[1], vx: Math.cos(a) * s, vy: Math.sin(a) * s - 80, t: 0, c: ["#f2a7b0", "#f5dc72", "#9cc8ea", "#a98bd1", "#ffffff"][i % 5], petal: true }); }
    texts.push({ x: hole.cup[0], y: hole.cup[1] - 30, s: label, t: 0, big: true });
    finishHole(strokes);
  }
  function pickUp() { state = "sink"; sinkT = 0.5; texts.push({ x: ball.x, y: ball.y - 20, s: "Picked up", t: 0 }); finishHole(PH.maxStrokes); }
  function finishHole(n) {
    const stars = n <= hole.par - 1 ? 3 : n <= hole.par ? 2 : n <= hole.par + 1 ? 1 : 0;
    cards[hi] = { strokes: n, par: hole.par, stars };
    setTimeout(() => { if (hi + 1 < course.holes.length) emit("holeDone", { n: hi + 1, strokes: n, par: hole.par, stars, cards }); else emit("courseDone", { ci, cards: cards.slice() }); }, 1500);
  }

  function update(dt) {
    clock += dt; if (paused || state === "idle") return;
    movers.forEach(m => m.ph += m.speed * dt);
    bumpers.forEach(b => b.hit = Math.max(0, b.hit - dt * 4));
    if (lipT > 0) lipT -= dt;
    if (state === "roll") {
      let sloped = false; const sub = 6; for (let i = 0; i < sub && state === "roll"; i++) sloped = stepBall(dt / sub) || sloped;
      if (state === "roll") { const sp = Math.hypot(ball.vx, ball.vy); still = sp < (sloped ? 14 : 6) ? still + dt : 0; if (still > (sloped ? 0.5 : 0.08)) { ball.vx = ball.vy = 0; state = "aim"; if (strokes >= PH.maxStrokes) pickUp(); } }
    }
    if (state === "sink") { sinkT += dt; ball.x += (hole.cup[0] - ball.x) * Math.min(1, dt * 10); ball.y += (hole.cup[1] - ball.y) * Math.min(1, dt * 10); ball.s = Math.max(0, 1 - sinkT * 3); }
    parts.forEach(p => { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.petal ? 60 : 200) * dt; p.vx *= 0.98; }); parts = parts.filter(p => p.t < 1.4);
    texts.forEach(t => t.t += dt); texts = texts.filter(t => t.t < 1.6);
  }

  /* ---------- live drawing ---------- */
  function render() {
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.fillStyle = course ? course.paper : "#fbf6ea"; g.fillRect(0, 0, cv.width, cv.height);
    g.setTransform(zoom * dpr, 0, 0, zoom * dpr, ox * dpr, oy * dpr);
    if (!paint) return;
    g.drawImage(paint, 0, 0, W, HH);
    // flag (waves when you aim)
    const [fx, fy] = hole.cup; g.strokeStyle = "#4b3a2c"; g.lineWidth = 2; g.beginPath(); g.moveTo(fx, fy); g.lineTo(fx, fy - 46); g.stroke();
    g.fillStyle = "#e56b6f"; g.globalAlpha = 0.85; g.beginPath(); g.moveTo(fx, fy - 46); for (let i = 0; i <= 6; i++) g.lineTo(fx + i * 4, fy - 46 + Math.sin(clock * 5 + i) * 2 + i * 0.3); for (let i = 6; i >= 0; i--) g.lineTo(fx + i * 4, fy - 32 + Math.sin(clock * 5 + i) * 2); g.closePath(); g.fill(); g.globalAlpha = 1;
    // mushrooms (bumpers) and wooden movers
    bumpers.forEach(b => { const s = 1 + b.hit * 0.25; g.fillStyle = "rgba(0,0,0,.12)"; g.beginPath(); g.ellipse(b.x + 3, b.y + 4, b.r * s, b.r * 0.8 * s, 0, 0, 7); g.fill(); g.fillStyle = "#e56b6f"; g.beginPath(); g.arc(b.x, b.y, b.r * s, 0, 7); g.fill(); g.fillStyle = "#fff"; [[-0.4, -0.3], [0.35, -0.1], [-0.05, 0.4]].forEach(([a, c]) => { g.beginPath(); g.arc(b.x + a * b.r, b.y + c * b.r, b.r * 0.18, 0, 7); g.fill(); }); g.strokeStyle = "#4b3a2c"; g.lineWidth = 1.5; g.beginPath(); g.arc(b.x, b.y, b.r * s, 0, 7); g.stroke(); });
    movers.forEach(m => { const r = moverRect(m); g.fillStyle = "rgba(0,0,0,.12)"; g.fillRect(r.x - m.w / 2 + 3, r.y - m.h / 2 + 4, m.w, m.h); g.fillStyle = "#c9a37a"; g.fillRect(r.x - m.w / 2, r.y - m.h / 2, m.w, m.h); g.strokeStyle = "#4b3a2c"; g.lineWidth = 1.5; g.strokeRect(r.x - m.w / 2, r.y - m.h / 2, m.w, m.h); g.beginPath(); g.moveTo(r.x - m.w / 2 + 8, r.y); g.lineTo(r.x + m.w / 2 - 8, r.y); g.globalAlpha = 0.4; g.stroke(); g.globalAlpha = 1; });
    // aim guide
    if (state === "aim" && aim && power > 0.04) {
      const len = 30 + power * 120, ex = ball.x + Math.cos(aimAng) * len, ey = ball.y + Math.sin(aimAng) * len;
      g.setLineDash([3, 7]); g.lineCap = "round"; g.strokeStyle = "rgba(75,58,44,.75)"; g.lineWidth = 3; g.beginPath(); g.moveTo(ball.x, ball.y); g.lineTo(ex, ey); g.stroke(); g.setLineDash([]);
      g.fillStyle = power > 0.85 ? "#e56b6f" : "#4b3a2c"; g.beginPath(); g.moveTo(ex + Math.cos(aimAng) * 8, ey + Math.sin(aimAng) * 8); g.lineTo(ex + Math.cos(aimAng + 2.5) * 8, ey + Math.sin(aimAng + 2.5) * 8); g.lineTo(ex + Math.cos(aimAng - 2.5) * 8, ey + Math.sin(aimAng - 2.5) * 8); g.fill();
      g.strokeStyle = "rgba(75,58,44,.3)"; g.lineWidth = 1; g.beginPath(); g.arc(ball.x, ball.y, 14 + power * 10, 0, 7); g.stroke();
    }
    // ball
    if (ball.s > 0) { const r = PH.ballR * ball.s; g.fillStyle = "rgba(0,0,0,.18)"; g.beginPath(); g.ellipse(ball.x + 2.5, ball.y + 3, r, r * 0.8, 0, 0, 7); g.fill(); g.fillStyle = ballColor; g.beginPath(); g.arc(ball.x, ball.y, r, 0, 7); g.fill(); g.strokeStyle = "#4b3a2c"; g.lineWidth = 1.4; g.stroke(); g.fillStyle = "rgba(255,255,255,.8)"; g.beginPath(); g.arc(ball.x - r * 0.35, ball.y - r * 0.35, r * 0.3, 0, 7); g.fill(); }
    parts.forEach(p => { g.globalAlpha = Math.max(0, 1 - p.t / 1.4); g.fillStyle = p.c; g.beginPath(); p.petal ? g.ellipse(p.x, p.y, 4, 2.5, p.t * 6, 0, 7) : g.arc(p.x, p.y, 2.5, 0, 7); g.fill(); }); g.globalAlpha = 1;
    g.textAlign = "center"; texts.forEach(t => { g.globalAlpha = Math.min(1, (1.6 - t.t) * 2); g.font = `italic ${t.big ? 30 : 18}px 'Iowan Old Style','Baskerville','Georgia',serif`; g.fillStyle = "#4b3a2c"; g.fillText(t.s, t.x, t.y - t.t * 14); }); g.globalAlpha = 1;
  }

  /* ---------- input ---------- */
  const local = e => { const r = cv.getBoundingClientRect(); return [((e.clientX - r.left) - ox) / zoom, ((e.clientY - r.top) - oy) / zoom]; };
  cv.addEventListener("pointerdown", e => { if (state !== "aim" || paused) return; aim = local(e); power = 0; });
  addEventListener("pointermove", e => { if (!aim) return; const [x, y] = local(e), dx = aim[0] - x, dy = aim[1] - y; power = Math.min(1, Math.hypot(dx, dy) / PH.pullMax); if (Math.hypot(dx, dy) > 4) aimAng = Math.atan2(dy, dx); emit("power", power); });
  addEventListener("pointerup", () => { if (!aim) return; aim = null; if (power > 0.05) shoot(aimAng, power); power = 0; emit("power", 0); });
  addEventListener("keydown", e => { if (e.key === "Escape" || e.key === "p") emit("pauseKey"); });
  function shoot(a, p) {
    if (state !== "aim") return false;
    last = { x: ball.x, y: ball.y }; strokes++;
    ball.vx = Math.cos(a) * p * PH.maxShot; ball.vy = Math.sin(a) * p * PH.maxShot; state = "roll"; still = 0;
    Sound.sfx("putt", p); emit("hud"); return true;
  }

  function fit() {
    const top = 70, vw = innerWidth, vh = innerHeight - top - 10; dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = Math.round(vw * dpr); cv.height = Math.round(innerHeight * dpr); cv.style.width = vw + "px"; cv.style.height = innerHeight + "px";
    zoom = Math.min(vw / W, vh / HH); ox = (vw - W * zoom) / 2; oy = top + (vh - HH * zoom) / 2;
  }
  addEventListener("resize", fit); fit();
  let lt = 0; (function loop(t) { const dt = Math.min(0.033, (t - lt) / 1000 || 0.016); lt = t; update(dt); render(); requestAnimationFrame(loop); })(0);

  return {
    on: (n, f) => hooks[n] = f, update, render, shoot,
    playCourse(c) { cards = []; load(c, 0); }, nextHole() { load(ci, hi + 1); }, retryHole() { load(ci, hi); },
    setBall(c) { ballColor = c; }, pause() { paused = true; }, resume() { paused = false; }, quit() { state = "idle"; paint = null; },
    get state() { return state; }, get strokes() { return strokes; }, get hole() { return hole; }, get holeIndex() { return hi; }, get courseIndex() { return ci; },
    get ball() { return ball; }, get cards() { return cards; }, get segs() { return segs; }
  };
})();

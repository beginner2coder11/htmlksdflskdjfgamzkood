/* ==========================================================================
   RINK RALLY — air hockey engine
   Sub-stepped puck physics against rim segments and round goal posts, mallets
   that carry their velocity into hits, a rival AI with speed / reaction / aim /
   aggression, local two-player, faceoffs and groovy goal effects.
   ========================================================================== */
window.Game = (() => {
  const CF = window.GAME_CONFIG, TB = CF.table, PK = CF.puck, ML = CF.mallet, W = TB.w, H = TB.h;
  const cv = document.getElementById("rink"), g = cv.getContext("2d");
  let zoom = 1, dpr = 1, ox = 0, oy = 0;
  const hooks = {}, emit = (n, d) => hooks[n] && hooks[n](d);
  const gx0 = (W - TB.goal) / 2, gx1 = (W + TB.goal) / 2, C = TB.corner;

  const segs = [[0, C, 0, H - C], [W, C, W, H - C], [C, 0, gx0, 0], [gx1, 0, W - C, 0], [C, H, gx0, H], [gx1, H, W - C, H], [0, C, C, 0], [W - C, 0, W, C], [0, H - C, C, H], [W - C, H, W, H - C]];
  const posts = [[gx0, 0], [gx1, 0], [gx0, H], [gx1, H]];
  let puck = { x: W / 2, y: H * 0.7, vx: 0, vy: 0, trail: [] }, me = { x: W / 2, y: H - 80, vx: 0, vy: 0, tx: W / 2, ty: H - 80 }, cpu = { x: W / 2, y: 80, vx: 0, vy: 0, tx: W / 2, ty: 80 };
  let score = [0, 0], state = "idle", rival = CF.rivals[0], two = false, theme = CF.tables[0], hold = 0, paused = false, clock = 0, sparks = [], flash = 0, banner = null, shake = 0, rallyHits = 0;

  /* ---------- match control ---------- */
  function start(opts) {
    rival = opts.rival || CF.rivals[0]; two = !!opts.two; theme = opts.theme || CF.tables[0];
    score = [0, 0]; me = { x: W / 2, y: H - 80, vx: 0, vy: 0, tx: W / 2, ty: H - 80 }; cpu = { x: W / 2, y: 80, vx: 0, vy: 0, tx: W / 2, ty: 80 };
    faceoff(Math.random() < 0.5 ? 0 : 1); state = "play"; paused = false; emit("hud"); Sound.air(true);
  }
  function faceoff(side) { puck = { x: W / 2, y: side === 0 ? H * 0.68 : H * 0.32, vx: 0, vy: 0, trail: [] }; hold = 0.9; rallyHits = 0; Sound.sfx("drop"); }
  function goal(scorer) {
    score[scorer]++; Sound.sfx("goal", scorer === 0); flash = 1; shake = 14;
    banner = { text: scorer === 0 ? "GOAL!" : two ? "GOAL!" : "OUCH!", t: 0, side: scorer };
    for (let i = 0; i < 60; i++) { const a = Math.random() * 6.28, s = 100 + Math.random() * 400; sparks.push({ x: W / 2, y: scorer === 0 ? 0 : H, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0, c: theme.stripes[i % 4], star: i % 3 === 0 }); }
    emit("hud");
    if (score[scorer] >= CF.winScore) { state = "over"; Sound.air(false); setTimeout(() => { Sound.sfx(scorer === 0 || two ? "win" : "lose"); emit("over", { won: scorer === 0, score: score.slice(), rival, two }); }, 900); return; }
    state = "goal"; setTimeout(() => { if (state === "goal") { faceoff(scorer === 0 ? 1 : 0); state = "play"; } }, 1300);
  }

  /* ---------- physics ---------- */
  function hitSeg(ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((puck.x - ax) * dx + (puck.y - ay) * dy) / l));
    const cx = ax + dx * t, cy = ay + dy * t; let nx = puck.x - cx, ny = puck.y - cy; const d = Math.hypot(nx, ny);
    if (d >= PK.r || d === 0) return; nx /= d; ny /= d;
    puck.x = cx + nx * PK.r; puck.y = cy + ny * PK.r;
    const vn = puck.vx * nx + puck.vy * ny; if (vn < 0) { puck.vx -= (1 + PK.wall) * vn * nx; puck.vy -= (1 + PK.wall) * vn * ny; const p = Math.min(1, -vn / 1200); if (-vn > 80) { Sound.sfx("wall", p); spark(cx, cy, 4); } }
  }
  function hitMallet(m, owner) {
    const dx = puck.x - m.x, dy = puck.y - m.y, d = Math.hypot(dx, dy), R = ML.r + PK.r; if (d >= R || d === 0) return;
    const nx = dx / d, ny = dy / d; puck.x = m.x + nx * R; puck.y = m.y + ny * R;
    const rvx = puck.vx - m.vx, rvy = puck.vy - m.vy, vn = rvx * nx + rvy * ny;
    if (vn < 0) {
      puck.vx -= 1.9 * vn * nx; puck.vy -= 1.9 * vn * ny;
      const sp = Math.hypot(puck.vx, puck.vy); if (sp > PK.max) { puck.vx *= PK.max / sp; puck.vy *= PK.max / sp; }
      const p = Math.min(1, -vn / 1400); Sound.sfx("hit", p); spark(puck.x - nx * PK.r, puck.y - ny * PK.r, 6 + p * 10); if (p > 0.6) shake = 5; rallyHits++;
      if (navigator.vibrate && owner === 0) try { navigator.vibrate(10); } catch (e) {}
    }
  }
  function moveMallet(m, dt, minY, maxY, maxSpeed = 2600) {
    const tx = Math.max(ML.r, Math.min(W - ML.r, m.tx)), ty = Math.max(minY, Math.min(maxY, m.ty));
    let dx = tx - m.x, dy = ty - m.y; const d = Math.hypot(dx, dy), step = Math.min(d, maxSpeed * dt, d * Math.min(1, ML.followRate * dt));
    const nx = d ? dx / d * step : 0, ny = d ? dy / d * step : 0;
    m.vx = nx / dt; m.vy = ny / dt; m.x += nx; m.y += ny;
  }
  function think(dt) {
    const r = rival, goalX = W / 2;
    const inMyHalf = puck.y < H / 2, slow = Math.hypot(puck.vx, puck.vy) < 260, coming = puck.vy < 0;
    let tx, ty;
    if (inMyHalf && (slow || (coming && Math.random() < r.aggro)) && puck.y > ML.r) {
      // strike: get behind the puck on the line to the player's goal, aiming at a gap
      if (!cpu.aimX || Math.random() < dt * 2) cpu.aimX = goalX + (Math.random() - 0.5) * TB.goal * (1.6 - r.aim * 1.2) + (Math.random() < r.aim * 0.4 ? (Math.random() < 0.5 ? -1 : 1) * W * 0.3 : 0);
      const dx = cpu.aimX - puck.x, dy = (H + 40) - puck.y, dl = Math.hypot(dx, dy);
      // drive through the puck toward the aim point (bank shots happen when the aim is off to the side)
      tx = puck.x + dx / dl * 30; ty = puck.y + dy / dl * 30;
      if (cpu.y > puck.y - PK.r) { tx = puck.x + (puck.x < W / 2 ? 46 : -46); ty = puck.y - 48; }   // get around a puck that is behind you
    } else {
      // guard: sit between the puck and the goal, a little out from it
      const lead = coming ? Math.min(1, (puck.y) / 500) : 0;
      tx = goalX + (puck.x + puck.vx * 0.15 * lead - goalX) * (0.45 + r.react * 0.4); ty = 70 + (1 - r.react) * 20;
    }
    // reaction: blend toward the new target; stronger rivals react faster
    cpu.tx += (tx - cpu.tx) * Math.min(1, dt * (3 + r.react * 14)); cpu.ty += (ty - cpu.ty) * Math.min(1, dt * (3 + r.react * 14));
  }
  function step(dt) {
    clock += dt; if (paused) return;
    sparks.forEach(s => { s.t += dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vx *= 0.96; s.vy *= 0.96; }); sparks = sparks.filter(s => s.t < 0.9);
    if (banner) { banner.t += dt; if (banner.t > 1.3) banner = null; }
    flash = Math.max(0, flash - dt * 2); shake = Math.max(0, shake - dt * 40);
    if (state !== "play") { moveMallet(me, dt, H / 2 + ML.r, H - ML.r); return; }
    if (!two) think(dt);
    const sub = 6, h = dt / sub;
    for (let i = 0; i < sub; i++) {
      moveMallet(me, h, H / 2 + ML.r, H - ML.r); moveMallet(cpu, h, ML.r, H / 2 - ML.r, two ? 2600 : rival.speed);
      if (hold > 0) { hold -= h; continue; }
      const f = Math.max(0, 1 - PK.friction * h); puck.vx *= f; puck.vy *= f;
      puck.x += puck.vx * h; puck.y += puck.vy * h;
      if (!(puck.x > gx0 + 4 && puck.x < gx1 - 4 && (puck.y < PK.r + 2 || puck.y > H - PK.r - 2))) segs.forEach(s => hitSeg(...s));
      else { if (puck.x - PK.r < gx0) puck.x = gx0 + PK.r; if (puck.x + PK.r > gx1) puck.x = gx1 - PK.r; }
      posts.forEach(([x, y]) => hitSeg(x, y, x, y));
      hitMallet(me, 0); hitMallet(cpu, 1);
      if (puck.y < -PK.r) { goal(0); return; } if (puck.y > H + PK.r) { goal(1); return; }
    }
    // a dead puck sitting still gets a nudge so the game never stalls
    if (Math.hypot(puck.vx, puck.vy) < 4) { puck.still = (puck.still || 0) + dt; if (puck.still > 4 && !two && puck.y < H / 2) { puck.vx = (Math.random() - 0.5) * 200; puck.vy = 120; puck.still = 0; } } else puck.still = 0;
    puck.trail.push(puck.x, puck.y); if (puck.trail.length > 24) puck.trail.splice(0, 2);
  }
  function spark(x, y, n) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, s = 60 + Math.random() * 220; sparks.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0.4, c: "#fff5d6", star: Math.random() < 0.3 }); } }

  /* ---------- drawing ---------- */
  function star(x, y, r) { g.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr = i % 2 ? r * 0.4 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fill(); }
  function drawTable() {
    // rim
    g.fillStyle = theme.rim; g.beginPath(); g.roundRect(-18, -18, W + 36, H + 36, 46); g.fill();
    g.fillStyle = "rgba(255,255,255,.12)"; g.beginPath(); g.roundRect(-12, -12, W + 24, 10, 6); g.fill();
    // felt
    g.save(); g.beginPath(); g.moveTo(C, 0); g.lineTo(W - C, 0); g.lineTo(W, C); g.lineTo(W, H - C); g.lineTo(W - C, H); g.lineTo(C, H); g.lineTo(0, H - C); g.lineTo(0, C); g.closePath(); g.clip();
    g.fillStyle = theme.felt; g.fillRect(0, 0, W, H);
    // groovy stripe arcs around each goal
    [[W / 2, 0], [W / 2, H]].forEach(([cx, cy]) => { theme.stripes.forEach((col, i) => { g.strokeStyle = col; g.lineWidth = 16; g.beginPath(); g.arc(cx, cy, 120 + i * 16, 0, Math.PI * 2); g.stroke(); }); g.fillStyle = theme.felt; g.beginPath(); g.arc(cx, cy, 112, 0, 7); g.fill(); });
    // air holes
    g.fillStyle = "rgba(91,58,36,.12)"; for (let y = 24; y < H; y += 24) for (let x = 16 + (y / 24 % 2) * 12; x < W; x += 24) { g.beginPath(); g.arc(x, y, 1.6, 0, 7); g.fill(); }
    // centre line + circle with logo
    g.strokeStyle = theme.stripes[2]; g.lineWidth = 5; g.beginPath(); g.moveTo(0, H / 2); g.lineTo(W, H / 2); g.stroke();
    g.fillStyle = theme.felt; g.beginPath(); g.arc(W / 2, H / 2, 58, 0, 7); g.fill(); g.lineWidth = 5; g.stroke();
    theme.stripes.forEach((c, i) => { g.strokeStyle = c; g.lineWidth = 4; g.beginPath(); g.arc(W / 2, H / 2, 46 - i * 6, Math.PI * (1 + i * 0.05), Math.PI * (2 - i * 0.05)); g.stroke(); });
    g.fillStyle = theme.rim; g.font = "italic 900 26px 'Cooper Black','Cooper Std','Recoleta','Georgia',serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("RR", W / 2, H / 2 + 12);
    g.restore();
    // goals
    g.fillStyle = "#1e130b"; g.fillRect(gx0, -14, TB.goal, 14); g.fillRect(gx0, H, TB.goal, 14);
    posts.forEach(([x, y]) => { g.fillStyle = "#f2e2c2"; g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill(); });
  }
  function drawMallet(m, color) {
    g.fillStyle = "rgba(0,0,0,.22)"; g.beginPath(); g.arc(m.x + 4, m.y + 6, ML.r, 0, 7); g.fill();
    const gr = g.createRadialGradient(m.x - 8, m.y - 10, 4, m.x, m.y, ML.r); gr.addColorStop(0, "#fff"); gr.addColorStop(0.25, color); gr.addColorStop(1, shade(color, 0.6));
    g.fillStyle = gr; g.beginPath(); g.arc(m.x, m.y, ML.r, 0, 7); g.fill();
    g.strokeStyle = "rgba(0,0,0,.25)"; g.lineWidth = 3; g.beginPath(); g.arc(m.x, m.y, ML.r - 6, 0, 7); g.stroke();
    g.fillStyle = shade(color, 0.75); g.beginPath(); g.arc(m.x, m.y, 12, 0, 7); g.fill(); g.fillStyle = "rgba(255,255,255,.55)"; g.beginPath(); g.arc(m.x - 4, m.y - 4, 4, 0, 7); g.fill();
  }
  function shade(hex, f) { const p = parseInt(hex.slice(1), 16), c = s => Math.round(((p >> s) & 255) * f); return `rgb(${c(16)},${c(8)},${c(0)})`; }
  function render() {
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.fillStyle = "#2a1a10"; g.fillRect(0, 0, cv.width, cv.height);
    g.setTransform(zoom * dpr, 0, 0, zoom * dpr, (ox + (Math.random() - 0.5) * shake) * dpr, (oy + (Math.random() - 0.5) * shake) * dpr);
    drawTable();
    for (let i = 0; i < puck.trail.length; i += 2) { g.globalAlpha = i / puck.trail.length * 0.3; g.fillStyle = theme.stripes[1]; g.beginPath(); g.arc(puck.trail[i], puck.trail[i + 1], PK.r * (0.4 + i / puck.trail.length * 0.5), 0, 7); g.fill(); } g.globalAlpha = 1;
    if (hold > 0 && state === "play") { g.strokeStyle = `rgba(91,58,36,${0.3 + Math.sin(clock * 12) * 0.2})`; g.lineWidth = 3; g.beginPath(); g.arc(puck.x, puck.y, PK.r + 10, 0, 7); g.stroke(); }
    g.fillStyle = "rgba(0,0,0,.25)"; g.beginPath(); g.arc(puck.x + 3, puck.y + 4, PK.r, 0, 7); g.fill();
    g.fillStyle = "#2b1d14"; g.beginPath(); g.arc(puck.x, puck.y, PK.r, 0, 7); g.fill();
    theme.stripes.forEach((c, i) => { g.strokeStyle = c; g.lineWidth = 2.2; g.beginPath(); g.arc(puck.x, puck.y, PK.r - 3 - i * 3, 0, 7); g.stroke(); });
    drawMallet(cpu, two ? "#3b6fd1" : rival.color); drawMallet(me, "#e3742b");
    sparks.forEach(s => { g.globalAlpha = Math.max(0, 1 - s.t / 0.9); g.fillStyle = s.c; s.star ? star(s.x, s.y, 6) : (g.beginPath(), g.arc(s.x, s.y, 3, 0, 7), g.fill()); }); g.globalAlpha = 1;
    if (banner) {
      const k = Math.min(1, banner.t * 4), y = banner.side === 0 ? H * 0.3 : H * 0.7;
      g.save(); g.translate(W / 2, y); g.rotate(-0.08); g.scale(0.6 + k * 0.4, 0.6 + k * 0.4);
      theme.stripes.forEach((c, i) => { g.fillStyle = c; g.fillRect(-W, -40 + i * 20, W * 2, 20); });
      g.font = "italic 900 72px 'Cooper Black','Cooper Std','Recoleta','Georgia',serif"; g.textAlign = "center"; g.textBaseline = "middle";
      g.lineWidth = 10; g.strokeStyle = "#2a1a10"; g.strokeText(banner.text, 0, 6); g.fillStyle = "#fff5d6"; g.fillText(banner.text, 0, 6); g.restore();
    }
    if (flash) { g.fillStyle = `rgba(255,245,214,${flash * 0.3})`; g.fillRect(-20, -20, W + 40, H + 40); }
  }

  /* ---------- input (multi-touch for two players) ---------- */
  const local = e => { const r = cv.getBoundingClientRect(); return [((e.clientX - r.left) - ox) / zoom, ((e.clientY - r.top) - oy) / zoom]; };
  const owners = new Map();
  cv.addEventListener("pointerdown", e => { const [x, y] = local(e); const who = two && y < H / 2 ? cpu : me; owners.set(e.pointerId, who); who.tx = x; who.ty = y - (who === me ? 34 : -34); cv.setPointerCapture && cv.setPointerCapture(e.pointerId); });
  cv.addEventListener("pointermove", e => { const who = owners.get(e.pointerId) || (e.pointerType === "mouse" ? me : null); if (!who) return; const [x, y] = local(e); who.tx = x; who.ty = y - (who === me ? 34 : -34); });
  const lift = e => owners.delete(e.pointerId); cv.addEventListener("pointerup", lift); cv.addEventListener("pointercancel", lift);
  addEventListener("keydown", e => { if (e.key === "Escape" || e.key === "p") emit("pauseKey"); });

  function fit() {
    const top = 56, vw = innerWidth, vh = innerHeight - top; dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = Math.round(vw * dpr); cv.height = Math.round(innerHeight * dpr); cv.style.width = vw + "px"; cv.style.height = innerHeight + "px";
    zoom = Math.min((vw - 24) / (W + 36), (vh - 16) / (H + 36)); ox = (vw - W * zoom) / 2; oy = top + (vh - H * zoom) / 2;
  }
  addEventListener("resize", fit); fit();
  let lt = 0; (function loop(t) { const dt = Math.min(0.033, (t - lt) / 1000 || 0.016); lt = t; step(dt); render(); requestAnimationFrame(loop); })(0);

  return {
    on: (n, f) => hooks[n] = f, start, step, render,
    pause() { paused = true; Sound.air(false); }, resume() { paused = false; Sound.air(state === "play"); }, quit() { state = "idle"; Sound.air(false); },
    aimMe(x, y) { me.tx = x; me.ty = y; },
    get score() { return score; }, get state() { return state; }, get puck() { return puck; }, get me() { return me; }, get cpu() { return cpu; }, get rival() { return rival; }, get two() { return two; }
  };
})();

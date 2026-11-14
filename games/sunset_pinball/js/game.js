/* ==========================================================================
   SUNSET PINBALL — physics table
   Sub-stepped circle physics against segments, capsules (flippers with real
   surface velocity), pop bumpers, slingshot kickers, drop targets, rollover
   lanes, a capture saucer, plunger, ball save, missions and multiball.
   ========================================================================== */
window.Game = (() => {
  const CF = window.GAME_CONFIG, PH = CF.physics, SC = CF.scores;
  const W = 400, H = 720, BR = 9;
  const cv = document.getElementById("table"), g = cv.getContext("2d");
  let scale = 1, dpr = 1, theme = CF.themes[0], clock = 0;
  const hooks = {}, emit = (n, d) => hooks[n] && hooks[n](d);

  /* ---------- table geometry ---------- */
  const segs = [];
  const seg = (ax, ay, bx, by, o = {}) => segs.push({ ax, ay, bx, by, e: o.e ?? PH.wallBounce, kick: o.kick || 0, kind: o.kind || "wall", oneway: o.oneway || null, id: o.id });
  const poly = (pts, o) => { for (let i = 0; i < pts.length - 1; i++) seg(...pts[i], ...pts[i + 1], o); };
  // outer shell: left wall, arched top, right wall, plunger lane
  const arc = []; for (let a = Math.PI; a <= Math.PI * 2 + 0.001; a += Math.PI / 28) arc.push([201 + Math.cos(a) * 179, 200 + Math.sin(a) * 179]);
  poly([[22, 562], [22, 200], ...arc.slice(1, -1), [380, 200], [380, 704]]);
  seg(350, 704, 380, 704);                                   // plunger floor
  poly([[350, 704], [350, 252]]);                            // lane inner wall
  seg(350, 252, 380, 252, { oneway: [0, -1], kind: "gate" }); // lets the ball up, never back down
  // inlanes guide the ball onto the flippers
  poly([[22, 562], [124, 628]]); poly([[350, 562], [246, 628]]);   // end flush with the flipper tops
  // slingshots (the long inner edge kicks)
  const sling = (A, B, Cc) => { seg(...A, ...B); seg(...B, ...Cc); seg(...A, ...Cc, { kick: PH.slingKick, kind: "sling", e: 0.4 }); };
  sling([50, 468], [50, 548], [102, 582]); sling([320, 468], [320, 548], [268, 582]);
  // rollover lane posts at the top
  const lanePosts = [118, 163, 208, 253];
  lanePosts.forEach(x => seg(x, 88, x, 122, { e: 0.3 }));
  const lanes = [{ x: 140, lit: false, ch: "S" }, { x: 185, lit: false, ch: "U" }, { x: 230, lit: false, ch: "N" }];

  const bumpers = [{ x: 120, y: 236, r: 23, flash: 0 }, { x: 250, y: 236, r: 23, flash: 0 }, { x: 185, y: 316, r: 23, flash: 0 }];
  const targets = [0, 1, 2, 3].map(i => ({ x: 24, y: 292 + i * 24, h: 20, up: true, flash: 0 }));
  const saucer = { x: 296, y: 404, r: 13, hold: 0, ball: null, flash: 0 };
  const flippers = [
    { px: 122, py: 636, dir: 1, len: 60, a: 0.52, prev: 0.52, up: false, rest: 0.52, top: -0.45 },
    { px: 248, py: 636, dir: -1, len: 60, a: 0.52, prev: 0.52, up: false, rest: 0.52, top: -0.45 }
  ];
  const tip = f => [f.px + f.dir * Math.cos(f.a) * f.len, f.py + Math.sin(f.a) * f.len];

  /* ---------- run state ---------- */
  let balls = [], ballNo = 1, score = 0, mult = 1, state = "idle", paused = false;
  let charge = 0, charging = false, saveT = 0, mission = 0, missionCount = 0, extraIdx = 0, extraBalls = 0, missionsDone = 0;
  let sparks = [], popups = [], flash = 0, shake = 0, bonus = 0;

  function newBall(inLane = true) { const b = { x: 365, y: 690, vx: 0, vy: 0, lane: inLane, trail: [] }; balls.push(b); return b; }
  function start() {
    balls = []; ballNo = 1; score = 0; mult = 1; mission = 0; missionCount = 0; extraIdx = 0; extraBalls = 0; missionsDone = 0; bonus = 0;
    targets.forEach(t => t.up = true); lanes.forEach(l => l.lit = false);
    newBall(); state = "plunger"; paused = false; saveT = CF.ballSave;
    emit("display", { text: "BALL 1  ·  PULL TO LAUNCH", kind: "info" }); emit("hud");
  }
  function add(pts, x, y) {
    const v = pts * mult; score += v; bonus += Math.round(pts / 10);
    if (x !== undefined && pts >= 250) popups.push({ x, y, t: 0, s: "+" + v });
    if (extraIdx < CF.extraBallAt.length && score >= CF.extraBallAt[extraIdx]) { extraIdx++; extraBalls++; Sound.sfx("extra"); emit("display", { text: "EXTRA BALL!", kind: "big" }); }
    emit("hud");
  }
  function progress(id, n = 1) {
    const m = CF.missions[mission % CF.missions.length]; if (m.id !== id) return;
    missionCount += n;
    if (missionCount >= m.need) {
      missionsDone++; Sound.sfx(missionsDone % 3 === 0 ? "jackpot" : "mission");
      add(SC.mission * missionsDone); mult = Math.min(6, mult + 1);
      emit("display", { text: `${m.text} COMPLETE  ·  ${mult}X`, kind: "big" }); flash = 0.5;
      if (missionsDone % 3 === 0) multiball();
      mission++; missionCount = 0;
      setTimeout(() => emit("display", { text: "MISSION: " + CF.missions[mission % CF.missions.length].text, kind: "info" }), 2200);
    } else emit("mission", { m, n: missionCount });
    emit("hud");
  }
  function multiball() {
    emit("display", { text: "MULTIBALL!", kind: "big" });
    const b = newBall(false); b.x = 365; b.y = 600; b.vy = -PH.plungerMax; b.lane = false;
  }

  /* ---------- physics helpers ---------- */
  function closest(ax, ay, bx, by, px, py) {
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2));
    return [ax + dx * t, ay + dy * t, t];
  }
  function hitSeg(b, s) {
    const [cx, cy] = closest(s.ax, s.ay, s.bx, s.by, b.x, b.y);
    let nx = b.x - cx, ny = b.y - cy; const d = Math.hypot(nx, ny);
    if (d >= BR || d === 0) return false;
    nx /= d; ny /= d;
    if (s.oneway) { const [ox, oy] = s.oneway; if (b.vx * ox + b.vy * oy > 0) return false; if (ny * oy + nx * ox < 0) return false; }
    b.x = cx + nx * BR; b.y = cy + ny * BR;
    const vn = b.vx * nx + b.vy * ny;
    if (vn < 0) {
      b.vx -= (1 + s.e) * vn * nx; b.vy -= (1 + s.e) * vn * ny;
      b.vx *= 0.995; b.vy *= 0.995;
      if (s.kick && -vn > 40) { b.vx += nx * s.kick; b.vy += ny * s.kick; Sound.sfx("sling"); add(SC.sling); burst(cx, cy, theme.glow, 6); progress("sling"); s.flash = 1; }
      else if (-vn > 220) Sound.sfx("wall", -vn / 3000);
    }
    return true;
  }
  function hitFlipper(b, f, dt) {
    const [tx, ty] = tip(f), [cx, cy, t] = closest(f.px, f.py, tx, ty, b.x, b.y);
    const rad = 8 - t * 3;
    let nx = b.x - cx, ny = b.y - cy; const d = Math.hypot(nx, ny);
    if (d >= BR + rad || d === 0) return;
    nx /= d; ny /= d;
    b.x = cx + nx * (BR + rad); b.y = cy + ny * (BR + rad);
    const w = (f.a - f.prev) / dt, L = t * f.len;              // surface velocity of the contact point
    const sx = -f.dir * Math.sin(f.a) * L * w, sy = Math.cos(f.a) * L * w;
    const rvx = b.vx - sx, rvy = b.vy - sy, vn = rvx * nx + rvy * ny;
    if (vn < 0) { b.vx -= (1 + PH.flipperBounce) * vn * nx; b.vy -= (1 + PH.flipperBounce) * vn * ny; }
  }
  function hitBumper(b, p) {
    const dx = b.x - p.x, dy = b.y - p.y, d = Math.hypot(dx, dy);
    if (d >= BR + p.r) return;
    const nx = dx / d, ny = dy / d; b.x = p.x + nx * (BR + p.r); b.y = p.y + ny * (BR + p.r);
    const vn = b.vx * nx + b.vy * ny; b.vx -= 2 * vn * nx; b.vy -= 2 * vn * ny;
    b.vx += nx * PH.bumperKick * 0.55; b.vy += ny * PH.bumperKick * 0.55;
    p.flash = 1; Sound.sfx("bumper"); add(SC.bumper); burst(p.x + nx * p.r, p.y + ny * p.r, theme.glow, 10); shake = Math.max(shake, 3);
    progress("bumpers");
  }
  function hitTargets(b) {
    for (const t of targets) {
      if (!t.up) continue;
      if (b.x - BR < t.x + 10 && b.y > t.y && b.y < t.y + t.h && b.vx < 0) {
        t.up = false; t.flash = 1; b.vx = Math.abs(b.vx) * 0.6 + 60; b.x = t.x + 10 + BR;
        Sound.sfx("target"); add(SC.target, 60, t.y); burst(t.x + 10, t.y + 10, theme.accent, 8);
        if (targets.every(x => !x.up)) {
          Sound.sfx("targetsAll"); add(SC.allTargets, 80, 330); progress("targets");
          emit("display", { text: "TARGETS DOWN!", kind: "big" });
          setTimeout(() => targets.forEach(x => x.up = true), 2500);
        }
      }
    }
  }
  function sensors(b, py) {
    // top lanes: ball crossing y=105 downward
    if (py < 105 && b.y >= 105) for (const l of lanes) if (Math.abs(b.x - l.x) < 18 && !l.lit) {
      l.lit = true; Sound.sfx("lane"); add(SC.lane, l.x, 100);
      if (lanes.every(x => x.lit)) { Sound.sfx("laneSet"); add(SC.laneSet, 185, 140); mult = Math.min(6, mult + 1); emit("display", { text: `S-U-N!  BONUS ${mult}X`, kind: "big" }); progress("lanes"); setTimeout(() => lanes.forEach(x => x.lit = false), 1200); }
    }
    // saucer captures a slow-ish ball
    if (!saucer.ball && saucer.cool <= 0 && Math.hypot(b.x - saucer.x, b.y - saucer.y) < saucer.r && Math.hypot(b.vx, b.vy) < 1100) {
      saucer.ball = b; saucer.hold = 1.1; b.vx = b.vy = 0; b.x = saucer.x; b.y = saucer.y;
      Sound.sfx("saucer"); add(SC.saucer, saucer.x, saucer.y - 20); progress("saucer"); flash = 0.25;
    }
  }

  /* ---------- simulation ---------- */
  function step(dt) {
    clock += dt;
    if (state === "idle" || paused) return;
    flippers.forEach(f => { f.prev = f.a; const target = f.up ? f.top : f.rest, sp = PH.flipperSpeed * dt; f.a += Math.max(-sp, Math.min(sp, target - f.a)); });
    if (charging) { charge = Math.min(1, charge + dt / 1.1); if (Math.random() < 0.2) Sound.sfx("charge"); }
    if (saveT > 0 && state === "play") saveT -= dt;
    saucer.cool = (saucer.cool || 0) - dt;
    if (saucer.ball) { saucer.hold -= dt; if (saucer.hold <= 0) { const b = saucer.ball; saucer.ball = null; saucer.cool = 0.8; b.vx = -420; b.vy = -620; b.x -= 12; b.y -= 16; Sound.sfx("kick"); shake = 6; burst(saucer.x, saucer.y, theme.accent, 16); } }
    const sub = 10, h = dt / sub;
    let fastest = 0;
    for (const b of balls) {
      if (b === saucer.ball) continue;
      if (b.lane && state === "plunger") { b.x = 365; b.y = 690 + charge * 10; b.vx = b.vy = 0; continue; }
      for (let i = 0; i < sub; i++) {
        const py = b.y;
        b.vy += PH.gravity * h;
        const sp = Math.hypot(b.vx, b.vy); if (sp > PH.maxSpeed) { b.vx *= PH.maxSpeed / sp; b.vy *= PH.maxSpeed / sp; }
        b.x += b.vx * h; b.y += b.vy * h;
        for (const s of segs) hitSeg(b, s);
        for (const f of flippers) hitFlipper(b, f, h * sub);
        for (const p of bumpers) hitBumper(b, p);
        hitTargets(b); sensors(b, py);
      }
      if (b.lane && b.y < 240) b.lane = false;
      // a weak launch rolls back down the lane: let the player pull again
      if (state === "play" && balls.length === 1 && b.x > 352 && b.y > 660 && Math.abs(b.vy) < 30) { b.lane = true; state = "plunger"; }
      fastest = Math.max(fastest, Math.hypot(b.vx, b.vy));
      // ball search: a ball resting somewhere odd for 3 s gets a nudge (never on the flippers or in the lane)
      const resting = Math.hypot(b.vx, b.vy) < 25 && !b.lane;
      b.still = resting ? (b.still || 0) + dt : 0;
      if (b.still > (b.y < 590 ? 3 : 7)) { b.still = 0; b.vx = (Math.random() - 0.5) * 500; b.vy = -350; emit("display", { text: "BALL SEARCH", kind: "info" }); }
      b.trail.push(b.x, b.y); if (b.trail.length > 14) b.trail.splice(0, 2);
    }
    Sound.rolling(fastest);
    // drains
    const gone = balls.filter(b => b.y > H + 20);
    if (gone.length) {
      balls = balls.filter(b => b.y <= H + 20);
      if (!balls.length) drain();
    }
    bumpers.forEach(p => p.flash = Math.max(0, p.flash - dt * 4));
    segs.forEach(s => s.flash && (s.flash = Math.max(0, s.flash - dt * 5)));
    sparks.forEach(s => { s.t += dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 300 * dt; }); sparks = sparks.filter(s => s.t < s.life);
    popups.forEach(p => { p.t += dt; p.y -= 30 * dt; }); popups = popups.filter(p => p.t < 1);
    flash = Math.max(0, flash - dt); shake = Math.max(0, shake - dt * 20);
  }
  function drain() {
    if (saveT > 0) { Sound.sfx("save"); emit("display", { text: "BALL SAVED", kind: "big" }); newBall(); state = "plunger"; saveT = CF.ballSave; return; }
    Sound.sfx("drain");
    const b = bonus * mult; score += b; bonus = 0;
    emit("display", { text: `BONUS ${b}`, kind: "info" });
    mult = 1;
    if (extraBalls > 0) { extraBalls--; emit("display", { text: "SHOOT AGAIN", kind: "big" }); newBall(); state = "plunger"; saveT = CF.ballSave; emit("hud"); return; }
    if (ballNo >= CF.balls) { state = "over"; Sound.sfx("over"); setTimeout(() => emit("over", { score, missions: missionsDone }), 900); emit("hud"); return; }
    ballNo++; newBall(); state = "plunger"; saveT = CF.ballSave;
    setTimeout(() => emit("display", { text: `BALL ${ballNo}  ·  PULL TO LAUNCH`, kind: "info" }), 1500);
    emit("hud");
  }

  /* ---------- controls ---------- */
  function flip(side, on) {
    if (state === "idle" || state === "over" || paused) return;
    const f = flippers[side === "left" ? 0 : 1];
    if (on && !f.up) Sound.sfx("flip");
    f.up = on;
  }
  function pull(on) {
    if (state !== "plunger" || paused) return;
    if (on) { charging = true; return; }
    if (!charging) return;
    charging = false;
    const b = balls.find(x => x.lane); if (!b) return;
    const p = Math.max(0.45, charge); charge = 0;
    b.vy = -PH.plungerMax * p; b.y = 690; state = "play"; Sound.sfx("launch", p);
    emit("display", { text: "MISSION: " + CF.missions[mission % CF.missions.length].text, kind: "info" });
  }
  const touches = new Map();
  function zone(e) { const r = cv.getBoundingClientRect(); return (e.clientX - r.left) / r.width < 0.5 ? "left" : "right"; }
  cv.addEventListener("pointerdown", e => {
    e.preventDefault(); cv.setPointerCapture && cv.setPointerCapture(e.pointerId);
    if (state === "plunger") { touches.set(e.pointerId, "pull"); pull(true); return; }
    const z = zone(e); touches.set(e.pointerId, z); flip(z, true);
  });
  const release = e => {
    const z = touches.get(e.pointerId); touches.delete(e.pointerId);
    if (z === "pull") pull(false); else if (z && ![...touches.values()].includes(z)) flip(z, false);
  };
  cv.addEventListener("pointerup", release); cv.addEventListener("pointercancel", release);
  const keymap = { ArrowLeft: "left", z: "left", Z: "left", Shift: "left", ArrowRight: "right", "/": "right", m: "right", M: "right" };
  addEventListener("keydown", e => {
    if (e.repeat) return;
    if (keymap[e.key]) flip(keymap[e.key], true);
    if (e.key === " " || e.key === "ArrowDown" || e.key === "Enter") { e.preventDefault(); pull(true); }
    if (e.key === "Escape" || e.key === "p") emit("pauseKey");
  });
  addEventListener("keyup", e => { if (keymap[e.key]) flip(keymap[e.key], false); if (e.key === " " || e.key === "ArrowDown" || e.key === "Enter") pull(false); });

  /* ---------- drawing ---------- */
  function burst(x, y, color, n) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, s = 60 + Math.random() * 240; sparks.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0, life: 0.3 + Math.random() * 0.4, color }); } }
  let bgCache = null, bgKey = "";
  function background() {
    if (bgCache && bgKey === theme.id) return bgCache;
    bgKey = theme.id; bgCache = document.createElement("canvas"); bgCache.width = W * 2; bgCache.height = H * 2;
    const x = bgCache.getContext("2d"); x.scale(2, 2);
    const sky = x.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, theme.sky[0]); sky.addColorStop(0.5, theme.sky[1]); sky.addColorStop(1, theme.sky[2]);
    x.fillStyle = sky; x.fillRect(0, 0, W, H);
    // big setting sun with stripes
    x.save(); x.beginPath(); x.arc(186, 470, 120, 0, 7); x.clip();
    const sun = x.createLinearGradient(0, 350, 0, 590); sun.addColorStop(0, "#fff1a8"); sun.addColorStop(1, theme.accent); x.fillStyle = sun; x.fillRect(60, 340, 260, 260);
    x.fillStyle = theme.sky[2]; for (let i = 0; i < 7; i++) x.fillRect(60, 480 + i * 16, 260, 3 + i * 1.2);
    x.restore();
    // sea + palms
    x.fillStyle = theme.palm; x.globalAlpha = 0.55; x.fillRect(22, 560, 330, 200); x.globalAlpha = 1;
    const palm = (px, py, s, flip) => {
      x.save(); x.translate(px, py); x.scale(flip * s, s); x.fillStyle = theme.palm; x.strokeStyle = theme.palm; x.lineCap = "round";
      x.lineWidth = 9; x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(14, -80, 2, -160); x.stroke();
      for (let i = 0; i < 6; i++) { x.save(); x.translate(2, -160); x.rotate(-2.6 + i * 0.55); x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(40, -24, 78, 10); x.quadraticCurveTo(40, -8, 0, 0); x.fill(); x.restore(); }
      x.restore();
    };
    palm(38, 600, 0.9, 1); palm(338, 610, 0.8, -1); palm(70, 640, 0.55, 1);
    // inlane + playfield inserts (light arrows)
    x.globalAlpha = 0.18; x.fillStyle = "#fff";
    for (let i = 0; i < 3; i++) { x.beginPath(); x.moveTo(185, 420 - i * 30); x.lineTo(200, 440 - i * 30); x.lineTo(170, 440 - i * 30); x.fill(); }
    x.globalAlpha = 1;
    return bgCache;
  }
  function wood(path, wdt) {
    g.lineCap = "round"; g.lineJoin = "round";
    g.strokeStyle = "rgba(0,0,0,.35)"; g.lineWidth = wdt + 4; path(); g.stroke();
    g.strokeStyle = theme.wood; g.lineWidth = wdt; path(); g.stroke();
    g.strokeStyle = "rgba(255,230,190,.35)"; g.lineWidth = 2; path(); g.stroke();
  }
  function render() {
    g.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
    g.save();
    if (shake) g.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    g.drawImage(background(), 0, 0, W, H);
    // rails
    segs.forEach(s => {
      if (s.kind === "sling") return;
      wood(() => { g.beginPath(); g.moveTo(s.ax, s.ay); g.lineTo(s.bx, s.by); }, s.kind === "gate" ? 3 : 7);
    });
    // slingshot rubbers
    segs.filter(s => s.kind === "sling").forEach(s => { g.strokeStyle = s.flash ? "#fff" : theme.glow; g.lineWidth = 5 + (s.flash || 0) * 3; g.lineCap = "round"; g.beginPath(); g.moveTo(s.ax, s.ay); g.lineTo(s.bx, s.by); g.stroke(); });
    // lanes
    g.font = "900 15px 'Avenir Next','Trebuchet MS',sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
    lanes.forEach(l => {
      g.fillStyle = l.lit ? theme.glow : "rgba(255,255,255,.18)";
      if (l.lit) { g.shadowColor = theme.glow; g.shadowBlur = 16; }
      g.beginPath(); g.arc(l.x, 140, 11, 0, 7); g.fill(); g.shadowBlur = 0;
      g.fillStyle = l.lit ? "#5b2a1a" : "rgba(255,255,255,.6)"; g.fillText(l.ch, l.x, 141);
    });
    // drop targets
    targets.forEach(t => {
      if (!t.up) { g.fillStyle = "rgba(0,0,0,.3)"; g.fillRect(t.x, t.y, 6, t.h); return; }
      g.fillStyle = theme.accent; g.fillRect(t.x, t.y, 10, t.h); g.fillStyle = "rgba(255,255,255,.5)"; g.fillRect(t.x + 6, t.y + 2, 2, t.h - 4);
    });
    // saucer (the volcano)
    g.fillStyle = "#3a1a10"; g.beginPath(); g.moveTo(saucer.x - 30, saucer.y + 16); g.lineTo(saucer.x - 10, saucer.y - 12); g.lineTo(saucer.x + 10, saucer.y - 12); g.lineTo(saucer.x + 30, saucer.y + 16); g.fill();
    const lava = 0.6 + Math.sin(clock * 5) * 0.3;
    g.fillStyle = `rgba(255,${120 + lava * 60},40,${saucer.ball ? 1 : 0.8})`; g.beginPath(); g.ellipse(saucer.x, saucer.y, saucer.r + 2, 7, 0, 0, 7); g.fill();
    if (saucer.ball) { g.fillStyle = "rgba(255,200,80,.5)"; g.beginPath(); g.arc(saucer.x, saucer.y - 20, 18 + Math.sin(clock * 20) * 4, 0, 7); g.fill(); }
    // bumpers as hibiscus flowers
    bumpers.forEach(p => {
      const f = p.flash;
      g.save(); g.translate(p.x, p.y); g.rotate(clock * 0.4);
      if (f) { g.shadowColor = theme.glow; g.shadowBlur = 30 * f; }
      g.fillStyle = theme.accent;
      for (let i = 0; i < 5; i++) { g.rotate(Math.PI * 2 / 5); g.beginPath(); g.ellipse(0, -p.r * 0.55, p.r * 0.5, p.r * 0.62, 0, 0, 7); g.fill(); }
      g.shadowBlur = 0;
      g.fillStyle = f ? "#fff" : theme.glow; g.beginPath(); g.arc(0, 0, p.r * 0.42 + f * 4, 0, 7); g.fill();
      g.strokeStyle = "rgba(255,255,255,.7)"; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, p.r * (1 + f * 0.3), 0, 7); g.globalAlpha = 0.3 + f * 0.7; g.stroke(); g.globalAlpha = 1;
      g.restore();
    });
    // flippers
    flippers.forEach(f => {
      const [tx, ty] = tip(f);
      g.lineCap = "round"; g.strokeStyle = "rgba(0,0,0,.35)"; g.lineWidth = 17; g.beginPath(); g.moveTo(f.px + 2, f.py + 4); g.lineTo(tx + 2, ty + 4); g.stroke();
      const grd = g.createLinearGradient(f.px, f.py - 8, f.px, f.py + 8); grd.addColorStop(0, "#fffaf0"); grd.addColorStop(1, "#e7d2b2");
      g.strokeStyle = grd; g.lineWidth = 15; g.beginPath(); g.moveTo(f.px, f.py); g.lineTo(tx, ty); g.stroke();
      g.strokeStyle = theme.accent; g.lineWidth = 4; g.beginPath(); g.moveTo(f.px, f.py); g.lineTo(tx, ty); g.stroke();
      g.fillStyle = theme.wood; g.beginPath(); g.arc(f.px, f.py, 5, 0, 7); g.fill();
    });
    // plunger
    const pz = 704 - 6 + charge * 10;
    g.fillStyle = "#c9c9c9"; g.fillRect(358, pz, 14, 6); g.fillStyle = "#888"; g.fillRect(362, pz + 6, 6, 18);
    if (state === "plunger") { g.fillStyle = "rgba(0,0,0,.4)"; g.fillRect(384, 560, 8, 130); g.fillStyle = charge > 0.85 ? "#ff5a3c" : theme.glow; g.fillRect(384, 690 - charge * 130, 8, charge * 130); }
    // balls
    balls.forEach(b => {
      for (let i = 0; i < b.trail.length; i += 2) { g.globalAlpha = i / b.trail.length * 0.25; g.fillStyle = theme.glow; g.beginPath(); g.arc(b.trail[i], b.trail[i + 1], BR * 0.8, 0, 7); g.fill(); }
      g.globalAlpha = 1;
      g.fillStyle = "rgba(0,0,0,.35)"; g.beginPath(); g.arc(b.x + 3, b.y + 4, BR, 0, 7); g.fill();
      const cg = g.createRadialGradient(b.x - 3, b.y - 3, 1, b.x, b.y, BR); cg.addColorStop(0, "#ffffff"); cg.addColorStop(0.35, "#d9dde3"); cg.addColorStop(0.8, "#6c7380"); cg.addColorStop(1, "#2e323a");
      g.fillStyle = cg; g.beginPath(); g.arc(b.x, b.y, BR, 0, 7); g.fill();
      g.fillStyle = theme.sky[0]; g.globalAlpha = 0.4; g.beginPath(); g.ellipse(b.x + 2, b.y + 4, 5, 2, 0, 0, 7); g.fill(); g.globalAlpha = 1;
    });
    sparks.forEach(s => { g.globalAlpha = 1 - s.t / s.life; g.fillStyle = s.color; g.fillRect(s.x - 1.5, s.y - 1.5, 3, 3); });
    g.globalAlpha = 1;
    g.font = "900 16px 'Avenir Next','Trebuchet MS',sans-serif";
    popups.forEach(p => { g.globalAlpha = 1 - p.t; g.fillStyle = "#fff"; g.strokeStyle = "rgba(60,20,40,.7)"; g.lineWidth = 4; g.strokeText(p.s, p.x, p.y); g.fillText(p.s, p.x, p.y); });
    g.globalAlpha = 1;
    if (saveT > 0 && state === "play") { g.fillStyle = `rgba(255,255,255,${0.5 + Math.sin(clock * 10) * 0.4})`; g.font = "800 11px 'Avenir Next',sans-serif"; g.fillText("BALL SAVE", 185, 690); }
    g.restore();
    if (flash) { g.fillStyle = `rgba(255,240,200,${flash * 0.5})`; g.fillRect(0, 0, W, H); }
  }

  function fit() {
    const top = 66, vw = innerWidth, vh = Math.max(200, innerHeight - top - 8);
    scale = Math.min(vw / W, vh / H); dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = Math.round(W * scale * dpr); cv.height = Math.round(H * scale * dpr);
    cv.style.width = W * scale + "px"; cv.style.height = H * scale + "px"; cv.style.top = top + "px";
  }
  addEventListener("resize", fit); fit();
  let last = 0;
  (function loop(t) { const dt = Math.min(0.025, (t - last) / 1000 || 0.016); last = t; step(dt); render(); requestAnimationFrame(loop); })(0);

  return {
    on: (n, f) => hooks[n] = f, start, flip, pull, step, render,
    setTheme(id) { theme = CF.themes.find(t => t.id === id) || CF.themes[0]; bgCache = null; },
    pause() { paused = true; Sound.rolling(0); }, resume() { paused = false; },
    revive() { newBall(); state = "plunger"; saveT = CF.ballSave; emit("display", { text: "ONE MORE BALL!", kind: "big" }); emit("hud"); },
    quit() { state = "idle"; balls = []; },
    get state() { return state; }, get score() { return score; }, get ball() { return ballNo; }, get mult() { return mult; },
    get balls() { return balls; }, get flippers() { return flippers; }, get mission() { return { m: CF.missions[mission % CF.missions.length], n: missionCount }; },
    get extra() { return extraBalls; }, get theme() { return theme; }
  };
})();

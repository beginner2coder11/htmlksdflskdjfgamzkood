/* TEN PIN TOWN — engine.
   The lane is simulated TOP-DOWN in metres (x across, z down the lane from the foul line):
   ball and pins are circles with mass; the ball hooks once it leaves the oil; pins that are
   hit hard enough topple and keep sliding, so they knock their neighbours. A camera behind
   the ball projects that flat world into a 1950s alley (pins and ball are drawn upright). */
window.Game = (() => {
  const CF = window.GAME_CONFIG, L = CF.lane, P = CF.physics;
  const cv = document.getElementById("lane"), ctx = cv.getContext("2d");
  const hooks = {}, emit = (n, ...a) => hooks[n] && hooks[n](...a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  let W = 0, H = 0, DPR = 1, F = 1, horizon = 0;

  // pin spots: index n-1 for pin n (1 = head pin; 7-10 back row, left to right from the bowler)
  const SPOTS = [];
  [[1], [2, 3], [4, 5, 6], [7, 8, 9, 10]].forEach((row, r) => row.forEach((n, i) => {
    SPOTS[n - 1] = { x: (i - r / 2) * L.pinSpacing, z: L.headPin + r * L.pinSpacing * 0.866 };
  }));

  // seeded random, re-seeded from each throw so a throw always plays out the same
  let seed = 1;
  const rnd = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

  let state = "idle";          // idle | aim | roll | result | over
  let mode = null;             // { kind: "open" } | { kind: "spare", level }
  let ballDef = CF.balls[0];
  let ball = null, pins = [], rack = [], frames = [], fi = 0, aimX = 0.12, rollT = 0, settleT = 0, resultT = 0;
  let cam = { z: -1.6, h: 1.25 }, shake = 0, paused = false, last = 0, drag = null;
  const sparks = [];

  /* ---------------- setup ---------------- */
  function setRack(list) {
    rack = list.slice();
    pins = list.map(n => ({ n, x: SPOTS[n - 1].x, z: SPOTS[n - 1].z, vx: 0, vz: 0, down: false, live: true, tilt: 0, dir: 1, spin: 0 }));
  }
  function sweep() {    // keep standing pins on their spots, clear the rest
    setRack(pins.filter(p => p.live && !p.down).map(p => p.n));
  }
  function start(m, ball_) {
    mode = m; ballDef = ball_ || CF.balls[0]; frames = Array.from({ length: 10 }, () => []); fi = 0;
    setRack(m.kind === "spare" ? CF.challenges[m.level].pins : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    toAim(); emit("hud");
  }
  function toAim() { ball = null; state = "aim"; cam.z = -1.6; drag = null; emit("aim"); }

  /* ---------------- the throw ---------------- */
  // th = { x: start position (m, + = right), angle (rad, + = right), speed (m/s), spin (-1..1, + hooks right) }
  function roll(th) {
    if (state !== "aim") return false;
    const sp = clamp(th.speed, P.minSpeed, P.maxSpeed), ang = clamp(th.angle, -0.12, 0.12);
    aimX = clamp(th.x, -L.half + L.ballR, L.half - L.ballR);
    seed = Math.round(aimX * 1e4) * 7919 + Math.round(ang * 1e5) * 104729 + Math.round(sp * 1e3) * 31 + Math.round((th.spin || 0) * 1e3);
    ball = { x: aimX, z: 0, vx: Math.sin(ang) * sp, vz: Math.cos(ang) * sp, spin: clamp(th.spin || 0, -1, 1) * ballDef.hook, m: ballDef.mass, gutter: false, pit: false, rot: 0, hit: false };
    state = "roll"; rollT = 0; settleT = 0;
    emit("roll", sp); Sound.sfx("release");
    return true;
  }

  function collide(a, b, ra, rb, ma, mb, e) {
    const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), min = ra + rb;
    if (d >= min || d === 0) return 0;
    const nx = dx / d, nz = dz / d, over = min - d, tm = ma + mb;
    a.x -= nx * over * mb / tm; a.z -= nz * over * mb / tm; b.x += nx * over * ma / tm; b.z += nz * over * ma / tm;
    const rv = (b.vx - a.vx) * nx + (b.vz - a.vz) * nz;
    if (rv >= 0) return 0;
    const j = -(1 + e) * rv / (1 / ma + 1 / mb);
    a.vx -= j * nx / ma; a.vz -= j * nz / ma; b.vx += j * nx / mb; b.vz += j * nz / mb;
    return -rv;
  }
  function topple(p, from, v) {
    if (!p.down) { p.down = true; p.dir = (p.x - from.x) >= 0 ? 1 : -1; }
    // a little scatter so pins fly like pins, not billiard balls
    const k = 0.12 * v;
    p.vx += (rnd() - 0.5) * k; p.vz += (rnd() - 0.3) * k * 0.6; p.spin = (rnd() - 0.5) * 12;
  }

  function physics(dt, quiet) {
    const b = ball;
    if (b && !b.pit) {
      if (!b.gutter && !b.hit) { const k = b.z > L.oil ? 1 : Math.pow(b.z / L.oil, 3) * 0.2; b.vx += b.spin * P.hook * k * dt; }
      const v = Math.hypot(b.vx, b.vz);
      if (v > 0) { const nv = Math.max(0, v - P.ballDrag * dt); b.vx *= nv / v; b.vz *= nv / v; }
      b.x += b.vx * dt; b.z += b.vz * dt; b.rot += v * dt / L.ballR;
      if (!b.gutter && b.z < L.deckEnd && Math.abs(b.x) > L.half) { b.gutter = true; b.vx = 0; if (!quiet) { Sound.sfx("gutter"); emit("gutter"); } }
      if (b.gutter) b.x = Math.sign(b.x) * (L.half + L.gutter / 2);
      if (b.z > L.pitZ || v < 0.05) b.pit = true;
    }
    const wall = L.half + L.gutter;
    for (const p of pins) {
      if (!p.live) continue;
      if (p.vx || p.vz) {
        p.x += p.vx * dt; p.z += p.vz * dt;
        const v = Math.hypot(p.vx, p.vz), nv = Math.max(0, v - P.pinFriction * (p.down ? 1 : 3) * dt);
        p.vx *= v ? nv / v : 0; p.vz *= v ? nv / v : 0;
      }
      if (p.down && p.tilt < 1) p.tilt = Math.min(1, p.tilt + dt * 6);
      if (Math.abs(p.x) > wall) { p.x = Math.sign(p.x) * wall; p.vx = -p.vx * 0.45; if (!quiet) Sound.sfx("kick", Math.abs(p.vx)); }
      if (Math.abs(p.x) > L.half + 0.03 || p.z > L.deckEnd) p.down = true;
      if (p.z > L.pitZ || p.z < L.headPin - 2) p.live = false;
    }
    if (b && !b.gutter && b.z < L.pitZ) {
      for (const p of pins) {
        if (!p.live) continue;
        const v = collide(b, p, L.ballR, L.pinR, b.m, P.pinMass, P.ballBounce);
        if (v > 0) {
          b.hit = true;
          if (v > P.knock) topple(p, b, v);
          if (!quiet) { Sound.sfx("pin", v); burst(p.x, p.z, v); shake = Math.min(1, shake + v * 0.05); }
        }
      }
    }
    for (let i = 0; i < pins.length; i++) {
      const a = pins[i]; if (!a.live) continue;
      for (let j = i + 1; j < pins.length; j++) {
        const c = pins[j]; if (!c.live) continue;
        const v = collide(a, c, L.pinR, L.pinR, P.pinMass, P.pinMass, P.pinBounce);
        if (v > P.knock) { topple(a, c, v * 0.6); topple(c, a, v * 0.6); if (!quiet) Sound.sfx("pin", v * 0.6); }
      }
    }
  }

  const standing = () => pins.filter(p => p.live && !p.down).length;
  function rollDone() {
    const moving = pins.some(p => p.live && Math.hypot(p.vx, p.vz) > 0.04);
    return (ball.pit && !moving && settleT > 0.5) || settleT > 3.4 || rollT > 10;
  }

  /* ---------------- scoring ---------------- */
  function totals(fr) {
    const rolls = fr.flat(), out = [];
    let i = 0, sum = 0;
    for (let f = 0; f < 10; f++) {
      const r = fr[f]; if (!r || !r.length) break;
      if (f < 9) {
        if (r[0] === 10) { if (rolls[i + 2] === undefined) break; sum += 10 + rolls[i + 1] + rolls[i + 2]; i += 1; }
        else if (r.length < 2) break;
        else if (r[0] + r[1] === 10) { if (rolls[i + 2] === undefined) break; sum += 10 + rolls[i + 2]; i += 2; }
        else { sum += r[0] + r[1]; i += 2; }
      } else {
        const need = r[0] === 10 || r[0] + (r[1] || 0) === 10 ? 3 : 2;
        if (r.length < need) break;
        sum += r.reduce((a, c) => a + c, 0);
      }
      out.push(sum);
    }
    return out;
  }
  // marks for the scorecard: X strike, / spare, - miss
  function marks(f) {
    const r = frames[f] || [], out = [];
    let pinsUp = 10;
    r.forEach((n, k) => {
      if (n === 10 && pinsUp === 10) { out.push("X"); pinsUp = 10; return; }
      if (n === pinsUp && pinsUp < 10) { out.push("/"); pinsUp = 10; return; }
      out.push(n === 0 ? "-" : String(n)); pinsUp = f === 9 ? pinsUp - n : 10 - n;
      if (f < 9 && k === 1) pinsUp = 10;
    });
    return out;
  }

  function finishRoll() {
    const before = rack.length, left = standing(), n = before - left;
    let call = "";
    if (mode.kind === "spare") {
      state = "result"; resultT = 0;
      const ok = left === 0;
      call = ok ? (before >= 2 ? "PICKED UP!" : "CLEAN!") : (ball.gutter && n === 0 ? "GUTTER" : left + " LEFT");
      emit("call", call, ok ? "good" : "bad"); Sound.sfx(ok ? "spare" : "aw");
      setTimeout(() => { if (mode && mode.kind === "spare") { state = "over"; emit("spareDone", { ok, level: mode.level, left }); } }, 1300);
      return;
    }
    const f = frames[fi]; f.push(n);
    const first = f.length === 1 || (fi === 9 && before === 10);
    if (n === 10 && before === 10 && first) { call = "STRIKE!"; Sound.sfx("strike"); emit("strike"); }
    else if (left === 0) { call = "SPARE!"; Sound.sfx("spare"); emit("spare"); }
    else if (n === 0) call = ball.gutter ? "GUTTER" : "MISS";
    else call = String(n);
    emit("call", call, left === 0 ? "good" : n === 0 ? "bad" : "");
    // what comes next
    let newRack = false, over = false;
    if (fi < 9) { if ((f.length === 1 && n === 10) || f.length === 2) { fi++; newRack = true; } }
    else if (f.length === 1) newRack = n === 10;
    else if (f.length === 2) { if (f[0] === 10) newRack = left === 0; else if (left === 0) newRack = true; else over = true; }
    else over = true;
    state = "result"; resultT = 0;
    emit("hud");
    setTimeout(() => {
      if (!mode) return;
      if (over) { state = "over"; const t = totals(frames); emit("over", { score: t[t.length - 1] || 0, frames: frames.map(r => r.slice()), strikes: countMarks("X"), spares: countMarks("/") }); return; }
      if (newRack) setRack([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]); else sweep();
      toAim(); emit("hud");
    }, call === "STRIKE!" ? 1700 : 1250);
  }
  const countMarks = m => frames.reduce((a, _, f) => a + marks(f).filter(x => x === m).length, 0);

  /* ---------------- headless simulation (bots, level checks) ---------------- */
  function simulate(th, list) {
    const keep = { state, ball, pins, rack, seed, aimX };
    setRack(list || rack); state = "aim";
    const savedSfx = Sound.sfx; Sound.sfx = () => {};
    roll(th); rollT = settleT = 0;
    const he = hooks.roll, hg = hooks.gutter; hooks.roll = hooks.gutter = null;
    while (!rollDone()) { for (let i = 0; i < 4; i++) physics(1 / 240, true); rollT += 1 / 60; if (ball.pit || ball.z > L.headPin - 0.5) settleT += 1 / 60; }
    const res = { left: standing(), down: rack.length - standing(), gutter: ball.gutter };
    hooks.roll = he; hooks.gutter = hg; Sound.sfx = savedSfx;
    ({ state, ball, pins, rack, seed, aimX } = keep);
    return res;
  }

  /* ---------------- effects ---------------- */
  function burst(x, z, v) {
    const n = Math.min(10, 2 + Math.floor(v * 1.2));
    for (let i = 0; i < n; i++) sparks.push({ x, z, y: 0.25 + rnd() * 0.15, vx: (rnd() - 0.5) * 2, vz: rnd() * 2, vy: 1 + rnd() * 2, life: 0.7, c: ["#f2a541", "#1aa6a0", "#e8473c", "#fff4dc"][i % 4] });
  }

  /* ---------------- rendering ---------------- */
  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = Math.max(1, innerWidth); H = Math.max(1, innerHeight);
    cv.width = W * DPR; cv.height = H * DPR; cv.style.width = W + "px"; cv.style.height = H + "px";
    F = Math.min(W * 1.22, H * 0.62); horizon = H * 0.3;
  }
  const proj = (x, y, z) => { const dz = z - cam.z; if (dz < 0.25) return null; const s = F / dz; return { x: W / 2 + x * s, y: horizon + (cam.h - y) * s, s }; };
  const screenToLaneX = sx => (sx - W / 2) * (0 - cam.z) / F;

  function quad(a, b, c, d, fill) { if (!a || !b || !c || !d) return; ctx.fillStyle = fill; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.closePath(); ctx.fill(); }

  function drawWall() {
    const g = ctx.createLinearGradient(0, 0, 0, horizon + 40);
    g.addColorStop(0, "#0f5f63"); g.addColorStop(1, "#1aa6a0");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // boomerangs + starbursts on the back wall
    ctx.save(); ctx.globalAlpha = 0.18;
    for (let i = 0; i < 9; i++) {
      const x = (i * 97) % W + 20, y = 30 + (i * 53) % Math.max(60, horizon - 60);
      ctx.strokeStyle = i % 2 ? "#f2a541" : "#fff4dc"; ctx.lineWidth = 6; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(x - 22, y + 8); ctx.quadraticCurveTo(x, y - 18, x + 22, y + 8); ctx.stroke();
    }
    ctx.restore();
  }
  function star(x, y, r, n, fill) {
    ctx.fillStyle = fill; ctx.beginPath();
    for (let i = 0; i < n * 2; i++) { const a = i * Math.PI / n - Math.PI / 2, rr = i % 2 ? r * 0.42 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    ctx.closePath(); ctx.fill();
  }
  function drawLane() {
    const z0 = Math.max(cam.z + 0.3, -3), z1 = L.pitZ + 0.6, hw = L.half, gw = L.gutter;
    // approach (before the foul line)
    if (z0 < 0) quad(proj(-hw - gw - 0.4, 0, z0), proj(hw + gw + 0.4, 0, z0), proj(hw + gw + 0.4, 0, 0), proj(-hw - gw - 0.4, 0, 0), "#d9a066");
    const za = Math.max(z0, 0);
    // side caps + gutters
    quad(proj(-hw - gw - 0.4, 0, za), proj(-hw - gw, 0, za), proj(-hw - gw, 0, L.deckEnd), proj(-hw - gw - 0.4, 0, L.deckEnd), "#13807b");
    quad(proj(hw + gw, 0, za), proj(hw + gw + 0.4, 0, za), proj(hw + gw + 0.4, 0, L.deckEnd), proj(hw + gw, 0, L.deckEnd), "#13807b");
    quad(proj(-hw - gw, 0, za), proj(-hw, 0, za), proj(-hw, 0, L.deckEnd), proj(-hw - gw, 0, L.deckEnd), "#2b2a33");
    quad(proj(hw, 0, za), proj(hw + gw, 0, za), proj(hw + gw, 0, L.deckEnd), proj(hw, 0, L.deckEnd), "#2b2a33");
    // the lane: maple boards
    const boards = 39;
    for (let i = 0; i < boards; i++) {
      const x0 = -hw + (i / boards) * 2 * hw, x1 = -hw + ((i + 1) / boards) * 2 * hw;
      quad(proj(x0, 0, za), proj(x1, 0, za), proj(x1, 0, L.headPin - 0.5), proj(x0, 0, L.headPin - 0.5), i % 2 ? "#f0c98f" : "#ebc185");
    }
    // pin deck (paler) + pit
    quad(proj(-hw, 0, L.headPin - 0.5), proj(hw, 0, L.headPin - 0.5), proj(hw, 0, L.deckEnd), proj(-hw, 0, L.deckEnd), "#f6dcae");
    quad(proj(-hw - gw - 0.4, 0, L.deckEnd), proj(hw + gw + 0.4, 0, L.deckEnd), proj(hw + gw + 0.4, 0, z1), proj(-hw - gw - 0.4, 0, z1), "#141821");
    // foul line, dots and arrows (the "targets")
    quad(proj(-hw, 0, 0), proj(hw, 0, 0), proj(hw, 0, 0.03), proj(-hw, 0, 0.03), "#1c2230");
    for (let k = 1; k <= 7; k++) {
      const x = -hw + (k * 5 / boards) * 2 * hw - hw / boards;
      const tip = proj(x, 0, 4.6 + Math.abs(4 - k) * 0.3), l = proj(x - 0.02, 0, 4.3 + Math.abs(4 - k) * 0.3), r = proj(x + 0.02, 0, 4.3 + Math.abs(4 - k) * 0.3);
      if (tip && l && r) { ctx.fillStyle = "#e8473c"; ctx.beginPath(); ctx.moveTo(tip.x, tip.y); ctx.lineTo(l.x, l.y); ctx.lineTo(r.x, r.y); ctx.fill(); }
      const dt_ = proj(x, 0, 2.1);
      if (dt_) { ctx.fillStyle = "#1c2230"; ctx.beginPath(); ctx.ellipse(dt_.x, dt_.y, Math.max(1, 0.012 * dt_.s), Math.max(0.6, 0.006 * dt_.s), 0, 0, 7); ctx.fill(); }
    }
    const w0 = proj(-hw - gw - 0.4, 1.35, L.pitZ + 0.4), w1 = proj(hw + gw + 0.4, 0, L.pitZ + 0.4);
    if (w0 && w1) { ctx.fillStyle = "#0b0e14"; ctx.fillRect(w0.x, w0.y, w1.x - w0.x, w1.y - w0.y); }
    // masking unit above the pit: a Googie sign with a starburst
    const m0 = proj(-hw - gw - 0.4, 1.35, L.pitZ + 0.4), m1 = proj(hw + gw + 0.4, 0.62, L.pitZ + 0.4);
    if (m0 && m1) {
      ctx.fillStyle = "#e8473c"; ctx.fillRect(m0.x, m0.y, m1.x - m0.x, m1.y - m0.y);
      ctx.fillStyle = "#fff4dc"; ctx.fillRect(m0.x, m1.y - (m1.y - m0.y) * 0.12, m1.x - m0.x, (m1.y - m0.y) * 0.06);
      star(m0.x + (m1.x - m0.x) * 0.16, m0.y + (m1.y - m0.y) * 0.45, (m1.y - m0.y) * 0.32, 8, "#f2a541");
      ctx.fillStyle = "#fff4dc"; ctx.font = `italic 700 ${Math.max(6, (m1.y - m0.y) * 0.36)}px ${CSSFONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(CF.title, (m0.x + m1.x) / 2 + (m1.x - m0.x) * 0.06, (m0.y + m1.y) / 2);
    }
  }
  const CSSFONT = '"Georgia", "Times New Roman", serif';

  // a pin seen from the side: radius (m) at height (m)
  const PROFILE = [[0, 0.026], [0.04, 0.05], [0.11, 0.0605], [0.18, 0.046], [0.24, 0.024], [0.275, 0.023], [0.315, 0.032], [0.35, 0.028], [0.38, 0]];
  function drawPin(p) {
    const b = proj(p.x, 0, p.z); if (!b) return;
    const s = b.s;
    // shadow
    ctx.fillStyle = "rgba(60,30,10,.25)"; ctx.beginPath(); ctx.ellipse(b.x, b.y, 0.07 * s, 0.025 * s, 0, 0, 7); ctx.fill();
    ctx.save(); ctx.translate(b.x, b.y);
    const lean = p.tilt * Math.PI / 2 * p.dir;
    ctx.rotate(lean + (p.down ? p.spin * 0.02 : 0));
    ctx.beginPath();
    PROFILE.forEach(([h, r], i) => i ? ctx.lineTo(r * s, -h * s) : ctx.moveTo(r * s, -h * s));
    for (let i = PROFILE.length - 1; i >= 0; i--) ctx.lineTo(-PROFILE[i][1] * s, -PROFILE[i][0] * s);
    ctx.closePath();
    const g = ctx.createLinearGradient(-0.06 * s, 0, 0.06 * s, 0);
    g.addColorStop(0, "#d9d2c5"); g.addColorStop(0.35, "#ffffff"); g.addColorStop(1, "#cfc6b6");
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = "rgba(40,30,20,.35)"; ctx.lineWidth = Math.max(0.5, s * 0.004); ctx.stroke();
    ctx.fillStyle = "#e8473c";
    ctx.fillRect(-0.025 * s, -0.262 * s, 0.05 * s, 0.012 * s); ctx.fillRect(-0.024 * s, -0.238 * s, 0.048 * s, 0.01 * s);
    ctx.restore();
  }
  function drawBall(bx, bz, rot) {
    const b = proj(bx, L.ballR, bz), f = proj(bx, 0, bz); if (!b || !f) return;
    const r = L.ballR * b.s;
    ctx.fillStyle = "rgba(40,20,10,.3)"; ctx.beginPath(); ctx.ellipse(f.x, f.y, r * 0.95, r * 0.3, 0, 0, 7); ctx.fill();
    const g = ctx.createRadialGradient(b.x - r * 0.35, b.y - r * 0.4, r * 0.1, b.x, b.y, r);
    g.addColorStop(0, ballDef.swirl); g.addColorStop(0.45, ballDef.color); g.addColorStop(1, shade(ballDef.color));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, 7); ctx.fill();
    // finger holes roll with the ball
    const a = rot % (Math.PI * 2), hy = Math.cos(a);
    if (hy > -0.2) {
      ctx.fillStyle = "rgba(20,10,10,.75)";
      [[-0.28, -0.1], [0.28, -0.1], [0, 0.32]].forEach(([dx, dy]) => { ctx.beginPath(); ctx.ellipse(b.x + dx * r, b.y + (dy * hy - 0.35 * Math.sin(a)) * r, r * 0.12, r * 0.12 * Math.max(0.2, hy), 0, 0, 7); ctx.fill(); });
    }
    ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.beginPath(); ctx.ellipse(b.x - r * 0.38, b.y - r * 0.45, r * 0.22, r * 0.12, -0.6, 0, 7); ctx.fill();
  }
  function shade(hex) { const n = parseInt(hex.slice(1), 16); return `rgb(${(n >> 16) * 0.45 | 0},${((n >> 8) & 255) * 0.45 | 0},${(n & 255) * 0.45 | 0})`; }

  function drawAimGuide() {
    if (state !== "aim" || !drag || drag.pts.length < 2) return;
    const th = swipeToThrow(drag.pts, true); if (!th) return;
    ctx.save(); ctx.setLineDash([6, 8]); ctx.lineWidth = 3; ctx.strokeStyle = "rgba(232,71,60,.8)"; ctx.beginPath();
    let x = th.x, z = 0, vx = Math.sin(th.angle), vz = Math.cos(th.angle);
    for (let k = 0; k <= 30; k++) {
      const p = proj(x, 0.01, z); if (p) k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
      z += 0.6; x += vx * 0.6 + (z > L.oil ? th.spin * ballDef.hook * 0.02 * (z - L.oil) : 0);
      if (Math.abs(x) > L.half) break;
    }
    ctx.stroke(); ctx.restore();
  }

  function render() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const sx = shake ? (Math.random() - 0.5) * shake * 8 : 0;
    ctx.save(); ctx.translate(sx, 0);
    drawWall(); drawLane(); drawAimGuide();
    // pins + ball, far to near
    const items = pins.filter(p => p.live).map(p => ({ z: p.z, p }));
    const bx = ball ? ball.x : aimX, bz = ball ? ball.z : 0;
    if (state === "aim" || (ball && !ball.pit)) items.push({ z: bz, b: true });
    items.sort((a, b) => b.z - a.z);
    for (const it of items) it.b ? drawBall(bx, bz, ball ? ball.rot : 0) : drawPin(it.p);
    for (const s of sparks) { const p = proj(s.x, s.y, s.z); if (p) { ctx.globalAlpha = Math.max(0, s.life / 0.7); star(p.x, p.y, Math.max(2, 0.025 * p.s), 4, s.c); ctx.globalAlpha = 1; } }
    ctx.restore();
  }

  /* ---------------- loop ---------------- */
  function step(dt) {
    if (paused) return;
    if (state === "roll") {
      for (let i = 0; i < 4; i++) physics(dt / 4, false);
      rollT += dt;
      if (ball.pit || ball.z > L.headPin - 0.5) settleT += dt;
      if (rollDone()) finishRoll();
      emit("speed", ball);
    } else if (state === "result") { resultT += dt; for (let i = 0; i < 4; i++) physics(dt / 4, true); }
    const target = ball && state !== "aim" ? clamp(ball.z - 3.2, -1.6, 15.2) : -1.6;
    cam.z += (target - cam.z) * Math.min(1, dt * (state === "aim" ? 6 : 7));
    shake = Math.max(0, shake - dt * 2.5);
    for (let i = sparks.length - 1; i >= 0; i--) { const s = sparks[i]; s.life -= dt; s.x += s.vx * dt; s.z += s.vz * dt; s.y += s.vy * dt; s.vy -= 6 * dt; if (s.life <= 0 || s.y < 0) sparks.splice(i, 1); }
  }
  function frame(ts) {
    const dt = Math.min(0.05, (ts - (last || ts)) / 1000); last = ts;
    step(dt); render();
    requestAnimationFrame(frame);
  }

  /* ---------------- input: swipe up to bowl ---------------- */
  // start point = where the ball starts; direction = aim; speed of the flick = ball speed; curve = spin
  function swipeToThrow(pts, preview) {
    const a = pts[0], b = pts[pts.length - 1], dy = a.y - b.y, dx = b.x - a.x;
    if (dy < H * CF.swipe.minLength * (preview ? 0.3 : 1)) return null;
    const recent = pts.filter(p => p.t >= b.t - 220), r0 = recent[0] || a;
    const dtm = Math.max(0.04, (b.t - r0.t) / 1000), v = ((r0.y - b.y) / H) / dtm;
    const speed = P.minSpeed + clamp((v - 0.6) / 3.2, 0, 1) * (P.maxSpeed - P.minSpeed);
    const angle = clamp(Math.atan2(dx, dy) * CF.swipe.angle, -0.12, 0.12);
    // spin from how the swipe turns: heading of the first third vs the last third
    const n = pts.length, t1 = pts[Math.floor(n / 3)], t2 = pts[Math.floor(2 * n / 3)];
    const h1 = Math.atan2(t1.x - a.x, (a.y - t1.y) || 1e-3), h2 = Math.atan2(b.x - t2.x, (t2.y - b.y) || 1e-3);
    const spin = clamp((h2 - h1) * CF.swipe.spin * 0.6, -1, 1);
    return { x: aimX, angle, speed: preview ? 7.5 : speed, spin };
  }
  function down(e) {
    if (state !== "aim" || paused || e.target !== cv) return;
    aimX = clamp(screenToLaneX(e.clientX), -L.half + L.ballR, L.half - L.ballR);
    drag = { id: e.pointerId, pts: [{ x: e.clientX, y: e.clientY, t: performance.now() }] };
    emit("touch");
  }
  function move(e) {
    if (!drag || e.pointerId !== drag.id) return;
    drag.pts.push({ x: e.clientX, y: e.clientY, t: performance.now() });
    // before the flick goes up, a sideways drag slides the ball along the foul line
    const a = drag.pts[0];
    if (a.y - e.clientY < 18) aimX = clamp(screenToLaneX(e.clientX), -L.half + L.ballR, L.half - L.ballR);
  }
  function up(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const pts = drag.pts; drag = null;
    const lift = pts.findIndex(p => pts[0].y - p.y >= 18);
    const th = lift >= 0 ? swipeToThrow(pts.slice(Math.max(0, lift - 1))) : null;
    if (th) roll(th);
  }
  cv.addEventListener("pointerdown", down);
  addEventListener("pointermove", move);
  addEventListener("pointerup", up); addEventListener("pointercancel", () => { drag = null; });
  addEventListener("keydown", e => {
    if (state !== "aim" || paused) return;
    if (e.key === "ArrowLeft") aimX = clamp(aimX - 0.03, -L.half + L.ballR, L.half - L.ballR);
    if (e.key === "ArrowRight") aimX = clamp(aimX + 0.03, -L.half + L.ballR, L.half - L.ballR);
    if (e.key === " ") { e.preventDefault(); roll({ x: aimX, angle: 0, speed: 7.5, spin: 0 }); }
  });
  addEventListener("resize", resize);
  resize(); requestAnimationFrame(frame);

  return {
    on: (n, f) => { hooks[n] = f; }, start, roll, simulate, step, render, totals, marks,
    pause() { paused = true; }, resume() { paused = false; last = 0; },
    quit() { mode = null; state = "idle"; ball = null; pins = []; },
    get state() { return state; }, get frames() { return frames; }, get frame() { return fi; },
    get rack() { return rack; }, get pins() { return pins; }, get ball() { return ball; }, get aimX() { return aimX; },
    get standing() { return pins.filter(p => p.live && !p.down).map(p => p.n); }, SPOTS
  };
})();

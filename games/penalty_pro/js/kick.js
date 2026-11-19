/* PENALTY PRO — kick rules (no drawing), shared by the game and the tests. Metres and seconds.
   Ball: from the spot (z = 0) to the goal line (z = 11). A shot is aimed at a point on the goal plane and
   takes a flight time T; curl is a sideways acceleration (the start velocity is solved so the ball still
   arrives at the aimed point, so curl bends the path without spoiling the aim).
   Keeper: dives from the middle of the line toward a point; the body is two capsules (trunk + arms),
   and a shot is saved if the ball passes within them as it reaches the keeper. */
window.Kick = (() => {
  const C = window.GAME_CONFIG;
  const G = 9.81, LINE = 11, KZ = 10.75, HALF = 3.66, BAR = 2.44, R = 0.11, POST = 0.06;
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = x => 1 - (1 - x) * (1 - x);

  function diff(n) { const k = Math.min(1, Math.max(0, (n - 1) / (C.levels.count - 1))), e = C.levels.easy, h = C.levels.hard, out = {}; for (const key in e) out[key] = lerp(e[key], h[key], k); return out; }

  function launch(tx, ty, T, curl = 0) {
    return { x: 0, y: R, z: 0, vx: (tx - 0.5 * curl * T * T) / T, vy: (ty - R + 0.5 * G * T * T) / T, vz: LINE / T, ax: curl, tx, ty, T, spin: 0, done: false };
  }
  function stepBall(b, dt) { b.vx += b.ax * dt; b.vy -= G * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt; b.spin += dt * (8 + Math.abs(b.ax)); }

  // keeper pose at time t (s since the kick): hip position + body direction
  function keeper(k, t) {
    const stand = { x: 0, y: 0.98 };
    if (!k.dive || t < k.start) return { hip: stand, dir: { x: 0, y: 1 }, s: 0 };
    const d = k.dive, dist = Math.hypot(d.x - stand.x, d.y - stand.y) || 1, s = Math.min(1, (t - k.start) * k.speed / dist), e = ease(s);
    const hip = { x: lerp(stand.x, d.x, e), y: lerp(stand.y, d.y, e) };
    const tilt = Math.min(1, Math.abs(d.x) / 1.2) * e, dirx = Math.sign(d.x) * Math.sin(tilt * 1.35), diry = Math.cos(tilt * 1.35);
    return { hip, dir: { x: dirx, y: diry }, s };
  }
  // where the keeper's hip goes for a dive at the goal-plane point (x, y)
  function diveTo(x, y) { return { x: Math.max(-HALF + 0.3, Math.min(HALF - 0.3, x * 0.82)), y: Math.max(0.45, Math.min(1.7, y - 0.15)) }; }
  function segDist(px, py, ax, ay, bx, by) { const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy || 1; let q = ((px - ax) * dx + (py - ay) * dy) / l; q = Math.max(0, Math.min(1, q)); return Math.hypot(px - ax - dx * q, py - ay - dy * q); }
  function saves(k, t, bx, by) {
    const p = keeper(k, t), h = p.hip, d = p.dir, reach = k.reach;
    // trunk: feet → head along the body direction; arms: across the shoulders, stretched toward the dive
    const feet = { x: h.x - d.x * 0.85, y: h.y - d.y * 0.85 }, head = { x: h.x + d.x * 0.8, y: h.y + d.y * 0.8 };
    if (segDist(bx, by, feet.x, feet.y, head.x, head.y) < 0.26 + R) return true;
    const sh = { x: h.x + d.x * 0.55, y: h.y + d.y * 0.55 }, px2 = -d.y, py2 = d.x;            // shoulder line is perpendicular to the body
    const armL = p.s > 0.05 ? 0.35 + reach * 0.65 : 0.55 + reach * 0.25;
    if (segDist(bx, by, sh.x - px2 * armL, sh.y - py2 * armL, sh.x + px2 * armL, sh.y + py2 * armL) < 0.14 + R) return true;
    if (p.s > 0.05) { const hand = { x: h.x + d.x * (0.75 + reach * 0.55), y: h.y + d.y * (0.75 + reach * 0.55) }; if (segDist(bx, by, h.x, h.y, hand.x, hand.y) < 0.18 + R) return true; }
    return false;
  }
  // what happens at the goal line
  function judge(bx, by) {
    const ax = Math.abs(bx);
    const postHit = Math.abs(ax - HALF) < R + POST && by < BAR + R, barHit = Math.abs(by - BAR) < R + POST && ax < HALF + R;
    if (postHit || barHit) return "post";
    if (ax < HALF - R && by > 0 && by < BAR - R) return "goal";
    return "miss";
  }
  // play a whole kick (tests / AI): returns "goal" | "save" | "post" | "miss"
  function resolve(shot, k) {
    const b = launch(shot.tx, shot.ty, shot.T, shot.curl || 0), dt = 1 / 240; let t = 0, prevZ = 0;
    while (b.z < LINE) {
      stepBall(b, dt); t += dt;
      if (prevZ < KZ && b.z >= KZ && saves(k, t, b.x, b.y)) return "save";
      prevZ = b.z;
    }
    return judge(b.x, b.y);
  }

  /* ---------- the rival keeper (you shoot) ---------- */
  function aiKeeper(shot, d, R0 = Math.random) {
    // curl fools the read: the keeper reads the start direction, not where it ends up
    const fool = (shot.curl || 0) * shot.T * shot.T * 0.35;
    let gx, gy;
    if (R0() < d.read) { gx = shot.tx - fool + (R0() - 0.5) * 0.8; gy = shot.ty + (R0() - 0.5) * 0.6; }
    else { const side = R0(); gx = side < 0.42 ? -2.4 : side < 0.58 ? 0 : 2.4; gy = R0() < 0.55 ? 0.5 : 1.6; }
    const stay = Math.abs(gx) < 0.6;
    return { dive: stay ? null : diveTo(gx, gy), start: d.react, speed: d.speed, reach: d.reach };
  }
  /* ---------- the rival shooter (you keep) ---------- */
  function aiShot(d, R0 = Math.random) {
    const side = R0() < 0.44 ? -1 : R0() < 0.79 ? 1 : 0;
    let tx = side * (HALF - 0.32 - (1 - d.corner) * 1.7 * R0()), ty = R0() < 0.5 ? 0.25 + R0() * 0.5 : 1.2 + R0() * (0.95 - (1 - d.corner) * 0.5);
    if (R0() < d.miss) { if (R0() < 0.6) tx = (side || 1) * (HALF + 0.2 + R0() * 0.5); else ty = BAR + 0.2 + R0() * 0.5; }
    return { tx, ty, T: d.time * (0.94 + R0() * 0.12), curl: (R0() - 0.5) * 4 };
  }

  return { G, LINE, KZ, HALF, BAR, R, diff, launch, stepBall, keeper, diveTo, saves, judge, resolve, aiKeeper, aiShot };
})();

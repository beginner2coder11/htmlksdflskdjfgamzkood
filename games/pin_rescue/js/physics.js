/* PIN RESCUE — physics, shared by the game and the level generator (tools/gen-levels.js).
   Everything is a ball (gems, lava, water, stone, rocks, the monster) bouncing around thick wall
   segments and pins, with a fixed time step so a pin order always plays out the same way.
   Reactions: lava + water → two stones (steam). Lava (2 touches) or a falling rock kills the monster.
   Lose: lava touches the hero, lava ends up in the hero's room, or a living monster gets in. */
(function (root) {
  const P = { g: 1300, half: 5, sub: 4, e: 0.12, drag: 0.999, slide: 0.26, dt: 1 / 60 };
  const RAD = { gem: 5.4, lava: 5.6, water: 5.6, stone: 5.6, rock: 11, monster: 17 };
  const MASS = { gem: 1, lava: 1, water: 0.8, stone: 1.5, rock: 6, monster: 10 };

  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  /* level → world. fills: { t, rect: [x, y, w, h] } are packed with balls of that type */
  function create(L, seed = 1) {
    const R = rng(seed), balls = [];
    for (const f of L.fills) {
      const r = RAD[f.t], [x, y, w, h] = f.rect;
      if (f.t === "monster" || f.t === "rock") {
        const n = f.t === "monster" ? 1 : Math.max(1, Math.floor(w / (r * 2.2)));
        for (let i = 0; i < n; i++) balls.push(ball(f.t, x + (i + 0.5) * w / n, y + h - r - 1));
        continue;
      }
      const sp = r * 2.05;
      for (let yy = y + h - r - 1; yy >= y + r; yy -= sp * 0.9) for (let xx = x + r + 1; xx <= x + w - r - 1; xx += sp) balls.push(ball(f.t, xx + (R() - 0.5) * 0.6, yy));
    }
    return {
      balls, walls: L.walls.map(s => ({ x1: s[0], y1: s[1], x2: s[2], y2: s[3] })),
      pins: L.pins.map(p => ({ x1: p.x1, y1: p.y1, x2: p.x2, y2: p.y2, dx: p.dir[0], dy: p.dir[1], len: Math.hypot(p.x2 - p.x1, p.y2 - p.y1), t: 0, pulled: false, gone: false })),
      hero: L.hero, goal: L.goal, need: L.need || 0.7, lost: null, time: 0, quiet: 0, sincePull: 99, events: [], gemTotal: balls.filter(b => b.t === "gem").length
    };
  }
  function ball(t, x, y) { return { t, x, y, vx: 0, vy: 0, r: RAD[t], m: MASS[t], hits: 0, dead: false }; }

  function pull(W, i) { const p = W.pins[i]; if (!p || p.pulled) return false; p.pulled = true; W.sincePull = 0; W.quiet = 0; return true; }

  // closest point on segment
  function seg(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1, l = dx * dx + dy * dy || 1;
    let t = ((px - x1) * dx + (py - y1) * dy) / l; t = t < 0 ? 0 : t > 1 ? 1 : t;
    return [x1 + dx * t, y1 + dy * t];
  }
  function collideSeg(b, x1, y1, x2, y2, half) {
    const [cx, cy] = seg(b.x, b.y, x1, y1, x2, y2), dx = b.x - cx, dy = b.y - cy, d = Math.hypot(dx, dy), min = b.r + half;
    if (d >= min || d < 1e-6) return;
    const nx = dx / d, ny = dy / d; b.x = cx + nx * min; b.y = cy + ny * min;
    const vn = b.vx * nx + b.vy * ny;
    if (vn < 0) { b.vx -= (1 + P.e) * vn * nx; b.vy -= (1 + P.e) * vn * ny; b.vx *= 0.985; b.vy *= 0.985; }
  }
  const inRect = (b, r, pad = 0) => b.x > r[0] - pad && b.x < r[0] + r[2] + pad && b.y > r[1] - pad && b.y < r[1] + r[3] + pad;

  function step(W, dt = P.dt) {
    const h = dt / P.sub, B = W.balls;
    for (let s = 0; s < P.sub; s++) {
      W.time += h; W.sincePull += h;
      for (const p of W.pins) if (p.pulled && !p.gone) { p.t += h / P.slide; if (p.t >= 1) p.gone = true; }
      for (const b of B) { b.vy += P.g * h; b.vx *= P.drag; b.vy *= P.drag; b.x += b.vx * h; b.y += b.vy * h; }
      for (const b of B) {
        for (const w of W.walls) collideSeg(b, w.x1, w.y1, w.x2, w.y2, P.half);
        for (const p of W.pins) if (!p.gone && p.t < 0.45) { const o = p.t * p.len * 1.05; collideSeg(b, p.x1 + p.dx * o, p.y1 + p.dy * o, p.x2 + p.dx * o, p.y2 + p.dy * o, P.half - 1); }
      }
      // ball–ball, via a grid
      const cell = 24, grid = new Map();
      for (let i = 0; i < B.length; i++) { const b = B[i]; const k = ((b.x / cell) | 0) * 1000 + ((b.y / cell) | 0); let a = grid.get(k); if (!a) grid.set(k, a = []); a.push(i); }
      for (let i = 0; i < B.length; i++) {
        const a = B[i], cx = (a.x / cell) | 0, cy = (a.y / cell) | 0, reach = a.r > 10 ? 2 : 1;
        for (let gx = cx - reach; gx <= cx + reach; gx++) for (let gy = cy - reach; gy <= cy + reach; gy++) {
          const list = grid.get(gx * 1000 + gy); if (!list) continue;
          for (const j of list) {
            if (j <= i) continue;
            const b = B[j]; const dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy, min = a.r + b.r;
            if (d2 >= min * min || d2 < 1e-9) continue;
            const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, over = min - d, ma = a.m, mb = b.m, tot = ma + mb;
            a.x -= nx * over * mb / tot; a.y -= ny * over * mb / tot; b.x += nx * over * ma / tot; b.y += ny * over * ma / tot;
            const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
            if (rv < 0) { const j2 = -(1 + P.e) * rv / (1 / ma + 1 / mb); a.vx -= j2 * nx / ma; a.vy -= j2 * ny / ma; b.vx += j2 * nx / mb; b.vy += j2 * ny / mb; }
            react(W, a, b, -rv);
          }
        }
      }
    }
    // remove what reacted away
    if (B.some(b => b.dead)) W.balls = B.filter(b => !b.dead);
    // lose checks
    if (!W.lost) for (const b of W.balls) {
      if (b.t === "lava" && inRect(b, W.hero, b.r)) { W.lost = "lava"; W.events.push({ e: "burn", x: b.x, y: b.y }); break; }
      if (b.t === "monster" && inRect(b, W.goal)) { W.lost = "monster"; W.events.push({ e: "monster", x: b.x, y: b.y }); break; }
    }
    let vmax = 0; for (const b of W.balls) { const v = b.vx * b.vx + b.vy * b.vy; if (v > vmax) vmax = v; }
    W.quiet = vmax < 400 ? W.quiet + dt : 0;
  }
  function react(W, a, b, speed) {
    const has = (t) => a.t === t ? a : b.t === t ? b : null;
    const lava = has("lava"), water = has("water"), mon = has("monster"), rock = has("rock");
    if (lava && water && lava !== water) { lava.t = "stone"; water.t = "stone"; lava.r = water.r = RAD.stone; lava.m = water.m = MASS.stone; W.events.push({ e: "steam", x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }); return; }
    if (mon && !mon.dead) {
      if (lava) { mon.hits++; if (mon.hits >= 2) { mon.dead = true; W.events.push({ e: "poof", x: mon.x, y: mon.y }); } }
      else if (rock && speed > 110) { mon.dead = true; W.events.push({ e: "poof", x: mon.x, y: mon.y }); }
    }
  }
  const settled = W => W.quiet > 0.45 || W.sincePull > 7;
  function result(W) {
    if (W.lost) return { lost: W.lost };
    const inGoal = W.balls.filter(b => b.t === "gem" && inRect(b, W.goal)).length;
    if (W.balls.some(b => b.t === "lava" && inRect(b, W.goal))) return { lost: "lava" };
    return { gems: inGoal, need: Math.ceil(W.gemTotal * W.need), won: inGoal >= Math.ceil(W.gemTotal * W.need) };
  }
  function clone(W) { return { ...W, balls: W.balls.map(b => ({ ...b })), pins: W.pins.map(p => ({ ...p })), events: [] }; }
  // pull pin i and run until everything settles (generator / tests)
  function play(W, i, maxSec = 8) { pull(W, i); for (let k = 0; k < maxSec * 60 && !settled(W) && !W.lost; k++) step(W); if (!W.lost) for (let k = 0; k < 20; k++) step(W); return result(W); }

  const API = { P, RAD, create, pull, step, settled, result, clone, play, inRect };
  if (typeof module !== "undefined") module.exports = API; else root.Phys = API;
})(typeof window !== "undefined" ? window : globalThis);

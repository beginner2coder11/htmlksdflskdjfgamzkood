/* ==========================================================================
   SPRINT PALS — runner engine
   World: x = sideways (lanes at -1.5, 0, 1.5), y = up, z = forward, in metres.
   A chase camera behind the pal projects everything onto Canvas 2D.
   The track is generated in rows ahead of the player; every row leaves at
   least one way through (checked by the autoplay bot audit in the README).
   ========================================================================== */
window.Game = (() => {
  const C = window.GAME_CONFIG, LW = C.lane, TAU = Math.PI * 2;
  const cv = document.getElementById("view"), ctx = cv.getContext("2d");
  const PITCH = 0.2, CP = Math.cos(PITCH), SP = Math.sin(PITCH), CAM_BACK = 6.2, CAM_H = 3.1;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, t) => a + (b - a) * t;
  const hex = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const mixC = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const rgb = (c, al = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${al})`;
  const shade = (h, k) => rgb(mixC(hex(h), k < 0 ? [20, 16, 40] : [255, 255, 255], Math.abs(k)));
  const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const OUT = "#2a2340";
  const laneX = l => (l - 1) * LW;
  const Z = C.zones.map(z => ({ ...z, skyC: z.sky.map(hex) }));

  /* ---------- canvas ---------- */
  let W = 1, H = 1, DPR = 1, F = 1, baseF = 1, CX = 0, CY = 0, HY = 0, vign = null;
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2); W = Math.max(1, innerWidth); H = Math.max(1, innerHeight);
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); cv.style.width = W + "px"; cv.style.height = H + "px";
    baseF = Math.min(H * 0.92, W * 1.85);
    vign = ctx.createRadialGradient(W / 2, H * 0.55, Math.min(W, H) * 0.4, W / 2, H * 0.55, Math.max(W, H) * 0.85);
    vign.addColorStop(0, "rgba(0,0,0,0)"); vign.addColorStop(1, "rgba(0,0,0,0.35)");
  }
  addEventListener("resize", resize);
  const cam = { x: 0, y: CAM_H, z: -CAM_BACK, shake: 0, fov: 1 };
  function proj(x, y, z) {
    const dx = x - cam.x, dy = y - cam.y, dz = z - cam.z;
    const d = -dy * SP + dz * CP; if (d < 0.25) return null;
    const v = dy * CP + dz * SP, s = F / d;
    return { x: CX + dx * s, y: CY - v * s, s, d };
  }
  function quad(pts) { const p = []; for (const q of pts) { const r = proj(q[0], q[1], q[2]); if (!r) return null; p.push(r); } ctx.beginPath(); ctx.moveTo(p[0].x, p[0].y); for (let i = 1; i < p.length; i++) ctx.lineTo(p[i].x, p[i].y); ctx.closePath(); return p; }

  /* ---------- state ---------- */
  const on = {};
  let mode = "attract", bot = true, pal = C.pals[0], upg = { magnet: 0, double: 0, sneaker: 0, balloon: 0 };
  let obs = [], coins = [], pows = [], parts = [], floats = [], gen = null, rng = Math.random;
  let time = 0, speed = C.speed.start, dist = 0, crashT = 0, banner = null, flash = 0, lastZone = 0;
  const P = { lane: 1, x: 0, z: 0, y: 0, vy: 0, slideT: 0, onGround: true, run: 0, prevLane: 1, laneT: 9, ground: 0, crash: false, inv: 0, stumble: 0, bumpT: 0, wasAir: false };
  let run = null;
  const fresh = () => ({ coins: 0, dist: 0, score: 0, jumps: 0, slides: 0, powers: 0, roof: 0, zone: 1, dry: 0, maxDry: 0, balloons: 0, close: 0, revives: 0,
    magnet: 0, double: 0, sneaker: 0, balloon: 0, shield: 0, mult: 1 });

  /* ---------- level generator ---------- */
  function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const pick = arr => arr[Math.floor(rng() * arr.length)];
  function reset(seed) {
    rng = mulberry(seed >>> 0); obs = []; coins = []; pows = []; parts = []; floats = [];
    gen = { z: 40, n: 0 };
    Object.assign(P, { lane: 1, x: 0, z: 0, y: 0, vy: 0, slideT: 0, onGround: true, run: 0, prevLane: 1, laneT: 9, ground: 0, crash: false, inv: 0, stumble: 0, bumpT: 0 });
    speed = C.speed.start; dist = 0; crashT = 0; banner = null; lastZone = 0; botTarget = 1; botWait = 0;
    // a welcome line of coins
    for (let i = 0; i < 10; i++) coins.push({ x: 0, y: 0.6, z: 14 + i * 2.2 });
  }
  function addObs(type, lane, z, extra = {}) {
    const base = {
      hurdle: { h: 0.75, d: 0.45, y0: 0 }, sign: { h: 1.6, d: 0.35, y0: 1.05 }, crate: { h: 2.2, d: 1.5, y0: 0 },
      cart: { h: 1.75, d: 2.6, y0: 0 }, stall: { h: 1.9, d: 12, y0: 0 }, hole: { h: 0, d: 2.8, y0: 0 }
    }[type];
    const o = { type, lane, x: laneX(lane), z, w: type === "hole" ? LW : LW * 0.86, ...base, ...extra, passed: false, hue: rng() };
    obs.push(o); return o;
  }
  function coinLine(lane, z0, n, y = 0.6, gap = 2.2) { for (let i = 0; i < n; i++) coins.push({ x: laneX(lane), y, z: z0 + i * gap }); }
  function coinArc(lane, zc, top = 2.4) { for (let i = -3; i <= 3; i++) { const u = i / 3.5; coins.push({ x: laneX(lane), y: 0.6 + top * (1 - u * u), z: zc + i * 1.4 }); } }
  function maybePower(lane, z) {
    if (rng() > 0.07) return;
    const kinds = ["magnet", "double", "sneaker", "balloon", "shield"];
    pows.push({ kind: pick(kinds), x: laneX(lane), y: 1.0, z });
  }
  function genRow() {
    const sp = speed, diff = clamp(dist / 3000, 0, 1);
    const gap = clamp(sp * 0.95, 11, 22) + rng() * 5;
    let z = gen.z + gap;
    const r = rng(), lanes = [0, 1, 2].sort(() => rng() - 0.5);
    if (gen.n < 2 || r < 0.14) {                       // easy: one obstacle + coins
      const t = pick(["hurdle", "sign", "crate"]); const L = lanes[0]; addObs(t, L, z);
      if (t === "hurdle") coinArc(L, z + 0.2); else coinLine(lanes[1], z - 6, 6);
      maybePower(lanes[2], z); gen.z = z + 2;
    } else if (r < 0.36) {                             // two blocked, one way through
      const a = pick(["crate", "crate", "sign", "hurdle"]), b = pick(["crate", "hurdle", "sign"]);
      addObs(a, lanes[0], z); addObs(b, lanes[1], z + (rng() < 0.5 ? 0 : 3));
      if (rng() < 0.5) coinLine(lanes[2], z - 5, 7); maybePower(lanes[2], z + 1);
      gen.z = z + 5;
    } else if (r < 0.5) {                              // every lane needs a move
      const opts = ["hurdle", "sign", "crate"];
      const free = lanes[0];
      addObs(pick(["hurdle", "sign"]), free, z);
      addObs(pick(opts), lanes[1], z); addObs(pick(["crate", "hurdle", "sign"]), lanes[2], z);
      if (obs[obs.length - 3].type === "hurdle") coinArc(free, z + 0.2);
      gen.z = z + 3;
    } else if (r < 0.66) {                             // market stalls to run on
      const L = lanes[0], len = 10 + Math.floor(rng() * 3) * 3;
      addObs("stall", L, z, { d: len, ramp: true });
      coinLine(L, z + 1.5, Math.floor(len / 2.2), 2.5, 2.2);
      if (rng() < 0.6) { addObs("stall", lanes[1], z + 3, { d: len - 3, ramp: rng() < 0.5 }); }
      if (rng() < 0.5) addObs(pick(["crate", "hurdle"]), lanes[2], z + len * 0.5);
      maybePower(L, z + len - 1);
      gen.z = z + len + 2;
    } else if (r < 0.78 && dist > 300) {               // a cart rolling towards you; its lane is kept clear
      const L = lanes[0]; z += 18;
      addObs("cart", L, z, { vz: -5, idle: true });
      coinLine(lanes[1], z - 14, 6);
      if (rng() < 0.5) addObs("hurdle", lanes[2], z - 6);
      gen.z = z + 4;
    } else if (r < 0.9) {                              // gaps in the boardwalk to jump
      const n = rng() < 0.4 + diff * 0.4 ? 3 : 2, set = lanes.slice(0, n);
      set.forEach(L => addObs("hole", L, z));
      coinArc(set[0], z + 1.4, 2.2);
      gen.z = z + 4;
    } else {                                           // breather: coin snake
      let L = lanes[0];
      for (let i = 0; i < 4; i++) { coinLine(L, z + i * 7, 3); L = clamp(L + (rng() < 0.5 ? -1 : 1), 0, 2); }
      maybePower(L, z + 30);
      gen.z = z + 26;
    }
    gen.n++;
  }

  /* ---------- run control ---------- */
  function attract(seed) { mode = "attract"; bot = true; run = fresh(); reset(seed ?? Math.random() * 1e9); }
  function start(opts = {}) {
    mode = "play"; bot = !!opts.bot; run = fresh(); reset(opts.seed ?? Math.random() * 1e9);
    if (pal.perkId === "shield") run.shield = 1;
    run.mult = opts.mult || 1;
    on.start && on.start();
  }
  function revive() {
    // clear the way ahead and give a moment of safety
    obs = obs.filter(o => o.z + o.d < P.z - 1 || o.z > P.z + 30);
    P.crash = false; P.y = 0; P.vy = 0; P.slideT = 0; P.inv = 2.5; P.stumble = 0; mode = "play"; crashT = 0;
    run.revives++;
    banner = { text: "GO GO GO!", t: 0 };
  }
  const durOf = k => C.powers[k].base + upg[k] + (pal.perkId === "power" ? 2 : 0);

  /* ---------- input ---------- */
  let touch = null;
  function act(a) {
    if (mode !== "play" || P.crash) return;
    if (a === "left" || a === "right") {
      const nl = clamp(P.lane + (a === "left" ? -1 : 1), 0, 2);
      if (nl !== P.lane) { P.prevLane = P.lane; P.lane = nl; P.laneT = 0; Sound.play("swoosh"); }
      else bump(false);
    }
    if (a === "up" && P.onGround && run.balloon <= 0) {
      const v = C.jump.v * (pal.perkId === "jump" ? 1.15 : 1) * (run.sneaker > 0 ? 1.35 : 1);
      P.vy = v; P.onGround = false; P.slideT = 0; run.jumps++; Sound.play("jump");
    }
    if (a === "down" && run.balloon <= 0) {
      if (!P.onGround) P.vy = -22;
      P.slideT = C.slide; run.slides++; Sound.play("slide");
    }
  }
  cv.addEventListener("pointerdown", e => { touch = { x: e.clientX, y: e.clientY, t: performance.now(), done: false }; Sound.unlock(); });
  cv.addEventListener("pointermove", e => {
    if (!touch || touch.done) return;
    const dx = e.clientX - touch.x, dy = e.clientY - touch.y, m = Math.max(Math.abs(dx), Math.abs(dy));
    if (m > 26) { touch.done = true; act(Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? "left" : "right") : (dy < 0 ? "up" : "down")); }
  });
  cv.addEventListener("pointerup", () => { if (touch && !touch.done && performance.now() - touch.t < 250) act("up"); touch = null; });
  addEventListener("keydown", e => {
    const k = { ArrowLeft: "left", a: "left", ArrowRight: "right", d: "right", ArrowUp: "up", w: "up", " ": "up", ArrowDown: "down", s: "down" }[e.key];
    if (k && mode === "play") { e.preventDefault(); act(k); }
  });

  /* ---------- the bot (title screen, tests) ---------- */
  function botThink() {
    const look = speed * 0.75 + 4;
    const lanesInfo = [0, 1, 2].map(l => {
      let block = 1e9, need = null, nd = 1e9;
      for (const o of obs) {
        if (o.lane !== l) continue;
        const front = (o.type === "cart" ? o.z - (o.idle ? 0 : 0) : o.z) - P.z, back = o.z + o.d - P.z;
        if (back < -0.3 || front > look + 8) continue;
        const onTop = o.type === "stall" && P.y >= o.h - 0.4 && l === P.lane;
        if (onTop) continue;
        const besideStall = o.type === "stall" && front < 3.2 && l !== P.lane;
        const hard = o.type === "crate" || o.type === "cart" || (o.type === "stall" && (!o.ramp || besideStall) && P.y < o.h - 0.3);
        if (hard && front < block) block = Math.max(front, 0);
        if (o.type === "hole" && l !== P.lane && front < 0.6 && back > -0.2) block = 0;   // never step sideways into a gap
        if (!hard && o.type !== "stall" && front < nd && front > -0.2) { nd = front; need = o.type; }
      }
      const coinsAhead = coins.filter(c => !c.taken && Math.abs(c.x - laneX(l)) < 0.3 && c.z > P.z && c.z < P.z + 25).length;
      if (l !== P.lane && need && nd < speed * 0.25 + 0.5) block = Math.min(block, nd);   // too close to react after switching
      return { block, need, nd, coinsAhead };
    });
    const cur = lanesInfo[P.lane];
    const safeDist = speed * 0.45 + 2.5;
    const better = lanesInfo.some((li, l) => l !== P.lane && li.block > cur.block + 6);
    if (cur.block < safeDist + 3 || (cur.block < look + 8 && better) || (P.lane !== botTarget && Math.abs(P.x - laneX(P.lane)) < 0.2)) {
      // choose the lane with the furthest block, prefer near lanes and coins
      let best = P.lane, bv = -1;
      for (let l = 0; l < 3; l++) {
        let v = Math.min(lanesInfo[l].block, 200) - Math.abs(l - P.lane) * 2 + lanesInfo[l].coinsAhead * 0.3;
        if (Math.abs(l - P.lane) === 2 && lanesInfo[1].block < 3) v -= 999;
        if (v > bv) { bv = v; best = l; }
      }
      botTarget = best;
    } else if (cur.block > 60 && rng() < 0.01) {
      const l = clamp(P.lane + (rng() < 0.5 ? -1 : 1), 0, 2); if (lanesInfo[l].block > 60 && lanesInfo[l].coinsAhead > cur.coinsAhead) botTarget = l;
    }
    const busy = cur.need && cur.nd < speed * 0.45 && cur.block > cur.nd + 2;   // deal with the hurdle/sign/gap right in front first
    const mid = lanesInfo[(botTarget + P.lane) / 2];
    const midBad = Math.abs(botTarget - P.lane) === 2 && (mid.block < speed * 0.5 || (mid.need && mid.nd < speed * 0.35));
    if (botTarget !== P.lane && Math.abs(P.x - laneX(P.lane)) < 0.35 && P.bumpT <= 0 && botWait <= 0 && !busy && !midBad) act(botTarget < P.lane ? "left" : "right");
    const n = lanesInfo[P.lane];
    if (n.need === "hurdle" || n.need === "hole") { if (n.nd < speed * 0.2 + 1.0 && P.onGround) act("up"); }
    if (n.need === "sign") { if ((n.nd < speed * 0.16 + 0.8 || (!P.onGround && n.nd < speed * 0.3 + 1.5)) && P.slideT <= 0.05) act("down"); }
  }
  let botTarget = 1, botWait = 0;

  /* ---------- update ---------- */
  function groundAt(lane, z) {
    let g = 0, hole = false;
    for (const o of obs) {
      if (o.lane !== lane || z < o.z - 0.2 || z > o.z + o.d + 0.2) continue;
      if (o.type === "stall") {
        if (o.ramp && z < o.z + 3) g = Math.max(g, o.h * clamp((z - o.z) / 3, 0, 1));
        else g = Math.max(g, o.h);
      }
      if (o.type === "hole" && z > o.z + 0.3 && z < o.z + o.d - 0.3) hole = true;
    }
    return { g, hole };
  }
  function update(dt) {
    time += dt;
    if (mode === "paused" || mode === "over") { updateFx(dt); return; }
    if (P.crash) {
      crashT += dt; updateFx(dt);
      if (crashT > 1.0 && mode === "play") { mode = "over"; on.crash && on.crash(run); }
      if (mode === "attract" && crashT > 1.2) attract();
      return;
    }
    botWait = Math.max(0, botWait - dt);
    if (bot) botThink();
    speed = Math.min(C.speed.max, C.speed.start + C.speed.rampPerKm * dist / 1000);
    Sound.setTempo(1 + (speed - C.speed.start) / 40);
    const dz = speed * dt;
    P.z += dz; dist += dz; P.run += dt * speed * 0.55;
    // timers
    for (const k of ["magnet", "double", "sneaker"]) if (run[k] > 0) run[k] = Math.max(0, run[k] - dt);
    if (run.balloon > 0) { run.balloon -= dt; if (run.balloon <= 0) { run.balloon = 0; P.inv = Math.max(P.inv, 1.2); } }
    P.inv = Math.max(0, P.inv - dt); P.laneT += dt; P.bumpT = Math.max(0, P.bumpT - dt);
    P.stumble = Math.max(0, P.stumble - dt);
    // lanes
    const tx = laneX(P.lane);
    P.x += (tx - P.x) * Math.min(1, dt * 16);
    // vertical
    const prevY = P.y, gInfo = groundAt(P.lane, P.z);
    if (run.balloon > 0) { P.y += (5.2 - P.y) * Math.min(1, dt * 3); P.vy = 0; P.onGround = false; P.slideT = 0; }
    else {
      P.vy -= C.jump.gravity * dt; P.y += P.vy * dt;
      const g = gInfo.hole ? -50 : gInfo.g;
      if (P.y <= g && (g - prevY < 0.6 || prevY >= g - 0.45)) {          // land, or walk up a ramp
        if (!P.onGround && P.vy < -6) { Sound.play("land"); dust(); }
        P.y = g; P.vy = 0; P.onGround = true;
      } else if (P.y <= 0 && !gInfo.hole) { P.y = 0; P.vy = 0; P.onGround = true; }   // in front of something tall: stay on the road
      else if (P.y > g + 0.05) P.onGround = false;
      if (gInfo.hole && P.y < -0.5) return crash("fell");
    }
    if (P.onGround && P.y > 1.2) run.roof += dz;
    if (P.slideT > 0) P.slideT -= dt;
    // carts start rolling when you get near
    for (const o of obs) if (o.type === "cart") { if (o.idle && o.z - P.z < 70) o.idle = false; if (!o.idle) o.z += o.vz * dt; }
    // collisions
    const ph = P.slideT > 0 ? 0.7 : 1.5, pw = 0.62;
    for (const o of obs) {
      if (o.type === "hole" || o.passed) continue;
      if (P.z - 0.3 > o.z + o.d) {
        o.passed = true;
        if (o.lane === P.prevLane && P.laneT < 0.45 && o.lane !== P.lane && mode === "play") { run.close++; run.score += 25; floatText("Close!", "#7fe0ff"); Sound.play("close"); }
        continue;
      }
      if (P.z + 0.3 < o.z) continue;
      if (Math.abs(P.x - o.x) > (o.w + pw) / 2 - 0.08) continue;
      // vertical extent of this obstacle at the player's position
      let bot0 = o.y0, top = o.y0 + o.h;
      if (o.type === "stall") {
        if (P.y >= top - 0.45) continue;                      // running on the roof
        if (o.ramp && P.z < o.z + 3.2) continue;               // on the ramp
      }
      if (P.y >= top - 0.05 || P.y + ph <= bot0 + 0.02) continue;
      // hit!
      const side = Math.abs(P.x - laneX(P.lane)) > 0.25 && P.z > o.z + 0.4;
      if (side) { P.lane = P.prevLane; bump(true); continue; }
      if (P.inv > 0 || run.balloon > 0) continue;
      if (run.shield > 0) { run.shield = 0; o.passed = true; o.gone = true; Sound.play("shieldPop"); burstAt(o.x, o.y0 + o.h / 2, o.z, "#bff4ff", 24); P.inv = 1; floatText("Saved!", "#bff4ff"); continue; }
      return crash(o.type);
    }
    obs = obs.filter(o => !o.gone && o.z + o.d > P.z - 8);
    // coins and power-ups
    const magR = run.magnet > 0 ? (pal.perkId === "magnet" ? 6 : 4.5) : 0;
    const val = (run.double > 0 ? 2 : 1) * (pal.perkId === "coins" ? 1.1 : 1);
    let got = false;
    for (const c of coins) {
      if (c.taken) continue;
      const dzc = c.z - P.z;
      if (dzc < -2) { c.taken = true; c.missed = true; continue; }
      if (magR && dzc < 10 && Math.abs(c.x - P.x) < magR) { const k = Math.min(1, dt * 10); c.x += (P.x - c.x) * k; c.y += (P.y + 0.8 - c.y) * k; c.z += (P.z - c.z) * k * 0.6; }
      if (Math.abs(c.x - P.x) < 0.7 && Math.abs(c.z - P.z) < 0.8 && c.y > P.y - 0.3 && c.y < P.y + 1.9) {
        c.taken = true; got = true;
        if (mode === "play") { run.coins += val; run.score += 10 * run.mult; }
        Sound.play("coin"); sparkle(c.x, c.y, c.z);
      }
    }
    coins = coins.filter(c => !c.taken && c.z > P.z - 4 || (c.taken && false));
    if (mode === "play") { if (got) run.dry = 0; else run.dry += dz; run.maxDry = Math.max(run.maxDry, run.dry); }
    for (const p of pows) {
      if (p.taken) continue;
      if (Math.abs(p.x - P.x) < 0.8 && Math.abs(p.z - P.z) < 0.9 && Math.abs(p.y - (P.y + 0.7)) < 1.3) {
        p.taken = true; run.powers++; Sound.play("power"); burstAt(p.x, p.y, p.z, C.powers[p.kind].color, 20);
        if (p.kind === "shield") run.shield = 1;
        else { run[p.kind] = durOf(p.kind); }
        if (p.kind === "balloon") { run.balloons++; Sound.play("whoosh"); for (let i = 0; i < Math.floor(speed * durOf("balloon") / 2.4); i++) coins.push({ x: laneX([1, 0, 1, 2][Math.floor(i / 8) % 4]), y: 5.6, z: P.z + 10 + i * 2.4 }); }
        floatText(C.powers[p.kind].name, C.powers[p.kind].color);
        on.power && on.power(p.kind);
      }
    }
    pows = pows.filter(p => !p.taken && p.z > P.z - 4);
    // generate ahead
    while (gen.z < P.z + 160) genRow();
    // score & zones
    if (mode === "play") {
      run.dist = dist; run.score += dz * run.mult;
      const zi = Math.floor(dist / C.zoneEvery);
      run.zone = Math.max(run.zone, zi + 1);
      if (zi !== lastZone) { lastZone = zi; const zz = Z[zi % Z.length]; banner = { text: zz.name.toUpperCase(), t: 0 }; flash = 0.5; Sound.play("zone"); on.zone && on.zone(zi); }
    }
    updateFx(dt);
  }
  function bump(side) { P.bumpT = 0.3; botWait = 0.5; cam.shake = 0.35; Sound.play("bump"); if (side) { P.stumble += 1.6; if (P.stumble > 2.5 && P.inv <= 0 && run.shield <= 0 && run.balloon <= 0) crash("stumble"); } }
  function crash(why) {
    if (bot && mode === "play" && window.__audit) window.__audit.push({ why, dist: Math.round(dist), speed: speed.toFixed(1), lane: P.lane, y: P.y.toFixed(2), g: P.onGround, sl: P.slideT > 0, near: obs.filter(o => o.z + o.d > P.z - 1 && o.z < P.z + 4).map(o => o.type + o.lane + '@' + (o.z - P.z).toFixed(1)).join(' ') });
    P.crash = true; crashT = 0; cam.shake = 0.9; Sound.play("crash"); burstAt(P.x, 1, P.z + 0.5, "#ffffff", 16);
    if (mode === "play" && !bot && navigator.vibrate) try { navigator.vibrate(60); } catch (e) {}
    run.why = why;
  }
  function dust() { for (let i = 0; i < 8; i++) parts.push({ x: P.x + (Math.random() - 0.5) * 0.6, y: P.y + 0.05, z: P.z - 0.2, vx: (Math.random() - 0.5) * 2, vy: Math.random() * 1.5, vz: -1, life: 0, max: 0.5, c: [255, 255, 255], r: 0.12, dust: true }); }
  function sparkle(x, y, z) { for (let i = 0; i < 5; i++) parts.push({ x, y, z, vx: (Math.random() - 0.5) * 3, vy: Math.random() * 3, vz: (Math.random() - 0.5) * 2 + speed * 0.6, life: 0, max: 0.35, c: [255, 230, 120], r: 0.07, star: true }); }
  function burstAt(x, y, z, col, n) { const c = hex(col); for (let i = 0; i < n; i++) { const a = Math.random() * TAU; parts.push({ x, y, z, vx: Math.cos(a) * 4, vy: Math.random() * 5, vz: Math.sin(a) * 4 + speed * 0.5, life: 0, max: 0.7, c, r: 0.09 }); } }
  function floatText(text, color) { floats.push({ text, color, t: 0 }); }
  function updateFx(dt) {
    for (const p of parts) { p.life += dt; p.vy -= (p.dust ? 1 : 9) * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; }
    parts = parts.filter(p => p.life < p.max);
    floats.forEach(f => f.t += dt); floats = floats.filter(f => f.t < 1.1);
    if (banner) { banner.t += dt; if (banner.t > 2.2) banner = null; }
    flash = Math.max(0, flash - dt * 1.5);
    cam.shake = Math.max(0, cam.shake - dt * 2);
    // camera follows
    cam.x += (P.x * 0.55 - cam.x) * Math.min(1, dt * 8);
    cam.y += (CAM_H + P.y * 0.55 - cam.y) * Math.min(1, dt * 5);
    cam.z = P.z - CAM_BACK;
    cam.fov += ((run && run.balloon > 0 ? 1.08 : 1 + (speed - C.speed.start) / 120) - cam.fov) * Math.min(1, dt * 3);
    F = baseF * cam.fov;
  }

  /* ---------- zone palette ---------- */
  function zoneAt(d) { return Z[(Math.floor(Math.max(0, d) / C.zoneEvery)) % Z.length]; }
  function palette() {
    const u = Math.max(0, dist || 0) / C.zoneEvery, i = Math.floor(u), f = u - i, t = clamp((f - 0.96) / 0.04, 0, 1);
    const A = Z[i % Z.length], B = Z[(i + 1) % Z.length];
    return { A, B, t, sky: A.skyC.map((c, k) => mixC(c, B.skyC[k], t)) };
  }

  /* ---------- render ---------- */
  function render() {
    const sh = cam.shake * cam.shake * 12;
    CX = W / 2 + (Math.random() - 0.5) * sh; CY = H * 0.5 + (Math.random() - 0.5) * sh;
    HY = CY - F * SP / CP;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const Pl = palette(), zA = Pl.A;
    // sky
    const g = ctx.createLinearGradient(0, 0, 0, HY); g.addColorStop(0, rgb(Pl.sky[0])); g.addColorStop(1, rgb(Pl.sky[1]));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, HY + 2);
    ctx.fillStyle = (Pl.t < 0.5 ? zA : Pl.B).groundD; ctx.fillRect(0, HY, W, H - HY);
    horizon(Pl.t < 0.5 ? zA : Pl.B);
    // ground & road (segments, far to near)
    const z0 = Math.floor((cam.z + 1) / 4) * 4, z1 = cam.z + 150;
    for (let z = z1; z >= z0; z -= 4) {
      const zz = zoneAt(z + 2 - 0 + (P.z - dist));
      const alt = Math.floor(z / 4) % 2 === 0;
      ctx.fillStyle = alt ? zz.ground : zz.groundD; if (quad([[-60, 0, z], [60, 0, z], [60, 0, z + 4.05], [-60, 0, z + 4.05]])) ctx.fill();
      ctx.fillStyle = alt ? zz.road : zz.roadD; if (quad([[-LW * 1.6, 0.001, z], [LW * 1.6, 0.001, z], [LW * 1.6, 0.001, z + 4.05], [-LW * 1.6, 0.001, z + 4.05]])) ctx.fill();
      // planks on the boardwalk, cracks elsewhere
      ctx.fillStyle = "rgba(0,0,0,0.08)"; if (quad([[-LW * 1.6, 0.002, z + 1.9], [LW * 1.6, 0.002, z + 1.9], [LW * 1.6, 0.002, z + 2.05], [-LW * 1.6, 0.002, z + 2.05]])) ctx.fill();
      // kerbs
      ctx.fillStyle = zz.accent; for (const sx of [-1, 1]) { if (quad([[sx * LW * 1.6, 0.003, z], [sx * LW * 1.75, 0.003, z], [sx * LW * 1.75, 0.003, z + 2], [sx * LW * 1.6, 0.003, z + 2]])) ctx.fill(); }
      ctx.fillStyle = "#ffffff"; for (const sx of [-1, 1]) { if (quad([[sx * LW * 1.6, 0.003, z + 2], [sx * LW * 1.75, 0.003, z + 2], [sx * LW * 1.75, 0.003, z + 4], [sx * LW * 1.6, 0.003, z + 4]])) ctx.fill(); }
      // lane dashes
      ctx.fillStyle = zz.line; for (const lx of [-LW / 2, LW / 2]) if (quad([[lx - 0.05, 0.004, z + 0.5], [lx + 0.05, 0.004, z + 0.5], [lx + 0.05, 0.004, z + 2.3], [lx - 0.05, 0.004, z + 2.3]])) ctx.fill();
    }
    // world objects sorted by depth
    const list = [];
    const zMin = cam.z + 0.6, zMax = cam.z + 140;
    props(list, zMin, zMax);
    for (const o of obs) { if (o.z + o.d < zMin || o.z > zMax) continue; list.push({ d: depthOf(o.x, o.z + (o.type === "stall" ? 0 : o.d / 2)), f: () => drawObs(o) }); }
    for (const c of coins) { if (c.z < zMin || c.z > zMax) continue; const p = proj(c.x, c.y, c.z); if (p) list.push({ d: p.d - 0.05, f: () => drawCoin(c, p) }); }
    for (const pw of pows) { if (pw.z < zMin || pw.z > zMax) continue; const p = proj(pw.x, pw.y + Math.sin(time * 3) * 0.12, pw.z); if (p) list.push({ d: p.d - 0.05, f: () => drawPow(pw, p) }); }
    const pp = proj(P.x, P.y, P.z); if (pp) list.push({ d: pp.d - 0.2, f: () => drawPal(pp) });
    list.sort((a, b) => b.d - a.d);
    for (const o of list) o.f();
    // particles
    for (const p of parts) { const q = proj(p.x, p.y, p.z); if (!q) continue; const k = 1 - p.life / p.max; ctx.fillStyle = rgb(p.c, k * (p.dust ? 0.6 : 1)); const r = Math.max(1, p.r * q.s * (p.dust ? 1 + (1 - k) * 2 : 1)); if (p.star) { ctx.fillRect(q.x - r, q.y - r * 0.25, r * 2, r * 0.5); ctx.fillRect(q.x - r * 0.25, q.y - r, r * 0.5, r * 2); } else { ctx.beginPath(); ctx.arc(q.x, q.y, r, 0, TAU); ctx.fill(); } }
    // speed lines
    const sl = (speed - 14) / 10 + (run && run.balloon > 0 ? 0.6 : 0);
    if (sl > 0) { ctx.strokeStyle = `rgba(255,255,255,${clamp(sl, 0, 1) * 0.35})`; ctx.lineWidth = 2; for (let i = 0; i < 14; i++) { const a = hash(i * 3.1) * TAU, r0 = (0.35 + ((time * 1.8 + hash(i)) % 1) * 0.6) * Math.max(W, H); ctx.beginPath(); ctx.moveTo(CX + Math.cos(a) * r0, HY + Math.sin(a) * r0 * 0.8); ctx.lineTo(CX + Math.cos(a) * (r0 + 50), HY + Math.sin(a) * (r0 + 50) * 0.8); ctx.stroke(); } }
    if (zA.night || (Pl.B.night && Pl.t > 0.5)) { ctx.fillStyle = "rgba(20,10,60,0.12)"; ctx.fillRect(0, 0, W, H); }
    ctx.fillStyle = vign; ctx.fillRect(0, 0, W, H);
    if (flash > 0) { ctx.fillStyle = `rgba(255,255,255,${flash})`; ctx.fillRect(0, 0, W, H); }
    // banner & floating words
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    if (banner) { const k = banner.t, a = k < 0.2 ? k / 0.2 : k > 1.8 ? (2.2 - k) / 0.4 : 1, s = Math.min(W * 0.085, 34); ctx.globalAlpha = clamp(a, 0, 1); ctx.font = `900 ${s}px ${FONT}`; ctx.lineWidth = s * 0.22; ctx.lineJoin = "round"; ctx.strokeStyle = OUT; ctx.strokeText(banner.text, W / 2, H * 0.3); ctx.fillStyle = "#fff"; ctx.fillText(banner.text, W / 2, H * 0.3); ctx.globalAlpha = 1; }
    floats.forEach((f, i) => { const a = 1 - f.t / 1.1, s = 22; ctx.globalAlpha = a; ctx.font = `900 ${s}px ${FONT}`; ctx.lineWidth = 5; ctx.strokeStyle = OUT; const y = H * 0.42 - f.t * 40 - i * 26; ctx.strokeText(f.text, W / 2, y); ctx.fillStyle = f.color; ctx.fillText(f.text, W / 2, y); ctx.globalAlpha = 1; });
  }
  const FONT = '"Lilita One","Fredoka","Arial Rounded MT Bold","Trebuchet MS",system-ui,sans-serif';
  function depthOf(x, z) { const p = proj(x, 0.5, z); return p ? p.d : 1e9; }

  function horizon(zz) {
    const sx = W * 0.72 - cam.x * 4, sy = HY - H * 0.12;
    const sg = ctx.createRadialGradient(sx, sy, 4, sx, sy, H * 0.16); sg.addColorStop(0, zz.sun); sg.addColorStop(0.25, zz.sun); sg.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = sg; ctx.fillRect(sx - H * 0.16, sy - H * 0.16, H * 0.32, H * 0.32);
    // clouds
    if (!zz.night) { ctx.fillStyle = "rgba(255,255,255,0.85)"; for (let i = 0; i < 5; i++) { const x = ((hash(i) * W * 2 - time * (6 + i * 3)) % (W + 200) + W + 200) % (W + 200) - 100, y = HY * (0.2 + hash(i + 4) * 0.5), r = 18 + hash(i + 9) * 20; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.arc(x + r, y + 5, r * 0.8, 0, TAU); ctx.arc(x - r, y + 6, r * 0.7, 0, TAU); ctx.fill(); } }
    else { for (let i = 0; i < 50; i++) { ctx.fillStyle = `rgba(255,255,255,${0.4 + 0.5 * Math.sin(time * 2 + i)})`; ctx.fillRect(hash(i) * W, hash(i + 3) * HY * 0.9, 2, 2); } }
    const base = HY + 1, col = shade(zz.ground, -0.15);
    ctx.fillStyle = col;
    if (zz.horizon === "sea") { ctx.fillStyle = "#3fb8e0"; ctx.fillRect(0, HY - H * 0.02, W, H * 0.03); ctx.fillStyle = "rgba(255,255,255,0.6)"; for (let i = 0; i < 12; i++) ctx.fillRect(((hash(i) * W + time * 10) % W), HY - H * 0.012 + hash(i + 2) * H * 0.015, 18, 2); }
    else if (zz.horizon === "mesa") { ctx.fillStyle = "#c86a4a"; for (let i = 0; i < 6; i++) { const x = hash(i + 20) * W - cam.x * 3, w = 60 + hash(i) * 90, h = H * (0.04 + hash(i + 5) * 0.06); ctx.fillRect(x, base - h, w, h); ctx.fillRect(x - 10, base - h, w + 20, 6); } }
    else if (zz.horizon === "city") { for (let i = 0; i < 24; i++) { const x = (i / 24) * W * 1.1 - 20 - cam.x * 2, w = W / 26, h = H * (0.03 + hash(i) * 0.09); ctx.fillStyle = "#3a2c6a"; ctx.fillRect(x, base - h, w - 2, h); ctx.fillStyle = "#ffd86b"; for (let yy = base - h + 4; yy < base - 3; yy += 7) if (hash(i * 9 + yy) > 0.5) ctx.fillRect(x + 3, yy, 3, 3); } }
    else { ctx.fillStyle = "#c8d8ec"; ctx.beginPath(); ctx.moveTo(0, base); for (let i = 0; i <= 8; i++) { const x = i / 8 * W - cam.x * 3; ctx.lineTo(x + W / 16, base - H * (0.05 + hash(i + 30) * 0.07)); ctx.lineTo(x + W / 8, base); } ctx.fill(); ctx.fillStyle = "#ffffff"; ctx.beginPath(); for (let i = 0; i <= 8; i++) { const x = i / 8 * W - cam.x * 3, hp = H * (0.05 + hash(i + 30) * 0.07); ctx.moveTo(x + W / 16, base - hp); ctx.lineTo(x + W / 16 + 14, base - hp + 12); ctx.lineTo(x + W / 16 - 14, base - hp + 12); } ctx.fill(); }
  }

  /* boxes: front face + top + the side facing the camera */
  function box(x, y0, z, w, h, d, cTop, cFront, cSide, outline = true) {
    const x0 = x - w / 2, x1 = x + w / 2, y1 = y0 + h, z1 = z + d;
    ctx.lineJoin = "round";
    if (x0 > cam.x) { ctx.fillStyle = cSide; if (quad([[x0, y0, z], [x0, y0, z1], [x0, y1, z1], [x0, y1, z]])) { ctx.fill(); if (outline) { ctx.strokeStyle = OUT; ctx.lineWidth = 1.5; ctx.stroke(); } } }
    if (x1 < cam.x) { ctx.fillStyle = cSide; if (quad([[x1, y0, z], [x1, y0, z1], [x1, y1, z1], [x1, y1, z]])) { ctx.fill(); if (outline) { ctx.strokeStyle = OUT; ctx.lineWidth = 1.5; ctx.stroke(); } } }
    if (y1 < cam.y) { ctx.fillStyle = cTop; if (quad([[x0, y1, z], [x1, y1, z], [x1, y1, z1], [x0, y1, z1]])) { ctx.fill(); if (outline) { ctx.strokeStyle = OUT; ctx.lineWidth = 1.5; ctx.stroke(); } } }
    ctx.fillStyle = cFront; const f = quad([[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]]);
    if (f) { ctx.fill(); if (outline) { ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.stroke(); } }
    return f;
  }
  function drawObs(o) {
    const zz = zoneAt(o.z + (P.z - dist) * 0);
    const shadow = quad([[o.x - o.w / 2, 0.005, o.z - 0.2], [o.x + o.w / 2, 0.005, o.z - 0.2], [o.x + o.w / 2, 0.005, o.z + o.d], [o.x - o.w / 2, 0.005, o.z + o.d]]);
    if (o.type !== "hole" && shadow) { ctx.fillStyle = "rgba(0,0,0,0.15)"; ctx.fill(); }
    switch (o.type) {
      case "hole": {
        const q = quad([[o.x - LW / 2 + 0.05, 0.006, o.z], [o.x + LW / 2 - 0.05, 0.006, o.z], [o.x + LW / 2 - 0.05, 0.006, o.z + o.d], [o.x - LW / 2 + 0.05, 0.006, o.z + o.d]]);
        if (q) { const water = zz.horizon === "sea" || zz.horizon === "peaks", gg = ctx.createLinearGradient(0, q[3].y, 0, q[0].y);
          if (water) { gg.addColorStop(0, zz.horizon === "peaks" ? "#5a9fd8" : "#1f6fa8"); gg.addColorStop(1, zz.horizon === "peaks" ? "#bfe8ff" : "#45b8e8"); }
          else { gg.addColorStop(0, "#120c24"); gg.addColorStop(1, shade(zz.roadD, -0.55)); }
          ctx.fillStyle = gg; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.stroke();
          const lip = quad([[o.x - LW / 2 + 0.05, 0.007, o.z + o.d - 0.25], [o.x + LW / 2 - 0.05, 0.007, o.z + o.d - 0.25], [o.x + LW / 2 - 0.05, 0.007, o.z + o.d], [o.x - LW / 2 + 0.05, 0.007, o.z + o.d]]); if (lip) { ctx.fillStyle = water ? "rgba(255,255,255,0.7)" : shade(zz.road, -0.3); ctx.fill(); }
          if (water) { ctx.strokeStyle = "rgba(255,255,255,0.6)"; ctx.lineWidth = 2; for (let i = 0; i < 3; i++) { const a = proj(o.x - 0.4 + Math.sin(time * 2 + i) * 0.2, 0.01, o.z + 0.6 + i * 0.7); if (a) { ctx.beginPath(); ctx.moveTo(a.x - a.s * 0.2, a.y); ctx.lineTo(a.x + a.s * 0.2, a.y); ctx.stroke(); } } } }
        break;
      }
      case "hurdle": {
        const c = ["#ff5f6d", "#ffd23f", "#4f9fe8"][Math.floor(o.hue * 3)];
        box(o.x - o.w / 2 + 0.08, 0, o.z + 0.1, 0.12, o.h, 0.12, "#fff", "#fff", "#ddd");
        box(o.x + o.w / 2 - 0.08, 0, o.z + 0.1, 0.12, o.h, 0.12, "#fff", "#fff", "#ddd");
        const f = box(o.x, o.h - 0.32, o.z, o.w, 0.32, 0.3, shade(c, 0.3), c, shade(c, -0.2));
        if (f) { ctx.save(); ctx.clip(); ctx.fillStyle = "#fff"; for (let i = 0; i < 5; i++) { const a = proj(o.x - o.w / 2 + i * o.w / 4.5, o.h - 0.32, o.z), b = proj(o.x - o.w / 2 + i * o.w / 4.5 + o.w / 9, o.h, o.z); if (a && b) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(a.x + (b.x - a.x) * 2, a.y); ctx.lineTo(b.x + (b.x - a.x), b.y); ctx.lineTo(b.x, b.y); ctx.fill(); } } ctx.restore(); }
        break;
      }
      case "sign": {
        box(o.x - o.w / 2 + 0.06, 0, o.z + 0.1, 0.1, o.y0 + o.h, 0.1, "#6a5a7a", "#8a7a9a", "#6a5a7a");
        box(o.x + o.w / 2 - 0.06, 0, o.z + 0.1, 0.1, o.y0 + o.h, 0.1, "#6a5a7a", "#8a7a9a", "#6a5a7a");
        const c = zz.accent, f = box(o.x, o.y0, o.z, o.w + 0.1, o.h * 0.75, 0.18, shade(c, 0.3), c, shade(c, -0.2));
        if (f) { const m = { x: (f[0].x + f[1].x) / 2, y: (f[0].y + f[3].y) / 2 }, s = Math.abs(f[1].x - f[0].x); ctx.fillStyle = "#fff"; ctx.font = `900 ${Math.max(8, s * 0.2)}px ${FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("DUCK!", m.x, m.y); }
        break;
      }
      case "crate": {
        const c = ["#d8a060", "#7fbf6a", "#6aa8d8"][Math.floor(o.hue * 3)];
        const f = box(o.x, 0, o.z, o.w, o.h, o.d, shade(c, 0.25), c, shade(c, -0.25));
        if (f) { ctx.strokeStyle = shade(c, -0.35); ctx.lineWidth = Math.max(1, Math.abs(f[1].x - f[0].x) * 0.05); ctx.beginPath(); ctx.moveTo(f[0].x, f[0].y); ctx.lineTo(f[2].x, f[2].y); ctx.moveTo(f[1].x, f[1].y); ctx.lineTo(f[3].x, f[3].y); ctx.stroke(); ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.strokeRect(f[3].x, f[3].y, f[1].x - f[3].x, f[1].y - f[3].y); }
        break;
      }
      case "cart": {
        const c = ["#ff7a5c", "#5fc7a8", "#b38cff"][Math.floor(o.hue * 3)];
        box(o.x, 0.35, o.z, o.w, o.h - 0.35, o.d, shade(c, 0.3), c, shade(c, -0.25));
        const f = proj(o.x, 0.9, o.z);
        if (f) { const s = f.s; ctx.fillStyle = "#fff8d0"; ctx.beginPath(); ctx.arc(f.x - s * 0.4, f.y, s * 0.13, 0, TAU); ctx.arc(f.x + s * 0.4, f.y, s * 0.13, 0, TAU); ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = "#2a2340"; ctx.fillRect(f.x - s * 0.5, f.y + s * 0.4, s, s * 0.1); }
        for (const sx of [-1, 1]) { const w0 = proj(o.x + sx * (o.w / 2 - 0.15), 0.3, o.z + 0.4); if (w0) { ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(w0.x, w0.y, w0.s * 0.3, 0, TAU); ctx.fill(); ctx.fillStyle = "#c8c8d8"; ctx.beginPath(); ctx.arc(w0.x, w0.y, w0.s * 0.13, 0, TAU); ctx.fill(); } }
        break;
      }
      case "stall": {
        const c = ["#ff8f6b", "#ffd86b", "#7fd6c8", "#b8a0ff"][Math.floor(o.hue * 4)], h = o.h;
        // body
        box(o.x, 0, o.z + (o.ramp ? 3 : 0), o.w, h, o.d - (o.ramp ? 3 : 0), shade(c, 0.35), shade(c, 0.05), shade(c, -0.25));
        // striped awning roof
        const rz = o.z + (o.ramp ? 3 : 0), segs = Math.ceil((o.d - (o.ramp ? 3 : 0)) / 1.5);
        for (let i = 0; i < segs; i++) { ctx.fillStyle = i % 2 ? "#ffffff" : c; const z0 = rz + i * 1.5, z1 = Math.min(o.z + o.d, z0 + 1.5); if (quad([[o.x - o.w / 2, h + 0.01, z0], [o.x + o.w / 2, h + 0.01, z0], [o.x + o.w / 2, h + 0.01, z1], [o.x - o.w / 2, h + 0.01, z1]])) ctx.fill(); }
        if (o.ramp) {
          ctx.fillStyle = "#c98a5c"; const r = quad([[o.x - o.w / 2, 0, o.z], [o.x + o.w / 2, 0, o.z], [o.x + o.w / 2, h, o.z + 3], [o.x - o.w / 2, h, o.z + 3]]);
          if (r) { ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.stroke(); ctx.strokeStyle = "rgba(0,0,0,0.2)"; ctx.lineWidth = 1.5; for (let i = 1; i < 6; i++) { const a = proj(o.x - o.w / 2, h * i / 6, o.z + 3 * i / 6), b = proj(o.x + o.w / 2, h * i / 6, o.z + 3 * i / 6); if (a && b) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); } } }
        } else {
          const f = proj(o.x, h * 0.55, o.z); if (f) { ctx.fillStyle = "#fff"; ctx.font = `900 ${Math.max(8, f.s * 0.28)}px ${FONT}`; ctx.textAlign = "center"; ctx.fillText("SHOP", f.x, f.y); }
        }
        break;
      }
    }
  }
  function drawCoin(c, p) {
    const r = p.s * 0.28, k = Math.abs(Math.cos(time * 5 + c.z * 0.3));
    const sh = proj(c.x, 0.01, c.z); if (sh && c.y < 3) { ctx.fillStyle = "rgba(0,0,0,0.12)"; ctx.beginPath(); ctx.ellipse(sh.x, sh.y, r * 0.8, r * 0.25, 0, 0, TAU); ctx.fill(); }
    ctx.fillStyle = "#e8a810"; ctx.beginPath(); ctx.ellipse(p.x, p.y, Math.max(1, r * k), r, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "#ffd23f"; ctx.beginPath(); ctx.ellipse(p.x - r * 0.08 * k, p.y, Math.max(0.5, r * 0.78 * k), r * 0.78, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = OUT; ctx.lineWidth = Math.max(1, r * 0.12); ctx.beginPath(); ctx.ellipse(p.x, p.y, Math.max(1, r * k), r, 0, 0, TAU); ctx.stroke();
    if (k > 0.5) { ctx.fillStyle = "#fff6c0"; ctx.fillRect(p.x - r * 0.15 * k, p.y - r * 0.5, r * 0.25 * k, r); }
  }
  function drawPow(pw, p) {
    const r = p.s * 0.42, col = C.powers[pw.kind].color;
    ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.beginPath(); ctx.arc(p.x, p.y, r * 1.35, 0, TAU); ctx.fill();
    ctx.fillStyle = col; ctx.strokeStyle = OUT; ctx.lineWidth = Math.max(1.5, r * 0.12); ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill(); ctx.stroke();
    powerIcon(ctx, pw.kind, p.x, p.y, r);
  }
  function powerIcon(g, kind, x, y, r) {
    g.strokeStyle = "#fff"; g.fillStyle = "#fff"; g.lineWidth = Math.max(2, r * 0.22); g.lineCap = "round"; g.lineJoin = "round";
    g.beginPath();
    if (kind === "magnet") { g.arc(x, y + r * 0.05, r * 0.42, Math.PI, 0, true); g.moveTo(x - r * 0.42, y + r * 0.05); g.lineTo(x - r * 0.42, y - r * 0.4); g.moveTo(x + r * 0.42, y + r * 0.05); g.lineTo(x + r * 0.42, y - r * 0.4); g.stroke(); }
    else if (kind === "double") { g.font = `900 ${r * 0.9}px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("x2", x, y + r * 0.05); }
    else if (kind === "sneaker") { g.moveTo(x - r * 0.5, y + r * 0.3); g.lineTo(x + r * 0.55, y + r * 0.3); g.lineTo(x + r * 0.5, y); g.lineTo(x, y - r * 0.05); g.lineTo(x - r * 0.25, y - r * 0.4); g.lineTo(x - r * 0.5, y - r * 0.3); g.closePath(); g.fill(); }
    else if (kind === "balloon") { g.ellipse(x, y - r * 0.12, r * 0.38, r * 0.46, 0, 0, TAU); g.fill(); g.beginPath(); g.moveTo(x, y + r * 0.34); g.lineTo(x + r * 0.08, y + r * 0.62); g.stroke(); }
    else if (kind === "shield") { g.moveTo(x, y - r * 0.5); g.lineTo(x + r * 0.42, y - r * 0.3); g.lineTo(x + r * 0.34, y + r * 0.15); g.lineTo(x, y + r * 0.5); g.lineTo(x - r * 0.34, y + r * 0.15); g.lineTo(x - r * 0.42, y - r * 0.3); g.closePath(); g.fill(); }
  }
  // the pal, seen from behind. (0,0) = feet, scale = metres → px
  function drawPal(p) {
    const s = p.s;
    const sh = proj(P.x, groundAt(P.lane, P.z).g + 0.01, P.z);
    if (sh && !(run && run.balloon > 0 && P.y > 3)) { ctx.fillStyle = "rgba(0,0,0,0.2)"; ctx.beginPath(); ctx.ellipse(sh.x, sh.y, s * 0.42, s * 0.13, 0, 0, TAU); ctx.fill(); }
    ctx.save(); ctx.translate(p.x, p.y); ctx.scale(s / 100, s / 100);
    if (run && run.balloon > 0) {   // balloon bunch above
      const cols = ["#ff8fd0", "#7fd6ff", "#ffd23f"];
      cols.forEach((c, i) => { const bx = (i - 1) * 34 + Math.sin(time * 2 + i) * 5, by = -260 - (i === 1 ? 20 : 0); ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -120); ctx.lineTo(bx, by + 30); ctx.stroke(); ctx.fillStyle = c; ctx.strokeStyle = OUT; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(bx, by, 26, 32, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.beginPath(); ctx.ellipse(bx - 8, by - 10, 6, 10, -0.4, 0, TAU); ctx.fill(); });
    }
    let rot = 0; if (P.crash) rot = Math.min(1.4, crashT * 4);
    ctx.rotate(rot * 0.3);
    if (P.crash) ctx.translate(0, crashT * 30);
    palArt(ctx, pal, { run: P.run, slide: P.slideT > 0, air: !P.onGround && !(run && run.balloon > 0), t: time, crash: P.crash, lean: (laneX(P.lane) - P.x) * -0.15 });
    ctx.restore();
    if (run && run.shield > 0) { ctx.save(); ctx.globalAlpha = 0.5 + 0.15 * Math.sin(time * 6); ctx.strokeStyle = "#bff4ff"; ctx.lineWidth = Math.max(2, s * 0.05); ctx.fillStyle = "rgba(127,214,255,0.18)"; ctx.beginPath(); ctx.ellipse(p.x, p.y - s * 0.75, s * 0.62, s * 0.85, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore(); }
    if (run && run.magnet > 0) { ctx.strokeStyle = "rgba(255,95,109,0.5)"; ctx.lineWidth = 2; for (let i = 0; i < 2; i++) { const r = ((time * 1.5 + i * 0.5) % 1) * s * 1.6; ctx.beginPath(); ctx.ellipse(p.x, p.y - s * 0.7, r, r * 0.6, 0, 0, TAU); ctx.stroke(); } }
    if (P.inv > 0 && !(run && run.balloon > 0) && Math.floor(time * 12) % 2) { ctx.fillStyle = "rgba(255,255,255,0.25)"; ctx.beginPath(); ctx.ellipse(p.x, p.y - s * 0.75, s * 0.5, s * 0.8, 0, 0, TAU); ctx.fill(); }
    if (P.crash) for (let i = 0; i < 3; i++) { const a = time * 5 + i * 2.1; ctx.fillStyle = "#ffd23f"; const x = p.x + Math.cos(a) * s * 0.35, y = p.y - s * 1.55 + Math.sin(a) * s * 0.1; ctx.beginPath(); for (let k = 0; k < 10; k++) { const rr = k % 2 ? s * 0.03 : s * 0.07, an = k / 10 * TAU; ctx.lineTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr); } ctx.fill(); }
  }
  // drawn at 100 units = 1 metre, feet at 0, seen from behind, running away from the camera
  function palArt(g, pl, o) {
    const cyc = (o.run || 0) * 0.35 % 1, a = cyc * TAU, slide = o.slide, air = o.air;
    const dark = shade(pl.body, -0.22), jersey = pl.pack, shorts = shade(pl.pack, -0.45);
    g.lineJoin = "round"; g.lineCap = "round"; g.strokeStyle = OUT; g.lineWidth = 5;
    g.rotate(o.lean || 0);
    // bob twice per stride, sway towards the planted foot
    const bob = air || slide ? 0 : -Math.abs(Math.sin(a)) * 7, sway = air || slide ? 0 : Math.sin(a) * 2.5;
    if (slide) { g.translate(0, 6); g.rotate(-0.08); g.scale(1.12, 0.62); }
    g.translate(sway, bob);
    const capsule = (x1, y1, x2, y2, w, col) => { g.strokeStyle = OUT; g.lineWidth = w + 9; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); };
    const shoe = (x, y, k, sole) => {   // k = size (bigger = closer to the camera)
      g.lineWidth = 5; g.strokeStyle = OUT;
      g.fillStyle = pl.shoe; g.beginPath(); g.ellipse(x, y, 15 * k, 11 * k, 0, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = "#fff"; g.beginPath(); g.ellipse(x, y + (sole ? 0 : 4 * k), 11 * k, (sole ? 7 : 4) * k, 0, 0, TAU); g.fill();
      if (sole) { g.fillStyle = "rgba(0,0,0,0.18)"; g.fillRect(x - 8 * k, y - 1, 16 * k, 3); }
    };
    // legs: the kicked-back foot rises towards us and shows its sole; the leading foot reaches away (smaller)
    const leg = (side, ph) => {
      const hx = side * 11, hy = -46;
      let fx, fy, k, sole = false;
      if (air) { fx = side * 13; fy = -26; k = 1.12; sole = true; }
      else if (slide) { fx = side * 16; fy = -10; k = 0.95; }
      else {
        const s = Math.sin(ph);
        if (s > 0) { fy = -10 - s * 30; k = 1 + s * 0.22; sole = s > 0.25; fx = side * (9 - s * 3); }   // kicking back
        else { fy = -9 + s * 3; k = 1 + s * 0.12; fx = side * 9; }                                      // planted / reaching
      }
      capsule(hx, hy, fx, fy + 4, 13, dark);
      shoe(fx, fy, k, sole);
      return fy;
    };
    // arms: bent at the elbow; the arm swinging back comes towards us (drawn in front), the forward one tucks behind
    const arm = (side, ph, front) => {
      const s = air ? -1 : slide ? 0.6 : Math.sin(ph), back = s > 0;
      if (back !== front) return;
      const sx = side * 25, sy = -104;
      const ex = side * (31 + (back ? 3 : 0)), ey = sy + (back ? 24 : 12) - (air ? 30 : 0);
      const hx = side * (back ? 30 : 18), hy = ey + (back ? 18 - s * 6 : -8 + s * 10) - (air ? 22 : 0);
      capsule(sx, sy, ex, ey, 12, pl.body); capsule(ex, ey, hx, hy, 11, pl.body);
      g.fillStyle = pl.belly; g.strokeStyle = OUT; g.lineWidth = 4; g.beginPath(); g.arc(hx, hy, 7 * (back ? 1.1 : 0.9), 0, TAU); g.fill(); g.stroke();
    };
    // the leg that reaches forward is drawn first
    const order = Math.sin(a) > 0 ? [[1, a + Math.PI], [-1, a]] : [[-1, a], [1, a + Math.PI]];
    for (const [side, ph] of order) leg(side, ph);
    arm(-1, a + Math.PI, false); arm(1, a, false);
    // shorts and jersey
    g.lineWidth = 5; g.strokeStyle = OUT;
    g.fillStyle = shorts; g.beginPath(); g.moveTo(-24, -66); g.lineTo(24, -66); g.lineTo(26, -42); g.lineTo(3, -40); g.lineTo(0, -48); g.lineTo(-3, -40); g.lineTo(-26, -42); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = jersey; g.beginPath(); g.moveTo(-22, -112); g.quadraticCurveTo(-30, -110, -29, -96); g.lineTo(-25, -62); g.quadraticCurveTo(0, -56, 25, -62); g.lineTo(29, -96); g.quadraticCurveTo(30, -110, 22, -112); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = "rgba(255,255,255,0.85)"; g.fillRect(-27, -71, 54, 5);
    g.fillStyle = "#fff"; g.font = `900 30px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle"; g.lineWidth = 4; g.strokeStyle = OUT;
    const num = { bolt: "7", kiki: "3", tuk: "5", rio: "9", mango: "11", zuri: "2" }[pl.id] || "1";
    g.strokeText(num, 0, -88); g.fillText(num, 0, -88);
    // tail sticks out of the back, towards the camera
    const tw = Math.sin(a) * 6;
    g.lineWidth = 5; g.strokeStyle = OUT;
    if (pl.tail === "ringed" || pl.tail === "fluffy") {
      // a bushy tail that droops out to one side and swishes with the stride
      g.save(); g.translate(6, -54); g.rotate(-0.75 + tw * 0.03);
      g.fillStyle = pl.body; g.beginPath(); g.moveTo(-8, 0); g.bezierCurveTo(-16, 14, -14, 40, 0, 46); g.bezierCurveTo(14, 40, 16, 14, 8, 0); g.closePath(); g.fill(); g.stroke();
      g.save(); g.clip();
      if (pl.tail === "ringed") { g.fillStyle = shade(pl.body, -0.4); [14, 30].forEach(yy => g.fillRect(-20, yy, 40, 7)); }
      else { g.fillStyle = "#fff"; g.beginPath(); g.ellipse(0, 46, 14, 12, 0, 0, TAU); g.fill(); }
      g.restore(); g.beginPath(); g.moveTo(-8, 0); g.bezierCurveTo(-16, 14, -14, 40, 0, 46); g.bezierCurveTo(14, 40, 16, 14, 8, 0); g.stroke();
      g.restore();
    }
    if (pl.tail === "bob") { g.fillStyle = "#fff"; g.beginPath(); g.arc(tw * 0.4, -52, 11, 0, TAU); g.fill(); g.stroke(); }
    if (pl.tail === "thin") { g.strokeStyle = OUT; g.lineWidth = 11; g.beginPath(); g.moveTo(0, -54); g.quadraticCurveTo(22 + tw, -48, 22 + tw, -78); g.stroke(); g.strokeStyle = pl.body; g.lineWidth = 6; g.stroke(); }
    // the arm swinging back
    arm(-1, a + Math.PI, true); arm(1, a, true);
    // head: ears behind, then the back of the head
    const hy = -138, ht = air ? -3 : Math.sin(a * 2) * 1.5;
    g.lineWidth = 5; g.strokeStyle = OUT; g.fillStyle = pl.body;
    if (pl.ears === "round") [-1, 1].forEach(sx => { g.beginPath(); g.arc(sx * 25, hy - 20 + ht, 13, 0, TAU); g.fill(); g.stroke(); });
    if (pl.ears === "pointy") [-1, 1].forEach(sx => { g.beginPath(); g.moveTo(sx * 9, hy - 22); g.lineTo(sx * 25, hy - 54); g.lineTo(sx * 31, hy - 10); g.closePath(); g.fill(); g.stroke(); });
    if (pl.ears === "long") [-1, 1].forEach(sx => { g.save(); g.translate(sx * 11, hy - 22); g.rotate(sx * 0.18 + Math.sin(a) * 0.08 * sx); g.beginPath(); g.ellipse(0, -26, 10, 30, 0, 0, TAU); g.fill(); g.stroke(); g.restore(); });
    g.fillStyle = pl.body; g.beginPath(); g.arc(0, hy + ht, 30, 0, TAU); g.fill(); g.stroke();
    g.save(); g.beginPath(); g.arc(0, hy + ht, 27.5, 0, TAU); g.clip(); g.fillStyle = "rgba(0,0,0,0.12)"; g.beginPath(); g.ellipse(0, hy + ht + 30, 30, 14, 0, 0, TAU); g.fill(); g.restore();
    g.fillStyle = pl.body; g.beginPath(); g.moveTo(-7, hy - 26 + ht); g.quadraticCurveTo(-2, hy - 44 + ht, 9, hy - 31 + ht); g.quadraticCurveTo(3, hy - 25 + ht, -7, hy - 26 + ht); g.fill(); g.stroke();
    if (pl.id === "tuk") { g.fillStyle = "#ff9a3c"; g.beginPath(); g.moveTo(27, hy + 2); g.lineTo(42, hy + 6); g.lineTo(27, hy + 10); g.closePath(); g.fill(); g.lineWidth = 3; g.stroke(); }
    // headband in the jersey colour
    g.lineWidth = 4; g.fillStyle = jersey; g.beginPath(); g.ellipse(0, hy - 6 + ht, 30, 7, 0, 0, Math.PI); g.lineTo(-30, hy - 13 + ht); g.ellipse(0, hy - 13 + ht, 30, 7, 0, Math.PI, 0, true); g.closePath(); g.fill(); g.stroke();
  }

  /* ---------- side scenery ---------- */
  function props(list, zMin, zMax) {
    const step = 6;
    for (let z = Math.floor(zMin / step) * step; z < zMax; z += step) {
      const zz = zoneAt(z), k = Math.floor(z / step);
      for (const side of [-1, 1]) {
        const h1 = hash(k * 2 + (side > 0 ? 1 : 0)), h2 = hash(k * 5.3 + side);
        const x = side * (LW * 1.75 + 1.6 + h1 * 2.2);
        const p = proj(x, 0, z); if (!p) continue;
        list.push({ d: p.d + 0.3, f: () => prop(zz, x, z, side, h1, h2, k) });
      }
      if (zz.side === "market" && k % 2 === 0) { const p = proj(0, 4, z); if (p) list.push({ d: p.d + 0.2, f: () => lanterns(z, k) }); }
    }
  }
  function prop(zz, x, z, side, h1, h2, k) {
    switch (zz.side) {
      case "boardwalk":
        if (side < 0) { // beach side: umbrellas and railing
          box(LW * -1.85, 0, z, 0.1, 0.9, 0.1, "#fff", "#fff", "#ddd", false);
          if (h2 > 0.55) { const t = proj(x, 2.2, z), b = proj(x, 0, z); if (t && b) { ctx.strokeStyle = "#fff"; ctx.lineWidth = Math.max(1, t.s * 0.05); ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(t.x, t.y); ctx.stroke(); const r = t.s * 1.1; for (let i = 0; i < 6; i++) { ctx.fillStyle = i % 2 ? "#fff" : ["#ff6f6f", "#4f9fe8", "#ffd23f"][Math.floor(h1 * 3)]; ctx.beginPath(); ctx.moveTo(t.x, t.y - r * 0.15); ctx.arc(t.x, t.y + r * 0.1, r, Math.PI + i * Math.PI / 6, Math.PI + (i + 1) * Math.PI / 6); ctx.closePath(); ctx.fill(); } } }
          else if (h2 < 0.15) palm(x, z, h1);
        } else {
          if (h2 > 0.35) house(x + 1.2, z, 3.2 + h1 * 1.5, ["#ffb3c7", "#9fe3ff", "#ffe08a", "#b8f0c8"][Math.floor(h1 * 4)], "#ff7a5c", h1);
          else palm(x, z, h1);
        }
        break;
      case "canyon":
        if (h2 > 0.45) { const w = 1.5 + h1 * 2, hh = 2 + h2 * 5; box(x + side * w / 2, 0, z, w, hh, 2.5 + h1 * 2, "#e8946a", "#d8784e", "#b8603e"); }
        else if (h2 > 0.2) cactus(x, z, h1);
        else { const p = proj(x, 0.4, z); if (p) { ctx.fillStyle = "#a8a0a0"; ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(p.x, p.y, p.s * 0.6, p.s * 0.4, 0, 0, TAU); ctx.fill(); ctx.stroke(); } }
        break;
      case "market":
        house(x + side * 1.0, z, 3 + h1 * 2.5, ["#5a3f8f", "#3f4f8f", "#8f3f6a"][Math.floor(h1 * 3)], "#ff5fa2", h1, true);
        break;
      case "village":
        if (h2 > 0.5) house(x + side * 1.2, z, 2.6 + h1, ["#d86a5a", "#5a8fd8", "#e8c060"][Math.floor(h1 * 3)], "#ffffff", h1, false, true);
        else pine(x, z, h1);
        break;
    }
  }
  function house(x, z, h, wall, roof, h1, night, snow) {
    const w = 2.6, d = 3;
    box(x, 0, z, w, h, d, shade(wall, 0.2), wall, shade(wall, -0.25));
    const a = proj(x - w / 2 - 0.15, h, z), b = proj(x + w / 2 + 0.15, h, z), t = proj(x, h + 1.2, z);
    if (a && b && t) { ctx.fillStyle = snow ? "#ffffff" : roof; ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(t.x, t.y); ctx.lineTo(b.x, b.y); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    const wn = proj(x, h * 0.55, z); if (wn) { ctx.fillStyle = night ? "#ffd86b" : "#bff0ff"; const s = wn.s; ctx.fillRect(wn.x - s * 0.7, wn.y - s * 0.35, s * 0.5, s * 0.5); ctx.fillRect(wn.x + s * 0.2, wn.y - s * 0.35, s * 0.5, s * 0.5); ctx.strokeStyle = OUT; ctx.lineWidth = 1.5; ctx.strokeRect(wn.x - s * 0.7, wn.y - s * 0.35, s * 0.5, s * 0.5); ctx.strokeRect(wn.x + s * 0.2, wn.y - s * 0.35, s * 0.5, s * 0.5);
      if (night) { ctx.fillStyle = "rgba(255,216,107,0.25)"; ctx.beginPath(); ctx.arc(wn.x, wn.y, s * 1.2, 0, TAU); ctx.fill(); } }
  }
  function palm(x, z, h1) {
    const b = proj(x, 0, z), t = proj(x + 0.5, 4.2, z); if (!b || !t) return;
    ctx.strokeStyle = "#a8784a"; ctx.lineWidth = Math.max(2, t.s * 0.22); ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.quadraticCurveTo(b.x, (b.y + t.y) / 2, t.x, t.y); ctx.stroke();
    ctx.fillStyle = "#3fbf6a"; for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (i - 2.5) * 0.6 + Math.sin(time + i) * 0.05; ctx.save(); ctx.translate(t.x, t.y); ctx.rotate(a); ctx.beginPath(); ctx.ellipse(t.s * 0.9, 0, t.s * 1.0, t.s * 0.22, 0.25, 0, TAU); ctx.fill(); ctx.restore(); }
  }
  function cactus(x, z, h1) { const b = proj(x, 0, z), t = proj(x, 2 + h1, z); if (!b || !t) return; const w = t.s * 0.32; ctx.fillStyle = "#5fae5a"; ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(b.x - w / 2, t.y, w, b.y - t.y, w / 2) : ctx.rect(b.x - w / 2, t.y, w, b.y - t.y); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.roundRect ? ctx.roundRect(b.x + w * 0.4, t.y + (b.y - t.y) * 0.3, w * 0.7, (b.y - t.y) * 0.3, w * 0.35) : 0; ctx.fill(); ctx.stroke(); }
  function pine(x, z, h1) { const b = proj(x, 0, z); if (!b) return; for (let i = 0; i < 3; i++) { const t = proj(x, 1.2 + i * 1.1 + 1.4, z), l = proj(x - 1.1 + i * 0.25, 0.8 + i * 1.1, z), r = proj(x + 1.1 - i * 0.25, 0.8 + i * 1.1, z); if (!t || !l || !r) continue; ctx.fillStyle = "#3f8f6a"; ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(l.x, l.y); ctx.lineTo(t.x, t.y); ctx.lineTo(r.x, r.y); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.moveTo(t.x, t.y); ctx.lineTo(t.x - (t.x - l.x) * 0.35, t.y + (l.y - t.y) * 0.35); ctx.lineTo(t.x + (r.x - t.x) * 0.35, t.y + (r.y - t.y) * 0.35); ctx.fill(); } }
  function lanterns(z, k) {
    const a = proj(-LW * 2.4, 4.4, z), b = proj(LW * 2.4, 4.4, z), m = proj(0, 3.9, z); if (!a || !b || !m) return;
    ctx.strokeStyle = "#2a2340"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(m.x, m.y + (m.y - a.y) * 0.5, b.x, b.y); ctx.stroke();
    for (let i = 1; i < 6; i++) { const u = i / 6, x = lerp(-LW * 2.4, LW * 2.4, u), y = 4.4 - Math.sin(u * Math.PI) * 0.6, p = proj(x, y - 0.3, z); if (!p) continue; const c = ["#ff5fa2", "#ffd86b", "#7fe0ff"][(i + k) % 3]; ctx.fillStyle = "rgba(255,216,107,0.25)"; ctx.beginPath(); ctx.arc(p.x, p.y, p.s * 0.45, 0, TAU); ctx.fill(); ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(p.x, p.y, p.s * 0.18, p.s * 0.24, 0, 0, TAU); ctx.fill(); }
  }

  /* ---------- loop ---------- */
  let last = performance.now();
  function frame(now) { const dt = Math.min(0.05, (now - last) / 1000); last = now; update(dt); render(); requestAnimationFrame(frame); }
  resize(); attract(3); requestAnimationFrame(frame);

  return {
    on, attract, start, revive, act,
    pause(p) { if (p && mode === "play") mode = "paused"; else if (!p && mode === "paused") { mode = "play"; last = performance.now(); } },
    setPal(id) { pal = C.pals.find(p => p.id === id) || C.pals[0]; },
    setUpgrades(u) { upg = Object.assign({ magnet: 0, double: 0, sneaker: 0, balloon: 0 }, u); },
    palArt, powerIcon, durOf,
    get mode() { return mode; }, get run() { return run; }, get speed() { return speed; }, get player() { return P; },
    // test hooks
    setBot(b) { bot = b; }, step(dt = 1 / 60, n = 1) { for (let i = 0; i < n; i++) update(dt); render(); }, simulate(dt, n) { for (let i = 0; i < n; i++) update(dt); },
    get obs() { return obs; }
  };
})();

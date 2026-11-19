/* ==========================================================================
   DASH STREET — timed runner engine (grew out of the Sprint Pals engine)
   World: x = sideways (lanes at -1.5, 0, 1.5), y = up, z = forward, metres.
   Each level is a seeded course with a finish line (or a truck to catch).
   Bumps never end a run: they slow you down while the clock keeps ticking.
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

  /* ---------- canvas ---------- */
  let W = 1, H = 1, DPR = 1, F = 1, baseF = 1, CX = 0, CY = 0, HY = 0, vign = null;
  function resize() {
    DPR = Math.min(devicePixelRatio || 1, 2); W = Math.max(1, innerWidth); H = Math.max(1, innerHeight);
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); cv.style.width = W + "px"; cv.style.height = H + "px";
    baseF = Math.min(H * 0.92, W * 1.85);
    vign = ctx.createRadialGradient(W / 2, H * 0.55, Math.min(W, H) * 0.4, W / 2, H * 0.55, Math.max(W, H) * 0.85);
    vign.addColorStop(0, "rgba(0,0,0,0)"); vign.addColorStop(1, "rgba(0,0,0,0.3)");
  }
  addEventListener("resize", resize);
  const cam = { x: 0, y: CAM_H, z: -CAM_BACK, shake: 0, fov: 1 };
  function proj(x, y, z) { const dx = x - cam.x, dy = y - cam.y, dz = z - cam.z; const d = -dy * SP + dz * CP; if (d < 0.25) return null; const v = dy * CP + dz * SP, s = F / d; return { x: CX + dx * s, y: CY - v * s, s, d }; }
  function quad(pts) { const p = []; for (const q of pts) { const r = proj(q[0], q[1], q[2]); if (!r) return null; p.push(r); } ctx.beginPath(); ctx.moveTo(p[0].x, p[0].y); for (let i = 1; i < p.length; i++) ctx.lineTo(p[i].x, p[i].y); ctx.closePath(); return p; }

  /* ---------- state ---------- */
  const on = {};
  let mode = "attract", bot = true, dog = C.dogs[0], upg = { magnet: 0, double: 0, sprint: 0 };
  let L = C.levels[0], WZ = C.worlds[0];
  let obs = [], bones = [], pows = [], parcels = [], parts = [], floats = [], gen = null, rng = Math.random, truck = null;
  let time = 0, speed = 10, dist = 0, banner = null, flash = 0, endT = 0;
  const P = { lane: 1, x: 0, z: 0, y: 0, vy: 0, slideT: 0, onGround: true, run: 0, prevLane: 1, laneT: 9, inv: 0, slowT: 0, dashT: 0, puddleT: 0, bumpT: 0 };
  let run = null;
  const fresh = () => ({ bones: 0, total: 0, target: 0, parcels: 0, bumps: 0, timeLeft: L.time, magnet: 0, double: 0, sprint: 0, shield: 0, done: false, won: false, stars: 0, caught: false });

  function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const pick = arr => arr[Math.floor(rng() * arr.length)];

  /* ---------- course generator ---------- */
  const SIZES = {
    cone: { h: 0.8, d: 0.5, y0: 0 }, closed: { h: 2.0, d: 0.6, y0: 0 }, bar: { h: 1.4, d: 0.35, y0: 1.05 }, car: { h: 1.5, d: 3.2, y0: 0 },
    mover: { h: 1.5, d: 3.2, y0: 0 }, flatbed: { h: 1.7, d: 11, y0: 0 }, box: { h: 0.75, d: 0.75, y0: 0 }, puddle: { h: 0, d: 2.6, y0: 0 }, dash: { h: 0, d: 2, y0: 0 }
  };
  function addObs(type, lane, z, extra = {}) { const o = { type, lane, x: laneX(lane), z, w: LW * 0.86, ...SIZES[type], ...extra, passed: false, hue: rng() }; obs.push(o); return o; }
  const end = () => L.boss ? 1e9 : L.length - 14;
  function boneLine(lane, z0, n, y = 0.6, gap = 2.2) { for (let i = 0; i < n; i++) { const z = z0 + i * gap; if (z < end() + 8) bones.push({ x: laneX(lane), y, z }); } }
  function boneArc(lane, zc, top = 2.3) { for (let i = -3; i <= 3; i++) { const u = i / 3.5; bones.push({ x: laneX(lane), y: 0.6 + top * (1 - u * u), z: zc + i * 1.4 }); } }
  function maybePower(lane, z) { if (rng() > 0.06) return; pows.push({ kind: pick(["magnet", "double", "sprint", "shield"]), x: laneX(lane), y: 1.0, z }); }
  function reset() {
    rng = mulberry(L.seed); obs = []; bones = []; pows = []; parcels = []; parts = []; floats = [];
    gen = { z: 34, n: 0, parcelAt: L.goal3 === "parcels" ? [0.25, 0.5, 0.75].map(f => f * L.length) : [] };
    Object.assign(P, { lane: 1, x: 0, z: 0, y: 0, vy: 0, slideT: 0, onGround: true, run: 0, prevLane: 1, laneT: 9, inv: 0, slowT: 0, dashT: 0, puddleT: 0, bumpT: 0 });
    speed = L.speed; dist = 0; banner = null; endT = 0; botTarget = 1; botWait = 0;
    truck = L.boss ? { gap: L.gap, dropT: 2.5 } : null;
    boneLine(1, 12, 9);
    if (!L.boss) while (gen.z < end()) genRow();
    else while (gen.z < 170) genRow();
    run.total = bones.length; run.target = L.boss ? 32 + L.world * 14 : Math.round(bones.length * C.bonesTarget);
  }
  function genRow() {
    const sp = L.speed, diff = L.diff * (L.boss ? 0.55 : 1);
    const gap = clamp(sp * (1.25 - diff * 0.45), 9.5, 21) + rng() * 4;
    let z = gen.z + gap;
    // parcels sit on top of a jump arc over a cone
    if (gen.parcelAt.length && z > gen.parcelAt[0]) {
      gen.parcelAt.shift(); const Lp = Math.floor(rng() * 3);
      addObs("cone", Lp, z); parcels.push({ x: laneX(Lp), y: 2.1, z: z + 0.2 }); boneArc(Lp, z + 0.2);
      addObs(pick(["closed", "car"]), (Lp + 1) % 3, z + 1); gen.z = z + 4; gen.n++; return;
    }
    const r = rng(), lanes = [0, 1, 2].sort(() => rng() - 0.5);
    if (gen.n < 2 || r < 0.15) {
      const t = pick(["cone", "bar", "closed"]); addObs(t, lanes[0], z);
      if (t === "cone") boneArc(lanes[0], z + 0.2); else boneLine(lanes[1], z - 6, 6);
      if (rng() < 0.5) addObs("dash", lanes[2], z - 3);
      maybePower(lanes[2], z); gen.z = z + 2;
    } else if (r < 0.36) {
      addObs(pick(["closed", "closed", "car", "bar"]), lanes[0], z); addObs(pick(["closed", "cone", "bar", "car"]), lanes[1], z + (rng() < 0.5 ? 0 : 3));
      if (rng() < 0.6) boneLine(lanes[2], z - 5, 7); if (rng() < 0.4) addObs("dash", lanes[2], z - 8);
      maybePower(lanes[2], z + 1); gen.z = z + 5;
    } else if (r < 0.5 && diff > 0.15) {
      const free = lanes[0]; const t = addObs(pick(["cone", "bar"]), free, z);
      addObs(pick(["cone", "bar", "closed"]), lanes[1], z); addObs(pick(["closed", "cone", "bar"]), lanes[2], z);
      if (t.type === "cone") boneArc(free, z + 0.2);
      gen.z = z + 3;
    } else if (r < 0.64) {
      const Lt = lanes[0], len = 10 + Math.floor(rng() * 3) * 2;
      addObs("flatbed", Lt, z, { d: len, ramp: true });
      boneLine(Lt, z + 1.5, Math.floor(len / 2.2), 2.3, 2.2);
      if (rng() < 0.6) addObs(pick(["car", "closed"]), lanes[1], z + len * 0.4);
      if (rng() < 0.5) addObs("puddle", lanes[2], z + 2);
      maybePower(Lt, z + len - 1); gen.z = z + len + 2;
    } else if (r < 0.76 && diff > 0.25) {
      const Lm = lanes[0]; z += 18;
      addObs("mover", Lm, z, { vz: -5, idle: true }); boneLine(lanes[1], z - 14, 6);
      if (rng() < 0.5) addObs("cone", lanes[2], z - 6); gen.z = z + 4;
    } else if (r < 0.88) {
      // puddles to steer round, dash pads to aim for
      addObs("puddle", lanes[0], z); addObs("puddle", lanes[1], z + 3); addObs("dash", lanes[2], z);
      boneLine(lanes[2], z + 3, 5); gen.z = z + 6;
    } else {
      let Lb = lanes[0];
      for (let i = 0; i < 4; i++) { boneLine(Lb, z + i * 7, 3); if (i === 1) addObs("dash", Lb, z + i * 7 - 2.5); Lb = clamp(Lb + (rng() < 0.5 ? -1 : 1), 0, 2); }
      maybePower(Lb, z + 30); gen.z = z + 26;
    }
    gen.n++;
  }

  /* ---------- control ---------- */
  function setLevel(i) { L = C.levels[clamp(i, 0, C.levels.length - 1)]; WZ = C.worlds[L.world]; }
  function attract() { mode = "attract"; bot = true; setLevel(0); run = fresh(); reset(); }
  function start(i, opts = {}) {
    setLevel(i); mode = "play"; bot = !!opts.bot; run = fresh(); reset();
    if (dog.perkId === "shield") run.shield = 1;
    mode = "countdown"; endT = 0; countdown = 3; Sound.play("tick");
    on.start && on.start(L);
  }
  let countdown = 0;
  const durOf = k => C.powers[k].base + (upg[k] || 0) + (dog.perkId === "power" ? 2 : 0);

  /* ---------- input ---------- */
  let touch = null;
  function act(a) {
    if (mode !== "play") return;
    if (a === "left" || a === "right") { const nl = clamp(P.lane + (a === "left" ? -1 : 1), 0, 2); if (nl !== P.lane) { P.prevLane = P.lane; P.lane = nl; P.laneT = 0; Sound.play("swoosh"); } }
    if (a === "up" && P.onGround) { P.vy = C.jump.v; P.onGround = false; P.slideT = 0; Sound.play("jump"); }
    if (a === "down") { if (!P.onGround) P.vy = -22; P.slideT = C.slide; Sound.play("slide"); }
  }
  cv.addEventListener("pointerdown", e => { touch = { x: e.clientX, y: e.clientY, t: performance.now(), done: false }; Sound.unlock(); });
  cv.addEventListener("pointermove", e => { if (!touch || touch.done) return; const dx = e.clientX - touch.x, dy = e.clientY - touch.y; if (Math.max(Math.abs(dx), Math.abs(dy)) > 26) { touch.done = true; act(Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? "left" : "right") : (dy < 0 ? "up" : "down")); } });
  cv.addEventListener("pointerup", () => { if (touch && !touch.done && performance.now() - touch.t < 250) act("up"); touch = null; });
  addEventListener("keydown", e => { const k = { ArrowLeft: "left", a: "left", ArrowRight: "right", d: "right", ArrowUp: "up", w: "up", " ": "up", ArrowDown: "down", s: "down" }[e.key]; if (k && mode === "play") { e.preventDefault(); act(k); } });

  /* ---------- the bot (title screen + level audit) ---------- */
  let botTarget = 1, botWait = 0;
  function botThink() {
    const look = speed * 0.75 + 4;
    const info = [0, 1, 2].map(l => {
      let block = 1e9, need = null, nd = 1e9, pud = 0, dash = 0;
      for (const o of obs) {
        if (o.lane !== l || o.gone) continue;
        const front = o.z - P.z, back = o.z + o.d - P.z;
        if (back < -0.3 || front > look + 8) continue;
        if (o.type === "puddle") { if (front < look) pud = 1; continue; }
        if (o.type === "dash") { if (front > 0 && front < look) dash = 1; continue; }
        const besideBed = o.type === "flatbed" && front < 3.2 && l !== P.lane;
        const hard = o.type === "closed" || o.type === "car" || o.type === "mover" || (o.type === "flatbed" && (!o.ramp || besideBed) && P.y < o.h - 0.3);
        if (hard && front < block) block = Math.max(front, 0);
        if (!hard && o.type !== "flatbed" && front < nd && front > -0.2) { nd = front; need = o.type === "box" ? "cone" : o.type; }
      }
      if (l !== P.lane && need && nd < speed * 0.25 + 0.5) block = Math.min(block, nd);
      const b = bones.filter(c => !c.taken && Math.abs(c.x - laneX(l)) < 0.3 && c.z > P.z && c.z < P.z + 25).length;
      return { block, need, nd, pud, dash, b };
    });
    const cur = info[P.lane], safe = speed * 0.45 + 2.5;
    const val = l => Math.min(info[l].block, 200) - Math.abs(l - P.lane) * 2 + info[l].b * 0.4 + info[l].dash * 6 - info[l].pud * 6;
    const better = info.some((li, l) => l !== P.lane && (li.block > cur.block + 6 || val(l) > val(P.lane) + 5));
    if (cur.block < safe + 3 || (cur.block < look + 8 && better) || better) {
      let best = P.lane, bv = -1e9;
      for (let l = 0; l < 3; l++) { let v = val(l); if (Math.abs(l - P.lane) === 2 && info[1].block < 3) v -= 999; if (v > bv) { bv = v; best = l; } }
      botTarget = best;
    }
    const busy = cur.need && cur.nd < speed * 0.45 && cur.block > cur.nd + 2;
    const mid = info[(botTarget + P.lane) / 2], midBad = Math.abs(botTarget - P.lane) === 2 && (mid.block < speed * 0.5 || (mid.need && mid.nd < speed * 0.35));
    if (botTarget !== P.lane && Math.abs(P.x - laneX(P.lane)) < 0.35 && botWait <= 0 && !busy && !midBad) act(botTarget < P.lane ? "left" : "right");
    const n = info[P.lane];
    if (n.need === "cone") { if (n.nd < speed * 0.2 + 1.0 && P.onGround) act("up"); }
    if (n.need === "bar") { if ((n.nd < speed * 0.16 + 0.8 || (!P.onGround && n.nd < speed * 0.3 + 1.5)) && P.slideT <= 0.05) act("down"); }
  }

  /* ---------- update ---------- */
  function groundAt(lane, z) {
    let g = 0;
    for (const o of obs) { if (o.lane !== lane || o.type !== "flatbed" || z < o.z - 0.2 || z > o.z + o.d + 0.2) continue; g = Math.max(g, o.ramp && z < o.z + 3 ? o.h * clamp((z - o.z) / 3, 0, 1) : o.h); }
    return g;
  }
  function update(dt) {
    time += dt;
    if (mode === "paused" || mode === "over") { updateFx(dt); return; }
    if (mode === "countdown") {
      const before = Math.ceil(countdown); countdown -= dt; const now = Math.ceil(countdown);
      if (now !== before && now > 0) Sound.play("tick");
      if (countdown <= 0) { mode = "play"; Sound.play("go"); banner = { text: "GO!", t: 0 }; }
      updateFx(dt); return;
    }
    if (mode === "done") { endT += dt; P.z += speed * dt * Math.max(0, 1 - endT); P.run += dt * 3; updateFx(dt); return; }
    if (bot) { botWait = Math.max(0, botWait - dt); botThink(); }
    // speed: level pace × dash pad × turbo × bump recovery × puddles
    const sl = C.stumble, slowK = P.slowT > 0 ? sl.slow + (1 - sl.slow) * (1 - P.slowT / (sl.time * (dog.perkId === "tough" ? 0.6 : 1))) : 1;
    speed = L.speed * (P.dashT > 0 ? C.dash.boost * (dog.perkId === "dash" ? 1.1 : 1) : 1) * (run.sprint > 0 ? 1.25 : 1) * slowK * (P.puddleT > 0 ? 0.72 : 1);
    Sound.setTempo(1 + (L.speed - 10) / 30);
    const dz = speed * dt;
    P.z += dz; dist += dz; P.run += dt * speed * 0.55;
    if (mode === "play") run.timeLeft -= dt;
    for (const k of ["magnet", "double", "sprint"]) if (run[k] > 0) run[k] = Math.max(0, run[k] - dt);
    P.inv = Math.max(0, P.inv - dt); P.slowT = Math.max(0, P.slowT - dt); P.dashT = Math.max(0, P.dashT - dt); P.puddleT = Math.max(0, P.puddleT - dt); P.laneT += dt; P.bumpT = Math.max(0, P.bumpT - dt);
    P.x += (laneX(P.lane) - P.x) * Math.min(1, dt * 16);
    // vertical
    const prevY = P.y, g = groundAt(P.lane, P.z);
    P.vy -= C.jump.gravity * dt; P.y += P.vy * dt;
    if (P.y <= g && (g - prevY < 0.6 || prevY >= g - 0.45)) { if (!P.onGround && P.vy < -6) { Sound.play("land"); dust(); } P.y = g; P.vy = 0; P.onGround = true; }
    else if (P.y <= 0) { P.y = 0; P.vy = 0; P.onGround = true; }
    else if (P.y > g + 0.05) P.onGround = false;
    if (P.slideT > 0) P.slideT -= dt;
    for (const o of obs) if (o.type === "mover") { if (o.idle && o.z - P.z < 70) o.idle = false; if (!o.idle) o.z += o.vz * dt; }
    // boss truck
    if (truck) {
      truck.gap -= (speed - L.speed * L.truck) * dt;
      truck.dropT -= dt;
      if (truck.dropT <= 0 && truck.gap > 14) { truck.dropT = 2.2 - L.diff * 0.8; const l = Math.floor(rng() * 3); addObs("box", l, P.z + truck.gap - 1); Sound.play("bump"); }
      if (truck.gap <= 3 && mode === "play") { run.caught = true; return finish(true); }
      truck.gap = Math.min(truck.gap, L.gap + 25);
    }
    // collisions
    const ph = P.slideT > 0 ? 0.7 : 1.5, pw = 0.62;
    for (const o of obs) {
      if (o.gone || o.passed) continue;
      if (P.z - 0.3 > o.z + o.d) { o.passed = true; continue; }
      if (P.z + 0.3 < o.z || Math.abs(P.x - o.x) > (o.w + pw) / 2 - 0.08) continue;
      if (o.type === "dash") { if (P.y < 0.3 && !o.used) { o.used = true; P.dashT = C.dash.time; Sound.play("whoosh"); floatText("Dash!", "#3fd5a8"); if (truck) truck.gap -= 2; } continue; }
      if (o.type === "puddle") { if (P.y < 0.2 && !o.used) { o.used = true; P.puddleT = 0.6; Sound.play("splash"); splash(); } continue; }
      let top = o.y0 + o.h;
      if (o.type === "flatbed") { if (P.y >= top - 0.45) continue; if (o.ramp && P.z < o.z + 3.2) continue; }
      if (P.y >= top - 0.05 || P.y + ph <= o.y0 + 0.02) continue;
      bump(o);
    }
    obs = obs.filter(o => !o.gone && o.z + o.d > P.z - 8);
    // bones, parcels, power-ups
    const magR = run.magnet > 0 ? 4.5 : 0, val = (run.double > 0 ? 2 : 1) * (dog.perkId === "bones" ? 1.1 : 1);
    for (const c of bones) {
      if (c.taken) continue;
      const dzc = c.z - P.z;
      if (dzc < -2) { c.taken = true; continue; }
      if (magR && dzc < 10 && Math.abs(c.x - P.x) < magR) { const k = Math.min(1, dt * 10); c.x += (P.x - c.x) * k; c.y += (P.y + 0.8 - c.y) * k; c.z += (P.z - c.z) * k * 0.6; }
      if (Math.abs(c.x - P.x) < 0.7 && Math.abs(c.z - P.z) < 0.8 && c.y > P.y - 0.3 && c.y < P.y + 1.9) { c.taken = true; if (mode === "play") run.bones += val; Sound.play("coin"); sparkle(c.x, c.y, c.z); }
    }
    bones = bones.filter(c => !c.taken);
    for (const p of parcels) { if (p.taken) continue; if (Math.abs(p.x - P.x) < 0.8 && Math.abs(p.z - P.z) < 0.9 && Math.abs(p.y - (P.y + 0.8)) < 1.0) { p.taken = true; run.parcels++; Sound.play("power"); burstAt(p.x, p.y, p.z, "#ffd23f", 20); floatText("Parcel " + run.parcels + "/3", "#ffd23f"); } }
    for (const p of pows) {
      if (p.taken) continue;
      if (Math.abs(p.x - P.x) < 0.8 && Math.abs(p.z - P.z) < 0.9 && Math.abs(p.y - (P.y + 0.7)) < 1.3) {
        p.taken = true; Sound.play("power"); burstAt(p.x, p.y, p.z, C.powers[p.kind].color, 20);
        if (p.kind === "shield") run.shield = 1; else run[p.kind] = durOf(p.kind);
        floatText(C.powers[p.kind].name, C.powers[p.kind].color);
      }
    }
    pows = pows.filter(p => !p.taken && p.z > P.z - 4);
    if (L.boss) while (gen.z < P.z + 170) genRow();
    // finish & time
    if (!L.boss && P.z >= L.length && mode === "play") return finish(true);
    if (run.timeLeft <= 0 && mode === "play") { run.timeLeft = 0; return finish(false); }
    if (mode === "attract" && (P.z >= (L.length || 300) || run.timeLeft < -30)) attract();
    updateFx(dt);
  }
  function bump(o) {
    o.gone = true; burstAt(o.x, o.y0 + o.h / 2, o.z, o.type === "cone" ? "#ff8f2e" : "#ffffff", 14);
    if (P.inv > 0) return;
    if (run.shield > 0) { run.shield = 0; Sound.play("shieldPop"); floatText("Saved!", "#bff4ff"); P.inv = 0.8; return; }
    P.slowT = C.stumble.time * (dog.perkId === "tough" ? 0.6 : 1); P.inv = 0.6; P.bumpT = 0.35; run.bumps++;
    cam.shake = 0.45; Sound.play("bump"); floatText("Oof!", "#ff8f6b");
    if (truck) truck.gap += 4;
    if (navigator.vibrate && mode === "play" && !bot) try { navigator.vibrate(30); } catch (e) {}
  }
  function finish(won) {
    run.done = true; run.won = won; mode = mode === "attract" ? "attract" : "done"; endT = 0;
    if (won) {
      const s2 = run.bones >= run.target;
      const s3 = L.boss ? run.timeLeft >= L.fastLeft : L.goal3 === "time" ? run.timeLeft >= L.timeLeft : L.goal3 === "clean" ? run.bumps === 0 : run.parcels >= 3;
      run.stars = 1 + (s2 ? 1 : 0) + (s3 ? 1 : 0); run.s2 = s2; run.s3 = s3;
      banner = { text: L.boss ? "CAUGHT IT!" : "DELIVERED!", t: 0 }; flash = 0.5; Sound.play("win");
      for (let i = 0; i < 40; i++) parts.push({ x: P.x + (Math.random() - 0.5) * 3, y: 1.5 + Math.random() * 2, z: P.z + 4 + Math.random() * 4, vx: (Math.random() - 0.5) * 6, vy: Math.random() * 6, vz: speed * 0.4, life: 0, max: 1.5, c: hex(["#ff5f6d", "#ffd23f", "#3fd5a8", "#4f9fe8"][i % 4]), r: 0.1, conf: true });
    } else { banner = { text: "TIME'S UP!", t: 0 }; Sound.play("fail"); }
    if (window.__audit && bot) window.__audit.push({ lvl: L.n, won, stars: run.stars || 0, left: run.timeLeft.toFixed(1), bumps: run.bumps, bones: Math.floor(run.bones) + "/" + run.target, parcels: run.parcels });
    setTimeout(() => on.finish && on.finish(run, L), 1300);
  }
  function dust() { for (let i = 0; i < 8; i++) parts.push({ x: P.x + (Math.random() - 0.5) * 0.6, y: P.y + 0.05, z: P.z - 0.2, vx: (Math.random() - 0.5) * 2, vy: Math.random() * 1.5, vz: -1, life: 0, max: 0.5, c: [255, 255, 255], r: 0.12, dust: true }); }
  function splash() { for (let i = 0; i < 14; i++) parts.push({ x: P.x + (Math.random() - 0.5) * 0.8, y: 0.1, z: P.z + 0.3, vx: (Math.random() - 0.5) * 4, vy: 2 + Math.random() * 3, vz: speed * 0.3, life: 0, max: 0.6, c: [150, 210, 255], r: 0.08 }); }
  function sparkle(x, y, z) { for (let i = 0; i < 5; i++) parts.push({ x, y, z, vx: (Math.random() - 0.5) * 3, vy: Math.random() * 3, vz: (Math.random() - 0.5) * 2 + speed * 0.6, life: 0, max: 0.35, c: [255, 240, 200], r: 0.07, star: true }); }
  function burstAt(x, y, z, col, n) { const c = hex(col); for (let i = 0; i < n; i++) { const a = Math.random() * TAU; parts.push({ x, y, z, vx: Math.cos(a) * 4, vy: Math.random() * 5, vz: Math.sin(a) * 4 + speed * 0.5, life: 0, max: 0.7, c, r: 0.09 }); } }
  function floatText(text, color) { floats.push({ text, color, t: 0 }); }
  function updateFx(dt) {
    for (const p of parts) { p.life += dt; p.vy -= (p.dust ? 1 : p.conf ? 4 : 9) * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; }
    parts = parts.filter(p => p.life < p.max);
    floats.forEach(f => f.t += dt); floats = floats.filter(f => f.t < 1.1);
    if (banner) { banner.t += dt; if (banner.t > 2.2) banner = null; }
    flash = Math.max(0, flash - dt * 1.5); cam.shake = Math.max(0, cam.shake - dt * 2);
    cam.x += (P.x * 0.55 - cam.x) * Math.min(1, dt * 8); cam.y += (CAM_H + P.y * 0.55 - cam.y) * Math.min(1, dt * 5); cam.z = P.z - CAM_BACK;
    cam.fov += ((P.dashT > 0 ? 1.1 : 1 + (speed - 10) / 120) - cam.fov) * Math.min(1, dt * 4); F = baseF * cam.fov;
  }

  /* ---------- render ---------- */
  function render() {
    const sh = cam.shake * cam.shake * 12;
    CX = W / 2 + (Math.random() - 0.5) * sh; CY = H * 0.5 + (Math.random() - 0.5) * sh; HY = CY - F * SP / CP;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const Z = WZ;
    const g = ctx.createLinearGradient(0, 0, 0, HY); g.addColorStop(0, Z.sky[0]); g.addColorStop(1, Z.sky[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, HY + 2);
    ctx.fillStyle = Z.groundD; ctx.fillRect(0, HY, W, H - HY);
    horizon(Z);
    const z0 = Math.floor((cam.z + 1) / 4) * 4, z1 = cam.z + 150;
    for (let z = z1; z >= z0; z -= 4) {
      const alt = Math.floor(z / 4) % 2 === 0;
      ctx.fillStyle = alt ? Z.ground : Z.groundD; if (quad([[-60, 0, z], [60, 0, z], [60, 0, z + 4.05], [-60, 0, z + 4.05]])) ctx.fill();
      ctx.fillStyle = Z.walk; for (const sx of [-1, 1]) if (quad([[sx * LW * 1.75, 0.001, z], [sx * LW * 3.1, 0.001, z], [sx * LW * 3.1, 0.001, z + 4.05], [sx * LW * 1.75, 0.001, z + 4.05]])) ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,0.08)"; for (const sx of [-1, 1]) if (quad([[sx * LW * 1.75, 0.002, z + 1.95], [sx * LW * 3.1, 0.002, z + 1.95], [sx * LW * 3.1, 0.002, z + 2.05], [sx * LW * 1.75, 0.002, z + 2.05]])) ctx.fill();
      ctx.fillStyle = alt ? Z.road : Z.roadD; if (quad([[-LW * 1.6, 0.002, z], [LW * 1.6, 0.002, z], [LW * 1.6, 0.002, z + 4.05], [-LW * 1.6, 0.002, z + 4.05]])) ctx.fill();
      ctx.fillStyle = "#e8e2d8"; for (const sx of [-1, 1]) if (quad([[sx * LW * 1.6, 0.003, z], [sx * LW * 1.75, 0.003, z], [sx * LW * 1.75, 0.003, z + 4.05], [sx * LW * 1.6, 0.003, z + 4.05]])) ctx.fill();
      ctx.fillStyle = Z.line; for (const lx of [-LW / 2, LW / 2]) if (quad([[lx - 0.05, 0.004, z + 0.5], [lx + 0.05, 0.004, z + 0.5], [lx + 0.05, 0.004, z + 2.3], [lx - 0.05, 0.004, z + 2.3]])) ctx.fill();
      if (Z.zone === "downtown" && Math.floor(z / 4) % 12 === 0) { ctx.fillStyle = "rgba(255,255,255,0.85)"; for (let k = -4; k < 5; k++) if (quad([[k * 0.48 - 0.15, 0.005, z], [k * 0.48 + 0.15, 0.005, z], [k * 0.48 + 0.15, 0.005, z + 2.6], [k * 0.48 - 0.15, 0.005, z + 2.6]])) ctx.fill(); }
    }
    // finish line on the road
    if (!L.boss) { ctx.fillStyle = "#fff"; for (let k = 0; k < 12; k++) for (let j = 0; j < 2; j++) { ctx.fillStyle = (k + j) % 2 ? "#2a2340" : "#ffffff"; if (quad([[-LW * 1.6 + k * LW * 3.2 / 12, 0.006, L.length + j * 0.5], [-LW * 1.6 + (k + 1) * LW * 3.2 / 12, 0.006, L.length + j * 0.5], [-LW * 1.6 + (k + 1) * LW * 3.2 / 12, 0.006, L.length + (j + 1) * 0.5], [-LW * 1.6 + k * LW * 3.2 / 12, 0.006, L.length + (j + 1) * 0.5]])) ctx.fill(); } }
    const list = [], zMin = cam.z + 0.6, zMax = cam.z + 140;
    props(list, zMin, zMax);
    for (const o of obs) { if (o.z + o.d < zMin || o.z > zMax) continue; const flat = o.type === "puddle" || o.type === "dash"; list.push({ d: flat ? 1e5 + (o.z) * -1 : depthOf(o.x, o.z + (o.type === "flatbed" ? 0 : o.d / 2)), f: () => drawObs(o) }); }
    for (const c of bones) { if (c.z < zMin || c.z > zMax) continue; const p = proj(c.x, c.y, c.z); if (p) list.push({ d: p.d - 0.05, f: () => drawBone(c, p) }); }
    for (const c of parcels) { if (c.taken || c.z < zMin || c.z > zMax) continue; const p = proj(c.x, c.y + Math.sin(time * 3) * 0.1, c.z); if (p) list.push({ d: p.d - 0.05, f: () => drawParcel(p) }); }
    for (const pw of pows) { if (pw.z < zMin || pw.z > zMax) continue; const p = proj(pw.x, pw.y + Math.sin(time * 3) * 0.12, pw.z); if (p) list.push({ d: p.d - 0.05, f: () => drawPow(pw, p) }); }
    if (!L.boss) { const p = proj(0, 0, L.length); if (p) list.push({ d: p.d, f: drawFinish }); }
    if (truck) { const tz = P.z + truck.gap, p = proj(0, 0, tz); if (p) list.push({ d: p.d, f: () => drawTruck(tz) }); }
    const pp = proj(P.x, P.y, P.z); if (pp) list.push({ d: pp.d - 0.2, f: () => drawDog(pp) });
    list.sort((a, b) => b.d - a.d);
    for (const o of list) o.f();
    for (const p of parts) { const q = proj(p.x, p.y, p.z); if (!q) continue; const k = 1 - p.life / p.max; ctx.fillStyle = rgb(p.c, k * (p.dust ? 0.6 : 1)); const r = Math.max(1, p.r * q.s * (p.dust ? 1 + (1 - k) * 2 : 1)); if (p.star) { ctx.fillRect(q.x - r, q.y - r * 0.25, r * 2, r * 0.5); ctx.fillRect(q.x - r * 0.25, q.y - r, r * 0.5, r * 2); } else if (p.conf) { ctx.fillRect(q.x - r, q.y - r * 1.6, r * 2, r * 3.2); } else { ctx.beginPath(); ctx.arc(q.x, q.y, r, 0, TAU); ctx.fill(); } }
    if (P.dashT > 0 || run.sprint > 0) { ctx.strokeStyle = "rgba(255,255,255,0.4)"; ctx.lineWidth = 2; for (let i = 0; i < 16; i++) { const a = hash(i * 3.1) * TAU, r0 = (0.3 + ((time * 2.2 + hash(i)) % 1) * 0.6) * Math.max(W, H); ctx.beginPath(); ctx.moveTo(CX + Math.cos(a) * r0, HY + Math.sin(a) * r0 * 0.8); ctx.lineTo(CX + Math.cos(a) * (r0 + 60), HY + Math.sin(a) * (r0 + 60) * 0.8); ctx.stroke(); } }
    if (P.slowT > 0) { ctx.fillStyle = `rgba(255,120,90,${P.slowT * 0.15})`; ctx.fillRect(0, 0, W, H); }
    ctx.fillStyle = vign; ctx.fillRect(0, 0, W, H);
    if (flash > 0) { ctx.fillStyle = `rgba(255,255,255,${flash})`; ctx.fillRect(0, 0, W, H); }
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
    if (mode === "countdown") { const n = Math.ceil(countdown), k = countdown % 1, s = Math.min(W * 0.3, 130) * (1 + k * 0.4); ctx.globalAlpha = Math.min(1, k * 3); ctx.font = `900 ${s}px ${FONT}`; ctx.lineWidth = s * 0.12; ctx.strokeStyle = OUT; ctx.strokeText(n, W / 2, H * 0.35); ctx.fillStyle = "#ffd23f"; ctx.fillText(n, W / 2, H * 0.35); ctx.globalAlpha = 1; }
    if (banner) { const k = banner.t, a = k < 0.2 ? k / 0.2 : k > 1.8 ? (2.2 - k) / 0.4 : 1, s = Math.min(W * 0.11, 46); ctx.globalAlpha = clamp(a, 0, 1); ctx.font = `900 ${s}px ${FONT}`; ctx.lineWidth = s * 0.22; ctx.strokeStyle = OUT; ctx.strokeText(banner.text, W / 2, H * 0.3); ctx.fillStyle = "#fff"; ctx.fillText(banner.text, W / 2, H * 0.3); ctx.globalAlpha = 1; }
    floats.forEach((f, i) => { const a = 1 - f.t / 1.1, s = 22; ctx.globalAlpha = a; ctx.font = `900 ${s}px ${FONT}`; ctx.lineWidth = 5; ctx.strokeStyle = OUT; const y = H * 0.44 - f.t * 40 - i * 26; ctx.strokeText(f.text, W / 2, y); ctx.fillStyle = f.color; ctx.fillText(f.text, W / 2, y); ctx.globalAlpha = 1; });
  }
  const FONT = '"Lilita One","Fredoka","Arial Rounded MT Bold","Trebuchet MS",system-ui,sans-serif';
  function depthOf(x, z) { const p = proj(x, 0.5, z); return p ? p.d : 1e9; }
  function horizon(Z) {
    const sx = W * 0.72 - cam.x * 4, sy = HY - H * 0.12;
    const sg = ctx.createRadialGradient(sx, sy, 4, sx, sy, H * 0.16); sg.addColorStop(0, "#fffbe0"); sg.addColorStop(0.25, "#fff6c8"); sg.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = sg; ctx.fillRect(sx - H * 0.16, sy - H * 0.16, H * 0.32, H * 0.32);
    ctx.fillStyle = "rgba(255,255,255,0.88)"; for (let i = 0; i < 5; i++) { const x = ((hash(i) * W * 2 - time * (6 + i * 3)) % (W + 200) + W + 200) % (W + 200) - 100, y = HY * (0.2 + hash(i + 4) * 0.5), r = 18 + hash(i + 9) * 20; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.arc(x + r, y + 5, r * 0.8, 0, TAU); ctx.arc(x - r, y + 6, r * 0.7, 0, TAU); ctx.fill(); }
    const base = HY + 1;
    if (Z.zone === "harbor") { ctx.fillStyle = "#3fa8d8"; ctx.fillRect(0, HY - H * 0.02, W, H * 0.03); ctx.fillStyle = "rgba(255,255,255,0.6)"; for (let i = 0; i < 12; i++) ctx.fillRect(((hash(i) * W + time * 10) % W), HY - H * 0.012 + hash(i + 2) * H * 0.015, 18, 2); ctx.fillStyle = "#c86a4a"; for (let i = 0; i < 3; i++) { const x = hash(i + 50) * W - cam.x * 2; ctx.fillRect(x, base - H * 0.08, 6, H * 0.08); ctx.fillRect(x, base - H * 0.08, H * 0.07, 5); } }
    else if (Z.zone === "downtown") { for (let i = 0; i < 22; i++) { const x = (i / 22) * W * 1.1 - 20 - cam.x * 2, w = W / 24, h = H * (0.06 + hash(i) * 0.14); ctx.fillStyle = ["#8aa0c8", "#9cb0d4", "#7f94bc"][i % 3]; ctx.fillRect(x, base - h, w - 2, h); ctx.fillStyle = "rgba(255,255,255,0.4)"; for (let yy = base - h + 5; yy < base - 4; yy += 8) ctx.fillRect(x + 3, yy, w - 8, 2); } }
    else { ctx.fillStyle = "#6fae5a"; ctx.beginPath(); ctx.moveTo(0, base); for (let i = 0; i <= 10; i++) { const x = i / 10 * W - cam.x * 2; ctx.quadraticCurveTo(x + W / 20, base - H * (0.03 + hash(i + 7) * 0.05), x + W / 10, base); } ctx.fill(); }
  }
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
  function label(f, text, col = "#fff", k = 0.22) { if (!f) return; const m = { x: (f[0].x + f[1].x) / 2, y: (f[0].y + f[3].y) / 2 }, s = Math.abs(f[1].x - f[0].x); ctx.fillStyle = col; ctx.font = `900 ${Math.max(7, s * k)}px ${FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(text, m.x, m.y); }
  function car(o, col) {
    box(o.x, 0.3, o.z, o.w, 0.75, o.d, shade(col, 0.25), col, shade(col, -0.25));
    box(o.x, 1.05, o.z + 0.7, o.w * 0.86, 0.5, o.d - 1.3, shade(col, 0.3), "#bfe4ff", shade(col, -0.2));
    for (const sx of [-1, 1]) { const w0 = proj(o.x + sx * (o.w / 2 - 0.18), 0.3, o.z + 0.5); if (w0) { ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(w0.x, w0.y, w0.s * 0.3, 0, TAU); ctx.fill(); ctx.fillStyle = "#c8c8d8"; ctx.beginPath(); ctx.arc(w0.x, w0.y, w0.s * 0.12, 0, TAU); ctx.fill(); } }
  }
  function drawObs(o) {
    const Z = WZ;
    if (o.type !== "puddle" && o.type !== "dash") { const s = quad([[o.x - o.w / 2, 0.005, o.z - 0.2], [o.x + o.w / 2, 0.005, o.z - 0.2], [o.x + o.w / 2, 0.005, o.z + o.d], [o.x - o.w / 2, 0.005, o.z + o.d]]); if (s) { ctx.fillStyle = "rgba(0,0,0,0.15)"; ctx.fill(); } }
    switch (o.type) {
      case "puddle": { const q = quad([[o.x - 0.6, 0.006, o.z], [o.x + 0.6, 0.006, o.z + 0.3], [o.x + 0.55, 0.006, o.z + o.d], [o.x - 0.65, 0.006, o.z + o.d - 0.4]]); if (q) { ctx.fillStyle = "rgba(90,160,230,0.75)"; ctx.fill(); ctx.strokeStyle = "rgba(255,255,255,0.6)"; ctx.lineWidth = 2; ctx.stroke(); } break; }
      case "dash": { const used = o.used; for (let k = 0; k < 3; k++) { const z0 = o.z + k * 0.6 - ((time * 3) % 0.6); const a = proj(o.x - 0.5, 0.007, z0), b = proj(o.x, 0.007, z0 + 0.5), c = proj(o.x + 0.5, 0.007, z0); if (!a || !b || !c) continue; ctx.strokeStyle = used ? "rgba(255,255,255,0.3)" : ["#3fd5a8", "#7fffd8", "#ffffff"][k]; ctx.lineWidth = Math.max(2, a.s * 0.14); ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.stroke(); } break; }
      case "cone": for (const sx of [-0.35, 0.35]) { const b = proj(o.x + sx, 0, o.z + 0.2), t = proj(o.x + sx, o.h, o.z + 0.2); if (!b || !t) continue; const w = b.s * 0.28; ctx.fillStyle = "#ff7a2e"; ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(b.x - w, b.y); ctx.lineTo(t.x, t.y); ctx.lineTo(b.x + w, b.y); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = "#fff"; const m = (b.y + t.y) / 2; ctx.fillRect(b.x - w * 0.55, m - b.s * 0.05, w * 1.1, b.s * 0.09); ctx.fillStyle = "#ff7a2e"; ctx.fillRect(b.x - w * 1.2, b.y - b.s * 0.05, w * 2.4, b.s * 0.07); } break;
      case "closed": {
        box(o.x - o.w / 2 + 0.08, 0, o.z + 0.15, 0.1, o.h, 0.1, "#ddd", "#eee", "#ccc");
        box(o.x + o.w / 2 - 0.08, 0, o.z + 0.15, 0.1, o.h, 0.1, "#ddd", "#eee", "#ccc");
        const f = box(o.x, 0.55, o.z, o.w, 0.55, 0.15, "#fff", "#ffffff", "#ddd");
        if (f) { ctx.save(); ctx.clip(); ctx.fillStyle = "#e8403a"; for (let i = 0; i < 6; i++) { const a = proj(o.x - o.w / 2 + i * o.w / 5, 0.55, o.z), b = proj(o.x - o.w / 2 + i * o.w / 5 + o.w / 10, 1.1, o.z); if (a && b) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(a.x + (b.x - a.x) * 2, a.y); ctx.lineTo(b.x + (b.x - a.x), b.y); ctx.lineTo(b.x, b.y); ctx.fill(); } } ctx.restore(); }
        const sgn = box(o.x, 1.25, o.z, o.w * 0.7, 0.62, 0.12, "#ffb000", "#ffc83a", "#e09a00"); label(sgn, "LANE", OUT, 0.24);
        const sgn2 = proj(o.x, 1.45, o.z); if (sgn2) { ctx.fillStyle = OUT; ctx.font = `900 ${Math.max(6, sgn2.s * 0.2)}px ${FONT}`; ctx.fillText("CLOSED", sgn2.x, sgn2.y + sgn2.s * 0.12); }
        break;
      }
      case "bar": {
        box(o.x - o.w / 2 + 0.06, 0, o.z + 0.1, 0.1, o.y0 + o.h, 0.1, "#6a5a7a", "#8a7a9a", "#6a5a7a");
        box(o.x + o.w / 2 - 0.06, 0, o.z + 0.1, 0.1, o.y0 + o.h, 0.1, "#6a5a7a", "#8a7a9a", "#6a5a7a");
        const f = box(o.x, o.y0, o.z, o.w + 0.1, o.h * 0.7, 0.18, shade(Z.accent, 0.3), Z.accent, shade(Z.accent, -0.2)); label(f, "DUCK!", "#fff", 0.22);
        break;
      }
      case "car": car(o, ["#ff6f5f", "#4f9fe8", "#ffd23f", "#7fd65f"][Math.floor(o.hue * 4)]); break;
      case "mover": { car(o, "#b38cff"); const f = proj(o.x, 0.75, o.z); if (f) { ctx.fillStyle = "#fff8c0"; ctx.beginPath(); ctx.arc(f.x - f.s * 0.42, f.y, f.s * 0.13, 0, TAU); ctx.arc(f.x + f.s * 0.42, f.y, f.s * 0.13, 0, TAU); ctx.fill(); } break; }
      case "box": { const f = box(o.x, 0, o.z, 0.8, o.h, o.d, "#e8c08a", "#d8a868", "#b88a50"); if (f) { ctx.strokeStyle = "#8a5a2a"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo((f[0].x + f[1].x) / 2, f[0].y); ctx.lineTo((f[0].x + f[1].x) / 2, f[3].y); ctx.stroke(); } break; }
      case "flatbed": {
        const h = o.h, body = box(o.x, 0.35, o.z + 3, o.w, h - 0.35, o.d - 3, "#c8ccd8", "#a8b0c0", "#8a92a4");
        for (let i = 0; i < Math.floor((o.d - 3) / 2.5); i++) { const w0 = proj(o.x + (o.x > cam.x ? -1 : 1) * o.w / 2, 0.32, o.z + 4 + i * 2.5); if (w0) { ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(w0.x, w0.y, w0.s * 0.3, 0, TAU); ctx.fill(); } }
        ctx.fillStyle = "#e8c060"; const r = quad([[o.x - o.w / 2, 0, o.z], [o.x + o.w / 2, 0, o.z], [o.x + o.w / 2, h, o.z + 3], [o.x - o.w / 2, h, o.z + 3]]);
        if (r) { ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.stroke(); ctx.strokeStyle = "rgba(0,0,0,0.25)"; ctx.lineWidth = 1.5; for (let i = 1; i < 6; i++) { const a = proj(o.x - o.w / 2, h * i / 6, o.z + 3 * i / 6), b = proj(o.x + o.w / 2, h * i / 6, o.z + 3 * i / 6); if (a && b) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); } } }
        break;
      }
    }
  }
  function drawBone(c, p) {
    const r = p.s * 0.2, a = Math.sin(time * 4 + c.z) * 0.5;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(a); ctx.lineWidth = Math.max(1, r * 0.25); ctx.strokeStyle = OUT; ctx.fillStyle = "#fff6e0";
    ctx.beginPath(); ctx.rect(-r * 0.9, -r * 0.28, r * 1.8, r * 0.56); ctx.fill(); ctx.stroke();
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) { ctx.beginPath(); ctx.arc(sx * r * 0.95, sy * r * 0.28, r * 0.34, 0, TAU); ctx.fill(); ctx.stroke(); }
    ctx.fillRect(-r * 0.9, -r * 0.26, r * 1.8, r * 0.52);
    ctx.restore();
  }
  function drawParcel(p) { const r = p.s * 0.32; ctx.fillStyle = "rgba(255,230,120,0.4)"; ctx.beginPath(); ctx.arc(p.x, p.y, r * 1.6, 0, TAU); ctx.fill(); ctx.fillStyle = "#ffcc44"; ctx.strokeStyle = OUT; ctx.lineWidth = Math.max(1.5, r * 0.12); ctx.fillRect(p.x - r, p.y - r * 0.8, r * 2, r * 1.6); ctx.strokeRect(p.x - r, p.y - r * 0.8, r * 2, r * 1.6); ctx.fillStyle = "#e8403a"; ctx.fillRect(p.x - r * 0.15, p.y - r * 0.8, r * 0.3, r * 1.6); ctx.fillRect(p.x - r, p.y - r * 0.15, r * 2, r * 0.3); }
  function drawPow(pw, p) { const r = p.s * 0.42, col = C.powers[pw.kind].color; ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.beginPath(); ctx.arc(p.x, p.y, r * 1.35, 0, TAU); ctx.fill(); ctx.fillStyle = col; ctx.strokeStyle = OUT; ctx.lineWidth = Math.max(1.5, r * 0.12); ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill(); ctx.stroke(); powerIcon(ctx, pw.kind, p.x, p.y, r); }
  function powerIcon(g, kind, x, y, r) {
    g.strokeStyle = "#fff"; g.fillStyle = "#fff"; g.lineWidth = Math.max(2, r * 0.22); g.lineCap = "round"; g.lineJoin = "round"; g.beginPath();
    if (kind === "magnet") { g.arc(x, y + r * 0.05, r * 0.42, Math.PI, 0, true); g.moveTo(x - r * 0.42, y + r * 0.05); g.lineTo(x - r * 0.42, y - r * 0.4); g.moveTo(x + r * 0.42, y + r * 0.05); g.lineTo(x + r * 0.42, y - r * 0.4); g.stroke(); }
    else if (kind === "double") { g.font = `900 ${r * 0.9}px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("x2", x, y + r * 0.05); }
    else if (kind === "sprint") { g.moveTo(x - r * 0.45, y - r * 0.35); g.lineTo(x + r * 0.05, y); g.lineTo(x - r * 0.45, y + r * 0.35); g.moveTo(x, y - r * 0.35); g.lineTo(x + r * 0.5, y); g.lineTo(x, y + r * 0.35); g.stroke(); }
    else if (kind === "shield") { g.moveTo(x, y - r * 0.5); g.lineTo(x + r * 0.42, y - r * 0.3); g.lineTo(x + r * 0.34, y + r * 0.15); g.lineTo(x, y + r * 0.5); g.lineTo(x - r * 0.34, y + r * 0.15); g.lineTo(x - r * 0.42, y - r * 0.3); g.closePath(); g.fill(); }
  }
  function drawFinish() {
    const z = L.length;
    for (const sx of [-1, 1]) box(sx * LW * 1.75, 0, z, 0.25, 3.6, 0.25, "#fff", "#ffffff", "#ddd");
    const a = proj(-LW * 1.85, 3.6, z), b = proj(LW * 1.85, 3.6, z), c = proj(LW * 1.85, 3.0, z); if (!a || !b || !c) return;
    const hgt = c.y - b.y, cells = 14, cw = (b.x - a.x) / cells;
    for (let i = 0; i < cells; i++) for (let j = 0; j < 2; j++) { ctx.fillStyle = (i + j) % 2 ? OUT : "#fff"; ctx.fillRect(a.x + i * cw, a.y + j * hgt / 2, cw + 0.5, hgt / 2 + 0.5); }
    ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.strokeRect(a.x, a.y, b.x - a.x, hgt);
    ctx.fillStyle = "#ffd23f"; ctx.font = `900 ${Math.max(9, hgt * 0.9)}px ${FONT}`; ctx.textAlign = "center"; ctx.lineWidth = hgt * 0.18; ctx.strokeText("FINISH", (a.x + b.x) / 2, a.y - hgt * 0.6); ctx.fillText("FINISH", (a.x + b.x) / 2, a.y - hgt * 0.6);
  }
  function drawTruck(z) {
    const x = 0, w = LW * 1.7;
    box(x, 0.4, z, w, 2.6, 5, "#f4f4f8", "#ffffff", "#d8d8e4");
    const f = proj(x, 1.9, z); if (f) { ctx.fillStyle = "#e8403a"; ctx.font = `900 ${Math.max(8, f.s * 0.42)}px ${FONT}`; ctx.textAlign = "center"; ctx.fillText("SPEEDY POST", f.x, f.y); ctx.fillStyle = "#4f7fd8"; ctx.fillRect(f.x - f.s * 1.2, f.y + f.s * 0.35, f.s * 2.4, f.s * 0.14); }
    const d = proj(x, 1.0, z); if (d) { ctx.strokeStyle = "#c8c8d8"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(d.x, d.y - d.s * 0.6); ctx.lineTo(d.x, d.y + d.s * 0.55); ctx.stroke(); }
    for (const sx of [-1, 1]) { const w0 = proj(x + sx * (w / 2 - 0.25), 0.38, z + 0.6); if (w0) { ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(w0.x, w0.y, w0.s * 0.38, 0, TAU); ctx.fill(); } const tl = proj(x + sx * (w / 2 - 0.15), 0.85, z); if (tl) { ctx.fillStyle = "#ff3b3b"; ctx.fillRect(tl.x - tl.s * 0.08, tl.y - tl.s * 0.1, tl.s * 0.16, tl.s * 0.2); } }
  }
  function drawDog(p) {
    const s = p.s;
    const sh = proj(P.x, groundAt(P.lane, P.z) + 0.01, P.z);
    if (sh) { ctx.fillStyle = "rgba(0,0,0,0.2)"; ctx.beginPath(); ctx.ellipse(sh.x, sh.y, s * 0.42, s * 0.13, 0, 0, TAU); ctx.fill(); }
    ctx.save(); ctx.translate(p.x, p.y); ctx.scale(s / 100, s / 100);
    if (P.bumpT > 0) ctx.rotate(Math.sin(time * 40) * 0.12);
    dogArt(ctx, dog, { run: P.run, slide: P.slideT > 0, air: !P.onGround, t: time, lean: (laneX(P.lane) - P.x) * -0.15, still: mode === "countdown" });
    ctx.restore();
    if (run && run.shield > 0) { ctx.save(); ctx.globalAlpha = 0.5 + 0.15 * Math.sin(time * 6); ctx.strokeStyle = "#bff4ff"; ctx.lineWidth = Math.max(2, s * 0.05); ctx.fillStyle = "rgba(127,214,255,0.18)"; ctx.beginPath(); ctx.ellipse(p.x, p.y - s * 0.6, s * 0.6, s * 0.72, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore(); }
    if (P.slowT > 0) for (let i = 0; i < 3; i++) { const a = time * 6 + i * 2.1; ctx.fillStyle = "#ffd23f"; const x = p.x + Math.cos(a) * s * 0.3, y = p.y - s * 1.35 + Math.sin(a) * s * 0.08; ctx.beginPath(); ctx.arc(x, y, s * 0.045, 0, TAU); ctx.fill(); }
  }
  // the courier dog, seen from behind, 100 units = 1 m, feet at 0
  function dogArt(g, d, o) {
    const cyc = o.still ? 0 : (o.run || 0) * 0.42 % 1, a = cyc * TAU, slide = o.slide, air = o.air;
    const dark = shade(d.body, -0.2);
    g.lineJoin = "round"; g.lineCap = "round"; g.strokeStyle = OUT; g.lineWidth = 5;
    g.rotate(o.lean || 0);
    const bob = air || slide || o.still ? 0 : -Math.abs(Math.sin(a)) * 6, sway = air || slide || o.still ? 0 : Math.sin(a) * 2;
    if (slide) { g.translate(0, 4); g.scale(1.15, 0.6); }
    g.translate(sway, bob);
    // hind legs: kicked-back paw rises towards the camera and shows its toe beans
    const paw = (side, ph) => {
      const s = air ? 1 : o.still ? 0 : Math.max(0, Math.sin(ph));
      const x = side * 15, y = -8 - s * 22, k = 1 + s * 0.2;
      g.fillStyle = d.body; g.beginPath(); g.ellipse(side * 15, -26 - s * 8, 11, 16, 0, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = d.belly; g.beginPath(); g.ellipse(x, y, 11 * k, 9 * k, 0, 0, TAU); g.fill(); g.stroke();
      if (s > 0.3) { g.fillStyle = "#ff9fb8"; g.beginPath(); g.ellipse(x, y + 2 * k, 4.5 * k, 3.5 * k, 0, 0, TAU); g.fill(); [-5, 0, 5].forEach(dx => { g.beginPath(); g.arc(x + dx * k, y - 4 * k, 1.8 * k, 0, TAU); g.fill(); }); }
    };
    const order = Math.sin(a) > 0 ? [[1, a + Math.PI], [-1, a]] : [[-1, a], [1, a + Math.PI]];
    for (const [side, ph] of order) paw(side, ph);
    // body: a round loaf
    g.fillStyle = d.body; g.beginPath(); g.ellipse(0, -52, d.fluffy ? 34 : 31, 34, 0, 0, TAU); g.fill(); g.stroke();
    if (d.spots) { g.fillStyle = OUT; [[-12, -66, 5], [10, -44, 6], [16, -70, 4], [-16, -40, 4]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }); }
    if (d.fluffy) { g.fillStyle = shade(d.body, 0.25); for (let i = 0; i < 7; i++) { const an = i / 7 * TAU; g.beginPath(); g.arc(Math.cos(an) * 26, -52 + Math.sin(an) * 26, 9, 0, TAU); g.fill(); } }
    // fluffy bottom + wagging tail
    g.fillStyle = d.belly; g.beginPath(); g.ellipse(0, -30, 18, 12, 0, 0, TAU); g.fill();
    const wag = Math.sin(time * 18) * 0.5;
    g.save(); g.translate(0, -40); g.rotate(wag); g.fillStyle = d.id === "corgi" ? d.belly : d.body; g.beginPath(); g.ellipse(0, -10, 7, 12, 0, 0, TAU); g.fill(); g.stroke(); g.restore();
    // courier bag strap and bag on the side
    g.strokeStyle = shade(d.bag, -0.3); g.lineWidth = 7; g.beginPath(); g.moveTo(-22, -80); g.lineTo(24, -40); g.stroke();
    g.strokeStyle = OUT; g.lineWidth = 5;
    g.fillStyle = d.bag; g.beginPath(); g.roundRect ? g.roundRect(18, -56, 24, 24, 6) : g.rect(18, -56, 24, 24); g.fill(); g.stroke(); g.fillStyle = shade(d.bag, 0.3); g.fillRect(20, -54, 20, 7);
    // front paws peeking out on the run
    if (!air && !slide && !o.still) { const fp = Math.sin(a + Math.PI / 2); [[-1, fp], [1, -fp]].forEach(([side, k]) => { if (k > 0.2) { g.fillStyle = d.belly; g.beginPath(); g.ellipse(side * 28, -74 + k * 6, 8, 7, 0, 0, TAU); g.fill(); g.stroke(); } }); }
    // head
    const hy = -100;
    g.fillStyle = d.ear;
    [-1, 1].forEach(side => { g.save(); g.translate(side * 15, hy - 18); g.rotate(side * 0.35 + (air ? side * 0.3 : Math.sin(a) * 0.05)); if (d.id === "pug" || d.id === "dalmatian" || d.id === "poodle") { g.beginPath(); g.ellipse(side * 6, 10, 9, 16, 0, 0, TAU); g.fill(); g.stroke(); } else { g.fillStyle = d.body; g.beginPath(); g.moveTo(-10, 6); g.lineTo(0, -26); g.lineTo(10, 6); g.closePath(); g.fill(); g.stroke(); g.fillStyle = "#ffc2c8"; g.beginPath(); g.moveTo(-5, 3); g.lineTo(0, -16); g.lineTo(5, 3); g.closePath(); g.fill(); } g.restore(); g.fillStyle = d.ear; });
    g.fillStyle = d.body; g.beginPath(); g.ellipse(0, hy, 27, 24, 0, 0, TAU); g.fill(); g.stroke();
    // helmet with stripe and strap
    g.fillStyle = d.helmet; g.beginPath(); g.ellipse(0, hy - 8, 26, 19, 0, Math.PI, TAU); g.lineTo(26, hy - 4); g.quadraticCurveTo(0, hy + 2, -26, hy - 4); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = "#fff"; g.fillRect(-4, hy - 26, 8, 20);
    g.strokeStyle = OUT; g.lineWidth = 3; [-1, 1].forEach(side => { g.beginPath(); g.moveTo(side * 22, hy - 4); g.lineTo(side * 18, hy + 14); g.stroke(); });
  }

  /* ---------- street scenery ---------- */
  function props(list, zMin, zMax) {
    const step = 6;
    for (let z = Math.floor(zMin / step) * step; z < zMax; z += step) {
      const k = Math.floor(z / step);
      for (const side of [-1, 1]) {
        const h1 = hash(k * 2 + (side > 0 ? 1 : 0)), h2 = hash(k * 5.3 + side);
        const x = side * (LW * 3.1 + 1.8 + h1 * 1.6);
        const p = proj(x, 0, z); if (!p) continue;
        list.push({ d: p.d + 0.3, f: () => prop(x, z, side, h1, h2, k) });
        if (k % 3 === 0) { const lx = side * LW * 2.0, lp = proj(lx, 0, z + 1); if (lp) list.push({ d: lp.d + 0.2, f: () => lamp(lx, z + 1, side) }); }
      }
    }
  }
  function prop(x, z, side, h1, h2, k) {
    const zn = WZ.zone;
    if (zn === "suburb") {
      if (h2 > 0.3) house(x + side * 0.6, z, 2.4 + h1, ["#ffd6c8", "#cfe8ff", "#fff1c8", "#d8f2d0", "#f2d8ff"][Math.floor(h1 * 5)], ["#d8584a", "#4a6ad8", "#5a8f4a"][Math.floor(h2 * 3)]);
      else tree(x, z, h1);
      // picket fence along the pavement
      const fx = side * LW * 3.15; for (let i = 0; i < 3; i++) box(fx, 0, z + i * 2, 0.08, 0.7, 0.08, "#fff", "#ffffff", "#e0e0e0", false);
      const rail = quad([[fx, 0.5, z], [fx, 0.5, z + 6], [fx, 0.58, z + 6], [fx, 0.58, z]]); if (rail) { ctx.fillStyle = "#ffffff"; ctx.fill(); }
      if (h2 > 0.85) { const m = proj(side * LW * 2.9, 0, z + 3); if (m) { box(side * LW * 2.9, 0, z + 3, 0.08, 0.9, 0.08, "#8a5a3c", "#8a5a3c", "#6a4a2c", false); box(side * LW * 2.9, 0.9, z + 2.85, 0.35, 0.3, 0.45, "#4f7fd8", "#4f7fd8", "#3a5fb0"); } }
    } else if (zn === "harbor") {
      if (side < 0) { const b = proj(x - 3, 0, z); if (b && h2 > 0.6) { ctx.fillStyle = ["#ff6f5f", "#ffffff", "#4f9fe8"][Math.floor(h1 * 3)]; ctx.strokeStyle = OUT; ctx.lineWidth = 2; const s = b.s; ctx.beginPath(); ctx.moveTo(b.x - s * 1.4, b.y - s * 0.6); ctx.lineTo(b.x + s * 1.4, b.y - s * 0.6); ctx.lineTo(b.x + s, b.y); ctx.lineTo(b.x - s, b.y); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.moveTo(b.x, b.y - s * 0.6); ctx.lineTo(b.x, b.y - s * 2); ctx.lineTo(b.x + s * 0.9, b.y - s * 0.7); ctx.closePath(); ctx.fill(); ctx.stroke(); }
        box(side * LW * 3.2, 0, z, 0.15, 0.9, 0.15, "#c98a5c", "#c98a5c", "#a8704a", false); }
      else { if (h2 > 0.45) { const c = ["#e8403a", "#3fa8d8", "#f2b33c", "#5fbf6a"][Math.floor(h1 * 4)]; box(x + 0.6, 0, z, 2.4, 2.4, 5.5, shade(c, 0.2), c, shade(c, -0.25)); box(x + 0.6, 2.4, z + 0.5, 2.4, 2.2, 4.5, shade(c, 0.1), shade(c, -0.05), shade(c, -0.3)); } else { box(x, 0, z, 1, 0.8, 1, "#c98a5c", "#b8763c", "#8a5428"); } }
    } else {
      const hh = 6 + h1 * 9, c = ["#8aa0c8", "#c8a888", "#a8b8a0", "#d8c8b0", "#9c8fb8"][Math.floor(h2 * 5)];
      const f = box(x + side * 1.2, 0, z, 3.4, hh, 5.8, shade(c, 0.25), c, shade(c, -0.25));
      if (f) { ctx.fillStyle = "rgba(220,240,255,0.7)"; const w = Math.abs(f[1].x - f[0].x), h = Math.abs(f[0].y - f[3].y); for (let yy = 0.12; yy < 0.95; yy += 0.11) for (let xx = 0.12; xx < 0.9; xx += 0.26) ctx.fillRect(Math.min(f[0].x, f[1].x) + xx * w, f[3].y + yy * h, w * 0.14, h * 0.06); }
    }
  }
  function house(x, z, h, wall, roof) {
    const w = 2.6, d = 3.2; box(x, 0, z, w, h, d, shade(wall, 0.2), wall, shade(wall, -0.25));
    const a = proj(x - w / 2 - 0.2, h, z), b = proj(x + w / 2 + 0.2, h, z), t = proj(x, h + 1.3, z);
    if (a && b && t) { ctx.fillStyle = roof; ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(t.x, t.y); ctx.lineTo(b.x, b.y); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    const wn = proj(x, h * 0.55, z); if (wn) { const s = wn.s; ctx.fillStyle = "#bfe8ff"; ctx.strokeStyle = OUT; ctx.lineWidth = 1.5; [[-0.75, -0.35], [0.25, -0.35]].forEach(([dx, dy]) => { ctx.fillRect(wn.x + dx * s, wn.y + dy * s, s * 0.5, s * 0.5); ctx.strokeRect(wn.x + dx * s, wn.y + dy * s, s * 0.5, s * 0.5); }); }
    const dr = proj(x, 0.9, z); if (dr) { ctx.fillStyle = "#8a5a3c"; ctx.fillRect(dr.x - dr.s * 0.22, dr.y - dr.s * 0.25, dr.s * 0.44, dr.s * 0.9); }
  }
  function tree(x, z, h1) { const b = proj(x, 0, z), t = proj(x, 2.6 + h1, z); if (!b || !t) return; ctx.strokeStyle = "#8a5a3c"; ctx.lineWidth = Math.max(2, t.s * 0.2); ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(t.x, t.y); ctx.stroke(); ctx.strokeStyle = OUT; ctx.lineWidth = 2; [[0, 0, 1], [-0.6, 0.35, 0.75], [0.6, 0.4, 0.7]].forEach(([dx, dy, r], i) => { ctx.fillStyle = i ? "#5fb85a" : "#4fa84a"; ctx.beginPath(); ctx.arc(t.x + dx * t.s, t.y + dy * t.s, r * t.s * 1.0, 0, TAU); ctx.fill(); ctx.stroke(); }); }
  function lamp(x, z, side) { const b = proj(x, 0, z), t = proj(x, 3.4, z), hd = proj(x - side * 0.5, 3.4, z); if (!b || !t || !hd) return; ctx.strokeStyle = "#4a4a5a"; ctx.lineWidth = Math.max(1.5, t.s * 0.08); ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(t.x, t.y); ctx.lineTo(hd.x, hd.y); ctx.stroke(); ctx.fillStyle = "#fff6c0"; ctx.beginPath(); ctx.ellipse(hd.x, hd.y + t.s * 0.06, t.s * 0.16, t.s * 0.09, 0, 0, TAU); ctx.fill(); }

  /* ---------- loop ---------- */
  let last = performance.now();
  function frame(now) { const dt = Math.min(0.05, (now - last) / 1000); last = now; update(dt); render(); requestAnimationFrame(frame); }
  resize(); run = fresh(); attract(); requestAnimationFrame(frame);

  return {
    on, attract, start, act,
    pause(p) { if (p && (mode === "play" || mode === "countdown")) { this._m = mode; mode = "paused"; } else if (!p && mode === "paused") { mode = this._m || "play"; last = performance.now(); } },
    setDog(id) { dog = C.dogs.find(d => d.id === id) || C.dogs[0]; },
    setUpgrades(u) { upg = Object.assign({ magnet: 0, double: 0, sprint: 0 }, u); },
    dogArt, powerIcon, durOf,
    get mode() { return mode; }, get run() { return run; }, get level() { return L; }, get player() { return P; }, get truck() { return truck; },
    progress() { return L.boss ? clamp(1 - (truck ? truck.gap - 3 : 0) / (L.gap - 3), 0, 1) : clamp(P.z / L.length, 0, 1); },
    setBot(b) { bot = b; }, step(dt = 1 / 60, n = 1) { for (let i = 0; i < n; i++) update(dt); render(); }, simulate(dt, n) { for (let i = 0; i < n; i++) update(dt); }
  };
})();

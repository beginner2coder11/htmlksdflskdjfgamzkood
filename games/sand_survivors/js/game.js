/* ==========================================================================
   SANDSTORM SURVIVORS — engine
   Everything is drawn into a small low-res canvas (about 200 px wide on a
   phone) and scaled up with smoothing off, for crisp pixels. World units are
   those low-res pixels. Enemies live in a spatial grid so hundreds can be
   on screen at once.
   ========================================================================== */
window.Game = (() => {
  const C = window.GAME_CONFIG, X = window.Pix, TAU = Math.PI * 2;
  const cv = document.getElementById("view"), ctx = cv.getContext("2d");
  const lo = document.createElement("canvas"), g = lo.getContext("2d");
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
  const rnd = (a, b) => a + Math.random() * (b - a);

  /* ---------- screen ---------- */
  let W = 1, H = 1, DPR = 1, S = 2, LW = 200, LH = 400;
  function resize() {
    DPR = Math.min(devicePixelRatio || 1, 2); W = Math.max(1, innerWidth); H = Math.max(1, innerHeight);
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); cv.style.width = W + "px"; cv.style.height = H + "px";
    S = Math.max(2, Math.round(Math.min(W, H) / 210)); LW = Math.ceil(W / S); LH = Math.ceil(H / S);
    lo.width = LW; lo.height = LH;
  }
  addEventListener("resize", resize);

  /* ---------- state ---------- */
  const on = {};
  let mode = "attract", bot = true, stage = C.stages[0], stageIdx = 0, hero = null, heroDef = C.heroes[0], meta = {};
  let enemies = [], proj = [], gems = [], picks = [], fx = [], nums = [], parts = [];
  let t = 0, kills = 0, coins = 0, spawnAcc = 0, nextSwarm = 60, nextElite = 75, bossIdx = 0, boss = null, warnT = 0, shake = 0, revived = false;
  const cam = { x: 0, y: 0 };
  let weapons = {}, passives = {}, wstate = {};
  const P = k => passives[k] || 0, M = k => meta[k] || 0;
  const heroSpeed = () => 52 * (1 + P("boots") * 0.08 + M("swift") * 0.04);
  const magnetR = () => 40 * (1 + P("magnet") * 0.3 + M("reach") * 0.15);
  const dmgMul = () => 1 + P("might") * 0.1 + M("power") * 0.05;
  const cdMul = () => Math.max(0.4, 1 - P("haste") * 0.08);
  const areaMul = () => 1 + P("area") * 0.1;
  const maxHp = () => 100 + P("vigor") * 20 + M("health") * 10;

  function reset(si, hid, opts = {}) {
    stageIdx = si; stage = C.stages[si]; heroDef = C.heroes.find(h => h.id === hid) || C.heroes[0];
    enemies = []; proj = []; gems = []; picks = []; fx = []; nums = []; parts = [];
    t = 0; kills = 0; coins = 0; spawnAcc = 0; nextSwarm = 60; nextElite = 75; bossIdx = 0; boss = null; warnT = 0; shake = 0; revived = false;
    weapons = { blaster: 1, [heroDef.weapon]: 1 }; passives = {}; wstate = {};
    hero = { x: 0, y: 0, hp: 100, inv: 0, face: { x: 1, y: 0 }, moving: false, walkT: 0, level: 1, xp: 0, next: xpFor(1), hurtT: 0, aim: 0, aimT: 0, recoil: 0, aimed: false };
    hero.hp = maxHp();
    cam.x = 0; cam.y = 0; bot = !!opts.bot;
  }
  const xpFor = lv => Math.floor(4 + lv * 3.5 + lv * lv * 0.55);
  function attract() { meta = {}; reset(Math.floor(Math.random() * 3), C.heroes[Math.floor(Math.random() * 4)].id, { bot: true }); mode = "attract"; }
  function start(si, hid, m, opts = {}) { meta = m || {}; reset(si, hid, opts); mode = "play"; on.start && on.start(); }

  /* ---------- input: floating joystick + keys ---------- */
  const joy = { on: false, x0: 0, y0: 0, dx: 0, dy: 0, id: null };
  const keys = {};
  cv.addEventListener("pointerdown", e => { Sound.unlock(); joy.on = true; joy.id = e.pointerId; joy.x0 = e.clientX; joy.y0 = e.clientY; joy.dx = joy.dy = 0; try { cv.setPointerCapture(e.pointerId); } catch (er) {} on.joy && on.joy(true, joy.x0, joy.y0, 0, 0); });
  cv.addEventListener("pointermove", e => { if (!joy.on || e.pointerId !== joy.id) return; let dx = e.clientX - joy.x0, dy = e.clientY - joy.y0; const d = Math.hypot(dx, dy), R = 44; if (d > R) { dx = dx / d * R; dy = dy / d * R; } joy.dx = dx / R; joy.dy = dy / R; on.joy && on.joy(true, joy.x0, joy.y0, dx, dy); });
  const endJoy = e => { if (e.pointerId !== joy.id) return; joy.on = false; joy.dx = joy.dy = 0; on.joy && on.joy(false); };
  cv.addEventListener("pointerup", endJoy); cv.addEventListener("pointercancel", endJoy);
  addEventListener("keydown", e => { keys[e.key.toLowerCase()] = true; });
  addEventListener("keyup", e => { keys[e.key.toLowerCase()] = false; });

  /* ---------- spatial grid ---------- */
  const CELL = 24; let grid = new Map();
  function buildGrid() { grid = new Map(); for (const e of enemies) { const k = ((e.x / CELL) | 0) + "," + ((e.y / CELL) | 0); let a = grid.get(k); if (!a) grid.set(k, a = []); a.push(e); } }
  function near(x, y, r, fn) { const c0 = Math.floor((x - r) / CELL), c1 = Math.floor((x + r) / CELL), r0 = Math.floor((y - r) / CELL), r1 = Math.floor((y + r) / CELL); for (let cx = c0; cx <= c1; cx++) for (let cy = r0; cy <= r1; cy++) { const a = grid.get(cx + "," + cy); if (a) for (const e of a) if (!e.dead) fn(e); } }
  function nearest(x, y, maxR = 160) { let best = null, bd = maxR * maxR; for (const e of enemies) { if (e.dead) continue; const d = (e.x - x) ** 2 + (e.y - y) ** 2; if (d < bd) { bd = d; best = e; } } return best; }

  /* ---------- spawning ---------- */
  const hpMul = () => (1 + t / 60 * 0.32 + Math.max(0, t - 300) / 60 * 0.25) * (1 + stageIdx * 0.25);
  const atkMul = () => (1 + t / 60 * 0.1) * (1 + stageIdx * 0.15);
  function spawnEnemy(type, o = {}) {
    const d = C.enemies[type], a = o.a ?? Math.random() * TAU, R = o.r ?? Math.hypot(LW, LH) / 2 + 16;
    const e = { type, x: hero.x + Math.cos(a) * R, y: hero.y + Math.sin(a) * R, hp: d.hp * hpMul() * (o.hpK || 1), speed: d.speed * (o.spK || 1), dmg: d.dmg * atkMul() * (o.dmK || 1), xp: d.xp * (o.xpK || 1) * (1 + stageIdx * 0.4), flash: 0, kx: 0, ky: 0, t: Math.random() * 9, scale: o.scale || 1, elite: !!o.elite, boss: o.boss || null, dashT: 0, dashCd: 2 + Math.random() * 2, fly: !!d.fly, dir: 1 };
    e.max = e.hp; e.r = 5 * e.scale; e.id = ++eid; enemies.push(e); return e;
  }
  function director(dt) {
    const avail = Object.entries(C.enemies).filter(([, d]) => t >= d.from).map(([k]) => k);
    const rate = 0.9 + t / 60 * 0.85;
    spawnAcc += dt * rate;
    while (spawnAcc >= 1 && enemies.length < 320) {
      spawnAcc -= 1;
      const w = avail.map((k, i) => 1 + i * 0.6), tot = w.reduce((a, b) => a + b, 0); let r = Math.random() * tot, type = avail[0];
      for (let i = 0; i < avail.length; i++) { r -= w[i]; if (r <= 0) { type = avail[i]; break; } }
      spawnEnemy(type);
    }
    if (t >= nextSwarm) { nextSwarm += 60; const type = t < 120 ? "slime" : t < 300 ? "crab" : "beetle", n = 10 + Math.floor(t / 20); for (let i = 0; i < n; i++) spawnEnemy(type, { a: i / n * TAU, r: Math.hypot(LW, LH) / 2 + 8 }); on.banner && on.banner("SWARM!"); }
    if (t >= nextElite) { nextElite += 75; const type = avail[avail.length - 1]; spawnEnemy(type, { elite: true, scale: 2, hpK: 12, dmK: 1.5, xpK: 8, spK: 0.9 }); }
    const ba = C.bossAt[bossIdx];
    if (ba !== undefined && t >= ba - 3 && warnT <= 0 && !boss) { warnT = 3; Sound.play("boss"); on.banner && on.banner("BOSS INCOMING"); }
    if (ba !== undefined && t >= ba && !boss) { const b = C.bosses[bossIdx]; boss = spawnEnemy(b.sprite, { boss: b, scale: b.scale, hpK: b.hp / C.enemies[b.sprite].hp / hpMul() * (1 + stageIdx * 0.25), dmK: b.dmg / C.enemies[b.sprite].dmg, xpK: 40, spK: b.speed / C.enemies[b.sprite].speed }); boss.name = b.name; bossIdx++; shake = 0.6; }
  }

  /* ---------- weapons ---------- */
  const WV = (k, f) => C.weapons[k][f][weapons[k] - 1];
  function fireWeapons(dt) {
    const dm = dmgMul(), cm = cdMul(), am = areaMul();
    for (const k in weapons) {
      const st = wstate[k] || (wstate[k] = { cd: 0.4, ang: 0 });
      if (k === "drones") { st.ang += dt * 3.2; const n = WV(k, "count"), R = WV(k, "radius") * am; st.pos = []; for (let i = 0; i < n; i++) { const a = st.ang + i / n * TAU, x = hero.x + Math.cos(a) * R, y = hero.y + Math.sin(a) * R; st.pos.push({ x, y }); near(x, y, 9, e => { if (Math.hypot(e.x - x, e.y - y) < e.r + 4 && (e.hitD || 0) < t) { e.hitD = t + 0.4; damage(e, WV(k, "dmg") * dm, Math.cos(a + 1.57), Math.sin(a + 1.57), 30); } }); } continue; }
      if (k === "flame") { st.cd -= dt; if (st.cd > 0) continue; st.cd = 0.12; const R = WV(k, "range") * am, fa = Math.atan2(hero.face.y, hero.face.x); near(hero.x, hero.y, R, e => { const dx = e.x - hero.x, dy = e.y - hero.y, d = Math.hypot(dx, dy); if (d > R + e.r) return; let da = Math.atan2(dy, dx) - fa; da = Math.atan2(Math.sin(da), Math.cos(da)); if (Math.abs(da) < 0.5) damage(e, WV(k, "dmg") * dm, dx / d, dy / d, 8, true); }); for (let i = 0; i < 3; i++) { const a = fa + rnd(-0.45, 0.45), v = rnd(60, 110); parts.push({ x: hero.x + hero.face.x * 6, y: hero.y + hero.face.y * 6 - 2, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: R / 110, col: ["#ffd23f", "#ff7a2e", "#e8403a"][i], s: 2, flame: true }); } continue; }
      st.cd -= dt; if (st.cd > 0) continue;
      const target = nearest(hero.x, hero.y, k === "tesla" ? 100 : 170);
      if (k === "blaster") { if (!target) { st.cd = 0.1; continue; } st.cd = WV(k, "cd") * cm; const n = WV(k, "count"), base = Math.atan2(target.y - hero.y, target.x - hero.x); hero.aim = hero.aimTo = base; hero.recoil = 0.09; const tip = gunTip(); for (let i = 0; i < n; i++) { const a = base + (i - (n - 1) / 2) * 0.16; proj.push({ k, x: tip.x, y: tip.y, vx: Math.cos(a) * 230, vy: Math.sin(a) * 230, dmg: WV(k, "dmg") * dm, pierce: WV(k, "pierce"), life: 1.1, hit: new Set() }); } Sound.play("shoot"); }
      if (k === "boomer") { st.cd = WV(k, "cd") * cm; const n = WV(k, "count"), base = target ? Math.atan2(target.y - hero.y, target.x - hero.x) : Math.atan2(hero.face.y, hero.face.x); for (let i = 0; i < n; i++) { const a = base + (i - (n - 1) / 2) * 0.5; proj.push({ k, x: hero.x, y: hero.y, vx: Math.cos(a) * 170, vy: Math.sin(a) * 170, dmg: WV(k, "dmg") * dm, life: 1.8, age: 0, hitT: {}, rot: 0, r: 5 * am }); } }
      if (k === "saw") { st.cd = WV(k, "cd") * cm; const n = WV(k, "count"); for (let i = 0; i < n; i++) { const a = Math.random() * TAU; proj.push({ k, x: hero.x, y: hero.y, vx: Math.cos(a) * 115, vy: Math.sin(a) * 115, dmg: WV(k, "dmg") * dm, life: 3.2, hitT: {}, rot: 0, r: 6 * am }); } }
      if (k === "tesla") { if (!target) { st.cd = 0.15; continue; } st.cd = WV(k, "cd") * cm; let cur = target, px = hero.x, py = hero.y - 4; const seen = new Set(); for (let i = 0; i < WV(k, "chain") && cur; i++) { seen.add(cur); fx.push({ kind: "bolt", x1: px, y1: py, x2: cur.x, y2: cur.y - 3, t: 0, max: 0.18 }); damage(cur, WV(k, "dmg") * dm, 0, 0, 0); px = cur.x; py = cur.y; let nb = null, bd = 60 * 60 * am * am; near(cur.x, cur.y, 60 * am, e => { if (seen.has(e)) return; const d = (e.x - px) ** 2 + (e.y - py) ** 2; if (d < bd) { bd = d; nb = e; } }); cur = nb; } Sound.play("zap"); }
      if (k === "mines") { st.cd = WV(k, "cd") * cm; proj.push({ k, x: hero.x, y: hero.y + 2, arm: 0.5, life: 7, dmg: WV(k, "dmg") * dm, R: WV(k, "radius") * am }); }
      if (k === "shock") { st.cd = WV(k, "cd") * cm; const R = WV(k, "radius") * am; fx.push({ kind: "ring", x: hero.x, y: hero.y, R, t: 0, max: 0.35, col: "#7fe8ff" }); near(hero.x, hero.y, R, e => { const dx = e.x - hero.x, dy = e.y - hero.y, d = Math.hypot(dx, dy) || 1; if (d < R + e.r) damage(e, WV(k, "dmg") * dm, dx / d, dy / d, 90); }); Sound.play("shock"); shake = Math.max(shake, 0.15); }
    }
  }
  function updateProj(dt) {
    const am = areaMul();
    for (const p of proj) {
      p.life -= dt;
      if (p.k === "blaster") { p.x += p.vx * dt; p.y += p.vy * dt; near(p.x, p.y, 10, e => { if (p.dead || p.hit.has(e)) return; if (Math.hypot(e.x - p.x, e.y - p.y) < e.r + 2) { p.hit.add(e); damage(e, p.dmg, p.vx / 230, p.vy / 230, 25); if (p.pierce-- <= 0) p.dead = true; } }); }
      else if (p.k === "boomer") { p.age += dt; p.rot += dt * 18; if (p.age > 0.45) { const dx = hero.x - p.x, dy = hero.y - p.y, d = Math.hypot(dx, dy) || 1; p.vx += (dx / d * 420 - p.vx) * dt * 4; p.vy += (dy / d * 420 - p.vy) * dt * 4; if (d < 8 && p.age > 0.7) p.dead = true; } else { p.vx *= 1 - dt * 2.2; p.vy *= 1 - dt * 2.2; } p.x += p.vx * dt; p.y += p.vy * dt; near(p.x, p.y, 12, e => { if ((p.hitT[e.id] || 0) > t) return; if (Math.hypot(e.x - p.x, e.y - p.y) < e.r + p.r) { p.hitT[e.id] = t + 0.3; damage(e, p.dmg, p.vx / 200, p.vy / 200, 30); } }); }
      else if (p.k === "saw") { p.rot += dt * 22; p.x += p.vx * dt; p.y += p.vy * dt; const hx = LW / 2 - 6, hy = LH / 2 - 6; if (p.x < cam.x - hx || p.x > cam.x + hx) p.vx *= -1; if (p.y < cam.y - hy || p.y > cam.y + hy) p.vy *= -1; near(p.x, p.y, 14, e => { if ((p.hitT[e.id] || 0) > t) return; if (Math.hypot(e.x - p.x, e.y - p.y) < e.r + p.r) { p.hitT[e.id] = t + 0.3; damage(e, p.dmg, p.vx / 115, p.vy / 115, 20); } }); }
      else if (p.k === "mines") { p.arm -= dt; let trig = p.life <= 0; if (p.arm <= 0) near(p.x, p.y, 12, e => { if (Math.hypot(e.x - p.x, e.y - p.y) < e.r + 6) trig = true; }); if (trig) { p.dead = true; fx.push({ kind: "boom", x: p.x, y: p.y, R: p.R, t: 0, max: 0.35 }); near(p.x, p.y, p.R, e => { const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy) || 1; if (d < p.R + e.r) damage(e, p.dmg, dx / d, dy / d, 60); }); Sound.play("boom"); shake = Math.max(shake, 0.2); for (let i = 0; i < 14; i++) { const a = Math.random() * TAU; parts.push({ x: p.x, y: p.y, vx: Math.cos(a) * rnd(30, 90), vy: Math.sin(a) * rnd(30, 90), life: 0, max: 0.4, col: i % 2 ? "#ffd23f" : "#ff7a2e", s: 2 }); } } }
      if (p.life <= 0 && p.k !== "mines") p.dead = true;
    }
    proj = proj.filter(p => !p.dead);
  }
  let eid = 0;
  function damage(e, d, nx, ny, kb, quiet) {
    if (e.dead) return;
    if (!e.id) e.id = ++eid;
    d = Math.round(d * rnd(0.9, 1.1)); e.hp -= d; e.flash = 0.08;
    const kk = kb * (e.boss ? 0.1 : e.elite ? 0.4 : 1); e.kx += nx * kk; e.ky += ny * kk;
    if (!quiet || Math.random() < 0.25) nums.push({ x: e.x + rnd(-3, 3), y: e.y - e.r * 2 - 2, n: d, t: 0, col: d >= 40 ? "#ffd23f" : "#ffffff" });
    if (!quiet) Sound.play("hit");
    if (e.hp <= 0) kill(e);
  }
  function kill(e) {
    e.dead = true; kills++;
    const v = e.xp; gems.push({ x: e.x, y: e.y, v, kind: v >= 5 ? 2 : v >= 2 ? 1 : 0, vx: 0, vy: 0, pull: false });
    const r = Math.random();
    if (e.elite || e.boss) picks.push({ type: "chest", x: e.x, y: e.y });
    else if (r < 0.03) picks.push({ type: "coin", x: e.x + 3, y: e.y });
    else if (r < 0.036) picks.push({ type: "food", x: e.x, y: e.y });
    else if (r < 0.038) picks.push({ type: "magnet", x: e.x, y: e.y });
    else if (r < 0.0395) picks.push({ type: "bomb", x: e.x, y: e.y });
    for (let i = 0; i < 6; i++) { const a = Math.random() * TAU; parts.push({ x: e.x, y: e.y - 3, vx: Math.cos(a) * rnd(20, 60), vy: Math.sin(a) * rnd(20, 60), life: 0, max: 0.35, col: e.boss ? "#ffd23f" : "#ffffff", s: e.boss ? 3 : 1 }); }
    Sound.play("pop");
    if (e === boss) { boss = null; shake = 0.8; on.banner && on.banner("BOSS DOWN!"); for (let i = 0; i < 8; i++) picks.push({ type: "coin", x: e.x + rnd(-14, 14), y: e.y + rnd(-14, 14) }); }
  }

  /* ---------- update ---------- */
  function update(dt) {
    if (mode === "levelup" || mode === "paused" || mode === "dead" || mode === "won") { updateFx(dt * (mode === "dead" || mode === "won" ? 1 : 0)); return; }
    t += dt;
    // movement
    let mx = joy.dx, my = joy.dy;
    if (keys.a || keys.arrowleft) mx -= 1; if (keys.d || keys.arrowright) mx += 1; if (keys.w || keys.arrowup) my -= 1; if (keys.s || keys.arrowdown) my += 1;
    if (bot) [mx, my] = botMove();
    const ml = Math.hypot(mx, my);
    if (ml > 0.1) { const k = Math.min(1, ml) / ml; hero.x += mx * k * heroSpeed() * dt; hero.y += my * k * heroSpeed() * dt; hero.face = { x: mx / ml, y: my / ml }; hero.moving = true; hero.walkT += dt; } else hero.moving = false;
    // the gun swings toward the nearest monster (or straight ahead when nothing is near)
    hero.aimT -= dt; hero.recoil = Math.max(0, hero.recoil - dt);
    if (hero.aimT <= 0) { hero.aimT = 0.08; const tg = nearest(hero.x, hero.y, 170); hero.aimed = !!tg; hero.aimTo = tg ? Math.atan2(tg.y - 4 - hero.y, tg.x - hero.x) : Math.atan2(hero.face.y, hero.face.x); }
    { let da = hero.aimTo - hero.aim; da = Math.atan2(Math.sin(da), Math.cos(da)); hero.aim += da * Math.min(1, dt * 16); }
    cam.x += (hero.x - cam.x) * Math.min(1, dt * 8); cam.y += (hero.y - cam.y) * Math.min(1, dt * 8);
    hero.inv = Math.max(0, hero.inv - dt); hero.hurtT = Math.max(0, hero.hurtT - dt);
    hero.hp = Math.min(maxHp(), hero.hp + P("regen") * 0.3 * dt);
    director(dt);
    warnT = Math.max(0, warnT - dt);
    buildGrid();
    // enemies chase, separate, get knocked back, hurt the hero
    for (const e of enemies) {
      if (e.dead) continue;
      e.t += dt; e.flash = Math.max(0, e.flash - dt);
      let dx = hero.x - e.x, dy = hero.y - e.y; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
      let sp = e.speed;
      if (C.enemies[e.type].dash || (e.boss && e.boss.id === "scorpking")) { e.dashCd -= dt; if (e.dashCd <= 0 && d < 90) { e.dashT = 0.5; e.dashCd = e.boss ? 2.2 : 3.2; } if (e.dashT > 0) { e.dashT -= dt; sp *= 3.6; } }
      if (e.fly) { const px = -dy, py = dx, w = Math.sin(e.t * 5) * 0.8; dx += px * w; dy += py * w; }
      if (e.boss && e.boss.id === "kingslime" && Math.random() < dt * 0.6) spawnEnemy("slime", { a: Math.random() * TAU, r: 0 }).x = e.x + rnd(-10, 10);
      if (e.boss && e.boss.id === "wormqueen" && Math.random() < dt * 0.5) { const n = spawnEnemy("worm", { r: 0 }); n.x = e.x + rnd(-14, 14); n.y = e.y + rnd(-14, 14); }
      let sx = 0, sy = 0;
      if (!e.boss) near(e.x, e.y, 10, o => { if (o === e) return; const ox = e.x - o.x, oy = e.y - o.y, od = ox * ox + oy * oy, rr = (e.r + o.r) * 0.9; if (od < rr * rr && od > 0.01) { const f = (rr - Math.sqrt(od)) / rr; sx += ox * f; sy += oy * f; } });
      e.x += (dx * sp + sx * 6 + e.kx) * dt; e.y += (dy * sp + sy * 6 + e.ky) * dt;
      e.kx *= 1 - dt * 8; e.ky *= 1 - dt * 8;
      e.dir = dx < 0 ? -1 : 1;
      if (d < e.r + 5 && hero.inv <= 0) { const dmg = Math.max(1, e.dmg - P("armor")); hero.hp -= dmg; hero.inv = 0.5; hero.hurtT = 0.2; shake = Math.max(shake, 0.25); Sound.play("hurt"); if (hero.hp <= 0) return die(); }
      // far behind: wrap round to the front so the pressure stays on
      if (d > Math.hypot(LW, LH) * 0.9 && !e.boss) { const a = Math.random() * TAU, R = Math.hypot(LW, LH) / 2 + 12; e.x = hero.x + Math.cos(a) * R; e.y = hero.y + Math.sin(a) * R; }
    }
    enemies = enemies.filter(e => !e.dead);
    fireWeapons(dt); updateProj(dt);
    // gems & pickups
    const mr = magnetR();
    for (const gm of gems) {
      const dx = hero.x - gm.x, dy = hero.y - gm.y, d = Math.hypot(dx, dy);
      if (gm.pull || d < mr) { gm.pull = true; const sp = 60 + (gm.sp = (gm.sp || 0) + dt * 260); gm.x += dx / (d || 1) * sp * dt; gm.y += dy / (d || 1) * sp * dt; }
      if (d < 6) { gm.dead = true; addXp(gm.v); Sound.play("gem"); }
    }
    gems = gems.filter(gm => !gm.dead);
    if (gems.length > 350) { const far = gems.sort((a, b) => ((b.x - hero.x) ** 2 + (b.y - hero.y) ** 2) - ((a.x - hero.x) ** 2 + (a.y - hero.y) ** 2)).splice(0, 100); const v = far.reduce((s, x) => s + x.v, 0); gems.push({ x: far[0].x, y: far[0].y, v, kind: 3 }); }
    for (const pk of picks) {
      const dx = hero.x - pk.x, dy = hero.y - pk.y, d = Math.hypot(dx, dy);
      if (pk.type === "coin" && d < mr) { pk.x += dx / d * 120 * dt; pk.y += dy / d * 120 * dt; }
      if (d < 8) { pk.dead = true; pickup(pk); }
    }
    picks = picks.filter(p => !p.dead);
    if (t >= C.stageTime && mode === "play") { mode = "won"; Sound.play("win"); on.end && on.end(result(true)); }
    if (t >= C.stageTime && mode === "attract") attract();
    updateFx(dt);
  }
  function pickup(pk) {
    if (pk.type === "coin") { coins += 1 + Math.floor(Math.random() * 3); Sound.play("coin"); }
    if (pk.type === "food") { hero.hp = Math.min(maxHp(), hero.hp + 30); Sound.play("heal"); nums.push({ x: hero.x, y: hero.y - 16, n: 30, t: 0, col: "#5fd068" }); }
    if (pk.type === "magnet") { for (const gm of gems) gm.pull = true; Sound.play("pick"); }
    if (pk.type === "bomb") { fx.push({ kind: "ring", x: hero.x, y: hero.y, R: Math.max(LW, LH), t: 0, max: 0.5, col: "#ffffff" }); for (const e of enemies) if (!e.boss && Math.abs(e.x - cam.x) < LW / 2 + 10 && Math.abs(e.y - cam.y) < LH / 2 + 10) damage(e, 9999, 0, 0, 0, true); Sound.play("boom"); shake = 0.6; }
    if (pk.type === "chest") { Sound.play("chest"); const n = Math.random() < 0.15 ? 3 : 1, got = []; for (let i = 0; i < n; i++) { const o = choices(1, true)[0]; if (o) { apply(o); got.push(o); } } on.chest && on.chest(got); }
  }
  function addXp(v) {
    hero.xp += v;
    if (hero.xp >= hero.next && mode !== "attract") { hero.xp -= hero.next; hero.level++; hero.next = xpFor(hero.level); Sound.play("level"); if (bot) { const c = choices(3); if (c[0]) apply(c[0]); } else { mode = "levelup"; on.levelup && on.levelup(choices(3)); } }
    else if (hero.xp >= hero.next && mode === "attract") { hero.xp -= hero.next; hero.level++; hero.next = xpFor(hero.level); const c = choices(1); if (c[0]) apply(c[0]); }
  }
  // level-up options: upgrade what you have, or add something new while slots are free
  function choices(n, upgradesOnly) {
    const opts = [];
    for (const k in weapons) if (weapons[k] < C.maxLevel) opts.push({ kind: "weapon", id: k, lv: weapons[k] + 1, w: 3 });
    for (const k in passives) if (passives[k] < C.maxLevel) opts.push({ kind: "passive", id: k, lv: passives[k] + 1, w: 2 });
    if (!upgradesOnly) {
      if (Object.keys(weapons).length < C.maxWeapons) for (const k in C.weapons) if (!weapons[k]) opts.push({ kind: "weapon", id: k, lv: 1, w: 2 });
      if (Object.keys(passives).length < C.maxPassives) for (const k in C.passives) if (!passives[k]) opts.push({ kind: "passive", id: k, lv: 1, w: 1.5 });
    }
    const out = [];
    while (out.length < n && opts.length) { const tot = opts.reduce((a, o) => a + o.w, 0); let r = Math.random() * tot; for (let i = 0; i < opts.length; i++) { r -= opts[i].w; if (r <= 0) { out.push(opts.splice(i, 1)[0]); break; } } }
    if (!out.length) out.push({ kind: "heal", id: "food", lv: 0 }, { kind: "gold", id: "coin", lv: 0 });
    return out;
  }
  function apply(o) {
    if (o.kind === "weapon") weapons[o.id] = o.lv;
    if (o.kind === "passive") { passives[o.id] = o.lv; if (o.id === "vigor") hero.hp += 20; }
    if (o.kind === "heal") hero.hp = maxHp();
    if (o.kind === "gold") coins += 25;
  }
  function die() {
    mode = "dead"; Sound.play("lose"); shake = 0.6;
    if (window.__audit && bot) window.__audit.push({ t: Math.round(t), lv: hero.level, kills });
    setTimeout(() => on.dead && on.dead(result(false), { canRevive: !revived }), 900);
  }
  function result(won) { return { won, time: t, kills, coins, level: hero.level, stage: stageIdx, weapons: { ...weapons } }; }
  function updateFx(dt) {
    for (const f of fx) f.t += dt; fx = fx.filter(f => f.t < f.max);
    for (const n of nums) { n.t += dt; n.y -= dt * 18; } nums = nums.filter(n => n.t < 0.6);
    for (const p of parts) { p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 1 - dt * 3; p.vy *= 1 - dt * 3; } parts = parts.filter(p => p.life < p.max);
    shake = Math.max(0, shake - dt * 2);
  }
  // test/attract bot: flee crowds, drift to gems, circle a little
  function botMove() {
    let fx_ = 0, fy = 0;
    near(hero.x, hero.y, 60, e => { const dx = hero.x - e.x, dy = hero.y - e.y, d2 = dx * dx + dy * dy + 1; const w = (e.boss ? 4 : e.elite ? 2 : 1) * 900 / d2; fx_ += dx * w / Math.sqrt(d2); fy += dy * w / Math.sqrt(d2); });
    let best = null, bd = 120 * 120; for (const gm of gems) { const d = (gm.x - hero.x) ** 2 + (gm.y - hero.y) ** 2; if (d < bd) { bd = d; best = gm; } }
    for (const pk of picks) { const d = (pk.x - hero.x) ** 2 + (pk.y - hero.y) ** 2; if (d < 120 * 120 && (pk.type === "chest" || (pk.type === "food" && hero.hp < maxHp() * 0.6))) { best = pk; break; } }
    const danger = Math.hypot(fx_, fy);
    if (best) { const dx = best.x - hero.x, dy = best.y - hero.y, d = Math.hypot(dx, dy) || 1, k = danger < 0.6 ? 2.2 : 0.8; fx_ += dx / d * k; fy += dy / d * k; }
    const a = t * 0.5; fx_ += Math.cos(a) * 0.35; fy += Math.sin(a) * 0.35;
    return [fx_, fy];
  }

  /* ---------- render ---------- */
  function render() {
    const sx = Math.round(cam.x - LW / 2 + (Math.random() - 0.5) * shake * 6), sy = Math.round(cam.y - LH / 2 + (Math.random() - 0.5) * shake * 6);
    g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = false;
    // ground tiles
    const T = 16, st = stage;
    for (let ty = Math.floor(sy / T); ty <= Math.floor((sy + LH) / T); ty++) for (let tx = Math.floor(sx / T); tx <= Math.floor((sx + LW) / T); tx++) {
      const h = hash(tx * 0.37, ty * 0.53), big = hash(Math.floor(tx / 4), Math.floor(ty / 4));
      g.fillStyle = st.ground[big < 0.22 && h < 0.75 ? 2 : h < 0.5 ? 0 : 1]; g.fillRect(tx * T - sx, ty * T - sy, T, T);
      const h2 = hash(tx * 1.7, ty * 2.3);
      if (h2 < 0.08) { g.fillStyle = st.deco[0]; g.fillRect(tx * T - sx + 4, ty * T - sy + 8, 3, 2); g.fillRect(tx * T - sx + 9, ty * T - sy + 5, 2, 2); }
      else if (h2 < 0.13) { g.fillStyle = st.grass; const x0 = tx * T - sx + 5, y0 = ty * T - sy + 9; g.fillRect(x0, y0, 1, 3); g.fillRect(x0 + 2, y0 - 1, 1, 4); g.fillRect(x0 + 4, y0, 1, 3); }
      else if (h2 > 0.985) prop(tx * T - sx + 8, ty * T - sy + 12, st, h);
    }
    const W2 = v => v - sx, H2 = v => v - sy;
    // gems & pickups
    for (const gm of gems) { const x = Math.round(W2(gm.x)), y = Math.round(H2(gm.y)); if (x < -4 || y < -4 || x > LW + 4 || y > LH + 4) continue; const col = ["#5fc8ff", "#5fd068", "#e8403a", "#ffd23f"][gm.kind]; g.fillStyle = X.K; g.fillRect(x - 2, y - 3, 5, 7); g.fillStyle = col; g.fillRect(x - 1, y - 2, 3, 5); g.fillStyle = "#ffffff"; g.fillRect(x - 1, y - 2, 1, 1); }
    for (const pk of picks) pickArt(Math.round(W2(pk.x)), Math.round(H2(pk.y)), pk.type);
    for (const p of proj) if (p.k === "mines") { const x = Math.round(W2(p.x)), y = Math.round(H2(p.y)); g.fillStyle = X.K; g.fillRect(x - 3, y - 2, 6, 4); g.fillStyle = "#4a4a5a"; g.fillRect(x - 2, y - 1, 4, 2); g.fillStyle = p.arm > 0 || Math.floor(t * 6) % 2 ? "#e8403a" : "#ff9a8a"; g.fillRect(x - 1, y - 2, 2, 1); }
    // enemies + hero, by y
    const list = enemies.filter(e => Math.abs(e.x - cam.x) < LW / 2 + 30 && Math.abs(e.y - cam.y) < LH / 2 + 30);
    list.push(hero); list.sort((a, b) => a.y - b.y);
    for (const e of list) {
      if (e === hero) { drawHero(W2(hero.x), H2(hero.y)); continue; }
      const sp = X.get(e.type, 0, { tint: stage.tint, flash: e.flash > 0 }), k = e.scale, bob = e.fly ? Math.sin(e.t * 8) * 1.5 - 3 : 0, sq = e.type === "slime" ? 1 + Math.sin(e.t * 6) * 0.08 : 1;
      const w = sp.width * k * sq, h = sp.height * k / sq, x = Math.round(W2(e.x)), y = Math.round(H2(e.y));
      g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(x - Math.round(w * 0.35), y - 1, Math.round(w * 0.7), 2);
      g.save(); g.translate(x, Math.round(y + bob)); if (e.dir < 0) g.scale(-1, 1); g.drawImage(sp, Math.round(-w / 2), Math.round(-h), Math.round(w), Math.round(h)); g.restore();
      if (e.elite && !e.boss) { g.fillStyle = "#ffd23f"; g.fillRect(x - 1, Math.round(y - h - 4), 3, 2); }
    }
    // projectiles
    for (const p of proj) {
      const x = Math.round(W2(p.x)), y = Math.round(H2(p.y));
      if (p.k === "blaster") { g.fillStyle = "#fff6a0"; g.fillRect(x - 1, y - 1, 3, 3); g.fillStyle = "#ffd23f"; g.fillRect(x - 1 - Math.round(p.vx / 230 * 2), y - 1 - Math.round(p.vy / 230 * 2), 2, 2); }
      if (p.k === "boomer") { const ic = X.icon("boomer"); g.save(); g.translate(x, y); g.rotate(Math.round(p.rot / 1.57) * 1.57); g.drawImage(ic, -4, -4); g.restore(); }
      if (p.k === "saw") { const ic = X.icon("saw"), s = Math.round(8 * p.r / 6); g.save(); g.translate(x, y); g.rotate(Math.round(p.rot / 0.785) * 0.785); g.drawImage(ic, -s / 2, -s / 2, s, s); g.restore(); }
    }
    if (wstate.drones && wstate.drones.pos) for (const d of wstate.drones.pos) { const x = Math.round(W2(d.x)), y = Math.round(H2(d.y)); g.drawImage(X.icon("drones"), x - 4, y - 6); }
    // effects
    for (const f of fx) {
      const k = f.t / f.max;
      if (f.kind === "ring" || f.kind === "boom") { const R = Math.round(f.R * (f.kind === "boom" ? 0.4 + k * 0.6 : k)); g.strokeStyle = f.kind === "boom" ? (k < 0.5 ? "#ffd23f" : "#ff7a2e") : f.col; g.lineWidth = 2; g.globalAlpha = 1 - k; g.beginPath(); g.arc(Math.round(W2(f.x)), Math.round(H2(f.y)), R, 0, TAU); g.stroke(); g.globalAlpha = 1; if (f.kind === "boom" && k < 0.3) { g.fillStyle = "rgba(255,240,160,0.6)"; g.beginPath(); g.arc(Math.round(W2(f.x)), Math.round(H2(f.y)), R * 0.7, 0, TAU); g.fill(); } }
      if (f.kind === "bolt") { g.strokeStyle = k < 0.5 ? "#ffffff" : "#7fe8ff"; g.lineWidth = 1; g.beginPath(); const x1 = W2(f.x1), y1 = H2(f.y1), x2 = W2(f.x2), y2 = H2(f.y2); g.moveTo(Math.round(x1), Math.round(y1)); for (let i = 1; i < 5; i++) { const u = i / 5; g.lineTo(Math.round(x1 + (x2 - x1) * u + rnd(-3, 3)), Math.round(y1 + (y2 - y1) * u + rnd(-3, 3))); } g.lineTo(Math.round(x2), Math.round(y2)); g.stroke(); }
    }
    for (const p of parts) { g.fillStyle = p.col; g.globalAlpha = 1 - p.life / p.max; g.fillRect(Math.round(W2(p.x)), Math.round(H2(p.y)), p.s, p.s); }
    g.globalAlpha = 1;
    for (const n of nums) X.number(g, n.n, W2(n.x), H2(n.y), n.col);
    // hero health bar
    if (mode !== "attract") { const x = Math.round(W2(hero.x)) - 8, y = Math.round(H2(hero.y)) + 3; g.fillStyle = X.K; g.fillRect(x - 1, y - 1, 18, 4); g.fillStyle = "#5a2a3a"; g.fillRect(x, y, 16, 2); g.fillStyle = hero.hp / maxHp() > 0.3 ? "#5fd068" : "#e8403a"; g.fillRect(x, y, Math.max(0, Math.round(16 * hero.hp / maxHp())), 2); }
    if (hero.hurtT > 0) { const k = hero.hurtT * 1.5; g.fillStyle = `rgba(232,64,58,${k * 0.6})`; g.fillRect(0, 0, LW, 3); g.fillRect(0, LH - 3, LW, 3); g.fillRect(0, 0, 3, LH); g.fillRect(LW - 3, 0, 3, LH); g.fillStyle = `rgba(232,64,58,${k * 0.12})`; g.fillRect(0, 0, LW, LH); }
    // upscale
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false;
    ctx.drawImage(lo, 0, 0, LW * S * DPR, LH * S * DPR);
  }
  /* hero: the body faces where you walk (or where the gun points when standing still);
     the gun turns on its own toward the nearest monster */
  const stepOf = a => ((Math.round(a / TAU * 16) % 16) + 16) % 16, snapA = a => stepOf(a) / 16 * TAU;
  function gunPivot(a) { return { x: Math.cos(a) * 3, y: -5 + Math.sin(a) * 1.5 }; }
  function gunTip() {
    const st = stepOf(hero.aim), a = st / 16 * TAU, G = X.gunRot(heroDef.gun, st), pv = gunPivot(a);
    return { x: hero.x + pv.x + G.tipX, y: hero.y + pv.y + G.tipY };
  }
  function drawGun(x, y, a) {
    const st = stepOf(a), G = X.gunRot(heroDef.gun, st), pv = gunPivot(a), kick = hero.recoil > 0 ? 1 : 0;
    const ox = Math.round(x + pv.x - Math.cos(a) * kick), oy = Math.round(y + pv.y - Math.sin(a) * kick);
    g.drawImage(G.img, ox - G.R, oy - G.R);
    if (hero.recoil > 0.04) { const fx = ox + Math.round(G.tipX + Math.cos(a) * 2), fy = oy + Math.round(G.tipY + Math.sin(a) * 2); g.fillStyle = "#ffd23f"; g.fillRect(fx - 2, fy - 1, 5, 3); g.fillRect(fx - 1, fy - 2, 3, 5); g.fillStyle = "#fff6c0"; g.fillRect(fx - 1, fy - 1, 3, 3); }
    g.fillStyle = X.K; g.fillRect(ox - 2, oy - 2, 4, 4); g.fillStyle = heroDef.skin; g.fillRect(ox - 1, oy - 1, 2, 2); // the hand
  }
  function drawHero(x, y) {
    const fx = hero.moving || !hero.aimed ? hero.face.x : Math.cos(hero.aim), fy = hero.moving || !hero.aimed ? hero.face.y : Math.sin(hero.aim);
    const side = Math.abs(fx) >= Math.abs(fy) * 0.8, name = side ? "heroSide" : fy < 0 ? "heroBack" : "hero", flip = side ? fx < 0 : false;
    const frame = hero.moving ? (Math.floor(hero.walkT * 10) | 0) & 3 : 0;
    const sp = X.get(name, frame, { pal: X.heroPal(heroDef), key: heroDef.id, flash: hero.inv > 0.35 });
    x = Math.round(x); y = Math.round(y);
    const by = y - (frame & 1 ? 1 : 0), a = snapA(hero.aim), behind = Math.sin(a) < -0.3 || name === "heroBack" && Math.sin(a) < 0.3;
    g.fillStyle = "rgba(0,0,0,0.3)"; g.fillRect(x - 5, y - 1, 10, 2);
    if (behind) drawGun(x, by, a);
    g.save(); g.translate(x, by); if (flip) g.scale(-1, 1); g.drawImage(sp, -8, -14); g.restore();
    if (!behind) drawGun(x, by, a);
    if (weapons.flame) { const fa = Math.atan2(hero.face.y, hero.face.x); g.fillStyle = "#ff7a2e"; g.fillRect(Math.round(x + Math.cos(fa) * 6), Math.round(y - 6 + Math.sin(fa) * 6), 2, 2); }
  }
  function prop(x, y, st, h) {
    if (st.id === "dust") { g.fillStyle = X.K; g.fillRect(x - 2, y - 11, 5, 12); g.fillRect(x - 5, y - 8, 3, 5); g.fillRect(x + 3, y - 9, 3, 5); g.fillStyle = "#4fae5a"; g.fillRect(x - 1, y - 10, 3, 10); g.fillRect(x - 4, y - 7, 2, 3); g.fillRect(x + 3, y - 8, 2, 3); }
    else if (st.id === "fungus") { g.fillStyle = X.K; g.fillRect(x - 5, y - 9, 11, 5); g.fillRect(x - 1, y - 5, 3, 6); g.fillStyle = h > 0.5 ? "#e8403a" : "#b85aa8"; g.fillRect(x - 4, y - 8, 9, 3); g.fillStyle = "#fff"; g.fillRect(x - 2, y - 8, 1, 1); g.fillRect(x + 2, y - 7, 1, 1); g.fillStyle = "#f2e0c8"; g.fillRect(x, y - 5, 1, 5); }
    else { g.fillStyle = X.K; g.fillRect(x - 3, y - 12, 7, 13); g.fillStyle = "#7fe8ff"; g.fillRect(x - 2, y - 11, 5, 11); g.fillStyle = "#c8f8ff"; g.fillRect(x - 1, y - 10, 1, 7); }
  }
  function pickArt(x, y, type) {
    if (x < -8 || y < -8 || x > LW + 8 || y > LH + 8) return;
    const bob = Math.round(Math.sin(t * 4 + x) * 1);
    if (type === "coin") { g.fillStyle = X.K; g.fillRect(x - 3, y - 3 + bob, 6, 6); g.fillStyle = "#ffd23f"; g.fillRect(x - 2, y - 2 + bob, 4, 4); g.fillStyle = "#fff6a0"; g.fillRect(x - 1, y - 2 + bob, 1, 2); }
    if (type === "food") { g.fillStyle = X.K; g.fillRect(x - 4, y - 3 + bob, 8, 6); g.fillStyle = "#c8583a"; g.fillRect(x - 3, y - 2 + bob, 5, 4); g.fillStyle = "#fff"; g.fillRect(x + 2, y - 1 + bob, 2, 2); }
    if (type === "magnet") g.drawImage(X.icon("magnet"), x - 4, y - 4 + bob);
    if (type === "bomb") { g.fillStyle = X.K; g.fillRect(x - 3, y - 3 + bob, 7, 7); g.fillStyle = "#4a4a5a"; g.fillRect(x - 2, y - 2 + bob, 5, 5); g.fillStyle = "#ffd23f"; g.fillRect(x + 1, y - 5 + bob, 1, 2); }
    if (type === "chest") { g.fillStyle = X.K; g.fillRect(x - 6, y - 7 + bob, 13, 9); g.fillStyle = "#c8783a"; g.fillRect(x - 5, y - 6 + bob, 11, 7); g.fillStyle = "#ffd23f"; g.fillRect(x - 5, y - 3 + bob, 11, 1); g.fillRect(x - 1, y - 4 + bob, 3, 3); if (Math.floor(t * 4) % 2) { g.fillStyle = "#fff"; g.fillRect(x - 7, y - 9 + bob, 1, 1); g.fillRect(x + 7, y - 8 + bob, 1, 1); } }
  }

  /* ---------- loop ---------- */
  let last = performance.now();
  function frame(now) { requestAnimationFrame(frame); let dt = Math.min(0.05, (now - last) / 1000); last = now; if (!(dt >= 0)) dt = 0; try { update(dt); render(); } catch (e) { console.error(e); } }
  resize(); attract(); requestAnimationFrame(frame);

  return {
    on, start, attract, reroll() { return choices(3); }, choose(o) { apply(o); mode = "play"; last = performance.now(); },
    revive() { revived = true; hero.hp = maxHp() * 0.6; hero.inv = 2; mode = "play"; for (const e of enemies) if (Math.hypot(e.x - hero.x, e.y - hero.y) < 80 && !e.boss) { const a = Math.atan2(e.y - hero.y, e.x - hero.x); e.x = hero.x + Math.cos(a) * 110; e.y = hero.y + Math.sin(a) * 110; } fx.push({ kind: "ring", x: hero.x, y: hero.y, R: 110, t: 0, max: 0.5, col: "#ffffff" }); last = performance.now(); },
    pause(p) { if (p && mode === "play") mode = "paused"; else if (!p && mode === "paused") { mode = "play"; last = performance.now(); } },
    get mode() { return mode; }, get hero() { return hero; }, get time() { return t; }, get kills() { return kills; }, get coins() { return coins; },
    get weapons() { return weapons; }, get passives() { return passives; }, get boss() { return boss; }, maxHp, giveCoins(n) { coins += n; },
    setBot(b) { bot = b; }, simulate(dt, n) { for (let i = 0; i < n; i++) { if (mode !== "play") break; update(dt); } }, step(dt = 1 / 60, n = 1) { for (let i = 0; i < n; i++) update(dt); render(); }
  };
})();

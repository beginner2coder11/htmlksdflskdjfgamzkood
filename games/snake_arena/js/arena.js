/* ==========================================================================
   ARENA — snakes, food, spatial-grid collisions, bot AI, power orbs and the
   full-screen renderer. Modes: "demo" (home screen, camera follows a bot),
   "play", "dead". UI drives it with Arena.start / setAim / setBoost and
   listens through Arena.on callbacks.
   ========================================================================== */
window.Arena = (() => {
  const C = window.GAME_CONFIG, A = C.arena, SN = C.snake;
  const cv = document.getElementById("stage");
  const ctx = cv.getContext("2d");
  const on = {};

  let W = 0, H = 0, dpr = 1, base = 1;
  let mode = "demo", running = false, last = 0, time = 0, timeScale = 1;
  let snakes = [], food = [], orbs = [], player = null, follow = null, nextId = 1;
  const cam = { x: 0, y: 0, z: 1 };
  let stats = null, boardT = 0, hudT = 0, deadT = 0, playerName = "You", playerSkin = "lime";
  let aim = 0, boostHeld = false;

  const rand = (a, b) => a + Math.random() * (b - a);
  const radius = m => Math.min(52, 9 + Math.sqrt(m) * 0.95);
  const segCount = m => Math.min(380, Math.floor(8 + m * 0.34));
  const vibrate = ms => { if (C.vibration && on.vibeOn && on.vibeOn() && navigator.vibrate) navigator.vibrate(ms); };

  // ---------- spatial grid -------------------------------------------------
  const CELL = 110;
  let grid = new Map(), fgrid = new Map();
  const key = (cx, cy) => cx * 100003 + cy;
  function gridAdd(g, x, y, item) { const k = key(Math.floor(x / CELL), Math.floor(y / CELL)); let a = g.get(k); if (!a) g.set(k, (a = [])); a.push(item); }
  function near(g, x, y, r, fn) {
    const x0 = Math.floor((x - r) / CELL), x1 = Math.floor((x + r) / CELL), y0 = Math.floor((y - r) / CELL), y1 = Math.floor((y + r) / CELL);
    for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) { const a = g.get(key(cx, cy)); if (a) for (const it of a) if (fn(it) === false) return; }
  }

  // ---------- layout -------------------------------------------------------
  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    // guard: a hidden/zero-size viewport must never produce a zero zoom
    base = Math.max(0.35, Math.min(W || 640, H || 640) / 640);
  }

  // ---------- world setup --------------------------------------------------
  const FOOD_COLORS = ["#ff4d6d", "#ffa52e", "#ffd32a", "#7dff5a", "#2ee6c9", "#5ad1ff", "#7a7dff", "#d17dff", "#ff7ab8"];
  function randomPoint(margin = 120) { const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * (A.radius - margin); return { x: Math.cos(a) * r, y: Math.sin(a) * r }; }
  function addFood(x, y, value = 1, color, vx = 0, vy = 0) {
    food.push({ x, y, value, r: 3.5 + Math.sqrt(value) * 2.6, color: color || FOOD_COLORS[(Math.random() * FOOD_COLORS.length) | 0], vx, vy, ph: Math.random() * 6 });
  }
  function addOrb() { const p = randomPoint(300), k = Object.keys(C.powerups); orbs.push({ ...p, type: k[(Math.random() * k.length) | 0], ph: Math.random() * 6 }); }

  function pickType() {
    const total = C.botTypes.reduce((s, t) => s + t.weight, 0);
    let r = Math.random() * total;
    for (const t of C.botTypes) { r -= t.weight; if (r <= 0) return t; }
    return C.botTypes[0];
  }
  const usedNames = new Set();
  function botName() {
    const pool = C.botNames.filter(n => !usedNames.has(n));
    const n = pool.length ? pool[(Math.random() * pool.length) | 0] : C.botNames[(Math.random() * C.botNames.length) | 0] + " " + ((Math.random() * 90 + 10) | 0);
    usedNames.add(n); return n;
  }

  function makeSnake({ name, skin, mass, isPlayer = false, x, y }) {
    const p = x === undefined ? safeSpawn() : { x, y };
    const ang = Math.atan2(-p.y, -p.x) + rand(-1, 1);
    const s = {
      id: nextId++, name, skin: typeof skin === "string" ? Skins.byId(skin) : skin, isPlayer, mass,
      x: p.x, y: p.y, ang, target: ang, segs: [], boost: false, alive: true, kills: 0,
      fx: { magnet: 0, turbo: 0, grow: 0, ghost: 0 }, dropT: 0, blinkT: rand(1, 4), tongueT: rand(1, 5),
      ai: isPlayer ? null : { type: pickType(), think: 0, wander: ang }
    };
    const n = segCount(mass), r = radius(mass);
    for (let i = 0; i < n; i++) s.segs.push({ x: p.x - Math.cos(ang) * i * r * SN.spacing, y: p.y - Math.sin(ang) * i * r * SN.spacing });
    snakes.push(s);
    return s;
  }
  function safeSpawn() {
    for (let k = 0; k < 30; k++) {
      const p = randomPoint(400);
      let ok = true;
      near(grid, p.x, p.y, 260, () => { ok = false; return false; });
      if (ok && player && player.alive && Math.hypot(player.x - p.x, player.y - p.y) < 650) ok = false;
      if (ok) return p;
    }
    return randomPoint(400);
  }
  // varied sizes so the leaderboard means something
  const botMass = () => (Math.random() < 0.18 ? rand(300, 900) : Math.random() < 0.5 ? rand(60, 250) : rand(20, 60));

  function reset(newMode) {
    mode = newMode;
    snakes = []; food = []; orbs = []; usedNames.clear(); grid = new Map(); fgrid = new Map();
    for (let i = 0; i < A.food; i++) { const p = randomPoint(40); addFood(p.x, p.y, Math.random() < 0.08 ? 3 : 1); }
    for (let i = 0; i < A.powerOrbs; i++) addOrb();
    player = null;
    for (let i = 0; i < A.bots; i++) {
      const sk = C.skins[(Math.random() * C.skins.length) | 0];
      makeSnake({ name: botName(), skin: sk, mass: botMass() });
    }
    if (mode === "play") {
      player = makeSnake({ name: playerName, skin: playerSkin, mass: SN.startMass, isPlayer: true });
      player.fx.ghost = 2.5; // spawn protection
      aim = player.ang;
      follow = player;
    } else follow = snakes.reduce((a, b) => (b.mass > a.mass ? b : a));
    stats = { maxLen: SN.startMass, kills: 0, bestRank: 99, food: 0, time: 0 };
    cam.x = follow.x; cam.y = follow.y; cam.z = zoomFor(follow);
    timeScale = 1; deadT = 0;
    Sound.setRate(1);
  }
  function start(opts = {}) { if (opts.name) playerName = opts.name; if (opts.skin) playerSkin = opts.skin; reset("play"); run(); }
  function demo() { reset("demo"); run(); }

  // ---------- bots ---------------------------------------------------------
  function rayClear(s, ang, dist) {
    // distance until something deadly along this heading
    const r = radius(s.mass), step = Math.max(14, r * 1.1);
    for (let d = r; d <= dist; d += step) {
      const px = s.x + Math.cos(ang) * d, py = s.y + Math.sin(ang) * d;
      if (Math.hypot(px, py) > A.radius - r * 1.5) return d;
      let hit = false;
      // search wide enough to catch the fattest body (radius up to 52) next to this point
      // other heads move toward you, so give them a wider berth than bodies
      near(grid, px, py, r * 1.1 + 160, it => { if (it.s !== s && Math.hypot(it.x - px, it.y - py) < (it.i < 6 ? it.r * 3.2 : it.r) + r * 1.1) { hit = true; return false; } });
      if (hit) return d;
    }
    return dist;
  }
  function think(s) {
    const r = radius(s.mass), T = s.ai.type;
    const look = 140 + r * 4;
    s.boost = false;
    // incoming heads (from any side): veer away from the closest one that's heading our way
    let threat = null, td = 170 + r * 2;
    for (const o of snakes) {
      if (o === s || !o.alive) continue;
      const dx = s.x - o.x, dy = s.y - o.y, dd = Math.hypot(dx, dy);
      if (dd > td) continue;
      const toward = (Math.cos(o.ang) * dx + Math.sin(o.ang) * dy) / dd;
      if (toward > 0.25) { td = dd; threat = o; }
    }
    if (threat) {
      const away = Math.atan2(s.y - threat.y, s.x - threat.x);
      const side = angDiff(threat.ang, away) > 0 ? 1 : -1;      // dodge across its path, not along it
      s.target = away + side * 0.5;
      s.ai.think = 0.06;
      safeTarget(s, look);
      return;
    }
    const ahead = rayClear(s, s.ang, look);
    if (ahead < look) {
      // escape: best of a fan of headings, preferring small turns
      let best = s.ang, bestScore = -1;
      for (const off of [0.35, -0.35, 0.75, -0.75, 1.2, -1.2, 1.8, -1.8, 2.6, -2.6]) {
        const a = s.ang + off, c = rayClear(s, a, look);
        const sc = c - Math.abs(off) * 20;
        if (sc > bestScore) { bestScore = sc; best = a; }
      }
      s.target = best;
      return;
    }
    // hunters cut off nearby heads
    if (Math.random() < T.aggression) {
      let prey = null, pd = 520;
      for (const o of snakes) {
        if (o === s || !o.alive) continue;
        const d = Math.hypot(o.x - s.x, o.y - s.y);
        // hunters mostly hunt the player; bot-on-bot hunts are rarer
        // a brand-new player gets ~20 s of grace before hunters notice them
        if (o.isPlayer && o.mass < SN.startMass * 1.6 && stats && stats.time < 20) continue;
        if (d < pd && s.mass > o.mass * 0.7 && (o.isPlayer || Math.random() < 0.35)) { pd = d; prey = o; }
      }
      if (prey) {
        const lead = 90 + radius(prey.mass) * 3;
        const tx = prey.x + Math.cos(prey.ang) * lead, ty = prey.y + Math.sin(prey.ang) * lead;
        s.target = Math.atan2(ty - s.y, tx - s.x);
        if (pd < 300 && Math.random() < T.boostChance) s.boost = true;
        safeTarget(s, look);
        return;
      }
    }
    // food: best value per distance nearby
    let bestF = null, bs = 0;
    near(fgrid, s.x, s.y, 360, f => {
      const d = Math.hypot(f.x - s.x, f.y - s.y) + 30;
      const sc = f.value / d;
      if (sc > bs) { bs = sc; bestF = f; }
    });
    if (bestF) {
      s.target = Math.atan2(bestF.y - s.y, bestF.x - s.x);
      if (bestF.value >= 4 && Math.random() < T.boostChance * 0.5) s.boost = true;
    } else {
      s.ai.wander += rand(-0.6, 0.6);
      s.target = s.ai.wander;
    }
    // drift back toward the middle near the border
    if (Math.hypot(s.x, s.y) > A.radius * 0.82) s.target = Math.atan2(-s.y, -s.x) + rand(-0.4, 0.4);
    safeTarget(s, look);
  }
  // never commit to a heading that runs into something: nudge to the nearest clear one
  function safeTarget(s, look) {
    if (rayClear(s, s.target, look) >= look) return;
    let best = s.target, bestScore = -1;
    for (const off of [0.3, -0.3, 0.6, -0.6, 1, -1, 1.5, -1.5, 2.2, -2.2]) {
      const a = s.target + off, c = rayClear(s, a, look), sc = c - Math.abs(off) * 15;
      if (sc > bestScore) { bestScore = sc; best = a; }
    }
    s.target = best; s.boost = false;
  }

  // ---------- update -------------------------------------------------------
  const angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };

  function moveSnake(s, dt) {
    const r = radius(s.mass);
    if (s.isPlayer) { s.target = aim; s.boost = boostHeld; }
    const turbo = s.fx.turbo > 0;
    const canBoost = (s.boost && s.mass > SN.minBoostMass) || turbo;
    const turn = SN.turnRate / (1 + r / 70);
    const d = angDiff(s.ang, s.target);
    s.ang += Math.max(-turn * dt, Math.min(turn * dt, d));
    const sp = canBoost ? SN.boostSpeed : SN.speed;
    s.x += Math.cos(s.ang) * sp * dt; s.y += Math.sin(s.ang) * sp * dt;
    s.boosting = canBoost;
    if (canBoost && !turbo) {
      s.mass = Math.max(SN.minBoostMass, s.mass - SN.boostDrain * dt);
      s.dropT -= dt;
      if (s.dropT <= 0) { s.dropT = 0.12; const t = s.segs[s.segs.length - 1]; addFood(t.x + rand(-6, 6), t.y + rand(-6, 6), 1, s.skin.colors[0]); }
    }
    // body follows the head
    const sp2 = r * SN.spacing;
    s.segs[0].x = s.x; s.segs[0].y = s.y;
    for (let i = 1; i < s.segs.length; i++) {
      const p = s.segs[i - 1], q = s.segs[i];
      const dx = q.x - p.x, dy = q.y - p.y, dd = Math.hypot(dx, dy);
      if (dd > sp2) { q.x = p.x + (dx / dd) * sp2; q.y = p.y + (dy / dd) * sp2; }
    }
    const n = segCount(s.mass);
    while (s.segs.length < n) { const t = s.segs[s.segs.length - 1]; s.segs.push({ x: t.x, y: t.y }); }
    if (s.segs.length > n) s.segs.length = n;
    ["magnet", "turbo", "grow", "ghost"].forEach(k => { if (s.fx[k] > 0) s.fx[k] = Math.max(0, s.fx[k] - dt); });
    s.blinkT -= dt; if (s.blinkT < -0.12) s.blinkT = rand(2, 5);
    s.tongueT -= dt; if (s.tongueT < -0.25) s.tongueT = rand(2, 6);
  }

  function kill(victim, killer, cause = killer ? "body" : "wall") {
    if (!victim.alive) return;
    victim.cause = cause;
    victim.alive = false;
    // body becomes a trail of big glowing pellets
    const step = 2, n = victim.segs.length, per = (victim.mass * 0.75) / Math.max(1, n / step);
    for (let i = 0; i < n; i += step) {
      const sgm = victim.segs[i];
      addFood(sgm.x + rand(-8, 8), sgm.y + rand(-8, 8), Math.max(1, per), Skins.segColor(victim.skin, i, n, time), rand(-30, 30), rand(-30, 30));
    }
    if (killer) killer.kills++;
    on.kill && on.kill(victim, killer);
    if (victim.isPlayer) {
      mode = "dead"; deadT = 0; timeScale = 0.4;
      Sound.play("death"); Sound.setRate(0.75); vibrate([60, 40, 100]);
    } else {
      if (killer && killer.isPlayer) { stats.kills = killer.kills; Sound.play("kill"); vibrate(30); }
      // respawn a fresh bot a moment later (game time, so pausing/ads don't matter)
      victim.respawnAt = time + rand(1.5, 4);
    }
  }

  function update(dt) {
    time += dt;
    if (mode === "dead") {
      deadT += dt;
      timeScale += (1 - timeScale) * Math.min(1, dt);
      if (deadT > 1.6 && !player.overSent) { player.overSent = true; on.over && on.over({ ...stats, maxLen: Math.floor(stats.maxLen) }); }
    }
    const d = dt * timeScale;

    // respawn dead bots
    for (const s of snakes) {
      if (!s.alive && !s.isPlayer && s.respawnAt && time >= s.respawnAt) {
        s.respawnAt = 0; s.gone = true;
        usedNames.delete(s.name);
        makeSnake({ name: botName(), skin: C.skins[(Math.random() * C.skins.length) | 0], mass: botMass() * (Math.random() < 0.6 ? 0.4 : 1) });
      }
    }
    if (snakes.some(s => s.gone)) snakes = snakes.filter(s => !s.gone);

    // rebuild grids
    grid = new Map(); fgrid = new Map();
    for (const s of snakes) {
      if (!s.alive) continue;
      const r = radius(s.mass);
      for (let i = 0; i < s.segs.length; i += 1) gridAdd(grid, s.segs[i].x, s.segs[i].y, { x: s.segs[i].x, y: s.segs[i].y, r, s, i });
    }
    for (const f of food) gridAdd(fgrid, f.x, f.y, f);

    // move
    for (const s of snakes) {
      if (!s.alive) continue;
      if (s.ai) { s.ai.think -= d; if (s.ai.think <= 0) { s.ai.think = rand(0.1, 0.2); think(s); } }
      moveSnake(s, d);
    }

    // collisions: head vs other bodies, heads, border
    for (const s of snakes) {
      if (!s.alive) continue;
      const r = radius(s.mass);
      if (Math.hypot(s.x, s.y) > A.radius - r * 0.6) { if (s.fx.ghost > 0) { s.ang += Math.PI * 0.8; s.target = s.ang; } else { kill(s, null); continue; } }
      if (s.fx.ghost > 0) continue;
      let hitBy = null;
      near(grid, s.x, s.y, r + 52, it => {
        if (it.s === s || !it.s.alive) return;
        // a head graze needs a deeper overlap than a body hit
        const reach = it.i < 3 ? it.r * 0.6 + r * 0.6 : it.r * 0.82 + r * 0.72;
        if (Math.hypot(it.x - s.x, it.y - s.y) < reach) { hitBy = it.s; s.hitIdx = it.i; return false; }
      });
      if (hitBy && hitBy.fx.ghost <= 0) kill(s, hitBy);
    }

    // food: drift, magnet, eat
    for (const f of food) { if (f.vx || f.vy) { f.x += f.vx * d; f.y += f.vy * d; f.vx *= 0.95; f.vy *= 0.95; if (Math.abs(f.vx) + Math.abs(f.vy) < 1) f.vx = f.vy = 0; } }
    const eaten = new Set();
    for (const s of snakes) {
      if (!s.alive) continue;
      const r = radius(s.mass), magnet = s.fx.magnet > 0 ? C.powerups.magnet.range : 0;
      near(fgrid, s.x, s.y, r + 20 + magnet, f => {
        if (eaten.has(f)) return;
        const dx = s.x - f.x, dy = s.y - f.y, dist = Math.hypot(dx, dy);
        if (magnet && dist < magnet) { const k = Math.min(1, d * 7); f.x += dx * k; f.y += dy * k; }
        if (dist < r + f.r + 4) {
          eaten.add(f);
          s.mass += f.value * (s.fx.grow > 0 ? 2 : 1);
          if (s.isPlayer) {
            stats.food++;
            Sound.play(f.value >= 3 ? "bigEat" : "eat");
          }
        }
      });
    }
    if (eaten.size) food = food.filter(f => !eaten.has(f));
    while (food.length < A.food) { const p = randomPoint(40); addFood(p.x, p.y, Math.random() < 0.08 ? 3 : 1); }

    // power orbs
    for (const s of snakes) {
      if (!s.alive) continue;
      const r = radius(s.mass);
      orbs = orbs.filter(o => {
        if (Math.hypot(o.x - s.x, o.y - s.y) > r + 26) return true;
        s.fx[o.type] = C.powerups[o.type].time;
        if (s.isPlayer) { Sound.play("power"); vibrate(25); on.power && on.power(o.type); }
        return false;
      });
    }
    while (orbs.length < A.powerOrbs) addOrb();

    // stats, leaderboard, camera
    if (player && player.alive) { stats.maxLen = Math.max(stats.maxLen, player.mass); stats.time += d; }
    boardT -= dt;
    if (boardT <= 0) {
      boardT = 0.5;
      const live = snakes.filter(s => s.alive).sort((a, b) => b.mass - a.mass);
      if (player && player.alive) { const rank = live.indexOf(player) + 1; if (rank < stats.bestRank) { if (stats.bestRank < 99 && mode === "play") on.rankUp && on.rankUp(rank); stats.bestRank = rank; } }
      on.board && on.board(live.slice(0, 5), player && player.alive ? live.indexOf(player) + 1 : 0, live.length);
      if (mode === "demo" && (!follow || !follow.alive)) follow = live[0];
    }
    hudT -= dt;
    if (hudT <= 0 && mode === "play") { hudT = 0.1; on.hud && on.hud(player, stats); }
    const f = follow && (follow.alive || mode === "dead") ? follow : snakes.find(s => s.alive);
    if (f) {
      const k = Math.min(1, dt * (mode === "dead" ? 1 : 6));
      cam.x += (f.x - cam.x) * k; cam.y += (f.y - cam.y) * k;
      const tz = mode === "dead" ? zoomFor(f) * 0.7 : zoomFor(f);
      cam.z += (tz - cam.z) * Math.min(1, dt * 1.5);
    }
  }
  const zoomFor = s => base * Math.max(0.42, Math.min(1.15, 1.25 - (radius(s.mass) - 12) / 55));

  // ---------- drawing ------------------------------------------------------
  const glowCache = {};
  function glow(color) {
    if (glowCache[color]) return glowCache[color];
    const c = document.createElement("canvas"); c.width = c.height = 64;
    const x = c.getContext("2d"), g = x.createRadialGradient(32, 32, 2, 32, 32, 32);
    g.addColorStop(0, "#ffffff"); g.addColorStop(0.25, color); g.addColorStop(0.55, color + "66"); g.addColorStop(1, color + "00");
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    return (glowCache[color] = c);
  }
  const SX = x => (x - cam.x) * cam.z + W / 2;
  const SY = y => (y - cam.y) * cam.z + H / 2;

  function drawBackground() {
    ctx.fillStyle = "#0d0b24"; ctx.fillRect(0, 0, W, H);
    // inside the arena: hex-ish dotted grid
    ctx.save();
    ctx.beginPath(); ctx.arc(SX(0), SY(0), A.radius * cam.z, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = "#17143a"; ctx.fillRect(0, 0, W, H);
    const z = Math.max(0.05, cam.z), step = Math.max(60, Math.ceil((W / z) / 60 / 40) * 60); // ≤ ~40 dots per row
    const x0 = Math.floor((cam.x - W / 2 / z) / step) * step, x1 = cam.x + W / 2 / z;
    const y0 = Math.floor((cam.y - H / 2 / z) / step) * step, y1 = cam.y + H / 2 / z;
    ctx.fillStyle = "rgba(140,130,255,.16)";
    for (let y = y0; y <= y1; y += step) for (let x = x0 + ((y / step) % 2 ? step / 2 : 0); x <= x1; x += step) ctx.fillRect(SX(x) - 1.5, SY(y) - 1.5, 3, 3);
    ctx.restore();
    // border
    ctx.save();
    ctx.strokeStyle = "#ff3b6b"; ctx.lineWidth = 8 * cam.z; ctx.shadowColor = "#ff3b6b"; ctx.shadowBlur = 24;
    ctx.beginPath(); ctx.arc(SX(0), SY(0), A.radius * cam.z, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  function drawFood() {
    const pad = 40 / cam.z, l = cam.x - W / 2 / cam.z - pad, r = cam.x + W / 2 / cam.z + pad, t = cam.y - H / 2 / cam.z - pad, b = cam.y + H / 2 / cam.z + pad;
    for (const f of food) {
      if (f.x < l || f.x > r || f.y < t || f.y > b) continue;
      const s = (f.r * 3.2 + Math.sin(time * 4 + f.ph) * f.r * 0.4) * cam.z;
      ctx.drawImage(glow(f.color), SX(f.x) - s, SY(f.y) - s, s * 2, s * 2);
    }
    for (const o of orbs) {
      const x = SX(o.x), y = SY(o.y), s = (26 + Math.sin(time * 3 + o.ph) * 4) * cam.z;
      if (x < -60 || x > W + 60 || y < -60 || y > H + 60) continue;
      const p = C.powerups[o.type];
      ctx.drawImage(glow(p.color), x - s * 2, y - s * 2, s * 4, s * 4);
      ctx.fillStyle = "rgba(255,255,255,.92)"; ctx.beginPath(); ctx.arc(x, y, s, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = p.color; ctx.stroke();
      ctx.font = `${s * 1.1}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(p.emoji, x, y + 1);
    }
  }

  function drawSnake(s) {
    const r = radius(s.mass) * cam.z, n = s.segs.length;
    const l = -r * 2, rr = W + r * 2, t = -r * 2, b = H + r * 2;
    ctx.save();
    if (s.fx.ghost > 0) ctx.globalAlpha = 0.45 + Math.sin(time * 18) * 0.15;
    if (s.boosting) { ctx.shadowColor = s.skin.colors[0]; ctx.shadowBlur = r * 1.2; }
    for (let i = n - 1; i >= 1; i--) {
      const g = s.segs[i], x = SX(g.x), y = SY(g.y);
      if (x < l || x > rr || y < t || y > b) continue;
      Skins.segment(ctx, x, y, r, Skins.segColor(s.skin, i, n, time), s.skin, i);
      if (i === n - 1) ctx.shadowBlur = 0;
    }
    ctx.shadowBlur = 0;
    const hx = SX(s.x), hy = SY(s.y);
    if (hx > l && hx < rr && hy > t && hy < b) {
      Skins.head(ctx, hx, hy, r, s.ang, s.skin, { boost: s.boosting, blink: s.blinkT < 0, tongue: s.tongueT < 0, dead: !s.alive, t: time, look: s.isPlayer ? aim : s.target });
      // name tag
      if (r > 5) {
        ctx.font = `600 ${Math.max(11, 13 * Math.min(1.4, cam.z / base))}px Fredoka, sans-serif`;
        ctx.textAlign = "center"; ctx.textBaseline = "bottom";
        ctx.fillStyle = "rgba(0,0,0,.5)"; ctx.fillText(s.name, hx + 1, hy - r * 1.6 + 1);
        ctx.fillStyle = s.isPlayer ? "#ffe14d" : "#fff"; ctx.fillText(s.name, hx, hy - r * 1.6);
      }
      if (s.fx.magnet > 0) { ctx.strokeStyle = "rgba(255,77,109,.35)"; ctx.lineWidth = 2; for (let k = 0; k < 2; k++) { const rad = ((time * 140 + k * 70) % 140) * cam.z; ctx.beginPath(); ctx.arc(hx, hy, rad, 0, Math.PI * 2); ctx.stroke(); } }
    }
    ctx.restore();
  }

  function render() {
    if (innerWidth !== W || innerHeight !== H) resize(); // resize events don't always fire (hidden tabs, WebViews)
    if (!W || !H) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawBackground();
    drawFood();
    for (const s of snakes) if (s.alive && s !== player) drawSnake(s);
    if (player && (player.alive || mode === "dead")) drawSnake(player);
  }

  function frame(t) {
    if (!running) return;
    requestAnimationFrame(frame);
    const dt = Math.min(0.033, (t - (last || t)) / 1000);
    last = t;
    if (!paused) update(dt);
    render();
  }
  let paused = false;
  function run() { if (!running) { running = true; last = 0; requestAnimationFrame(frame); } }
  window.addEventListener("resize", resize);
  resize();

  function revive() {
    if (!player) return;
    const mass = Math.max(SN.startMass, stats.maxLen * 0.5);
    snakes = snakes.filter(s => s !== player);
    player = makeSnake({ name: playerName, skin: playerSkin, mass, isPlayer: true });
    player.fx.ghost = 3; aim = player.ang; follow = player;
    mode = "play"; timeScale = 1; Sound.setRate(1);
  }

  // minimap: arena outline, the top snakes and you
  function drawMinimap(mc) {
    const x = mc.getContext("2d"), S = mc.width, k = S / 2 / A.radius;
    x.clearRect(0, 0, S, S);
    x.fillStyle = "rgba(20,16,60,.7)"; x.beginPath(); x.arc(S / 2, S / 2, S / 2 - 1, 0, Math.PI * 2); x.fill();
    x.strokeStyle = "rgba(255,59,107,.8)"; x.lineWidth = 2; x.stroke();
    const top = snakes.filter(s => s.alive).sort((a, b) => b.mass - a.mass).slice(0, 5);
    top.forEach(s => { x.fillStyle = s.skin.colors[0]; x.beginPath(); x.arc(S / 2 + s.x * k, S / 2 + s.y * k, 2.5 + Math.min(4, radius(s.mass) / 10), 0, Math.PI * 2); x.fill(); });
    if (player && player.alive) {
      x.fillStyle = "#fff"; x.beginPath(); x.arc(S / 2 + player.x * k, S / 2 + player.y * k, 4.5, 0, Math.PI * 2); x.fill();
      x.strokeStyle = "#ffe14d"; x.lineWidth = 2; x.stroke();
    }
  }

  return {
    on, start, demo, revive, drawMinimap,
    setAim(a) { aim = a; },
    setBoost(b) { boostHeld = b; },
    setPaused(p) { paused = p; },
    get mode() { return mode; },
    get player() { return player; },
    get stats() { return stats; },
    get snakes() { return snakes; },
    radius,
    // headless helpers for bots / balance checks / screenshots
    step(dt) { update(dt); },
    renderNow() { render(); }
  };
})();

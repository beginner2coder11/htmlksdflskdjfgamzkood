/* ==========================================================================
   RUNNER — physics, fair level generator, collisions, power-ups and the
   full-screen canvas renderer. Modes: "demo" (home screen auto-runner),
   "play", "dead". UI talks to it through Runner.start / input / on callbacks.
   World units: x → right, y ↓ down, ground surface around y = 0.
   ========================================================================== */
window.Runner = (() => {
  const C = window.GAME_CONFIG, PH = C.physics, MPU = C.metersPerUnit;
  const cv = document.getElementById("stage");
  const ctx = cv.getContext("2d");
  const on = {};

  let W = 0, H = 0, dpr = 1, sc = 1, viewW = 0, groundY = 0, groundRatio = 0.56;
  let mode = "demo", running = false, last = 0, time = 0, timeScale = 1, slowUntil = 0, shake = 0;
  let charId = "blob", best = 0, durMult = { magnet: 1, shield: 1, rocket: 1, double: 1 };
  let P, world, genX, camX, camY, speed, stats, fx, biome, prevBiome, biomeT, nextMilestone;
  let parts = [], input = { held: false, buffer: 0 };
  let coinChain = 0, coinChainT = 0, deadT = 0, sinceHud = 0;

  const PW = 34, PH_STAND = 44, PH_SLIDE = 24;
  const rand = (a, b) => a + Math.random() * (b - a);
  const vibrate = ms => { if (C.vibration && on.vibeOn && on.vibeOn() && navigator.vibrate) navigator.vibrate(ms); };
  const sfx = (n, a) => { if (mode === "play") Sound.play(n, a); };

  // ---------- layout -------------------------------------------------------
  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    sc = Math.min(H / 560, W / 540);
    viewW = W / sc;
    groundY = H * groundRatio;
  }
  const SX = x => (x - camX) * sc;
  const SY = y => groundY + (y - camY) * sc;

  // ---------- run setup ----------------------------------------------------
  function reset(newMode) {
    mode = newMode;
    P = { x: 0, y: 0, vy: 0, onGround: true, coyote: 0, jumps: 0, slideT: 0, sx: 1, sy: 1, phase: 0, blinkT: 2, flip: 0, rot: 0, deadVx: 0 };
    world = { grounds: [{ x0: -600, x1: 900, y: 0 }], plats: [], obs: [], coins: [], pows: [], bees: [] };
    genX = 900; camX = -viewW * 0.28; camY = 0;
    speed = PH.startSpeed;
    stats = { dist: 0, coins: 0, stomps: 0, powers: 0, jumps: 0 };
    fx = { magnet: 0, shield: 0, rocket: 0, double: 0, float: false, invuln: 0 };
    biome = 0; prevBiome = 0; biomeT = 1; nextMilestone = C.milestoneEvery;
    parts = []; input = { held: false, buffer: 0 }; timeScale = 1; slowUntil = 0; deadT = 0;
    Sound.setRate(1);
    generate();
  }
  function start(opts = {}) { best = opts.best || 0; if (opts.durations) durMult = opts.durations; reset("play"); run(); }
  function demo() { reset("demo"); run(); }

  // ---------- generator ----------------------------------------------------
  const lastGround = () => world.grounds[world.grounds.length - 1];
  const difficulty = () => Math.min(1, stats.dist / 2500);
  let sincePow = 0;

  function coinLine(x0, x1, y, step = 42) { for (let x = x0; x <= x1; x += step) world.coins.push({ x, y, taken: false }); }
  function coinArc(x0, x1, yBase, h) {
    const n = Math.max(3, Math.round((x1 - x0) / 44));
    for (let i = 0; i <= n; i++) { const t = i / n; world.coins.push({ x: x0 + (x1 - x0) * t, y: yBase - Math.sin(t * Math.PI) * h, taken: false }); }
  }
  function addGround(len, dy = 0) {
    const g = lastGround();
    const y = Math.max(-120, Math.min(60, g.y + dy));
    world.grounds.push({ x0: genX, x1: genX + len, y });
    return y;
  }

  function hazard(x, y, d) {
    // pick an obstacle that's fair at this spot
    const r = Math.random();
    if (r < 0.28) { const n = d < 0.2 ? 1 : 1 + Math.floor(Math.random() * Math.min(3, 1 + d * 3)); world.obs.push({ t: "spike", x, y, w: 30 * n, h: 26 }); coinArc(x - 40, x + 30 * n + 40, y - 40, 110); return 30 * n; }
    if (r < 0.48) { const tall = d > 0.35 && Math.random() < 0.4; world.obs.push({ t: "crate", x, y, w: 42, h: tall ? 84 : 42 }); world.coins.push({ x: x + 21, y: y - (tall ? 84 : 42) - 30, taken: false }); return 42; }
    if (r < 0.64 && d > 0.1) { world.obs.push({ t: "bar", x, y, w: 64, h: 26, gap: 34 }); coinLine(x - 20, x + 84, y - 14, 34); return 64; }
    if (r < 0.82 && d > 0.05) {
      // bees hover above head height: run under safely, or stomp from above for a bounce + coins
      world.bees.push({ x: x + 20, y0: y - 112, y: y - 112, phase: Math.random() * 6, dead: false, vy: 0 });
      coinArc(x - 60, x + 100, y - 150, 50);
      return 40;
    }
    world.obs.push({ t: "saw", x: x + 22, y: y - 118 - Math.random() * 20, r: 26, w: 0, h: 0 });
    coinLine(x - 30, x + 70, y - 28, 34);
    return 44;
  }

  function generate() {
    while (genX < camX + viewW * 2.2) {
      const d = difficulty();
      const gap = speed * (0.42 + 0.3 * d);           // safe: single jump covers speed × ~0.69 s
      const r = Math.random();
      sincePow += 1;

      if (r < 0.42 || genX < 1400) {
        // flat run with spaced hazards
        const len = rand(700, 1100);
        const y = addGround(len, 0);
        let x = genX + rand(260, 360);
        const spacing = Math.max(260, speed * (0.95 - 0.25 * d));
        while (x < genX + len - 160) {
          const used = hazard(x, y, d);
          x += used + spacing + rand(0, 160);
        }
        if (sincePow > 5 && Math.random() < 0.6 && mode === "play") { world.pows.push({ x: genX + len * 0.5, y: y - 120, type: pickPow(), taken: false }); sincePow = 0; }
        genX += len;
      } else if (r < 0.66) {
        // gap (maybe with a height change)
        const gw = rand(gap * 0.55, gap);
        coinArc(genX - 20, genX + gw + 20, lastGround().y - 40, 120);
        genX += gw;
        const dy = Math.random() < 0.5 ? 0 : Math.round(rand(-50, 40));
        const len = rand(300, 500);
        addGround(len, dy);
        genX += len;
      } else if (r < 0.84) {
        // floating platforms over a long pit
        const base = lastGround().y;
        let x = genX + rand(gap * 0.4, gap * 0.7);
        const n = 2 + Math.floor(Math.random() * (2 + d * 2));
        for (let i = 0; i < n; i++) {
          const w = rand(150, 230), y = base - rand(30, 120);
          world.plats.push({ x0: x, x1: x + w, y });
          coinLine(x + 25, x + w - 25, y - 30);
          if (d > 0.4 && Math.random() < 0.3 && w > 190) world.obs.push({ t: "spike", x: x + w * 0.5 - 15, y, w: 30, h: 26 });
          x += w + rand(gap * 0.35, gap * 0.65);
        }
        genX = x;
        const len = rand(320, 520);
        addGround(len, Math.round(rand(-30, 30)));
        genX += len;
      } else {
        // steps up then down
        const n = 2 + Math.floor(Math.random() * 2);
        for (let i = 0; i < n; i++) { const len = rand(220, 320); addGround(len, -48); coinLine(genX + 40, genX + len - 40, lastGround().y - 30, 50); genX += len; }
        const len = rand(380, 560);
        addGround(len, 48 * n);
        if (d > 0.25) hazard(genX + len * 0.55, lastGround().y, d);
        genX += len;
      }
    }
    // forget what's far behind
    const cut = camX - 400;
    world.grounds = world.grounds.filter(g => g.x1 > cut);
    world.plats = world.plats.filter(g => g.x1 > cut);
    world.obs = world.obs.filter(o => o.x + (o.w || o.r * 2) > cut);
    world.coins = world.coins.filter(c => c.x > cut && !c.gone);
    world.pows = world.pows.filter(p => p.x > cut && !p.taken);
    world.bees = world.bees.filter(b => b.x > cut && b.y < 900);
  }
  function pickPow() { const k = Object.keys(C.powerups); return k[Math.floor(Math.random() * k.length)]; }

  // ---------- input --------------------------------------------------------
  function press() { if (mode === "dead") return; input.held = true; input.buffer = PH.buffer; if (mode === "play") on.firstInput && on.firstInput(); }
  function release() {
    input.held = false;
    if (P && P.vy < -PH.jump * 0.35 && !fx.rocket) P.vy *= PH.holdBoost;
  }
  function slide() {
    if (mode !== "play" || fx.rocket) return;
    if (P.onGround) { if (P.slideT <= 0) { P.slideT = PH.slideTime; sfx("slide"); } }
    else { P.vy = Math.max(P.vy, 1100); P.slideQueue = true; } // slam down, slide on landing
  }

  // ---------- helpers ------------------------------------------------------
  const pH = () => (P.slideT > 0 ? PH_SLIDE : PH_STAND);
  function groundAt(x, halfW = PW / 2) {
    // solid ground segments under this x (feet may overlap an edge)
    return world.grounds.filter(g => x + halfW > g.x0 && x - halfW < g.x1);
  }
  function spawnDust(x, y, n = 6, color = "rgba(255,255,255,.8)") {
    for (let i = 0; i < n; i++) parts.push({ x, y, vx: rand(-120, 40), vy: rand(-140, -20), r: rand(3, 7), life: 1, decay: rand(1.6, 2.6), color });
  }
  function screenOf(x, y) { return { x: SX(x), y: SY(y) }; }

  function hurt(src) {
    if (mode !== "play") return;
    if (fx.rocket || fx.float || fx.invuln > 0) return;
    if (fx.shield > 0) {
      fx.shield = 0; fx.invuln = 1.1;
      if (src) src.dead = true;
      Sound.play("shield"); vibrate(40); shake = 0.3;
      const p = screenOf(P.x, P.y - 20); FX.ring(p.x, p.y, "#7fd4ff", 10, 10); FX.sparkle(p.x, p.y, 12, 30);
      on.shieldBreak && on.shieldBreak();
      return;
    }
    die();
  }
  function die() {
    mode = "dead"; deadT = 0;
    P.vy = -720; P.deadVx = -60; P.onGround = false;
    timeScale = 0.35; slowUntil = time + 0.5;
    shake = 0.5;
    Sound.play("hit"); Sound.setRate(0.7); vibrate([60, 40, 90]);
    const p = screenOf(P.x, P.y - 20); FX.explosion ? FX.explosion(p.x, p.y, 80) : FX.sparkle(p.x, p.y, 16, 30);
  }
  function revive() {
    mode = "play";
    // put the runner on the next solid ground, shielded for a moment
    const g = world.grounds.find(g => g.x1 > P.x + 60) || lastGround();
    P.x = Math.max(P.x, g.x0 + 40); P.y = g.y - 160; P.vy = 0; P.rot = 0; P.onGround = false; P.jumps = 1;
    P.overSent = false; // so the next fall reports game over again
    world.obs = world.obs.filter(o => o.x > P.x + 500 || o.x < P.x - 200);
    world.bees = world.bees.filter(b => b.x > P.x + 500 || b.x < P.x - 200);
    fx.invuln = 2; fx.float = true; timeScale = 1;
    Sound.setRate(1);
  }

  function activate(type) {
    const dur = C.powerups[type].base * (durMult[type] || 1);
    stats.powers++;
    if (type === "rocket") { fx.rocket = dur; fx.float = false; Sound.play("rocket"); P.vy = -600; spawnRocketCoins(dur); }
    else { fx[type] = dur; Sound.play(type === "shield" ? "shield" : "power"); }
    vibrate(30);
    on.power && on.power(type, dur);
  }
  function spawnRocketCoins(dur) {
    const span = dur * speed * 1.6;
    for (let x = P.x + 200; x < P.x + span; x += 46) world.coins.push({ x, y: -230 + Math.sin(x / 120) * 30, taken: false });
  }

  // ---------- update -------------------------------------------------------
  function update(dt) {
    time += dt;
    if (slowUntil && time > slowUntil) { timeScale += (1 - timeScale) * 0.1; if (timeScale > 0.98) { timeScale = 1; slowUntil = 0; } }
    const d = dt * timeScale;

    if (mode === "dead") {
      deadT += d;
      P.vy += PH.gravity * d; P.y += P.vy * d; P.x += P.deadVx * d; P.rot += 8 * d;
      if (deadT > 1.3 && !P.overSent) { P.overSent = true; on.over && on.over({ ...stats, dist: Math.floor(stats.dist) }); }
      updateParts(d);
      return;
    }

    // speed & distance
    const rocketing = fx.rocket > 0;
    speed = Math.min(PH.maxSpeed, PH.startSpeed + stats.dist * PH.accel);
    const vx = speed * (rocketing ? 1.6 : 1);
    const prevX = P.x, prevFeet = P.y;
    P.x += vx * d;
    stats.dist = Math.max(0, P.x * MPU);

    // timers
    ["magnet", "shield", "double", "invuln"].forEach(k => { if (fx[k] > 0) fx[k] = Math.max(0, fx[k] - d); });
    if (P.slideT > 0) P.slideT -= d;
    if (input.buffer > 0) input.buffer -= d;
    if (P.coyote > 0) P.coyote -= d;
    coinChainT -= d; if (coinChainT <= 0) coinChain = 0;
    P.blinkT -= d; if (P.blinkT < -0.12) P.blinkT = rand(1.5, 4);

    // demo autopilot
    if (mode === "demo") autopilot();

    if (rocketing) {
      fx.rocket -= d;
      P.y += (-230 - P.y) * Math.min(1, d * 4);
      P.vy = 0; P.onGround = false;
      if (Math.random() < 0.8) parts.push({ x: P.x - 20, y: P.y + rand(-8, 8), vx: -vx * 0.3, vy: rand(-30, 30), r: rand(5, 10), life: 1, decay: 2, color: Math.random() < 0.5 ? "#ffd32a" : "#ff7a2a" });
      if (fx.rocket <= 0) { fx.rocket = 0; fx.float = true; }
    } else {
      // jumping (buffer + coyote time + double jump)
      if (input.buffer > 0) {
        if (P.onGround || P.coyote > 0) {
          P.vy = -PH.jump; P.onGround = false; P.coyote = 0; P.jumps = 1; P.slideT = 0; input.buffer = 0;
          P.sx = 0.75; P.sy = 1.3; stats.jumps++;
          sfx("jump"); spawnDust(P.x, P.y, 5);
        } else if (P.jumps < 2) {
          P.vy = -PH.doubleJump; P.jumps = 2; input.buffer = 0; P.flip = 1;
          P.sx = 0.8; P.sy = 1.25;
          sfx("djump"); const p = screenOf(P.x, P.y); FX.ring(p.x, p.y, "rgba(255,255,255,.8)", 5, 4);
        }
      }
      // gravity (gentle while floating down after a rocket / revive)
      const g = fx.float ? PH.gravity * 0.35 : PH.gravity;
      P.vy = Math.min(fx.float ? 260 : 1600, P.vy + g * d);
      P.y += P.vy * d;
    }
    if (P.flip > 0) P.flip = Math.max(0, P.flip - d * 2.6);

    // landing on ground / platforms / crates
    const wasGround = P.onGround;
    P.onGround = false;
    if (!rocketing && P.vy >= 0) {
      const surfaces = [];
      groundAt(P.x).forEach(gr => surfaces.push(gr.y));
      world.plats.forEach(pl => { if (P.x + PW / 2 > pl.x0 && P.x - PW / 2 < pl.x1) surfaces.push(pl.y); });
      world.obs.forEach(o => { if (o.t === "crate" && !o.dead && P.x + PW / 2 > o.x + 4 && P.x - PW / 2 < o.x + o.w - 4) surfaces.push(o.y - o.h); });
      for (const top of surfaces.sort((a, b) => a - b)) {
        if (prevFeet <= top + 1 && P.y >= top) {
          P.y = top; P.vy = 0; P.onGround = true; P.jumps = 0;
          if (!wasGround) { P.sx = 1.3; P.sy = 0.72; sfx("land"); spawnDust(P.x, P.y, 6); if (fx.float) fx.float = false; }
          if (P.slideQueue) { P.slideQueue = false; P.slideT = PH.slideTime; sfx("slide"); }
          break;
        }
      }
    }
    if (wasGround && !P.onGround && P.vy >= 0 && !rocketing) P.coyote = PH.coyote;

    // walls: running into the side of a higher ground segment or a crate
    if (!rocketing && !fx.float) {
      for (const gr of world.grounds) {
        if (prevX + PW / 2 <= gr.x0 + 2 && P.x + PW / 2 > gr.x0 && P.y > gr.y + 6) { hurtWall(gr); break; }
      }
      for (const o of world.obs) {
        if (o.t !== "crate" || o.dead) continue;
        if (prevX + PW / 2 <= o.x + 2 && P.x + PW / 2 > o.x && P.y > o.y - o.h + 6 && P.y - pH() < o.y) { hurt(o); break; }
      }
    }

    // pits
    if (P.y > 520) {
      if (mode === "demo" || fx.float || fx.invuln > 0 || fx.shield > 0) {
        if (fx.shield > 0 && mode === "play" && !fx.float && fx.invuln <= 0) { fx.shield = 0; Sound.play("shield"); on.shieldBreak && on.shieldBreak(); }
        P.vy = -1250; P.y = 500; fx.float = true; fx.invuln = Math.max(fx.invuln, 1);
      } else if (mode === "play") { die(); return; }
    }

    // hazards
    const box = { x0: P.x - PW / 2 + 6, x1: P.x + PW / 2 - 6, y0: P.y - pH() + 6, y1: P.y - 2 };
    if (!rocketing) {
      for (const o of world.obs) {
        if (o.dead) continue;
        if (o.t === "spike" && box.x1 > o.x + 4 && box.x0 < o.x + o.w - 4 && box.y1 > o.y - o.h + 8) { hurt(o); break; }
        if (o.t === "bar" && box.x1 > o.x && box.x0 < o.x + o.w && box.y0 < o.y - o.gap && box.y1 > o.y - o.gap - o.h) { hurt(o); break; }
        if (o.t === "saw") {
          const cx = Math.max(box.x0, Math.min(o.x, box.x1)), cy = Math.max(box.y0, Math.min(o.y, box.y1));
          if (Math.hypot(cx - o.x, cy - o.y) < o.r - 4) { hurt(o); break; }
        }
      }
      for (const b of world.bees) {
        if (b.dead) continue;
        if (box.x1 > b.x - 14 && box.x0 < b.x + 14 && box.y1 > b.y - 12 && box.y0 < b.y + 12) {
          if (P.vy > 0 && prevFeet <= b.y - 4) stomp(b);
          else hurt(b);
          break;
        }
      }
    }

    // bees bob, dead bees fall
    world.bees.forEach(b => {
      if (b.dead) { b.vy += PH.gravity * d; b.y += b.vy * d; return; }
      b.phase += d * 3; b.y = b.y0 + Math.sin(b.phase) * 12;
    });

    // coins (+ magnet)
    const mr = C.powerups.magnet.range;
    for (const c of world.coins) {
      if (c.taken) {
        c.t += d * 3;
        if (c.t >= 1) c.gone = true;
        continue;
      }
      const dx = c.x - P.x, dy = c.y - (P.y - pH() / 2), dist = Math.hypot(dx, dy);
      if ((fx.magnet > 0 || rocketing) && dist < mr) { const k = Math.min(1, d * 9); c.x -= dx * k; c.y -= dy * k; }
      if (dist < 30) collect(c);
    }
    for (const p of world.pows) {
      if (p.taken) continue;
      if (Math.hypot(p.x - P.x, p.y - (P.y - 22)) < 42) { p.taken = true; activate(p.type); }
    }

    // squash relax, run cycle
    P.sx += (1 - P.sx) * Math.min(1, d * 12); P.sy += (1 - P.sy) * Math.min(1, d * 12);
    if (P.onGround) P.phase = (P.phase + d * speed / 120) % 1;

    // camera (the horizon sits higher on the home screen so the demo runner clears the menu)
    const gr = mode === "demo" ? 0.56 : 0.74;
    if (Math.abs(groundRatio - gr) > 0.001) { groundRatio += (gr - groundRatio) * Math.min(1, d * 4); groundY = H * groundRatio; }
    camX = P.x - viewW * 0.28;
    const ty = Math.min(0, (P.y + 170) * 0.7);
    camY += (ty - camY) * Math.min(1, d * 3);

    // biome & milestones
    const b = Math.floor(stats.dist / C.biomeEvery) % C.biomes.length;
    if (b !== biome) { prevBiome = biome; biome = b; biomeT = 0; if (mode === "play") on.biome && on.biome(C.biomes[b].name); }
    if (biomeT < 1) biomeT = Math.min(1, biomeT + d / 2.5);
    if (mode === "play" && stats.dist >= nextMilestone) { on.milestone && on.milestone(nextMilestone); nextMilestone += C.milestoneEvery; }
    if (mode === "play" && best && !P.passedBest && stats.dist > best) { P.passedBest = true; on.passBest && on.passBest(); }

    generate();
    updateParts(d);
    if (shake > 0) shake = Math.max(0, shake - d);
    sinceHud += d;
    if (mode === "play" && sinceHud > 0.1) { sinceHud = 0; on.hud && on.hud(stats, fx); }
  }

  function hurtWall(gr) {
    if (mode === "demo") { P.vy = -PH.jump; return; }
    const saved = fx.shield > 0 || fx.invuln > 0;
    hurt(null);
    // a shield (or grace period) pops you up onto the ledge instead of pinning you against it
    if (saved && mode === "play") { P.y = gr.y; P.vy = -420; P.onGround = false; P.jumps = 1; }
  }
  function stomp(b) {
    b.dead = true; b.vy = -200;
    P.vy = -760; P.jumps = 1; P.sx = 1.3; P.sy = 0.75;
    stats.stomps++;
    sfx("stomp"); vibrate(25);
    const p = screenOf(b.x, b.y);
    FX.sparkle(p.x, p.y, 10, 20); FX.ring(p.x, p.y, "#ffd32a", 6, 6);
    for (let i = 0; i < 3; i++) world.coins.push({ x: b.x + 30 + i * 30, y: b.y - 40 - i * 10, taken: false });
    if (mode === "play") on.stomp && on.stomp(p.x, p.y);
  }
  function collect(c) {
    c.taken = true; c.t = 0;
    const n = fx.double > 0 ? 2 : 1;
    stats.coins += n;
    coinChain++; coinChainT = 0.45;
    if (mode === "play") {
      Sound.play("coin", Math.min(coinChain - 1, 10));
      if (coinChain && coinChain % 10 === 0) { const p = screenOf(c.x, c.y); on.chain && on.chain(coinChain, p.x, p.y); }
    }
  }
  function autopilot() {
    // look ahead for trouble and jump / slide like a decent player
    const look = speed * 0.32;
    let need = false, duck = false;
    const g = groundAt(P.x + 60);
    const ahead = world.grounds.find(gr => gr.x0 > P.x && gr.x0 < P.x + look * 1.4);
    if (!groundAt(P.x + look * 0.6).length && P.onGround) need = true;
    if (ahead && ahead.y < (g[0] ? g[0].y : 0) - 10 && ahead.x0 - P.x < look) need = true;
    world.obs.forEach(o => {
      const dx = o.x - P.x;
      if (dx > 20 && dx < look) { if (o.t === "bar") duck = true; else if (o.t !== "saw") need = true; }
    });
    world.bees.forEach(b => { const dx = b.x - P.x; if (!b.dead && dx > 10 && dx < look * 0.9) need = true; });
    if (duck && P.onGround) P.slideT = PH.slideTime;
    else if (need && P.onGround) input.buffer = 0.05;
    else if (!P.onGround && P.vy > 200 && !groundAt(P.x + 80).length && P.jumps < 2) input.buffer = 0.05;
  }

  function updateParts(d) {
    parts = parts.filter(p => { p.life -= p.decay * d; p.x += p.vx * d; p.y += p.vy * d; p.vy += 300 * d; return p.life > 0; });
  }

  // ---------- drawing ------------------------------------------------------
  function hex2rgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
  function mixC(a, b, t) { const A = hex2rgb(a), B = hex2rgb(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(",")})`; }
  function col(key, i) {
    const a = C.biomes[prevBiome], b = C.biomes[biome];
    const va = i === undefined ? a[key] : a[key][i], vb = i === undefined ? b[key] : b[key][i];
    return biomeT >= 1 ? vb : mixC(va, vb, biomeT);
  }
  const hash = n => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); };

  function drawBackground() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, col("sky", 0)); g.addColorStop(1, col("sky", 1));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const night = C.biomes[biome].night;
    if (night) {
      ctx.fillStyle = "#fff";
      for (let i = 0; i < 60; i++) {
        const sx = (((hash(i) * W - camX * 0.02 * sc) % W) + W) % W;
        ctx.globalAlpha = 0.3 + 0.5 * Math.abs(Math.sin(time + i));
        ctx.fillRect(sx, hash(i + 99) * H * 0.5, 2, 2);
      }
      ctx.globalAlpha = 1;
    }
    // sun / moon
    const sx = W * 0.78, sy = H * 0.2;
    const sg = ctx.createRadialGradient(sx, sy, 10, sx, sy, 140 * sc);
    sg.addColorStop(0, col("sun")); sg.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = sg; ctx.fillRect(sx - 160 * sc, sy - 160 * sc, 320 * sc, 320 * sc);
    ctx.fillStyle = col("sun"); ctx.beginPath(); ctx.arc(sx, sy, 34 * sc, 0, Math.PI * 2); ctx.fill();

    // far hills (parallax 0.15)
    const par1 = camX * 0.15;
    ctx.fillStyle = col("far");
    ctx.beginPath(); ctx.moveTo(0, H);
    for (let px = 0; px <= W + 20; px += 20) {
      const wx = px / sc + par1;
      const h = 120 + Math.sin(wx / 260) * 50 + Math.sin(wx / 97 + 1) * 22 + (C.biomes[biome].deco === "pine" ? Math.abs(Math.sin(wx / 140)) * 70 : 0);
      ctx.lineTo(px, groundY - (h + 40) * sc - camY * sc * 0.2);
    }
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();

    // mid scenery (parallax 0.4)
    const par2 = camX * 0.4, cell = 170;
    const startCell = Math.floor((par2 - 100) / cell), endCell = Math.ceil((par2 + viewW + 100) / cell);
    ctx.fillStyle = col("mid");
    for (let i = startCell; i <= endCell; i++) {
      if (hash(i) < 0.35) continue;
      const wx = i * cell + hash(i + 7) * 80;
      const x = (wx - par2) * sc, base = groundY + 30 * sc - camY * sc * 0.4, s = (0.7 + hash(i + 3) * 0.6) * sc;
      drawDeco(C.biomes[biome].deco, x, base, s, i);
    }
  }
  function drawDeco(type, x, base, s, i) {
    ctx.beginPath();
    if (type === "tree") { ctx.fillRect(x - 6 * s, base - 70 * s, 12 * s, 70 * s); ctx.arc(x, base - 90 * s, 40 * s, 0, Math.PI * 2); ctx.arc(x - 26 * s, base - 70 * s, 28 * s, 0, Math.PI * 2); ctx.arc(x + 26 * s, base - 70 * s, 28 * s, 0, Math.PI * 2); }
    else if (type === "cactus") { ctx.fillRect(x - 9 * s, base - 110 * s, 18 * s, 110 * s); ctx.fillRect(x - 32 * s, base - 80 * s, 14 * s, 40 * s); ctx.fillRect(x - 32 * s, base - 54 * s, 28 * s, 12 * s); ctx.fillRect(x + 18 * s, base - 95 * s, 14 * s, 40 * s); ctx.fillRect(x + 6 * s, base - 64 * s, 26 * s, 12 * s); }
    else if (type === "pine") { for (let k = 0; k < 3; k++) { ctx.moveTo(x, base - (150 - k * 38) * s); ctx.lineTo(x + (34 + k * 12) * s, base - (90 - k * 38) * s); ctx.lineTo(x - (34 + k * 12) * s, base - (90 - k * 38) * s); } ctx.rect(x - 6 * s, base - 30 * s, 12 * s, 30 * s); }
    else if (type === "building") {
      const h = (120 + hash(i + 5) * 160) * s, w = (60 + hash(i + 9) * 40) * s;
      ctx.rect(x - w / 2, base - h, w, h);
      ctx.fill(); ctx.fillStyle = "rgba(255,230,140,.75)";
      for (let wy = base - h + 12 * s; wy < base - 20 * s; wy += 18 * s) for (let wx = x - w / 2 + 8 * s; wx < x + w / 2 - 10 * s; wx += 14 * s) if (hash(wx * 7 + wy) > 0.45) ctx.fillRect(wx, wy, 6 * s, 9 * s);
      ctx.fillStyle = col("mid"); return;
    } else { ctx.moveTo(x - 50 * s, base); ctx.lineTo(x - 20 * s, base - 60 * s); ctx.lineTo(x + 10 * s, base - 40 * s); ctx.lineTo(x + 40 * s, base - 80 * s); ctx.lineTo(x + 60 * s, base); }
    ctx.fill();
  }

  function rrect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  function drawWorld() {
    const top = col("top"), ground = col("ground");
    // ground segments
    world.grounds.forEach(g => {
      const x0 = SX(g.x0), x1 = SX(g.x1), y = SY(g.y);
      if (x1 < -20 || x0 > W + 20) return;
      ctx.fillStyle = ground; ctx.fillRect(x0, y, x1 - x0, H - y + 10);
      ctx.fillStyle = "rgba(0,0,0,.12)";
      for (let k = Math.ceil(g.x0 / 60) * 60; k < g.x1; k += 60) ctx.fillRect(SX(k) + 10 * sc, y + (26 + (k % 120 ? 18 : 40)) * sc, 14 * sc, 6 * sc);
      ctx.fillStyle = top; rrect(x0, y - 4 * sc, x1 - x0, 18 * sc, 6 * sc); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.25)"; ctx.fillRect(x0 + 4 * sc, y - 2 * sc, x1 - x0 - 8 * sc, 3 * sc);
    });
    // platforms
    world.plats.forEach(p => {
      const x0 = SX(p.x0), x1 = SX(p.x1), y = SY(p.y);
      if (x1 < -20 || x0 > W + 20) return;
      ctx.fillStyle = ground; rrect(x0, y, x1 - x0, 30 * sc, 10 * sc); ctx.fill();
      ctx.fillStyle = top; rrect(x0, y - 4 * sc, x1 - x0, 14 * sc, 6 * sc); ctx.fill();
    });
    // best flag
    if (mode !== "demo" && best > 0) {
      const bx = best / MPU, x = SX(bx);
      if (x > -60 && x < W + 60) {
        const gr = world.grounds.find(g => bx >= g.x0 && bx <= g.x1);
        const y = SY(gr ? gr.y : 0);
        ctx.fillStyle = "#fff"; ctx.fillRect(x - 2, y - 120 * sc, 4, 120 * sc);
        ctx.fillStyle = "#ff3d6b"; ctx.beginPath(); ctx.moveTo(x + 2, y - 120 * sc); ctx.lineTo(x + 70 * sc, y - 104 * sc); ctx.lineTo(x + 2, y - 88 * sc); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.font = `${14 * sc}px 'Lilita One', sans-serif`; ctx.fillText("BEST", x + 8 * sc, y - 99 * sc);
      }
    }
    // obstacles
    world.obs.forEach(o => {
      if (o.dead) return;
      const x = SX(o.x), y = SY(o.y);
      if (x > W + 100 || x < -150) return;
      if (o.t === "spike") {
        const n = Math.round(o.w / 30);
        for (let i = 0; i < n; i++) {
          const sx = x + i * 30 * sc;
          ctx.fillStyle = "#cfd6e6"; ctx.beginPath(); ctx.moveTo(sx, y); ctx.lineTo(sx + 15 * sc, y - o.h * sc); ctx.lineTo(sx + 30 * sc, y); ctx.fill();
          ctx.fillStyle = "#8a93ad"; ctx.beginPath(); ctx.moveTo(sx + 15 * sc, y - o.h * sc); ctx.lineTo(sx + 30 * sc, y); ctx.lineTo(sx + 15 * sc, y); ctx.fill();
        }
      } else if (o.t === "crate") {
        const w = o.w * sc, h = o.h * sc;
        for (let k = 0; k < h / (42 * sc) - 0.01; k++) {
          const by = y - (k + 1) * 42 * sc;
          ctx.fillStyle = "#c98a4b"; rrect(x, by, w, 42 * sc, 4 * sc); ctx.fill();
          ctx.strokeStyle = "#8a5326"; ctx.lineWidth = 3 * sc; ctx.strokeRect(x + 4 * sc, by + 4 * sc, w - 8 * sc, 34 * sc);
          ctx.beginPath(); ctx.moveTo(x + 6 * sc, by + 6 * sc); ctx.lineTo(x + w - 6 * sc, by + 36 * sc); ctx.stroke();
        }
      } else if (o.t === "bar") {
        const by = y - (o.gap + o.h) * sc;
        ctx.fillStyle = "#5a5f7a"; ctx.fillRect(x - 4 * sc, by - 10 * sc, 6 * sc, (o.gap + o.h + 10) * sc); ctx.fillRect(x + o.w * sc - 2 * sc, by - 10 * sc, 6 * sc, (o.gap + o.h + 10) * sc);
        ctx.save(); rrect(x, by, o.w * sc, o.h * sc, 5 * sc); ctx.clip();
        ctx.fillStyle = "#ffd32a"; ctx.fillRect(x, by, o.w * sc, o.h * sc);
        ctx.fillStyle = "#2a2a3a"; for (let k = -2; k < 8; k++) { ctx.beginPath(); ctx.moveTo(x + k * 18 * sc, by + o.h * sc); ctx.lineTo(x + (k * 18 + 10) * sc, by); ctx.lineTo(x + (k * 18 + 19) * sc, by); ctx.lineTo(x + (k * 18 + 9) * sc, by + o.h * sc); ctx.fill(); }
        ctx.restore();
      } else if (o.t === "saw") {
        ctx.save(); ctx.translate(x, y); ctx.rotate(time * 9);
        ctx.fillStyle = "#c9d0e0"; ctx.beginPath();
        for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2, r = k % 2 ? o.r * 0.78 * sc : o.r * sc; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
        ctx.fill(); ctx.fillStyle = "#6a7290"; ctx.beginPath(); ctx.arc(0, 0, o.r * 0.32 * sc, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        ctx.strokeStyle = "rgba(90,95,122,.6)"; ctx.lineWidth = 3 * sc; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 200 * sc); ctx.stroke();
      }
    });
    // bees
    world.bees.forEach(b => {
      const x = SX(b.x), y = SY(b.y);
      if (x > W + 60 || x < -60) return;
      ctx.save(); ctx.translate(x, y); if (b.dead) ctx.rotate(Math.PI);
      const flap = Math.sin(time * 40) * 0.5;
      ctx.fillStyle = "rgba(220,240,255,.85)";
      ctx.beginPath(); ctx.ellipse(-4 * sc, -14 * sc, 9 * sc, 13 * sc * (0.6 + flap * 0.4), -0.4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(6 * sc, -14 * sc, 9 * sc, 13 * sc * (0.6 - flap * 0.4), 0.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#ffcf33"; ctx.beginPath(); ctx.ellipse(0, 0, 19 * sc, 14 * sc, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#2a2a3a"; ctx.fillRect(-6 * sc, -13 * sc, 5 * sc, 26 * sc); ctx.fillRect(4 * sc, -13 * sc, 5 * sc, 26 * sc);
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(-12 * sc, -3 * sc, 5 * sc, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#2a2a3a"; ctx.beginPath(); ctx.arc(-13 * sc, -3 * sc, 2.5 * sc, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(18 * sc, 0); ctx.lineTo(26 * sc, 3 * sc); ctx.lineTo(18 * sc, 5 * sc); ctx.fill();
      ctx.restore();
    });
    // coins
    world.coins.forEach(c => {
      const x = SX(c.x), y = SY(c.y);
      if (x > W + 30 || x < -30) return;
      if (c.taken) {
        ctx.globalAlpha = Math.max(0, 1 - c.t);
        ctx.fillStyle = "#fff59a"; ctx.font = `${16 * sc}px 'Lilita One', sans-serif`; ctx.fillText(fx.double > 0 ? "+2" : "+1", x - 8 * sc, y - c.t * 40 * sc);
        ctx.globalAlpha = 1; return;
      }
      const w = Math.abs(Math.cos(time * 4 + c.x * 0.02));
      ctx.fillStyle = "#e0a100"; ctx.beginPath(); ctx.ellipse(x, y + 1.5 * sc, Math.max(2, 12 * w) * sc, 12 * sc, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#ffd84a"; ctx.beginPath(); ctx.ellipse(x, y, Math.max(1.5, 11 * w) * sc, 11 * sc, 0, 0, Math.PI * 2); ctx.fill();
      if (w > 0.4) { ctx.fillStyle = "#fff6b0"; ctx.fillRect(x - 2 * sc * w, y - 6 * sc, 3 * sc * w, 12 * sc); }
    });
    // power-up bubbles
    world.pows.forEach(p => {
      if (p.taken) return;
      const x = SX(p.x), y = SY(p.y + Math.sin(time * 3 + p.x) * 8);
      if (x > W + 60 || x < -60) return;
      const pc = C.powerups[p.type];
      ctx.save();
      ctx.shadowColor = pc.color; ctx.shadowBlur = 20 * sc;
      ctx.fillStyle = "rgba(255,255,255,.9)"; ctx.beginPath(); ctx.arc(x, y, 26 * sc, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0; ctx.lineWidth = 4 * sc; ctx.strokeStyle = pc.color; ctx.stroke();
      ctx.font = `${26 * sc}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(pc.emoji, x, y + 1);
      ctx.restore();
    });
  }

  function drawPlayer() {
    const x = SX(P.x), y = SY(P.y);
    ctx.save(); ctx.translate(x, y);
    if (mode === "dead") ctx.rotate(P.rot);
    else if (P.flip > 0) { ctx.translate(0, -22 * sc); ctx.rotate((1 - P.flip) * Math.PI * 2); ctx.translate(0, 22 * sc); }
    if (fx.invuln > 0 && Math.floor(time * 16) % 2 && mode === "play") ctx.globalAlpha = 0.45;
    // rocket pack
    if (fx.rocket > 0) {
      ctx.fillStyle = "#c9d0e0"; rrect(-30 * sc, -40 * sc, 16 * sc, 30 * sc, 5 * sc); ctx.fill();
      ctx.fillStyle = Math.random() < 0.5 ? "#ffd32a" : "#ff7a2a";
      ctx.beginPath(); ctx.moveTo(-28 * sc, -10 * sc); ctx.lineTo(-22 * sc, (10 + Math.random() * 18) * sc); ctx.lineTo(-16 * sc, -10 * sc); ctx.fill();
    }
    if (fx.float && fx.rocket <= 0 && mode === "play") {
      // little parachute while floating down
      ctx.strokeStyle = "rgba(255,255,255,.8)"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-14 * sc, -40 * sc); ctx.lineTo(-30 * sc, -90 * sc); ctx.moveTo(14 * sc, -40 * sc); ctx.lineTo(30 * sc, -90 * sc); ctx.stroke();
      ctx.fillStyle = "#ff5f8f"; ctx.beginPath(); ctx.ellipse(0, -92 * sc, 42 * sc, 22 * sc, 0, Math.PI, 0); ctx.fill();
    }
    Characters.draw(ctx, charId, 50 * sc, { // drawn a touch larger than the (forgiving) hitbox
      phase: P.phase, air: !P.onGround, slide: P.slideT > 0, sx: P.sx, sy: P.sy,
      blink: P.blinkT < 0, dead: mode === "dead", vy: P.vy
    });
    ctx.globalAlpha = 1;
    if (fx.shield > 0 && mode !== "dead") {
      const pulse = 1 + Math.sin(time * 6) * 0.05;
      ctx.strokeStyle = `rgba(120,200,255,${fx.shield < 2 ? (Math.floor(time * 8) % 2 ? 0.9 : 0.3) : 0.85})`; ctx.lineWidth = 4 * sc;
      ctx.fillStyle = "rgba(120,200,255,.18)";
      ctx.beginPath(); ctx.arc(0, -24 * sc, 40 * sc * pulse, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    if (fx.magnet > 0) {
      ctx.strokeStyle = "rgba(255,77,109,.35)"; ctx.lineWidth = 2;
      for (let k = 0; k < 2; k++) { const r = ((time * 90 + k * 50) % 100) * sc; ctx.beginPath(); ctx.arc(0, -24 * sc, r, 0, Math.PI * 2); ctx.stroke(); }
    }
    ctx.restore();
  }

  function drawParts() {
    parts.forEach(p => {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(SX(p.x), SY(p.y), p.r * sc * p.life, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;
    // speed lines when fast
    const k = (speed - 520) / (PH.maxSpeed - 520);
    if ((k > 0 || fx.rocket > 0) && mode !== "dead") {
      ctx.strokeStyle = `rgba(255,255,255,${0.25 * Math.max(k, fx.rocket > 0 ? 1 : 0)})`; ctx.lineWidth = 2;
      for (let i = 0; i < 10; i++) { const y = hash(i + Math.floor(time * 8)) * H * 0.8, x = W - ((time * 1600 + i * 300) % (W + 300)); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 80, y); ctx.stroke(); }
    }
  }

  function render() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (shake > 0) ctx.translate((Math.random() - 0.5) * shake * 24, (Math.random() - 0.5) * shake * 24);
    drawBackground();
    drawWorld();
    drawPlayer();
    drawParts();
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

  return {
    on, start, demo, revive, press, release, slide,
    setChar(id) { charId = id; },
    setPaused(p) { paused = p; },
    get mode() { return mode; },
    get stats() { return stats; },
    get fx() { return fx; },
    get player() { return P; },
    // headless helpers for bots / automated tests / screenshots
    step(dt) { update(dt); },
    renderNow() { render(); },
    get world() { return world; }
  };
})();

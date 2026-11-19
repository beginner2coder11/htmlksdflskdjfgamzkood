/* ==========================================================================
   PRISM HOP — engine
   World: x = sideways, y = up, z = forward. Tiles float at y = 0 over a glossy
   "light lake" floor. A chase camera looks down the lane and everything is
   projected with a small perspective camera on Canvas 2D, drawn far → near.
   ========================================================================== */
window.Game = (() => {
  const C = window.GAME_CONFIG, L = C.lane, S = C.speed;
  const cv = document.getElementById("view"), ctx = cv.getContext("2d");
  const PITCH = 0.205, CP = Math.cos(PITCH), SP = Math.sin(PITCH);
  const CAM_Y = 3.0, CAM_BACK = 7.5, FLOOR = -1.7, THICK = 0.34, GAP = L.rowGap;

  /* ---------- helpers ---------- */
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const hex = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const mixC = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const rgba = (c, al = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${al})`;
  const WHITE = [255, 255, 255], INK = [10, 6, 30];
  const hsl = (h, s = 100, l = 62, a = 1) => `hsla(${h % 360},${s}%,${l}%,${a})`;
  function hslC(h, s = 1, l = 0.62) { h = ((h % 360) + 360) % 360 / 60; const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(h % 2 - 1)), m = l - c / 2; let r = 0, g = 0, b = 0; if (h < 1) [r, g] = [c, x]; else if (h < 2) [r, g] = [x, c]; else if (h < 3) [g, b] = [c, x]; else if (h < 4) [g, b] = [x, c]; else if (h < 5) [r, b] = [x, c]; else [r, b] = [c, x]; return [(r + m) * 255, (g + m) * 255, (b + m) * 255]; }
  function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

  const WORLDS = C.worlds.map((w, i) => ({
    ...w, idx: i, skyC: w.sky.map(hex), floorC: w.floor.map(hex), tileC: hex(w.tile), glowC: hex(w.glow), accC: hex(w.accent), sunC: hex(w.sun)
  }));
  // far silhouettes per world, generated once (x in 0..1 → height in 0..1)
  WORLDS.forEach((w, wi) => {
    const r = mulberry(1000 + wi * 77), far = [], near = [];
    for (let i = 0; i <= 64; i++) {
      const x = i / 64;
      far.push(0.35 + 0.25 * Math.sin(x * 9 + wi) + 0.18 * Math.sin(x * 23 + wi * 3) + r() * 0.08);
      near.push(0.25 + 0.2 * Math.sin(x * 6 + wi * 2) + 0.12 * Math.sin(x * 17) + r() * 0.1);
    }
    w.far = far; w.near = near;
    w.blocks = Array.from({ length: 34 }, (_, i) => ({ x: i / 34 + r() * 0.01, w: 0.02 + r() * 0.025, h: 0.25 + r() * 0.75, lit: r() }));
  });

  /* ---------- canvas & camera ---------- */
  let W = 1, H = 1, DPR = 1, F = 1, baseF = 1, CX = 0, CY = 0, HY = 0, vignette = null;
  const cam = { x: 0, z: -CAM_BACK, y: 0, shake: 0, fov: 1 };
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, innerWidth); H = Math.max(1, innerHeight);
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    cv.style.width = W + "px"; cv.style.height = H + "px";
    baseF = Math.min(H * 0.95, W * 1.9);
    vignette = ctx.createRadialGradient(W / 2, H * 0.55, Math.min(W, H) * 0.35, W / 2, H * 0.55, Math.max(W, H) * 0.8);
    vignette.addColorStop(0, "rgba(0,0,0,0)"); vignette.addColorStop(1, "rgba(0,0,0,0.55)");
  }
  addEventListener("resize", resize);
  function proj(x, y, z) {
    const dx = x - cam.x, dy = y - CAM_Y - cam.y, dz = z - cam.z;
    const d = -dy * SP + dz * CP; if (d < 0.3) return null;
    const v = dy * CP + dz * SP, s = F / d;
    return { x: CX + dx * s, y: CY - v * s, s, d };
  }
  function poly(pts) {   // pts = [[x,y,z],…] → path on ctx, false if any point is behind the camera
    const p = []; for (const q of pts) { const r = proj(q[0], q[1], q[2]); if (!r) return false; p.push(r); }
    ctx.beginPath(); ctx.moveTo(p[0].x, p[0].y); for (let i = 1; i < p.length; i++) ctx.lineTo(p[i].x, p[i].y); ctx.closePath();
    return p;
  }

  /* ---------- state ---------- */
  let rng = mulberry(1), rows = [], gems = [], gen = null;
  let mode = "attract", clock = 0, rtime = 0;
  let parts = [], rings = [], floats = [], air = [], call = null, banner = null, flash = { a: 0, c: WHITE };
  let skin = C.skins[0], bot = true, wScale = 1, feverGlow = 0, slowTint = 0, boostFx = 0, lastWorld = 0;
  const ball = { x: 0, tx: 0, y: L.ballR, z: 0, vy: 0, row: 0, hop: null, sq: 0, sqV: 0, rot: 0, look: 0, blink: 0, mood: "idle", moodT: 0, deadT: 0, gone: false, spin: 0 };
  let trail = [];
  let run = null;
  const keys = { l: false, r: false };
  const on = {};   // UI hooks: start, land, gem, fever, feverEnd, stage, power, boost, save, dead

  const newRun = () => ({ score: 0, perfects: 0, greats: 0, goods: 0, streak: 0, bestStreak: 0, gems: 0, stage: 0, fevers: 0, boosts: 0, powers: 0, hops: 0,
    revived: false, fever: 0, feverLeft: 0, shield: 0, magnet: 0, slow: 0 });

  /* ---------- level generator ---------- */
  const stageOf = i => Math.floor(i / C.stageHops);
  function resetWorld(seed) {
    rng = mulberry(seed >>> 0); rows = []; gems = []; parts = []; rings = []; floats = []; trail = [];
    gen = { x: 0, pat: "straight", left: 6, dir: 1, amp: 1, ph: 0, step: 0.7, lastSpecial: 0, skipNext: false, boostFrom: null, calm: 0 };
    for (let i = 0; i < 18; i++) rows.push(genRow(i));
  }
  function ensureRows(upTo) { while (rows.length <= upTo) rows.push(genRow(rows.length)); }
  function mkTile(x, w, kind) { return { x, baseX: x, w, d: L.depthTile, kind, amp: 0, freq: 0, ph: 0, power: null, flash: 0, sink: 0, sinkV: 0, judged: null }; }
  function pickPattern(st, dmax) {
    const r = rng();
    gen.left = 5 + Math.floor(rng() * 6);
    if (r < 0.18) gen.pat = "straight";
    else if (r < 0.42) { gen.pat = "zigzag"; gen.amp = Math.min(L.half, dmax * (0.38 + rng() * 0.12)); }
    else if (r < 0.64) { gen.pat = "wave"; gen.amp = L.half * (0.55 + rng() * 0.45); gen.step = Math.min(1.1, dmax / gen.amp) * (0.55 + rng() * 0.3); gen.ph = Math.asin(clamp(gen.x / gen.amp, -1, 1)); }
    else if (r < 0.8) { gen.pat = "stairs"; gen.amp = Math.min(dmax * 0.8, 0.6 + rng() * 0.6); gen.dir = rng() < 0.5 ? -1 : 1; }
    else gen.pat = "random";
  }
  function genRow(i) {
    const st = stageOf(i), row = { i, z: i * GAP, tiles: [], world: st % WORLDS.length, skip: false, gate: i > 0 && i % C.stageHops === 0, passed: false };
    if (i === 0) { row.tiles.push(mkTile(0, 2.8, "start")); return row; }
    if (gen.skipNext) { gen.skipNext = false; row.skip = true; return row; }
    const inStage = (i % C.stageHops) / C.stageHops;
    let dmax = Math.min(2.7, 1.2 + st * 0.32 + inStage * 0.3);
    if (i < 8) dmax = Math.min(dmax, 0.9);
    if (gen.calm > 0) { gen.calm--; dmax = Math.min(dmax, 0.7); }
    if (gen.left <= 0) pickPattern(st, dmax);
    gen.left--;
    let x;
    switch (gen.pat) {
      case "straight": x = gen.x; break;
      case "zigzag": gen.dir *= -1; x = gen.dir * gen.amp; break;
      case "wave": gen.ph += gen.step; x = Math.sin(gen.ph) * gen.amp; break;
      case "stairs": x = gen.x + gen.dir * gen.amp; if (Math.abs(x) > L.half) { gen.dir *= -1; x = gen.x + gen.dir * gen.amp; } break;
      default: x = gen.x + (rng() * 2 - 1) * dmax;
    }
    x = clamp(clamp(x, gen.x - dmax, gen.x + dmax), -L.half, L.half);
    const prevX = gen.x;
    let tile = mkTile(x, L.tile, "normal");
    const sp = C.specials, canSpecial = i >= 7 && i - gen.lastSpecial >= 2 && !row.gate && (i + 1) % C.stageHops !== 0;
    const roll = k => st >= sp[k].from && rng() < sp[k].chance;
    if (canSpecial && roll("power")) {
      tile.power = ["shield", "magnet", "slow"][Math.floor(rng() * 3)]; gen.lastSpecial = i;
    } else if (canSpecial && roll("boost")) {
      tile.kind = "boost"; gen.skipNext = true; gen.boostFrom = { i, x }; gen.lastSpecial = i;
    } else if (canSpecial && roll("twin")) {
      const c = clamp(x, -L.half + 1.25, L.half - 1.25);
      const a = mkTile(c - 1.25, L.tile * 0.92, "normal"), b = mkTile(c + 1.25, L.tile * 0.92, "normal");
      row.tiles.push(a, b);
      const g = rng() < 0.5 ? a : b;
      for (let k = 0; k < 3; k++) gems.push({ x: g.x, y: 1.0 + k * 0.55, z: row.z, taken: false, spin: rng() * 6 });
      gen.x = c; gen.calm = 1; gen.lastSpecial = i;
      return row;
    } else if (canSpecial && roll("slide")) {
      const amp = 0.45 + rng() * 0.75 * Math.min(1, 0.4 + st / 3);
      tile.kind = "slide"; tile.amp = amp; tile.baseX = clamp(x, -L.half + amp, L.half - amp); tile.x = tile.baseX;
      tile.freq = 1.3 + rng() * 1.1; tile.ph = rng() * 6.28; x = tile.baseX; gen.lastSpecial = i;
    } else if (canSpecial && roll("small")) {
      tile.kind = "small"; tile.w = L.small; gen.lastSpecial = i;
    }
    row.tiles.push(tile);
    // gems: on top of the tile, in the air between tiles, or along a boost arc
    if (gen.boostFrom && gen.boostFrom.i === i - 2) {
      const f = gen.boostFrom;
      for (let k = 1; k <= 5; k++) { const t = k / 6; gems.push({ x: lerp(f.x, x, t), y: L.ballR + S.boostHeight * 4 * t * (1 - t), z: lerp(f.i * GAP, row.z, t), taken: false, spin: rng() * 6 }); }
      gen.boostFrom = null;
    } else if (!tile.power && tile.kind !== "boost" && rng() < C.gemChance) {
      gems.push({ x: tile.x, y: 1.05, z: row.z, taken: false, spin: rng() * 6, onTile: tile });
    } else if (i > 3 && !rows[i - 1]?.skip && rng() < 0.16) {
      gems.push({ x: (prevX + x) / 2, y: L.ballR + S.hopHeight * 0.92, z: row.z - GAP / 2, taken: false, spin: rng() * 6 });
    }
    gen.x = x;
    return row;
  }
  const tileX = t => t.kind === "slide" ? t.baseX + t.amp * Math.sin(clock * t.freq + t.ph) : t.x;
  const tileW = t => t.w * (t.kind === "start" ? 1 : wScale);

  /* ---------- run control ---------- */
  function hopDur() {
    const d = Math.max(S.hopMin, S.hopStart - S.perStage * (ball.row / C.stageHops));
    return d;
  }
  function placeOn(r, x) {
    ball.row = r; ball.x = ball.tx = x; ball.z = rows[r].z; ball.y = L.ballR; ball.vy = 0; ball.hop = null; ball.gone = false; ball.deadT = 0; ball.mood = "idle";
    cam.x = x * 0.4; cam.z = ball.z - CAM_BACK; trail = [];
  }
  function startHop() {
    const from = rows[ball.row], landed = from.tiles.find(t => t.judged) || from.tiles[0];
    const boost = landed && landed.kind === "boost" && ball.row > 0;
    const to = ball.row + (boost ? 2 : 1);
    ensureRows(to + 16);
    const d = hopDur();
    const hScale = Math.sqrt(d / S.hopStart);
    ball.hop = { r0: ball.row, r1: to, z0: from.z, z1: rows[to].z, t: 0, dur: boost ? d * 1.75 : d, h: boost ? S.boostHeight : S.hopHeight * hScale, boost };
    if (boost) { ball.spin = 1; boostFx = 1; }
  }
  function attract(seed) {
    mode = "attract"; bot = true; run = newRun(); wScale = 1;
    resetWorld(seed ?? (Math.random() * 1e9)); placeOn(0, 0); lastWorld = 0; Sound.setWorld(0);
    startHop();
  }
  function prepare(seed) {
    mode = "ready"; bot = false; run = newRun(); wScale = 1; call = null; banner = null;
    resetWorld(seed ?? (Math.random() * 1e9)); placeOn(0, 0); lastWorld = 0; Sound.setWorld(0);
  }
  function begin() {
    if (mode !== "ready") return;
    mode = "play"; Sound.unlock();
    if (banner && banner.kind === "info") banner = null;
    ball.row = ball.row || 0;
    rows[ball.row].tiles.forEach(t => t.judged = t.judged || "start");
    startHop(); on.start && on.start();
  }
  function revive() {
    const r = ball.hop ? ball.hop.r1 : ball.row, row = rows[r];
    const t = row.tiles[0];
    placeOn(r, tileX(t)); t.judged = "revive";
    run.revived = true; run.shield = Math.max(run.shield, 1);
    mode = "ready";
    banner = { text: "DRAG TO GO ON", sub: "shield on · one free save", t: 0, kind: "info" };
  }

  /* ---------- landing ---------- */
  function land() {
    const hp = ball.hop, row = rows[hp.r1];
    ball.row = hp.r1; ball.z = row.z; ball.y = L.ballR; ball.hop = null;
    let best = null, rel = 9;
    for (const t of row.tiles) {
      const r = Math.abs(ball.x - tileX(t)) / (tileW(t) / 2 + L.ballR * 0.35);
      if (r < rel) { rel = r; best = t; }
    }
    const isBot = mode === "attract";
    if (!best || rel > 1) {
      if (isBot && best) rel = 0.1;
      else if (best && run.shield > 0 && rel < 2.2) {   // shield: catch the orb and slide it onto the tile
        run.shield--; rel = 0.95; ball.x = ball.tx = tileX(best);
        burst(ball.x, 0.6, ball.z, [180, 240, 255], 26, 5, "dot");
        banner = { text: "SHIELD SAVE", sub: "", t: 0, kind: "save" }; Sound.play("shield"); on.save && on.save();
      } else return die(best);
    }
    const tx = tileX(best);
    const judge = rel <= C.judge.perfect ? "perfect" : rel <= C.judge.great ? "great" : "good";
    best.judged = judge; best.flash = 1; best.sinkV = -2.6;
    ball.sq = 1; ball.sqV = 0;
    if (judge === "perfect") { run.streak++; run.perfects++; run.fever += 1; ball.mood = "happy"; ball.moodT = 0.5; }
    else if (judge === "great") { run.streak = 0; run.greats++; run.fever += 0.4; }
    else { run.streak = 0; run.goods++; run.fever = Math.max(0, run.fever - 2); }
    run.bestStreak = Math.max(run.bestStreak, run.streak);
    run.hops++;
    const mult = Math.min(4, 1 + Math.floor(run.streak / 5)) * (run.feverLeft > 0 ? C.fever.scoreMult : 1);
    const pts = C.points[judge] * mult;
    run.score += pts;
    // effects
    const col = run.feverLeft > 0 ? hslC(clock * 200) : judge === "perfect" ? [255, 120, 230] : judge === "great" ? [110, 240, 255] : [230, 235, 255];
    rings.push({ x: tx, z: row.z, w: tileW(best), d: best.d, t: 0, max: judge === "perfect" ? 0.7 : 0.5, c: col, big: judge === "perfect" });
    if (judge === "perfect") {
      burst(ball.x, 0.15, ball.z, col, 18 + Math.min(20, run.streak), 7, "spark");
      cam.shake = Math.max(cam.shake, 0.25);
      if (navigator.vibrate) try { navigator.vibrate(8); } catch (e) {}
    } else burst(ball.x, 0.1, ball.z, col, 8, 3.5, "dot");
    floats.push({ x: tx + tileW(best) / 2 + 0.35, y: 0.7, z: row.z, text: "+" + pts, t: 0, c: col });
    if (!isBot) {
      const close = judge === "good" && rel > 0.82;
      call = { text: close ? "CLOSE!" : judge.toUpperCase(), sub: judge === "perfect" && run.streak > 1 ? "x" + run.streak : "", t: 0, kind: close ? "close" : judge };
      Sound.play(close ? "close" : "land", judge, run.streak);
    }
    // power-up on this tile
    if (best.power) {
      const p = best.power; best.power = null; run.powers++;
      if (p === "shield") run.shield = Math.min(2, run.shield + C.power.shield);
      if (p === "magnet") run.magnet = C.power.magnetHops;
      if (p === "slow") run.slow = C.power.slowHops;
      burst(tx, 1, row.z, [255, 255, 255], 24, 5, "dot");
      if (!isBot) { banner = { text: p === "shield" ? "SHIELD" : p === "magnet" ? "GEM MAGNET" : "SLOW-MO", sub: "", t: 0, kind: "power" }; Sound.play("power"); on.power && on.power(p); }
    }
    if (best.kind === "boost") {
      run.boosts++;
      if (!isBot) { banner = { text: "BOOST!", sub: "", t: 0, kind: "boost" }; Sound.play("boost"); on.boost && on.boost(); }
    }
    // timers counted in hops
    if (run.magnet > 0) run.magnet--;
    if (run.slow > 0) run.slow--;
    if (run.feverLeft > 0) {
      run.feverLeft--; run.gems++; on.gem && !isBot && on.gem(run.gems, 1);
      if (run.feverLeft === 0) { run.fever = 0; on.feverEnd && !isBot && on.feverEnd(); }
    } else if (run.fever >= C.fever.need) {
      run.feverLeft = C.fever.hops; run.fevers++; run.fever = C.fever.need;
      flash = { a: 0.55, c: [255, 255, 255] }; cam.shake = 0.6;
      burst(ball.x, 0.5, ball.z, null, 50, 9, "spark");
      if (!isBot) { banner = { text: "FEVER!", sub: "x2 score · wide tiles · gem every hop", t: 0, kind: "fever" }; Sound.play("fever"); on.fever && on.fever(); }
    }
    on.land && !isBot && on.land({ judge, pts, mult, streak: run.streak, score: run.score });
    startHop();
  }
  function die(tile) {
    mode = "dying"; ball.mood = "dead"; ball.vy = 2; ball.deadT = 0;
    run.streak = 0;
    Sound.play("fall");
    if (navigator.vibrate) try { navigator.vibrate(40); } catch (e) {}
    cam.shake = 0.5;
  }

  /* ---------- effects ---------- */
  function burst(x, y, z, c, n, sp, kind) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, u = Math.random() * 0.9 + 0.1, v = sp * (0.5 + Math.random() * 0.7);
      parts.push({ x, y, z, vx: Math.cos(a) * v * u, vy: (0.6 + Math.random()) * v * 0.8, vz: Math.sin(a) * v * u, life: 0, max: 0.5 + Math.random() * 0.5,
        c: c || hslC(Math.random() * 360), size: 0.06 + Math.random() * 0.08, kind });
    }
  }
  function spawnAir(w, fresh) {
    const k = WORLDS[w].air;
    const p = { k, w, x: Math.random(), y: fresh ? Math.random() : (k === "embers" || k === "bubbles" ? 1.05 : -0.05), s: 0.5 + Math.random(), ph: Math.random() * 6.28, v: 0.3 + Math.random() * 0.7 };
    if (k === "stars") p.y = Math.random() * 0.32;
    return p;
  }

  /* ---------- update ---------- */
  function update(dtReal) {
    rtime += dtReal;
    const slowF = run && run.slow > 0 ? C.power.slowFactor : 1;
    const dt = (mode === "paused" || mode === "over") ? 0 : dtReal / slowF;
    if (mode === "paused") return;
    clock += dt;

    // steering
    if ((mode === "attract" || (bot && mode === "play")) && ball.hop) {
      const row = rows[ball.hop.r1], tLeft = (1 - ball.hop.t) * ball.hop.dur;
      let tgt = ball.x;
      if (row && row.tiles.length) {
        const pick = row.tiles.reduce((a, b) => gems.some(g => !g.taken && g.onTile === b) ? b : a, row.tiles[0]);
        tgt = pick.kind === "slide" ? pick.baseX + pick.amp * Math.sin((clock + tLeft) * pick.freq + pick.ph) : pick.x;
      }
      ball.tx += (tgt - ball.tx) * Math.min(1, dtReal * 9);
    }
    if (keys.l || keys.r) ball.tx += ((keys.r ? 1 : 0) - (keys.l ? 1 : 0)) * C.steer.keySpeed * dtReal;
    ball.tx = clamp(ball.tx, -L.half - 1.1, L.half + 1.1);
    const px = ball.x;
    if (mode !== "dying") ball.x += (ball.tx - ball.x) * Math.min(1, dtReal * 28);
    ball.look += (clamp((ball.x - px) / Math.max(dtReal, 1e-3) * 0.12, -1, 1) - ball.look) * Math.min(1, dtReal * 10);

    // hop
    if (ball.hop && (mode === "play" || mode === "attract")) {
      const hp = ball.hop;
      hp.t += dt / hp.dur;
      if (hp.t >= 1) { hp.t = 1; ball.z = hp.z1; land(); }
      else {
        const prevY = ball.y;
        ball.z = lerp(hp.z0, hp.z1, hp.t);
        ball.y = L.ballR + hp.h * 4 * hp.t * (1 - hp.t);
        ball.vy = (ball.y - prevY) / Math.max(dt, 1e-4);
        ball.rot += dt * (hp.boost ? 14 : 7);
      }
    } else if (mode === "ready") {
      ball.y = L.ballR + Math.abs(Math.sin(rtime * 3.2)) * 0.25; ball.rot += dtReal * 0.5;
    } else if (mode === "dying") {
      ball.deadT += dtReal;
      if (ball.hop) ball.z += GAP / ball.hop.dur * dtReal * 0.35;
      ball.vy -= 26 * dtReal; ball.y += ball.vy * dtReal; ball.rot += dtReal * 9;
      if (!ball.gone && ball.y < FLOOR + 0.1) {
        ball.gone = true;
        rings.push({ x: ball.x, z: ball.z, w: 1.2, d: 1.2, t: 0, max: 1.1, c: skinTrail(0), floor: true, big: true });
        burst(ball.x, FLOOR + 0.1, ball.z, skinTrail(0), 30, 5, "dot");
      }
      if (ball.deadT > 1.15) { mode = "over"; on.dead && on.dead(run); }
    }
    // squash spring
    ball.sqV += (-ball.sq * 260 - ball.sqV * 14) * dtReal; ball.sq += ball.sqV * dtReal;
    if (ball.spin > 0 && !(ball.hop && ball.hop.boost)) ball.spin = Math.max(0, ball.spin - dtReal * 3);
    ball.blink -= dtReal; if (ball.blink < -3 - Math.random() * 3) ball.blink = 0.12;
    if (ball.moodT > 0) { ball.moodT -= dtReal; if (ball.moodT <= 0 && ball.mood === "happy") ball.mood = "idle"; }

    // trail (world-space so it draws the arc)
    if (!ball.gone) { trail.push({ x: ball.x, y: ball.y, z: ball.z }); if (trail.length > 20) trail.shift(); }

    // camera
    const zt = ball.z - CAM_BACK;
    cam.z += (zt - cam.z) * Math.min(1, dtReal * (mode === "dying" ? 3 : 14));
    cam.x += (ball.x * 0.4 - cam.x) * Math.min(1, dtReal * 4);
    cam.shake = Math.max(0, cam.shake - dtReal * 1.6);
    cam.fov += ((ball.hop && ball.hop.boost ? 1.1 : run && run.feverLeft > 0 ? 1.03 : 1) - cam.fov) * Math.min(1, dtReal * 4);
    F = baseF * cam.fov;

    // tiles
    const fever = run && run.feverLeft > 0;
    wScale += ((fever ? 1.3 : 1) - wScale) * Math.min(1, dtReal * 6);
    feverGlow += ((fever ? 1 : 0) - feverGlow) * Math.min(1, dtReal * 3);
    slowTint += ((run && run.slow > 0 ? 1 : 0) - slowTint) * Math.min(1, dtReal * 3);
    boostFx = Math.max(0, boostFx - dtReal * (ball.hop && ball.hop.boost ? 0.3 : 2.5));
    const r0 = Math.max(0, ball.row - 3), r1 = Math.min(rows.length - 1, ball.row + 16);
    for (let i = r0; i <= r1; i++) for (const t of rows[i].tiles) {
      t.flash = Math.max(0, t.flash - dtReal * 2.4);
      t.sinkV += (-t.sink * 220 - t.sinkV * 12) * dtReal; t.sink += t.sinkV * dtReal;
    }
    // gate crossing → new world
    for (let i = r0; i <= r1; i++) {
      const row = rows[i];
      if (row.gate && !row.passed && ball.z >= row.z - GAP * 0.5) {
        row.passed = true;
        flash = { a: 0.3, c: WORLDS[row.world].glowC };
        Sound.setWorld(row.world);
        if (mode !== "attract") {
          run.stage = stageOf(i); Sound.play("gate");
          banner = { text: WORLDS[row.world].name.toUpperCase(), sub: "STAGE " + (run.stage + 1) + " · faster hops", t: 0, kind: "stage" };
          on.stage && on.stage(run.stage, WORLDS[row.world].name);
        }
      }
    }
    // gems
    const magnet = run && run.magnet > 0;
    for (const g of gems) {
      if (g.taken) { g.t = (g.t || 0) + dtReal; continue; }
      if (g.z < ball.z - 6 || g.z > ball.z + 40) continue;
      g.spin += dtReal * 3;
      if (mode !== "play" && mode !== "attract") continue;
      if (g.onTile) g.x = tileX(g.onTile);
      const dx = ball.x - g.x, dy = ball.y - g.y, dz = ball.z - g.z, d2 = dx * dx + dy * dy + dz * dz;
      if (magnet && d2 < 3.4 * 3.4 && g.z > ball.z - 0.5) { const k = Math.min(1, dtReal * 9); g.x += dx * k; g.y += dy * k; g.z += dz * k; g.onTile = null; }
      if (d2 < 0.8 * 0.8) {
        g.taken = true; g.t = 0;
        burst(g.x, g.y, g.z, [140, 250, 255], 10, 3, "dot");
        if (mode === "play") { run.gems++; run.score += C.points.gem; Sound.play("gem"); on.gem && on.gem(run.gems, 1); floats.push({ x: g.x, y: g.y + 0.3, z: g.z, text: "+1", t: 0, c: [150, 250, 255], gem: true }); }
      }
    }
    if (gems.length > 300) gems = gems.filter(g => g.z > ball.z - 10);
    // particles & effects
    for (const p of parts) { p.life += dtReal; p.vy -= 9 * dtReal; p.x += p.vx * dtReal; p.y += p.vy * dtReal; p.z += p.vz * dtReal; p.vx *= 0.98; p.vz *= 0.98; }
    parts = parts.filter(p => p.life < p.max);
    rings.forEach(r => r.t += dtReal); rings = rings.filter(r => r.t < r.max);
    floats.forEach(f => { f.t += dtReal; f.y += dtReal * 1.6; }); floats = floats.filter(f => f.t < 0.8);
    if (call) { call.t += dtReal; if (call.t > 0.75) call = null; }
    if (banner) { banner.t += dtReal; if (banner.t > (banner.kind === "info" ? 99 : 1.6)) banner = null; }
    flash.a = Math.max(0, flash.a - dtReal * 1.8);
    // ambient air
    const w = curWorld().a;
    while (air.length < 46) air.push(spawnAir(w, true));
    for (let i = 0; i < air.length; i++) {
      const p = air[i];
      switch (p.k) {
        case "stars": break;
        case "embers": p.y -= dtReal * 0.06 * p.v; p.x += Math.sin(rtime + p.ph) * dtReal * 0.02; break;
        case "bubbles": p.y -= dtReal * 0.08 * p.v; p.x += Math.sin(rtime * 2 + p.ph) * dtReal * 0.03; break;
        case "petals": p.y += dtReal * 0.05 * p.v; p.x += dtReal * 0.04 * p.v; p.ph += dtReal * 2; break;
        case "rain": p.y += dtReal * 0.9 * p.v; break;
      }
      if (p.y < -0.06 || p.y > 1.06 || p.x > 1.05 || (p.w !== w && Math.random() < dtReal * 0.8)) air[i] = spawnAir(w, p.w !== w);
    }
  }

  /* ---------- palette ---------- */
  function curWorld() {
    const span = C.stageHops * GAP, u = (ball.z + GAP * 0.5) / span, a = Math.floor(u), f = u - a;
    const t = smooth(0.965, 1.0, f);
    return { a: a % WORLDS.length, b: (a + 1) % WORLDS.length, t };
  }
  function palette() {
    const { a, b, t } = curWorld(), A = WORLDS[a], B = WORLDS[b];
    if (A.idx !== lastWorld && t === 0) lastWorld = A.idx;
    const p = {
      sky: A.skyC.map((c, i) => mixC(c, B.skyC[i], t)), floor: A.floorC.map((c, i) => mixC(c, B.floorC[i], t)),
      tile: mixC(A.tileC, B.tileC, t), glow: mixC(A.glowC, B.glowC, t), acc: mixC(A.accC, B.accC, t), sun: mixC(A.sunC, B.sunC, t), A, B, t
    };
    if (feverGlow > 0.01) { const h = hslC(rtime * 90, 0.9, 0.6); p.glow = mixC(p.glow, h, feverGlow * 0.6); }
    return p;
  }
  function skinTrail(i) { return skin.trail === "rainbow" ? hslC(rtime * 160 + i * 18) : hex(skin.trail); }

  /* ---------- drawing: background ---------- */
  function drawSky(P) {
    HY = CY - F * SP / CP;
    const g = ctx.createLinearGradient(0, 0, 0, HY);
    g.addColorStop(0, rgba(P.sky[0])); g.addColorStop(0.6, rgba(P.sky[1])); g.addColorStop(1, rgba(P.sky[2]));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, HY + 1);
    // celestial body, light shafts, aurora, sun stripes
    const sx = CX + W * 0.16 - cam.x * 6, sy = HY - H * 0.09, sr = Math.min(W, H) * 0.085;
    const halo = ctx.createRadialGradient(sx, sy, sr * 0.4, sx, sy, sr * 4.5);
    halo.addColorStop(0, rgba(P.sun, 0.55)); halo.addColorStop(1, rgba(P.sun, 0));
    ctx.fillStyle = halo; ctx.fillRect(0, 0, W, HY);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 6; i++) {   // soft light shafts
      const a = -Math.PI / 2 + (i - 2.5) * 0.32 + Math.sin(rtime * 0.2 + i) * 0.05;
      ctx.fillStyle = rgba(P.sun, 0.035);
      ctx.beginPath(); ctx.moveTo(sx, sy);
      ctx.lineTo(sx + Math.cos(a - 0.06) * H, sy + Math.sin(a - 0.06) * H); ctx.lineTo(sx + Math.cos(a + 0.06) * H, sy + Math.sin(a + 0.06) * H); ctx.fill();
    }
    ctx.restore();
    const drawSun = (w, al) => {
      if (al <= 0.01) return;
      ctx.save(); ctx.globalAlpha = al;
      if (w.prop === "pyramid") {   // banded sunset disc
        const sg = ctx.createLinearGradient(0, sy - sr, 0, sy + sr); sg.addColorStop(0, "#fff3a8"); sg.addColorStop(1, "#ff4f8b");
        ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(sx, sy, sr * 1.2, 0, 7); ctx.fill();
        ctx.fillStyle = rgba(P.sky[2]);
        for (let k = 0; k < 5; k++) { const yy = sy + sr * (0.1 + k * 0.24), hgt = sr * (0.05 + k * 0.035); ctx.fillRect(sx - sr * 1.3, yy, sr * 2.6, hgt); }
      } else {
        ctx.fillStyle = rgba(w.sunC); ctx.beginPath(); ctx.arc(sx, sy, sr * (w.prop === "tower" ? 1.05 : 0.8), 0, 7); ctx.fill();
        if (w.prop === "crystal" || w.prop === "tower") { ctx.fillStyle = rgba(P.sky[1], 0.22); ctx.beginPath(); ctx.arc(sx - sr * 0.25, sy - sr * 0.15, sr * 0.22, 0, 7); ctx.arc(sx + sr * 0.3, sy + sr * 0.25, sr * 0.14, 0, 7); ctx.fill(); }
      }
      if (w.prop === "crystal") drawAurora(P, al);
      if (w.prop === "coral") drawCaustics(al);
      ctx.restore();
    };
    drawSun(P.A, 1 - P.t); drawSun(P.B, P.t);
    // stars / static sky particles
    for (const p of air) if (p.k === "stars") {
      const tw = 0.5 + 0.5 * Math.sin(rtime * 2 * p.v + p.ph);
      ctx.fillStyle = `rgba(255,255,255,${0.25 + tw * 0.6})`; ctx.fillRect(p.x * W, p.y * H, 1.2 * p.s + 0.4, 1.2 * p.s + 0.4);
    }
    // two silhouette layers per world, cross-faded
    [[P.A, 1 - P.t], [P.B, P.t]].forEach(([w, al]) => { if (al > 0.01) drawSilhouette(w, P, al); });
    // horizon glow
    const hg = ctx.createLinearGradient(0, HY - H * 0.06, 0, HY + H * 0.02);
    hg.addColorStop(0, rgba(P.glow, 0)); hg.addColorStop(0.8, rgba(P.glow, 0.35)); hg.addColorStop(1, rgba(P.glow, 0));
    ctx.fillStyle = hg; ctx.fillRect(0, HY - H * 0.06, W, H * 0.08);
  }
  function drawAurora(P, al) {
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    for (let b = 0; b < 3; b++) {
      const base = HY * (0.25 + b * 0.14), c = b === 1 ? hex("#9b7bff") : hex("#3cf0c0");
      ctx.beginPath();
      for (let i = 0; i <= 40; i++) { const x = i / 40 * W, y = base + Math.sin(i * 0.35 + rtime * 0.6 + b * 2) * H * 0.025 + Math.sin(i * 0.11 - rtime * 0.3) * H * 0.03; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      for (let i = 40; i >= 0; i--) { const x = i / 40 * W, y = base + H * 0.07 + Math.sin(i * 0.3 + rtime * 0.5 + b) * H * 0.02; ctx.lineTo(x, y); }
      const g = ctx.createLinearGradient(0, base, 0, base + H * 0.09); g.addColorStop(0, rgba(c, 0)); g.addColorStop(0.4, rgba(c, 0.16 * al)); g.addColorStop(1, rgba(c, 0));
      ctx.fillStyle = g; ctx.fill();
    }
    ctx.restore();
  }
  function drawCaustics(al) {
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 7; i++) {
      const x = ((i * 0.17 + Math.sin(rtime * 0.3 + i) * 0.03) % 1) * W, w = W * (0.04 + 0.03 * Math.sin(i * 3 + rtime));
      const g = ctx.createLinearGradient(0, 0, 0, HY); g.addColorStop(0, `rgba(190,255,255,${0.12 * al})`); g.addColorStop(1, "rgba(190,255,255,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + w, 0); ctx.lineTo(x + w * 2.5 + W * 0.05, HY); ctx.lineTo(x + W * 0.05, HY); ctx.fill();
    }
    ctx.restore();
  }
  function drawSilhouette(w, P, al) {
    const off = -cam.x * 0.02;
    const layer = (pts, hMul, col, shift) => {
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, HY + 1);
      for (let i = 0; i <= 64; i++) {
        const x = (i / 64) * W * 1.2 - W * 0.1 + (off + shift) * W;
        let h = pts[i] * hMul;
        if (w.prop === "crystal") h *= 0.7 + (i % 2) * 0.5;                // jagged peaks
        if (w.prop === "pyramid" && i % 16 === 8) h *= 1.9;                  // a big pyramid every so often
        ctx.lineTo(x, HY - h * H);
      }
      ctx.lineTo(W, HY + 1); ctx.closePath(); ctx.fill();
    };
    ctx.save(); ctx.globalAlpha = al;
    if (w.prop === "tower") {
      for (const b of w.blocks) {
        const x = (b.x + off * 0.5) * W * 1.1 - W * 0.05, bw = b.w * W, bh = b.h * H * 0.14;
        ctx.fillStyle = rgba(mixC(P.sky[1], INK, 0.55)); ctx.fillRect(x, HY - bh, bw, bh);
        ctx.fillStyle = rgba(b.lit > 0.5 ? P.acc : P.glow, 0.5);
        for (let yy = HY - bh + 4; yy < HY - 3; yy += 6) for (let xx = x + 2; xx < x + bw - 2; xx += 5) if (hash(xx * 0.13 + yy) > 0.62) ctx.fillRect(xx, yy, 2, 2);
      }
    } else if (w.prop === "cloud") {
      ctx.fillStyle = "rgba(255,240,250,0.5)";
      for (let i = 0; i < 12; i++) { const x = ((i / 12 + off * 0.3) % 1.1) * W, r = H * (0.04 + hash(i) * 0.05); ctx.beginPath(); ctx.arc(x, HY - r * 0.4, r, 0, 7); ctx.fill(); }
      layer(w.near, 0.05, "rgba(255,225,245,0.55)", 0);
    } else {
      layer(w.far, w.prop === "pyramid" ? 0.06 : 0.11, rgba(mixC(P.sky[2], P.sky[1], 0.55), 0.85), 0.02);
      layer(w.near, w.prop === "pyramid" ? 0.04 : 0.065, rgba(mixC(P.sky[1], INK, 0.5)), 0);
    }
    ctx.restore();
  }
  function drawFloor(P) {
    const g = ctx.createLinearGradient(0, HY, 0, H);
    g.addColorStop(0, rgba(mixC(P.floor[0], P.glow, 0.25))); g.addColorStop(0.15, rgba(P.floor[0])); g.addColorStop(1, rgba(P.floor[1]));
    ctx.fillStyle = g; ctx.fillRect(0, HY, W, H - HY);
    // perspective grid on the lake: scrolls with the camera for a strong sense of speed
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.lineWidth = 1;
    const step = 3, z0 = Math.ceil((cam.z + 1.5) / step) * step;
    for (let z = z0; z < cam.z + 110; z += step) {
      const a = proj(-60, FLOOR, z), b = proj(60, FLOOR, z); if (!a || !b) continue;
      const al = 0.16 * (1 - (z - cam.z) / 110);
      ctx.strokeStyle = rgba(P.glow, al); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    for (let k = -12; k <= 12; k++) {
      const x = k * step + Math.round(cam.x / step) * step;
      const a = proj(x, FLOOR, cam.z + 1.5), b = proj(x, FLOOR, cam.z + 110); if (!a || !b) continue;
      const gr = ctx.createLinearGradient(a.x, a.y, b.x, b.y); gr.addColorStop(0, rgba(P.glow, 0.13)); gr.addColorStop(1, rgba(P.glow, 0));
      ctx.strokeStyle = gr; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    ctx.restore();
  }

  /* ---------- drawing: world objects ---------- */
  function propsList(list) {
    const k0 = Math.floor((cam.z) / 7), k1 = k0 + 16;
    for (let k = k0; k <= k1; k++) for (const side of [-1, 1]) {
      const h1 = hash(k * 2 + (side > 0 ? 1 : 0)), h2 = hash(k * 7.3 + side * 3.1);
      if (h2 < 0.15) continue;
      const z = k * 7 + h2 * 3, x = side * (4.3 + h1 * 3.6);
      const p = proj(x, FLOOR, z); if (!p) continue;
      const wi = Math.max(0, stageOf(Math.round(z / GAP))) % WORLDS.length;
      list.push({ d: p.d, draw: () => drawProp(WORLDS[wi], x, z, h1, h2, side) });
    }
  }
  function drawProp(w, x, z, h1, h2, side) {
    const b = proj(x, FLOOR, z); if (!b) return;
    const s = b.s, glow = w.glowC, acc = w.accC, fog = clamp((b.d - 12) / 90, 0, 1);
    ctx.save();
    ctx.globalAlpha = 1 - fog * 0.85;
    if (w.prop === "crystal") {
      for (let c = 0; c < 3; c++) {
        const ox = (c - 1) * 0.55 * (0.7 + h1), hh = (2.2 + h2 * 3.5) * (c === 1 ? 1 : 0.6), ww = 0.55 * (c === 1 ? 1 : 0.7);
        const p0 = proj(x + ox, FLOOR, z), p1 = proj(x + ox, FLOOR + hh, z); if (!p0 || !p1) continue;
        const half = ww * s / 1;
        ctx.beginPath(); ctx.moveTo(p0.x - half, p0.y); ctx.lineTo(p0.x - half, lerp(p0.y, p1.y, 0.75)); ctx.lineTo(p1.x, p1.y); ctx.lineTo(p0.x + half, lerp(p0.y, p1.y, 0.75)); ctx.lineTo(p0.x + half, p0.y); ctx.closePath();
        const g = ctx.createLinearGradient(p0.x - half, 0, p0.x + half, 0); g.addColorStop(0, rgba(mixC(glow, WHITE, 0.4), 0.85)); g.addColorStop(0.5, rgba(glow, 0.55)); g.addColorStop(0.51, rgba(mixC(acc, INK, 0.3), 0.6)); g.addColorStop(1, rgba(mixC(acc, INK, 0.5), 0.75));
        ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = rgba(mixC(glow, WHITE, 0.5), 0.8); ctx.lineWidth = Math.max(1, s * 0.03); ctx.stroke();
      }
    } else if (w.prop === "pyramid") {
      const hh = 2 + h2 * 4, ww = 1.6 + h1 * 1.6;
      const p0 = proj(x - ww, FLOOR, z), p1 = proj(x + ww, FLOOR, z), pt = proj(x + side * -0.2, FLOOR + hh, z), pm = proj(x - side * ww * 0.25, FLOOR, z - ww * 0.6);
      if (p0 && p1 && pt && pm) {
        ctx.fillStyle = rgba(mixC(w.tileC, WHITE, 0.15)); ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(pt.x, pt.y); ctx.lineTo(pm.x, pm.y); ctx.closePath(); ctx.fill();
        ctx.fillStyle = rgba(mixC(acc, INK, 0.45)); ctx.beginPath(); ctx.moveTo(pm.x, pm.y); ctx.lineTo(pt.x, pt.y); ctx.lineTo(p1.x, p1.y); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = rgba(glow, 0.9); ctx.lineWidth = Math.max(1, s * 0.035); ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(pt.x, pt.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
      }
    } else if (w.prop === "coral") {
      ctx.lineCap = "round"; ctx.strokeStyle = rgba(mixC(w.tileC, WHITE, 0.1), 0.9); ctx.fillStyle = rgba(acc, 0.9);
      const branch = (bx, by, ang, len, depth) => {
        const ex = bx + Math.cos(ang) * len, ey = by - Math.sin(ang) * len;
        ctx.lineWidth = Math.max(1, s * 0.09 * depth / 3); ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ex, ey); ctx.stroke();
        if (depth > 1) { branch(ex, ey, ang + 0.45 + Math.sin(rtime + h1 * 9) * 0.06, len * 0.7, depth - 1); branch(ex, ey, ang - 0.4, len * 0.68, depth - 1); }
        else { ctx.beginPath(); ctx.arc(ex, ey, Math.max(1.2, s * 0.07), 0, 7); ctx.fill(); }
      };
      branch(b.x, b.y, Math.PI / 2 + (h1 - 0.5) * 0.3, s * (0.9 + h2 * 0.9), 4);
    } else if (w.prop === "cloud") {
      const yy = FLOOR + 1 + h2 * 3, c = proj(x, yy + Math.sin(rtime * 0.8 + h1 * 6) * 0.2, z); if (c) {
        ctx.fillStyle = "rgba(255,246,252,0.92)";
        [[0, 0, 1], [-0.8, 0.2, 0.7], [0.8, 0.25, 0.75], [0.35, -0.45, 0.65]].forEach(([dx, dy, r]) => { ctx.beginPath(); ctx.arc(c.x + dx * c.s * (0.9 + h1 * 0.5), c.y + dy * c.s, r * c.s * (0.8 + h1 * 0.5), 0, 7); ctx.fill(); });
        ctx.fillStyle = rgba(acc, 0.35); ctx.beginPath(); ctx.ellipse(c.x, c.y + c.s * 0.45, c.s * 1.2, c.s * 0.25, 0, 0, 7); ctx.fill();
      }
    } else if (w.prop === "tower") {
      const hh = 3 + h2 * 7, ww = 0.9 + h1 * 0.9;
      const p0 = proj(x - ww / 2, FLOOR, z), p1 = proj(x + ww / 2, FLOOR + hh, z); if (p0 && p1) {
        ctx.fillStyle = rgba(mixC(w.floorC[0], INK, 0.2)); ctx.fillRect(p0.x, p1.y, p1.x - p0.x, p0.y - p1.y);
        ctx.strokeStyle = rgba(side < 0 ? glow : acc, 0.95); ctx.lineWidth = Math.max(1, s * 0.04); ctx.strokeRect(p0.x, p1.y, p1.x - p0.x, p0.y - p1.y);
        const cell = Math.max(3, s * 0.3);
        for (let yy = p1.y + cell * 0.6; yy < p0.y - cell; yy += cell) for (let xx = p0.x + cell * 0.4; xx < p1.x - cell * 0.5; xx += cell * 0.9)
          if (hash(xx * 0.01 + yy * 0.031 + h1 * 9) > 0.55) { ctx.fillStyle = rgba(hash(yy + h2) > 0.5 ? acc : glow, 0.75); ctx.fillRect(xx, yy, cell * 0.4, cell * 0.45); }
      }
    }
    ctx.restore();
  }
  function tileColors(row, P) {
    if (feverGlow > 0.05) { const h = hslC(rtime * 120 + row.i * 28, 0.95, 0.66); return { top: mixC(WORLDS[row.world].tileC, h, feverGlow), glow: mixC(WORLDS[row.world].glowC, h, feverGlow) }; }
    return { top: WORLDS[row.world].tileC, glow: WORLDS[row.world].glowC };
  }
  function drawTileReflection(row, t, P) {
    const x = tileX(t), w = tileW(t) / 2, d = t.d / 2, y = 2 * FLOOR - (-t.sink) ;
    const { glow } = tileColors(row, P);
    if (!poly([[x - w, y, row.z - d], [x + w, y, row.z - d], [x + w, y, row.z + d], [x - w, y, row.z + d]])) return;
    ctx.fillStyle = rgba(glow, 0.12 + t.flash * 0.25); ctx.fill();
  }
  function drawTile(row, t, P, isNext) {
    const x = tileX(t), w = tileW(t) / 2, d = t.d / 2, y = -t.sink, z = row.z;
    const { top, glow } = tileColors(row, P);
    const nl = proj(x - w, y, z - d), nr = proj(x + w, y, z - d), fr = proj(x + w, y, z + d), fl = proj(x - w, y, z + d);
    const bl = proj(x - w, y - THICK, z - d), br = proj(x + w, y - THICK, z - d);
    if (!nl || !nr || !fr || !fl || !bl || !br) return;
    const s = proj(x, y, z).s, fog = clamp((s ? (F / s) : 0) / 80, 0, 1);
    const topC = mixC(top, WHITE, t.flash * 0.7), dark = mixC(top, INK, 0.55);
    ctx.save();
    ctx.globalAlpha = 1 - fog * 0.6;
    // side face toward the camera
    if (x - w > cam.x) { const blf = proj(x - w, y - THICK, z + d); if (blf) { ctx.fillStyle = rgba(mixC(dark, INK, 0.3)); ctx.beginPath(); ctx.moveTo(nl.x, nl.y); ctx.lineTo(fl.x, fl.y); ctx.lineTo(blf.x, blf.y); ctx.lineTo(bl.x, bl.y); ctx.fill(); } }
    else if (x + w < cam.x) { const brf = proj(x + w, y - THICK, z + d); if (brf) { ctx.fillStyle = rgba(mixC(dark, INK, 0.3)); ctx.beginPath(); ctx.moveTo(nr.x, nr.y); ctx.lineTo(fr.x, fr.y); ctx.lineTo(brf.x, brf.y); ctx.lineTo(br.x, br.y); ctx.fill(); } }
    // front face
    const fg = ctx.createLinearGradient(0, nl.y, 0, bl.y); fg.addColorStop(0, rgba(mixC(top, INK, 0.25))); fg.addColorStop(1, rgba(dark));
    ctx.fillStyle = fg; ctx.beginPath(); ctx.moveTo(nl.x, nl.y); ctx.lineTo(nr.x, nr.y); ctx.lineTo(br.x, br.y); ctx.lineTo(bl.x, bl.y); ctx.fill();
    // glass top
    const tg = ctx.createLinearGradient(0, fl.y, 0, nl.y); tg.addColorStop(0, rgba(mixC(topC, WHITE, 0.35), 0.95)); tg.addColorStop(1, rgba(topC, 0.82));
    ctx.fillStyle = tg; ctx.beginPath(); ctx.moveTo(nl.x, nl.y); ctx.lineTo(nr.x, nr.y); ctx.lineTo(fr.x, fr.y); ctx.lineTo(fl.x, fl.y); ctx.closePath(); ctx.fill();
    // diagonal shine band
    ctx.save(); ctx.clip();
    const sh = (clock * 0.35 + row.i * 0.37) % 1.6 - 0.3;
    ctx.fillStyle = "rgba(255,255,255,0.22)"; ctx.beginPath();
    const A = (u, v) => [lerp(lerp(nl.x, nr.x, u), lerp(fl.x, fr.x, u), v), lerp(lerp(nl.y, nr.y, u), lerp(fl.y, fr.y, u), v)];
    const q = [A(sh, 0), A(sh + 0.18, 0), A(sh + 0.48, 1), A(sh + 0.3, 1)]; ctx.moveTo(...q[0]); q.slice(1).forEach(p => ctx.lineTo(...p)); ctx.fill();
    ctx.restore();
    // inset frame
    const ins = 0.16;
    const I = (u, v) => A(u, v);
    ctx.strokeStyle = rgba(mixC(topC, WHITE, 0.6), 0.85); ctx.lineWidth = Math.max(1, s * 0.035);
    ctx.beginPath(); ctx.moveTo(...I(ins, ins)); ctx.lineTo(...I(1 - ins, ins)); ctx.lineTo(...I(1 - ins, 1 - ins)); ctx.lineTo(...I(ins, 1 - ins)); ctx.closePath(); ctx.stroke();
    // neon rim (three strokes = a cheap glow)
    ctx.globalCompositeOperation = "lighter";
    [[0.12, 7], [0.25, 3.5], [0.9, 1.2]].forEach(([al, lw]) => {
      ctx.strokeStyle = rgba(al > 0.5 ? mixC(glow, WHITE, 0.6) : glow, al * (1 + t.flash)); ctx.lineWidth = Math.max(1, s * 0.03 * lw);
      ctx.beginPath(); ctx.moveTo(nl.x, nl.y); ctx.lineTo(nr.x, nr.y); ctx.lineTo(fr.x, fr.y); ctx.lineTo(fl.x, fl.y); ctx.closePath(); ctx.stroke();
    });
    ctx.globalCompositeOperation = "source-over";
    // markings
    if (t.kind === "boost") {
      for (let k = 0; k < 3; k++) {
        const v = ((k / 3 + clock * 1.6) % 1);
        ctx.strokeStyle = `rgba(255,${150 + k * 30},60,${0.9 - v * 0.6})`; ctx.lineWidth = Math.max(2, s * 0.09); ctx.lineJoin = "round";
        ctx.beginPath(); ctx.moveTo(...I(0.25, 0.2 + v * 0.55)); ctx.lineTo(...I(0.5, 0.42 + v * 0.55)); ctx.lineTo(...I(0.75, 0.2 + v * 0.55)); ctx.stroke();
      }
    } else if (t.kind === "slide") {
      ctx.fillStyle = rgba(INK, 0.35);
      [[0.1, -1], [0.9, 1]].forEach(([u, dir]) => { ctx.beginPath(); ctx.moveTo(...I(u + dir * 0.06, 0.5)); ctx.lineTo(...I(u - dir * 0.04, 0.35)); ctx.lineTo(...I(u - dir * 0.04, 0.65)); ctx.fill(); });
    } else if (t.kind === "start") {
      ctx.fillStyle = rgba(INK, 0.18);
      for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(...I(0.35, 0.3 + k * 0.17)); ctx.lineTo(...I(0.5, 0.4 + k * 0.17)); ctx.lineTo(...I(0.65, 0.3 + k * 0.17)); ctx.lineTo(...I(0.65, 0.36 + k * 0.17)); ctx.lineTo(...I(0.5, 0.46 + k * 0.17)); ctx.lineTo(...I(0.35, 0.36 + k * 0.17)); ctx.fill(); }
    }
    if (isNext && !t.judged) {   // landing target: a pulsing diamond in the middle
      const pu = 0.5 + 0.5 * Math.sin(rtime * 8), r = 0.1 + pu * 0.03;
      ctx.fillStyle = `rgba(255,255,255,${0.55 + pu * 0.35})`;
      ctx.beginPath(); ctx.moveTo(...I(0.5, 0.5 - r * 2)); ctx.lineTo(...I(0.5 + r, 0.5)); ctx.lineTo(...I(0.5, 0.5 + r * 2)); ctx.lineTo(...I(0.5 - r, 0.5)); ctx.fill();
    }
    ctx.restore();
    if (t.power) drawPowerOrb(t.power, x, z);
  }
  function drawPowerOrb(kind, x, z) {
    const c = proj(x, 1.05 + Math.sin(rtime * 3) * 0.12, z); if (!c) return;
    const r = 0.36 * c.s, col = kind === "shield" ? [120, 220, 255] : kind === "magnet" ? [255, 90, 120] : [180, 140, 255];
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, r * 2.6); g.addColorStop(0, rgba(col, 0.6)); g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c.x, c.y, r * 2.6, 0, 7); ctx.fill(); ctx.restore();
    ctx.fillStyle = rgba(mixC(col, WHITE, 0.3)); ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, 7); ctx.fill();
    ctx.strokeStyle = "#fff"; ctx.lineWidth = Math.max(1.5, r * 0.16); ctx.lineCap = "round";
    ctx.beginPath();
    if (kind === "shield") { ctx.moveTo(c.x, c.y - r * 0.55); ctx.quadraticCurveTo(c.x + r * 0.55, c.y - r * 0.45, c.x + r * 0.45, c.y); ctx.quadraticCurveTo(c.x + r * 0.3, c.y + r * 0.45, c.x, c.y + r * 0.6); ctx.quadraticCurveTo(c.x - r * 0.3, c.y + r * 0.45, c.x - r * 0.45, c.y); ctx.quadraticCurveTo(c.x - r * 0.55, c.y - r * 0.45, c.x, c.y - r * 0.55); }
    else if (kind === "magnet") { ctx.arc(c.x, c.y, r * 0.42, Math.PI, 0, true); ctx.moveTo(c.x - r * 0.42, c.y); ctx.lineTo(c.x - r * 0.42, c.y - r * 0.4); ctx.moveTo(c.x + r * 0.42, c.y); ctx.lineTo(c.x + r * 0.42, c.y - r * 0.4); }
    else { ctx.arc(c.x, c.y, r * 0.5, 0, 7); ctx.moveTo(c.x, c.y); ctx.lineTo(c.x, c.y - r * 0.35); ctx.moveTo(c.x, c.y); ctx.lineTo(c.x + r * 0.25, c.y + r * 0.1); }
    ctx.stroke();
  }
  function drawGem(g) {
    const yy = g.y + (g.onTile ? Math.sin(rtime * 3 + g.spin) * 0.1 : 0);
    const c = proj(g.x, yy, g.z); if (!c) return;
    const r = 0.27 * c.s, k = Math.abs(Math.cos(g.spin)) * 0.75 + 0.25, hue = (g.spin * 30 + rtime * 40) % 360;
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    const gl = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, r * 2.4); gl.addColorStop(0, "rgba(160,250,255,0.55)"); gl.addColorStop(1, "rgba(160,250,255,0)");
    ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(c.x, c.y, r * 2.4, 0, 7); ctx.fill(); ctx.restore();
    ctx.fillStyle = hsl(180 + hue * 0.2, 100, 82); ctx.beginPath(); ctx.moveTo(c.x, c.y - r * 1.25); ctx.lineTo(c.x + r * k, c.y - r * 0.2); ctx.lineTo(c.x - r * k, c.y - r * 0.2); ctx.fill();
    ctx.fillStyle = hsl(250 + hue * 0.2, 90, 66); ctx.beginPath(); ctx.moveTo(c.x - r * k, c.y - r * 0.2); ctx.lineTo(c.x + r * k, c.y - r * 0.2); ctx.lineTo(c.x, c.y + r * 1.1); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.8)"; ctx.beginPath(); ctx.moveTo(c.x, c.y - r * 1.25); ctx.lineTo(c.x + r * k * 0.35, c.y - r * 0.2); ctx.lineTo(c.x - r * k * 0.1, c.y - r * 0.2); ctx.fill();
  }
  function drawGate(row) {
    const z = row.z - GAP * 0.5, w = WORLDS[row.world], R = L.half + 1.6, top = 3.4;
    const pts = [];
    for (let i = 0; i <= 24; i++) { const a = Math.PI * i / 24; pts.push(proj(-Math.cos(a) * R, FLOOR + (top - FLOOR) * 0.55 + Math.sin(a) * (top - FLOOR) * 0.6, z)); }
    const bl = proj(-R, FLOOR, z), br = proj(R, FLOOR, z);
    if (!bl || !br || pts.some(p => !p)) return;
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "round"; ctx.lineJoin = "round";
    const path = () => { ctx.beginPath(); ctx.moveTo(bl.x, bl.y); pts.forEach(p => ctx.lineTo(p.x, p.y)); ctx.lineTo(br.x, br.y); };
    const s = pts[12].s;
    [[w.accC, 0.18, 0.5], [w.glowC, 0.35, 0.22], [mixC(w.glowC, WHITE, 0.7), 1, 0.07]].forEach(([c, al, lw]) => { ctx.strokeStyle = rgba(c, al); ctx.lineWidth = Math.max(1.5, s * lw); path(); ctx.stroke(); });
    // light curtain inside the arch
    const g = ctx.createLinearGradient(0, pts[12].y, 0, bl.y); g.addColorStop(0, rgba(w.glowC, 0.0)); g.addColorStop(1, rgba(w.glowC, 0.12 + 0.06 * Math.sin(rtime * 4)));
    ctx.fillStyle = g; path(); ctx.closePath(); ctx.fill();
    ctx.restore();
    if (pts[12].d > 14) {
      ctx.font = `900 ${clamp(s * 0.42, 9, 26)}px ${FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillStyle = rgba(mixC(w.glowC, WHITE, 0.6)); ctx.fillText(w.name.toUpperCase(), pts[12].x, pts[12].y - s * 0.45);
    }
  }
  function drawRing(r) {
    const k = r.t / r.max, e = 1 - (1 - k) ** 3, sc = 1 + e * (r.big ? 1.3 : 0.8), y = r.floor ? FLOOR + 0.02 : 0.02;
    const w = r.w / 2 * sc, d = r.d / 2 * sc;
    if (!poly([[r.x - w, y, r.z - d], [r.x + w, y, r.z - d], [r.x + w, y, r.z + d], [r.x - w, y, r.z + d]])) return;
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = rgba(r.c, (1 - k) * 0.9); const p = proj(r.x, y, r.z); ctx.lineWidth = Math.max(1.5, (p ? p.s : 20) * 0.08 * (1 - k * 0.6)); ctx.stroke();
    ctx.restore();
  }

  /* ---------- the orb ---------- */
  function drawOrb(g, x, y, r, sk, o = {}) {
    const rot = o.rot || 0, look = o.look || 0, glowC = o.glow || hex(sk.trail === "rainbow" ? "#ffffff" : sk.trail);
    const A = hex(sk.a), B = hex(sk.b);
    if (sk.look === "ring") {   // back half of the ring
      g.strokeStyle = rgba(mixC(A, WHITE, 0.2), 0.9); g.lineWidth = r * 0.16;
      g.beginPath(); g.ellipse(x, y, r * 1.55, r * 0.42, -0.25, Math.PI, Math.PI * 2); g.stroke();
    }
    const body = g.createRadialGradient(x - r * 0.35, y - r * 0.45, r * 0.1, x, y, r * 1.05);
    body.addColorStop(0, rgba(mixC(A, WHITE, 0.45))); body.addColorStop(0.55, rgba(A)); body.addColorStop(1, rgba(B));
    g.fillStyle = body; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    g.save(); g.beginPath(); g.arc(x, y, r, 0, 7); g.clip();
    const off = ((rot * r * 0.6) % (r * 0.8) + r * 0.8) % (r * 0.8);
    if (sk.look === "stripes") { g.fillStyle = rgba(B, 0.55); for (let k = -3; k < 4; k++) g.fillRect(x - r, y - r + k * r * 0.8 + off, r * 2, r * 0.32); }
    else if (sk.look === "dots") { g.fillStyle = sk.id === "disco" ? "rgba(255,255,255,0.75)" : rgba(mixC(B, WHITE, 0.15), 0.7); for (let k = 0; k < 9; k++) { const a = k * 2.4 + rot * 0.5, rr = r * (0.25 + (k % 3) * 0.25); const dx = Math.cos(a) * rr, dy = Math.sin(a) * rr * 0.9; g.beginPath(); g.arc(x + dx, y + dy, r * (0.09 + (k % 2) * 0.05), 0, 7); g.fill(); } }
    else if (sk.look === "swirl") { g.strokeStyle = rgba(mixC(A, WHITE, 0.4), 0.6); g.lineWidth = r * 0.13; for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(x, y, r * (0.3 + k * 0.28), rot + k * 1.6, rot + k * 1.6 + 2.2); g.stroke(); } }
    else if (sk.look === "split") { g.fillStyle = rgba(B, 0.55); g.beginPath(); g.moveTo(x - r, y + r * 0.1 + Math.sin(rot) * r * 0.1); g.bezierCurveTo(x - r * 0.3, y - r * 0.2, x + r * 0.3, y + r * 0.4, x + r, y + r * 0.05); g.lineTo(x + r, y + r); g.lineTo(x - r, y + r); g.fill(); }
    if (sk.look === "ring") { g.fillStyle = rgba(B, 0.35); g.fillRect(x - r, y - r * 0.15, r * 2, r * 0.18); g.fillRect(x - r, y + r * 0.3, r * 2, r * 0.1); }
    // rim light from the world glow
    const rim = g.createRadialGradient(x - r * 0.15, y - r * 0.2, r * 0.75, x, y, r * 1.02);
    rim.addColorStop(0, "rgba(0,0,0,0)"); rim.addColorStop(1, rgba(glowC, 0.55));
    g.globalCompositeOperation = "screen"; g.fillStyle = rim; g.fillRect(x - r, y - r, r * 2, r * 2); g.globalCompositeOperation = "source-over";
    g.restore();
    // specular
    g.fillStyle = "rgba(255,255,255,0.75)"; g.beginPath(); g.ellipse(x - r * 0.38, y - r * 0.5, r * 0.26, r * 0.15, -0.6, 0, 7); g.fill();
    g.fillStyle = "rgba(255,255,255,0.5)"; g.beginPath(); g.arc(x - r * 0.12, y - r * 0.68, r * 0.06, 0, 7); g.fill();
    if (sk.look === "ring") { g.strokeStyle = rgba(mixC(A, WHITE, 0.35)); g.lineWidth = r * 0.16; g.beginPath(); g.ellipse(x, y, r * 1.55, r * 0.42, -0.25, 0, Math.PI); g.stroke(); }
    if (sk.face) {   // eyes that look where you steer, blink, and change with the mood
      const ex = look * r * 0.18, mood = o.mood || "idle", blink = o.blink > 0;
      for (const sx of [-1, 1]) {
        const cx = x + sx * r * 0.3 + ex, cy = y - r * 0.08;
        if (mood === "dead") { g.strokeStyle = "#1a1030"; g.lineWidth = r * 0.09; g.lineCap = "round"; g.beginPath(); g.moveTo(cx - r * 0.1, cy - r * 0.1); g.lineTo(cx + r * 0.1, cy + r * 0.1); g.moveTo(cx + r * 0.1, cy - r * 0.1); g.lineTo(cx - r * 0.1, cy + r * 0.1); g.stroke(); continue; }
        if (mood === "happy" || blink) { g.strokeStyle = "#1a1030"; g.lineWidth = r * 0.085; g.lineCap = "round"; g.beginPath(); if (blink) { g.moveTo(cx - r * 0.11, cy); g.lineTo(cx + r * 0.11, cy); } else g.arc(cx, cy + r * 0.05, r * 0.11, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); continue; }
        g.fillStyle = "#fff"; g.beginPath(); g.ellipse(cx, cy, r * 0.14, r * 0.18, 0, 0, 7); g.fill();
        g.fillStyle = "#1a1030"; g.beginPath(); g.arc(cx + look * r * 0.05, cy + r * 0.03, r * 0.085, 0, 7); g.fill();
        g.fillStyle = "#fff"; g.beginPath(); g.arc(cx + look * r * 0.05 - r * 0.03, cy - r * 0.01, r * 0.03, 0, 7); g.fill();
      }
      if (mood === "happy") { g.fillStyle = "#1a1030"; g.beginPath(); g.arc(x + ex, y + r * 0.22, r * 0.12, 0, Math.PI); g.fill(); }
      else if (mood === "dead") { g.fillStyle = "#1a1030"; g.beginPath(); g.ellipse(x + ex, y + r * 0.3, r * 0.08, r * 0.1, 0, 0, 7); g.fill(); }
      g.fillStyle = "rgba(255,110,150,0.35)"; [-1, 1].forEach(sx => { g.beginPath(); g.ellipse(x + sx * r * 0.52 + ex, y + r * 0.16, r * 0.12, r * 0.07, 0, 0, 7); g.fill(); });
    }
  }
  function drawBallShadow() {
    if (ball.gone) return;
    const ri = Math.round(ball.z / GAP), row = rows[ri];
    let onTile = false;
    if (row && Math.abs(ball.z - row.z) < L.depthTile / 2) for (const t of row.tiles) if (Math.abs(ball.x - tileX(t)) < tileW(t) / 2) onTile = true;
    const y = onTile ? 0.01 : FLOOR, h = Math.max(0, ball.y - L.ballR - y);
    const c = proj(ball.x, y, ball.z); if (!c) return;
    const r = L.ballR * c.s * (onTile ? clamp(1.1 - h * 0.18, 0.35, 1.1) : 0.8);
    ctx.fillStyle = `rgba(0,0,0,${onTile ? clamp(0.45 - h * 0.08, 0.08, 0.45) : 0.18})`;
    ctx.beginPath(); ctx.ellipse(c.x, c.y, r, r * 0.38, 0, 0, 7); ctx.fill();
  }
  function drawTrail() {
    if (trail.length < 3) return;
    const pts = trail.map(p => proj(p.x, p.y, p.z));
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "round";
    const fever = feverGlow > 0.2;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i]; if (!a || !b) continue;
      const k = i / pts.length, c = fever ? hslC(rtime * 300 + i * 20) : skinTrail(i);
      ctx.strokeStyle = rgba(c, k * 0.55); ctx.lineWidth = L.ballR * b.s * 1.5 * k;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    ctx.restore();
  }
  function drawBall(P) {
    if (ball.gone) return;
    const c = proj(ball.x, ball.y, ball.z); if (!c) return;
    const r = L.ballR * c.s;
    const stretch = ball.hop ? clamp(Math.abs(ball.vy) * 0.012, 0, 0.18) : 0;
    const sy = 1 - 0.3 * ball.sq + stretch, sx = 1 + 0.25 * ball.sq - stretch * 0.6;
    ctx.save();
    ctx.translate(c.x, c.y + r * (1 - sy));
    if (ball.spin > 0) ctx.rotate(ball.rot * 0.9 * ball.spin);
    ctx.scale(sx, sy);
    // glow halo
    ctx.globalCompositeOperation = "lighter";
    const tc = feverGlow > 0.2 ? hslC(rtime * 300) : skinTrail(0);
    const gl = ctx.createRadialGradient(0, 0, r * 0.6, 0, 0, r * 2.4); gl.addColorStop(0, rgba(tc, 0.35)); gl.addColorStop(1, rgba(tc, 0));
    ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(0, 0, r * 2.4, 0, 7); ctx.fill();
    ctx.globalCompositeOperation = "source-over";
    drawOrb(ctx, 0, 0, r, skin, { rot: ball.rot, look: ball.look, mood: ball.mood, blink: ball.blink, glow: P.glow });
    ctx.restore();
    if (run && run.shield > 0) {   // shield bubble
      const wob = Math.sin(rtime * 6) * 0.04;
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      const g = ctx.createRadialGradient(c.x, c.y, r * 1.1, c.x, c.y, r * 1.65);
      g.addColorStop(0, "rgba(120,220,255,0)"); g.addColorStop(0.85, "rgba(120,220,255,0.25)"); g.addColorStop(1, "rgba(200,255,255,0.6)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(c.x, c.y, r * (1.65 + wob), r * (1.65 - wob), 0, 0, 7); ctx.fill();
      ctx.strokeStyle = hsl(rtime * 120, 100, 80, 0.7); ctx.lineWidth = Math.max(1, r * 0.06); ctx.beginPath(); ctx.arc(c.x, c.y, r * 1.62, -2.6, -1.2); ctx.stroke();
      ctx.restore();
    }
    if (run && run.magnet > 0) {
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      for (let k = 0; k < 4; k++) { const a = rtime * 5 + k * Math.PI / 2; ctx.fillStyle = "rgba(255,120,150,0.9)"; ctx.beginPath(); ctx.arc(c.x + Math.cos(a) * r * 1.5, c.y + Math.sin(a) * r * 0.6, Math.max(1.5, r * 0.1), 0, 7); ctx.fill(); }
      ctx.restore();
    }
  }
  function drawBallReflection() {
    if (ball.gone) return;
    const c = proj(ball.x, 2 * FLOOR - ball.y, ball.z); if (!c) return;
    ctx.save(); ctx.globalAlpha = 0.16; ctx.globalCompositeOperation = "lighter";
    const tc = skinTrail(0); ctx.fillStyle = rgba(tc); ctx.beginPath(); ctx.arc(c.x, c.y, L.ballR * c.s, 0, 7); ctx.fill(); ctx.restore();
  }
  function drawParticles() {
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "round";
    for (const p of parts) {
      const c = proj(p.x, p.y, p.z); if (!c) continue;
      const k = 1 - p.life / p.max;
      if (p.kind === "spark") {
        const b = proj(p.x - p.vx * 0.05, p.y - p.vy * 0.05, p.z - p.vz * 0.05); if (!b) continue;
        if (c.d < 2.5) continue;
        ctx.strokeStyle = rgba(p.c, k); ctx.lineWidth = clamp(p.size * c.s * 0.8, 1, 5); ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.stroke();
      } else { if (c.d < 2.5) continue; ctx.fillStyle = rgba(p.c, k); ctx.beginPath(); ctx.arc(c.x, c.y, clamp(p.size * c.s * k, 0.8, 6), 0, 7); ctx.fill(); }
    }
    ctx.restore();
  }
  function drawFloats() {
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (const f of floats) {
      const c = proj(f.x, f.y, f.z); if (!c) continue;
      const k = f.t / 0.8;
      ctx.globalAlpha = 1 - k * k;
      ctx.font = `900 ${clamp(c.s * 0.42, 10, 30)}px ${FONT}`;
      ctx.lineWidth = 4; ctx.strokeStyle = "rgba(10,6,30,0.7)"; ctx.strokeText(f.text, c.x, c.y);
      ctx.fillStyle = rgba(mixC(f.c, WHITE, 0.4)); ctx.fillText(f.text, c.x, c.y);
    }
    ctx.globalAlpha = 1;
  }
  function drawAir(P) {
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    for (const p of air) {
      const x = p.x * W, y = p.y * H;
      if (p.k === "embers") { ctx.fillStyle = `rgba(255,${150 + p.s * 50},80,${0.5 * p.s})`; ctx.beginPath(); ctx.arc(x, y, 1 + p.s * 1.5, 0, 7); ctx.fill(); }
      else if (p.k === "bubbles") { ctx.strokeStyle = `rgba(200,255,255,${0.35 * p.s})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, 2 + p.s * 4, 0, 7); ctx.stroke(); }
      else if (p.k === "petals") { ctx.fillStyle = `rgba(255,190,235,${0.45 * p.s})`; ctx.beginPath(); ctx.ellipse(x, y, 3 + p.s * 3, 1.5 + p.s, p.ph, 0, 7); ctx.fill(); }
      else if (p.k === "rain") { ctx.strokeStyle = p.s > 1 ? `rgba(255,90,220,0.35)` : `rgba(90,220,255,0.3)`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 2, y + 14 * p.s); ctx.stroke(); }
    }
    ctx.restore();
  }
  const FONT = '"Arial Rounded MT Bold","Nunito","Trebuchet MS",system-ui,sans-serif';
  function drawCallouts() {
    if (call) {
      const t = call.t, pop = t < 0.16 ? 0.4 + 0.75 * Math.sin(t / 0.16 * Math.PI / 2) * 1.1 : 1 + Math.max(0, 0.08 - (t - 0.16)) ;
      const al = t > 0.5 ? 1 - (t - 0.5) / 0.25 : 1, size = Math.min(W * 0.14, 58) * (call.kind === "perfect" ? 1 : call.kind === "great" ? 0.86 : 0.7);
      const y = Math.max(H * 0.2, 175) - (t > 0.5 ? (t - 0.5) * 40 : 0);
      ctx.save(); ctx.globalAlpha = clamp(al, 0, 1); ctx.translate(W / 2, y); ctx.scale(pop, pop); ctx.rotate(call.kind === "perfect" ? -0.04 : 0);
      ctx.font = `900 ${size}px ${FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      const g = ctx.createLinearGradient(0, -size / 2, 0, size / 2);
      const cols = { perfect: ["#fff0ff", "#ff5ad8", "#9b3bff"], great: ["#f0ffff", "#4ff2ff", "#3b7bff"], good: ["#ffffff", "#dfe4ff", "#9aa4ff"], close: ["#fff6d0", "#ffc84f", "#ff7a2e"] }[call.kind];
      cols.forEach((c, i) => g.addColorStop(i / 2, c));
      if (feverGlow > 0.5 && call.kind === "perfect") { g.addColorStop(0, hsl(rtime * 200, 100, 85)); g.addColorStop(1, hsl(rtime * 200 + 120, 100, 55)); }
      ctx.lineJoin = "round"; ctx.lineWidth = size * 0.16; ctx.strokeStyle = "rgba(20,8,50,0.85)"; ctx.strokeText(call.text, 0, 0);
      ctx.shadowColor = cols[1]; ctx.shadowBlur = 22; ctx.fillStyle = g; ctx.fillText(call.text, 0, 0); ctx.shadowBlur = 0;
      ctx.lineWidth = Math.max(1, size * 0.03); ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.strokeText(call.text, 0, -size * 0.02);
      if (call.sub) {
        const ss = size * 0.55; ctx.font = `900 ${ss}px ${FONT}`;
        ctx.lineWidth = ss * 0.18; ctx.strokeStyle = "rgba(20,8,50,0.85)"; ctx.strokeText(call.sub, 0, size * 0.78);
        ctx.fillStyle = "#ffe36b"; ctx.fillText(call.sub, 0, size * 0.78);
      }
      ctx.restore();
    }
    if (banner) {
      const t = banner.t, inn = Math.min(1, t / 0.25), out = banner.kind === "info" ? 1 : clamp((1.6 - t) / 0.3, 0, 1), al = Math.min(inn, out);
      const size = Math.min(W * 0.1, 40) * (banner.kind === "fever" ? 1.35 : 1), y = banner.kind === "info" ? H * 0.42 : Math.max(H * 0.36, 280);
      ctx.save(); ctx.globalAlpha = al; ctx.translate(W / 2 + (1 - inn) * -W * 0.3, y);
      ctx.font = `900 ${size}px ${FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      const tw = ctx.measureText(banner.text).width;
      // ribbon behind the text
      const rg = ctx.createLinearGradient(-tw, 0, tw, 0);
      const c1 = banner.kind === "fever" ? hsl(rtime * 200, 100, 60, 0.75) : banner.kind === "boost" ? "rgba(255,140,50,0.7)" : banner.kind === "save" || banner.kind === "power" ? "rgba(90,190,255,0.7)" : "rgba(20,10,60,0.6)";
      rg.addColorStop(0, "rgba(0,0,0,0)"); rg.addColorStop(0.2, c1); rg.addColorStop(0.8, c1); rg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = rg; ctx.fillRect(-tw, -size * 0.75, tw * 2, size * (banner.sub ? 2.3 : 1.5));
      ctx.lineJoin = "round"; ctx.lineWidth = size * 0.14; ctx.strokeStyle = "rgba(20,8,50,0.8)"; ctx.strokeText(banner.text, 0, 0);
      ctx.fillStyle = banner.kind === "fever" ? hsl(rtime * 300, 100, 85) : "#fff"; ctx.fillText(banner.text, 0, 0);
      if (banner.sub) { ctx.font = `800 ${size * 0.38}px ${FONT}`; ctx.fillStyle = "rgba(255,255,255,0.9)"; ctx.fillText(banner.sub, 0, size * 0.85); }
      ctx.restore();
    }
  }
  function drawScreenFx(P) {
    // boost speed lines from the vanishing point
    if (boostFx > 0.02) {
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < 26; i++) {
        const a = hash(i * 3.7) * Math.PI * 2, r0 = (hash(i) * 0.4 + ((rtime * 2.2 + hash(i * 9)) % 1)) * Math.max(W, H) * 0.7;
        ctx.strokeStyle = `rgba(255,255,255,${0.25 * boostFx})`; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(CX + Math.cos(a) * r0, HY + Math.sin(a) * r0); ctx.lineTo(CX + Math.cos(a) * (r0 + 60), HY + Math.sin(a) * (r0 + 60)); ctx.stroke();
      }
      ctx.restore();
    }
    if (feverGlow > 0.02) {   // pulsing rainbow edges
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.45, W / 2, H / 2, Math.max(W, H) * 0.75);
      g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, hsl(rtime * 120, 100, 55, 0.35 * feverGlow * (0.75 + 0.25 * Math.sin(rtime * 8))));
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
    }
    if (slowTint > 0.02) { ctx.fillStyle = `rgba(80,120,255,${0.12 * slowTint})`; ctx.fillRect(0, 0, W, H); }
    ctx.fillStyle = vignette; ctx.fillRect(0, 0, W, H);
    if (flash.a > 0.01) { ctx.fillStyle = rgba(flash.c, flash.a); ctx.fillRect(0, 0, W, H); }
  }

  function render() {
    const sh = cam.shake * cam.shake;
    CX = W / 2 + (Math.random() - 0.5) * sh * 14; CY = H * 0.5 + (Math.random() - 0.5) * sh * 14;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const P = palette();
    drawSky(P); drawFloor(P);
    const r0 = Math.max(0, ball.row - 2), r1 = Math.min(rows.length - 1, ball.row + 15);
    // reflections on the lake first
    for (let i = r1; i >= r0; i--) for (const t of rows[i].tiles) drawTileReflection(rows[i], t, P);
    drawBallReflection();
    for (const r of rings) if (r.floor) drawRing(r);
    // collect world objects and draw far → near
    const list = [];
    propsList(list);
    const nextRow = ball.hop ? ball.hop.r1 : -1;
    for (let i = r0; i <= r1; i++) {
      const row = rows[i];
      if (row.gate) { const p = proj(0, 0, row.z - GAP * 0.5); if (p) list.push({ d: p.d + 0.01, draw: () => drawGate(row) }); }
      for (const t of row.tiles) { const p = proj(tileX(t), 0, row.z); if (p) list.push({ d: p.d + 0.6, draw: () => drawTile(row, t, P, i === nextRow) }); }
    }
    for (const g of gems) if (!g.taken && g.z > cam.z + 1 && g.z < cam.z + 70) { const p = proj(g.x, g.y, g.z); if (p) list.push({ d: p.d - 0.05, draw: () => drawGem(g) }); }
    const bp = proj(ball.x, ball.y, ball.z);
    if (bp) list.push({ d: bp.d - 0.3, draw: () => { drawBallShadow(); drawTrail(); drawBall(P); } });
    list.sort((a, b) => b.d - a.d);
    for (const o of list) o.draw();
    for (const r of rings) if (!r.floor) drawRing(r);
    drawParticles(); drawFloats(); drawAir(P);
    drawScreenFx(P);
    drawCallouts();
  }

  /* ---------- loop & input ---------- */
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    update(dt); render();
    requestAnimationFrame(frame);
  }
  let drag = null;
  cv.addEventListener("pointerdown", e => {
    if (mode === "paused" || mode === "over" || mode === "attract") return;
    drag = { id: e.pointerId, x0: e.clientX, t0: ball.tx };
    try { cv.setPointerCapture(e.pointerId); } catch (er) {}
    if (mode === "ready") { banner = banner && banner.kind === "info" ? null : banner; begin(); }
  });
  cv.addEventListener("pointermove", e => {
    if (!drag || e.pointerId !== drag.id || mode === "attract") return;
    ball.tx = drag.t0 + (e.clientX - drag.x0) / W * C.steer.span;
  });
  const end = e => { if (drag && e.pointerId === drag.id) drag = null; };
  cv.addEventListener("pointerup", end); cv.addEventListener("pointercancel", end);
  addEventListener("keydown", e => {
    if (e.key === "ArrowLeft" || e.key === "a") keys.l = true;
    if (e.key === "ArrowRight" || e.key === "d") keys.r = true;
    if ((e.key === " " || e.key.startsWith("Arrow")) && mode === "ready") begin();
  });
  addEventListener("keyup", e => { if (e.key === "ArrowLeft" || e.key === "a") keys.l = false; if (e.key === "ArrowRight" || e.key === "d") keys.r = false; });

  resize(); attract(7);
  requestAnimationFrame(frame);

  return {
    on, attract, prepare, begin, revive,
    pause(p) { if (p && (mode === "play" || mode === "ready")) { this._resume = mode; mode = "paused"; } else if (!p && mode === "paused") { mode = this._resume || "play"; last = performance.now(); } },
    setSkin(id) { skin = C.skins.find(s => s.id === id) || C.skins[0]; },
    drawOrb(g, x, y, r, sk, o) { drawOrb(g, x, y, r, sk, o); },
    get mode() { return mode; }, get run() { return run; }, get ball() { return ball; }, get rows() { return rows; },
    // test hooks
    step(dt = 1 / 60, n = 1) { for (let i = 0; i < n; i++) update(dt); render(); },
    renderNow() { render(); },
    setTarget(x) { ball.tx = x; },
    nextTileX() { if (!ball.hop) return null; const row = rows[ball.hop.r1]; return row.tiles.length ? tileX(row.tiles[0]) : null; },
    autoSteer(on) { bot = on; }, worlds: WORLDS
  };
})();

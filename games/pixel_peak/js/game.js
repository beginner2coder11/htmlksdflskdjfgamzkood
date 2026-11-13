/* ==========================================================================
   PIXEL PEAK — engine. Renders at 256×224 and is scaled up with crisp pixels.
   Tile physics with coyote time + jump buffering, chunk-stitched levels,
   walkers, bats, springs, moving platforms, checkpoints, a 3×5 bitmap font
   and in-screen menus (title, map, pause, results), all driven by buttons.
   ========================================================================== */
window.Game = (() => {
  const CF = window.GAME_CONFIG, PH = CF.physics, T = 16, VW = 256, VH = 224;
  const screen = document.getElementById("screen"), sc = screen.getContext("2d");
  const buf = document.createElement("canvas"); buf.width = VW; buf.height = VH; const g = buf.getContext("2d");
  const hooks = {}, emit = (n, d) => hooks[n] && hooks[n](d);
  const keys = { left: false, right: false, a: false, b: false };

  /* ---------- bitmap font (3×5) ---------- */
  const F = {
    "A": ".#.#.#####.##.#",
    "B": "##.#.###.#.###.",
    "C": ".###..#..#...##",
    "D": "##.#.##.##.###.",
    "E": "####..##.#..###",
    "F": "####..##.#..#..",
    "G": ".###..#.##.#.##",
    "H": "#.##.#####.##.#",
    "I": "###.#..#..#.###",
    "J": "..#..#..##.#.#.",
    "K": "#.##.###.#.##.#",
    "L": "#..#..#..#..###",
    "M": "#.########.##.#",
    "N": "##.#.##.##.##.#",
    "O": ".#.#.##.##.#.#.",
    "P": "##.#.###.#..#..",
    "Q": ".#.#.##.###..##",
    "R": "##.#.###.#.##.#",
    "S": ".###...#...###.",
    "T": "###.#..#..#..#.",
    "U": "#.##.##.##.####",
    "V": "#.##.##.##.#.#.",
    "W": "#.##.########.#",
    "X": "#.##.#.#.#.##.#",
    "Y": "#.##.#.#..#..#.",
    "Z": "###..#.#.#..###",
    "0": "####.##.##.####",
    "1": ".#.##..#..#.###",
    "2": "##...#.#.#..###",
    "3": "##...#.#...###.",
    "4": "#.##.####..#..#",
    "5": "####..##...###.",
    "6": ".###..####.####",
    "7": "###..#.#..#..#.",
    "8": "####.#####.####",
    "9": "####.####..###.",
    "!": ".#..#..#.....#.",
    "?": "##...#.#.....#.",
    ".": ".............#.",
    ":": "....#.....#....",
    "-": "......###......",
    "x": "...#.#.#.#.#...",
    "/": "..#..#.#.#..#..",
    ">": "#...#...#.#.#..",
    "<": "..#.#.#...#...#",
    "*": ".#.###.#.#.#...",
    "'": ".#..#..........",
    " ": "..............."
  };
  for (const k in F) F[k] = F[k].padEnd(15, ".");
  function text(s, x, y, color = "#fff", scale = 1, align = "left") {
    s = String(s).toUpperCase(); const w = s.length * 4 * scale - scale;
    if (align === "center") x -= Math.floor(w / 2); if (align === "right") x -= w;
    g.fillStyle = color;
    for (let i = 0; i < s.length; i++) { const gl = F[s[i]] || F[" "]; for (let p = 0; p < 15; p++) if (gl[p] === "#") g.fillRect(x + i * 4 * scale + (p % 3) * scale, y + Math.floor(p / 3) * scale, scale, scale); }
  }
  function shadowText(s, x, y, c, scale = 1, align) { const o = Math.max(1, Math.ceil(scale / 3)); text(s, x + o, y + o, "#1a1a2e", scale, align); text(s, x, y, c, scale, align); }

  /* ---------- sprites from strings ---------- */
  const PAL = { k: "#1a1a2e", w: "#ffffff", b: "#3e7bfa", B: "#2a55c9", r: "#ff4d5e", y: "#ffd23f", o: "#ff9a3c", g: "#3a3a52", p: "#c86bff", n: "#8a5a2b", s: "#c8d0e0", G: "#4fb648" };
  function sprite(rows) { const c = document.createElement("canvas"); c.width = rows[0].length; c.height = rows.length; const x = c.getContext("2d"); rows.forEach((r, j) => [...r].forEach((ch, i) => { if (PAL[ch]) { x.fillStyle = PAL[ch]; x.fillRect(i, j, 1, 1); } })); return c; }
  const body = ["....kkkk....", "...kbbbbk...", "..kbbbbbbk..", "..kbwwbwwk..", "..kbkwbkwk..", "..kbbbbbbk..", "..krrrrrrrk.", "...kBbbBk.r.", "..kbbbbbbk..", "..kBbbbbBk.."];
  const SPR = {
    idle: sprite([...body, "...kk..kk...", "...kk..kk..."]),
    run1: sprite([...body, "..kk....kk..", ".kk......k.."]),
    run2: sprite([...body, "....kkkk....", "....kk.kk..."]),
    jump: sprite([...body.slice(0, 9), "..kBbbbbBk..", ".kk.....kk..", "............"]),
    walk1: sprite(["....oooo....", "..oooooooo..", ".ooywooywoo.", ".oookoookoo.", "oooooooooooo", "oonnnnnnnnoo", ".k.k....k.k.", "k...k..k...k"]),
    walk2: sprite(["....oooo....", "..oooooooo..", ".ooywooywoo.", ".oookoookoo.", "oooooooooooo", "oonnnnnnnnoo", "..k.k..k.k..", "..k..kk..k.."]),
    bat1: sprite(["k..........k", "pk..kppk..kp", "ppkkppppkkpp", ".pppwppwppp.", "..ppkppkpp..", "....pppp...."]),
    bat2: sprite(["............", "....kppk....", "..kkppppkk..", ".pppwppwppp.", "pppkkppkkppp", "p...pppp...p"]),
    coin: [sprite(["..yyyy..", ".yywwyy.", "yywyyyyy", "yywyyyyy", "yyyyyyoy", "yyyyyyoy", ".yyyooy.", "..yyyy.."]), sprite(["...yy...", "..ywyy..", "..ywyy..", "..ywyy..", "..yyoy..", "..yyoy..", "..yyoy..", "...yy..."]), sprite(["...yy...", "...wy...", "...wy...", "...yy...", "...yo...", "...yo...", "...yo...", "...yy..."])],
    heart: sprite([".rr.rr.", "rwrrrrr", "rrrrrrr", ".rrrrr.", "..rrr..", "...r..."]),
    heartOff: sprite([".gg.gg.", "ggggggg", "ggggggg", ".ggggg.", "..ggg..", "...g..."]),
    spring: sprite(["kkkkkkkkkkkkkkkk", "krrrrrrrrrrrrrrk", "kkkkkkkkkkkkkkkk", "....ksssssk.....", "...ksk...ksk....", "....ksssssk.....", "...ksk...ksk....", "kkkkkkkkkkkkkkkk"]),
    flag: sprite(["ww..........", "wrrrrrr.....", "wrrrwrrrr...", "wrrrrrrrrrr.", "wrrrrrr.....", "w...........", "w...........", "w...........", "w...........", "w...........", "w...........", "w...........", "w...........", "w...........", "w...........", "w...........", "w...........", "w...........", "w...........", "w...........", "w...........", "w...........", "kkk.........", "kkk........."]),
    check: sprite(["..yyy...", ".yyyyy..", "..yyy...", "...k....", "...k....", "...k....", "...k....", "...k....", "...k....", "...k....", "...k....", "..kkk..."]),
    checkOn: sprite(["..GGG...", ".GGGGG..", "..GGG...", "...k....", "...k....", "...k....", "...k....", "...k....", "...k....", "...k....", "...k....", "..kkk..."])
  };

  /* ---------- tiles per world ---------- */
  let tileCache = {};
  function tiles(w) {
    if (tileCache[w.name]) return tileCache[w.name];
    const mk = fn => { const c = document.createElement("canvas"); c.width = c.height = T; fn(c.getContext("2d")); return c; };
    const ground = mk(x => { x.fillStyle = w.ground; x.fillRect(0, 0, T, T); x.fillStyle = "rgba(0,0,0,.18)"; for (let i = 0; i < 9; i++) x.fillRect((i * 7) % 15, 5 + (i * 5) % 10, 2, 1); x.fillStyle = w.top; x.fillRect(0, 0, T, 4); x.fillRect(2, 4, 1, 1); x.fillRect(7, 4, 2, 1); x.fillRect(12, 4, 1, 1); x.fillStyle = "rgba(255,255,255,.35)"; x.fillRect(0, 0, T, 1); });
    const dirt = mk(x => { x.fillStyle = w.ground; x.fillRect(0, 0, T, T); x.fillStyle = "rgba(0,0,0,.18)"; for (let i = 0; i < 9; i++) x.fillRect((i * 5) % 15, (i * 7) % 15, 2, 1); });
    const brick = mk(x => { x.fillStyle = w.brick; x.fillRect(0, 0, T, T); x.fillStyle = "rgba(0,0,0,.3)"; x.fillRect(0, 7, T, 1); x.fillRect(0, 15, T, 1); x.fillRect(7, 0, 1, 7); x.fillRect(3, 8, 1, 7); x.fillRect(11, 8, 1, 7); x.fillStyle = "rgba(255,255,255,.3)"; x.fillRect(0, 0, T, 1); x.fillRect(0, 8, T, 1); });
    const spike = mk(x => { for (let i = 0; i < 2; i++) { const ox = i * 8; for (let r = 0; r < 8; r++) { x.fillStyle = r < 2 ? "#ffffff" : "#c8d0e0"; x.fillRect(ox + 4 - Math.ceil(r / 2), 8 + r, Math.ceil(r / 2) * 2 || 1, 1); } } });
    return tileCache[w.name] = { ground, dirt, brick, spike };
  }

  /* ---------- level building ---------- */
  let map = [], cols = 0, world = CF.worlds[0], level = 1, ents = [], movers = [], checkpoints = [], flag = null, coinsTotal = 0;
  function rng(seed) { return () => (seed = (seed * 16807) % 2147483647) / 2147483647; }
  function build(n) {
    level = n; world = CF.worlds[Math.floor((n - 1) / 8) % CF.worlds.length];
    const r = rng(n * 977 + 13), t = Math.min(1, (n - 1) / (CF.levels - 1));
    const count = Math.round(CF.chunksPerLevel.start + (CF.chunksPerLevel.end - CF.chunksPerLevel.start) * t);
    const list = [CF.chunks.start];
    for (let i = 0; i < count; i++) {
      const roll = r(), pool = roll < 0.5 - t * 0.4 ? CF.chunks.easy : (roll < 0.85 - t * 0.25 || t < 0.2) ? CF.chunks.mid : CF.chunks.hard;
      list.push(pool[Math.floor(r() * pool.length)]);
      if (i === Math.floor(count / 2)) list.push(CF.chunks.easy[5]);      // a checkpoint halfway
    }
    list.push(CF.chunks.flag);
    map = Array.from({ length: 14 }, (_, row) => list.map(c => c[row]).join("").split(""));
    cols = map[0].length; ents = []; movers = []; checkpoints = []; coinsTotal = 0; flag = null;
    let start = [32, 160];
    for (let y = 0; y < 14; y++) for (let x = 0; x < cols; x++) {
      const ch = map[y][x], px = x * T, py = y * T;
      if (ch === "P") start = [px, py];
      if (ch === "o") { ents.push({ k: "coin", x: px + 4, y: py + 4, w: 8, h: 8 }); coinsTotal++; }
      if (ch === "E") ents.push({ k: "walker", x: px + 2, y: py + 8, w: 12, h: 8, vx: -22, alive: true });
      if (ch === "B") ents.push({ k: "bat", x: px, y: py, w: 12, h: 6, oy: py, t: r() * 6, alive: true });
      if (ch === "S") ents.push({ k: "spring", x: px, y: py + 8, w: 16, h: 8, sq: 0 });
      if (ch === "C") checkpoints.push({ x: px + 4, y: py + 4, on: false });
      if (ch === "F") flag = { x: px + 2, y: py - 8 * 1 - 72 + 8 };
      if (ch === "M") movers.push({ x: px, y: py, w: 48, h: 8, ox: px, range: 64, t: 0, dx: 0 });
      if ("oEBSCFPM".includes(ch)) map[y][x] = ".";
    }
    if (flag) flag.y = 12 * T - 96 + 0;
    return start;
  }
  const solid = (tx, ty) => ty >= 0 && ty < 14 && tx >= 0 && tx < cols && (map[ty][tx] === "#" || map[ty][tx] === "=");
  const spikeAt = (tx, ty) => ty >= 0 && ty < 14 && tx >= 0 && tx < cols && map[ty][tx] === "^";

  /* ---------- run state ---------- */
  let mode = "title", P = null, hearts = CF.hearts, coins = 0, hits = 0, camX = 0, respawn = [32, 160], clock = 0, invuln = 0, fx = [], msgT = 0, msg = "";
  let menuSel = 0, mapSel = 0, unlocked = 1, stars = {}, result = null, paused = false, deathT = 0;
  function startLevel(n) {
    const s = build(n); respawn = s; spawnPlayer(); hearts = CF.hearts; coins = 0; hits = 0; camX = 0; fx = []; mode = "play"; deathT = 0;
    Sound.song(Math.floor((n - 1) / 8)); flash(`${world.name} ${((n - 1) % 8) + 1}`);
    emit("level", n);
  }
  function spawnPlayer() { P = { x: respawn[0] + 3, y: respawn[1] + 4, w: 10, h: 12, vx: 0, vy: 0, ground: false, coyote: 0, buffer: 0, face: 1, anim: 0, on: null }; invuln = 1; }
  function flash(t) { msg = t; msgT = 1.6; }

  /* ---------- physics ---------- */
  function moveX(o, dx) {
    o.x += dx;
    const top = Math.floor(o.y / T), bot = Math.floor((o.y + o.h - 1) / T);
    if (dx > 0) { const tx = Math.floor((o.x + o.w) / T); for (let ty = top; ty <= bot; ty++) if (solid(tx, ty)) { o.x = tx * T - o.w; o.vx = 0; return true; } }
    if (dx < 0) { const tx = Math.floor(o.x / T); for (let ty = top; ty <= bot; ty++) if (solid(tx, ty)) { o.x = (tx + 1) * T; o.vx = 0; return true; } }
    return false;
  }
  function moveY(o, dy) {
    o.y += dy; o.ground = false;
    const l = Math.floor(o.x / T), r = Math.floor((o.x + o.w - 1) / T);
    if (dy > 0) { const ty = Math.floor((o.y + o.h) / T); for (let tx = l; tx <= r; tx++) if (solid(tx, ty)) { o.y = ty * T - o.h; o.vy = 0; o.ground = true; return; } }
    if (dy < 0) { const ty = Math.floor(o.y / T); for (let tx = l; tx <= r; tx++) if (solid(tx, ty)) { o.y = (ty + 1) * T; o.vy = 0; return; } }
  }
  const hit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  function hurt(dir) {
    if (invuln > 0 || mode !== "play") return;
    hearts--; hits++; invuln = 1.5; P.vy = -180; P.vx = dir * 120; Sound.sfx("hurt"); emit("shake");
    if (hearts <= 0) die();
  }
  function die() { mode = "dying"; deathT = 0; P.vy = -240; Sound.sfx("die"); }
  function pit() { hearts--; hits++; Sound.sfx("hurt"); if (hearts <= 0) { die(); return; } spawnPlayer(); }

  function stepPlay(dt) {
    // horizontal
    const dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    if (dir) { P.vx += dir * PH.accel * dt; P.face = dir; } else { const f = PH.friction * dt; P.vx = Math.abs(P.vx) <= f ? 0 : P.vx - Math.sign(P.vx) * f; }
    P.vx = Math.max(-PH.run, Math.min(PH.run, P.vx));
    // jump with coyote time, buffering and variable height
    P.coyote = P.ground ? PH.coyote : P.coyote - dt; P.buffer -= dt;
    if (P.buffer > 0 && P.coyote > 0) { P.vy = -PH.jump; P.coyote = 0; P.buffer = 0; P.ground = false; P.cut = true; Sound.sfx("jump"); }
    if (P.cut && !keys.a && P.vy < -100) P.vy += PH.gravity * dt * 1.6;   // short hop when A is released (jumps only, not springs)
    if (P.vy >= 0) P.cut = false;
    P.vy = Math.min(PH.maxFall, P.vy + PH.gravity * dt);
    // moving platforms carry you
    movers.forEach(m => { m.t += dt; const nx = m.ox + Math.sin(m.t * 0.9) * m.range; m.dx = nx - m.x; m.x = nx; });
    if (P.on) P.x += P.on.dx;
    moveX(P, P.vx * dt);
    const wasY = P.y; moveY(P, P.vy * dt); P.on = null;
    movers.forEach(m => { if (P.vy >= 0 && wasY + P.h <= m.y + 1 && P.y + P.h >= m.y && P.x + P.w > m.x && P.x < m.x + m.w) { P.y = m.y - P.h; P.vy = 0; P.ground = true; P.on = m; } });
    P.x = Math.max(0, Math.min(cols * T - P.w, P.x));
    // spikes
    const l = Math.floor(P.x / T), r = Math.floor((P.x + P.w - 1) / T), fy = Math.floor((P.y + P.h - 2) / T);
    for (let tx = l; tx <= r; tx++) if (spikeAt(tx, fy) && (P.y + P.h) % T > 8) hurt(-P.face);
    if (P.y > VH + 16) pit();
    // entities
    for (const e of ents) {
      if (e.k === "coin" && !e.got && hit(P, e)) { e.got = true; coins++; Sound.sfx("coin"); fx.push({ k: "spark", x: e.x + 4, y: e.y + 4, t: 0 }); emit("hud"); }
      if (e.k === "spring" && P.vy >= 0 && hit(P, e)) { P.vy = -PH.spring; P.cut = false; e.sq = 0.2; Sound.sfx("spring"); }
      if ((e.k === "walker" || e.k === "bat") && e.alive && hit(P, e)) {
        if (P.vy > 40 && P.y + P.h - e.y < 8) { e.alive = false; P.vy = -PH.stomp; Sound.sfx("stomp"); fx.push({ k: "puff", x: e.x + 6, y: e.y + 4, t: 0 }); }
        else hurt(P.x < e.x ? -1 : 1);
      }
    }
    checkpoints.forEach(c => { if (!c.on && Math.abs(P.x - c.x) < 12 && Math.abs(P.y - c.y) < 20) { c.on = true; respawn = [c.x - 4, c.y - 4]; Sound.sfx("check"); flash("CHECKPOINT"); } });
    if (flag && P.x + P.w >= flag.x && mode === "play") finish();
    P.anim += Math.abs(P.vx) * dt;
  }
  function stepEnts(dt) {
    for (const e of ents) {
      if (e.k === "walker" && e.alive) {
        const nx = e.x + e.vx * dt, ahead = e.vx < 0 ? Math.floor(nx / T) : Math.floor((nx + e.w) / T), row = Math.floor((e.y + e.h - 1) / T);
        if (solid(ahead, row) || !solid(ahead, row + 1)) e.vx = -e.vx; else e.x = nx;
      }
      if (e.k === "bat" && e.alive) { e.t += dt; e.y = e.oy + Math.sin(e.t * 2.4) * 14; if (P && Math.abs(P.x - e.x) < 90) e.x += Math.sign(P.x - e.x) * 18 * dt; }
      if (e.k === "spring") e.sq = Math.max(0, e.sq - dt);
    }
  }
  function finish() {
    mode = "clear"; Sound.sfx("flag");
    const st = 1 + (coins >= Math.ceil(coinsTotal * 0.8) ? 1 : 0) + (hits === 0 ? 1 : 0);
    result = { level, coins, total: coinsTotal, stars: st, hits };
    stars[level] = Math.max(stars[level] || 0, st); if (level >= unlocked) unlocked = Math.min(CF.levels, level + 1);
    emit("clear", result); menuSel = 0;
  }

  /* ---------- update ---------- */
  function update(dt) {
    clock += dt; if (paused) return;
    if (msgT > 0) msgT -= dt; if (invuln > 0) invuln -= dt;
    if (mode === "play") { stepEnts(dt); stepPlay(dt); camX += ((P.x - VW * 0.4) - camX) * Math.min(1, dt * 8); camX = Math.max(0, Math.min(cols * T - VW, camX)); }
    if (mode === "dying") { deathT += dt; P.vy += PH.gravity * dt; P.y += P.vy * dt; if (deathT > 1.6) { mode = "over"; menuSel = 0; emit("over", { level }); } }
    fx.forEach(f => f.t += dt); fx = fx.filter(f => f.t < 0.4);
  }

  /* ---------- drawing ---------- */
  function drawBg() {
    const gr = g.createLinearGradient(0, 0, 0, VH); gr.addColorStop(0, world.sky[0]); gr.addColorStop(1, world.sky[1]); g.fillStyle = gr; g.fillRect(0, 0, VW, VH);
    // pixel peaks (two parallax layers) — the "peak" in the name
    const layer = (par, color, base, amp, step) => { g.fillStyle = color; const off = Math.floor(camX * par); for (let x = 0; x < VW; x += 2) { const wx = x + off, h = Math.abs(((wx / step) % 2) - 1) * amp + Math.sin(wx * 0.05) * 6; g.fillRect(x, Math.floor(base - h), 2, VH); } };
    layer(0.15, world.far, 150, 70, 90); layer(0.35, world.hills, 175, 40, 50);
    if (world.name === "SUMMIT") { g.fillStyle = "#ffffff"; for (let i = 0; i < 30; i++) { const x = (i * 37 + clock * 12 * (1 + i % 3)) % VW, y = (i * 53 + clock * 30) % VH; g.fillRect(Math.floor(x), Math.floor(y), 1, 1); } }
    else if (world.name === "MEADOW") { g.fillStyle = "#ffffff"; [[40, 30], [150, 50], [220, 24]].forEach(([x, y], i) => { const cx = Math.floor((x - camX * 0.08 + 400) % 300 - 20); g.fillRect(cx, y, 24, 6); g.fillRect(cx + 4, y - 4, 14, 4); }); }
    else { g.fillStyle = "rgba(200,180,255,.5)"; for (let i = 0; i < 12; i++) g.fillRect(Math.floor((i * 41 - camX * 0.3) % VW + VW) % VW, (i * 29) % 120, 1, 1); }
  }
  function drawLevel() {
    const ts = tiles(world), c0 = Math.floor(camX / T), cx = Math.floor(camX);
    for (let y = 0; y < 14; y++) for (let x = c0; x <= c0 + 16 && x < cols; x++) {
      const ch = map[y][x]; if (ch === ".") continue;
      const sx = x * T - cx, sy = y * T;
      if (ch === "#") g.drawImage(y > 0 && solid(x, y - 1) ? ts.dirt : ts.ground, sx, sy);
      if (ch === "=") g.drawImage(ts.brick, sx, sy);
      if (ch === "^") g.drawImage(ts.spike, sx, sy);
    }
    movers.forEach(m => { for (let i = 0; i < 3; i++) g.drawImage(ts.brick, Math.floor(m.x - cx) + i * T, m.y, T, 8); });
    checkpoints.forEach(c => g.drawImage(c.on ? SPR.checkOn : SPR.check, Math.floor(c.x - cx), c.y));
    if (flag) g.drawImage(SPR.flag, Math.floor(flag.x - cx), 12 * T - 24);
    for (const e of ents) {
      const ex = Math.floor(e.x - cx), ey = Math.floor(e.y); if (ex < -20 || ex > VW + 20) continue;
      if (e.k === "coin" && !e.got) { const f = Math.floor(clock * 8) % 4; g.drawImage(SPR.coin[[0, 1, 2, 1][f]], ex, ey + Math.round(Math.sin(clock * 4 + e.x) * 1)); }
      if (e.k === "walker" && e.alive) { const s = Math.floor(clock * 6) % 2 ? SPR.walk1 : SPR.walk2; g.save(); if (e.vx > 0) { g.translate(ex + 12, ey); g.scale(-1, 1); g.drawImage(s, 0, 0); } else g.drawImage(s, ex, ey); g.restore(); }
      if (e.k === "bat" && e.alive) g.drawImage(Math.floor(clock * 8) % 2 ? SPR.bat1 : SPR.bat2, ex, ey);
      if (e.k === "spring") g.drawImage(SPR.spring, 0, 0, 16, 8, ex, ey + (e.sq > 0 ? 3 : 0), 16, e.sq > 0 ? 5 : 8);
    }
  }
  function drawPlayer() {
    if (!P) return; if (invuln > 0 && mode === "play" && Math.floor(clock * 20) % 2) return;
    const s = !P.ground ? SPR.jump : Math.abs(P.vx) > 10 ? (Math.floor(P.anim / 8) % 2 ? SPR.run1 : SPR.run2) : SPR.idle;
    const x = Math.floor(P.x - camX) - 1, y = Math.floor(P.y);
    g.save(); if (P.face < 0) { g.translate(x + 12, y); g.scale(-1, 1); g.drawImage(s, 0, 0); } else g.drawImage(s, x, y); g.restore();
  }
  function drawHud() {
    for (let i = 0; i < CF.hearts; i++) g.drawImage(i < hearts ? SPR.heart : SPR.heartOff, 4 + i * 9, 4);
    g.drawImage(SPR.coin[0], VW - 46, 3); shadowText("x" + coins, VW - 36, 4, "#fff", 1);
    shadowText(`${world.name} ${((level - 1) % 8) + 1}`, VW / 2, 4, "#fff", 1, "center");
    if (msgT > 0) shadowText(msg, VW / 2, 60, "#ffd23f", 2, "center");
    fx.forEach(f => { g.fillStyle = f.k === "spark" ? "#ffd23f" : "#ffffff"; const r = Math.floor(f.t * 30); g.fillRect(Math.floor(f.x - camX) - r, Math.floor(f.y), 2, 2); g.fillRect(Math.floor(f.x - camX) + r, Math.floor(f.y), 2, 2); g.fillRect(Math.floor(f.x - camX), Math.floor(f.y) - r, 2, 2); g.fillRect(Math.floor(f.x - camX), Math.floor(f.y) + r, 2, 2); });
  }
  function panel(x, y, w, h) { g.fillStyle = "#1a1a2e"; g.fillRect(x, y, w, h); g.fillStyle = "#ffffff"; g.fillRect(x + 2, y + 2, w - 4, 1); g.fillRect(x + 2, y + h - 3, w - 4, 1); g.fillRect(x + 2, y + 2, 1, h - 4); g.fillRect(x + w - 3, y + 2, 1, h - 4); }
  function menu(items, y) { items.forEach((it, i) => { const sel = i === menuSel; if (sel && Math.floor(clock * 4) % 2) text(">", VW / 2 - it.length * 4 - 4, y + i * 14, "#ffd23f", 2); text(it, VW / 2, y + i * 14, sel ? "#ffd23f" : "#ffffff", 2, "center"); }); }
  function render() {
    if (mode === "title") {
      world = CF.worlds[0]; camX = (clock * 20) % 2000; drawBg(); g.fillStyle = world.ground; g.fillRect(0, 192, VW, 32); g.fillStyle = world.top; g.fillRect(0, 192, VW, 4);
      shadowText("PIXEL", VW / 2, 40, "#ffd23f", 6, "center"); shadowText("PEAK", VW / 2, 80, "#ff4d5e", 6, "center");
      g.drawImage(Math.floor(clock * 6) % 2 ? SPR.run1 : SPR.run2, VW / 2 - 6, 180);
      if (Math.floor(clock * 2) % 2) shadowText("PRESS A", VW / 2, 140, "#ffffff", 2, "center");
      text("STARS " + Object.values(stars).reduce((a, b) => a + b, 0), VW / 2, 166, "#1a1a2e", 1, "center");
    } else if (mode === "map") {
      const w = CF.worlds[Math.floor(mapSel / 8)]; world = w; camX = mapSel * 40; drawBg();
      shadowText(w.name, VW / 2, 16, "#ffffff", 3, "center");
      const first = Math.floor(mapSel / 8) * 8;
      for (let i = 0; i < 8; i++) {
        const n = first + i + 1, x = 24 + i * 30, y = 150 - i * 12, open = n <= unlocked;
        g.fillStyle = "#1a1a2e"; if (i < 7) for (let d = 0; d < 30; d += 4) g.fillRect(x + 8 + d, y + 6 - d * 0.4, 2, 2);
        g.fillStyle = n - 1 === mapSel ? "#ffd23f" : open ? "#ffffff" : "#5a5a7a"; g.fillRect(x, y, 16, 12); g.fillStyle = "#1a1a2e"; g.fillRect(x + 1, y + 1, 14, 10);
        text(n, x + 8, y + 4, open ? "#fff" : "#5a5a7a", 1, "center");
        for (let s = 0; s < (stars[n] || 0); s++) text("*", x + 2 + s * 5, y + 14, "#ffd23f");
      }
      const sx = 24 + (mapSel % 8) * 30, sy = 150 - (mapSel % 8) * 12 - 14 + Math.round(Math.sin(clock * 6));
      g.drawImage(SPR.idle, sx + 2, sy);
      shadowText(`LEVEL ${mapSel + 1}`, VW / 2, 182, "#ffffff", 2, "center");
      text("< > CHOOSE   A PLAY   B BACK", VW / 2, 206, "#1a1a2e", 1, "center");
    } else {
      drawBg(); drawLevel(); drawPlayer(); drawHud();
      if (mode === "clear") { panel(48, 52, 160, 120); shadowText("CLEAR!", VW / 2, 62, "#ffd23f", 3, "center"); for (let s = 0; s < 3; s++) text("*", VW / 2 - 20 + s * 16, 90, s < result.stars ? "#ffd23f" : "#3a3a52", 3); text(`COINS ${result.coins}/${result.total}`, VW / 2, 112, "#fff", 1, "center"); menu(["NEXT", "MAP"], 128); }
      if (mode === "over") { panel(48, 60, 160, 110); shadowText("GAME OVER", VW / 2, 70, "#ff4d5e", 2, "center"); menu(["CONTINUE AD", "RETRY", "MAP"], 96); }
      if (paused) { panel(64, 70, 128, 84); shadowText("PAUSE", VW / 2, 80, "#fff", 2, "center"); menu(["RESUME", "RETRY", "MAP"], 102); }
    }
    sc.imageSmoothingEnabled = false; sc.drawImage(buf, 0, 0, screen.width, screen.height);
  }

  /* ---------- buttons ---------- */
  function press(btn, down) {
    keys[btn] = down; if (!down) return;
    Sound.unlock();
    if (mode === "title") { if (btn === "a" || btn === "start") { mode = "map"; mapSel = Math.max(0, unlocked - 1); Sound.sfx("select"); } return; }
    if (mode === "map") {
      if (btn === "left" && mapSel > 0) { mapSel--; Sound.sfx("blip"); }
      if (btn === "right" && mapSel < unlocked - 1) { mapSel++; Sound.sfx("blip"); }
      if (btn === "a" || btn === "start") { Sound.sfx("select"); startLevel(mapSel + 1); }
      if (btn === "b") mode = "title";
      return;
    }
    const pick = (items, fn) => { if (btn === "left" || btn === "up") { menuSel = (menuSel + items - 1) % items; Sound.sfx("blip"); } if (btn === "right" || btn === "down" || btn === "select") { menuSel = (menuSel + 1) % items; Sound.sfx("blip"); } if (btn === "a" || btn === "start") { Sound.sfx("select"); fn(menuSel); } };
    if (paused) return pick(3, i => { paused = false; emit("resume"); if (i === 1) startLevel(level); if (i === 2) toMap(); });
    if (mode === "clear") return pick(2, i => emit("next", i === 0 ? "next" : "map"));
    if (mode === "over") return pick(3, i => emit("overChoice", ["continue", "retry", "map"][i]));
    if (mode === "play") { if (btn === "a") P.buffer = PH.buffer; if (btn === "start") { paused = true; menuSel = 0; emit("pause"); } }
  }
  function toMap() { mode = "map"; mapSel = Math.min(unlocked - 1, Math.max(0, level - 1)); }

  function fit() {
    const r = screen.getBoundingClientRect(), d = Math.min(3, devicePixelRatio || 1);
    screen.width = Math.round(r.width * d); screen.height = Math.round(r.width * d * VH / VW);
  }
  addEventListener("resize", fit); setTimeout(fit, 0);
  let lt = 0; (function loop(t) { const dt = Math.min(0.033, (t - lt) / 1000 || 0.016); lt = t; update(dt); render(); requestAnimationFrame(loop); })(0);

  return {
    on: (n, f) => hooks[n] = f, press, update, render, startLevel, toMap,
    load(s) { unlocked = s.unlocked || 1; stars = s.stars || {}; },
    continueRun() { hearts = CF.hearts; mode = "play"; spawnPlayer(); },
    nextLevel() { if (level < CF.levels) startLevel(level + 1); else toMap(); },
    pauseExternal() { if (mode === "play" && !paused) { paused = true; menuSel = 0; emit("pause"); } },
    get mode() { return mode; }, get paused() { return paused; }, get level() { return level; }, get player() { return P; }, get unlocked() { return unlocked; }, get stars() { return stars; },
    get coins() { return coins; }, get hearts() { return hearts; }, get cols() { return cols; }, get map() { return map; }, get ents() { return ents; }, get flagX() { return flag && flag.x; }
  };
})();

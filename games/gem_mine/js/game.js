/* ==========================================================================
   GEM MINE — match-3 engine
   Async resolve loop (swap → match → specials → gravity → cascade) driving a
   tweened canvas board. Holes, ice layers, 4 special gems + swap combos.
   ========================================================================== */
window.Game = (() => {
  const CF = window.GAME_CONFIG, SC = CF.scoring, COLS = CF.board.cols, ROWS = CF.board.rows;
  const W = 400, CELL = 46, BX = (W - COLS * CELL) / 2;
  let BY = 190, H = 760, zoom = 1, dpr = 1;
  const cv = document.getElementById("stage"), ctx = cv.getContext("2d");

  let grid = [], kinds = 5, busy = false, fast = false, over = true, paused = false;
  let moves = 0, score = 0, cascade = 0, level = 1, goal = null, progress = {}, selected = null, armed = null;
  let idle = 0, hint = null, t = 0, shake = 0;
  let shards = [], beams = [], rings = [], rays = [], texts = [], dust = [];
  const on = {}, emit = (n, d) => on[n] && on[n](d);
  const wait = ms => new Promise(r => setTimeout(r, fast ? 0 : ms));

  /* ---------------- level setup ---------------- */
  function rnd(seed) { return () => (seed = (seed * 48271) % 2147483647) / 2147483647; }
  function spec(n) {
    const r = rnd(n * 9973 + 11);
    const type = n === 1 ? "score" : ["score", "collect", "ice", "mixed"][(n - 1) % 4];
    const shape = CF.shapes[n < 4 ? 0 : Math.floor(r() * CF.shapes.length)];
    const k = n <= 3 ? 4 : n <= 18 ? 5 : 6;
    const mv = 18 + Math.floor(r() * 6) + Math.floor(n / 10) * 2;
    const g = { type, moves: mv, kinds: k, shape, target: 0, collect: {}, ice: [] };
    g.target = Math.round((4000 + n * 200) / 100) * 100;
    if (type === "collect" || type === "mixed") {
      const a = Math.floor(r() * k), b = (a + 1 + Math.floor(r() * (k - 1))) % k;
      g.collect[a] = 12 + Math.floor(n * 0.4); if (type === "collect") g.collect[b] = 9 + Math.floor(n * 0.35);
    }
    if (type === "ice" || type === "mixed") {
      const count = Math.min(40, 8 + n);
      for (let i = 0; i < count; i++) g.ice.push([Math.floor(r() * ROWS), Math.floor(r() * COLS), r() < Math.min(0.6, n / 60) ? 2 : 1]);
    }
    g.stars = [g.target, Math.round(g.target * 1.8), Math.round(g.target * 2.8)];
    return g;
  }

  function mkGem(kind, r, c, special = null) { return { kind, special, r, c, x: c, y: r, vy: 0, s: 1, born: t }; }
  const cell = (r, c) => r >= 0 && c >= 0 && r < ROWS && c < COLS ? grid[r][c] : null;
  const gemAt = (r, c) => { const k = cell(r, c); return k && !k.hole ? k.gem : null; };
  const same = (a, b) => a && b && a.special !== "prism" && b.special !== "prism" && a.kind === b.kind;

  function setup(n) {
    level = n; goal = spec(n); kinds = goal.kinds; moves = goal.moves; score = 0; cascade = 0;
    progress = { collect: Object.fromEntries(Object.keys(goal.collect).map(k => [k, 0])) };
    grid = Array.from({ length: ROWS }, (_, r) => Array.from({ length: COLS }, (_, c) => ({ hole: goal.shape[r][c] === "#", ice: 0, gem: null })));
    goal.ice.forEach(([r, c, v]) => { if (!grid[r][c].hole) grid[r][c].ice = Math.max(grid[r][c].ice, v); });
    progress.iceTotal = grid.flat().filter(k => k.ice).length;
    fillFresh();
    busy = false; over = false; paused = false; selected = null; armed = null; hint = null; idle = 0;
    shards = []; beams = []; rings = []; rays = []; texts = [];
    emit("hud");
  }
  function fillFresh() {
    for (let tries = 0; tries < 200; tries++) {
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        const k = grid[r][c]; if (k.hole) { k.gem = null; continue; }
        let kind, guard = 0;
        do { kind = Math.floor(Math.random() * kinds); guard++; }
        while (guard < 20 && ((same2(r, c - 1, r, c - 2, kind)) || (same2(r - 1, c, r - 2, c, kind))));
        k.gem = mkGem(kind, r, c); k.gem.y = r - ROWS - 1; // drop in from above
      }
      if (findRuns().length === 0 && findMove()) return;
    }
  }
  function same2(r1, c1, r2, c2, kind) { const a = gemAt(r1, c1), b = gemAt(r2, c2); return a && b && a.kind === kind && b.kind === kind && !a.special && !b.special; }

  /* ---------------- matching ---------------- */
  function findRuns() {
    const runs = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS;) {
      const g = gemAt(r, c); let e = c + 1;
      if (g && g.special !== "prism") while (same(g, gemAt(r, e))) e++;
      if (g && e - c >= 3) runs.push({ dir: "h", cells: Array.from({ length: e - c }, (_, i) => [r, c + i]) });
      c = e;
    }
    for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS;) {
      const g = gemAt(r, c); let e = r + 1;
      if (g && g.special !== "prism") while (same(g, gemAt(e, c))) e++;
      if (g && e - r >= 3) runs.push({ dir: "v", cells: Array.from({ length: e - r }, (_, i) => [r + i, c]) });
      r = e;
    }
    return runs;
  }
  function findMove() {
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) for (const [dr, dc] of [[0, 1], [1, 0]]) {
      const a = gemAt(r, c), b = gemAt(r + dr, c + dc); if (!a || !b) continue;
      if (a.special === "prism" || b.special === "prism" || (a.special && b.special)) return [[r, c], [r + dr, c + dc]];
      swapData(r, c, r + dr, c + dc); const ok = findRuns().length > 0; swapData(r, c, r + dr, c + dc);
      if (ok) return [[r, c], [r + dr, c + dc]];
    }
    return null;
  }
  function swapData(r1, c1, r2, c2) {
    const a = grid[r1][c1].gem, b = grid[r2][c2].gem;
    grid[r1][c1].gem = b; grid[r2][c2].gem = a;
    if (a) { a.r = r2; a.c = c2; } if (b) { b.r = r1; b.c = c1; }
  }

  /* ---------------- clearing ---------------- */
  // Collects every cell hit (specials chain into more cells) and then removes them.
  function blastSet(start, swapped) {
    const hit = new Map(), queue = [...start];
    const add = (r, c, by) => { const k = cell(r, c); if (!k || k.hole) return; const key = r * COLS + c; if (!hit.has(key)) { hit.set(key, [r, c]); queue.push([r, c, by]); } };
    start.forEach(([r, c]) => hit.set(r * COLS + c, [r, c]));
    while (queue.length) {
      const [r, c] = queue.shift(), g = gemAt(r, c);
      if (!g || !g.special || g.fired) continue;
      g.fired = true;
      if (g.special === "h") { beams.push({ r, dir: "h", t: 0, color: CF.gems[g.kind].light }); for (let i = 0; i < COLS; i++) add(r, i); Sound.sfx("line"); }
      if (g.special === "v") { beams.push({ c, dir: "v", t: 0, color: CF.gems[g.kind].light }); for (let i = 0; i < ROWS; i++) add(i, c); Sound.sfx("line"); }
      if (g.special === "blast") { rings.push({ r, c, t: 0, rad: 1.6 }); for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) add(r + a, c + b); Sound.sfx("blast"); shake = 8; }
      if (g.special === "prism") {
        const counts = Array(kinds).fill(0); grid.flat().forEach(k => k.gem && !k.gem.special && counts[k.gem.kind]++);
        const kind = counts.indexOf(Math.max(...counts));
        prismClear(r, c, kind, add);
      }
    }
    return [...hit.values()];
  }
  function prismClear(r, c, kind, add) {
    Sound.sfx("prism");
    for (let a = 0; a < ROWS; a++) for (let b = 0; b < COLS; b++) { const g = gemAt(a, b); if (g && g.kind === kind && g.special !== "prism") { rays.push({ r, c, tr: a, tc: b, t: 0, color: CF.gems[kind].light }); add(a, b); } }
  }

  function removeCells(list, base) {
    let n = 0;
    for (const [r, c] of list) {
      const k = grid[r][c];
      if (k.ice) { k.ice--; Sound.sfx("ice"); spawnShards(r, c, "#bfe9ff", 6); }
      const g = k.gem; if (!g) continue;
      if (g.keep) { g.keep = false; continue; }   // freshly created special survives its own match
      n++;
      if (progress.collect[g.kind] !== undefined) progress.collect[g.kind]++;
      spawnShards(r, c, CF.gems[g.kind] ? CF.gems[g.kind].color : "#fff", 7);
      k.gem = null;
    }
    const pts = Math.round((base + Math.max(0, n - 3) * SC.perSpecialCell) * (1 + cascade * SC.cascadeBonus));
    score += pts;
    if (list.length) { const [r, c] = list[Math.floor(list.length / 2)]; texts.push({ x: BX + (c + 0.5) * CELL, y: BY + (r + 0.5) * CELL, s: "+" + pts, t: 0 }); }
    emit("hud");
    return n;
  }

  function gravity() {
    for (let c = 0; c < COLS; c++) {
      const live = []; for (let r = 0; r < ROWS; r++) if (!grid[r][c].hole) live.push(r);
      const gems = live.map(r => grid[r][c].gem).filter(Boolean);
      live.forEach(r => grid[r][c].gem = null);
      let i = live.length - 1;
      for (let j = gems.length - 1; j >= 0; j--, i--) { const r = live[i]; grid[r][c].gem = gems[j]; gems[j].r = r; gems[j].c = c; }
      let spawn = 0;
      for (; i >= 0; i--, spawn++) { const r = live[i], g = mkGem(Math.floor(Math.random() * kinds), r, c); g.y = live[0] - 1 - spawn - 0.3; grid[r][c].gem = g; }
    }
  }
  async function settle() {
    if (fast) { grid.flat().forEach(k => { if (k.gem) { k.gem.x = k.gem.c; k.gem.y = k.gem.r; k.gem.vy = 0; } }); return; }
    for (let i = 0; i < 120; i++) { if (grid.flat().every(k => !k.gem || (Math.abs(k.gem.y - k.gem.r) < 0.01 && Math.abs(k.gem.x - k.gem.c) < 0.01))) return; await wait(16); }
  }

  // Turn a set of runs into specials + cleared cells.
  function resolveRuns(runs, focus) {
    const all = new Map(), creations = [];
    runs.forEach(run => run.cells.forEach(([r, c]) => all.set(r * COLS + c, [r, c])));
    const inRun = (run, r, c) => run.cells.some(([a, b]) => a === r && b === c);
    // L/T shapes: a cell shared by an h and v run
    const counted = new Set();
    runs.forEach(a => runs.forEach(b => {
      if (a === b || a.dir !== "h" || b.dir !== "v") return;
      const x = a.cells.find(([r, c]) => inRun(b, r, c)); if (!x) return;
      if (a.cells.length >= 5 || b.cells.length >= 5) return;
      creations.push({ at: x, special: "blast", kind: gemAt(...x).kind }); counted.add(a); counted.add(b);
    }));
    runs.forEach(run => {
      if (counted.has(run) || run.cells.length < 4) return;
      const pick = (focus && focus.find(([r, c]) => inRun(run, r, c))) || run.cells[1];
      creations.push({ at: pick, special: run.cells.length >= 5 ? "prism" : run.dir === "h" ? "v" : "h", kind: gemAt(...pick).kind });
    });
    const biggest = Math.max(...runs.map(r => r.cells.length));
    const base = biggest >= 5 ? SC.match5 : biggest === 4 ? SC.match4 : SC.match3;
    return { cells: [...all.values()], creations, base, biggest };
  }

  async function cascadeLoop(focus) {
    cascade = 0;
    for (;;) {
      const runs = findRuns(); if (!runs.length) break;
      const res = resolveRuns(runs, focus);
      Sound.sfx("match", cascade, res.cells.length);
      const hits = blastSet(res.cells);
      removeCells(hits, res.base);
      res.creations.forEach(cr => {
        const [r, c] = cr.at; const g = mkGem(cr.kind, r, c, cr.special); g.s = 1.6; grid[r][c].gem = g; Sound.sfx("special");
      });
      if (cascade >= 2) texts.push({ x: W / 2, y: BY - 20, s: ["", "", "Great!", "Brilliant!", "Dazzling!", "Mother lode!"][Math.min(5, cascade)] || "Mother lode!", t: 0, big: true });
      await wait(260);
      gravity(); await settle(); await wait(60);
      cascade++; focus = null;
    }
    // remove gems cleared by specials that left holes with no run (done in gravity), then check goals
  }

  async function comboSwap(a, b) {
    // both specials or a prism involved
    const A = gemAt(...a), B = gemAt(...b), [r, c] = b;
    let cells = [];
    const sp = [A.special, B.special].sort().join("+");
    if (A.special === "prism" && B.special === "prism") { grid.flat().forEach((k, i) => k.gem && cells.push([Math.floor(i / COLS), i % COLS])); Sound.sfx("prism"); shake = 14; }
    else if (A.special === "prism" || B.special === "prism") {
      const other = A.special === "prism" ? B : A, prism = A.special === "prism" ? A : B; prism.fired = true;
      cells.push([prism.r, prism.c]);
      if (other.special) {           // turn every gem of that colour into the same special, then fire them
        Sound.sfx("prism");
        grid.flat().forEach(k => { if (k.gem && k.gem.kind === other.kind && !k.gem.special) { k.gem.special = other.special === "blast" ? "blast" : Math.random() < 0.5 ? "h" : "v"; cells.push([k.gem.r, k.gem.c]); } });
        cells.push([other.r, other.c]);
        await wait(300);
      } else prismClear(prism.r, prism.c, other.kind, (x, y) => cells.push([x, y]));
    } else if (sp === "h+h" || sp === "h+v" || sp === "v+v") { A.fired = B.fired = true; beams.push({ r, dir: "h", t: 0, color: "#fff" }, { c, dir: "v", t: 0, color: "#fff" }); for (let i = 0; i < COLS; i++) cells.push([r, i]); for (let i = 0; i < ROWS; i++) cells.push([i, c]); Sound.sfx("line"); }
    else if (sp === "blast+blast") { A.fired = B.fired = true; rings.push({ r, c, t: 0, rad: 2.8 }); for (let x = -2; x <= 2; x++) for (let y = -2; y <= 2; y++) cells.push([r + x, c + y]); Sound.sfx("blast"); shake = 14; }
    else { A.fired = B.fired = true; rings.push({ r, c, t: 0, rad: 1.6 }); for (let x = -1; x <= 1; x++) { beams.push({ r: r + x, dir: "h", t: 0, color: "#ffe08a" }, { c: c + x, dir: "v", t: 0, color: "#ffe08a" }); for (let i = 0; i < COLS; i++) cells.push([r + x, i]); for (let i = 0; i < ROWS; i++) cells.push([i, c + x]); } Sound.sfx("blast"); shake = 12; }
    cells = cells.filter(([x, y]) => cell(x, y) && !cell(x, y).hole);
    removeCells(blastSet(cells), SC.match5);
    await wait(320); gravity(); await settle();
    await cascadeLoop(null);
  }

  /* ---------------- turn flow ---------------- */
  async function trySwap(a, b) {
    if (busy || over || paused) return;
    const A = gemAt(...a), B = gemAt(...b); if (!A || !B) return;
    busy = true; selected = null; hint = null; idle = 0;
    Sound.sfx("swap");
    swapData(a[0], a[1], b[0], b[1]); await settle(); await wait(fast ? 0 : 20);
    const combo = A.special === "prism" || B.special === "prism" || (A.special && B.special);
    if (combo) { moves--; emit("hud"); await comboSwap(b, a); }
    else if (findRuns().length) { moves--; emit("hud"); await cascadeLoop([a, b]); }
    else { Sound.sfx("bad"); swapData(a[0], a[1], b[0], b[1]); await settle(); busy = false; return; }
    await afterTurn();
  }
  async function afterTurn() {
    if (goalDone()) return finale();
    if (moves <= 0) { over = true; busy = false; Sound.sfx("lose"); emit("lost", { level, score }); return; }
    if (!findMove()) { texts.push({ x: W / 2, y: BY + 4 * CELL, s: "No moves — shuffling", t: 0, big: true }); await wait(500); await shuffle(); }
    busy = false;
  }
  function goalDone() {
    if (goal.type === "score" && score < goal.target) return false;
    for (const k in goal.collect) if (progress.collect[k] < goal.collect[k]) return false;
    if ((goal.type === "ice" || goal.type === "mixed") && grid.flat().some(k => k.ice)) return false;
    return true;
  }
  async function finale() {
    over = true;
    texts.push({ x: W / 2, y: BY + 3.5 * CELL, s: "Goal complete!", t: 0, big: true });
    Sound.sfx("win");
    await wait(700);
    // every move left becomes a line gem that fires
    while (moves > 0) {
      moves--; emit("hud");
      const pool = grid.flat().filter(k => k.gem && !k.gem.special); if (!pool.length) break;
      const g = pool[Math.floor(Math.random() * pool.length)].gem; g.special = Math.random() < 0.5 ? "h" : "v"; g.s = 1.6;
      score += 50; await wait(140);
      removeCells(blastSet([[g.r, g.c]]), 0); await wait(fast ? 0 : 160); gravity(); await settle();
    }
    await cascadeLoop(null);
    const stars = score >= goal.stars[2] ? 3 : score >= goal.stars[1] ? 2 : 1;
    busy = false;
    emit("won", { level, score, stars, coins: stars * CF.coinsPerStar });
  }
  async function shuffle() {
    const gems = grid.flat().filter(k => k.gem).map(k => k.gem);
    for (let tries = 0; tries < 100; tries++) {
      const kindsArr = gems.map(g => [g.kind, g.special]);
      for (let i = kindsArr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [kindsArr[i], kindsArr[j]] = [kindsArr[j], kindsArr[i]]; }
      gems.forEach((g, i) => { [g.kind, g.special] = kindsArr[i]; g.s = 0.2; });
      if (!findRuns().length && findMove()) break;
      if (tries > 60) gems.forEach(g => { g.kind = Math.floor(Math.random() * kinds); g.special = null; });
    }
    await wait(300);
  }

  /* ---------------- boosters ---------------- */
  async function useBooster(id, r, c) {
    if (busy || over) return false;
    if (id === "shuffle") { busy = true; await shuffle(); busy = false; return true; }
    const g = gemAt(r, c); if (!g) return false;
    busy = true;
    if (id === "pick") { spawnShards(r, c, "#d9d2c3", 12); removeCells(blastSet([[r, c]]), 30); shake = 4; Sound.sfx("blast"); }
    if (id === "dynamite") { rings.push({ r, c, t: 0, rad: 1.6 }); const cells = []; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) if (cell(r + a, c + b) && !cell(r + a, c + b).hole) cells.push([r + a, c + b]); removeCells(blastSet(cells), 120); shake = 10; Sound.sfx("blast"); }
    await wait(250); gravity(); await settle(); await cascadeLoop(null);
    await afterTurn();
    return true;
  }

  /* ---------------- input ---------------- */
  function pick(e) {
    const b = cv.getBoundingClientRect(), x = (e.clientX - b.left) / b.width * W, y = (e.clientY - b.top) / b.height * H;
    const c = Math.floor((x - BX) / CELL), r = Math.floor((y - BY) / CELL);
    return { r, c, x, y, ok: !!gemAt(r, c) };
  }
  let down = null;
  cv.addEventListener("pointerdown", e => {
    if (over || paused) return;
    const p = pick(e); if (!p.ok) { selected = null; return; }
    if (armed) { const id = armed; armed = null; emit("armed", null); useBooster(id, p.r, p.c).then(ok => emit("boosterUsed", { id, ok })); return; }
    if (busy) return;
    if (selected && Math.abs(selected[0] - p.r) + Math.abs(selected[1] - p.c) === 1) { const s = selected; selected = null; trySwap(s, [p.r, p.c]); return; }
    selected = [p.r, p.c]; down = p; Sound.sfx("tap");
  });
  window.addEventListener("pointermove", e => {
    if (!down || busy) return;
    const p = pick(e), dx = p.x - down.x, dy = p.y - down.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) > CELL * 0.4) {
      const to = Math.abs(dx) > Math.abs(dy) ? [down.r, down.c + Math.sign(dx)] : [down.r + Math.sign(dy), down.c];
      const from = [down.r, down.c]; down = null; selected = null;
      if (gemAt(...to)) trySwap(from, to);
    }
  });
  window.addEventListener("pointerup", () => down = null);
  window.addEventListener("keydown", e => { if (e.key === "Escape" || e.key === "p") emit("pauseKey"); });

  /* ---------------- effects ---------------- */
  function spawnShards(r, c, color, n) {
    const x = BX + (c + 0.5) * CELL, y = BY + (r + 0.5) * CELL;
    for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, s = 80 + Math.random() * 220; shards.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 12, sz: 3 + Math.random() * 5, t: 0, color }); }
  }

  /* ---------------- update ---------------- */
  function update(dt) {
    t += dt;
    if (paused) return;
    for (const row of grid) for (const k of row) {
      const g = k.gem; if (!g) continue;
      g.x += (g.c - g.x) * Math.min(1, dt * 16);
      if (g.y < g.r) { g.vy += 38 * dt; g.y = Math.min(g.r, g.y + g.vy * dt); if (g.y >= g.r) { g.vy = 0; g.s = 0.86; } }
      else if (g.y > g.r) { g.y += (g.r - g.y) * Math.min(1, dt * 16); }
      g.s += (1 - g.s) * Math.min(1, dt * 9);
    }
    if (!busy && !over) { idle += dt; if (idle > 6 && !hint) hint = findMove(); }
    shards.forEach(p => { p.t += dt; p.vy += 700 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; }); shards = shards.filter(p => p.t < 0.9);
    beams.forEach(b => b.t += dt); beams = beams.filter(b => b.t < 0.35);
    rings.forEach(b => b.t += dt); rings = rings.filter(b => b.t < 0.45);
    rays.forEach(b => b.t += dt); rays = rays.filter(b => b.t < 0.45);
    texts.forEach(b => b.t += dt); texts = texts.filter(b => b.t < 1.1);
    dust.forEach(d => { d.y += d.v * dt; d.x += Math.sin(t + d.p) * 6 * dt; if (d.y > H) { d.y = -5; d.x = Math.random() * W; } });
    shake = Math.max(0, shake - dt * 30);
  }

  /* ---------------- drawing ---------------- */
  const gemCache = {};
  function gemSprite(kind) {
    if (gemCache[kind]) return gemCache[kind];
    const G = CF.gems[kind], s = 96, c = document.createElement("canvas"); c.width = c.height = s;
    const x = c.getContext("2d"), m = s / 2, R = s * 0.42;
    const n = G.sides || 16, rot = G.sides === 4 ? 0 : G.sides === 3 ? -Math.PI / 2 : -Math.PI / 2 + Math.PI / n;
    const pts = (rad, sx = 1, sy = 1) => Array.from({ length: n }, (_, i) => { const a = rot + i * 2 * Math.PI / n; return [m + Math.cos(a) * rad * sx, m + Math.sin(a) * rad * sy + (G.sides === 3 ? rad * 0.18 : 0)]; });
    const outer = G.rect ? [[m - R * 0.75, m - R], [m + R * 0.75, m - R], [m + R * 0.95, m - R * 0.8], [m + R * 0.95, m + R * 0.8], [m + R * 0.75, m + R], [m - R * 0.75, m + R], [m - R * 0.95, m + R * 0.8], [m - R * 0.95, m - R * 0.8]] : pts(R);
    const inner = outer.map(([a, b]) => [m + (a - m) * 0.5, m + (b - m) * 0.5 - R * 0.06]);
    x.shadowColor = "rgba(0,0,0,.5)"; x.shadowBlur = 8; x.shadowOffsetY = 4;
    x.fillStyle = G.dark; poly(x, outer); x.fill(); x.shadowColor = "transparent";
    // facets: alternate light and dark wedges between the outer and inner outline
    for (let i = 0; i < outer.length; i++) {
      const j = (i + 1) % outer.length;
      const lg = x.createLinearGradient(outer[i][0], outer[i][1], inner[j][0], inner[j][1]);
      const ang = Math.atan2((outer[i][1] + outer[j][1]) / 2 - m, (outer[i][0] + outer[j][0]) / 2 - m);
      const lit = Math.cos(ang + 2.3);                  // light from the top-left
      lg.addColorStop(0, lit > 0.3 ? G.light : lit > -0.3 ? G.color : G.dark); lg.addColorStop(1, G.color);
      x.fillStyle = lg; poly(x, [outer[i], outer[j], inner[j], inner[i]]); x.fill();
      x.strokeStyle = "rgba(255,255,255,.18)"; x.lineWidth = 1; x.stroke();
    }
    const tg = x.createLinearGradient(m - R * 0.5, m - R * 0.5, m + R * 0.5, m + R * 0.5);
    tg.addColorStop(0, G.light); tg.addColorStop(1, G.color);
    x.fillStyle = tg; poly(x, inner); x.fill();
    x.fillStyle = "rgba(255,255,255,.75)"; x.beginPath(); x.ellipse(m - R * 0.28, m - R * 0.34, R * 0.16, R * 0.08, -0.7, 0, 7); x.fill();
    return gemCache[kind] = c;
  }
  function poly(x, p) { x.beginPath(); p.forEach(([a, b], i) => i ? x.lineTo(a, b) : x.moveTo(a, b)); x.closePath(); }

  let wall = null;
  function wallSprite() {
    if (wall && wall.height === Math.ceil(H)) return wall;
    wall = document.createElement("canvas"); wall.width = W; wall.height = Math.ceil(H);
    const x = wall.getContext("2d"), r = rnd(5);
    const gr = x.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, "#2a1b12"); gr.addColorStop(1, "#120b07");
    x.fillStyle = gr; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 260; i++) { x.fillStyle = `rgba(${r() < 0.5 ? "255,220,180" : "0,0,0"},${0.03 + r() * 0.06})`; const s = 4 + r() * 30; x.beginPath(); x.ellipse(r() * W, r() * H, s, s * 0.6, r() * 3, 0, 7); x.fill(); }
    // ore veins
    for (let i = 0; i < 18; i++) { x.fillStyle = ["#e0314b", "#2f6fe4", "#1fb36b", "#f2a81d"][i % 4]; x.globalAlpha = 0.25; x.beginPath(); x.arc(r() * W, r() * H, 1.5 + r() * 2.5, 0, 7); x.fill(); }
    x.globalAlpha = 1;
    // timber supports
    const beam = (bx, by, bw, bh) => { const lg = x.createLinearGradient(bx, by, bx + bw, by); lg.addColorStop(0, "#5a3a22"); lg.addColorStop(0.5, "#7a5232"); lg.addColorStop(1, "#4a2f1b"); x.fillStyle = lg; x.fillRect(bx, by, bw, bh); x.strokeStyle = "rgba(0,0,0,.35)"; x.lineWidth = 1; for (let i = 0; i < 5; i++) { x.beginPath(); x.moveTo(bx + 3 + i * bw / 5, by); x.lineTo(bx + 3 + i * bw / 5 + 2, by + bh); x.stroke(); } };
    beam(0, 0, 14, H); beam(W - 14, 0, 14, H);
    const lg = x.createLinearGradient(0, 120, 0, 140); lg.addColorStop(0, "#7a5232"); lg.addColorStop(1, "#4a2f1b"); x.fillStyle = lg; x.fillRect(0, 128, W, 18);
    return wall;
  }
  function lantern(lx, ly) {
    const f = 0.85 + Math.sin(t * 9 + lx) * 0.05 + Math.sin(t * 23) * 0.03;
    const glow = ctx.createRadialGradient(lx, ly, 4, lx, ly, 150 * f);
    glow.addColorStop(0, "rgba(255,190,90,.38)"); glow.addColorStop(1, "rgba(255,150,50,0)");
    ctx.fillStyle = glow; ctx.fillRect(lx - 160, ly - 160, 320, 320);
    ctx.strokeStyle = "#2a1b12"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(lx, 146); ctx.lineTo(lx, ly - 12); ctx.stroke();
    ctx.fillStyle = "#3a2a1a"; ctx.fillRect(lx - 9, ly - 13, 18, 4); ctx.fillRect(lx - 9, ly + 10, 18, 4);
    ctx.fillStyle = `rgba(255,${190 + f * 30},110,.95)`; ctx.fillRect(lx - 7, ly - 9, 14, 19);
  }
  function drawBoard() {
    const bw = COLS * CELL, bh = ROWS * CELL;
    // brass frame with rivets
    ctx.fillStyle = "#1b120c"; ctx.fillRect(BX - 10, BY - 10, bw + 20, bh + 20);
    const fg = ctx.createLinearGradient(0, BY - 10, 0, BY + bh + 10); fg.addColorStop(0, "#e3b864"); fg.addColorStop(0.5, "#9c6f2c"); fg.addColorStop(1, "#d7a650");
    ctx.strokeStyle = fg; ctx.lineWidth = 6; ctx.strokeRect(BX - 7, BY - 7, bw + 14, bh + 14);
    ctx.fillStyle = "#f6d68c"; [[BX - 7, BY - 7], [BX + bw + 7, BY - 7], [BX - 7, BY + bh + 7], [BX + bw + 7, BY + bh + 7]].forEach(([a, b]) => { ctx.beginPath(); ctx.arc(a, b, 5, 0, 7); ctx.fill(); });
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const k = grid[r] && grid[r][c]; if (!k) continue;
      const x = BX + c * CELL, y = BY + r * CELL;
      if (k.hole) { ctx.fillStyle = "#0c0705"; ctx.fillRect(x, y, CELL, CELL); continue; }
      ctx.fillStyle = (r + c) % 2 ? "#3b2c22" : "#33261d"; ctx.fillRect(x, y, CELL, CELL);
      ctx.fillStyle = "rgba(255,255,255,.035)"; ctx.fillRect(x, y, CELL, 2);
    }
  }
  function drawIce() {
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const k = grid[r][c]; if (!k.ice) continue;
      const x = BX + c * CELL, y = BY + r * CELL;
      ctx.fillStyle = k.ice > 1 ? "rgba(170,225,255,.55)" : "rgba(170,225,255,.3)"; ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
      ctx.strokeStyle = "rgba(255,255,255,.6)"; ctx.lineWidth = 1.2; ctx.strokeRect(x + 2.5, y + 2.5, CELL - 5, CELL - 5);
      if (k.ice > 1) { ctx.beginPath(); ctx.moveTo(x + 8, y + 10); ctx.lineTo(x + 20, y + 22); ctx.lineTo(x + 16, y + 34); ctx.moveTo(x + 20, y + 22); ctx.lineTo(x + 36, y + 18); ctx.stroke(); }
    }
  }
  function drawGem(g) {
    const cx0 = BX + (g.x + 0.5) * CELL, cy0 = BY + (g.y + 0.5) * CELL;
    if (cy0 < BY - CELL * 0.2) return;             // above the board while dropping in
    let s = g.s * CELL * 0.98;
    const isSel = selected && selected[0] === g.r && selected[1] === g.c;
    const isHint = hint && hint.some(([r, c]) => r === g.r && c === g.c);
    if (isSel) s *= 1.08 + Math.sin(t * 10) * 0.03;
    if (isHint) s *= 1 + Math.abs(Math.sin(t * 5)) * 0.1;
    if (g.special === "prism") {
      ctx.save(); ctx.translate(cx0, cy0); ctx.rotate(t * 1.5);
      for (let i = 0; i < 6; i++) { ctx.fillStyle = `hsl(${i * 60 + t * 90},85%,62%)`; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, s * 0.42, i * 1.047, (i + 1) * 1.047); ctx.fill(); }
      ctx.fillStyle = "rgba(255,255,255,.9)"; ctx.beginPath(); ctx.arc(0, 0, s * 0.16, 0, 7); ctx.fill();
      ctx.restore(); return;
    }
    if (g.special === "blast") {
      const pg = ctx.createRadialGradient(cx0, cy0, 2, cx0, cy0, s * 0.62);
      pg.addColorStop(0, "rgba(255,210,120,.0)"); pg.addColorStop(0.7, `rgba(255,170,60,${0.35 + Math.sin(t * 6) * 0.15})`); pg.addColorStop(1, "rgba(255,120,40,0)");
      ctx.fillStyle = pg; ctx.fillRect(cx0 - s, cy0 - s, s * 2, s * 2);
    }
    ctx.drawImage(gemSprite(g.kind), cx0 - s / 2, cy0 - s / 2, s, s);
    if (g.special === "h" || g.special === "v") {
      ctx.save(); ctx.translate(cx0, cy0); if (g.special === "v") ctx.rotate(Math.PI / 2);
      ctx.fillStyle = "rgba(255,240,200,.9)";
      for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(d * s * 0.46, 0); ctx.lineTo(d * s * 0.3, -s * 0.12); ctx.lineTo(d * s * 0.3, s * 0.12); ctx.fill(); }
      ctx.fillRect(-s * 0.3, -1.5, s * 0.6, 3);
      ctx.restore();
    }
    if (isSel) { ctx.strokeStyle = "#ffe08a"; ctx.lineWidth = 2.5; ctx.strokeRect(BX + g.c * CELL + 3, BY + g.r * CELL + 3, CELL - 6, CELL - 6); }
  }
  function draw() {
    ctx.setTransform(zoom * dpr, 0, 0, zoom * dpr, 0, 0);
    ctx.drawImage(wallSprite(), 0, 0);
    lantern(70, 176); lantern(W - 70, 176);
    ctx.save();
    if (shake) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    if (grid.length) {
      drawBoard();
      ctx.save(); ctx.beginPath(); ctx.rect(BX, BY, COLS * CELL, ROWS * CELL); ctx.clip();
      grid.forEach(row => row.forEach(k => k.gem && drawGem(k.gem)));
      ctx.restore();
      drawIce();
      beams.forEach(b => {
        const a = 1 - b.t / 0.35; ctx.fillStyle = b.color; ctx.globalAlpha = a;
        if (b.dir === "h") ctx.fillRect(BX, BY + b.r * CELL + CELL / 2 - 10 * a, COLS * CELL, 20 * a);
        else ctx.fillRect(BX + b.c * CELL + CELL / 2 - 10 * a, BY, 20 * a, ROWS * CELL);
        ctx.globalAlpha = 1;
      });
      rings.forEach(b => { const f = b.t / 0.45; ctx.strokeStyle = `rgba(255,200,110,${1 - f})`; ctx.lineWidth = 10 * (1 - f); ctx.beginPath(); ctx.arc(BX + (b.c + 0.5) * CELL, BY + (b.r + 0.5) * CELL, CELL * b.rad * (0.3 + f), 0, 7); ctx.stroke(); });
      rays.forEach(b => { ctx.strokeStyle = b.color; ctx.globalAlpha = 1 - b.t / 0.45; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(BX + (b.c + 0.5) * CELL, BY + (b.r + 0.5) * CELL); ctx.lineTo(BX + (b.tc + 0.5) * CELL, BY + (b.tr + 0.5) * CELL); ctx.stroke(); ctx.globalAlpha = 1; });
    }
    shards.forEach(p => { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.globalAlpha = Math.max(0, 1 - p.t / 0.9); ctx.fillStyle = p.color; ctx.beginPath(); ctx.moveTo(0, -p.sz); ctx.lineTo(p.sz * 0.7, p.sz * 0.6); ctx.lineTo(-p.sz * 0.7, p.sz * 0.6); ctx.fill(); ctx.restore(); });
    ctx.textAlign = "center";
    texts.forEach(b => {
      ctx.globalAlpha = Math.max(0, 1 - b.t / 1.1); ctx.font = b.big ? "700 30px Georgia,'Palatino Linotype',serif" : "700 18px Georgia,serif";
      ctx.lineWidth = 5; ctx.strokeStyle = "#2a1406"; ctx.fillStyle = b.big ? "#ffd36b" : "#fff3d6";
      const y = b.y - b.t * 30; ctx.strokeText(b.s, b.x, y); ctx.fillText(b.s, b.x, y);
    });
    ctx.globalAlpha = 1;
    ctx.fillStyle = "rgba(255,220,170,.4)"; dust.forEach(d => ctx.fillRect(d.x, d.y, 1.5, 1.5));
    ctx.restore();
  }

  function fit() {
    const vw = Math.max(1, innerWidth), vh = Math.max(1, innerHeight);
    H = Math.max(640, Math.min(900, W * vh / vw)); zoom = Math.min(vw / W, vh / H); dpr = Math.min(2, devicePixelRatio || 1);
    BY = Math.max(176, (H - ROWS * CELL) / 2 + 20);
    cv.width = Math.round(W * zoom * dpr); cv.height = Math.round(H * zoom * dpr);
    cv.style.width = W * zoom + "px"; cv.style.height = H * zoom + "px";
  }
  addEventListener("resize", fit); fit();
  for (let i = 0; i < 40; i++) dust.push({ x: Math.random() * W, y: Math.random() * H, v: 5 + Math.random() * 12, p: Math.random() * 6 });
  let last = 0;
  (function loop(ts) { const dt = Math.min(0.033, (ts - last) / 1000 || 0.016); last = ts; update(dt); draw(); requestAnimationFrame(loop); })(0);

  return {
    on: (n, f) => on[n] = f, setup, trySwap, useBooster, findMove, update, draw, spec,
    arm(id) { if (busy || over) return false; armed = id; return true; }, disarm() { armed = null; },
    pause() { paused = true; }, resume() { paused = false; },
    addMoves(n) { moves += n; over = false; busy = false; emit("hud"); },
    quit() { over = true; grid = []; },
    set fast(v) { fast = v; },
    get busy() { return busy; }, get over() { return over; }, get moves() { return moves; }, get score() { return score; },
    get goal() { return goal; }, get progress() { return progress; }, get level() { return level; }, get grid() { return grid; },
    iceLeft: () => grid.flat().filter(k => k.ice).length
  };
})();

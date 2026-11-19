/* TILE TRIO — rules (no drawing): layouts, which tiles are free, the level generator, and the moves.
   Positions are in half-tile units: a tile covers x..x+2, y..y+2 on layer z. A tile is free when no
   tile on a higher layer overlaps it.
   SOLVABLE BY CONSTRUCTION: a legal pick order is played out, pictures are dealt in threes along it,
   then a smart-player simulation is run and pictures are swapped so that player has to work harder
   (fills the tray more) — but only while it still clears the level without the tray ever holding more
   than the step's cap (always below traySlots). Its winning order is kept as level.order. */
window.Rules = (() => {
  const C = window.GAME_CONFIG;
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const step = n => C.levels.curve.find(s => n <= s.upTo) || C.levels.curve[C.levels.curve.length - 1];
  const isHard = n => C.levels.hardEvery > 0 && n % C.levels.hardEvery === 0;

  /* ---------- layouts ---------- */
  const MASKS = {
    rect: () => true,
    diamond: (u, v) => Math.abs(u) + Math.abs(v) <= 1.25,
    circle: (u, v) => u * u + v * v <= 1.15,
    heart: (u, v) => { const x = u * 1.15, y = -v * 1.15 + 0.15; return (x * x + y * y - 1) ** 3 - x * x * y * y * y <= 0; },
    cross: (u, v) => Math.abs(u) < 0.45 || Math.abs(v) < 0.42,
    ring: (u, v) => { const r = Math.hypot(u, v); return r > 0.38 && r <= 1.15; }
  };
  const SHAPES = Object.keys(MASKS);
  const covers = (b, a) => b.z > a.z && Math.abs(b.x - a.x) < 2 && Math.abs(b.y - a.y) < 2;

  function layout(R, want, layers) {
    // grid size (in tiles) grows with the tile count
    const cols = want <= 24 ? 5 : want <= 50 ? 6 : 7, rows = want <= 24 ? 5 : want <= 50 ? 7 : 8;
    const shape = want <= 24 ? (R() < 0.5 ? "rect" : "diamond") : SHAPES[Math.floor(R() * SHAPES.length)];
    const mask = MASKS[shape], tiles = [];
    // tiles per layer: lower layers hold more
    const weights = Array.from({ length: layers }, (_, k) => layers - k * 0.6), wsum = weights.reduce((a, b) => a + b, 0);
    for (let z = 0; z < layers; z++) {
      const off = z % 2, scale = 1 - z * 0.1, need = Math.round(want * weights[z] / wsum);
      // candidate spots, as mirrored pairs (left / right) so the pile looks balanced
      const pairs = [];
      const xs = []; for (let x = off; x <= 2 * cols - 2; x += 2) xs.push(x);
      const ys = []; for (let y = off; y <= 2 * rows - 2; y += 2) ys.push(y);
      for (const y of ys) for (const x of xs) {
        const mx = 2 * cols - 2 - x; if (x > mx) continue;
        const u = (x - (cols - 1)) / ((cols - 1) * scale), v = (y - (rows - 1)) / ((rows - 1) * scale);
        if (Math.abs(u) > 1.02 || Math.abs(v) > 1.02 || !mask(u, v)) continue;
        // upper layers must sit on something
        if (z > 0 && !tiles.some(t => t.z === z - 1 && Math.abs(t.x - x) < 2 && Math.abs(t.y - y) < 2)) continue;
        pairs.push(x === mx ? [[x, y]] : [[x, y], [mx, y]]);
      }
      for (let i = pairs.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [pairs[i], pairs[j]] = [pairs[j], pairs[i]]; }
      let got = 0;
      for (const p of pairs) { if (got >= need) break; for (const [x, y] of p) tiles.push({ x, y, z }); got += p.length; }
    }
    // make the count a multiple of 3 by dropping top tiles
    tiles.sort((a, b) => a.z - b.z);
    while (tiles.length % 3) tiles.pop();
    return { tiles, cols, rows, shape };
  }

  /* ---------- smart player (generator + bot): which free tile to take ---------- */
  function smartPick(free, kinds, trayCount, freeByKind, layerOf) {
    let best = -1, bv = -1e9;
    for (const i of free) {
      const k = kinds[i], inTray = trayCount[k] || 0, freeSame = freeByKind[k] || 0;
      let v = inTray === 2 ? 1000 : inTray === 1 ? (freeSame >= 2 ? 500 : 300) : freeSame >= 3 ? 200 : freeSame >= 2 ? 100 : 0;
      v += layerOf(i) * 2 - i * 0.0001;
      if (v > bv) { bv = v; best = i; }
    }
    return best;
  }
  // play the smart player on a level; returns { ok, peak, avg, order }
  function simulate(tiles, kinds, cap) {
    const n = tiles.length, cnt = new Int16Array(n), above = tiles.map(() => []);
    for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) if (covers(tiles[b], tiles[a])) { cnt[a]++; above[b].push(a); }
    const gone = new Uint8Array(n), trayCount = {}, order = []; let tray = 0, peak = 0, sum = 0;
    for (let s = 0; s < n; s++) {
      const free = [], freeByKind = {};
      for (let i = 0; i < n; i++) if (!gone[i] && cnt[i] === 0) { free.push(i); freeByKind[kinds[i]] = (freeByKind[kinds[i]] || 0) + 1; }
      if (!free.length) return { ok: false };
      const i = smartPick(free, kinds, trayCount, freeByKind, j => tiles[j].z);
      gone[i] = 1; order.push(i); for (const a of above[i]) cnt[a]--;
      const k = kinds[i]; trayCount[k] = (trayCount[k] || 0) + 1; tray++;
      if (trayCount[k] === 3) { trayCount[k] = 0; tray -= 3; }
      peak = Math.max(peak, tray); sum += tray;
      if (tray > cap) return { ok: false, peak: tray };
    }
    return { ok: true, peak, avg: sum / n, order };
  }

  /* ---------- the generator ---------- */
  const cache = {};
  function level(n) {
    if (cache[n]) return cache[n];
    const st = step(n), hard = isHard(n), set = C.sets[(n - 1) % C.sets.length];
    const kindsN = Math.min(set.tiles.length, st.kinds + (hard ? 1 : 0)), cap = Math.min(C.traySlots - 1, st.cap);
    for (let attempt = 0; attempt < 40; attempt++) {
      const R = rng(C.levels.seed * 7919 + n * 104729 + attempt * 13);
      const L = layout(R, st.tiles + (hard ? 15 : 0), st.layers + (hard ? 1 : 0));
      const tiles = L.tiles, N = tiles.length;
      if (N < 9) continue;
      // a random legal pick order, then pictures dealt in threes along it
      const cnt = tiles.map(a => tiles.filter(b => covers(b, a)).length), gone = new Uint8Array(N), order = [];
      for (let s = 0; s < N; s++) {
        const free = []; for (let i = 0; i < N; i++) if (!gone[i] && cnt[i] === 0) free.push(i);
        free.sort((a, b) => tiles[b].z - tiles[a].z);
        const i = free[Math.min(free.length - 1, Math.floor(R() * R() * free.length))];
        gone[i] = 1; order.push(i); for (let a = 0; a < N; a++) if (covers(tiles[i], tiles[a])) cnt[a]--;
      }
      const groupKinds = []; for (let g = 0; g < N / 3; g++) groupKinds.push(g % kindsN);
      for (let i = groupKinds.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [groupKinds[i], groupKinds[j]] = [groupKinds[j], groupKinds[i]]; }
      const kinds = new Array(N); order.forEach((t, i) => kinds[t] = groupKinds[Math.floor(i / 3)]);
      let cur = simulate(tiles, kinds, cap);
      if (!cur.ok) continue;
      // squeeze: swap pictures while the smart player still wins within the cap, keep harder versions
      const score = r => r.peak * 10 + r.avg * 5;
      for (let it = 0, iters = Math.floor(st.squeeze * (60 + N * 5)); it < iters; it++) {
        const i = Math.floor(R() * N), j = Math.floor(R() * N);
        if (kinds[i] === kinds[j]) continue;
        [kinds[i], kinds[j]] = [kinds[j], kinds[i]];
        const r = simulate(tiles, kinds, cap);
        if (r.ok && score(r) >= score(cur) - (R() < 0.1 ? 4 : 0)) cur = r; else [kinds[i], kinds[j]] = [kinds[j], kinds[i]];
      }
      const lvl = { n, hard, set: set.id, cols: L.cols, rows: L.rows, shape: L.shape, tiles: tiles.map((t, i) => ({ ...t, kind: kinds[i] })), kinds: kindsN, order: cur.order, peak: cur.peak, cap };
      return (cache[n] = lvl);
    }
    throw new Error("could not build level " + n);
  }

  /* ---------- live state + moves ---------- */
  function newState(L) {
    const tiles = L.tiles.map((t, i) => ({ ...t, id: i, at: "board" }));
    const st = { L, tiles, tray: [], shelf: Array(C.shelfSlots).fill(null), cnt: new Int16Array(tiles.length), above: tiles.map(() => []), hist: [], cleared: 0 };
    for (const a of tiles) for (const b of tiles) if (covers(b, a)) { st.cnt[a.id]++; st.above[b.id].push(a.id); }
    return st;
  }
  const isFree = (st, id) => { const t = st.tiles[id]; return t.at === "shelf" || (t.at === "board" && st.cnt[id] === 0); };
  function take(st, id) {
    const t = st.tiles[id];
    if (!isFree(st, id) || st.tray.length >= C.traySlots) return null;
    const from = t.at;
    if (from === "board") for (const a of st.above[id]) st.cnt[a]--;
    if (from === "shelf") st.shelf[st.shelf.indexOf(id)] = null;
    // slot right after the last tile with the same picture (keeps matches together)
    let at = st.tray.length; for (let i = st.tray.length - 1; i >= 0; i--) if (st.tiles[st.tray[i]].kind === t.kind) { at = i + 1; break; }
    st.tray.splice(at, 0, id); t.at = "tray";
    const same = st.tray.filter(x => st.tiles[x].kind === t.kind);
    let cleared = null;
    if (same.length >= 3) { cleared = same.slice(0, 3); st.tray = st.tray.filter(x => !cleared.includes(x)); cleared.forEach(x => st.tiles[x].at = "gone"); st.cleared += 3; }
    st.hist.push({ id, from, cleared: !!cleared });
    const won = st.tiles.every(x => x.at === "gone");
    const lost = !won && st.tray.length >= C.traySlots;
    return { at, cleared, won, lost, from };
  }
  function undo(st) {
    const h = st.hist[st.hist.length - 1];
    if (!h || h.cleared) return null;
    st.hist.pop();
    const t = st.tiles[h.id]; st.tray = st.tray.filter(x => x !== h.id);
    if (h.from === "board") { t.at = "board"; for (const a of st.above[h.id]) st.cnt[a]++; }
    else { const i = st.shelf.indexOf(null); st.shelf[i >= 0 ? i : 0] = h.id; t.at = "shelf"; }
    return h.id;
  }
  function pop(st) {
    const free = st.shelf.filter(x => x === null).length; if (!free || !st.tray.length) return null;
    const moved = st.tray.splice(0, Math.min(free, st.tray.length));
    for (const id of moved) { const i = st.shelf.indexOf(null); st.shelf[i] = id; st.tiles[id].at = "shelf"; }
    st.hist = [];
    return moved;
  }
  function shuffle(st, R = Math.random) {
    const ids = st.tiles.filter(t => t.at === "board").map(t => t.id), ks = ids.map(i => st.tiles[i].kind);
    for (let i = ks.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [ks[i], ks[j]] = [ks[j], ks[i]]; }
    ids.forEach((id, i) => st.tiles[id].kind = ks[i]); st.hist = [];
    return ids;
  }
  function botPick(st) {
    const free = [], freeByKind = {}, trayCount = {};
    for (const t of st.tiles) if (isFree(st, t.id)) { free.push(t.id); freeByKind[t.kind] = (freeByKind[t.kind] || 0) + 1; }
    for (const id of st.tray) { const k = st.tiles[id].kind; trayCount[k] = (trayCount[k] || 0) + 1; }
    if (!free.length) return -1;
    const kinds = st.tiles.map(t => t.kind);
    return smartPick(free, kinds, trayCount, freeByKind, j => st.tiles[j].at === "shelf" ? 99 : st.tiles[j].z);
  }

  return { level, newState, take, undo, pop, shuffle, isFree, botPick, covers, isHard, count: () => C.levels.count };
})();

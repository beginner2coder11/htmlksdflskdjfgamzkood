/* LOT ESCAPE — level generator + lot rules (shared by the game and the tests).
   SOLVABLE BY CONSTRUCTION: cars are placed one at a time, and a car may only be placed where it has
   a clear lane out (forward or reverse) past the cars ALREADY on the lot. Those are exactly the cars
   that leave after it, so leaving in the reverse of the placement order always works. Removing a car
   never blocks another, so the order is also never a trap: any car with a clear lane can go.
   Each level keeps the best of several attempts: the deepest jam (most "waves" of cars that must
   leave before the last one can). Some cars face their blocked way ("trap"), so tapping without
   looking crashes. Levels are rebuilt from seed + level number, so no level data ships. */
window.Levels = (() => {
  const C = window.GAME_CONFIG;
  const DX = [1, 0, -1, 0], DY = [0, 1, 0, -1];      // dir 0 = right, 1 = down, 2 = left, 3 = up

  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  const horiz = car => car.dir % 2 === 0;
  function cells(car) { const out = []; for (let i = 0; i < car.len; i++) out.push(horiz(car) ? [car.x + i, car.y] : [car.x, car.y + i]); return out; }
  // grid: -1 empty, -2 cone, >= 0 car id
  function grid(L, cars) {
    const g = new Int16Array(L.cols * L.rows).fill(-1);
    for (const [x, y] of L.cones) g[y * L.cols + x] = -2;
    for (const c of cars) if (!c.gone) for (const [x, y] of cells(c)) g[y * L.cols + x] = c.id;
    return g;
  }
  /* Driving car c in absolute direction d: how many free spaces lie ahead, and does the lane reach
     the edge (an exit, unless a fence stands there)? hit = what stops it (car id, -2 cone, "fence"). */
  function lane(L, g, c, d) {
    const head = horiz(c) ? (d === 0 ? [c.x + c.len - 1, c.y] : [c.x, c.y]) : (d === 1 ? [c.x, c.y + c.len - 1] : [c.x, c.y]);
    let x = head[0] + DX[d], y = head[1] + DY[d], free = 0;
    while (x >= 0 && y >= 0 && x < L.cols && y < L.rows) {
      const v = g[y * L.cols + x];
      if (v !== -1 && v !== c.id) return { free, out: false, hit: v };
      free++; x += DX[d]; y += DY[d];
    }
    const fenced = d === 0 ? L.fences.right[c.y] : d === 2 ? L.fences.left[c.y] : d === 1 ? L.fences.bottom[c.x] : L.fences.top[c.x];
    return fenced ? { free, out: false, hit: "fence" } : { free, out: true, hit: null };
  }
  const canLeave = (L, g, c) => [c.dir, (c.dir + 2) % 4].filter(d => lane(L, g, c, d).out);

  // fewest "waves" to empty the lot when every car that can leave does so at once
  function depth(L, cars) {
    const left = cars.map(c => ({ ...c, gone: false })); let waves = 0;
    while (left.some(c => !c.gone)) {
      const g = grid(L, left), go = left.filter(c => !c.gone && canLeave(L, g, c).length);
      if (!go.length) return -1;
      go.forEach(c => c.gone = true); waves++;
    }
    return waves;
  }

  const step = n => C.levels.curve.find(s => n <= s.upTo) || C.levels.curve[C.levels.curve.length - 1];
  const isHard = n => C.levels.hardEvery > 0 && n % C.levels.hardEvery === 0;

  function attempt(R, n, st, hard) {
    const cols = st.size[0] + (hard ? 1 : 0), rows = st.size[1] + (hard ? 1 : 0);
    const L = { n, cols, rows, cones: [], fences: { top: Array(cols).fill(false), bottom: Array(cols).fill(false), left: Array(rows).fill(false), right: Array(rows).fill(false) } };
    // fences: short runs along the edges (never the middle of the top edge: that's the exit gate side)
    for (let f = 0; f < st.fences + (hard ? 2 : 0); f++) {
      const side = ["top", "bottom", "left", "right"][Math.floor(R() * 4)], arr = L.fences[side], k = Math.floor(R() * arr.length);
      arr[k] = true; if (R() < 0.5 && k + 1 < arr.length) arr[k + 1] = true;
    }
    for (let k = 0; k < st.cones + (hard ? 1 : 0); k++) L.cones.push([Math.floor(R() * cols), Math.floor(R() * rows)]);
    const cars = [], order = [], target = Math.round(cols * rows * Math.min(0.9, st.fill + (hard ? 0.04 : 0)));
    let used = L.cones.length;
    // each step: try a handful of spots and keep the one that cuts off the most lanes of the cars
    // already there (that is what builds long chains: "move these out before that one can go")
    const lanesOpen = g => { let k = 0; for (const c of cars) for (const d of [c.dir, (c.dir + 2) % 4]) if (lane(L, g, c, d).out) k++; return k; };
    for (let fails = 0; fails < 60 && used < target;) {
      let best = null, bestCut = -1;
      const g = grid(L, cars), open0 = lanesOpen(g);
      for (let k = 0, found = 0; k < 80 && found < 10; k++) {
        const len = R() < st.long + (hard ? 0.05 : 0) ? 3 : 2, h = R() < 0.5;
        const x = Math.floor(R() * (cols - (h ? len - 1 : 0))), y = Math.floor(R() * (rows - (h ? 0 : len - 1)));
        const car = { id: cars.length, x, y, len, dir: h ? 0 : 1 };
        if (cells(car).some(([cx, cy]) => g[cy * cols + cx] !== -1)) continue;
        const ok = canLeave(L, g, car);
        if (!ok.length) continue;
        found++;
        cars.push(car); const g2 = grid(L, cars); cars.pop();
        const cut = open0 - lanesOpen(g2) + R() * 0.8;      // lanes of the cars already there that this one closes
        if (cut > bestCut) { bestCut = cut; best = { car, ok }; }
      }
      if (!best) { fails++; continue; }
      const { car, ok } = best, len = car.len;
      // which way it faces: its free way, or (trap) the blocked way so it must be reversed
      const axis = horiz(car) ? [0, 2] : [1, 3], blocked = axis.filter(d => !ok.includes(d));
      car.dir = blocked.length && R() < st.trap ? blocked[0] : ok[Math.floor(R() * ok.length)];
      const ms = C.models.filter(m => m.len === len), m = ms[Math.floor(R() * ms.length)];
      car.model = m.id; car.paint = m.id === "taxi" ? 2 : Math.floor(R() * C.paints.length);
      cars.push(car); order.push([car.id, ok[0]]); used += len;
    }
    L.cars = cars; L.order = order.reverse();          // leave in reverse placement order
    L.depth = depth(L, cars); L.fill = used / (cols * rows);
    return L;
  }

  const cache = {};
  function get(n) {
    if (cache[n]) return cache[n];
    const st = step(n), hard = isHard(n), want = st.depth + (hard ? 2 : 0);
    let best = null, bestScore = -1e9;
    for (let a = 0; a < 10; a++) {
      const R = rng(C.levels.seed * 7919 + n * 104729 + a * 7);
      const L = attempt(R, n, st, hard);
      if (L.depth < 1 || L.cars.length < 2) continue;
      const score = -Math.abs(L.depth - want) * 3 + L.fill * 4 + (L.depth >= want ? 1 : 0);
      if (score > bestScore) { bestScore = score; best = L; }
    }
    best.hard = hard; best.hearts = Math.max(1, C.hearts - (hard ? 1 : 0));
    return (cache[n] = best);
  }

  return { get, isHard, cells, grid, lane, canLeave, depth, DX, DY, horiz, count: () => C.levels.count };
})();

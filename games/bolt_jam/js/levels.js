/* BOLT JAM — level generator + plate geometry (shared by the game and the tests).
   Levels are SOLVABLE BY CONSTRUCTION:
   1. Plates are stacked on the board, each on its own layer (0 = bottom).
   2. A legal unscrew order is played out: the top plate is never covered, so there is always a
      screw to take. A plate with one screw left settles hanging under it; with none it drops.
   3. Screws are coloured in groups of 3 along that order (one group = one toolbox).
   4. A smart player is simulated on the level; colours are swapped to make that player park
      more screws in spare holes, but only while it still clears the level within the level's
      spare-hole budget. Its winning order is kept as the level's solution (tests replay it).
   Levels are rebuilt from seed + level number, so no level data ships. */
window.Levels = (() => {
  const C = window.GAME_CONFIG;
  const W = 360, H = 460;                       // board size in world units
  const HOLE_IN = 18, HEAD = 12;                // hole inset from plate edge, screw head radius

  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  /* ---------- shapes (local coords, centred on the centre of mass) ---------- */
  function regular(n, r, a0 = -Math.PI / 2) { const p = []; for (let i = 0; i < n; i++) { const a = a0 + i / n * Math.PI * 2; p.push([Math.cos(a) * r, Math.sin(a) * r]); } return p; }
  const SHAPES = {
    bar(R) { const len = 150 + R() * 120, t = 46; return { shape: "bar", w: len, h: t, pts: [[-len / 2, -t / 2], [len / 2, -t / 2], [len / 2, t / 2], [-len / 2, t / 2]], k2: (len * len + t * t) / 12,
      holes: n => n === 3 ? [[-len / 2 + 23, 0], [0, 0], [len / 2 - 23, 0]] : [[-len / 2 + 23, 0], [len / 2 - 23, 0]], counts: [2, 2, 3] }; },
    rect(R) { const w = 110 + R() * 80, h = 84 + R() * 46; const x = w / 2 - HOLE_IN - 4, y = h / 2 - HOLE_IN - 4;
      return { shape: "rect", w, h, pts: [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]], k2: (w * w + h * h) / 12,
        holes: n => n === 4 ? [[-x, -y], [x, -y], [x, y], [-x, y]] : n === 3 ? [[-x, -y], [x, -y], [0, y]] : [[-x, -y], [x, y]], counts: [2, 3, 4] }; },
    circle(R) { const r = 52 + R() * 26, q = r - HOLE_IN - 4;
      return { shape: "circle", r, pts: regular(28, r), k2: r * r / 2,
        holes: n => n === 3 ? regular(3, q) : [[-q, 0], [q, 0]], counts: [2, 3] }; },
    tri(R) { const s = 130 + R() * 50, r = s / Math.sqrt(3), q = r - HOLE_IN * 1.7;
      return { shape: "tri", r, pts: regular(3, r), k2: s * s / 12,
        holes: n => n === 3 ? regular(3, q) : regular(3, q).slice(0, 2), counts: [2, 3] }; },
    hex(R) { const r = 56 + R() * 22, q = r - HOLE_IN - 3;
      return { shape: "hex", r, pts: regular(6, r, 0), k2: 5 * r * r / 12,
        holes: n => n === 3 ? regular(3, q, -Math.PI / 2) : [[-q, 0], [q, 0]], counts: [2, 3] }; }
  };
  const KINDS = ["bar", "bar", "rect", "rect", "circle", "tri", "hex"];

  /* ---------- geometry ---------- */
  const rot = (p, a) => { const c = Math.cos(a), s = Math.sin(a); return [p[0] * c - p[1] * s, p[0] * s + p[1] * c]; };
  const toWorld = (pl, p) => { const r = rot(p, pl.rot); return [pl.x + r[0], pl.y + r[1]]; };
  const toLocal = (pl, p) => rot([p[0] - pl.x, p[1] - pl.y], -pl.rot);
  function inPoly(p, pts) { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const a = pts[i], b = pts[j]; if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
  function segDist(p, a, b) { const dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy || 1; let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l; t = Math.max(0, Math.min(1, t)); return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy); }
  // does plate pl (in its current pose) cover a screw head at world point p?
  function covers(pl, p, r = HEAD * 0.8) {
    const q = toLocal(pl, p);
    if (pl.shape === "circle") return Math.hypot(q[0], q[1]) < pl.r + r;
    if (inPoly(q, pl.pts)) return true;
    for (let i = 0, j = pl.pts.length - 1; i < pl.pts.length; j = i++) if (segDist(q, pl.pts[i], pl.pts[j]) < r) return true;
    return false;
  }
  // pose of a plate hanging still from one hole (pivot stays where it is)
  function restPose(pl, hole) {
    const piv = toWorld(pl, hole), d = Math.hypot(hole[0], hole[1]);
    if (d < 1) return { x: pl.x, y: pl.y, rot: pl.rot };
    const r = Math.PI / 2 - Math.atan2(-hole[1], -hole[0]);
    return { x: piv[0], y: piv[1] + d, rot: r };
  }
  function overlaps(a, b) {   // rough: any vertex / hole / centre of one inside the other
    const test = (p, q) => [...p.pts.map(v => toWorld(p, v)), [p.x, p.y], ...p.holes.map(h => toWorld(p, h))].some(w => covers(q, w, 2));
    return test(a, b) || test(b, a);
  }

  /* ---------- the generator ---------- */
  function step(n) { return C.levels.curve.find(s => n <= s.upTo) || C.levels.curve[C.levels.curve.length - 1]; }
  const isHard = n => C.levels.hardEvery > 0 && n % C.levels.hardEvery === 0;

  function placePlates(R, count) {
    const plates = [];
    for (let tries = 0; plates.length < count && tries < count * 220; tries++) {
      const kind = plates.length === 0 && count <= 2 ? "bar" : KINDS[Math.floor(R() * KINDS.length)];
      const s = SHAPES[kind](R);
      const n = s.counts[Math.floor(R() * s.counts.length)];
      const pl = { ...s, holes: s.holes(n), layer: plates.length, rot: Math.round(R() * 12) * Math.PI / 12 };
      if (kind === "circle" || kind === "hex") pl.rot = Math.round(R() * 6) * Math.PI / 6;
      delete pl.counts;
      pl.x = 40 + R() * (W - 80); pl.y = 50 + R() * (H - 100);
      if (count <= 2) { pl.x = W / 2; pl.y = H * (0.36 + 0.3 * plates.length); pl.rot = plates.length ? 0.3 : -0.25; }
      // inside the board (with a margin) …
      const verts = pl.pts.map(v => toWorld(pl, v));
      if (verts.some(v => v[0] < 8 || v[0] > W - 8 || v[1] < 8 || v[1] > H - 8)) continue;
      const hw = pl.holes.map(h => toWorld(pl, h));
      // … screws not on top of each other …
      const others = plates.flatMap(p => p.holes.map(h => toWorld(p, h)));
      if (hw.some(a => others.some(b => Math.hypot(a[0] - b[0], a[1] - b[1]) < 34))) continue;
      // … and stacked: every plate after the first overlaps at least one plate below it
      if (plates.length && count > 2 && !plates.some(p => overlaps(pl, p))) continue;
      // keep at least one free screw on a lower plate visible early on: a new plate may not
      // cover ALL screws of the plate right under it (keeps levels readable)
      plates.push(pl);
    }
    return plates;
  }

  // play out a legal unscrew order (random choices); returns the order as [plateIdx, holeIdx]
  function playOut(R, plates) {
    const P = plates.map(p => ({ ...p, left: p.holes.map((_, i) => i), gone: false }));
    const order = [];
    for (let guard = 0; guard < 500; guard++) {
      const free = [];
      for (const p of P) if (!p.gone) for (const h of p.left) {
        const w = toWorld(p, p.holes[h]);
        if (!P.some(q => !q.gone && q.layer > p.layer && covers(q, w))) free.push([p, h]);
      }
      if (!free.length) break;
      // prefer screws on higher plates a little (feels natural, keeps the stack peeling)
      free.sort((a, b) => b[0].layer - a[0].layer);
      const pick = free[Math.min(free.length - 1, Math.floor(R() * R() * free.length))];
      const [p, h] = pick;
      p.left = p.left.filter(x => x !== h); order.push([P.indexOf(p), h]);
      if (!p.left.length) p.gone = true;
      else if (p.left.length === 1) Object.assign(p, restPose(p, p.holes[p.left[0]]));
    }
    return order;
  }

  /* A smart player, played on the level's geometry: take a screw that fits an open box; otherwise
     park the screw whose colour comes up soonest. Coverage is tracked incrementally (a plate only
     changes coverage when it drops or swings to hang under its last screw). Returns whether it
     cleared the level, the most spare holes it ever used, how full they were on average, and its
     order (the level's stored solution). */
  function greedySim(plates, scr, queue, spareN, A = C.activeBoxes) {
    const P = plates.map(p => ({ ...p, left: 0, gone: false, cov: [] }));
    const S = scr.map((s, i) => ({ i, p: P[s.plate], hole: s.hole, color: s.color, cnt: 0, done: false }));
    for (const s of S) s.p.left++;
    const pos = s => toWorld(s.p, s.p.holes[s.hole]);
    const coverPlate = q => { for (const s of S) if (!s.done && s.p.layer < q.layer && covers(q, pos(s))) { s.cnt++; q.cov.push(s); } };
    for (const q of P) coverPlate(q);
    const open = []; let qi = 0, spares = [], peak = 0, sum = 0; const order = [];
    const openNext = () => { while (open.length < A && qi < queue.length) { const b = { color: queue[qi++], n: 0 }; open.push(b);
      for (let k = spares.length - 1; k >= 0 && b.n < 3; k--) if (spares[k] === b.color) { spares.splice(k, 1); b.n++; }
      if (b.n >= 3) open.splice(open.indexOf(b), 1); } };
    openNext();
    for (let step = 0; step < S.length; step++) {
      let best = null, bestScore = -1e9;
      for (const s of S) {
        if (s.done || s.cnt) continue;
        const fits = open.some(b => b.color === s.color && b.n < 3);
        let sc = fits ? 1000 : -(queue.indexOf(s.color, qi) < 0 ? 999 : queue.indexOf(s.color, qi) - qi) * 10;
        sc += s.p.layer * 0.5 - s.i * 0.001;
        if (sc > bestScore) { bestScore = sc; best = s; }
      }
      if (!best) return { ok: false };
      const fits = open.find(b => b.color === best.color && b.n < 3);
      if (!fits && spares.length >= spareN) return { ok: false, peak: spareN + 1 };
      best.done = true; order.push(best.i);
      if (fits) { fits.n++; if (fits.n >= 3) { open.splice(open.indexOf(fits), 1); openNext(); } }
      else { spares.push(best.color); peak = Math.max(peak, spares.length); }
      sum += spares.length;
      const p = best.p; p.left--;
      if (p.left === 0) { p.gone = true; for (const s of p.cov) s.cnt--; p.cov = []; }
      else if (p.left === 1) {
        for (const s of p.cov) s.cnt--; p.cov = [];
        const last = S.find(s => s.p === p && !s.done);
        Object.assign(p, restPose(p, p.holes[last.hole])); coverPlate(p);
      }
    }
    return { ok: true, peak, avg: sum / S.length, order };
  }

  const cache = {};
  function get(n) {
    if (cache[n]) return cache[n];
    const st = step(n), hard = isHard(n);
    for (let attempt = 0; attempt < 60; attempt++) {
      const R = rng(C.levels.seed * 7919 + n * 104729 + attempt * 31);
      const count = Math.min(14, st.plates[0] + Math.floor(R() * (st.plates[1] - st.plates[0] + 1)) + (hard ? 2 : 0));
      const plates = placePlates(R, count);
      if (plates.length < count) continue;
      fit(plates);
      let total = plates.reduce((s, p) => s + p.holes.length, 0);
      // make the screw count a multiple of 3 by adding / dropping a hole on a plate that allows it
      for (let k = 0; total % 3 && k < 40; k++) {
        const p = plates[Math.floor(R() * plates.length)];
        const opts = { bar: [2, 3], rect: [2, 3, 4], circle: [2, 3], tri: [2, 3], hex: [2, 3] }[p.shape];
        const want = opts[Math.floor(R() * opts.length)];
        if (want === p.holes.length) continue;
        p.holes = holeSet(p, want);
        total = plates.reduce((s, q) => s + q.holes.length, 0);
      }
      if (total % 3) continue;
      // screws must stay apart after the hole changes
      const all = plates.flatMap(p => p.holes.map(h => toWorld(p, h)));
      if (all.some((a, i) => all.some((b, j) => j > i && Math.hypot(a[0] - b[0], a[1] - b[1]) < 30))) continue;
      const order = playOut(R, plates);
      if (order.length !== total) continue;
      // groups of 3 along the order; a colour per group (neighbouring boxes differ)
      const spare = C.spareHoles, cap = hard && n > 20 ? spare : Math.max(1, Math.min(spare - 1, n <= 3 ? 1 : n <= 8 ? 2 : n <= 20 ? 3 : spare - 1));
      const groups = order.map((_, i) => Math.floor(i / 3));
      const nc = Math.min(st.colors + (hard ? 1 : 0), C.colors.length), colorOf = [];
      for (let g = 0; g < total / 3; g++) { let c; do c = Math.floor(R() * nc); while (nc > 1 && c === colorOf[g - 1]); colorOf.push(c); }
      const scr = order.map(([pi, hi], i) => ({ plate: pi, hole: hi, color: colorOf[groups[i]] }));
      // search: swap the colours of two screws, keep it if the smart player still wins within the
      // spare-hole budget and has to work harder (more spare holes, fuller on average)
      const mix = Math.min(1, st.mix + (hard ? 0.15 : 0));
      const score = r => r.peak * 10 + r.avg * 4;
      let cur = greedySim(plates, scr, colorOf, cap);
      if (!cur.ok) continue;
      for (let it = 0, iters = Math.floor(mix * (120 + total * 8)); it < iters; it++) {
        const i = Math.floor(R() * total), j = Math.floor(R() * total);
        if (scr[i].color === scr[j].color) continue;
        [scr[i].color, scr[j].color] = [scr[j].color, scr[i].color];
        const r = greedySim(plates, scr, colorOf, cap);
        if (r.ok && r.peak <= cap && score(r) >= score(cur) - (R() < 0.1 ? 3 : 0)) cur = r;
        else [scr[i].color, scr[j].color] = [scr[j].color, scr[i].color];
      }
      const solution = cur.order.map(i => [scr[i].plate, scr[i].hole]);
      const screws = scr.map(x => ({ ...x }));
      screws.sort((a, b) => a.plate - b.plate || a.hole - b.hole);
      const tints = C.plateTints, t0 = Math.floor(R() * tints.length);
      plates.forEach((p, i) => { p.tint = tints[(t0 + i * 4) % tints.length]; });
      const lvl = { n, hard, plates, screws, boxes: colorOf, order: solution, spare, need: cur.peak, avg: +cur.avg.toFixed(2) };
      return (cache[n] = lvl);
    }
    throw new Error("could not build level " + n);
  }
  // scale the whole layout up (max 1.45×) and centre it, so every level fills the board
  function fit(plates) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const p of plates) for (const v of p.pts) { const w = toWorld(p, v); x0 = Math.min(x0, w[0]); y0 = Math.min(y0, w[1]); x1 = Math.max(x1, w[0]); y1 = Math.max(y1, w[1]); }
    const f = Math.max(1, Math.min(1.45, (W - 20) / (x1 - x0), (H - 20) / (y1 - y0))), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    for (const p of plates) {
      p.x = W / 2 + (p.x - cx) * f; p.y = H / 2 + (p.y - cy) * f;
      p.pts = p.pts.map(v => [v[0] * f, v[1] * f]); p.holes = p.holes.map(h => [h[0] * f, h[1] * f]);
      p.k2 *= f * f; if (p.w) { p.w *= f; p.h *= f; } if (p.r) p.r *= f; p.f = f;
    }
  }
  function holeSet(p, n) {
    const q = (p.r || 0) - HOLE_IN - (p.shape === "tri" ? HOLE_IN * 0.7 : 4);
    if (p.shape === "bar") return n === 3 ? [[-p.w / 2 + 23, 0], [0, 0], [p.w / 2 - 23, 0]] : [[-p.w / 2 + 23, 0], [p.w / 2 - 23, 0]];
    if (p.shape === "rect") { const x = p.w / 2 - HOLE_IN - 4, y = p.h / 2 - HOLE_IN - 4; return n === 4 ? [[-x, -y], [x, -y], [x, y], [-x, y]] : n === 3 ? [[-x, -y], [x, -y], [0, y]] : [[-x, -y], [x, y]]; }
    if (p.shape === "tri") { const r = regular(3, p.r - HOLE_IN * 1.7); return n === 3 ? r : r.slice(0, 2); }
    if (p.shape === "circle") return n === 3 ? regular(3, q) : [[-q, 0], [q, 0]];
    return n === 3 ? regular(3, q, -Math.PI / 2) : [[-q, 0], [q, 0]];
  }

  return { get, W, H, HEAD, toWorld, toLocal, covers, restPose, isHard, count: () => C.levels.count };
})();

/* HEX STACKS — rules (no drawing): boards, new stacks, the merge / pop chain, and a smart bot.
   Cells are axial hex coordinates "q,r". A stack is an array of colour indexes, bottom → top.
   Merge rule: when a stack's top colour matches neighbours' top colours, every one of them sends its
   top run of that colour to the stack in the group with the longest run (ties: the stack just placed).
   A top run of clearAt or more pops. Every stack that changed is checked again → chain reactions. */
window.Rules = (() => {
  const C = window.GAME_CONFIG;
  const DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
  const key = (q, r) => q + "," + r, unkey = k => k.split(",").map(Number);
  const nbrs = k => { const [q, r] = unkey(k); return DIRS.map(([a, b]) => key(q + a, r + b)); };
  const top = s => s[s.length - 1];
  const run = s => { if (!s || !s.length) return 0; const c = top(s); let n = 0; for (let i = s.length - 1; i >= 0 && s[i] === c; i--) n++; return n; };

  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const step = n => C.levels.curve.find(s => n <= s.upTo) || C.levels.curve[C.levels.curve.length - 1];
  const isHard = n => C.levels.hardEvery > 0 && n % C.levels.hardEvery === 0;

  /* ---------- levels: board shape, holes (symmetric), locked cells with score thresholds ---------- */
  const cache = {};
  function level(n) {
    if (cache[n]) return cache[n];
    const st = step(n), hard = isHard(n), R = rng(C.levels.seed * 7919 + n * 104729);
    const rad = st.radius, cells = [];
    for (let q = -rad; q <= rad; q++) for (let r = -rad; r <= rad; r++) if (Math.abs(q + r) <= rad) cells.push(key(q, r));
    const holes = new Set();
    // holes come in mirrored pairs (q,r) ↔ (-q,-r) and never at the centre, so the board stays balanced
    for (let i = 0, tries = 0; holes.size < st.holes && tries < 200; tries++) {
      const k = cells[Math.floor(R() * cells.length)], [q, r] = unkey(k); if (k === "0,0") continue;
      const m = key(-q, -r); holes.add(k); holes.add(m);
    }
    let live = cells.filter(k => !holes.has(k));
    const target = Math.round((st.target + (hard ? 60 : 0)) * (0.92 + R() * 0.16) / 5) * 5;
    const locks = {};
    const outer = live.filter(k => { const [q, r] = unkey(k); return Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r)) === rad; });
    for (let i = 0; i < st.locks + (hard ? 1 : 0) && outer.length; i++) {
      const k = outer.splice(Math.floor(R() * outer.length), 1)[0];
      locks[k] = Math.round(target * (0.18 + i * 0.16) / 5) * 5;           // opens when this many tiles are cleared
    }
    return (cache[n] = { n, hard, cells: live, locks, colors: Math.min(C.colors.length, st.colors + (hard ? 1 : 0)), mix: st.mix + (hard ? 0.2 : 0), target, seed: C.levels.seed * 31 + n });
  }

  /* ---------- new stacks ---------- */
  function newStack(R, L) {
    const size = C.stackSize[0] + Math.floor(R() * (C.stackSize[1] - C.stackSize[0] + 1));
    let bands = 1 + Math.floor(R() * L.mix + (R() < L.mix % 1 ? 1 : 0)); bands = Math.max(1, Math.min(3, bands, size));
    const s = []; let prev = -1;
    for (let b = 0; b < bands; b++) {
      let c; do c = Math.floor(R() * L.colors); while (c === prev && L.colors > 1); prev = c;
      const len = b === bands - 1 ? size - s.length : Math.max(1, Math.round((size - s.length) / (bands - b) * (0.6 + R() * 0.8)));
      for (let i = 0; i < Math.min(len, size - s.length - (bands - b - 1)); i++) s.push(c);
    }
    while (s.length < size) s.push(top(s));
    return s;
  }

  /* ---------- state + moves ---------- */
  function newState(L, seed) {
    const R = rng(seed);
    const st = { L, R, board: {}, score: 0, tray: [], open: new Set(L.cells.filter(k => !(k in L.locks))) };
    for (const k of L.cells) st.board[k] = null;
    refill(st);
    return st;
  }
  function refill(st) { st.tray = Array.from({ length: C.trayStacks }, () => newStack(st.R, st.L)); }
  const emptyCells = st => [...st.open].filter(k => !st.board[k] || !st.board[k].length);

  // resolve merges / pops starting at cell k; returns the events (for the animation) and tiles cleared
  function resolve(st, k0) {
    const B = st.board, ev = []; let cleared = 0, combo = 0;
    const queue = [k0];
    for (let guard = 0; queue.length && guard < 600; guard++) {
      const k = queue.shift(), s = B[k];
      if (!s || !s.length) continue;
      const c = top(s), match = nbrs(k).filter(n => st.open.has(n) && B[n] && B[n].length && top(B[n]) === c);
      if (match.length) {
        const group = [k, ...match];
        let tgt = k, best = run(s);
        for (const n of match) { const r = run(B[n]); if (r > best || (r === best && B[n].length === r && s.length !== run(s))) { best = r; tgt = n; } }
        for (const g of group) {
          if (g === tgt) continue;
          const n = run(B[g]); const moved = B[g].splice(B[g].length - n, n); B[tgt].push(...moved);
          ev.push({ t: "move", from: g, to: tgt, color: c, n });
          if (!B[g].length) B[g] = null; else queue.push(g);
        }
        queue.push(tgt);
      }
      // pop check on whichever stack now holds the run
      for (const pk of new Set([k, ...match])) {
        const ps = B[pk]; if (!ps) continue;
        const r = run(ps);
        if (r >= C.clearAt) {
          const col = top(ps); ps.splice(ps.length - r, r); cleared += r; combo++;
          ev.push({ t: "clear", at: pk, color: col, n: r, combo });
          if (!ps.length) B[pk] = null; else queue.push(pk);
          for (const n of nbrs(pk)) if (B[n] && B[n].length) queue.push(n);
        }
      }
    }
    st.score += cleared;
    return { ev, cleared };
  }
  // unlock cells whose thresholds were reached; returns the keys that opened
  function unlocks(st) {
    const out = [];
    for (const [k, need] of Object.entries(st.L.locks)) if (!st.open.has(k) && st.score >= need) { st.open.add(k); out.push(k); }
    return out;
  }
  // place tray stack i at cell k
  function place(st, i, k) {
    if (!st.tray[i] || !st.open.has(k) || (st.board[k] && st.board[k].length)) return null;
    st.board[k] = st.tray[i].slice(); st.tray[i] = null;
    const res = resolve(st, k);
    res.opened = unlocks(st);
    if (st.tray.every(x => !x)) { refill(st); res.refilled = true; }
    res.won = st.score >= st.L.target;
    res.lost = !res.won && emptyCells(st).length === 0;
    return res;
  }

  /* ---------- smart bot: try every tray stack on every empty cell, score the outcome ---------- */
  function clone(st) { return { L: st.L, R: st.R, score: st.score, open: new Set(st.open), tray: st.tray.map(s => s && s.slice()), board: Object.fromEntries(Object.entries(st.board).map(([k, v]) => [k, v && v.slice()])) }; }
  function evaluate(st) {
    // tidy boards are good: same-colour neighbours (future merges), few colour bands, free cells
    let v = 0;
    for (const k of st.open) {
      const s = st.board[k]; if (!s || !s.length) { v += 6; continue; }
      let bands = 1; for (let i = 1; i < s.length; i++) if (s[i] !== s[i - 1]) bands++;
      v -= bands * 2.5 + s.length * 0.25;
      v += run(s) * 0.6;
      for (const n of nbrs(k)) { const t = st.board[n]; if (t && t.length && st.open.has(n)) v += top(t) === top(s) ? 1.5 : -0.4; }
    }
    return v;
  }
  function bestMove(st) {
    let best = null, bv = -1e9;
    const empties = emptyCells(st);
    st.tray.forEach((s, i) => {
      if (!s) return;
      for (const k of empties) {
        const c = clone(st); c.R = rng(7);   // lookahead only: a fixed seed so refills don't touch the real sequence
        const res = place(c, i, k);
        const v = res.cleared * 9 + (res.won ? 1e4 : 0) - (res.lost ? 1e4 : 0) + evaluate(c);
        if (v > bv) { bv = v; best = { i, k }; }
      }
    });
    return best;
  }

  return { level, newState, place, bestMove, refill, emptyCells, key, unkey, nbrs, run, top, DIRS, isHard, count: () => C.levels.count };
})();

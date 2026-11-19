/* SUDOKU DAILY — puzzle engine (no drawing), shared by the game and the tests.
   Grids are arrays of 81 numbers (0 = empty), row by row. Every puzzle is made from a seed, so the daily puzzle
   and the journey levels are the same on every device. Each puzzle has exactly one solution and can be solved by
   logic alone (no guessing) using the techniques allowed for its difficulty:
     1 naked single · 2 hidden single · 3 locked candidates (pointing / claiming) · 4 naked pair · 5 hidden pair
     6 naked triple · 7 X-wing */
(function (root) {
  const ROW = i => (i / 9) | 0, COL = i => i % 9, BOX = i => ((ROW(i) / 3) | 0) * 3 + ((COL(i) / 3) | 0);
  const UNITS = [], PEERS = [], UNITS_OF = [];
  for (let r = 0; r < 9; r++) UNITS.push([...Array(9)].map((_, c) => r * 9 + c));
  for (let c = 0; c < 9; c++) UNITS.push([...Array(9)].map((_, r) => r * 9 + c));
  for (let b = 0; b < 9; b++) UNITS.push([...Array(9)].map((_, k) => (((b / 3) | 0) * 3 + ((k / 3) | 0)) * 9 + (b % 3) * 3 + (k % 3)));
  for (let i = 0; i < 81; i++) {
    UNITS_OF.push([ROW(i), 9 + COL(i), 18 + BOX(i)]);
    const s = new Set(); for (const u of UNITS_OF[i]) for (const j of UNITS[u]) if (j !== i) s.add(j); PEERS.push([...s]);
  }
  const ALL = 0x3fe, bit = d => 1 << d, pop = m => { let n = 0; while (m) { m &= m - 1; n++; } return n; }, digits = m => { const o = []; for (let d = 1; d <= 9; d++) if (m & bit(d)) o.push(d); return o; };
  const one = m => (m & (m - 1)) === 0;

  function rng(seed) { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  function shuffle(a, R) { for (let i = a.length - 1; i > 0; i--) { const j = (R() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; }

  function candidates(g) {
    const c = new Array(81);
    for (let i = 0; i < 81; i++) { if (g[i]) { c[i] = 0; continue; } let m = ALL; for (const j of PEERS[i]) if (g[j]) m &= ~bit(g[j]); c[i] = m; }
    return c;
  }

  /* ---------- brute force: count solutions (stops at `limit`) ---------- */
  function countSolutions(g0, limit = 2, out) {
    const g = g0.slice(); let n = 0;
    const rows = new Int32Array(9), cols = new Int32Array(9), boxes = new Int32Array(9);
    for (let i = 0; i < 81; i++) if (g[i]) { const b = bit(g[i]); if ((rows[ROW(i)] | cols[COL(i)] | boxes[BOX(i)]) & b) return 0; rows[ROW(i)] |= b; cols[COL(i)] |= b; boxes[BOX(i)] |= b; }
    (function go() {
      if (n >= limit) return;
      let best = -1, bm = 0, bc = 10;
      for (let i = 0; i < 81; i++) if (!g[i]) { const m = ALL & ~(rows[ROW(i)] | cols[COL(i)] | boxes[BOX(i)]), c = pop(m); if (c < bc) { bc = c; best = i; bm = m; if (c <= 1) break; } }
      if (best < 0) { n++; if (out && !out.sol) out.sol = g.slice(); return; }
      if (!bc) return;
      const r = ROW(best), c = COL(best), b = BOX(best);
      for (let d = 1; d <= 9; d++) if (bm & bit(d)) {
        const k = bit(d); g[best] = d; rows[r] |= k; cols[c] |= k; boxes[b] |= k;
        go(); g[best] = 0; rows[r] &= ~k; cols[c] &= ~k; boxes[b] &= ~k; if (n >= limit) return;
      }
    })();
    return n;
  }
  function solve(g) { const o = {}; return countSolutions(g, 1, o) ? o.sol : null; }

  function fullGrid(R) {
    const g = new Array(81).fill(0);
    (function fill(i) {
      if (i === 81) return true; const m = candidates(g)[i], ds = shuffle(digits(m), R);
      for (const d of ds) { g[i] = d; if (fill(i + 1)) return true; } g[i] = 0; return false;
    })(0);
    return g;
  }

  /* ---------- logic solver: returns the hardest technique needed, or 0 if it gets stuck ---------- */
  function logicSolve(g0, maxTech = 7, firstStep = false) {
    const g = g0.slice(), c = candidates(g); let hardest = 0;
    const place = (i, d) => { g[i] = d; c[i] = 0; for (const j of PEERS[i]) c[j] &= ~bit(d); };
    for (;;) {
      if (g.every(x => x)) return { solved: true, hardest, grid: g };
      let step = null;
      // 1 naked single
      for (let i = 0; i < 81 && !step; i++) if (!g[i]) { if (!c[i]) return { solved: false, hardest, grid: g }; if (one(c[i])) step = { t: 1, i, d: digits(c[i])[0] }; }
      // 2 hidden single
      if (!step && maxTech >= 2) for (let u = 0; u < 27 && !step; u++) for (let d = 1; d <= 9 && !step; d++) {
        let at = -1, n = 0; for (const i of UNITS[u]) { if (g[i] === d) { n = -9; break; } if (c[i] & bit(d)) { n++; at = i; } }
        if (n === 1) step = { t: 2, i: at, d, u };
      }
      if (step) { if (firstStep) return { step }; place(step.i, step.d); hardest = Math.max(hardest, step.t); continue; }
      let changed = false;
      const elim = (cells, mask, t) => { let any = false; for (const j of cells) if (c[j] & mask) { c[j] &= ~mask; any = true; } if (any) { changed = true; hardest = Math.max(hardest, t); } return any; };
      // 3 locked candidates
      if (maxTech >= 3) for (let u = 0; u < 27 && !changed; u++) for (let d = 1; d <= 9 && !changed; d++) {
        const cells = UNITS[u].filter(i => c[i] & bit(d)); if (cells.length < 2) continue;
        for (let v = 0; v < 27 && !changed; v++) if (v !== u && cells.every(i => UNITS[v].includes(i))) elim(UNITS[v].filter(j => !cells.includes(j)), bit(d), 3);
      }
      // 4 naked pair, 6 naked triple
      for (const [size, t] of [[2, 4], [3, 6]]) if (maxTech >= t) for (let u = 0; u < 27 && !changed; u++) {
        const open = UNITS[u].filter(i => !g[i] && pop(c[i]) <= size && pop(c[i]) >= 2);
        const tryCombo = (start, picked, mask) => {
          if (changed) return;
          if (picked.length === size) { if (pop(mask) === size) elim(UNITS[u].filter(j => !g[j] && !picked.includes(j)), mask, t); return; }
          for (let k = start; k < open.length; k++) { const m = mask | c[open[k]]; if (pop(m) <= size) tryCombo(k + 1, picked.concat(open[k]), m); }
        };
        tryCombo(0, [], 0);
      }
      // 5 hidden pair
      if (maxTech >= 5) for (let u = 0; u < 27 && !changed; u++) {
        const where = {}; for (let d = 1; d <= 9; d++) where[d] = UNITS[u].filter(i => c[i] & bit(d));
        for (let a = 1; a <= 9 && !changed; a++) for (let b = a + 1; b <= 9 && !changed; b++) {
          const A = where[a], B = where[b];
          if (A.length === 2 && B.length === 2 && A[0] === B[0] && A[1] === B[1]) { const keep = bit(a) | bit(b); for (const i of A) if (c[i] & ~keep) { c[i] &= keep; changed = true; hardest = Math.max(hardest, 5); } }
        }
      }
      // 7 X-wing (rows and columns)
      if (maxTech >= 7) for (const [base, other] of [[0, COL], [9, ROW]]) for (let d = 1; d <= 9 && !changed; d++) {
        const lines = []; for (let l = 0; l < 9; l++) { const cs = UNITS[base + l].filter(i => c[i] & bit(d)); if (cs.length === 2) lines.push({ l, k: cs.map(other) }); }
        for (let x = 0; x < lines.length && !changed; x++) for (let y = x + 1; y < lines.length && !changed; y++) {
          const A = lines[x], B = lines[y]; if (A.k[0] !== B.k[0] || A.k[1] !== B.k[1]) continue;
          const cross = base === 0 ? 9 : 0;
          for (const k of A.k) elim(UNITS[cross + k].filter(i => (base === 0 ? ROW(i) : COL(i)) !== A.l && (base === 0 ? ROW(i) : COL(i)) !== B.l), bit(d), 7);
        }
      }
      if (!changed) return { solved: false, hardest, grid: g };
    }
  }

  /* ---------- puzzle maker ---------- */
  // difficulty: { clues: target number of givens, tech: techniques allowed, need: the puzzle must need at least this technique }
  function make(seed, diff) {
    const R = rng(seed * 2654435761 + 12345);
    let best = null;
    for (let attempt = 0; attempt < (diff.need ? 80 : 4); attempt++) {
      const sol = fullGrid(R), g = sol.slice(), order = shuffle([...Array(41).keys()], R);
      let clues = 81;
      for (const i of order) {
        if (clues <= diff.clues) break;
        const j = 80 - i, a = g[i], b = g[j];
        g[i] = 0; g[j] = 0;
        const lost = i === j ? 1 : 2;
        if (countSolutions(g, 2) !== 1 || !logicSolve(g, diff.tech).solved) { g[i] = a; g[j] = b; } else clues -= lost;
      }
      if (clues > diff.clues) for (const i of shuffle([...Array(81).keys()], R)) {
        if (clues <= diff.clues) break; if (!g[i]) continue;
        const a = g[i]; g[i] = 0;
        if (countSolutions(g, 2) !== 1 || !logicSolve(g, diff.tech).solved) g[i] = a; else clues--;
      }
      const hard = logicSolve(g, diff.tech).hardest;
      const cand = { puzzle: g, solution: sol, clues, hardest: hard };
      if (!best || (hard >= (diff.need || 0) && (best.hardest < (diff.need || 0) || clues < best.clues))) best = cand;
      if (hard >= (diff.need || 0)) break;
    }
    return best;
  }

  // the next logical step for the hint button (a single), with a reason
  function hint(g, sol) {
    const r = logicSolve(g, 2, true);
    if (r.step && sol[r.step.i] === r.step.d) {
      const s = r.step;
      if (s.t === 1) return { i: s.i, d: s.d, kind: "naked", unit: null };
      const u = s.u; return { i: s.i, d: s.d, kind: "hidden", unit: u, unitName: u < 9 ? "row" : u < 18 ? "column" : "box" };
    }
    const empty = []; for (let i = 0; i < 81; i++) if (!g[i]) empty.push(i);
    if (!empty.length) return null;
    const i = empty.sort((a, b) => pop(candidates(g)[a]) - pop(candidates(g)[b]))[0];
    return { i, d: sol[i], kind: "reveal", unit: null };
  }

  const api = { UNITS, UNITS_OF, PEERS, ROW, COL, BOX, rng, candidates, countSolutions, solve, logicSolve, make, hint, digits, bit };
  if (typeof module !== "undefined") module.exports = api; else root.Sudoku = api;
})(typeof window !== "undefined" ? window : globalThis);

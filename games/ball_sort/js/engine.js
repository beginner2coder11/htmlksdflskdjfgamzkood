/* ==========================================================================
   ENGINE — sort-puzzle rules, a seeded level generator and an A* solver.
   Pure logic (no DOM): runs in the browser and in Node (tools/build_levels.js).

   A tube is an array of color indexes, bottom → top. Two move rules:
     pour   (water): moves the whole top run of one color, as much as fits
     single (balls): moves just the top ball
   ========================================================================== */
(function (root) {
  // ---------- seeded random --------------------------------------------------
  function RNG(seed) {
    let a = seed >>> 0;
    const next = () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    next.int = n => Math.floor(next() * n);
    next.shuffle = arr => { for (let i = arr.length - 1; i > 0; i--) { const j = next.int(i + 1); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
    return next;
  }

  // ---------- rules ----------------------------------------------------------
  const top = t => t[t.length - 1];
  function topRun(t) {
    if (!t.length) return 0;
    const c = top(t); let n = 0;
    for (let i = t.length - 1; i >= 0 && t[i] === c; i--) n++;
    return n;
  }
  const isComplete = (t, cap) => t.length === cap && topRun(t) === cap;
  function canMove(tubes, cap, a, b) {
    if (a === b) return false;
    const A = tubes[a], B = tubes[b];
    if (!A || !B || !A.length || B.length >= cap) return false;
    if (isComplete(A, cap)) return false;
    return !B.length || top(B) === top(A);
  }
  // returns how many units moved (0 = illegal)
  function move(tubes, cap, a, b, single) {
    if (!canMove(tubes, cap, a, b)) return 0;
    const n = single ? 1 : Math.min(topRun(tubes[a]), cap - tubes[b].length);
    for (let i = 0; i < n; i++) tubes[b].push(tubes[a].pop());
    return n;
  }
  const isSolved = (tubes, cap) => tubes.every(t => !t.length || isComplete(t, cap));
  function hasMoves(tubes, cap) {
    for (let a = 0; a < tubes.length; a++)
      for (let b = 0; b < tubes.length; b++)
        if (canMove(tubes, cap, a, b) && !(tubes[b].length === 0 && topRun(tubes[a]) === tubes[a].length)) return true;
    return false;
  }

  // ---------- solver (weighted A*, pour rule) ---------------------------------
  // Each pour can lower the total number of color runs by at most one, and a
  // solved board has exactly one run per color, so (runs − colors) is an
  // admissible estimate. Weight > 1 trades optimality for speed.
  const CH = "abcdefghijklmnopqrstuvwxyz";
  function runsOf(s) { let r = 0; for (let i = 0; i < s.length; i++) if (i === 0 || s[i] !== s[i - 1]) r++; return r; }
  function sRun(s) { let n = 0; const c = s[s.length - 1]; for (let i = s.length - 1; i >= 0 && s[i] === c; i--) n++; return n; }

  function solve(tubesIn, cap, opts = {}) {
    const limit = opts.limit || 150000, W = opts.weight || 1.6;
    const start = tubesIn.map(t => t.map(c => CH[c]).join(""));
    const colors = new Set(start.join("")).size;
    const h = st => st.reduce((s, t) => s + runsOf(t), 0) - colors;
    const key = st => st.slice().sort().join("|");
    const solved = st => st.every(t => !t.length || (t.length === cap && sRun(t) === cap));

    // binary heap on f
    const heap = [];
    const push = n => { heap.push(n); let i = heap.length - 1; while (i) { const p = (i - 1) >> 1; if (heap[p].f <= n.f) break; heap[i] = heap[p]; i = p; } heap[i] = n; };
    const pop = () => {
      const r = heap[0], last = heap.pop();
      if (heap.length) {
        let i = 0; const n = heap.length;
        for (;;) { let c = 2 * i + 1; if (c >= n) break; if (c + 1 < n && heap[c + 1].f < heap[c].f) c++; if (heap[c].f >= last.f) break; heap[i] = heap[c]; i = c; }
        heap[i] = last;
      }
      return r;
    };
    const seen = new Map();
    push({ st: start, g: 0, f: W * h(start), parent: null, mv: null });
    seen.set(key(start), 0);
    let expanded = 0;
    while (heap.length) {
      const node = pop();
      if (solved(node.st)) {
        const moves = [];
        for (let n = node; n.parent; n = n.parent) moves.push(n.mv);
        return moves.reverse();
      }
      if (++expanded > limit) return null;
      const st = node.st, L = st.length;
      let firstEmpty = -1;
      for (let b = 0; b < L; b++) if (!st[b].length) { firstEmpty = b; break; }
      for (let a = 0; a < L; a++) {
        const A = st[a]; if (!A.length) continue;
        const run = sRun(A);
        if (run === cap) continue;                      // complete tube
        const c = A[A.length - 1];
        for (let b = 0; b < L; b++) {
          if (b === a) continue;
          const B = st[b];
          if (B.length >= cap) continue;
          if (!B.length) {
            if (b !== firstEmpty || run === A.length) continue;  // symmetric empties / pointless
          } else if (B[B.length - 1] !== c) continue;
          const n = Math.min(run, cap - B.length);
          const nx = st.slice();
          nx[a] = A.slice(0, A.length - n);
          nx[b] = B + c.repeat(n);
          const k = key(nx), g = node.g + 1;
          const old = seen.get(k);
          if (old !== undefined && old <= g) continue;
          seen.set(k, g);
          push({ st: nx, g, f: g + W * h(nx), parent: node, mv: [a, b, n] });
        }
      }
    }
    return null;
  }

  // ---------- level curve ------------------------------------------------------
  // Colors ramp up quickly, then the board stays big and later levels get
  // harder through deeper scrambles (picked by solution length) and "mystery"
  // levels where only the top ball of each tube is visible.
  function spec(n) {
    const colors = n === 1 ? 2 : n === 2 ? 3 : n <= 4 ? 4 : n <= 7 ? 5 : n <= 11 ? 6 : n <= 17 ? 7 : n <= 25 ? 8 : n <= 40 ? 9 : n <= 60 ? 10 : n <= 90 ? 11 : 12;
    const hard = n >= 15 && n % 10 === 0;
    const mystery = n >= 24 && (n % 8 === 0 || (n > 150 && n % 5 === 0)) && !hard;
    return {
      colors: hard ? Math.min(12, colors + 1) : colors,
      empty: n === 1 ? 1 : 2,
      cap: 4,
      hard,
      mystery,
      tries: hard ? 8 : n > 60 ? 4 : n > 10 ? 2 : 1   // candidates; the deepest one wins
    };
  }

  // A random deal of all balls, rejected when it is too tidy to be a puzzle.
  function deal(sp, rnd) {
    const balls = [];
    for (let c = 0; c < sp.colors; c++) for (let i = 0; i < sp.cap; i++) balls.push(c);
    for (let attempt = 0; attempt < 200; attempt++) {
      rnd.shuffle(balls);
      const tubes = [];
      for (let t = 0; t < sp.colors; t++) tubes.push(balls.slice(t * sp.cap, (t + 1) * sp.cap));
      let pairs = 0, bad = false;
      for (const t of tubes) {
        if (topRun(t) >= 3 || isComplete(t, sp.cap)) bad = true;
        for (let i = 1; i < t.length; i++) if (t[i] === t[i - 1]) pairs++;
      }
      if (bad || (sp.colors > 2 && pairs > Math.max(1, sp.colors / 3))) continue;
      for (let e = 0; e < sp.empty; e++) tubes.push([]);
      return tubes;
    }
    return null;
  }

  function generate(sp, seed) {
    const rnd = RNG(seed);
    let best = null;
    for (let i = 0, found = 0; i < 60 && found < sp.tries; i++) {
      const tubes = deal(sp, rnd);
      if (!tubes) continue;
      const sol = solve(tubes, sp.cap, { limit: 120000 });
      if (!sol) continue;
      found++;
      if (!best || sol.length > best.sol.length) best = { tubes, sol };
    }
    if (!best) return null;
    return {
      tubes: best.tubes, cap: sp.cap, mystery: sp.mystery, hard: sp.hard,
      par: best.sol.length,                                   // pours
      parBalls: best.sol.reduce((s, m) => s + m[2], 0)        // single-ball moves
    };
  }

  // compact level strings: "abca|bcab||;par;parBalls;flags"
  function encode(L) {
    return L.tubes.map(t => t.map(c => CH[c]).join("")).join("|") + ";" + L.par + ";" + L.parBalls + ";" + (L.hard ? "h" : "") + (L.mystery ? "m" : "");
  }
  function decode(s) {
    const [t, par, parBalls, flags = ""] = s.split(";");
    return {
      tubes: t.split("|").map(x => [...x].map(ch => CH.indexOf(ch))),
      cap: 4, par: +par, parBalls: +parBalls,
      hard: flags.includes("h"), mystery: flags.includes("m")
    };
  }

  const api = { RNG, top, topRun, isComplete, canMove, move, isSolved, hasMoves, solve, spec, generate, encode, decode };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Engine = api;
})(typeof window !== "undefined" ? window : globalThis);

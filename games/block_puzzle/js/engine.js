/* Board rules with no DOM: shapes, placement, line detection, a fair piece
   generator and the seeded Adventure level generator. */
window.Engine = (() => {
  // ---- shapes ---------------------------------------------------------------
  // "#" = block. rot = how many distinct 90° rotations to include.
  const BASE = [
    { p: "#", w: 1.2, rot: 1 },
    { p: "##", w: 2, rot: 2 },
    { p: "###", w: 2.4, rot: 2 },
    { p: "####", w: 1.8, rot: 2 },
    { p: "#####", w: 1, rot: 2 },
    { p: "##/##", w: 2.4, rot: 1 },
    { p: "###/###/###", w: 0.9, rot: 1 },
    { p: "###/###", w: 1.2, rot: 2 },
    { p: "#./##", w: 1.2, rot: 4 },
    { p: "#../#../###", w: 0.8, rot: 4 },
    { p: "#./#./##", w: 0.6, rot: 4 },
    { p: ".#/.#/##", w: 0.6, rot: 4 },
    { p: "###/.#.", w: 0.7, rot: 4 },
    { p: ".##/##.", w: 0.6, rot: 2 },
    { p: "##./.##", w: 0.6, rot: 2 },
    { p: "#./.#", w: 0.4, rot: 2 }
  ];

  const parse = p => {
    const cells = [];
    p.split("/").forEach((row, r) => [...row].forEach((ch, c) => { if (ch === "#") cells.push([r, c]); }));
    return norm(cells);
  };
  function norm(cells) {
    const minR = Math.min(...cells.map(x => x[0])), minC = Math.min(...cells.map(x => x[1]));
    const out = cells.map(([r, c]) => [r - minR, c - minC]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    return out;
  }
  const dims = cells => ({ h: Math.max(...cells.map(x => x[0])) + 1, w: Math.max(...cells.map(x => x[1])) + 1 });
  function rotate(cells) { const { h } = dims(cells); return norm(cells.map(([r, c]) => [c, h - 1 - r])); }

  const SHAPES = [];
  BASE.forEach(b => {
    let cells = parse(b.p);
    for (let i = 0; i < b.rot; i++) {
      SHAPES.push({ cells, w: b.w / b.rot, size: cells.length, ...dims(cells) });
      cells = rotate(cells);
    }
  });

  function makePiece(shape, color) {
    return { cells: shape.cells.map(c => c.slice()), ...dims(shape.cells), color };
  }
  function rotatePiece(p) { const cells = rotate(p.cells); return { ...p, cells, ...dims(cells) }; }

  // ---- RNG ------------------------------------------------------------------
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---- board ops (board = flat array N*N, null | {color, gem}) ------------
  function canPlace(board, N, cells, r0, c0) {
    for (const [r, c] of cells) {
      const rr = r0 + r, cc = c0 + c;
      if (rr < 0 || rr >= N || cc < 0 || cc >= N || board[rr * N + cc]) return false;
    }
    return true;
  }
  function fitsAnywhere(board, N, piece) {
    for (let r = 0; r <= N - piece.h; r++) for (let c = 0; c <= N - piece.w; c++)
      if (canPlace(board, N, piece.cells, r, c)) return true;
    return false;
  }
  function fullLines(board, N) {
    const rows = [], cols = [];
    for (let i = 0; i < N; i++) {
      let rf = true, cf = true;
      for (let j = 0; j < N; j++) {
        if (!board[i * N + j]) rf = false;
        if (!board[j * N + i]) cf = false;
      }
      if (rf) rows.push(i);
      if (cf) cols.push(i);
    }
    return { rows, cols };
  }
  // Lines that WOULD complete if piece were dropped at r0,c0 (for the ghost highlight).
  function previewLines(board, N, cells, r0, c0) {
    const b = board.slice();
    cells.forEach(([r, c]) => { b[(r0 + r) * N + c0 + c] = { color: -1 }; });
    return fullLines(b, N);
  }
  const fillRatio = (board) => board.filter(Boolean).length / board.length;

  // ---- fair generator -------------------------------------------------------
  function pickShape(rand, crowd) {
    let total = 0;
    const ws = SHAPES.map(s => {
      let w = s.w;
      if (s.size <= 3) w *= 1 + crowd * 1.6;
      if (s.size >= 6) w *= Math.max(0.15, 1 - crowd * 1.2);
      total += w; return w;
    });
    let x = rand() * total;
    for (let i = 0; i < SHAPES.length; i++) { x -= ws[i]; if (x <= 0) return SHAPES[i]; }
    return SHAPES[0];
  }
  // A shape + spot that completes at least one line, if one exists.
  function helperShape(board, N, rand) {
    const order = SHAPES.map((s, i) => [rand(), i]).sort((a, b) => a[0] - b[0]).map(x => SHAPES[x[1]]);
    for (const s of order) {
      for (let r = 0; r <= N - s.h; r++) for (let c = 0; c <= N - s.w; c++) {
        if (!canPlace(board, N, s.cells, r, c)) continue;
        const l = previewLines(board, N, s.cells, r, c);
        if (l.rows.length + l.cols.length) return s;
      }
    }
    return null;
  }

  function clearFull(b, N) {
    const { rows, cols } = fullLines(b, N);
    rows.forEach(r => { for (let c = 0; c < N; c++) b[r * N + c] = null; });
    cols.forEach(c => { for (let r = 0; r < N; r++) b[r * N + c] = null; });
  }
  // Can all three pieces be placed in SOME order (first-fit, clearing lines as we go)?
  const ORDERS = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
  function allPlaceable(board, N, tray) {
    for (const order of ORDERS) {
      const b = board.slice();
      let ok = true;
      for (const i of order) {
        const p = tray[i];
        if (!p) continue;
        let placed = false;
        for (let r = 0; r <= N - p.h && !placed; r++) for (let c = 0; c <= N - p.w && !placed; c++) {
          if (canPlace(b, N, p.cells, r, c)) {
            p.cells.forEach(([dr, dc]) => { b[(r + dr) * N + c + dc] = { color: 0 }; });
            clearFull(b, N); placed = true;
          }
        }
        if (!placed) { ok = false; break; }
      }
      if (ok) return true;
    }
    return false;
  }

  // opts.maxSize caps piece size (Adventure keeps early levels gentle).
  function genTray(board, N, colors, rand = Math.random, opts = {}) {
    const crowd = fillRatio(board);
    const maxSize = opts.maxSize || 99;
    const color = () => Math.floor(rand() * colors.length);
    const pick = () => { let s; do { s = pickShape(rand, crowd); } while (s.size > maxSize); return s; };
    let best = null;
    for (let attempt = 0; attempt < 40; attempt++) {
      const tray = [0, 1, 2].map(() => makePiece(pick(), color()));
      const all = allPlaceable(board, N, tray);
      const fit = all ? 4 : tray.filter(p => fitsAnywhere(board, N, p)).length;
      if (!best || fit > best.fit) best = { tray, fit };
      if (all) break;
    }
    const tray = best.tray;
    // a little kindness when the board is getting busy: swap in a line-completing piece
    if (crowd > 0.3 && rand() < 0.45) {
      const h = helperShape(board, N, rand);
      if (h && h.size <= maxSize) {
        const k = Math.floor(rand() * 3), keep = tray[k];
        tray[k] = makePiece(h, color());
        if (best.fit === 4 && !allPlaceable(board, N, tray)) tray[k] = keep;
      }
    }
    if (!tray.some(p => fitsAnywhere(board, N, p))) tray[0] = makePiece(SHAPES[0], color());
    return tray;
  }

  // ---- adventure levels -----------------------------------------------------
  // Mirrored, clustered layouts so levels look hand-made and leave room to play.
  const PATTERNS = {
    rows(set, N, d, rand) {
      const k = 2 + Math.round(d * 2);
      for (let i = 0; i < k; i++) {
        const r = N - 1 - i;
        const holes = new Set([Math.floor(rand() * N / 2), Math.floor(rand() * N / 2)]);
        for (let c = 0; c < N / 2; c++) if (!holes.has(c)) set(r, c, i);
      }
    },
    pillars(set, N, d, rand) {
      for (let c = 0; c < 2; c++) {
        const h = 3 + Math.floor(rand() * (2 + d * 3));
        for (let i = 0; i < h; i++) set(N - 1 - i, c, c);
      }
      if (d > 0.3) for (let c = 2; c < N / 2; c++) if (rand() < 0.6) set(N - 1, c, 2);
    },
    frame(set, N, d, rand) {
      for (let c = 0; c < N / 2; c++) { if (rand() < 0.75) set(0, c, 0); if (rand() < 0.75) set(N - 1, c, 0); }
      for (let r = 1; r < N - 1; r++) if (rand() < 0.55 + d * 0.3) set(r, 0, 1);
      if (d > 0.5) for (let r = 2; r < N - 2; r++) if (rand() < 0.4) set(r, 1, 2);
    },
    pyramid(set, N, d) {
      const levels = 3 + Math.round(d * 2);
      for (let i = 0; i < levels; i++) for (let c = i; c < N / 2; c++) set(N - 1 - i, c, i % 3);
    },
    corners(set, N, d, rand) {
      const s = 2 + Math.round(d);
      for (let r = 0; r < s; r++) for (let c = 0; c < s; c++) {
        if (rand() < 0.85) set(r, c, 0);
        if (rand() < 0.85) set(N - 1 - r, c, 1);
      }
    }
  };
  const PATTERN_ORDER = ["rows", "pillars", "corners", "pyramid", "frame"];

  function genLevel(n, N, colorCount) {
    const rand = rng(n * 9973 + 17);
    const board = Array(N * N).fill(null);
    const type = n % 5 === 0 ? "score" : "gems";
    const d = Math.min(1, (n - 1) / 40);                     // difficulty 0..1
    const pal = [0, 1, 2].map(() => Math.floor(rand() * colorCount));
    const set = (r, c, k) => {
      if (r < 0 || r >= N || c < 0 || c >= N) return;
      const color = pal[k % pal.length];
      board[r * N + c] = { color };
      board[r * N + (N - 1 - c)] = { color };
    };
    const pat = PATTERN_ORDER[(n - 1) % PATTERN_ORDER.length];
    PATTERNS[pat](set, N, d, rand);
    // a few mirrored extras on later levels
    for (let i = 0; i < Math.round(d * 6); i++) set(Math.floor(rand() * N), Math.floor(rand() * N / 2), i);

    const clearMirror = (r, c) => { board[r * N + c] = null; board[r * N + (N - 1 - c)] = null; };
    for (let k = 0; k < 6; k++) {
      const { rows, cols } = fullLines(board, N);
      if (!rows.length && !cols.length) break;
      rows.forEach(r => clearMirror(r, Math.floor(rand() * N / 2)));
      cols.forEach(c => clearMirror(Math.floor(rand() * N), Math.min(c, N - 1 - c)));
    }
    // guarantee an open 3×3 somewhere so big pieces can land
    const open3 = () => {
      for (let r = 0; r <= N - 3; r++) for (let c = 0; c <= N - 3; c++) {
        let ok = true;
        for (let i = 0; i < 9 && ok; i++) if (board[(r + Math.floor(i / 3)) * N + c + (i % 3)]) ok = false;
        if (ok) return true;
      }
      return false;
    };
    if (!open3()) for (let r = 1; r < 4; r++) for (let c = 2; c < N - 2; c++) board[r * N + c] = null;

    const filled = board.map((b, i) => (b ? i : -1)).filter(i => i >= 0);
    let gems = 0, target = 0;
    if (type === "gems") {
      gems = Math.min(3 + Math.floor(n / 3), 14, filled.length);
      for (let i = filled.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [filled[i], filled[j]] = [filled[j], filled[i]]; }
      filled.slice(0, gems).forEach(i => { board[i].gem = true; });
    } else {
      target = Math.min(200 + n * 12, 1500);
    }
    const par = type === "gems" ? Math.ceil(gems * 1.6 + 8) : Math.ceil(target / 6.5);
    const maxSize = n < 6 ? 6 : n < 15 ? 8 : 9;
    return { n, type, pattern: pat, board, gems, target, par, maxSize, seed: n * 31 + 5 };
  }

  return { SHAPES, makePiece, rotatePiece, rng, canPlace, fitsAnywhere, fullLines, previewLines, fillRatio, genTray, genLevel, allPlaceable };
})();

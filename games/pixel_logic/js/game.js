/* ==========================================================================
   PIXEL LOGIC — nonogram engine on a DOM grid.
   Clues from the picture, fill / cross modes, drag-painting in a straight
   line, satisfied-clue strike-through, win when every clue matches (any valid
   answer), hints from the picture, undo, and a two-ink "print" reveal.
   ========================================================================== */
window.Game = (() => {
  const CF = window.GAME_CONFIG;
  const wrap = document.getElementById("puzzle");
  const hooks = {}, emit = (n, d) => hooks[n] && hooks[n](d);
  let pic = null, N = 5, sol = [], grid = [], rowsC = [], colsC = [], mode = 1, history = [], done = false, time = 0, timer = null, paused = false, cells = [];
  const clue = line => { const r = []; let n = 0; for (const c of line) { if (c === 1) n++; else if (n) { r.push(n); n = 0; } } if (n) r.push(n); return r.length ? r : [0]; };

  function load(p) {
    pic = p; N = p.p.length; sol = p.p.map(r => [...r].map(c => c === "#" ? 1 : 0));
    grid = sol.map(r => r.map(() => 0));              // 0 blank, 1 filled, 2 crossed
    rowsC = sol.map(r => clue(r)); colsC = sol[0].map((_, c) => clue(sol.map(r => r[c])));
    history = []; done = false; time = 0; paused = false;
    clearInterval(timer); timer = setInterval(() => { if (!done && !paused) { time++; emit("hud"); } }, 1000);
    build(); refresh(); emit("hud");
  }
  function build() {
    wrap.style.setProperty("--n", N); wrap.dataset.n = N; wrap.innerHTML = "";
    const corner = document.createElement("div"); corner.className = "corner"; corner.innerHTML = `<b>${N}×${N}</b>`; wrap.appendChild(corner);
    const top = document.createElement("div"); top.className = "cols"; colsC.forEach((c, i) => { const d = document.createElement("div"); d.className = "clue col"; d.innerHTML = c.map(x => `<i>${x}</i>`).join(""); d.dataset.c = i; top.appendChild(d); }); wrap.appendChild(top);
    const left = document.createElement("div"); left.className = "rows"; rowsC.forEach((c, i) => { const d = document.createElement("div"); d.className = "clue row"; d.innerHTML = c.map(x => `<i>${x}</i>`).join(""); d.dataset.r = i; left.appendChild(d); }); wrap.appendChild(left);
    const board = document.createElement("div"); board.className = "cells"; board.id = "cells"; cells = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { const e = document.createElement("div"); e.className = "cell"; e.dataset.r = r; e.dataset.c = c; if (c % 5 === 4 && c < N - 1) e.classList.add("vr"); if (r % 5 === 4 && r < N - 1) e.classList.add("hr"); board.appendChild(e); cells.push(e); }
    wrap.appendChild(board);
  }
  const lineDone = (arr, cl) => JSON.stringify(clue(arr.map(v => v === 1 ? 1 : 0))) === JSON.stringify(cl);
  function refresh() {
    grid.forEach((row, r) => row.forEach((v, c) => { const e = cells[r * N + c]; e.classList.toggle("on", v === 1); e.classList.toggle("x", v === 2); }));
    wrap.querySelectorAll(".clue.row").forEach((d, r) => d.classList.toggle("ok", lineDone(grid[r], rowsC[r])));
    wrap.querySelectorAll(".clue.col").forEach((d, c) => d.classList.toggle("ok", lineDone(grid.map(x => x[c]), colsC[c])));
  }
  function set(r, c, v, quiet) {
    if (grid[r][c] === v) return false;
    const beforeR = lineDone(grid[r], rowsC[r]), beforeC = lineDone(grid.map(x => x[c]), colsC[c]);
    grid[r][c] = v;
    const e = cells[r * N + c]; e.classList.remove("pop"); void e.offsetWidth; if (v === 1) e.classList.add("pop");
    if (!quiet) { if (v === 1) Sound.sfx("fill", r + c); else if (v === 2) Sound.sfx("cross"); else Sound.sfx("clear"); }
    const aR = lineDone(grid[r], rowsC[r]), aC = lineDone(grid.map(x => x[c]), colsC[c]);
    if ((aR && !beforeR) || (aC && !beforeC)) Sound.sfx("line", r + c);
    return true;
  }
  function check() {
    if (rowsC.every((cl, r) => lineDone(grid[r], cl)) && colsC.every((cl, c) => lineDone(grid.map(x => x[c]), cl))) {
      done = true; clearInterval(timer);
      grid = grid.map(row => row.map(v => v === 1 ? 1 : 0)); refresh();
      wrap.classList.add("printed"); Sound.sfx("print");
      setTimeout(() => emit("won", { name: pic.n, time, n: N }), 1500);
    }
  }

  /* ---------- input: press, then drag in one straight line ---------- */
  let stroke = null;
  wrap.addEventListener("pointerdown", e => {
    const el = e.target.closest(".cell"); if (!el || done || paused) return;
    const r = +el.dataset.r, c = +el.dataset.c, cur = grid[r][c];
    const target = mode === 1 ? (cur === 1 ? 0 : 1) : (cur === 2 ? 0 : 2);
    history.push(grid.map(x => x.slice())); if (history.length > 100) history.shift();
    stroke = { r, c, target, axis: null, last: null };
    set(r, c, target); refresh();
    wrap.setPointerCapture && wrap.setPointerCapture(e.pointerId);
  });
  wrap.addEventListener("pointermove", e => {
    if (!stroke) return; const el = document.elementFromPoint(e.clientX, e.clientY); const cell = el && el.closest && el.closest(".cell"); if (!cell) return;
    let r = +cell.dataset.r, c = +cell.dataset.c;
    if (!stroke.axis && (r !== stroke.r || c !== stroke.c)) stroke.axis = r === stroke.r ? "row" : c === stroke.c ? "col" : (Math.abs(r - stroke.r) < Math.abs(c - stroke.c) ? "row" : "col");
    if (stroke.axis === "row") r = stroke.r; if (stroke.axis === "col") c = stroke.c;
    const key = r + "," + c; if (key === stroke.last) return; stroke.last = key;
    // paint every cell between the start and here (so fast swipes never skip)
    const r0 = Math.min(r, stroke.r), r1 = Math.max(r, stroke.r), c0 = Math.min(c, stroke.c), c1 = Math.max(c, stroke.c);
    for (let y = r0; y <= r1; y++) for (let x = c0; x <= c1; x++) { const cur = grid[y][x]; if (stroke.target === 0 ? cur !== 0 : cur === 0) set(y, x, stroke.target, true); }
    Sound.sfx(stroke.target === 1 ? "fill" : "cross", r + c); refresh();
  });
  const end = () => { if (!stroke) return; stroke = null; emit("hud"); check(); };
  wrap.addEventListener("pointerup", end); wrap.addEventListener("pointercancel", end);
  addEventListener("keydown", e => { if (e.key === "x") setMode(mode === 1 ? 2 : 1); if (e.key === "u" || (e.key === "z" && (e.ctrlKey || e.metaKey))) undo(); if (e.key === "Escape" || e.key === "p") emit("pauseKey"); });

  function setMode(m) { mode = m; emit("mode", m); }
  function undo() { if (!history.length || done) return; grid = history.pop(); refresh(); Sound.sfx("clear"); emit("hud"); }
  function hint() {
    if (done) return false;
    const wrong = []; grid.forEach((row, r) => row.forEach((v, c) => { const want = sol[r][c]; if ((want === 1 && v !== 1) || (want === 0 && v === 1)) wrong.push([r, c]); }));
    if (!wrong.length) return false;
    const [r, c] = wrong[Math.floor(Math.random() * wrong.length)];
    history.push(grid.map(x => x.slice()));
    set(r, c, sol[r][c] ? 1 : 2); cells[r * N + c].classList.add("hinted"); refresh(); Sound.sfx("hint"); emit("hud"); check();
    return true;
  }
  // count mistakes against the picture (only shown on request)
  function mistakes() { let m = 0; grid.forEach((row, r) => row.forEach((v, c) => { if ((v === 1 && !sol[r][c]) || (v === 2 && sol[r][c])) m++; })); return m; }

  return {
    on: (n, f) => hooks[n] = f, load, setMode, undo, hint, mistakes, check,
    pause() { paused = true; }, resume() { paused = false; }, stop() { done = true; clearInterval(timer); },
    paint(r, c, v) { set(r, c, v, true); refresh(); },     // testing hook
    get mode() { return mode; }, get time() { return time; }, get done() { return done; }, get size() { return N; }, get solution() { return sol; }, get grid() { return grid; },
    get filled() { return grid.flat().filter(v => v === 1).length; }, get target() { return sol.flat().filter(v => v === 1).length; }
  };
})();

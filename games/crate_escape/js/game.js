/* ==========================================================================
   CRATE ESCAPE — engine on DOM blocks.
   Drag a block along its axis (it stops at neighbours), snap to cells, count
   moves, undo, reset, BFS hint for the best next move, crate exit animation.
   ========================================================================== */
window.Game = (() => {
  const CF = window.GAME_CONFIG, N = 6, ROW = 2;
  const board = document.getElementById("box"), tray = document.getElementById("blocks");
  const hooks = {}, emit = (n, d) => hooks[n] && hooks[n](d);
  let blocks = [], level = 0, min = 0, moves = 0, history = [], done = false, cell = 50, drag = null, paused = false;

  function load(i) {
    level = i; const L = window.LEVELS[i]; min = L.min; moves = 0; history = []; done = false; paused = false;
    blocks = L.blocks.map(([r, c, len, h], k) => ({ r, c, len, h: !!h, k }));
    tray.innerHTML = "";
    blocks.forEach((b, k) => {
      const e = document.createElement("div"); e.className = "blk " + (k === 0 ? "crate" : b.h ? "h" : "v"); e.dataset.k = k;
      if (k) e.style.setProperty("--paint", CF.paints[(k - 1) % CF.paints.length]);
      e.style.setProperty("--len", b.len); e.innerHTML = k === 0 ? "<span>➜</span>" : "<i></i>";
      b.el = e; tray.appendChild(e);
    });
    layout(); emit("hud");
  }
  function layout() { cell = board.clientWidth / N; blocks.forEach(place); }
  function place(b, px = null) {
    const x = b.c * cell, y = b.r * cell, off = px === null ? 0 : px;
    b.el.style.width = (b.h ? b.len : 1) * cell - 6 + "px"; b.el.style.height = (b.h ? 1 : b.len) * cell - 6 + "px";
    b.el.style.transform = `translate(${x + 3 + (b.h ? off : 0)}px, ${y + 3 + (b.h ? 0 : off)}px)`;
  }
  addEventListener("resize", () => blocks.length && layout());

  function grid(skip) { const g = new Array(N * N).fill(-1); blocks.forEach((b, i) => { if (i === skip) return; for (let k = 0; k < b.len; k++) g[(b.r + (b.h ? 0 : k)) * N + b.c + (b.h ? k : 0)] = i; }); return g; }
  // how far a block may travel each way
  function range(i) {
    const b = blocks[i], g = grid(i); let lo = 0, hi = 0;
    const free = p => { const r = b.h ? b.r : p, c = b.h ? p : b.c; return r >= 0 && c >= 0 && r < N && c < N && g[r * N + c] === -1; };
    const start = b.h ? b.c : b.r;
    while (free(start - lo - 1)) lo++;
    while (free(start + b.len + hi)) hi++;
    if (i === 0 && start + b.len + hi === N) hi += 2;   // the crate can slide out through the gate
    return [lo, hi];
  }
  function commit(i, d) {
    if (!d) return;
    history.push(blocks.map(b => [b.r, b.c])); moves++;
    const b = blocks[i]; if (b.h) b.c += d; else b.r += d;
    Sound.sfx("slide", Math.abs(d)); setTimeout(() => Sound.sfx("drop"), 60);
    emit("hud");
    if (blocks[0].c + blocks[0].len > N - 1 && blocks[0].c >= N - 2) win();
  }
  function win() {
    done = true; Sound.sfx("gate"); const b = blocks[0]; b.el.classList.add("out"); b.c = N + 1; place(b);
    board.classList.add("open");
    const stars = moves <= min + CF.stars.three ? 3 : moves <= min + CF.stars.two ? 2 : 1;
    setTimeout(() => emit("won", { level, moves, min, stars }), 900);
  }

  /* ---------- drag ---------- */
  board.addEventListener("pointerdown", e => {
    if (done || paused) return; const el = e.target.closest(".blk"); if (!el) return;
    const i = +el.dataset.k, b = blocks[i], [lo, hi] = range(i);
    drag = { i, x: e.clientX, y: e.clientY, lo: -lo * cell, hi: hi * cell, off: 0 };
    el.classList.add("lift"); Sound.sfx("pick"); board.setPointerCapture && board.setPointerCapture(e.pointerId);
  });
  board.addEventListener("pointermove", e => {
    if (!drag) return; const b = blocks[drag.i], raw = b.h ? e.clientX - drag.x : e.clientY - drag.y;
    let off = Math.max(drag.lo, Math.min(drag.hi, raw)); if ((raw < drag.lo - 12 || raw > drag.hi + 12) && !drag.bumped) { drag.bumped = true; Sound.sfx("bump"); }
    drag.off = off; b.el.style.transition = "none"; place(b, off);
  });
  const up = () => {
    if (!drag) return; const d = drag; drag = null; const b = blocks[d.i];
    b.el.classList.remove("lift"); b.el.style.transition = "";
    let steps = Math.round(d.off / cell);
    // the crate leaves as soon as it is dragged into the gate
    if (d.i === 0 && b.c + steps + b.len > N) steps = N - b.len - b.c + 1;
    if (d.i === 0 && b.c + steps >= N - 1) steps = N - 2 - b.c;
    if (steps) commit(d.i, steps); place(b);
    if (d.i === 0 && Math.round(d.off / cell) + b.c > N - 2 - 0 && !done && b.c === N - 2) win();
  };
  board.addEventListener("pointerup", up); board.addEventListener("pointercancel", up);

  /* ---------- solver for hints ---------- */
  const keyOf = bs => bs.map(b => b.h ? b.c : b.r).join(",");
  function solve(cap = 300000) {
    const start = blocks.map(b => ({ r: b.r, c: b.c, len: b.len, h: b.h })), prev = new Map([[keyOf(start), null]]), q = [start]; let qi = 0;
    while (qi < q.length && prev.size < cap) {
      const s = q[qi++];
      if (s[0].c === N - 2) { let k = keyOf(s), path = []; while (prev.get(k)) { const [pk, mv] = prev.get(k); path.unshift(mv); k = pk; } return path; }
      const g = new Array(N * N).fill(-1); s.forEach((b, i) => { for (let k = 0; k < b.len; k++) g[(b.r + (b.h ? 0 : k)) * N + b.c + (b.h ? k : 0)] = i; });
      s.forEach((b, i) => { for (const dir of [-1, 1]) for (let st = 1; st < N; st++) { const lo = (b.h ? b.c : b.r) + dir * st; if (lo < 0 || lo + b.len > N) break; const cellI = b.h ? b.r * N + (dir > 0 ? lo + b.len - 1 : lo) : (dir > 0 ? lo + b.len - 1 : lo) * N + b.c; if (g[cellI] !== -1 && g[cellI] !== i) break; const n = s.map(x => ({ ...x })); if (b.h) n[i].c = lo; else n[i].r = lo; const k = keyOf(n); if (!prev.has(k)) { prev.set(k, [keyOf(s), [i, dir * st]]); q.push(n); } } });
    }
    return null;
  }
  function hint() {
    if (done) return false; const path = solve(); if (!path || !path.length) return false;
    const [i, d] = path[0], b = blocks[i]; b.el.classList.remove("hinted"); void b.el.offsetWidth; b.el.classList.add("hinted"); b.el.style.setProperty("--hx", (b.h ? d * cell : 0) + "px"); b.el.style.setProperty("--hy", (b.h ? 0 : d * cell) + "px");
    Sound.sfx("hint"); return { i, d, left: path.length };
  }
  function undo() { if (!history.length || done) return; const h = history.pop(); blocks.forEach((b, i) => { [b.r, b.c] = h[i]; place(b); }); moves = Math.max(0, moves - 1); Sound.sfx("undo"); emit("hud"); }
  addEventListener("keydown", e => { if (e.key === "u" || (e.key === "z" && (e.ctrlKey || e.metaKey))) undo(); if (e.key === "Escape" || e.key === "p") emit("pauseKey"); });

  return {
    on: (n, f) => hooks[n] = f, load, undo, hint, solve, commit, layout,
    reset() { load(level); board.classList.remove("open"); }, pause() { paused = true; }, resume() { paused = false; },
    get moves() { return moves; }, get min() { return min; }, get level() { return level; }, get done() { return done; }, get blocks() { return blocks; }
  };
})();

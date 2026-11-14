/* ==========================================================================
   TILE FUSE — engine. Pure DOM: every tile is a <div> positioned with CSS
   variables, so moves animate with CSS transitions. Supports undo, wild
   tiles, smash, Rush clock and a seeded Daily board.
   ========================================================================== */
window.Game = (() => {
  const CF = window.GAME_CONFIG;
  const boardEl = document.getElementById("board"), layer = document.getElementById("tiles");
  let mode = CF.modes[0], N = 4, grid = [], tiles = [], nextId = 1;
  let score = 0, best = 0, moves = 0, undos = 0, history = [], over = false, reached = false, smashArmed = false;
  let rand = Math.random, timeLeft = 0, clock = null, paused = false, maxTile = 0, lock = false;
  const hooks = {}, emit = (n, d) => hooks[n] && hooks[n](d);

  function seeded(s) { return () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const todaySeed = () => { const d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); };

  /* ---------- tiles ---------- */
  function makeTile(v, r, c, wild = false, cls = "new") {
    const el = document.createElement("div");
    const t = { id: nextId++, v, r, c, wild, el };
    paint(t); el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), 220);
    layer.appendChild(el); tiles.push(t); grid[r][c] = t;
    maxTile = Math.max(maxTile, wild ? 0 : v);
    return t;
  }
  function paint(t) {
    t.el.className = "tile " + (t.wild ? "wild" : "v" + Math.min(t.v, 16));
    t.el.style.setProperty("--r", t.r); t.el.style.setProperty("--c", t.c);
    t.el.innerHTML = t.wild ? "<b>✱</b>" : `<b>${t.v}</b><i>${String(t.v).padStart(2, "0")}</i>`;
  }
  function place(t) { t.el.style.setProperty("--r", t.r); t.el.style.setProperty("--c", t.c); }
  function kill(t) { tiles = tiles.filter(x => x !== t); setTimeout(() => t.el.remove(), 120); }

  function empties() { const e = []; for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!grid[r][c]) e.push([r, c]); return e; }
  function spawn() {
    const e = empties(); if (!e.length) return;
    const [r, c] = e[Math.floor(rand() * e.length)];
    const roll = rand();
    if (roll < CF.spawn.wildChance && moves > 8) makeTile(0, r, c, true);
    else makeTile(roll < CF.spawn.twoChance + CF.spawn.wildChance ? 2 : 1, r, c);
    Sound.sfx("spawn");
  }
  const fusable = (a, b) => a && b && (a.wild || b.wild || a.v === b.v);
  function canMove() {
    if (empties().length) return true;
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { const t = grid[r][c]; if (fusable(t, grid[r][c + 1] || null) || (grid[r + 1] && fusable(t, grid[r + 1][c]))) return true; }
    return false;
  }

  /* ---------- snapshots for undo ---------- */
  const snap = () => ({ cells: grid.map(row => row.map(t => t ? [t.v, t.wild] : null)), score, moves, maxTile, reached, rs: rand.state });
  function restore(s) {
    layer.innerHTML = ""; tiles = []; grid = Array.from({ length: N }, () => Array(N).fill(null));
    s.cells.forEach((row, r) => row.forEach((x, c) => { if (x) makeTile(x[0], r, c, x[1], "none"); }));
    score = s.score; moves = s.moves; maxTile = s.maxTile; reached = s.reached;
  }

  /* ---------- the slide ---------- */
  const DIRS = { left: [0, -1], right: [0, 1], up: [-1, 0], down: [1, 0] };
  function move(dir) {
    if (over || paused || lock) return false;
    const [dr, dc] = DIRS[dir]; if (dr === undefined) return false;
    const before = snap();
    const rows = [...Array(N).keys()], cols = [...Array(N).keys()];
    if (dr === 1) rows.reverse(); if (dc === 1) cols.reverse();
    let moved = false, fuses = [], gained = 0;
    const fusedThisTurn = new Set();
    for (const r of rows) for (const c of cols) {
      const t = grid[r][c]; if (!t) continue;
      let nr = r, nc = c;
      while (true) {
        const tr = nr + dr, tc = nc + dc;
        if (tr < 0 || tc < 0 || tr >= N || tc >= N) break;
        const o = grid[tr][tc];
        if (!o) { nr = tr; nc = tc; continue; }
        if (fusable(t, o) && !fusedThisTurn.has(o.id)) {
          // fuse: t slides into o, both vanish, a new tile appears
          grid[r][c] = null; grid[tr][tc] = null;
          t.r = tr; t.c = tc; place(t); t.el.style.zIndex = 1;
          const v = t.wild && o.wild ? 2 : t.wild ? o.v + 1 : o.wild ? t.v + 1 : t.v + 1;
          kill(t); kill(o);
          const nt = makeTile(v, tr, tc, false, "fused");
          fusedThisTurn.add(nt.id);
          fuses.push(v); gained += Math.pow(2, v);
          moved = true; nr = null;
          break;
        }
        break;
      }
      if (nr !== null && (nr !== r || nc !== c)) { grid[r][c] = null; grid[nr][nc] = t; t.r = nr; t.c = nc; place(t); moved = true; }
    }
    if (!moved) { Sound.sfx("blocked"); boardEl.classList.remove("nudge-" + dir); void boardEl.offsetWidth; boardEl.classList.add("nudge-" + dir); return false; }
    history.push(before); if (history.length > 20) history.shift();
    moves++;
    if (fuses.length) {
      const mult = 1 + (fuses.length - 1) * CF.comboBonus;
      score += Math.round(gained * mult);
      const top = Math.max(...fuses);
      Sound.sfx("fuse", top);
      if (fuses.length > 1) { Sound.sfx("combo", fuses.length); emit("combo", fuses.length); }
      if (mode.time && top >= 6) { timeLeft += CF.spawn.rushBonusSeconds; emit("bonusTime", CF.spawn.rushBonusSeconds); }
      if (top >= 7) { boardEl.classList.remove("jolt"); void boardEl.offsetWidth; boardEl.classList.add("jolt"); }
      emit("fused", { top, count: fuses.length, points: Math.round(gained * mult) });
    } else Sound.sfx("slide");
    lock = true;
    setTimeout(() => {
      lock = false;
      spawn();
      best = Math.max(best, score);
      if (!reached && maxTile >= mode.goal) { reached = true; Sound.sfx("goal"); emit("goal", { tile: maxTile }); }
      if (!canMove()) end("full");
      emit("hud");
    }, 110);
    return true;
  }

  function end(why) {
    if (over) return; over = true; clearInterval(clock);
    Sound.sfx("over");
    emit("over", { why, score, maxTile, moves, mode: mode.id });
  }

  /* ---------- tools ---------- */
  function undo() {
    if (!history.length || over) return false;
    restore(history.pop()); Sound.sfx("undo"); emit("hud"); return true;
  }
  function smashAt(r, c) {
    const t = grid[r] && grid[r][c]; if (!t) return false;
    grid[r][c] = null; t.el.classList.add("smashed"); tiles = tiles.filter(x => x !== t); setTimeout(() => t.el.remove(), 350);
    Sound.sfx("smash"); boardEl.classList.remove("jolt"); void boardEl.offsetWidth; boardEl.classList.add("jolt");
    smashArmed = false; boardEl.classList.remove("armed"); emit("hud"); return true;
  }

  /* ---------- new game ---------- */
  function newGame(id) {
    mode = CF.modes.find(m => m.id === id) || CF.modes[0]; N = mode.size;
    boardEl.style.setProperty("--n", N); boardEl.dataset.size = N;
    layer.innerHTML = ""; tiles = []; grid = Array.from({ length: N }, () => Array(N).fill(null));
    score = 0; moves = 0; maxTile = 0; history = []; over = false; reached = false; paused = false; lock = false;
    undos = CF.tools.undoStart; smashArmed = false; boardEl.classList.remove("armed");
    rand = mode.daily ? seeded(todaySeed()) : Math.random;
    // background grid cells
    const bg = document.getElementById("cells"); bg.innerHTML = "<i></i>".repeat(N * N);
    spawn(); spawn();
    clearInterval(clock);
    if (mode.time) {
      timeLeft = mode.time;
      clock = setInterval(() => {
        if (paused || over) return;
        timeLeft -= 0.1;
        if (timeLeft <= 10 && Math.abs(timeLeft - Math.round(timeLeft)) < 0.05) Sound.sfx("tick");
        if (timeLeft <= 0) { timeLeft = 0; end("time"); }
        emit("clock", timeLeft);
      }, 100);
    }
    emit("hud");
  }

  /* ---------- input ---------- */
  let start = null;
  boardEl.addEventListener("pointerdown", e => {
    if (smashArmed) {
      const b = boardEl.getBoundingClientRect(), c = Math.floor((e.clientX - b.left) / b.width * N), r = Math.floor((e.clientY - b.top) / b.height * N);
      if (smashAt(r, c)) emit("smashed");
      return;
    }
    start = [e.clientX, e.clientY];
  });
  window.addEventListener("pointerup", e => {
    if (!start) return;
    const dx = e.clientX - start[0], dy = e.clientY - start[1]; start = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
  });
  window.addEventListener("keydown", e => {
    const map = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down", a: "left", d: "right", w: "up", s: "down" };
    if (map[e.key] && emit("canPlay") !== false) { e.preventDefault(); move(map[e.key]); }
    if ((e.key === "z" || e.key === "u") && (e.ctrlKey || e.metaKey || e.key === "u")) emit("undoKey");
    if (e.key === "Escape" || e.key === "p") emit("pauseKey");
  });

  return {
    on(n, f) { hooks[n] = f; }, newGame, move, undo, canMove,
    load(cells) { restore({ cells: cells.map(r => r.map(v => v === 0 ? null : v === "*" ? [0, true] : [v, false])), score: 0, moves: 10, maxTile: 0, reached: false }); },   // testing hook
    armSmash(v) { smashArmed = v; boardEl.classList.toggle("armed", v); },
    pause() { paused = true; }, resume() { paused = false; },
    continueAfterOver() { over = false; for (let i = 0; i < 3; i++) { const t = tiles.filter(x => x.v <= 2)[0] || tiles[0]; if (t) { grid[t.r][t.c] = null; t.el.remove(); tiles = tiles.filter(x => x !== t); } } if (mode.time) { timeLeft = Math.max(timeLeft, 30); clock = setInterval(() => { if (paused || over) return; timeLeft -= 0.1; if (timeLeft <= 0) { timeLeft = 0; end("time"); } emit("clock", timeLeft); }, 100); } emit("hud"); },
    useUndo() { if (undos > 0 && undo()) { undos--; emit("hud"); return true; } return false; },
    addUndo(n) { undos += n; emit("hud"); },
    stop() { over = true; clearInterval(clock); },
    get mode() { return mode; }, get score() { return score; }, get moves() { return moves; }, get maxTile() { return maxTile; },
    get undos() { return undos; }, get over() { return over; }, get timeLeft() { return timeLeft; }, get history() { return history; },
    get grid() { return grid.map(r => r.map(t => t ? (t.wild ? "*" : t.v) : 0)); }
  };
})();

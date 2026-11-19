/* SUDOKU DAILY — the board: puzzle state, input (tap, number pad, keyboard), notes, undo, hints, mistakes,
   and the drawing on a canvas: highlights for the row / column / box and matching numbers, pencil notes,
   pops when you place a number, light waves when a row, column or box is finished, a cascade when you win.
   Puzzles come from js/sudoku.js. */
window.Game = (() => {
  const C = window.GAME_CONFIG, SD = window.Sudoku;
  const cv = document.getElementById("board"), ctx = cv.getContext("2d");
  const on = {};
  let DPR = 1, B = 360, PAD = 6, CS = 38;
  let theme = C.themes[0], opts = { autoNotes: true, same: true, limit: true };
  let S = null;                     // the running puzzle
  let anim = { pops: {}, waves: [], shake: null, hint: null, win: null, t: 0 }, paused = false;

  /* ---------- layout ---------- */
  function resize() {
    const box = cv.parentElement.getBoundingClientRect();
    B = Math.floor(Math.max(200, Math.min(box.width, box.height, 560)));
    DPR = Math.min(3, window.devicePixelRatio || 1);
    cv.width = B * DPR; cv.height = B * DPR; cv.style.width = B + "px"; cv.style.height = B + "px";
    PAD = Math.round(B * 0.018); CS = (B - PAD * 2) / 9;
  }
  addEventListener("resize", resize);

  /* ---------- puzzle ---------- */
  function start(spec) {
    const d = C.difficulties[spec.diff], p = SD.make(spec.seed, d);
    S = { spec, given: p.puzzle.slice(), grid: p.puzzle.slice(), sol: p.solution, notes: new Array(81).fill(0), sel: p.puzzle.indexOf(0),
      notesMode: false, mistakes: 0, hintsLeft: C.hints, hintsUsed: 0, time: 0, hist: [], done: false, over: false, units: new Set() };
    markUnits(true);
    anim = { pops: {}, waves: [], shake: null, hint: null, win: null, t: 0 }; paused = false;
    intro();
    changed();
  }
  function resume(saved) {
    S = Object.assign({}, saved, { hist: [], units: new Set(), done: false, over: false });
    markUnits(true);
    anim = { pops: {}, waves: [], shake: null, hint: null, win: null, t: 0 }; paused = false;
    intro(); changed();
  }
  function intro() { for (let i = 0; i < 81; i++) anim.pops[i] = { t: -((SD.ROW(i) + SD.COL(i)) * 0.025), k: 0.6 }; }
  function snapshot() { return { spec: S.spec, given: S.given, grid: S.grid, sol: S.sol, notes: S.notes, sel: S.sel, notesMode: S.notesMode, mistakes: S.mistakes, hintsLeft: S.hintsLeft, hintsUsed: S.hintsUsed, time: S.time }; }
  const correct = i => S.grid[i] && S.grid[i] === S.sol[i];
  function counts() { const c = new Array(10).fill(0); for (let i = 0; i < 81; i++) if (correct(i)) c[S.grid[i]]++; return c; }
  function changed() { on.change && on.change({ counts: counts(), mistakes: S.mistakes, hintsLeft: S.hintsLeft, notesMode: S.notesMode, canUndo: S.hist.length > 0 }); }
  // units already complete at the start don't celebrate
  function markUnits(silent) {
    const fresh = [];
    SD.UNITS.forEach((u, k) => { if (!S.units.has(k) && u.every(correct)) { S.units.add(k); if (!silent) fresh.push(k); } });
    return fresh;
  }
  function push() { S.hist.push({ grid: S.grid.slice(), notes: S.notes.slice(), mistakes: S.mistakes }); if (S.hist.length > 200) S.hist.shift(); }

  /* ---------- actions ---------- */
  function select(i) { if (!S || S.done) return; if (i !== S.sel) { S.sel = i; Sound.play("select"); } }
  function input(d) {
    if (!S || S.done || S.sel < 0 || paused) return;
    const i = S.sel; if (S.given[i] || correct(i)) { if (correct(i) || S.given[i]) { /* jump to matching digit highlight */ } return; }
    if (S.notesMode) {
      push(); S.notes[i] ^= SD.bit(d); S.grid[i] = 0; Sound.play("note"); anim.pops[i] = { t: 0, k: 0.15 }; changed(); return;
    }
    if (S.grid[i] === d) return;
    push(); S.grid[i] = d; S.notes[i] = 0;
    if (d !== S.sol[i]) {
      S.mistakes++; anim.shake = { i, t: 0 }; Sound.play("wrong");
      on.mistake && on.mistake(S.mistakes);
      if (opts.limit && C.mistakes > 0 && S.mistakes >= C.mistakes) { S.over = true; changed(); setTimeout(() => on.lose && on.lose(result()), 700); return; }
    } else {
      Sound.play("place", d); anim.pops[i] = { t: 0, k: 0.35 };
      if (opts.autoNotes) for (const j of SD.PEERS[i]) S.notes[j] &= ~SD.bit(d);
      const fresh = markUnits(false);
      fresh.forEach((k, n) => { anim.waves.push({ cells: SD.UNITS[k], t: -n * 0.12, from: i }); setTimeout(() => Sound.play("unit", n * 2), n * 120); });
      if (counts()[d] === 9) { setTimeout(() => Sound.play("digit"), 160); on.digitDone && on.digitDone(d); }
      if (S.grid.every((v, k) => v === S.sol[k])) return win();
    }
    changed();
  }
  function erase() {
    if (!S || S.done || paused) return; const i = S.sel; if (i < 0 || S.given[i] || correct(i)) return;
    if (!S.grid[i] && !S.notes[i]) return;
    push(); S.grid[i] = 0; S.notes[i] = 0; Sound.play("erase"); changed();
  }
  function undo() {
    if (!S || S.done || paused || !S.hist.length) return;
    const h = S.hist.pop(); S.grid = h.grid; S.notes = h.notes; Sound.play("undo"); changed();
  }
  function toggleNotes() { if (!S) return; S.notesMode = !S.notesMode; Sound.play("tap"); changed(); }
  function fillNotes() {
    if (!S || S.done || paused) return;
    push(); const g = S.grid.map((v, i) => correct(i) ? v : 0), c = SD.candidates(g);
    for (let i = 0; i < 81; i++) if (!g[i] && !S.grid[i]) { S.notes[i] = c[i]; anim.pops[i] = { t: -Math.random() * 0.2, k: 0.12 }; }
    Sound.play("hint"); changed();
  }
  function hint() {
    if (!S || S.done || paused) return null;
    // a wrong number first
    for (let i = 0; i < 81; i++) if (S.grid[i] && !S.given[i] && S.grid[i] !== S.sol[i]) {
      S.sel = i; anim.hint = { cells: [i], unit: null, t: 0 }; Sound.play("hint"); return { text: `This ${S.grid[i]} is not right. Erase it and try again.`, free: true };
    }
    if (S.hintsLeft <= 0) return { empty: true };
    const g = S.grid.map((v, i) => correct(i) ? v : 0), h = SD.hint(g, S.sol); if (!h) return null;
    S.hintsLeft--; S.hintsUsed++;
    S.sel = h.i; const was = S.notesMode; S.notesMode = false;
    anim.hint = { cells: h.unit != null ? SD.UNITS[h.unit] : SD.PEERS[h.i], target: h.i, t: 0 };
    input(h.d); S.notesMode = was; changed();
    const text = h.kind === "naked" ? `Only ${h.d} fits here: every other number is already in its row, column or box.`
      : h.kind === "hidden" ? `In this ${h.unitName}, ${h.d} can only go in this cell.` : `This cell is ${h.d}.`;
    return { text };
  }
  function addHints(n) { if (S) { S.hintsLeft += n; changed(); } }
  function secondChance() { if (!S) return; S.over = false; S.mistakes = Math.max(0, C.mistakes - 1); const h = S.hist.pop(); if (h) { S.grid = h.grid; S.notes = h.notes; } changed(); }
  function result() { return { spec: S.spec, time: Math.round(S.time), mistakes: S.mistakes, hints: S.hintsUsed, win: S.done }; }
  function win() {
    S.done = true; changed();
    const o = S.sel >= 0 ? S.sel : 40; S.sel = -1;
    anim.win = { t: 0, from: o };
    setTimeout(() => Sound.play("win"), 250);
    setTimeout(() => on.win && on.win(result()), 1500);
  }

  /* ---------- input ---------- */
  function cellAt(x, y) { const c = Math.floor((x - PAD) / CS), r = Math.floor((y - PAD) / CS); return c >= 0 && c < 9 && r >= 0 && r < 9 ? r * 9 + c : -1; }
  cv.addEventListener("pointerdown", e => { Sound.unlock(); const b = cv.getBoundingClientRect(), i = cellAt(e.clientX - b.left, e.clientY - b.top); if (i >= 0) select(i); });
  addEventListener("keydown", e => {
    if (!S || document.body.dataset.at !== "play" || !document.getElementById("wrap").hidden) return;
    const k = e.key;
    if (k >= "1" && k <= "9") return input(+k);
    if (k === "Backspace" || k === "Delete" || k === "0") return erase();
    if (k === "n" || k === "N") return toggleNotes();
    if ((e.ctrlKey || e.metaKey) && (k === "z" || k === "Z")) return undo();
    const mv = { ArrowUp: -9, ArrowDown: 9, ArrowLeft: -1, ArrowRight: 1 }[k];
    if (mv != null) { e.preventDefault(); const s = S.sel < 0 ? 40 : S.sel, r = SD.ROW(s), c = SD.COL(s); const nr = (r + (mv === -9 ? -1 : mv === 9 ? 1 : 0) + 9) % 9, nc = (c + (mv === -1 ? -1 : mv === 1 ? 1 : 0) + 9) % 9; select(nr * 9 + nc); }
  });

  /* ---------- drawing ---------- */
  const T = () => theme;
  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }
  const easeBack = x => { const c = 2.2; return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2; };
  function render(dt) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.clearRect(0, 0, B, B);
    const th = T();
    ctx.fillStyle = th.board; rr(0, 0, B, B, B * 0.04); ctx.fill();
    if (!S) return;
    anim.t += dt;
    const sel = S.sel, sv = sel >= 0 ? S.grid[sel] : 0, selOk = sel >= 0 && sv;
    const cx = i => PAD + SD.COL(i) * CS, cy = i => PAD + SD.ROW(i) * CS;
    // conflicts: a wrong number clashing with others
    const clash = new Set();
    for (let i = 0; i < 81; i++) if (S.grid[i] && S.grid[i] !== S.sol[i]) for (const j of SD.PEERS[i]) if (S.grid[j] === S.grid[i]) { clash.add(j); clash.add(i); }
    // cell backgrounds
    for (let i = 0; i < 81; i++) {
      let col = null;
      if (sel >= 0 && !paused && (SD.ROW(i) === SD.ROW(sel) || SD.COL(i) === SD.COL(sel) || SD.BOX(i) === SD.BOX(sel))) col = th.area;
      if (opts.same && selOk && S.grid[i] === sv && !paused) col = th.same;
      if (clash.has(i)) col = hexA("#ff5468", th.dark ? 0.28 : 0.16);
      if (col) { ctx.fillStyle = col; ctx.fillRect(cx(i), cy(i), CS, CS); }
    }
    // hint glow
    if (anim.hint) { const h = anim.hint; h.t += dt; const a = Math.max(0, 1 - h.t / 2.2) * (0.5 + 0.5 * Math.sin(h.t * 9)); ctx.fillStyle = hexA("#ffc93d", 0.35 * a); for (const i of h.cells) ctx.fillRect(cx(i), cy(i), CS, CS); if (h.t > 2.2) anim.hint = null; }
    // waves: finished row / column / box
    for (const w of anim.waves) {
      w.t += dt;
      w.cells.forEach((i, n) => { const d = Math.abs(SD.ROW(i) - SD.ROW(w.from)) + Math.abs(SD.COL(i) - SD.COL(w.from)), k = (w.t - d * 0.045) / 0.4; if (k > 0 && k < 1) { ctx.fillStyle = hexA(th.dark ? "#ffffff" : th.sel, (1 - k) * 0.45); ctx.fillRect(cx(i), cy(i), CS, CS); } });
    }
    anim.waves = anim.waves.filter(w => w.t < 1.2);
    // win cascade
    if (anim.win) { const W = anim.win; W.t += dt; for (let i = 0; i < 81; i++) { const d = Math.hypot(SD.ROW(i) - SD.ROW(W.from), SD.COL(i) - SD.COL(W.from)), k = (W.t - d * 0.07) / 0.5; if (k > 0 && k < 1) { ctx.fillStyle = hexA(["#ffc93d", "#5fd38f", "#7fa6ff", "#ff8fb0"][(d | 0) % 4], (1 - k) * 0.7); ctx.fillRect(cx(i), cy(i), CS, CS); } } }
    // selected cell
    if (sel >= 0 && !paused) { ctx.fillStyle = hexA(th.sel, th.dark ? 0.4 : 0.28); ctx.fillRect(cx(sel), cy(sel), CS, CS); ctx.strokeStyle = th.sel; ctx.lineWidth = 2.5; ctx.strokeRect(cx(sel) + 1.25, cy(sel) + 1.25, CS - 2.5, CS - 2.5); }
    // grid lines
    ctx.strokeStyle = th.line; ctx.lineWidth = 1;
    ctx.beginPath(); for (let k = 1; k < 9; k++) if (k % 3) { const p = Math.round(PAD + k * CS) + 0.5; ctx.moveTo(p, PAD); ctx.lineTo(p, B - PAD); ctx.moveTo(PAD, p); ctx.lineTo(B - PAD, p); } ctx.stroke();
    ctx.strokeStyle = th.bold; ctx.lineWidth = 2.2; ctx.beginPath(); for (let k = 3; k < 9; k += 3) { const p = PAD + k * CS; ctx.moveTo(p, PAD); ctx.lineTo(p, B - PAD); ctx.moveTo(PAD, p); ctx.lineTo(B - PAD, p); } ctx.stroke();
    ctx.lineWidth = 2.6; rr(PAD, PAD, B - PAD * 2, B - PAD * 2, CS * 0.2); ctx.stroke();
    if (paused) { ctx.fillStyle = th.note; ctx.font = `800 ${Math.round(B * 0.06)}px ${FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("Paused", B / 2, B / 2); return; }
    // digits + notes
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (let i = 0; i < 81; i++) {
      const v = S.grid[i], x = cx(i) + CS / 2, y = cy(i) + CS / 2 + CS * 0.03;
      let sc = 1; const p = anim.pops[i];
      if (p) { p.t += dt; const k = p.t / 0.35; if (k < 0) sc = 0; else if (k < 1) sc = p.k >= 0.6 ? easeBack(k) : 1 + p.k * Math.sin(k * Math.PI); else delete anim.pops[i]; }
      let sx = 0; if (anim.shake && anim.shake.i === i) { anim.shake.t += dt; sx = Math.sin(anim.shake.t * 50) * CS * 0.08 * Math.max(0, 1 - anim.shake.t / 0.45); if (anim.shake.t > 0.45) anim.shake = null; }
      if (v) {
        const given = S.given[i], wrong = v !== S.sol[i];
        ctx.fillStyle = wrong ? "#ff5468" : given ? th.given : th.user;
        ctx.font = `${given ? 700 : 600} ${Math.round(CS * 0.62 * sc)}px ${FONT}`;
        ctx.fillText(v, x + sx, y);
      } else if (S.notes[i] && sc > 0) {
        ctx.font = `600 ${Math.round(CS * 0.26 * Math.min(1, sc))}px ${FONT}`;
        for (let d = 1; d <= 9; d++) if (S.notes[i] & SD.bit(d)) {
          const nx = cx(i) + CS * (0.2 + ((d - 1) % 3) * 0.3), ny = cy(i) + CS * (0.2 + (((d - 1) / 3) | 0) * 0.3) + CS * 0.02;
          if (selOk && d === sv && opts.same) { ctx.fillStyle = hexA(th.sel, 0.25); ctx.beginPath(); ctx.arc(nx, ny - CS * 0.01, CS * 0.13, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = th.sel; } else ctx.fillStyle = th.note;
          ctx.fillText(d, nx, ny);
        }
      }
    }
  }
  const FONT = `ui-rounded, "SF Pro Rounded", "Nunito", system-ui, -apple-system, "Segoe UI", sans-serif`;

  let last = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    if (S && !S.done && !S.over && !paused && document.body.dataset.at === "play" && document.getElementById("wrap").hidden) S.time += dt;
    try { render(dt); } catch (e) { console.error(e); }
  }
  resize(); requestAnimationFrame(frame);

  return {
    on, start, resume, select, input, erase, undo, toggleNotes, fillNotes, hint, addHints, secondChance, resize, snapshot,
    setTheme(id) { theme = C.themes.find(t => t.id === id) || C.themes[0]; },
    setOpts(o) { Object.assign(opts, o); },
    pause(p) { paused = p; },
    ping() { if (S) changed(); },
    get state() { return S; }, get paused() { return paused; }, get opts() { return opts; },
    cellXY(i) { const b = cv.getBoundingClientRect(); return [b.left + PAD + (SD.COL(i) + 0.5) * CS, b.top + PAD + (SD.ROW(i) + 0.5) * CS]; }
  };
})();

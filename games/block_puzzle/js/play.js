/* ==========================================================================
   PLAY — the board: canvas rendering, drag & drop, clears, combos,
   power-up targeting. UI (screens, modals, economy) talks to it through
   Play.start / Play.power / Play.on callbacks.
   ========================================================================== */
window.Play = (() => {
  const C = window.GAME_CONFIG, E = window.Engine, K = window.Skins;
  const N = C.gridSize;
  const cv = document.getElementById("play");
  const ctx = cv.getContext("2d");
  const on = {}; // callbacks set by ui.js

  let dpr = 1, W = 0, H = 0;
  const G = {}; // geometry
  let S = null; // game state
  let skin = "classic";
  let drag = null, ghost = null, returning = null, target = null, hover = null;
  let placedAnim = new Map();   // idx -> t0
  let clearing = [], beams = [], trayBorn = [0, 0, 0], rotAnim = {}, flashT = 0;
  let grayT = 0, running = false, shakeUntil = 0;
  let history = [];

  const now = () => performance.now();
  const ease = { outBack: t => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2), out: t => 1 - Math.pow(1 - t, 3) };
  const vibrate = ms => { if (C.vibration && on.vibeOn && on.vibeOn() && navigator.vibrate) navigator.vibrate(ms); };

  // ---------- layout -------------------------------------------------------
  function layout() {
    const area = cv.parentElement;
    W = area.clientWidth; H = area.clientHeight;
    if (!W || !H) return;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    const gap = Math.max(10, H * 0.025);
    const bs = Math.floor(Math.min(W - 24, (H - gap) / 1.38, 540));
    const trayH = bs * 0.38;
    const top = Math.max(0, (H - (bs + gap + trayH)) / 2);
    Object.assign(G, { bs, bx: (W - bs) / 2, by: top, pad: bs * 0.028, trayH, trayY: top + bs + gap, slotW: bs / 3 });
    G.cell = (G.bs - G.pad * 2) / N;
    G.trayCell = Math.min(G.cell * 0.58, (G.slotW * 0.9) / 5, (trayH * 0.9) / 5);
  }
  const cellX = c => G.bx + G.pad + c * G.cell;
  const cellY = r => G.by + G.pad + r * G.cell;
  function toScreen(x, y) { const b = cv.getBoundingClientRect(); return { x: b.left + x, y: b.top + y }; }
  function cellScreen(idx) { return toScreen(cellX(idx % N) + G.cell / 2, cellY(Math.floor(idx / N)) + G.cell / 2); }

  // ---------- state helpers -----------------------------------------------
  const snapshot = () => JSON.parse(JSON.stringify({ board: S.board, tray: S.tray, score: S.score, combo: S.combo, sinceClear: S.sinceClear, moves: S.moves, gemsLeft: S.gemsLeft }));
  function pushHistory() { history.push(snapshot()); if (history.length > 3) history.shift(); }

  function newTray() {
    S.tray = E.genTray(S.board, N, C.colors, S.rand, { maxSize: S.level ? S.level.maxSize : 99 });
    const t = now();
    trayBorn = [t, t + 70, t + 140];
    Sound.play("whoosh");
  }
  const fits = p => p && E.fitsAnywhere(S.board, N, p);

  function start(opts) {
    S = {
      mode: opts.mode, level: opts.level || null,
      board: Array(N * N).fill(null), tray: [null, null, null],
      score: 0, combo: 0, sinceClear: 0, moves: 0, gemsLeft: 0,
      over: false, done: false, rand: Math.random
    };
    if (opts.level) {
      S.board = opts.level.board.map(c => (c ? { ...c } : null));
      S.gemsLeft = opts.level.gems;
      S.rand = E.rng(opts.level.seed);
    }
    if (opts.saved) Object.assign(S, JSON.parse(JSON.stringify(opts.saved)), { rand: Math.random });
    history = []; clearing = []; beams = []; placedAnim.clear(); grayT = 0; drag = null; returning = null; target = null;
    layout();
    setTimeout(layout, 250); // HUD fonts/art can settle after the first measure
    if (!S.tray.some(Boolean)) newTray(); else trayBorn = [now(), now() + 70, now() + 140];
    // entrance: pop the pre-filled cells in
    const t = now();
    S.board.forEach((c, i) => { if (c) placedAnim.set(i, t + (Math.floor(i / N) + (i % N)) * 25); });
    run();
    emit();
    setTimeout(checkStuck, 600);
  }
  const serialize = () => (S && !S.over && !S.done ? snapshot() : null);
  function emit() { on.change && on.change(S); }

  // ---------- placing ------------------------------------------------------
  function place(i, r0, c0) {
    const piece = S.tray[i];
    pushHistory();
    const t = now();
    piece.cells.forEach(([r, c]) => {
      const idx = (r0 + r) * N + c0 + c;
      S.board[idx] = { color: piece.color };
      placedAnim.set(idx, t);
    });
    S.tray[i] = null;
    S.moves++;
    Sound.play("place"); vibrate(10);

    const cx = cellX(c0) + (piece.w * G.cell) / 2, cy = cellY(r0) + (piece.h * G.cell) / 2;
    let gain = piece.cells.length * C.scoring.perCell;
    const { rows, cols } = E.fullLines(S.board, N);
    const lines = rows.length + cols.length;

    if (lines) {
      S.combo = S.combo > 0 ? S.combo + 1 : 1;
      S.sinceClear = 0;
      const lineGain = C.scoring.perLine * lines * lines * S.combo;
      gain += lineGain;
      const hit = new Set();
      rows.forEach(r => { for (let c = 0; c < N; c++) hit.add(r * N + c); beams.push({ row: r, t0: t, color: piece.color }); });
      cols.forEach(c => { for (let r = 0; r < N; r++) hit.add(r * N + c); beams.push({ col: c, t0: t, color: piece.color }); });
      const gems = [];
      hit.forEach(idx => {
        const cell = S.board[idx];
        const dx = cellX(idx % N) + G.cell / 2 - cx, dy = cellY(Math.floor(idx / N)) + G.cell / 2 - cy;
        const delay = Math.hypot(dx, dy) / G.cell * 32;
        clearing.push({ idx, color: piece.color, gem: cell.gem, t0: t + 60 + delay, shattered: false });
        if (cell.gem) { gems.push({ idx, delay: 60 + delay }); S.gemsLeft--; }
        S.board[idx] = null;
      });
      const allClear = S.board.every(c => !c);
      if (allClear) { gain += C.scoring.allClear; flashT = t + 300; }
      Sound.play("clear", { lines, combo: S.combo });
      vibrate(lines > 1 ? [20, 30, 30] : 25);
      if (lines >= 3 || S.combo >= 4) shakeUntil = t + 350;
      on.clear && on.clear({ lines, combo: S.combo, allClear, gems: gems.map(g => ({ ...cellScreen(g.idx), delay: g.delay })) });
    } else {
      S.sinceClear++;
      if (S.sinceClear >= C.scoring.comboKeep && S.combo) { S.combo = 0; on.comboLost && on.comboLost(); }
    }

    S.score += gain;
    const p = toScreen(cx, cy);
    on.score && on.score(gain, p.x, p.y, lines);

    if (!S.tray.some(Boolean)) setTimeout(() => { if (S && !S.over) { newTray(); emit(); afterMove(); } }, lines ? 260 : 120);
    emit();
    afterMove();
  }

  function afterMove() {
    if (!S || S.over || S.done) return;
    if (S.mode === "adventure") {
      const L = S.level;
      const won = L.type === "gems" ? S.gemsLeft <= 0 : S.score >= L.target;
      if (won) { S.done = true; setTimeout(() => on.win && on.win(S), 900); return; }
    }
    if (S.tray.some(Boolean) && !S.tray.some(fits)) setTimeout(checkStuck, 500);
  }
  function checkStuck() {
    if (S && !S.over && !S.done && !drag && S.tray.some(Boolean) && !S.tray.some(fits)) gameOver();
  }

  function gameOver() {
    S.over = true;
    grayT = now();
    Sound.play("invalid");
    vibrate([40, 60, 40]);
    setTimeout(() => { if (S && S.over) on.over && on.over(S); }, N * 70 + 500);
  }

  // ---------- power-ups ----------------------------------------------------
  // Returns true when the power-up was applied (or armed for targeting).
  function power(k) {
    if (!S || S.done || drag) return false;
    if (k === "undo") {
      if (!history.length) return "empty";
      const h = history.pop();
      Object.assign(S, h); S.over = false; grayT = 0; clearing = [];
      trayBorn = [now(), now(), now()];
      Sound.play("whoosh"); emit();
      return true;
    }
    if (k === "refresh") {
      pushHistory(); S.over = false; grayT = 0; newTray(); emit(); afterMove();
      return true;
    }
    if (k === "rotate" || k === "bomb") { target = k; return "armed"; }
    return false;
  }
  const cancelTarget = () => { target = null; hover = null; };

  function bombAt(r, c, free) {
    if (!free) pushHistory();
    const t = now();
    const gems = [];
    let n = 0;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const rr = r + dr, cc = c + dc;
      if (rr < 0 || rr >= N || cc < 0 || cc >= N) continue;
      const idx = rr * N + cc, cell = S.board[idx];
      if (!cell) continue;
      n++;
      clearing.push({ idx, color: cell.color, gem: cell.gem, t0: t + 80 + (Math.abs(dr) + Math.abs(dc)) * 40, shattered: false });
      if (cell.gem) { gems.push({ ...cellScreen(idx), delay: 120 }); S.gemsLeft--; }
      S.board[idx] = null;
    }
    const p = toScreen(cellX(c) + G.cell / 2, cellY(r) + G.cell / 2);
    FX.explosion(p.x, p.y, G.cell * 3);
    Sound.play("bomb"); vibrate([60, 40, 80]);
    shakeUntil = t + 500;
    S.over = false; grayT = 0;
    if (gems.length) on.clear && on.clear({ lines: 0, combo: S.combo, allClear: false, gems });
    emit();
    if (!free) afterMove();
    return n;
  }

  // Revive: blow up the busiest 3×3 and deal a tray that fits.
  function revive() {
    let best = { n: -1, r: 1, c: 1 };
    for (let r = 1; r < N - 1; r++) for (let c = 1; c < N - 1; c++) {
      let n = 0;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (S.board[(r + dr) * N + c + dc]) n++;
      if (n > best.n) best = { n, r, c };
    }
    S.over = false; grayT = 0;
    bombAt(best.r, best.c, true);
    newTray();
    emit();
    afterMove();
  }

  // ---------- input --------------------------------------------------------
  function local(e) { const b = cv.getBoundingClientRect(); return { x: e.clientX - b.left, y: e.clientY - b.top }; }
  function traySlotAt(x, y) {
    if (y < G.trayY - 10 || y > G.trayY + G.trayH + 10 || x < G.bx || x > G.bx + G.bs) return -1;
    return Math.min(2, Math.floor((x - G.bx) / G.slotW));
  }
  function boardCellAt(x, y) {
    const c = Math.floor((x - G.bx - G.pad) / G.cell), r = Math.floor((y - G.by - G.pad) / G.cell);
    return r >= 0 && r < N && c >= 0 && c < N ? { r, c } : null;
  }

  cv.addEventListener("pointerdown", e => {
    if (!S || S.done) return;
    const { x, y } = local(e);
    if (target === "bomb") {
      const cell = boardCellAt(x, y);
      if (cell) { target = null; hover = null; bombAt(cell.r, cell.c); on.powerUsed && on.powerUsed("bomb"); }
      return;
    }
    const i = traySlotAt(x, y);
    if (target === "rotate") {
      if (i >= 0 && S.tray[i]) {
        S.tray[i] = E.rotatePiece(S.tray[i]);
        rotAnim[i] = now();
        Sound.play("rotate");
        target = null; on.powerUsed && on.powerUsed("rotate");
        if (S.over && S.tray.some(fits)) { S.over = false; grayT = 0; }
        emit();
      }
      return;
    }
    if (S.over || i < 0 || !S.tray[i] || returning) return;
    try { cv.setPointerCapture(e.pointerId); } catch (err) { /* synthetic pointer */ }
    drag = { i, x, y, t0: now(), lift: e.pointerType === "mouse" ? G.cell * 0.5 : G.cell * 1.9 };
    Sound.play("pick"); vibrate(6);
    on.dragStart && on.dragStart();
  });

  cv.addEventListener("pointermove", e => {
    const { x, y } = local(e);
    if (target === "bomb") { hover = boardCellAt(x, y); return; }
    if (!drag) return;
    drag.x = x; drag.y = y;
    const p = S.tray[drag.i];
    const left = x - (p.w * G.cell) / 2, top = y - drag.lift - (p.h * G.cell) / 2;
    const c0 = Math.round((left - G.bx - G.pad) / G.cell), r0 = Math.round((top - G.by - G.pad) / G.cell);
    if (E.canPlace(S.board, N, p.cells, r0, c0)) {
      if (!ghost || ghost.r0 !== r0 || ghost.c0 !== c0) {
        ghost = { r0, c0, lines: E.previewLines(S.board, N, p.cells, r0, c0) };
        if (ghost.lines.rows.length + ghost.lines.cols.length) vibrate(4);
      }
    } else ghost = null;
  });

  function endDrag() {
    if (!drag) return;
    const { i } = drag;
    if (ghost) {
      const g = ghost;
      drag = null; ghost = null;
      place(i, g.r0, g.c0);
    } else {
      const p = S.tray[i];
      returning = { i, x: drag.x - (p.w * G.cell) / 2, y: drag.y - drag.lift - (p.h * G.cell) / 2, size: G.cell, t0: now() };
      drag = null;
      Sound.play("invalid");
    }
  }
  cv.addEventListener("pointerup", endDrag);
  cv.addEventListener("pointercancel", endDrag);

  // ---------- rendering ----------------------------------------------------
  function drawBlock(colorIdx, x, y, size, alpha = 1, scale = 1) {
    const inset = size * 0.035;
    const s = (size - inset * 2) * scale;
    const spr = K.sprite(skin, colorIdx, s * dpr);
    if (alpha !== 1) ctx.globalAlpha = alpha;
    ctx.drawImage(spr, x + size / 2 - s / 2, y + size / 2 - s / 2, s, s);
    if (alpha !== 1) ctx.globalAlpha = 1;
  }
  function drawPiece(p, x, y, size, alpha = 1, colorOverride, scale = 1) {
    p.cells.forEach(([r, c]) => drawBlock(colorOverride ?? p.color, x + c * size, y + r * size, size, alpha, scale));
  }

  function frame() {
    if (!running) return;
    requestAnimationFrame(frame);
    if (!S) return;
    const t = now();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    if (t < shakeUntil) {
      const k = (shakeUntil - t) / 400;
      ctx.translate((Math.random() - 0.5) * 10 * k, (Math.random() - 0.5) * 10 * k);
    }

    // board panel
    const { bx, by, bs, pad, cell } = G;
    ctx.save();
    if (S.combo >= 2) {
      const hue = (t / 8) % 360;
      ctx.shadowColor = `hsl(${hue},100%,60%)`;
      ctx.shadowBlur = 12 + Math.min(S.combo, 8) * 4 + Math.sin(t / 120) * 4;
    } else { ctx.shadowColor = "rgba(0,0,0,.45)"; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8; }
    K.rr(ctx, bx, by, bs, bs, bs * 0.04);
    const bg = ctx.createLinearGradient(0, by, 0, by + bs);
    bg.addColorStop(0, "#1d2257"); bg.addColorStop(1, "#141842");
    ctx.fillStyle = bg; ctx.fill();
    ctx.restore();
    ctx.lineWidth = 3;
    ctx.strokeStyle = S.combo >= 2 ? `hsl(${(t / 8) % 360},100%,70%)` : "rgba(140,160,255,.35)";
    K.rr(ctx, bx + 1.5, by + 1.5, bs - 3, bs - 3, bs * 0.04); ctx.stroke();

    // slots
    ctx.fillStyle = "rgba(0,0,0,.28)";
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      K.rr(ctx, cellX(c) + cell * 0.05, cellY(r) + cell * 0.05, cell * 0.9, cell * 0.9, cell * 0.14); ctx.fill();
    }

    // which cells light up in the dragged piece's color
    const lit = new Set();
    const dragPiece = drag && S.tray[drag.i];
    if (ghost && dragPiece) {
      ghost.lines.rows.forEach(r => { for (let c = 0; c < N; c++) lit.add(r * N + c); });
      ghost.lines.cols.forEach(c => { for (let r = 0; r < N; r++) lit.add(r * N + c); });
    }
    const bombArea = new Set();
    if (target === "bomb" && hover) {
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        const rr = hover.r + dr, cc = hover.c + dc;
        if (rr >= 0 && rr < N && cc >= 0 && cc < N) bombArea.add(rr * N + cc);
      }
    }

    // placed blocks
    const grayP = grayT ? (t - grayT) / (N * 70) : -1;
    for (let idx = 0; idx < N * N; idx++) {
      const cellD = S.board[idx];
      if (!cellD) continue;
      const r = Math.floor(idx / N), c = idx % N;
      let scale = 1;
      const pt = placedAnim.get(idx);
      if (pt !== undefined) {
        const k = (t - pt) / 240;
        if (k < 0) continue;
        if (k < 1) scale = k < 0.5 ? ease.outBack(Math.min(1, k * 2)) * 1.12 : 1 + 0.12 * (1 - (k - 0.5) * 2);
        else placedAnim.delete(idx);
      }
      let color = cellD.color;
      if (lit.has(idx)) color = dragPiece.color;
      if (grayP >= 0 && r <= grayP * N) color = "gray";
      drawBlock(color, cellX(c), cellY(r), cell, 1, scale);
      if (lit.has(idx)) {
        ctx.globalAlpha = 0.25 + Math.sin(t / 90) * 0.15;
        drawBlock("white", cellX(c), cellY(r), cell, 1, scale);
        ctx.globalAlpha = 1;
      }
      if (cellD.gem) K.drawGem(ctx, cellX(c), cellY(r), cell, t);
    }

    // ghost
    if (ghost && dragPiece) {
      drawPiece(dragPiece, cellX(ghost.c0), cellY(ghost.r0), cell, 0.38);
    }
    // bomb crosshair
    if (bombArea.size) {
      ctx.fillStyle = `rgba(255,80,60,${0.35 + Math.sin(t / 80) * 0.15})`;
      bombArea.forEach(idx => { K.rr(ctx, cellX(idx % N) + 2, cellY(Math.floor(idx / N)) + 2, cell - 4, cell - 4, cell * 0.14); ctx.fill(); });
    }

    // clear beams
    beams = beams.filter(b => {
      const k = (t - b.t0) / 380;
      if (k > 1) return false;
      ctx.save();
      ctx.globalAlpha = (1 - k) * 0.85;
      ctx.fillStyle = "#fff";
      ctx.shadowColor = K.colorOf(b.color); ctx.shadowBlur = 30;
      const thick = cell * (0.3 + k * 0.9);
      if (b.row !== undefined) ctx.fillRect(bx + pad, cellY(b.row) + cell / 2 - thick / 2, bs - pad * 2, thick);
      else ctx.fillRect(cellX(b.col) + cell / 2 - thick / 2, by + pad, thick, bs - pad * 2);
      ctx.restore();
      return true;
    });

    // clearing blocks: swell, flash white, shrink & spin
    clearing = clearing.filter(cl => {
      const k = (t - cl.t0) / 300;
      const r = Math.floor(cl.idx / N), c = cl.idx % N;
      if (k < 0) { drawBlock(cl.color, cellX(c), cellY(r), cell); if (cl.gem) K.drawGem(ctx, cellX(c), cellY(r), cell, t); return true; }
      if (!cl.shattered) {
        cl.shattered = true;
        const p = cellScreen(cl.idx);
        FX.shatter(p.x, p.y, K.colorOf(cl.color), cell);
      }
      if (k > 1) return false;
      const sc = k < 0.25 ? 1 + k * 1.2 : 1.3 * (1 - (k - 0.25) / 0.75);
      ctx.save();
      ctx.translate(cellX(c) + cell / 2, cellY(r) + cell / 2);
      ctx.rotate(k * 0.8);
      drawBlock(cl.color, -cell / 2, -cell / 2, cell, 1 - k * 0.3, sc);
      ctx.globalAlpha = Math.max(0, 0.9 - k * 1.5);
      drawBlock("white", -cell / 2, -cell / 2, cell, 1, sc);
      ctx.restore();
      return true;
    });

    // all-clear flash
    if (flashT && t < flashT + 500) {
      const k = Math.max(0, (t - flashT) / 500);
      ctx.fillStyle = `rgba(255,255,255,${(1 - k) * 0.7})`;
      K.rr(ctx, bx, by, bs, bs, bs * 0.04); ctx.fill();
    }

    // tray
    for (let i = 0; i < 3; i++) {
      const p = S.tray[i];
      if (!p || (drag && drag.i === i)) continue;
      const scx = G.bx + G.slotW * (i + 0.5), scy = G.trayY + G.trayH / 2;
      const tc = G.trayCell;
      let x = scx - (p.w * tc) / 2, y = scy - (p.h * tc) / 2, size = tc;
      let scale = 1, alpha = 1;
      const kb = (t - trayBorn[i]) / 360;
      if (kb < 1) { if (kb < 0) continue; scale = ease.outBack(kb); y += (1 - ease.out(kb)) * 40; }
      if (returning && returning.i === i) {
        const k = Math.min(1, (t - returning.t0) / 200), e = ease.out(k);
        x = returning.x + (x - returning.x) * e; y = returning.y + (y - returning.y) * e;
        size = returning.size + (tc - returning.size) * e;
        if (k >= 1) returning = null;
      }
      const ok = fits(p);
      if (!ok) alpha = 0.9;
      ctx.save();
      const rk = rotAnim[i] ? (t - rotAnim[i]) / 260 : 1;
      if (rk < 1 || scale !== 1) {
        ctx.translate(scx, scy);
        if (rk < 1) ctx.rotate((-Math.PI / 2) * (1 - ease.outBack(rk)));
        ctx.scale(scale, scale);
        ctx.translate(-scx, -scy);
      }
      if (target === "rotate") {
        ctx.translate(0, Math.sin(t / 120 + i) * 3);
      }
      drawPiece(p, x, y, size, alpha, ok ? undefined : "gray");
      ctx.restore();
    }

    // dragged piece (follows finger, grows to board size)
    if (drag && dragPiece) {
      const k = Math.min(1, (t - drag.t0) / 120);
      const size = G.trayCell + (cell - G.trayCell) * ease.out(k);
      const x = drag.x - (dragPiece.w * size) / 2;
      const y = drag.y - drag.lift * ease.out(k) - (dragPiece.h * size) / 2;
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,.4)"; ctx.shadowBlur = 18; ctx.shadowOffsetY = 10;
      drawPiece(dragPiece, x, y, size, 1, undefined, 1.04);
      ctx.restore();
    }
  }

  function run() { if (!running) { running = true; requestAnimationFrame(frame); } }
  function stop() { running = false; }
  window.addEventListener("resize", () => { if (running) layout(); });
  // re-measure when the HUD around the board changes size (power-up bar, adventure bar…)
  if (window.ResizeObserver) new ResizeObserver(() => { if (running) layout(); }).observe(cv.parentElement);

  return {
    on, start, stop, layout, power, cancelTarget, revive, serialize,
    get state() { return S; },
    get target() { return target; },
    get geo() { const b = cv.getBoundingClientRect(); return { ...G, left: b.left, top: b.top }; },
    setSkin(s) { skin = s; },
    trayScreen(i) { return toScreen(G.bx + G.slotW * (i + 0.5), G.trayY + G.trayH / 2); },
    boardScreen() { return toScreen(G.bx + G.bs / 2, G.by + G.bs / 2); },
    canUndo: () => history.length > 0
  };
})();

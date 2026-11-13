/* ==========================================================================
   MOLE PATROL — engine on a DOM grid.
   Safe first dig (with an open patch around it), flood reveal with a ripple
   delay, chording, flags by long press or flag mode, hints, a "second chance"
   undo of the losing dig, a seeded daily garden and a blooming win.
   ========================================================================== */
window.Game = (() => {
  const CF = window.GAME_CONFIG;
  const grid = document.getElementById("plot");
  const hooks = {}, emit = (n, d) => hooks[n] && hooks[n](d);
  let C = 8, R = 9, M = 10, cells = [], placed = false, state = "idle", flagMode = false, time = 0, timer = null, paused = false;
  let rand = Math.random, sizeId = "seedling", lastLoss = null, dug = 0;

  const idx = (c, r) => r * C + c;
  const around = i => { const c = i % C, r = Math.floor(i / C), out = []; for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { if (!dr && !dc) continue; const nc = c + dc, nr = r + dr; if (nc >= 0 && nr >= 0 && nc < C && nr < R) out.push(idx(nc, nr)); } return out; };
  function seeded(s) { return () => (s = (s * 16807) % 2147483647) / 2147483647; }

  function setup(size, daily = false) {
    sizeId = daily ? "daily" : size.id; C = size.cols; R = size.rows; M = size.moles;
    rand = daily ? seeded(+new Date().toISOString().slice(0, 10).replace(/-/g, "") % 2147483646 + 1) : Math.random;
    cells = Array.from({ length: C * R }, () => ({ mole: false, n: 0, open: false, flag: false }));
    placed = false; state = "play"; time = 0; dug = 0; lastLoss = null; paused = false;
    clearInterval(timer); timer = setInterval(() => { if (state === "play" && placed && !paused) { time++; emit("hud"); } }, 1000);
    grid.style.setProperty("--cols", C); grid.innerHTML = "";
    cells.forEach((cell, i) => {
      const b = document.createElement("button"); b.className = "t"; b.dataset.i = i;
      b.style.setProperty("--h", (((i * 7919) % 13) / 13).toFixed(2));   // tiny per-tile hue variation in the hedge
      cell.el = b; grid.appendChild(b);
    });
    emit("hud");
  }
  // moles are placed on the first dig so it is always safe and opens a patch
  function plant(first) {
    const keepOut = new Set([first, ...around(first)]);
    let n = 0; while (n < M) { const i = Math.floor(rand() * C * R); if (keepOut.has(i) || cells[i].mole) continue; cells[i].mole = true; n++; }
    cells.forEach((cell, i) => cell.n = around(i).filter(j => cells[j].mole).length);
    placed = true;
  }

  function paint(i, delay = 0) {
    const cell = cells[i], el = cell.el;
    el.classList.toggle("flag", cell.flag);
    if (!cell.open) return;
    setTimeout(() => {
      el.classList.add("open"); el.classList.remove("flag");
      if (cell.mole) { el.classList.add("mole"); el.innerHTML = "<i class='m'></i>"; return; }
      if (cell.n) { el.textContent = cell.n; el.style.color = CF.numberColors[cell.n - 1]; }
      if (Math.random() < 0.18) burst(el, 3);
    }, delay);
  }
  function reveal(start) {
    const q = [start], seen = new Set([start]), order = []; const sc = start % C, sr = Math.floor(start / C);
    while (q.length) {
      const i = q.shift(), cell = cells[i]; if (cell.open || cell.flag) continue;
      cell.open = true; dug++; order.push(i);
      if (cell.n === 0 && !cell.mole) for (const j of around(i)) if (!seen.has(j)) { seen.add(j); q.push(j); }
    }
    order.forEach(i => { const c = i % C, r = Math.floor(i / C); paint(i, Math.hypot(c - sc, r - sr) * 28); });
    return order.length;
  }

  function dig(i) {
    if (state !== "play" || paused) return;
    const cell = cells[i];
    if (flagMode && !cell.open) return toggleFlag(i);
    if (cell.flag) return;
    if (!placed) plant(i);
    if (cell.open) return chord(i);
    if (cell.mole) return lose(i, [i]);
    const n = reveal(i); Sound.sfx("dig", n); check(); emit("hud");
  }
  function chord(i) {
    const cell = cells[i]; if (!cell.n) return;
    const nb = around(i), flags = nb.filter(j => cells[j].flag).length;
    if (flags !== cell.n) { nb.filter(j => !cells[j].open && !cells[j].flag).forEach(j => { cells[j].el.classList.remove("peek"); void cells[j].el.offsetWidth; cells[j].el.classList.add("peek"); }); Sound.sfx("bad"); return; }
    const hidden = nb.filter(j => !cells[j].open && !cells[j].flag), bad = hidden.filter(j => cells[j].mole);
    if (bad.length) return lose(bad[0], hidden);
    let n = 0; hidden.forEach(j => n += reveal(j)); if (n) Sound.sfx("chord"); check(); emit("hud");
  }
  function toggleFlag(i) {
    if (state !== "play" || paused) return; const cell = cells[i]; if (cell.open) return;
    cell.flag = !cell.flag; Sound.sfx(cell.flag ? "flag" : "unflag"); paint(i);
    if (cell.flag) { cell.el.classList.remove("plant"); void cell.el.offsetWidth; cell.el.classList.add("plant"); }
    if (navigator.vibrate) try { navigator.vibrate(12); } catch (e) {}
    emit("hud");
  }
  function lose(i, tried) {
    state = "lost"; lastLoss = { i, tried };
    cells[i].open = true; cells[i].el.classList.add("boom"); paint(i); Sound.sfx("mole");
    grid.classList.remove("shake"); void grid.offsetWidth; grid.classList.add("shake");
    // show the other moles one by one, and mark wrong flags
    const rest = cells.map((c, k) => k).filter(k => k !== i && cells[k].mole && !cells[k].flag);
    rest.forEach((k, n) => setTimeout(() => { if (state !== "lost") return; cells[k].el.classList.add("open", "mole", "ghost"); cells[k].el.innerHTML = "<i class='m'></i>"; }, 250 + n * 40));
    cells.forEach(c => { if (c.flag && !c.mole) c.el.classList.add("wrong"); });
    emit("lost", { time, size: sizeId });
  }
  // rewarded "second chance": put the mole back to sleep and flag it
  function secondChance() {
    if (state !== "lost" || !lastLoss) return false;
    cells.forEach(c => { c.el.classList.remove("ghost", "wrong", "boom"); if (c.mole && c.el.classList.contains("mole")) { c.el.classList.remove("open", "mole"); c.el.innerHTML = ""; } });
    const cell = cells[lastLoss.i]; cell.open = false; cell.flag = true; paint(lastLoss.i);
    state = "play"; lastLoss = null; emit("hud"); return true;
  }
  function check() {
    if (cells.every(c => c.mole || c.open)) {
      state = "won"; clearInterval(timer);
      cells.forEach((c, i) => { if (c.mole) { c.flag = true; paint(i); } else if (Math.random() < 0.6) setTimeout(() => { c.el.classList.add("bloom"); c.el.dataset.f = "✿❀✾❁"[i % 4]; }, (i % C + Math.floor(i / C)) * 35); });
      Sound.sfx("win"); setTimeout(() => emit("won", { time, size: sizeId }), 900);
    }
  }
  // hint: open a safe hidden square next to the opened area (or anywhere)
  function hint() {
    if (state !== "play") return false;
    if (!placed) { const mid = idx(Math.floor(C / 2), Math.floor(R / 2)); dig(mid); return true; }
    const safe = cells.map((c, i) => i).filter(i => !cells[i].open && !cells[i].mole && !cells[i].flag);
    if (!safe.length) return false;
    const edge = safe.filter(i => around(i).some(j => cells[j].open)); const pick = (edge.length ? edge : safe)[Math.floor(Math.random() * (edge.length || safe.length))];
    cells[pick].el.classList.add("hinted"); Sound.sfx("hint"); setTimeout(() => { cells[pick].el.classList.remove("hinted"); dig(pick); }, 450);
    return true;
  }

  function burst(el, n) { for (let i = 0; i < n; i++) { const p = document.createElement("span"); p.className = "leaf"; p.style.setProperty("--dx", (Math.random() - 0.5) * 60 + "px"); p.style.setProperty("--dy", -20 - Math.random() * 40 + "px"); p.style.setProperty("--r", Math.random() * 360 + "deg"); el.appendChild(p); setTimeout(() => p.remove(), 700); } }

  /* ---------- input: tap = dig, long press = flag ---------- */
  let press = null;
  grid.addEventListener("pointerdown", e => {
    const b = e.target.closest(".t"); if (!b) return; const i = +b.dataset.i;
    press = { i, t: setTimeout(() => { press = null; toggleFlag(i); }, CF.longPress) };
  });
  const release = e => { if (!press) return; clearTimeout(press.t); const i = press.i; press = null; if (e.type === "pointerup") dig(i); };
  grid.addEventListener("pointerup", release); grid.addEventListener("pointerleave", release); grid.addEventListener("pointercancel", release);
  grid.addEventListener("contextmenu", e => { e.preventDefault(); const b = e.target.closest(".t"); if (b) { if (press) { clearTimeout(press.t); press = null; } toggleFlag(+b.dataset.i); } });
  addEventListener("keydown", e => { if (e.key === "f") { flagMode = !flagMode; emit("mode", flagMode); } if (e.key === "Escape" || e.key === "p") emit("pauseKey"); });

  return {
    on: (n, f) => hooks[n] = f, setup, dig, toggleFlag, hint, secondChance,
    setFlagMode(v) { flagMode = v; emit("mode", v); }, pause() { paused = true; }, resume() { paused = false; }, stop() { state = "idle"; clearInterval(timer); },
    get state() { return state; }, get time() { return time; }, get flagMode() { return flagMode; }, get cells() { return cells; }, get cols() { return C; }, get rows() { return R; },
    get molesLeft() { return M - cells.filter(c => c.flag).length; }, get size() { return sizeId; }, get placed() { return placed; }, around
  };
})();

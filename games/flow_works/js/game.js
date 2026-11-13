/* ==========================================================================
   FLOW WORKS — engine on SVG.
   Spanning-tree generator (optional torus wrap), rotation puzzle with exact
   minimum-move count, live wet/dry network from the pump, locks, hints and a
   staged flood when the system is complete.
   ========================================================================== */
window.Game = (() => {
  const CF = window.GAME_CONFIG, NS = "http://www.w3.org/2000/svg";
  const svg = document.getElementById("sheet");
  const hooks = {}, emit = (n, d) => hooks[n] && hooks[n](d);
  const N = 1, E = 2, S = 4, Wd = 8, DIRS = [N, E, S, Wd], OPP = { 1: 4, 2: 8, 4: 1, 8: 2 }, DX = { 1: 0, 2: 1, 4: 0, 8: -1 }, DY = { 1: -1, 2: 0, 4: 1, 8: 0 };
  const rotMask = (m, r) => { r = ((r % 4) + 4) % 4; let x = m; for (let i = 0; i < r; i++) x = ((x << 1) | (x >> 3)) & 15; return x; };
  let cols = 4, rows = 4, wrap = false, tiles = [], src = 0, level = 1, turns = 0, minTurns = 0, done = false, paused = false;

  function rng(seed) { return () => (seed = (seed * 48271) % 2147483647) / 2147483647; }
  const neighbour = (i, d) => { let c = i % cols + DX[d], r = Math.floor(i / cols) + DY[d]; if (wrap) { c = (c + cols) % cols; r = (r + rows) % rows; } else if (c < 0 || r < 0 || c >= cols || r >= rows) return -1; return r * cols + c; };

  /* ---------- generation: random spanning tree, then scramble ---------- */
  function generate(n) {
    level = n; const si = Math.min(CF.sizes.length - 1, Math.floor((n - 1) / CF.levelsPerSize));
    [cols, rows] = CF.sizes[si]; wrap = n >= CF.wrapFrom;
    const r = rng(n * 7907 + 1), total = cols * rows, mask = new Array(total).fill(0), inTree = new Array(total).fill(false);
    src = Math.floor(rows / 2) * cols + Math.floor(cols / 2); inTree[src] = true;
    const frontier = []; const addEdges = i => DIRS.forEach(d => { const j = neighbour(i, d); if (j >= 0 && !inTree[j]) frontier.push([i, d, j]); });
    addEdges(src);
    while (frontier.length) {
      const k = Math.floor(r() * frontier.length), [i, d, j] = frontier.splice(k, 1)[0];
      if (inTree[j]) continue;
      const deg = m => DIRS.filter(x => m & x).length;
      if (deg(mask[i]) >= 3 && r() > CF.crossChance) { if (frontier.some(f => !inTree[f[2]])) { frontier.push([i, d, j]); if (frontier.length > total * 8) {} else continue; } }
      mask[i] |= d; mask[j] |= OPP[d]; inTree[j] = true; addEdges(j);
    }
    tiles = mask.map(m => ({ m, rot: 0, deg: 0, lock: false, wet: false }));
    // scramble and count the exact minimum number of clockwise turns
    minTurns = 0;
    tiles.forEach(t => { t.rot = Math.floor(r() * 4); t.deg = t.rot * 90; let need = 0; while (rotMask(t.m, t.rot + need) !== t.m) need++; minTurns += need; });
    if (minTurns === 0) { tiles[0].rot = 1; tiles[0].deg = 90; minTurns = tiles.every(t => rotMask(t.m, t.rot) === t.m) ? 1 : minTurns + 3; recount(); }
    turns = 0; done = false; paused = false;
    draw(); flow(); emit("hud");
  }
  function recount() { minTurns = 0; tiles.forEach(t => { let need = 0; while (rotMask(t.m, t.rot + need) !== t.m && need < 4) need++; minTurns += need; }); }

  /* ---------- network ---------- */
  const open = t => rotMask(t.m, t.rot);
  function flow() {
    tiles.forEach(t => t.wet = false);
    const q = [src], order = [src]; tiles[src].wet = true;
    while (q.length) {
      const i = q.shift(), o = open(tiles[i]);
      DIRS.forEach(d => { if (!(o & d)) return; const j = neighbour(i, d); if (j < 0 || tiles[j].wet) return; if (open(tiles[j]) & OPP[d]) { tiles[j].wet = true; q.push(j); order.push(j); } });
    }
    paintWet();
    return order;
  }
  function solved() {
    return tiles.every((t, i) => { const o = open(t); return DIRS.every(d => !(o & d) || ((() => { const j = neighbour(i, d); return j >= 0 && (open(tiles[j]) & OPP[d]); })())); }) && tiles.every(t => t.wet);
  }

  /* ---------- SVG drawing ---------- */
  const U = 100;
  function el(tag, attrs, parent) { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  function draw() {
    svg.innerHTML = ""; const pad = 34, Wt = cols * U, Ht = rows * U;
    svg.setAttribute("viewBox", `${-pad} ${-pad} ${Wt + pad * 2} ${Ht + pad * 2 + 70}`);
    const defs = el("defs", {}, svg);
    const pat = el("pattern", { id: "fine", width: 20, height: 20, patternUnits: "userSpaceOnUse" }, defs); el("path", { d: "M20 0H0V20", fill: "none", stroke: "rgba(255,255,255,.08)", "stroke-width": 1 }, pat);
    const hatch = el("pattern", { id: "hatch", width: 10, height: 10, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" }, defs); el("line", { x1: 0, y1: 0, x2: 0, y2: 10, stroke: "rgba(255,255,255,.18)", "stroke-width": 3 }, hatch);
    el("rect", { x: -pad, y: -pad, width: Wt + pad * 2, height: Ht + pad * 2 + 70, fill: "url(#fine)" }, svg);
    el("rect", { x: -4, y: -4, width: Wt + 8, height: Ht + 8, fill: "none", stroke: "#e8f1ff", "stroke-width": 2 }, svg);
    // grid references + dimension line
    for (let c = 0; c < cols; c++) { const t = el("text", { x: c * U + U / 2, y: -14, class: "ref" }, svg); t.textContent = String.fromCharCode(65 + c); }
    for (let r = 0; r < rows; r++) { const t = el("text", { x: -18, y: r * U + U / 2 + 5, class: "ref" }, svg); t.textContent = r + 1; }
    el("path", { d: `M0 ${Ht + 18}H${Wt}M0 ${Ht + 12}V${Ht + 24}M${Wt} ${Ht + 12}V${Ht + 24}`, stroke: "rgba(232,241,255,.6)", "stroke-width": 1.5 }, svg);
    const dim = el("text", { x: Wt / 2, y: Ht + 32, class: "dim" }, svg); dim.textContent = `${cols * 10}0 mm${wrap ? "  ·  WRAPPED EDGES" : ""}`;
    // title block
    const tb = el("g", { transform: `translate(0 ${Ht + 42})` }, svg);
    el("rect", { x: 0, y: 0, width: Wt, height: 50, fill: "none", stroke: "#e8f1ff", "stroke-width": 1.5 }, tb);
    el("line", { x1: Wt * 0.5, y1: 0, x2: Wt * 0.5, y2: 50, stroke: "#e8f1ff", "stroke-width": 1 }, tb); el("line", { x1: Wt * 0.75, y1: 0, x2: Wt * 0.75, y2: 50, stroke: "#e8f1ff", "stroke-width": 1 }, tb);
    [["FLOW WORKS · SHEET", 8, 18], [`LEVEL ${String(level).padStart(2, "0")}`, 8, 40], ["SCALE 1:10", Wt * 0.5 + 8, 18], [`${cols}×${rows}`, Wt * 0.5 + 8, 40], ["DRAWN", Wt * 0.75 + 8, 18], ["PUMP · C", Wt * 0.75 + 8, 40]].forEach(([s, x, y]) => { const t = el("text", { x, y, class: "tb" }, tb); t.textContent = s; });
    // tiles
    tiles.forEach((t, i) => {
      const c = i % cols, r = Math.floor(i / cols), g = el("g", { class: "tile", transform: `translate(${c * U} ${r * U})`, "data-i": i }, svg);
      t.bg = el("rect", { x: 3, y: 3, width: U - 6, height: U - 6, rx: 6, class: "cell" }, g);
      const spin = el("g", { class: "spin" }, g); t.spin = spin; spin.style.transform = `rotate(${t.deg}deg)`;
      const deg = DIRS.filter(d => t.m & d).length;
      DIRS.forEach(d => { if (!(t.m & d)) return; const x2 = 50 + DX[d] * 50, y2 = 50 + DY[d] * 50; el("line", { x1: 50, y1: 50, x2, y2, class: "wall" }, spin); });
      t.chan = []; DIRS.forEach(d => { if (!(t.m & d)) return; t.chan.push(el("line", { x1: 50, y1: 50, x2: 50 + DX[d] * 50, y2: 50 + DY[d] * 50, class: "chan" }, spin)); });
      if (i === src) { el("circle", { cx: 50, cy: 50, r: 22, class: "pump" }, g); el("path", { d: "M42 38 L62 50 L42 62 Z", class: "pumpTri" }, g); }
      else if (deg === 1) { t.outlet = el("rect", { x: 36, y: 36, width: 28, height: 28, rx: 4, class: "outlet" }, spin); }
      else el("circle", { cx: 50, cy: 50, r: deg > 2 ? 12 : 9, class: "hub" }, spin);
      t.lockMark = el("rect", { x: 3, y: 3, width: U - 6, height: U - 6, rx: 6, fill: "url(#hatch)", class: "lockmark" }, g);
      t.g = g;
    });
    const stamp = el("g", { id: "stamp", transform: `translate(${Wt / 2} ${Ht / 2}) rotate(-12)`, opacity: 0 }, svg);
    el("rect", { x: -150, y: -40, width: 300, height: 80, rx: 8, fill: "none", stroke: "#ff6b5a", "stroke-width": 6 }, stamp);
    const st = el("text", { x: 0, y: 16, class: "stampText" }, stamp); st.textContent = "APPROVED";
  }
  function paintWet() { tiles.forEach(t => { if (!t.g) return; t.g.classList.toggle("wet", t.wet); t.g.classList.toggle("locked", t.lock); }); }

  /* ---------- turning ---------- */
  function turn(i) {
    if (done || paused) return; const t = tiles[i]; if (t.lock) { t.g.classList.remove("nope"); void t.g.getBBox(); t.g.classList.add("nope"); return; }
    t.rot = (t.rot + 1) % 4; t.deg += 90; t.spin.style.transform = `rotate(${t.deg}deg)`; turns++;
    Sound.sfx("turn"); const before = tiles.filter(x => x.wet).length, order = flow(), after = order.length;
    if (after > before) Sound.sfx("join", after);
    emit("hud"); if (solved()) win(order);
  }
  function toggleLock(i) { if (done) return; tiles[i].lock = !tiles[i].lock; Sound.sfx("lock"); paintWet(); }
  function hint() {
    if (done) return false;
    const wrong = tiles.map((t, i) => i).filter(i => rotMask(tiles[i].m, tiles[i].rot) !== tiles[i].m);
    if (!wrong.length) return false;
    // prefer a tile touching the wet network so the hint is useful
    const near = wrong.filter(i => DIRS.some(d => { const j = neighbour(i, d); return j >= 0 && tiles[j].wet; }));
    const i = (near.length ? near : wrong)[0], t = tiles[i];
    while (rotMask(t.m, t.rot) !== t.m) { t.rot = (t.rot + 1) % 4; t.deg += 90; }
    t.spin.style.transform = `rotate(${t.deg}deg)`; t.lock = true; Sound.sfx("hint");
    const order = flow(); emit("hud"); if (solved()) win(order);
    return true;
  }
  function win(order) {
    done = true; Sound.sfx("flow");
    tiles.forEach(t => t.g.classList.remove("wet"));
    order.forEach((i, k) => setTimeout(() => tiles[i].g.classList.add("wet", "rush"), k * 40));
    setTimeout(() => { const s = document.getElementById("stamp"); s.setAttribute("opacity", 1); s.classList.add("slam"); Sound.sfx("win"); }, order.length * 40 + 200);
    const [s3, s2] = CF.stars, stars = turns <= Math.ceil(minTurns * s3) ? 3 : turns <= Math.ceil(minTurns * s2) ? 2 : 1;
    setTimeout(() => emit("won", { level, turns, minTurns, stars }), order.length * 40 + 1100);
  }

  /* ---------- input ---------- */
  let press = null;
  svg.addEventListener("pointerdown", e => { const g = e.target.closest(".tile"); if (!g) return; const i = +g.dataset.i; press = { i, t: setTimeout(() => { press = null; toggleLock(i); }, 380) }; });
  const rel = e => { if (!press) return; clearTimeout(press.t); const i = press.i; press = null; if (e.type === "pointerup") turn(i); };
  svg.addEventListener("pointerup", rel); svg.addEventListener("pointerleave", rel); svg.addEventListener("pointercancel", rel);
  svg.addEventListener("contextmenu", e => { e.preventDefault(); const g = e.target.closest(".tile"); if (g) { if (press) { clearTimeout(press.t); press = null; } toggleLock(+g.dataset.i); } });
  addEventListener("keydown", e => { if (e.key === "Escape" || e.key === "p") emit("pauseKey"); if (e.key === "h") emit("hintKey"); });

  return {
    on: (n, f) => hooks[n] = f, generate, turn, hint, toggleLock, solved, rotMask,
    pause() { paused = true; }, resume() { paused = false; },
    get level() { return level; }, get turns() { return turns; }, get minTurns() { return minTurns; }, get tiles() { return tiles; }, get done() { return done; },
    get cols() { return cols; }, get rows() { return rows; }, get wrap() { return wrap; }, get wetCount() { return tiles.filter(t => t.wet).length; }
  };
})();

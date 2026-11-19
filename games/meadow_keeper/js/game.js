/* ==========================================================================
   MEADOW KEEPER — meadow engine
   World coordinates: x = column * 56, y = row * 56. The ground (grass,
   brambles and the forest border) is painted once into an offscreen canvas
   and repainted only when brambles are cleared. Items, the cottage and
   visitors are drawn every frame, sorted by their ground y.
   ========================================================================== */
window.Game = (() => {
  const C = window.GAME_CONFIG, A = window.Art, St = window.Store, T = C.grid.tile, COLS = C.grid.cols, ROWS = C.grid.rows, CH = C.grid.chunk;
  const WW = COLS * T, WH = ROWS * T, M = 3 * T;   // world size and forest margin
  const cv = document.getElementById("view"), ctx = cv.getContext("2d");
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const hash = A.hash;
  const S = () => St.S;
  const on = {};

  /* ---------- canvas & camera ---------- */
  let W = 1, H = 1, DPR = 1;
  const cam = { x: (C.cottage.c + 1) * T, y: (C.cottage.r + 1) * T, z: 1, tz: 1 };
  function resize() {
    DPR = Math.min(devicePixelRatio || 1, 2); W = Math.max(1, innerWidth); H = Math.max(1, innerHeight);
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); cv.style.width = W + "px"; cv.style.height = H + "px";
    const fit = clamp(Math.min(W / (6.6 * T), H / (9 * T)), 0.6, 1.6); if (!resize.done) { cam.z = cam.tz = fit; resize.done = true; }
  }
  addEventListener("resize", resize);
  const zMin = () => Math.max(0.4, Math.min(W / (WW + M), H / (WH + M)) * 0.95), zMax = 2.2;
  const toWorld = (sx, sy) => ({ x: (sx - W / 2) / cam.z + cam.x, y: (sy - H / 2) / cam.z + cam.y });
  const toScreen = (x, y) => ({ x: (x - cam.x) * cam.z + W / 2, y: (y - cam.y) * cam.z + H / 2 });
  function clampCam() { cam.x = clamp(cam.x, -M * 0.3, WW + M * 0.3); cam.y = clamp(cam.y, -M * 0.3, WH + M * 0.3); }

  /* ---------- the grid ---------- */
  const chunkOf = (c, r) => Math.floor(c / CH) + "," + Math.floor(r / CH);
  const isClear = (c, r) => c >= 0 && r >= 0 && c < COLS && r < ROWS && S().cleared.includes(chunkOf(c, r));
  const inCottage = (c, r) => c >= C.cottage.c && c < C.cottage.c + 2 && r >= C.cottage.r && r < C.cottage.r + 2;
  function occupied(c, r, ignore) {
    if (inCottage(c, r)) return true;
    for (const it of S().items) { if (it === ignore) continue; const s = C.items[it.id].size; if (c >= it.c && c < it.c + s && r >= it.r && r < it.r + s) return it; }
    return false;
  }
  function canPlace(id, c, r, ignore) {
    const s = C.items[id].size;
    for (let dc = 0; dc < s; dc++) for (let dr = 0; dr < s; dr++) if (!isClear(c + dc, r + dr) || occupied(c + dc, r + dr, ignore)) return false;
    return true;
  }
  const centerOf = it => { const s = C.items[it.id].size; return { x: (it.c + s / 2) * T, y: (it.r + s / 2) * T }; };
  function adjacentToClear(key) {
    const [a, b] = key.split(",").map(Number);
    return [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => S().cleared.includes((a + dx) + "," + (b + dy)));
  }

  /* ---------- painted ground ---------- */
  const GS = 1.4;   // ground canvas resolution
  const ground = document.createElement("canvas"), gctx = ground.getContext("2d");
  function paintGround() {
    ground.width = Math.round((WW + 2 * M) * GS); ground.height = Math.round((WH + 2 * M) * GS);
    const g = gctx; g.setTransform(GS, 0, 0, GS, M * GS, M * GS);
    // forest floor around the meadow
    g.fillStyle = "#2f6a42"; g.fillRect(-M, -M, WW + 2 * M, WH + 2 * M);
    // meadow grass with soft painted blobs
    const gr = g.createRadialGradient(WW / 2, WH / 2, 50, WW / 2, WH / 2, WH * 0.7); gr.addColorStop(0, "#9ee06a"); gr.addColorStop(1, "#6fc25a");
    g.fillStyle = gr; g.fillRect(0, 0, WW, WH);
    for (let i = 0; i < 520; i++) { const x = hash(i) * WW, y = hash(i + 0.5) * WH, r = 10 + hash(i + 0.9) * 34; g.fillStyle = hash(i + 0.3) > 0.5 ? "rgba(255,255,200,0.07)" : "rgba(40,110,40,0.07)"; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
    for (let i = 0; i < 900; i++) { const x = hash(i * 1.7) * WW, y = hash(i * 2.3) * WH; g.strokeStyle = hash(i * 3.1) > 0.5 ? "rgba(70,140,60,0.5)" : "rgba(170,230,120,0.6)"; g.lineWidth = 1.3; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 2, y - 5); g.moveTo(x + 2, y); g.lineTo(x + 3, y - 5); g.stroke(); }
    const specks = ["#ffffff", "#ffd23f", "#ff9fd0", "#9fb8ff"];
    for (let i = 0; i < 260; i++) { const x = hash(i * 5.1) * WW, y = hash(i * 6.7) * WH; g.fillStyle = specks[i % 4]; g.beginPath(); g.arc(x, y, 1.6, 0, TAU); g.fill(); }
    // brambles on every chunk that isn't clear
    const cc = Math.ceil(COLS / CH), rr = Math.ceil(ROWS / CH);
    for (let a = 0; a < cc; a++) for (let b = 0; b < rr; b++) if (!S().cleared.includes(a + "," + b)) bramble(g, a, b);
    // forest border: big tree canopies
    for (let i = 0; i < 140; i++) {
      const side = i % 4, u = hash(i * 9.1); let x, y;
      if (side === 0) { x = -M + u * (WW + 2 * M); y = -M * (0.15 + hash(i) * 0.75); }
      else if (side === 1) { x = -M + u * (WW + 2 * M); y = WH + M * (0.15 + hash(i) * 0.75); }
      else if (side === 2) { x = -M * (0.15 + hash(i) * 0.75); y = u * WH; }
      else { x = WW + M * (0.15 + hash(i) * 0.75); y = u * WH; }
      const r = 26 + hash(i * 3.3) * 34;
      g.fillStyle = "rgba(10,40,20,0.35)"; g.beginPath(); g.arc(x + 6, y + 8, r, 0, TAU); g.fill();
      g.fillStyle = ["#2f7f4a", "#3a8f52", "#276e40", "#43995a"][i % 4]; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
      g.fillStyle = "rgba(255,255,255,0.08)"; g.beginPath(); g.arc(x - r * 0.3, y - r * 0.3, r * 0.4, 0, TAU); g.fill();
    }
  }
  function bramble(g, a, b) {
    const x0 = a * CH * T, y0 = b * CH * T, w = Math.min(CH, COLS - a * CH) * T, h = Math.min(CH, ROWS - b * CH) * T;
    g.save();
    g.fillStyle = "#3f7a3a"; g.beginPath(); g.roundRect ? g.roundRect(x0 - 4, y0 - 4, w + 8, h + 8, 18) : g.rect(x0 - 4, y0 - 4, w + 8, h + 8); g.fill();
    for (let i = 0; i < 40; i++) { const x = x0 + hash(a * 31 + b * 7 + i) * w, y = y0 + hash(a * 13 + b * 29 + i * 1.3) * h, r = 12 + hash(i + a + b * 3) * 16; g.fillStyle = ["#2f6a32", "#4a8a40", "#3a7a38", "#558f45"][i % 4]; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
    g.strokeStyle = "#6a4a2a"; g.lineWidth = 2.2;
    for (let i = 0; i < 9; i++) { const x = x0 + hash(a + b * 5 + i * 2.1) * w, y = y0 + hash(a * 3 + b + i * 3.7) * h; g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + 20, y - 18, x + 30, y + 14, x + 48, y - 4); g.stroke(); for (let k = 0; k < 4; k++) { const px = x + 10 + k * 10, py = y - 4 + (k % 2) * 6; g.beginPath(); g.moveTo(px, py); g.lineTo(px + 3, py - 4); g.stroke(); } }
    for (let i = 0; i < 6; i++) { const x = x0 + hash(a * 5 + b * 11 + i * 4.4) * w, y = y0 + hash(a * 7 + b * 3 + i * 5.5) * h; for (let k = 0; k < 5; k++) { const an = k / 5 * TAU; g.fillStyle = "#ffc2d8"; g.beginPath(); g.arc(x + Math.cos(an) * 3.4, y + Math.sin(an) * 3.4, 3, 0, TAU); g.fill(); } g.fillStyle = "#ffd23f"; g.beginPath(); g.arc(x, y, 1.8, 0, TAU); g.fill(); }
    g.restore();
  }

  /* ---------- runtime state ---------- */
  let time = 0, visitors = [], parts = [], floats = [], spawnT = 2, placing = null, flashA = 0, flashXY = null;
  const night = () => { const c = S().clock; return clamp((c - 0.72) / 0.06, 0, 1) * (c < 0.95 ? 1 : 1) + (c < 0.2 ? clamp((0.2 - c) / 0.06, 0, 1) : 0) > 0.5; };
  const nightK = () => { const c = S().clock; if (c > 0.72) return clamp((c - 0.72) / 0.07, 0, 1); if (c < 0.2) return clamp((0.2 - c) / 0.07, 0, 1); return 0; };
  const isNight = () => nightK() > 0.5;
  function scheduleBubble(it, first) { const [a, b] = C.bubbleEvery; it.at = time + (first ? Math.random() * a : a + Math.random() * (b - a)); it.ready = false; }
  for (const it of S().items) if (C.items[it.id].drop) scheduleBubble(it, true);

  /* ---------- visitors ---------- */
  function needsMet(sp) { const t = St.tagCount(); return Object.entries(sp.needs).every(([k, n]) => (t[k] || 0) >= n); }
  const timeOk = sp => sp.time === "any" || (sp.time === "night") === isNight();
  function homes(sp) { return S().items.filter(it => C.items[it.id].tags.includes(sp.home)); }
  function spawnCheck() {
    const max = 3 + Math.floor(S().cleared.length / 2);
    if (visitors.filter(v => !v.leaving).length >= max) return;
    const ok = C.visitors.filter(sp => needsMet(sp) && timeOk(sp) && visitors.filter(v => v.sp === sp && !v.leaving).length < (sp.rarity === 1 ? 2 : 1));
    for (const sp of ok) if (Math.random() < C.spawnChance[sp.rarity]) { spawn(sp); break; }
  }
  function spawn(sp) {
    const hs = homes(sp); if (!hs.length) return;
    const h = centerOf(hs[Math.floor(Math.random() * hs.length)]);
    const edge = Math.floor(Math.random() * 4), sx = edge < 2 ? Math.random() * WW : (edge === 2 ? -40 : WW + 40), sy = edge >= 2 ? Math.random() * WH : (edge === 0 ? -40 : WH + 40);
    const air = sp.kind === "flyer" || sp.kind === "bird";
    const v = { sp, x: air ? sx : h.x + (Math.random() - 0.5) * 60, y: air ? sy : h.y + (Math.random() - 0.5) * 60, tx: h.x, ty: h.y, t: Math.random() * 9, wait: 0, life: C.stay[0] + Math.random() * (C.stay[1] - C.stay[0]), dir: 1, alpha: air ? 1 : 0, hop: 0, fly: air, shot: false, leaving: false, z: air ? 30 : 0 };
    visitors.push(v);
    on.arrive && on.arrive(sp);
  }
  function retarget(v) {
    const hs = homes(v.sp);
    if (!hs.length) { v.leaving = true; return; }
    const h = centerOf(hs[Math.floor(Math.random() * hs.length)]), s = v.sp.kind;
    const spread = s === "swimmer" ? 26 : s === "crawler" ? 20 : 34;
    v.tx = h.x + (Math.random() - 0.5) * spread * 2; v.ty = h.y + (Math.random() - 0.5) * spread * (s === "swimmer" ? 1.2 : 1.5) - (s === "flyer" ? 10 : 0);
  }
  function updateVisitor(v, dt) {
    v.t += dt; v.life -= dt;
    if (!v.leaving && !timeOk(v.sp) && v.t > 2) v.life = Math.min(v.life, Math.random() * 4);   // day visitors leave at dusk, night ones at dawn
    if (v.life <= 0 && !v.leaving) { v.leaving = true; v.tx = v.x < WW / 2 ? -60 : WW + 60; v.ty = v.y + (Math.random() - 0.5) * 200; }
    const k = v.sp.kind, speed = { flyer: 70, bird: 50, crawler: 9, hopper: 40, walker: 34, swimmer: 16 }[k];
    const dx = v.tx - v.x, dy = v.ty - v.y, d = Math.hypot(dx, dy);
    if (v.leaving && (k === "crawler" || k === "swimmer" || k === "hopper")) { v.alpha -= dt * 0.6; if (v.alpha <= 0) v.gone = true; return; }
    if (!v.leaving && v.alpha < 1) v.alpha = Math.min(1, v.alpha + dt);
    if (v.wait > 0) { v.wait -= dt; v.hop = 0; v.walk = 0; if (k === "flyer") { v.x += Math.sin(v.t * 3) * 0.2; } return; }
    if (d < 4) {
      if (v.leaving) { v.gone = true; return; }
      v.wait = k === "flyer" ? 1 + Math.random() * 2.5 : k === "crawler" ? 2 + Math.random() * 4 : 1.5 + Math.random() * 3; v.fly = false; retarget(v); return;
    }
    let sp = speed;
    if (k === "hopper") { const ph = (v.t * 2.2) % 1; v.hop = Math.sin(ph * Math.PI); sp = ph < 1 ? speed * 1.4 * v.hop : 0; }
    if (k === "bird") { if (d > 90 || v.leaving) { v.fly = true; sp = 120; v.hop = 0.6; } else { v.fly = false; const ph = (v.t * 3) % 1; v.hop = Math.sin(ph * Math.PI); sp = 40 * v.hop; } }
    if (k === "walker") v.walk = 1;
    const step = Math.min(d, sp * dt);
    v.x += dx / d * step; v.y += dy / d * step;
    if (k === "flyer") { v.y += Math.sin(v.t * 6) * 0.6; }
    if (Math.abs(dx) > 1) v.dir = dx > 0 ? 1 : -1;
  }

  /* ---------- input: pan, pinch, wheel, tap ---------- */
  const ptrs = new Map(); let gesture = null;
  cv.addEventListener("pointerdown", e => {
    try { cv.setPointerCapture(e.pointerId); } catch (er) {}
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 1) {
      const w = toWorld(e.clientX, e.clientY);
      const onGhost = placing && w.x >= placing.c * T - 10 && w.x <= (placing.c + C.items[placing.id].size) * T + 10 && w.y >= placing.r * T - 50 && w.y <= (placing.r + C.items[placing.id].size) * T + 10;
      gesture = { type: onGhost ? "ghost" : "pan", sx: e.clientX, sy: e.clientY, cx: cam.x, cy: cam.y, t: performance.now(), moved: 0 };
    } else if (ptrs.size === 2) {
      const [a, b] = [...ptrs.values()];
      gesture = { type: "pinch", d0: Math.hypot(a.x - b.x, a.y - b.y), z0: cam.tz, moved: 99 };
    }
  });
  cv.addEventListener("pointermove", e => {
    if (!ptrs.has(e.pointerId) || !gesture) return;
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (gesture.type === "pinch" && ptrs.size === 2) { const [a, b] = [...ptrs.values()]; cam.tz = clamp(gesture.z0 * Math.hypot(a.x - b.x, a.y - b.y) / gesture.d0, zMin(), zMax); return; }
    const dx = e.clientX - gesture.sx, dy = e.clientY - gesture.sy; gesture.moved = Math.max(gesture.moved, Math.hypot(dx, dy));
    if (gesture.type === "pan" && gesture.moved > 6) { cam.x = gesture.cx - dx / cam.z; cam.y = gesture.cy - dy / cam.z; clampCam(); }
    if (gesture.type === "ghost") { const w = toWorld(e.clientX, e.clientY), s = C.items[placing.id].size; placing.c = clamp(Math.round(w.x / T - s / 2), 0, COLS - s); placing.r = clamp(Math.round(w.y / T - s / 2), 0, ROWS - s); on.placing && on.placing(placeValid()); }
  });
  const up = e => {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.delete(e.pointerId);
    if (gesture && ptrs.size === 0) { if (gesture.moved < 8 && performance.now() - gesture.t < 450 && gesture.type !== "pinch") tap(e.clientX, e.clientY); gesture = null; }
    else if (ptrs.size === 1 && gesture && gesture.type === "pinch") gesture = null;
  };
  cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
  cv.addEventListener("wheel", e => { e.preventDefault(); cam.tz = clamp(cam.tz * (e.deltaY > 0 ? 0.9 : 1.1), zMin(), zMax); }, { passive: false });

  function tap(sx, sy) {
    Sound.unlock();
    const w = toWorld(sx, sy);
    if (placing) { const s = C.items[placing.id].size; placing.c = clamp(Math.floor(w.x / T - (s - 1) / 2), 0, COLS - s); placing.r = clamp(Math.floor(w.y / T - (s - 1) / 2), 0, ROWS - s); on.placing && on.placing(placeValid()); Sound.play("tick"); return; }
    // nectar drops first
    for (const it of S().items) if (it.ready) { const c = centerOf(it), by = c.y - (C.items[it.id].size === 2 ? 120 : 44); if (Math.hypot(w.x - c.x, w.y - by) < 26) { collect(it); return; } }
    // visitors
    let best = null, bd = 40 / Math.min(1, cam.z);
    for (const v of visitors) { if (v.leaving || v.alpha < 0.5) continue; const d = Math.hypot(w.x - v.x, w.y - (v.y - (v.sp.kind === "flyer" || v.fly ? v.z : 9))); if (d < bd) { bd = d; best = v; } }
    if (best) { photo(best, sx, sy); return; }
    // items & cottage
    const c = Math.floor(w.x / T), r = Math.floor(w.y / T);
    if (inCottage(c, r) || (w.y > C.cottage.r * T - 60 && w.y < (C.cottage.r + 2) * T && w.x > C.cottage.c * T && w.x < (C.cottage.c + 2) * T)) { on.cottage && on.cottage(); return; }
    const hit = occupied(c, r);
    if (hit && hit !== true) { on.itemTap && on.itemTap(hit); return; }
    if (c >= 0 && r >= 0 && c < COLS && r < ROWS && !isClear(c, r)) { on.bramble && on.bramble(chunkOf(c, r), adjacentToClear(chunkOf(c, r))); return; }
  }
  function collect(it) {
    const def = C.items[it.id], boost = visitors.some(v => v.sp.id === "honeybee" && !v.leaving) ? 1.5 : 1, n = Math.round(def.drop * boost);
    it.ready = false; scheduleBubble(it);
    S().nectar += n; S().stats.collected += n; St.save();
    const c = centerOf(it), p = toScreen(c.x, c.y - 44);
    floats.push({ x: c.x, y: c.y - 50, text: "+" + n, t: 0, col: "#ffb000" });
    on.collect && on.collect(n, p.x, p.y);
    Sound.play("drop");
  }
  function collectAll() { let n = 0; for (const it of S().items) if (it.ready) { collect(it); n++; } return n; }
  function photo(v, sx, sy) {
    flashA = 1; flashXY = { x: sx, y: sy };
    const first = !S().journal[v.sp.id];
    S().journal[v.sp.id] = (S().journal[v.sp.id] || 0) + 1; S().stats.photos++;
    if (v.sp.time === "night") S().stats.night++;
    let reward;
    if (first) { S().seeds += v.sp.seeds; reward = { seeds: v.sp.seeds }; }
    else if (!v.shot) { const n = 3 + v.sp.rarity * 2; S().nectar += n; reward = { nectar: n }; }
    else reward = {};
    const lvUp = St.addXp(first ? 15 + v.sp.rarity * 10 : v.shot ? 0 : 3);
    v.shot = true; St.save();
    Sound.play("shutter");
    on.photo && on.photo(v.sp, first, reward, lvUp);
  }

  /* ---------- placing ---------- */
  function placeValid() { return placing && canPlace(placing.id, placing.c, placing.r, placing.moving); }
  function startPlacing(id, moving) {
    const s = C.items[id].size;
    let c = Math.round(cam.x / T - s / 2), r = Math.round(cam.y / T - s / 2);
    if (moving) { c = moving.c; r = moving.r; }
    else { // find the nearest free spot to the screen centre
      let best = null, bd = 1e9;
      for (let cc = 0; cc <= COLS - s; cc++) for (let rr = 0; rr <= ROWS - s; rr++) if (canPlace(id, cc, rr)) { const d = Math.hypot(cc - c, rr - r); if (d < bd) { bd = d; best = [cc, rr]; } }
      if (best) [c, r] = best;
    }
    placing = { id, c, r, moving };
    on.placing && on.placing(placeValid());
  }
  function confirmPlace() {
    if (!placeValid()) return false;
    const p = placing, def = C.items[p.id];
    if (p.moving) { p.moving.c = p.c; p.moving.r = p.r; }
    else { const it = { id: p.id, c: p.c, r: p.r, seed: Math.random() * 9 }; S().items.push(it); if (def.drop) scheduleBubble(it, true); if (def.cat === "flowers") S().stats.planted++; }
    const c = centerOf(p); for (let i = 0; i < 14; i++) parts.push({ x: c.x, y: c.y, vx: (Math.random() - 0.5) * 120, vy: -40 - Math.random() * 80, life: 0, max: 0.6, col: ["#ffffff", "#ffd23f", "#9ee06a"][i % 3], r: 2.5, g: 160 });
    placing = null; St.save(); Sound.play("place");
    return true;
  }
  function cancelPlace() { placing = null; }
  function removeItem(it) { const i = S().items.indexOf(it); if (i >= 0) S().items.splice(i, 1); St.save(); }
  function clearChunk(key) {
    if (S().cleared.includes(key)) return;
    S().cleared.push(key); S().stats.cleared++; S().clears++; St.save(); paintGround();
    const [a, b] = key.split(",").map(Number), cx = (a * CH + 1.5) * T, cy = (b * CH + 1.5) * T;
    for (let i = 0; i < 40; i++) parts.push({ x: cx + (Math.random() - 0.5) * 120, y: cy + (Math.random() - 0.5) * 120, vx: (Math.random() - 0.5) * 160, vy: -60 - Math.random() * 120, life: 0, max: 0.9, col: ["#4a8a40", "#2f6a32", "#ffc2d8", "#6a4a2a"][i % 4], r: 3 + Math.random() * 3, g: 220, leaf: true, rot: Math.random() * 6 });
    Sound.play("rustle");
  }

  /* ---------- update ---------- */
  function update(dt) {
    time += dt;
    S().clock = (S().clock + dt / C.dayLength) % 1;
    cam.z += (cam.tz - cam.z) * Math.min(1, dt * 10);
    for (const it of S().items) if (C.items[it.id].drop && !it.ready && it.at !== undefined && time >= it.at) it.ready = true;
    for (const it of S().items) if (C.items[it.id].drop && it.at === undefined) scheduleBubble(it, true);
    spawnT -= dt; if (spawnT <= 0) { spawnT = 4; spawnCheck(); }
    for (const v of visitors) updateVisitor(v, dt);
    visitors = visitors.filter(v => !v.gone && (v.leaving || needsMetLoose(v.sp)));
    for (const p of parts) { p.life += dt; p.vy += (p.g || 0) * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.rot != null) p.rot += dt * 6; }
    parts = parts.filter(p => p.life < p.max);
    floats.forEach(f => { f.t += dt; f.y -= dt * 30; }); floats = floats.filter(f => f.t < 1.2);
    flashA = Math.max(0, flashA - dt * 3);
  }
  // visitors whose home item was removed leave
  function needsMetLoose(sp) { return homes(sp).length > 0; }

  /* ---------- render ---------- */
  function render() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.fillStyle = "#245a36"; ctx.fillRect(0, 0, W, H);
    const z = cam.z;
    ctx.setTransform(DPR * z, 0, 0, DPR * z, DPR * (W / 2 - cam.x * z), DPR * (H / 2 - cam.y * z));
    ctx.drawImage(ground, -M, -M, WW + 2 * M, WH + 2 * M);
    const nk = nightK(), nt = isNight();
    // placement grid
    if (placing) {
      ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth = 1 / z;
      for (let c = 0; c <= COLS; c++) { ctx.beginPath(); ctx.moveTo(c * T, 0); ctx.lineTo(c * T, WH); ctx.stroke(); }
      for (let r = 0; r <= ROWS; r++) { ctx.beginPath(); ctx.moveTo(0, r * T); ctx.lineTo(WW, r * T); ctx.stroke(); }
      const s = C.items[placing.id].size, ok = placeValid();
      ctx.fillStyle = ok ? "rgba(120,255,140,0.35)" : "rgba(255,90,90,0.4)"; ctx.fillRect(placing.c * T, placing.r * T, s * T, s * T);
      ctx.strokeStyle = ok ? "#ffffff" : "#ff5a5a"; ctx.lineWidth = 3 / z; ctx.strokeRect(placing.c * T, placing.r * T, s * T, s * T);
    }
    // drawables sorted by ground y
    const list = [];
    for (const it of S().items) { if (placing && placing.moving === it) continue; const c = centerOf(it), s = C.items[it.id].size; list.push({ y: c.y + s * T * 0.3, f: () => { ctx.save(); ctx.translate(c.x, c.y + (s === 2 ? T * 0.25 : T * 0.12)); A.item(ctx, it.id, time, nt, it.seed); ctx.restore(); } }); }
    const cc = { x: (C.cottage.c + 1) * T, y: (C.cottage.r + 1) * T };
    list.push({ y: cc.y + T * 0.7, f: () => { ctx.save(); ctx.translate(cc.x, cc.y + T * 0.55); A.cottage(ctx, time, nt); ctx.restore(); } });
    if (placing) { const c = centerOf(placing), s = C.items[placing.id].size; list.push({ y: 1e6, f: () => { ctx.save(); ctx.globalAlpha = 0.85; ctx.translate(c.x, c.y + (s === 2 ? T * 0.25 : T * 0.12) - Math.abs(Math.sin(time * 4)) * 4); A.item(ctx, placing.id, time, nt, 1); ctx.restore(); } }); }
    for (const v of visitors) {
      const air = v.sp.kind === "flyer" || v.fly;
      list.push({ y: v.y + (air ? 200 : 0), f: () => {
        ctx.save(); ctx.globalAlpha = Math.max(0, Math.min(1, v.alpha));
        if (air) { ctx.fillStyle = "rgba(30,60,30,0.18)"; ctx.beginPath(); ctx.ellipse(v.x + 4, v.y + 4, 7, 3, 0, 0, TAU); ctx.fill(); }
        ctx.translate(v.x, v.y - (air ? v.z : 0));
        ctx.scale(1.45, 1.45); A.critter(ctx, v.sp.id, v.t, { dir: v.dir, hop: v.hop, fly: v.fly, walk: v.walk });
        if (v.shot) { ctx.fillStyle = "#ff6f9f"; ctx.font = "bold 9px sans-serif"; ctx.textAlign = "center"; ctx.fillText("♥", 0, -22); }
        ctx.restore();
      } });
    }
    list.sort((a, b) => a.y - b.y);
    for (const o of list) o.f();
    // nectar drops
    for (const it of S().items) if (it.ready) {
      const c = centerOf(it), by = c.y - (C.items[it.id].size === 2 ? 120 : 44) + Math.sin(time * 3 + it.seed) * 3;
      ctx.fillStyle = "rgba(255,255,255,0.9)"; ctx.beginPath(); ctx.arc(c.x, by, 13, 0, TAU); ctx.fill();
      ctx.fillStyle = "#ffb000"; ctx.beginPath(); ctx.moveTo(c.x, by - 9); ctx.bezierCurveTo(c.x + 8, by - 1, c.x + 7, by + 7, c.x, by + 7); ctx.bezierCurveTo(c.x - 7, by + 7, c.x - 8, by - 1, c.x, by - 9); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.7)"; ctx.beginPath(); ctx.arc(c.x - 2, by + 1, 2, 0, TAU); ctx.fill();
    }
    // particles & floats
    for (const p of parts) { const k = 1 - p.life / p.max; ctx.globalAlpha = k; ctx.fillStyle = p.col; if (p.leaf) { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.beginPath(); ctx.ellipse(0, 0, p.r * 1.6, p.r * 0.8, 0, 0, TAU); ctx.fill(); ctx.restore(); } else { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill(); } }
    ctx.globalAlpha = 1;
    ctx.font = "900 18px " + FONT; ctx.textAlign = "center";
    for (const f of floats) { ctx.globalAlpha = 1 - f.t / 1.2; ctx.lineWidth = 4; ctx.strokeStyle = "#fff"; ctx.strokeText(f.text, f.x, f.y); ctx.fillStyle = f.col; ctx.fillText(f.text, f.x, f.y); }
    ctx.globalAlpha = 1;
    // night
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (nk > 0.01) {
      ctx.globalCompositeOperation = "multiply"; ctx.fillStyle = `rgba(${255 - 115 * nk},${255 - 105 * nk},${255 - 45 * nk},1)`; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = "source-over";
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < 24; i++) { const x = (hash(i) * W + Math.sin(time * 0.4 + i) * 40), y = hash(i + 3) * H + Math.cos(time * 0.5 + i * 2) * 30, a = (0.4 + 0.6 * Math.sin(time * 3 + i)) * nk; const gl = ctx.createRadialGradient(x, y, 0, x, y, 9); gl.addColorStop(0, `rgba(255,245,160,${a})`); gl.addColorStop(1, "rgba(255,245,160,0)"); ctx.fillStyle = gl; ctx.fillRect(x - 9, y - 9, 18, 18); }
      // re-light lanterns and the cottage windows
      ctx.setTransform(DPR * z, 0, 0, DPR * z, DPR * (W / 2 - cam.x * z), DPR * (H / 2 - cam.y * z));
      const glow = (x, y, r, col) => { const gl = ctx.createRadialGradient(x, y, 0, x, y, r); gl.addColorStop(0, `rgba(${col},${0.55 * nk})`); gl.addColorStop(1, `rgba(${col},0)`); ctx.fillStyle = gl; ctx.fillRect(x - r, y - r, r * 2, r * 2); };
      for (const it of S().items) if (it.id === "lantern") { const c = centerOf(it); glow(c.x + 10, c.y - 26, 90, "255,210,130"); }
      glow(cc.x, cc.y - 2, 110, "255,200,120");
      for (const v of visitors) if (v.sp.id === "firefly") glow(v.x, v.y - v.z, 50, "255,250,150");
      ctx.globalCompositeOperation = "source-over";
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    if (flashA > 0) { ctx.fillStyle = `rgba(255,255,255,${flashA * 0.8})`; ctx.fillRect(0, 0, W, H); }
  }
  const FONT = '"Fredoka","Baloo 2","Arial Rounded MT Bold","Trebuchet MS",system-ui,sans-serif';

  /* ---------- loop ---------- */
  let last = performance.now();
  function frame(now) { const dt = Math.min(0.05, (now - last) / 1000); last = now; update(dt); render(); requestAnimationFrame(frame); }
  resize(); paintGround(); requestAnimationFrame(frame);

  // offline nectar: what the flowers would have made while you were away
  function offlineEarnings() {
    const away = Math.min(C.offlineCapHours * 3600, Math.max(0, (Date.now() - S().last) / 1000));
    if (away < 60) return { away, nectar: 0 };
    const avg = (C.bubbleEvery[0] + C.bubbleEvery[1]) / 2;
    const rate = S().items.reduce((a, it) => a + (C.items[it.id].drop || 0) / avg, 0);
    return { away, nectar: Math.floor(rate * away * C.offlineRate) };
  }

  return {
    on, startPlacing, confirmPlace, cancelPlace, removeItem, clearChunk, collectAll, offlineEarnings, isNight,
    get placing() { return placing; }, placeValid,
    zoom(k) { cam.tz = clamp(cam.tz * k, zMin(), zMax); },
    centerOn(x, y) { cam.x = x; cam.y = y; clampCam(); },
    get visitors() { return visitors; }, readyCount() { return S().items.filter(i => i.ready).length; },
    // test hooks
    step(dt = 1 / 60, n = 1) { for (let i = 0; i < n; i++) update(dt); render(); },
    spawn(id) { const sp = C.visitors.find(s => s.id === id); if (sp) spawn(sp); },
    tapAt(x, y) { const p = toScreen(x, y); tap(p.x, p.y); }, toScreen, setClock(c) { S().clock = c; }, needsMet: id => needsMet(C.visitors.find(s => s.id === id))
  };
})();

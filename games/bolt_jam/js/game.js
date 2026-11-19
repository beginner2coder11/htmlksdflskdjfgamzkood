/* BOLT JAM — game: plates (swing + fall physics), screws, toolboxes, spare holes, effects, rendering.
   Coordinates: the board is a 360 × 460 "world"; boxes and spare holes live in screen space.
   Every sprite (plates, screw heads, shadows, board) is baked once per screen size. */
window.Game = (() => {
  const C = window.GAME_CONFIG, L = window.Levels;
  const cv = document.getElementById("view"), ctx = cv.getContext("2d");
  const TAU = Math.PI * 2, HEAD = L.HEAD;
  let DPR = 1, VW = 0, VH = 0, bs = 1, bx = 0, by = 0, u = 1;   // board scale + origin, UI unit
  let lay = {};                                                  // layout (screen px)
  const on = {};
  let mode = "idle", lvl = null, plates = [], screws = [], boxes = [], queue = [], qi = 0, spares = [], extra = 0;
  let parts = [], texts = [], t = 0, shake = 0, drill = false, bot = false, botT = 0, combo = 0, comboT = 0, endT = 0, hand = null;
  let boardId = C.boards[0].id, headId = C.heads[0].id;

  /* ---------- colour helpers ---------- */
  const hex2 = h => { const n = parseInt(h.slice(1), 16); return [n >> 16, n >> 8 & 255, n & 255]; };
  const mix = (a, b, k) => { const p = hex2(a), q = hex2(b); return `rgb(${p.map((v, i) => Math.round(v + (q[i] - v) * k)).join(",")})`; };
  const rgba = (h, a) => { const p = hex2(h); return `rgba(${p[0]},${p[1]},${p[2]},${a})`; };
  const ease = x => x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2;
  const back = x => { const c = 1.7; return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2; };
  const COL = i => C.colors[i];

  /* ---------- layout ---------- */
  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1); VW = innerWidth; VH = innerHeight;
    cv.width = VW * DPR; cv.height = VH * DPR; cv.style.width = VW + "px"; cv.style.height = VH + "px";
    u = Math.min(VW / 400, VH / 820, 1.3);
    const top = 64 + (parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--sat")) || 0);
    lay.boxY = top + 8 * u; lay.boxW = Math.min(158 * u, (VW - 40) / 2 - 8); lay.boxH = lay.boxW * 0.62; lay.gap = 16 * u;
    lay.spareY = lay.boxY + lay.boxH + 22 * u; lay.spareH = 54 * u;
    const boardTop = lay.spareY + lay.spareH + 18 * u, boardBot = VH - 98;
    bs = Math.min((VW - 24) / (L.W + 24), (boardBot - boardTop) / (L.H + 24));
    bx = (VW - L.W * bs) / 2; by = boardTop + ((boardBot - boardTop) - L.H * bs) / 2;
    bakeAll();
  }
  const sx = x => bx + x * bs, sy = y => by + y * bs;

  /* ---------- sprite baking ---------- */
  let bgCanvas = null, sprites = {};
  function canvasOf(w, h) { const c = document.createElement("canvas"); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
  function roundPoly(g, pts, r) {
    const n = pts.length; g.beginPath();
    for (let i = 0; i < n; i++) {
      const a = pts[(i + n - 1) % n], b = pts[i], c = pts[(i + 1) % n];
      const m1 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      if (i === 0) g.moveTo(m1[0], m1[1]);
      g.arcTo(b[0], b[1], c[0], c[1], r);
    }
    g.closePath();
  }
  function platePath(g, p, k, grow = 0) {
    if (p.shape === "circle") { g.beginPath(); g.arc(0, 0, (p.r + grow) * k, 0, TAU); return; }
    const sc = pt => { const d = Math.hypot(pt[0], pt[1]) || 1; return [(pt[0] + pt[0] / d * grow) * k, (pt[1] + pt[1] / d * grow) * k]; };
    roundPoly(g, p.pts.map(sc), (p.shape === "bar" ? 23 : p.shape === "tri" ? 16 : 14) * k);
  }
  function bakePlate(p) {
    const k = bs * DPR, R = Math.max(...p.pts.map(v => Math.hypot(v[0], v[1]))) + 26, S = R * 2 * k;
    const body = canvasOf(S, S), g = body.getContext("2d"); g.translate(S / 2, S / 2);
    const tint = p.tint;
    // body
    platePath(g, p, k);
    const gr = g.createLinearGradient(-R * k * 0.6, -R * k * 0.6, R * k * 0.6, R * k * 0.6);
    gr.addColorStop(0, mix(tint, "#ffffff", 0.35)); gr.addColorStop(0.55, tint); gr.addColorStop(1, mix(tint, "#000000", 0.14));
    g.fillStyle = gr; g.globalAlpha = C.plateAlpha; g.fill(); g.globalAlpha = 1;
    // gloss + inner rim (clipped to the plate)
    g.save(); platePath(g, p, k); g.clip();
    const gl = g.createLinearGradient(0, -R * k, 0, R * k * 0.2);
    gl.addColorStop(0, "rgba(255,255,255,0.55)"); gl.addColorStop(0.45, "rgba(255,255,255,0.12)"); gl.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gl; g.fillRect(-R * k, -R * k, 2 * R * k, 2 * R * k);
    platePath(g, p, k); g.lineWidth = 5 * k; g.strokeStyle = "rgba(255,255,255,0.45)"; g.stroke();
    g.restore();
    platePath(g, p, k); g.lineWidth = 2.4 * k; g.strokeStyle = mix(tint, "#3a2a40", 0.45); g.stroke();
    // drilled holes
    for (const h of p.holes) {
      const x = h[0] * k, y = h[1] * k, r = 13.5 * k;
      g.beginPath(); g.arc(x, y, r + 2.5 * k, 0, TAU); g.fillStyle = rgba("#ffffff", 0.35); g.fill();
      const hg = g.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r);
      hg.addColorStop(0, "rgba(30,20,40,0.55)"); hg.addColorStop(1, "rgba(30,20,40,0.85)");
      g.beginPath(); g.arc(x, y, r, 0, TAU); g.fillStyle = hg; g.fill();
      g.beginPath(); g.arc(x, y, r, 0.2 * Math.PI, 0.8 * Math.PI); g.strokeStyle = "rgba(255,255,255,0.5)"; g.lineWidth = 1.2 * k; g.stroke();
    }
    // shadow (shadow-only trick: draw far away, offset the shadow back)
    const sh = canvasOf(S, S), s = sh.getContext("2d"); s.translate(S / 2 - 10000, S / 2);
    s.shadowColor = "rgba(40,20,30,0.38)"; s.shadowBlur = 9 * k; s.shadowOffsetX = 10000;
    platePath(s, p, k); s.fillStyle = "#000"; s.fill();
    // flash outline (blocked feedback)
    const fl = canvasOf(S, S), f = fl.getContext("2d"); f.translate(S / 2, S / 2);
    platePath(f, p, k, 2); f.lineWidth = 5 * k; f.strokeStyle = "#ffffff"; f.shadowColor = "#ff4d5e"; f.shadowBlur = 10 * k; f.stroke();
    // edge: the plate's thickness, drawn a few px under the body
    const ed = canvasOf(S, S), e = ed.getContext("2d"); e.translate(S / 2, S / 2);
    platePath(e, p, k); e.fillStyle = mix(tint, "#3a2a40", 0.38); e.fill();
    return { body, sh, fl, ed, R };
  }
  function bakeHead(ci, style, rWorld, kOverride) {
    const k = kOverride || bs * DPR, r = rWorld * k, S = (r + 6 * k) * 2, c = canvasOf(S, S), g = c.getContext("2d"); g.translate(S / 2, S / 2);
    const col = COL(ci);
    // washer
    const wg = g.createLinearGradient(0, -r, 0, r); wg.addColorStop(0, "#f4f6fa"); wg.addColorStop(1, "#9aa2b4");
    g.beginPath(); g.arc(0, 0, r + 3 * k, 0, TAU); g.fillStyle = wg; g.fill(); g.lineWidth = 1 * k; g.strokeStyle = "rgba(60,60,80,0.5)"; g.stroke();
    // dome
    const hg = g.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r * 1.05);
    hg.addColorStop(0, mix(col.a, "#ffffff", 0.55)); hg.addColorStop(0.45, col.a); hg.addColorStop(1, col.b);
    g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fillStyle = hg; g.fill();
    g.lineWidth = 1.3 * k; g.strokeStyle = mix(col.b, "#000000", 0.35); g.stroke();
    // socket
    const dark = mix(col.b, "#000000", 0.45), lite = mix(col.a, "#ffffff", 0.6);
    const groove = (draw) => { g.save(); g.translate(0.8 * k, 0.9 * k); g.fillStyle = lite; g.globalAlpha = 0.7; draw(); g.restore(); g.fillStyle = dark; draw(); };
    if (style === "phillips") groove(() => { const a = r * 0.62, b = r * 0.17; g.fillRect(-a, -b, 2 * a, 2 * b); g.fillRect(-b, -a, 2 * b, 2 * a); });
    else if (style === "slot") groove(() => { const a = r * 0.72, b = r * 0.16; g.save(); g.rotate(0.6); g.fillRect(-a, -b, 2 * a, 2 * b); g.restore(); });
    else if (style === "hex") groove(() => { g.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; g[i ? "lineTo" : "moveTo"](Math.cos(a) * r * 0.48, Math.sin(a) * r * 0.48); } g.closePath(); g.fill(); });
    else if (style === "star") groove(() => { g.beginPath(); for (let i = 0; i < 12; i++) { const a = i / 12 * TAU - Math.PI / 2, rr = i % 2 ? r * 0.26 : r * 0.55; g[i ? "lineTo" : "moveTo"](Math.cos(a) * rr, Math.sin(a) * rr); } g.closePath(); g.fill(); });
    else if (style === "gem") {
      for (let i = 0; i < 6; i++) { const a0 = i / 6 * TAU - Math.PI / 2, a1 = (i + 1) / 6 * TAU - Math.PI / 2; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a0) * r * 0.7, Math.sin(a0) * r * 0.7); g.lineTo(Math.cos(a1) * r * 0.7, Math.sin(a1) * r * 0.7); g.closePath(); g.fillStyle = i % 2 ? rgba("#ffffff", 0.35) : rgba("#000000", 0.12); g.fill(); }
    }
    // specular
    g.beginPath(); g.ellipse(-r * 0.38, -r * 0.45, r * 0.32, r * 0.18, -0.6, 0, TAU); g.fillStyle = "rgba(255,255,255,0.75)"; g.fill();
    return c;
  }
  function bakeBoard() {
    const b = C.boards.find(x => x.id === boardId) || C.boards[0];
    bgCanvas = canvasOf(VW * DPR, VH * DPR); const g = bgCanvas.getContext("2d"); g.scale(DPR, DPR);
    const gr = g.createLinearGradient(0, 0, 0, VH); gr.addColorStop(0, b.bg[0]); gr.addColorStop(1, b.bg[1]); g.fillStyle = gr; g.fillRect(0, 0, VW, VH);
    // soft light blobs
    for (let i = 0; i < 6; i++) { const x = (i * 97 % 100) / 100 * VW, y = (i * 61 % 100) / 100 * VH, r = (80 + i * 23) * u; const rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, "rgba(255,255,255,0.16)"); rg.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = rg; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
    // box shelf
    const shY = lay.boxY + lay.boxH - 6 * u;
    g.fillStyle = "rgba(60,30,30,0.16)"; rr(g, 10, shY, VW - 20, 16 * u, 8 * u); g.fill();
    // board panel
    const x0 = sx(-12), y0 = sy(-12), w = (L.W + 24) * bs, h = (L.H + 24) * bs;
    g.save(); g.shadowColor = "rgba(60,30,40,0.3)"; g.shadowBlur = 22 * u; g.shadowOffsetY = 10 * u;
    const pg = g.createLinearGradient(0, y0, 0, y0 + h); pg.addColorStop(0, b.board[0]); pg.addColorStop(1, b.board[1]);
    rr(g, x0, y0, w, h, 26 * bs); g.fillStyle = pg; g.fill(); g.restore();
    g.save(); rr(g, x0, y0, w, h, 26 * bs); g.clip();
    if (b.grain) for (let i = 0; i < 40; i++) { const yy = y0 + (i + 0.5) / 40 * h; g.strokeStyle = `rgba(120,70,30,${0.05 + (i * 37 % 7) / 100})`; g.lineWidth = (1 + (i * 13 % 3)) * bs; g.beginPath(); g.moveTo(x0, yy); for (let xx = 0; xx <= w; xx += 20) g.lineTo(x0 + xx, yy + Math.sin(xx * 0.03 + i) * 3 * bs); g.stroke(); }
    // pegboard dots
    g.fillStyle = b.dots;
    for (let yy = 18; yy < L.H; yy += 30) for (let xx = 18; xx < L.W; xx += 30) { g.beginPath(); g.arc(sx(xx), sy(yy), 3.2 * bs, 0, TAU); g.fill(); }
    g.lineWidth = 3 * bs; g.strokeStyle = "rgba(255,255,255,0.5)"; rr(g, x0 + 2, y0 + 2, w - 4, h - 4, 24 * bs); g.stroke();
    g.restore();
    // corner bolts on the board
    for (const [cx, cy] of [[-2, -2], [L.W + 2, -2], [-2, L.H + 2], [L.W + 2, L.H + 2]]) {
      const x = sx(cx), y = sy(cy), r = 6 * bs; const bg = g.createRadialGradient(x - r * 0.3, y - r * 0.3, 1, x, y, r); bg.addColorStop(0, "#ffffff"); bg.addColorStop(1, "#9aa2b4");
      g.beginPath(); g.arc(x, y, r, 0, TAU); g.fillStyle = bg; g.fill(); g.strokeStyle = "rgba(60,60,80,0.4)"; g.lineWidth = 1; g.stroke();
      g.beginPath(); g.moveTo(x - r * 0.6, y); g.lineTo(x + r * 0.6, y); g.strokeStyle = "rgba(60,60,80,0.6)"; g.lineWidth = 1.4; g.stroke();
    }
  }
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function bakeAll() {
    if (!VW) return;
    bakeBoard();
    sprites = { head: {}, plates: new Map() };
    for (let i = 0; i < C.colors.length; i++) sprites.head[i] = bakeHead(i, headId, HEAD);
    for (const p of plates) sprites.plates.set(p, bakePlate(p));
  }
  function headSprite(ci) { return sprites.head[ci] || (sprites.head[ci] = bakeHead(ci, headId, HEAD)); }

  /* ---------- level setup ---------- */
  function load(n, opts = {}) {
    lvl = L.get(n); bot = !!opts.bot; drill = false; extra = 0; combo = 0; endT = 0; t = 0; parts = []; texts = []; shake = 0;
    plates = lvl.plates.map((p, i) => ({ ...p, id: i, attached: p.holes.map((_, h) => h), state: "fixed", omega: 0, vx: 0, vy: 0, spin: 0, flash: 0, pivot: null, ph: 0, drop: 0 }));
    screws = lvl.screws.map((s, i) => ({ ...s, id: i, st: "in", shake: 0, a: null }));
    queue = lvl.boxes.slice(); qi = 0;
    boxes = [];
    for (let i = 0; i < C.activeBoxes; i++) boxes.push(newBox(i, true));
    spares = Array(lvl.spare).fill(null);
    hand = n === 1 && !bot ? { t: 0 } : null;
    bakeAll();
  }
  function newBox(i, first) {
    if (qi >= queue.length) return { color: -1, slots: [null, null, null], st: "empty", t: 0, i };
    const b = { color: queue[qi++], slots: Array(C.boxSlots).fill(null), arrived: 0, st: "in", t: first ? 0.35 - i * 0.12 : 0, i };
    return b;
  }

  /* ---------- geometry helpers ---------- */
  const screwPos = s => L.toWorld(plates[s.plate], plates[s.plate].holes[s.hole]);
  function blockedBy(s) {
    const p = plates[s.plate], w = screwPos(s);
    return plates.filter(q => q.state !== "fall" && q.state !== "gone" && q.layer > p.layer && L.covers(q, w));
  }
  const isFree = s => s.st === "in" && blockedBy(s).length === 0;
  function boxSlotPos(b, k) {
    const n = boxes.length, total = n * lay.boxW + (n - 1) * lay.gap, x0 = (VW - total) / 2 + b.i * (lay.boxW + lay.gap);
    let ox = 0, oy = 0, al = 1;
    if (b.st === "in") ox = (1 - back(Math.min(1, b.t / 0.35))) * (VW * 0.6);
    if (b.st === "out") { const e = ease(Math.min(1, b.t / 0.32)); oy = -e * lay.boxH * 1.1; al = 1 - e; }
    const cx = x0 + lay.boxW / 2 + ox, top = lay.boxY + oy;
    return { x: cx + (k - 1) * lay.boxW * 0.28, y: top + lay.boxH * 0.34, cx, top, al };
  }
  function spareGeom() {
    const n = spares.length, step = Math.min(52 * u, (VW - 50) / n), w = n * step + 14 * u, x0 = (VW - w) / 2;
    return { n, step, w, x0, y: lay.spareY, h: lay.spareH };
  }
  function sparePos(i) { const g = spareGeom(); return { x: g.x0 + 7 * u + g.step * (i + 0.5), y: g.y + g.h / 2 }; }
  const boxScale = () => (lay.boxW * 0.115) / HEAD;      // screw size in boxes / spares (screen px per world unit)

  /* ---------- actions ---------- */
  function tapAt(x, y) {
    if (mode !== "play" && mode !== "attract") return;
    let best = null;
    for (const s of screws) if (s.st === "in") {
      const w = screwPos(s), d = Math.hypot(sx(w[0]) - x, sy(w[1]) - y);
      if (d < HEAD * bs * 1.7 && (!best || plates[s.plate].layer > plates[best.plate].layer || (plates[s.plate].layer === plates[best.plate].layer && d < best.d))) { best = s; best.d = d; }
    }
    if (!best) return false;
    return take(best);
  }
  function take(s, force) {
    if (s.st !== "in") return false;
    const blk = blockedBy(s);
    if (blk.length && !force && !drill) {
      s.shake = 0.4; blk.forEach(p => p.flash = 0.5); Sound.play("blocked"); if (navigator.vibrate && !bot && mode === "play") try { navigator.vibrate(25); } catch (e) {}
      return false;
    }
    const dest = destFor(s.color);
    if (!dest) return false;
    if (drill) { drill = false; on.drillUsed && on.drillUsed(); burst(screwPos(s), "#ffd23f", 16, true); Sound.play("drill"); }
    s.st = "out"; s.a = { t: 0, from: screwPos(s), dest };
    if (dest.box) dest.box.slots[dest.k] = s.id; else spares[dest.spare] = s.id;
    Sound.play("unscrew");
    hand = null;
    return true;
  }
  function destFor(color) {
    const open = boxes.filter(b => b.color === color && (b.st === "idle" || b.st === "in") && b.slots.includes(null));
    open.sort((a, b) => b.slots.filter(x => x !== null).length - a.slots.filter(x => x !== null).length);
    if (open.length) return { box: open[0], k: open[0].slots.indexOf(null) };
    const i = spares.indexOf(null);
    return i >= 0 ? { spare: i } : null;
  }
  function release(p) {
    if (p.attached.length === 1) {
      p.state = "swing"; p.ph = p.attached[0]; p.pivot = L.toWorld(p, p.holes[p.ph]);
      const hh = p.holes[p.ph]; p.omega = Math.hypot(hh[0], hh[1]) < 1 ? 0 : (p.id % 2 ? 1 : -1) * 0.35;   // a small nudge: a plate balanced exactly upright on its pivot would never tip otherwise
      Sound.play("creak");
    } else if (!p.attached.length) {
      p.state = "fall"; p.vx = (Math.random() - 0.5) * 60; p.vy = -80; p.spin = p.omega * 0.6 + (Math.random() - 0.5) * 2.4;
      Sound.play("fall"); shake = Math.max(shake, 0.12);
    }
  }
  function addHole() { if (extra >= C.maxExtraHoles) return false; extra++; spares.push(null); texts.push({ x: sparePos(spares.length - 1).x, y: lay.spareY - 6, s: "+1 HOLE", t: 0, c: "#ffffff" }); Sound.play("pop"); return true; }
  function setDrill(v) { drill = v; }

  /* ---------- update ---------- */
  function update(dt) {
    t += dt; comboT -= dt; if (comboT <= 0) combo = 0;
    shake = Math.max(0, shake - dt);
    if (hand) hand.t += dt;
    // plates
    const g = C.physics.gravity;
    for (const p of plates) {
      p.flash = Math.max(0, p.flash - dt);
      if (p.state === "swing") {
        const h = p.holes[p.ph], d2 = h[0] * h[0] + h[1] * h[1];
        for (let k = 0; k < 4; k++) {
          const st = dt / 4, c = [p.x - p.pivot[0], p.y - p.pivot[1]];
          p.omega += g * c[0] / (p.k2 + d2) * st; p.omega *= Math.exp(-C.physics.damping * st); p.rot += p.omega * st;
          const r = L.toWorld({ x: 0, y: 0, rot: p.rot }, [-h[0], -h[1]]); p.x = p.pivot[0] + r[0]; p.y = p.pivot[1] + r[1];
        }
      } else if (p.state === "fall") {
        p.vy += g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.spin * dt; p.drop += dt;
        if (p.y > L.H + 420) { p.state = "gone"; }
      }
    }
    // screws: unscrew (lift + spin) then fly
    for (const s of screws) {
      s.shake = Math.max(0, s.shake - dt);
      if (s.st !== "out" && s.st !== "fly") continue;
      s.a.t += dt;
      if (s.st === "out" && s.a.t >= 0.26) {
        s.st = "fly"; s.a.t = 0; s.a.from = screwPos(s);
        const p = plates[s.plate]; p.attached = p.attached.filter(h => h !== s.hole);
        burst(s.a.from, "#ffffff", 7); release(p);
      } else if (s.st === "fly" && s.a.t >= 0.4) arrive(s);
    }
    // spare → box transfers fly too (st "hop")
    for (const s of screws) if (s.st === "hop") { s.a.t += dt; if (s.a.t >= 0.36) arrive(s); }
    // boxes
    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i]; b.t += dt;
      if (b.st === "in" && b.t >= 0.35) { b.st = "idle"; pullSpares(b); }
      if (b.st === "closing" && b.t >= 0.34) { b.st = "out"; b.t = 0; Sound.play("whoosh"); }
      if (b.st === "out" && b.t >= 0.32) { boxes[i] = newBox(i); if (boxes[i].st === "empty") boxes[i].i = i; }
    }
    // particles + texts
    for (const q of parts) { q.t += dt; q.vy += (q.g || 900) * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.r += (q.vr || 0) * dt; }
    parts = parts.filter(q => q.t < q.life);
    for (const x of texts) x.t += dt; texts = texts.filter(x => x.t < 1.1);
    // end of level
    if (mode === "play" || mode === "attract") {
      const busy = screws.some(s => s.st === "out" || s.st === "fly" || s.st === "hop") || boxes.some(b => b.st === "closing" || b.st === "out" || b.st === "in");
      if (screws.every(s => s.st === "box") && !busy) { endT += dt; if (endT > 0.5) finish(true); }
      else if (!busy && !spares.includes(null) && !screws.some(s => isFree(s) && boxes.some(b => b.color === s.color && b.st === "idle" && b.slots.includes(null)))) { endT += dt; if (endT > 0.35) finish(false); }
      else endT = 0;
    }
    if (mode === "attract" || (bot && mode === "play")) { botT -= dt; if (botT <= 0) { botT = mode === "attract" ? 0.75 : 0.05; botMove(); } }
  }
  function arrive(s) {
    const d = s.a.dest;
    if (d.box) {
      s.st = "box"; d.box.arrived = d.box.slots.filter(id => id !== null && screws[id].st === "box").length;
      const pos = boxSlotPos(d.box, d.k); burst([pos.x, pos.y], COL(s.color).a, 6, false, true);
      Sound.play("drop", d.box.arrived);
      if (d.box.arrived >= C.boxSlots) closeBox(d.box);
    } else { s.st = "spare"; Sound.play("clink"); const pos = sparePos(d.spare); burst([pos.x, pos.y], "#ffffff", 4, false, true); }
  }
  function closeBox(b) {
    b.st = "closing"; b.t = 0; combo++; comboT = 2.2;
    const p = boxSlotPos(b, 1);
    const words = ["", "", "NICE!", "GREAT!", "AWESOME!", "AMAZING!"];
    texts.push({ x: p.x, y: p.y - 30 * u, s: combo >= 2 ? words[Math.min(combo, 5)] : "+1", t: 0, c: combo >= 2 ? "#fff6a8" : "#ffffff", big: combo >= 2 });
    Sound.play("close", combo); on.boxDone && on.boxDone(combo);
    for (let i = 0; i < 18; i++) parts.push({ x: p.x, y: p.y, vx: (Math.random() - 0.5) * 420, vy: -Math.random() * 380 - 60, t: 0, life: 0.8, col: i % 3 ? COL(b.color).a : "#ffffff", s: (3 + Math.random() * 3) * u, r: Math.random() * 6, vr: 8, star: i % 3 === 0, screen: true });
  }
  function pullSpares(b) {
    for (let i = 0; i < spares.length; i++) {
      const id = spares[i]; if (id === null) continue;
      const s = screws[id]; if (s.st !== "spare" || s.color !== b.color) continue;
      const k = b.slots.indexOf(null); if (k < 0) break;
      b.slots[k] = id; spares[i] = null;
      s.st = "hop"; s.a = { t: 0, fromScreen: sparePos(i), dest: { box: b, k } };
    }
  }
  function finish(won) {
    if (mode === "attract") { attract(); return; }
    mode = won ? "won" : "lost";
    if (won) { Sound.play("win"); confetti(); on.win && on.win(lvl); } else { Sound.play("lose"); on.lose && on.lose(lvl); }
  }
  // continue after "out of space": one more spare hole, even past the booster limit
  function revive() { extra++; spares.push(null); texts.push({ x: sparePos(spares.length - 1).x, y: lay.spareY - 6, s: "+1 HOLE", t: 0, c: "#ffffff" }); Sound.play("pop"); mode = "play"; endT = 0; }

  /* ---------- bot (title screen demo + tests) ---------- */
  function botChoice() {
    const free = screws.filter(isFree);
    if (!free.length) return null;
    const openCols = boxes.filter(b => (b.st === "idle" || b.st === "in") && b.slots.includes(null)).map(b => b.color);
    const direct = free.filter(s => openCols.includes(s.color));
    if (direct.length) return direct[0];
    const room = spares.filter(x => x === null).length;
    if (room === 0) return null;
    // the screw whose colour comes up soonest in the box queue
    const when = c => { const k = queue.indexOf(c, qi); return k < 0 ? 999 : k - qi; };
    free.sort((a, b) => when(a.color) - when(b.color) || plates[b.plate].layer - plates[a.plate].layer);
    return free[0];
  }
  function botMove() { const s = botChoice(); if (s) take(s); }

  /* ---------- effects ---------- */
  function burst(w, col, n, big, screen) {
    const x = screen ? w[0] : sx(w[0]), y = screen ? w[1] : sy(w[1]);
    for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = (big ? 260 : 150) * (0.4 + Math.random()); parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 80, t: 0, life: 0.45 + Math.random() * 0.25, col, s: (big ? 3.4 : 2.4) * u, spark: true, screen: true, g: 600 }); }
  }
  function confetti() {
    const cols = C.colors.map(c => c.a);
    for (let i = 0; i < 110; i++) parts.push({ x: VW * Math.random(), y: -20 - Math.random() * 200, vx: (Math.random() - 0.5) * 160, vy: 100 + Math.random() * 180, t: 0, life: 3, col: cols[i % cols.length], s: (5 + Math.random() * 5) * u, r: Math.random() * 6, vr: (Math.random() - 0.5) * 12, rect: true, screen: true, g: 160 });
  }

  /* ---------- rendering ---------- */
  function drawScrewAt(x, y, ci, scale, spin = 0, lift = 0, alpha = 1) {
    const sp = headSprite(ci), w = sp.width / DPR / bs * scale;
    // shank (shows while lifted / flying)
    if (lift > 0.02) {
      const len = 20 * scale * lift, wd = 7 * scale;
      const sg = ctx.createLinearGradient(x - wd / 2, 0, x + wd / 2, 0); sg.addColorStop(0, "#c9cfdc"); sg.addColorStop(0.5, "#ffffff"); sg.addColorStop(1, "#8a93a8");
      ctx.fillStyle = sg; ctx.fillRect(x - wd / 2, y, wd, len);
      ctx.strokeStyle = "rgba(80,85,100,0.55)"; ctx.lineWidth = 1;
      for (let k = 3; k < len; k += 3.2 * scale) { ctx.beginPath(); ctx.moveTo(x - wd / 2, y + k); ctx.lineTo(x + wd / 2, y + k - 1.6 * scale); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(x - wd / 2, y + len); ctx.lineTo(x, y + len + 5 * scale * lift); ctx.lineTo(x + wd / 2, y + len); ctx.fillStyle = "#9aa2b4"; ctx.fill();
    }
    // drop shadow
    ctx.globalAlpha = alpha * 0.35; ctx.fillStyle = "#2a1830";
    ctx.beginPath(); ctx.ellipse(x + (2 + lift * 10) * scale, y + (3 + lift * 14) * scale, HEAD * scale * 1.05, HEAD * scale * 0.95, 0, 0, TAU); ctx.fill();
    ctx.globalAlpha = alpha;
    ctx.save(); ctx.translate(x, y); ctx.rotate(spin); ctx.drawImage(sp, -w / 2, -w / 2, w, w); ctx.restore();
    ctx.globalAlpha = 1;
  }
  function drawPlate(p) {
    const sp = sprites.plates.get(p); if (!sp) return;
    const S = sp.R * 2 * bs, x = sx(p.x), y = sy(p.y);
    let al = 1; if (p.state === "fall") al = Math.max(0, 1 - Math.max(0, p.drop - 0.35) * 2.2);
    ctx.globalAlpha = al;
    const lift = p.state === "fall" ? Math.min(1, p.drop * 3) : 0;
    ctx.save(); ctx.translate(x + (5 + lift * 14) * bs, y + (8 + lift * 22) * bs); ctx.rotate(p.rot); ctx.drawImage(sp.sh, -S / 2, -S / 2, S, S); ctx.restore();
    const sc = 1 + lift * 0.06;
    ctx.save(); ctx.translate(x, y + 4.5 * bs); ctx.rotate(p.rot); ctx.scale(sc, sc); ctx.globalAlpha = al * 0.95; ctx.drawImage(sp.ed, -S / 2, -S / 2, S, S); ctx.restore(); ctx.globalAlpha = al;
    ctx.save(); ctx.translate(x, y); ctx.rotate(p.rot); ctx.scale(sc, sc); ctx.drawImage(sp.body, -S / 2, -S / 2, S, S);
    if (p.flash > 0) { ctx.globalAlpha = Math.min(1, p.flash * 3) * al; ctx.drawImage(sp.fl, -S / 2, -S / 2, S, S); }
    ctx.restore(); ctx.globalAlpha = 1;
  }
  function drawBox(b) {
    if (b.st === "empty") {
      const n = boxes.length, total = n * lay.boxW + (n - 1) * lay.gap, x0 = (VW - total) / 2 + b.i * (lay.boxW + lay.gap);
      ctx.strokeStyle = "rgba(255,255,255,0.45)"; ctx.setLineDash([8, 6]); ctx.lineWidth = 2.5; rr(ctx, x0 + 6, lay.boxY + 6, lay.boxW - 12, lay.boxH - 12, 16 * u); ctx.stroke(); ctx.setLineDash([]);
      return;
    }
    const col = COL(b.color), P = boxSlotPos(b, 1), w = lay.boxW, h = lay.boxH, x = P.cx - w / 2, y = P.top;
    ctx.globalAlpha = P.al;
    // shadow
    ctx.fillStyle = "rgba(50,20,30,0.22)"; rr(ctx, x + 4, y + 8 * u, w - 4, h, 18 * u); ctx.fill();
    // handle
    ctx.lineWidth = 7 * u; ctx.strokeStyle = col.b; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(x + w * 0.32, y + 6 * u); ctx.quadraticCurveTo(x + w * 0.5, y - 20 * u, x + w * 0.68, y + 6 * u); ctx.stroke();
    ctx.lineWidth = 2.5 * u; ctx.strokeStyle = mix(col.a, "#ffffff", 0.5);
    ctx.beginPath(); ctx.moveTo(x + w * 0.35, y + 2 * u); ctx.quadraticCurveTo(x + w * 0.5, y - 16 * u, x + w * 0.65, y + 2 * u); ctx.stroke();
    // body
    const bg = ctx.createLinearGradient(0, y, 0, y + h); bg.addColorStop(0, mix(col.a, "#ffffff", 0.15)); bg.addColorStop(1, col.b);
    rr(ctx, x, y, w, h, 18 * u); ctx.fillStyle = bg; ctx.fill();
    ctx.lineWidth = 2.5 * u; ctx.strokeStyle = mix(col.b, "#2b2440", 0.4); ctx.stroke();
    // top tray (where the holes are)
    const ty = y + h * 0.14, th = h * 0.42;
    rr(ctx, x + w * 0.06, ty, w * 0.88, th, 12 * u); ctx.fillStyle = mix(col.a, "#ffffff", 0.32); ctx.fill();
    ctx.strokeStyle = rgba("#ffffff", 0.6); ctx.lineWidth = 1.5 * u; ctx.stroke();
    // label stripe
    rr(ctx, x + w * 0.22, y + h * 0.66, w * 0.56, h * 0.2, 7 * u); ctx.fillStyle = rgba("#ffffff", 0.85); ctx.fill();
    ctx.fillStyle = col.b; ctx.font = `800 ${Math.round(11 * u)}px Nunito, system-ui, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(col.name.toUpperCase(), x + w / 2, y + h * 0.765);
    // holes + screws
    for (let k = 0; k < C.boxSlots; k++) {
      const q = boxSlotPos(b, k), r = HEAD * boxScale() * 1.05;
      const hg = ctx.createRadialGradient(q.x - r * 0.3, q.y - r * 0.3, 1, q.x, q.y, r);
      hg.addColorStop(0, "rgba(40,20,40,0.55)"); hg.addColorStop(1, "rgba(40,20,40,0.85)");
      ctx.beginPath(); ctx.arc(q.x, q.y, r, 0, TAU); ctx.fillStyle = hg; ctx.fill();
      const id = b.slots[k];
      if (id !== null && screws[id].st === "box") drawScrewAt(q.x, q.y, b.color, boxScale(), 0.4 + k, 0, P.al);
    }
    // lid closing
    if (b.st === "closing" || b.st === "out") {
      const e = b.st === "closing" ? back(Math.min(1, b.t / 0.26)) : 1;
      const ly = ty - (1 - e) * h * 0.7;
      rr(ctx, x + w * 0.03, ly - 2 * u, w * 0.94, th + 6 * u, 13 * u);
      const lg = ctx.createLinearGradient(0, ly, 0, ly + th); lg.addColorStop(0, mix(col.a, "#ffffff", 0.25)); lg.addColorStop(1, col.b);
      ctx.fillStyle = lg; ctx.fill(); ctx.strokeStyle = mix(col.b, "#2b2440", 0.4); ctx.lineWidth = 2 * u; ctx.stroke();
      if (e > 0.9) { // check badge
        const cx = x + w / 2, cy = ly + th / 2, r = 13 * u;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fillStyle = "#ffffff"; ctx.fill();
        ctx.strokeStyle = "#38c172"; ctx.lineWidth = 4 * u; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(cx - 6 * u, cy); ctx.lineTo(cx - 1.5 * u, cy + 5 * u); ctx.lineTo(cx + 7 * u, cy - 5 * u); ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }
  function drawQueue() {
    // the next boxes waiting, as small chips at the right of the shelf
    const left = queue.length - qi; if (left <= 0) return;
    const y = lay.boxY + lay.boxH + 4 * u, r = 7 * u;
    ctx.font = `800 ${Math.round(11 * u)}px Nunito, system-ui, sans-serif`; ctx.textAlign = "right"; ctx.textBaseline = "middle";
    const show = Math.min(left, 4); let x = VW - 16 * u;
    ctx.fillStyle = "rgba(43,36,64,0.65)"; ctx.fillText(left > show ? `+${left - show}` : "", x, y + 4 * u);
    x -= left > show ? 22 * u : 0;
    for (let i = show - 1; i >= 0; i--) { const c = COL(queue[qi + i]); ctx.beginPath(); ctx.arc(x - r, y + 4 * u, r, 0, TAU); ctx.fillStyle = c.a; ctx.fill(); ctx.strokeStyle = c.b; ctx.lineWidth = 2; ctx.stroke(); x -= r * 2 + 4 * u; }
    ctx.fillStyle = "rgba(43,36,64,0.65)"; ctx.fillText("NEXT", x - 2 * u, y + 4 * u);
  }
  function drawSpares() {
    const g = spareGeom(), full = !spares.includes(null);
    const warn = spares.filter(x => x === null).length <= 1 && mode === "play";
    ctx.save();
    ctx.shadowColor = "rgba(40,20,40,0.3)"; ctx.shadowBlur = 10 * u; ctx.shadowOffsetY = 5 * u;
    const mg = ctx.createLinearGradient(0, g.y, 0, g.y + g.h); mg.addColorStop(0, "#eef1f7"); mg.addColorStop(1, "#aab2c4");
    rr(ctx, g.x0, g.y, g.w, g.h, g.h / 2); ctx.fillStyle = mg; ctx.fill(); ctx.restore();
    ctx.lineWidth = 2 * u; ctx.strokeStyle = warn ? `rgba(255,77,94,${0.55 + 0.45 * Math.sin(t * 10)})` : "rgba(70,70,95,0.45)"; rr(ctx, g.x0, g.y, g.w, g.h, g.h / 2); ctx.stroke();
    for (let i = 0; i < g.n; i++) {
      const p = sparePos(i), r = HEAD * boxScale() * 1.05;
      const hg = ctx.createRadialGradient(p.x - r * 0.3, p.y - r * 0.3, 1, p.x, p.y, r); hg.addColorStop(0, "#5a5f75"); hg.addColorStop(1, "#262838");
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fillStyle = hg; ctx.fill();
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0.15 * Math.PI, 0.85 * Math.PI); ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.lineWidth = 1.2 * u; ctx.stroke();
      const id = spares[i];
      if (id !== null && screws[id].st === "spare") drawScrewAt(p.x, p.y, screws[id].color, boxScale(), 0.3 + i);
    }
    if (full && mode === "play") { ctx.fillStyle = "#ff4d5e"; ctx.font = `900 ${Math.round(12 * u)}px Nunito, system-ui, sans-serif`; ctx.textAlign = "center"; ctx.fillText("SPARE HOLES FULL!", VW / 2, g.y + g.h + 11 * u); }
  }
  function render() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    let ox = 0, oy = 0; if (shake > 0) { ox = (Math.random() - 0.5) * shake * 16; oy = (Math.random() - 0.5) * shake * 16; }
    ctx.drawImage(bgCanvas, 0, 0, VW, VH);
    for (const b of boxes) drawBox(b);
    drawQueue();
    drawSpares();
    ctx.save(); ctx.translate(ox, oy);
    // plates (bottom → top), each followed by its own screws
    const order = plates.filter(p => p.state !== "gone" && p.state !== "fall").sort((a, b) => a.layer - b.layer);
    for (const p of order) {
      drawPlate(p);
      for (const s of screws) if (s.plate === p.id && (s.st === "in" || s.st === "out")) {
        const w = screwPos(s); let x = sx(w[0]), y = sy(w[1]), spin = 0, lift = 0;
        if (s.shake > 0) x += Math.sin(s.shake * 60) * 4 * u * s.shake / 0.4;
        if (s.st === "out") { const e = Math.min(1, s.a.t / 0.26); spin = -e * TAU * 1.5; lift = e; y -= e * 10 * bs; }
        drawScrewAt(x, y, s.color, bs * (1 + lift * 0.18), spin, lift);
        if (drill && s.st === "in") { ctx.strokeStyle = `rgba(255,210,63,${0.5 + 0.5 * Math.sin(t * 8)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, HEAD * bs * 1.45, 0, TAU); ctx.stroke(); }
      }
    }
    // falling plates in front
    for (const p of plates) if (p.state === "fall") drawPlate(p);
    ctx.restore();
    // flying screws
    for (const s of screws) if (s.st === "fly" || s.st === "hop") {
      const d = s.a.dest, to = d.box ? boxSlotPos(d.box, d.k) : sparePos(d.spare);
      const from = s.st === "fly" ? { x: sx(s.a.from[0]), y: sy(s.a.from[1]) - 10 * bs } : s.a.fromScreen;
      const e = ease(Math.min(1, s.a.t / (s.st === "fly" ? 0.4 : 0.36)));
      const cx = (from.x + to.x) / 2, cy = Math.min(from.y, to.y) - 90 * u;
      const x = (1 - e) * (1 - e) * from.x + 2 * (1 - e) * e * cx + e * e * to.x, y = (1 - e) * (1 - e) * from.y + 2 * (1 - e) * e * cy + e * e * to.y;
      const sc = (s.st === "fly" ? bs * 1.18 : boxScale()) * (1 - e) + boxScale() * e;
      drawScrewAt(x, y, s.color, sc * (1 + Math.sin(e * Math.PI) * 0.25), e * TAU * 2, 1 - e);
    }
    // particles
    for (const q of parts) {
      const a = 1 - q.t / q.life; ctx.globalAlpha = Math.max(0, Math.min(1, a * 1.4)); ctx.fillStyle = q.col;
      if (q.spark) { ctx.fillRect(q.x - q.s / 2, q.y - q.s / 2, q.s, q.s); }
      else if (q.rect) { ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.r); ctx.fillRect(-q.s / 2, -q.s / 4, q.s, q.s / 2); ctx.restore(); }
      else if (q.star) { ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.r); star(q.s); ctx.restore(); }
      else { ctx.beginPath(); ctx.arc(q.x, q.y, q.s / 2, 0, TAU); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
    // floating texts
    for (const x of texts) {
      const e = x.t / 1.1, s = (x.big ? 30 : 20) * u * (x.t < 0.15 ? back(x.t / 0.15) : 1);
      ctx.globalAlpha = 1 - Math.max(0, e - 0.6) / 0.4; ctx.font = `900 ${Math.round(s)}px Nunito, system-ui, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.lineWidth = 6 * u; ctx.strokeStyle = "#2b2440"; ctx.strokeText(x.s, x.x, x.y - e * 40 * u); ctx.fillStyle = x.c; ctx.fillText(x.s, x.x, x.y - e * 40 * u);
    }
    ctx.globalAlpha = 1;
    // tutorial hand on level 1
    if (hand && mode === "play") {
      const s = botChoice(); if (s) { const w = screwPos(s), x = sx(w[0]) + 14 * u, y = sy(w[1]) + 16 * u + Math.sin(hand.t * 5) * 6 * u; hand.at = [x, y]; drawHand(x, y); }
    }
  }
  function star(s) { ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = i / 10 * TAU - Math.PI / 2, r = i % 2 ? s * 0.45 : s; ctx[i ? "lineTo" : "moveTo"](Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill(); }
  function drawHand(x, y) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(-0.4); const k = u * 1.1;
    ctx.fillStyle = "#ffffff"; ctx.strokeStyle = "#2b2440"; ctx.lineWidth = 3 * k; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(-6 * k, 0); ctx.lineTo(-6 * k, -26 * k); ctx.quadraticCurveTo(0, -34 * k, 6 * k, -26 * k); ctx.lineTo(6 * k, -8 * k); ctx.lineTo(18 * k, -6 * k); ctx.quadraticCurveTo(26 * k, 0, 22 * k, 14 * k); ctx.lineTo(16 * k, 30 * k); ctx.lineTo(-8 * k, 30 * k); ctx.lineTo(-16 * k, 8 * k); ctx.quadraticCurveTo(-14 * k, 0, -6 * k, 4 * k); ctx.closePath();
    ctx.fill(); ctx.stroke(); ctx.restore();
  }

  /* ---------- loop + input ---------- */
  let last = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    if (mode !== "paused" && mode !== "idle") try { update(dt); } catch (e) { console.error(e); }
    if (lvl && VW) try { render(); } catch (e) { console.error(e); }
  }
  cv.addEventListener("pointerdown", e => { Sound.unlock(); if (mode === "play") tapAt(e.clientX, e.clientY); });
  addEventListener("resize", resize);

  function start(n, opts = {}) { load(n, opts); mode = "play"; }
  function attract() { load(4 + Math.floor(Math.random() * 6), { bot: true }); mode = "attract"; botT = 1; }
  resize(); requestAnimationFrame(frame);

  return {
    on, start, attract, revive, addHole, setDrill, tapAt, take,
    // shop preview: a row of screws with this head style
    headPreview(style, w, h) { const c = canvasOf(w * DPR, h * DPR), g = c.getContext("2d"), k = h * DPR * 0.36 / HEAD; [0, 2, 3].forEach((ci, i) => { const sp = bakeHead(ci, style, HEAD, k); g.drawImage(sp, (w * DPR) * (0.22 + i * 0.28) - sp.width / 2, (h * DPR - sp.height) / 2); }); return c; },
    pause(p) { if (p && mode === "play") mode = "paused"; else if (!p && mode === "paused") { mode = "play"; last = 0; } },
    setLooks(board, head) { boardId = board; headId = head; bakeAll(); },
    // testing hooks
    step(dt = 1 / 60, n = 1) { for (let i = 0; i < n; i++) update(dt); },
    botChoice, isFree, blockedBy,
    get mode() { return mode; }, set mode(v) { mode = v; }, get level() { return lvl; }, get screws() { return screws; }, get plates() { return plates; },
    get boxes() { return boxes; }, get spares() { return spares; }, get drill() { return drill; }, get extra() { return extra; },
    toScreen: w => [sx(w[0]), sy(w[1])], screwPos
  };
})();

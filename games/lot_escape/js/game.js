/* LOT ESCAPE — game: driving, crashes, the ring road and exit gate, effects and all the drawing.
   World units are parking spaces: the lot is cols × rows; the ring road runs around it at ROAD spaces
   out, and the exit gate sits on the top side. Car sprites and the scenery are baked per level. */
window.Game = (() => {
  const C = window.GAME_CONFIG, LV = window.Levels;
  const cv = document.getElementById("view"), ctx = cv.getContext("2d");
  const TAU = Math.PI * 2, ROAD = 0.95, RW = 1.25;              // road centre offset + road width (spaces)
  let DPR = 1, VW = 0, VH = 0, k = 30, ox = 0, oy = 0, u = 1;     // px per space, world origin on screen
  const on = {};
  let mode = "idle", L = null, cars = [], hearts = 3, t = 0, parts = [], marks = [], texts = [], shake = 0, endT = 0;
  let craneOn = false, hint = null, gateLift = 0, bot = false, botT = 0, theme = C.themes[0], sprites = new Map(), bg = null, hand = null;

  /* ---------- helpers ---------- */
  const hex2 = h => { const n = parseInt(h.slice(1), 16); return [n >> 16, n >> 8 & 255, n & 255]; };
  const mix = (a, b, q) => { const p = hex2(a), r = hex2(b); return `rgb(${p.map((v, i) => Math.round(v + (r[i] - v) * q)).join(",")})`; };
  const rgba = (h, a) => { const p = hex2(h); return `rgba(${p[0]},${p[1]},${p[2]},${a})`; };
  const ease = x => x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2;
  const back = x => { const c = 1.7; return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2; };
  const X = x => ox + x * k, Y = y => oy + y * k;
  function rr(g, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function canvasOf(w, h) { const c = document.createElement("canvas"); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
  let seedV = 1; const srand = s => { seedV = s; }, sr = () => (seedV = (seedV * 16807) % 2147483647) / 2147483647;

  /* ---------- layout ---------- */
  const bounds = () => ({ x0: -2.2, x1: L.cols + 2.2, y0: -3.0, y1: L.rows + 2.2 });
  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1); VW = innerWidth; VH = innerHeight;
    cv.width = VW * DPR; cv.height = VH * DPR; cv.style.width = VW + "px"; cv.style.height = VH + "px";
    u = Math.min(VW / 400, VH / 820, 1.3);
    if (L) layout();
  }
  function layout() {
    const b = bounds(), top = 70, bot = 104, availH = VH - top - bot;
    k = Math.min(VW / (b.x1 - b.x0), availH / (b.y1 - b.y0));
    ox = (VW - (b.x1 - b.x0) * k) / 2 - b.x0 * k;
    oy = top + (availH - (b.y1 - b.y0) * k) / 2 - b.y0 * k;
    bake();
  }

  /* ---------- paths: out of the lot, round the ring road, up through the gate ---------- */
  function ringPath(p, d) {
    const W = L.cols, H = L.rows, gx = W / 2, R0 = -ROAD, R1x = W + ROAD, R1y = H + ROAD;
    const corners = { tl: [R0, R0], tr: [R1x, R0], br: [R1x, R1y], bl: [R0, R1y] };
    // point where the car joins the ring, and which side it is on
    let join, side;
    if (d === 0) { join = [R1x, p[1]]; side = "r"; } else if (d === 2) { join = [R0, p[1]]; side = "l"; }
    else if (d === 1) { join = [p[0], R1y]; side = "b"; } else { join = [p[0], R0]; side = "t"; }
    const G = [gx, R0];
    // two ways round; take the shorter
    const cw = { t: [], r: ["tr"], b: ["br", "tr"], l: ["bl", "br", "tr"] }, ccw = { t: [], l: ["tl"], b: ["bl", "tl"], r: ["br", "bl", "tl"] };
    const build = list => [join, ...list.map(c => corners[c]), G];
    const len = pts => pts.reduce((s, q, i) => i ? s + Math.hypot(q[0] - pts[i - 1][0], q[1] - pts[i - 1][1]) : 0, 0);
    let route;
    if (side === "t") route = [join, G];
    else { const a = build(cw[side]), b = build(ccw[side]); route = len(a) <= len(b) ? a : b; }
    return [p, ...route, [gx, R0 - 7]];
  }
  function smooth(pts, iters = 3) {           // Chaikin corner cutting (keeps the ends)
    for (let it = 0; it < iters; it++) {
      const out = [pts[0]];
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        out.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
      }
      out.push(pts[pts.length - 1]); pts = out;
    }
    return pts;
  }
  function mkPath(pts) { const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return { pts, cum, len: cum[cum.length - 1] }; }
  function at(path, s) {
    s = Math.max(0, Math.min(path.len, s)); let i = 1; while (i < path.cum.length - 1 && path.cum[i] < s) i++;
    const a = path.pts[i - 1], b = path.pts[i], seg = path.cum[i] - path.cum[i - 1] || 1, q = (s - path.cum[i - 1]) / seg;
    return { x: a[0] + (b[0] - a[0]) * q, y: a[1] + (b[1] - a[1]) * q, ang: Math.atan2(b[1] - a[1], b[0] - a[0]) };
  }
  const centre = c => LV.horiz(c) ? [c.x + c.len / 2, c.y + 0.5] : [c.x + 0.5, c.y + c.len / 2];
  const dirAng = d => [0, Math.PI / 2, Math.PI, -Math.PI / 2][d];

  /* ---------- level ---------- */
  function load(n, opts = {}) {
    L = LV.get(n); bot = !!opts.bot; hearts = L.hearts; t = 0; parts = []; marks = []; texts = []; shake = 0; endT = 0; craneOn = false; hint = null; gateLift = 0;
    cars = L.cars.map(c => { const p = centre(c); return { ...c, gone: false, st: "park", px: p[0], py: p[1], ang: dirAng(c.dir), shake: 0, v: 0, s: 0, lift: 0, bubble: 0 }; });
    hand = n === 1 && !bot ? { t: 0 } : null;
    layout();
  }
  const grid = () => LV.grid(L, cars);

  /* ---------- actions ---------- */
  function drive(c, d) {
    if (c.st !== "park" || c.gone || (mode !== "play" && mode !== "attract")) return false;
    hint = null; hand = null;
    const ln = LV.lane(L, grid(), c, d), p = [c.px, c.py], v = [LV.DX[d], LV.DY[d]];
    c.rev = d !== c.dir; c.home = { x: c.px, y: c.py, ang: c.ang };
    puff(c, c.rev ? 1 : -1);
    if (ln.out) {
      c.gone = true; c.st = "exit"; c.v = 0; c.s = 0;
      // backing out: the car reverses onto the road, then turns to drive forward along it
      const pts = ringPath(p, d);
      c.path = mkPath(smooth(pts));
      Sound.play(c.rev ? "reverse" : "go");
      return true;
    }
    const stop = ln.free + (ln.hit === "fence" ? 0.05 : 0.14);
    c.st = "crash"; c.v = 0; c.s = 0; c.hit = ln.hit;
    c.path = mkPath([p, [p[0] + v[0] * stop, p[1] + v[1] * stop]]);
    Sound.play(c.rev ? "reverse" : "go");
    return true;
  }
  function lift(c) {
    if (c.st !== "park" || c.gone) return false;
    c.gone = true; c.st = "lift"; c.lift = 0; craneOn = false; hint = null; on.craneUsed && on.craneUsed(); Sound.play("crane"); return true;
  }
  function showHint() {
    const g = grid();
    const list = cars.filter(c => !c.gone && c.st === "park").map(c => ({ c, ds: LV.canLeave(L, g, c) })).filter(x => x.ds.length);
    if (!list.length) return false;
    list.sort((a, b) => (b.ds.includes(b.c.dir) ? 1 : 0) - (a.ds.includes(a.c.dir) ? 1 : 0));
    hint = { c: list[0].c, d: list[0].ds.includes(list[0].c.dir) ? list[0].c.dir : list[0].ds[0], t: 0 };
    return true;
  }

  /* ---------- update ---------- */
  function update(dt) {
    t += dt; shake = Math.max(0, shake - dt);
    if (hand) hand.t += dt; if (hint) hint.t += dt;
    let nearGate = false;
    for (const c of cars) {
      c.shake = Math.max(0, c.shake - dt); c.bubble = Math.max(0, c.bubble - dt);
      if (c.st === "exit") {
        const vmax = c.s < 2.2 ? C.speed.lot : C.speed.road;
        c.v = Math.min(vmax, c.v + 28 * dt); c.s += c.v * dt;
        const q = at(c.path, c.s); c.px = q.x; c.py = q.y;
        // reversing cars keep their nose pointing back until they are on the road
        const target = c.rev && c.s < 1.4 ? q.ang + Math.PI : q.ang;
        let da = target - c.ang; da = Math.atan2(Math.sin(da), Math.cos(da)); c.ang += da * Math.min(1, dt * 14);
        if (Math.abs(c.px - L.cols / 2) < 1.6 && c.py < -ROAD + 1.2 && c.py > -ROAD - 2) nearGate = true;
        if (c.s >= c.path.len - 0.01) { c.st = "done"; Sound.play("gate"); coinPop(); }
        if (Math.random() < dt * 14) parts.push({ x: c.px - Math.cos(c.ang) * c.len * 0.5, y: c.py - Math.sin(c.ang) * c.len * 0.5, vx: -Math.cos(c.ang) * 0.6, vy: -Math.sin(c.ang) * 0.6, t: 0, life: 0.5, r: 0.12, col: "rgba(255,255,255,0.55)", world: true, grow: 0.5 });
      } else if (c.st === "crash") {
        c.v = Math.min(C.speed.lot, c.v + 30 * dt); c.s += c.v * dt;
        const q = at(c.path, c.s); c.px = q.x; c.py = q.y;
        if (c.s >= c.path.len) { c.st = "bump"; c.bt = 0; crash(c); }
      } else if (c.st === "bump") {
        c.bt += dt; if (c.bt > 0.32) { c.st = "return"; c.s = c.path.len; c.v = 0; Sound.play("beep"); }
      } else if (c.st === "return") {
        c.v = Math.min(C.speed.back, c.v + 20 * dt); c.s -= c.v * dt;
        const q = at(c.path, c.s); c.px = q.x; c.py = q.y;
        if (c.s <= 0) { c.st = "park"; c.px = c.home.x; c.py = c.home.y; c.ang = c.home.ang; if (hearts <= 0 && mode === "play") lose(); }
      } else if (c.st === "lift") {
        c.lift += dt; if (c.lift > 1.1) c.st = "done";
      }
    }
    gateLift += ((nearGate ? 1 : 0) - gateLift) * Math.min(1, dt * 8);
    for (const q of parts) { q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += (q.g || 0) * dt; if (q.grow) q.r += q.grow * dt; if (q.vr) q.rot = (q.rot || 0) + q.vr * dt; }
    parts = parts.filter(q => q.t < q.life);
    for (const m of marks) m.t += dt; marks = marks.filter(m => m.t < 6);
    for (const x of texts) x.t += dt; texts = texts.filter(x => x.t < 1.1);
    if ((mode === "play" || mode === "attract") && cars.every(c => c.st === "done")) { endT += dt; if (endT > 0.35) win(); }
    if (mode === "attract") { botT -= dt; if (botT <= 0) { botT = 0.8; botMove(); } }
  }
  function crash(c) {
    const fx = c.px + Math.cos(c.ang + (c.rev ? Math.PI : 0)) * c.len * 0.5, fy = c.py + Math.sin(c.ang + (c.rev ? Math.PI : 0)) * c.len * 0.5;
    if (typeof c.hit === "number" && c.hit >= 0) { const o = cars[c.hit]; o.shake = 0.45; o.bubble = 1.1; }
    c.bubble = 1.1;
    for (let i = 0; i < 14; i++) { const a = Math.random() * TAU, s = 2 + Math.random() * 4; parts.push({ x: fx, y: fy, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0, life: 0.45, r: 0.05 + Math.random() * 0.05, col: i % 2 ? "#ffd23f" : "#ffffff", world: true }); }
    marks.push({ x: fx, y: fy, ang: c.ang, t: 0 });
    texts.push({ x: fx, y: fy - 0.4, s: c.hit === "fence" ? "BONK!" : "HONK!", t: 0 });
    shake = 0.25; Sound.play("crash"); setTimeout(() => Sound.play("horn"), 90);
    if (mode === "play") { hearts--; on.heart && on.heart(hearts); if (navigator.vibrate) try { navigator.vibrate(60); } catch (e) {} }
  }
  function puff(c, sgn) {
    const bx = c.px + Math.cos(c.ang) * c.len * 0.5 * sgn, by = c.py + Math.sin(c.ang) * c.len * 0.5 * sgn;
    for (let i = 0; i < 6; i++) parts.push({ x: bx, y: by, vx: (Math.random() - 0.5) * 1.2, vy: (Math.random() - 0.5) * 1.2, t: 0, life: 0.6, r: 0.1 + Math.random() * 0.08, col: "rgba(230,235,245,0.7)", world: true, grow: 0.6 });
  }
  function coinPop() {
    const x = L.cols / 2, y = -ROAD - 1.3;
    texts.push({ x, y, s: "+1", t: 0, coin: true });
    for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.6; parts.push({ x, y, vx: Math.cos(a) * 3, vy: Math.sin(a) * 3, t: 0, life: 0.6, r: 0.06, col: "#ffd23f", world: true, g: 6 }); }
  }
  function win() {
    if (mode === "attract") { attract(); return; }
    if (mode !== "play") return;
    mode = "won"; Sound.play("win"); confetti(); on.win && on.win(L, hearts);
  }
  function lose() { mode = "lost"; Sound.play("lose"); on.lose && on.lose(L); }
  function revive(n = 2) { hearts += n; mode = "play"; on.heart && on.heart(hearts); }
  function confetti() {
    const cols = C.paints.map(p => p.a);
    for (let i = 0; i < 120; i++) parts.push({ x: Math.random() * VW, y: -20 - Math.random() * 200, vx: (Math.random() - 0.5) * 160, vy: 120 + Math.random() * 160, t: 0, life: 3, r: (5 + Math.random() * 5) * u, col: cols[i % cols.length], g: 150, rect: true, vr: (Math.random() - 0.5) * 12, rot: 0 });
  }

  /* ---------- bot (title screen demo + tests) ---------- */
  function botMove() {
    const g = grid();
    for (const c of cars) if (!c.gone && c.st === "park") { const ds = LV.canLeave(L, g, c); if (ds.length) return drive(c, ds.includes(c.dir) ? c.dir : ds[0]); }
  }

  /* ---------- sprites ---------- */
  function bakeCar(c) {
    const len = c.len - 0.16, wd = 0.74, pad = 0.35, S = k * DPR;
    const cw = (len + pad * 2) * S, ch = (wd + pad * 2) * S, cvs = canvasOf(cw, ch), g = cvs.getContext("2d");
    g.translate(cw / 2, ch / 2); g.scale(S, S);
    const P = c.model === "taxi" ? { a: "#ffd23f", b: "#d39a00" } : C.paints[c.paint], A = P.a, B = P.b;
    const hl = len / 2, hw = wd / 2;
    // wheels
    g.fillStyle = "#1d1f29";
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) { const wx = sx * (hl - (c.len === 3 ? 0.42 : 0.3)); rr(g, wx - 0.13, sy * hw - 0.08 + (sy > 0 ? 0 : -0.02), 0.26, 0.1, 0.04); g.fill(); }
    if (c.len === 3) for (const sy of [-1, 1]) { rr(g, -0.2, sy * hw - 0.08 + (sy > 0 ? 0 : -0.02), 0.26, 0.1, 0.04); g.fill(); }
    // body
    const body = (x0, x1, col1, col2, r = 0.16) => {
      const gr = g.createLinearGradient(0, -hw, 0, hw); gr.addColorStop(0, mix(col1, "#ffffff", 0.25)); gr.addColorStop(0.5, col1); gr.addColorStop(1, col2);
      rr(g, x0, -hw, x1 - x0, wd, r); g.fillStyle = gr; g.fill(); g.lineWidth = 0.025; g.strokeStyle = mix(col2, "#000000", 0.35); g.stroke();
    };
    const glass = (x, w, front) => {
      const gg = g.createLinearGradient(x, 0, x + w, 0); gg.addColorStop(front ? 0 : 1, "#2b3550"); gg.addColorStop(front ? 1 : 0, "#5a6d94");
      g.beginPath(); const i = 0.05, j = 0.09;
      if (front) { g.moveTo(x, -hw + i + j); g.lineTo(x + w, -hw + i); g.lineTo(x + w, hw - i); g.lineTo(x, hw - i - j); }
      else { g.moveTo(x, -hw + i); g.lineTo(x + w, -hw + i + j); g.lineTo(x + w, hw - i - j); g.lineTo(x, hw - i); }
      g.closePath(); g.fillStyle = gg; g.fill();
      g.strokeStyle = "rgba(255,255,255,0.45)"; g.lineWidth = 0.02; g.beginPath(); g.moveTo(x + w * 0.3, -hw + 0.12); g.lineTo(x + w * 0.7, -hw + 0.1); g.stroke();
    };
    const roof = (x0, x1, col) => { rr(g, x0, -hw + 0.08, x1 - x0, wd - 0.16, 0.1); const rg = g.createLinearGradient(0, -hw, 0, hw); rg.addColorStop(0, mix(col, "#ffffff", 0.4)); rg.addColorStop(1, col); g.fillStyle = rg; g.fill(); };
    const lights = (x0, x1) => {
      g.fillStyle = "#fff6c8"; rr(g, x1 - 0.07, -hw + 0.06, 0.06, 0.13, 0.03); g.fill(); rr(g, x1 - 0.07, hw - 0.19, 0.06, 0.13, 0.03); g.fill();
      g.fillStyle = "#ff3b4e"; rr(g, x0 + 0.01, -hw + 0.06, 0.05, 0.12, 0.02); g.fill(); rr(g, x0 + 0.01, hw - 0.18, 0.05, 0.12, 0.02); g.fill();
    };
    const mirrors = x => { g.fillStyle = B; rr(g, x, -hw - 0.06, 0.07, 0.07, 0.02); g.fill(); rr(g, x, hw - 0.01, 0.07, 0.07, 0.02); g.fill(); };
    const m = c.model;
    if (m === "truck") {
      const cab = hl - 0.55;
      body(cab, hl, A, B); mirrors(cab + 0.12); glass(cab + 0.26, 0.16, true); roof(cab + 0.04, cab + 0.26, A);
      // container
      const cg = g.createLinearGradient(0, -hw, 0, hw); cg.addColorStop(0, "#ffffff"); cg.addColorStop(1, "#c9d0de");
      rr(g, -hl, -hw - 0.01, cab - (-hl) - 0.05, wd + 0.02, 0.06); g.fillStyle = cg; g.fill(); g.strokeStyle = "rgba(60,70,90,0.5)"; g.lineWidth = 0.025; g.stroke();
      g.strokeStyle = "rgba(60,70,90,0.18)"; for (let x = -hl + 0.2; x < cab - 0.1; x += 0.2) { g.beginPath(); g.moveTo(x, -hw + 0.03); g.lineTo(x, hw - 0.03); g.stroke(); }
      g.fillStyle = A; g.fillRect(-hl + 0.1, -0.06, cab + hl - 0.25, 0.12);
      g.fillStyle = "#ff3b4e"; g.fillRect(-hl, -hw + 0.04, 0.04, 0.1); g.fillRect(-hl, hw - 0.14, 0.04, 0.1);
      g.fillStyle = "#fff6c8"; g.fillRect(hl - 0.06, -hw + 0.05, 0.05, 0.12); g.fillRect(hl - 0.06, hw - 0.17, 0.05, 0.12);
    } else if (m === "bus") {
      body(-hl, hl, A, B, 0.12); glass(hl - 0.2, 0.15, true);
      roof(-hl + 0.08, hl - 0.24, mix(A, "#ffffff", 0.2));
      g.fillStyle = "#2b3550"; for (let x = -hl + 0.18; x < hl - 0.35; x += 0.28) { rr(g, x, -hw + 0.015, 0.2, 0.06, 0.02); g.fill(); rr(g, x, hw - 0.075, 0.2, 0.06, 0.02); g.fill(); }
      g.fillStyle = "rgba(0,0,0,0.12)"; rr(g, -0.3, -0.12, 0.25, 0.24, 0.04); g.fill(); rr(g, 0.3, -0.12, 0.25, 0.24, 0.04); g.fill();
      lights(-hl, hl);
    } else if (m === "pickup") {
      body(-hl, hl, A, B); mirrors(0.15);
      glass(0.22, 0.17, true); roof(-0.12, 0.22, A); glass(-0.24, 0.1, false);
      rr(g, -hl + 0.06, -hw + 0.08, hl - 0.06 - 0.3 + hl - hl + 0.02, wd - 0.16, 0.05); g.fillStyle = mix(B, "#000000", 0.25); g.fill();
      g.strokeStyle = "rgba(255,255,255,0.18)"; g.lineWidth = 0.02; for (let y = -hw + 0.18; y < hw - 0.1; y += 0.12) { g.beginPath(); g.moveTo(-hl + 0.1, y); g.lineTo(-0.32, y); g.stroke(); }
      g.fillStyle = "#c98a52"; rr(g, -hl + 0.15, -0.12, 0.24, 0.22, 0.03); g.fill();
      lights(-hl, hl);
    } else if (m === "van") {
      body(-hl, hl, A, B, 0.14); mirrors(hl - 0.3); glass(hl - 0.3, 0.17, true); roof(-hl + 0.06, hl - 0.3, mix(A, "#ffffff", 0.15));
      g.strokeStyle = "rgba(0,0,0,0.12)"; g.lineWidth = 0.02; for (let x = -hl + 0.25; x < hl - 0.4; x += 0.25) { g.beginPath(); g.moveTo(x, -hw + 0.12); g.lineTo(x, hw - 0.12); g.stroke(); }
      lights(-hl, hl);
    } else {
      // sedan / hatch / sport / taxi
      body(-hl, hl, A, B);
      const fw = m === "sport" ? 0.05 : 0.12, rx0 = m === "hatch" ? -hl + 0.12 : -0.3, rx1 = m === "sport" ? 0.12 : 0.18;
      mirrors(rx1 - 0.02);
      glass(rx1, 0.17, true); roof(rx0 + 0.12, rx1, A); glass(rx0, 0.12, false);
      if (m === "sport") { g.fillStyle = "rgba(255,255,255,0.85)"; g.fillRect(-hl + 0.02, -0.09, len - 0.04, 0.05); g.fillRect(-hl + 0.02, 0.04, len - 0.04, 0.05); g.fillStyle = B; rr(g, -hl - 0.02, -hw + 0.04, 0.08, wd - 0.08, 0.03); g.fill(); }
      if (m === "taxi") { g.fillStyle = "#222"; for (let i = 0; i < 6; i++) g.fillRect(-hl + 0.1 + i * 0.12, hw - 0.06, 0.06, 0.04); rr(g, -0.12, -0.12, 0.22, 0.24, 0.04); g.fillStyle = "#fff"; g.fill(); g.fillStyle = "#222"; g.font = "bold 0.11px sans-serif"; g.save(); g.rotate(Math.PI / 2); g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("TAXI", 0, 0.01); g.restore(); }
      lights(-hl, hl);
    }
    // body sheen
    g.globalCompositeOperation = "source-atop"; const sh = g.createLinearGradient(-hl, -hw, hl * 0.2, hw); sh.addColorStop(0, "rgba(255,255,255,0.18)"); sh.addColorStop(0.4, "rgba(255,255,255,0)"); g.fillStyle = sh; g.fillRect(-hl, -hw, len, wd); g.globalCompositeOperation = "source-over";
    // soft shadow sprite
    // shadow only: draw the shape far off-canvas and offset its shadow back (offsets are in device px)
    const sd = canvasOf(cw, ch), s = sd.getContext("2d");
    s.shadowColor = "rgba(10,15,30,0.45)"; s.shadowBlur = 0.1 * S; s.shadowOffsetX = 10000;
    s.translate(cw / 2 - 10000, ch / 2); s.scale(S, S);
    rr(s, -hl, -hw, len, wd, 0.16); s.fillStyle = "#000"; s.fill();
    return { car: cvs, sh: sd, w: cw / DPR, h: ch / DPR };
  }
  function bake() {
    if (!L || !VW) return;
    sprites = new Map(); for (const c of cars) sprites.set(c.id, bakeCar(c));
    bg = canvasOf(VW * DPR, VH * DPR); const g = bg.getContext("2d"); g.scale(DPR, DPR);
    const T = theme;
    // grass
    const gr = g.createLinearGradient(0, 0, 0, VH); gr.addColorStop(0, T.grass[0]); gr.addColorStop(1, T.grass[1]); g.fillStyle = gr; g.fillRect(0, 0, VW, VH);
    srand(L.n * 977 + 13);
    for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(${T.night ? "255,255,255" : "40,90,30"},${0.04 + sr() * 0.05})`; const x = sr() * VW, y = sr() * VH; g.fillRect(x, y, 2 * u, 5 * u); }
    // road ring
    const R0 = -ROAD, W = L.cols, H = L.rows;
    const ring = (w, col) => { g.strokeStyle = col; g.lineWidth = w * k; g.lineJoin = "round"; rr(g, X(R0), Y(R0), (W + 2 * ROAD) * k, (H + 2 * ROAD) * k, 0.9 * k); g.stroke(); };
    ring(RW + 0.18, mix(T.road, "#ffffff", 0.55));     // curb
    ring(RW, T.road);
    // gate road going up
    g.fillStyle = mix(T.road, "#ffffff", 0.55); g.fillRect(X(W / 2 - RW / 2 - 0.09), 0, (RW + 0.18) * k, Y(R0) - 0);
    g.fillStyle = T.road; g.fillRect(X(W / 2 - RW / 2), 0, RW * k, Y(R0));
    // centre dashes
    g.setLineDash([0.28 * k, 0.32 * k]); g.lineWidth = 0.06 * k; g.strokeStyle = rgba(T.night ? "#ffe27a" : "#ffffff", 0.75);
    rr(g, X(R0), Y(R0), (W + 2 * ROAD) * k, (H + 2 * ROAD) * k, 0.9 * k); g.stroke();
    g.beginPath(); g.moveTo(X(W / 2), Y(R0) - 0.4 * k); g.lineTo(X(W / 2), 0); g.stroke(); g.setLineDash([]);
    // lot
    g.save(); g.shadowColor = "rgba(0,0,0,0.25)"; g.shadowBlur = 10 * u;
    rr(g, X(-0.12), Y(-0.12), (W + 0.24) * k, (H + 0.24) * k, 0.3 * k); g.fillStyle = mix(T.lot, "#ffffff", 0.15); g.fill(); g.restore();
    rr(g, X(0), Y(0), W * k, H * k, 0.22 * k); const lg = g.createLinearGradient(0, Y(0), 0, Y(H)); lg.addColorStop(0, mix(T.lot, "#ffffff", 0.06)); lg.addColorStop(1, T.lot); g.fillStyle = lg; g.fill();
    // asphalt speckle
    for (let i = 0; i < W * H * 10; i++) { g.fillStyle = `rgba(${sr() < 0.5 ? "255,255,255" : "0,0,0"},0.05)`; g.fillRect(X(sr() * W), Y(sr() * H), 1.5, 1.5); }
    // parking lines
    g.strokeStyle = rgba(T.line, 0.32); g.lineWidth = Math.max(1, 0.035 * k);
    for (let x = 1; x < W; x++) { g.beginPath(); g.moveTo(X(x), Y(0.08)); g.lineTo(X(x), Y(H - 0.08)); g.stroke(); }
    for (let y = 1; y < H; y++) { g.setLineDash([0.18 * k, 0.12 * k]); g.beginPath(); g.moveTo(X(0.08), Y(y)); g.lineTo(X(W - 0.08), Y(y)); g.stroke(); }
    g.setLineDash([]);
    g.strokeStyle = rgba(C.theme.gold || "#ffc93d", 0.85); g.lineWidth = 0.06 * k; rr(g, X(0.04), Y(0.04), (W - 0.08) * k, (H - 0.08) * k, 0.2 * k); g.stroke();
    // fences
    const fence = (x0, y0, x1, y1) => {
      g.lineCap = "round"; g.strokeStyle = "#7a4a2a"; g.lineWidth = 0.14 * k; g.beginPath(); g.moveTo(X(x0), Y(y0)); g.lineTo(X(x1), Y(y1)); g.stroke();
      g.strokeStyle = "#c8864a"; g.lineWidth = 0.08 * k; g.beginPath(); g.moveTo(X(x0), Y(y0)); g.lineTo(X(x1), Y(y1)); g.stroke();
      const n = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) * 3)); g.fillStyle = "#5a3418";
      for (let i = 0; i <= n; i++) { const q = i / n; g.beginPath(); g.arc(X(x0 + (x1 - x0) * q), Y(y0 + (y1 - y0) * q), 0.07 * k, 0, TAU); g.fill(); }
    };
    const F = L.fences, e = 0.2;
    F.top.forEach((f, i) => f && fence(i + 0.1, -e, i + 0.9, -e)); F.bottom.forEach((f, i) => f && fence(i + 0.1, H + e, i + 0.9, H + e));
    F.left.forEach((f, i) => f && fence(-e, i + 0.1, -e, i + 0.9)); F.right.forEach((f, i) => f && fence(W + e, i + 0.1, W + e, i + 0.9));
    // cones
    for (const [cx, cy] of L.cones) { const x = X(cx + 0.5), y = Y(cy + 0.5), r = 0.3 * k;
      g.fillStyle = "rgba(0,0,0,0.25)"; g.beginPath(); g.ellipse(x + r * 0.2, y + r * 0.3, r * 1.05, r * 0.9, 0, 0, TAU); g.fill();
      g.fillStyle = "#e85a1c"; rr(g, x - r, y - r, 2 * r, 2 * r, r * 0.3); g.fill();
      const cg = g.createRadialGradient(x - r * 0.2, y - r * 0.25, 1, x, y, r * 0.75); cg.addColorStop(0, "#ffb070"); cg.addColorStop(1, "#ff6a2a"); g.fillStyle = cg; g.beginPath(); g.arc(x, y, r * 0.72, 0, TAU); g.fill();
      g.strokeStyle = "#ffffff"; g.lineWidth = r * 0.18; g.beginPath(); g.arc(x, y, r * 0.42, 0, TAU); g.stroke(); g.fillStyle = "#ff8f3d"; g.beginPath(); g.arc(x, y, r * 0.18, 0, TAU); g.fill(); }
    // trees and bushes on the grass (not on the roads)
    const onRoad = (wx, wy) => { const inRing = wx > -ROAD - RW && wx < W + ROAD + RW && wy > -ROAD - RW && wy < H + ROAD + RW; const gateRoad = Math.abs(wx - W / 2) < RW && wy < 0; return inRing || gateRoad; };
    const b = bounds();
    for (let i = 0; i < 46; i++) {
      const wx = b.x0 - 1 + sr() * (b.x1 - b.x0 + 2), wy = b.y0 - 2 + sr() * (b.y1 - b.y0 + 4), r = (0.35 + sr() * 0.35);
      if (onRoad(wx, wy) || Math.hypot(X(wx) - VW / 2, Y(wy) - Y(-ROAD - 1.4)) < 40 * u) continue;
      const x = X(wx), y = Y(wy), R = r * k, bush = sr() < 0.35;
      g.fillStyle = "rgba(0,0,0,0.22)"; g.beginPath(); g.ellipse(x + R * 0.25, y + R * 0.35, R, R * 0.9, 0, 0, TAU); g.fill();
      const lg2 = g.createRadialGradient(x - R * 0.35, y - R * 0.4, R * 0.1, x, y, R); lg2.addColorStop(0, mix(T.leaf[0], "#ffffff", 0.3)); lg2.addColorStop(0.6, T.leaf[0]); lg2.addColorStop(1, T.leaf[1]);
      g.fillStyle = lg2;
      if (bush) { for (let j = 0; j < 3; j++) { g.beginPath(); g.arc(x + (j - 1) * R * 0.55, y + (j === 1 ? -R * 0.2 : 0), R * 0.6, 0, TAU); g.fill(); } }
      else { g.beginPath(); g.arc(x, y, R, 0, TAU); g.fill(); g.fillStyle = "rgba(255,255,255,0.12)"; g.beginPath(); g.arc(x - R * 0.3, y - R * 0.3, R * 0.35, 0, TAU); g.fill(); }
      if (theme.id === "snow" && !bush) { g.fillStyle = "rgba(255,255,255,0.75)"; g.beginPath(); g.arc(x - R * 0.2, y - R * 0.25, R * 0.45, 0, TAU); g.fill(); }
    }
    // lamp posts at the lot corners
    for (const [lx, ly] of [[-0.45, -0.45], [W + 0.45, -0.45], [-0.45, H + 0.45], [W + 0.45, H + 0.45]]) {
      const x = X(lx), y = Y(ly);
      if (T.night) { const lgl = g.createRadialGradient(x, y, 0, x, y, 2.4 * k); lgl.addColorStop(0, "rgba(255,230,150,0.35)"); lgl.addColorStop(1, "rgba(255,230,150,0)"); g.fillStyle = lgl; g.fillRect(x - 2.4 * k, y - 2.4 * k, 4.8 * k, 4.8 * k); }
      g.fillStyle = "#3a3f52"; g.beginPath(); g.arc(x, y, 0.13 * k, 0, TAU); g.fill(); g.fillStyle = T.night ? "#fff2b0" : "#e8ecf4"; g.beginPath(); g.arc(x, y, 0.08 * k, 0, TAU); g.fill();
    }
    // gate booth
    const gx = X(W / 2 + RW / 2 + 0.45), gy = Y(-ROAD - 0.9);
    g.fillStyle = "rgba(0,0,0,0.25)"; rr(g, gx - 0.3 * k + 4, gy - 0.3 * k + 5, 0.6 * k, 0.6 * k, 0.12 * k); g.fill();
    g.fillStyle = "#f4f6fb"; rr(g, gx - 0.3 * k, gy - 0.3 * k, 0.6 * k, 0.6 * k, 0.12 * k); g.fill();
    g.fillStyle = "#ff6b3d"; rr(g, gx - 0.3 * k, gy - 0.3 * k, 0.6 * k, 0.18 * k, 0.1 * k); g.fill();
    g.fillStyle = "#3a4560"; rr(g, gx - 0.2 * k, gy - 0.05 * k, 0.4 * k, 0.22 * k, 0.05 * k); g.fill();
    if (T.night) { g.fillStyle = "rgba(0,0,0,0.35)"; g.fillRect(0, 0, VW, VH); }
  }

  /* ---------- drawing ---------- */
  function drawCar(c) {
    const sp = sprites.get(c.id); if (!sp) return;
    let x = X(c.px), y = Y(c.py), sc = 1, al = 1;
    if (c.shake > 0) { x += Math.sin(c.shake * 70) * 3 * u * c.shake / 0.45; y += Math.cos(c.shake * 55) * 2 * u * c.shake / 0.45; }
    if (c.st === "bump") { const q = Math.sin(c.bt / 0.32 * Math.PI); sc = 1 + q * 0.05; }
    let lift = 0;
    if (c.st === "lift") { lift = Math.min(1, c.lift / 0.4); sc = 1 + lift * 0.25; const up = Math.max(0, c.lift - 0.45) / 0.65; y -= ease(Math.min(1, up)) * (Y(c.py) + 60); al = 1 - Math.max(0, up - 0.7) / 0.3; }
    ctx.globalAlpha = al;
    // shadow
    ctx.save(); ctx.translate(x + (0.06 + lift * 0.4) * k, y + (0.1 + lift * 0.6) * k); ctx.rotate(c.ang); ctx.globalAlpha = al * (1 - lift * 0.5); ctx.drawImage(sp.sh, -sp.w / 2, -sp.h / 2, sp.w, sp.h); ctx.restore();
    ctx.globalAlpha = al;
    // headlights at night
    if (theme.night && (c.st === "exit" || c.st === "crash" || c.st === "park")) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(c.ang); const hl = (c.len - 0.16) / 2 * k, a = c.st === "park" ? 0.12 : 0.3;
      const gl = ctx.createLinearGradient(hl, 0, hl + 1.6 * k, 0); gl.addColorStop(0, `rgba(255,240,180,${a})`); gl.addColorStop(1, "rgba(255,240,180,0)");
      ctx.fillStyle = gl; ctx.beginPath(); ctx.moveTo(hl, -0.28 * k); ctx.lineTo(hl + 1.6 * k, -0.6 * k); ctx.lineTo(hl + 1.6 * k, 0.6 * k); ctx.lineTo(hl, 0.28 * k); ctx.fill(); ctx.restore();
    }
    ctx.save(); ctx.translate(x, y); ctx.rotate(c.ang); ctx.scale(sc, sc); ctx.drawImage(sp.car, -sp.w / 2, -sp.h / 2, sp.w, sp.h);
    // reverse lights while backing up
    if ((c.rev && (c.st === "exit" && c.s < 1.4 || c.st === "crash")) || c.st === "return") { const hl = (c.len - 0.16) / 2 * k; ctx.fillStyle = "rgba(255,255,255,0.9)"; ctx.fillRect(-hl - 1, -0.22 * k, 3, 0.12 * k); ctx.fillRect(-hl - 1, 0.1 * k, 3, 0.12 * k); }
    ctx.restore();
    if (c.st === "lift") { // crane hook + cable
      const top = y - (sp.h / 2) * sc; ctx.strokeStyle = "#3a3f52"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, -10); ctx.lineTo(x, top + 4); ctx.stroke();
      ctx.fillStyle = "#ffc93d"; ctx.beginPath(); ctx.arc(x, top + 4, 7 * u, 0, TAU); ctx.fill(); ctx.strokeStyle = "#a07a10"; ctx.lineWidth = 2; ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // angry bubble
    if (c.bubble > 0 && c.st !== "lift") {
      const q = Math.min(1, (1.1 - c.bubble) / 0.15), r = Math.max(0.5, 13 * u * back(q)), bx = x + 0.25 * k, by = y - 0.6 * k;
      ctx.globalAlpha = Math.min(1, c.bubble * 3);
      ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(bx, by, r, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.moveTo(bx - r * 0.3, by + r * 0.8); ctx.lineTo(bx - r * 0.6, by + r * 1.4); ctx.lineTo(bx + r * 0.1, by + r * 0.9); ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.15)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(bx, by, r, 0, TAU); ctx.stroke();
      ctx.fillStyle = "#ff4d5e"; ctx.font = `900 ${Math.round(r * 1.3)}px system-ui, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("!", bx, by + 1);
      ctx.globalAlpha = 1;
    }
  }
  function drawGate() {
    const W = L.cols, x = X(W / 2 + RW / 2 + 0.15), y = Y(-ROAD - 0.7), len = RW * k * 0.98, a = -gateLift * 1.35;
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI + a);
    ctx.fillStyle = "rgba(0,0,0,0.2)"; ctx.fillRect(2, 5, len, 0.12 * k);
    for (let i = 0; i < 6; i++) { ctx.fillStyle = i % 2 ? "#ffffff" : "#ff4d5e"; ctx.fillRect(i * len / 6, -0.06 * k, len / 6 + 0.5, 0.12 * k); }
    ctx.restore();
    ctx.fillStyle = "#3a3f52"; ctx.beginPath(); ctx.arc(x, y, 0.12 * k, 0, TAU); ctx.fill();
  }
  function render() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    let sx = 0, sy = 0; if (shake > 0) { sx = (Math.random() - 0.5) * shake * 18; sy = (Math.random() - 0.5) * shake * 18; }
    ctx.translate(sx, sy);
    ctx.drawImage(bg, 0, 0, VW, VH);
    for (const m of marks) { ctx.globalAlpha = 0.35 * (1 - m.t / 6); ctx.fillStyle = "#1a1c24"; ctx.save(); ctx.translate(X(m.x), Y(m.y)); ctx.rotate(m.ang); ctx.fillRect(-0.4 * k, -0.25 * k, 0.4 * k, 0.07 * k); ctx.fillRect(-0.4 * k, 0.18 * k, 0.4 * k, 0.07 * k); ctx.restore(); }
    ctx.globalAlpha = 1;
    // parked / crashing cars, then moving ones on top
    const order = cars.filter(c => c.st !== "done").sort((a, b) => (a.st === "exit" || a.st === "lift" ? 1 : 0) - (b.st === "exit" || b.st === "lift" ? 1 : 0));
    for (const c of order) if (c.st !== "lift") drawCar(c);
    drawGate();
    // hint arrow
    if (hint && !hint.c.gone && mode === "play") {
      const c = hint.c, a = dirAng(hint.d), q = (Math.sin(hint.t * 6) + 1) / 2, d = (c.len / 2 + 0.35 + q * 0.25) * k;
      const x = X(c.px) + Math.cos(a) * d, y = Y(c.py) + Math.sin(a) * d;
      ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.fillStyle = "#ffc93d"; ctx.strokeStyle = "#22283a"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0.42 * k, 0); ctx.lineTo(0, -0.32 * k); ctx.lineTo(0, -0.14 * k); ctx.lineTo(-0.3 * k, -0.14 * k); ctx.lineTo(-0.3 * k, 0.14 * k); ctx.lineTo(0, 0.14 * k); ctx.lineTo(0, 0.32 * k); ctx.closePath(); ctx.stroke(); ctx.fill(); ctx.restore();
      ctx.strokeStyle = `rgba(255,201,61,${0.5 + q * 0.5})`; ctx.lineWidth = 4; ctx.save(); ctx.translate(X(c.px), Y(c.py)); ctx.rotate(c.ang); rr(ctx, -(c.len - 0.1) / 2 * k, -0.42 * k, (c.len - 0.1) * k, 0.84 * k, 0.2 * k); ctx.stroke(); ctx.restore();
    }
    if (craneOn && mode === "play") for (const c of cars) if (c.st === "park" && !c.gone) { ctx.strokeStyle = `rgba(255,201,61,${0.45 + 0.4 * Math.sin(t * 8)})`; ctx.lineWidth = 3; ctx.save(); ctx.translate(X(c.px), Y(c.py)); ctx.rotate(c.ang); rr(ctx, -(c.len - 0.1) / 2 * k, -0.42 * k, (c.len - 0.1) * k, 0.84 * k, 0.2 * k); ctx.stroke(); ctx.restore(); }
    for (const c of order) if (c.st === "lift") drawCar(c);
    // particles
    for (const q of parts) {
      const a = 1 - q.t / q.life; ctx.globalAlpha = Math.max(0, Math.min(1, a * 1.5)); ctx.fillStyle = q.col;
      if (q.rect) { ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot || 0); ctx.fillRect(-q.r / 2, -q.r / 4, q.r, q.r / 2); ctx.restore(); }
      else { ctx.beginPath(); ctx.arc(X(q.x), Y(q.y), q.r * k, 0, TAU); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
    for (const x of texts) {
      const e = x.t / 1.1, s = (x.coin ? 18 : 20) * u * (x.t < 0.15 ? back(x.t / 0.15) : 1);
      ctx.globalAlpha = 1 - Math.max(0, e - 0.6) / 0.4; ctx.font = `900 ${Math.round(s)}px ui-rounded, system-ui, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      const px = X(x.x), py = Y(x.y) - e * 30 * u;
      ctx.lineWidth = 5 * u; ctx.strokeStyle = "#22283a"; ctx.strokeText(x.s, px, py); ctx.fillStyle = x.coin ? "#ffc93d" : "#ffffff"; ctx.fillText(x.s, px, py);
    }
    ctx.globalAlpha = 1;
    // tutorial hand on level 1
    if (hand && mode === "play") {
      const g = grid(), c = cars.find(c => !c.gone && c.st === "park" && LV.lane(L, g, c, c.dir).out);
      if (c) { hand.t += 0; const x = X(c.px) + 10 * u, y = Y(c.py) + 14 * u + Math.sin(t * 5) * 6 * u; drawHand(x, y); }
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  function drawHand(x, y) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(-0.4); const q = u * 1.1;
    ctx.fillStyle = "#ffffff"; ctx.strokeStyle = "#22283a"; ctx.lineWidth = 3 * q; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(-6 * q, 0); ctx.lineTo(-6 * q, -26 * q); ctx.quadraticCurveTo(0, -34 * q, 6 * q, -26 * q); ctx.lineTo(6 * q, -8 * q); ctx.lineTo(18 * q, -6 * q); ctx.quadraticCurveTo(26 * q, 0, 22 * q, 14 * q); ctx.lineTo(16 * q, 30 * q); ctx.lineTo(-8 * q, 30 * q); ctx.lineTo(-16 * q, 8 * q); ctx.quadraticCurveTo(-14 * q, 0, -6 * q, 4 * q); ctx.closePath();
    ctx.fill(); ctx.stroke(); ctx.restore();
  }

  /* ---------- input: tap = forward, swipe along the car = forward / reverse ---------- */
  let press = null;
  function carAt(px, py) {
    for (const c of cars) {
      if (c.gone || c.st !== "park") continue;
      const dx = (px - X(c.px)) / k, dy = (py - Y(c.py)) / k, ca = Math.cos(-c.ang), sa = Math.sin(-c.ang);
      const lx = dx * ca - dy * sa, ly = dx * sa + dy * ca;
      if (Math.abs(lx) < c.len / 2 && Math.abs(ly) < 0.5) return c;
    }
    return null;
  }
  cv.addEventListener("pointerdown", e => { Sound.unlock(); if (mode !== "play") return; press = { x: e.clientX, y: e.clientY, c: carAt(e.clientX, e.clientY) }; });
  cv.addEventListener("pointerup", e => {
    if (!press || mode !== "play") { press = null; return; }
    const c = press.c, dx = e.clientX - press.x, dy = e.clientY - press.y; press = null;
    if (!c) return;
    if (craneOn) { lift(c); return; }
    const dist = Math.hypot(dx, dy), fx = Math.cos(c.ang), fy = Math.sin(c.ang), proj = dx * fx + dy * fy;
    if (dist < 14 * u) drive(c, c.dir);
    else if (Math.abs(proj) > dist * 0.55) drive(c, proj > 0 ? c.dir : (c.dir + 2) % 4);
  });
  addEventListener("resize", resize);

  let last = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    if (mode !== "paused" && mode !== "idle") try { update(dt); } catch (e) { console.error(e); }
    if (L && VW) try { render(); } catch (e) { console.error(e); }
  }
  function start(n) { load(n); mode = "play"; }
  function attract() { load(3 + Math.floor(Math.random() * 8), { bot: true }); mode = "attract"; botT = 1.2; }
  resize(); requestAnimationFrame(frame);

  return {
    on, start, attract, revive, drive, lift, showHint,
    setCrane(v) { craneOn = v; }, setTheme(id) { theme = C.themes.find(x => x.id === id) || C.themes[0]; if (L) bake(); },
    pause(p) { if (p && mode === "play") mode = "paused"; else if (!p && mode === "paused") { mode = "play"; last = 0; } },
    step(dt = 1 / 60, n = 1) { for (let i = 0; i < n; i++) update(dt); },
    get mode() { return mode; }, set mode(v) { mode = v; }, get level() { return L; }, get cars() { return cars; }, get hearts() { return hearts; }, get crane() { return craneOn; },
    busy: () => cars.some(c => c.st === "crash" || c.st === "bump" || c.st === "return"), toScreen: (x, y) => [X(x), Y(y)], grid
  };
})();

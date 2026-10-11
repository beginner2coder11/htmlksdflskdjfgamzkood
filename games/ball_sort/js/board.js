/* ==========================================================================
   BOARD — the playfield. Game state changes instantly on a move; visuals
   (ball flights, water pours, corks) catch up on their own, so logic never
   waits on animation frames.

   Board.load(level, opts)   start a level ({tubes, cap, par, mystery…})
   Board.tap(i)              select / move like a player tap
   Board.undo() · addTube() · hint() · restart()
   Board.demo(mode)          self-solving board behind the home menu
   Board.step(dt) · renderNow()   test hooks (a hidden tab pauses rAF)
   ========================================================================== */
window.Board = (() => {
  const C = window.GAME_CONFIG;
  const cv = document.getElementById("stage");
  const x = cv.getContext("2d");
  const TAU = Math.PI * 2;
  let W = 0, H = 0, dpr = 1;

  // ---------- state ----------------------------------------------------------
  let mode = "balls", cap = 4, single = true;
  let tubes = [];            // arrays of units {c, hid, …render props}, bottom → top
  let source = null;         // decoded level (for restart)
  let sel = -1, moves = 0, history = [], undoLeft = 0, extraUsed = 0, usedUndo = false;
  let won = false, isDemo = false, demoTimer = 0, slot = null;
  let ballSkin = "glossy", tubeSkin = "glass", theme = C.themes[0];
  let uid = 0, time = 0, loadId = 0;
  const on = {};             // UI hooks: move, tube, win, stuck, select, nope, reveal

  // visuals
  let lay = [], r = 20, tw = 50, th = 200, area = null;
  let fxT = [];              // per tube: {shake, lift, cork (null|0..1), corked, glow}
  let disp = [];             // water: what each tube currently shows
  let anims = [];            // water pours waiting/running
  let hintMv = null, hintT = 0, winT = -1;
  let bokeh = [];

  const colorsOf = () => tubes.map(t => t.map(u => u.c));
  const sfx = (n, a) => { if (!isDemo && window.Sound) Sound.play(n, a); };
  const vibe = ms => { if (!isDemo && on.vibe) on.vibe(ms); };

  function visibleRun(t) {
    if (!t.length) return 0;
    const c = t[t.length - 1].c; let n = 0;
    for (let i = t.length - 1; i >= 0 && t[i].c === c && !t[i].hid; i--) n++;
    return n;
  }
  const complete = i => Engine.isComplete(tubes[i].map(u => u.c), cap);
  const canMove = (a, b) => Engine.canMove(colorsOf(), cap, a, b);

  // ---------- loading ---------------------------------------------------------
  function makeUnit(c, hid) { return { c, hid, id: uid++, x: NaN, y: NaN, path: [], delay: 0, land: 0, reveal: 0 }; }
  function load(level, opts = {}) {
    source = level; loadId++;
    mode = opts.mode || mode;
    single = mode === "balls" && !C.modes.balls.moveAll;
    cap = level.cap || 4;
    tubes = level.tubes.map(t => t.map((c, k) => makeUnit(c, !!level.mystery && k < t.length - 1)));
    sel = -1; moves = 0; history = []; usedUndo = false; won = false; extraUsed = 0;
    undoLeft = opts.undo != null ? opts.undo : C.rules.undoPerLevel;
    fxT = tubes.map(() => ({ shake: 0, lift: 0, cork: null, glow: 0 }));
    disp = tubes.map(t => t.slice());
    anims = []; hintMv = null; winT = -1;
    layout(true);
    // balls drop in from above for a lively start
    tubes.forEach((t, i) => t.forEach((u, k) => {
      const s = slotPos(i, k);
      u.x = s.x; u.y = isDemo ? s.y : s.y - H * 0.6 - k * r * 2.2 - i * r * 0.6;
    }));
  }
  function restart() { if (source) load(source, { mode, undo: C.rules.undoPerLevel }); }

  // ---------- layout -------------------------------------------------------------
  function layout(force) {
    if (!slot) return;
    const b = slot.getBoundingClientRect();
    if (b.width < 40 || b.height < 40) return;
    const changed = force || !area || b.left !== area.x || b.top !== area.y || b.width !== area.w || b.height !== area.h || lay.length !== tubes.length;
    if (!changed) return;
    area = { x: b.left, y: b.top, w: b.width, h: b.height };
    const n = Math.max(1, tubes.length);
    // pick the row count that gives the biggest balls
    let best = null;
    for (let rows = 1; rows <= 3; rows++) {
      const per = Math.ceil(n / rows);
      const unitH = cap * 2.06 + 0.9 + 3.1;             // tube + lift space, in ball radii
      const rr = Math.min(area.h / (rows * unitH), area.w / per / 3.5, 34);
      if (!best || rr > best.r + 0.5) best = { rows, per, r: rr };
    }
    r = Math.max(6, best.r); tw = r * 2.5; th = cap * r * 2.06 + r * 0.9;
    const rowH = th + r * 3.1, total = best.rows * rowH;
    const y0 = area.y + (area.h - total) / 2;
    lay = [];
    for (let i = 0; i < n; i++) {
      const row = Math.floor(i / best.per), inRow = Math.min(best.per, n - row * best.per), j = i - row * best.per;
      const sx = Math.min(area.w / inRow, tw * 2.1);
      lay.push({ x: area.x + area.w / 2 + (j - (inRow - 1) / 2) * sx, y: y0 + row * rowH + r * 3.1, sx });
    }
  }
  function slotPos(i, k) {
    const L = lay[i] || { x: W / 2, y: H / 2 };
    return { x: L.x, y: L.y + th - r * 1.08 - k * r * 2.06 };
  }
  const liftPos = i => ({ x: lay[i].x, y: lay[i].y - r * 1.75 });

  function tubeAt(px, py) {
    for (let i = 0; i < lay.length; i++) {
      const L = lay[i];
      if (Math.abs(px - L.x) < L.sx / 2 && py > L.y - r * 3 && py < L.y + th + r * 0.6) return i;
    }
    return -1;
  }

  // ---------- moves ---------------------------------------------------------------
  function snapshot() { return { tubes: tubes.map(t => t.slice()), moves }; }
  function tap(i) {
    if (won || i < 0 || i >= tubes.length) return;
    if (sel === -1) {
      if (tubes[i].length && !complete(i)) { sel = i; sfx("pick"); vibe(8); on.select && on.select(i); }
      else { fxT[i].shake = 1; }
      return;
    }
    if (sel === i) { sel = -1; sfx("drop", 0); return; }
    if (canMove(sel, i)) { doMove(sel, i); return; }
    if (tubes[i].length && !complete(i)) { sel = i; sfx("pick"); return; }
    fxT[i].shake = 1; sfx("nope"); vibe([20, 30, 20]);
    sel = -1; on.nope && on.nope(i);
  }

  function doMove(a, b) {
    history.push(snapshot());
    const A = tubes[a], B = tubes[b];
    const n = single ? 1 : Math.min(visibleRun(A), cap - B.length);
    const movedUnits = A.splice(A.length - n, n);
    const fromLen = A.length + n;
    B.push(...movedUnits);
    moves++; sel = -1; hintMv = null;
    // reveal what is now on top of the source
    const nt = A[A.length - 1];
    if (nt && nt.hid) { nt.hid = false; nt.reveal = 1; setTimeout(() => sfx("reveal"), 250); on.reveal && on.reveal(a); }

    if (mode === "balls") {
      const lift = Math.min(lay[a].y, lay[b].y) - r * 1.75;
      movedUnits.slice().reverse().forEach((u, j) => {
        const end = slotPos(b, B.length - 1 - j);
        if (j > 0 || isNaN(u.x)) { const s = slotPos(a, fromLen - 1 - j); u.x = s.x; u.y = s.y; }
        u.path = [{ x: lay[a].x, y: lift }, { x: lay[b].x, y: lift }, end];
        u.delay = j * 0.07;
      });
    } else {
      anims.push({ a, b, n, c: movedUnits[0].c, t: 0, started: false, after: { a: A.slice(), b: B.slice() }, beforeA: null, beforeB: null });
    }
    sfx(mode === "water" ? "pour" : "pick");

    const newlyDone = complete(b), solved = Engine.isSolved(colorsOf(), cap);
    if (solved) won = true;
    if (!isDemo) on.move && on.move({ moves, a, b, n, tubeDone: newlyDone, solved });
    if (solved) {
      const tok = loadId;
      setTimeout(() => { if (tok !== loadId) return; winT = time; if (!isDemo) { sfx("win"); on.win && on.win(stats()); } }, mode === "water" ? 1300 : 800);
    } else if (!Engine.hasMoves(colorsOf(), cap) && !isDemo) {
      const tok = loadId;
      setTimeout(() => { if (tok === loadId && !won && !Engine.hasMoves(colorsOf(), cap)) on.stuck && on.stuck(); }, 900);
    }
  }

  function undo() {
    if (!history.length || won) return false;
    const s = history.pop();
    tubes = s.tubes; moves = s.moves;
    while (tubes.length < lay.length) tubes.push([]);   // an added tube stays
    sel = -1; hintMv = null; usedUndo = true;
    anims = []; disp = tubes.map(t => t.slice());
    tubes.forEach((t, i) => { t.forEach(u => { u.path = []; u.delay = 0; }); if (!complete(i)) fxT[i].cork = null; });
    sfx("undo");
    return true;
  }
  function addTube() {
    if (won) return false;
    tubes.push([]); disp.push([]); fxT.push({ shake: 0, lift: 0, cork: null, glow: 1 });
    extraUsed++; sel = -1;
    layout(true);
    return true;
  }
  function hint() {
    if (won) return null;
    const sol = Engine.solve(colorsOf(), cap, { limit: 60000 });
    if (!sol || !sol.length) return null;
    hintMv = sol[0]; hintT = 6;
    return { a: hintMv[0], b: hintMv[1], left: sol.length };
  }

  function stats() {
    return { moves, usedUndo, extraUsed, mode, tubes: tubes.length };
  }

  // ---------- demo (home screen) -------------------------------------------------
  function demo(m) {
    isDemo = true; mode = m || mode;
    clearInterval(demoTimer);
    const rnd = Engine.RNG((Date.now() & 0xffff) + 1);
    const fresh = () => {
      let L = null;
      while (!L) L = Engine.generate({ colors: 4, empty: 2, cap: 4, tries: 1 }, rnd.int(1e9));
      load(L, { mode });
      // keep balls in place for the demo
      tubes.forEach((t, i) => t.forEach((u, k) => { const s = slotPos(i, k); u.x = s.x; u.y = s.y; }));
    };
    fresh();
    let plan = [], wait = 0;
    demoTimer = setInterval(() => {
      if (won) { if (++wait > (mode === "water" ? 3 : 5)) { wait = 0; fresh(); plan = []; } return; }
      if (!plan.length) plan = (Engine.solve(colorsOf(), cap) || []).slice();
      const mv = plan.shift();
      if (!mv) return;
      if (single && sel !== mv[0]) { sel = mv[0]; plan.unshift(mv); return; }   // show the lift
      doMove(mv[0], mv[1]);
      if (single) {                                   // pour rule → repeat single moves
        const left = mv[2] - 1;
        if (left > 0) plan.unshift([mv[0], mv[1], left]);
      }
    }, mode === "water" ? 1100 : 520);
  }
  function stopDemo() { isDemo = false; clearInterval(demoTimer); }

  // ---------- update ----------------------------------------------------------------
  function update(dt) {
    time += dt;
    layout(false);
    // balls
    if (mode === "balls") {
      const speed = r * 42;
      tubes.forEach((t, i) => t.forEach((u, k) => {
        if (u.reveal > 0) u.reveal = Math.max(0, u.reveal - dt * 2.5);
        if (u.land > 0) u.land = Math.max(0, u.land - dt * 4);
        if (u.path.length) {
          if (u.delay > 0) { u.delay -= dt; return; }
          let step = speed * dt;
          while (step > 0 && u.path.length) {
            const p = u.path[0], dx = p.x - u.x, dy = p.y - u.y, d = Math.hypot(dx, dy);
            if (d <= step) {
              u.x = p.x; u.y = p.y; step -= d; u.path.shift();
              if (!u.path.length) { u.land = 1; sfx("drop", k); }
            } else { u.x += dx / d * step; u.y += dy / d * step; step = 0; }
          }
          return;
        }
        const target = sel === i && k === t.length - 1 ? liftPos(i) : slotPos(i, k);
        if (isNaN(u.x)) { u.x = target.x; u.y = target.y; }
        const vy = target.y - u.y, falling = vy > r * 0.5;
        // drop-in at load: gravity-ish fall with a landing bounce
        const kk = Math.min(1, dt * (falling ? 9 : 16));
        u.x += (target.x - u.x) * kk;
        u.y += vy * kk;
        if (falling && Math.abs(target.y - u.y) < r * 0.3) u.land = Math.max(u.land, 0.7);
      }));
    } else {
      // water pours: start each one when its tubes are free
      const busy = new Set();
      for (const an of anims) {
        if (busy.has(an.a) || busy.has(an.b)) { busy.add(an.a); busy.add(an.b); continue; }
        busy.add(an.a); busy.add(an.b);
        if (!an.started) { an.started = true; an.beforeA = disp[an.a].slice(); an.beforeB = disp[an.b].slice(); an.dur = 0.3 + 0.24 + 0.1 * an.n + 0.28; }
        an.t += dt;
        const pourStart = 0.3, pourEnd = 0.3 + 0.24 + 0.1 * an.n;
        if (an.t >= pourStart && !an.splashed) { an.splashed = true; sfx("pour"); }
        if (an.t >= pourEnd && !an.landed) { an.landed = true; disp[an.b] = an.after.b; disp[an.a] = an.after.a; }
        if (an.t >= an.dur) an.done = true;
      }
      anims = anims.filter(a => !a.done);
      tubes.forEach(t => t.forEach(u => { if (u.reveal > 0) u.reveal = Math.max(0, u.reveal - dt * 2.5); }));
    }
    // tube fx
    fxT.forEach((f, i) => {
      f.shake = Math.max(0, f.shake - dt * 3);
      f.lift += ((mode === "water" && sel === i ? 1 : 0) - f.lift) * Math.min(1, dt * 14);
      f.glow = Math.max(0, f.glow - dt * 1.2);
      if (f.cork === null && tubes[i] && complete(i) && settled(i)) {
        f.cork = 1; f.glow = 1;
        if (!isDemo) { sfx("tube"); vibe(25); on.tube && on.tube(i, lay[i]); }
      }
      if (f.cork !== null && f.cork > 0) f.cork = Math.max(0, f.cork - dt * 3.2);
    });
    if (hintT > 0) { hintT -= dt; if (hintT <= 0) hintMv = null; }
  }
  function settled(i) {
    if (mode === "balls") return tubes[i].every(u => !u.path.length);
    return !anims.some(a => a.a === i || a.b === i) && disp[i].length === tubes[i].length;
  }

  // ---------- render ------------------------------------------------------------------
  function resize() {
    W = innerWidth; H = innerHeight; dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.max(1, W * dpr); cv.height = Math.max(1, H * dpr);
    cv.style.width = W + "px"; cv.style.height = H + "px";
    bokeh = Array.from({ length: 14 }, (_, i) => ({ x: Math.random(), y: Math.random(), r: 20 + Math.random() * 70, s: 0.01 + Math.random() * 0.03, c: i % 3, ph: Math.random() * 6 }));
  }
  window.addEventListener("resize", resize);
  resize();

  function background() {
    const g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, theme.bg[0]); g.addColorStop(1, theme.bg[1]);
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    bokeh.forEach(b => {
      const yy = ((b.y - time * b.s) % 1 + 1) % 1;
      const xx = b.x + Math.sin(time * 0.3 + b.ph) * 0.03;
      const gg = x.createRadialGradient(xx * W, yy * H, 0, xx * W, yy * H, b.r);
      gg.addColorStop(0, theme.bokeh[b.c] + "30"); gg.addColorStop(1, theme.bokeh[b.c] + "00");
      x.fillStyle = gg; x.beginPath(); x.arc(xx * W, yy * H, b.r, 0, TAU); x.fill();
    });
    if (theme.id === "space") {
      x.fillStyle = "#fff";
      for (let i = 0; i < 60; i++) { const sx = (i * 97.3) % W, sy = (i * 211.7) % H, tw2 = (Math.sin(time * 2 + i) + 1) / 2; x.globalAlpha = 0.3 + tw2 * 0.6; x.fillRect(sx, sy, 2, 2); }
      x.globalAlpha = 1;
    }
  }

  function tubeOffset(i) {
    const f = fxT[i] || { shake: 0, lift: 0 };
    let ox = f.shake ? Math.sin(time * 55) * f.shake * r * 0.35 : 0, oy = -f.lift * r * 0.9;
    if (winT >= 0) { const k = time - winT - i * 0.06; if (k > 0 && k < 1.6) oy -= Math.max(0, Math.sin(k * 9)) * r * 0.7 * (1 - k / 1.6); }
    return { ox, oy };
  }

  function drawBall(u, px, py) {
    let sx = 1, sy = 1;
    if (u.land > 0) { const s = Math.sin(u.land * Math.PI) * 0.16; sx = 1 + s; sy = 1 - s; }
    if (u.reveal > 0) {
      const k = Math.abs(Math.cos(Math.PI * (1 - u.reveal)));
      Skins.ball(x, px, py, r, u.c, ballSkin, { hidden: u.reveal > 0.5, t: time, sx: Math.max(0.05, k) * sx, sy });
    } else Skins.ball(x, px, py, r, u.c, ballSkin, { hidden: u.hid, t: time, sx, sy });
  }

  // area of polygon clipped to the half-plane y >= Y
  function clipArea(poly, Y) {
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i], q = poly[(i + 1) % poly.length], pin = p[1] >= Y, qin = q[1] >= Y;
      if (pin) out.push(p);
      if (pin !== qin) { const t = (Y - p[1]) / (q[1] - p[1]); out.push([p[0] + (q[0] - p[0]) * t, Y]); }
    }
    let a = 0;
    for (let i = 0; i < out.length; i++) { const p = out[i], q = out[(i + 1) % out.length]; a += p[0] * q[1] - q[0] * p[1]; }
    return Math.abs(a) / 2;
  }
  // liquid in a tube posed at mouth (mx,my) rotated by ang; segs = [{c, hid, amt}]
  function drawLiquid(mx, my, ang, segs, idx) {
    const lw = Math.max(2, tw * 0.06), wi = tw - lw * 2, bottom = th - lw, unitH = (th - r * 0.9) / cap;
    const cs = Math.cos(ang), sn = Math.sin(ang);
    const toW = (lx, ly) => [mx + cs * lx - sn * ly, my + sn * lx + cs * ly];
    const poly = [toW(-wi / 2, 0), toW(wi / 2, 0), toW(wi / 2, bottom), toW(-wi / 2, bottom)];
    const ys = poly.map(p => p[1]), minY = Math.min(...ys), maxY = Math.max(...ys);
    const levelFor = vol => {
      if (Math.abs(ang) < 1e-4) return my + bottom - vol / wi;        // upright: linear
      let lo = minY, hi = maxY;
      for (let it = 0; it < 24; it++) { const mid = (lo + hi) / 2; if (clipArea(poly, mid) > vol) lo = mid; else hi = mid; }
      return (lo + hi) / 2;
    };
    x.save();
    x.translate(mx, my); x.rotate(ang);
    Skins.tubePath(x, tw - lw, th - lw * 0.5); x.closePath(); x.clip();
    x.rotate(-ang); x.translate(-mx, -my);
    let vol = 0, prevY = maxY + 2, topY = maxY;
    const bands = [];
    segs.forEach(s => {
      if (s.amt <= 0.001) return;
      vol += s.amt * unitH * wi;
      const y = levelFor(vol);
      bands.push({ y0: y, y1: prevY, s });
      prevY = y; topY = y;
    });
    bands.forEach(bd => {
      const col = Skins.liquidColor(bd.s.c, bd.s.hid);
      const g = x.createLinearGradient(minX(poly), 0, maxX(poly), 0);
      g.addColorStop(0, Skins.shade(col, -0.12)); g.addColorStop(0.5, col); g.addColorStop(1, Skins.shade(col, -0.25));
      x.fillStyle = g;
      x.fillRect(minX(poly) - 4, bd.y0, maxX(poly) - minX(poly) + 8, bd.y1 - bd.y0 + 0.5);
      if (bd.s.hid && Math.abs(ang) < 0.05) {
        x.fillStyle = "rgba(255,255,255,.85)"; x.font = `${Math.round(r * 1.1)}px "Lilita One", sans-serif`;
        x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("?", mx, (bd.y0 + bd.y1) / 2);
      }
    });
    if (bands.length) {
      const top = bands[bands.length - 1];
      x.fillStyle = "rgba(255,255,255,.35)"; x.fillRect(minX(poly) - 4, top.y0, maxX(poly) - minX(poly) + 8, Math.max(2, r * 0.12));
      // bubbles
      if (Math.abs(ang) < 0.05 && idx != null) {
        for (let k = 0; k < 2; k++) {
          const ph = (time * 0.35 + k * 0.5 + idx * 0.137) % 1, by = maxY - (maxY - topY) * ph;
          x.fillStyle = `rgba(255,255,255,${0.35 * (1 - ph)})`;
          x.beginPath(); x.arc(mx + Math.sin(time * 3 + k + idx) * wi * 0.25, by, r * (0.08 + 0.06 * k), 0, TAU); x.fill();
        }
      }
    }
    x.restore();
    return topY;
  }
  const minX = p => Math.min(...p.map(q => q[0])), maxX = p => Math.max(...p.map(q => q[0]));
  const segsOf = arr => arr.map(u => ({ c: u.c, hid: u.hid && !(u.reveal > 0.5), amt: 1 }));

  function drawTubeAt(i, mx, my, ang, contents) {
    const f = fxT[i] || {};
    x.save(); x.translate(mx, my); x.rotate(ang);
    Skins.tubeBack(x, tw, th, tubeSkin, { glow: f.glow, glowColor: "#ffe03a" });
    x.restore();
    if (contents) contents();
    x.save(); x.translate(mx, my); x.rotate(ang);
    Skins.tubeFront(x, tw, th, tubeSkin, { selected: sel === i });
    if (f.cork !== null && f.cork !== undefined) Skins.cork(x, tw, f.cork * f.cork);
    x.restore();
  }

  function render() {
    if (innerWidth !== W || innerHeight !== H) resize();
    if (!W || !H) return;
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    background();
    if (!lay.length || !slot || !slot.getClientRects().length) return;   // slot hidden (other screen)
    const flying = [];
    const pouring = new Map();
    if (mode === "water") anims.forEach(a => { if (a.started) pouring.set(a.a, a); });

    tubes.forEach((t, i) => {
      if (!lay[i]) return;
      const L = lay[i], { ox, oy } = tubeOffset(i);
      if (pouring.has(i)) return;                          // drawn on top later
      if (mode === "balls") {
        drawTubeAt(i, L.x + ox, L.y + oy, 0, () => {
          t.forEach((u, k) => {
            if (u.path.length || (sel === i && k === t.length - 1)) { flying.push(u); return; }
            drawBall(u, u.x + ox, u.y + oy);
          });
        });
      } else {
        const inc = anims.find(a => a.started && a.b === i && !a.landed);
        let segs;
        if (inc) {
          const p = pourP(inc);
          segs = segsOf(inc.beforeB).concat([{ c: inc.c, hid: false, amt: inc.n * p }]);
        } else segs = segsOf(disp[i]);
        drawTubeAt(i, L.x + ox, L.y + oy, 0, () => drawLiquid(L.x + ox, L.y + oy, 0, segs, i));
      }
    });

    // water: pouring tubes + streams on top
    pouring.forEach(an => {
      const A = lay[an.a], B = lay[an.b];
      if (!A || !B) return;
      const dir = B.x >= A.x ? 1 : -1;
      const tMove = 0.3, tPour = 0.24 + 0.1 * an.n;
      const k1 = ease(Math.min(1, an.t / tMove)), k3 = ease(Math.max(0, Math.min(1, (an.t - tMove - tPour) / 0.28)));
      const p = pourP(an);
      const tgtX = B.x - dir * tw * 0.42, tgtY = B.y - r * 1.6 - th * 0.02;
      const angPour = dir * (1.15 + 0.55 * p);
      const k = k1 * (1 - k3);
      const mx = A.x + (tgtX - A.x) * k, my = A.y + (tgtY - A.y) * k;
      const ang = angPour * k;
      const segs = segsOf(an.beforeA);
      let rem = an.n * (an.landed ? 1 : p);
      for (let s = segs.length - 1; s >= 0 && rem > 0; s--) { const d = Math.min(segs[s].amt, rem); segs[s].amt -= d; rem -= d; }
      if (p > 0 && p < 1 && !an.landed) {
        const lipX = mx + Math.cos(ang) * dir * tw * 0.42, lipY = my + Math.sin(ang) * dir * tw * 0.42;
        const unitH = (th - r * 0.9) / cap, lw = Math.max(2, tw * 0.06);
        const surf = B.y + th - lw - (an.beforeB.length + an.n * p) * unitH;
        const sw = tw * 0.16 * (0.8 + 0.2 * Math.sin(time * 30));
        x.fillStyle = Skins.liquidColor(an.c, false);
        x.beginPath(); x.roundRect(lipX - sw / 2, lipY, sw, Math.max(4, surf - lipY), sw / 2); x.fill();
        x.fillStyle = "rgba(255,255,255,.35)"; x.fillRect(lipX - sw * 0.25, lipY, sw * 0.18, Math.max(4, surf - lipY));
      }
      drawTubeAt(an.a, mx, my, ang, () => drawLiquid(mx, my, ang, segs, null));
    });

    // flying / lifted balls above everything
    flying.forEach(u => drawBall(u, u.x, u.y + (u.path.length ? 0 : Math.sin(time * 6) * r * 0.08)));

    // hint arrow
    if (hintMv && lay[hintMv[0]] && lay[hintMv[1]]) {
      const A = lay[hintMv[0]], B = lay[hintMv[1]], pulse = (Math.sin(time * 8) + 1) / 2;
      x.save();
      x.strokeStyle = "#fff36b"; x.lineWidth = 5; x.setLineDash([10, 8]); x.lineDashOffset = -time * 40; x.lineCap = "round";
      x.shadowColor = "#ffe03a"; x.shadowBlur = 14;
      const y0 = Math.min(A.y, B.y) - r * 2.6 - pulse * 4;
      x.beginPath(); x.moveTo(A.x, A.y - r * 0.8); x.bezierCurveTo(A.x, y0 - r, B.x, y0 - r, B.x, B.y - r * 1.2); x.stroke();
      x.setLineDash([]); x.fillStyle = "#fff36b";
      x.beginPath(); x.moveTo(B.x, B.y - r * 0.5); x.lineTo(B.x - r * 0.5, B.y - r * 1.3); x.lineTo(B.x + r * 0.5, B.y - r * 1.3); x.closePath(); x.fill();
      [hintMv[0], hintMv[1]].forEach(i => { const L = lay[i]; x.strokeStyle = `rgba(255,243,107,${0.4 + pulse * 0.5})`; x.lineWidth = 4; x.beginPath(); x.roundRect(L.x - tw * 0.75, L.y - r * 0.6, tw * 1.5, th + r * 1.1, r * 0.8); x.stroke(); });
      x.restore();
    }
  }
  const ease = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  function pourP(an) { const tPour = 0.24 + 0.1 * an.n; return Math.max(0, Math.min(1, (an.t - 0.3) / tPour)); }

  // ---------- loop & input -------------------------------------------------------------
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    update(dt); render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  cv.addEventListener("pointerdown", e => {
    if (isDemo || !on.canTap || !on.canTap()) return;
    tap(tubeAt(e.clientX, e.clientY));
  });

  return {
    on, load, tap, undo, addTube, hint, restart, demo, stopDemo,
    setSlot(el) { slot = el; area = null; layout(true); },
    setSkins(b, t) { ballSkin = b || ballSkin; tubeSkin = t || tubeSkin; },
    setTheme(id) { theme = C.themes.find(t => t.id === id) || C.themes[0]; },
    step(dt) { update(dt); },
    renderNow() { render(); },
    tubeRect(i) { const L = lay[i]; return L ? { x: L.x, y: L.y, w: tw, h: th, r } : null; },
    get mode() { return mode; }, get moves() { return moves; }, get undoLeft() { return undoLeft; }, set undoLeft(v) { undoLeft = v; },
    get extraUsed() { return extraUsed; }, get won() { return won; }, get selected() { return sel; }, get historyLen() { return history.length; },
    get tubes() { return tubes.map(t => t.map(u => (u.hid ? "?" : "") + "abcdefghijkl"[u.c]).join("")); },
    get colors() { return colorsOf(); },
    get positions() { return tubes.map(t => t.map(u => [Math.round(u.x), Math.round(u.y)])); }   // test hook
  };
})();

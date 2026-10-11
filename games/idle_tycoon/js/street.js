/* ==========================================================================
   STREET — shops line up along roads, three per road. Traffic flows past;
   only customers pull over to the curb, stop right in front of the seller's
   window and order. Tap the car to serve it. Fast service earns a tip, a
   streak of happy customers builds a combo, and customers who wait too long
   drive off angry. Managers serve automatically.

   Street.create(econ, hooks) → { update(dt), serve(i), renderRoad(r, ctx, w, h), slotOf(i), … }
   hooks.sale(i, value, info) · hooks.angry(i, car)
   Logic uses road-relative coordinates (x: 0..1 along the road; lane 0 =
   traffic, 1 = curb), so it runs without a canvas and draws at any size.
   ========================================================================== */
if (typeof CanvasRenderingContext2D !== "undefined" && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    r = Math.max(0, Math.min(typeof r === "number" ? r : 0, Math.abs(w) / 2, Math.abs(h) / 2));
    this.moveTo(x + r, y); this.arcTo(x + w, y, x + w, y + h, r); this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r); this.arcTo(x, y, x + w, y, r); this.closePath();
  };
}

window.Street = (() => {
  const C = window.GAME_CONFIG, B = C.businesses, ST = C.street, TAU = Math.PI * 2;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const CAR_COLORS = ["#ff4d5e", "#3fa6ff", "#ffd23a", "#36d35a", "#9b5cff", "#ff9a2e", "#ff6fd2", "#2ec4b6", "#ffffff"];
  const SKINS = ["#ffd9b8", "#f2c08f", "#d99a6c", "#a8673f", "#7a4a2a", "#ffe0c7"];
  const HAIR = ["#2a1a10", "#6b3f1d", "#ffcf5a", "#c42a3a", "#1a1a2a", "#9a9aa8"];
  const TYPES = ["car", "car", "van", "pickup", "bug"];
  const PER_ROAD = 3, CAR_LEN = 0.14, SPEED = 0.26;
  // roads: consecutive businesses, three per road
  const ROADS = [];
  for (let i = 0; i < B.length; i += PER_ROAD) ROADS.push(Array.from({ length: PER_ROAD }, (_, k) => i + k));
  const roadOf = i => Math.floor(i / PER_ROAD), slotOf = i => i % PER_ROAD;
  const stopX = i => (slotOf(i) + 0.5) / PER_ROAD;      // right in front of the seller's window

  function newCar(target) {
    const r = Math.random(), count = r < 0.3 ? 1 : r < 0.65 ? 2 : r < 0.9 ? 3 : 4;
    return {
      x: -0.12, lane: 0, v: SPEED, target, type: pick(TYPES), color: pick(CAR_COLORS), skin: pick(SKINS), hair: pick(HAIR),
      count, patience: 1, maxWait: rand(ST.patience[0], ST.patience[1]), state: target >= 0 ? "drive" : "pass",
      waited: 0, blink: rand(0, 4), bob: rand(0, 6), mood: "calm", happyT: 0
    };
  }

  function create(econ, hooks = {}) {
    const shops = B.map(() => ({ next: rand(0.3, 1.5), parts: [], pass: null, worker: 0 }));
    const roads = ROADS.map(() => ({ cars: [], nextPass: rand(1, 3) }));
    let combo = 0, bestCombo = 0, served = 0, time = 0;

    const interval = i => Math.min(ST.maxInterval, Math.max(ST.minInterval, econ.cycleTime(i) * ST.intervalPerCycle));
    const customers = i => roads[roadOf(i)].cars.filter(c => c.target === i && (c.state === "drive" || c.state === "queued" || c.state === "wait"));
    const atWindow = i => roads[roadOf(i)].cars.find(c => c.target === i && c.state === "wait");

    function serve(i, auto = false) {
      const car = atWindow(i), sh = shops[i];
      if (!car) return null;
      const fast = !auto && car.patience >= ST.tipAbove;
      if (!auto) { combo++; bestCombo = Math.max(bestCombo, combo); }
      const comboBonus = auto ? 0 : Math.min(ST.comboMax, combo * ST.comboStep);
      const value = econ.perSec(i) * interval(i) * car.count / ST.avgOrder * (1 + (fast ? ST.tip : 0) + comboBonus);
      car.state = "served"; car.mood = "happy"; car.happyT = 0;
      sh.pass = { t: 0 }; sh.worker = 1; served++;
      for (let k = 0; k < 5; k++) sh.parts.push({ kind: k < 2 ? "heart" : "coin", x: stopX(i) + rand(-0.03, 0.03), y: 0.62, vx: rand(-0.08, 0.08), vy: rand(-0.9, -0.5), life: 1 });
      const info = { auto, tip: fast, combo: auto ? 0 : combo, comboBonus, count: car.count, x: stopX(i) };
      hooks.sale && hooks.sale(i, value, info);
      return info;
    }

    function update(dt) {
      time += dt;
      shops.forEach(sh => {
        if (sh.pass) { sh.pass.t += dt * 3.5; if (sh.pass.t >= 1) sh.pass = null; }
        sh.worker = Math.max(0, sh.worker - dt * 2);
        for (let k = sh.parts.length - 1; k >= 0; k--) { const p = sh.parts[k]; p.life -= dt * 1.2; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 0.9 * dt; if (p.life <= 0) sh.parts.splice(k, 1); }
      });
      roads.forEach((road, r) => {
        const open = ROADS[r].filter(i => i < B.length && econ.S.biz[i].n > 0);
        // customers for each open shop (at most one at the window + one waiting)
        open.forEach(i => {
          const sh = shops[i];
          sh.next -= dt;
          if (sh.next <= 0) {
            if (customers(i).length >= 2) sh.next = interval(i) * rand(0.7, 1.3);          // line is full: this one drives on
            else if (entryClear(road)) { road.cars.push(newCar(i)); sh.next = interval(i) * rand(0.7, 1.3); }
            // otherwise wait for a gap in traffic and try again next frame
          }
        });
        // passing traffic that never stops
        road.nextPass -= dt;
        const due = open.some(i => shops[i].next <= 0);       // customers go first
        if (road.nextPass <= 0 && !due) { road.nextPass = rand(1.6, 4.2); if (entryClear(road)) road.cars.push(newCar(-1)); }

        const cars = road.cars;
        cars.sort((a, b) => b.x - a.x);                  // front of the road first
        for (const c of cars) {
          c.bob += dt; c.blink -= dt; if (c.blink < -0.12) c.blink = rand(2, 5);
          let want = SPEED;
          if (c.state === "drive" || c.state === "queued") {
            const i = c.target, front = atWindow(i) && atWindow(i) !== c;
            const goal = front ? stopX(i) - CAR_LEN * 1.12 : stopX(i);
            const d = goal - c.x;
            if (d < 0.15) c.lane = Math.min(1, c.lane + dt * 3.5);       // pull over only at its own shop
            want = Math.max(0, Math.min(SPEED, d * 2.6));
            if (Math.abs(d) < 0.004) {
              c.x = goal; want = 0;
              if (!front && c.state !== "wait") { c.state = "wait"; c.waited = 0; }
              else if (front) c.state = "queued";
            } else if (c.state === "queued" && !front) c.state = "drive";
          } else if (c.state === "wait") {
            want = 0;
            c.waited += dt;
            c.patience = Math.max(0, 1 - c.waited / c.maxWait);
            c.mood = c.patience < 0.3 ? "angry" : c.patience < 0.6 ? "worried" : "calm";
            if (econ.hasMgr(c.target) && c.waited > ST.managerDelay) serve(c.target, true);
            else if (c.patience <= 0) {
              c.state = "angry"; c.mood = "angry"; c.happyT = 0; combo = 0;
              hooks.angry && hooks.angry(c.target, c);
            }
          } else if (c.state === "served" || c.state === "angry") {
            c.happyT += dt;
            if (c.happyT > (c.state === "angry" ? 0.45 : 0.35)) { c.state = "leave"; }
            want = 0;
          } else if (c.state === "leave") {
            c.lane = Math.max(0, c.lane - dt * 2.2);      // merge back into traffic
            want = SPEED * 1.3;
          }
          // keep a gap behind the car ahead in the same lane
          const ahead = cars.filter(o => o !== c && o.x > c.x && Math.abs(o.lane - c.lane) < 0.5);
          if (ahead.length) {
            const a = ahead.reduce((m, o) => o.x < m.x ? o : m), gap = a.x - c.x - CAR_LEN * 1.15;
            if (gap < 0.05) want = Math.min(want, Math.max(0, a.v * (gap / 0.05)));
          }
          c.v += (want - c.v) * Math.min(1, dt * 6);
          c.x += c.v * dt;
        }
        road.cars = cars.filter(c => c.x < 1.15);
      });
    }
    function entryClear(road) { return !road.cars.some(c => c.x < CAR_LEN * 0.6 && c.lane < 0.5); }

    return {
      update, serve,
      renderRoad: (r, x, w, h) => renderRoad(r, roads[r], shops, x, w, h, econ, time),
      frontWaiting: i => !!atWindow(i),
      cars: r => roads[r].cars,                          // test hook
      interval, roadOf, slotOf, stopX, ROADS,
      get combo() { return combo; }, get bestCombo() { return bestCombo; }, get served() { return served; },
      set served(v) { served = v; }, set bestCombo(v) { bestCombo = v; }
    };
  }

  // ---------- drawing ---------------------------------------------------------------
  const OUT = "#2a1a4a";
  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt));
    return `rgb(${c.join(",")})`;
  }
  function face(x, fx, fy, r, car, t) {
    x.fillStyle = car.mood === "angry" ? "#ff8a7a" : car.skin;
    x.beginPath(); x.arc(fx, fy, r, 0, TAU); x.fill();
    x.strokeStyle = OUT; x.lineWidth = r * 0.18; x.stroke();
    // hair tuft
    x.fillStyle = car.hair; x.beginPath(); x.arc(fx - r * 0.1, fy - r * 0.75, r * 0.62, Math.PI, 0); x.fill();
    const blink = car.blink < 0;
    const ex = [fx + r * 0.05, fx + r * 0.55], ey = fy - r * 0.1;
    ex.forEach(e => {
      if (blink || car.mood === "happy") { x.strokeStyle = OUT; x.lineWidth = r * 0.16; x.beginPath(); x.arc(e, ey + (car.mood === "happy" ? r * 0.08 : 0), r * 0.17, Math.PI * 1.1, Math.PI * 1.9); x.stroke(); }
      else { x.fillStyle = "#fff"; x.beginPath(); x.arc(e, ey, r * 0.22, 0, TAU); x.fill(); x.fillStyle = OUT; x.beginPath(); x.arc(e + r * 0.06, ey + r * 0.03, r * 0.12, 0, TAU); x.fill(); }
    });
    if (car.mood === "angry") { x.strokeStyle = OUT; x.lineWidth = r * 0.14; x.beginPath(); x.moveTo(ex[0] - r * 0.2, ey - r * 0.38); x.lineTo(ex[0] + r * 0.18, ey - r * 0.24); x.moveTo(ex[1] + r * 0.2, ey - r * 0.38); x.lineTo(ex[1] - r * 0.18, ey - r * 0.24); x.stroke(); }
    x.strokeStyle = OUT; x.lineWidth = r * 0.14; x.lineCap = "round"; x.beginPath();
    const mx = fx + r * 0.3, my = fy + r * 0.45;
    if (car.mood === "happy") { x.fillStyle = "#c42a3a"; x.arc(mx, my - r * 0.1, r * 0.28, 0.1, Math.PI - 0.1); x.closePath(); x.fill(); x.stroke(); }
    else if (car.mood === "angry") { x.arc(mx, my + r * 0.18, r * 0.24, Math.PI + 0.4, -0.4); x.stroke(); }
    else if (car.mood === "worried") { x.moveTo(mx - r * 0.2, my); x.quadraticCurveTo(mx, my - r * 0.12, mx + r * 0.2, my + r * 0.04); x.stroke(); }
    else { x.arc(mx, my - r * 0.14, r * 0.2, 0.3, Math.PI - 0.3); x.stroke(); }
    if (car.mood !== "angry") { x.fillStyle = "rgba(255,110,140,.45)"; x.beginPath(); x.ellipse(fx + r * 0.75, fy + r * 0.25, r * 0.16, r * 0.1, 0, 0, TAU); x.fill(); }
  }
  function wheel(x, cx, cy, r, rot) {
    x.fillStyle = "#24202e"; x.beginPath(); x.arc(cx, cy, r, 0, TAU); x.fill();
    x.fillStyle = "#c7cfdb"; x.beginPath(); x.arc(cx, cy, r * 0.5, 0, TAU); x.fill();
    x.strokeStyle = "#7f8798"; x.lineWidth = r * 0.16;
    for (let k = 0; k < 3; k++) { const a = rot + k * TAU / 3; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(a) * r * 0.48, cy + Math.sin(a) * r * 0.48); x.stroke(); }
  }
  // cartoon car facing right; (cx, ground) = middle of the car on the road
  function car(x, c, cx, ground, s, t) {
    const L = 84 * s, moving = c.v > 0.02;
    const bounce = moving ? Math.abs(Math.sin(c.bob * 14)) * 2.2 * s : Math.sin(c.bob * 3) * 0.8 * s;
    const squash = c.state === "served" && c.happyT < 0.3 ? Math.sin(c.happyT / 0.3 * Math.PI) * 0.08 : 0;
    const wr = 10 * s, wy = ground - wr, rot = c.x * 40;
    x.save();
    // shadow
    x.fillStyle = "rgba(0,0,0,.22)"; x.beginPath(); x.ellipse(cx, ground + 1, L * 0.52, 5 * s, 0, 0, TAU); x.fill();
    x.translate(cx, wy - bounce); x.scale(1 + squash, 1 - squash);
    x.lineJoin = "round"; x.lineWidth = 2.6 * s; x.strokeStyle = OUT;
    const body = c.color, dark = shade(body, -0.25);
    const glass = "#bfe9ff";
    if (c.type === "van") {
      x.fillStyle = body; x.beginPath(); x.roundRect(-L / 2, -46 * s, L * 0.98, 44 * s, 10 * s); x.fill(); x.stroke();
      x.fillStyle = glass; x.beginPath(); x.roundRect(L * 0.12, -40 * s, L * 0.3, 18 * s, 6 * s); x.fill(); x.stroke();
      x.beginPath(); x.roundRect(-L * 0.4, -40 * s, L * 0.44, 14 * s, 5 * s); x.fill(); x.stroke();
      face(x, L * 0.24, -30 * s, 7 * s, c, t);
      x.fillStyle = dark; x.fillRect(-L / 2 + 4 * s, -14 * s, L * 0.9, 3 * s);
    } else if (c.type === "pickup") {
      x.fillStyle = body; x.beginPath(); x.roundRect(-L / 2, -24 * s, L, 22 * s, 7 * s); x.fill(); x.stroke();
      x.beginPath(); x.moveTo(L * 0.02, -23 * s); x.lineTo(L * 0.06, -44 * s); x.quadraticCurveTo(L * 0.08, -47 * s, L * 0.14, -47 * s); x.lineTo(L * 0.3, -47 * s); x.lineTo(L * 0.42, -23 * s); x.closePath(); x.fill(); x.stroke();
      x.fillStyle = glass; x.beginPath(); x.moveTo(L * 0.12, -42 * s); x.lineTo(L * 0.29, -42 * s); x.lineTo(L * 0.36, -27 * s); x.lineTo(L * 0.1, -27 * s); x.closePath(); x.fill(); x.stroke();
      face(x, L * 0.22, -32 * s, 6.5 * s, c, t);
      x.fillStyle = dark; x.fillRect(-L * 0.46, -30 * s, L * 0.44, 7 * s); x.strokeRect(-L * 0.46, -30 * s, L * 0.44, 7 * s);
    } else if (c.type === "bug") {
      x.fillStyle = body; x.beginPath(); x.moveTo(-L * 0.48, -4 * s); x.bezierCurveTo(-L * 0.5, -36 * s, -L * 0.1, -52 * s, L * 0.12, -48 * s); x.bezierCurveTo(L * 0.36, -45 * s, L * 0.5, -26 * s, L * 0.49, -4 * s); x.closePath(); x.fill(); x.stroke();
      x.fillStyle = glass; x.beginPath(); x.moveTo(-L * 0.18, -26 * s); x.quadraticCurveTo(-L * 0.12, -42 * s, L * 0.08, -42 * s); x.quadraticCurveTo(L * 0.28, -40 * s, L * 0.32, -26 * s); x.closePath(); x.fill(); x.stroke();
      face(x, L * 0.12, -31 * s, 7 * s, c, t);
    } else {
      x.fillStyle = body; x.beginPath(); x.roundRect(-L / 2, -26 * s, L, 24 * s, 10 * s); x.fill(); x.stroke();
      x.beginPath(); x.moveTo(-L * 0.3, -25 * s); x.quadraticCurveTo(-L * 0.24, -47 * s, -L * 0.02, -47 * s); x.lineTo(L * 0.14, -47 * s); x.quadraticCurveTo(L * 0.3, -46 * s, L * 0.36, -25 * s); x.closePath(); x.fill(); x.stroke();
      x.fillStyle = glass; x.beginPath(); x.moveTo(-L * 0.04, -42 * s); x.lineTo(L * 0.13, -42 * s); x.quadraticCurveTo(L * 0.25, -41 * s, L * 0.3, -28 * s); x.lineTo(-L * 0.04, -28 * s); x.closePath(); x.fill(); x.stroke();
      x.beginPath(); x.moveTo(-L * 0.24, -28 * s); x.quadraticCurveTo(-L * 0.2, -42 * s, -L * 0.08, -42 * s); x.lineTo(-L * 0.08, -28 * s); x.closePath(); x.fill(); x.stroke();
      face(x, L * 0.1, -33 * s, 7 * s, c, t);
    }
    // shine, lights, bumper
    x.fillStyle = "rgba(255,255,255,.35)"; x.beginPath(); x.roundRect(-L * 0.42, -21 * s, L * 0.3, 4 * s, 2 * s); x.fill();
    x.fillStyle = "#fff6a8"; x.beginPath(); x.arc(L * 0.47, -16 * s, 3.4 * s, 0, TAU); x.fill(); x.lineWidth = 1.6 * s; x.stroke();
    x.fillStyle = "#ff4d5e"; x.fillRect(-L * 0.5, -18 * s, 3 * s, 5 * s);
    x.restore();
    wheel(x, cx - L * 0.28, wy - bounce * 0.3, wr, rot);
    wheel(x, cx + L * 0.28, wy - bounce * 0.3, wr, rot);
    // exhaust puffs while driving, steam when angry
    if (moving) { x.fillStyle = "rgba(255,255,255,.55)"; for (let k = 0; k < 3; k++) { const ph = (t * 3 + k / 3) % 1; x.globalAlpha = 0.6 * (1 - ph); x.beginPath(); x.arc(cx - L * 0.55 - ph * 18 * s, wy - 6 * s - ph * 8 * s, (3 + ph * 5) * s, 0, TAU); x.fill(); } x.globalAlpha = 1; }
    if (c.mood === "angry") { x.fillStyle = "rgba(255,255,255,.75)"; for (let k = 0; k < 2; k++) { const ph = (t * 2 + k / 2) % 1; x.globalAlpha = 1 - ph; x.beginPath(); x.arc(cx + L * 0.1 + (k ? 8 : -8) * s, ground - 62 * s - ph * 16 * s, (3 + ph * 4) * s, 0, TAU); x.fill(); } x.globalAlpha = 1; }
  }
  function bubble(x, c, cx, top, s, emoji, needTap, t) {
    const pulse = needTap ? 1 + Math.sin(t * 7) * 0.05 : 1;
    const w = 66 * s, h = 34 * s;
    x.save(); x.translate(cx, top); x.scale(pulse, pulse);
    x.fillStyle = "#ffffff"; x.strokeStyle = OUT; x.lineWidth = 2.4 * s;
    x.beginPath(); x.roundRect(-w / 2, -h, w, h, 12 * s); x.fill(); x.stroke();
    x.beginPath(); x.moveTo(-6 * s, -1); x.lineTo(2 * s, 9 * s); x.lineTo(7 * s, -1); x.closePath(); x.fill(); x.stroke();
    x.fillStyle = "#fff"; x.fillRect(-5 * s, -3 * s, 11 * s, 4 * s);
    x.font = `${Math.round(19 * s)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    x.textAlign = "center"; x.textBaseline = "middle"; x.fillStyle = "#000";
    x.fillText(emoji, -12 * s, -h / 2 + 1);
    x.font = `${Math.round(17 * s)}px "Lilita One", sans-serif`; x.fillStyle = OUT;
    x.fillText("×" + c.count, 15 * s, -h / 2 + 1);
    // patience bar
    const p = c.patience, bw = w - 14 * s;
    x.fillStyle = "#e6dff5"; x.beginPath(); x.roundRect(-bw / 2, -h - 9 * s, bw, 5 * s, 2.5 * s); x.fill();
    x.fillStyle = p > 0.6 ? "#36d35a" : p > 0.3 ? "#ffb300" : "#ff4d5e";
    x.beginPath(); x.roundRect(-bw / 2, -h - 9 * s, Math.max(3 * s, bw * p), 5 * s, 2.5 * s); x.fill();
    x.restore();
  }
  // one storefront in its third of the road; returns where the seller stands
  function storefront(x, i, cx, sw, g, bs, sh, t, econ) {
    const b = B[i], owned = econ.S.biz[i].n, left = cx - sw * 0.44, bw = sw * 0.88;
    const room = Math.max(0, Math.floor((g - 40 * bs - 30 * bs) / (14 * bs)));
    const floors = Math.max(0, Math.min(2, room, Math.floor(Math.log2(owned + 1) / 2.6)));
    const gf = g - 40 * bs, top = gf - floors * 14 * bs;
    x.lineJoin = "round"; x.strokeStyle = OUT;
    if (floors) {
      x.fillStyle = shade(b.color, -0.12); x.lineWidth = 2 * bs;
      x.beginPath(); x.roundRect(left + 5 * bs, top, bw - 10 * bs, gf - top + 2, 5 * bs); x.fill(); x.stroke();
      for (let f = 0; f < floors; f++) for (let k = 0; k < 3; k++) {
        x.fillStyle = "#bfe9ff"; x.lineWidth = 1.3 * bs;
        x.beginPath(); x.roundRect(left + 12 * bs + k * (bw - 24 * bs) / 3, top + 3 * bs + f * 14 * bs, (bw - 36 * bs) / 3, 8 * bs, 2 * bs); x.fill(); x.stroke();
      }
    }
    x.lineWidth = 2 * bs;
    x.fillStyle = shade(b.color, 0.55); x.beginPath(); x.roundRect(left, gf, bw, 40 * bs, 4 * bs); x.fill(); x.stroke();
    // seller window in the middle, a car stops right below it
    const ww = bw * 0.46, wx = cx - ww / 2, wy = gf + 12 * bs, wh = 20 * bs;
    x.fillStyle = "#3a2f5a"; x.beginPath(); x.roundRect(wx, wy, ww, wh, 3 * bs); x.fill(); x.stroke();
    const wkY = wy + wh * 0.62 - sh.worker * 3 * bs;
    x.fillStyle = "#ffd9b8"; x.lineWidth = 1.3 * bs; x.beginPath(); x.arc(cx, wkY, 6 * bs, 0, TAU); x.fill(); x.stroke();
    x.fillStyle = "#fff"; x.beginPath(); x.roundRect(cx - 6 * bs, wkY - 12 * bs, 12 * bs, 6 * bs, 2.5 * bs); x.fill(); x.stroke();
    x.fillStyle = OUT; [-2, 2].forEach(d => { x.beginPath(); x.arc(cx + d * bs, wkY - 0.8 * bs, 1 * bs, 0, TAU); x.fill(); });
    x.beginPath(); x.arc(cx, wkY + 1.8 * bs, 2 * bs, 0.2, Math.PI - 0.2); x.lineWidth = 1.1 * bs; x.stroke();
    x.fillStyle = shade(b.color, -0.3); x.fillRect(wx - 2 * bs, wy + wh - 3 * bs, ww + 4 * bs, 4 * bs);
    // little door
    x.fillStyle = shade(b.color, -0.35); x.lineWidth = 1.6 * bs;
    x.beginPath(); x.roundRect(left + bw * 0.8, gf + 16 * bs, bw * 0.13, 24 * bs, 2 * bs); x.fill(); x.stroke();
    // striped awning
    const ay = gf - 3 * bs, aw = bw + 6 * bs, ax = left - 3 * bs, n = 5;
    for (let k = 0; k < n; k++) {
      x.fillStyle = k % 2 ? "#ffffff" : b.color;
      x.beginPath(); x.moveTo(ax + k * aw / n, ay); x.lineTo(ax + (k + 1) * aw / n, ay); x.lineTo(ax + (k + 1) * aw / n, ay + 7 * bs);
      x.arc(ax + (k + 0.5) * aw / n, ay + 7 * bs, aw / n / 2, 0, Math.PI); x.closePath(); x.fill();
    }
    x.lineWidth = 1.6 * bs; x.strokeStyle = OUT; x.strokeRect(ax, ay - 1, aw, 8 * bs);
    // sign
    const sy = top - 3 * bs;
    x.fillStyle = "#fff"; x.lineWidth = 1.8 * bs; x.beginPath(); x.roundRect(cx - 14 * bs, sy - 20 * bs, 28 * bs, 20 * bs, 6 * bs); x.fill(); x.stroke();
    emojiAt(x, b.emoji, cx, sy - 10 * bs, 15 * bs);
    if (econ.hasMgr(i)) emojiAt(x, b.manager.emoji, left + 8 * bs, g - 6 * bs + Math.sin(t * 4 + i) * 1.2 * bs, 15 * bs);
    return { winX: cx, winY: wy + wh * 0.5 };
  }
  function emojiAt(x, e, cx, cy, size) {
    x.font = `${Math.round(size)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    x.textAlign = "center"; x.textBaseline = "middle"; x.fillStyle = "#000"; x.fillText(e, cx, cy);
  }
  function emptyLot(x, cx, sw, g, bs, kind) {
    x.fillStyle = "#9ad66a"; x.fillRect(cx - sw * 0.46, g - 5 * bs, sw * 0.92, 5 * bs);
    x.strokeStyle = OUT; x.lineWidth = 1.8 * bs;
    if (kind === "sale") {
      x.fillStyle = "#7a4a24"; x.fillRect(cx - 2 * bs, g - 30 * bs, 4 * bs, 30 * bs);
      x.fillStyle = "#fff"; x.beginPath(); x.roundRect(cx - 28 * bs, g - 46 * bs, 56 * bs, 20 * bs, 4 * bs); x.fill(); x.stroke();
      x.fillStyle = "#c42a3a"; x.font = `${Math.round(10.5 * bs)}px "Lilita One", sans-serif`; x.textAlign = "center"; x.textBaseline = "middle";
      x.fillText("FOR SALE", cx, g - 36 * bs);
    } else if (kind === "soon") {
      x.fillStyle = "#d9a066";
      for (let k = -3; k <= 3; k++) { x.beginPath(); x.roundRect(cx + k * 10 * bs - 3 * bs, g - 22 * bs, 6 * bs, 22 * bs, 2 * bs); x.fill(); x.stroke(); }
      x.fillRect(cx - 34 * bs, g - 16 * bs, 68 * bs, 3 * bs);
      x.fillStyle = "#fff"; x.beginPath(); x.arc(cx, g - 32 * bs, 9 * bs, 0, TAU); x.fill(); x.stroke();
      x.fillStyle = OUT; x.font = `${Math.round(12 * bs)}px "Lilita One", sans-serif`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("?", cx, g - 31.5 * bs);
    } else {           // park
      x.fillStyle = "#7a4a24"; x.fillRect(cx + 10 * bs, g - 20 * bs, 4 * bs, 20 * bs);
      x.fillStyle = "#3fbf4a"; x.beginPath(); x.arc(cx + 12 * bs, g - 26 * bs, 11 * bs, 0, TAU); x.fill(); x.stroke();
      x.fillStyle = "#c98a4a"; x.fillRect(cx - 22 * bs, g - 9 * bs, 22 * bs, 3 * bs); x.fillRect(cx - 20 * bs, g - 6 * bs, 2 * bs, 6 * bs); x.fillRect(cx - 4 * bs, g - 6 * bs, 2 * bs, 6 * bs);
    }
  }

  function renderRoad(r, road, shops, x, w, h, econ, t) {
    const bs = Math.min(h / 160, w / 360), g = h * 0.52, sw = w / PER_ROAD;
    const curbY = h * 0.8, passY = h * 0.985, cs = bs * 0.6;
    // sky + clouds
    const sky = x.createLinearGradient(0, 0, 0, g);
    sky.addColorStop(0, "#7cc8ff"); sky.addColorStop(1, "#d9f1ff");
    x.fillStyle = sky; x.fillRect(0, 0, w, g);
    x.fillStyle = "rgba(255,255,255,.9)";
    for (let k = 0; k < 4; k++) { const cx = ((k * 0.29 + t * 0.01 + r * 0.17) % 1.3 - 0.15) * w, cy = (10 + (k % 2) * 9) * bs; [[0, 0, 8], [9, 3, 6], [-9, 3, 5]].forEach(([dx, dy, rr]) => { x.beginPath(); x.arc(cx + dx * bs, cy + dy * bs, rr * bs, 0, TAU); x.fill(); }); }
    // buildings
    const firstLocked = econ.S.biz.findIndex(b => !b.n);
    const wins = {};
    ROADS[r].forEach((i, k) => {
      const cx = (k + 0.5) * sw;
      if (i >= B.length) return emptyLot(x, cx, sw, g, bs, "park");
      if (econ.S.biz[i].n) wins[i] = storefront(x, i, cx, sw, g, bs, shops[i], t, econ);
      else emptyLot(x, cx, sw, g, bs, i === firstLocked ? "sale" : "soon");
    });
    // sidewalk with lamp posts
    x.fillStyle = "#cfd6e4"; x.fillRect(0, g, w, h * 0.06);
    x.fillStyle = "#b3bccd"; for (let k = 0; k < w; k += 18 * bs) x.fillRect(k, g, 1.2, h * 0.06);
    // road: curb lane (top, where customers stop) + traffic lane (bottom)
    x.fillStyle = "#4a4f6a"; x.fillRect(0, g + h * 0.06, w, h);
    x.fillStyle = "rgba(255,255,255,.65)"; for (let k = 0; k < w; k += 26 * bs) x.fillRect(k, h * 0.84, 12 * bs, 2.2 * bs);
    // cars: curb lane first (further away), then traffic
    const cars = road.cars.slice().sort((a, b) => b.lane - a.lane);
    cars.forEach(c => car(x, c, c.x * w, passY + (curbY - passY) * c.lane, cs, t));
    // the order flying from the window to the car
    ROADS[r].forEach(i => {
      const sh = shops[i]; if (!sh || !sh.pass || !wins[i]) return;
      const p = sh.pass.t, wx = wins[i].winX, wy = wins[i].winY;
      emojiAt(x, B[i].emoji, wx, wy + (curbY - 24 * cs - wy) * p - Math.sin(p * Math.PI) * 14 * bs, 14 * bs);
    });
    // order bubbles on top
    // (the bubble sits between the seller's window and the car roof)
    cars.forEach(c => { if (c.state === "wait") bubble(x, c, c.x * w + 4 * cs, curbY - 50 * cs, cs, B[c.target].emoji, !econ.hasMgr(c.target), t); });
    // hearts & coins
    ROADS[r].forEach(i => {
      const sh = shops[i]; if (!sh) return;
      sh.parts.forEach(p => {
        x.globalAlpha = Math.max(0, Math.min(1, p.life * 1.5));
        const px = p.x * w, py = p.y * h;
        if (p.kind === "heart") { x.fillStyle = "#ff4d7a"; x.beginPath(); x.moveTo(px, py + 4 * bs); x.bezierCurveTo(px - 7 * bs, py - 2 * bs, px - 3 * bs, py - 7 * bs, px, py - 3 * bs); x.bezierCurveTo(px + 3 * bs, py - 7 * bs, px + 7 * bs, py - 2 * bs, px, py + 4 * bs); x.fill(); }
        else { x.fillStyle = "#ffcf33"; x.strokeStyle = "#b37a00"; x.lineWidth = 1.2 * bs; x.beginPath(); x.ellipse(px, py, 4.5 * bs * Math.abs(Math.cos(p.life * 8)) + 1, 4.5 * bs, 0, 0, TAU); x.fill(); x.stroke(); }
      });
    });
    x.globalAlpha = 1;
  }

  return { create, ROADS, PER_ROAD };
})();

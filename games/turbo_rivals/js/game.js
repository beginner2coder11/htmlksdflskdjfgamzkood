/* ==========================================================================
   TURBO RIVALS — pseudo-3D racing engine
   Classic segment road: the track is a list of 200-unit segments, each with
   a curve amount and an elevation. Every frame the next ~220 segments are
   projected from a camera behind your car, drawn near-to-far with hill
   clipping, then props and cars are drawn far-to-near on top.
   ========================================================================== */
window.Game = (() => {
  const C = window.GAME_CONFIG, TAU = Math.PI * 2;
  const cv = document.getElementById("view"), ctx = cv.getContext("2d");
  const SEG = 200, ROAD = 2000, RUMBLE = 3, LANES = 3, FOV = 100, CAM_H = 1000, DRAW = 220;
  const DEPTH = 1 / Math.tan((FOV / 2) * Math.PI / 180), PZ = CAM_H * DEPTH, BASE_MAX = SEG * 60;
  const CAR_W = 0.42 * ROAD;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeIn = (a, b, p) => a + (b - a) * p * p, easeInOut = (a, b, p) => a + (b - a) * (-Math.cos(p * Math.PI) / 2 + 0.5);
  const hex = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const rgb = (c, al = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${al})`;
  const shade = (h, k) => { const c = hex(h); const t = k < 0 ? [20, 16, 40] : [255, 255, 255], m = Math.abs(k); return rgb([c[0] + (t[0] - c[0]) * m, c[1] + (t[1] - c[1]) * m, c[2] + (t[2] - c[2]) * m]); };
  const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const OUT = "#1a1528";

  /* ---------- canvas ---------- */
  let W = 1, H = 1, DPR = 1, U = 1, V = 1, HOR = 1;
  function resize() {
    DPR = Math.min(devicePixelRatio || 1, 2); W = Math.max(1, innerWidth); H = Math.max(1, innerHeight);
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); cv.style.width = W + "px"; cv.style.height = H + "px";
    U = Math.min(W * 0.46, H * 0.42); V = H * 0.46; HOR = H * 0.4;
  }
  addEventListener("resize", resize);

  /* ---------- state ---------- */
  const on = {};
  let segs = [], trackLen = 0, finishZ = 0, venue = C.venues[0], L = C.levels[0], rng = Math.random;
  let mode = "attract", bot = true, car = C.cars[0], paint = null, up = { engine: 0, turbo: 0, tires: 0, nitro: 0 };
  let pos = 0, speed = 0, px = 0, tx = 0, maxSpeed = BASE_MAX, throttle = false, skyOff = 0, time = 0, raceT = 0, countdown = 0;
  let nitro = 0, nitroT = 0, spinT = 0, airY = 0, airV = 0, shake = 0, bumpT = 0, rivals = [], parts = [], floats = [], finished = false, place = 0, overtakes = 0, lastRank = 5, endT = 0, skid = false;

  /* ---------- track building ---------- */
  function lastY() { return segs.length ? segs[segs.length - 1].p2.world.y : 0; }
  function addSeg(curve, y) {
    const n = segs.length;
    segs.push({ index: n, p1: { world: { y: lastY(), z: n * SEG }, cam: {}, scr: {} }, p2: { world: { y, z: (n + 1) * SEG }, cam: {}, scr: {} }, curve, sprites: [], hz: null, dark: Math.floor(n / RUMBLE) % 2 });
  }
  function addRoad(enter, hold, leave, curve, hill) {
    const sy = lastY(), ey = sy + hill * SEG, tot = enter + hold + leave;
    for (let n = 0; n < enter; n++) addSeg(easeIn(0, curve, n / enter), easeInOut(sy, ey, n / tot));
    for (let n = 0; n < hold; n++) addSeg(curve, easeInOut(sy, ey, (enter + n) / tot));
    for (let n = 0; n < leave; n++) addSeg(easeInOut(curve, 0, n / leave), easeInOut(sy, ey, (enter + hold + n) / tot));
  }
  function build() {
    segs = []; rng = mulberry(L.seed);
    addRoad(0, 50, 0, 0, 0);
    while (segs.length < L.length - 80) {
      const r = rng(), c = (2 + rng() * 4) * L.curves * (rng() < 0.5 ? -1 : 1), h = (rng() * 2 - 1) * 50 * L.hills;
      const e = 20 + Math.floor(rng() * 30), hold = 20 + Math.floor(rng() * 40);
      if (r < 0.2) addRoad(10, 25 + Math.floor(rng() * 50), 10, 0, h * 0.5);
      else if (r < 0.55) addRoad(e, hold, e, c, rng() < 0.5 ? h : 0);
      else if (r < 0.75) { addRoad(e, hold * 0.6 | 0, e, c, 0); addRoad(e, hold * 0.6 | 0, e, -c, h); }
      else addRoad(25, 20, 25, 0, h * 1.4);
    }
    addRoad(30, 60, 30, 0, -lastY() / SEG);
    finishZ = (segs.length - 20) * SEG;
    addRoad(0, 300, 0, 0, 0);
    trackLen = segs.length * SEG;
    // roadside props
    const props = venue.props;
    for (let i = 20; i < segs.length - 10; i += 6 + Math.floor(rng() * 8)) {
      for (const side of [-1, 1]) {
        if (rng() < 0.25) continue;
        const kind = props[Math.floor(rng() * props.length)];
        const off = side * (1.35 + rng() * (kind === "mesa" || kind === "tower" || kind === "crane" ? 2.5 : 1.2));
        segs[i].sprites.push({ kind, off, seed: rng() });
      }
    }
    for (let i = 8; i < segs.length; i += 8) for (const side of [-1, 1]) segs[i].sprites.push({ kind: "post", off: side * 1.14, seed: 0 });
    if (venue.gantry) for (let i = 120; i < segs.length - 50; i += 140 + Math.floor(rng() * 80)) segs[i].sprites.push({ kind: "gantry", off: 0, seed: rng(), span: true });
    // hazards and helpers on the road, spaced out
    let i = 90;
    while (i < Math.floor(finishZ / SEG) - 40) {
      i += Math.floor(lerp(70, 34, L.hazards / 1.2) + rng() * 30);
      if (i >= Math.floor(finishZ / SEG) - 40) break;
      const r = rng(), lane = [-0.66, 0, 0.66][Math.floor(rng() * 3)];
      if (r < 0.3) segs[i].hz = { type: "boost", x: lane };
      else if (r < 0.45) segs[i].hz = { type: "ramp", x: lane };
      else if (r < 0.75) segs[i].hz = { type: "cones", x: lane, hit: false };
      else segs[i].hz = { type: "oil", x: lane };
    }
    segs[Math.floor(finishZ / SEG)].finish = true;
    segs[52].start = true;
  }
  const segAt = z => segs[Math.floor(z / SEG) % segs.length];

  /* ---------- race setup ---------- */
  function stat(k) { return car[k] + (k === "accel" ? up.turbo : k === "grip" ? up.tires : k === "nitro" ? up.nitro : 0); }
  function topSpeed() { return BASE_MAX * (car.top * (1 + up.engine * 0.04)) / 240; }
  function setup(levelIdx, asBot) {
    L = C.levels[clamp(levelIdx, 0, C.levels.length - 1)]; venue = C.venues[L.venue];
    build();
    pos = 50 * SEG - PZ; speed = 0; px = 0.33; tx = px; nitro = 0.25; nitroT = 0; spinT = 0; airY = 0; airV = 0; shake = 0; finished = false; place = 0; overtakes = 0; lastRank = 5; raceT = 0; endT = 0; parts = []; floats = [];
    maxSpeed = topSpeed();
    const names = C.rivals.slice().sort(() => rng() - 0.5).slice(0, 4);
    const baseTop = BASE_MAX * 210 / 240;   // rivals are tuned against a fixed reference car, so better cars and upgrades really help
    rivals = names.map((r, k) => ({ name: r.name, color: r.color, z: pos + PZ + (k + 1) * 6 * SEG, x: k % 2 ? -0.33 : 0.33, tx: k % 2 ? -0.33 : 0.33, speed: 0, max: baseTop * L.ai * (0.95 + k * 0.025 + rng() * 0.03), finished: false, place: 0, prefer: [-0.6, 0, 0.6][Math.floor(rng() * 3)], body: ["sport", "muscle", "hatch"][k % 3], swerve: 0 }));
    bot = !!asBot;
  }
  function attract() { mode = "attract"; setup(Math.floor(Math.random() * 3) * 10, true); countdown = 0; mode = "attract"; }
  function start(levelIdx, opts = {}) { setup(levelIdx, opts.bot); mode = "countdown"; countdown = 3.99; lightStep = 4; Sound.engineOn(); on.start && on.start(L); }
  let lightStep = 4;

  /* ---------- input ---------- */
  let drag = null;
  const keys = {};
  cv.addEventListener("pointerdown", e => { Sound.unlock(); drag = { id: e.pointerId, x0: e.clientX, tx0: tx }; throttle = true; try { cv.setPointerCapture(e.pointerId); } catch (er) {} });
  cv.addEventListener("pointermove", e => { if (drag && e.pointerId === drag.id) tx = clamp(drag.tx0 + (e.clientX - drag.x0) / (W * 0.33), -1.25, 1.25); });
  const end = e => { if (drag && e.pointerId === drag.id) { drag = null; throttle = false; } };
  cv.addEventListener("pointerup", end); cv.addEventListener("pointercancel", end);
  addEventListener("keydown", e => { keys[e.key] = true; if (e.key === " ") { e.preventDefault(); fireNitro(); } if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) e.preventDefault(); });
  addEventListener("keyup", e => { keys[e.key] = false; });
  function fireNitro() { if ((mode === "race") && nitro >= 0.999 && nitroT <= 0) { nitroT = 2.2 + stat("nitro") * 0.15; nitro = 0; Sound.play("nitro"); shake = 0.3; on.nitro && on.nitro(); } }

  /* ---------- update ---------- */
  function rankOf() { const pz = pos + PZ; return 1 + rivals.filter(r => r.finished ? !finished || r.place < place : r.z > pz).length; }
  function update(dt) {
    time += dt;
    if (mode === "paused") return;
    if (mode === "countdown") {
      countdown -= dt; const step = Math.ceil(countdown);
      if (step !== lightStep) { lightStep = step; if (step > 0) Sound.play("beep"); else Sound.play("go"); }
      Sound.engine(0, throttle || keys.ArrowUp, false);
      if (countdown <= 0) { mode = "race"; raceT = 0; }
      return;
    }
    const racing = mode === "race" || mode === "attract", done = mode === "done";
    if (racing || done) raceT += dt;
    // controls
    let gas = throttle || keys.ArrowUp || keys.w;
    if (keys.ArrowLeft || keys.a) tx = clamp(tx - dt * 2.2, -1.25, 1.25);
    if (keys.ArrowRight || keys.d) tx = clamp(tx + dt * 2.2, -1.25, 1.25);
    if (bot || done) { botDrive(dt); gas = !done || endT < 1.5; }
    if (done && endT >= 1.5) speed = Math.max(0, speed - maxSpeed * 0.7 * dt);   // pull up after the finish line
    const seg = segAt(pos + PZ), sp = speed / maxSpeed, dxs = dt * 2.4 * Math.max(0.25, sp);
    const grip = stat("grip"), accel = maxSpeed / (6.2 - stat("accel") * 0.3);
    // steering toward the finger, limited by grip; corners push you outward
    const steer = clamp(tx - px, -dxs * (0.8 + grip * 0.06), dxs * (0.8 + grip * 0.06));
    if (airY <= 0) px += steer;
    const cent = 0.34 - grip * 0.014;
    px -= dxs * sp * seg.curve * cent;
    skid = airY <= 0 && sp > 0.55 && Math.abs(seg.curve) > 3 && Math.abs(steer) > dxs * 0.5;
    if (spinT > 0) { spinT -= dt; px += Math.sin(time * 18) * dt * 1.2; }
    // speed
    const nitroK = nitroT > 0 ? 1.35 : 1, top = maxSpeed * nitroK;
    if (gas && spinT <= 0) speed += accel * (nitroT > 0 ? 2 : 1) * dt * (1 - 0.6 * (speed / top) ** 2);
    else speed -= maxSpeed / 4 * dt;
    if (Math.abs(px) > 1.02 && airY <= 0) {   // off the road: drag you down to a third of top speed, but you can always keep driving
      const cap = maxSpeed * 0.34;
      if (speed > cap) speed = Math.max(cap, speed - maxSpeed * 1.1 * dt);
      if (speed > maxSpeed * 0.1 && Math.random() < 0.4) dirt();
    }
    speed = clamp(speed, 0, top * 1.05);
    px = clamp(px, -1.6, 1.6);
    nitroT = Math.max(0, nitroT - dt);
    // jumps
    if (airY > 0 || airV > 0) { airV -= 2600 * dt; airY += airV * dt; if (airY <= 0) { airY = 0; airV = 0; Sound.play("land"); shake = 0.35; sparks(14); } }
    // move
    const prevZ = pos + PZ;
    pos = Math.min(pos + speed * dt, trackLen - PZ - SEG * 2);
    const pz = pos + PZ;
    // hazards on segments we passed over
    for (let z = Math.floor(prevZ / SEG); z <= Math.floor(pz / SEG); z++) { const s = segs[z]; if (s && s.hz) hazard(s.hz, z); }
    // rivals
    for (const r of rivals) rivalDrive(r, dt);
    // bumping rivals
    for (const r of rivals) {
      const dz = r.z - pz;
      if (Math.abs(dz) < SEG * 1.4 && Math.abs(r.x - px) < 0.42 * 0.9 && airY < 80) {
        if (dz > 0) { speed = Math.min(speed, r.speed * 0.9); r.speed *= 1.02; } else { r.speed = Math.min(r.speed, speed * 0.9); }
        const push = r.x > px ? -1 : 1; px += push * 0.06; r.x -= push * 0.06;
        if (bumpT <= 0) { Sound.play("bump"); shake = 0.45; bumpT = 0.4; sparks(10); }
      }
      // drafting fills nitro
      if (dz > SEG * 2 && dz < SEG * 14 && Math.abs(r.x - px) < 0.35) nitro = Math.min(1, nitro + dt * 0.12 * (1 + stat("nitro") * 0.06));
    }
    bumpT = Math.max(0, bumpT - dt);
    nitro = Math.min(1, nitro + dt * 0.012 * (gas ? 1 : 0));
    // overtakes and rank
    const rank = rankOf();
    if (racing && rank < lastRank && raceT > 1) { overtakes += lastRank - rank; if (mode === "race") { Sound.play("pass"); nitro = Math.min(1, nitro + 0.12); floatText(rank === 1 ? "1ST PLACE!" : "OVERTAKE!", rank === 1 ? "#ffd23f" : "#7fe8ff"); } }
    lastRank = rank;
    // finish
    if (!finished && pz >= finishZ) {
      finished = true; place = 1 + rivals.filter(r => r.finished).length;
      if (mode === "race") { mode = "done"; endT = 0; Sound.play(place <= 3 ? "win" : "lose"); confetti(); setTimeout(() => on.finish && on.finish({ place, overtakes, time: raceT, level: L }), 1800); }
      if (window.__audit && bot) window.__audit.push({ lvl: L.n, place, t: raceT.toFixed(1) });
    }
    if (mode === "attract" && (finished || pz > finishZ)) attract();
    if (done) endT += dt;
    skyOff += seg.curve * sp * dt * 0.02;
    Sound.engine(speed / maxSpeed, gas, skid);
    if (skid && Math.random() < 0.5) smoke();
    for (const p of parts) { p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.g || 0) * dt; }
    parts = parts.filter(p => p.life < p.max);
    floats.forEach(f => f.t += dt); floats = floats.filter(f => f.t < 1.2);
    shake = Math.max(0, shake - dt * 1.8);
  }
  function hazard(h, z) {
    if (Math.abs(px - h.x) > 0.36) return;
    if (h.type === "boost") { if (airY > 0) return; speed = Math.min(maxSpeed * 1.3, speed * 1.18 + maxSpeed * 0.08); nitro = Math.min(1, nitro + 0.3); Sound.play("boost"); floatText("BOOST!", "#3fd58a"); }
    else if (h.type === "ramp") { if (airY > 0 || speed < maxSpeed * 0.3) return; airV = 900 + speed / maxSpeed * 900; airY = 1; Sound.play("jump"); floatText("AIR!", "#ffd23f"); nitro = Math.min(1, nitro + 0.1); }
    else if (h.type === "cones") { if (airY > 60 || h.hit) return; h.hit = true; speed *= 0.62; Sound.play("cone"); shake = 0.3; }
    else if (h.type === "oil") { if (airY > 0 || spinT > 0) return; spinT = 0.9; speed *= 0.85; Sound.play("oil"); floatText("OIL!", "#b8b0c8"); }
  }
  function rivalDrive(r, dt) {
    if (mode === "countdown") return;
    const seg = segAt(r.z), pz = pos + PZ;
    let target = r.max * (1 - Math.abs(seg.curve) * 0.012);
    const ahead = (r.z - pz) / SEG;                                 // rubber band, gentle
    if (ahead > 60) target *= 0.95; else if (ahead < -50) target *= 1.06;
    if (r.finished) target = r.max * 0.6;
    r.speed += (target - r.speed) * dt * 0.7 + (r.speed < target ? r.max / 7 * dt * 0.3 : 0);
    // steer: preferred line, around cones/oil and other cars
    let want = r.prefer;
    for (let k = 3; k < 30; k++) { const s = segs[Math.floor(r.z / SEG) + k]; if (s && s.hz && (s.hz.type === "cones" || s.hz.type === "oil") && Math.abs(s.hz.x - want) < 0.5) { want = s.hz.x > 0 ? s.hz.x - 0.7 : s.hz.x + 0.7; break; } }
    for (const o of [...rivals.filter(q => q !== r), { z: pz, x: px }]) { const dz = o.z - r.z; if (dz > 0 && dz < SEG * 8 && Math.abs(o.x - r.x) < 0.4) { want = o.x > 0 ? o.x - 0.55 : o.x + 0.55; } }
    r.tx += (clamp(want, -0.85, 0.85) - r.tx) * dt * 2;
    r.x += clamp(r.tx - r.x, -dt * 1.1, dt * 1.1);
    if (Math.random() < dt * 0.15) r.prefer = [-0.6, 0, 0.6][Math.floor(Math.random() * 3)];
    const oz = r.z; r.z += r.speed * dt;
    // rivals hit hazards too
    for (let z = Math.floor(oz / SEG); z <= Math.floor(r.z / SEG); z++) { const s = segs[z]; if (s && s.hz && Math.abs(s.hz.x - r.x) < 0.3) { if (s.hz.type === "cones") r.speed *= 0.8; if (s.hz.type === "boost") r.speed *= 1.1; } }
    if (!r.finished && r.z >= finishZ) { r.finished = true; r.place = 1 + rivals.filter(q => q.finished && q !== r).length + (finished ? 1 : 0); }
  }
  // autopilot: used on the title screen, after the finish, and for the level audit
  function botDrive(dt) {
    const base = Math.floor((pos + PZ) / SEG);
    let want = 0;
    for (let k = 2; k < 40; k++) { const s = segs[base + k]; if (!s || !s.hz) continue; const bad = s.hz.type === "cones" || s.hz.type === "oil", good = s.hz.type === "boost" || s.hz.type === "ramp"; if (bad && Math.abs(s.hz.x - want) < 0.5) { want = s.hz.x > 0 ? s.hz.x - 0.66 : s.hz.x + 0.66; break; } if (good && k < 25) { want = s.hz.x; break; } }
    for (const r of rivals) { const dz = (r.z - pos - PZ) / SEG; if (dz > 0 && dz < 10 && Math.abs(r.x - want) < 0.45) want = r.x > 0 ? r.x - 0.6 : r.x + 0.6; }
    // lean into curves a little to fight the outward push
    const c = (segs[base + 5] || segs[base] || segs[segs.length - 1]).curve; want += c * 0.04;
    tx += (clamp(want, -0.85, 0.85) - tx) * dt * 3;
    if (nitro >= 0.999 && Math.abs(c) < 2 && mode !== "done") { if (mode === "race") fireNitro(); else { nitroT = 2.5; nitro = 0; } }
  }

  /* ---------- effects ---------- */
  function sparks(n) { for (let i = 0; i < n; i++) parts.push({ x: W / 2 + (Math.random() - 0.5) * U * 0.5, y: H * 0.85, vx: (Math.random() - 0.5) * 300, vy: -100 - Math.random() * 200, g: 600, life: 0, max: 0.5, c: "#ffd23f", r: 2 }); }
  function smoke() { const cx = W / 2 + (px - camX()) * 0, s = carScreen(); for (const sx of [-1, 1]) parts.push({ x: s.x + sx * s.w * 0.36, y: s.y - 4, vx: (Math.random() - 0.5) * 40, vy: -20 - Math.random() * 30, life: 0, max: 0.7, c: "rgba(230,230,240,0.5)", r: 8, smoke: true }); }
  function dirt() { const s = carScreen(); parts.push({ x: s.x + (Math.random() - 0.5) * s.w * 0.8, y: s.y, vx: (Math.random() - 0.5) * 80, vy: -60 - Math.random() * 60, g: 400, life: 0, max: 0.5, c: shade(venue.grass[0], -0.2), r: 3 }); }
  function confetti() { for (let i = 0; i < 70; i++) parts.push({ x: Math.random() * W, y: -20, vx: (Math.random() - 0.5) * 80, vy: 100 + Math.random() * 200, life: 0, max: 3, c: ["#ff5f6d", "#ffd23f", "#3fd58a", "#2f8fff", "#ff8fd0"][i % 5], r: 4, conf: true, rot: Math.random() * 6 }); }
  function floatText(text, color) { floats.push({ text, color, t: 0 }); }
  const camX = () => px * ROAD;
  function carScreen() { const w = (DEPTH / PZ) * CAR_W * U; return { x: W / 2, y: H * 0.95 - Math.max(0, airY) * (DEPTH / PZ) * V * 0.9, w }; }

  /* ---------- rendering ---------- */
  function project(p, cx, cy, cz) {
    p.cam.x = (p.world.x || 0) - cx; p.cam.y = p.world.y - cy; p.cam.z = p.world.z - cz;
    const s = DEPTH / p.cam.z; p.scr.scale = s;
    p.scr.x = W / 2 + s * p.cam.x * U; p.scr.y = HOR - s * p.cam.y * V; p.scr.w = s * ROAD * U;
  }
  function poly(x1, y1, x2, y2, x3, y3, x4, y4, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.lineTo(x4, y4); ctx.closePath(); ctx.fill(); }
  function render() {
    const sh = shake * shake * 14;
    ctx.setTransform(DPR, 0, 0, DPR, (Math.random() - 0.5) * sh * DPR, (Math.random() - 0.5) * sh * DPR);
    const vn = venue;
    // sky + background
    const g = ctx.createLinearGradient(0, 0, 0, HOR + 40); g.addColorStop(0, vn.sky[0]); g.addColorStop(1, vn.sky[1]);
    ctx.fillStyle = g; ctx.fillRect(-20, -20, W + 40, H + 40);
    background(vn);
    if (!segs.length) return;
    const base = segAt(pos), bp = (pos % SEG) / SEG;
    const ps = segAt(pos + PZ), pp = ((pos + PZ) % SEG) / SEG;
    const playerY = lerp(ps.p1.world.y, ps.p2.world.y, pp);
    let maxy = H + 40, x = 0, dx = -(base.curve * bp);
    ctx.fillStyle = vn.grass[0]; ctx.fillRect(-20, HOR, W + 40, H);
    const drawn = [];
    for (let n = 0; n < DRAW; n++) {
      const s = segs[base.index + n]; if (!s) break;
      project(s.p1, camX() - x, playerY + CAM_H, pos);
      project(s.p2, camX() - x - dx, playerY + CAM_H, pos);
      s.clip = maxy; s.ox = x; s.odx = dx;
      x += dx; dx += s.curve;
      drawn.push(s);
      if (s.p1.cam.z <= DEPTH || s.p2.scr.y >= s.p1.scr.y || s.p2.scr.y >= maxy) continue;
      const a = s.p1.scr, b = s.p2.scr, d = s.dark, fog = clamp(n / DRAW, 0, 1) ** 1.6;
      poly(-20, a.y, W + 20, a.y, W + 20, b.y, -20, b.y, vn.grass[d]);
      const r1 = a.w / 6, r2 = b.w / 6;
      poly(a.x - a.w - r1, a.y, a.x - a.w, a.y, b.x - b.w, b.y, b.x - b.w - r2, b.y, vn.rumble[d]);
      poly(a.x + a.w + r1, a.y, a.x + a.w, a.y, b.x + b.w, b.y, b.x + b.w + r2, b.y, vn.rumble[d]);
      poly(a.x - a.w, a.y, a.x + a.w, a.y, b.x + b.w, b.y, b.x - b.w, b.y, vn.road[d]);
      if (!d) { const l1 = a.w / 40, l2 = b.w / 40; for (let k = 1; k < LANES; k++) { const ax = a.x - a.w + (a.w * 2 / LANES) * k, bx = b.x - b.w + (b.w * 2 / LANES) * k; poly(ax - l1, a.y, ax + l1, a.y, bx + l2, b.y, bx - l2, b.y, vn.lane); } }
      if (s.finish || s.start) { const cells = 10; for (let k = 0; k < cells; k++) for (let j = 0; j < 2; j++) { const u0 = k / cells, u1 = (k + 1) / cells, v0 = j / 2, v1 = (j + 1) / 2; const xa = t => lerp(a.x - a.w, a.x + a.w, t), xb = t => lerp(b.x - b.w, b.x + b.w, t); const ya = lerp(a.y, b.y, v0), yb = lerp(a.y, b.y, v1); poly(lerp(xa(u0), xb(u0), v0), ya, lerp(xa(u1), xb(u1), v0), ya, lerp(xa(u1), xb(u1), v1), yb, lerp(xa(u0), xb(u0), v1), yb, (k + j) % 2 ? "#ffffff" : "#1a1528"); } }
      if (s.hz && s.hz.type !== "cones") flatHazard(s, a, b);
      if (fog > 0.02) { ctx.globalAlpha = fog * 0.85; poly(-20, a.y, W + 20, a.y, W + 20, b.y, -20, b.y, vn.fog); ctx.globalAlpha = 1; }
      maxy = b.y;
    }
    // sprites & cars, far to near
    const pz = pos + PZ;
    for (let n = drawn.length - 1; n > 0; n--) {
      const s = drawn[n];
      ctx.save(); ctx.beginPath(); ctx.rect(-20, -40, W + 40, s.clip + 40); ctx.clip();
      const a = s.p1.scr;
      if (a.scale > 0) {
        for (const sp of s.sprites) drawProp(sp, a, s);
        if (s.hz && s.hz.type === "cones" && !s.hz.hit) cones(a, s.hz.x);
        for (const r of rivals) { if (Math.floor(r.z / SEG) !== s.index) continue; const pr = (r.z % SEG) / SEG, sc = lerp(s.p1.scr.scale, s.p2.scr.scale, pr), sx = lerp(s.p1.scr.x, s.p2.scr.x, pr) + sc * r.x * ROAD * U, sy = lerp(s.p1.scr.y, s.p2.scr.y, pr); const w = sc * CAR_W * U; if (w < 3) continue; carArt(ctx, sx, sy, w, r.color, { body: r.body, brake: r.speed < r.max * 0.7, tilt: s.curve * 0.01 }); badge(sx, sy - w * 0.62, r); }
      }
      ctx.restore();
    }
    // the player's car
    const cs = carScreen();
    ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.beginPath(); ctx.ellipse(cs.x, H * 0.95, cs.w * 0.55 * (1 - Math.min(airY, 600) / 1500), cs.w * 0.09, 0, 0, TAU); ctx.fill();
    const tilt = clamp((tx - px) * 0.2 + ps.curve * 0.012, -0.12, 0.12) + (spinT > 0 ? Math.sin(time * 18) * 0.15 : 0);
    carArt(ctx, cs.x, cs.y, cs.w, paint || car.color, { body: car.body, brake: !(throttle || keys.ArrowUp || bot) && speed > 100, nitro: nitroT > 0, tilt, player: true, t: time });
    // particles
    for (const p of parts) { const k = 1 - p.life / p.max; ctx.globalAlpha = p.smoke ? k * 0.6 : k; ctx.fillStyle = p.c; if (p.conf) { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot + p.life * 5); ctx.fillRect(-3, -6, 6, 12); ctx.restore(); } else { ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (p.smoke ? 1 + (1 - k) * 3 : 1), 0, TAU); ctx.fill(); } }
    ctx.globalAlpha = 1;
    // speed lines on nitro
    if (nitroT > 0 || speed > maxSpeed * 0.95) { ctx.strokeStyle = `rgba(255,255,255,${nitroT > 0 ? 0.45 : 0.18})`; ctx.lineWidth = 2; for (let i = 0; i < 18; i++) { const an = hash(i * 3.3) * TAU, r0 = (0.25 + ((time * 2.5 + hash(i)) % 1) * 0.7) * Math.max(W, H); ctx.beginPath(); ctx.moveTo(W / 2 + Math.cos(an) * r0, HOR + Math.sin(an) * r0 * 0.7); ctx.lineTo(W / 2 + Math.cos(an) * (r0 + 70), HOR + Math.sin(an) * (r0 + 70) * 0.7); ctx.stroke(); } }
    if (vn.night) { const vg = ctx.createRadialGradient(W / 2, H * 0.6, H * 0.2, W / 2, H * 0.6, H * 0.9); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,20,0.45)"); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H); }
    // countdown lights & floating words
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
    if (mode === "countdown") {
      const n = Math.ceil(countdown), bw = Math.min(W * 0.62, 260), bx = W / 2 - bw / 2, by = H * 0.18;
      ctx.fillStyle = "rgba(20,16,40,0.85)"; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(bx, by, bw, bw * 0.3, 16) : ctx.rect(bx, by, bw, bw * 0.3); ctx.fill();
      for (let i = 0; i < 3; i++) { const lit = 3 - n > i - 0 && n <= 3 && n > 0 ? (3 - n) >= i : false; ctx.fillStyle = n <= 0 ? "#3fd58a" : (3 - n) >= i ? "#ff3b3b" : "#3a3450"; ctx.beginPath(); ctx.arc(bx + bw * (0.2 + i * 0.3), by + bw * 0.15, bw * 0.09, 0, TAU); ctx.fill(); }
    }
    floats.forEach((f, i) => { const k = f.t / 1.2, s = Math.min(W * 0.09, 34) * (1 + Math.max(0, 0.15 - f.t) * 3); ctx.globalAlpha = 1 - k * k; ctx.font = `900 italic ${s}px ${FONT}`; ctx.lineWidth = s * 0.18; ctx.strokeStyle = OUT; const y = H * 0.36 - f.t * 40 - i * 34; ctx.strokeText(f.text, W / 2, y); ctx.fillStyle = f.color; ctx.fillText(f.text, W / 2, y); ctx.globalAlpha = 1; });
    if (mode === "done" && endT < 3) { const s = Math.min(W * 0.16, 70), k = Math.min(1, endT * 3); ctx.globalAlpha = k; ctx.font = `900 italic ${s}px ${FONT}`; ctx.lineWidth = s * 0.15; ctx.strokeStyle = OUT; const txt = ["", "1ST!", "2ND!", "3RD!", "4TH", "5TH"][place]; ctx.strokeText(txt, W / 2, H * 0.28); ctx.fillStyle = place <= 3 ? "#ffd23f" : "#ffffff"; ctx.fillText(txt, W / 2, H * 0.28); ctx.globalAlpha = 1; }
  }
  const FONT = '"Russo One","Lilita One","Arial Black","Trebuchet MS",system-ui,sans-serif';
  function badge(x, y, r) {
    const all = [...rivals.map(q => ({ q, z: q.finished ? 1e9 - q.place : q.z })), { q: null, z: finished ? 1e9 - place : pos + PZ }].sort((a, b) => b.z - a.z);
    const rank = all.findIndex(e => e.q === r) + 1, txt = ["", "1ST", "2ND", "3RD", "4TH", "5TH"][rank];
    const s = Math.max(9, Math.min(16, (H * 0.95 - y) * 0.04 + 8));
    ctx.font = `900 italic ${s}px ${FONT}`; const w = ctx.measureText(txt).width + 10;
    ctx.fillStyle = "rgba(20,16,40,0.85)"; ctx.beginPath(); ctx.moveTo(x - w / 2, y - s); ctx.lineTo(x + w / 2 + 4, y - s); ctx.lineTo(x + w / 2, y + 2); ctx.lineTo(x + 3, y + 2); ctx.lineTo(x, y + 6); ctx.lineTo(x - 3, y + 2); ctx.lineTo(x - w / 2 - 4, y + 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = r.color === "#2a2a33" ? "#ffffff" : r.color; ctx.fillRect(x - w / 2 - 2, y - s, 3, s + 2);
    ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(txt, x, y - s / 2 + 1);
  }
  function background(vn) {
    const off = skyOff * W;
    if (vn.night) { for (let i = 0; i < 60; i++) { ctx.fillStyle = `rgba(255,255,255,${0.4 + 0.5 * Math.sin(time * 2 + i)})`; ctx.fillRect(hash(i) * W, hash(i + 3) * HOR * 0.8, 2, 2); } }
    else { const sx = W * 0.75 - off * 0.2 % W, sg = ctx.createRadialGradient(sx, HOR * 0.45, 5, sx, HOR * 0.45, H * 0.18); sg.addColorStop(0, "#fffbe0"); sg.addColorStop(0.2, "#fff3c0"); sg.addColorStop(1, "rgba(255,255,255,0)"); ctx.fillStyle = sg; ctx.fillRect(sx - H * 0.18, HOR * 0.45 - H * 0.18, H * 0.36, H * 0.36); for (let i = 0; i < 5; i++) { const x = ((hash(i) * W * 2 - off * 0.3 - time * 8) % (W + 300) + W + 300) % (W + 300) - 150, y = HOR * (0.15 + hash(i + 4) * 0.5), r = 20 + hash(i + 9) * 24; ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.arc(x + r, y + 6, r * 0.8, 0, TAU); ctx.arc(x - r, y + 7, r * 0.7, 0, TAU); ctx.fill(); } }
    const layer = (k, col, fn) => { ctx.fillStyle = col; const o = ((-off * k) % W + W) % W; for (let rep = -1; rep < 2; rep++) fn(o + rep * W); };
    if (vn.back === "docks") {
      layer(0.4, "#8fb0c8", x0 => { for (let i = 0; i < 6; i++) { const x = x0 + i * W / 6, h = H * (0.06 + hash(i) * 0.08); ctx.fillRect(x, HOR - h, W / 9, h); ctx.fillRect(x + W / 18, HOR - h - H * 0.08, 4, H * 0.08); ctx.fillRect(x + W / 18, HOR - h - H * 0.08, W / 10, 4); } });
      ctx.fillStyle = "#4fa8d8"; ctx.fillRect(0, HOR - 6, W, 8);
    } else if (vn.back === "mesa") {
      layer(0.3, "#e8a070", x0 => { for (let i = 0; i < 4; i++) { const x = x0 + i * W / 4, h = H * (0.05 + hash(i + 2) * 0.07), w = W / 6; ctx.fillRect(x, HOR - h, w, h); ctx.fillRect(x - 8, HOR - h, w + 16, 6); } });
      layer(0.6, "#d8885a", x0 => { ctx.beginPath(); ctx.moveTo(x0, HOR); for (let i = 0; i <= 8; i++) ctx.lineTo(x0 + i * W / 8, HOR - H * (0.02 + hash(i + 9) * 0.03)); ctx.lineTo(x0 + W, HOR); ctx.fill(); });
    } else {
      layer(0.25, "#2a1d5a", x0 => { for (let i = 0; i < 14; i++) { const x = x0 + i * W / 14, h = H * (0.07 + hash(i) * 0.16); ctx.fillStyle = "#2a1d5a"; ctx.fillRect(x, HOR - h, W / 16, h); ctx.fillStyle = "#ffd86b"; for (let yy = HOR - h + 4; yy < HOR - 3; yy += 7) for (let xx = x + 3; xx < x + W / 16 - 3; xx += 6) if (hash(xx * 0.1 + yy) > 0.6) ctx.fillRect(xx, yy, 2, 3); } });
    }
  }
  function flatHazard(s, a, b) {
    const h = s.hz, xa = a.x + h.x * a.w, xb = b.x + h.x * b.w, wa = a.w * 0.28, wb = b.w * 0.28;
    if (h.type === "boost") { poly(xa - wa, a.y, xa + wa, a.y, xb + wb, b.y, xb - wb, b.y, "#1fbf7a"); for (let k = 0; k < 2; k++) { const t0 = (k * 0.5 + (time * 2) % 0.5); const y0 = lerp(a.y, b.y, t0), y1 = lerp(a.y, b.y, Math.min(1, t0 + 0.25)); const x0 = lerp(xa, xb, t0), x1 = lerp(xa, xb, Math.min(1, t0 + 0.25)), w0 = lerp(wa, wb, t0) * 0.8; ctx.strokeStyle = "#bfffe0"; ctx.lineWidth = Math.max(1.5, w0 * 0.12); ctx.beginPath(); ctx.moveTo(x0 - w0, y0); ctx.lineTo(x1, y1); ctx.lineTo(x0 + w0, y0); ctx.stroke(); } }
    else if (h.type === "oil") { ctx.fillStyle = "rgba(20,16,30,0.75)"; ctx.beginPath(); ctx.ellipse((xa + xb) / 2, (a.y + b.y) / 2, (wa + wb) * 0.45, Math.max(2, (a.y - b.y) * 0.6), 0, 0, TAU); ctx.fill(); ctx.fillStyle = "rgba(160,120,255,0.35)"; ctx.beginPath(); ctx.ellipse((xa + xb) / 2 - wa * 0.15, (a.y + b.y) / 2, (wa + wb) * 0.18, Math.max(1, (a.y - b.y) * 0.25), 0, 0, TAU); ctx.fill(); }
    else if (h.type === "ramp") { const rise = a.w * 0.12; poly(xa - wa, a.y, xa + wa, a.y, xb + wb, b.y - rise * (b.w / a.w), xb - wb, b.y - rise * (b.w / a.w), "#ffd23f"); ctx.strokeStyle = "#1a1528"; ctx.lineWidth = Math.max(1, wa * 0.06); for (let k = 0; k < 4; k++) { const t = (k + 0.5) / 4; ctx.beginPath(); ctx.moveTo(lerp(xa - wa, xa + wa, t) - wa * 0.1, a.y); ctx.lineTo(lerp(xb - wb, xb + wb, t) + wb * 0.1, b.y - rise * (b.w / a.w)); ctx.stroke(); } }
  }
  function cones(a, x) { for (let k = -1; k <= 1; k++) { const cx = a.x + (x + k * 0.13) * a.w, w = a.w * 0.07, h = w * 2.2; ctx.fillStyle = "#ff7a2e"; ctx.beginPath(); ctx.moveTo(cx - w, a.y); ctx.lineTo(cx, a.y - h); ctx.lineTo(cx + w, a.y); ctx.closePath(); ctx.fill(); ctx.fillStyle = "#fff"; ctx.fillRect(cx - w * 0.5, a.y - h * 0.55, w, h * 0.14); } }
  // roadside props, in world units: spx = pixels per world unit at this segment
  function drawProp(sp, a, s) {
    const spx = a.w / ROAD; if (spx * 400 < 1) return;
    const x = a.x + sp.off * a.w, y = a.y, k = spx, sd = sp.seed;
    switch (sp.kind) {
      case "post": { ctx.fillStyle = "#e8e8f0"; ctx.fillRect(x - 25 * k, y - 400 * k, 50 * k, 400 * k); ctx.fillStyle = venue.rumble[1]; ctx.fillRect(x - 25 * k, y - 400 * k, 50 * k, 90 * k); break; }
      case "container": { const n = 1 + Math.floor(sd * 3); for (let i = 0; i < n; i++) { const col = ["#e8403a", "#2f8fff", "#3fbf6a", "#ffb000", "#8a5fd8"][Math.floor(hash(sd * 9 + i) * 5)], w = 1300 * k, h = 520 * k; ctx.fillStyle = col; ctx.fillRect(x - w / 2, y - h * (i + 1), w, h - 2); ctx.fillStyle = "rgba(0,0,0,0.15)"; for (let j = 1; j < 8; j++) ctx.fillRect(x - w / 2 + j * w / 8, y - h * (i + 1), Math.max(1, 20 * k), h - 2); } break; }
      case "crane": { ctx.strokeStyle = "#e8803a"; ctx.lineWidth = Math.max(1, 60 * k); const h = 5200 * k, w = 2200 * k * (sp.off > 0 ? -1 : 1); ctx.beginPath(); ctx.moveTo(x - 300 * k, y); ctx.lineTo(x - 300 * k, y - h); ctx.moveTo(x + 300 * k, y); ctx.lineTo(x + 300 * k, y - h); ctx.moveTo(x - 300 * k, y - h); ctx.lineTo(x + w, y - h); ctx.stroke(); ctx.lineWidth = Math.max(1, 25 * k); for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(x - 300 * k, y - i * h / 6); ctx.lineTo(x + 300 * k, y - (i + 1) * h / 6); ctx.stroke(); } ctx.strokeStyle = "#3a3450"; ctx.beginPath(); ctx.moveTo(x + w * 0.7, y - h); ctx.lineTo(x + w * 0.7, y - h * 0.6); ctx.stroke(); ctx.fillStyle = "#2f8fff"; ctx.fillRect(x + w * 0.7 - 500 * k, y - h * 0.6, 1000 * k, 400 * k); break; }
      case "lamp": { ctx.fillStyle = "#4a4a5a"; ctx.fillRect(x - 30 * k, y - 2600 * k, 60 * k, 2600 * k); const hx = x - Math.sign(sp.off) * 400 * k; ctx.fillRect(Math.min(x, hx), y - 2600 * k, Math.abs(hx - x), 50 * k); ctx.fillStyle = venue.night ? "#fff2a0" : "#e8e8d0"; ctx.beginPath(); ctx.ellipse(hx, y - 2560 * k, 150 * k, 60 * k, 0, 0, TAU); ctx.fill(); if (venue.night) { ctx.fillStyle = "rgba(255,240,160,0.18)"; ctx.beginPath(); ctx.arc(hx, y - 2500 * k, 700 * k, 0, TAU); ctx.fill(); } break; }
      case "bollard": { ctx.fillStyle = "#3a3450"; ctx.fillRect(x - 120 * k, y - 300 * k, 240 * k, 300 * k); ctx.fillStyle = "#ffd23f"; ctx.fillRect(x - 120 * k, y - 300 * k, 240 * k, 60 * k); break; }
      case "cactus": { ctx.fillStyle = "#4fae5a"; const h = (1400 + sd * 1200) * k, w = 260 * k; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - w / 2, y - h, w, h, w / 2) : ctx.rect(x - w / 2, y - h, w, h); ctx.fill(); ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x + w * 0.4, y - h * 0.65, w * 0.8, w * 0.6, w * 0.3) : 0; ctx.fill(); ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x + w * 0.9, y - h * 0.9, w * 0.6, h * 0.3, w * 0.3) : 0; ctx.fill(); break; }
      case "rock": { ctx.fillStyle = "#b86a48"; ctx.beginPath(); ctx.ellipse(x, y - 250 * k, (500 + sd * 400) * k, (300 + sd * 200) * k, 0, Math.PI, TAU); ctx.fill(); ctx.fillStyle = "rgba(255,255,255,0.15)"; ctx.beginPath(); ctx.ellipse(x - 150 * k, y - 380 * k, 200 * k, 80 * k, 0, 0, TAU); ctx.fill(); break; }
      case "sign": { ctx.fillStyle = "#6a5a4a"; ctx.fillRect(x - 40 * k, y - 1400 * k, 80 * k, 1400 * k); ctx.fillStyle = "#2f8fff"; ctx.fillRect(x - 700 * k, y - 2000 * k, 1400 * k, 700 * k); ctx.fillStyle = "#fff"; ctx.font = `900 ${Math.max(6, 260 * k)}px ${FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(sd > 0.5 ? "TURBO" : "FUEL", x, y - 1650 * k); break; }
      case "mesa": { ctx.fillStyle = "#c8784e"; const w = (2600 + sd * 2000) * k, h = (1600 + sd * 1400) * k; ctx.fillRect(x - w / 2, y - h, w, h); ctx.fillStyle = "#d8885a"; ctx.fillRect(x - w / 2 - 80 * k, y - h, w + 160 * k, 160 * k); break; }
      case "tower": { const w = (1600 + sd * 900) * k, h = (5000 + sd * 6000) * k; ctx.fillStyle = venue.night ? "#2a2050" : "#8aa0c8"; ctx.fillRect(x - w / 2, y - h, w, h); ctx.fillStyle = venue.night ? "#ffd86b" : "rgba(255,255,255,0.5)"; const cw = 260 * k, chh = 340 * k; if (cw > 1.5) for (let yy = y - h + chh; yy < y - chh; yy += chh * 1.6) for (let xx = x - w / 2 + cw * 0.6; xx < x + w / 2 - cw; xx += cw * 1.6) if (hash(xx * 0.01 + yy * 0.02 + sd) > 0.45) ctx.fillRect(xx, yy, cw, chh); break; }
      case "neon": { ctx.fillStyle = "#3a3450"; ctx.fillRect(x - 40 * k, y - 1600 * k, 80 * k, 1600 * k); const col = ["#ff3fd0", "#2fd8ff", "#ffd23f"][Math.floor(sd * 3)]; ctx.fillStyle = "rgba(20,10,40,0.9)"; ctx.fillRect(x - 800 * k, y - 2400 * k, 1600 * k, 800 * k); ctx.strokeStyle = col; ctx.lineWidth = Math.max(1, 60 * k); ctx.strokeRect(x - 760 * k, y - 2360 * k, 1520 * k, 720 * k); ctx.fillStyle = col; ctx.font = `900 ${Math.max(6, 300 * k)}px ${FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(["NITRO", "RACE", "24/7"][Math.floor(sd * 3)], x, y - 2000 * k); break; }
      case "gantry": {
        const lx = a.x - a.w * 1.3, rx = a.x + a.w * 1.3, top = y - 2800 * k, bw = 220 * k;
        ctx.fillStyle = venue.night ? "#5a4a8a" : "#c87a3a"; ctx.fillRect(lx - bw / 2, top, bw, y - top); ctx.fillRect(rx - bw / 2, top, bw, y - top); ctx.fillRect(lx - bw / 2, top, rx - lx + bw, bw * 1.2);
        ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = Math.max(1, 50 * k); for (let i = 0; i < 10; i++) { const x0 = lx + i * (rx - lx) / 10; ctx.beginPath(); ctx.moveTo(x0, top); ctx.lineTo(x0 + (rx - lx) / 10, top + bw * 1.2); ctx.stroke(); }
        if (venue.back === "docks") { const cx = a.x + (sd - 0.5) * a.w * 0.8; ctx.strokeStyle = "#3a3450"; ctx.lineWidth = Math.max(1, 20 * k); ctx.beginPath(); ctx.moveTo(cx - 300 * k, top + bw); ctx.lineTo(cx - 300 * k, top + 700 * k); ctx.moveTo(cx + 300 * k, top + bw); ctx.lineTo(cx + 300 * k, top + 700 * k); ctx.stroke(); ctx.fillStyle = "#4f8a8a"; ctx.fillRect(cx - 700 * k, top + 700 * k, 1400 * k, 520 * k); ctx.fillStyle = "rgba(0,0,0,0.15)"; for (let j = 1; j < 8; j++) ctx.fillRect(cx - 700 * k + j * 175 * k, top + 700 * k, Math.max(1, 20 * k), 520 * k); }
        else { ctx.fillStyle = "#1f7a4a"; ctx.fillRect(a.x - 900 * k, top + bw * 1.2, 1800 * k, 500 * k); ctx.fillStyle = "#fff"; ctx.font = `900 ${Math.max(6, 220 * k)}px ${FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(sd > 0.5 ? "NEON CITY" : "EXIT " + (10 + Math.floor(sd * 80)), a.x, top + bw * 1.2 + 250 * k); }
        break;
      }
    }
  }
  // a car seen from behind. (x, y) = middle of the rear bumper on the ground
  function carArt(g, x, y, w, col, o = {}) {
    const h = w * (o.body === "muscle" ? 0.5 : o.body === "hatch" ? 0.62 : 0.52);
    g.save(); g.translate(x, y); g.rotate(o.tilt || 0);
    const lw = Math.max(1, w * 0.012);
    // wheels
    g.fillStyle = "#14101f"; g.fillRect(-w * 0.47, -h * 0.28, w * 0.18, h * 0.3); g.fillRect(w * 0.29, -h * 0.28, w * 0.18, h * 0.3);
    // body
    const top = o.body === "hatch" ? 0.95 : 0.88;
    g.fillStyle = col; g.beginPath();
    g.moveTo(-w * 0.5, -h * 0.12); g.lineTo(-w * 0.5, -h * 0.5); g.quadraticCurveTo(-w * 0.48, -h * 0.62, -w * 0.38, -h * 0.64);
    g.lineTo(-w * 0.3, -h * top); g.quadraticCurveTo(0, -h * (top + 0.06), w * 0.3, -h * top); g.lineTo(w * 0.38, -h * 0.64); g.quadraticCurveTo(w * 0.48, -h * 0.62, w * 0.5, -h * 0.5); g.lineTo(w * 0.5, -h * 0.12); g.closePath(); g.fill();
    // shading & rear window
    g.fillStyle = "rgba(0,0,0,0.18)"; g.fillRect(-w * 0.5, -h * 0.3, w, h * 0.18);
    g.fillStyle = "rgba(255,255,255,0.18)"; g.fillRect(-w * 0.42, -h * 0.6, w * 0.84, h * 0.05);
    g.fillStyle = "#1e2a3a"; g.beginPath(); g.moveTo(-w * 0.27, -h * (top - 0.04)); g.quadraticCurveTo(0, -h * (top + 0.02), w * 0.27, -h * (top - 0.04)); g.lineTo(w * 0.33, -h * 0.66); g.lineTo(-w * 0.33, -h * 0.66); g.closePath(); g.fill();
    g.fillStyle = "rgba(160,220,255,0.25)"; g.beginPath(); g.moveTo(-w * 0.2, -h * (top - 0.05)); g.lineTo(-w * 0.06, -h * (top - 0.05)); g.lineTo(-w * 0.16, -h * 0.68); g.lineTo(-w * 0.3, -h * 0.68); g.closePath(); g.fill();
    // spoiler for sport cars
    if (o.body === "sport") { g.fillStyle = shade(col, -0.35); g.fillRect(-w * 0.44, -h * 0.72, w * 0.88, h * 0.06); g.fillRect(-w * 0.3, -h * 0.68, w * 0.04, h * 0.06); g.fillRect(w * 0.26, -h * 0.68, w * 0.04, h * 0.06); }
    if (o.body === "muscle") { g.fillStyle = "rgba(255,255,255,0.75)"; g.fillRect(-w * 0.08, -h * (top + 0.02), w * 0.05, h * 0.7); g.fillRect(w * 0.03, -h * (top + 0.02), w * 0.05, h * 0.7); }
    // lights, plate, exhaust
    const bl = o.brake ? "#ff2a2a" : "#c8202a";
    g.fillStyle = bl; g.fillRect(-w * 0.47, -h * 0.5, w * 0.22, h * 0.1); g.fillRect(w * 0.25, -h * 0.5, w * 0.22, h * 0.1);
    if (o.brake) { g.fillStyle = "rgba(255,40,40,0.35)"; g.beginPath(); g.arc(-w * 0.36, -h * 0.45, w * 0.14, 0, TAU); g.arc(w * 0.36, -h * 0.45, w * 0.14, 0, TAU); g.fill(); }
    g.fillStyle = "#f2f2e8"; g.fillRect(-w * 0.1, -h * 0.36, w * 0.2, h * 0.11); g.fillStyle = "#1a1528"; g.fillRect(-w * 0.07, -h * 0.33, w * 0.14, h * 0.04);
    g.fillStyle = "#14101f"; g.fillRect(-w * 0.5, -h * 0.14, w, h * 0.06);
    g.fillStyle = "#8a8a9a"; g.beginPath(); g.ellipse(w * 0.3, -h * 0.11, w * 0.035, h * 0.03, 0, 0, TAU); g.ellipse(w * 0.38, -h * 0.11, w * 0.035, h * 0.03, 0, 0, TAU); g.fill();
    if (o.nitro) { for (const ex of [w * 0.3, w * 0.38]) { const fl = w * (0.12 + Math.random() * 0.1); const gr = g.createLinearGradient(ex, -h * 0.11, ex, -h * 0.11 + fl); gr.addColorStop(0, "#ffffff"); gr.addColorStop(0.3, "#7fe8ff"); gr.addColorStop(1, "rgba(80,120,255,0)"); g.fillStyle = gr; g.beginPath(); g.ellipse(ex, -h * 0.11 + fl * 0.5, w * 0.04, fl * 0.5, 0, 0, TAU); g.fill(); } }
    if (o.player) { g.strokeStyle = "rgba(120,255,180,0.0)"; }
    g.restore();
  }

  /* ---------- loop ---------- */
  let last = performance.now();
  let errShown = false;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    try { update(dt); render(); } catch (e) { if (!errShown) { errShown = true; console.error(e); } }
  }
  resize(); attract(); requestAnimationFrame(frame);

  return {
    on, start, attract, fireNitro,
    pause(p) { if (p && (mode === "race" || mode === "countdown")) { this._m = mode; mode = "paused"; Sound.engine(0, false, false); } else if (!p && mode === "paused") { mode = this._m || "race"; last = performance.now(); } },
    setCar(id, p, u) { car = C.cars.find(c => c.id === id) || C.cars[0]; paint = p || null; up = Object.assign({ engine: 0, turbo: 0, tires: 0, nitro: 0 }, u || {}); maxSpeed = topSpeed(); },
    carArt, stat,
    get mode() { return mode; }, get level() { return L; }, get nitro() { return nitroT > 0 ? -nitroT : nitro; },
    hud() { return { kmh: Math.round(speed / BASE_MAX * 240), rank: finished ? place : rankOf(), progress: clamp((pos + PZ - 50 * SEG) / (finishZ - 50 * SEG), 0, 1), rivals: rivals.map(r => ({ p: clamp((r.z - 50 * SEG) / (finishZ - 50 * SEG), 0, 1), c: r.color })), nitro, nitroOn: nitroT > 0 }; },
    setBot(b) { bot = b; }, step(dt = 1 / 60, n = 1) { for (let i = 0; i < n; i++) update(dt); render(); }, simulate(dt, n) { for (let i = 0; i < n; i++) update(dt); },
    get finished() { return finished; }, get place() { return place; }
  };
})();

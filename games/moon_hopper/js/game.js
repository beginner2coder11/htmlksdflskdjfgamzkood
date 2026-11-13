/* ==========================================================================
   MOON HOPPER — lander physics + vector CRT renderer.
   Seeded jagged terrain with flat pads, rotate/thrust with fuel, wind, a
   zooming camera, safe-landing checks, debris on crashes, mission-control
   readouts, and an endless free-flight mode that keeps adding terrain.
   ========================================================================== */
window.Game = (() => {
  const CF = window.GAME_CONFIG, CR = CF.craft, LD = CF.landing;
  const cv = document.getElementById("scope"), g = cv.getContext("2d");
  let VW = 400, VH = 760, dpr = 1;
  const hooks = {}, emit = (n, d) => hooks[n] && hooks[n](d);
  const STEP = 8;
  let terrain = [], pads = [], mission = null, mi = 0, mode = "mission", gravity = 1.62, wind = 0, state = "idle", paused = false;
  let ship = null, keys = { left: false, right: false, thrust: false }, cam = { x: 0, y: 0, z: 1 }, debris = [], stars = [], score = 0, hops = 0, clock = 0, msg = null, rngState = 1;

  const rnd = () => (rngState = (rngState * 16807) % 2147483647) / 2147483647;
  function extend(toX, rough, padMults) {
    let x = terrain.length ? terrain[terrain.length - 1][0] : -200, y = terrain.length ? terrain[terrain.length - 1][1] : 40;
    while (x < toX) {
      // sometimes lay a pad (flat run) instead of rocks
      if (padMults.length && rnd() < 0.08 && x > 120) {
        const w = 16 + Math.floor(rnd() * 3) * 4, mult = padMults[Math.floor(rnd() * padMults.length)], pw = w * (1.6 - mult * 0.16);
        terrain.push([x + pw, y]); pads.push({ x0: x, x1: x + pw, y, mult, used: false }); x += pw; continue;
      }
      x += STEP; y = Math.max(8, Math.min(160, y + (rnd() - 0.5) * 2 * 12 * rough + (y < 30 ? 4 : 0) - (y > 120 ? 4 : 0)));
      if (rnd() < 0.04) y += 30 * rough * (rnd() < 0.5 ? -1 : 1);
      terrain.push([x, Math.max(6, y)]);
    }
  }
  function groundAt(x) {
    for (let i = 1; i < terrain.length; i++) if (terrain[i][0] >= x) { const [x0, y0] = terrain[i - 1], [x1, y1] = terrain[i]; return y0 + (y1 - y0) * (x - x0) / (x1 - x0 || 1); }
    return 0;
  }
  const padAt = x => pads.find(p => x >= p.x0 + 1 && x <= p.x1 - 1);

  function start(m, idx = 0) {
    mode = m; mi = idx; mission = m === "free" ? null : CF.missions[idx];
    gravity = m === "free" ? CF.freeFlight.gravity : mission.gravity; wind = m === "free" ? 0 : mission.wind;
    rngState = (m === "free" ? Date.now() % 100000 : idx * 977) + 11;
    terrain = []; pads = []; extend(m === "free" ? 1200 : 700, m === "free" ? 1.1 : mission.rough, m === "free" ? [2, 3, 4, 5] : mission.pads);
    if (!pads.length) { const x = 300, y = groundAt(x); pads.push({ x0: x, x1: x + 20, y, mult: 2 }); for (const p of terrain) if (p[0] >= x && p[0] <= x + 20) p[1] = y; }
    ship = { x: 40, y: 260, vx: 6, vy: 0, a: 0.6, fuel: m === "free" ? 100 : Math.min(100, mission.fuel + 15), thrusting: false };
    debris = []; score = 0; hops = 0; state = "fly"; paused = false; msg = { t: 0, s: m === "free" ? "FREE FLIGHT" : `${mission.name} · ${mission.body} · g ${gravity}` };
    stars = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), b: Math.random() }));
    emit("hud");
  }

  /* ---------- physics ---------- */
  function step(dt) {
    clock += dt; if (msg) { msg.t += dt; if (msg.t > 2.5) msg = null; }
    debris.forEach(d => { d.t += dt; d.vy -= gravity * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.r += d.vr * dt; if (d.y < groundAt(d.x)) { d.y = groundAt(d.x); d.vy *= -0.3; d.vx *= 0.6; } });
    if (paused || state !== "fly") { Sound.engine(0); return; }
    const s = ship;
    if (keys.left) s.a -= CR.turn * dt; if (keys.right) s.a += CR.turn * dt;
    s.thrusting = keys.thrust && s.fuel > 0;
    if (s.thrusting) { const acc = CR.thrust * gravity * 1.0 + 1.2; s.vx += Math.sin(s.a) * acc * dt; s.vy += Math.cos(s.a) * acc * dt; s.fuel = Math.max(0, s.fuel - CR.fuelBurn * dt); }
    s.vy -= gravity * dt; s.vx += wind * 0.35 * dt * (1 + Math.sin(clock * 0.7) * 0.5);
    s.x += s.vx * dt; s.y += s.vy * dt;
    if (s.y > 900) { s.vy = Math.min(s.vy, 0); }
    if (s.x < -150) { s.x = -150; s.vx = Math.abs(s.vx) * 0.5; }
    if (mode === "free" && terrain[terrain.length - 1][0] < s.x + 800) extend(s.x + 1400, 1.1 + hops * 0.05, [2, 3, 4, 5]);
    if (mode === "mission" && s.x > terrain[terrain.length - 1][0] - 20) { s.x = terrain[terrain.length - 1][0] - 20; s.vx = -Math.abs(s.vx) * 0.5; }
    Sound.engine(s.thrusting ? 1 : 0);
    if (s.fuel < 15 && s.fuel > 0) Sound.sfx("alarm");
    // contact: check both feet and the body against the terrain
    const c = Math.cos(s.a), sn = Math.sin(s.a), feet = [[-CR.size, -CR.size], [CR.size, -CR.size]].map(([fx, fy]) => [s.x + fx * c + fy * sn, s.y - fx * sn + fy * c]);
    const low = feet.some(([x, y]) => y <= groundAt(x)) || s.y - 2 <= groundAt(s.x);
    if (low) touchdown();
    emit("tick");
  }
  function touchdown() {
    const s = ship, pad = padAt(s.x - CR.size) && padAt(s.x + CR.size) && padAt(s.x);
    const ok = pad && -s.vy <= LD.maxV && Math.abs(s.vx) <= LD.maxH && Math.abs(Math.atan2(Math.sin(s.a), Math.cos(s.a))) <= LD.maxAngle;
    if (!ok) return crash(pad ? (-s.vy > LD.maxV ? "TOO FAST" : Math.abs(s.vx) > LD.maxH ? "SIDEWAYS DRIFT" : "NOT LEVEL") : "MISSED THE PAD");
    s.y = pad.y + CR.size; s.vx = s.vy = 0; s.a = 0; Sound.engine(0); Sound.sfx("land");
    const pts = Math.round(pad.mult * (100 + s.fuel * 5)); score += pts; hops++;
    if (mode === "free") {
      if (pad.used) { state = "landed"; setTimeout(() => { if (state === "landed") { state = "fly"; ship.vy = 6; ship.y += 2; } }, 900); msg = { t: 0, s: "PAD ALREADY USED · NO REFUEL" }; return; }
      pad.used = true; s.fuel = Math.min(100, s.fuel + CF.freeFlight.refuel); msg = { t: 0, s: `HOP ${hops} · ×${pad.mult} · +${pts} · REFUELLED` }; state = "landed";
      setTimeout(() => { if (state === "landed") { state = "fly"; ship.vy = 4; ship.y += 2; } }, 1100); emit("hud"); return;
    }
    state = "done";
    const st = 1 + (pad.mult >= 4 ? 1 : 0) + (s.fuel >= 25 ? 1 : 0);
    setTimeout(() => emit("landed", { mission: mi, mult: pad.mult, fuel: s.fuel, score: pts, stars: st }), 900);
  }
  function crash(why) {
    state = "crashed"; Sound.engine(0); Sound.sfx("crash"); const s = ship;
    for (let i = 0; i < 18; i++) { const a = Math.random() * 6.28, sp = 4 + Math.random() * 14; debris.push({ x: s.x, y: s.y, vx: Math.cos(a) * sp + s.vx * 0.3, vy: Math.abs(Math.sin(a)) * sp, r: Math.random() * 6, vr: (Math.random() - 0.5) * 10, l: 1 + Math.random() * 3, t: 0 }); }
    setTimeout(() => emit("crashed", { why, mission: mi, mode, score, hops }), 1500);
  }

  /* ---------- vector CRT drawing ---------- */
  const PH = "#5dff8a", AMB = "#ffb23d", RED = "#ff4d4d";
  const W2S = (x, y) => [(x - cam.x) * cam.z + VW / 2, VH * 0.62 - (y - cam.y) * cam.z];
  function glowLine(pts, color = PH, w = 2) { g.strokeStyle = color; g.lineWidth = w; g.shadowColor = color; g.shadowBlur = 10; g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke(); g.shadowBlur = 0; }
  function text(s, x, y, size = 14, color = PH, align = "left") { g.font = `${size}px 'OCR A Std','OCR-A','Courier New',ui-monospace,monospace`; g.textAlign = align; g.fillStyle = color; g.shadowColor = color; g.shadowBlur = 8; g.fillText(s, x, y); g.shadowBlur = 0; }
  function render() {
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.fillStyle = "#020a05"; g.fillRect(0, 0, VW, VH);
    if (!ship) return;
    // camera: follow the craft, zoom in close to the ground
    const alt = ship.y - groundAt(ship.x), zT = Math.max(1.3, Math.min(5.5, 380 / Math.max(40, alt + 30))) * (VW / 400);
    cam.z += (zT - cam.z) * 0.06; cam.x += (ship.x - cam.x) * 0.12; cam.y += (ship.y - VH * 0.12 / cam.z - cam.y) * 0.12;
    stars.forEach(st => { g.fillStyle = `rgba(93,255,138,${0.2 + st.b * 0.5})`; g.fillRect(((st.x * VW * 3 - cam.x * 0.2) % VW + VW) % VW, st.y * VH * 0.5, 1.5, 1.5); });
    // terrain + pads
    const x0 = cam.x - VW / 2 / cam.z - 20, x1 = cam.x + VW / 2 / cam.z + 20, pts = terrain.filter(p => p[0] >= x0 - STEP * 2 && p[0] <= x1 + STEP * 2).map(p => W2S(...p));
    glowLine(pts, PH, 2);
    pads.forEach(p => { if (p.x1 < x0 || p.x0 > x1) return; const [a, b] = W2S(p.x0, p.y), [c] = W2S(p.x1, p.y), col = p.used ? "rgba(93,255,138,.4)" : AMB; glowLine([[a, b], [c, b]], col, 4); text("×" + p.mult, (a + c) / 2, b + 18, 12, col, "center"); if (!p.used) { const blink = Math.floor(clock * 2) % 2; if (blink) { glowLine([[a, b], [a, b - 8]], col, 2); glowLine([[c, b], [c, b - 8]], col, 2); } } });
    // craft
    if (state !== "crashed") {
      const s = ship, c = Math.cos(s.a), sn = Math.sin(s.a), k = CR.size;
      const P = (x, y) => W2S(s.x + x * c + y * sn, s.y - x * sn + y * c);
      glowLine([P(-k * 0.6, -k * 0.2), P(-k * 0.6, k * 0.6), P(0, k * 1.1), P(k * 0.6, k * 0.6), P(k * 0.6, -k * 0.2), P(-k * 0.6, -k * 0.2)], PH, 2);
      glowLine([P(-k * 0.6, -k * 0.2), P(-k, -k)], PH, 2); glowLine([P(k * 0.6, -k * 0.2), P(k, -k)], PH, 2);
      glowLine([P(-k * 1.2, -k), P(-k * 0.8, -k)], PH, 2); glowLine([P(k * 0.8, -k), P(k * 1.2, -k)], PH, 2);
      glowLine([P(-k * 0.3, -k * 0.2), P(-k * 0.2, -k * 0.5), P(k * 0.2, -k * 0.5), P(k * 0.3, -k * 0.2)], PH, 1.5);
      if (s.thrusting) { const f = 1.2 + Math.random() * 1.6; glowLine([P(-k * 0.2, -k * 0.5), P(0, -k * 0.5 - k * f), P(k * 0.2, -k * 0.5)], AMB, 2); }
    }
    debris.forEach(d => { const [x, y] = W2S(d.x, d.y), l = d.l * cam.z; glowLine([[x - Math.cos(d.r) * l, y - Math.sin(d.r) * l], [x + Math.cos(d.r) * l, y + Math.sin(d.r) * l]], d.t < 0.6 ? AMB : PH, 1.5); });
    // readouts
    const s = ship, vs = -s.vy, warnV = vs > LD.maxV, warnH = Math.abs(s.vx) > LD.maxH, ang = Math.atan2(Math.sin(s.a), Math.cos(s.a)), warnA = Math.abs(ang) > LD.maxAngle;
    const top = 70, col = b => b ? RED : PH;
    text(`ALT  ${Math.max(0, alt).toFixed(0).padStart(4)} M`, 14, top, 14);
    text(`VSPD ${(-s.vy).toFixed(1).padStart(5)}`, 14, top + 20, 14, col(warnV && alt < 80));
    text(`HSPD ${s.vx.toFixed(1).padStart(5)}`, 14, top + 40, 14, col(warnH && alt < 80));
    text(`ANGL ${(ang * 57.3).toFixed(0).padStart(4)}°`, 14, top + 60, 14, col(warnA && alt < 80));
    text(`FUEL`, VW - 120, top, 14, s.fuel < 15 ? RED : PH); g.strokeStyle = PH; g.lineWidth = 1.5; g.strokeRect(VW - 120, top + 8, 100, 10); g.fillStyle = s.fuel < 15 ? RED : PH; g.fillRect(VW - 118, top + 10, 96 * s.fuel / 100, 6);
    text(`SCORE ${score}`, VW - 120, top + 40, 14);
    if (wind) text(`WIND ${wind.toFixed(1)} →`, VW - 120, top + 60, 12, AMB);
    if (msg) text(msg.s, VW / 2, VH * 0.3, 15, AMB, "center");
    if (state === "fly" && alt < 60) { const ok = !warnV && !warnH && !warnA && padAt(s.x); text(ok ? "▼ GO FOR LANDING" : "▼ CHECK SPEED / PAD", VW / 2, VH * 0.36, 13, ok ? PH : AMB, "center"); }
  }

  /* ---------- input ---------- */
  const KM = { ArrowLeft: "left", a: "left", ArrowRight: "right", d: "right", ArrowUp: "thrust", w: "thrust", " ": "thrust" };
  addEventListener("keydown", e => { if (KM[e.key]) { e.preventDefault(); keys[KM[e.key]] = true; } if (e.key === "Escape" || e.key === "p") emit("pauseKey"); });
  addEventListener("keyup", e => { if (KM[e.key]) keys[KM[e.key]] = false; });

  function fit() { VW = innerWidth; VH = innerHeight; dpr = Math.min(2, devicePixelRatio || 1); cv.width = Math.round(VW * dpr); cv.height = Math.round(VH * dpr); cv.style.width = VW + "px"; cv.style.height = VH + "px"; }
  addEventListener("resize", fit); fit();
  let lt = 0; (function loop(t) { const dt = Math.min(0.033, (t - lt) / 1000 || 0.016); lt = t; step(dt); render(); requestAnimationFrame(loop); })(0);

  return {
    on: (n, f) => hooks[n] = f, start, step, render, groundAt,
    key(k, v) { keys[k] = v; },
    pause() { paused = true; }, resume() { paused = false; }, quit() { state = "idle"; ship = null; Sound.engine(0); },
    refuel() { ship.fuel = Math.min(100, ship.fuel + 40); },
    retry() { start(mode, mi); },
    get state() { return state; }, get ship() { return ship; }, get pads() { return pads; }, get score() { return score; }, get hops() { return hops; }, get mode() { return mode; }, get mission() { return mi; }, get gravity() { return gravity; }
  };
})();

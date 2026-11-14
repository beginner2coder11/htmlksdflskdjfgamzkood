/* ==========================================================================
   LANE RUSH — engine
   Scrolling road, lane traffic with blinkers + lane changes, Two-Way mode,
   near-miss detection, nitro, pickups, areas that blend, clay-style drawing.
   ========================================================================== */
window.Game = (() => {
  const CF = window.GAME_CONFIG, D = CF.drive, RD = CF.road;
  const W = 400, LW = (RD.right - RD.left) / RD.lanes;
  const laneX = i => RD.left + LW * (i + 0.5);
  const cv = document.getElementById("road"); let g = cv.getContext("2d");
  let H = 760, k = 1, dpr = 1;
  const hooks = {}, emit = (n, d) => hooks[n] && hooks[n](d);

  let state = "idle", mode = "endless", car = CF.cars[0], paused = false;
  let px = W / 2, tx = W / 2, pvx = 0, speed = 0, dist = 0, nitro = 0.3, boosting = false, boostTime = 0;
  let traffic = [], coins = [], pickups = [], deco = [], bits = [], streaks = [], texts = [];
  let nearCount = 0, combo = 0, comboT = 0, coinCount = 0, score = 0, shieldT = 0, magnetT = 0, spawnAcc = 0, coinAcc = 0, decoAcc = 0, scroll = 0;
  let shake = 0, crashT = 0, countdown = 0, slowmo = 1, areaIdx = 0, areaBlend = 1, prevArea = 0, clock = 0;
  const PY = () => H * 0.76, PW = 32, PH = 56;

  /* ---------- spawning ---------- */
  function weighted(list) { const tot = list.reduce((s, x) => s + x.weight, 0); let r = Math.random() * tot; for (const x of list) { r -= x.weight; if (r <= 0) return x; } return list[0]; }
  const oncoming = lane => mode === "twoway" && lane < 2;
  function laneBusy(lane, y0, y1) { return traffic.some(t => (t.lane === lane || t.toLane === lane) && t.y + t.h / 2 > y0 && t.y - t.h / 2 < y1); }
  function spawnCar() {
    // keep at least one lane open in the band where the new car appears
    const free = [0, 1, 2, 3].filter(l => !laneBusy(l, -360, 60));
    if (free.length <= 2) return;          // never build a wall: two lanes stay open in every band
    const lane = free[Math.floor(Math.random() * free.length)], type = weighted(CF.traffic);
    const opens = [0, 1, 2, 3].filter(l => l !== lane && !laneBusy(l, -320, 40));
    if (!opens.length) return;
    const t = { lane, toLane: lane, x: laneX(lane), y: -type.h, w: type.w, h: type.h, type: type.id, sp: type.speed * D.startSpeed * (0.85 + Math.random() * 0.3),
      color: CF.trafficColors[Math.floor(Math.random() * CF.trafficColors.length)], dir: oncoming(lane) ? 1 : -1, counted: false, blink: 0, change: null };
    if (!oncoming(lane) && Math.random() < CF.laneChangeChance) t.change = { at: 0.8 + Math.random() * 2.4, t: 0 };
    traffic.push(t);
  }
  function spawnCoins() {
    const lane = Math.floor(Math.random() * 4); if (laneBusy(lane, -420, 60)) return;
    const n = 4 + Math.floor(Math.random() * 4), curve = Math.random() < 0.35;
    for (let i = 0; i < n; i++) coins.push({ x: laneX(lane) + (curve ? Math.sin(i / (n - 1) * Math.PI) * LW * 0.9 * (lane < 2 ? 1 : -1) : 0), y: -40 - i * 42, spin: i * 0.4 });
    if (Math.random() < 0.12) { const p = weighted(CF.pickups); pickups.push({ p, x: laneX((lane + 2) % 4), y: -60, bob: 0 }); }
  }
  function spawnDeco() {
    const area = CF.areas[areaIdx];
    for (const side of [0, 1]) {
      if (Math.random() < 0.45) continue;
      const kind = area.deco[Math.floor(Math.random() * area.deco.length)];
      const x = side ? RD.right + 14 + Math.random() * (W - RD.right - 28) : 14 + Math.random() * (RD.left - 28);
      deco.push({ kind, x, y: -60, s: 0.8 + Math.random() * 0.5, area: areaIdx, hue: Math.random() });
    }
  }

  /* ---------- run control ---------- */
  function start(m, c, attract = false) {
    mode = m; car = c; state = attract ? "attract" : "count"; countdown = 3.2; paused = false;
    px = tx = W / 2; pvx = 0; speed = D.startSpeed; dist = 0; nitro = 0.3; boosting = false; boostTime = 0;
    traffic = []; coins = []; pickups = []; bits = []; streaks = []; texts = [];
    nearCount = 0; combo = 0; coinCount = 0; score = 0; shieldT = 0; magnetT = 0; spawnAcc = 0; coinAcc = 0; crashT = 0; slowmo = 1;
    areaIdx = 0; prevArea = 0; areaBlend = 1;
    deco = []; for (let y = -60; y < H + 60; y += 70) { spawnDeco(); deco.forEach(d => { if (d.y === -60) d.y = y; }); }
    emit("hud");
  }
  function crash(t) {
    state = "crash"; crashT = 0; slowmo = 0.25; shake = 16; Sound.sfx("crash"); boosting = false;
    for (let i = 0; i < 26; i++) { const a = Math.random() * 6.28, s = 60 + Math.random() * 260; bits.push({ x: (px + t.x) / 2, y: PY() - PH / 3, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: 3 + Math.random() * 6, color: i % 2 ? car.body : t.color, t: 0, spin: Math.random() * 6 }); }
    t.spinV = (Math.random() < 0.5 ? -1 : 1) * 6; t.crashed = true;
  }
  function finish() {
    state = "over";
    emit("over", { dist: Math.floor(dist * D.metresPerUnit), near: nearCount, coins: coinCount, score: Math.floor(score), boost: boostTime, mode });
  }

  /* ---------- update ---------- */
  function step(dtReal) {
    clock += dtReal;
    if (paused || state === "idle" || state === "over") return;
    if (state === "count") {
      const before = Math.ceil(countdown); countdown -= dtReal;
      if (Math.ceil(countdown) !== before && countdown > 0) Sound.sfx("count", false);
      if (countdown <= 0) { state = "play"; Sound.sfx("count", true); emit("go"); }
    }
    const dt = dtReal * slowmo;
    if (state === "crash") { crashT += dtReal; slowmo = Math.min(1, slowmo + dtReal * 0.6); speed *= 0.96; if (crashT > 1.1) finish(); }
    const driving = state === "play";
    // speed + nitro
    if (driving) {
      speed = Math.min(D.maxSpeed * car.top, speed + D.accel * dt);
      if (boosting && nitro > 0) { nitro = Math.max(0, nitro - D.nitroDrain / car.tank * dt); boostTime += dt; if (nitro === 0) { boosting = false; emit("hud"); } }
    }
    const v = (state === "count" ? 0 : state === "attract" ? D.startSpeed * 0.8 : speed) * (boosting ? D.nitroBoost : 1);
    // steering
    if (driving) {
      const maxV = 420 * car.grip, want = Math.max(RD.left + PW / 2 + 2, Math.min(RD.right - PW / 2 - 2, tx));
      pvx = Math.max(-maxV, Math.min(maxV, (want - px) * 9)); px += pvx * dt;
    } else pvx *= 0.9;
    dist += v * dt; scroll = (scroll + v * dt) % 80;
    if (driving) score += v * dt * D.metresPerUnit;
    // areas
    const ai = Math.floor(dist * D.metresPerUnit / CF.areaEvery) % CF.areas.length;
    if (ai !== areaIdx) { prevArea = areaIdx; areaIdx = ai; areaBlend = 0; Sound.sfx("area"); emit("area", CF.areas[ai]); }
    areaBlend = Math.min(1, areaBlend + dt * 0.5);
    // spawn by distance so density scales with speed
    if (state !== "count") {
      spawnAcc += Math.max(60, v - D.startSpeed * 0.5) * dt; const gap = Math.max(105, 230 - dist * 0.0012);   // relative distance, so density stays fair
      while (spawnAcc > gap) { spawnAcc -= gap; spawnCar(); }
      coinAcc += v * dt; if (coinAcc > 520) { coinAcc = 0; spawnCoins(); }
    }
    decoAcc += v * dt; while (decoAcc > 70) { decoAcc -= 70; spawnDeco(); }
    // traffic
    const py = PY();
    for (const t of traffic) {
      const rel = t.dir === 1 ? v + t.sp : v - t.sp;
      t.y += (t.crashed ? v * 0.6 : rel) * dt;
      if (t.crashed) { t.x += (t.flyX || 0) * dt; t.rot = (t.rot || 0) + t.spinV * dt; continue; }
      if (t.change) {
        t.change.t += dt;
        if (t.change.t > t.change.at && t.toLane === t.lane) {
          const opts = [t.lane - 1, t.lane + 1].filter(l => l >= (mode === "twoway" ? 2 : 0) && l < 4 && !laneBusy(l, t.y - t.h - 30, t.y + t.h + 30));
          if (opts.length && t.y > -40 && t.y < py - 140) { t.toLane = opts[Math.floor(Math.random() * opts.length)]; t.blink = 1.0; if (Math.random() < 0.3) Sound.sfx("honk"); }
          else t.change.at += 0.6;
        }
        if (t.toLane !== t.lane) {
          if (t.blink > 0) t.blink -= dt;
          else { const target = laneX(t.toLane); t.x += Math.sign(target - t.x) * Math.min(Math.abs(target - t.x), 70 * dt); if (Math.abs(target - t.x) < 0.5) { t.lane = t.toLane; t.change = null; } }
        }
      }
      // collision with the player (slightly forgiving corners)
      if (driving) {
        const ox = (t.w + PW) / 2 - Math.abs(t.x - px), oy = (t.h + PH) / 2 - Math.abs(t.y - py);
        if (ox > 4 && oy > 6) {
          if (shieldT > 0) { t.crashed = true; t.spinV = 8 * Math.sign(t.x - px || 1); t.flyX = Math.sign(t.x - px || 1) * 380; Sound.sfx("smash"); shake = 6; score += 25; texts.push({ x: t.x, y: t.y, s: "SMASH +25", t: 0, c: "#6fd3ff" }); }
          else { crash(t); break; }
        }
        // near miss: counted once, as the car's centre passes the player's centre
        if (!t.counted && ((t.dir === -1 && t.y > py) || (t.dir === 1 && t.y > py))) {
          t.counted = true;
          const gap = Math.abs(t.x - px) - (t.w + PW) / 2;
          if (gap > -4 && gap < D.nearMissDist) {
            nearCount++; combo = comboT > 0 ? combo + 1 : 1; comboT = 2.2;
            const pts = 40 * combo * (t.dir === 1 ? 2 : 1); score += pts;
            nitro = Math.min(1, nitro + D.nearMissNitro * (t.dir === 1 ? 1.5 : 1));
            Sound.sfx("near", combo); texts.push({ x: (t.x + px) / 2, y: py - 40, s: (combo > 1 ? combo + "× " : "") + "NEAR MISS +" + pts, t: 0, c: "#fff" });
            for (let i = 0; i < 8; i++) streaks.push({ x: (t.x + px) / 2 + (Math.random() - 0.5) * 10, y: py + (Math.random() - 0.5) * 50, len: 30 + Math.random() * 40, t: 0 });
            emit("hud");
          }
        }
      }
    }
    traffic = traffic.filter(t => t.y < H + 160 && t.y > -400 && t.x > -100 && t.x < W + 100);
    if (comboT > 0 && (comboT -= dt) <= 0) combo = 0;
    // coins + pickups
    if (magnetT > 0) magnetT -= dt; if (shieldT > 0) shieldT -= dt;
    for (const c of coins) {
      c.y += v * dt; c.spin += dt * 6;
      if (magnetT > 0 && Math.abs(c.y - py) < 260) { c.x += (px - c.x) * Math.min(1, dt * 6); c.y += (py - c.y) * Math.min(1, dt * 4); }
      if (driving && Math.abs(c.x - px) < 24 && Math.abs(c.y - py) < 34) { c.got = true; coinCount += D.coinValue; Sound.sfx("coin"); emit("hud"); }
    }
    coins = coins.filter(c => !c.got && c.y < H + 30);
    for (const p of pickups) {
      p.y += v * dt; p.bob += dt * 4;
      if (driving && Math.abs(p.x - px) < 26 && Math.abs(p.y - py) < 36) {
        p.got = true; Sound.sfx("pickup"); texts.push({ x: px, y: py - 60, s: p.p.name.toUpperCase(), t: 0, c: p.p.color });
        if (p.p.id === "shield") shieldT = p.p.time; if (p.p.id === "magnet") magnetT = p.p.time; if (p.p.id === "nitro") nitro = 1;
        emit("hud");
      }
    }
    pickups = pickups.filter(p => !p.got && p.y < H + 30);
    deco.forEach(d => d.y += v * dt); deco = deco.filter(d => d.y < H + 80);
    if (boosting) for (let i = 0; i < 2; i++) streaks.push({ x: RD.left + Math.random() * (RD.right - RD.left), y: -20, len: 40 + Math.random() * 60, t: 0, fast: true });
    streaks.forEach(s => { s.t += dt; s.y += (s.fast ? v * 1.8 : 0) * dt; }); streaks = streaks.filter(s => s.t < 0.35 && s.y < H + 60);
    bits.forEach(b => { b.t += dtReal; b.x += b.vx * dtReal; b.y += b.vy * dtReal; b.vx *= 0.96; b.vy *= 0.96; b.spin += dtReal * 5; }); bits = bits.filter(b => b.t < 1.6);
    texts.forEach(t => { t.t += dtReal; t.y -= 40 * dtReal; }); texts = texts.filter(t => t.t < 1);
    shake = Math.max(0, shake - dtReal * 25);
    Sound.engine(v, state === "play" || state === "count", boosting);
    emit("tick");
  }

  /* ---------- clay drawing ---------- */
  function mix(a, b, t) { const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16); const c = s => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t); return `rgb(${c(16)},${c(8)},${c(0)})`; }
  function shade(hex, f) { const p = parseInt(hex.slice(1), 16), c = s => Math.max(0, Math.min(255, Math.round(((p >> s) & 255) * f))); return `rgb(${c(16)},${c(8)},${c(0)})`; }
  function clay(x, y, w, h, r, color, depth = 6) {
    g.save(); g.shadowColor = "rgba(40,30,60,.28)"; g.shadowBlur = 10; g.shadowOffsetX = depth * 0.6; g.shadowOffsetY = depth;
    g.fillStyle = shade(color, 0.82); g.beginPath(); g.roundRect(x - w / 2, y - h / 2 + 2, w, h, r); g.fill(); g.restore();
    const gr = g.createLinearGradient(x - w / 2, y - h / 2, x + w / 2, y + h / 2); gr.addColorStop(0, shade(color, 1.12)); gr.addColorStop(1, color);
    g.fillStyle = gr; g.beginPath(); g.roundRect(x - w / 2, y - h / 2, w, h - 2, r); g.fill();
  }
  function blob(x, y, r, color) {
    g.save(); g.shadowColor = "rgba(40,30,60,.25)"; g.shadowBlur = 8; g.shadowOffsetX = 3; g.shadowOffsetY = 5;
    const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r); gr.addColorStop(0, shade(color, 1.18)); gr.addColorStop(1, shade(color, 0.86));
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.restore();
  }
  function drawCar(x, y, w, h, body, roof, opts = {}) {
    g.save(); g.translate(x, y); if (opts.rot) g.rotate(opts.rot); if (opts.flip) g.rotate(Math.PI);
    g.fillStyle = "#2b2b3c"; [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => { g.beginPath(); g.roundRect(sx * w / 2 - (sx > 0 ? 4 : 2), sy * h * 0.3 - 6, 6, 12, 3); g.fill(); });
    clay(0, 0, w, h, Math.min(12, w * 0.36), body);
    const long = opts.type === "truck" || opts.type === "bus";
    if (opts.type === "truck") { clay(0, h * 0.14, w - 4, h * 0.66, 5, shade(body, 1.08), 2); g.fillStyle = "rgba(40,50,80,.6)"; g.beginPath(); g.roundRect(-w / 2 + 6, -h / 2 + 8, w - 12, 9, 3); g.fill(); }
    else if (opts.type === "bus") { g.fillStyle = "rgba(40,50,80,.55)"; for (let i = 0; i < 4; i++) { g.beginPath(); g.roundRect(-w / 2 + 3, -h / 2 + 14 + i * 19, 5, 13, 2); g.fill(); g.beginPath(); g.roundRect(w / 2 - 8, -h / 2 + 14 + i * 19, 5, 13, 2); g.fill(); } g.fillStyle = "rgba(40,50,80,.6)"; g.beginPath(); g.roundRect(-w / 2 + 5, -h / 2 + 4, w - 10, 8, 3); g.fill(); }
    else {
      g.fillStyle = "rgba(40,50,80,.62)"; g.beginPath(); g.roundRect(-w / 2 + 5, -h * 0.26, w - 10, h * 0.15, 4); g.fill();
      g.beginPath(); g.roundRect(-w / 2 + 6, h * 0.22, w - 12, h * 0.1, 3); g.fill();
      g.fillStyle = roof; g.beginPath(); g.roundRect(-w / 2 + 6, -h * 0.1, w - 12, h * 0.3, 6); g.fill();
      g.fillStyle = "rgba(255,255,255,.45)"; g.beginPath(); g.roundRect(-w / 2 + 8, -h * 0.07, (w - 16) * 0.5, 4, 2); g.fill();
    }
    g.fillStyle = "#fff7c2"; g.beginPath(); g.arc(-w / 2 + 6, -h / 2 + 4, 2.6, 0, 7); g.arc(w / 2 - 6, -h / 2 + 4, 2.6, 0, 7); g.fill();
    g.fillStyle = "#ff5a5a"; g.fillRect(-w / 2 + 3, h / 2 - 5, 6, 3); g.fillRect(w / 2 - 9, h / 2 - 5, 6, 3);
    if (opts.blinkDir && Math.floor(clock * 6) % 2 === 0) { g.fillStyle = "#ffae00"; const sx = opts.blinkDir > 0 ? w / 2 - 2 : -w / 2 + 2; g.beginPath(); g.arc(sx, -h / 2 + 7, 3.5, 0, 7); g.arc(sx, h / 2 - 7, 3.5, 0, 7); g.fill(); }
    g.restore();
    if (long) return;
  }
  function drawDeco(d) {
    const a = CF.areas[d.area], s = d.s;
    if (d.kind === "tree") { blob(d.x, d.y + 4 * s, 6 * s, "#9a6a45"); blob(d.x, d.y - 6 * s, 17 * s, d.hue > 0.5 ? "#5fbf6a" : "#7ccf5f"); }
    if (d.kind === "bush") { blob(d.x - 7 * s, d.y, 9 * s, "#6cc46a"); blob(d.x + 6 * s, d.y + 2 * s, 10 * s, "#5fb85e"); }
    if (d.kind === "house") { clay(d.x, d.y, 34 * s, 30 * s, 6, ["#ffd1c9", "#d4eeff", "#fff0c9"][Math.floor(d.hue * 3)]); g.fillStyle = shade("#ff8f7a", 1); g.beginPath(); g.roundRect(d.x - 19 * s, d.y - 19 * s, 38 * s, 14 * s, 5); g.fill(); }
    if (d.kind === "cactus") { clay(d.x, d.y, 10 * s, 34 * s, 5, "#5fb87a", 4); clay(d.x - 9 * s, d.y - 2 * s, 7 * s, 16 * s, 3, "#5fb87a", 3); }
    if (d.kind === "rock") blob(d.x, d.y, 11 * s, "#c9a27a");
    if (d.kind === "pine") { blob(d.x, d.y, 15 * s, "#4f9a7a"); blob(d.x, d.y - 6 * s, 10 * s, "#f8fbff"); }
    if (d.kind === "snowman") { blob(d.x, d.y + 4 * s, 11 * s, "#ffffff"); blob(d.x, d.y - 9 * s, 7 * s, "#ffffff"); g.fillStyle = "#ff8a3d"; g.fillRect(d.x, d.y - 10 * s, 6 * s, 2 * s); }
    if (d.kind === "tower") { clay(d.x, d.y, 36 * s, 46 * s, 5, ["#7a76b8", "#8d6fb5", "#5f8ab5"][Math.floor(d.hue * 3)]); g.fillStyle = "#ffd86b"; for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) if ((i + j + Math.floor(d.hue * 10)) % 3) g.fillRect(d.x - 12 * s + j * 16 * s, d.y - 16 * s + i * 9 * s, 7 * s, 4 * s); }
    if (d.kind === "lamp") { g.fillStyle = "rgba(255,216,107,.25)"; g.beginPath(); g.arc(d.x, d.y, 22 * s, 0, 7); g.fill(); blob(d.x, d.y, 5 * s, "#ffd86b"); }
  }
  function render() {
    g.setTransform(k * dpr, 0, 0, k * dpr, 0, 0);
    const A = CF.areas[areaIdx], P = CF.areas[prevArea], t = areaBlend;
    g.save();
    if (shake) g.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    g.fillStyle = mix(P.grass, A.grass, t); g.fillRect(-20, -20, W + 40, H + 40);
    g.fillStyle = mix(P.grass2, A.grass2, t);
    for (let y = -80 + scroll; y < H + 80; y += 80) { g.fillRect(0, y, RD.left - 8, 40); g.fillRect(RD.right + 8, y + 40, W - RD.right, 40); }
    // road with curb
    g.save(); g.shadowColor = "rgba(40,30,60,.25)"; g.shadowBlur = 12; g.shadowOffsetY = 4;
    g.fillStyle = mix(P.road, A.road, t); g.beginPath(); g.roundRect(RD.left - 8, -40, RD.right - RD.left + 16, H + 80, 10); g.fill(); g.restore();
    g.fillStyle = "rgba(255,255,255,.75)"; for (let y = -80 + scroll; y < H + 80; y += 40) { g.fillStyle = (Math.floor((y - scroll) / 40) % 2) ? "#ff8f8f" : "#ffffff"; g.fillRect(RD.left - 8, y, 6, 40); g.fillRect(RD.right + 2, y, 6, 40); }
    g.fillStyle = mix(P.line, A.line, t);
    for (let l = 1; l < RD.lanes; l++) {
      const x = RD.left + l * LW;
      if (mode === "twoway" && l === 2) { g.fillStyle = "#ffcf3a"; g.fillRect(x - 5, -40, 3, H + 80); g.fillRect(x + 2, -40, 3, H + 80); g.fillStyle = mix(P.line, A.line, t); continue; }
      for (let y = -80 + scroll * 1; y < H + 80; y += 80) { g.beginPath(); g.roundRect(x - 3, y, 6, 40, 3); g.fill(); }
    }
    deco.forEach(drawDeco);
    // coins
    coins.forEach(c => { const sx = Math.abs(Math.cos(c.spin)); g.save(); g.translate(c.x, c.y); g.scale(Math.max(0.2, sx), 1); blob(0, 0, 9, "#ffcf3a"); g.fillStyle = "#e8a400"; g.beginPath(); g.arc(0, 0, 4.5, 0, 7); g.fill(); g.restore(); });
    pickups.forEach(p => { const y = p.y + Math.sin(p.bob) * 3; blob(p.x, y, 15, p.p.color); g.fillStyle = "#fff"; g.font = "800 15px system-ui"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(p.p.id === "shield" ? "🛡" : p.p.id === "magnet" ? "🧲" : "⚡", p.x, y + 1); });
    // traffic
    traffic.forEach(c => drawCar(c.x, c.y, c.w, c.h, c.color, shade(c.color, 1.2), { type: c.type, flip: c.dir === 1, rot: c.rot, blinkDir: c.toLane !== c.lane && c.blink > -0.01 ? (c.toLane > c.lane ? 1 : -1) * (c.dir === 1 ? -1 : 1) : 0 }));
    // player
    if (state !== "idle" && state !== "attract") {
      const py = PY();
      if (boosting) { g.fillStyle = "rgba(255,178,46,.7)"; for (let i = 0; i < 2; i++) { g.beginPath(); g.ellipse(px + (i ? 8 : -8), py + PH / 2 + 10 + Math.random() * 6, 5, 12 + Math.random() * 8, 0, 0, 7); g.fill(); } }
      drawCar(px, py, PW, PH, car.body, car.roof, { rot: state === "crash" ? crashT * 8 : pvx * 0.0007 });
      if (shieldT > 0) { g.strokeStyle = `rgba(111,211,255,${0.5 + Math.sin(clock * 12) * 0.3})`; g.lineWidth = 4; g.beginPath(); g.ellipse(px, py, PW * 0.9, PH * 0.72, 0, 0, 7); g.stroke(); }
      if (magnetT > 0) { g.strokeStyle = "rgba(255,122,182,.35)"; g.lineWidth = 2; g.setLineDash([4, 6]); g.beginPath(); g.arc(px, py, 70 + Math.sin(clock * 6) * 6, 0, 7); g.stroke(); g.setLineDash([]); }
    }
    g.strokeStyle = "rgba(255,255,255,.8)"; g.lineCap = "round";
    streaks.forEach(s => { g.globalAlpha = 1 - s.t / 0.35; g.lineWidth = s.fast ? 2 : 3; g.beginPath(); g.moveTo(s.x, s.y); g.lineTo(s.x, s.y + s.len); g.stroke(); });
    g.globalAlpha = 1;
    bits.forEach(b => { g.globalAlpha = Math.max(0, 1 - b.t / 1.6); blob(b.x, b.y, b.r, b.color); }); g.globalAlpha = 1;
    g.textAlign = "center"; g.textBaseline = "middle"; g.font = "900 15px 'Avenir Next Rounded','Nunito',ui-rounded,system-ui";
    texts.forEach(t => { g.globalAlpha = 1 - t.t; g.lineWidth = 5; g.strokeStyle = "rgba(60,40,90,.55)"; g.fillStyle = t.c; g.strokeText(t.s, t.x, t.y); g.fillText(t.s, t.x, t.y); });
    g.globalAlpha = 1;
    if (state === "count") { const n = Math.ceil(countdown); g.font = "900 90px 'Avenir Next Rounded','Nunito',ui-rounded,system-ui"; g.fillStyle = "#fff"; g.strokeStyle = "rgba(60,40,90,.5)"; g.lineWidth = 10; const s = n > 0 ? String(n) : "GO!"; g.strokeText(s, W / 2, H * 0.4); g.fillText(s, W / 2, H * 0.4); }
    g.restore();
  }

  /* ---------- input ---------- */
  let drag = null;
  cv.addEventListener("pointerdown", e => { const r = cv.getBoundingClientRect(); drag = { x0: (e.clientX - r.left) / r.width * W, p0: tx }; });
  addEventListener("pointermove", e => { if (!drag) return; const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W; tx = drag.p0 + (x - drag.x0) * 1.3; });
  addEventListener("pointerup", () => drag = null);
  const keys = {};
  addEventListener("keydown", e => { keys[e.key] = true; if (e.key === " " || e.key === "ArrowUp" || e.key === "w") setNitro(true); if (e.key === "Escape" || e.key === "p") emit("pauseKey"); });
  addEventListener("keyup", e => { keys[e.key] = false; if (e.key === " " || e.key === "ArrowUp" || e.key === "w") setNitro(false); });
  let keySteer = false;
  setInterval(() => {
    const L = keys.ArrowLeft || keys.a, R = keys.ArrowRight || keys.d;
    if (L) tx = Math.max(RD.left, px - 60); else if (R) tx = Math.min(RD.right, px + 60); else if (keySteer) tx = px;
    keySteer = !!(L || R);
  }, 30);
  function setNitro(on) { if (state !== "play") { boosting = false; return; } if (on && nitro > 0.08 && !boosting) { boosting = true; Sound.sfx("nitro"); } if (!on) boosting = false; emit("hud"); }

  function fit() {
    const vw = innerWidth, vh = innerHeight; H = Math.max(640, Math.min(920, W * vh / vw)); k = Math.min(vw / W, vh / H); dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = Math.round(W * k * dpr); cv.height = Math.round(H * k * dpr); cv.style.width = W * k + "px"; cv.style.height = H * k + "px";
  }
  addEventListener("resize", fit); fit();
  let last = 0;
  (function loop(ts) { const dt = Math.min(0.033, (ts - last) / 1000 || 0.016); last = ts; step(dt); render(); requestAnimationFrame(loop); })(0);

  return {
    on: (n, f) => hooks[n] = f, start, step, render, setNitro,
    steer(x) { tx = x; },
    paintCar(canvas, c, angle = 0) {          // draws a garage preview with the same clay renderer
      const main = g; g = canvas.getContext("2d"); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, canvas.width, canvas.height);
      g.translate(canvas.width / 2, canvas.height / 2); g.scale(canvas.width / 120, canvas.width / 120); g.rotate(angle);
      drawCar(0, 0, PW, PH, c.body, c.roof); g = main;
    },
    pause() { paused = true; Sound.engine(0, false); }, resume() { paused = false; },
    revive() { traffic = traffic.filter(t => Math.abs(t.y - PY()) > 260); traffic.forEach(t => t.counted = true); state = "play"; slowmo = 1; speed = Math.max(D.startSpeed, speed * 0.8); shieldT = 3; emit("hud"); },
    quit() { state = "idle"; traffic = []; Sound.engine(0, false); },
    get state() { return state; }, get speed() { return speed; }, get nitro() { return nitro; }, get boosting() { return boosting; },
    get metres() { return Math.floor(dist * D.metresPerUnit); }, get near() { return nearCount; }, get coins() { return coinCount; }, get score() { return Math.floor(score); },
    get combo() { return combo; }, get traffic() { return traffic; }, get px() { return px; }, get py() { return PY(); }, get shield() { return shieldT; }, get magnet() { return magnetT; }, get area() { return CF.areas[areaIdx]; }
  };
})();

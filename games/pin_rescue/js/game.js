/* PIN RESCUE — game: runs the physics (js/physics.js) at a fixed step, pin taps, win / lose, and all
   the drawing: glass tower, golden pins, glowing lava, water, gems, the explorer and the monster. */
window.Game = (() => {
  const C = window.GAME_CONFIG, PH = window.Phys;
  const cv = document.getElementById("view"), ctx = cv.getContext("2d");
  const TAU = Math.PI * 2;
  let DPR = 1, VW = 0, VH = 0, s = 1, ox = 0, oy = 0, u = 1;
  const on = {};
  let mode = "idle", n = 1, L = null, W = null, acc = 0, t = 0, fx = [], endT = 0, ending = null, heroState = "idle", heroT = 0, hintPin = -1, sprites = {}, bg = null, bot = false, botT = 0, hand = null, themeId = C.themes[0].id;

  const ease = x => x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2;
  function canvasOf(w, h) { const c = document.createElement("canvas"); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
  const X = x => ox + x * s, Y = y => oy + y * s;

  /* ---------- layout ---------- */
  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1); VW = innerWidth; VH = innerHeight;
    cv.width = VW * DPR; cv.height = VH * DPR; cv.style.width = VW + "px"; cv.style.height = VH + "px";
    u = Math.min(VW / 400, VH / 820, 1.3);
    s = Math.min((VW - 12) / 360, (VH - 70 - 100) / 596);
    ox = (VW - 360 * s) / 2; oy = 70 + ((VH - 70 - 100) - 596 * s) / 2 - 26 * s;
    bake();
  }

  /* ---------- sprites ---------- */
  function sprite(r, draw) { const S = (r * 2 + 8) * s * DPR, c = canvasOf(S, S), g = c.getContext("2d"); g.translate(S / 2, S / 2); g.scale(s * DPR, s * DPR); draw(g, r); return { c, w: S / DPR }; }
  function bake() {
    if (!VW) return;
    const R = PH.RAD;
    sprites.coin = sprite(R.gem, (g, r) => { const gr = g.createRadialGradient(-r * 0.35, -r * 0.35, 0.5, 0, 0, r); gr.addColorStop(0, "#fff7b0"); gr.addColorStop(0.5, "#ffd23f"); gr.addColorStop(1, "#d39a00"); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill(); g.strokeStyle = "#b07a00"; g.lineWidth = 0.8; g.stroke(); g.beginPath(); g.arc(0, 0, r * 0.6, 0, TAU); g.strokeStyle = "rgba(160,100,0,0.6)"; g.stroke(); g.fillStyle = "rgba(255,255,255,0.85)"; g.beginPath(); g.arc(-r * 0.35, -r * 0.4, r * 0.22, 0, TAU); g.fill(); });
    const gem = (a, b) => sprite(R.gem, (g, r) => { g.beginPath(); g.moveTo(0, -r); g.lineTo(r * 0.95, -r * 0.2); g.lineTo(0, r); g.lineTo(-r * 0.95, -r * 0.2); g.closePath(); const gr = g.createLinearGradient(-r, -r, r, r); gr.addColorStop(0, a); gr.addColorStop(1, b); g.fillStyle = gr; g.fill(); g.strokeStyle = "rgba(0,0,0,0.25)"; g.lineWidth = 0.7; g.stroke(); g.beginPath(); g.moveTo(-r * 0.95, -r * 0.2); g.lineTo(r * 0.95, -r * 0.2); g.moveTo(0, -r); g.lineTo(-r * 0.3, -r * 0.2); g.lineTo(0, r); g.moveTo(0, -r); g.lineTo(r * 0.3, -r * 0.2); g.lineTo(0, r); g.strokeStyle = "rgba(255,255,255,0.45)"; g.stroke(); });
    sprites.gems = [gem("#ff8aa0", "#d41f4a"), gem("#7ff0b0", "#1f9a5a"), gem("#9fd0ff", "#2a6ad8"), gem("#e2b0ff", "#7a3fd6")];
    sprites.lava = sprite(R.lava, (g, r) => { const gr = g.createRadialGradient(-r * 0.3, -r * 0.3, 0.5, 0, 0, r * 1.1); gr.addColorStop(0, "#fff2a0"); gr.addColorStop(0.35, "#ffb02e"); gr.addColorStop(0.8, "#ff4a1a"); gr.addColorStop(1, "#c41a0a"); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r * 1.18, 0, TAU); g.fill(); });
    sprites.glow = sprite(R.lava * 2.6, (g, r) => { const gr = g.createRadialGradient(0, 0, 0, 0, 0, r); gr.addColorStop(0, "rgba(255,140,40,0.42)"); gr.addColorStop(1, "rgba(255,80,20,0)"); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill(); });
    sprites.water = sprite(R.water, (g, r) => { const gr = g.createRadialGradient(-r * 0.3, -r * 0.4, 0.5, 0, 0, r * 1.3); gr.addColorStop(0, "rgba(220,245,255,0.95)"); gr.addColorStop(0.4, "rgba(80,180,255,0.85)"); gr.addColorStop(1, "rgba(30,110,230,0.8)"); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r * 1.3, 0, TAU); g.fill(); });
    sprites.stone = sprite(R.stone, (g, r) => { g.fillStyle = "#8a8f9e"; g.beginPath(); for (let i = 0; i < 7; i++) { const a = i / 7 * TAU, rr = r * (0.88 + (i % 3) * 0.08); g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.closePath(); g.fill(); g.strokeStyle = "#5c6070"; g.lineWidth = 0.8; g.stroke(); g.fillStyle = "rgba(255,255,255,0.35)"; g.beginPath(); g.arc(-r * 0.3, -r * 0.3, r * 0.3, 0, TAU); g.fill(); });
    sprites.rock = sprite(R.rock, (g, r) => { const gr = g.createRadialGradient(-r * 0.3, -r * 0.35, 1, 0, 0, r); gr.addColorStop(0, "#c9b8a2"); gr.addColorStop(1, "#7a6652"); g.fillStyle = gr; g.beginPath(); for (let i = 0; i < 9; i++) { const a = i / 9 * TAU, rr = r * (0.9 + (i * 7 % 3) * 0.05); g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.closePath(); g.fill(); g.strokeStyle = "#4e3e2e"; g.lineWidth = 1.2; g.stroke(); g.beginPath(); g.moveTo(-r * 0.2, -r * 0.5); g.lineTo(0.1 * r, -r * 0.1); g.lineTo(-r * 0.1, r * 0.3); g.strokeStyle = "rgba(60,40,20,0.5)"; g.stroke(); });
    bakeBg();
  }
  function bakeBg() {
    if (!L) return;
    const T = C.themes.find(x => x.id === themeId) || C.themes[0];
    bg = canvasOf(VW * DPR, VH * DPR); const g = bg.getContext("2d"); g.scale(DPR, DPR);
    const gr = g.createLinearGradient(0, 0, 0, VH); gr.addColorStop(0, T.sky[0]); gr.addColorStop(1, T.sky[1]); g.fillStyle = gr; g.fillRect(0, 0, VW, VH);
    let sd = n * 97 + 3; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    // far hills
    for (const [yy, col] of [[0.72, T.hills[0]], [0.82, T.hills[1]]]) { g.fillStyle = col; g.beginPath(); g.moveTo(0, VH); for (let x = 0; x <= VW; x += 20) g.lineTo(x, VH * yy + Math.sin(x * 0.012 + yy * 9) * 26 * u + Math.sin(x * 0.031) * 10 * u); g.lineTo(VW, VH); g.fill(); }
    // clouds
    g.fillStyle = "rgba(255,255,255,0.7)";
    for (let i = 0; i < 6; i++) { const x = rnd() * VW, y = rnd() * VH * 0.5, r = (16 + rnd() * 16) * u; for (let j = 0; j < 4; j++) { g.beginPath(); g.arc(x + j * r * 0.9, y + Math.sin(j) * r * 0.3, r * (j === 1 || j === 2 ? 1.2 : 0.9), 0, TAU); g.fill(); } }
    // glass backing inside the tower + room
    g.fillStyle = "rgba(255,255,255,0.22)";
    g.beginPath(); g.moveTo(X(26), Y(34)); g.lineTo(X(334), Y(34)); g.lineTo(X(334), Y(332)); g.lineTo(X(210), Y(412)); g.lineTo(X(210), Y(448)); g.lineTo(X(310), Y(448)); g.lineTo(X(310), Y(612)); g.lineTo(X(50), Y(612)); g.lineTo(X(50), Y(448)); g.lineTo(X(150), Y(448)); g.lineTo(X(150), Y(412)); g.lineTo(X(26), Y(332)); g.closePath(); g.fill();
    // room floor + wallpaper
    g.fillStyle = T.room; g.fillRect(X(55), Y(452), 250 * s, 158 * s);
    g.fillStyle = "rgba(255,255,255,0.12)"; for (let x = 55; x < 305; x += 22) g.fillRect(X(x), Y(452), 8 * s, 158 * s);
    g.fillStyle = T.floor; g.fillRect(X(52), Y(598), 256 * s, 12 * s);
    // walls: thick glass tubes
    for (const w of L.walls) {
      g.lineCap = "round";
      g.strokeStyle = "rgba(40,80,120,0.35)"; g.lineWidth = 13 * s; g.beginPath(); g.moveTo(X(w[0]), Y(w[1])); g.lineTo(X(w[2]), Y(w[3])); g.stroke();
      g.strokeStyle = T.glass; g.lineWidth = 10 * s; g.stroke();
      g.strokeStyle = "rgba(255,255,255,0.75)"; g.lineWidth = 2.5 * s; g.beginPath(); g.moveTo(X(w[0]) - 2 * s, Y(w[1]) - 2 * s); g.lineTo(X(w[2]) - 2 * s, Y(w[3]) - 2 * s); g.stroke();
    }
  }

  /* ---------- level ---------- */
  function load(lv, opts = {}) {
    n = lv; L = window.LEVELS[(lv - 1) % window.LEVELS.length]; bot = !!opts.bot;
    W = PH.create(L, 1); acc = 0; t = 0; fx = []; endT = 0; ending = null; heroState = "idle"; heroT = 0; hintPin = -1;
    hand = lv === 1 && !bot ? { t: 0 } : null;
    bakeBg(); on.gems && on.gems(0, Math.ceil(W.gemTotal * W.need), W.gemTotal);
  }
  function pullPin(i) {
    if ((mode !== "play" && mode !== "attract") || !PH.pull(W, i)) return false;
    hintPin = -1; hand = null; Sound.play("pull"); W.pulledOrder = (W.pulledOrder || []).concat(i); return true;
  }
  function hint() {
    const done = W.pins.map((p, i) => p.pulled ? i : -1).filter(i => i >= 0), order = W.pulledOrder || [];
    const onTrack = order.every((p, k) => L.sol[k] === p);
    if (!onTrack) return "restart";
    const next = L.sol.find(i => !W.pins[i].pulled); if (next == null) return false;
    hintPin = next; return true;
  }

  /* ---------- update ---------- */
  function update(dt) {
    t += dt; heroT += dt;
    if (hand) hand.t += dt;
    acc += dt;
    while (acc >= PH.P.dt) { PH.step(W, PH.P.dt); acc -= PH.P.dt; }
    for (const e of W.events.splice(0)) effect(e);
    for (const q of fx) { q.t += dt; q.x += (q.vx || 0) * dt; q.y += (q.vy || 0) * dt; if (q.g) q.vy += q.g * dt; }
    fx = fx.filter(q => q.t < q.life);
    // treasure count + hero mood
    const inGoal = W.balls.filter(b => b.t === "gem" && PH.inRect(b, W.goal)).length, need = Math.ceil(W.gemTotal * W.need);
    if (inGoal !== W._shown) { if (inGoal > (W._shown || 0)) Sound.play("gem"); W._shown = inGoal; on.gems && on.gems(inGoal, need, W.gemTotal); }
    if (!W.lost && heroState !== "win") {
      const danger = W.balls.some(b => (b.t === "lava" || (b.t === "monster")) && PH.inRect(b, W.goal));
      heroState = danger ? "scared" : inGoal > 0 ? "happy" : "idle";
    }
    if ((mode === "play" || mode === "attract") && !ending) {
      if (W.lost) { ending = { lose: W.lost }; heroState = W.lost === "lava" ? "burnt" : "hit"; heroT = 0; Sound.play(W.lost === "lava" ? "burn" : "monster"); shakeT = 0.4; }
      else if (W.pins.some(p => p.pulled) && PH.settled(W)) {
        const r = PH.result(W);
        if (r.lost) { ending = { lose: r.lost }; heroState = "burnt"; heroT = 0; Sound.play("burn"); }
        else if (r.won) { ending = { win: true, gems: r.gems }; heroState = "win"; heroT = 0; }
        else if (W.pins.every(p => p.pulled)) { ending = { lose: "gems" }; heroState = "sad"; heroT = 0; }
      }
    }
    if (ending) {
      endT += dt;
      if (endT > (ending.win ? 0.9 : 1.2)) {
        const e = ending; ending = null; endT = 0;
        if (mode === "attract") { attract(); return; }
        if (e.win) { mode = "won"; Sound.play("win"); confetti(); on.win && on.win(L, n, e.gems, W.gemTotal); }
        else { mode = "lost"; Sound.play("lose"); on.lose && on.lose(L, n, e.lose); }
      }
    }
    if (mode === "attract" && !ending) { botT -= dt; if (botT <= 0 && PH.settled(W)) { botT = 1.1; const next = L.sol.find(i => !W.pins[i].pulled); if (next != null) pullPin(next); } }
  }
  let shakeT = 0;
  function effect(e) {
    if (e.e === "steam") { if (Math.random() < 0.5) Sound.play("steam"); for (let i = 0; i < 3; i++) fx.push({ k: "steam", x: e.x + (Math.random() - 0.5) * 8, y: e.y, vx: (Math.random() - 0.5) * 20, vy: -40 - Math.random() * 40, t: 0, life: 0.9, r: 5 + Math.random() * 4 }); }
    if (e.e === "poof") { Sound.play("poof"); for (let i = 0; i < 14; i++) { const a = Math.random() * TAU; fx.push({ k: "poof", x: e.x, y: e.y, vx: Math.cos(a) * 70, vy: Math.sin(a) * 70 - 20, t: 0, life: 0.7, r: 6 + Math.random() * 6 }); } }
  }
  function confetti() { const cols = ["#ff5a6e", "#4d9bff", "#ffcf3d", "#46d47e", "#a77bff", "#ff9640"]; for (let i = 0; i < 110; i++) fx.push({ k: "conf", sx: Math.random() * VW, sy: -20 - Math.random() * 200, vx: (Math.random() - 0.5) * 160, vy: 120 + Math.random() * 160, g: 150, t: 0, life: 3, r: (5 + Math.random() * 5) * u, col: cols[i % cols.length], rot: Math.random() * 6, x: 0, y: 0 }); }

  /* ---------- render ---------- */
  function render() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    let sx = 0, sy = 0; if (shakeT > 0) { shakeT -= 1 / 60; sx = (Math.random() - 0.5) * 10; sy = (Math.random() - 0.5) * 10; }
    ctx.drawImage(bg, 0, 0, VW, VH);
    ctx.save(); ctx.translate(sx, sy);
    drawChest();
    drawHero();
    // balls: water as a blob layer, lava with glow, then solids
    const B = W.balls;
    for (const b of B) if (b.t === "water") draw(sprites.water, b.x, b.y);
    ctx.globalCompositeOperation = "lighter"; for (const b of B) if (b.t === "lava") draw(sprites.glow, b.x, b.y); ctx.globalCompositeOperation = "source-over";
    B.forEach((b, i) => {
      if (b.t === "gem") draw(i % 3 === 0 ? sprites.gems[i % 4] : sprites.coin, b.x, b.y);
      else if (b.t === "lava") draw(sprites.lava, b.x, b.y);
      else if (b.t === "stone") draw(sprites.stone, b.x, b.y);
      else if (b.t === "rock") draw(sprites.rock, b.x, b.y, Math.atan2(b.vy, 40) * 0.2 + b.x * 0.05);
      else if (b.t === "monster") drawMonster(b);
    });
    // pins
    W.pins.forEach((p, i) => drawPin(p, i));
    // effects
    for (const q of fx) {
      const a = 1 - q.t / q.life;
      if (q.k === "steam") { ctx.globalAlpha = a * 0.7; ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(X(q.x), Y(q.y), (q.r + q.t * 10) * s, 0, TAU); ctx.fill(); }
      else if (q.k === "poof") { ctx.globalAlpha = a * 0.8; ctx.fillStyle = "#b28ad8"; ctx.beginPath(); ctx.arc(X(q.x), Y(q.y), (q.r + q.t * 12) * s, 0, TAU); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    for (const q of fx) if (q.k === "conf") { q.sx += q.vx / 60; q.sy += q.vy / 60; ctx.globalAlpha = Math.min(1, (1 - q.t / q.life) * 2); ctx.fillStyle = q.col; ctx.save(); ctx.translate(q.sx, q.sy); ctx.rotate(q.rot + q.t * 6); ctx.fillRect(-q.r / 2, -q.r / 4, q.r, q.r / 2); ctx.restore(); }
    ctx.globalAlpha = 1;
    if (hand && mode === "play") { const i = L.sol[0], p = W.pins[i]; const hx = X(p.x1 + (p.dx < 0 ? 4 : -4)), hy = Y(p.y1) + 8 * u; drawHand(hx + Math.sin(t * 4) * 6 * u * p.dx, hy); }
  }
  function draw(sp, x, y, rot = 0) { if (rot) { ctx.save(); ctx.translate(X(x), Y(y)); ctx.rotate(rot); ctx.drawImage(sp.c, -sp.w / 2, -sp.w / 2, sp.w, sp.w); ctx.restore(); } else ctx.drawImage(sp.c, X(x) - sp.w / 2, Y(y) - sp.w / 2, sp.w, sp.w); }
  function drawPin(p, i) {
    if (p.gone) return;
    const o = p.t * p.len * 1.05, a = 1 - Math.max(0, p.t - 0.5) * 2;
    const x1 = X(p.x1 + p.dx * o), y1 = Y(p.y1 + p.dy * o), x2 = X(p.x2 + p.dx * o), y2 = Y(p.y2 + p.dy * o);
    ctx.globalAlpha = a; ctx.lineCap = "round";
    const hint = i === hintPin && !p.pulled;
    if (hint) { ctx.strokeStyle = `rgba(255,255,255,${0.5 + 0.5 * Math.sin(t * 8)})`; ctx.lineWidth = 14 * s; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
    ctx.strokeStyle = "#8a5a00"; ctx.lineWidth = 8 * s; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    const gr = ctx.createLinearGradient(x1, y1 - 4 * s, x1, y1 + 4 * s); gr.addColorStop(0, "#fff2a0"); gr.addColorStop(0.5, "#ffc93d"); gr.addColorStop(1, "#c88a00");
    ctx.strokeStyle = gr; ctx.lineWidth = 5.5 * s; ctx.stroke();
    // ring handle at the outer end
    ctx.lineWidth = 4.5 * s; ctx.strokeStyle = "#8a5a00"; ctx.beginPath(); ctx.arc(x1 + p.dx * 8 * s, y1, 8.5 * s, 0, TAU); ctx.stroke();
    ctx.lineWidth = 3 * s; ctx.strokeStyle = "#ffd23f"; ctx.stroke();
    ctx.globalAlpha = 1;
  }
  function drawMonster(b) {
    const x = X(b.x), y = Y(b.y), r = b.r * s, wob = Math.sin(t * 5 + b.x) * 0.06;
    ctx.save(); ctx.translate(x, y); ctx.scale(1 + wob, 1 - wob);
    const gr = ctx.createRadialGradient(-r * 0.3, -r * 0.4, 1, 0, 0, r * 1.1); gr.addColorStop(0, "#b8f078"); gr.addColorStop(1, "#4a9a2a");
    ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(-r, r * 0.8); ctx.quadraticCurveTo(-r * 1.1, -r * 1.1, 0, -r); ctx.quadraticCurveTo(r * 1.1, -r * 1.1, r, r * 0.8); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#2f6a1a"; ctx.lineWidth = 1.5 * s; ctx.stroke();
    // horns
    ctx.fillStyle = "#fff2d0"; for (const sx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sx * r * 0.55, -r * 0.8); ctx.lineTo(sx * r * 0.75, -r * 1.25); ctx.lineTo(sx * r * 0.3, -r * 0.92); ctx.fill(); }
    // angry eyes
    const blink = (t * 1.3 + b.x) % 4 < 0.12;
    for (const sx of [-1, 1]) { ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.ellipse(sx * r * 0.36, -r * 0.2, r * 0.24, blink ? r * 0.04 : r * 0.26, 0, 0, TAU); ctx.fill(); if (!blink) { ctx.fillStyle = "#1a1a1a"; ctx.beginPath(); ctx.arc(sx * r * 0.32, -r * 0.14, r * 0.11, 0, TAU); ctx.fill(); } ctx.strokeStyle = "#1a3a10"; ctx.lineWidth = 2.2 * s; ctx.beginPath(); ctx.moveTo(sx * r * 0.62, -r * 0.6); ctx.lineTo(sx * r * 0.14, -r * 0.42); ctx.stroke(); }
    // toothy mouth
    ctx.fillStyle = "#3a1010"; ctx.beginPath(); ctx.ellipse(0, r * 0.32, r * 0.42, r * 0.2, 0, 0, Math.PI); ctx.fill();
    ctx.fillStyle = "#ffffff"; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * r * 0.15 - r * 0.06, r * 0.32); ctx.lineTo(i * r * 0.15, r * 0.44); ctx.lineTo(i * r * 0.15 + r * 0.06, r * 0.32); ctx.fill(); }
    ctx.restore();
  }
  function drawChest() {
    const x = X(262), y = Y(600), w = 44 * s, h = 30 * s, open = Math.min(1, (W._shown || 0) / 3);
    ctx.fillStyle = "rgba(0,0,0,0.2)"; ctx.beginPath(); ctx.ellipse(x, y + 2 * s, w * 0.6, 5 * s, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "#8a4e22"; ctx.fillRect(x - w / 2, y - h, w, h); ctx.strokeStyle = "#4e2a10"; ctx.lineWidth = 2 * s; ctx.strokeRect(x - w / 2, y - h, w, h);
    ctx.fillStyle = "#ffc93d"; ctx.fillRect(x - w / 2, y - h * 0.6, w, 4 * s); ctx.fillRect(x - 4 * s, y - h * 0.75, 8 * s, 10 * s);
    ctx.save(); ctx.translate(x - w / 2, y - h); ctx.rotate(-open * 1.0); ctx.fillStyle = "#a25e2a"; ctx.fillRect(0, -14 * s, w, 14 * s); ctx.strokeStyle = "#4e2a10"; ctx.strokeRect(0, -14 * s, w, 14 * s); ctx.fillStyle = "#ffc93d"; ctx.fillRect(0, -6 * s, w, 3 * s); ctx.restore();
    if (open > 0) { const gl = ctx.createRadialGradient(x, y - h, 0, x, y - h, w); gl.addColorStop(0, `rgba(255,230,120,${0.5 * open})`); gl.addColorStop(1, "rgba(255,230,120,0)"); ctx.fillStyle = gl; ctx.fillRect(x - w, y - h * 2, w * 2, h * 2); }
  }
  function drawHero() {
    const [hx, hy, hw, hh] = W.hero, x = X(hx + hw / 2), base = Y(hy + hh), k = s * 1.05;
    let jump = 0, lean = 0, armUp = 0, shakeX = 0;
    if (heroState === "win") { jump = Math.abs(Math.sin(heroT * 7)) * 14 * k; armUp = 1; }
    else if (heroState === "happy") { jump = Math.abs(Math.sin(heroT * 5)) * 4 * k; armUp = 0.5; }
    else if (heroState === "scared") { shakeX = Math.sin(heroT * 40) * 1.5 * k; lean = -0.1; }
    const y = base - jump, burnt = heroState === "burnt";
    ctx.save(); ctx.translate(x + shakeX, y); ctx.rotate(lean);
    ctx.fillStyle = "rgba(0,0,0,0.2)"; ctx.beginPath(); ctx.ellipse(0, jump / 1, 14 * k, 3 * k, 0, 0, TAU); ctx.fill();
    // legs
    ctx.fillStyle = burnt ? "#333" : "#4a5a8a"; ctx.fillRect(-7 * k, -16 * k, 5 * k, 16 * k); ctx.fillRect(2 * k, -16 * k, 5 * k, 16 * k);
    ctx.fillStyle = "#5a3418"; ctx.fillRect(-8 * k, -3 * k, 7 * k, 3 * k); ctx.fillRect(1 * k, -3 * k, 7 * k, 3 * k);
    // backpack + body
    ctx.fillStyle = burnt ? "#444" : "#c97a3a"; ctx.fillRect(-12 * k, -32 * k, 6 * k, 14 * k);
    ctx.fillStyle = burnt ? "#3a3a3a" : "#3fa86a"; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-9 * k, -34 * k, 18 * k, 20 * k, 5 * k) : ctx.rect(-9 * k, -34 * k, 18 * k, 20 * k); ctx.fill();
    // arms
    ctx.strokeStyle = burnt ? "#3a3a3a" : "#ffcfa0"; ctx.lineWidth = 4 * k; ctx.lineCap = "round";
    for (const sx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sx * 8 * k, -30 * k); ctx.lineTo(sx * (11 + armUp * 3) * k, (-20 - armUp * 22) * k); ctx.stroke(); }
    // head
    ctx.fillStyle = burnt ? "#444" : "#ffcfa0"; ctx.beginPath(); ctx.arc(0, -42 * k, 9 * k, 0, TAU); ctx.fill();
    // safari hat
    ctx.fillStyle = burnt ? "#2a2a2a" : "#e8c070"; ctx.beginPath(); ctx.ellipse(0, -48 * k, 14 * k, 3.5 * k, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(0, -49 * k, 8.5 * k, Math.PI, 0); ctx.fill();
    ctx.fillStyle = burnt ? "#2a2a2a" : "#b08a3a"; ctx.fillRect(-8.5 * k, -51 * k, 17 * k, 2.5 * k);
    // face
    ctx.fillStyle = "#2a1a10";
    if (heroState === "scared") { ctx.beginPath(); ctx.arc(-3.5 * k, -42 * k, 1.8 * k, 0, TAU); ctx.arc(3.5 * k, -42 * k, 1.8 * k, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(0, -37 * k, 2.2 * k, 2.8 * k, 0, 0, TAU); ctx.fill(); }
    else if (burnt || heroState === "sad" || heroState === "hit") { ctx.lineWidth = 1.5 * k; ctx.strokeStyle = burnt ? "#ddd" : "#2a1a10"; for (const sx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sx * 3.5 * k - 1.5 * k, -43.5 * k); ctx.lineTo(sx * 3.5 * k + 1.5 * k, -40.5 * k); ctx.moveTo(sx * 3.5 * k + 1.5 * k, -43.5 * k); ctx.lineTo(sx * 3.5 * k - 1.5 * k, -40.5 * k); ctx.stroke(); } ctx.beginPath(); ctx.arc(0, -35 * k, 3 * k, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
    else { ctx.beginPath(); ctx.arc(-3.5 * k, -42.5 * k, 1.6 * k, 0, TAU); ctx.arc(3.5 * k, -42.5 * k, 1.6 * k, 0, TAU); ctx.fill(); ctx.strokeStyle = "#2a1a10"; ctx.lineWidth = 1.5 * k; ctx.beginPath(); ctx.arc(0, -39 * k, 3.5 * k, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke(); ctx.fillStyle = "rgba(255,120,120,0.5)"; ctx.beginPath(); ctx.arc(-6 * k, -39 * k, 2 * k, 0, TAU); ctx.arc(6 * k, -39 * k, 2 * k, 0, TAU); ctx.fill(); }
    if (burnt) { ctx.globalAlpha = 0.6; ctx.fillStyle = "#888"; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(Math.sin(heroT * 3 + i) * 5 * k, (-60 - i * 9 - (heroT * 20 % 9)) * k, (4 + i) * k, 0, TAU); ctx.fill(); } ctx.globalAlpha = 1; }
    ctx.restore();
  }
  function drawHand(x, y) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(-0.4); const q = u * 1.1;
    ctx.fillStyle = "#ffffff"; ctx.strokeStyle = "#2a3550"; ctx.lineWidth = 3 * q; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(-6 * q, 0); ctx.lineTo(-6 * q, -26 * q); ctx.quadraticCurveTo(0, -34 * q, 6 * q, -26 * q); ctx.lineTo(6 * q, -8 * q); ctx.lineTo(18 * q, -6 * q); ctx.quadraticCurveTo(26 * q, 0, 22 * q, 14 * q); ctx.lineTo(16 * q, 30 * q); ctx.lineTo(-8 * q, 30 * q); ctx.lineTo(-16 * q, 8 * q); ctx.quadraticCurveTo(-14 * q, 0, -6 * q, 4 * q); ctx.closePath();
    ctx.fill(); ctx.stroke(); ctx.restore();
  }

  /* ---------- input: tap a pin (rod or ring) ---------- */
  function pinAt(px, py) {
    const wx = (px - ox) / s, wy = (py - oy) / s; let best = -1, bd = 18 / Math.min(1, s) ;
    W.pins.forEach((p, i) => {
      if (p.pulled) return;
      const dx = p.x2 - p.x1, dy = p.y2 - p.y1, l = dx * dx + dy * dy; let q = ((wx - p.x1) * dx + (wy - p.y1) * dy) / l; q = Math.max(-0.08, Math.min(1, q));
      const d = Math.hypot(wx - (p.x1 + dx * q), wy - (p.y1 + dy * q)); if (d < bd) { bd = d; best = i; }
    });
    return best;
  }
  cv.addEventListener("pointerdown", e => { Sound.unlock(); if (mode !== "play" || ending) return; const i = pinAt(e.clientX, e.clientY); if (i >= 0) pullPin(i); });
  addEventListener("resize", resize);

  let last = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    if (mode !== "paused" && mode !== "idle" && W) try { update(dt); } catch (e) { console.error(e); }
    if (W && VW) try { render(); } catch (e) { console.error(e); }
  }
  function start(lv) { load(lv); mode = "play"; }
  function attract() { load(1 + Math.floor(Math.random() * Math.min(12, window.LEVELS.length)), { bot: true }); mode = "attract"; botT = 1.2; }
  resize(); requestAnimationFrame(frame);

  return {
    on, start, attract, pullPin, hint,
    setTheme(id) { themeId = id; bakeBg(); },
    pause(p) { if (p && mode === "play") mode = "paused"; else if (!p && mode === "paused") { mode = "play"; last = 0; } },
    step(dt = 1 / 60, k = 1) { for (let i = 0; i < k; i++) update(dt); },
    pinXY: i => { const p = W.pins[i]; return [X((p.x1 + p.x2) / 2), Y((p.y1 + p.y2) / 2)]; },
    get mode() { return mode; }, set mode(v) { mode = v; }, get level() { return L; }, get world() { return W; }, get busy() { return !!ending || (W && W.pins.some(p => p.pulled) && !PH.settled(W)); }
  };
})();

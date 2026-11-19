/* SINKHOLE — game: holes (you + rival bots), swallowing, growth, traffic and walkers, the round timer and
   ranking, and the drawing (tilted top-down camera, ground pre-drawn once, every object a little 3D model,
   swallowed things sink inside the hole). */
window.Game = (() => {
  const C = window.GAME_CONFIG, CT = window.City, O = C.objects, H = C.hole;
  const cv = document.getElementById("view"), ctx = cv.getContext("2d");
  const TAU = Math.PI * 2, TILT = 0.78, ZF = 0.62, GPX = 22;
  let DPR = 1, VW = 0, VH = 0, u = 1, S = 30;
  const on = {};
  let mode = "idle", n = 1, LV = null, city = null, holes = [], me = null, t = 0, timeLeft = 0, parts = [], texts = [], ground = null, eatenValue = 0, ending = null, endT = 0;
  let skin = C.skins[0], joy = { on: false, x0: 0, y0: 0, dx: 0, dy: 0 }, keys = {}, botMode = false;
  const cam = { x: 32, y: 32, s: 30 };

  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t2 = a; t2 = Math.imul(t2 ^ (t2 >>> 15), t2 | 1); t2 ^= t2 + Math.imul(t2 ^ (t2 >>> 7), t2 | 61); return ((t2 ^ (t2 >>> 14)) >>> 0) / 4294967296; }; }
  function canvasOf(w, h) { const c = document.createElement("canvas"); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
  const back = x => { const c = 1.7; return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2; };
  const shade = (hex, k) => { const n2 = parseInt(hex.slice(1), 16); let r = n2 >> 16, g = n2 >> 8 & 255, b = n2 & 255; r = Math.round(r * k); g = Math.round(g * k); b = Math.round(b * k); return `rgb(${Math.min(255, r)},${Math.min(255, g)},${Math.min(255, b)})`; };
  const step = lv => C.levels.curve.find(s => lv <= s.upTo) || C.levels.curve[C.levels.curve.length - 1];
  const isSolo = lv => C.levels.soloEvery > 0 && lv % C.levels.soloEvery === 0;

  /* ---------- projection ---------- */
  const SX = x => VW / 2 + (x - cam.x) * cam.s, SY = (y, z = 0) => VH / 2 + (y - cam.y) * cam.s * TILT - z * cam.s * ZF;

  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1); VW = innerWidth; VH = innerHeight;
    cv.width = VW * DPR; cv.height = VH * DPR; cv.style.width = VW + "px"; cv.style.height = VH + "px";
    u = Math.min(VW / 400, VH / 820, 1.3);
  }

  /* ---------- ground, drawn once per city ---------- */
  function bakeGround() {
    const W = city.W, k = GPX, c = canvasOf(W * k, W * k), g = c.getContext("2d");
    g.fillStyle = "#5c6274"; g.fillRect(0, 0, W * k, W * k);                       // asphalt everywhere first
    // lane dashes + crosswalks
    g.strokeStyle = "rgba(255,255,255,0.8)"; g.lineWidth = 0.12 * k; g.setLineDash([0.8 * k, 0.8 * k]);
    for (let i = 0; i < W / city.BLOCK; i++) { const m = (i * city.BLOCK + city.ROAD / 2) * k; g.beginPath(); g.moveTo(0, m); g.lineTo(W * k, m); g.moveTo(m, 0); g.lineTo(m, W * k); g.stroke(); }
    g.setLineDash([]);
    g.fillStyle = "rgba(255,255,255,0.75)";
    for (let i = 0; i < W / city.BLOCK; i++) for (let j = 0; j < W / city.BLOCK; j++) { const x0 = i * city.BLOCK, y0 = j * city.BLOCK; for (let s = 0; s < 5; s++) { g.fillRect((x0 + 0.4 + s * 0.7) * k, (y0 + city.ROAD + 0.2) * k, 0.4 * k, 1.2 * k); g.fillRect((x0 + city.ROAD + 0.2) * k, (y0 + 0.4 + s * 0.7) * k, 1.2 * k, 0.4 * k); } }
    for (const b of city.blocks) {
      const x0 = b.x0 * k, y0 = b.y0 * k, w = (b.x1 - b.x0) * k, h = (b.y1 - b.y0) * k, inset = 1.2 * k;
      g.fillStyle = "#d8dce6"; g.fillRect(x0, y0, w, h);                                                    // sidewalk
      g.strokeStyle = "rgba(0,0,0,0.08)"; g.lineWidth = 1; for (let s = 1; s < 12; s++) { g.beginPath(); g.moveTo(x0 + s * k, y0); g.lineTo(x0 + s * k, y0 + inset); g.moveTo(x0 + s * k, y0 + h - inset); g.lineTo(x0 + s * k, y0 + h); g.stroke(); }
      const ix = x0 + inset, iy = y0 + inset, iw = w - 2 * inset, ih = h - 2 * inset;
      if (b.kind === "park") { g.fillStyle = "#7fcf5a"; g.fillRect(ix, iy, iw, ih); g.strokeStyle = "#e8d8a8"; g.lineWidth = 0.8 * k; g.beginPath(); g.moveTo(ix, iy + ih / 2); g.quadraticCurveTo(ix + iw / 2, iy, ix + iw, iy + ih / 2); g.moveTo(ix + iw / 2, iy); g.lineTo(ix + iw / 2, iy + ih); g.stroke(); g.fillStyle = "#5fb8e8"; g.beginPath(); g.ellipse(ix + iw * 0.25, iy + ih * 0.72, 1.4 * k, 0.9 * k, 0, 0, TAU); g.fill(); }
      else if (b.kind === "houses") { g.fillStyle = "#93d66a"; g.fillRect(ix, iy, iw, ih); g.fillStyle = "#c8b89a"; g.fillRect(ix + iw / 2 - 0.5 * k, iy, 1 * k, ih); }
      else if (b.kind === "shops") { g.fillStyle = "#e8d6c0"; g.fillRect(ix, iy, iw, ih); g.strokeStyle = "rgba(160,120,80,0.25)"; for (let s = 0; s < iw; s += 0.9 * k) { g.beginPath(); g.moveTo(ix + s, iy); g.lineTo(ix + s, iy + ih); g.stroke(); } }
      else if (b.kind === "tower") { g.fillStyle = "#c8d0e0"; g.fillRect(ix, iy, iw, ih); g.strokeStyle = "rgba(80,90,120,0.18)"; for (let s = 0; s < iw; s += 1.2 * k) { g.beginPath(); g.moveTo(ix + s, iy); g.lineTo(ix + s, iy + ih); g.moveTo(ix, iy + s); g.lineTo(ix + iw, iy + s); g.stroke(); } }
      else if (b.kind === "plaza") { g.fillStyle = "#f0e2c8"; g.fillRect(ix, iy, iw, ih); g.fillStyle = "#7fcfe8"; g.beginPath(); g.arc(ix + iw / 2, iy + ih / 2, 1.8 * k, 0, TAU); g.fill(); g.strokeStyle = "#ffffff"; g.lineWidth = 0.25 * k; g.stroke(); }
      else { g.fillStyle = "#6c7286"; g.fillRect(ix, iy, iw, ih); g.strokeStyle = "rgba(255,255,255,0.7)"; g.lineWidth = 0.1 * k; for (let s = 0; s <= 4; s++) for (const ry of [2, 7]) { g.beginPath(); g.moveTo(ix + (1.2 + s * 2.4 - 1.2) * k, iy + (ry - 1.4) * k); g.lineTo(ix + (1.2 + s * 2.4 - 1.2) * k, iy + (ry + 1.4) * k); g.stroke(); } }
    }
    return c;
  }

  /* ---------- level ---------- */
  function load(lv, opts = {}) {
    n = lv; LV = step(lv); botMode = !!opts.bot;
    city = CT.make(C.levels.seed * 31 + lv * 977);
    city.objs.forEach(o => { o.state = "live"; o.wob = 0; if (o.walk) { o.vx = 0; o.vy = 0; o.wt = 0; } });
    ground = bakeGround();
    const R = rng(lv * 131 + 7), solo = isSolo(lv) && !opts.bot;
    holes = [];
    const spawnAt = i => { const a = i / (LV.bots + 1) * TAU + R(), rr2 = 18 + R() * 6; return [32 + Math.cos(a) * rr2, 32 + Math.sin(a) * rr2]; };
    const mk = (name, color, glow, isMe, skill, i) => { const [x, y] = isMe ? [32, 32] : spawnAt(i); return { name, color, glow, isMe, x, y, A: Math.PI * H.start * H.start, r: H.start, score: 0, vx: 0, vy: 0, skill, alive: true, respawn: 0, ai: { t: 0, tx: x, ty: y }, ate: 0 }; };
    me = mk("You", skin.rim, skin.glow, true, 0.95, 0); holes.push(me);
    if (!solo) for (let i = 0; i < LV.bots; i++) holes.push(mk(C.botNames[(lv + i) % C.botNames.length], C.botColors[i % C.botColors.length], "#ffffff", false, LV.skill * (0.85 + R() * 0.3), i + 1));
    if (opts.bot) me.ai = { t: 0, tx: me.x, ty: me.y };
    timeLeft = LV.time; t = 0; parts = []; texts = []; eatenValue = 0; ending = null; endT = 0;
    cam.x = me.x; cam.y = me.y; cam.s = zoomFor(me.r);
  }
  const zoomFor = r => Math.min(VW / 13, VH / 22) / (1 + (r - 1) * 0.22);

  /* ---------- update ---------- */
  function update(dt) {
    t += dt;
    if (mode === "play" || mode === "attract") timeLeft -= dt;
    // walkers + traffic
    for (const o of city.objs) {
      if (o.state !== "live") continue;
      if (o.walk) { o.wt -= dt; if (o.wt <= 0) { o.wt = 1 + Math.random() * 2.5; const a = Math.random() * TAU; o.vx = Math.cos(a) * 0.6; o.vy = Math.sin(a) * 0.6; } o.x = Math.max(0.5, Math.min(city.W - 0.5, o.x + o.vx * dt)); o.y = Math.max(0.5, Math.min(city.W - 0.5, o.y + o.vy * dt)); }
      if (o.drive) { o.x = (o.x + o.drive[0] * dt + city.W) % city.W; o.y = (o.y + o.drive[1] * dt + city.W) % city.W; }
      o.wob = Math.max(0, o.wob - dt);
    }
    // steering
    for (const h of holes) {
      if (!h.alive) { h.respawn -= dt; if (h.respawn <= 0) respawn(h); continue; }
      let mx = 0, my = 0;
      if (h.isMe && !botMode) { mx = joy.dx + ((keys.d || keys.ArrowRight ? 1 : 0) - (keys.a || keys.ArrowLeft ? 1 : 0)); my = joy.dy + ((keys.s || keys.ArrowDown ? 1 : 0) - (keys.w || keys.ArrowUp ? 1 : 0)); }
      else [mx, my] = think(h, dt);
      const m = Math.hypot(mx, my); if (m > 1) { mx /= m; my /= m; }
      const sp = H.speed * Math.max(0.62, 1 - (h.r - 1) * 0.05) * (h.isMe ? 1 : 0.7 + h.skill * 0.28);
      h.vx += (mx * sp - h.vx) * Math.min(1, dt * 8); h.vy += (my * sp - h.vy) * Math.min(1, dt * 8);
      h.x = Math.max(h.r * 0.6, Math.min(city.W - h.r * 0.6, h.x + h.vx * dt)); h.y = Math.max(h.r * 0.6, Math.min(city.W - h.r * 0.6, h.y + h.vy * dt));
    }
    // swallowing
    for (const h of holes) {
      if (!h.alive) continue;
      for (const o of city.objs) {
        if (o.state !== "live") continue;
        const dx = o.x - h.x, dy = o.y - h.y; if (Math.abs(dx) > h.r + o.size || Math.abs(dy) > h.r + o.size) continue;
        const d = Math.hypot(dx, dy);
        if (o.size < h.r * 0.92 && d < h.r - o.size * 0.45) { o.state = "fall"; o.hole = h; o.ft = 0; o.fx = o.x; o.fy = o.y; if (h.isMe) Sound.play("gulp", o.size); }
        else if (d < h.r + o.size * 0.5) o.wob = 0.2;
      }
    }
    for (const o of city.objs) {
      if (o.state !== "fall") continue;
      o.ft += dt; const h = o.hole, q = Math.min(1, o.ft / 0.55);
      o.x = o.fx + (h.x - o.fx) * q; o.y = o.fy + (h.y - o.fy) * q;
      if (o.ft >= 0.55) {
        o.state = "gone"; grow(h, o.value);
        if (h.isMe) { eatenValue += o.value; if (o.value >= 6) texts.push({ x: h.x, y: h.y, s: "+" + o.value, t: 0 }); }
      }
    }
    // holes swallow smaller holes
    for (const a of holes) for (const b of holes) {
      if (a === b || !a.alive || !b.alive || a.r < b.r * H.eatHoles) continue;
      if (Math.hypot(a.x - b.x, a.y - b.y) < a.r - b.r * 0.55) {
        grow(a, Math.round(b.score * 0.3 + 15)); a.score += Math.round(b.score * 0.2);
        b.alive = false; b.respawn = 3; b.A = Math.PI * H.start * H.start; b.r = H.start;
        for (let i = 0; i < 16; i++) { const an = Math.random() * TAU; parts.push({ x: b.x, y: b.y, vx: Math.cos(an) * 5, vy: Math.sin(an) * 5, t: 0, life: 0.6, col: b.color }); }
        if (a.isMe) { Sound.play("eatHole"); texts.push({ x: a.x, y: a.y, s: "ATE " + b.name.toUpperCase() + "!", t: 0, big: true }); }
        if (b.isMe) { Sound.play("eaten"); texts.push({ x: b.x, y: b.y, s: "SWALLOWED!", t: 0, big: true, bad: true }); }
      }
    }
    // camera
    cam.x += (me.x - cam.x) * Math.min(1, dt * 6); cam.y += (me.y - cam.y) * Math.min(1, dt * 6);
    cam.s += (zoomFor(me.r) - cam.s) * Math.min(1, dt * 2);
    for (const q of parts) { q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt; }
    parts = parts.filter(q => q.t < q.life);
    for (const x of texts) x.t += dt; texts = texts.filter(x => x.t < 1.2);
    // end of round
    if ((mode === "play" || mode === "attract") && !ending) {
      const solo = holes.length === 1;
      if (solo && eatenValue / city.total >= LV.solo) ending = { solo: true, win: true };
      else if (timeLeft <= 0) ending = solo ? { solo: true, win: eatenValue / city.total >= LV.solo } : { solo: false };
    }
    if (ending) { endT += dt; if (endT > 0.6) finish(); }
  }
  function grow(h, v) { h.A += v * H.grow; h.r = Math.sqrt(h.A / Math.PI); h.score += v; if (h.isMe) Sound.play("grow"); }
  function respawn(h) {
    h.alive = true; h.r = H.start; h.A = Math.PI * H.start * H.start;
    let best = null, bd = -1; for (let i = 0; i < 12; i++) { const x = 4 + Math.random() * (city.W - 8), y = 4 + Math.random() * (city.W - 8); const d = Math.min(...holes.filter(o => o !== h && o.alive).map(o => Math.hypot(o.x - x, o.y - y)), 99); if (d > bd) { bd = d; best = [x, y]; } }
    [h.x, h.y] = best;
  }
  // rival brain: flee bigger holes, chase smaller ones, otherwise head for the best food nearby
  function think(h, dt) {
    const ai = h.ai; ai.t -= dt;
    let fx = 0, fy = 0;
    for (const o of holes) { if (o === h || !o.alive || o.r < h.r * H.eatHoles) continue; const d = Math.hypot(o.x - h.x, o.y - h.y), R = o.r * 2.4 + 3; if (d < R) { fx += (h.x - o.x) / d * (R - d) / R; fy += (h.y - o.y) / d * (R - d) / R; } }
    if (ai.t <= 0) {
      ai.t = 0.35 + (1 - h.skill) * 0.6;
      let best = null, bv = 0; const view = 6 + h.r * 2.5;
      for (const o of holes) { if (o === h || !o.alive || h.r < o.r * H.eatHoles) continue; const d = Math.hypot(o.x - h.x, o.y - h.y); if (d < view * 1.4) { const v = (o.score * 0.3 + 15) / (d + 2) * 1.4; if (v > bv) { bv = v; best = o; } } }
      for (const o of city.objs) { if (o.state !== "live" || o.size >= h.r * 0.92) continue; const d = Math.abs(o.x - h.x) + Math.abs(o.y - h.y); if (d > view) continue; const v = o.value / (d + 1.5) * (0.7 + Math.random() * (1.3 - h.skill * 0.6)); if (v > bv) { bv = v; best = o; } }
      if (best) { ai.tx = best.x; ai.ty = best.y; ai.obj = best; } else if (Math.hypot(ai.tx - h.x, ai.ty - h.y) < 1.5) { ai.tx = 4 + Math.random() * (city.W - 8); ai.ty = 4 + Math.random() * (city.W - 8); ai.obj = null; }
    }
    if (ai.obj && ai.obj.state === "live") { ai.tx = ai.obj.x; ai.ty = ai.obj.y; }
    const dx = ai.tx - h.x, dy = ai.ty - h.y, d = Math.hypot(dx, dy) || 1;
    return [dx / d + fx * 2.5, dy / d + fy * 2.5];
  }
  function finish() {
    const e = ending; ending = null; endT = 0;
    if (mode === "attract") { attract(); return; }
    mode = "over";
    const ranking = holes.slice().sort((a, b) => b.score - a.score), place = ranking.indexOf(me) + 1;
    if (e.solo) { e.win ? (Sound.play("win"), on.win && on.win({ n, solo: true, pct: eatenValue / city.total, need: LV.solo, score: me.score, time: timeLeft })) : (Sound.play("lose"), on.lose && on.lose({ n, solo: true, pct: eatenValue / city.total, need: LV.solo })); }
    else if (place === 1) { Sound.play("win"); on.win && on.win({ n, solo: false, place, ranking, score: me.score }); }
    else { Sound.play("lose"); on.lose && on.lose({ n, solo: false, place, ranking, score: me.score }); }
  }

  /* ---------- drawing ---------- */
  function render() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.fillStyle = "#3f8a4a"; ctx.fillRect(0, 0, VW, VH);
    const W = city.W;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(ground, 0, 0, W * GPX, W * GPX, SX(0), SY(0), W * cam.s, W * cam.s * TILT);
    // view bounds in world units (cull)
    const vx0 = cam.x - VW / 2 / cam.s - 6, vx1 = cam.x + VW / 2 / cam.s + 6, vy0 = cam.y - VH / 2 / (cam.s * TILT) - 4, vy1 = cam.y + VH / 2 / (cam.s * TILT) + 14;
    // holes on the ground, then what is falling into them (clipped to the hole)
    const live = holes.filter(h => h.alive).sort((a, b) => a.r - b.r);
    for (const h of live) drawHole(h);
    for (const h of live) {
      ctx.save(); ctx.beginPath(); ctx.ellipse(SX(h.x), SY(h.y), h.r * cam.s * 0.97, h.r * cam.s * TILT * 0.97, 0, 0, TAU); ctx.clip();
      for (const o of city.objs) if (o.state === "fall" && o.hole === h) { const q = Math.min(1, o.ft / 0.55); ctx.globalAlpha = 1 - q * 0.6; drawObj(o, 1 - q * 0.7, q * 2.2); ctx.globalAlpha = 1; }
      ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fillRect(SX(h.x) - h.r * cam.s, SY(h.y) - h.r * cam.s, h.r * 2 * cam.s, h.r * 2 * cam.s);
      ctx.restore();
    }
    // objects back to front
    const list = city.objs.filter(o => o.state === "live" && o.x > vx0 && o.x < vx1 && o.y > vy0 && o.y < vy1).sort((a, b) => a.y - b.y);
    for (const o of list) drawObj(o, 1, 0);
    // names
    for (const h of live) {
      const x = SX(h.x), y = SY(h.y) - h.r * cam.s * TILT - 10 * u, fs = Math.round(Math.max(11, Math.min(18, 10 + h.r * 2)) * u);
      ctx.font = `900 ${fs}px ui-rounded, system-ui, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.lineWidth = 4 * u; ctx.strokeStyle = "rgba(20,24,40,0.75)"; ctx.strokeText(h.name, x, y); ctx.fillStyle = h.isMe ? "#ffffff" : h.color; ctx.fillText(h.name, x, y);
    }
    // particles + texts
    for (const q of parts) { ctx.globalAlpha = 1 - q.t / q.life; ctx.fillStyle = q.col; ctx.beginPath(); ctx.arc(SX(q.x), SY(q.y, 0.5), 4 * u, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
    for (const x of texts) {
      const e = x.t / 1.2, sz = (x.big ? 26 : 18) * u * (x.t < 0.15 ? back(x.t / 0.15) : 1);
      ctx.globalAlpha = 1 - Math.max(0, e - 0.6) / 0.4; ctx.font = `900 ${Math.round(sz)}px ui-rounded, system-ui, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      const px = SX(x.x), py = SY(x.y) - 40 * u - e * 40 * u; ctx.lineWidth = 5 * u; ctx.strokeStyle = "#1e2238"; ctx.strokeText(x.s, px, py); ctx.fillStyle = x.bad ? "#ff8a8a" : "#fff59a"; ctx.fillText(x.s, px, py);
    }
    ctx.globalAlpha = 1;
    // joystick
    if (joy.on) { ctx.globalAlpha = 0.5; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(joy.x0, joy.y0, 44 * u, 0, TAU); ctx.stroke(); ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(joy.x0 + joy.dx * 44 * u, joy.y0 + joy.dy * 44 * u, 18 * u, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
  }
  function drawHole(h) {
    const x = SX(h.x), y = SY(h.y), rx = h.r * cam.s, ry = rx * TILT;
    ctx.fillStyle = "rgba(0,0,0,0.18)"; ctx.beginPath(); ctx.ellipse(x, y + ry * 0.08, rx * 1.12, ry * 1.12, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = h.color; ctx.beginPath(); ctx.ellipse(x, y, rx * 1.06, ry * 1.06, 0, 0, TAU); ctx.fill();
    const g = ctx.createRadialGradient(x, y + ry * 0.35, rx * 0.1, x, y, rx); g.addColorStop(0, "#05060c"); g.addColorStop(0.75, "#141828"); g.addColorStop(1, "#2a3048");
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill();
    // inner far wall (lighter crescent at the top) for depth
    ctx.save(); ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.clip();
    ctx.fillStyle = "rgba(90,100,140,0.35)"; ctx.beginPath(); ctx.ellipse(x, y - ry * 0.55, rx * 0.95, ry * 0.6, 0, Math.PI, 0); ctx.fill(); ctx.restore();
    ctx.lineWidth = Math.max(2, rx * 0.06); ctx.strokeStyle = h.isMe ? skin.glow : "rgba(255,255,255,0.5)"; ctx.beginPath(); ctx.ellipse(x, y, rx * 1.06, ry * 1.06, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
  }
  // a little 3D box: oblique view from the south; returns nothing
  function box(x, y, w, d, h, top, front, z0 = 0) {
    const L = SX(x - w / 2), R = SX(x + w / 2), yb = y + d / 2, yt = y - d / 2;
    const fb = SY(yb, z0), ft = SY(yb, z0 + h), bt = SY(yt, z0 + h);
    ctx.fillStyle = front; ctx.fillRect(L, ft, R - L, fb - ft);
    ctx.fillStyle = top; ctx.fillRect(L, bt, R - L, ft - bt);
  }
  function drawObj(o, sc = 1, sink = 0) {
    const x = o.x + (o.wob > 0 ? Math.sin(t * 60) * 0.05 : 0), y = o.y, s = cam.s, z0 = -sink;
    const vert = Math.abs(Math.sin(o.rot || 0)) > 0.5;
    const shadow = (r) => { ctx.fillStyle = "rgba(0,0,0,0.2)"; ctx.beginPath(); ctx.ellipse(SX(x), SY(y, z0), r * s, r * s * TILT * 0.8, 0, 0, TAU); ctx.fill(); };
    switch (o.t) {
      case "person": { const bob = o.walk && (o.vx || o.vy) ? Math.abs(Math.sin(t * 9 + o.id)) * 0.05 : 0; shadow(0.2 * sc); box(x, y, 0.3 * sc, 0.2 * sc, 0.55 * sc, shade(o.color, 1.15), o.color, z0 + bob); ctx.fillStyle = "#ffd2a8"; ctx.beginPath(); ctx.arc(SX(x), SY(y, z0 + bob + 0.75 * sc), 0.15 * sc * s, 0, TAU); ctx.fill(); break; }
      case "cone": { shadow(0.25 * sc); ctx.fillStyle = "#ff7a2e"; ctx.beginPath(); ctx.moveTo(SX(x - 0.22 * sc), SY(y, z0)); ctx.lineTo(SX(x + 0.22 * sc), SY(y, z0)); ctx.lineTo(SX(x), SY(y, z0 + 0.6 * sc)); ctx.fill(); ctx.fillStyle = "#fff"; ctx.fillRect(SX(x - 0.13 * sc), SY(y, z0 + 0.3 * sc), 0.26 * sc * s, 0.1 * sc * s * ZF); break; }
      case "hydrant": shadow(0.22 * sc); box(x, y, 0.3 * sc, 0.3 * sc, 0.5 * sc, "#ff7070", "#d8303a", z0); break;
      case "bin": shadow(0.3 * sc); box(x, y, 0.5 * sc, 0.45 * sc, 0.6 * sc, "#5fd38a", "#2a9a5a", z0); break;
      case "lamp": { shadow(0.18 * sc); ctx.strokeStyle = "#4a5068"; ctx.lineWidth = Math.max(1.5, 0.1 * sc * s); ctx.beginPath(); ctx.moveTo(SX(x), SY(y, z0)); ctx.lineTo(SX(x), SY(y, z0 + 2.2 * sc)); ctx.stroke(); ctx.fillStyle = "#fff2a0"; ctx.beginPath(); ctx.arc(SX(x), SY(y, z0 + 2.3 * sc), 0.18 * sc * s, 0, TAU); ctx.fill(); break; }
      case "bench": shadow(0.45 * sc); vert ? box(x, y, 0.4 * sc, 1.1 * sc, 0.35 * sc, "#c98a52", "#8a5a30", z0) : (box(x, y, 1.1 * sc, 0.4 * sc, 0.35 * sc, "#c98a52", "#8a5a30", z0), box(x, y - 0.2 * sc, 1.1 * sc, 0.1 * sc, 0.75 * sc, "#b07a46", "#7a4e26", z0)); break;
      case "tree": { shadow(0.75 * sc); box(x, y, 0.25 * sc, 0.25 * sc, 1.0 * sc, "#8a5a30", "#6a4220", z0); const cx = SX(x), cy = SY(y, z0 + 1.6 * sc), r = 0.85 * sc * s; const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r); g.addColorStop(0, shade(o.color || "#4fb64a", 1.35)); g.addColorStop(1, shade(o.color || "#4fb64a", 0.85)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill(); break; }
      case "car": { shadow(0.95 * sc); const w = vert ? 0.95 : 1.9, d = vert ? 1.9 : 0.95; box(x, y, w * sc, d * sc, 0.55 * sc, shade(o.color, 1.15), o.color, z0); box(x, y, w * sc * (vert ? 0.85 : 0.55), d * sc * (vert ? 0.55 : 0.85), 0.35 * sc, "#cfe4ff", "#5a6d94", z0 + 0.55 * sc); break; }
      case "bus": { shadow(1.6 * sc); const w = vert ? 1.3 : 3.8, d = vert ? 3.8 : 1.3; box(x, y, w * sc, d * sc, 1.4 * sc, shade(o.color, 1.15), o.color, z0); const fy = SY(y + d * sc / 2, z0 + 1.0 * sc); ctx.fillStyle = "#2b3550"; ctx.fillRect(SX(x - w * sc / 2 + 0.15 * sc), fy, (w - 0.3) * sc * s, 0.3 * sc * s * ZF); break; }
      case "kiosk": { shadow(1.2 * sc); box(x, y, 1.8 * sc, 1.6 * sc, 1.3 * sc, "#fff2dc", "#e8d6b8", z0); const stripes = 6, L = SX(x - 1.05 * sc), Rr = SX(x + 1.05 * sc), y0 = SY(y + 1 * sc, z0 + 1.6 * sc), y1 = SY(y + 1 * sc, z0 + 1.25 * sc); for (let i = 0; i < stripes; i++) { ctx.fillStyle = i % 2 ? "#ffffff" : o.color; ctx.fillRect(L + (Rr - L) * i / stripes, y0, (Rr - L) / stripes + 0.5, y1 - y0); } box(x, y, 2.1 * sc, 1.9 * sc, 0.1 * sc, shade(o.color, 1.2), o.color, z0 + 1.6 * sc); break; }
      case "house": {
        shadow(2.3 * sc); const w = 3.8 * sc, d = 3.4 * sc, h = (o.h || 2.6) * sc; box(x, y, w, d, h, o.wall, shade(o.wall, 0.86), z0);
        // pitched roof
        const L = SX(x - w / 2 - 0.15 * sc), R = SX(x + w / 2 + 0.15 * sc), fy = SY(y + d / 2 + 0.15 * sc, z0 + h), by = SY(y - d / 2 - 0.15 * sc, z0 + h), ry = SY(y, z0 + h + 1.4 * sc);
        ctx.fillStyle = shade(o.roof, 0.82); ctx.beginPath(); ctx.moveTo(L, fy); ctx.lineTo(R, fy); ctx.lineTo(R, ry); ctx.lineTo(L, ry); ctx.fill();
        ctx.fillStyle = o.roof; ctx.beginPath(); ctx.moveTo(L, ry); ctx.lineTo(R, ry); ctx.lineTo(R, by); ctx.lineTo(L, by); ctx.fill();
        ctx.fillStyle = "#8a5a30"; ctx.fillRect(SX(x - 0.35 * sc), SY(y + d / 2, z0 + 1.2 * sc), 0.7 * sc * s, 1.2 * sc * s * ZF);
        ctx.fillStyle = "#9fd0ff"; for (const wx of [-1.2, 0.8]) ctx.fillRect(SX(x + wx * sc), SY(y + d / 2, z0 + 1.9 * sc), 0.6 * sc * s, 0.6 * sc * s * ZF); break; }
      case "shop": {
        shadow(3 * sc); const w = 7.5 * sc, d = 4 * sc, h = (o.h || 3.4) * sc; box(x, y, w, d, h, shade(o.wall, 0.95), shade(o.wall, 0.82), z0);
        ctx.fillStyle = "#9fd0ff"; ctx.fillRect(SX(x - w / 2 + 0.4 * sc), SY(y + d / 2, z0 + 1.8 * sc), (w - 0.8 * sc) * s, 1.4 * sc * s * ZF);
        ctx.fillStyle = o.roof; ctx.fillRect(SX(x - w / 2), SY(y + d / 2, z0 + h), w * s, 0.7 * sc * s * ZF);
        ctx.fillStyle = "#ffffff"; ctx.font = `900 ${Math.round(0.5 * sc * s)}px ui-rounded, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("SHOP", SX(x), SY(y + d / 2, z0 + h - 0.35 * sc)); break; }
      case "tower": {
        shadow(4 * sc); const w = 7 * sc, d = 7 * sc, h = (o.h || 10) * sc; box(x, y, w, d, h, "#8a94b8", o.wall, z0);
        ctx.fillStyle = "rgba(40,60,110,0.35)"; const L = SX(x - w / 2), fb = SY(y + d / 2, z0), ft = SY(y + d / 2, z0 + h), cols = 6, rows = Math.max(3, Math.round(h / sc / 1.1));
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) ctx.fillRect(L + (c + 0.2) * w * s / cols, ft + (r + 0.25) * (fb - ft) / rows, w * s / cols * 0.6, (fb - ft) / rows * 0.5);
        ctx.fillStyle = "#5c6384"; ctx.fillRect(SX(x - 0.8 * sc), SY(y, z0 + h + 1.2 * sc), 1.6 * sc * s, 1.2 * sc * s * ZF); break; }
    }
  }

  /* ---------- input: floating joystick ---------- */
  cv.addEventListener("pointerdown", e => { Sound.unlock(); if (mode !== "play") return; joy = { on: true, x0: e.clientX, y0: e.clientY, dx: 0, dy: 0 }; try { cv.setPointerCapture(e.pointerId); } catch (er) {} });
  cv.addEventListener("pointermove", e => { if (!joy.on) return; let dx = e.clientX - joy.x0, dy = e.clientY - joy.y0; const d = Math.hypot(dx, dy), R = 44 * u; if (d > R) { dx = dx / d * R; dy = dy / d * R; } joy.dx = dx / R; joy.dy = dy / R; });
  const endJoy = () => { joy.on = false; joy.dx = joy.dy = 0; }; cv.addEventListener("pointerup", endJoy); cv.addEventListener("pointercancel", endJoy);
  addEventListener("keydown", e => keys[e.key] = true); addEventListener("keyup", e => keys[e.key] = false);
  addEventListener("resize", () => { resize(); if (city) cam.s = zoomFor(me.r); });

  let last = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    if (mode !== "paused" && mode !== "idle" && mode !== "over" && city) try { update(dt); } catch (e) { console.error(e); }
    if (city && VW) try { render(); } catch (e) { console.error(e); }
  }
  function start(lv) { load(lv); mode = "play"; }
  function attract() { load(3 + Math.floor(Math.random() * 6), { bot: true }); mode = "attract"; timeLeft = 9999; }
  resize(); requestAnimationFrame(frame);

  return {
    on, start, attract,
    setSkin(id) { skin = C.skins.find(s => s.id === id) || C.skins[0]; if (me) { me.color = skin.rim; me.glow = skin.glow; } },
    setBot(v) { botMode = v; if (v && me) me.ai = { t: 0, tx: me.x, ty: me.y }; },
    extraTime(s2) { timeLeft += s2; mode = "play"; },
    pause(p) { if (p && mode === "play") mode = "paused"; else if (!p && mode === "paused") { mode = "play"; last = 0; } },
    step(dt = 1 / 60, k = 1) { for (let i = 0; i < k; i++) update(dt); },
    isSolo,
    get mode() { return mode; }, set mode(v) { mode = v; }, get holes() { return holes; }, get me() { return me; }, get timeLeft() { return timeLeft; }, get pct() { return city ? eatenValue / city.total : 0; }, get level() { return LV; }, get n() { return n; }
  };
})();

/* ==========================================================================
   HOOK & REEL — engine + woodblock-print renderer.
   Cast → drop (dodge) → reel (snag) → haul (fish fly, coins count). Creatures
   spawn in depth bands by species; jellyfish knock fish off the hook.
   ========================================================================== */
window.Game = (() => {
  const CF = window.GAME_CONFIG, WM = 10;            // the screen is 10 m wide
  const cv = document.getElementById("sea"), g = cv.getContext("2d");
  let VW = 400, VH = 760, dpr = 1, ppm = 40;
  const hooks = {}, emit = (n, d) => hooks[n] && hooks[n](d);
  let state = "dock", paused = false, depth = 0, maxDepth = 40, cap = 6, reelMul = 1, lure = 0, hx = 5, target = 5, camD = 0, clock = 0;
  let creatures = [], caught = [], flyers = [], bubbles = [], texts = [], haul = 0, deepest = 0, flash = 0;

  function config(u) {
    const U = id => CF.upgrades.find(x => x.id === id);
    maxDepth = U("line").base + U("line").per * (u.line || 0); cap = U("hooks").base + U("hooks").per * (u.hooks || 0);
    reelMul = 1 + U("reel").per * (u.reel || 0); lure = U("lure").per * (u.lure || 0);
  }
  function populate() {
    creatures = [];
    for (let d = 8; d < maxDepth + 12; d += 2.1) {
      if (Math.random() < 0.3) continue;
      if (Math.random() < CF.jellyChance * Math.min(1, d / 40)) { creatures.push({ kind: "jelly", x: Math.random() * WM, d, vx: (Math.random() - 0.5) * 0.6, ph: Math.random() * 6, size: 0.7 }); continue; }
      const pool = CF.fish.filter(f => d >= f.from && d <= f.to && !f.rare);
      const rare = CF.fish.find(f => f.rare && d >= f.from && d <= f.to && Math.random() < f.rare * (1 + lure));
      const sp = rare || pool[Math.floor(Math.random() * pool.length)]; if (!sp) continue;
      creatures.push({ kind: "fish", sp, x: Math.random() * WM, d: d + (Math.random() - 0.5), vx: (Math.random() < 0.5 ? -1 : 1) * sp.speed * (0.6 + Math.random() * 0.6), ph: Math.random() * 6, size: sp.size });
    }
  }
  function cast(upg) { config(upg); populate(); depth = 0; hx = target = 5; caught = []; flyers = []; texts = []; haul = 0; deepest = 0; state = "drop"; paused = false; Sound.sfx("splash"); emit("hud"); }

  const near = (c, r) => Math.abs(c.x - hx) < c.size * 0.55 + r && Math.abs(c.d - depth) < c.size * 0.35 + r;
  const snag = c => Math.abs(c.x - hx) < c.size * 0.6 + 0.4 && Math.abs(c.d - depth) < c.size * 0.4 + 0.6;   // wider window on the way up
  function step(dt) {
    clock += dt; flash = Math.max(0, flash - dt * 2);
    bubbles.forEach(b => { b.d -= b.v * dt; b.x += Math.sin(clock * 2 + b.p) * 0.2 * dt; }); bubbles = bubbles.filter(b => b.d > 0 && Math.abs(b.d - camD) < 20);
    if (Math.random() < 0.3) bubbles.push({ x: Math.random() * WM, d: camD + 10 + Math.random() * 6, v: 0.6 + Math.random(), p: Math.random() * 6, r: 0.04 + Math.random() * 0.08 });
    texts.forEach(t => t.t += dt); texts = texts.filter(t => t.t < 1.2);
    flyers.forEach(f => { f.t += dt; f.vy += 14 * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.r += f.vr * dt; }); flyers = flyers.filter(f => f.t < 3);
    if (paused) return;
    creatures.forEach(c => { c.ph += dt; if (c.kind === "fish" && !c.hooked) { c.x += c.vx * dt; if (c.x < 0.3 || c.x > WM - 0.3) { c.vx = -c.vx; c.x = Math.max(0.3, Math.min(WM - 0.3, c.x)); } } else if (c.kind === "jelly") { c.x += c.vx * dt; c.d += Math.sin(c.ph * 1.5) * 0.3 * dt; if (c.x < 0.5 || c.x > WM - 0.5) c.vx = -c.vx; } });
    if (state === "drop" || state === "reel") hx += (target - hx) * Math.min(1, dt * CF.steer);
    if (state === "drop") {
      depth += CF.sink * dt; deepest = depth;
      for (const c of creatures) if (near(c, 0.15)) { Sound.sfx("bump"); turn(c.kind === "jelly" ? "Stung! Reeling in" : "Bite! Reeling in"); c.vx = -c.vx; c.x += c.vx * 0.3; break; }
      if (state === "drop" && depth >= maxDepth) { depth = maxDepth; turn("End of the line"); }
    } else if (state === "reel") {
      depth -= CF.reel * reelMul * dt; Sound.sfx("reel");
      for (const c of creatures) {
        if (c.hooked || c.gone || !(c.kind === "jelly" ? near(c, 0.15) : snag(c))) continue;
        if (c.kind === "jelly") { c.gone = true; flash = 1; Sound.sfx("zap"); const lost = caught.splice(-2); lost.forEach(l => { l.hooked = false; l.gone = true; }); if (lost.length) texts.push({ s: `-${lost.length} fish!`, x: hx, d: depth, t: 0, bad: true }); emit("hud"); continue; }
        if (caught.length >= cap) continue;
        c.hooked = true; caught.push(c); Sound.sfx(c.sp.rare ? "rare" : "catch", caught.length); texts.push({ s: c.sp.rare ? "★ " + c.sp.name : "+" + c.sp.value, x: c.x, d: c.d, t: 0 }); emit("hud"); emit("species", c.sp.id);
        if (caught.length >= cap) texts.push({ s: "Hook full!", x: hx, d: depth - 1, t: 0 });
      }
      caught.forEach((c, i) => { c.x = hx + Math.sin(clock * 6 + i) * 0.25; c.d = depth + 0.4 + i * 0.25; });
      if (depth <= 0) haulIn();
    }
    const want = state === "drop" ? depth + 3 : state === "reel" ? depth - 3 : state === "haul" ? -4 : -2;
    camD += (want - camD) * Math.min(1, dt * 5);
    emit("tick");
  }
  function turn(why) { state = "reel"; texts.push({ s: why, x: hx, d: depth, t: 0 }); Sound.sfx("turn"); emit("hud"); }
  function haulIn() {
    state = "haul"; depth = 0; Sound.sfx("splash");
    caught.forEach((c, i) => { flyers.push({ sp: c.sp, x: hx * ppm, y: 0, vx: (Math.random() - 0.5) * 6 * ppm / 40, vy: -(9 + Math.random() * 5), r: 0, vr: (Math.random() - 0.5) * 8, t: -i * 0.08 }); });
    haul = caught.reduce((s, c) => s + c.sp.value, 0);
    setTimeout(() => emit("haul", { fish: caught.map(c => c.sp), coins: haul, deepest: Math.round(deepest) }), 1400 + caught.length * 80);
  }

  /* ---------- woodblock drawing ---------- */
  const INK = "#1b2440", PAPER = "#f2e8d2";
  const Y = d => (d - camD) * ppm + VH * 0.38;
  function wave(y0, color, amp, len, phase) { g.fillStyle = color; g.beginPath(); g.moveTo(0, VH); g.lineTo(0, y0); for (let x = 0; x <= VW + len; x += len) { g.quadraticCurveTo(x + len / 2, y0 - amp * 2 * Math.sin(phase), x + len, y0); } g.lineTo(VW, VH); g.closePath(); g.fill(); }
  function scallops(y, r, color) { g.strokeStyle = color; g.lineWidth = 2; for (let row = 0; row < 3; row++) for (let x = (row % 2) * r - r; x < VW + r; x += r * 2) { g.beginPath(); g.arc(x, y + row * r * 0.9, r, Math.PI, 0); g.stroke(); g.beginPath(); g.arc(x, y + row * r * 0.9, r * 0.6, Math.PI, 0); g.stroke(); } }
  function drawFish(sp, x, y, s, dir, wob) {
    g.save(); g.translate(x, y); g.scale(dir, 1); g.rotate(Math.sin(wob) * 0.08);
    const L = s * ppm, H = L * 0.42;
    if (sp.glow) { g.fillStyle = "rgba(242,226,160,.25)"; g.beginPath(); g.arc(L * 0.6, -H * 0.9, L * 0.45, 0, 7); g.fill(); }
    g.fillStyle = sp.color; g.strokeStyle = INK; g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(L * 0.5, 0); g.quadraticCurveTo(L * 0.1, -H, -L * 0.35, -H * 0.15); g.lineTo(-L * 0.55, -H * 0.6 + Math.sin(wob * 3) * H * 0.15); g.lineTo(-L * 0.5, 0); g.lineTo(-L * 0.55, H * 0.6 + Math.sin(wob * 3) * H * 0.15); g.lineTo(-L * 0.35, H * 0.15); g.quadraticCurveTo(L * 0.1, H, L * 0.5, 0); g.closePath(); g.fill(); g.stroke();
    g.strokeStyle = sp.stripe; g.lineWidth = 2; for (let i = 0; i < 3; i++) { const sx = L * (0.15 - i * 0.16); g.beginPath(); g.moveTo(sx, -H * 0.55); g.quadraticCurveTo(sx - L * 0.06, 0, sx, H * 0.55); g.stroke(); }
    g.fillStyle = PAPER; g.beginPath(); g.arc(L * 0.3, -H * 0.12, H * 0.16, 0, 7); g.fill(); g.fillStyle = INK; g.beginPath(); g.arc(L * 0.32, -H * 0.12, H * 0.08, 0, 7); g.fill();
    if (sp.glow) { g.strokeStyle = INK; g.lineWidth = 1.5; g.beginPath(); g.moveTo(L * 0.35, -H * 0.5); g.quadraticCurveTo(L * 0.6, -H * 1.4, L * 0.7, -H * 0.9); g.stroke(); g.fillStyle = "#f2e2a0"; g.beginPath(); g.arc(L * 0.7, -H * 0.9, H * 0.18, 0, 7); g.fill(); }
    g.restore();
  }
  function drawJelly(c, x, y) {
    const r = c.size * ppm * 0.5, p = Math.sin(c.ph * 3) * 0.12;
    g.strokeStyle = "rgba(242,232,210,.7)"; g.lineWidth = 2; for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(x + i * r * 0.3, y); for (let k = 1; k <= 4; k++) g.lineTo(x + i * r * 0.3 + Math.sin(c.ph * 2 + k + i) * 4, y + k * r * 0.35); g.stroke(); }
    g.fillStyle = "#f2a7c0"; g.strokeStyle = INK; g.lineWidth = 2.5; g.beginPath(); g.ellipse(x, y, r * (1 + p), r * 0.75 * (1 - p), 0, Math.PI, 0); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = "rgba(255,255,255,.5)"; g.beginPath(); g.ellipse(x - r * 0.35, y - r * 0.35, r * 0.2, r * 0.12, -0.5, 0, 7); g.fill();
  }
  let grain = null;
  function render() {
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sy = Y(0);
    // sky with a red sun and soft clouds
    g.fillStyle = PAPER; g.fillRect(0, 0, VW, VH);
    if (sy > 0) { g.fillStyle = "#d1495b"; g.beginPath(); g.arc(VW * 0.75, sy - 120, 46, 0, 7); g.fill(); g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); for (let i = 0; i < 3; i++) { const cx = VW * (0.2 + i * 0.25), cy = sy - 180 + i * 30; g.moveTo(cx - 40, cy); g.quadraticCurveTo(cx, cy - 22, cx + 40, cy); } g.stroke(); }
    // layered water, darker with depth
    const deep = Math.min(1, camD / 300), top = Math.max(-10, sy);
    const lg = g.createLinearGradient(0, top, 0, VH); lg.addColorStop(0, `hsl(222, 52%, ${52 - deep * 30}%)`); lg.addColorStop(1, `hsl(226, 55%, ${30 - deep * 22}%)`); g.fillStyle = lg; g.fillRect(0, top, VW, VH - top);
    if (sy > -60 && sy < VH + 40) { wave(sy, "#3d5a99", 6, 60, clock * 1.5); wave(sy + 8, "#2a4580", 5, 44, clock * 2 + 1); scallops(sy + 20, 16, "rgba(242,232,210,.35)"); g.fillStyle = "rgba(242,232,210,.9)"; for (let x = 0; x < VW; x += 30) { g.beginPath(); g.arc(x + (clock * 20) % 30, sy - 2, 4, 0, 7); g.fill(); } }
    // depth ruler on the left, like a carved scale
    g.fillStyle = "rgba(242,232,210,.55)"; g.font = "700 12px Georgia,serif"; g.textAlign = "left";
    for (let d = Math.ceil((camD - 12) / 10) * 10; d < camD + 16; d += 10) { if (d <= 0) continue; const y = Y(d); g.fillRect(0, y, d % 50 ? 10 : 18, 2); g.fillText(d + "m", 22, y + 4); }
    // line limit marker
    if (state !== "dock") { const ly = Y(maxDepth); if (ly > 0 && ly < VH) { g.setLineDash([6, 6]); g.strokeStyle = "rgba(209,73,91,.8)"; g.lineWidth = 2; g.beginPath(); g.moveTo(0, ly); g.lineTo(VW, ly); g.stroke(); g.setLineDash([]); g.fillStyle = "#f2c230"; g.fillText("end of line", VW - 80, ly - 6); } }
    // seaweed at the edges
    g.strokeStyle = "#2e5a3a"; g.lineWidth = 6; g.lineCap = "round";
    for (let d = Math.floor(camD / 7) * 7; d < camD + 20; d += 7) { if (d < 4) continue; [10, VW - 10].forEach((x, i) => { const y = Y(d); g.beginPath(); g.moveTo(x, y + 40); for (let k = 1; k < 5; k++) g.lineTo(x + Math.sin(clock + k + d) * 8 * (i ? -1 : 1), y + 40 - k * 16); g.stroke(); }); }
    g.fillStyle = "rgba(242,232,210,.35)"; bubbles.forEach(b => { g.beginPath(); g.arc(b.x * ppm, Y(b.d), b.r * ppm, 0, 7); g.fill(); });
    creatures.forEach(c => { if (c.gone && !c.hooked) return; const y = Y(c.d); if (y < -60 || y > VH + 60) return; if (c.kind === "jelly") drawJelly(c, c.x * ppm, y); else drawFish(c.sp, c.x * ppm, y, c.size, c.hooked ? -1 : Math.sign(c.vx) || 1, c.ph * 4); });
    // boat + line + hook
    if (sy > -80) { const bx = VW / 2; g.fillStyle = "#7a4a2a"; g.strokeStyle = INK; g.lineWidth = 3; g.beginPath(); g.moveTo(bx - 70, sy - 18); g.lineTo(bx + 70, sy - 18); g.lineTo(bx + 50, sy + 4); g.lineTo(bx - 50, sy + 4); g.closePath(); g.fill(); g.stroke(); g.beginPath(); g.moveTo(bx + 40, sy - 18); g.lineTo(bx + 70, sy - 70); g.stroke(); }
    if (state !== "dock") { const hy = Y(depth); g.strokeStyle = "rgba(242,232,210,.85)"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(VW / 2 + 70, Math.min(sy - 70, hy)); g.lineTo(hx * ppm, hy - 10); g.stroke(); g.strokeStyle = "#d9d2c3"; g.lineWidth = 3; g.beginPath(); g.moveTo(hx * ppm, hy - 10); g.lineTo(hx * ppm, hy + 6); g.arc(hx * ppm - 6, hy + 6, 6, 0, Math.PI); g.stroke(); g.fillStyle = "#d1495b"; g.beginPath(); g.arc(hx * ppm, hy - 14, 5, 0, 7); g.fill(); }
    flyers.forEach(f => { if (f.t < 0) return; g.save(); g.translate(VW / 2 + f.x - hx * ppm, sy + f.y * ppm / 2); g.rotate(f.r); drawFish(f.sp, 0, 0, f.sp.size, 1, 0); g.restore(); });
    g.textAlign = "center"; texts.forEach(t => { g.globalAlpha = Math.max(0, 1 - t.t / 1.2); g.font = "italic 700 20px Georgia,'Hiragino Mincho ProN',serif"; g.lineWidth = 5; g.strokeStyle = INK; g.fillStyle = t.bad ? "#f2a7c0" : "#f2c230"; const y = Y(t.d) - 20 - t.t * 30; g.strokeText(t.s, t.x * ppm, y); g.fillText(t.s, t.x * ppm, y); }); g.globalAlpha = 1;
    if (flash) { g.fillStyle = `rgba(242,167,192,${flash * 0.35})`; g.fillRect(0, 0, VW, VH); }
    if (!grain) { grain = document.createElement("canvas"); grain.width = 160; grain.height = 160; const x = grain.getContext("2d"); for (let i = 0; i < 1400; i++) { x.fillStyle = `rgba(${Math.random() < 0.5 ? "255,250,235" : "20,20,40"},${Math.random() * 0.08})`; x.fillRect(Math.random() * 160, Math.random() * 160, 1.5, 1.5); } }
    g.fillStyle = g.createPattern(grain, "repeat"); g.fillRect(0, 0, VW, VH);
  }

  /* ---------- input ---------- */
  const setX = e => { const r = cv.getBoundingClientRect(); target = Math.max(0.3, Math.min(WM - 0.3, (e.clientX - r.left) / r.width * WM)); };
  cv.addEventListener("pointerdown", setX); addEventListener("pointermove", e => { if (e.buttons || e.pointerType !== "mouse") setX(e); else setX(e); });
  addEventListener("keydown", e => { if (e.key === "ArrowLeft" || e.key === "a") target = Math.max(0.3, target - 1); if (e.key === "ArrowRight" || e.key === "d") target = Math.min(WM - 0.3, target + 1); if (e.key === "Escape" || e.key === "p") emit("pauseKey"); });

  function fit() { VW = innerWidth; VH = innerHeight; dpr = Math.min(2, devicePixelRatio || 1); cv.width = Math.round(VW * dpr); cv.height = Math.round(VH * dpr); cv.style.width = VW + "px"; cv.style.height = VH + "px"; ppm = VW / WM; }
  addEventListener("resize", fit); fit();
  let lt = 0; (function loop(t) { const dt = Math.min(0.033, (t - lt) / 1000 || 0.016); lt = t; step(dt); render(); requestAnimationFrame(loop); })(0);

  return {
    on: (n, f) => hooks[n] = f, cast, step, render,
    steer(x) { target = x; }, dock() { state = "dock"; creatures = []; caught = []; camD = -2; },
    pause() { paused = true; }, resume() { paused = false; },
    get state() { return state; }, get depth() { return depth; }, get maxDepth() { return maxDepth; }, get caught() { return caught; }, get cap() { return cap; }, get creatures() { return creatures; }, get hx() { return hx; }
  };
})();

/* CROWD RUSH — game: the run (steering, gates, enemy battles, obstacles), the stairs / boss finale,
   and all the drawing (pseudo-3D chase camera over the track, runners from pre-drawn run frames). */
window.Game = (() => {
  const C = window.GAME_CONFIG, LV = window.Levels;
  const cv = document.getElementById("view"), ctx = cv.getContext("2d");
  const TAU = Math.PI * 2, HW = C.trackWidth / 2, SWEEP = 2.5;   // sweeper bar half-length: the track edges are safe
  let DPR = 1, VW = 0, VH = 0, u = 1, F = 600, HOR = 200;
  const on = {};
  let mode = "idle", L = null, n = 1, crowd = null, enemies = [], evIdx = 0, t = 0, parts = [], texts = [], shake = 0, endT = 0, ending = null;
  let bot = false, skin = C.skins[0], frames = {}, finale = null, startN = 1, hint = 0, battle = null;
  const cam = { x: 0, z: 0, y: 6.4 };

  const ease = x => x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2;
  const back = x => { const c = 1.7; return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2; };
  function canvasOf(w, h) { const c = document.createElement("canvas"); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
  function rr(g, x, y, w, h, r) { r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

  /* ---------- projection ---------- */
  function P(x, y, z) { const dz = z - cam.z; if (dz < 0.6) return null; const s = F / dz; return { x: VW / 2 + (x - cam.x) * s, y: HOR + (cam.y - y) * s, s }; }

  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1); VW = innerWidth; VH = innerHeight;
    cv.width = VW * DPR; cv.height = VH * DPR; cv.style.width = VW + "px"; cv.style.height = VH + "px";
    u = Math.min(VW / 400, VH / 820, 1.3);
    F = Math.min(VW * 1.05, VH * 0.62); HOR = VH * 0.3;
    bakeFrames();
  }

  /* ---------- runner sprites: 4 run frames per team colour ---------- */
  /* Runners are seen from behind (enemies from the front), so legs and arms swing forward / back: a leg
     reaching forward looks shorter with its foot lifted, the leg pushing back is longer and shows its sole. */
  const RUN_FRAMES = 6;
  function bakeRunner(body, shade, hat) {
    const out = [];
    for (let f = 0; f < RUN_FRAMES; f++) {
      const W = 40, H = 58, c = canvasOf(W * DPR, H * DPR), g = c.getContext("2d"); g.scale(DPR, DPR);
      const ph = f / RUN_FRAMES * TAU, sw = Math.sin(ph), bob = Math.abs(Math.cos(ph)) * 2, cx = W / 2, hip = 34 - bob;
      const dark = shade;
      g.lineCap = "round"; g.lineJoin = "round";
      // legs: each one straight under its hip; forward = shorter + foot up, back = longer + sole showing
      for (const side of [-1, 1]) {
        const swing = side * sw, len = 17 - Math.max(0, swing) * 8 + Math.max(0, -swing) * 2.5, x = cx + side * 4;
        const knee = hip + len * 0.5, footY = hip + len;
        g.strokeStyle = dark; g.lineWidth = 6;
        g.beginPath(); g.moveTo(x, hip); g.lineTo(x + side * (swing > 0 ? 0.6 : 0), knee); g.lineTo(x, footY); g.stroke();
        // shoe: the back foot shows its sole (wider, darker), the forward foot is tucked
        if (swing < 0.2) { g.fillStyle = "#2a2f40"; g.beginPath(); g.ellipse(x, footY + 1.5, 4.2, 2.6, 0, 0, TAU); g.fill(); g.fillStyle = "rgba(255,255,255,0.25)"; g.fillRect(x - 2.5, footY + 1, 5, 1); }
        else { g.fillStyle = "#2a2f40"; g.beginPath(); g.ellipse(x, footY + 0.5, 3.2, 1.8, 0, 0, TAU); g.fill(); }
      }
      // body
      const by = 16 - bob, bg = g.createLinearGradient(cx - 9, 0, cx + 9, 0); bg.addColorStop(0, body); bg.addColorStop(1, shade);
      rr(g, cx - 9, by, 18, 22, 8); g.fillStyle = bg; g.fill();
      // arms swing opposite to the legs: forward arm shorter (hand up), back arm longer
      g.strokeStyle = body; g.lineWidth = 5;
      for (const side of [-1, 1]) {
        const swing = -side * sw, len = 11 - Math.max(0, swing) * 4 + Math.max(0, -swing) * 1.5, x0 = cx + side * 8, y0 = by + 5;
        g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + side * 3, y0 + len); g.stroke();
        g.fillStyle = shade; g.beginPath(); g.arc(x0 + side * 3, y0 + len, 2.6, 0, TAU); g.fill();
      }
      // head
      const hy = 9 - bob, hg = g.createRadialGradient(cx - 3, hy - 3, 1, cx, hy, 9); hg.addColorStop(0, "#ffffff"); hg.addColorStop(0.35, body); hg.addColorStop(1, shade);
      g.fillStyle = hg; g.beginPath(); g.arc(cx, hy, 8, 0, TAU); g.fill();
      if (hat) { g.fillStyle = hat; g.beginPath(); g.arc(cx, hy - 2, 8.4, Math.PI, 0); g.fill(); g.fillRect(cx - 2, hy - 7, 12, 3); }
      out.push(c);
    }
    return out;
  }
  function bakeFrames() { frames.me = bakeRunner(skin.body, skin.shade, skin.hat); frames.foe = bakeRunner(C.enemyColor, "#b81e2a", null); }

  /* ---------- crowd ---------- */
  // sunflower formation; big crowds pack tighter so the crowd never gets wider than ~60% of the track (it can always pick a side)
  const packing = shown => Math.min(1, LV.MAXR / (0.36 * Math.sqrt(shown + 0.3)));
  const slot = (i, k = 1) => { const r = 0.36 * Math.sqrt(i + 0.3) * k, a = i * 2.39996; return [Math.cos(a) * r, Math.sin(a) * r * 0.85]; };
  function syncMembers(c, color) {
    const want = Math.min(c.N, C.maxShown);
    while (c.members.length < want) { c.members.push({ ox: 0, oz: 0, cx: 0, cz: 0, ph: Math.random() * 4, pop: 0 }); }
    while (c.members.length > want) { const m = c.members.pop(); poof(c.x + m.cx, c.z + m.cz, color); }
    const k = packing(c.members.length); c.members.forEach((m, i) => { const [ox, oz] = slot(i, k); m.ox = ox; m.oz = oz; });
  }
  const crowdR = c => LV.radius(c.N) + 0.25;
  function setN(c, N, color) { c.N = Math.max(0, Math.round(N)); syncMembers(c, color); }
  // kill one shown runner (a big crowd loses several per shown runner)
  function killMember(c, i, color) {
    const m = c.members[i]; if (!m) return;
    const each = c.N > C.maxShown ? Math.round(c.N / C.maxShown) : 1;
    poof(c.x + m.cx, c.z + m.cz, color); c.members.splice(i, 1); c.N = Math.max(0, c.N - each);
    if (c.N <= C.maxShown) syncMembers(c, color);
  }

  /* ---------- level ---------- */
  function load(lv, opts = {}) {
    n = lv; L = LV.get(lv); L.events.forEach(e => { delete e.cap; delete e.lost0; }); bot = !!opts.bot; startN = opts.start || 1;
    crowd = { x: 0, z: 0, N: 0, members: [], y: 0, speed: C.speed }; setN(crowd, startN + (L.start - 1), skin.body);
    enemies = L.events.filter(e => e.k === "enemy").map(e => { const g = { ev: e, x: 0, z: e.z, N: 0, members: [], alive: true }; setN(g, e.n, C.enemyColor); g.members.forEach(m => { m.cx = m.ox; m.cz = m.oz; }); return g; });
    L.events.forEach(e => { e.done = false; e.flash = 0; });
    evIdx = 0; t = 0; parts = []; texts = []; shake = 0; endT = 0; ending = null; battle = null; hint = opts.bot ? 0 : 2.5;
    // each stair step costs a share of the best possible crowd, so the top step takes a near-perfect run
    finale = { k: L.finale.k, z: L.finale.z, hp: L.finale.hp || 0, maxHp: L.finale.hp || 0, step: -1, swingT: 1.2, hitT: 0, mult: 1, done: false, cost: Math.max(C.stairs.cost, Math.round(L.best * C.stairs.share)) };
    cam.z = -9; cam.x = 0;
  }

  /* ---------- update ---------- */
  function update(dt) {
    t += dt; shake = Math.max(0, shake - dt); hint = Math.max(0, hint - dt);
    const c = crowd;
    // steering (bot or drag), kept inside the track
    if (bot || mode === "attract") { const tx = botTarget(); c.x += (tx - c.x) * Math.min(1, dt * 4); }
    const lim = Math.max(0, HW - crowdR(c) - 0.1); c.x = Math.max(-lim, Math.min(lim, c.x));
    if (!battle && !finale.done && (mode === "play" || mode === "attract")) c.z += c.speed * dt;
    // runners settle into formation and run
    for (const m of c.members) { m.cx += (m.ox - m.cx) * Math.min(1, dt * 8); m.cz += (m.oz - m.cz) * Math.min(1, dt * 8); m.ph += dt * 10; m.pop = Math.min(1, m.pop + dt * 4); }
    for (const g of enemies) for (const m of g.members) { m.ph += dt * (battle && battle.g === g ? 10 : 3); m.pop = 1; if (!(battle && battle.g === g)) { m.cx += (m.ox - m.cx) * Math.min(1, dt * 6); m.cz += (m.oz - m.cz) * Math.min(1, dt * 6); } }
    cam.z += (c.z - 9 - cam.z) * Math.min(1, dt * 6); cam.x += (c.x * 0.4 - cam.x) * Math.min(1, dt * 4); cam.y = 6.4 + c.y * 0.6;
    if (mode === "play" || mode === "attract") { events(dt); obstacles(dt); fight(dt); doFinale(dt); }
    for (const e of L.events) e.flash = Math.max(0, e.flash - dt);
    for (const q of parts) { q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt; q.vy -= 12 * dt; }
    parts = parts.filter(q => q.t < q.life);
    for (const x of texts) x.t += dt; texts = texts.filter(x => x.t < 1.2);
    if (ending) { endT += dt; if (endT > (ending.win ? 1.2 : 1)) finish(); }
  }
  function events() {
    const c = crowd;
    for (const e of L.events) {
      if (e.done || e.k !== "gate" || c.z < e.z) continue;
      e.done = true; const side = c.x < 0 ? 0 : 1, op = e.ops[side]; e.chosen = side; e.flash = 0.5;
      const before = c.N; setN(c, LV.apply(c.N, op), skin.body);
      const good = c.N >= before; Sound.play(good ? "gateGood" : "gateBad");
      texts.push({ x: c.x, z: c.z + 1, s: (op.t === "x" ? "×" : op.t === "/" ? "÷" : op.t === "-" ? "−" : "+") + op.v, t: 0, col: good ? "#7fe0ff" : "#ff8a8a" });
      if (good) for (const m of c.members.slice(before)) m.pop = 0;
      if (c.N <= 0) lose("gate");
    }
  }
  function obstacles(dt) {
    const c = crowd;
    for (const e of L.events) {
      if (e.k === "sweep" || e.k === "saw") {
        if (Math.abs(e.z - c.z) > 4) continue;
        if (e.cap == null) { e.cap = Math.ceil(c.N * LV.OBST); e.lost0 = c.N; }       // an obstacle takes at most OBST of the crowd that meets it
        if (e.lost0 - c.N >= e.cap) continue;
        for (let i = c.members.length - 1; i >= 0; i--) {
          const m = c.members[i], wx = c.x + m.cx, wz = c.z + m.cz;
          if (e.k === "sweep") { const a = t * e.spin, dx = Math.cos(a), dz = Math.sin(a); const px = wx, pz = wz - e.z; const along = Math.max(-SWEEP, Math.min(SWEEP, px * dx + pz * dz)); if (Math.hypot(px - along * dx, pz - along * dz) < 0.32) { killMember(c, i, skin.body); hitFx(); } }
          else { const sx = Math.sin(t * e.speed) * (HW - 1.2); if (Math.hypot(wx - sx, (wz - e.z) * 1.6) < 0.9) { killMember(c, i, skin.body); hitFx(); } }
        }
      } else if (e.k === "wall" && !e.done && c.z + crowdR(c) >= e.z) {
        // runners crossing the wall line outside the gap are knocked out (checked once per runner)
        for (let i = c.members.length - 1; i >= 0; i--) { const m = c.members[i], wx = c.x + m.cx; if (c.z + m.cz >= e.z - 0.2 && !m.wallOk) { if (wx < e.gap[0] + 0.15 || wx > e.gap[1] - 0.15) { killMember(c, i, skin.body); hitFx(); } else m.wallOk = e.z; } }
        if (c.z - crowdR(c) > e.z) { e.done = true; c.members.forEach(m => delete m.wallOk); }
      }
    }
    if (c.N <= 0 && !ending) lose("obstacle");
  }
  let hitT = 0; function hitFx() { if (t - hitT > 0.08) { Sound.play("hit"); hitT = t; shake = Math.max(shake, 0.08); } }
  function fight(dt) {
    const c = crowd;
    if (!battle) {
      for (const g of enemies) if (g.alive && c.z + crowdR(c) >= g.z - crowdR(g)) { battle = { g, tick: 0 }; Sound.play("clash"); break; }
      return;
    }
    const g = battle.g;
    // both crowds lean into the clash line
    const line = (c.z + crowdR(c) + g.z - crowdR(g)) / 2;
    for (const m of g.members) { m.cz += ((line - g.z) + Math.abs(m.oz) * 0.4 - m.cz) * Math.min(1, dt * 3); m.cx += (c.x - g.x + m.ox * 0.9 - m.cx) * Math.min(1, dt * 2); }
    battle.tick -= dt;
    while (battle.tick <= 0 && c.N > 0 && g.N > 0) {
      battle.tick += Math.max(0.012, 0.05 - Math.min(c.N, g.N) * 0.0006);
      const k = Math.min(c.N, g.N, Math.max(1, Math.round(Math.min(c.N, g.N) / 40)));
      // exactly one-for-one, whatever the crowd sizes (big crowds show fewer runners than they have)
      setN(c, c.N - k, skin.body); setN(g, g.N - k, C.enemyColor);
      Sound.play("pop");
    }
    if (g.N <= 0) { g.alive = false; g.members = []; battle = null; Sound.play("win1"); texts.push({ x: c.x, z: c.z + 2, s: "BEAT 'EM!", t: 0, col: "#ffe27a", big: true }); }
    else if (c.N <= 0) { battle = null; lose("enemy"); }
  }
  function doFinale(dt) {
    const c = crowd, f = finale;
    if (f.done || ending) return;
    if (f.k === "stairs") {
      // steps start at the finale line, 1.4 units deep, 0.55 high
      const k = Math.floor((c.z - f.z) / 1.4);
      if (k > f.step && c.z >= f.z) {
        for (let s = f.step + 1; s <= k && s < C.stairs.steps.length; s++) {
          if (c.N < f.cost) { f.done = true; break; }
          setN(c, c.N - f.cost, skin.body); f.step = s; f.mult = C.stairs.steps[s]; Sound.play("step", s);
        }
        c.y = (f.step + 1) * 0.55;
        if (f.step >= C.stairs.steps.length - 1 || c.N < f.cost) f.done = true;
        if (f.done) { win(); }
      }
    } else {
      if (c.z < f.z - 3.2) return;
      c.z = f.z - 3.2; f.hitT -= dt; f.swingT -= dt;
      while (f.hitT <= 0 && c.N > 0 && f.hp > 0) {
        f.hitT += Math.max(0.015, 0.045 - c.N * 0.0002);
        const k = Math.max(1, Math.round(Math.min(c.N, f.hp) / 50));
        setN(c, c.N - k, skin.body); f.hp -= k;
        f.shake = 0.12; Sound.play("punch");
      }
      if (f.swingT <= 0 && f.hp > 0) { f.swingT = 1.3; f.swing = 0.4; Sound.play("smash"); shake = 0.3; setN(c, c.N - 2, skin.body); }
      if (f.swing) f.swing = Math.max(0, f.swing - dt);
      if (f.shake) f.shake = Math.max(0, f.shake - dt);
      if (f.hp <= 0) { f.done = true; f.mult = 2; f.dead = 0; Sound.play("bossDown"); win(); }
      else if (c.N <= 0) { f.done = true; lose("boss"); }
    }
  }
  function win() { if (ending) return; ending = { win: true }; if (mode !== "attract") { Sound.play("win"); confetti(); } }
  function lose(why) { if (ending) return; ending = { win: false, why }; }
  function finish() {
    const e = ending; ending = null; endT = 0;
    if (mode === "attract") { attract(); return; }
    if (e.win) { mode = "won"; on.win && on.win(L, crowd.N, finale.mult); }
    else { mode = "lost"; Sound.play("lose"); on.lose && on.lose(L, e.why); }
  }
  function revive(k = 10) { ending = null; setN(crowd, crowd.N + k, skin.body); crowd.members.forEach(m => m.pop = 0); if (finale.k === "boss") finale.done = false; mode = "play"; battle = null; }

  /* ---------- bot (title screen + tests): follows the solved gate choices, dodges obstacles ---------- */
  function botTarget() {
    const c = crowd;
    let gi = 0;
    for (const e of L.events) {
      if (e.k === "gate") { if (!e.done && e.z > c.z - 0.5 && e.z - c.z < 26) return ((L.choice >> gi) & 1) ? 2.6 : -2.6; gi++; continue; }
      if (e.z < c.z - 1 || e.z - c.z > 18) continue;
      if (e.k === "wall") return (e.gap[0] + e.gap[1]) / 2;
      if (e.k === "saw") { const sx = Math.sin(t * e.speed) * (HW - 1.2); return sx > 0 ? -3 : 3; }
      if (e.k === "sweep") { const lim = Math.max(0, HW - crowdR(c) - 0.1); return c.x < 0 ? -lim : lim; }
    }
    return 0;
  }

  /* ---------- effects ---------- */
  function poof(x, z, col) { for (let i = 0; i < 3; i++) parts.push({ x, y: 0.6, z, vx: (Math.random() - 0.5) * 4, vy: 2 + Math.random() * 3, vz: (Math.random() - 0.5) * 3, t: 0, life: 0.5, col, s: 0.18 }); }
  function confetti() { const cols = ["#ff5a6e", "#4d9bff", "#ffcf3d", "#46d47e", "#a77bff", "#ff9640"]; for (let i = 0; i < 90; i++) parts.push({ x: (Math.random() - 0.5) * 12, y: 6 + Math.random() * 4, z: crowd.z + 4 + Math.random() * 10, vx: (Math.random() - 0.5) * 4, vy: Math.random() * 2, vz: (Math.random() - 0.5) * 2, t: 0, life: 2.5, col: cols[i % 6], s: 0.16, conf: true }); }

  /* ---------- render ---------- */
  function render() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const sx = shake > 0 ? (Math.random() - 0.5) * shake * 18 : 0;
    ctx.save(); ctx.translate(sx, 0);
    // sky + ground
    const sg = ctx.createLinearGradient(0, 0, 0, HOR); sg.addColorStop(0, "#5fb8ff"); sg.addColorStop(1, "#cdeeff"); ctx.fillStyle = sg; ctx.fillRect(-20, 0, VW + 40, HOR + 2);
    ctx.fillStyle = "#ffffff"; for (let i = 0; i < 5; i++) { const x = ((i * 173 - cam.x * 6) % (VW + 200)) - 60, y = HOR * (0.25 + (i % 3) * 0.18); for (let j = 0; j < 3; j++) { ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.arc(x + j * 22 * u, y + (j === 1 ? -8 * u : 0), 18 * u, 0, TAU); ctx.fill(); } } ctx.globalAlpha = 1;
    ctx.fillStyle = "#7fcf6a"; ctx.beginPath(); ctx.moveTo(-20, HOR + 2); for (let x = -20; x <= VW + 20; x += 30) ctx.lineTo(x, HOR - 14 * u - Math.sin(x * 0.02 + 1) * 10 * u); ctx.lineTo(VW + 20, HOR + 2); ctx.fill();
    const gg = ctx.createLinearGradient(0, HOR, 0, VH); gg.addColorStop(0, "#5ec4ff"); gg.addColorStop(1, "#2f8ae0"); ctx.fillStyle = gg; ctx.fillRect(-20, HOR, VW + 40, VH - HOR);
    // track slices, far → near
    const far = cam.z + 120, step = 2.5, end = L.finale.z + (L.boss ? 6 : C.stairs.steps.length * 1.4 + 6);
    for (let z = Math.floor(far / step) * step; z > cam.z + 0.6; z -= step) {
      if (z > end) continue;
      const a = P(-HW, 0, z + step), b = P(HW, 0, z + step), c2 = P(HW, 0, z), d = P(-HW, 0, z); if (!a || !d) continue;
      // track side wall (gives the track thickness over the water)
      const ad = P(-HW, -0.8, z), bd = P(HW, -0.8, z);
      ctx.fillStyle = "#c98a52"; ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(c2.x, c2.y); ctx.lineTo(bd.x, bd.y); ctx.lineTo(ad.x, ad.y); ctx.fill();
      const band = Math.floor(z / step) % 2 === 0;
      ctx.fillStyle = band ? "#f2e6d2" : "#e6d6bc"; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c2.x, c2.y); ctx.lineTo(d.x, d.y); ctx.closePath(); ctx.fill();
      // edge rails
      ctx.fillStyle = band ? "#ff5a4e" : "#ffffff";
      const e1 = P(-HW + 0.3, 0, z + step), e2 = P(-HW + 0.3, 0, z), e3 = P(HW - 0.3, 0, z + step), e4 = P(HW - 0.3, 0, z);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(e1.x, e1.y); ctx.lineTo(e2.x, e2.y); ctx.lineTo(d.x, d.y); ctx.fill();
      ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(e3.x, e3.y); ctx.lineTo(e4.x, e4.y); ctx.lineTo(c2.x, c2.y); ctx.fill();
    }
    // everything with depth, far first
    const items = [];
    for (const e of L.events) if (e.z > cam.z + 0.6 && e.z < far) items.push({ z: e.z + 0.01, draw: () => drawEvent(e) });
    for (const g of enemies) if (g.alive) for (const m of g.members) items.push({ z: g.z + m.cz, draw: () => drawRunner(g.x + m.cx, 0, g.z + m.cz, frames.foe, m.ph, 1) });
    // on the stairs each runner stands on the step under it (never above the highest step reached)
    const stepY = z => finale.k !== "stairs" || z < finale.z ? 0 : (Math.min(Math.max(finale.step, 0), Math.floor((z - finale.z) / 1.4)) + 1) * 0.55 * (finale.step >= 0 ? 1 : 0);
    for (const m of crowd.members) { const mz = crowd.z + m.cz; items.push({ z: mz, draw: () => drawRunner(crowd.x + m.cx, stepY(mz), mz, frames.me, m.ph, back(Math.max(0.01, m.pop))) }); }
    // stairs: one item per step, keyed at the step's back edge, so runners standing on a step draw on top of it
    if (finale.k === "stairs") C.stairs.steps.forEach((_, st) => items.push({ z: finale.z + (st + 1) * 1.4 + 0.02, draw: () => drawStep(st) }));
    else items.push({ z: L.finale.z, draw: drawFinale });
    for (const q of parts) items.push({ z: q.z, draw: () => { const p = P(q.x, q.y, q.z); if (!p) return; ctx.globalAlpha = Math.max(0, 1 - q.t / q.life); ctx.fillStyle = q.col; const r = q.s * p.s; if (q.conf) ctx.fillRect(p.x - r, p.y - r / 2, r * 2, r); else { ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill(); } ctx.globalAlpha = 1; } });
    items.sort((a, b) => b.z - a.z);
    for (const it of items) it.draw();
    // crowd counter bubble + enemy counts
    bubble(crowd.x, crowd.y + 2.3, crowd.z + 0.2, crowd.N, skin.body);
    for (const g of enemies) if (g.alive && g.z - cam.z < 60) bubble(g.x, 2.3, g.z, g.N, C.enemyColor);
    for (const x of texts) { const p = P(x.x, (x.y || 1.6) + x.t * 2, x.z); if (!p) continue; const sz = Math.min(64, (x.big ? 2.2 : 1.6) * p.s * 0.55) * (x.t < 0.15 ? back(x.t / 0.15) : 1); ctx.globalAlpha = 1 - Math.max(0, x.t - 0.7) / 0.5; ctx.font = `900 ${Math.round(sz)}px ui-rounded, system-ui, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineWidth = sz * 0.18; ctx.strokeStyle = "#1f2a44"; ctx.strokeText(x.s, p.x, p.y); ctx.fillStyle = x.col; ctx.fillText(x.s, p.x, p.y); ctx.globalAlpha = 1; }
    ctx.restore();
    if (hint > 0 && mode === "play") { ctx.globalAlpha = Math.min(1, hint); ctx.font = `900 ${Math.round(20 * u)}px ui-rounded, system-ui, sans-serif`; ctx.textAlign = "center"; ctx.fillStyle = "#ffffff"; ctx.strokeStyle = "#1f2a44"; ctx.lineWidth = 5 * u; const y = VH * 0.82; ctx.strokeText("◀  DRAG TO STEER  ▶", VW / 2, y); ctx.fillText("◀  DRAG TO STEER  ▶", VW / 2, y); ctx.globalAlpha = 1; }
  }
  function drawRunner(x, y, z, fr, ph, sc) {
    const p = P(x, y, z); if (!p) return;
    const h = p.s * 1.19 * sc, w = h * 40 / 58;
    ctx.fillStyle = "rgba(0,0,0,0.18)"; ctx.beginPath(); ctx.ellipse(p.x, p.y, w * 0.32, w * 0.1, 0, 0, TAU); ctx.fill();
    ctx.drawImage(fr[Math.floor(ph) % RUN_FRAMES], p.x - w / 2, p.y - h, w, h);
  }
  function bubble(x, y, z, N, col) {
    const p = P(x, y, z); if (!p || N <= 0) return;
    const s = Math.max(14, Math.min(26, p.s * 0.5)) * u, txt = String(N); ctx.font = `900 ${Math.round(s)}px ui-rounded, system-ui, sans-serif`;
    const w = ctx.measureText(txt).width + s * 0.9;
    ctx.fillStyle = col; rr(ctx, p.x - w / 2, p.y - s * 0.7, w, s * 1.4, s * 0.5); ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = "#ffffff"; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(p.x - s * 0.25, p.y + s * 0.65); ctx.lineTo(p.x, p.y + s * 0.95); ctx.lineTo(p.x + s * 0.25, p.y + s * 0.65); ctx.fill();
    ctx.fillStyle = "#ffffff"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(txt, p.x, p.y + 1);
  }
  function drawEvent(e) {
    if (e.k === "gate") {
      for (let side = 0; side < 2; side++) {
        const op = e.ops[side], x0 = side ? 0.15 : -HW + 0.15, x1 = side ? HW - 0.15 : -0.15;
        const a = P(x0, 2.7, e.z), b = P(x1, 0, e.z); if (!a || !b) continue;
        const good = op.t === "+" || op.t === "x", chosen = e.done && e.chosen === side;
        if (e.done && !chosen) continue;
        const al = e.done ? Math.max(0, e.flash / 0.5) : 1; if (al <= 0) continue;
        ctx.globalAlpha = al;
        const g = ctx.createLinearGradient(0, a.y, 0, b.y); g.addColorStop(0, good ? "rgba(90,180,255,0.75)" : "rgba(255,90,90,0.75)"); g.addColorStop(1, good ? "rgba(40,120,255,0.35)" : "rgba(255,40,60,0.35)");
        ctx.fillStyle = g; ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
        ctx.lineWidth = Math.max(2, a.s * 0.08); ctx.strokeStyle = good ? "#bfe6ff" : "#ffc2c2"; ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
        const sz = Math.min(80, a.s * 1.25); ctx.font = `900 ${Math.round(sz)}px ui-rounded, system-ui, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        const label = (op.t === "x" ? "×" : op.t === "/" ? "÷" : op.t === "-" ? "−" : "+") + op.v;
        ctx.lineWidth = sz * 0.14; ctx.strokeStyle = "rgba(20,30,60,0.6)"; ctx.strokeText(label, (a.x + b.x) / 2, (a.y + b.y) / 2); ctx.fillStyle = "#ffffff"; ctx.fillText(label, (a.x + b.x) / 2, (a.y + b.y) / 2);
        ctx.globalAlpha = 1;
      }
    } else if (e.k === "sweep") {
      const base = P(0, 0, e.z), top = P(0, 1.1, e.z); if (!base) return;
      const a = t * e.spin, dx = Math.cos(a) * SWEEP, dz = Math.sin(a) * SWEEP;
      const p1 = P(-dx, 0.7, e.z - dz), p2 = P(dx, 0.7, e.z + dz);
      ctx.fillStyle = "#3a3f52"; ctx.fillRect(base.x - base.s * 0.18, top.y, base.s * 0.36, base.y - top.y);
      if (p1 && p2) { ctx.lineCap = "round"; ctx.strokeStyle = "#7a1f1f"; ctx.lineWidth = Math.max(4, base.s * 0.42); ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke(); ctx.strokeStyle = "#ff4d5e"; ctx.lineWidth = Math.max(3, base.s * 0.3); ctx.stroke(); ctx.setLineDash([base.s * 0.4, base.s * 0.4]); ctx.strokeStyle = "#ffffff"; ctx.stroke(); ctx.setLineDash([]); }
    } else if (e.k === "saw") {
      const sx = Math.sin(t * e.speed) * (HW - 1.2), p = P(sx, 1, e.z), rail1 = P(-HW + 0.6, 0.15, e.z), rail2 = P(HW - 0.6, 0.15, e.z); if (!p) return;
      ctx.strokeStyle = "#5a6070"; ctx.lineWidth = Math.max(2, p.s * 0.12); ctx.beginPath(); ctx.moveTo(rail1.x, rail1.y); ctx.lineTo(rail2.x, rail2.y); ctx.stroke();
      const r = p.s * 1.0; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(t * 14);
      ctx.fillStyle = "#c9cfdc"; ctx.beginPath(); for (let i = 0; i < 24; i++) { const aa = i / 24 * TAU, rr2 = i % 2 ? r * 0.82 : r; ctx.lineTo(Math.cos(aa) * rr2, Math.sin(aa) * rr2); } ctx.closePath(); ctx.fill(); ctx.strokeStyle = "#7a8296"; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = "#ff4d5e"; ctx.beginPath(); ctx.arc(0, 0, r * 0.25, 0, TAU); ctx.fill(); ctx.restore();
    } else if (e.k === "wall") {
      for (const [x0, x1] of [[-HW, e.gap[0]], [e.gap[1], HW]]) {
        if (x1 - x0 < 0.05) continue;
        const a = P(x0, 1.7, e.z), b = P(x1, 0, e.z), at = P(x0, 1.7, e.z + 0.6), bt = P(x1, 1.7, e.z + 0.6); if (!a || !b) continue;
        ctx.fillStyle = "#b8643a"; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, a.y); ctx.lineTo(bt.x, bt.y); ctx.lineTo(at.x, at.y); ctx.fill();
        ctx.fillStyle = "#d8804e"; ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
        ctx.strokeStyle = "rgba(90,40,20,0.45)"; ctx.lineWidth = 1; const rows = 4;
        for (let r = 1; r < rows; r++) { const y = a.y + (b.y - a.y) * r / rows; ctx.beginPath(); ctx.moveTo(a.x, y); ctx.lineTo(b.x, y); ctx.stroke(); }
      }
    }
  }
  function drawStep(s) {
    const f = finale, steps = C.stairs.steps, z0 = f.z + s * 1.4, y = (s + 1) * 0.55, hue = s / steps.length;
    const a = P(-HW, y, z0), b = P(HW, y, z0), c = P(HW, y, z0 + 1.4), d = P(-HW, y, z0 + 1.4), fa = P(-HW, y - 0.55, z0), fb = P(HW, y - 0.55, z0); if (!a || !c) return;
    const lit = s <= f.step;
    ctx.fillStyle = `hsl(${Math.round(200 - hue * 200)},85%,${lit ? 64 : 55}%)`; ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(c.x, c.y); ctx.lineTo(b.x, b.y); ctx.lineTo(a.x, a.y); ctx.fill();
    ctx.fillStyle = `hsl(${Math.round(200 - hue * 200)},70%,${lit ? 46 : 40}%)`; ctx.fillRect(fa.x, a.y, fb.x - fa.x, fa.y - a.y);
    const sz = Math.min(60, a.s * 0.5); ctx.font = `900 ${Math.round(sz)}px ui-rounded, system-ui, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#ffffff"; ctx.fillText("×" + steps[s], (fa.x + fb.x) / 2, (a.y + fa.y) / 2);
  }
  function drawFinale() {
    const f = finale;
    if (f.k === "stairs") {
      C.stairs.steps.forEach((_, st) => drawStep(st));
    } else {
      const p = P(0, 0, f.z), hp = f.hp / Math.max(1, f.maxHp); if (!p) return;
      const h = p.s * 4.2 * (f.done ? Math.max(0, 1 - (t % 1)) : 1), w = h * 0.7, x = p.x + (f.shake ? (Math.random() - 0.5) * 6 : 0), arm = f.swing ? Math.sin(f.swing / 0.4 * Math.PI) : 0;
      if (h <= 1) return;
      ctx.fillStyle = "rgba(0,0,0,0.22)"; ctx.beginPath(); ctx.ellipse(p.x, p.y, w * 0.6, w * 0.16, 0, 0, TAU); ctx.fill();
      // giant: legs, body, arms, head with angry face and crown
      ctx.fillStyle = "#8a1a24"; ctx.fillRect(x - w * 0.3, p.y - h * 0.35, w * 0.22, h * 0.35); ctx.fillRect(x + w * 0.08, p.y - h * 0.35, w * 0.22, h * 0.35);
      const bg = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0); bg.addColorStop(0, "#ff6a6a"); bg.addColorStop(1, "#b81e2a"); ctx.fillStyle = bg; rr(ctx, x - w * 0.42, p.y - h * 0.78, w * 0.84, h * 0.48, w * 0.2); ctx.fill();
      ctx.strokeStyle = "#c42a36"; ctx.lineCap = "round"; ctx.lineWidth = w * 0.17;
      ctx.beginPath(); ctx.moveTo(x - w * 0.42, p.y - h * 0.7); ctx.lineTo(x - w * 0.62, p.y - h * (0.45 + arm * 0.4)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + w * 0.42, p.y - h * 0.7); ctx.lineTo(x + w * 0.62, p.y - h * (0.45 + arm * 0.4)); ctx.stroke();
      ctx.fillStyle = "#ff7a7a"; ctx.beginPath(); ctx.arc(x, p.y - h * 0.88, w * 0.26, 0, TAU); ctx.fill();
      ctx.fillStyle = "#ffd23f"; ctx.beginPath(); ctx.moveTo(x - w * 0.22, p.y - h * 1.0); ctx.lineTo(x - w * 0.22, p.y - h * 1.1); ctx.lineTo(x - w * 0.1, p.y - h * 1.04); ctx.lineTo(x, p.y - h * 1.13); ctx.lineTo(x + w * 0.1, p.y - h * 1.04); ctx.lineTo(x + w * 0.22, p.y - h * 1.1); ctx.lineTo(x + w * 0.22, p.y - h * 1.0); ctx.fill();
      ctx.fillStyle = "#1a1a1a"; for (const sx2 of [-1, 1]) { ctx.beginPath(); ctx.arc(x + sx2 * w * 0.1, p.y - h * 0.9, w * 0.035, 0, TAU); ctx.fill(); ctx.strokeStyle = "#1a1a1a"; ctx.lineWidth = w * 0.025; ctx.beginPath(); ctx.moveTo(x + sx2 * w * 0.17, p.y - h * 0.96); ctx.lineTo(x + sx2 * w * 0.04, p.y - h * 0.93); ctx.stroke(); }
      ctx.beginPath(); ctx.arc(x, p.y - h * 0.8, w * 0.08, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
      // HP bar
      if (!f.done) { const bw = w * 1.1, by = p.y - h * 1.2; ctx.fillStyle = "rgba(0,0,0,0.45)"; rr(ctx, x - bw / 2, by, bw, 10 * u, 5 * u); ctx.fill(); ctx.fillStyle = "#ff4d5e"; rr(ctx, x - bw / 2 + 2, by + 2, (bw - 4) * hp, 10 * u - 4, 4 * u); ctx.fill(); ctx.font = `900 ${Math.round(14 * u)}px ui-rounded, system-ui, sans-serif`; ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.fillText(f.hp, x, by - 9 * u); }
    }
  }

  /* ---------- input: relative drag steers ---------- */
  let drag = null;
  cv.addEventListener("pointerdown", e => { Sound.unlock(); if (mode !== "play") return; drag = { x: e.clientX, cx: crowd.x }; hint = Math.min(hint, 0.3); try { cv.setPointerCapture(e.pointerId); } catch (er) {} });
  cv.addEventListener("pointermove", e => { if (!drag || mode !== "play") return; crowd.x = drag.cx + (e.clientX - drag.x) / VW * 14; });
  const end = () => { drag = null; }; cv.addEventListener("pointerup", end); cv.addEventListener("pointercancel", end);
  const keys = {}; addEventListener("keydown", e => keys[e.key] = true); addEventListener("keyup", e => keys[e.key] = false);
  addEventListener("resize", resize);

  let last = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    if (mode === "play" && !bot) { const k = (keys.ArrowRight || keys.d ? 1 : 0) - (keys.ArrowLeft || keys.a ? 1 : 0); crowd.x += k * 9 * dt; }
    if (mode !== "paused" && mode !== "idle" && L) try { update(dt); } catch (e) { console.error(e); }
    if (L && VW) try { render(); } catch (e) { console.error(e); }
  }
  function start(lv, startN) { load(lv, { start: startN }); mode = "play"; }
  function attract() { load(2 + Math.floor(Math.random() * 8), { bot: true, start: 1 }); mode = "attract"; }
  resize(); requestAnimationFrame(frame);

  return {
    on, start, attract, revive,
    setSkin(id) { skin = C.skins.find(s => s.id === id) || C.skins[0]; bakeFrames(); },
    setBot(v) { bot = v; },
    pause(p) { if (p && mode === "play") mode = "paused"; else if (!p && mode === "paused") { mode = "play"; last = 0; } },
    step(dt = 1 / 60, k = 1) { for (let i = 0; i < k; i++) update(dt); },
    get mode() { return mode; }, set mode(v) { mode = v; }, get level() { return L; }, get crowd() { return crowd; }, get progress() { return L ? Math.min(1, crowd.z / L.finale.z) : 0; }, get finale() { return finale; }
  };
})();

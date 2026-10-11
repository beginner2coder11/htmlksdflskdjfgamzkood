/* ==========================================================================
   TOWER — isometric stacking engine + renderer on the full-screen #stage
   canvas. Modes: "demo" (home screen auto-builder), "play", "over".
   UI talks to it through Tower.start / tap / power-ups and Tower.on callbacks.
   ========================================================================== */
window.Tower = (() => {
  const C = window.GAME_CONFIG, CT = C.tower, Th = window.Themes;
  const B = CT.baseSize, LH = CT.layerHeight;
  const cv = document.getElementById("stage");
  const ctx = cv.getContext("2d");
  const on = {};

  let W = 0, H = 0, dpr = 1;
  let theme = "sunset";
  let mode = "demo";
  let layers = [], cur = null, debris = [], ripples = [], growFx = [];
  let stats = null;
  let slowLeft = 0, shield = false, best = 0;
  let demoErr = 0, demoReset = 0;
  const cam = { y: 0, s: 1, a: 0.6, ty: 0, ts: 1, ta: 0.6 };
  let last = 0, running = false, flash = 0, paused = false;

  const vibrate = ms => { if (C.vibration && on.vibeOn && on.vibeOn() && navigator.vibrate) navigator.vibrate(ms); };
  const sfx = (n, a) => { if (mode === "play") Sound.play(n, a); };

  // ---------- scenery (stars + clouds, generated once) ---------------------
  const stars = Array.from({ length: 140 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 1.6 + 0.4, p: Math.random() * 6 }));
  const clouds = Array.from({ length: 22 }, (_, i) => ({ f: 6 + i * 5 + Math.random() * 3, x: Math.random() * 1.4 - 0.2, w: 0.18 + Math.random() * 0.22, sp: 0.004 + Math.random() * 0.008 }));

  // ---------- geometry -----------------------------------------------------
  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    setCam(true);
  }
  const baseScale = () => Math.min((W * 0.5) / (1.732 * B), (H * 0.26) / B);
  function setCam(snap) {
    const top = layers.length ? (layers.length - 1) * LH : 0;
    if (mode === "over") {
      const s = Math.min(baseScale(), (H * 0.52) / (top + B * 1.2));
      Object.assign(cam, { ty: top, ts: s, ta: 0.24 });
    } else {
      Object.assign(cam, { ty: top, ts: baseScale(), ta: mode === "demo" ? 0.62 : 0.56 });
    }
    if (snap) { cam.y = cam.ty; cam.s = cam.ts; cam.a = cam.ta; }
  }
  function P(x, y, z) {
    return { X: W / 2 + (x - z) * 0.866 * cam.s, Y: H * cam.a + ((x + z) * 0.5 - (y - cam.y)) * cam.s };
  }

  // ---------- game flow ----------------------------------------------------
  function reset(newMode) {
    mode = newMode;
    layers = [{ x: 0, z: 0, w: B, d: B, lvl: 0 }];
    debris = []; ripples = []; growFx = [];
    stats = { score: 0, perfects: 0, streak: 0, maxStreak: 0, coins: 0, powerups: 0 };
    slowLeft = 0; shield = false;
    spawn();
    setCam(true);
  }
  function start(opts = {}) {
    best = opts.best || 0;
    reset("play");
    run();
  }
  function demo() { reset("demo"); run(); }

  function spawn() {
    const prev = layers[layers.length - 1];
    const lvl = layers.length;
    const axis = lvl % 2 ? "x" : "z";
    const range = B * 1.25;
    cur = { x: prev.x, z: prev.z, w: prev.w, d: prev.d, lvl, axis, pos: -range, dir: 1, range,
            coin: mode === "play" && lvl > 2 && Math.random() < CT.coinChance };
    cur[axis] = prev[axis] - range;
    demoErr = Math.random() < 0.35 ? 0 : 2 + Math.random() * 10;
  }
  const speed = () => Math.min(CT.maxSpeed, CT.startSpeed + cur.lvl * CT.speedPerLevel) * (slowLeft > 0 ? 0.5 : 1);

  function tap() {
    if (mode !== "play" || !cur) return;
    drop();
  }

  function drop() {
    const prev = layers[layers.length - 1];
    const a = cur.axis, size = a === "x" ? "w" : "d";
    let delta = cur[a] - prev[a];
    let perfect = Math.abs(delta) <= CT.perfectTolerance;
    let shielded = false;
    if (!perfect && shield && Math.abs(delta) < prev[size]) { perfect = true; shielded = true; shield = false; }

    if (perfect) {
      cur[a] = prev[a];
      stats.streak++; stats.perfects++;
      stats.maxStreak = Math.max(stats.maxStreak, stats.streak);
      if (stats.streak >= CT.growAfterStreak) {
        const before = { w: cur.w, d: cur.d };
        cur.w = Math.min(B, cur.w + CT.growAmount);
        cur.d = Math.min(B, cur.d + CT.growAmount);
        if (cur.w !== before.w || cur.d !== before.d) growFx.push({ lvl: cur.lvl, t0: performance.now() });
      }
      ripples.push({ x: cur.x, z: cur.z, w: cur.w, d: cur.d, lvl: cur.lvl, t0: performance.now() });
      if (stats.streak >= 3) ripples.push({ x: cur.x, z: cur.z, w: cur.w, d: cur.d, lvl: cur.lvl, t0: performance.now() + 120 });
      sfx("perfect", stats.streak); vibrate(stats.streak >= 4 ? [15, 30, 15] : 15);
      if (shielded) sfx("shield");
    } else {
      // overlap of the moving slab with the one below
      const c0 = cur[a] - cur[size] / 2, c1 = cur[a] + cur[size] / 2;
      const p0 = prev[a] - prev[size] / 2, p1 = prev[a] + prev[size] / 2;
      const o0 = Math.max(c0, p0), o1 = Math.min(c1, p1);
      if (o1 - o0 <= 0) return miss();
      // slice off what hangs over each side
      if (c0 < o0) cutPiece(a, size, c0, o0, -1);
      if (c1 > o1) cutPiece(a, size, o1, c1, 1);
      cur[size] = o1 - o0; cur[a] = (o0 + o1) / 2;
      stats.streak = 0;
      sfx("chop"); vibrate(20);
    }

    if (slowLeft > 0) { slowLeft--; if (!slowLeft) Sound.setRate(1); }
    layers.push({ x: cur.x, z: cur.z, w: cur.w, d: cur.d, lvl: cur.lvl });
    stats.score = layers.length - 1;
    const top = P(cur.x, cur.lvl * LH + LH, cur.z);
    if (mode === "play") {
      if (cur.coin) { const n = perfect ? 2 : 1; stats.coins += n; on.coin && on.coin(n, top.X, top.Y - 20); }
      on.place && on.place({ perfect, streak: stats.streak, score: stats.score, x: top.X, y: top.Y, shielded });
      if (stats.score % CT.milestoneEvery === 0) on.milestone && on.milestone(stats.score);
      if (best && stats.score === best + 1) on.passBest && on.passBest();
    }
    spawn();
    setCam(false);
  }

  function cutPiece(a, size, from, to, side) {
    const p = { x: cur.x, z: cur.z, w: cur.w, d: cur.d, y: cur.lvl * LH, lvl: cur.lvl, vy: 0, rot: 0, vr: side * (0.6 + Math.random()), alpha: 1 };
    p[size] = to - from; p[a] = (from + to) / 2;
    p.v = { x: 0, z: 0 }; p.v[a] = side * 40;
    debris.push(p);
  }

  function miss() {
    const p = { ...cur, y: cur.lvl * LH, vy: 0, rot: 0, vr: (Math.random() < 0.5 ? -1 : 1) * 0.8, alpha: 1, v: { x: 0, z: 0 } };
    p.v[cur.axis] = Math.sign(cur.pos || 1) * 60;
    debris.push(p);
    cur = null;
    if (mode === "demo") { demoReset = performance.now() + 900; return; }
    mode = "over";
    Sound.setRate(1);
    Sound.play("miss"); vibrate([40, 60, 80]);
    flash = performance.now();
    setTimeout(() => { setCam(false); }, 600);
    setTimeout(() => on.over && on.over({ ...stats }), 1700);
  }

  function revive() {
    debris = debris.filter(d => d.lvl !== layers.length);
    mode = "play";
    spawn();
    setCam(false);
  }

  // ---------- power-ups ----------------------------------------------------
  function slowmo() { if (mode !== "play") return false; slowLeft = C.powerups.slowmo.blocks; Sound.setRate(0.75); Sound.play("slowmo"); stats.powerups++; return true; }
  function widen() {
    if (mode !== "play" || !cur) return false;
    const top = layers[layers.length - 1];
    if (top.w >= B && top.d >= B) return "full";
    top.w = top.d = B; cur.w = cur.d = B;
    growFx.push({ lvl: top.lvl, t0: performance.now(), big: true });
    ripples.push({ x: top.x, z: top.z, w: B, d: B, lvl: top.lvl, t0: performance.now() });
    Sound.play("power"); stats.powerups++;
    return true;
  }
  function shieldOn() { if (mode !== "play" || shield) return false; shield = true; Sound.play("shield"); stats.powerups++; return true; }

  // ---------- update -------------------------------------------------------
  function update(dt, t) {
    if (cur && !paused) {
      cur.pos += cur.dir * speed() * dt;
      if (cur.pos > cur.range) { cur.pos = cur.range; cur.dir = -1; }
      if (cur.pos < -cur.range) { cur.pos = -cur.range; cur.dir = 1; }
      const prev = layers[layers.length - 1];
      cur[cur.axis] = prev[cur.axis] + cur.pos;
      if (mode === "demo") {
        const delta = Math.abs(cur[cur.axis] - prev[cur.axis]);
        if (delta <= Math.max(1.5, demoErr)) drop();
        if (layers.length > 70 || (layers[layers.length - 1].w < 30 || layers[layers.length - 1].d < 30)) { demoReset = t + 1200; cur = null; }
      }
    }
    if (mode === "demo" && !cur && demoReset && t > demoReset) { demoReset = 0; reset("demo"); }

    debris = debris.filter(p => {
      p.vy -= 900 * dt;
      p.y += p.vy * dt;
      p.x += p.v.x * dt; p.z += p.v.z * dt;
      p.rot += p.vr * dt;
      if (p.y < cam.y - 900) p.alpha -= dt * 2;
      return p.alpha > 0 && p.y > -4000;
    });
    // camera
    const k = 1 - Math.pow(0.0015, dt);
    cam.y += (cam.ty - cam.y) * k;
    cam.s += (cam.ts - cam.s) * k * 0.8;
    cam.a += (cam.ta - cam.a) * k * 0.8;
  }

  // ---------- drawing ------------------------------------------------------
  function lerpColor(a, b, f) {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const r = Math.round((pa >> 16) + (((pb >> 16) - (pa >> 16)) * f));
    const g = Math.round(((pa >> 8) & 255) + ((((pb >> 8) & 255) - ((pa >> 8) & 255)) * f));
    const bl = Math.round((pa & 255) + (((pb & 255) - (pa & 255)) * f));
    return `rgb(${r},${g},${bl})`;
  }
  function skyAt(floor) {
    const S = C.sky;
    if (floor <= S[0][0]) return [S[0][1], S[0][2]];
    for (let i = 1; i < S.length; i++) if (floor <= S[i][0]) {
      const f = (floor - S[i - 1][0]) / (S[i][0] - S[i - 1][0]);
      return [lerpColor(S[i - 1][1], S[i][1], f), lerpColor(S[i - 1][2], S[i][2], f)];
    }
    const l = S[S.length - 1]; return [l[1], l[2]];
  }

  function drawSky(t) {
    const floor = cam.y / LH;
    const [top, bot] = skyAt(floor);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, top); g.addColorStop(1, bot);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // stars fade in with altitude
    const sa = Math.max(0, Math.min(1, (floor - 90) / 60));
    if (sa > 0) {
      ctx.fillStyle = "#fff";
      stars.forEach(s => {
        ctx.globalAlpha = sa * (0.5 + 0.5 * Math.sin(t / 600 + s.p));
        ctx.beginPath(); ctx.arc(s.x * W, ((s.y * H + cam.y * 0.05) % H), s.r, 0, Math.PI * 2); ctx.fill();
      });
      ctx.globalAlpha = 1;
    }
    // sun glow near the ground
    const sunA = Math.max(0, 1 - floor / 40);
    if (sunA > 0) {
      const sg = ctx.createRadialGradient(W * 0.8, H * 0.75, 10, W * 0.8, H * 0.75, H * 0.5);
      sg.addColorStop(0, `rgba(255,240,200,${0.55 * sunA})`); sg.addColorStop(1, "rgba(255,240,200,0)");
      ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H);
    }
    // clouds (parallax)
    clouds.forEach(c => {
      const y = H * cam.a - (c.f * LH - cam.y) * cam.s * 0.55;
      if (y < -80 || y > H + 80) return;
      const x = (((c.x + t * c.sp / 1000) % 1.6) - 0.3) * W;
      const w = c.w * W;
      const fade = Math.max(0, Math.min(1, (130 - c.f) / 30));
      ctx.fillStyle = `rgba(255,255,255,${0.55 * fade})`;
      ctx.beginPath();
      ctx.ellipse(x, y, w * 0.5, w * 0.16, 0, 0, Math.PI * 2);
      ctx.ellipse(x - w * 0.18, y - w * 0.08, w * 0.22, w * 0.15, 0, 0, Math.PI * 2);
      ctx.ellipse(x + w * 0.12, y - w * 0.11, w * 0.26, w * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function box(x, z, w, d, y0, h, c, alpha = 1, rot = 0) {
    const x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2, yt = y0 + h;
    const A = P(x0, yt, z0), Bp = P(x1, yt, z0), Cp = P(x1, yt, z1), D = P(x0, yt, z1);
    const B2 = P(x1, y0, z0), C2 = P(x1, y0, z1), D2 = P(x0, y0, z1);
    if (alpha !== 1) ctx.globalAlpha = alpha;
    if (rot) {
      const cx = Cp.X, cy = (Cp.Y + C2.Y) / 2;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot); ctx.translate(-cx, -cy);
    }
    const quad = (p, fill) => { ctx.beginPath(); ctx.moveTo(p[0].X, p[0].Y); for (let i = 1; i < 4; i++) ctx.lineTo(p[i].X, p[i].Y); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); };
    quad([D, Cp, C2, D2], c.left);
    quad([Cp, Bp, B2, C2], c.right);
    quad([A, Bp, Cp, D], c.top);
    if (c.metal) {
      // diagonal shine across the front faces
      ctx.save();
      ctx.beginPath(); ctx.moveTo(D.X, D.Y); ctx.lineTo(Cp.X, Cp.Y); ctx.lineTo(Bp.X, Bp.Y); ctx.lineTo(B2.X, B2.Y); ctx.lineTo(C2.X, C2.Y); ctx.lineTo(D2.X, D2.Y); ctx.closePath(); ctx.clip();
      const g = ctx.createLinearGradient(D.X, D.Y, Bp.X, B2.Y);
      g.addColorStop(0.35, "rgba(255,255,255,0)"); g.addColorStop(0.5, "rgba(255,255,255,.45)"); g.addColorStop(0.65, "rgba(255,255,255,0)");
      ctx.fillStyle = g; ctx.fillRect(D2.X, A.Y, Bp.X - D2.X, D2.Y - A.Y);
      ctx.restore();
    }
    ctx.lineWidth = c.neon ? 2 : 1;
    ctx.strokeStyle = c.edge;
    if (c.neon) { ctx.shadowColor = c.glow; ctx.shadowBlur = 10; }
    ctx.beginPath();
    ctx.moveTo(D.X, D.Y); ctx.lineTo(Cp.X, Cp.Y); ctx.lineTo(Bp.X, Bp.Y);
    if (c.neon) { ctx.lineTo(A.X, A.Y); ctx.lineTo(D.X, D.Y); ctx.moveTo(Cp.X, Cp.Y); ctx.lineTo(C2.X, C2.Y); ctx.moveTo(D.X, D.Y); ctx.lineTo(D2.X, D2.Y); ctx.lineTo(C2.X, C2.Y); ctx.lineTo(B2.X, B2.Y); ctx.lineTo(Bp.X, Bp.Y); }
    ctx.stroke();
    ctx.shadowBlur = 0;
    if (rot) ctx.restore();
    if (alpha !== 1) ctx.globalAlpha = 1;
  }

  function drawCoin(x, y, z, t) {
    const p = P(x, y + 14 + Math.sin(t / 200) * 4, z);
    const r = 11 * cam.s * 1.4, sx = Math.abs(Math.cos(t / 260));
    ctx.save(); ctx.translate(p.X, p.Y); ctx.scale(Math.max(0.15, sx), 1);
    ctx.shadowColor = "rgba(255,200,0,.8)"; ctx.shadowBlur = 12;
    ctx.fillStyle = "#e0a100"; ctx.beginPath(); ctx.arc(0, 2, r, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    const g = ctx.createLinearGradient(0, -r, 0, r); g.addColorStop(0, "#fff3a0"); g.addColorStop(1, "#ffc21a");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#e09a00"; ctx.lineWidth = r * 0.14; ctx.beginPath(); ctx.arc(0, 0, r * 0.68, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  function drawBestFlag() {
    if (mode !== "play" && mode !== "over") return;
    if (!best || best <= 0) return;
    const y = (best + 1) * LH;
    const p = P(B * 0.85, y, -B * 0.85);
    if (p.Y < -40 || p.Y > H + 40) return;
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,.75)"; ctx.setLineDash([6, 6]); ctx.lineWidth = 2;
    const a = P(-B * 1.2, y, B * 1.2), b = P(B * 1.2, y, -B * 1.2);
    ctx.beginPath(); ctx.moveTo(0, a.Y); ctx.lineTo(W, a.Y); ctx.stroke();
    ctx.setLineDash([]);
    const label = "BEST " + best;
    ctx.font = "18px 'Lilita One', sans-serif";
    const tw = ctx.measureText(label).width + 20;
    const bx = W - tw - 12, by = a.Y - 30;
    ctx.fillStyle = "rgba(255,255,255,.95)";
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(bx, by, tw, 26, 13) : ctx.rect(bx, by, tw, 26); ctx.fill();
    ctx.fillStyle = "#ff5a7a"; ctx.fillText(label, bx + 10, by + 19);
    ctx.restore();
    void b;
  }

  function frame(t) {
    if (!running) return;
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (t - (last || t)) / 1000);
    last = t;
    update(dt, t);
    render(t);
  }

  function render(t) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawSky(t);
    if (!layers.length) return;

    // which layers are on screen
    const topLvl = layers.length - 1;
    let from = 0;
    if (mode !== "over") {
      const visibleFloors = Math.ceil((H / cam.s) / LH) + 4;
      from = Math.max(0, topLvl - visibleFloors);
    }
    // pedestal (layer 0) runs down off-screen
    const L0 = layers[0];
    const pc = Th.colors(theme, 0);
    const dark = { top: pc.top, left: pc.left, right: pc.right, edge: pc.edge, neon: pc.neon, glow: pc.glow, metal: pc.metal };
    if (from === 0) box(L0.x, L0.z, L0.w, L0.d, -LH * 120, LH * 121, dark);

    const topCenter = layers[topLvl].x + layers[topLvl].z;
    debris.forEach(p => { if (p.x + p.z < topCenter - 20) box(p.x, p.z, p.w, p.d, p.y, LH, Th.colors(theme, p.lvl), p.alpha, p.rot); });

    const now = performance.now();
    for (let i = Math.max(1, from); i <= topLvl; i++) {
      const L = layers[i];
      let gw = L.w, gd = L.d;
      box(L.x, L.z, gw, gd, i * LH, LH, Th.colors(theme, i));
    }
    // grow pulse highlight
    growFx = growFx.filter(g => {
      const k = (now - g.t0) / 500; if (k > 1) return false;
      const L = layers[g.lvl]; if (!L) return false;
      ctx.globalAlpha = (1 - k) * 0.6;
      box(L.x, L.z, L.w, L.d, g.lvl * LH, LH, { top: "#fff", left: "#fff", right: "#fff", edge: "#fff" });
      ctx.globalAlpha = 1;
      return true;
    });
    // ripples on perfect
    ripples = ripples.filter(r => {
      const k = (now - r.t0) / 650; if (k > 1) return false; if (k < 0) return true;
      const e = 6 + k * 34, y = r.lvl * LH + LH;
      const pts = [P(r.x - r.w / 2 - e, y, r.z - r.d / 2 - e), P(r.x + r.w / 2 + e, y, r.z - r.d / 2 - e), P(r.x + r.w / 2 + e, y, r.z + r.d / 2 + e), P(r.x - r.w / 2 - e, y, r.z + r.d / 2 + e)];
      ctx.strokeStyle = `rgba(255,255,255,${(1 - k) * 0.9})`; ctx.lineWidth = 4 * (1 - k) + 1;
      ctx.beginPath(); pts.forEach((p, j) => (j ? ctx.lineTo(p.X, p.Y) : ctx.moveTo(p.X, p.Y))); ctx.closePath(); ctx.stroke();
      return true;
    });

    // moving block
    if (cur) {
      const c = Th.colors(theme, cur.lvl);
      box(cur.x, cur.z, cur.w, cur.d, cur.lvl * LH, LH, c);
      if (shield && mode === "play") {
        ctx.globalAlpha = 0.35 + Math.sin(t / 120) * 0.15;
        box(cur.x, cur.z, cur.w + 6, cur.d + 6, cur.lvl * LH - 2, LH + 4, { top: "#7fe3ff", left: "#3fb8ff", right: "#2a8fe0", edge: "#fff" });
        ctx.globalAlpha = 1;
      }
      if (cur.coin) drawCoin(cur.x, cur.lvl * LH + LH, cur.z, t);
    }
    debris.forEach(p => { if (p.x + p.z >= topCenter - 20) box(p.x, p.z, p.w, p.d, p.y, LH, Th.colors(theme, p.lvl), p.alpha, p.rot); });

    drawBestFlag();

    // slow-mo vignette
    if (slowLeft > 0 && mode === "play") {
      const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75);
      g.addColorStop(0, "rgba(80,160,255,0)"); g.addColorStop(1, "rgba(80,160,255,.35)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    if (flash && now - flash < 400) {
      ctx.fillStyle = `rgba(255,60,60,${0.35 * (1 - (now - flash) / 400)})`; ctx.fillRect(0, 0, W, H);
    }
  }

  function run() { if (!running) { running = true; last = 0; requestAnimationFrame(frame); } }
  window.addEventListener("resize", resize);
  resize();

  return {
    on, start, demo, tap, revive, slowmo, widen, shield: shieldOn,
    setTheme(t) { theme = t; },
    setPaused(p) { paused = p; },
    // advance the simulation without rendering (automated tests / bots)
    step(dt) { update(dt, performance.now()); },
    renderNow() { render(performance.now()); },
    get mode() { return mode; },
    get stats() { return stats; },
    get state() { return { layers: layers.length, cur: cur && { ...cur }, slowLeft, shield, top: layers[layers.length - 1] }; },
    topScreen() { const L = layers[layers.length - 1]; return P(L.x, L.lvl * LH + LH, L.z); }
  };
})();

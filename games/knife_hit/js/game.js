/* ==========================================================================
   GAME — rotating targets, knife throws, apples, bosses, shatter, demo AI.

   Game.start(knifeId) · throw() · revive() · demo() · next() · setPaused(b)
   Game.on.{knives, score, apple, stage, clear, fail, over}   UI hooks
   Game.step(dt) · renderNow() · predict()                    test hooks
   ========================================================================== */
window.Game = (() => {
  const C = window.GAME_CONFIG, P = C.play, D = C.difficulty;
  const cv = document.getElementById("stage"), x = cv.getContext("2d");
  const TAU = Math.PI * 2, rand = (a, b) => a + Math.random() * (b - a);
  const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return Math.abs(d); };
  let W = 0, H = 0, dpr = 1, s = 1;
  const on = {};

  // ---------- state ----------------------------------------------------------
  let mode = "demo";                 // demo | play | dying | over
  let paused = false, waiting = false, time = 0;
  let stage = 1, score = 0, apples = 0, bosses = 0, thrown = 0;
  let knifeId = "classic";
  let tgt = null, knivesLeft = 0, knivesTotal = 0;
  let flying = [], falling = [], pieces = [], halves = [];
  let cooldown = 0, shake = 0, slowmo = 0, transition = 0, ready = 1, demoNext = 1;
  let pieceImg = null;

  // geometry (px), recomputed from the screen every frame
  const G = {};
  function geo() {
    s = Math.min(W / 400, H / 720);
    G.R = 96 * s; G.L = 124 * s; G.embed = G.L * 0.18; G.ar = 15 * s;
    G.cx = W / 2; G.cy = H * (mode === "demo" ? 0.47 : 0.34);
    G.launch = Math.min(H - G.L - 34 * s, G.cy + G.R + G.L + 250 * s);
    G.speed = P.throwSpeed * s;
  }

  // ---------- stages -------------------------------------------------------------
  function spreadAngles(n, avoid = [], gap = 0.5) {
    const out = [];
    for (let tries = 0; out.length < n && tries < 400; tries++) {
      const a = rand(0, TAU);
      if ([...avoid, ...out].every(b => angDiff(a, b) > gap)) out.push(a);
    }
    return out;
  }
  function makeStage(n) {
    const per = P.stagesPerBoss, tier = Math.floor((n - 1) / per), k = (n - 1) % per, isBoss = k === per - 1 && mode !== "demo";
    const dir = Math.random() < 0.5 ? 1 : -1;
    let t;
    if (isBoss) {
      const b = C.bosses[tier % C.bosses.length], lap = Math.floor(tier / C.bosses.length);
      t = { kind: b.id, boss: b, pattern: b.pattern, base: b.speed * (1 + 0.06 * lap), knives: b.knives + Math.min(3, lap), pre: tier < 2 ? 0 : Math.floor(rand(0, 2 + Math.min(1, lap))), apples: Math.random() < 0.5 ? 1 : 0, chip: b.chip };
    } else {
      const pats = tier === 0 ? (k < 2 ? ["const"] : ["wobble"]) : tier === 1 ? ["wobble", "reverse"] : ["wobble", "reverse", "stopgo", "surge", "const"];
      const wood = C.woods[tier % C.woods.length];
      t = {
        kind: "wood", wood, chip: wood.chip, pattern: pats[Math.floor(Math.random() * pats.length)],
        base: Math.min(D.maxSpeed, D.baseSpeed + tier * D.speedPerTier) * rand(0.9, 1.1),
        knives: Math.min(D.knivesMax, D.knivesBase + Math.min(4, tier) + (k >= 2 ? 1 : 0)),
        pre: n === 1 ? 0 : Math.min(D.preplacedMax, Math.floor(rand(1, 2 + Math.min(3, tier)))),
        apples: Math.random() < P.appleChance ? (Math.random() < 0.3 ? 2 : 1) : 0
      };
    }
    const pre = spreadAngles(t.pre, [], 0.55);
    const ap = spreadAngles(t.apples, pre, 0.5);
    return Object.assign(t, {
      n, seed: Math.floor(rand(1, 9999)), dir, rot: rand(0, TAU), w: 0, wt: 0, t: 0, nextEvt: rand(1.2, 2.2),
      stuck: pre.map(a => ({ a, id: "classic", pre: true })), apples: ap.map(a => ({ a })),
      spawn: 0, flash: 0, recoil: 0
    });
  }
  function enterStage(n) {
    stage = n; tgt = makeStage(n);
    knivesLeft = knivesTotal = mode === "demo" ? 999 : tgt.knives;
    flying = []; ready = 1; transition = 0; waiting = false;
    pieceImg = null;
    if (mode !== "demo") { on.stage && on.stage({ n, boss: tgt.boss || null, knives: knivesTotal }); on.knives && on.knives(knivesLeft, knivesTotal); }
  }

  // ---------- actions ----------------------------------------------------------------
  function start(id) { knifeId = id || knifeId; mode = "play"; score = 0; apples = 0; bosses = 0; thrown = 0; falling = []; pieces = []; halves = []; geo(); enterStage(1); on.score && on.score(score); }
  function demo(id) { knifeId = id || knifeId; mode = "demo"; falling = []; pieces = []; halves = []; geo(); enterStage(1 + Math.floor(Math.random() * 12)); }
  function revive() { mode = "play"; falling = []; geo(); enterStage(stage); }
  function throwKnife() {
    if (paused || transition > 0 || waiting || !tgt || tgt.spawn < 0.6 || cooldown > 0 || knivesLeft <= 0) return false;
    if (mode !== "play" && mode !== "demo") return false;
    flying.push({ y: G.launch, id: knifeId });
    if (mode === "play") { knivesLeft--; thrown++; on.knives && on.knives(knivesLeft, knivesTotal); }
    cooldown = P.throwCooldown; ready = 0;
    if (mode === "play" && window.Sound) Sound.play("throw");
    return true;
  }

  // Does a flying knife whose tip is at tipY overlap a stuck knife? Each stuck
  // knife is a segment from the rim outwards; take its closest point inside the
  // flying knife's height range and compare the sideways distance with the
  // combined knife widths — exactly what the player sees.
  function hitsStuck(tipY, rot, angles, widthMul = 1) {
    const hw = P.hitWidth * s * widthMul, r1 = G.R - G.embed + G.L;
    for (const a of angles) {
      const th = rot + a, down = Math.sin(th);
      if (down <= 0.15) continue;                       // points up/sideways: never in the lane
      const r = Math.max(G.R * 0.97, (tipY - G.cy) / down);
      if (r > r1) continue;                             // tip hasn't reached this knife yet
      if (r * Math.abs(Math.cos(th)) < hw) return true;
    }
    return false;
  }

  // will a knife thrown right now stick? (demo AI + tests) — simulates the
  // flight with the current spin, including knives still in the air
  function predict(margin = 1) {
    if (!tgt) return false;
    const rim = G.cy + G.R - G.embed, angles = tgt.stuck.map(k => k.a);
    const pending = flying.map(k => ({ t: (k.y - rim) / G.speed, done: false }));
    const step = 0.004;
    for (let t = 0, y = G.launch; y > rim; t += step, y -= G.speed * step) {
      const rot = tgt.rot + tgt.w * t;
      pending.forEach(p => { if (!p.done && t >= p.t) { p.done = true; angles.push(Math.PI / 2 - rot); } });
      if (hitsStuck(y, rot, angles, margin)) return false;
    }
    return true;
  }

  // ---------- update -----------------------------------------------------------------
  function rotate(dt) {
    const t = tgt; t.t += dt;
    let ease = 4;
    switch (t.pattern) {
      case "wobble": t.wt = t.dir * t.base * (1 + 0.65 * Math.sin(t.t * 1.7)); break;
      case "reverse": if (t.t > t.nextEvt) { t.dir *= -1; t.nextEvt = t.t + rand(1.3, 2.6); } t.wt = t.dir * t.base; ease = 2.6; break;
      case "stopgo": t.wt = (t.t % 2.3) < 1.55 ? t.dir * t.base * 1.35 : 0; ease = 5; if (t.t > t.nextEvt) { if (Math.random() < 0.35) t.dir *= -1; t.nextEvt = t.t + 2.3; } break;
      case "surge": if (t.t > t.nextEvt) { t.wt = t.dir * t.base * rand(0.35, 1.9) * (Math.random() < 0.3 ? -1 : 1); t.nextEvt = t.t + rand(0.7, 1.6); } ease = 3; break;
      default: t.wt = t.dir * t.base;
    }
    t.w += (t.wt - t.w) * Math.min(1, dt * ease);
    t.rot += t.w * dt;
  }

  function stick(k) {
    const a = ((Math.PI / 2 - tgt.rot) % TAU + TAU) % TAU;
    tgt.stuck.push({ a, id: k.id });
    tgt.flash = 1; tgt.recoil = 1;
    if (mode === "play") {
      score++; on.score && on.score(score);
      if (window.Sound) Sound.play("hit", tgt.stuck.length);
      if (on.vibe) on.vibe(12);
    }
    if (window.FX) FX.shatter(G.cx, G.cy + G.R * 0.95, tgt.chip, 14 * s);
    if (mode === "play" && knivesLeft === 0 && flying.length === 0) clearStage();
    if (mode === "demo" && tgt.stuck.length >= 9) clearStage();
  }
  function sliceApple(i, count = true) {
    const ap = tgt.apples.splice(i, 1)[0], wa = tgt.rot + ap.a, d = G.R + G.ar;
    const px = G.cx + Math.cos(wa) * d, py = G.cy + Math.sin(wa) * d;
    [-1, 1].forEach(side => halves.push({ x: px, y: py, vx: side * rand(120, 220) * s, vy: rand(-380, -260) * s, rot: wa + Math.PI / 2, vr: side * rand(5, 9), side }));
    if (mode === "play" && count) {
      apples += P.applesPerSlice;
      if (window.Sound) Sound.play("apple");
      on.apple && on.apple(apples, px, py);
    }
    if (window.FX) FX.sparkle(px, py, 6, 14);
  }
  function fail(k) {
    if (mode === "demo") {                               // the demo just shrugs it off
      falling.push({ x: G.cx, y: k.y + G.L / 2, vx: rand(-200, 200) * s, vy: 420 * s, rot: 0, vr: 12, id: k.id });
      flying = []; return;
    }
    if (window.Sound) Sound.play("clang");
    falling.push({ x: G.cx, y: k.y + G.L / 2, vx: (Math.random() < 0.5 ? -1 : 1) * rand(140, 260) * s, vy: rand(380, 520) * s, rot: 0, vr: rand(10, 16) * (Math.random() < 0.5 ? -1 : 1), id: k.id, center: true });
    flying = [];
    shake = 1; slowmo = 0.6; mode = "dying";
    if (window.FX) FX.ring(G.cx, k.y, "#ffffff", 9 * s, 6);
    on.vibe && on.vibe([60, 40, 80]);
    on.fail && on.fail();
    setTimeout(() => { if (mode === "dying") { mode = "over"; on.over && on.over({ score, stage, apples, bosses, thrown }); } }, 1100);
  }
  function clearStage() {
    transition = 0.95;
    const isBoss = !!tgt.boss;
    if (isBoss) bosses++;
    // bake the target into an image and break it into wedges
    const size = Math.ceil(G.R * 2.3);
    pieceImg = document.createElement("canvas"); pieceImg.width = size; pieceImg.height = size;
    const px = pieceImg.getContext("2d"); px.translate(size / 2, size / 2);
    Skins.target(px, tgt.kind, G.R, { seed: tgt.seed, wood: tgt.wood });
    const n = 7, off = rand(0, TAU);
    for (let i = 0; i < n; i++) {
      const a0 = off + i * TAU / n, a1 = a0 + TAU / n, mid = tgt.rot + (a0 + a1) / 2;
      pieces.push({ x: G.cx, y: G.cy, vx: Math.cos(mid) * rand(220, 380) * s, vy: Math.sin(mid) * rand(220, 380) * s - 260 * s, rot: tgt.rot, vr: rand(-4, 4), a0, a1, life: 1.4 });
    }
    tgt.stuck.forEach(k => {
      const wa = tgt.rot + k.a, d = G.R - G.embed + G.L / 2;
      falling.push({ x: G.cx + Math.cos(wa) * d, y: G.cy + Math.sin(wa) * d, vx: Math.cos(wa) * rand(200, 420) * s, vy: Math.sin(wa) * rand(200, 420) * s - 300 * s, rot: wa - Math.PI / 2, vr: rand(-12, 12), id: k.id });
    });
    while (tgt.apples.length) sliceApple(0, false);     // leftovers fall off, unpaid
    if (window.FX) { FX.explosion(G.cx, G.cy, G.R * 1.4); }
    if (mode === "play") {
      if (window.Sound) Sound.play("break");
      on.vibe && on.vibe(40);
      const hold = on.clear && on.clear({ n: stage, boss: tgt.boss || null });
      if (hold) waiting = true;
    }
    tgt.dead = true;
  }
  function next() { if (waiting) { waiting = false; if (transition <= 0) enterStage(stage + 1); } }

  function physics(list, dt, grav) {
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      p.vy += grav * s * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      if (p.life !== undefined) p.life -= dt;
      if (p.y > H + 200 * s || (p.life !== undefined && p.life <= 0)) list.splice(i, 1);
    }
  }

  function update(dtRaw) {
    if (!W || !H) return;
    geo();
    time += dtRaw;
    if (paused) return;
    const dt = dtRaw * (slowmo > 0 ? 0.35 : 1);
    slowmo = Math.max(0, slowmo - dtRaw);
    shake = Math.max(0, shake - dtRaw * 2.5);
    cooldown = Math.max(0, cooldown - dt);
    ready = Math.min(1, ready + dt * 7);
    physics(falling, dt, 1500); physics(pieces, dt, 1300); physics(halves, dt, 1300);

    if (transition > 0) {
      transition -= dt;
      if (transition <= 0 && !waiting) enterStage(stage + 1);
      return;
    }
    if (!tgt || tgt.dead) return;
    tgt.spawn = Math.min(1, tgt.spawn + dt * 3.2);
    tgt.flash = Math.max(0, tgt.flash - dt * 6);
    tgt.recoil = Math.max(0, tgt.recoil - dt * 9);
    // target + flying knives, sub-stepped so fast throws never skip a collision
    const steps = Math.max(1, Math.ceil(dt / 0.006)), h = dt / steps;
    for (let st = 0; st < steps; st++) {
      if (mode !== "over") rotate(h);
      for (let i = flying.length - 1; i >= 0; i--) {
        const k = flying[i];
        k.y -= G.speed * h;
        // knife handles sticking out of the target
        if (hitsStuck(k.y, tgt.rot, tgt.stuck.map(o => o.a))) { fail(k); return; }
        // apples on the rim
        const ai = tgt.apples.findIndex(ap => {
          const th = tgt.rot + ap.a, d = G.R + G.ar * 0.85, ay = G.cy + Math.sin(th) * d, ax = Math.cos(th) * d;
          return k.y <= ay + G.ar * 0.6 && k.y + G.L >= ay && Math.abs(ax) < G.ar * 0.85 + 5 * s;
        });
        if (ai >= 0) sliceApple(ai);
        if (k.y <= G.cy + G.R - G.embed) { flying.splice(i, 1); stick(k); if (transition > 0) return; }
      }
    }

    // demo: an "AI" thrower that only throws when it is safe
    if (mode === "demo") {
      demoNext -= dt;
      if (demoNext <= 0 && predict(1.8)) { throwKnife(); demoNext = rand(0.35, 1.1); }
    }
  }

  // ---------- render -----------------------------------------------------------------
  function resize() {
    W = innerWidth; H = innerHeight; dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.max(1, W * dpr); cv.height = Math.max(1, H * dpr);
    cv.style.width = W + "px"; cv.style.height = H + "px";
  }
  window.addEventListener("resize", resize);
  resize();

  function drawStuck(k, rot) {
    const wa = rot + k.a, d = G.R - G.embed;
    x.save(); x.translate(Math.cos(wa) * d, Math.sin(wa) * d); x.rotate(wa - Math.PI / 2);
    Skins.knife(x, k.id, G.L);
    x.restore();
  }
  function render() {
    if (innerWidth !== W || innerHeight !== H) resize();
    if (!W || !H) return;
    geo();
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    // background + spotlight
    const g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#2d2a4a"); g.addColorStop(1, "#14122a");
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    const sp = x.createRadialGradient(G.cx, G.cy, G.R * 0.5, G.cx, G.cy, G.R * 3.2);
    sp.addColorStop(0, tgt && tgt.boss ? "rgba(255,90,110,.22)" : "rgba(255,255,255,.10)"); sp.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = sp; x.fillRect(0, 0, W, H);

    const sx = shake ? (Math.random() - 0.5) * 16 * s * shake : 0, sy = shake ? (Math.random() - 0.5) * 16 * s * shake : 0;
    x.translate(sx, sy);

    // target with its knives and apples
    if (tgt && !tgt.dead) {
      const k = tgt.spawn, sc = k < 1 ? 1 + Math.sin(k * Math.PI) * 0.12 - (1 - k) * 1 : 1;
      x.save();
      x.translate(G.cx, G.cy - tgt.recoil * 9 * s);
      x.scale(Math.max(0.01, sc), Math.max(0.01, sc));
      tgt.stuck.forEach(kn => drawStuck(kn, tgt.rot));
      x.save(); x.rotate(tgt.rot);
      Skins.target(x, tgt.kind, G.R, { seed: tgt.seed, wood: tgt.wood, flash: tgt.flash });
      x.restore();
      tgt.apples.forEach(ap => {
        const wa = tgt.rot + ap.a, d = G.R + G.ar * 0.85;
        x.save(); x.translate(Math.cos(wa) * d, Math.sin(wa) * d); x.rotate(wa + Math.PI / 2);
        Skins.apple(x, G.ar);
        x.restore();
      });
      x.restore();
    }
    // wedges
    pieces.forEach(p => {
      if (!pieceImg) return;
      x.save(); x.translate(p.x, p.y); x.rotate(p.rot);
      x.globalAlpha = Math.min(1, p.life * 2);
      x.beginPath(); x.moveTo(0, 0); x.arc(0, 0, G.R * 1.02, p.a0, p.a1); x.closePath(); x.clip();
      x.drawImage(pieceImg, -pieceImg.width / 2, -pieceImg.height / 2);
      x.restore();
    });
    x.globalAlpha = 1;
    halves.forEach(h => { x.save(); x.translate(h.x, h.y); x.rotate(h.rot); Skins.apple(x, G.ar, h.side); x.restore(); });
    falling.forEach(f => { x.save(); x.translate(f.x, f.y); x.rotate(f.rot); x.translate(0, -G.L / 2); Skins.knife(x, f.id, G.L); x.restore(); });
    flying.forEach(k => { x.save(); x.translate(G.cx, k.y); Skins.knife(x, k.id, G.L); x.restore(); });
    // the next knife, ready to throw
    if (mode === "play" && knivesLeft > 0 && transition <= 0) {
      const e = 1 - Math.pow(1 - ready, 3);
      x.save(); x.globalAlpha = 0.25 + 0.75 * e;
      x.translate(G.cx, G.launch + (1 - e) * 60 * s);
      Skins.knife(x, knifeId, G.L);
      x.restore();
    }
    x.globalAlpha = 1;
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    update(dt); render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  return {
    on, start, demo, revive, next, throw: throwKnife, predict,
    setPaused(b) { paused = b; }, setKnife(id) { knifeId = id; },
    step(dt) { update(dt); }, renderNow() { render(); },
    get mode() { return mode; }, get stage() { return stage; }, get score() { return score; }, get apples() { return apples; },
    get knivesLeft() { return knivesLeft; }, get flying() { return flying.length; }, get waiting() { return waiting; },
    get target() { return tgt && { kind: tgt.kind, boss: tgt.boss && tgt.boss.id, pattern: tgt.pattern, stuck: tgt.stuck.length, apples: tgt.apples.length, rot: tgt.rot, w: tgt.w, spawn: tgt.spawn, dead: !!tgt.dead }; },
    get transition() { return transition; }
  };
})();

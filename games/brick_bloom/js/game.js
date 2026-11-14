/* ==========================================================================
   BRICK BLOOM — engine
   Fixed-step physics (sub-stepped ball vs rect), level maps, generator,
   power-ups, lasers, bombs, Bauhaus confetti and background shapes.
   ========================================================================== */
window.Game = (() => {
  const C = window.GAME_CONFIG, P = C.play, PAL = C.palette;
  const W = 400, COLS = 10, BW = 36, BH = 17, GAP = 3, TOP = 92;
  const LEFT = (W - (COLS * BW + (COLS - 1) * GAP)) / 2;
  const cv = document.getElementById("stage"), cx = cv.getContext("2d");
  let H = 720, scale = 1, dpr = 1;

  let state = "idle";            // idle | ready | play | paused | clear | lost
  let level = 1, lives = 3, score = 0, coins = 0, combo = 0, comboT = 0, time = 0, livesLost = 0;
  let bricks = [], balls = [], drops = [], beams = [], bits = [], rings = [], floaters = [];
  let paddle, powers = {}, laserT = 0, shake = 0, flash = 0, hitstop = 0, bgT = 0;
  let skin = { paddle: C.paddles[0], ball: C.balls[0] };
  let keys = {}, pointerX = null, hooks = {};
  const col = c => PAL[c] || c;

  /* ---------- sizing ---------- */
  function resize() {
    const vw = Math.max(1, window.innerWidth), vh = Math.max(1, window.innerHeight);
    H = Math.max(640, Math.min(900, W * vh / vw));
    scale = Math.min(vw / W, vh / H);
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(W * scale * dpr); cv.height = Math.round(H * scale * dpr);
    cv.style.width = W * scale + "px"; cv.style.height = H * scale + "px";
    if (paddle) paddle.y = H - 70;
  }
  window.addEventListener("resize", resize);

  /* ---------- levels ---------- */
  function rng(seed) { return () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296; }

  function genLevel(n) {
    const r = rng(n * 7919 + 13), rows = Math.min(10, 5 + Math.floor(n / 8)), m = [];
    const kind = n % 6, maxHit = n < 20 ? 2 : 3;
    const pick = () => { const v = r(); return v < 0.04 + n * 0.0015 ? "X" : v < 0.08 ? "B" : v < 0.11 ? "P" : String(1 + Math.floor(r() * maxHit)); };
    for (let y = 0; y < rows; y++) {
      let row = "";
      for (let x = 0; x < 5; x++) {
        let c = ".";
        if (kind === 0) c = r() < 0.75 ? pick() : ".";                                  // scattered mirror
        if (kind === 1) c = (x + y) % 2 === 0 ? pick() : ".";                            // checker
        if (kind === 2) c = y % 2 === 0 ? String(1 + (y / 2 | 0) % maxHit) : (x === 4 ? "." : pick()); // stripes
        if (kind === 3) c = Math.abs(4 - x) + Math.abs(rows / 2 - y) < rows / 2 + 1 ? pick() : "."; // diamond
        if (kind === 4) c = (x === 0 || y === 0 || y === rows - 1 || x === 3) ? pick() : (r() < 0.25 ? "P" : "."); // frames
        if (kind === 5) c = r() < 0.5 + y / rows * 0.4 ? pick() : ".";                   // wedge
        if (c === "X" && y === rows - 1) c = "1";                                        // keep a way in
        row += c;
      }
      m.push(row + row.split("").reverse().join(""));
    }
    return m;
  }
  // Make sure no breakable brick is sealed inside steel: flood in from outside,
  // and turn any steel that walls off an unreached brick into a 1-hit brick.
  function openUp(map) {
    const g = map.map(r => [...r.padEnd(COLS, ".")]), R = g.length;
    for (let pass = 0; pass < 6; pass++) {
      const seen = g.map(r => r.map(() => false)), q = [];
      for (let x = 0; x < COLS; x++) q.push([x, R]);
      for (let y = 0; y < R; y++) q.push([-1, y], [COLS, y]);
      while (q.length) {
        const [x, y] = q.pop();
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= COLS || ny >= R || seen[ny][nx] || g[ny][nx] === "X") return;
          seen[ny][nx] = true; q.push([nx, ny]);
        });
      }
      let fixed = false;
      g.forEach((row, y) => row.forEach((c, x) => {
        if (c === "." || c === "X" || seen[y][x]) return;
        for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) {
          const ny = y + dy, nx = x + dx;
          if (g[ny] && g[ny][nx] === "X") { g[ny][nx] = "1"; fixed = true; break; }
        }
      }));
      if (!fixed) break;
    }
    return g.map(r => r.join(""));
  }
  const levelMap = n => openUp(n <= C.levels.length ? C.levels[n - 1] : genLevel(n));
  const totalLevels = () => C.levels.length + C.generatedLevels;

  function buildBricks(map) {
    bricks = [];
    map.forEach((row, y) => [...row].forEach((ch, x) => {
      if (ch === ".") return;
      const b = { x: LEFT + x * (BW + GAP), y: TOP + y * (BH + GAP), w: BW, h: BH, type: "n", hp: 1, squash: 0, gx: x, gy: y, alive: true };
      if (ch === "X") b.type = "steel";
      else if (ch === "B") b.type = "bomb";
      else if (ch === "P") b.type = "power";
      else b.hp = +ch;
      b.max = b.hp;
      bricks.push(b);
    }));
  }

  /* ---------- run control ---------- */
  function start(n) {
    level = n; lives = P.lives; score = 0; coins = 0; combo = 0; time = 0; livesLost = 0;
    buildBricks(levelMap(n));
    drops = []; beams = []; bits = []; rings = []; floaters = []; powers = {};
    paddle = { x: W / 2, y: H - 70, w: P.paddleWidth, tw: P.paddleWidth, squash: 0, vx: 0 };
    serve();
    state = "ready";
    emit("hud");
  }
  function serve() {
    balls = [{ x: paddle.x, y: paddle.y - 12, vx: 0, vy: 0, r: 7, stuck: true, off: 0, trail: [] }];
  }
  function speed() { return Math.min(P.maxSpeed, P.ballSpeed + (level - 1) * P.speedPerLevel) * (powers.slow ? 0.7 : 1); }

  function launch() {
    if (state === "ready") state = "play";
    if (state !== "play") return;
    balls.forEach(b => {
      if (!b.stuck) return;
      b.stuck = false;
      const a = -Math.PI / 2 + (b.off / (paddle.w / 2)) * 0.9 + (b.off === 0 ? (Math.random() - 0.5) * 0.3 : 0);
      b.vx = Math.cos(a) * speed(); b.vy = Math.sin(a) * speed();
    });
  }

  /* ---------- power-ups ---------- */
  function spawnDrop(x, y) {
    const list = C.powers, tot = list.reduce((s, p) => s + p.weight, 0);
    let r = Math.random() * tot, p = list[0];
    for (const q of list) { r -= q.weight; if (r <= 0) { p = q; break; } }
    drops.push({ x, y, vy: 110, p, spin: 0 });
  }
  function applyPower(p) {
    Sound.sfx(p.bad ? "bad" : "power");
    floatText(paddle.x, paddle.y - 30, p.name.toUpperCase(), col(p.color));
    const T = P.powerTime;
    if (p.id === "wide") { paddle.tw = Math.min(P.paddleMax, paddle.tw + 26); powers.wide = T; }
    if (p.id === "shrink") { paddle.tw = Math.max(P.paddleMin, paddle.tw - 24); powers.shrink = T; }
    if (p.id === "multi") {
      const src = balls.filter(b => !b.stuck)[0] || balls[0];
      for (let i = 0; i < 2; i++) {
        const a = Math.atan2(src.vy || -1, src.vx || 0) + (i ? 0.45 : -0.45), s = speed();
        balls.push({ x: src.x, y: src.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: 7, stuck: false, off: 0, trail: [] });
      }
      if (src.stuck) launch();
    }
    if (p.id === "laser") powers.laser = T;
    if (p.id === "slow") { powers.slow = T; balls.forEach(b => setSpeed(b, speed())); }
    if (p.id === "fire") powers.fire = T * 0.75;
    if (p.id === "sticky") powers.sticky = T;
    if (p.id === "life") { lives++; emit("hud"); }
    emit("powers");
  }
  function setSpeed(b, s) { const m = Math.hypot(b.vx, b.vy) || 1; b.vx *= s / m; b.vy *= s / m; }

  /* ---------- effects ---------- */
  function confetti(x, y, color, n = 9, force = 1) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = (60 + Math.random() * 220) * force;
      bits.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 80, r: 3 + Math.random() * 5, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 14,
        life: 0.7 + Math.random() * 0.6, t: 0, shape: Math.random() * 3 | 0, color });
    }
  }
  function floatText(x, y, text, color) { floaters.push({ x, y, text, color, t: 0 }); }
  function brickColor(b) {
    if (b.type === "steel") return PAL.grey;
    if (b.type === "bomb") return PAL.ink;
    if (b.type === "power") return PAL.green;
    return [PAL.red, PAL.yellow, PAL.blue][b.hp - 1] || PAL.blue;
  }

  /* ---------- brick hits ---------- */
  function hitBrick(b, fromFire) {
    if (!b.alive) return;
    b.squash = 1;
    if (b.type === "steel") { Sound.sfx("steel"); return; }
    b.hp -= fromFire ? b.hp : 1;
    if (b.hp > 0) { Sound.sfx("hard"); score += 5; emit("hud"); return; }
    breakBrick(b);
  }
  function breakBrick(b) {
    if (!b.alive) return;
    b.alive = false;
    combo++; comboT = P.comboWindow;
    const pts = 10 * b.max * Math.min(8, 1 + Math.floor(combo / 4));
    score += pts; coins += P.coinsPerBrick;
    Sound.sfx("brick", combo - 1);
    confetti(b.x + b.w / 2, b.y + b.h / 2, brickColor({ ...b, hp: b.max }), 8);
    if (combo > 1 && combo % 5 === 0) floatText(b.x + b.w / 2, b.y, combo + " COMBO", PAL.ink);
    if (b.type === "bomb") {
      Sound.sfx("boom"); shake = 10; flash = 0.25; hitstop = 0.05;
      rings.push({ x: b.x + b.w / 2, y: b.y + b.h / 2, r: 6, t: 0 });
      bricks.forEach(o => { if (o.alive && o.type !== "steel" && Math.abs(o.gx - b.gx) <= 1 && Math.abs(o.gy - b.gy) <= 1) setTimeout(() => breakBrick(o), 40); });
    }
    if (b.type === "power" || (b.type === "n" && Math.random() < P.powerDropChance)) spawnDrop(b.x + b.w / 2, b.y + b.h / 2);
    emit("hud");
    if (!bricks.some(o => o.alive && o.type !== "steel")) win();
  }

  function win() {
    if (state !== "play") return;
    state = "clear";
    Sound.sfx("clear");
    for (let i = 0; i < 6; i++) setTimeout(() => confetti(60 + Math.random() * 280, 150 + Math.random() * 200, [PAL.red, PAL.yellow, PAL.blue][i % 3], 22, 1.4), i * 120);
    const par = 40 + bricks.length * 1.2;
    const stars = livesLost === 0 && time < par ? 3 : livesLost <= 1 ? 2 : 1;
    score += lives * 250;
    setTimeout(() => emit("clear", { level, score, stars, coins: coins + stars * P.coinsPerStar, time }), 1100);
  }

  function loseBall() {
    lives--; livesLost++; combo = 0;
    Sound.sfx("lose"); shake = 12; flash = 0.3;
    powers = {}; paddle.tw = P.paddleWidth; drops = []; beams = [];
    emit("hud"); emit("powers");
    if (lives <= 0) { state = "lost"; setTimeout(() => emit("lost", { level, score }), 700); }
    else { serve(); state = "ready"; }
  }

  /* ---------- physics ---------- */
  function collideRect(b, r) {
    const nx = Math.max(r.x, Math.min(b.x, r.x + r.w)), ny = Math.max(r.y, Math.min(b.y, r.y + r.h));
    const dx = b.x - nx, dy = b.y - ny;
    if (dx * dx + dy * dy > b.r * b.r) return false;
    // push out along the axis of least penetration
    const ox = Math.min(b.x + b.r - r.x, r.x + r.w - (b.x - b.r)), oy = Math.min(b.y + b.r - r.y, r.y + r.h - (b.y - b.r));
    if (ox < oy) { b.vx = b.x < r.x + r.w / 2 ? -Math.abs(b.vx) : Math.abs(b.vx); b.x += b.x < r.x + r.w / 2 ? -ox : ox; }
    else { b.vy = b.y < r.y + r.h / 2 ? -Math.abs(b.vy) : Math.abs(b.vy); b.y += b.y < r.y + r.h / 2 ? -oy : oy; }
    return true;
  }

  function stepBall(b, dt) {
    if (b.stuck) { b.x = paddle.x + b.off; b.y = paddle.y - 9 - b.r; return; }
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx); Sound.sfx("wall"); }
    if (b.x > W - b.r) { b.x = W - b.r; b.vx = -Math.abs(b.vx); Sound.sfx("wall"); }
    if (b.y < 64 + b.r) { b.y = 64 + b.r; b.vy = Math.abs(b.vy); Sound.sfx("wall"); }
    // paddle: angle depends on where it hits
    const pw = paddle.w / 2;
    if (b.vy > 0 && b.y + b.r >= paddle.y - 8 && b.y < paddle.y + 8 && Math.abs(b.x - paddle.x) < pw + b.r) {
      const off = Math.max(-1, Math.min(1, (b.x - paddle.x) / pw));
      const a = -Math.PI / 2 + off * 1.05, s = Math.min(P.maxSpeed, Math.hypot(b.vx, b.vy) + 3);
      b.vx = Math.cos(a) * s; b.vy = Math.sin(a) * s; b.y = paddle.y - 8 - b.r;
      paddle.squash = 1; combo = 0;
      Sound.sfx("paddle");
      if (powers.sticky) { b.stuck = true; b.off = b.x - paddle.x; }
    }
    for (const r of bricks) {
      if (!r.alive) continue;
      if (powers.fire && r.type !== "steel") {
        const nx = Math.max(r.x, Math.min(b.x, r.x + r.w)), ny = Math.max(r.y, Math.min(b.y, r.y + r.h));
        if ((b.x - nx) ** 2 + (b.y - ny) ** 2 <= b.r * b.r) { hitBrick(r, true); confetti(b.x, b.y, PAL.red, 3); }
        continue;
      }
      if (collideRect(b, r)) { hitBrick(r); break; }
    }
    // never let the ball go almost horizontal (endless side-to-side)
    if (Math.abs(b.vy) < 90) { b.vy = (b.vy < 0 ? -1 : 1) * 90; setSpeed(b, Math.hypot(b.vx, b.vy)); }
    b.trail.push(b.x, b.y); if (b.trail.length > 16) b.trail.splice(0, 2);
  }

  function step(dt) {
    bgT += dt;
    if (state === "paused" || state === "idle") return;
    if (hitstop > 0) { hitstop -= dt; return; }
    if (state === "play") time += dt;
    // paddle follow
    let tx = paddle.x;
    if (pointerX !== null) tx = pointerX;
    if (keys.left) tx = paddle.x - 520 * dt;
    if (keys.right) tx = paddle.x + 520 * dt;
    paddle.w += (paddle.tw - paddle.w) * Math.min(1, dt * 10);
    tx = Math.max(paddle.w / 2, Math.min(W - paddle.w / 2, tx));
    paddle.vx = (tx - paddle.x) / dt; paddle.x = tx;
    paddle.squash = Math.max(0, paddle.squash - dt * 5);
    // timed powers
    for (const k in powers) {
      powers[k] -= dt;
      if (powers[k] <= 0) { delete powers[k]; if (k === "wide" || k === "shrink") paddle.tw = P.paddleWidth; if (k === "sticky") launch(); emit("powers"); }
    }
    if (comboT > 0 && (comboT -= dt) <= 0) combo = 0;

    if (state === "play" || state === "ready") {
      const sub = 4;
      for (let i = 0; i < sub; i++) balls.forEach(b => stepBall(b, dt / sub));
      balls = balls.filter(b => b.y < H + 20);
      if (!balls.length && state === "play") loseBall();
    }
    // lasers
    if (powers.laser && state === "play") {
      laserT -= dt;
      if (laserT <= 0) { laserT = 0.32; beams.push({ x: paddle.x - paddle.w / 2 + 6, y: paddle.y - 10 }, { x: paddle.x + paddle.w / 2 - 6, y: paddle.y - 10 }); Sound.sfx("laser"); }
    }
    beams.forEach(l => {
      l.y -= 760 * dt;
      for (const r of bricks) if (r.alive && l.x > r.x && l.x < r.x + r.w && l.y > r.y && l.y < r.y + r.h) { hitBrick(r); l.dead = true; break; }
    });
    beams = beams.filter(l => !l.dead && l.y > 60);
    // drops
    drops.forEach(d => {
      d.y += d.vy * dt; d.spin += dt * 3;
      if (d.y > paddle.y - 14 && d.y < paddle.y + 12 && Math.abs(d.x - paddle.x) < paddle.w / 2 + 10) { d.dead = true; applyPower(d.p); }
    });
    drops = drops.filter(d => !d.dead && d.y < H + 20);
    // fx
    bricks.forEach(b => b.squash = Math.max(0, b.squash - dt * 6));
    bits.forEach(p => { p.t += dt; p.vy += 520 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; p.vx *= 0.99; });
    bits = bits.filter(p => p.t < p.life);
    rings.forEach(r => { r.t += dt; r.r += 260 * dt; }); rings = rings.filter(r => r.t < 0.4);
    floaters.forEach(f => { f.t += dt; f.y -= 40 * dt; }); floaters = floaters.filter(f => f.t < 1);
    shake = Math.max(0, shake - dt * 40); flash = Math.max(0, flash - dt);
  }

  /* ---------- drawing ---------- */
  function outlineRect(x, y, w, h, fill, lw = 2.5) {
    cx.fillStyle = fill; cx.fillRect(x, y, w, h);
    cx.lineWidth = lw; cx.strokeStyle = PAL.ink; cx.strokeRect(x, y, w, h);
  }
  function drawBackground() {
    cx.fillStyle = PAL.paper; cx.fillRect(0, 0, W, H);
    // giant slow Bauhaus composition
    cx.save(); cx.globalAlpha = 0.13;
    cx.fillStyle = PAL.yellow; cx.beginPath(); cx.arc(330, H * 0.36, 120 + Math.sin(bgT * 0.4) * 6, 0, Math.PI * 2); cx.fill();
    cx.fillStyle = PAL.red; cx.save(); cx.translate(70, H * 0.62); cx.rotate(bgT * 0.05);
    cx.beginPath(); cx.moveTo(0, -90); cx.lineTo(80, 60); cx.lineTo(-80, 60); cx.closePath(); cx.fill(); cx.restore();
    cx.fillStyle = PAL.blue; cx.beginPath(); cx.moveTo(400, H); cx.arc(400, H, 170, Math.PI, Math.PI * 1.5); cx.closePath(); cx.fill();
    cx.restore();
    cx.globalAlpha = 0.25; cx.strokeStyle = PAL.ink; cx.lineWidth = 1;
    cx.beginPath(); cx.moveTo(0, H * 0.82); cx.lineTo(W, H * 0.82); cx.moveTo(W * 0.18, 64); cx.lineTo(W * 0.18, H); cx.stroke();
    cx.globalAlpha = 1;
    // frame
    cx.fillStyle = PAL.ink; cx.fillRect(0, 60, W, 4);
  }
  function drawBrick(b) {
    const s = 1 + b.squash * 0.12, w = b.w * s, h = b.h * (2 - s), x = b.x + (b.w - w) / 2, y = b.y + (b.h - h) / 2;
    const c = brickColor(b);
    outlineRect(x, y, w, h, c);
    cx.fillStyle = PAL.paper;
    if (b.type === "steel") { cx.fillStyle = PAL.ink; [[5, 5], [w - 5, 5], [5, h - 5], [w - 5, h - 5]].forEach(([a, d]) => { cx.beginPath(); cx.arc(x + a, y + d, 1.6, 0, 7); cx.fill(); }); }
    else if (b.type === "bomb") { cx.fillStyle = PAL.red; cx.beginPath(); cx.arc(x + w / 2, y + h / 2, 5 + Math.sin(bgT * 8) * 1, 0, 7); cx.fill(); }
    else if (b.type === "power") { cx.fillStyle = PAL.paper; cx.beginPath(); cx.moveTo(x + w / 2, y + 3); cx.lineTo(x + w / 2 + 6, y + h - 3); cx.lineTo(x + w / 2 - 6, y + h - 3); cx.fill(); }
    else if (b.max > 1) {
      // cracks show damage; dots show hits left
      for (let i = 0; i < b.hp; i++) { cx.beginPath(); cx.arc(x + w / 2 + (i - (b.hp - 1) / 2) * 7, y + h / 2, 2, 0, 7); cx.fill(); }
      if (b.hp < b.max) { cx.strokeStyle = PAL.ink; cx.lineWidth = 1.5; cx.beginPath(); cx.moveTo(x + 4, y + 3); cx.lineTo(x + 12, y + h / 2); cx.lineTo(x + 8, y + h - 2); cx.stroke(); }
    }
  }
  function drawPaddle() {
    const p = paddle, sk = skin.paddle, c = col(sk.color), sq = p.squash * 3;
    const x = p.x - p.w / 2 - sq, y = p.y - 7 + sq, w = p.w + sq * 2, h = 14 - sq;
    cx.lineWidth = 2.5; cx.strokeStyle = PAL.ink; cx.fillStyle = c;
    cx.beginPath();
    if (sk.shape === "pill") { cx.roundRect(x, y, w, h, h / 2); }
    else if (sk.shape === "arch") { cx.moveTo(x, y + h); cx.quadraticCurveTo(p.x, y - 10, x + w, y + h); cx.closePath(); }
    else cx.rect(x, y, w, h);
    cx.fill(); cx.stroke();
    cx.fillStyle = PAL.paper;
    if (sk.shape === "notch") { cx.fillRect(p.x - 6, y, 12, 5); cx.strokeRect(p.x - 6, y - 1, 12, 6); }
    if (sk.shape === "split") { cx.fillStyle = PAL.yellow; cx.fillRect(x + 2, y + 2, w / 3, h - 4); cx.fillStyle = PAL.red; cx.fillRect(x + w * 2 / 3 - 2, y + 2, w / 3, h - 4); }
    if (sk.shape === "dots") for (let i = 8; i < w - 4; i += 9) { cx.beginPath(); cx.arc(x + i, y + h / 2, 2.2, 0, 7); cx.fill(); }
    if (powers.laser) { cx.fillStyle = PAL.ink; cx.fillRect(x + 2, y - 8, 6, 8); cx.fillRect(x + w - 8, y - 8, 6, 8); }
    if (powers.sticky) { cx.fillStyle = PAL.green; cx.fillRect(x + 4, y - 3, w - 8, 3); }
  }
  function drawBallShape(b, x, y, r, fill) {
    const sh = skin.ball.shape;
    cx.fillStyle = fill; cx.strokeStyle = PAL.ink; cx.lineWidth = 2;
    cx.beginPath();
    if (sh === "square") cx.rect(x - r, y - r, r * 2, r * 2);
    else cx.arc(x, y, r, 0, Math.PI * 2);
    cx.fill();
    if (sh === "ring") { cx.fillStyle = PAL.paper; cx.beginPath(); cx.arc(x, y, r * 0.45, 0, 7); cx.fill(); }
    if (sh === "half") { cx.fillStyle = PAL.ink; cx.beginPath(); cx.arc(x, y, r, Math.PI / 2, Math.PI * 1.5); cx.fill(); }
  }
  function drawBall(b) {
    const fill = powers.fire ? PAL.red : col(skin.ball.color);
    for (let i = 0; i < b.trail.length; i += 4) {
      cx.globalAlpha = (i / b.trail.length) * 0.35;
      drawBallShape(b, b.trail[i], b.trail[i + 1], b.r * (0.5 + i / b.trail.length * 0.4), fill);
    }
    cx.globalAlpha = 1;
    drawBallShape(b, b.x, b.y, b.r, fill);
    if (powers.fire) { cx.strokeStyle = PAL.yellow; cx.lineWidth = 2; cx.beginPath(); cx.arc(b.x, b.y, b.r + 3 + Math.sin(bgT * 20), 0, 7); cx.stroke(); }
  }
  function drawDrop(d) {
    const c = col(d.p.color), r = 11, sx = Math.cos(d.spin);
    cx.save(); cx.translate(d.x, d.y); cx.scale(Math.max(0.15, Math.abs(sx)), 1);
    cx.fillStyle = c; cx.strokeStyle = PAL.ink; cx.lineWidth = 2.5;
    cx.beginPath(); cx.arc(0, 0, r, 0, 7); cx.fill(); cx.stroke();
    cx.fillStyle = d.p.color === "yellow" ? PAL.ink : PAL.paper;
    cx.font = "900 13px 'Futura','Century Gothic','Avenir Next',sans-serif"; cx.textAlign = "center"; cx.textBaseline = "middle";
    if (sx > 0) cx.fillText(d.p.label, 0, 1);
    cx.restore();
  }
  function render() {
    cx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
    cx.save();
    if (shake > 0) cx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    drawBackground();
    if (paddle) {
      bricks.forEach(b => b.alive && drawBrick(b));
      cx.fillStyle = PAL.red; beams.forEach(l => cx.fillRect(l.x - 2, l.y - 12, 4, 14));
      drops.forEach(drawDrop);
      drawPaddle();
      balls.forEach(drawBall);
      if (state === "ready") {
        cx.fillStyle = PAL.ink; cx.font = "700 13px 'Futura','Century Gothic','Avenir Next',sans-serif"; cx.textAlign = "center";
        cx.globalAlpha = 0.5 + Math.sin(bgT * 5) * 0.3; cx.fillText("TAP TO LAUNCH", W / 2, paddle.y + 38); cx.globalAlpha = 1;
      }
    }
    bits.forEach(p => {
      cx.save(); cx.translate(p.x, p.y); cx.rotate(p.rot); cx.globalAlpha = Math.min(1, (p.life - p.t) * 3);
      cx.fillStyle = p.color;
      cx.beginPath();
      if (p.shape === 0) cx.rect(-p.r, -p.r, p.r * 2, p.r * 2);
      else if (p.shape === 1) cx.arc(0, 0, p.r, 0, 7);
      else { cx.moveTo(0, -p.r); cx.lineTo(p.r, p.r); cx.lineTo(-p.r, p.r); }
      cx.fill(); cx.restore();
    });
    rings.forEach(r => { cx.strokeStyle = PAL.ink; cx.lineWidth = 6 * (1 - r.t / 0.4); cx.beginPath(); cx.arc(r.x, r.y, r.r, 0, 7); cx.stroke(); });
    cx.textAlign = "center"; cx.font = "900 16px 'Futura','Century Gothic','Avenir Next',sans-serif";
    floaters.forEach(f => { cx.globalAlpha = 1 - f.t; cx.fillStyle = f.color; cx.fillText(f.text, f.x, f.y); });
    cx.globalAlpha = 1;
    cx.restore();
    if (flash > 0) { cx.fillStyle = `rgba(255,255,255,${flash})`; cx.fillRect(0, 0, W, H); }
  }

  /* ---------- loop + input ---------- */
  let last = 0;
  function frame(t) {
    const dt = Math.min(0.033, (t - last) / 1000 || 0.016); last = t;
    step(dt); render();
    requestAnimationFrame(frame);
  }
  function toWorld(e) { const r = cv.getBoundingClientRect(); return (e.clientX - r.left) / r.width * W; }
  cv.addEventListener("pointerdown", e => { if (state === "play" || state === "ready") { pointerX = toWorld(e); launch(); } });
  window.addEventListener("pointermove", e => { if ((state === "play" || state === "ready") && (e.buttons || e.pointerType === "mouse")) pointerX = toWorld(e); });
  window.addEventListener("keydown", e => {
    if (e.key === "ArrowLeft" || e.key === "a") { keys.left = true; pointerX = null; }
    if (e.key === "ArrowRight" || e.key === "d") { keys.right = true; pointerX = null; }
    if (e.key === " " || e.key === "ArrowUp") launch();
    if (e.key === "Escape" || e.key === "p") emit("pauseKey");
  });
  window.addEventListener("keyup", e => {
    if (e.key === "ArrowLeft" || e.key === "a") keys.left = false;
    if (e.key === "ArrowRight" || e.key === "d") keys.right = false;
  });
  function emit(n, d) { if (hooks[n]) hooks[n](d); }

  resize();
  requestAnimationFrame(frame);

  return {
    on(n, fn) { hooks[n] = fn; },
    start, launch, step, renderNow: render, totalLevels, levelMap,
    pause() { if (state === "play" || state === "ready") { this._was = state; state = "paused"; } },
    resume() { if (state === "paused") state = this._was || "play"; },
    revive() { lives = 1; serve(); state = "ready"; emit("hud"); },
    quit() { state = "idle"; paddle = null; bricks = []; balls = []; },
    aim(x) { pointerX = x; },             // testing hook: move the paddle
    setSkin(p, b) { skin.paddle = p; skin.ball = b; },
    get state() { return state; }, get level() { return level; }, get lives() { return lives; },
    get score() { return score; }, get powers() { return powers; }, get bricks() { return bricks; }, get balls() { return balls; },
    get paddle() { return paddle; }
  };
})();

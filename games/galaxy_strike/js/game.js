/* ==========================================================================
   GAME — the shooter engine: fixed-step loop, parallax space, waves and
   formations, enemies, bosses with bullet patterns, weapons (5 levels,
   overdrive missiles, wingmen), power-ups, coins + magnet, bombs, combo,
   and all the juice (explosions, shockwaves, debris, hit-stop, slow motion,
   screen shake). UI talks to it through Game.* and listens on Game.on.*
   ========================================================================== */
window.Game = (() => {
  const C = window.GAME_CONFIG, P = C.play, T = C.theme, D = C.difficulty;
  const canvas = document.getElementById("stage"), ctx = canvas.getContext("2d");
  const W = 400;                                   // world width; height follows the screen
  let H = 720, scale = 1, offX = 0, viewW = W, DPR = 1;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const on = {};                                   // UI callbacks: score, combo, hp, bombs, coins, wave, banner, boss, bossHp, bossDown, powerup, over, vibe

  // ---------- state ------------------------------------------------------------
  let state = "demo";                              // demo | play | paused | dying | over
  let player, bullets, missiles, eBullets, enemies, pickups, coins, parts, rings, debris, texts;
  let boss = null, waveQ = [], waveT = 0, waveClearT = 0, warnT = 0, sectorT = 0;
  let run = null, loadout = null, shipCfg = C.ships[0];
  let dieT = 0, shake = 0, hitstop = 0, timeScale = 1, slowmo = 1, flash = 0, hurtFlash = 0, warp = 0, time = 0;

  function reset() {
    bullets = []; missiles = []; eBullets = []; enemies = []; pickups = []; coins = []; parts = []; rings = []; debris = []; texts = [];
    boss = null; waveQ = []; waveT = 0; waveClearT = 0; warnT = 0; sectorT = 0; shake = 0; hitstop = 0; slowmo = 1; flash = 0; hurtFlash = 0;
  }
  function makePlayer(lo) {
    const maxHp = P.hull + (lo ? lo.hull : 0) + (shipCfg.hull || 0);
    return {
      x: W / 2, y: H - 110, tx: W / 2, ty: H - 110, bank: 0, hp: maxHp, maxHp,
      inv: 0, weapon: 1 + (lo ? lo.power : 0), fireT: 0, missileT: 0, droneT: 0,
      shield: 0, overdrive: 0, drones: 0, magnet: 0, bombs: lo ? P.bombsStart + lo.bombs : 1
    };
  }

  // ---------- sizing -------------------------------------------------------------
  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    const cw = Math.max(1, window.innerWidth), ch = Math.max(1, window.innerHeight);
    canvas.width = Math.round(cw * DPR); canvas.height = Math.round(ch * DPR);
    canvas.style.width = cw + "px"; canvas.style.height = ch + "px";
    scale = Math.min(cw / W, ch / 620);
    H = ch / scale; viewW = cw / scale; offX = (viewW - W) / 2;
    if (player) { player.y = clamp(player.y, H * .3, H - 50); player.ty = clamp(player.ty, H * .3, H - 50); }
    initStars();
  }

  // ---------- background: stars, nebulas, planet --------------------------------
  let stars = [], nebulas = [], planet = null;
  function initStars() {
    stars = [];
    const n = Math.round(viewW * H / 2600);
    for (let i = 0; i < n; i++) stars.push({ x: rnd(-offX, W + offX), y: rnd(0, H), z: Math.random() < .55 ? 1 : Math.random() < .7 ? 2 : 3, tw: rnd(0, 6) });
    if (!nebulas.length) T.nebulas.forEach((c, i) => nebulas.push({ c, x: rnd(0, W), y: i * 330 - 100, r: rnd(180, 260), v: rnd(6, 12) }));
  }
  const nebulaSprite = {};
  function nebSprite(c, r) {
    const k = c + r;
    if (nebulaSprite[k]) return nebulaSprite[k];
    const cv = document.createElement("canvas"); cv.width = cv.height = 128;
    const x = cv.getContext("2d"), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, c + "aa"); g.addColorStop(.5, c + "33"); g.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    return (nebulaSprite[k] = cv);
  }
  function newPlanet() {
    const c = pick(T.nebulas), r = rnd(60, 110);
    const cv = document.createElement("canvas"); cv.width = cv.height = 300;
    const x = cv.getContext("2d");
    const g = x.createRadialGradient(150 - r * .4, 150 - r * .4, r * .1, 150, 150, r);
    g.addColorStop(0, Sprites.lighten(c, .35)); g.addColorStop(.7, Sprites.lighten(c, -.45)); g.addColorStop(1, Sprites.lighten(c, -.8));
    x.fillStyle = g; x.beginPath(); x.arc(150, 150, r, 0, 7); x.fill();
    if (Math.random() < .6) { x.strokeStyle = Sprites.lighten(c, .2); x.globalAlpha = .55; x.lineWidth = 5; x.beginPath(); x.ellipse(150, 150, r * 1.45, r * .32, -.35, 0, 7); x.stroke(); }
    planet = { cv, x: rnd(30, W - 30), y: -170, v: 9 };
  }
  function updateBg(dt) {
    const sp = 1 + warp * 8 + (boss && !boss.dying ? .4 : 0);
    for (const s of stars) { s.y += (s.z * s.z * 14 + 10) * sp * dt; if (s.y > H) { s.y -= H; s.x = rnd(-offX, W + offX); } }
    for (const n of nebulas) { n.y += n.v * sp * dt; if (n.y - n.r > H) { n.y = -n.r * 1.2; n.x = rnd(0, W); n.c = pick(T.nebulas); } }
    if (planet) { planet.y += planet.v * sp * dt; if (planet.y > H + 170) planet = null; }
  }
  function drawBg() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, T.spaceTop); g.addColorStop(1, T.spaceBottom);
    ctx.fillStyle = g; ctx.fillRect(-offX, 0, viewW, H);
    ctx.globalCompositeOperation = "lighter";
    for (const n of nebulas) { ctx.globalAlpha = .55; ctx.drawImage(nebSprite(n.c, n.r), n.x - n.r * 1.4, n.y - n.r * 1.4, n.r * 2.8, n.r * 2.8); }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    if (planet) { ctx.globalAlpha = .75; ctx.drawImage(planet.cv, planet.x - 150, planet.y - 150); ctx.globalAlpha = 1; }
    ctx.fillStyle = T.stars;
    const streak = warp * 40;
    for (const s of stars) {
      ctx.globalAlpha = s.z === 3 ? 1 : s.z === 2 ? .7 : .4 + .2 * Math.sin(time * 3 + s.tw);
      const sz = s.z === 3 ? 2 : s.z === 2 ? 1.4 : 1;
      ctx.fillRect(s.x, s.y - streak * s.z, sz, sz + streak * s.z);
    }
    ctx.globalAlpha = 1;
  }

  // ---------- effects -------------------------------------------------------------
  const MAX_PARTS = 700;
  function spark(x, y, color, n = 8, speed = 220, life = .5, size = 2) {
    for (let i = 0; i < n && parts.length < MAX_PARTS; i++) {
      const a = rnd(0, Math.PI * 2), v = rnd(.3, 1) * speed;
      parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rnd(.6, 1) * life, max: life, c: color, s: size, k: "spark" });
    }
  }
  function fireball(x, y, color, n, r) {
    for (let i = 0; i < n && parts.length < MAX_PARTS; i++) {
      const a = rnd(0, Math.PI * 2), v = rnd(10, 70) * r / 20;
      parts.push({ x: x + Math.cos(a) * r * .3, y: y + Math.sin(a) * r * .3, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rnd(.35, .6), max: .6, c: i % 3 ? color : "#ffe7a8", r: rnd(.6, 1.2) * r, k: "glow" });
    }
  }
  function ring(x, y, color, r, w = 4, life = .45) { rings.push({ x, y, r: r * .2, to: r, life, max: life, c: color, w }); }
  function chunks(x, y, color, n, size) {
    for (let i = 0; i < n; i++) {
      const a = rnd(0, Math.PI * 2), v = rnd(60, 220);
      debris.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, rot: rnd(0, 6), vr: rnd(-10, 10), s: rnd(.5, 1) * size, life: rnd(.6, 1.1), c: color });
    }
  }
  function text(x, y, str, color = "#fff", size = 16, life = .8) { if (texts.length < 40) texts.push({ x, y, str, c: color, s: size, life, max: life }); }
  function explode(x, y, color, size = 1) {
    fireball(x, y, color, Math.round(4 + 4 * size), 14 * size + 6);
    spark(x, y, color, Math.round(10 * size), 260 * Math.sqrt(size), .55);
    spark(x, y, "#ffffff", Math.round(4 * size), 160, .3, 1.5);
    ring(x, y, color, 40 * size, 3 + size);
    chunks(x, y, color, Math.round(3 + 2 * size), 4 + size * 2);
    shake = Math.max(shake, 2.5 * size);
    if (state !== "demo") Sound.play(size >= 3 ? "bigExplode" : "explode", Math.min(2, .8 + size * .3));
  }

  // ---------- difficulty -----------------------------------------------------------
  const sec = () => Math.min(run ? run.sector : 1, D.maxSectorScale);
  const hpMul = () => 1 + D.hpPerSector * (sec() - 1);
  const spdMul = () => 1 + D.speedPerSector * (sec() - 1);
  const fireMul = () => 1 + D.fireRatePerSector * (sec() - 1);

  // ---------- enemies & formations ---------------------------------------------------
  function spawn(type, x, y, move, extra = {}) {
    const e = C.enemies[type];
    const o = {
      type, x, y, x0: x, r: e.r, hp: Math.ceil(e.hp * hpMul()), score: e.score, color: e.color, move,
      v: e.speed * spdMul() * rnd(.92, 1.08), t: 0, ph: rnd(0, 6), amp: 40, f: 2, vx: 0, flash: 0, rot: 0,
      fireT: e.fireEvery ? rnd(.6, 1.4) * e.fireEvery : 0, fireEvery: e.fireEvery || 0, entered: false, ...extra
    };
    o.max = o.hp;
    enemies.push(o);
    return o;
  }
  const FORMATIONS = {
    line(n) { const k = Math.min(7, 4 + Math.floor(n / 2)); for (let i = 0; i < k; i++) spawn("drone", 40 + i * (320 / (k - 1)), -30 - (i % 2) * 24, "sine", { amp: 26, f: 1.6 }); },
    vee() { for (let i = 0; i < 7; i++) { const d = i - 3; spawn("drone", W / 2 + d * 38, -30 - Math.abs(d) * 30, "sine", { amp: 10, f: 1 }); } },
    snake() { const x0 = rnd(110, 290), k = 8; for (let i = 0; i < k; i++) waveQ.push({ t: waveT + i * .17, fn: () => spawn("drone", x0, -30, "sine", { amp: 120, f: 1.7, ph: 0, x0 }) }); },
    darts() { const k = 3 + Math.min(3, sec()); for (let i = 0; i < k; i++) waveQ.push({ t: waveT + i * .3, fn: () => spawn("dart", rnd(40, W - 40), -30, "dive") }); },
    gunners() { [W * .25, W * .75].forEach((x, i) => spawn("gunner", x, -40 - i * 30, "hover", { ty: rnd(110, 190), stay: rnd(7, 9) })); },
    mines() { for (let i = 0; i < 4; i++) spawn("mine", rnd(40, W - 40), -30 - i * 60, "drift"); },
    tank() { spawn("tank", W / 2, -50, "hover", { ty: rnd(130, 170), stay: 12 }); spawn("drone", W / 2 - 80, -30, "sine", { amp: 30 }); spawn("drone", W / 2 + 80, -30, "sine", { amp: 30 }); },
    sweep() { const left = Math.random() < .5; for (let i = 0; i < 6; i++) waveQ.push({ t: waveT + i * .2, fn: () => spawn("drone", left ? -20 : W + 20, 90 + i * 8, "sweep", { dir: left ? 1 : -1 }) }); }
  };
  function buildWave() {
    const s = run.sector, w = run.wave;
    const pool = ["line", "vee", "snake", "darts", "sweep"];
    if (w >= 2 || s > 1) pool.push("gunners", "mines");
    if (w >= 3 || s > 1) pool.push("tank");
    if (s > 2) pool.push("darts", "gunners");
    const groups = 3 + Math.min(4, w) + Math.min(4, Math.floor(s / 2));
    let t = 0.6;
    for (let i = 0; i < groups; i++) {
      const f = pick(pool);
      waveQ.push({ t: waveT + t, fn: () => FORMATIONS[f](s + w) });
      t += f === "tank" ? 4 : rnd(1.8, 2.8) - Math.min(.8, s * .08);
    }
  }
  function startWave() {
    waveQ = []; buildWave();
    on.wave && on.wave(run.sector, run.wave);
  }

  function updateEnemies(dt) {
    for (const e of enemies) {
      e.t += dt; if (e.flash > 0) e.flash -= dt;
      switch (e.move) {
        case "sine": e.y += e.v * dt; e.x = e.x0 + Math.sin(e.t * e.f + e.ph) * e.amp; break;
        case "sweep": e.x += e.dir * e.v * 1.3 * dt; e.y += Math.sin(e.t * 2) * 40 * dt + 18 * dt; break;
        case "dive": {
          e.y += e.v * dt;
          if (e.y < player.y - 120) { e.vx += Math.sign(player.x - e.x) * 520 * dt; e.vx = clamp(e.vx, -170, 170); }
          e.x += e.vx * dt; e.rot = Math.atan2(-e.vx, e.v) * .6;
          break;
        }
        case "hover":
          if (e.y < e.ty) e.y += e.v * 1.6 * dt;
          else { e.x = e.x0 + Math.sin(e.t * .9 + e.ph) * 34; e.stay -= dt; if (e.stay <= 0) e.move = "leave"; }
          break;
        case "leave": e.y += e.v * 2.2 * dt; break;
        case "drift": e.y += e.v * dt; e.rot += dt * 1.5; e.x += Math.sin(e.t + e.ph) * 20 * dt; break;
      }
      if (e.y > 0) e.entered = true;
      // shooting
      if (e.fireEvery && e.y > 30 && e.y < H * .62 && state !== "dying") {
        e.fireT -= dt * fireMul();
        if (e.fireT <= 0) {
          e.fireT = e.fireEvery * rnd(.85, 1.15);
          const a = Math.atan2(player.y - e.y, player.x - e.x);
          if (e.type === "gunner") {
            const burst = sec() >= 3 ? 3 : 1;
            for (let i = 0; i < burst; i++) waveQ.push({ t: waveT + i * .12, fn: () => { if (e.hp > 0) shoot(e.x, e.y + 14, Math.atan2(player.y - e.y, player.x - e.x), 230, 5); } });
          } else if (e.type === "tank") {
            for (let i = -2; i <= 2; i++) shoot(e.x, e.y + 22, a + i * .2, 170, 6);
          }
        }
      }
    }
    // remove what left the screen (no score)
    enemies = enemies.filter(e => e.hp > 0 && !(e.entered && (e.y > H + 50 || e.x < -70 || e.x > W + 70)));
  }
  function shoot(x, y, a, speed, r = 5, color = T.enemyBullet) {
    if (eBullets.length > 400) return;
    eBullets.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r, c: color });
  }

  function killEnemy(e, byBomb) {
    e.hp = 0;
    const size = e.type === "tank" ? 2.6 : e.type === "gunner" ? 1.6 : 1;
    explode(e.x, e.y, e.color, size);
    if (state === "play") {
      run.kills++; run.combo++; run.comboT = P.comboWindow;
      run.maxCombo = Math.max(run.maxCombo, run.combo);
      const mult = 1 + Math.floor(run.combo / P.comboStep) * .5;
      const pts = Math.round(e.score * mult);
      run.score += pts;
      text(e.x, e.y - 10, "+" + pts, mult > 1 ? "#ffd23f" : "#ffffff", mult > 1 ? 15 : 13, .6);
      if (run.combo % P.comboStep === 0) { on.combo && on.combo(run.combo, mult + .5); Sound.play("combo", run.combo / P.comboStep); }
      on.score && on.score(run.score, run.combo, mult);
      if (Math.random() < P.coinChance * (byBomb ? .5 : 1)) dropCoins(e.x, e.y, e.type === "tank" ? 6 : e.type === "gunner" ? 3 : 1 + (Math.random() < .3 ? 1 : 0));
      if (Math.random() < P.dropChance * (e.type === "tank" ? 4 : e.type === "gunner" ? 2 : 1)) dropPickup(e.x, e.y);
    }
    if (e.type === "mine") for (let i = 0; i < 8; i++) shoot(e.x, e.y, i / 8 * Math.PI * 2 + e.rot, 140, 5, "#ff8a3d");
    if (size > 2) hitstop = .05;
  }
  function dropCoins(x, y, n) {
    for (let i = 0; i < n && coins.length < 150; i++) coins.push({ x, y, vx: rnd(-90, 90), vy: rnd(-160, -60), t: 0 });
  }
  function dropPickup(x, y, id) {
    let pu;
    if (id) pu = C.powerups.find(p => p.id === id);
    else {
      let total = C.powerups.reduce((s, p) => s + p.weight, 0), r = Math.random() * total;
      pu = C.powerups.find(p => (r -= p.weight) < 0) || C.powerups[0];
      if (pu.id === "power" && player.weapon >= 5) pu = C.powerups.find(p => p.id === "overdrive");
    }
    pickups.push({ pu, x, y, t: rnd(0, 6) });
  }

  // ---------- boss ----------------------------------------------------------------------
  function startBoss() {
    const cfg = C.bosses[(run.sector - 1) % C.bosses.length];
    const hp = Math.round(cfg.hp * (1 + D.hpPerSector * (sec() - 1)));
    boss = { cfg, x: W / 2, y: -120, hp, max: hp, t: 0, flash: 0, patI: 0, pat: null, patT: 1.5, entered: false, dying: 0, minionT: 6 };
    Sound.setBoss(true);
    on.boss && on.boss(cfg);
  }
  const PATTERNS = {
    fan(b, p) { if (p.shots === 0 || p.t > p.shots * .55) { const a = Math.atan2(player.y - b.y, player.x - b.x); for (let i = -3; i <= 3; i++) shoot(b.x, b.y + 50, a + i * .15, 190 * p.k, 6); p.shots++; } return p.shots >= 4; },
    spiral(b, p) { p.acc = (p.acc || 0) + p.dt; while (p.acc > .1 / p.k) { p.acc -= .1 / p.k; p.a = (p.a || 0) + .31; for (let i = 0; i < 3; i++) shoot(b.x, b.y, p.a + i * Math.PI * 2 / 3, 150 * p.k, 5, "#ff6bd5"); } return p.t > 2.6; },
    ring(b, p) { if (p.t > p.shots * .7) { const n = 16, off = p.shots * .2; for (let i = 0; i < n; i++) shoot(b.x, b.y, i / n * Math.PI * 2 + off, 140 * p.k, 6, "#ffb21f"); p.shots++; } return p.shots >= 3; },
    aimed(b, p) { if (p.t > p.shots * .16) { const a = Math.atan2(player.y - b.y, player.x - b.x); [-.1, 0, .1].forEach(o => shoot(b.x + (p.shots % 2 ? 40 : -40), b.y + 30, a + o, 220 * p.k, 5)); p.shots++; } return p.shots >= 8; },
    rain(b, p) { if (p.t > p.shots * .09) { shoot(rnd(10, W - 10), -10, Math.PI / 2 + rnd(-.12, .12), rnd(150, 230) * p.k, 6, "#7dff5a"); p.shots++; } return p.shots >= 30; }
  };
  function updateBoss(dt) {
    const b = boss;
    b.t += dt; if (b.flash > 0) b.flash -= dt;
    if (b.dying) {
      b.dying -= dt;
      if (Math.random() < .35) explode(b.x + rnd(-70, 70), b.y + rnd(-50, 50), pick([b.cfg.color, "#ffb21f", "#ffffff"]), rnd(1, 1.8));
      shake = Math.max(shake, 6);
      if (b.dying <= 0) bossDown();
      return;
    }
    if (!b.entered) { b.y += 70 * dt; if (b.y >= 150) { b.entered = true; b.y = 150; } return; }
    const rage = b.hp < b.max * .33 ? 2 : b.hp < b.max * .66 ? 1 : 0;
    b.x = W / 2 + Math.sin(b.t * (.5 + rage * .15)) * 110;
    b.y = 150 + Math.sin(b.t * 1.3) * 16;
    if (!b.pat) {
      b.patT -= dt;
      if (b.patT <= 0) { const name = b.cfg.patterns[b.patI++ % b.cfg.patterns.length]; b.pat = { name, t: 0, shots: 0, k: (1 + rage * .18 + (sec() - 1) * .04) * (run.sector === 1 ? .88 : 1) /* the first boss is gentler */ }; }
    } else {
      b.pat.t += dt; b.pat.dt = dt;
      if (PATTERNS[b.pat.name](b, b.pat)) { b.pat = null; b.patT = 1.1 - rage * .3; }
    }
    if (rage >= 1) { b.minionT -= dt; if (b.minionT <= 0) { b.minionT = 7 - rage * 2; spawn("dart", b.x - 60, b.y, "dive"); spawn("dart", b.x + 60, b.y, "dive"); } }
  }
  function damageBoss(d) {
    const b = boss;
    if (!b || b.dying || !b.entered) return;
    b.hp -= d; b.flash = .05;
    if (state === "play") run.score += Math.round(d);
    on.bossHp && on.bossHp(Math.max(0, b.hp / b.max));
    if (b.hp <= 0) {
      b.hp = 0; b.dying = 2.2; eBullets.length = 0; slowmo = .35;
      Sound.play("bigExplode");
      on.vibe && on.vibe([60, 40, 120]);
    }
  }
  function bossDown() {
    const b = boss;
    explode(b.x, b.y, b.cfg.color, 5); ring(b.x, b.y, "#ffffff", 300, 8, .9); flash = .8; slowmo = 1;
    const bonus = 1000 * run.sector;
    run.score += bonus; run.bosses++;
    text(b.x, b.y, "+" + bonus.toLocaleString(), "#ffd23f", 26, 1.6);
    dropCoins(b.x, b.y, Math.min(60, Math.round(b.cfg.coins / 3)));
    run.bonusCoins += b.cfg.coins - Math.min(60, Math.round(b.cfg.coins / 3));
    dropPickup(b.x - 30, b.y, "power"); dropPickup(b.x + 30, b.y);
    boss = null;
    Sound.setBoss(false); Sound.play("win");
    on.score && on.score(run.score, run.combo, 1);
    on.bossDown && on.bossDown(b.cfg, run.sector);
    // warp to the next sector
    sectorT = 3.2; setTimeout(() => Sound.play("warp"), 1400);
  }

  // ---------- player ------------------------------------------------------------------
  const WEAPON = [
    null,
    [[0, 0]],
    [[-7, 0], [7, 0]],
    [[-7, 0], [7, 0], [-14, -.16], [14, .16]],
    [[0, 0], [-11, 0], [11, 0], [-16, -.18], [16, .18]],
    [[0, 0], [-11, 0], [11, 0], [-16, -.14], [16, .14], [-20, -.32], [20, .32]]
  ];
  function updatePlayer(dt, auto) {
    const p = player;
    const k = 1 - Math.pow(1 - P.dragFollow, dt * 60);
    const ox = p.x;
    p.x += (p.tx - p.x) * k; p.y += (p.ty - p.y) * k;
    p.x = clamp(p.x, 16, W - 16); p.y = clamp(p.y, H * .3, H - 44);
    p.bank += (clamp((p.x - ox) / (dt * 400), -1, 1) - p.bank) * Math.min(1, dt * 10);
    ["inv", "shield", "overdrive", "drones", "magnet"].forEach(key => { if (p[key] > 0) p[key] = Math.max(0, p[key] - dt); });
    // engine trail
    if (parts.length < MAX_PARTS) parts.push({ x: p.x + rnd(-3, 3), y: p.y + 22, vx: rnd(-15, 15), vy: rnd(120, 200), life: .25, max: .25, c: shipCfg.glow, r: rnd(5, 8), k: "glow" });
    if (state === "dying") return;
    // guns
    const rate = P.fireRate * (loadout ? loadout.rate : 1) * (shipCfg.fire || 1) * (p.overdrive > 0 ? 2 : 1);
    p.fireT -= dt;
    if (p.fireT <= 0) {
      p.fireT += 1 / rate; if (p.fireT < 0) p.fireT = 0;
      const dmg = (loadout ? loadout.dmg : 1) * (shipCfg.damage || 1);
      for (const [dx, a] of WEAPON[Math.min(5, p.weapon)]) bullets.push({ x: p.x + dx, y: p.y - 20, vx: Math.sin(a) * P.bulletSpeed, vy: -Math.cos(a) * P.bulletSpeed, d: dmg, a });
      if (!auto) Sound.play("laser", p.weapon);
    }
    if (p.overdrive > 0) {
      p.missileT -= dt;
      if (p.missileT <= 0) { p.missileT = .32; [-1, 1].forEach(s => missiles.push({ x: p.x + s * 14, y: p.y, vx: s * 160, vy: -120, t: 0, d: 4 * (loadout ? loadout.dmg : 1) })); Sound.play("missile"); }
    }
    if (p.drones > 0) {
      p.droneT -= dt;
      if (p.droneT <= 0) { p.droneT = 1 / (rate * .7); [-1, 1].forEach(s => bullets.push({ x: p.x + s * 34, y: p.y - 4, vx: 0, vy: -P.bulletSpeed, d: .8 * (loadout ? loadout.dmg : 1), a: 0, drone: true })); }
    }
  }
  function hurt() {
    const p = player;
    if (p.inv > 0 || state !== "play") return;
    if (p.shield > 0) { Sound.play("shieldHit"); ring(p.x, p.y, "#3fd8ff", 50, 3); p.inv = .3; return; }
    p.hp--; p.inv = P.invulnerable; shake = 12; hurtFlash = 1;
    p.weapon = Math.max(1 + (loadout ? loadout.power : 0), p.weapon - 1);
    run.combo = 0; on.combo && on.combo(0, 1);
    Sound.play("hurt"); on.vibe && on.vibe(120);
    spark(p.x, p.y, "#ff3d6e", 18, 260, .5);
    on.hp && on.hp(p.hp, p.maxHp);
    if (p.hp <= 0) die();
  }
  function die() {
    state = "dying"; slowmo = .3;
    explode(player.x, player.y, shipCfg.glow, 3.5); ring(player.x, player.y, "#ffffff", 160, 6, .8);
    Sound.muffle(true);
    dieT = 1.4;                                            // game-time seconds until the game-over screen
  }
  function summary() {
    return { score: run.score, sector: run.sector, wave: run.wave, kills: run.kills, coins: run.coins + run.bonusCoins, bosses: run.bosses, maxCombo: run.maxCombo, powerups: run.powerups, bombsUsed: run.bombsUsed, revived: run.revived };
  }
  function applyPickup(pu) {
    const p = player;
    run.powerups++;
    if (pu.id === "power") p.weapon = Math.min(5, p.weapon + 1);
    else if (pu.id === "repair") { p.hp = Math.min(p.maxHp, p.hp + 1); on.hp && on.hp(p.hp, p.maxHp); }
    else if (pu.id === "bomb") { p.bombs = Math.min(9, p.bombs + 1); on.bombs && on.bombs(p.bombs); }
    else { p[pu.id] = pu.time; if (pu.id === "shield") Sound.play("shield"); }
    text(p.x, p.y - 40, pu.id === "power" ? (p.weapon >= 5 ? "MAX POWER!" : "POWER UP!") : pu.name.toUpperCase() + "!", pu.color, 18, 1);
    ring(p.x, p.y, pu.color, 60, 3, .4);
    Sound.play("powerup"); on.vibe && on.vibe(25);
    on.powerup && on.powerup(pu, p);
  }
  function bomb() {
    const p = player;
    if (state !== "play" || p.bombs <= 0) return false;
    p.bombs--; run.bombsUsed++;
    on.bombs && on.bombs(p.bombs);
    flash = 1; shake = 18; hitstop = .06;
    ring(p.x, p.y, "#ffffff", 520, 10, .7); ring(p.x, p.y, shipCfg.glow, 380, 6, .6);
    for (const b of eBullets) spark(b.x, b.y, b.c, 2, 90, .3);
    eBullets.length = 0;
    for (const e of enemies) { e.hp -= P.bombDamage; e.flash = .1; if (e.hp <= 0) killEnemy(e, true); }
    if (boss) damageBoss(P.bombDamage * 3);
    Sound.play("bomb"); on.vibe && on.vibe([40, 30, 80]);
    return true;
  }

  // ---------- collisions & movement -----------------------------------------------------
  function updateShots(dt) {
    for (const b of bullets) { b.x += b.vx * dt; b.y += b.vy * dt; }
    for (const m of missiles) {
      m.t += dt;
      let tg = null, best = 1e9;
      if (boss && boss.entered && !boss.dying) tg = boss;
      else for (const e of enemies) { const d = (e.x - m.x) ** 2 + (e.y - m.y) ** 2; if (d < best && e.y > 0) { best = d; tg = e; } }
      const sp = 520;
      if (tg && m.t > .12) { const a = Math.atan2(tg.y - m.y, tg.x - m.x), cur = Math.atan2(m.vy, m.vx); let da = a - cur; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2; const na = cur + clamp(da, -7 * dt, 7 * dt); m.vx = Math.cos(na) * sp; m.vy = Math.sin(na) * sp; }
      else { m.vy -= 600 * dt; }
      m.x += m.vx * dt; m.y += m.vy * dt;
      if (parts.length < MAX_PARTS && Math.random() < .7) parts.push({ x: m.x, y: m.y, vx: 0, vy: 0, life: .2, max: .2, c: "#ff9a5a", r: 5, k: "glow" });
    }
    // player shots vs enemies / boss
    const hitList = (list, isMissile) => {
      for (const b of list) {
        if (b.dead) continue;
        if (boss && boss.entered && !boss.dying && Math.abs(b.x - boss.x) < 72 && Math.abs(b.y - boss.y) < 58) {
          b.dead = true; damageBoss(b.d); spark(b.x, b.y, "#ffffff", 2, 120, .2, 1.5); Sound.play("hit");
          if (isMissile) explode(b.x, b.y, "#ff9a5a", .6);
          continue;
        }
        for (const e of enemies) {
          if (e.hp <= 0) continue;
          const rr = e.r + 4;
          if ((b.x - e.x) ** 2 + (b.y - e.y) ** 2 < rr * rr) {
            b.dead = true; e.hp -= b.d; e.flash = .06;
            spark(b.x, b.y, e.color, 2, 140, .2, 1.5);
            if (isMissile) explode(b.x, b.y, "#ff9a5a", .6);
            if (e.hp <= 0) killEnemy(e); else Sound.play("hit");
            break;
          }
        }
      }
    };
    hitList(bullets, false); hitList(missiles, true);
    bullets = bullets.filter(b => !b.dead && b.y > -30 && b.x > -30 && b.x < W + 30);
    missiles = missiles.filter(m => !m.dead && m.y > -40 && m.y < H + 40 && m.t < 3);
    enemies = enemies.filter(e => e.hp > 0 || false);

    // enemy shots vs player
    const p = player, pr = 7;
    for (const b of eBullets) {
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (state === "play" && !b.dead) {
        const rr = b.r + (p.shield > 0 ? 26 : pr);
        if ((b.x - p.x) ** 2 + (b.y - p.y) ** 2 < rr * rr) { b.dead = true; spark(b.x, b.y, b.c, 6, 150, .3); hurt(); }
      }
    }
    eBullets = eBullets.filter(b => !b.dead && b.y > -40 && b.y < H + 40 && b.x > -40 && b.x < W + 40);

    // body contact
    if (state === "play") {
      for (const e of enemies) {
        const rr = e.r + (p.shield > 0 ? 26 : 12);
        if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 < rr * rr) { if (e.type !== "tank") killEnemy(e); hurt(); }
      }
      if (boss && boss.entered && !boss.dying && Math.abs(boss.x - p.x) < 70 && Math.abs(boss.y - p.y) < 50) hurt();
    }
  }
  function updateLoot(dt) {
    const p = player, mag = (p.magnet > 0 ? 260 : 0) + (loadout ? loadout.magnet : 40) + (waveClearT > 0 ? 900 : 0);
    for (const c of coins) {
      c.t += dt;
      const dx = p.x - c.x, dy = p.y - c.y, d = Math.hypot(dx, dy);
      if (state === "play" && d < mag && c.t > .25) { const s = 520 + (mag - d) * 2; c.vx = dx / d * s; c.vy = dy / d * s; }
      else { c.vy += 260 * dt; c.vx *= .98; if (c.vy > 120) c.vy = 120; }
      c.x += c.vx * dt; c.y += c.vy * dt;
      if (state === "play" && d < 22) { c.dead = true; run.coins += C.economy.coinValue; Sound.play("coin"); on.coins && on.coins(run.coins + run.bonusCoins); }
    }
    coins = coins.filter(c => !c.dead && c.y < H + 20);
    for (const u of pickups) {
      u.t += dt; u.y += 75 * dt; u.x += Math.sin(u.t * 2) * 30 * dt;
      if (state === "play" && (u.x - p.x) ** 2 + (u.y - p.y) ** 2 < 30 * 30) { u.dead = true; applyPickup(u.pu); }
    }
    pickups = pickups.filter(u => !u.dead && u.y < H + 30);
  }
  function updateFx(dt) {
    for (const q of parts) { q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= .96; q.vy *= .96; q.life -= dt; }
    parts = parts.filter(q => q.life > 0);
    for (const r of rings) { r.life -= dt; r.r += (r.to - r.r) * Math.min(1, dt * 9); }
    rings = rings.filter(r => r.life > 0);
    for (const d of debris) { d.x += d.vx * dt; d.y += d.vy * dt; d.vy += 80 * dt; d.rot += d.vr * dt; d.life -= dt; }
    debris = debris.filter(d => d.life > 0);
    for (const t of texts) { t.y -= 40 * dt; t.life -= dt; }
    texts = texts.filter(t => t.life > 0);
    shake *= Math.pow(.02, dt); if (shake < .2) shake = 0;
    flash = Math.max(0, flash - dt * 2.2); hurtFlash = Math.max(0, hurtFlash - dt * 2);
  }

  // ---------- the wave director ----------------------------------------------------------------
  function updateDirector(dt) {
    if (state !== "play" && state !== "dying") return;
    if (sectorT > 0) {                                   // warp between sectors
      sectorT -= dt; warp = Math.min(1, warp + dt * 1.5);
      if (sectorT < 1.2) warp = Math.max(0, warp - dt * 2);
      if (sectorT <= 0) { warp = 0; run.sector++; run.wave = 1; newPlanet(); on.banner && on.banner(`SECTOR ${run.sector}`, C.bosses[(run.sector - 1) % C.bosses.length].name + " awaits"); startWave(); }
      return;
    }
    if (warnT > 0) { warnT -= dt; if (warnT <= 0) startBoss(); return; }
    if (boss) { updateBoss(dt); return; }
    for (const q of waveQ) if (!q.done && waveT >= q.t) { q.done = true; q.fn(); }
    waveQ = waveQ.filter(q => !q.done);
    if (waveClearT > 0) {
      waveClearT -= dt;
      if (waveClearT <= 0) {
        if (run.wave >= P.wavesPerBoss) { warnT = 2.8; Sound.play("warning"); on.banner && on.banner("WARNING", "Boss approaching", true); }
        else { run.wave++; startWave(); }
      }
      return;
    }
    if (!waveQ.length && !enemies.length) {             // wave cleared → vacuum the coins, short break
      waveClearT = 1.6;
      if (run.wave < P.wavesPerBoss) on.banner && on.banner(`WAVE ${run.wave} CLEAR`, "", false, true);
    }
  }
  // demo mode for the home screen: endless easy formations, the ship flies itself
  function updateDemo(dt) {
    waveT += dt;
    for (const q of waveQ) if (!q.done && waveT >= q.t) { q.done = true; q.fn(); }
    waveQ = waveQ.filter(q => !q.done);
    if (waveQ.length === 0 && enemies.length < 4) waveQ.push({ t: waveT + 1, fn: () => FORMATIONS[pick(["line", "vee", "snake", "sweep"])](1) });
    let tgt = null, best = 1e9;
    for (const e of enemies) { if (e.y > 20 && e.y < H * .6) { const d = Math.abs(e.x - player.x); if (d < best) { best = d; tgt = e; } } }
    player.tx = tgt ? tgt.x : W / 2 + Math.sin(time * .7) * 100;
    player.ty = H * .6 + Math.sin(time * 1.3) * 20;      // above the menu buttons
    for (const b of eBullets) b.dead = true;
  }

  // ---------- update ------------------------------------------------------------------------------
  function update(dt) {
    time += dt;
    if (state === "paused" || state === "over") { updateBg(dt * .3); return; }
    if (hitstop > 0) { hitstop -= dt; return; }
    const sdt = dt * slowmo;
    updateBg(sdt);
    if (state === "demo") { updateDemo(sdt); updatePlayer(sdt, true); }
    else {
      waveT += sdt;
      if (run.comboT > 0) { run.comboT -= sdt; if (run.comboT <= 0 && run.combo > 0) { run.combo = 0; on.combo && on.combo(0, 1); } }
      updateDirector(sdt);
      if (state === "dying" && dieT > 0) { dieT -= dt; if (dieT <= 0) { state = "over"; slowmo = 1; on.over && on.over(summary()); } }
      if (state !== "dying" || player.hp > 0) updatePlayer(sdt);
    }
    updateEnemies(sdt);
    updateShots(sdt);
    updateLoot(sdt);
    updateFx(sdt);
  }

  // ---------- render ------------------------------------------------------------------------------
  const flashCache = {};
  function whiteOf(img, key) {                        // white silhouette for hit flashes
    if (flashCache[key]) return flashCache[key];
    const c = document.createElement("canvas"); c.width = img.width; c.height = img.height; c.w = img.w; c.h = img.h;
    const x = c.getContext("2d"); x.drawImage(img, 0, 0); x.globalCompositeOperation = "source-atop"; x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height);
    return (flashCache[key] = c);
  }
  const blit = (img, x, y, rot = 0, s = 1) => {
    if (!rot && s === 1) { ctx.drawImage(img, x - img.w / 2, y - img.h / 2, img.w, img.h); return; }
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.drawImage(img, -img.w / 2 * s, -img.h / 2 * s, img.w * s, img.h * s); ctx.restore();
  };
  function render() {
    ctx.setTransform(DPR * scale, 0, 0, DPR * scale, 0, 0);
    ctx.translate(offX, 0);
    if (shake) ctx.translate(rnd(-shake, shake), rnd(-shake, shake));
    drawBg();

    // loot
    const coinImg = Sprites.coin();
    for (const c of coins) { const s = Math.abs(Math.cos(c.t * 6)); ctx.save(); ctx.translate(c.x, c.y); ctx.scale(.35 + s * .65, 1); ctx.drawImage(coinImg, -coinImg.w / 2, -coinImg.h / 2, coinImg.w, coinImg.h); ctx.restore(); }
    for (const u of pickups) { const img = Sprites.pickup(u.pu); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = .5 + .3 * Math.sin(u.t * 6); blit(Sprites.glow(u.pu.color, 30), u.x, u.y); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over"; blit(img, u.x, u.y, Math.sin(u.t * 2) * .2); }

    // enemies
    for (const e of enemies) {
      const img = Sprites.enemy(e.type);
      blit(img, e.x, e.y, e.rot || 0);
      if (e.flash > 0) blit(whiteOf(img, "e" + e.type), e.x, e.y, e.rot || 0);
      if (e.max > 5 && e.hp < e.max) { ctx.fillStyle = "rgba(0,0,0,.5)"; ctx.fillRect(e.x - e.r, e.y - e.r - 9, e.r * 2, 4); ctx.fillStyle = e.color; ctx.fillRect(e.x - e.r, e.y - e.r - 9, e.r * 2 * e.hp / e.max, 4); }
    }
    if (boss) {
      const img = Sprites.boss(boss.cfg), shakeB = boss.dying ? rnd(-4, 4) : 0;
      ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = .35 + .15 * Math.sin(time * 4);
      blit(Sprites.glow(boss.cfg.color, 110), boss.x, boss.y); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
      blit(img, boss.x + shakeB, boss.y);
      if (boss.flash > 0 || (boss.dying && Math.random() < .3)) blit(whiteOf(img, "b" + boss.cfg.id), boss.x + shakeB, boss.y);
    }

    // player shots (additive)
    ctx.globalCompositeOperation = "lighter";
    const bImg = Sprites.bolt(T.playerBullet), dImg = Sprites.bolt("#7dff5a", 4, 16);
    for (const b of bullets) blit(b.drone ? dImg : bImg, b.x, b.y, b.a);
    const mImg = Sprites.missile("#ff9a5a");
    for (const m of missiles) blit(mImg, m.x, m.y, Math.atan2(m.vy, m.vx) + Math.PI / 2);
    ctx.globalCompositeOperation = "source-over";

    // player
    const p = player;
    if (state !== "over" && !(state === "dying" && p.hp <= 0) && !(p.inv > 0 && state === "play" && Math.floor(time * 18) % 2)) {
      const ship = Sprites.ship(shipCfg);
      ctx.globalCompositeOperation = "lighter";
      const fl = 14 + Math.random() * 8 + (p.overdrive > 0 ? 10 : 0);
      blit(Sprites.glow(shipCfg.glow, 18), p.x, p.y + 24 + fl * .3, 0, .8);
      ctx.globalCompositeOperation = "source-over";
      ctx.save(); ctx.translate(p.x, p.y); ctx.scale(1 - Math.abs(p.bank) * .22, 1); ctx.rotate(p.bank * .1);
      ctx.drawImage(ship, -ship.w / 2, -ship.h / 2, ship.w, ship.h); ctx.restore();
      if (p.drones > 0) { const di = Sprites.drone("#7dff5a"); [-1, 1].forEach(s => blit(di, p.x + s * 34, p.y + 6 + Math.sin(time * 6 + s) * 3)); }
      if (p.shield > 0 && (p.shield > 1.5 || Math.floor(time * 10) % 2)) {
        ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = "rgba(63,216,255,.85)"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(p.x, p.y, 30 + Math.sin(time * 8) * 1.5, 0, 7); ctx.stroke();
        ctx.globalAlpha = .35; blit(Sprites.glow("#3fd8ff", 36), p.x, p.y); ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
      }
      if (p.magnet > 0) { ctx.strokeStyle = "rgba(255,162,63,.25)"; ctx.setLineDash([4, 8]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(p.x, p.y, 70 + (time * 60) % 40, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
    }

    // enemy shots (on top so they are always visible)
    ctx.globalCompositeOperation = "lighter";
    for (const b of eBullets) blit(Sprites.orb(b.c, b.r), b.x, b.y);
    // particles
    for (const q of parts) {
      const a = q.life / q.max;
      if (q.k === "glow") { ctx.globalAlpha = a; const g = Sprites.glow(q.c, 16); ctx.drawImage(g, q.x - q.r, q.y - q.r, q.r * 2, q.r * 2); }
      else { ctx.globalAlpha = a; ctx.fillStyle = q.c; ctx.fillRect(q.x - q.s / 2, q.y - q.s / 2, q.s, q.s * 2.2); }
    }
    for (const r of rings) { ctx.globalAlpha = r.life / r.max; ctx.strokeStyle = r.c; ctx.lineWidth = r.w * (r.life / r.max) + .5; ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, 7); ctx.stroke(); }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    for (const d of debris) { ctx.globalAlpha = Math.min(1, d.life * 2); ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.rot); ctx.fillStyle = d.c; ctx.fillRect(-d.s / 2, -d.s / 3, d.s, d.s * .66); ctx.restore(); }
    ctx.globalAlpha = 1;
    // floating texts
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (const t of texts) {
      ctx.globalAlpha = Math.min(1, t.life / t.max * 2);
      ctx.font = `900 italic ${t.s}px system-ui, -apple-system, "Segoe UI", sans-serif`;
      ctx.lineWidth = 4; ctx.strokeStyle = "rgba(5,3,26,.85)"; ctx.strokeText(t.str, t.x, t.y); ctx.fillStyle = t.c; ctx.fillText(t.str, t.x, t.y);
    }
    ctx.globalAlpha = 1;

    // screen overlays
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const cw = canvas.width / DPR, ch = canvas.height / DPR;
    if (flash > 0) { ctx.fillStyle = `rgba(255,255,255,${flash * .8})`; ctx.fillRect(0, 0, cw, ch); }
    const warnA = warnT > 0 ? .35 + .3 * Math.sin(time * 14) : hurtFlash * .7;
    if (warnA > 0) {
      const g = ctx.createRadialGradient(cw / 2, ch / 2, Math.min(cw, ch) * .3, cw / 2, ch / 2, Math.max(cw, ch) * .75);
      g.addColorStop(0, "rgba(255,0,60,0)"); g.addColorStop(1, `rgba(255,0,60,${warnA})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch);
    }
  }

  // ---------- loop & input -----------------------------------------------------------------------------
  let last = 0, acc = 0;
  const STEP = 1 / 60;
  function frame(t) {
    const dt = Math.min(.1, (t - (last || t)) / 1000); last = t;
    acc += dt;
    let n = 0;
    while (acc >= STEP && n < 5) { update(STEP); acc -= STEP; n++; }
    if (n === 5) acc = 0;
    render();
    requestAnimationFrame(frame);
  }

  const keys = {};
  let drag = null;
  canvas.addEventListener("pointerdown", e => {
    if (state !== "play") return;
    drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, px: player.tx, py: player.ty };
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
  });
  canvas.addEventListener("pointermove", e => {
    if (!drag || drag.id !== e.pointerId || state !== "play") return;
    // relative drag: your finger can stay below the ship so it never hides it
    player.tx = clamp(drag.px + (e.clientX - drag.sx) / scale * 1.15, 16, W - 16);
    player.ty = clamp(drag.py + (e.clientY - drag.sy) / scale * 1.15, H * .3, H - 44);
  });
  ["pointerup", "pointercancel"].forEach(ev => canvas.addEventListener(ev, e => { if (drag && drag.id === e.pointerId) drag = null; }));
  document.addEventListener("keydown", e => { keys[e.key.toLowerCase()] = true; if (state === "play" && (e.key === "b" || e.key === "B" || e.key === "Shift")) bomb(); });
  document.addEventListener("keyup", e => { keys[e.key.toLowerCase()] = false; });
  setInterval(() => {                                  // keyboard steering (desktop)
    if (state !== "play") return;
    const sp = 7;
    if (keys.arrowleft || keys.a) player.tx = clamp(player.tx - sp, 16, W - 16);
    if (keys.arrowright || keys.d) player.tx = clamp(player.tx + sp, 16, W - 16);
    if (keys.arrowup || keys.w) player.ty = clamp(player.ty - sp, H * .3, H - 44);
    if (keys.arrowdown || keys.s) player.ty = clamp(player.ty + sp, H * .3, H - 44);
  }, 16);
  window.addEventListener("resize", resize);

  // ---------- public API ----------------------------------------------------------------------------
  function init() {
    resize(); reset(); player = makePlayer(null); player.inv = 0;
    newPlanet(); planet.y = H * .25;
    requestAnimationFrame(frame);
  }
  function start(lo) {
    loadout = lo; shipCfg = lo.ship;
    reset();
    player = makePlayer(lo);
    run = { score: 0, sector: 1, wave: 1, kills: 0, combo: 0, comboT: 0, maxCombo: 0, coins: 0, bonusCoins: 0, bosses: 0, powerups: 0, bombsUsed: 0, revived: 0 };
    state = "play"; waveT = 0; Sound.setBoss(false); Sound.muffle(false);
    on.hp && on.hp(player.hp, player.maxHp); on.bombs && on.bombs(player.bombs);
    on.score && on.score(0, 0, 1); on.coins && on.coins(0);
    on.banner && on.banner("SECTOR 1", C.bosses[0].name + " awaits");
    startWave();
  }
  function demo(ship) {
    if (ship) shipCfg = ship;
    loadout = null; run = null; reset();
    player = makePlayer(null);
    state = "demo"; Sound.setBoss(false); Sound.muffle(false);
  }
  function revive() {
    player.hp = player.maxHp; player.inv = P.reviveInvulnerable; player.shield = 2;
    eBullets.length = 0; run.revived++;
    for (const e of enemies) if (Math.hypot(e.x - player.x, e.y - player.y) < 120) killEnemy(e, true);
    ring(player.x, player.y, "#3fd8ff", 200, 6, .7);
    state = "play"; slowmo = 1; Sound.muffle(false); Sound.play("shield");
    on.hp && on.hp(player.hp, player.maxHp);
  }

  return {
    on, init, start, demo, revive, bomb,
    pause(p) { if (p && state === "play") { state = "paused"; Sound.muffle(true); } else if (!p && state === "paused") { state = "play"; Sound.muffle(false); last = 0; } },
    setShip(s) { shipCfg = s; },
    get state() { return state; }, get run() { return run; }, get player() { return player; }, get boss() { return boss; },
    get enemies() { return enemies; }, get bullets() { return eBullets; },
    // testing hooks: advance and draw frames even when requestAnimationFrame is paused
    step(dt = STEP) { update(dt); }, renderNow() { render(); },
    world: () => ({ W, H })
  };
})();

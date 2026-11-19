/* ==========================================================================
   BREEZY ISLE — world engine
   Side view in "world units": the screen is always 760 units tall, so the
   scale is H / 760 and wider screens simply see more of the beach.
   Layers (back → front): sky, sun/moon, clouds, sea, hills, far trees,
   the main ground plane with everything you can use, then front leaves.
   ========================================================================== */
window.Game = (() => {
  const C = window.GAME_CONFIG, A = window.Art;
  const cv = document.getElementById("view"), ctx = cv.getContext("2d");
  const VH = 760, FEET = 582, SAND_TOP = 545, SAND_BOT = 625, TAU = Math.PI * 2;

  /* ---------- helpers ---------- */
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const hex = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const mixC = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const rgb = (c, al = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${al})`;
  const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const pickW = (list, wf) => { const ws = list.map(wf), tot = ws.reduce((a, b) => a + b, 0); let r = Math.random() * tot; for (let i = 0; i < list.length; i++) { r -= ws[i]; if (r <= 0) return list[i]; } return list[list.length - 1]; };

  /* ---------- canvas ---------- */
  let W = 1, H = 1, DPR = 1, s = 1, viewW = 400;
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, innerWidth); H = Math.max(1, innerHeight);
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); cv.style.width = W + "px"; cv.style.height = H + "px";
    s = H / VH; viewW = W / s;
  }
  addEventListener("resize", resize);

  /* ---------- state ---------- */
  const Store = window.Store, S = () => Store.S;
  const on = {};                 // UI hooks
  let area = null, AREA = {}, objs = [], digs = [], bugs = [], drops = [], parts = [], floats = [], prints = [], fade = 0, fadeTo = null;
  let rtime = 0, mode = "play", paused = false, fishing = null;
  const cam = { x: 0 };
  const player = { x: 420, tx: 420, dir: 1, walk: 0, t: 0, goal: null, act: null, actT: 0, arm: 0, mood: "", moodT: 0, blink: 0, lastPrint: 0 };
  const ME = { body: "#c9946a", belly: "#f6e1cf", ears: "round", animal: "bear" };
  const KEEPER = { body: "#ffb3c7", belly: "#ffe1ea", ears: "round", animal: "pig" };

  const night = () => { const c = S().clock; return smooth(0.74, 0.84, c) + (1 - smooth(0.14, 0.24, c)); };
  const isNight = () => night() > 0.5;
  const timeOk = it => !it.time || it.time === "any" || (it.time === "night") === isNight();

  /* ---------- building a beach ---------- */
  function enterArea(id, x) {
    const idx = Math.max(0, C.areas.findIndex(a => a.id === id));
    area = C.areas[idx]; S().area = area.id;
    if (!AREA[area.id]) AREA[area.id] = build(area, idx);
    ({ objs, digs, bugs } = AREA[area.id]);
    drops = []; parts = []; floats = []; prints = [];
    player.x = player.tx = clamp(x ?? S().x ?? 400, 120, area.width - 230); player.goal = null; player.act = null;
    cam.x = clamp(player.x - viewW * 0.45, 0, Math.max(0, area.width - viewW));
    on.area && on.area(area);
  }
  function build(ar, idx) {
    const r = mulberry(idx * 1000 + 7), o = [], shore = ar.width - 560;
    const pal = { grass: ar.grass, grass2: ar.grass2 };
    const truckX = idx === 0 ? 1020 : 560;
    o.push({ type: "truck", x: truckX, y: 548 });
    if (idx === 0) for (let i = 0; i < C.campSlots; i++) o.push({ type: "slot", i, x: 150 + i * 95, y: 538 + (i % 2) * 6 });
    const fx = idx === 0 ? [1380, 1660, 1920] : [1050, 1520, 1900];
    ar.friends.forEach((fid, i) => o.push({ type: "npc", fid, x: fx[i], home: fx[i], y: FEET - 2, dir: -1, t: r() * 9, walkT: 0, tx: fx[i], wait: 2 + r() * 3 }));
    o.push({ type: "fish", x: ar.width - 235, y: FEET });
    o.push({ type: "sign", x: 70, y: 540 });
    // fruit trees, spread out behind the path
    const nT = Math.floor((shore - 300) / 330);
    for (let i = 0; i < nT; i++) {
      const tx = 260 + i * 330 + r() * 110;
      if (idx === 0 && tx < 720) continue;
      o.push({ type: "tree", x: tx, y: 520 + r() * 8, h: 220 + r() * 70, lean: r() < 0.5 ? -1 : 1, seed: r() * 9, fruit: ar.fruit[i % ar.fruit.length], n: 3, regrowAt: 0, sway: 0, swayV: 0, crown: { x: 0, y: -200 } });
    }
    // flower patches for bugs
    const flowers = [];
    for (let i = 0; i < 6; i++) flowers.push(300 + r() * (shore - 500));
    const st = { objs: o, digs: [], bugs: [], flowers, shore, pal, nextDig: 0, nextBug: 0 };
    for (let i = 0; i < 3; i++) st.digs.push(newDig(ar, st));
    return st;
  }
  function newDig(ar, st) { return { x: 220 + Math.random() * (st.shore - 420), y: 592 + Math.random() * 14, t: Math.random() * 9 }; }
  function newBug(ar, st) {
    const list = ar.bugs.filter(id => timeOk(C.items[id])); if (!list.length) return null;
    const id = pickW(list, b => 1 / C.items[b].speed);
    const ax = st.flowers[Math.floor(Math.random() * st.flowers.length)];
    return { id, ax, ay: 470 + Math.random() * 50, x: ax, y: 480, t: Math.random() * 9, ph: Math.random() * 6, flee: 0, born: 0 };
  }

  /* ---------- input ---------- */
  const toWorld = (sx, sy) => ({ x: cam.x + sx / s, y: sy / s });
  let holding = false, holdId = null;
  function hitTest(w) {
    let best = null, bd = 1e9;
    const consider = (o, kind, d) => { if (d < bd) { bd = d; best = { o, kind }; } };
    for (const b of bugs) { const d = Math.hypot(w.x - b.x, w.y - b.y); if (d < 55) consider(b, "bug", d * 0.5); }
    for (const d of digs) { const dd = Math.hypot(w.x - d.x, (w.y - d.y) * 1.5); if (dd < 55) consider(d, "dig", dd * 0.7); }
    for (const o of objs) {
      let d = 1e9;
      if (o.type === "npc" && Math.abs(w.x - o.x) < 42 && w.y > o.y - 150 && w.y < o.y + 15) d = Math.abs(w.x - o.x);
      if (o.type === "slot" && Math.abs(w.x - o.x) < 46 && w.y > 430 && w.y < 560) d = Math.abs(w.x - o.x) + 10;
      if (o.type === "truck" && Math.abs(w.x - o.x) < 115 && w.y > 400 && w.y < 560) d = 40 + Math.abs(w.x - o.x) * 0.3;
      if (o.type === "fish" && w.x > o.x - 120 && w.y > 470) d = 30;
      if (o.type === "tree") { const cx = o.x + o.crown.x, cy = o.y + o.crown.y; if (Math.hypot(w.x - cx, w.y - cy) < 100 || (Math.abs(w.x - o.x) < 26 && w.y < o.y && w.y > o.y - o.h)) d = 60 + Math.hypot(w.x - cx, w.y - cy) * 0.3; }
      if (o.type === "sign" && Math.abs(w.x - o.x) < 40 && w.y > 470 && w.y < 560) d = 20;
      if (d < 1e9) consider(o, o.type, d);
    }
    return best;
  }
  function standX(target) {
    const { o, kind } = target;
    switch (kind) {
      case "tree": return o.x + 34;
      case "dig": return o.x - 34;
      case "bug": return o.ax + (player.x < o.ax ? -50 : 50);
      case "npc": return o.x + (player.x < o.x ? -64 : 64);
      case "truck": return o.x - 30;
      case "slot": return o.x + 50;
      case "fish": return area.width - 235;
      case "sign": return o.x + 50;
    }
    return o.x;
  }
  cv.addEventListener("pointerdown", e => {
    if (paused || mode === "menu") return;
    Sound.unlock();
    if (mode === "fish") { fishPress(true); holdId = e.pointerId; try { cv.setPointerCapture(e.pointerId); } catch (er) {} return; }
    const w = toWorld(e.clientX, e.clientY), hit = hitTest(w);
    if (hit) { player.goal = hit; player.tx = clamp(standX(hit), 110, area.width - 230); holding = false; }
    else { player.goal = null; player.tx = clamp(w.x, 110, area.width - 230); holding = true; holdId = e.pointerId; try { cv.setPointerCapture(e.pointerId); } catch (er) {} }
  });
  cv.addEventListener("pointermove", e => { if (holding && e.pointerId === holdId && mode === "play") player.tx = clamp(toWorld(e.clientX, e.clientY).x, 110, area.width - 230); });
  const up = e => { if (e.pointerId !== holdId) return; holding = false; if (mode === "fish") fishPress(false); };
  cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
  const keys = {};
  addEventListener("keydown", e => {
    if (paused || mode === "menu") return;
    keys[e.key] = true;
    if (e.key === " " || e.key === "e" || e.key === "Enter") {
      if (mode === "fish") { fishPress(true); return; }
      const n = nearest(); if (n) { player.goal = n; player.tx = clamp(standX(n), 110, area.width - 230); }
    }
  });
  addEventListener("keyup", e => { keys[e.key] = false; if ((e.key === " " || e.key === "e" || e.key === "Enter") && mode === "fish") fishPress(false); });
  function nearest() {
    let best = null, bd = 170;
    const c = (o, kind, x) => { const d = Math.abs(player.x - x); if (d < bd) { bd = d; best = { o, kind }; } };
    for (const o of objs) if (o.type !== "sign") c(o, o.type, o.type === "fish" ? area.width - 235 : o.x);
    for (const d of digs) c(d, "dig", d.x); for (const b of bugs) c(b, "bug", b.ax);
    return best;
  }

  /* ---------- actions ---------- */
  function busy() { return !!player.act; }
  function startAction(goal) {
    const { o, kind } = goal;
    player.dir = (kind === "tree" || kind === "slot" || kind === "sign") ? -1 : kind === "truck" ? 1 : Math.sign((o.ax ?? o.x) - player.x) || 1;
    if (kind === "fish") player.dir = 1;
    switch (kind) {
      case "tree":
        if (o.n <= 0) { floatText(o.x + o.crown.x, o.y + o.crown.y, "Growing…", "#fff"); return; }
        if (Store.bagUsed() >= Store.bagCap()) { bagFull(); return; }
        player.act = { kind, o, t: 0, dur: 0.6 }; o.swayV += 0.9; Sound.play("shake"); break;
      case "dig":
        if (Store.bagUsed() >= Store.bagCap()) { bagFull(); return; }
        player.act = { kind, o, t: 0, dur: 0.75 }; Sound.play("dig"); break;
      case "bug":
        if (Store.bagUsed() >= Store.bagCap()) { bagFull(); return; }
        player.act = { kind, o, t: 0, dur: 0.45 }; Sound.play("swish"); break;
      case "npc": o.dir = player.x < o.x ? -1 : 1; o.talkT = 2; Sound.play("talk"); on.talk && on.talk(o.fid); break;
      case "truck": Sound.play("tap"); on.shop && on.shop(); break;
      case "slot": Sound.play("tap"); on.camp && on.camp(o.i); break;
      case "sign": on.map && on.map(); break;
      case "fish": if (Store.bagUsed() >= Store.bagCap()) { bagFull(); return; } startFishing(); break;
    }
  }
  function bagFull() { Sound.play("full"); on.toast && on.toast("Your basket is full. Sell at the snack truck!"); }
  function finishAction(a) {
    const o = a.o;
    if (a.kind === "tree") {
      const c = { x: o.x + o.crown.x, y: o.y + o.crown.y };
      for (let i = 0; i < o.n; i++) drops.push({ id: o.fruit, x: c.x + (i - 1) * 22, y: c.y + 10, vx: (Math.random() - 0.5) * 120 + (i - 1) * 40, vy: -60 - Math.random() * 60, ground: FEET - 6 + Math.random() * 10, landed: 0, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 8 });
      o.n = 0; o.regrowAt = rtime + C.regrow.tree; Sound.play("drop");
    }
    if (a.kind === "dig") {
      const sh = S().tools.shovel;
      const id = pickW(area.shells, x => { const r = C.items[x].rarity || 1; return [0, 50, 28, 12, 3][r] * (r >= 3 ? 1 + sh * 0.45 : 1); });
      drops.push({ id, x: o.x, y: o.y - 10, vx: -30, vy: -320, ground: FEET - 4, landed: 0, rot: 0, vr: 6, pop: true });
      for (let i = 0; i < 14; i++) parts.push({ x: o.x, y: o.y, vx: (Math.random() - 0.5) * 220, vy: -120 - Math.random() * 200, life: 0, max: 0.7, c: hex(area.sand), r: 3 + Math.random() * 3, g: 600 });
      const st = AREA[area.id]; st.digs.splice(st.digs.indexOf(o), 1); st.nextDig = rtime + C.regrow.dig / 3;
      Sound.play("find", C.items[id].rarity);
    }
    if (a.kind === "bug") {
      const it = C.items[o.id], net = S().tools.net, d = Math.hypot(o.x - (player.x + player.dir * 40), o.y - (FEET - 60));
      const chance = clamp(0.97 - (it.speed - 1) * 0.42 + net * 0.12, 0.3, 0.98);
      if (d < 150 && Math.random() < chance) {
        drops.push({ id: o.id, x: o.x, y: o.y, vx: 0, vy: 0, ground: o.y, landed: 0.3, rot: 0, vr: 0, fly: true });
        AREA[area.id].bugs.splice(bugs.indexOf(o), 1); AREA[area.id].nextBug = rtime + C.regrow.bug / 2; Sound.play("catchBug");
      } else { o.flee = 1; floatText(o.x, o.y - 20, "Missed!", "#fff"); Sound.play("miss"); }
    }
  }
  function collect(d) {
    const got = Store.add(d.id, 1);
    if (!got) { bagFull(); return; }
    const isNew = Store.discover(d.id), it = C.items[d.id];
    const st = S().stats; st[it.kind === "fruit" ? "fruit" : it.kind === "shell" ? "digs" : it.kind === "bug" ? "bugs" : "fish"]++;
    Sound.play("pick");
    floatText(player.x, FEET - 120, "+1 " + it.name, "#fff", d.id);
    for (let i = 0; i < 8; i++) parts.push({ x: player.x, y: FEET - 60, vx: (Math.random() - 0.5) * 160, vy: -100 - Math.random() * 120, life: 0, max: 0.6, c: [255, 240, 160], r: 2.5, g: 300, star: true });
    on.got && on.got(d.id, isNew);
  }
  function floatText(x, y, text, color, icon) { floats.push({ x, y, text, color, icon, t: 0 }); }

  /* ---------- fishing ---------- */
  function startFishing() {
    mode = "fish"; player.dir = 1;
    fishing = { phase: "cast", t: 0, bx: area.width - 235 + 190, by: 660, biteAt: 1.6 + Math.random() * 3, id: null, zone: 0.2, zv: 0, fy: 0.5, fv: 0, ft: 0.5, nextT: 0, prog: 0.3, hold: false, msg: "", msgT: 0 };
    Sound.play("cast"); on.fishing && on.fishing(true);
  }
  function stopFishing() { mode = "play"; fishing = null; on.fishing && on.fishing(false); }
  function fishPress(down) {
    const f = fishing; if (!f) return;
    f.hold = down;
    if (down && f.phase === "wait") { f.phase = "wait"; f.biteAt = f.t + 1.2 + Math.random() * 2; floatText(f.bx, f.by - 40, "Too early!", "#fff"); Sound.play("miss"); }
    else if (down && f.phase === "bite") {
      const list = area.fish.filter(id => timeOk(C.items[id])), rod = S().tools.rod;
      f.id = pickW(list, id => [0, 40, 32, 20, 10, 2][C.items[id].difficulty] * (C.items[id].difficulty >= 3 ? 1 + rod * 0.3 : 1));
      f.phase = "reel"; f.t = 0; f.prog = 0.3; f.zone = 0.35; f.zv = 0; f.fy = 0.5; f.ft = 0.5; f.nextT = 0; Sound.play("reel");
    }
  }
  function updateFishing(dt) {
    const f = fishing; f.t += dt; f.msgT -= dt;
    if (f.phase === "cast" && f.t > 0.6) { f.phase = "wait"; f.t = 0; }
    else if (f.phase === "wait") {
      if (Math.random() < dt * 0.8) parts.push({ x: f.bx + (Math.random() - 0.5) * 30, y: f.by + 4, vx: 0, vy: 0, life: 0, max: 1, ring: true, c: [255, 255, 255], r: 4 });
      if (f.t > f.biteAt) { f.phase = "bite"; f.t = 0; Sound.play("bite"); }
    } else if (f.phase === "bite") {
      if (f.t > 0.95) { f.phase = "wait"; f.t = 0; f.biteAt = 1.4 + Math.random() * 2.5; floatText(f.bx, f.by - 40, "It got away…", "#fff"); Sound.play("lost"); }
    } else if (f.phase === "reel") {
      const it = C.items[f.id], d = it.difficulty, rod = S().tools.rod;
      const zh = clamp(0.3 + rod * 0.05 - (d - 1) * 0.025, 0.18, 0.45);
      // the fish darts to new targets; harder fish move more often and further
      f.nextT -= dt;
      if (f.nextT <= 0) { f.ft = clamp(f.fy + (Math.random() - 0.5) * (0.4 + d * 0.15), 0.04, 0.96); f.nextT = (1.3 - d * 0.18) * (0.5 + Math.random()); }
      f.fv += ((f.ft - f.fy) * (6 + d * 3) - f.fv * (3.5 - d * 0.25)) * dt; f.fy = clamp(f.fy + f.fv * dt, 0.03, 0.97);
      f.zv += (f.hold ? 2.6 : -2.2) * dt; f.zv *= 0.985; f.zone += f.zv * dt;
      if (f.zone < 0) { f.zone = 0; f.zv = Math.max(0, f.zv) * -0.3; } if (f.zone > 1 - zh) { f.zone = 1 - zh; f.zv = Math.min(0, f.zv) * -0.3; }
      const inside = f.fy >= f.zone && f.fy <= f.zone + zh;
      f.prog = clamp(f.prog + (inside ? 0.32 : -0.22 - d * 0.02) * dt, 0, 1);
      f.inside = inside; f.zh = zh;
      if (inside && Math.random() < dt * 14) Sound.play("reel");
      if (f.prog >= 1) {
        f.phase = "caught"; f.t = 0; Sound.play("catchFish");
        drops.push({ id: f.id, x: f.bx, y: f.by - 20, vx: -280, vy: -380, ground: FEET - 6, landed: 0, rot: 0, vr: 5, pop: true });
        for (let i = 0; i < 20; i++) parts.push({ x: f.bx, y: f.by, vx: (Math.random() - 0.5) * 260, vy: -150 - Math.random() * 250, life: 0, max: 0.8, c: [200, 240, 255], r: 3, g: 500 });
        on.caught && on.caught(f.id);
      } else if (f.prog <= 0) { f.phase = "lost"; f.t = 0; Sound.play("lost"); floatText(f.bx, f.by - 40, "It slipped away!", "#fff"); }
    } else if ((f.phase === "caught" && f.t > 1.1) || (f.phase === "lost" && f.t > 1.0)) {
      // keep fishing: throw the line again
      f.phase = "cast"; f.t = 0; f.biteAt = 1.6 + Math.random() * 3; Sound.play("cast");
      if (Store.bagUsed() >= Store.bagCap()) { stopFishing(); bagFull(); }
    }
  }

  /* ---------- update ---------- */
  function update(dt) {
    rtime += dt;
    if (paused) return;
    const St = S();
    St.clock = (St.clock + dt / C.dayLength) % 1;
    Sound.setNight(isNight());
    // fade between beaches
    if (fadeTo) { fade = Math.min(1, fade + dt * 3); if (fade >= 1) { enterArea(fadeTo.id, fadeTo.x); fadeTo = null; } }
    else fade = Math.max(0, fade - dt * 2.5);

    // walking
    if (mode === "play" && !busy()) {
      const k = (keys.ArrowRight || keys.d ? 1 : 0) - (keys.ArrowLeft || keys.a ? 1 : 0);
      if (k) { player.tx = clamp(player.x + k * 60, 110, area.width - 230); player.goal = null; }
      const dx = player.tx - player.x;
      if (Math.abs(dx) > 2) {
        const step = Math.sign(dx) * Math.min(Math.abs(dx), C.walkSpeed * dt);
        player.x += step; player.dir = Math.sign(dx); player.walk = 1; player.t += dt;
        if (Math.abs(player.x - player.lastPrint) > 34 && player.x < area.width - 560) {
          player.lastPrint = player.x; prints.push({ x: player.x, y: FEET + 4 + (prints.length % 2 ? 5 : -5), t: 0, d: player.dir });
          if (prints.length % 2) Sound.play("step");
          if (Math.random() < 0.4) parts.push({ x: player.x - player.dir * 14, y: FEET, vx: -player.dir * 30, vy: -30, life: 0, max: 0.5, c: hex(area.sand), r: 4, g: 0, dust: true });
        }
      } else {
        player.walk = 0; player.t += dt * 0.4;
        if (player.goal) { const g = player.goal; player.goal = null; startAction(g); }
      }
    } else { player.walk = 0; player.t += dt * 0.4; }
    if (player.act) {
      const a = player.act; a.t += dt;
      player.arm = a.kind === "tree" ? -1.6 + Math.sin(a.t * 30) * 0.5 : a.kind === "dig" ? -0.4 + Math.sin(a.t * 22) * 0.9 : -2 + a.t / a.dur * 3;
      if (a.kind === "dig" && Math.random() < dt * 20) parts.push({ x: a.o.x, y: a.o.y, vx: (Math.random() - 0.5) * 160, vy: -80 - Math.random() * 120, life: 0, max: 0.5, c: hex(area.sand), r: 3, g: 600 });
      if (a.t >= a.dur * (a.kind === "bug" ? 0.5 : 1) && !a.done) { a.done = true; finishAction(a); }
      if (a.t >= a.dur) { player.act = null; player.arm = 0; }
    } else player.arm *= 0.8;
    if (mode === "fish") { player.arm = fishing && fishing.phase === "reel" ? -1.2 + Math.sin(rtime * 20) * 0.15 : -1; updateFishing(dt); }
    player.blink -= dt; if (player.blink < -3 - Math.random() * 3) player.blink = 0.12;
    if (player.moodT > 0) { player.moodT -= dt; if (player.moodT <= 0) player.mood = ""; }

    // camera
    const target = clamp(player.x - viewW * (mode === "fish" ? 0.3 : 0.45), 0, Math.max(0, area.width - viewW));
    cam.x += (target - cam.x) * Math.min(1, dt * 5);
    if (area.width < viewW) cam.x = (area.width - viewW) / 2;

    // world things
    const st = AREA[area.id];
    for (const o of objs) {
      if (o.type === "tree") {
        o.swayV += (-o.sway * 40 - o.swayV * 4) * dt; o.sway += o.swayV * dt;
        if (o.n < 3 && o.regrowAt && rtime >= o.regrowAt) { o.n = 3; o.regrowAt = 0; }
      }
      if (o.type === "npc") {
        o.t += dt; o.talkT = Math.max(0, (o.talkT || 0) - dt);
        if (o.talkT > 0) { o.walkT = 0; continue; }
        const near = Math.abs(player.x - o.x) < 140;
        if (near) { o.dir = player.x < o.x ? -1 : 1; o.walkT = 0; continue; }
        o.wait -= dt;
        if (o.wait <= 0) { o.tx = o.home + (Math.random() - 0.5) * 160; o.wait = 3 + Math.random() * 4; }
        const dx = o.tx - o.x;
        if (Math.abs(dx) > 2) { o.x += Math.sign(dx) * Math.min(Math.abs(dx), 55 * dt); o.dir = Math.sign(dx); o.walkT = 1; } else o.walkT = 0;
      }
    }
    if (st.digs.length < 3 && rtime > st.nextDig) { st.digs.push(newDig(area, st)); st.nextDig = rtime + C.regrow.dig / 3; }
    st.bugs = st.bugs.filter(b => (timeOk(C.items[b.id]) || b.flee > 0) && !(b.flee > 0 && b.y < 150));
    bugs = st.bugs;
    if (st.bugs.length < 3 && rtime > st.nextBug) { const b = newBug(area, st); if (b) st.bugs.push(b); st.nextBug = rtime + 2.5; bugs = st.bugs; }
    for (const b of bugs) {
      b.t += dt; b.born = Math.min(1, b.born + dt);
      const sp = C.items[b.id].speed;
      if (b.flee > 0) { b.x += 260 * dt * (b.x > player.x ? 1 : -1); b.y -= 200 * dt; continue; }
      const tx = b.ax + Math.sin(b.t * 0.9 * sp + b.ph) * 46 + Math.sin(b.t * 2.1 * sp) * 14;
      const ty = b.ay + Math.sin(b.t * 1.4 * sp + b.ph * 2) * 26;
      b.x += (tx - b.x) * Math.min(1, dt * 3); b.y += (ty - b.y) * Math.min(1, dt * 3);
    }
    for (const d of digs) d.t += dt;
    // drops: bounce, then fly into the basket
    for (const d of drops) {
      if (d.fly || d.landed > 0.35) {
        d.fly = true; d.ft = (d.ft || 0) + dt * 2.6;
        const tx = player.x, ty = FEET - 50;
        d.x = lerp(d.x, tx, Math.min(1, d.ft * 0.5)); d.y = lerp(d.y, ty, Math.min(1, d.ft * 0.5)) - Math.sin(Math.min(1, d.ft) * Math.PI) * 6;
        if (d.ft >= 1.2 || Math.hypot(d.x - tx, d.y - ty) < 12) { d.dead = true; collect(d); }
        continue;
      }
      d.vy += 900 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.rot += d.vr * dt;
      if (d.y >= d.ground) { d.y = d.ground; if (Math.abs(d.vy) > 120) { d.vy *= -0.4; d.vx *= 0.6; } else { d.vy = 0; d.vx *= 0.8; d.landed += dt; } }
    }
    drops = drops.filter(d => !d.dead);
    for (const p of parts) { p.life += dt; p.vy += (p.g || 0) * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    parts = parts.filter(p => p.life < p.max);
    floats.forEach(f => { f.t += dt; f.y -= dt * 34; }); floats = floats.filter(f => f.t < 1.6);
    prints.forEach(p => p.t += dt); prints = prints.filter(p => p.t < 6);
    if (Math.random() < dt) St.x = player.x, Store.save();
  }

  /* ---------- palette for the time of day ---------- */
  function sky() {
    const c = S().clock, n = night();
    const dusk = Math.max(Math.exp(-((c - 0.76) ** 2) / 0.0012), Math.exp(-((c - 0.22) ** 2) / 0.0012)) * (1 - n * 0.6);
    const top = mixC(mixC(hex(area.sky[0]), hex("#ff8fa3"), dusk * 0.8), hex("#101746"), n);
    const bot = mixC(mixC(hex(area.sky[1]), hex("#ffc58a"), dusk), hex("#3a2f7a"), n);
    return { top, bot, n, dusk, sea: mixC(mixC(hex(area.sea), hex("#ff9a8a"), dusk * 0.35), hex("#16245e"), n * 0.85) };
  }

  /* ---------- render ---------- */
  function setLayer(f) { ctx.setTransform(DPR * s, 0, 0, DPR * s, -cam.x * f * DPR * s, 0); }
  function render() {
    const P = sky(), st = AREA[area.id];
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    // sky
    const g = ctx.createLinearGradient(0, 0, 0, 440 * s); g.addColorStop(0, rgb(P.top)); g.addColorStop(1, rgb(P.bot));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.setTransform(DPR * s, 0, 0, DPR * s, 0, 0);
    // stars
    if (P.n > 0.02) for (let i = 0; i < 70; i++) { const x = hash(i) * viewW, y = hash(i + 99) * 300, tw = 0.5 + 0.5 * Math.sin(rtime * 2 + i); ctx.fillStyle = `rgba(255,255,255,${P.n * (0.3 + tw * 0.6)})`; ctx.fillRect(x, y, 2, 2); }
    // sun & moon travel across the sky
    const c = S().clock, su = (c - 0.2) / 0.6, mu = ((c + 0.5) % 1 - 0.2) / 0.6;
    const body = (u, r, col, glow) => { if (u < -0.1 || u > 1.1) return; const x = viewW * (0.1 + u * 0.8), y = 330 - Math.sin(clamp(u, 0, 1) * Math.PI) * 230; const gl = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 4); gl.addColorStop(0, glow); gl.addColorStop(1, "rgba(255,255,255,0)"); ctx.fillStyle = gl; ctx.fillRect(x - r * 4, y - r * 4, r * 8, r * 8); A.circle(ctx, x, y, r, col); return { x, y }; };
    body(su, 34, "#fff6c2", "rgba(255,240,170,0.6)");
    const m = body(mu, 24, "#f2f0ff", "rgba(200,210,255,0.45)"); if (m) { A.circle(ctx, m.x - 8, m.y - 6, 5, "rgba(190,190,230,0.6)"); A.circle(ctx, m.x + 7, m.y + 6, 3.5, "rgba(190,190,230,0.6)"); }
    // clouds (slow parallax + drift)
    for (let i = 0; i < 7; i++) {
      const span = viewW + 400, x = ((hash(i) * 3000 + rtime * (6 + i * 1.5) - cam.x * 0.06) % span + span) % span - 200, y = 60 + hash(i + 7) * 180, k = 0.6 + hash(i + 3) * 0.8;
      ctx.fillStyle = rgb(mixC([255, 255, 255], P.bot, 0.25 + P.n * 0.5), 0.85 - P.n * 0.4);
      [[0, 0, 40], [38, 8, 30], [-36, 10, 28], [10, -18, 30]].forEach(([dx, dy, r]) => { ctx.beginPath(); ctx.arc(x + dx * k, y + dy * k, r * k, 0, TAU); ctx.fill(); });
    }
    // sea
    ctx.fillStyle = rgb(P.sea); ctx.fillRect(0, 330, viewW, 440);
    const sg = ctx.createLinearGradient(0, 330, 0, 440); sg.addColorStop(0, rgb(mixC(P.sea, [255, 255, 255], 0.35))); sg.addColorStop(1, rgb(P.sea, 0)); ctx.fillStyle = sg; ctx.fillRect(0, 330, viewW, 110);
    ctx.fillStyle = `rgba(255,255,255,${0.35 - P.n * 0.15})`;
    for (let i = 0; i < 26; i++) { const x = ((hash(i) * 2000 - cam.x * 0.1 + Math.sin(rtime + i) * 10) % (viewW + 40) + viewW + 40) % (viewW + 40) - 20, y = 345 + hash(i + 50) * 90; ctx.fillRect(x, y, 16 + hash(i + 3) * 26, 2); }
    // distant islands
    setLayer(0.12);
    for (let i = -1; i < 4; i++) { const x = i * 900 + 300 + hash(i + 40) * 300; if (x < cam.x * 0.12 - 300 || x > cam.x * 0.12 + viewW + 300) continue; ctx.fillStyle = rgb(mixC(hex(area.hills), P.sea, 0.55)); ctx.beginPath(); ctx.ellipse(x, 336, 120 + hash(i) * 80, 22, 0, Math.PI, TAU); ctx.fill(); }
    // hills
    drawHills(0.25, 420, 38, mixC(mixC(hex(area.hills), P.bot, 0.35), [20, 20, 70], P.n * 0.5), 1);
    drawHills(0.42, 455, 30, mixC(hex(area.hills), [20, 20, 70], P.n * 0.5), 2);
    // far tree line
    setLayer(0.62);
    ctx.globalAlpha = 0.55;
    for (let i = Math.floor(cam.x * 0.62 / 150) - 1; i < (cam.x * 0.62 + viewW) / 150 + 1; i++) {
      if (hash(i * 3.3) < 0.35) continue;
      ctx.save(); ctx.translate(i * 150 + hash(i) * 80, 492); ctx.scale(0.42, 0.42);
      A.tree(ctx, area.tree, { t: rtime, h: 240, seed: i, pal: { grass: rgb(mixC(hex(area.grass2), P.bot, 0.3)), grass2: rgb(mixC(hex(area.grass2), P.bot, 0.45)) } });
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    // main plane
    setLayer(1);
    drawGround(P, st);
    // sort objects by depth (y)
    const list = [];
    const x0 = cam.x - 200, x1 = cam.x + viewW + 200;
    for (const o of objs) if (o.x > x0 - 150 && o.x < x1 + 150) list.push(o);
    list.push({ type: "player", y: FEET, x: player.x });
    list.sort((a, b) => a.y - b.y);
    for (const o of list) drawObj(o, P);
    for (const d of drops) { ctx.save(); ctx.translate(d.x, d.y - 14); ctx.rotate(d.fly ? 0 : d.rot * 0.2); A.item(ctx, d.id, 0, 0, d.pop && !d.landed ? 46 : 34, rtime); ctx.restore(); }
    for (const b of bugs) { ctx.save(); ctx.translate(b.x, b.y); ctx.scale(0.75 * b.born, 0.75 * b.born); ctx.rotate(Math.sin(b.t * 3) * 0.2); A.item(ctx, b.id, 0, 0, 40, b.t); ctx.restore(); }
    if (mode === "fish" && fishing) drawFishingWorld();
    for (const p of parts) {
      const k = 1 - p.life / p.max;
      if (p.ring) { ctx.strokeStyle = `rgba(255,255,255,${k * 0.7})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(p.x, p.y, 6 + (1 - k) * 26, 2 + (1 - k) * 7, 0, 0, TAU); ctx.stroke(); continue; }
      if (p.star) { ctx.fillStyle = rgb(p.c, k); A.star(ctx, p.x, p.y, 4, p.r * 2.2, p.r * 0.8, rgb(p.c, k)); continue; }
      ctx.fillStyle = rgb(p.c, k * (p.dust ? 0.5 : 0.9)); ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (p.dust ? 1 + (1 - k) * 2 : 1), 0, TAU); ctx.fill();
    }
    // front leaves
    setLayer(1.3);
    for (let i = Math.floor(cam.x * 1.3 / 260) - 1; i < (cam.x * 1.3 + viewW) / 260 + 1; i++) {
      if (hash(i * 7.7) < 0.45) continue;
      const x = i * 260 + hash(i) * 120, sw = Math.sin(rtime * 1.2 + i) * 0.06;
      ctx.save(); ctx.translate(x, VH + 20); ctx.rotate(sw);
      ctx.fillStyle = rgb(mixC(hex(area.grass2), [10, 30, 30], 0.35 + P.n * 0.3));
      for (let k = 0; k < 4; k++) { ctx.save(); ctx.rotate(-0.9 + k * 0.55); ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(26, -60, 0, -120 - hash(i + k) * 40); ctx.quadraticCurveTo(-26, -60, 0, 0); ctx.fill(); ctx.restore(); }
      ctx.restore();
    }
    // night: darken, then add lights
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (P.n > 0.01) { ctx.globalCompositeOperation = "multiply"; ctx.fillStyle = rgb(mixC([255, 255, 255], [105, 105, 175], P.n)); ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = "source-over"; }
    if (P.dusk > 0.05) { ctx.fillStyle = `rgba(255,140,90,${P.dusk * 0.12})`; ctx.fillRect(0, 0, W, H); }
    setLayer(1);
    if (P.n > 0.05) drawNightLights(P);
    // prompts, floating text
    drawPrompts();
    for (const f of floats) {
      const a = f.t < 1.1 ? 1 : 1 - (f.t - 1.1) / 0.5;
      ctx.globalAlpha = clamp(a, 0, 1); ctx.font = "800 18px " + FONT; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.lineWidth = 5; ctx.strokeStyle = "rgba(59,42,74,0.75)"; ctx.strokeText(f.text, f.x, f.y); ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y);
      ctx.globalAlpha = 1;
    }
    if (mode === "fish" && fishing) drawFishingHud();
    if (fade > 0) { ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.fillStyle = `rgba(255,248,235,${fade})`; ctx.fillRect(0, 0, W, H); }
  }
  const FONT = '"Baloo 2","Nunito","Arial Rounded MT Bold","Trebuchet MS",system-ui,sans-serif';
  function drawHills(f, base, amp, col, seed) {
    setLayer(f);
    const x0 = cam.x * f - 40, x1 = cam.x * f + viewW + 40;
    ctx.fillStyle = rgb(col); ctx.beginPath(); ctx.moveTo(x0, 560);
    for (let x = x0; x <= x1; x += 16) ctx.lineTo(x, base - amp * (0.6 * Math.sin(x * 0.006 + seed) + 0.4 * Math.sin(x * 0.017 + seed * 3)) - amp);
    ctx.lineTo(x1, 560); ctx.closePath(); ctx.fill();
  }
  function drawGround(P, st) {
    const x0 = cam.x - 20, x1 = cam.x + viewW + 20, shore = st.shore, nk = mixC([255, 255, 255], [20, 20, 60], 0);
    const g1 = hex(area.grass), g2 = hex(area.grass2), sand = hex(area.sand);
    const landEnd = Math.min(x1, shore + 60);
    if (x0 < landEnd) {
      // back grass
      ctx.fillStyle = rgb(g2); ctx.beginPath(); ctx.moveTo(x0, 600);
      for (let x = x0; x <= landEnd; x += 12) ctx.lineTo(x, 478 + Math.sin(x * 0.02) * 5 + Math.sin(x * 0.051) * 3);
      ctx.lineTo(landEnd, 600); ctx.fill();
      ctx.fillStyle = rgb(g1); ctx.beginPath(); ctx.moveTo(x0, 600);
      for (let x = x0; x <= landEnd; x += 12) ctx.lineTo(x, 490 + Math.sin(x * 0.02) * 5 + Math.sin(x * 0.051) * 3);
      ctx.lineTo(landEnd, 600); ctx.fill();
      // sand path with soft edges
      ctx.fillStyle = rgb(mixC(sand, [255, 255, 255], 0.25));
      ctx.beginPath(); ctx.moveTo(x0, SAND_TOP);
      for (let x = x0; x <= landEnd; x += 12) ctx.lineTo(x, SAND_TOP - 4 + Math.sin(x * 0.013) * 6);
      for (let x = landEnd; x >= x0; x -= 12) ctx.lineTo(x, SAND_BOT + 4 + Math.sin(x * 0.017 + 2) * 7);
      ctx.fill();
      ctx.fillStyle = rgb(sand);
      ctx.beginPath(); ctx.moveTo(x0, SAND_TOP + 4);
      for (let x = x0; x <= landEnd; x += 12) ctx.lineTo(x, SAND_TOP + 2 + Math.sin(x * 0.013) * 6);
      for (let x = landEnd; x >= x0; x -= 12) ctx.lineTo(x, SAND_BOT - 2 + Math.sin(x * 0.017 + 2) * 7);
      ctx.fill();
      ctx.fillStyle = rgb(mixC(sand, [120, 80, 40], 0.18));
      for (let i = Math.floor(x0 / 23); i < landEnd / 23; i++) { const x = i * 23 + hash(i) * 20, y = SAND_TOP + 14 + hash(i + 5) * 66; ctx.fillRect(x, y, 3, 2); }
      // footprints
      for (const p of prints) { ctx.fillStyle = `rgba(150,110,70,${0.22 * (1 - p.t / 6)})`; ctx.beginPath(); ctx.ellipse(p.x, p.y, 6, 3, 0, 0, TAU); ctx.fill(); }
      // front grass
      const fg = ctx.createLinearGradient(0, 620, 0, VH); fg.addColorStop(0, rgb(g1)); fg.addColorStop(1, rgb(g2));
      ctx.fillStyle = fg; ctx.beginPath(); ctx.moveTo(x0, VH);
      for (let x = x0; x <= landEnd; x += 12) ctx.lineTo(x, SAND_BOT + 6 + Math.sin(x * 0.017 + 2) * 7);
      ctx.lineTo(landEnd, VH); ctx.fill();
      // tufts and flowers
      for (let i = Math.floor(x0 / 37); i < landEnd / 37; i++) {
        const h = hash(i * 1.7), x = i * 37 + h * 30;
        if (h < 0.6) { const y = 494 + Math.sin(x * 0.02) * 5; ctx.fillStyle = rgb(mixC(g1, [255, 255, 255], 0.15)); A.tri(ctx, x - 4, y + 6, x, y - 10, x + 3, y + 6, ctx.fillStyle); A.tri(ctx, x + 2, y + 6, x + 8, y - 6, x + 9, y + 6, ctx.fillStyle); }
        if (h > 0.55) { const y = 650 + hash(i + 3) * 90, col = ["#fff", "#ffe066", "#ff8fb1", "#b38cff"][i % 4]; for (let k = 0; k < 5; k++) { const a = k / 5 * TAU; A.circle(ctx, x + Math.cos(a) * 4, y + Math.sin(a) * 4, 3.4, col); } A.circle(ctx, x, y, 2.4, "#ffb347"); }
      }
      for (const fx of st.flowers) if (fx > x0 - 60 && fx < x1 + 60) for (let k = 0; k < 7; k++) { const x = fx - 40 + k * 13, y = 500 + (k % 3) * 8, col = ["#ff8fb1", "#fff", "#ffe066"][k % 3]; ctx.strokeStyle = rgb(g2); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y + 20); ctx.lineTo(x, y); ctx.stroke(); for (let q = 0; q < 5; q++) { const a = q / 5 * TAU + rtime * 0.2; A.circle(ctx, x + Math.cos(a) * 4, y + Math.sin(a) * 4, 3.6, col); } A.circle(ctx, x, y, 2.2, "#ffb347"); }
    }
    // the sea in front of the shore, with the pier
    if (x1 > shore) {
      const sea = P.sea, sx = Math.max(x0, shore);
      const wg = ctx.createLinearGradient(0, 470, 0, VH); wg.addColorStop(0, rgb(mixC(sea, [255, 255, 255], 0.2))); wg.addColorStop(1, rgb(mixC(sea, [10, 30, 80], 0.35)));
      ctx.fillStyle = wg; ctx.beginPath(); ctx.moveTo(shore + 40, 470);
      for (let y = 470; y <= VH; y += 20) ctx.lineTo(shore + 30 + Math.sin(y * 0.05 + rtime * 1.5) * 14 - (y - 470) * 0.15, y);
      ctx.lineTo(x1 + 40, VH); ctx.lineTo(x1 + 40, 440); ctx.lineTo(shore + 40, 440); ctx.fill();
      ctx.fillStyle = rgb(P.sea); ctx.fillRect(Math.max(sx, shore + 40), 430, x1 - Math.max(sx, shore + 40) + 40, 50);
      // foam line along the shore
      ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.lineWidth = 5; ctx.lineCap = "round"; ctx.beginPath();
      for (let y = 480; y <= VH; y += 14) ctx.lineTo(shore + 30 + Math.sin(y * 0.05 + rtime * 1.5) * 14 - (y - 470) * 0.15 + Math.sin(rtime * 2) * 6, y);
      ctx.stroke();
      // ripples
      ctx.strokeStyle = "rgba(255,255,255,0.4)"; ctx.lineWidth = 2;
      for (let i = 0; i < 14; i++) { const x = shore + 90 + hash(i) * 520 + Math.sin(rtime * 0.6 + i) * 12, y = 500 + hash(i + 9) * 240; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 14, y - 5, x + 28, y); ctx.stroke(); }
      // pier
      const p0 = shore - 30, p1 = area.width - 165;
      ctx.fillStyle = "#8a5a3c";
      for (let x = p0 + 40; x < p1; x += 90) { ctx.fillRect(x, FEET, 12, 120); ctx.fillStyle = "rgba(255,255,255,0.3)"; ctx.fillRect(x - 4, FEET + 70 + Math.sin(rtime * 2 + x) * 3, 20, 3); ctx.fillStyle = "#8a5a3c"; }
      ctx.fillStyle = "#c98a5c"; ctx.fillRect(p0, FEET - 6, p1 - p0, 16);
      ctx.fillStyle = "#a8704a"; for (let x = p0; x < p1; x += 26) ctx.fillRect(x, FEET - 6, 2, 16);
      ctx.fillStyle = "#7a4a2c"; ctx.fillRect(p0, FEET + 8, p1 - p0, 5);
    }
    // dig spots: a little mound with a twinkle
    for (const d of digs) {
      if (d.x < x0 - 40 || d.x > x1 + 40) continue;
      A.ell(ctx, d.x, d.y, 22, 7, rgb(mixC(sand, [120, 80, 40], 0.22)));
      A.ell(ctx, d.x, d.y - 2, 16, 5, rgb(mixC(sand, [255, 255, 255], 0.2)));
      const tw = (Math.sin(d.t * 3) + 1) / 2;
      A.star(ctx, d.x + 6, d.y - 10, 4, 5 + tw * 6, 2, `rgba(255,255,255,${0.5 + tw * 0.5})`);
    }
  }
  function drawObj(o, P) {
    ctx.save(); ctx.translate(o.x, o.y);
    switch (o.type) {
      case "tree": {
        const c = A.tree(ctx, area.tree, { t: rtime, h: o.h, seed: o.seed, sway: o.sway * 0.3, lean: o.lean, pal: AREA[area.id].pal });
        o.crown = c;
        for (let i = 0; i < o.n; i++) { ctx.save(); ctx.translate(c.x + (i - 1) * 22, c.y + 6 + (i % 2) * 10); ctx.rotate(Math.sin(rtime * 2 + i) * 0.1); A.item(ctx, o.fruit, 0, 0, 30, rtime); ctx.restore(); }
        if (o.n === 0 && o.regrowAt) { const k = 1 - (o.regrowAt - rtime) / C.regrow.tree; for (let i = 0; i < 3; i++) { ctx.save(); ctx.translate(c.x + (i - 1) * 22, c.y + 6 + (i % 2) * 10); ctx.globalAlpha = 0.5; A.item(ctx, o.fruit, 0, 0, 30 * clamp(k, 0.15, 1), rtime); ctx.restore(); } }
        break;
      }
      case "truck": A.truck(ctx, rtime, P.n > 0.5, KEEPER); break;
      case "slot": {
        const id = S().camp[o.i];
        if (id) { ctx.scale(0.8, 0.8); A.decor(ctx, id, rtime, P.n > 0.5); }
        else { ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.setLineDash([6, 6]); ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0, -2, 36, 10, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
        break;
      }
      case "npc": {
        const F = C.friends[o.fid];
        A.animal(ctx, F, { t: o.t, walk: o.walkT, dir: o.dir, blink: Math.sin(o.t * 0.7 + o.home) > 0.985, talk: o.talkT > 0, mood: o.talkT > 0 ? "" : "" });
        break;
      }
      case "player": {
        const a = player.act;
        A.animal(ctx, ME, { t: player.t, walk: player.walk, dir: player.dir, blink: player.blink > 0, mood: player.mood, arm: player.arm, hat: true, pack: true });
        // tools in hand
        ctx.save(); ctx.scale(player.dir, 1);
        if (a && a.kind === "bug") { ctx.translate(18, -30); ctx.rotate(-1.6 + a.t / a.dur * 2.6); ctx.strokeStyle = "#8a5a3c"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -60); ctx.stroke(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, -74, 14, 16, 0, 0, TAU); ctx.stroke(); }
        if (a && a.kind === "dig") { ctx.translate(26, -20); ctx.rotate(0.6 + Math.sin(a.t * 22) * 0.6); ctx.strokeStyle = "#8a5a3c"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, -30); ctx.lineTo(0, 10); ctx.stroke(); ctx.fillStyle = "#b8c4d0"; ctx.beginPath(); ctx.ellipse(0, 18, 8, 11, 0, 0, TAU); ctx.fill(); }
        if (mode === "fish") { ctx.translate(20, -34); ctx.rotate(-0.7 + (fishing && fishing.phase === "reel" ? Math.sin(rtime * 18) * 0.05 : 0)); ctx.strokeStyle = "#8a5a3c"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -80); ctx.stroke(); }
        ctx.restore();
        break;
      }
      case "fish": break;
      case "sign": { ctx.fillStyle = "#8a5a3c"; ctx.fillRect(-4, -60, 8, 60); A.roundRect(ctx, -46, -96, 92, 40, 10); ctx.fillStyle = "#ffe8b0"; ctx.fill(); ctx.strokeStyle = "#8a5a3c"; ctx.lineWidth = 3; ctx.stroke(); ctx.fillStyle = "#6b4a2a"; ctx.font = "800 13px " + FONT; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(area.name, 0, -76); break; }
    }
    ctx.restore();
  }
  function drawNightLights(P) {
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 22; i++) {
      const x = cam.x + ((hash(i) * 1300 + Math.sin(rtime * 0.4 + i) * 60) % (viewW + 60)), y = 420 + hash(i + 4) * 240 + Math.sin(rtime * 0.9 + i * 2) * 20, a = (0.5 + 0.5 * Math.sin(rtime * 3 + i)) * P.n;
      const gl = ctx.createRadialGradient(x, y, 0, x, y, 12); gl.addColorStop(0, `rgba(255,245,150,${a})`); gl.addColorStop(1, "rgba(255,245,150,0)"); ctx.fillStyle = gl; ctx.fillRect(x - 12, y - 12, 24, 24);
    }
    for (const o of objs) {
      let lx = null, ly, r = 0, col;
      if (o.type === "truck") { lx = o.x - 15; ly = o.y - 70; r = 160; col = "255,200,120"; }
      if (o.type === "slot" && S().camp[o.i] === "fire") { lx = o.x; ly = o.y - 30; r = 170 + Math.sin(rtime * 9) * 8; col = "255,150,70"; }
      if (o.type === "slot" && S().camp[o.i] === "lantern") { lx = o.x + 18; ly = o.y - 60; r = 120; col = "255,180,100"; }
      if (o.type === "slot" && S().camp[o.i] === "lights") { lx = o.x; ly = o.y - 60; r = 120; col = "255,230,170"; }
      if (lx == null || lx < cam.x - 200 || lx > cam.x + viewW + 200) continue;
      const gl = ctx.createRadialGradient(lx, ly, 0, lx, ly, r); gl.addColorStop(0, `rgba(${col},${0.22 * P.n})`); gl.addColorStop(1, `rgba(${col},0)`); ctx.fillStyle = gl; ctx.fillRect(lx - r, ly - r, r * 2, r * 2);
    }
    for (const b of bugs) if (C.items[b.id].draw.shape === "glowbug") { const gl = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, 40); gl.addColorStop(0, "rgba(255,240,120,0.6)"); gl.addColorStop(1, "rgba(255,240,120,0)"); ctx.fillStyle = gl; ctx.fillRect(b.x - 40, b.y - 40, 80, 80); }
    ctx.restore();
  }
  function bubble(x, y, draw, pulse) {
    const k = 1 + (pulse ? Math.sin(rtime * 5) * 0.06 : 0);
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    ctx.fillStyle = "rgba(59,42,74,0.18)"; ctx.beginPath(); ctx.ellipse(0, 30, 14, 4, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "#fff"; A.roundRect(ctx, -26, -24, 52, 46, 16); ctx.fill();
    A.tri(ctx, -7, 20, 7, 20, 0, 29, "#fff");
    draw(); ctx.restore();
  }
  function drawPrompts() {
    if (mode !== "play") return;
    // friends always show what they'd like
    for (const o of objs) if (o.type === "npc" && o.x > cam.x - 60 && o.x < cam.x + viewW + 60) {
      const f = Store.friend(o.fid), have = Store.count(f.req.item) >= f.req.n;
      bubble(o.x, o.y - 140 + Math.sin(rtime * 2 + o.home) * 3, () => {
        A.item(ctx, f.req.item, -6, -2, 30, rtime);
        ctx.font = "800 13px " + FONT; ctx.textAlign = "center"; ctx.fillStyle = "#3b2a4a"; ctx.fillText("×" + f.req.n, 14, 12);
        if (have) { A.circle(ctx, 22, -20, 11, "#3fc76f"); ctx.strokeStyle = "#fff"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(17, -20); ctx.lineTo(21, -16); ctx.lineTo(27, -24); ctx.stroke(); }
      }, have);
    }
    if (busy()) return;
    const n = nearest(); if (!n || Math.abs(player.x - (n.kind === "fish" ? area.width - 235 : n.kind === "bug" ? n.o.ax : n.o.x)) > 150) return;
    const o = n.o;
    let x = o.x, y = 0, icon = null;
    if (n.kind === "tree") { if (o.n <= 0) return; x = o.x + o.crown.x; y = o.y + o.crown.y - 60; icon = "hand"; }
    else if (n.kind === "dig") { y = o.y - 60; icon = "shovel"; }
    else if (n.kind === "bug") { x = o.x; y = o.y - 50; icon = "net"; }
    else if (n.kind === "truck") { x = o.x - 20; y = o.y - 190; icon = "coin"; }
    else if (n.kind === "slot") { y = o.y - 110; icon = S().camp[o.i] ? "swap" : "plus"; }
    else if (n.kind === "fish") { x = area.width - 160; y = FEET - 110; icon = "hook"; }
    else return;
    bubble(x, y, () => drawIcon(icon), true);
  }
  function drawIcon(k) {
    ctx.strokeStyle = "#3b2a4a"; ctx.fillStyle = "#3b2a4a"; ctx.lineWidth = 3.5; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath();
    switch (k) {
      case "hand": ctx.moveTo(-8, 10); ctx.lineTo(-8, -4); ctx.moveTo(-3, 10); ctx.lineTo(-3, -10); ctx.moveTo(2, 10); ctx.lineTo(2, -9); ctx.moveTo(7, 10); ctx.lineTo(7, -5); ctx.moveTo(-12, 2); ctx.lineTo(-8, 8); ctx.stroke(); A.roundRect(ctx, -10, 2, 20, 12, 5); ctx.fill(); break;
      case "shovel": ctx.moveTo(-10, -12); ctx.lineTo(4, 4); ctx.stroke(); ctx.beginPath(); ctx.ellipse(8, 8, 6, 9, -0.8, 0, TAU); ctx.fill(); break;
      case "net": ctx.moveTo(-12, 12); ctx.lineTo(2, -2); ctx.stroke(); ctx.beginPath(); ctx.arc(7, -7, 8, 0, TAU); ctx.stroke(); break;
      case "coin": A.circle(ctx, 0, 0, 12, "#ffc83a"); A.circle(ctx, 0, 0, 8, "#ffe27a"); ctx.fillStyle = "#c98a1a"; ctx.font = "900 12px " + FONT; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("$", 0, 1); break;
      case "plus": ctx.moveTo(-10, 0); ctx.lineTo(10, 0); ctx.moveTo(0, -10); ctx.lineTo(0, 10); ctx.stroke(); break;
      case "swap": A.star(ctx, 0, 0, 5, 13, 6, "#ffc83a"); break;
      case "hook": A.item(ctx, "sunfin", 0, 0, 34, rtime); break;
    }
  }
  function drawFishingWorld() {
    const f = fishing, rodX = player.x + 60, rodY = FEET - 112;
    let bx = f.bx, by = f.by;
    if (f.phase === "cast") { const k = Math.min(1, f.t / 0.6); bx = lerp(rodX, f.bx, k); by = lerp(rodY, f.by, k) - Math.sin(k * Math.PI) * 120; }
    if (f.phase === "bite") by += Math.sin(rtime * 40) * 4 + 6;
    if (f.phase === "reel") { bx += Math.sin(rtime * 9) * 8; by += 4; }
    ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(rodX, rodY); ctx.quadraticCurveTo((rodX + bx) / 2, Math.max(rodY, by) + 30, bx, by); ctx.stroke();
    if (f.phase !== "caught") { A.circle(ctx, bx, by + (f.phase === "wait" ? Math.sin(rtime * 3) * 2 : 0), 7, "#ff5f6d"); ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(bx, by, 7, Math.PI, TAU); ctx.fill(); }
    if (f.phase === "bite") { ctx.font = "900 44px " + FONT; ctx.textAlign = "center"; ctx.lineWidth = 7; ctx.strokeStyle = "#3b2a4a"; ctx.strokeText("!", bx, by - 50); ctx.fillStyle = "#ffe066"; ctx.fillText("!", bx, by - 50); }
  }
  function drawFishingHud() {
    const f = fishing;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const msg = f.phase === "wait" || f.phase === "cast" ? "Wait for a bite…" : f.phase === "bite" ? "TAP NOW!" : f.phase === "reel" ? "Hold to lift the green zone onto the fish" : "";
    if (msg) { ctx.font = `800 ${f.phase === "bite" ? 30 : 18}px ${FONT}`; ctx.lineWidth = 4; ctx.lineJoin = "round"; ctx.strokeStyle = "rgba(59,42,74,0.8)"; ctx.strokeText(msg, W / 2, H * 0.2); ctx.fillStyle = f.phase === "bite" ? "#ffe066" : "#fff"; ctx.fillText(msg, W / 2, H * 0.2); }
    if (f.phase !== "reel") return;
    const bh = Math.min(H * 0.48, 360), bw = 46, bx = W - bw - 56, by = H * 0.28;
    // bar
    ctx.fillStyle = "rgba(59,42,74,0.55)"; A.roundRect(ctx, bx - 8, by - 8, bw + 16 + 22, bh + 16, 18); ctx.fill();
    const wg = ctx.createLinearGradient(0, by, 0, by + bh); wg.addColorStop(0, "#7fe0ff"); wg.addColorStop(1, "#2a6fd8");
    ctx.fillStyle = wg; A.roundRect(ctx, bx, by, bw, bh, 12); ctx.fill();
    const zy = by + bh * (1 - f.zone - f.zh), zH = bh * f.zh;
    ctx.fillStyle = f.inside ? "rgba(120,255,140,0.85)" : "rgba(120,255,140,0.5)"; A.roundRect(ctx, bx + 3, zy, bw - 6, zH, 10); ctx.fill();
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke();
    ctx.save(); ctx.translate(bx + bw / 2, by + bh * (1 - f.fy)); ctx.rotate(Math.sin(rtime * 10) * 0.2); A.item(ctx, f.id, 0, 0, 34, rtime); ctx.restore();
    // progress
    const px = bx + bw + 8;
    ctx.fillStyle = "rgba(255,255,255,0.25)"; A.roundRect(ctx, px, by, 14, bh, 7); ctx.fill();
    const pg = ctx.createLinearGradient(0, by + bh, 0, by); pg.addColorStop(0, "#ffb347"); pg.addColorStop(1, "#3fc76f");
    ctx.fillStyle = pg; A.roundRect(ctx, px, by + bh * (1 - f.prog), 14, bh * f.prog, 7); ctx.fill();
  }

  /* ---------- loop ---------- */
  let last = performance.now();
  function frame(now) { const dt = Math.min(0.05, (now - last) / 1000); last = now; update(dt); render(); requestAnimationFrame(frame); }

  resize();
  enterArea(S().area || "palm", S().x);
  requestAnimationFrame(frame);

  return {
    on,
    travel(id) { if (fadeTo || (area && area.id === id)) return false; if (mode === "fish") stopFishing(); fadeTo = { id, x: 220 }; return true; },
    stopFishing, pause(p) { paused = p; if (!p) last = performance.now(); },
    setMode(m) { mode = m; }, get mode() { return mode; },
    get area() { return area; }, get player() { return player; }, get clock() { return S().clock; }, isNight,
    // testing hooks
    step(dt = 1 / 60, n = 1) { for (let i = 0; i < n; i++) update(dt); render(); },
    goTo(kind, i = 0) { const l = kind === "dig" ? digs : kind === "bug" ? bugs : objs.filter(o => o.type === kind); const o = l[i]; if (!o) return false; const g = { o, kind }; player.goal = g; player.tx = clamp(standX(g), 110, area.width - 230); return true; },
    fishPress, get fishing() { return fishing; }, get objs() { return objs; }, get bugs() { return bugs; }, get digs() { return digs; },
    setClock(c) { S().clock = c; }
  };
})();

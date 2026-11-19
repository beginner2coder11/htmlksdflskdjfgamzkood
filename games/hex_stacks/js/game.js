/* HEX STACKS — game: drag & drop, the animated replay of merges and pops, and all the drawing.
   The rules (js/rules.js) resolve a move instantly; this file keeps a "shown" copy of the board and
   plays the move's events one by one: tiles flip across from stack to stack, runs of 10 pop. */
window.Game = (() => {
  const C = window.GAME_CONFIG, RU = window.Rules;
  const cv = document.getElementById("view"), ctx = cv.getContext("2d");
  const TAU = Math.PI * 2, SQ = 0.8, S3 = Math.sqrt(3);
  let DPR = 1, VW = 0, VH = 0, s = 30, th = 6, bcx = 0, bcy = 0, u = 1, trayY = 0;
  const on = {};
  let mode = "idle", L = null, st = null, shown = {}, queue = [], cur = null, pending = null, parts = [], texts = [], t = 0, shake = 0;
  let drag = null, sel = -1, hammer = false, bot = false, botT = 0, boardId = C.boards[0].id, sprites = {}, bg = null, shownScore = 0, opened = new Set(), unlockFx = {}, trayIn = 0, hand = null;

  /* ---------- helpers ---------- */
  const hex2 = h => { const n = parseInt(h.slice(1), 16); return [n >> 16, n >> 8 & 255, n & 255]; };
  const mix = (a, b, q) => { const p = hex2(a), r = hex2(b); return `rgb(${p.map((v, i) => Math.round(v + (r[i] - v) * q)).join(",")})`; };
  const ease = x => x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2;
  const back = x => { const c = 1.7; return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2; };
  function canvasOf(w, h) { const c = document.createElement("canvas"); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
  function hexPath(g, x, y, r, sq = SQ) { g.beginPath(); for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + i * Math.PI / 3; g[i ? "lineTo" : "moveTo"](x + Math.cos(a) * r, y + Math.sin(a) * r * sq); } g.closePath(); }
  const cellXY = k => { const [q, r] = RU.unkey(k); return [bcx + s * S3 * (q + r / 2), bcy + s * 1.5 * r * SQ]; };

  /* ---------- layout ---------- */
  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1); VW = innerWidth; VH = innerHeight;
    cv.width = VW * DPR; cv.height = VH * DPR; cv.style.width = VW + "px"; cv.style.height = VH + "px";
    u = Math.min(VW / 400, VH / 820, 1.3);
    if (L) layout();
  }
  function layout() {
    const rad = Math.max(...L.cells.map(k => { const [q, r] = RU.unkey(k); return Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r)); }));
    const top = 118, bottom = VH - 196;
    s = Math.min((VW - 24) / (S3 * (2 * rad + 1) + 0.4), (bottom - top) / ((3 * rad + 2) * SQ + 2.6 * 0.24 * 4));
    s = Math.min(s, 48 * u);
    th = s * 0.28;
    bcx = VW / 2; bcy = (top + bottom) / 2 + th * 3;
    trayY = VH - 128;
    bake();
  }

  /* ---------- sprites ---------- */
  function bakeTile(ci, sz = s) {
    const col = C.colors[ci], w = S3 * sz + 6, h = 2 * sz * SQ + sz * 0.28 + 6, k = DPR;
    const c = canvasOf(w * k, h * k), g = c.getContext("2d"); g.scale(k, k);
    const x = w / 2, y = sz * SQ + 3, r = sz * 0.94, tt = sz * 0.28;
    // side (the visible band under the top face)
    hexPath(g, x, y + tt, r); const sg = g.createLinearGradient(x - r, 0, x + r, 0); sg.addColorStop(0, mix(col.b, "#000000", 0.08)); sg.addColorStop(0.5, col.b); sg.addColorStop(1, mix(col.b, "#000000", 0.2)); g.fillStyle = sg; g.fill();
    g.strokeStyle = "rgba(0,0,0,0.18)"; g.lineWidth = 1; g.stroke();
    // top face
    hexPath(g, x, y, r); const tg = g.createLinearGradient(0, y - r * SQ, 0, y + r * SQ); tg.addColorStop(0, mix(col.a, "#ffffff", 0.35)); tg.addColorStop(1, col.a); g.fillStyle = tg; g.fill();
    g.strokeStyle = mix(col.b, "#000000", 0.1); g.lineWidth = 1.2; g.stroke();
    hexPath(g, x, y, r * 0.78); g.strokeStyle = "rgba(255,255,255,0.45)"; g.lineWidth = 1.4; g.stroke();
    hexPath(g, x, y - r * 0.1, r * 0.42, SQ * 0.7); g.fillStyle = "rgba(255,255,255,0.22)"; g.fill();
    return { c, w, h, oy: y };
  }
  function bake() {
    if (!L || !VW) return;
    sprites = {}; for (let i = 0; i < C.colors.length; i++) sprites[i] = bakeTile(i);
    const b = C.boards.find(x => x.id === boardId) || C.boards[0];
    bg = canvasOf(VW * DPR, VH * DPR); const g = bg.getContext("2d"); g.scale(DPR, DPR);
    const gr = g.createLinearGradient(0, 0, VW * 0.4, VH); gr.addColorStop(0, b.bg[0]); gr.addColorStop(1, b.bg[1]); g.fillStyle = gr; g.fillRect(0, 0, VW, VH);
    // soft honeycomb pattern in the background
    g.strokeStyle = "rgba(255,255,255,0.18)"; g.lineWidth = 1.5;
    const ps = 26 * u; for (let y = -ps, row = 0; y < VH + ps; y += ps * 1.5 * 0.86, row++) for (let x = (row % 2) * ps * S3 / 2 - ps; x < VW + ps; x += ps * S3) { hexPath(g, x, y, ps * 0.9, 0.86); g.stroke(); }
    // board platform: a bigger hex under every cell, with a soft shadow
    g.save(); g.shadowColor = "rgba(40,20,80,0.28)"; g.shadowBlur = 18 * u; g.shadowOffsetY = 10 * u; g.fillStyle = b.board;
    for (const k of L.cells) { const [x, y] = cellXY(k); hexPath(g, x, y + th * 0.6, s * 1.18); g.fill(); }
    g.restore(); g.fillStyle = b.board;
    for (const k of L.cells) { const [x, y] = cellXY(k); hexPath(g, x, y + th * 0.6, s * 1.18); g.fill(); }
    // slots
    for (const k of L.cells) {
      const [x, y] = cellXY(k);
      hexPath(g, x, y + th * 0.25, s * 0.95); g.fillStyle = mix(b.slot, "#000000", 0.06); g.fill();
      hexPath(g, x, y, s * 0.92); const sg = g.createLinearGradient(0, y - s, 0, y + s); sg.addColorStop(0, mix(b.slot, "#000000", 0.08)); sg.addColorStop(1, b.slot); g.fillStyle = sg; g.fill();
    }
    // tray pedestals
    for (let i = 0; i < C.trayStacks; i++) { const [x, y] = trayXY(i); g.fillStyle = "rgba(255,255,255,0.35)"; g.beginPath(); g.ellipse(x, y + th * 1.2, s * 1.25, s * 1.25 * SQ * 0.75, 0, 0, TAU); g.fill(); g.strokeStyle = "rgba(255,255,255,0.6)"; g.lineWidth = 2; g.stroke(); }
  }
  const trayXY = i => [VW / 2 + (i - (C.trayStacks - 1) / 2) * Math.min(VW / 3.3, s * 3.2), trayY];

  /* ---------- drawing a stack ---------- */
  function drawStack(stack, x, y, scale = 1, alpha = 1, lift = 0) {
    if (!stack || !stack.length) return;
    ctx.globalAlpha = alpha;
    for (let i = 0; i < stack.length; i++) {
      const sp = sprites[stack[i]]; if (!sp) continue;
      const w = sp.w * scale, h = sp.h * scale, yy = y - (i * th + lift) * scale;
      ctx.drawImage(sp.c, x - w / 2, yy - sp.oy * scale, w, h);
    }
    ctx.globalAlpha = 1;
  }
  function stackTopY(k, n) { const [x, y] = cellXY(k); return [x, y - n * th]; }

  /* ---------- level ---------- */
  function load(n, opts = {}) {
    L = RU.level(n); bot = !!opts.bot; st = RU.newState(L, opts.seed != null ? opts.seed : (Date.now() & 0xffffff)); shown = {}; for (const k of L.cells) shown[k] = null;
    queue = []; cur = null; pending = null; parts = []; texts = []; t = 0; shake = 0; drag = null; sel = -1; hammer = false; shownScore = 0;
    opened = new Set(st.open); unlockFx = {}; trayIn = 0;
    hand = n === 1 && !bot ? { t: 0 } : null;
    layout(); on.score && on.score(0, L.target);
  }

  /* ---------- moves ---------- */
  function place(i, k) {
    if (busy() || !st.tray[i] || mode === "won" || mode === "lost") return false;
    const stack = st.tray[i].slice();
    const res = RU.place(st, i, k); if (!res) return false;
    hand = null; sel = -1;
    shown[k] = stack;
    queue = [{ t: "drop", at: k }, ...res.ev];
    if (res.opened.length) queue.push({ t: "unlock", keys: res.opened });
    pending = res; Sound.play("drop");
    return true;
  }
  const busy = () => !!cur || queue.length > 0 || !!pending;   // pending = the move's result, until its end check has run
  function smash(k) {
    if (busy() || !st.board[k] || !st.board[k].length) return false;
    const [x, y] = cellXY(k), n = st.board[k].length;
    for (let i = 0; i < n; i++) { const c = C.colors[st.board[k][i]]; for (let j = 0; j < 3; j++) parts.push({ x, y: y - i * th, vx: (Math.random() - 0.5) * 420, vy: -Math.random() * 360 - 60, t: 0, life: 0.9, s: (4 + Math.random() * 4) * u, col: c.a, g: 1100, shard: true, r: Math.random() * 6, vr: (Math.random() - 0.5) * 18 }); }
    st.board[k] = null; shown[k] = null; hammer = false; shake = 0.25; Sound.play("smash"); on.hammerUsed && on.hammerUsed(); return true;
  }
  function swapTray() { if (busy()) return false; RU.refill(st); trayIn = 0; sel = -1; Sound.play("swap"); return true; }
  // continue after the board fills: clear the n messiest stacks
  function reviveClear(n = 4) {
    const list = [...st.open].filter(k => st.board[k] && st.board[k].length).map(k => { const s0 = st.board[k]; let b = 1; for (let i = 1; i < s0.length; i++) if (s0[i] !== s0[i - 1]) b++; return { k, v: b * 10 + s0.length }; }).sort((a, b) => b.v - a.v).slice(0, n);
    for (const { k } of list) { const save = hammer; smashQuiet(k); hammer = save; }
    mode = "play"; Sound.play("smash");
  }
  function smashQuiet(k) { const [x, y] = cellXY(k); for (let i = 0; i < 8; i++) parts.push({ x, y, vx: (Math.random() - 0.5) * 380, vy: -Math.random() * 300, t: 0, life: 0.8, s: 5 * u, col: "#ffffff", g: 900, shard: true, r: 0, vr: 10 }); st.board[k] = null; shown[k] = null; }

  /* ---------- the event player ---------- */
  function nextEvent() {
    cur = queue.shift() || null;
    if (!cur) { finishMove(); return; }
    cur.time = 0; cur.fly = []; cur.done = 0;
    if (cur.t === "move") cur.launched = 0;
    if (cur.t === "clear") cur.popped = 0;
  }
  function finishMove() {
    const res = pending; pending = null;
    if (!res) return;
    if (res.refilled) trayIn = 0;
    if (res.won) { mode = mode === "attract" ? mode : "won"; if (mode === "attract") { setTimeout(() => mode === "attract" && attract(), 1200); return; } Sound.play("win"); confetti(); on.win && on.win(L, st.score); }
    else if (res.lost) { if (mode === "attract") { setTimeout(() => mode === "attract" && attract(), 900); return; } mode = "lost"; Sound.play("lose"); on.lose && on.lose(L, st.score); }
  }
  function playEvents(dt) {
    if (!cur) { if (queue.length) nextEvent(); else { if (pending) finishMove(); return; } }
    if (!cur) return;
    cur.time += dt;
    if (cur.t === "drop") { if (cur.time > 0.16) { burstAt(cur.at, "#ffffff", 6); cur = null; } return; }
    if (cur.t === "move") {
      const gap = Math.max(0.03, 0.07 - cur.n * 0.003);
      while (cur.launched < cur.n && cur.time >= cur.launched * gap) {
        const from = shown[cur.from]; const c = from.pop(); if (!from.length) shown[cur.from] = null;
        cur.fly.push({ c, t: 0, fromH: (from ? from.length : 0), idx: cur.launched });
        cur.launched++;
      }
      for (const f of cur.fly) {
        if (f.landed) continue;
        f.t += dt;
        if (f.t >= 0.24) { f.landed = true; (shown[cur.to] || (shown[cur.to] = [])).push(f.c); cur.done++; Sound.play("clack", cur.done + (cur.chain || 0)); }
      }
      if (cur.done >= cur.n) cur = null;
      return;
    }
    if (cur.t === "clear") {
      const gap = 0.035;
      while (cur.popped < cur.n && cur.time >= cur.popped * gap) {
        const s0 = shown[cur.at]; if (!s0 || !s0.length) { cur.popped = cur.n; break; }
        const c = s0.pop(); const [x, y] = stackTopY(cur.at, s0.length + 1);
        for (let j = 0; j < 3; j++) parts.push({ x, y, vx: (Math.random() - 0.5) * 300, vy: -Math.random() * 380 - 80, t: 0, life: 0.7, s: (3 + Math.random() * 3) * u, col: j ? C.colors[c].a : "#ffffff", g: 900, star: j === 0 });
        if (!s0.length) shown[cur.at] = null;
        cur.popped++; Sound.play("pop", cur.popped);
      }
      if (cur.popped >= cur.n && cur.time > cur.n * gap + 0.12) {
        const [x, y] = cellXY(cur.at); shownScore += cur.n; on.score && on.score(shownScore, L.target);
        texts.push({ x, y: y - th * 4, s: "+" + cur.n, t: 0, c: "#ffffff" });
        if (cur.combo >= 2) { texts.push({ x: VW / 2, y: bcy - s * 3.2, s: `COMBO ×${cur.combo}`, t: 0, c: "#fff59a", big: true }); Sound.play("combo", cur.combo); shake = 0.15; }
        Sound.play("clear"); cur = null;
      }
      return;
    }
    if (cur.t === "unlock") {
      if (cur.time === dt) { for (const k of cur.keys) { opened.add(k); unlockFx[k] = 0; burstAt(k, "#ffc93d", 18); } Sound.play("unlock"); }
      if (cur.time > 0.5) cur = null;
    }
  }
  function burstAt(k, col, n) { const [x, y] = cellXY(k); for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = 120 + Math.random() * 200; parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v * SQ - 60, t: 0, life: 0.5, s: 3 * u, col, g: 500 }); } }
  function confetti() { const cols = C.colors.map(c => c.a); for (let i = 0; i < 120; i++) parts.push({ x: Math.random() * VW, y: -20 - Math.random() * 200, vx: (Math.random() - 0.5) * 160, vy: 120 + Math.random() * 160, t: 0, life: 3, s: (5 + Math.random() * 5) * u, col: cols[i % cols.length], g: 150, rect: true, r: 0, vr: (Math.random() - 0.5) * 12 }); }

  /* ---------- update ---------- */
  function update(dt) {
    t += dt; shake = Math.max(0, shake - dt); trayIn = Math.min(1, trayIn + dt * 3);
    if (hand) hand.t += dt;
    playEvents(dt);
    for (const k in unlockFx) { unlockFx[k] += dt; if (unlockFx[k] > 0.8) delete unlockFx[k]; }
    for (const q of parts) { q.t += dt; q.vy += (q.g || 0) * dt; q.x += q.vx * dt; q.y += q.vy * dt; if (q.vr) q.r += q.vr * dt; }
    parts = parts.filter(q => q.t < q.life);
    for (const x of texts) x.t += dt; texts = texts.filter(x => x.t < 1.2);
    if (mode === "attract" && !busy()) { botT -= dt; if (botT <= 0) { botT = 0.7; const mv = RU.bestMove(st); if (mv) place(mv.i, mv.k); } }
  }

  /* ---------- render ---------- */
  function render() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    let ox = 0, oy = 0; if (shake > 0) { ox = (Math.random() - 0.5) * shake * 14; oy = (Math.random() - 0.5) * shake * 14; }
    ctx.drawImage(bg, 0, 0, VW, VH);
    ctx.save(); ctx.translate(ox, oy);
    const keys = L.cells.slice().sort((a, b) => cellXY(a)[1] - cellXY(b)[1] || cellXY(a)[0] - cellXY(b)[0]);
    // hover target while dragging
    const hov = drag ? hoverCell(drag.x, drag.y - dragLift()) : null;
    for (const k of keys) {
      const [x, y] = cellXY(k);
      if (!opened.has(k)) { drawLock(k, x, y); continue; }
      if (unlockFx[k] != null) { const e = unlockFx[k] / 0.8; ctx.globalAlpha = 1 - e; hexPath(ctx, x, y, s * (0.92 + e * 0.4)); ctx.strokeStyle = "#ffc93d"; ctx.lineWidth = 4; ctx.stroke(); ctx.globalAlpha = 1; }
      if (k === hov) { hexPath(ctx, x, y, s * 0.96); ctx.fillStyle = `rgba(255,255,255,${0.5 + 0.2 * Math.sin(t * 8)})`; ctx.fill(); }
      if (hammer && shown[k]) { hexPath(ctx, x, y + th, s * 1.02); ctx.strokeStyle = `rgba(255,77,94,${0.5 + 0.4 * Math.sin(t * 8)})`; ctx.lineWidth = 3; ctx.stroke(); }
      let sk = shown[k];
      let lift = 0;
      if (cur && cur.t === "drop" && cur.at === k) lift = (1 - ease(Math.min(1, cur.time / 0.16))) * s * 1.6;
      drawStack(sk, x, y, 1, 1, lift);
      if (k === hov && drag) drawStack(st.tray[drag.i], x, y, 1, 0.45);
      if (cur && cur.t === "move" && cur.to === k) for (const f of cur.fly) if (!f.landed) drawFlying(f, k);
      // run counter on tall single-colour tops
      if (sk && sk.length) { const r = RU.run(sk); if (r >= 4 && !(cur && cur.t === "clear" && cur.at === k)) { const [tx, ty] = stackTopY(k, sk.length); ctx.font = `900 ${Math.round(s * 0.42)}px ui-rounded, system-ui, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineWidth = 3; ctx.strokeStyle = "rgba(40,20,60,0.55)"; ctx.strokeText(r, tx, ty); ctx.fillStyle = "#ffffff"; ctx.fillText(r, tx, ty); } }
    }
    // tray
    for (let i = 0; i < C.trayStacks; i++) {
      const stk = st.tray[i]; if (!stk || (drag && drag.i === i)) continue;
      const [x, y] = trayXY(i), e = back(Math.min(1, trayIn * 1.3 - i * 0.12 > 0 ? trayIn * 1.3 - i * 0.12 : 0));
      const yy = y + (1 - Math.min(1, e)) * 160, sc = 0.92 + (sel === i ? 0.08 * Math.sin(t * 8) : 0);
      if (sel === i) { ctx.fillStyle = "rgba(255,255,255,0.55)"; ctx.beginPath(); ctx.ellipse(x, y + th * 1.2, s * 1.3, s * 0.72, 0, 0, TAU); ctx.fill(); }
      drawStack(stk, x, yy, sc, mode === "won" || mode === "lost" ? 0.5 : 1);
    }
    if (drag && st.tray[drag.i]) drawStack(st.tray[drag.i], drag.x, drag.y - dragLift(), 1.05);
    ctx.restore();
    // particles
    for (const q of parts) {
      const a = 1 - q.t / q.life; ctx.globalAlpha = Math.max(0, Math.min(1, a * 1.5)); ctx.fillStyle = q.col;
      if (q.rect || q.shard) { ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.r || 0); if (q.shard) { ctx.beginPath(); ctx.moveTo(0, -q.s); ctx.lineTo(q.s * 0.8, q.s * 0.6); ctx.lineTo(-q.s * 0.8, q.s * 0.6); ctx.fill(); } else ctx.fillRect(-q.s / 2, -q.s / 4, q.s, q.s / 2); ctx.restore(); }
      else if (q.star) { ctx.save(); ctx.translate(q.x, q.y); ctx.beginPath(); for (let i = 0; i < 10; i++) { const a2 = i / 10 * TAU, r = i % 2 ? q.s * 0.45 : q.s; ctx[i ? "lineTo" : "moveTo"](Math.cos(a2) * r, Math.sin(a2) * r); } ctx.fill(); ctx.restore(); }
      else { ctx.beginPath(); ctx.arc(q.x, q.y, q.s / 2, 0, TAU); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
    for (const x of texts) {
      const e = x.t / 1.2, sz = (x.big ? 34 : 22) * u * (x.t < 0.15 ? back(x.t / 0.15) : 1);
      ctx.globalAlpha = 1 - Math.max(0, e - 0.6) / 0.4; ctx.font = `900 ${Math.round(sz)}px ui-rounded, system-ui, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.lineWidth = 6 * u; ctx.strokeStyle = "#2a2350"; ctx.strokeText(x.s, x.x, x.y - e * 40 * u); ctx.fillStyle = x.c; ctx.fillText(x.s, x.x, x.y - e * 40 * u);
    }
    ctx.globalAlpha = 1;
    if (hand && mode === "play" && !drag && !busy()) {
      const k = RU.bestMove(st); if (k) { const [x0, y0] = trayXY(k.i), [x1, y1] = cellXY(k.k), p = (hand.t % 1.6) / 1.2, e = ease(Math.min(1, p)); drawHand(x0 + (x1 - x0) * e + 10 * u, y0 + (y1 - y0) * e + 6 * u); }
    }
  }
  function drawFlying(f, to) {
    const e = Math.min(1, f.t / 0.24), [x0, y0] = stackTopY(cur.from, f.fromH), dst = shown[to] ? shown[to].length : 0, [x1, y1] = stackTopY(to, dst);
    const x = x0 + (x1 - x0) * e, y = y0 + (y1 - y0) * e - Math.sin(e * Math.PI) * s * 1.1;
    const sp = sprites[f.c], flip = Math.max(0.15, Math.abs(Math.cos(e * Math.PI)));
    ctx.save(); ctx.translate(x, y); ctx.scale(1, flip); ctx.drawImage(sp.c, -sp.w / 2, -sp.oy, sp.w, sp.h); ctx.restore();
  }
  function drawLock(k, x, y) {
    hexPath(ctx, x, y + th, s * 0.92); ctx.fillStyle = "#8a86a6"; ctx.fill();
    hexPath(ctx, x, y, s * 0.92); const g = ctx.createLinearGradient(0, y - s, 0, y + s); g.addColorStop(0, "#d6d3e6"); g.addColorStop(1, "#aeaac6"); ctx.fillStyle = g; ctx.fill();
    ctx.fillStyle = "#6a6588"; const w = s * 0.34, h = s * 0.26; ctx.fillRect(x - w / 2, y - h * 0.2, w, h);
    ctx.strokeStyle = "#6a6588"; ctx.lineWidth = s * 0.07; ctx.beginPath(); ctx.arc(x, y - h * 0.2, w * 0.32, Math.PI, 0); ctx.stroke();
    ctx.font = `900 ${Math.round(s * 0.3)}px ui-rounded, system-ui, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#ffffff";
    ctx.fillText(L.locks[k], x, y + s * 0.42 * SQ + 2);
  }
  function drawHand(x, y) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(-0.4); const q = u * 1.1;
    ctx.fillStyle = "#ffffff"; ctx.strokeStyle = "#2a2350"; ctx.lineWidth = 3 * q; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(-6 * q, 0); ctx.lineTo(-6 * q, -26 * q); ctx.quadraticCurveTo(0, -34 * q, 6 * q, -26 * q); ctx.lineTo(6 * q, -8 * q); ctx.lineTo(18 * q, -6 * q); ctx.quadraticCurveTo(26 * q, 0, 22 * q, 14 * q); ctx.lineTo(16 * q, 30 * q); ctx.lineTo(-8 * q, 30 * q); ctx.lineTo(-16 * q, 8 * q); ctx.quadraticCurveTo(-14 * q, 0, -6 * q, 4 * q); ctx.closePath();
    ctx.fill(); ctx.stroke(); ctx.restore();
  }

  /* ---------- input: drag a tray stack onto the board (or tap stack, then tap a cell) ---------- */
  const dragLift = () => s * 1.9;
  function hoverCell(x, y) {
    let best = null, bd = s * 1.05;
    for (const k of RU.emptyCells(st)) { if (shown[k] && shown[k].length) continue; const [cx, cy] = cellXY(k), d = Math.hypot(cx - x, (cy - y) / SQ * 0.9); if (d < bd) { bd = d; best = k; } }
    return best;
  }
  function trayAt(x, y) { for (let i = 0; i < C.trayStacks; i++) { if (!st.tray[i]) continue; const [tx, ty] = trayXY(i); if (Math.abs(x - tx) < s * 1.4 && y > ty - s * 2.6 && y < ty + s * 1.4) return i; } return -1; }
  function stackAt(x, y) { let best = null, bd = s; for (const k of L.cells) { if (!shown[k]) continue; const [cx, cy] = cellXY(k), n = shown[k].length; const d = Math.hypot(cx - x, (cy - n * th / 2 - y) / SQ * 0.8); if (d < bd + n * th * 0.3) { bd = d; best = k; } } return best; }
  cv.addEventListener("pointerdown", e => {
    Sound.unlock(); if (mode !== "play" || busy()) return;
    if (hammer) { const k = stackAt(e.clientX, e.clientY); if (k) smash(k); return; }
    const i = trayAt(e.clientX, e.clientY);
    if (i >= 0) { drag = { i, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY }; Sound.play("pick"); try { cv.setPointerCapture(e.pointerId); } catch (er) {} return; }
    if (sel >= 0) { const k = hoverCell(e.clientX, e.clientY); if (k) place(sel, k); else sel = -1; }
  });
  cv.addEventListener("pointermove", e => { if (drag) { drag.x = e.clientX; drag.y = e.clientY; } });
  const endDrag = e => {
    if (!drag) return;
    const moved = Math.hypot(drag.x - drag.sx, drag.y - drag.sy), i = drag.i;
    const k = hoverCell(drag.x, drag.y - dragLift()); drag = null;
    if (moved < 10) { sel = sel === i ? -1 : i; return; }
    if (k) place(i, k); else Sound.play("back");
  };
  cv.addEventListener("pointerup", endDrag); cv.addEventListener("pointercancel", () => { drag = null; });
  addEventListener("resize", resize);

  let last = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    if (mode !== "paused" && mode !== "idle") try { update(dt); } catch (e) { console.error(e); }
    if (L && VW) try { render(); } catch (e) { console.error(e); }
  }
  function start(n, seed) { load(n, { seed }); mode = "play"; }
  function attract() { load(4 + Math.floor(Math.random() * 6), { bot: true }); mode = "attract"; botT = 1; }
  resize(); requestAnimationFrame(frame);

  return {
    on, start, attract, place, smash, swapTray, reviveClear,
    setHammer(v) { hammer = v; }, setBoard(id) { boardId = id; if (L) bake(); },
    pause(p) { if (p && mode === "play") mode = "paused"; else if (!p && mode === "paused") { mode = "play"; last = 0; } },
    step(dt = 1 / 60, n = 1) { for (let i = 0; i < n; i++) update(dt); },
    busy, bestMove: () => RU.bestMove(st), trayXY, cellXY, dragLift: () => dragLift(),
    get mode() { return mode; }, set mode(v) { mode = v; }, get level() { return L; }, get state() { return st; }, get hammer() { return hammer; }
  };
})();

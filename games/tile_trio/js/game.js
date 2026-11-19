/* TILE TRIO — game: tiles flying to the tray, triples popping, the shelf, and all the drawing.
   The rules (js/rules.js) change instantly; every tile here has a shown position that flies / slides
   to where the rules put it. The tray has its own shown order so cleared tiles can land, squash
   together and pop before the rest slide over. */
window.Game = (() => {
  const C = window.GAME_CONFIG, RU = window.Rules;
  const cv = document.getElementById("view"), ctx = cv.getContext("2d");
  const TAU = Math.PI * 2;
  let DPR = 1, VW = 0, VH = 0, tw = 50, th = 58, dz = 4, x0 = 0, y0 = 0, u = 1, slot = 46, trayY = 0, shelfY = 0;
  const on = {};
  let mode = "idle", L = null, st = null, vis = [], vtray = [], parts = [], texts = [], t = 0, shake = 0, trayShake = 0, endT = 0, ending = null, combo = 0, comboT = 0;
  let bot = false, botT = 0, styleId = C.tileStyles[0].id, sprites = {}, bg = null, set = C.sets[0], hand = null, elapsed = 0;

  const hex2 = h => { const n = parseInt(h.slice(1), 16); return [n >> 16, n >> 8 & 255, n & 255]; };
  const mix = (a, b, q) => { const p = hex2(a), r = hex2(b); return `rgb(${p.map((v, i) => Math.round(v + (r[i] - v) * q)).join(",")})`; };
  const ease = x => x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2;
  const back = x => { const c = 1.7; return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2; };
  function canvasOf(w, h) { const c = document.createElement("canvas"); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
  function rr(g, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

  /* ---------- layout ---------- */
  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1); VW = innerWidth; VH = innerHeight;
    cv.width = VW * DPR; cv.height = VH * DPR; cv.style.width = VW + "px"; cv.style.height = VH + "px";
    u = Math.min(VW / 400, VH / 820, 1.3);
    if (L) layout();
  }
  function layout() {
    const maxZ = Math.max(...L.tiles.map(x => x.z)), top = 78, bottom = VH - 262;
    dz = Math.max(3, 4 * u);
    tw = Math.min((VW - 20 - maxZ * dz) / (L.cols + 0.3), (bottom - top - maxZ * dz) / ((L.rows + 0.3) * 1.16), 64 * u);
    th = tw * 1.16;
    const bw = L.cols * tw, bh = L.rows * th;
    x0 = (VW - bw) / 2 + maxZ * dz / 2; y0 = top + (bottom - top - bh) / 2 + maxZ * dz / 2;
    slot = Math.min((VW - 36) / C.traySlots, 56 * u);
    trayY = VH - 150; shelfY = trayY - slot * 1.45;
    bake();
  }
  const boardXY = tl => [x0 + tl.x / 2 * tw + tw / 2 - tl.z * dz, y0 + tl.y / 2 * th + th / 2 - tl.z * dz];
  const trayXY = i => [VW / 2 + (i - (C.traySlots - 1) / 2) * slot, trayY];
  const shelfXY = i => [VW / 2 + (i - (C.shelfSlots - 1) / 2) * slot * 1.1, shelfY];

  /* ---------- sprites ---------- */
  function bakeTile(kind, w, h, dim) {
    const S = C.tileStyles.find(x => x.id === styleId) || C.tileStyles[0], depth = Math.max(3, w * 0.09), r = w * 0.18;
    const c = canvasOf((w + depth + 4) * DPR, (h + depth + 4) * DPR), g = c.getContext("2d"); g.scale(DPR, DPR);
    // side (thickness)
    rr(g, 2 + depth * 0.6, 2 + depth, w, h, r); g.fillStyle = S.edge; g.fill();
    rr(g, 2 + depth * 0.3, 2 + depth * 0.5, w, h, r); g.fillStyle = mix(S.edge, "#ffffff", 0.2); g.fill();
    // face
    rr(g, 2, 2, w, h, r); const fg = g.createLinearGradient(0, 2, 0, 2 + h); fg.addColorStop(0, S.face[0]); fg.addColorStop(1, S.face[1]); g.fillStyle = fg; g.fill();
    g.lineWidth = 1.4; g.strokeStyle = S.line; g.stroke();
    rr(g, 2 + w * 0.08, 2 + h * 0.06, w * 0.84, h * 0.86, r * 0.8); g.strokeStyle = "rgba(255,255,255,0.7)"; g.lineWidth = 1.2; g.stroke();
    // picture
    const em = set.tiles[kind] || "?";
    g.font = `${Math.round(w * 0.62)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(em, 2 + w / 2, 2 + h * 0.53);
    if (dim) { rr(g, 2, 2, w, h, r); g.fillStyle = "rgba(40,30,25,0.3)"; g.fill(); }
    return { c, w: w + depth + 4, h: h + depth + 4 };
  }
  function bake() {
    if (!L || !VW) return;
    sprites = { board: {}, dim: {}, tray: {} };
    for (let k = 0; k < L.kinds; k++) { sprites.board[k] = bakeTile(k, tw * 0.94, th * 0.94, false); sprites.dim[k] = bakeTile(k, tw * 0.94, th * 0.94, true); sprites.tray[k] = bakeTile(k, slot * 0.86, slot * 0.86 * 1.12, false); }
    bg = canvasOf(VW * DPR, VH * DPR); const g = bg.getContext("2d"); g.scale(DPR, DPR);
    const gr = g.createLinearGradient(0, 0, VW * 0.3, VH); gr.addColorStop(0, set.bg[0]); gr.addColorStop(1, set.bg[1]); g.fillStyle = gr; g.fillRect(0, 0, VW, VH);
    let sd = L.n * 31 + 7; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    g.globalAlpha = 0.1; g.textAlign = "center"; g.textBaseline = "middle";
    for (let i = 0; i < 26; i++) { g.save(); g.translate(rnd() * VW, rnd() * VH); g.rotate((rnd() - 0.5) * 0.8); g.font = `${Math.round((26 + rnd() * 30) * u)}px "Apple Color Emoji","Noto Color Emoji",sans-serif`; g.fillText(set.tiles[Math.floor(rnd() * set.tiles.length)], 0, 0); g.restore(); }
    g.globalAlpha = 1;
    for (let i = 0; i < 7; i++) { const x = rnd() * VW, y = rnd() * VH, r = (60 + rnd() * 90) * u, rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, "rgba(255,255,255,0.28)"); rg.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = rg; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
    // tray
    const tw7 = slot * C.traySlots + 16 * u, tx = (VW - tw7) / 2, ty = trayY - slot * 0.72;
    g.save(); g.shadowColor = "rgba(80,40,20,0.35)"; g.shadowBlur = 16 * u; g.shadowOffsetY = 8 * u;
    rr(g, tx, ty, tw7, slot * 1.44, 18 * u); const wg = g.createLinearGradient(0, ty, 0, ty + slot * 1.44); wg.addColorStop(0, "#c98a52"); wg.addColorStop(1, "#8f5a30"); g.fillStyle = wg; g.fill(); g.restore();
    rr(g, tx + 4, ty + 4, tw7 - 8, slot * 1.44 - 8, 15 * u); g.strokeStyle = "rgba(255,230,190,0.45)"; g.lineWidth = 2; g.stroke();
    for (let i = 0; i < C.traySlots; i++) { const [x, y] = trayXY(i); rr(g, x - slot * 0.45, y - slot * 0.55, slot * 0.9, slot * 1.1, 10 * u); g.fillStyle = "rgba(60,30,10,0.35)"; g.fill(); }
  }

  /* ---------- level ---------- */
  function load(n, opts = {}) {
    L = RU.level(n); set = C.sets.find(s => s.id === L.set) || C.sets[0]; bot = !!opts.bot; st = RU.newState(L);
    vis = st.tiles.map(tl => ({ id: tl.id, fly: null, clear: 0, gone: false, shakeT: 0, spin: 0 }));
    vtray = []; parts = []; texts = []; t = 0; shake = 0; trayShake = 0; endT = 0; ending = null; combo = 0; elapsed = 0;
    hand = n === 1 && !bot ? { t: 0 } : null;
    layout();
    for (const v of vis) { const [x, y] = boardXY(st.tiles[v.id]); v.x = x; v.y = y; v.s = 1; }
  }
  function targetOf(id) {
    const tl = st.tiles[id];
    const vi = vtray.indexOf(id);
    if (vi >= 0) return { x: trayXY(vi)[0], y: trayXY(vi)[1], s: slot * 0.86 / (tw * 0.94), where: "tray" };
    if (tl.at === "shelf") { const [x, y] = shelfXY(st.shelf.indexOf(id)); return { x, y, s: slot * 0.86 / (tw * 0.94), where: "shelf" }; }
    const [x, y] = boardXY(tl); return { x, y, s: 1, where: "board" };
  }

  /* ---------- actions ---------- */
  function take(id) {
    if (mode !== "play" && mode !== "attract") return false;
    if (!RU.isFree(st, id)) { vis[id].shakeT = 0.35; Sound.play("blocked"); return false; }
    const before = st.tiles[id].at, res = RU.take(st, id); if (!res) return false;
    hand = null;
    // shown tray: slot after the last shown tile with the same picture
    let at = vtray.length; for (let i = vtray.length - 1; i >= 0; i--) if (st.tiles[vtray[i]].kind === st.tiles[id].kind) { at = i + 1; break; }
    vtray.splice(at, 0, id);
    const v = vis[id]; v.fly = { t: 0, fx: v.x, fy: v.y, fs: v.s, dur: 0.3, onLand: res.cleared };
    Sound.play("take");
    if (res.won) ending = "win";
    if (res.lost) ending = "lose";
    return true;
  }
  function undo() { if (mode !== "play") return false; const id = RU.undo(st); if (id == null) return false; vtray = vtray.filter(x => x !== id); const v = vis[id]; v.fly = { t: 0, fx: v.x, fy: v.y, fs: v.s, dur: 0.3 }; ending = null; Sound.play("undo"); return true; }
  function popOut() { if (mode !== "play" && mode !== "lost") return false; const moved = RU.pop(st); if (!moved) return false; for (const id of moved) { vtray = vtray.filter(x => x !== id); const v = vis[id]; v.fly = { t: 0, fx: v.x, fy: v.y, fs: v.s, dur: 0.35 }; } ending = null; Sound.play("pop"); return true; }
  function shuffle() { if (mode !== "play") return false; const ids = RU.shuffle(st); if (!ids.length) return false; for (const id of ids) vis[id].spin = 0.5; Sound.play("shuffle"); return true; }
  function revive() { mode = "play"; popOut(); endT = 0; }

  /* ---------- update ---------- */
  function update(dt) {
    t += dt; shake = Math.max(0, shake - dt); trayShake = Math.max(0, trayShake - dt); comboT -= dt; if (comboT <= 0) combo = 0;
    if (mode === "play") elapsed += dt;
    if (hand) hand.t += dt;
    let flying = false;
    for (const v of vis) {
      if (v.gone) continue;
      v.shakeT = Math.max(0, v.shakeT - dt); v.spin = Math.max(0, v.spin - dt);
      const tg = targetOf(v.id);
      if (v.fly) {
        flying = true; v.fly.t += dt; const e = Math.min(1, v.fly.t / v.fly.dur), q = ease(e);
        v.x = v.fly.fx + (tg.x - v.fly.fx) * q; v.y = v.fly.fy + (tg.y - v.fly.fy) * q - Math.sin(e * Math.PI) * 70 * u; v.s = v.fly.fs + (tg.s - v.fly.fs) * q;
        if (e >= 1) { const cl = v.fly.onLand; v.fly = null; v.land = 0.15; Sound.play("land"); if (cl) startClear(cl); }
      } else if (v.clear > 0) {
        flying = true; v.clear += dt;
        const mid = v.clearMid; if (mid) { const q = Math.min(1, v.clear / 0.2); v.x += (mid[0] - v.x) * q * 0.5; v.y += (mid[1] - v.y) * q * 0.5; }
        if (v.clear > 0.26) finishClear(v);
      } else {
        // slide to the target (tray tiles shuffle along when something lands or leaves)
        v.x += (tg.x - v.x) * Math.min(1, dt * 16); v.y += (tg.y - v.y) * Math.min(1, dt * 16); v.s += (tg.s - v.s) * Math.min(1, dt * 16);
      }
      if (v.land) v.land = Math.max(0, v.land - dt);
    }
    for (const q of parts) { q.t += dt; q.vy += (q.g || 0) * dt; q.x += q.vx * dt; q.y += q.vy * dt; if (q.vr) q.r += q.vr * dt; }
    parts = parts.filter(q => q.t < q.life);
    for (const x of texts) x.t += dt; texts = texts.filter(x => x.t < 1.1);
    if (ending && !flying && (mode === "play" || mode === "attract")) {
      endT += dt;
      if (endT > 0.35) {
        if (mode === "attract") { attract(); return; }
        if (ending === "win") { mode = "won"; Sound.play("win"); confetti(); on.win && on.win(L, elapsed); }
        else { mode = "lost"; trayShake = 0.5; Sound.play("lose"); on.lose && on.lose(L); }
        ending = null; endT = 0;
      }
    }
    if (mode === "attract" && !ending) { botT -= dt; if (botT <= 0) { botT = 0.5; const id = RU.botPick(st); if (id >= 0) take(id); } }
  }
  function startClear(ids) {
    const pos = ids.map(id => [vis[id].x, vis[id].y]), mid = pos[1] || pos[0];
    ids.forEach(id => { vis[id].clear = 0.0001; vis[id].clearMid = mid; vis[id].fly = null; });
    combo++; comboT = 2.4;
    Sound.play("match", combo);
  }
  function finishClear(v) {
    v.clear = 0; v.gone = true; vtray = vtray.filter(x => x !== v.id);
    if (v.clearMid && v.id === Math.max(...vis.filter(o => o.clearMid === v.clearMid).map(o => o.id))) {
      const [x, y] = v.clearMid;
      for (let i = 0; i < 18; i++) { const a = Math.random() * TAU, sp = 120 + Math.random() * 260; parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80, t: 0, life: 0.6, s: (3 + Math.random() * 4) * u, col: ["#ffd23f", "#ffffff", "#ff8fb0", "#7fd6ff"][i % 4], g: 600, star: i % 3 === 0 }); }
      const words = ["", "", "NICE!", "GREAT!", "SUPER!", "AMAZING!"];
      if (combo >= 2) texts.push({ x, y: y - slot, s: words[Math.min(5, combo)], t: 0, big: true });
    }
  }
  function confetti() { const cols = ["#ff5a6e", "#4d9bff", "#ffcf3d", "#46d47e", "#a77bff", "#ff9640"]; for (let i = 0; i < 120; i++) parts.push({ x: Math.random() * VW, y: -20 - Math.random() * 200, vx: (Math.random() - 0.5) * 160, vy: 120 + Math.random() * 160, t: 0, life: 3, s: (5 + Math.random() * 5) * u, col: cols[i % cols.length], g: 150, rect: true, r: 0, vr: (Math.random() - 0.5) * 12 }); }

  /* ---------- render ---------- */
  function drawTile(v) {
    const tl = st.tiles[v.id], inTray = targetOf(v.id).where !== "board" || v.fly;
    const free = RU.isFree(st, v.id) || tl.at !== "board";
    const sp = (tl.at === "board" && !v.fly && !free) ? sprites.dim[tl.kind] : sprites.board[tl.kind];
    let sc = v.s, x = v.x, y = v.y;
    if (v.shakeT > 0) x += Math.sin(v.shakeT * 60) * 3 * u;
    if (v.land) sc *= 1 + Math.sin(v.land / 0.15 * Math.PI) * 0.12;
    if (v.clear > 0) sc *= Math.max(0.01, 1 + Math.sin(Math.min(1, v.clear / 0.26) * Math.PI) * 0.25 - Math.max(0, v.clear - 0.15) * 6);
    let sx = sc; if (v.spin > 0) sx *= Math.abs(Math.cos((0.5 - v.spin) / 0.5 * Math.PI));
    const w = sp.w / DPR * DPR, h = sp.h / DPR * DPR;
    ctx.save(); ctx.translate(x, y); ctx.scale(sx, sc);
    ctx.drawImage(sp.c, -sp.w / 2, -sp.h / 2, sp.w, sp.h);
    ctx.restore();
  }
  function render() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    let ox = 0, oy = 0; if (shake > 0) { ox = (Math.random() - 0.5) * shake * 12; oy = (Math.random() - 0.5) * shake * 12; }
    ctx.drawImage(bg, 0, 0, VW, VH);
    ctx.save(); ctx.translate(ox, oy);
    // board tiles, bottom layer first, back rows first
    const board = vis.filter(v => !v.gone && !v.fly && v.clear <= 0 && targetOf(v.id).where === "board").sort((a, b) => { const A = st.tiles[a.id], B = st.tiles[b.id]; return A.z - B.z || A.y - B.y || A.x - B.x; });
    for (const v of board) drawTile(v);
    // shelf
    if (st.shelf.some(x => x !== null) || vis.some(v => v.fly && st.tiles[v.id].at === "shelf")) {
      for (let i = 0; i < C.shelfSlots; i++) { const [x, y] = shelfXY(i); rr(ctx, x - slot * 0.5, y - slot * 0.6, slot, slot * 1.2, 10 * u); ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.fill(); }
    }
    ctx.restore();
    // tray + shelf tiles
    let tx = 0; if (trayShake > 0) tx = Math.sin(trayShake * 50) * 6 * u;
    ctx.save(); ctx.translate(tx, 0);
    if (vtray.length >= C.traySlots - 1 && mode === "play") { const tw7 = slot * C.traySlots + 16 * u; rr(ctx, (VW - tw7) / 2, trayY - slot * 0.72, tw7, slot * 1.44, 18 * u); ctx.strokeStyle = `rgba(255,77,94,${0.55 + 0.45 * Math.sin(t * 10)})`; ctx.lineWidth = 4; ctx.stroke(); }
    for (const v of vis) if (!v.gone && !v.fly && targetOf(v.id).where !== "board") drawTile(v);
    ctx.restore();
    for (const v of vis) if (!v.gone && (v.fly || v.clear > 0)) drawTile(v);
    // particles + texts
    for (const q of parts) {
      const a = 1 - q.t / q.life; ctx.globalAlpha = Math.max(0, Math.min(1, a * 1.5)); ctx.fillStyle = q.col;
      if (q.rect) { ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.r || 0); ctx.fillRect(-q.s / 2, -q.s / 4, q.s, q.s / 2); ctx.restore(); }
      else if (q.star) { ctx.save(); ctx.translate(q.x, q.y); ctx.beginPath(); for (let i = 0; i < 10; i++) { const a2 = i / 10 * TAU, r = i % 2 ? q.s * 0.45 : q.s; ctx[i ? "lineTo" : "moveTo"](Math.cos(a2) * r, Math.sin(a2) * r); } ctx.fill(); ctx.restore(); }
      else { ctx.beginPath(); ctx.arc(q.x, q.y, q.s / 2, 0, TAU); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
    for (const x of texts) {
      const e = x.t / 1.1, sz = (x.big ? 30 : 20) * u * (x.t < 0.15 ? back(x.t / 0.15) : 1);
      ctx.globalAlpha = 1 - Math.max(0, e - 0.6) / 0.4; ctx.font = `900 ${Math.round(sz)}px ui-rounded, system-ui, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.lineWidth = 6 * u; ctx.strokeStyle = "#3a2a1e"; ctx.strokeText(x.s, x.x, x.y - e * 36 * u); ctx.fillStyle = "#fff59a"; ctx.fillText(x.s, x.x, x.y - e * 36 * u);
    }
    ctx.globalAlpha = 1;
    if (hand && mode === "play") { const id = RU.botPick(st); if (id >= 0) { const v = vis[id]; drawHand(v.x + tw * 0.2, v.y + th * 0.25 + Math.sin(t * 5) * 6 * u); } }
  }
  function drawHand(x, y) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(-0.4); const q = u * 1.1;
    ctx.fillStyle = "#ffffff"; ctx.strokeStyle = "#3a2a1e"; ctx.lineWidth = 3 * q; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(-6 * q, 0); ctx.lineTo(-6 * q, -26 * q); ctx.quadraticCurveTo(0, -34 * q, 6 * q, -26 * q); ctx.lineTo(6 * q, -8 * q); ctx.lineTo(18 * q, -6 * q); ctx.quadraticCurveTo(26 * q, 0, 22 * q, 14 * q); ctx.lineTo(16 * q, 30 * q); ctx.lineTo(-8 * q, 30 * q); ctx.lineTo(-16 * q, 8 * q); ctx.quadraticCurveTo(-14 * q, 0, -6 * q, 4 * q); ctx.closePath();
    ctx.fill(); ctx.stroke(); ctx.restore();
  }

  /* ---------- input: tap the topmost tile under the finger ---------- */
  function tileAt(px, py) {
    let best = null;
    for (const v of vis) {
      if (v.gone || v.fly || v.clear > 0) continue;
      const tl = st.tiles[v.id]; if (tl.at === "tray") continue;
      const w = (tl.at === "shelf" ? slot * 0.86 : tw * 0.94) / 2, h = (tl.at === "shelf" ? slot * 0.96 : th * 0.94) / 2;
      if (Math.abs(px - v.x) < w && Math.abs(py - v.y) < h) { const z = tl.at === "shelf" ? 99 : tl.z; if (!best || z > best.z) best = { id: v.id, z }; }
    }
    return best ? best.id : -1;
  }
  cv.addEventListener("pointerdown", e => { Sound.unlock(); if (mode !== "play") return; const id = tileAt(e.clientX, e.clientY); if (id >= 0) take(id); });
  addEventListener("resize", resize);

  let last = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    if (mode !== "paused" && mode !== "idle") try { update(dt); } catch (e) { console.error(e); }
    if (L && VW) try { render(); } catch (e) { console.error(e); }
  }
  function start(n) { load(n); mode = "play"; }
  function attract() { load(3 + Math.floor(Math.random() * 6), { bot: true }); mode = "attract"; botT = 1; }
  resize(); requestAnimationFrame(frame);

  return {
    on, start, attract, take, undo, popOut, shuffle, revive,
    setStyle(id) { styleId = id; if (L) bake(); },
    pause(p) { if (p && mode === "play") mode = "paused"; else if (!p && mode === "paused") { mode = "play"; last = 0; } },
    step(dt = 1 / 60, n = 1) { for (let i = 0; i < n; i++) update(dt); },
    busy: () => vis.some(v => v.fly || v.clear > 0) || !!ending,
    botPick: () => RU.botPick(st), tileXY: id => [vis[id].x, vis[id].y],
    get mode() { return mode; }, set mode(v) { mode = v; }, get level() { return L; }, get state() { return st; }, get elapsed() { return elapsed; }
  };
})();

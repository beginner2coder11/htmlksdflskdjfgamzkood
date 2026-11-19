/* COLOR BY NUMBER — the colouring canvas: tap or drag to paint, pinch / scroll to zoom, drag to pan when zoomed
   out (tap to zoom in), boosters (bucket fill, blast, find), wrong-colour marks, pops while you paint, and the
   time-lapse replay of a finished picture. The picture is held as a tiny N × N image scaled up without
   smoothing, so even 48 × 48 pictures draw fast; numbers are drawn only for the cells on screen. */
window.Game = (() => {
  const C = window.GAME_CONFIG;
  const cv = document.getElementById("view"), ctx = cv.getContext("2d");
  const on = {};
  let DPR = 1, VW = 0, VH = 0, TOP = 70, BOT = 150;
  let P = null, N = 0, paint = null, wrongC = null, order = [], left = [], sel = 0, def = null;
  let pix = document.createElement("canvas"), pctx = pix.getContext("2d"), img = null;
  let s = 10, ox = 0, oy = 0, fitS = 10, anim = null, armed = null, mode = "idle", t = 0;
  let pops = new Map(), rings = [], replay = null, dirty = false;
  const NUM_AT = 14;

  /* ---------- layout ---------- */
  function resize() {
    DPR = Math.min(2.5, window.devicePixelRatio || 1); VW = innerWidth; VH = innerHeight;
    cv.width = VW * DPR; cv.height = VH * DPR; cv.style.width = VW + "px"; cv.style.height = VH + "px";
    const top = document.querySelector(".pbar"), bot = document.querySelector(".pbottom");
    TOP = top ? top.getBoundingClientRect().bottom + 8 : 70; BOT = bot ? VH - bot.getBoundingClientRect().top + 8 : 150;
    if (P) { const old = fitS; fit(false); if (old && s < fitS) { s = fitS; center(); } clampView(); }
  }
  addEventListener("resize", resize);
  function fit(apply = true) {
    const aw = VW - 24, ah = VH - TOP - BOT; fitS = Math.max(2, Math.min(aw / N, ah / N));
    if (apply) { s = fitS; center(); }
  }
  function center() { ox = (VW - N * s) / 2; oy = TOP + (VH - TOP - BOT - N * s) / 2; }
  const sMax = () => Math.max(fitS * 6, 48);
  function clampView() {
    s = Math.max(fitS * 0.9, Math.min(sMax(), s));
    const W = N * s, aw = VW, ah = VH - TOP - BOT, mx = 60;
    if (W <= aw) ox = (VW - W) / 2; else ox = Math.min(mx, Math.max(VW - W - mx, ox));
    if (W <= ah) oy = TOP + (ah - W) / 2; else oy = Math.min(TOP + mx, Math.max(VH - BOT - W - mx, oy));
  }
  function zoomAt(px, py, ns) { const k = ns / s; ox = px - (px - ox) * k; oy = py - (py - oy) * k; s = ns; clampView(); }
  function animateTo(ns, cx, cy) {     // put grid point (cx, cy) in cells at the centre of the paint area at scale ns
    const from = { s, ox, oy }; ns = Math.max(fitS, Math.min(sMax(), ns));
    const tx = VW / 2 - cx * ns, ty = TOP + (VH - TOP - BOT) / 2 - cy * ns;
    anim = { t: 0, d: 0.35, from, to: { s: ns, ox: tx, oy: ty } };
  }

  /* ---------- picture ---------- */
  function start(d, saved) {
    def = d; P = Pictures.build(d); N = P.n;
    paint = new Uint8Array(N * N); wrongC = new Uint8Array(N * N); order = []; left = P.pal.map(() => 0);
    for (let i = 0; i < N * N; i++) left[P.cells[i]]++;
    if (saved) {
      for (let k = 0; k + 2 < saved.o.length + 1; k += 3) { const i = parseInt(saved.o.substr(k, 3), 36); if (i >= 0 && i < N * N && !paint[i]) { paint[i] = 1; order.push(i); left[P.cells[i]]--; } }
      (saved.w || "").split(",").filter(Boolean).forEach(p => { const [i, c] = p.split(":").map(Number); if (!paint[i]) { paint[i] = 2; wrongC[i] = c; } });
    }
    pix.width = pix.height = N; img = pctx.createImageData(N, N);
    sel = left.findIndex(v => v > 0); if (sel < 0) sel = 0;
    pops = new Map(); rings = []; replay = null; armed = null; anim = null;
    resize(); fit();
    redrawAll(); mode = "paint"; dirty = true;
    emit();
  }
  function cellRGB(i) {
    const c = P.cells[i];
    if (paint[i] === 1) return P.rgb[c];
    const l = P.lum[c];
    if (paint[i] === 2) { const w = P.rgb[wrongC[i]]; return [w[0] * 0.45 + 255 * 0.55, w[1] * 0.45 + 255 * 0.55, w[2] * 0.45 + 255 * 0.55]; }
    if (c === sel && mode !== "replay") { const k = 1 - l; return [212 - k * 40, 200 - k * 40, 246 - k * 26]; }
    const g = 248 - (1 - l) * 52; return [g, g, g + 4];
  }
  function setCell(i) { const [r, g, b] = cellRGB(i), o = i * 4; img.data[o] = r; img.data[o + 1] = g; img.data[o + 2] = b; img.data[o + 3] = 255; dirty = true; }
  function redrawAll() { for (let i = 0; i < N * N; i++) setCell(i); }
  function flush() { if (dirty && img) { pctx.putImageData(img, 0, 0); dirty = false; } }

  function select(c) { if (!P || c === sel || c < 0 || c >= P.pal.length) return; sel = c; for (let i = 0; i < N * N; i++) if (paint[i] !== 1) setCell(i); emit(); }
  function serialize() { return { o: order.map(i => i.toString(36).padStart(3, "0")).join(""), w: [...paint.keys()].filter(i => paint[i] === 2).map(i => i + ":" + wrongC[i]).join(",") }; }
  let emitQ = false;
  function emit() { if (emitQ) return; emitQ = true; requestAnimationFrame(() => { emitQ = false; if (P) on.progress && on.progress({ sel, left: left.slice(), total: N * N, done: order.length, pal: P.pal }); }); }

  function paintCell(i, viaBoost) {
    if (i < 0 || paint[i] === 1) return false;
    const c = P.cells[i];
    if (viaBoost || c === sel) {
      paint[i] = 1; order.push(i); left[c]--; setCell(i); pops.set(i, viaBoost ? -viaBoost : 0);
      if (!viaBoost) Sound.play("paint");
      if (left[c] === 0) colorDone(c);
      return true;
    }
    if (!C.allowWrong || (paint[i] === 2 && wrongC[i] === sel)) return false;
    paint[i] = 2; wrongC[i] = sel; setCell(i); Sound.play("wrong"); return false;
  }
  function colorDone(c) {
    Sound.play("color"); on.colorDone && on.colorDone(c);
    if (left.every(v => v === 0)) { setTimeout(finish, 450); return; }
    if (c === sel) { let n = c; for (let k = 1; k <= left.length; k++) { const j = (c + k) % left.length; if (left[j] > 0) { n = j; break; } } setTimeout(() => select(n), 250); }
  }
  function after() { emit(); on.change && on.change(); }

  /* ---------- boosters ---------- */
  function arm(b) { armed = armed === b ? null : b; return armed; }
  function bucket(i) {
    const c = P.cells[i], seen = new Uint8Array(N * N), q = [i]; seen[i] = 1; let k = 0, n = 0;
    while (k < q.length) { const j = q[k++], x = j % N, y = (j / N) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, m = ny * N + nx; if (nx < 0 || ny < 0 || nx >= N || ny >= N || seen[m] || P.cells[m] !== c) continue; seen[m] = 1; q.push(m); } }
    q.forEach((j, idx) => { if (paint[j] !== 1) { paintCell(j, 0.01 + Math.min(0.6, idx * 0.004)); n++; } });
    return n;
  }
  function blast(i) {
    const x0 = i % N, y0 = (i / N) | 0; let n = 0;
    for (let y = y0 - 3; y <= y0 + 3; y++) for (let x = x0 - 3; x <= x0 + 3; x++) { if (x < 0 || y < 0 || x >= N || y >= N) continue; const j = y * N + x; if (paint[j] !== 1) { paintCell(j, 0.01 + Math.hypot(x - x0, y - y0) * 0.04); n++; } }
    rings.push({ x: x0 + 0.5, y: y0 + 0.5, t: 0, r: 4, col: "#ffc93d" });
    return n;
  }
  function find() {
    if (!P) return false;
    let c = sel; if (left[c] <= 0) { c = left.findIndex(v => v > 0); if (c < 0) return false; select(c); }
    const vx = (VW / 2 - ox) / s, vy = (TOP + (VH - TOP - BOT) / 2 - oy) / s; let best = -1, bd = 1e9;
    for (let i = 0; i < N * N; i++) if (paint[i] !== 1 && P.cells[i] === c) { const d = Math.hypot(i % N + 0.5 - vx, ((i / N) | 0) + 0.5 - vy); if (d < bd) { bd = d; best = i; } }
    if (best < 0) return false;
    const x = best % N + 0.5, y = ((best / N) | 0) + 0.5;
    animateTo(Math.max(s, 28), x, y); rings.push({ x, y, t: 0, r: 1.2, col: "#8b5cf6", find: true }); Sound.play("zoom");
    return true;
  }
  function useArmed(i) {
    const b = armed; armed = null; let n = 0;
    if (b === "bucket") n = bucket(i); else if (b === "blast") n = blast(i);
    if (n) { Sound.play("boost"); on.boosterUsed && on.boosterUsed(b); after(); } else on.boosterUsed && on.boosterUsed(null);
  }

  /* ---------- finish + replay ---------- */
  function finish() {
    mode = "replay"; armed = null; const W = Math.min(VW - 48, VH - TOP - BOT - 20); replay = { t: 0, dur: Math.min(4.2, 1.6 + order.length / 700), W };
    for (let i = 0; i < N * N; i++) setCell(i);
    Sound.play("replay"); on.finished && on.finished();
  }
  function showReplay(d, saved) { start(d, saved); finish(); }

  /* ---------- input ---------- */
  const pts = new Map(); let g = null;
  const cellAt = (x, y) => { const cx = Math.floor((x - ox) / s), cy = Math.floor((y - oy) / s); return cx >= 0 && cy >= 0 && cx < N && cy < N ? cy * N + cx : -1; };
  function paintTo(x, y) {
    const i = cellAt(x, y); if (i < 0) { g.last = -1; return; }
    if (g.last >= 0 && g.last !== i) {           // fill in cells skipped by a fast drag
      let x0 = g.last % N, y0 = (g.last / N) | 0; const x1 = i % N, y1 = (i / N) | 0, dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy;
      for (let k = 0; k < 200 && !(x0 === x1 && y0 === y1); k++) { const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } paintCell(y0 * N + x0); }
    } else paintCell(i);
    g.last = i; after();
  }
  cv.addEventListener("pointerdown", e => {
    Sound.unlock(); if (mode !== "paint") return;
    try { cv.setPointerCapture(e.pointerId); } catch (er) {}
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2) { if (g && g.timer) clearTimeout(g.timer); const [a, b] = [...pts.values()]; g = { kind: "pinch", d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, s0: s, ox0: ox, oy0: oy }; return; }
    if (pts.size > 2) return;
    const pan = e.button === 1 || e.button === 2 || (s < NUM_AT && !armed);
    g = { kind: pan ? "pan" : "paint", x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, t0: performance.now(), moved: false, last: -1, started: false, ox0: ox, oy0: oy, mouse: e.pointerType === "mouse" };
    if (g.kind === "paint") {
      if (armed) { const i = cellAt(e.clientX, e.clientY); g.kind = "none"; if (i >= 0) useArmed(i); return; }
      const begin = () => { if (g && g.kind === "paint" && pts.size === 1) { g.started = true; paintTo(g.x, g.y); } };
      if (g.mouse) begin(); else g.timer = setTimeout(begin, 70);
    }
  });
  cv.addEventListener("pointermove", e => {
    if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (!g) return;
    if (g.kind === "pinch" && pts.size >= 2) {
      const [a, b] = [...pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const ns = Math.max(fitS * 0.9, Math.min(sMax(), g.s0 * d / g.d)), k = ns / g.s0;
      s = ns; ox = mx - (g.mx - g.ox0) * k; oy = my - (g.my - g.oy0) * k; clampView(); return;
    }
    g.x = e.clientX; g.y = e.clientY; if (Math.hypot(g.x - g.x0, g.y - g.y0) > 8) g.moved = true;
    if (g.kind === "pan") { ox = g.ox0 + g.x - g.x0; oy = g.oy0 + g.y - g.y0; clampView(); }
    else if (g.kind === "paint" && g.started) paintTo(g.x, g.y);
  });
  const up = e => {
    if (!pts.has(e.pointerId)) return; pts.delete(e.pointerId);
    if (g && g.kind === "pan" && !g.moved && performance.now() - g.t0 < 350 && s < NUM_AT) { const gx = (g.x - ox) / s, gy = (g.y - oy) / s; if (gx >= 0 && gy >= 0 && gx < N && gy < N) { animateTo(Math.max(NUM_AT * 1.7, fitS * 3), gx, gy); Sound.play("zoom"); } }
    if (g && g.kind === "paint" && !g.started && pts.size === 0) { clearTimeout(g.timer); g.started = true; paintTo(g.x, g.y); }
    if (pts.size === 0) { g = null; on.save && on.save(); }
    else if (g && g.kind === "pinch") g = null;
  };
  cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
  cv.addEventListener("contextmenu", e => e.preventDefault());
  cv.addEventListener("wheel", e => { if (mode !== "paint") return; e.preventDefault(); zoomAt(e.clientX, e.clientY, s * Math.exp(-e.deltaY * 0.0022)); }, { passive: false });

  /* ---------- drawing ---------- */
  function render(dt) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.clearRect(0, 0, VW, VH);
    if (!P) return;
    if (anim) { anim.t += dt; const k = Math.min(1, anim.t / anim.d), e = 1 - (1 - k) ** 3; s = anim.from.s + (anim.to.s - anim.from.s) * e; ox = anim.from.ox + (anim.to.ox - anim.from.ox) * e; oy = anim.from.oy + (anim.to.oy - anim.from.oy) * e; if (k >= 1) { anim = null; clampView(); } }
    if (mode === "replay") return drawReplay(dt);
    flush();
    const W = N * s;
    ctx.fillStyle = "rgba(60,40,110,0.16)"; ctx.fillRect(ox + 4, oy + 6, W, W);
    ctx.imageSmoothingEnabled = false; ctx.drawImage(pix, ox, oy, W, W);
    const x0 = Math.max(0, Math.floor(-ox / s)), x1 = Math.min(N, Math.ceil((VW - ox) / s)), y0 = Math.max(0, Math.floor((TOP - 20 - oy) / s)), y1 = Math.min(N, Math.ceil((VH - oy) / s));
    // pops: a freshly painted cell swells then settles
    for (const [i, v] of pops) {
      const tt = v < 0 ? v + dt : v + dt; pops.set(i, tt); if (tt > 0.32) { pops.delete(i); continue; } if (tt < 0) continue;
      const k = Math.sin(tt / 0.32 * Math.PI), x = ox + (i % N) * s, y = oy + ((i / N) | 0) * s, gr = s * 0.28 * k;
      const c = P.rgb[P.cells[i]]; ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`; ctx.fillRect(x - gr / 2, y - gr / 2, s + gr, s + gr);
      ctx.fillStyle = `rgba(255,255,255,${0.35 * k})`; ctx.fillRect(x - gr / 2, y - gr / 2, s + gr, (s + gr) * 0.4);
    }
    if (s >= 9) {
      ctx.strokeStyle = `rgba(90,80,130,${Math.min(0.28, (s - 9) * 0.03)})`; ctx.lineWidth = 1; ctx.beginPath();
      for (let x = x0; x <= x1; x++) { const px = Math.round(ox + x * s) + 0.5; ctx.moveTo(px, oy + y0 * s); ctx.lineTo(px, oy + y1 * s); }
      for (let y = y0; y <= y1; y++) { const py = Math.round(oy + y * s) + 0.5; ctx.moveTo(ox + x0 * s, py); ctx.lineTo(ox + x1 * s, py); }
      ctx.stroke();
    }
    if (s >= NUM_AT) {
      ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = `700 ${Math.round(s * (P.pal.length > 9 ? 0.42 : 0.48))}px ui-rounded, system-ui, sans-serif`;
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        const i = y * N + x; if (paint[i] === 1) continue;
        const c = P.cells[i]; ctx.fillStyle = c === sel ? "#3b2a7a" : paint[i] === 2 ? "#b02a3d" : "#8a84a3";
        ctx.fillText(c + 1, ox + (x + 0.5) * s, oy + (y + 0.54) * s);
      }
    }
    ctx.strokeStyle = "rgba(60,40,110,0.25)"; ctx.lineWidth = 1.5; ctx.strokeRect(ox - 0.75, oy - 0.75, W + 1.5, W + 1.5);
    for (const r of rings) { r.t += dt; const k = r.t / (r.find ? 1.6 : 0.6), x = ox + r.x * s, y = oy + r.y * s; ctx.strokeStyle = r.col; ctx.globalAlpha = Math.max(0, 1 - k); ctx.lineWidth = r.find ? 4 : 6; ctx.beginPath(); ctx.arc(x, y, s * (r.find ? r.r + Math.sin(r.t * 8) * 0.3 : r.r * (0.4 + k)), 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1; }
    rings = rings.filter(r => r.t < (r.find ? 1.6 : 0.6));
  }
  function drawReplay(dt) {
    const R = replay; R.t += dt; const W = R.W, x0 = (VW - W) / 2, y0 = TOP + (VH - TOP - BOT - W) / 2, cs = W / N;
    const k = Math.min(1, R.t / R.dur), shown = Math.floor(order.length * (k < 1 ? k * k * (3 - 2 * k) : 1));
    ctx.fillStyle = "rgba(60,40,110,0.18)"; ctx.fillRect(x0 + 6, y0 + 10, W, W); ctx.fillStyle = "#ffffff"; ctx.fillRect(x0 - 10, y0 - 10, W + 20, W + 20);
    ctx.fillStyle = "#f2eff8"; ctx.fillRect(x0, y0, W, W);
    for (let n = 0; n < shown; n++) { const i = order[n], c = P.rgb[P.cells[i]]; ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`; ctx.fillRect(x0 + (i % N) * cs - 0.3, y0 + ((i / N) | 0) * cs - 0.3, cs + 0.6, cs + 0.6); }
    if (k >= 1 && !R.told) { R.told = true; Sound.play("win"); on.complete && on.complete(); }
    if (k >= 1) { const a = Math.max(0, 1 - (R.t - R.dur) / 0.6); if (a > 0) { ctx.fillStyle = `rgba(255,255,255,${a * 0.6})`; ctx.fillRect(x0, y0, W, W); } }
  }

  let last = 0;
  function frame(now) { requestAnimationFrame(frame); const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now; t += dt; if (document.body.dataset.at === "paint") try { render(dt); } catch (e) { console.error(e); } }
  resize(); requestAnimationFrame(frame);

  // a small picture of a saved picture (painted cells in colour, the rest faint grey)
  function thumb(d, saved, canvas) {
    const p = Pictures.build(d), n = p.n; canvas.width = canvas.height = n; const c = canvas.getContext("2d"), im = c.createImageData(n, n), done = new Uint8Array(n * n);
    if (saved) for (let k = 0; k < saved.o.length; k += 3) { const i = parseInt(saved.o.substr(k, 3), 36); if (i < n * n) done[i] = 1; }
    for (let i = 0; i < n * n; i++) { const col = p.rgb[p.cells[i]], o = i * 4; if (done[i]) { im.data[o] = col[0]; im.data[o + 1] = col[1]; im.data[o + 2] = col[2]; } else { const g = 246 - (1 - p.lum[p.cells[i]]) * 40; im.data[o] = im.data[o + 1] = g; im.data[o + 2] = g + 4; } im.data[o + 3] = 255; }
    c.putImageData(im, 0, 0); return canvas;
  }
  function png(d, scale = 16) { const p = Pictures.build(d), n = p.n, c = document.createElement("canvas"); c.width = c.height = n * scale; const g2 = c.getContext("2d"); for (let i = 0; i < n * n; i++) { g2.fillStyle = p.pal[p.cells[i]]; g2.fillRect((i % n) * scale, ((i / n) | 0) * scale, scale, scale); } return c.toDataURL("image/png"); }

  return {
    on, start, showReplay, select, arm, find, serialize, thumb, png, resize, fit: () => { animateTo(fitS, N / 2, N / 2); },
    zoomIn() { animateTo(s * 1.6, (VW / 2 - ox) / s, (TOP + (VH - TOP - BOT) / 2 - oy) / s); }, zoomOut() { animateTo(s / 1.6, (VW / 2 - ox) / s, (TOP + (VH - TOP - BOT) / 2 - oy) / s); },
    stop() { mode = "idle"; },
    get armed() { return armed; }, get sel() { return sel; }, get mode() { return mode; }, get def() { return def; }, get pic() { return P; },
    get s() { return s; }, get view() { return { s, ox, oy, fitS, N }; },
    cellXY(i) { return [ox + (i % N + 0.5) * s, oy + (((i / N) | 0) + 0.5) * s]; },
    debug: { get paint() { return paint; }, get left() { return left; }, paintCell: (i, b) => { const r = paintCell(i, b); after(); return r; } }
  };
})();

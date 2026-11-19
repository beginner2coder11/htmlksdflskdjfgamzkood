/* SLICE RUSH — the game: fruit tossed up from the bottom, swipe trails, slicing (two halves fly apart, showing
   the inside), juice drops and splats, combos, bombs, power fruit (freeze / frenzy / double) and the three modes.
   Every fruit, bomb and background is drawn here in code. */
window.Game = (() => {
  const C = window.GAME_CONFIG;
  const cv = document.getElementById("view"), ctx = cv.getContext("2d");
  const TAU = Math.PI * 2, on = {};
  let DPR = 1, VW = 0, VH = 0, u = 1, G = 1000, bgs = {}, bgId = C.backgrounds[0].id, blade = C.blades[0];
  let mode = "idle", M = null, run = null, objs = [], halves = [], drops = [], splats = [], texts = [], rings = [], trail = [], stroke = null;
  let t = 0, spawnT = 0, frenzyT = 0, fx = { freeze: 0, frenzy: 0, double: 0 }, shake = 0, flash = 0, endT = -1, bot = false, paused = false, ending = null;

  const rnd = (a, b) => a + Math.random() * (b - a);
  const sfx = (k, a) => { if (mode !== "attract") Sound.play(k, a); };   // the title-screen demo stays silent
  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1); VW = innerWidth; VH = innerHeight;
    cv.width = VW * DPR; cv.height = VH * DPR; cv.style.width = VW + "px"; cv.style.height = VH + "px";
    u = Math.max(0.7, Math.min(VW / 420, VH / 760, 1.6)); G = VH * 1.55; bgs = {};
  }
  addEventListener("resize", resize);

  /* ---------- backgrounds (drawn once per size) ---------- */
  function bg(id) {
    if (bgs[id]) return bgs[id];
    const c = document.createElement("canvas"); c.width = VW * DPR; c.height = VH * DPR; const g = c.getContext("2d"); g.scale(DPR, DPR);
    let sd = 7; const R = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    if (id === "board") {
      const pw = Math.max(70, VW / 5);
      for (let x = 0, k = 0; x < VW; x += pw, k++) {
        const gr = g.createLinearGradient(x, 0, x + pw, 0); const base = ["#c98a52", "#d39a61", "#bf7f48", "#cf9258"][k % 4];
        gr.addColorStop(0, base); gr.addColorStop(1, shade(base, -0.08)); g.fillStyle = gr; g.fillRect(x, 0, pw, VH);
        g.strokeStyle = "rgba(90,45,15,0.18)"; g.lineWidth = 1.5;
        for (let i = 0; i < 7; i++) { const gx = x + R() * pw; g.beginPath(); g.moveTo(gx, 0); for (let y = 0; y <= VH; y += 40) g.lineTo(gx + Math.sin(y * 0.01 + i) * 6, y); g.stroke(); }
        for (let i = 0; i < 2; i++) { const kx = x + R() * pw, ky = R() * VH; g.fillStyle = "rgba(90,45,15,0.25)"; g.beginPath(); g.ellipse(kx, ky, 6, 12, 0, 0, TAU); g.fill(); }
        g.fillStyle = "rgba(60,25,5,0.35)"; g.fillRect(x, 0, 3, VH);
      }
    } else if (id === "picnic") {
      g.fillStyle = "#ffffff"; g.fillRect(0, 0, VW, VH); const s = 46 * u; g.fillStyle = "rgba(232,50,62,0.45)";
      for (let x = 0; x < VW; x += s * 2) g.fillRect(x, 0, s, VH); for (let y = 0; y < VH; y += s * 2) g.fillRect(0, y, VW, s);
      g.fillStyle = "rgba(232,50,62,0.35)"; for (let x = 0; x < VW; x += s * 2) for (let y = 0; y < VH; y += s * 2) g.fillRect(x, y, s, s);
    } else if (id === "beach") {
      const sky = g.createLinearGradient(0, 0, 0, VH * 0.4); sky.addColorStop(0, "#7fd0ff"); sky.addColorStop(1, "#c8f0ff"); g.fillStyle = sky; g.fillRect(0, 0, VW, VH * 0.4);
      g.fillStyle = "#fff6b0"; g.beginPath(); g.arc(VW * 0.8, VH * 0.12, 34 * u, 0, TAU); g.fill();
      const sea = g.createLinearGradient(0, VH * 0.36, 0, VH * 0.52); sea.addColorStop(0, "#1fa2d8"); sea.addColorStop(1, "#5fd3e8"); g.fillStyle = sea; g.fillRect(0, VH * 0.36, VW, VH * 0.18);
      const sand = g.createLinearGradient(0, VH * 0.5, 0, VH); sand.addColorStop(0, "#ffe2a0"); sand.addColorStop(1, "#f2c77a"); g.fillStyle = sand; g.beginPath(); g.moveTo(0, VH * 0.52); for (let x = 0; x <= VW; x += 20) g.lineTo(x, VH * 0.52 + Math.sin(x * 0.03) * 6); g.lineTo(VW, VH); g.lineTo(0, VH); g.fill();
      g.fillStyle = "rgba(190,130,60,0.25)"; for (let i = 0; i < 160; i++) g.fillRect(R() * VW, VH * 0.55 + R() * VH * 0.45, 2, 2);
    } else if (id === "night") {
      const sky = g.createLinearGradient(0, 0, 0, VH); sky.addColorStop(0, "#1a1440"); sky.addColorStop(1, "#4a2a6a"); g.fillStyle = sky; g.fillRect(0, 0, VW, VH);
      g.fillStyle = "#ffffff"; for (let i = 0; i < 70; i++) { g.globalAlpha = 0.3 + R() * 0.6; g.fillRect(R() * VW, R() * VH * 0.5, 2, 2); } g.globalAlpha = 1;
      for (let x = 0; x < VW;) { const w = rnd(40, 90) * u, h = VH * rnd(0.18, 0.4); g.fillStyle = "#24183e"; g.fillRect(x, VH - h, w, h); g.fillStyle = "rgba(255,210,120,0.6)"; for (let wy = VH - h + 10; wy < VH - 10; wy += 16) for (let wx = x + 6; wx < x + w - 8; wx += 12) if (R() < 0.35) g.fillRect(wx, wy, 5, 7); x += w + 4; }
      for (let k = 0; k < 2; k++) { const y0 = VH * (0.16 + k * 0.14); g.strokeStyle = "rgba(255,255,255,0.25)"; g.lineWidth = 1; g.beginPath(); g.moveTo(0, y0); g.quadraticCurveTo(VW / 2, y0 + 50, VW, y0); g.stroke(); for (let i = 1; i < 9; i++) { const x = VW * i / 9, y = y0 + 50 * 2 * (i / 9) * (1 - i / 9) * 2 * 0.5 * 2; g.fillStyle = ["#ff5a6a", "#ffc93d", "#ff9a3d"][i % 3]; g.beginPath(); g.ellipse(x, y + 10, 8 * u, 10 * u, 0, 0, TAU); g.fill(); } }
    } else {
      const gr = g.createLinearGradient(0, 0, 0, VH); gr.addColorStop(0, "#d8f5c8"); gr.addColorStop(1, "#8fd27a"); g.fillStyle = gr; g.fillRect(0, 0, VW, VH);
      for (let k = 0; k < 9; k++) { const x = R() * VW, w = (10 + R() * 14) * u, col = R() < 0.5 ? "#4fae4a" : "#3c9a3e"; g.globalAlpha = 0.5 + R() * 0.5; g.fillStyle = col; g.fillRect(x, 0, w, VH); g.fillStyle = "rgba(0,0,0,0.18)"; for (let y = R() * 120; y < VH; y += 90 + R() * 60) g.fillRect(x - 1, y, w + 2, 4); g.fillStyle = col; g.beginPath(); g.ellipse(x + w + 10 * u, R() * VH, 16 * u, 5 * u, -0.5, 0, TAU); g.fill(); } g.globalAlpha = 1;
    }
    const vg = g.createRadialGradient(VW / 2, VH / 2, Math.min(VW, VH) * 0.3, VW / 2, VH / 2, Math.max(VW, VH) * 0.75); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.32)"); g.fillStyle = vg; g.fillRect(0, 0, VW, VH);
    return (bgs[id] = c);
  }
  function shade(hex, k) { const n = parseInt(hex.slice(1), 16), f = c => Math.max(0, Math.min(255, Math.round(k < 0 ? c * (1 + k) : c + (255 - c) * k))); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; }

  /* ---------- fruit drawing (centred at 0,0, radius r) ---------- */
  function shine(g, r) { g.fillStyle = "rgba(255,255,255,0.45)"; g.beginPath(); g.ellipse(-r * 0.35, -r * 0.4, r * 0.22, r * 0.13, -0.6, 0, TAU); g.fill(); }
  function ball(g, r, a, b, rx = r, ry = r) { const gr = g.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, Math.max(rx, ry) * 1.05); gr.addColorStop(0, b); gr.addColorStop(1, a); g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU); g.fill(); }
  function drawWhole(g, f, r) {
    switch (f.kind) {
      case "apple": ball(g, r, f.skin, f.skin2); g.fillStyle = shade(f.skin, -0.25); g.beginPath(); g.ellipse(0, -r * 0.82, r * 0.22, r * 0.1, 0, 0, TAU); g.fill();
        g.strokeStyle = "#6b3a1e"; g.lineWidth = r * 0.1; g.lineCap = "round"; g.beginPath(); g.moveTo(0, -r * 0.8); g.quadraticCurveTo(r * 0.05, -r * 1.05, r * 0.15, -r * 1.2); g.stroke();
        g.fillStyle = "#4caf50"; g.beginPath(); g.ellipse(r * 0.38, -r * 1.05, r * 0.28, r * 0.12, -0.5, 0, TAU); g.fill(); shine(g, r); break;
      case "citrus": ball(g, r, f.skin, f.skin2); g.fillStyle = "rgba(0,0,0,0.08)"; for (let i = 0; i < 18; i++) { const a = i * 2.4, d = r * (0.2 + (i % 5) * 0.15); g.beginPath(); g.arc(Math.cos(a) * d, Math.sin(a) * d, r * 0.04, 0, TAU); g.fill(); }
        g.fillStyle = "#5a9a2a"; g.beginPath(); g.arc(r * 0.1, -r * 0.92, r * 0.1, 0, TAU); g.fill(); shine(g, r); break;
      case "lemon": g.fillStyle = f.skin; g.beginPath(); g.ellipse(r * 1.08, 0, r * 0.16, r * 0.12, 0, 0, TAU); g.ellipse(-r * 1.08, 0, r * 0.16, r * 0.12, 0, 0, TAU); g.fill(); ball(g, r, f.skin, f.skin2, r * 1.1, r * 0.82); shine(g, r * 0.9); break;
      case "melon": ball(g, r, f.skin, f.skin2, r * 1.08, r * 0.94);
        g.save(); g.beginPath(); g.ellipse(0, 0, r * 1.08, r * 0.94, 0, 0, TAU); g.clip(); g.strokeStyle = shade(f.skin, -0.35); g.lineWidth = r * 0.16;
        for (let k = -3; k <= 3; k++) { g.beginPath(); g.moveTo(k * r * 0.34, -r); for (let y = -r; y <= r; y += r * 0.2) g.lineTo(k * r * 0.34 * Math.cos(y / r * 0.9) + Math.sin(y * 0.2 / u + k) * r * 0.05, y); g.stroke(); }
        g.restore(); shine(g, r); break;
      case "kiwi": ball(g, r, f.skin, f.skin2, r * 1.05, r * 0.9); g.fillStyle = "rgba(60,35,15,0.35)"; for (let i = 0; i < 40; i++) { const a = i * 2.39, d = r * 0.9 * Math.sqrt((i + 0.5) / 40); g.fillRect(Math.cos(a) * d, Math.sin(a) * d * 0.85, r * 0.05, r * 0.05); } break;
      case "peach": ball(g, r, f.skin, f.skin2); g.strokeStyle = shade(f.skin, -0.2); g.lineWidth = r * 0.07; g.beginPath(); g.moveTo(-r * 0.05, -r * 0.92); g.quadraticCurveTo(r * 0.45, -r * 0.1, r * 0.1, r * 0.9); g.stroke();
        g.fillStyle = "#4caf50"; g.beginPath(); g.ellipse(-r * 0.3, -r * 0.95, r * 0.26, r * 0.11, 0.4, 0, TAU); g.fill(); shine(g, r); break;
      case "coco": ball(g, r, f.skin, f.skin2); g.strokeStyle = "rgba(50,25,10,0.35)"; g.lineWidth = r * 0.04; for (let i = 0; i < 14; i++) { const a = i * 0.45; g.beginPath(); g.arc(0, 0, r * (0.3 + (i % 4) * 0.17), a, a + 0.8); g.stroke(); }
        g.fillStyle = "#3a2210"; for (const [x, y] of [[-0.18, -0.55], [0.18, -0.55], [0, -0.3]]) { g.beginPath(); g.arc(x * r, y * r, r * 0.09, 0, TAU); g.fill(); } break;
      case "berry": { const gr = g.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r * 1.1); gr.addColorStop(0, f.skin2); gr.addColorStop(1, f.skin); g.fillStyle = gr;
        g.beginPath(); g.moveTo(0, r * 1.05); g.bezierCurveTo(-r * 1.2, r * 0.2, -r * 1.05, -r * 0.85, 0, -r * 0.75); g.bezierCurveTo(r * 1.05, -r * 0.85, r * 1.2, r * 0.2, 0, r * 1.05); g.fill();
        g.fillStyle = "#ffe07a"; for (let i = 0; i < 14; i++) { const a = i * 2.4, d = r * (0.25 + (i % 4) * 0.16); g.beginPath(); g.ellipse(Math.cos(a) * d * 0.9, Math.sin(a) * d * 0.8 + r * 0.05, r * 0.04, r * 0.07, 0, 0, TAU); g.fill(); }
        g.fillStyle = "#3fae4a"; for (let i = -2; i <= 2; i++) { g.beginPath(); g.ellipse(i * r * 0.18, -r * 0.8, r * 0.12, r * 0.32, i * 0.5, 0, TAU); g.fill(); } break; }
    }
  }
  function drawInner(g, f, r) {               // the cut face, in the cut frame
    const disc = (c, rr) => { g.fillStyle = c; g.beginPath(); g.arc(0, 0, rr, 0, TAU); g.fill(); };
    switch (f.kind) {
      case "apple": disc(f.flesh, r * 0.9); g.fillStyle = "rgba(200,160,90,0.35)"; g.beginPath(); g.ellipse(0, 0, r * 0.3, r * 0.14, 0, 0, TAU); g.fill(); g.fillStyle = f.flesh2; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * r * 0.16, s * r * 0.04, r * 0.07, r * 0.12, s * 0.6, 0, TAU); g.fill(); } break;
      case "citrus": case "lemon": disc(f.flesh2, r * 0.9); disc(f.flesh, r * 0.82); g.strokeStyle = f.flesh2; g.lineWidth = r * 0.06; for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8); g.stroke(); } disc(f.flesh2, r * 0.12); break;
      case "melon": disc("#d8f5c0", r * 0.95); disc(f.flesh, r * 0.84); g.fillStyle = f.flesh2; for (let i = 0; i < 12; i++) { const a = i * 2.4, d = r * (0.3 + (i % 3) * 0.17); g.beginPath(); g.ellipse(Math.cos(a) * d, Math.sin(a) * d, r * 0.04, r * 0.07, a, 0, TAU); g.fill(); } break;
      case "kiwi": disc(f.flesh, r * 0.88); g.fillStyle = "rgba(255,255,255,0.35)"; for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8); g.lineTo(Math.cos(a + 0.12) * r * 0.8, Math.sin(a + 0.12) * r * 0.8); g.fill(); }
        g.fillStyle = f.flesh2; for (let i = 0; i < 18; i++) { const a = i / 18 * TAU; g.beginPath(); g.ellipse(Math.cos(a) * r * 0.36, Math.sin(a) * r * 0.36, r * 0.035, r * 0.07, a, 0, TAU); g.fill(); } disc("#f4f9e0", r * 0.22); break;
      case "peach": disc(f.flesh, r * 0.9); g.fillStyle = f.flesh2; g.beginPath(); g.ellipse(0, 0, r * 0.32, r * 0.24, 0, 0, TAU); g.fill(); break;
      case "coco": disc(f.flesh, r * 0.82); disc(f.flesh2, r * 0.55); break;
      case "berry": disc(f.flesh, r * 0.82); g.strokeStyle = "rgba(239,35,60,0.45)"; g.lineWidth = r * 0.05; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; g.beginPath(); g.moveTo(Math.cos(a) * r * 0.2, Math.sin(a) * r * 0.2); g.lineTo(Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.7); g.stroke(); } disc("#fff4f6", r * 0.18); break;
    }
  }
  function drawSpecial(g, sp, r, k) {
    const col = C.specials[sp].color, pulse = 1 + Math.sin(t * 8) * 0.06;
    const gl = g.createRadialGradient(0, 0, r * 0.3, 0, 0, r * 1.6); gl.addColorStop(0, col); gl.addColorStop(1, "rgba(255,255,255,0)"); g.globalAlpha = 0.55; g.fillStyle = gl; g.beginPath(); g.arc(0, 0, r * 1.6 * pulse, 0, TAU); g.fill(); g.globalAlpha = 1;
    ball(g, r, shade(col, -0.25), "#ffffff");
    g.strokeStyle = "#ffffff"; g.fillStyle = "#ffffff"; g.lineWidth = r * 0.14; g.lineCap = "round";
    if (sp === "freeze") for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; g.beginPath(); g.moveTo(Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6); g.lineTo(-Math.cos(a) * r * 0.6, -Math.sin(a) * r * 0.6); g.stroke(); }
    else if (sp === "frenzy") { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.28 : r * 0.62; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.closePath(); g.fill(); }
    else { g.font = `900 ${Math.round(r * 0.8)}px ui-rounded, system-ui, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("×2", 0, r * 0.05); }
  }
  function drawBomb(g, r) {
    const glow = 0.5 + 0.5 * Math.sin(t * 12);
    g.fillStyle = `rgba(255,60,60,${0.25 + glow * 0.25})`; g.beginPath(); g.arc(0, 0, r * 1.35, 0, TAU); g.fill();
    ball(g, r, "#1b1f33", "#5a6488");
    g.fillStyle = "#8a93a8"; g.fillRect(-r * 0.22, -r * 1.12, r * 0.44, r * 0.3);
    g.strokeStyle = "#c8a27a"; g.lineWidth = r * 0.1; g.lineCap = "round"; g.beginPath(); g.moveTo(0, -r * 1.1); g.quadraticCurveTo(r * 0.3, -r * 1.5, r * 0.55, -r * 1.35); g.stroke();
    g.fillStyle = "#fff3a8"; g.beginPath(); g.arc(r * 0.58, -r * 1.36, r * (0.14 + glow * 0.08), 0, TAU); g.fill(); g.fillStyle = "#ff8a3d"; g.beginPath(); g.arc(r * 0.58, -r * 1.36, r * 0.08, 0, TAU); g.fill();
    g.fillStyle = "#ff4d5e"; g.font = `900 ${Math.round(r * 0.75)}px ui-rounded, system-ui, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("✕", 0, r * 0.08);
  }

  /* ---------- run ---------- */
  function start(m, opts = {}) {
    M = m; const md = C.modes[m]; bot = !!opts.bot;
    run = { mode: m, score: 0, lives: md.lives || 0, time: md.time || 0, sliced: 0, bestSwipe: 0, combos: 0, specials: 0, revived: false, elapsed: 0, missed: 0 };
    objs = []; halves = []; drops = []; splats = []; texts = []; rings = []; trail = []; stroke = null;
    fx = { freeze: 0, frenzy: 0, double: 0 }; spawnT = 0.6; frenzyT = 0; shake = 0; flash = 0; endT = -1; ending = null; paused = false;
    mode = "play";
  }
  function attract() { start("zen", { bot: true }); mode = "attract"; }
  function launch(kind, extra = {}) {
    const fr = C.fruits[(Math.random() * C.fruits.length) | 0], r0 = 34 * u;
    const r = kind === "fruit" ? r0 * fr.r : kind === "bomb" ? r0 * 0.92 : r0 * 0.95;
    let x = rnd(VW * 0.15, VW * 0.85), y = VH + r, apex = VH * rnd(0.12, 0.42), vy = -Math.sqrt(2 * G * (y - apex)), ta = -vy / G, tx = rnd(VW * 0.2, VW * 0.8), vx = (tx - x) / (2 * ta);
    if (extra.side) { x = extra.side < 0 ? -r : VW + r; y = rnd(VH * 0.25, VH * 0.6); vx = -extra.side * rnd(VW * 0.55, VW * 0.8); vy = -rnd(G * 0.25, G * 0.45); }
    objs.push({ kind, f: fr, sp: extra.sp, x, y, vx, vy, r, rot: rnd(0, TAU), vr: rnd(-3, 3) });
  }
  function wave() {
    const e = run.elapsed, md = M;
    let n = 1 + Math.floor(Math.min(md === "zen" ? 5 : 4, e / (md === "classic" ? 22 : 12) + Math.random() * 1.8));
    const bombP = md === "zen" ? 0 : md === "classic" ? (e < 8 ? 0 : Math.min(0.26, 0.05 + e * 0.0025)) : 0.13;
    let bombs = 0;
    const seq = Math.random() < 0.35, specialOk = md === "arcade" && !objs.some(o => o.kind === "special") && Math.random() < 0.13;
    for (let i = 0; i < n; i++) {
      const go = () => {
        if (mode === "idle" || (endT >= 0 && M !== "classic")) return;
        if (specialOk && i === 0) { const ks = Object.keys(C.specials); launch("special", { sp: ks[(Math.random() * ks.length) | 0] }); return; }
        if (bombs < 2 && Math.random() < bombP) { bombs++; launch("bomb"); } else launch("fruit");
      };
      if (seq) setTimeout(go, i * 160); else go();
    }
    const base = md === "classic" ? Math.max(0.6, 1.5 - e * 0.011) : md === "arcade" ? Math.max(0.55, 0.95 - e * 0.006) : Math.max(0.55, 0.85 - e * 0.004);
    spawnT = base * rnd(0.85, 1.15) + (seq ? n * 0.16 : 0);
  }

  /* ---------- slicing ---------- */
  function slice(o, ang, viaBot) {
    if (o.cut) return; o.cut = true;
    const nx = -Math.sin(ang), ny = Math.cos(ang);
    if (o.kind === "bomb") return boom(o);
    const col = o.kind === "special" ? C.specials[o.sp].color : o.f.juice;
    for (const side of [-1, 1]) halves.push({ o, side, x: o.x, y: o.y, vx: o.vx * 0.6 + nx * side * 140 * u, vy: o.vy * 0.5 + ny * side * 140 * u - 80 * u, a: ang, spin: 0, vr: side * rnd(2, 5), life: 0 });
    for (let i = 0; i < 16; i++) { const a = ang + rnd(-0.6, 0.6) + (i % 2 ? Math.PI : 0), sp = rnd(150, 520) * u; drops.push({ x: o.x, y: o.y, vx: Math.cos(a) * sp + rnd(-60, 60) * u, vy: Math.sin(a) * sp - rnd(50, 200) * u, r: rnd(2.5, 7) * u, col, life: 0, max: rnd(0.5, 0.9) }); }
    splats.push({ x: o.x, y: o.y, r: o.r * rnd(1.1, 1.5), col, life: 0, seed: Math.random() * 100, a: ang });
    if (splats.length > 24) splats.shift();
    const pts = (o.kind === "fruit" ? o.f.score : 1) * (fx.double > 0 ? 2 : 1);
    run.score += pts; run.sliced++;
    if (fx.double > 0) texts.push({ s: "+2", x: o.x, y: o.y - o.r, t: 0, col: "#e8c4ff", size: 22 });
    if (o.kind === "special") { const S = C.specials[o.sp]; fx[o.sp] = S.time; run.specials++; texts.push({ s: S.name.toUpperCase() + "!", x: VW / 2, y: VH * 0.32, t: 0, col: S.color, size: 44 }); flash = 0.25; sfx(o.sp); rings.push({ x: o.x, y: o.y, t: 0, col: S.color }); }
    if (stroke && !viaBot) { stroke.n++; stroke.last = t; stroke.x = o.x; stroke.y = o.y; run.bestSwipe = Math.max(run.bestSwipe, stroke.n); }
    sfx("slice"); sfx("squish", o.kind === "fruit" ? o.f.r : 1);
  }
  function comboEnd() {
    if (!stroke) return; const n = stroke.n;
    if (n >= C.comboMin) { run.score += n; run.combos++; texts.push({ s: `${n} FRUIT COMBO`, sub: `+${n}`, x: Math.max(110 * u, Math.min(VW - 110 * u, stroke.x)), y: Math.max(VH * 0.2, stroke.y - 40 * u), t: 0, col: "#ffe27a", size: 30 }); sfx("combo", n); on.combo && on.combo(n); }
    stroke.n = 0;
  }
  function boom(o) {
    sfx("boom"); shake = 0.5; flash = 0.6; rings.push({ x: o.x, y: o.y, t: 0, col: "#ffffff", big: true });
    for (let i = 0; i < 30; i++) { const a = rnd(0, TAU), sp = rnd(200, 700) * u; drops.push({ x: o.x, y: o.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: rnd(3, 8) * u, col: i % 3 ? "#2a2e3e" : "#ff9a3d", life: 0, max: rnd(0.5, 1) }); }
    if (M === "classic") { objs = objs.filter(x => x === o ? false : true); ending = "bomb"; endT = 1.1; return; }
    if (M === "arcade") { const pen = Math.min(run.score, C.modes.arcade.bombPenalty); run.score -= pen; texts.push({ s: `−${pen}`, x: o.x, y: o.y, t: 0, col: "#ff6b6b", size: 40 }); }
  }

  /* ---------- update ---------- */
  function update(dt) {
    t += dt;
    if (paused) return;
    const slow = fx.freeze > 0 ? 0.4 : 1, gdt = dt * slow;
    shake = Math.max(0, shake - dt); flash = Math.max(0, flash - dt);
    if (mode === "play" || mode === "attract") {
      run.elapsed += dt;
      for (const k in fx) fx[k] = Math.max(0, fx[k] - dt);
      if (M !== "classic" && endT < 0) { run.time -= dt; if (run.time <= 0) { run.time = 0; endT = 1.6; ending = "time"; sfx("whistle"); } }
      if (endT < 0) { spawnT -= gdt; if (spawnT <= 0) wave(); if (fx.frenzy > 0) { frenzyT -= dt; if (frenzyT <= 0) { frenzyT = 0.13; launch("fruit", { side: Math.random() < 0.5 ? -1 : 1 }); } } }
      if (stroke && stroke.n && t - stroke.last > 0.25) comboEnd();
      if (bot) botThink();
    }
    for (const o of objs) { o.vy += G * gdt; o.x += o.vx * gdt; o.y += o.vy * gdt; o.rot += o.vr * gdt; }
    // misses
    for (const o of objs) if (!o.cut && o.vy > 0 && o.y - o.r > VH + 4) {
      o.gone = true;
      if (o.kind === "fruit" && M === "classic" && mode === "play" && endT < 0) { run.lives--; run.missed++; texts.push({ s: "✕", x: Math.max(30, Math.min(VW - 30, o.x)), y: VH - 40 * u, t: 0, col: "#ff4d5e", size: 48 }); sfx("miss"); if (run.lives <= 0) { ending = "lives"; endT = 0.9; } }
    }
    objs = objs.filter(o => !o.cut && !o.gone && o.x > -VW && o.x < VW * 2);
    for (const h of halves) { h.vy += G * gdt; h.x += h.vx * gdt; h.y += h.vy * gdt; h.spin += h.vr * gdt; h.life += dt; }
    halves = halves.filter(h => h.y - h.o.r < VH + 40);
    for (const d of drops) { d.vy += G * 0.7 * gdt; d.x += d.vx * gdt; d.y += d.vy * gdt; d.life += dt; } drops = drops.filter(d => d.life < d.max);
    for (const s of splats) s.life += dt; splats = splats.filter(s => s.life < 3);
    for (const x of texts) x.t += dt; texts = texts.filter(x => x.t < 1.2);
    for (const r of rings) r.t += dt; rings = rings.filter(r => r.t < 0.6);
    trail = trail.filter(p => t - p.t < 0.13);
    if (endT >= 0 && mode === "play") { endT -= dt; if (endT < 0) finish(); }
    else if (endT >= 0 && mode === "attract") { endT -= dt; if (endT < 0) attract(); }
  }
  function finish() {
    mode = "over"; comboEnd();
    const r = Object.assign({}, run, { ending, canRevive: M === "classic" && !run.revived });
    on.end && on.end(r);
  }
  function revive() {
    run.revived = true; run.lives = 1; objs = []; ending = null; endT = -1; spawnT = 1; mode = "play"; texts.push({ s: "GO!", x: VW / 2, y: VH * 0.4, t: 0, col: "#ffffff", size: 56 });
  }

  /* ---------- bot (title screen + tests) ---------- */
  function botThink() {
    for (const o of objs) if (!o.cut && o.kind !== "bomb" && o.y < VH * 0.75 && o.vy > -G * 0.3 && Math.random() < 0.08) {
      const ang = rnd(-0.6, 0.6) + (Math.random() < 0.5 ? 0 : Math.PI / 2);
      trail.push({ x: o.x - Math.cos(ang) * o.r * 1.6, y: o.y - Math.sin(ang) * o.r * 1.6, t: t - 0.06 }, { x: o.x + Math.cos(ang) * o.r * 1.6, y: o.y + Math.sin(ang) * o.r * 1.6, t });
      slice(o, ang, true);
    }
  }

  /* ---------- input: swipe ---------- */
  let last = null;
  function swipeSeg(ax, ay, bx, by, dt) {
    const len = Math.hypot(bx - ax, by - ay); if (len < 2) return;
    const speed = len / Math.max(dt, 0.001), ang = Math.atan2(by - ay, bx - ax);
    if (speed < 220 * u) return;
    for (const o of objs) {
      if (o.cut) continue;
      const vx = bx - ax, vy = by - ay, l2 = vx * vx + vy * vy; let q = ((o.x - ax) * vx + (o.y - ay) * vy) / l2; q = Math.max(0, Math.min(1, q));
      const d = Math.hypot(o.x - ax - vx * q, o.y - ay - vy * q); if (d < o.r * (o.kind === "bomb" ? 0.8 : 1.0)) slice(o, ang);
    }
  }
  function down(x, y) { if (mode !== "play" || paused) return; last = { x, y, t: performance.now() }; stroke = stroke || { n: 0, last: 0 }; trail = [{ x, y, t }]; }
  function move(x, y) {
    if (!last) return; const now = performance.now(), dt = (now - last.t) / 1000;
    trail.push({ x, y, t }); if (trail.length > 24) trail.shift();
    if (Math.hypot(x - last.x, y - last.y) > 6 * u && dt > 0.25 && stroke) comboEnd();
    swipeSeg(last.x, last.y, x, y, dt); if (Math.hypot(x - last.x, y - last.y) > 30 * u) sfx("swish");
    last = { x, y, t: now };
  }
  function up() { last = null; comboEnd(); }
  cv.addEventListener("pointerdown", e => { try { cv.setPointerCapture(e.pointerId); } catch (er) {} down(e.clientX, e.clientY); });
  cv.addEventListener("pointermove", e => move(e.clientX, e.clientY));
  cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);

  /* ---------- drawing ---------- */
  function render() {
    const sk = shake > 0 ? shake * 18 * u : 0;
    ctx.setTransform(DPR, 0, 0, DPR, (Math.random() - 0.5) * sk * DPR, (Math.random() - 0.5) * sk * DPR);
    ctx.drawImage(bg(bgId), 0, 0, VW, VH);
    if (fx.freeze > 0) { ctx.fillStyle = `rgba(127,216,255,${0.18 * Math.min(1, fx.freeze)})`; ctx.fillRect(0, 0, VW, VH); }
    // splats
    for (const s of splats) { const a = Math.max(0, 0.55 * (1 - s.life / 3)); ctx.globalAlpha = a; ctx.fillStyle = s.col; ctx.beginPath(); for (let i = 0; i < 14; i++) { const an = i / 14 * TAU, rr = s.r * (0.65 + 0.35 * Math.abs(Math.sin(s.seed + i * 1.7))); ctx.lineTo(s.x + Math.cos(an) * rr, s.y + Math.sin(an) * rr * 0.85); } ctx.closePath(); ctx.fill();
      for (let i = 0; i < 5; i++) { const an = s.a + (i - 2) * 0.3 + (i % 2 ? Math.PI : 0); ctx.beginPath(); ctx.arc(s.x + Math.cos(an) * s.r * 1.4, s.y + Math.sin(an) * s.r * 1.4, s.r * 0.12, 0, TAU); ctx.fill(); } }
    ctx.globalAlpha = 1;
    // halves
    for (const h of halves) {
      const o = h.o, r = o.r; ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(h.a + h.spin);
      ctx.beginPath(); ctx.rect(-r * 2, h.side < 0 ? -r * 2 : 0, r * 4, r * 2); ctx.clip();
      ctx.save(); ctx.rotate(o.rot - h.a);
      if (o.kind === "special") drawSpecial(ctx, o.sp, r); else drawWhole(ctx, o.f, r);
      ctx.restore();
      if (o.kind === "fruit") drawInner(ctx, o.f, r * (o.f.kind === "lemon" ? 0.82 : o.f.kind === "melon" ? 0.95 : 0.98)); else { ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(0, 0, r * 0.8, 0, TAU); ctx.fill(); }
      ctx.restore();
    }
    // whole objects
    for (const o of objs) {
      ctx.save(); ctx.translate(o.x, o.y);
      ctx.fillStyle = "rgba(0,0,0,0.18)"; ctx.beginPath(); ctx.ellipse(o.r * 0.15, o.r * 0.25, o.r, o.r * 0.9, 0, 0, TAU); ctx.fill();
      ctx.rotate(o.kind === "bomb" ? Math.sin(o.rot) * 0.3 : o.rot);
      if (o.kind === "fruit") drawWhole(ctx, o.f, o.r); else if (o.kind === "bomb") drawBomb(ctx, o.r); else drawSpecial(ctx, o.sp, o.r);
      ctx.restore();
    }
    // drops
    for (const d of drops) { ctx.globalAlpha = 1 - d.life / d.max; ctx.fillStyle = d.col; ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, TAU); ctx.fill(); } ctx.globalAlpha = 1;
    for (const r of rings) { const k = r.t / 0.6; ctx.strokeStyle = r.col; ctx.globalAlpha = 1 - k; ctx.lineWidth = (r.big ? 14 : 8) * u * (1 - k) + 1; ctx.beginPath(); ctx.arc(r.x, r.y, (r.big ? 260 : 120) * u * k, 0, TAU); ctx.stroke(); } ctx.globalAlpha = 1;
    drawTrail();
    for (const x of texts) {
      const k = x.t / 1.2, sc = x.t < 0.15 ? 0.6 + x.t / 0.15 * 0.5 : 1.1 - Math.min(0.1, (x.t - 0.15)); ctx.globalAlpha = Math.min(1, (1 - k) * 2.5);
      ctx.font = `900 ${Math.round(x.size * u * sc)}px ui-rounded, system-ui, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineWidth = 7 * u; ctx.strokeStyle = "rgba(42,29,20,0.85)"; ctx.lineJoin = "round";
      const y = x.y - x.t * 30 * u; ctx.strokeText(x.s, x.x, y); ctx.fillStyle = x.col; ctx.fillText(x.s, x.x, y);
      if (x.sub) { ctx.font = `900 ${Math.round(x.size * 0.8 * u * sc)}px ui-rounded, system-ui, sans-serif`; ctx.strokeText(x.sub, x.x, y + x.size * u); ctx.fillStyle = "#ffffff"; ctx.fillText(x.sub, x.x, y + x.size * u); }
    }
    ctx.globalAlpha = 1;
    if (flash > 0) { ctx.fillStyle = `rgba(255,255,255,${Math.min(0.85, flash)})`; ctx.fillRect(0, 0, VW, VH); }
  }
  function drawTrail() {
    if (trail.length < 2) return;
    const n = trail.length, rb = blade.b === "rainbow";
    for (let pass = 0; pass < 2; pass++) for (let i = 1; i < n; i++) {
      const a = trail[i - 1], b = trail[i], k = i / n, w = (pass ? 5 : 13) * u * k;
      ctx.strokeStyle = pass ? blade.a : rb ? `hsl(${(t * 300 + i * 25) % 360},95%,60%)` : blade.b; ctx.globalAlpha = pass ? 1 : 0.55 * k + 0.2;
      ctx.lineWidth = w; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  let lastT = 0;
  function frame(now) { requestAnimationFrame(frame); const dt = Math.min(0.05, (now - (lastT || now)) / 1000); lastT = now; if (run) { try { update(dt); } catch (e) { console.error(e); } } if (VW) try { render(); } catch (e) { console.error(e); } }
  resize(); requestAnimationFrame(frame);

  return {
    on, start, attract, revive, slice, swipeSeg, update: (dt, k = 1) => { for (let i = 0; i < k; i++) update(dt); },
    setBlade(id) { blade = C.blades.find(b => b.id === id) || C.blades[0]; }, setBg(id) { bgId = id; },
    setBot(v) { bot = v; },
    pause(p) { paused = p; if (p) { last = null; } },
    drawFruitPreview(c, f, sp) { const g = c.getContext("2d"), r = c.width * 0.32; g.clearRect(0, 0, c.width, c.height); g.save(); g.translate(c.width / 2, c.height / 2); if (sp) drawSpecial(g, sp, r); else if (f === "bomb") drawBomb(g, r); else drawWhole(g, f, r); g.restore(); },
    bgPreview(id) { return bg(id); },
    get run() { return run; }, get mode() { return mode; }, get objs() { return objs; }, get fx() { return fx; }, get paused() { return paused; }, get halves() { return halves; }
  };
})();

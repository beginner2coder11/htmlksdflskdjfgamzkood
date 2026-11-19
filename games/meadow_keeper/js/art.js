/* MEADOW KEEPER — all drawing in code, in a soft top-down "3/4" view: the ground is flat,
   things stand up out of it. Every function draws around (0,0) = the centre of the item's
   footprint on the ground. One tile = 56 units. */
window.Art = (() => {
  const TAU = Math.PI * 2, T = 56;
  const C = window.GAME_CONFIG;
  const ell = (g, x, y, rx, ry, col, rot = 0) => { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU); g.fill(); };
  const circ = (g, x, y, r, col) => { g.fillStyle = col; g.beginPath(); g.arc(x, y, Math.max(0.1, r), 0, TAU); g.fill(); };
  const shadow = (g, rx, ry, y = 4) => ell(g, 3, y, rx, ry, "rgba(30,60,30,0.22)");
  const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  function shade(hex, k) { const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = n >> 8 & 255, b = n & 255; if (k < 0) { r *= 1 + k; g *= 1 + k; b *= 1 + k; } else { r += (255 - r) * k; g += (255 - g) * k; b += (255 - b) * k; } return `rgb(${r | 0},${g | 0},${b | 0})`; }
  const LEAF = "#4fae5a", LEAF2 = "#3a9050";

  function leaves(g, n, r, seed, t) {
    for (let i = 0; i < n; i++) { const a = i / n * TAU + seed, sw = Math.sin(t * 1.5 + i) * 0.06; ell(g, Math.cos(a + sw) * r * 0.55, Math.sin(a + sw) * r * 0.32 - 4, r * 0.5, r * 0.2, i % 2 ? LEAF : LEAF2, a + sw); }
  }
  function bloom(g, x, y, r, petals, col, eye, rot = 0, shape = "round") {
    g.save(); g.translate(x, y); g.rotate(rot);
    for (let i = 0; i < petals; i++) { const a = i / petals * TAU; if (shape === "long") ell(g, Math.cos(a) * r * 0.62, Math.sin(a) * r * 0.62 * 0.8, r * 0.48, r * 0.2, col, a); else ell(g, Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.42, r * 0.48, r * 0.42, col); }
    circ(g, 0, 0, r * 0.32, eye); circ(g, -r * 0.1, -r * 0.1, r * 0.1, "rgba(255,255,255,0.5)");
    g.restore();
  }

  /* ---------- items ---------- */
  function item(g, id, t = 0, night = false, seed = 0) {
    const it = C.items[id]; if (!it) return;
    const sw = Math.sin(t * 1.4 + seed * 7) * 0.05;
    switch (id) {
      case "daisy": shadow(g, 20, 8); leaves(g, 6, 34, seed, t); [[-9, -10], [10, -6], [0, 4], [-2, -20]].forEach(([x, y], i) => bloom(g, x + sw * 30, y, 9 + (i % 2) * 2, 10, "#ffffff", "#ffd23f", seed + i, "long")); break;
      case "buttercup": shadow(g, 20, 8); leaves(g, 5, 32, seed, t); [[-8, -8], [9, -10], [2, 4]].forEach(([x, y], i) => bloom(g, x + sw * 30, y, 9, 5, "#ffd23f", "#ffb000", i)); break;
      case "poppy": shadow(g, 20, 8); leaves(g, 5, 34, seed, t); [[-8, -12], [9, -4]].forEach(([x, y], i) => bloom(g, x + sw * 30, y, 13, 4, "#ff4f4f", "#2a2340", i * 0.7)); break;
      case "lavender": shadow(g, 20, 8); leaves(g, 5, 28, seed, t);
        for (let k = 0; k < 5; k++) { const x = -14 + k * 7 + sw * 40, h = 26 + (k % 2) * 6; g.strokeStyle = LEAF2; g.lineWidth = 2; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + sw * 20, -h); g.stroke(); for (let j = 0; j < 5; j++) ell(g, x + sw * 20 * (j / 5), -h + j * 4, 3.4, 2.6, j % 2 ? "#a77cff" : "#8f5fe8"); } break;
      case "bluebell": shadow(g, 20, 8); leaves(g, 5, 30, seed, t);
        for (let k = 0; k < 3; k++) { const x = -10 + k * 10 + sw * 30; g.strokeStyle = LEAF2; g.lineWidth = 2; g.beginPath(); g.moveTo(x, 2); g.quadraticCurveTo(x + 2, -22, x + 10, -20); g.stroke(); for (let j = 0; j < 3; j++) { ell(g, x + 4 + j * 3, -18 + j * 5, 4, 5, "#5f8fff"); ell(g, x + 4 + j * 3, -15 + j * 5, 3, 1.5, "#3a5fd8"); } } break;
      case "sunflower": shadow(g, 18, 8, 6); g.strokeStyle = LEAF2; g.lineWidth = 4; g.beginPath(); g.moveTo(0, 2); g.lineTo(sw * 30, -30); g.stroke(); ell(g, -8, -12, 10, 4, LEAF, -0.5); ell(g, 8, -18, 10, 4, LEAF, 0.5); bloom(g, sw * 30, -34, 18, 14, "#ffcc22", "#7a4a1a", seed, "long"); for (let i = 0; i < 6; i++) circ(g, sw * 30 + Math.cos(i) * 3, -34 + Math.sin(i * 2) * 3, 1, "#4a2a0a"); break;
      case "foxglove": shadow(g, 18, 8); leaves(g, 5, 30, seed, t); for (let k = 0; k < 2; k++) { const x = -6 + k * 12 + sw * 30; g.strokeStyle = LEAF2; g.lineWidth = 3; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, -40); g.stroke(); for (let j = 0; j < 6; j++) { ell(g, x + (j % 2 ? 4 : -4), -38 + j * 6, 4.5, 4, j < 2 ? "#ffb3e0" : "#ff8fd0"); circ(g, x + (j % 2 ? 4 : -4), -37 + j * 6, 1.2, "#c8247a"); } } break;
      case "clover": shadow(g, 22, 8); for (let i = 0; i < 7; i++) { const x = (hash(i + seed) - 0.5) * 36, y = (hash(i + 9 + seed) - 0.5) * 22; for (let k = 0; k < 3; k++) { const a = k / 3 * TAU - 1.57; ell(g, x + Math.cos(a) * 3.5, y + Math.sin(a) * 3, 3.6, 3.2, i % 2 ? "#7fd65f" : "#5fbf4a"); } } circ(g, -6, -6, 5, "#ffd0e8"); circ(g, 9, 2, 4.5, "#ffffff"); circ(g, -6, -7, 2, "#ff9fd0"); break;
      case "rocks": shadow(g, 22, 8); [[-9, 2, 12, 9], [8, 0, 10, 8], [0, -8, 9, 7]].forEach(([x, y, rx, ry], i) => { ell(g, x, y, rx, ry, ["#9aa0ac", "#b2b8c2", "#8a909c"][i]); ell(g, x - 3, y - 3, rx * 0.45, ry * 0.35, "rgba(255,255,255,0.35)"); }); ell(g, -12, -2, 5, 3, "#6fae5a"); break;
      case "stones": [[-12, -10], [8, -2], [-4, 12]].forEach(([x, y]) => { ell(g, x + 2, y + 2, 11, 7, "rgba(30,60,30,0.2)"); ell(g, x, y, 11, 7, "#c8c0b0"); ell(g, x - 2, y - 2, 6, 3, "rgba(255,255,255,0.35)"); }); break;
      case "puddle": water(g, 22, 13, t, seed, false); break;
      case "pond": water(g, 50, 36, t, seed, false); reeds(g, 40, 22, t); break;
      case "lilypond": water(g, 50, 36, t, seed, true); reeds(g, 40, 22, t); break;
      case "birdbath": shadow(g, 16, 7, 6); g.fillStyle = "#c8c0b0"; g.fillRect(-4, -18, 8, 20); ell(g, 0, -20, 18, 8, "#d8d0c0"); ell(g, 0, -21, 14, 5.5, "#6fc8ff"); ell(g, -4 + Math.sin(t) * 2, -22, 4, 1.4, "rgba(255,255,255,0.7)"); break;
      case "logs": shadow(g, 24, 9); for (let i = 0; i < 3; i++) { const y = i === 2 ? -12 : 0, x = i === 2 ? 0 : (i ? 10 : -10); g.fillStyle = "#8a5a3c"; g.beginPath(); g.ellipse(x, y, 9, 8, 0, 0, TAU); g.fill(); g.fillStyle = "#a8784a"; g.fillRect(x - 9, y - 18, 18, 18); ell(g, x, y - 18, 9, 8, "#e0b880"); g.strokeStyle = "#a8784a"; g.lineWidth = 1.2; g.beginPath(); g.ellipse(x, y - 18, 5, 4.5, 0, 0, TAU); g.stroke(); } ell(g, 12, 4, 6, 3, "#6fae5a"); break;
      case "beehotel": shadow(g, 14, 6, 6); g.fillStyle = "#b8763c"; g.fillRect(-13, -34, 26, 34); g.fillStyle = "#8a5428"; g.beginPath(); g.moveTo(-17, -32); g.lineTo(0, -44); g.lineTo(17, -32); g.closePath(); g.fill(); for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) { circ(g, -7 + c * 7, -26 + r * 7, 2.6, "#5a3418"); } break;
      case "nestbox": shadow(g, 10, 5, 6); g.fillStyle = "#8a5a3c"; g.fillRect(-3, -30, 6, 32); g.fillStyle = "#c98a5c"; g.fillRect(-12, -52, 24, 24); g.fillStyle = "#5a8f6a"; g.beginPath(); g.moveTo(-16, -50); g.lineTo(0, -60); g.lineTo(16, -50); g.closePath(); g.fill(); circ(g, 0, -42, 4.5, "#3a2418"); g.fillRect(-1, -36, 2, 4); break;
      case "hoghouse": shadow(g, 22, 9); g.fillStyle = "#a8784a"; g.beginPath(); g.ellipse(0, -2, 22, 18, 0, Math.PI, TAU); g.fill(); for (let i = 0; i < 9; i++) ell(g, -18 + i * 4.5, -14 + Math.abs(i - 4) * 2.5, 6, 3, ["#d8883c", "#c86a2a", "#e8a84a"][i % 3], (i - 4) * 0.25); g.fillStyle = "#3a2418"; g.beginPath(); g.ellipse(0, -2, 7, 8, 0, Math.PI, TAU); g.fill(); break;
      case "berries": shadow(g, 20, 8); circ(g, 0, -12, 18, "#3f9a50"); circ(g, -10, -6, 12, "#4fae5a"); circ(g, 10, -8, 12, "#47a456"); for (let i = 0; i < 9; i++) circ(g, -12 + hash(i + seed) * 24, -20 + hash(i + 3 + seed) * 18, 3, i % 3 ? "#e8304a" : "#ff6f8f"); break;
      case "feeder": shadow(g, 10, 5, 6); g.fillStyle = "#6a6f7a"; g.fillRect(-2, -46, 4, 48); g.fillRect(-14, -46, 28, 3); g.strokeStyle = "#6a6f7a"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(10, -44); g.lineTo(10, -38); g.stroke(); g.fillStyle = "rgba(200,230,255,0.8)"; g.fillRect(5, -38, 10, 18); g.fillStyle = "#d8b06a"; g.fillRect(6, -30, 8, 9); g.fillStyle = "#8a5a3c"; g.fillRect(3, -21, 14, 3); g.fillStyle = "#5a8f6a"; g.beginPath(); g.moveTo(3, -38); g.lineTo(10, -43); g.lineTo(17, -38); g.fill(); break;
      case "fruittree": tree(g, t, seed, "#5fbf5a", "#4aa84a", (gg) => { for (let i = 0; i < 10; i++) circ(gg, -34 + hash(i + seed) * 68, -96 + hash(i + 5 + seed) * 50, 4.5, "#ff4f4f"); }); break;
      case "oak": tree(g, t, seed, "#3f9a50", "#2f7f42", (gg) => { for (let i = 0; i < 8; i++) { const x = -32 + hash(i + seed) * 64, y = -100 + hash(i + 5 + seed) * 54; ell(gg, x, y, 3, 4, "#b8763c"); ell(gg, x, y - 3, 3.4, 2, "#6a4a2a"); } }, 1.15); break;
      case "lantern": shadow(g, 8, 4, 6); g.fillStyle = "#4a4a5a"; g.fillRect(-2, -40, 4, 42); g.fillRect(-2, -42, 14, 3); if (night) { const gl = g.createRadialGradient(10, -32, 2, 10, -32, 46); gl.addColorStop(0, "rgba(255,220,140,0.75)"); gl.addColorStop(1, "rgba(255,220,140,0)"); g.fillStyle = gl; g.fillRect(-36, -78, 92, 92); } ell(g, 10, -32, 6, 8, night ? "#ffe8a0" : "#fff3c8"); g.fillStyle = "#4a4a5a"; g.fillRect(5, -41, 10, 3); break;
      case "bench": shadow(g, 24, 7); g.fillStyle = "#6a4a2a"; g.fillRect(-22, -12, 3, 12); g.fillRect(19, -12, 3, 12); for (let i = 0; i < 3; i++) { g.fillStyle = i % 2 ? "#c98a5c" : "#b8763c"; g.fillRect(-24, -16 + i * 4 - (i === 0 ? 10 : 0), 48, 4); } g.fillStyle = "#b8763c"; g.fillRect(-24, -30, 48, 4); g.fillRect(-24, -24, 48, 4); break;
      case "toadstools": shadow(g, 18, 7); [[-8, 0, 1], [8, -4, 0.8], [0, 6, 0.6]].forEach(([x, y, k]) => { g.fillStyle = "#fff3e0"; g.fillRect(x - 3 * k, y - 12 * k, 6 * k, 12 * k); g.fillStyle = "#e8403a"; g.beginPath(); g.ellipse(x, y - 12 * k, 11 * k, 7 * k, 0, Math.PI, TAU); g.fill(); for (let i = 0; i < 3; i++) circ(g, x - 5 * k + i * 5 * k, y - 15 * k + (i % 2) * 3 * k, 1.6 * k, "#fff"); }); break;
    }
  }
  function water(g, rx, ry, t, seed, lily) {
    g.save();
    ell(g, 0, 2, rx + 6, ry + 5, "#8fbf6a");
    const gg = g.createRadialGradient(-rx * 0.2, -ry * 0.2, 2, 0, 0, rx); gg.addColorStop(0, "#7fd8ff"); gg.addColorStop(0.6, "#3fa8e0"); gg.addColorStop(1, "#2f7fc8");
    g.fillStyle = gg; g.beginPath();
    for (let i = 0; i <= 24; i++) { const a = i / 24 * TAU, w = 1 + 0.08 * Math.sin(a * 3 + seed * 5); i ? g.lineTo(Math.cos(a) * rx * w, Math.sin(a) * ry * w) : g.moveTo(Math.cos(a) * rx * w, Math.sin(a) * ry * w); }
    g.closePath(); g.fill();
    g.clip();
    g.strokeStyle = "rgba(255,255,255,0.5)"; g.lineWidth = 2;
    for (let i = 0; i < 3; i++) { const k = (t * 0.25 + i / 3) % 1; g.globalAlpha = 1 - k; g.beginPath(); g.ellipse(-rx * 0.3 + i * rx * 0.25, ry * 0.1 - i * 4, 4 + k * rx * 0.4, 2 + k * ry * 0.3, 0, 0, TAU); g.stroke(); }
    g.globalAlpha = 1;
    ell(g, -rx * 0.35, -ry * 0.45, rx * 0.3, ry * 0.1, "rgba(255,255,255,0.35)", -0.2);
    if (lily) for (let i = 0; i < 4; i++) { const x = -rx * 0.5 + i * rx * 0.33, y = (hash(i + seed) - 0.5) * ry; g.fillStyle = "#4fbf5a"; g.beginPath(); g.moveTo(x, y); g.arc(x, y, 9, 0.3, TAU - 0.1); g.closePath(); g.fill(); if (i % 2) { bloom(g, x + 2, y - 2, 6, 6, "#ffc2e0", "#ffd23f", i, "long"); } }
    g.restore();
    // rim stones
    for (let i = 0; i < 7; i++) { const a = 0.4 + i * 0.35, x = Math.cos(a) * (rx + 2), y = Math.sin(a) * (ry + 2); ell(g, x, y, 6, 4, "#b8b8b0"); }
  }
  function reeds(g, x0, y0, t) { for (let i = 0; i < 5; i++) { const x = x0 - 6 + i * 4, s = Math.sin(t * 1.3 + i) * 2; g.strokeStyle = "#5f9f4a"; g.lineWidth = 2.2; g.beginPath(); g.moveTo(x, y0); g.lineTo(x + s, y0 - 26 - (i % 2) * 6); g.stroke(); if (i % 2) ell(g, x + s, y0 - 30 - (i % 2) * 6, 2.2, 6, "#8a5a3c"); } }
  function tree(g, t, seed, c1, c2, extra, k = 1) {
    g.save(); g.scale(k, k);
    ell(g, 6, 6, 44, 16, "rgba(30,60,30,0.25)");
    g.fillStyle = "#8a5a3c"; g.fillRect(-7, -50, 14, 54); ell(g, 0, 4, 9, 4, "#6a4a2a");
    const sw = Math.sin(t * 0.9 + seed) * 1.5;
    [[-22, -78, 28], [22, -80, 26], [0, -100, 32], [-8, -64, 24], [14, -64, 22]].forEach(([x, y, r], i) => circ(g, x + sw, y, r, i % 2 ? c2 : c1));
    [[-14, -104, 10], [16, -92, 8]].forEach(([x, y, r]) => circ(g, x + sw, y, r, "rgba(255,255,255,0.18)"));
    extra(g);
    g.restore();
  }

  /* ---------- the keeper's cottage: an acorn house ---------- */
  function cottage(g, t, night) {
    ell(g, 6, 8, 54, 18, "rgba(30,60,30,0.25)");
    // body
    const gb = g.createLinearGradient(-44, 0, 44, 0); gb.addColorStop(0, "#e8b878"); gb.addColorStop(1, "#c98a4a");
    g.fillStyle = gb; g.beginPath(); g.moveTo(-42, 0); g.bezierCurveTo(-46, -50, -30, -70, 0, -72); g.bezierCurveTo(30, -70, 46, -50, 42, 0); g.quadraticCurveTo(0, 14, -42, 0); g.fill();
    // cap
    g.fillStyle = "#7a4a2a"; g.beginPath(); g.moveTo(-50, -56); g.bezierCurveTo(-48, -100, 48, -100, 50, -56); g.quadraticCurveTo(0, -42, -50, -56); g.fill();
    g.strokeStyle = "#5a3418"; g.lineWidth = 2; for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(i * 12 - 6, -88 + Math.abs(i) * 4); g.lineTo(i * 12 + 6, -58 + Math.abs(i) * 1); g.stroke(); }
    g.fillStyle = "#5a3418"; g.fillRect(-3, -108, 6, 14);
    // door & windows
    g.fillStyle = "#6a3a2a"; g.beginPath(); g.moveTo(-11, 2); g.lineTo(-11, -20); g.arc(0, -20, 11, Math.PI, TAU); g.lineTo(11, 2); g.fill();
    circ(g, 5, -10, 1.6, "#ffd23f");
    const wcol = night ? "#ffd86b" : "#bfe8ff";
    [[-26, -34], [26, -34]].forEach(([x, y]) => { circ(g, x, y, 8, "#8a5a3c"); circ(g, x, y, 6, wcol); g.strokeStyle = "#8a5a3c"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x - 6, y); g.lineTo(x + 6, y); g.moveTo(x, y - 6); g.lineTo(x, y + 6); g.stroke(); });
    if (night) { const gl = g.createRadialGradient(0, -30, 10, 0, -30, 90); gl.addColorStop(0, "rgba(255,210,120,0.35)"); gl.addColorStop(1, "rgba(255,210,120,0)"); g.fillStyle = gl; g.fillRect(-90, -120, 180, 180); }
    // smoke
    for (let i = 0; i < 3; i++) { const k = (t * 0.3 + i / 3) % 1; circ(g, Math.sin(k * 6 + i) * 6, -114 - k * 40, 4 + k * 6, `rgba(255,255,255,${0.5 * (1 - k)})`); }
    // little flower boxes
    [[-26, -25], [26, -25]].forEach(([x, y]) => { g.fillStyle = "#8a5a3c"; g.fillRect(x - 9, y, 18, 4); [-5, 0, 5].forEach((dx, i) => circ(g, x + dx, y - 2, 2.6, ["#ff8fd0", "#ffd23f", "#ffffff"][i])); });
  }

  /* ---------- visitors (facing right; flip for left) ---------- */
  function critter(g, id, t, o = {}) {
    const flap = Math.sin(t * 30), f2 = Math.abs(Math.sin(t * 12));
    g.save(); if (o.dir < 0) g.scale(-1, 1);
    switch (id) {
      case "honeybee": case "bumble": {
        const big = id === "bumble" ? 1.35 : 1;
        g.scale(big, big);
        g.globalAlpha = 0.75; ell(g, -2, -7 - f2 * 2, 6, 3.5, "#e8f6ff", -0.4); ell(g, 3, -7 - f2 * 2, 5, 3, "#e8f6ff", 0.4); g.globalAlpha = 1;
        ell(g, 0, 0, 7, 5.5, id === "bumble" ? "#ffcc33" : "#ffd23f"); g.fillStyle = "#2a2340"; g.fillRect(-3, -5, 2.5, 10); g.fillRect(2, -5, 2.5, 10);
        if (id === "bumble") { ell(g, -6, 0, 3, 4.5, "#fff3d8"); }
        circ(g, 7, -1, 3.5, "#2a2340"); circ(g, 8, -2, 1, "#fff");
        break;
      }
      case "ladybug": ell(g, 0, 0, 7, 6, "#e8303a"); g.fillStyle = "#2a2340"; g.fillRect(-0.6, -6, 1.2, 12); [[-3, -2], [3, 2], [-3, 3], [3, -3]].forEach(([x, y]) => circ(g, x, y, 1.4, "#2a2340")); circ(g, 7, 0, 3, "#2a2340"); circ(g, 8, -1, 0.8, "#fff"); break;
      case "white": case "peacock": case "blue": case "moth": {
        const cols = { white: ["#ffffff", "#e8e8f0"], peacock: ["#c8303a", "#8a1a2a"], blue: ["#7fb8ff", "#4f7fe8"], moth: ["#f0f4ff", "#c8d0e8"] }[id];
        const w = 0.25 + Math.abs(flap) * 0.75, s = id === "moth" ? 1.2 : 1;
        g.scale(s, s);
        [-1, 1].forEach(side => { g.save(); g.scale(1, side); ell(g, -2, -8 * w, 9, 8 * w, cols[0], -0.3); ell(g, -6, -4 * w, 6, 5 * w, cols[1], 0.3);
          if (id === "peacock") { circ(g, -3, -9 * w, 3, "#ffd23f"); circ(g, -3, -9 * w, 1.6, "#2a5fd8"); }
          if (id === "white") circ(g, 2, -9 * w, 1.6, "#2a2340");
          if (id === "moth") { circ(g, -2, -8 * w, 2.4, "#b8c0e0"); } g.restore(); });
        ell(g, 0, 0, 7, 1.8, "#2a2340"); g.strokeStyle = "#2a2340"; g.lineWidth = 0.8; g.beginPath(); g.moveTo(6, 0); g.lineTo(10, -4); g.moveTo(6, 0); g.lineTo(10, 3); g.stroke();
        break;
      }
      case "dragonfly": { const w = 0.4 + Math.abs(flap) * 0.6; g.globalAlpha = 0.6; [-1, 1].forEach(s => { ell(g, 2, s * 8 * w, 4, 9 * w, "#dff4ff"); ell(g, -3, s * 7 * w, 3.5, 8 * w, "#dff4ff"); }); g.globalAlpha = 1; g.strokeStyle = "#3fb8d8"; g.lineWidth = 3; g.lineCap = "round"; g.beginPath(); g.moveTo(-16, 0); g.lineTo(6, 0); g.stroke(); circ(g, 8, 0, 3.6, "#2f8fb8"); break; }
      case "firefly": for (let i = 0; i < 4; i++) { const x = Math.sin(t * 2 + i * 1.7) * 14, y = Math.cos(t * 1.6 + i * 2.3) * 9, a = 0.5 + 0.5 * Math.sin(t * 6 + i); const gl = g.createRadialGradient(x, y, 0, x, y, 12); gl.addColorStop(0, `rgba(255,250,150,${a})`); gl.addColorStop(1, "rgba(255,250,150,0)"); g.fillStyle = gl; g.fillRect(x - 12, y - 12, 24, 24); circ(g, x, y, 1.8, "#fffbd0"); } break;
      case "snail": { ell(g, 2, 2, 12, 3.5, "#c8b89a"); circ(g, 12, -1, 3, "#c8b89a"); g.strokeStyle = "#c8b89a"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(13, -2); g.lineTo(15, -8); g.stroke(); circ(g, 15, -8, 1.2, "#2a2340"); circ(g, -1, -5, 8, "#c88a4a"); g.strokeStyle = "#8a5a2a"; g.lineWidth = 1.6; g.beginPath(); for (let a = 0; a < 10; a += 0.3) { const r = a * 0.7; g.lineTo(-1 + Math.cos(a) * r, -5 + Math.sin(a) * r); } g.stroke(); break; }
      case "frog": { const hop = o.hop || 0; g.translate(0, -hop * 10); ell(g, 0, 0, 10, 7, "#5fbf4a"); ell(g, -6, 4, 5, 3, "#4aa83a"); ell(g, 2, 2, 6, 3.5, "#c8f0a0"); circ(g, 5, -6, 3.6, "#5fbf4a"); circ(g, 9, -5, 3.6, "#5fbf4a"); circ(g, 5, -6, 2, "#fff"); circ(g, 9, -5, 2, "#fff"); circ(g, 5.6, -6, 1, "#2a2340"); circ(g, 9.6, -5, 1, "#2a2340"); break; }
      case "robin": case "bluetit": case "owl": {
        const hop = o.hop || 0, fly = o.fly; g.translate(0, -hop * 6);
        if (id === "owl") { ell(g, 0, -10, 12, 15, "#9a6a48"); ell(g, 2, -8, 8, 10, "#e8d0a8"); circ(g, -3, -18, 5, "#fff"); circ(g, 5, -18, 5, "#fff"); circ(g, -3, -18, 2.6, "#2a2340"); circ(g, 5, -18, 2.6, "#2a2340"); g.fillStyle = "#e8a83c"; g.beginPath(); g.moveTo(1, -15); g.lineTo(3, -11); g.lineTo(-1, -12); g.fill(); break; }
        const body = id === "robin" ? "#9a6a48" : "#7fb8e8", breast = id === "robin" ? "#ff7a3c" : "#ffd23f";
        if (fly) { const w = Math.abs(flap); ell(g, -2, -10 - w * 6, 8, 4, body, -0.4); }
        ell(g, 0, -8, 10, 8, body); ell(g, 3, -6, 6, 6, breast); circ(g, 7, -14, 5.5, id === "robin" ? body : "#ffffff"); if (id === "bluetit") ell(g, 7, -17, 5, 2.6, "#3f7fe8");
        circ(g, 9, -15, 1.4, "#2a2340"); g.fillStyle = "#e8a83c"; g.beginPath(); g.moveTo(12, -14); g.lineTo(16, -13); g.lineTo(12, -12); g.fill();
        ell(g, -9, -10, 6, 2.4, shade(body, -0.25), 0.4); g.strokeStyle = "#8a5a3c"; g.lineWidth = 1.4; g.beginPath(); g.moveTo(-1, -1); g.lineTo(-1, 2); g.moveTo(2, -1); g.lineTo(2, 2); g.stroke();
        break;
      }
      case "duck": { ell(g, 0, 0, 12, 7, "#ffe066"); ell(g, -4, -2, 6, 4, "#ffd23f"); circ(g, 8, -7, 6, "#ffe066"); circ(g, 10, -8, 1.3, "#2a2340"); g.fillStyle = "#ff9a3c"; g.beginPath(); g.ellipse(14, -6, 3.5, 1.6, 0, 0, TAU); g.fill(); g.strokeStyle = "rgba(255,255,255,0.6)"; g.lineWidth = 1.2; g.beginPath(); g.ellipse(0, 4, 14 + Math.sin(t * 3) * 2, 3, 0, 0, Math.PI); g.stroke(); break; }
      case "squirrel": case "fox": case "hedgehog": {
        const step = Math.sin(t * 14) * (o.walk ? 1 : 0);
        if (id === "hedgehog") { g.fillStyle = "#8a6a4a"; g.beginPath(); for (let i = 0; i <= 14; i++) { const a = Math.PI + i / 14 * Math.PI, r = i % 2 ? 11 : 14; g.lineTo(Math.cos(a) * r, -2 + Math.sin(a) * r * 0.8); } g.closePath(); g.fill(); ell(g, 0, -1, 12, 4, "#c8a888"); ell(g, 11, -2, 5, 3.6, "#e8d0b0"); circ(g, 15, -2, 1.4, "#2a2340"); circ(g, 11, -4, 1, "#2a2340"); [-6, 4].forEach((x, i) => ell(g, x + (i ? step : -step) * 2, 2, 2.4, 1.6, "#6a4a2a")); break; }
        const c = id === "fox" ? "#ff8f3c" : "#c8582a";
        // tail
        g.save(); g.translate(-10, -6); g.rotate(-0.8 + Math.sin(t * 3) * 0.1); ell(g, 0, -8, id === "fox" ? 6 : 7, id === "fox" ? 12 : 13, c); if (id === "fox") ell(g, 0, -18, 4, 4, "#fff"); g.restore();
        ell(g, 0, -6, 11, 7, c); if (id === "fox") ell(g, 3, -4, 6, 4, "#fff3e0");
        [-6, 6].forEach((x, i) => ell(g, x + (i ? step : -step) * 2.5, 1, 2.4, 3, shade(c, -0.3)));
        circ(g, 10, -12, 6.5, c); if (id === "fox") { g.fillStyle = c; g.beginPath(); g.moveTo(6, -16); g.lineTo(8, -24); g.lineTo(11, -17); g.fill(); g.beginPath(); g.moveTo(11, -17); g.lineTo(14, -24); g.lineTo(15, -15); g.fill(); ell(g, 15, -10, 4, 2.6, "#fff3e0"); } else { circ(g, 9, -18, 2.8, c); }
        circ(g, 12, -13, 1.4, "#2a2340"); circ(g, 17, -10, 1.2, "#2a2340");
        break;
      }
    }
    g.restore();
  }

  /* little canvases for the UI */
  function canvasOf(px, fn) { const c = document.createElement("canvas"), dpr = Math.min(2, devicePixelRatio || 1); c.width = c.height = px * dpr; c.style.width = c.style.height = px + "px"; const g = c.getContext("2d"); g.scale(dpr, dpr); fn(g); return c; }
  function itemCanvas(id, px = 64) { const it = C.items[id], s = it.size; return canvasOf(px, g => { g.translate(px / 2, px * (s === 2 ? 0.66 : 0.68)); const k = px / (T * (s === 2 ? 2.1 : 1.15)); g.scale(k, k); item(g, id, 0.4, false, 1); }); }
  function critterCanvas(id, px = 64, locked = false) { return canvasOf(px, g => { if (locked) g.filter = "brightness(0) opacity(0.22)"; g.translate(px / 2, px * 0.6); const k = px / 44; g.scale(k, k); critter(g, id, 0.13, { dir: 1 }); }); }
  return { item, cottage, critter, itemCanvas, critterCanvas, shade, hash, T };
})();

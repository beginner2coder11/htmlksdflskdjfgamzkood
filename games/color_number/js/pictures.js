/* COLOR BY NUMBER — the picture library. Every picture is drawn here in code (shapes on a 100 × 100 sheet) with
   its own palette, then turned into a pixel grid: drawn 4× bigger, every sub-pixel snapped to the nearest palette
   colour, and each cell takes the colour most of its sub-pixels have. Add a picture: copy one entry, change the
   palette and the shapes. Colour numbers follow the palette order. */
window.Pictures = (() => {
  // drawing helpers in 100-unit space; c = palette index
  function pen(g, P) {
    const f = c => { g.fillStyle = P[c]; }, s = (c, w) => { g.strokeStyle = P[c]; g.lineWidth = w; g.lineCap = "round"; g.lineJoin = "round"; };
    return {
      bg(c) { f(c); g.fillRect(-1, -1, 102, 102); },
      rect(c, x, y, w, h) { f(c); g.fillRect(x, y, w, h); },
      rr(c, x, y, w, h, r) { f(c); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); g.fill(); },
      circ(c, x, y, r) { f(c); g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); },
      ell(c, x, y, rx, ry, a = 0) { f(c); g.beginPath(); g.ellipse(x, y, rx, ry, a, 0, Math.PI * 2); g.fill(); },
      poly(c, ...p) { f(c); g.beginPath(); for (let i = 0; i < p.length; i += 2) g[i ? "lineTo" : "moveTo"](p[i], p[i + 1]); g.closePath(); g.fill(); },
      line(c, w, ...p) { s(c, w); g.beginPath(); for (let i = 0; i < p.length; i += 2) g[i ? "lineTo" : "moveTo"](p[i], p[i + 1]); g.stroke(); },
      arc(c, w, x, y, r, a0, a1) { s(c, w); g.beginPath(); g.arc(x, y, r, a0, a1); g.stroke(); },
      half(c, x, y, r, a0, a1) { f(c); g.beginPath(); g.moveTo(x, y); g.arc(x, y, r, a0, a1); g.closePath(); g.fill(); },
      star(c, x, y, r, k = 0.45, n = 5, rot = -Math.PI / 2) { f(c); g.beginPath(); for (let i = 0; i < n * 2; i++) { const a = rot + i * Math.PI / n, rr = i % 2 ? r * k : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fill(); },
      heart(c, x, y, r) { f(c); g.beginPath(); g.moveTo(x, y + r * 0.9); g.bezierCurveTo(x - r * 1.6, y - r * 0.2, x - r * 0.7, y - r * 1.3, x, y - r * 0.45); g.bezierCurveTo(x + r * 0.7, y - r * 1.3, x + r * 1.6, y - r * 0.2, x, y + r * 0.9); g.fill(); },
      clip(fn, draw) { g.save(); g.beginPath(); fn(g); g.clip(); draw(); g.restore(); },
      g
    };
  }
  const PI = Math.PI;

  const LIST = [
    /* ---------------- Animals ---------------- */
    { id: "cat", name: "Ginger Cat", cat: "Animals", n: 36, pal: ["#cfe8ff", "#ff9f43", "#d9741f", "#ffffff", "#2b2b3a", "#7ed957", "#ff8fab"], draw: d => {
      d.bg(0); d.line(1, 8, 74, 88, 88, 80, 90, 64, 84, 56);
      d.ell(1, 50, 80, 25, 19); d.ell(3, 50, 84, 12, 13);
      d.poly(1, 29, 34, 27, 9, 47, 25); d.poly(1, 71, 34, 73, 9, 53, 25); d.poly(6, 32, 28, 31, 16, 42, 24); d.poly(6, 68, 28, 69, 16, 58, 24);
      d.circ(1, 50, 45, 23); d.rect(2, 47, 22, 6, 9); d.rect(2, 39, 24, 4, 6); d.rect(2, 57, 24, 4, 6);
      d.ell(3, 50, 55, 12, 8); d.ell(5, 40, 42, 5, 6); d.ell(5, 60, 42, 5, 6); d.ell(4, 40, 42, 2, 5); d.ell(4, 60, 42, 2, 5);
      d.poly(6, 46, 50, 54, 50, 50, 55); d.line(4, 1.3, 50, 55, 50, 58); d.line(4, 1, 37, 55, 22, 52); d.line(4, 1, 37, 58, 22, 61); d.line(4, 1, 63, 55, 78, 52); d.line(4, 1, 63, 58, 78, 61);
      d.ell(3, 39, 97, 7, 4); d.ell(3, 61, 97, 7, 4); } },
    { id: "puppy", name: "Happy Puppy", cat: "Animals", n: 36, pal: ["#fff1c9", "#e8b77a", "#8a5a36", "#2b2b3a", "#ffffff", "#ff7b9c", "#e63946", "#ffd23f"], draw: d => {
      d.bg(0); d.ell(1, 50, 88, 28, 16); d.circ(1, 50, 48, 26);
      d.ell(2, 25, 44, 9, 20, 0.35); d.ell(2, 75, 44, 9, 20, -0.35); d.ell(2, 61, 40, 9, 8);
      d.ell(4, 50, 60, 14, 10); d.circ(3, 41, 44, 3.6); d.circ(3, 59, 44, 3.6); d.circ(4, 42, 43, 1.2); d.circ(4, 60, 43, 1.2);
      d.ell(3, 50, 54, 5, 3.5); d.line(3, 1.4, 50, 57, 50, 61); d.arc(3, 1.4, 46, 61, 4, 0.2, PI - 0.2); d.arc(3, 1.4, 54, 61, 4, 0.2, PI - 0.2);
      d.rr(5, 46, 63, 8, 10, 4); d.rr(6, 30, 72, 40, 6, 3); d.circ(7, 50, 79, 4.5); } },
    { id: "fox", name: "Little Fox", cat: "Animals", n: 40, pal: ["#d8f3dc", "#ff7b29", "#ffffff", "#2b2b3a", "#c4501a", "#52b788"], draw: d => {
      d.bg(0); d.ell(5, 50, 100, 60, 12);
      d.ell(1, 74, 78, 20, 10, -0.6); d.ell(2, 88, 66, 7, 5, -0.6);
      d.ell(1, 48, 80, 20, 17); d.ell(2, 48, 85, 10, 11);
      d.poly(1, 26, 40, 30, 12, 46, 30); d.poly(1, 70, 40, 66, 12, 50, 30); d.poly(3, 31, 30, 31, 17, 40, 28); d.poly(3, 65, 30, 65, 17, 56, 28);
      d.poly(1, 20, 44, 48, 26, 76, 44, 66, 62, 48, 70, 30, 62);
      d.poly(2, 20, 44, 34, 50, 48, 70, 30, 62); d.poly(2, 76, 44, 62, 50, 48, 70, 66, 62);
      d.ell(3, 38, 46, 3, 4); d.ell(3, 58, 46, 3, 4); d.circ(3, 48, 68, 3.2); d.line(4, 1.5, 44, 37, 48, 40, 52, 37); } },
    { id: "owl", name: "Night Owl", cat: "Animals", n: 40, pal: ["#243b6b", "#fff3b0", "#a0673a", "#e9c79a", "#ffffff", "#ffd23f", "#1b1b2a", "#ff9f1c", "#5a3b22"], draw: d => {
      d.bg(0); d.circ(1, 80, 18, 10); d.circ(0, 85, 15, 8); [[15, 15], [30, 8], [55, 12], [12, 40], [88, 45]].forEach(([x, y]) => d.star(1, x, y, 2.2));
      d.rr(8, 0, 84, 100, 7, 3);
      d.poly(2, 30, 26, 34, 12, 42, 22); d.poly(2, 70, 26, 66, 12, 58, 22);
      d.ell(2, 50, 54, 24, 30); d.ell(3, 50, 64, 15, 18);
      [[44, 58], [56, 58], [50, 66], [44, 74], [56, 74]].forEach(([x, y]) => d.arc(2, 1.5, x, y, 3, 0.2, PI - 0.2));
      d.circ(4, 40, 40, 9); d.circ(4, 60, 40, 9); d.circ(5, 40, 40, 6); d.circ(5, 60, 40, 6); d.circ(6, 40, 40, 3); d.circ(6, 60, 40, 3);
      d.poly(7, 46, 47, 54, 47, 50, 55); d.ell(7, 42, 85, 5, 3); d.ell(7, 58, 85, 5, 3); } },
    { id: "penguin", name: "Cozy Penguin", cat: "Animals", n: 36, pal: ["#bde0fe", "#ffffff", "#1f2a44", "#ffa62b", "#ef476f", "#9fd3ff"], draw: d => {
      d.bg(0); d.ell(1, 50, 104, 70, 18); d.ell(5, 30, 92, 12, 3);
      d.ell(2, 50, 58, 25, 33); d.ell(1, 50, 66, 17, 24); d.ell(2, 26, 62, 6, 16, 0.3); d.ell(2, 74, 62, 6, 16, -0.3);
      d.ell(1, 43, 34, 6, 7); d.ell(1, 57, 34, 6, 7); d.circ(2, 44, 35, 2.5); d.circ(2, 56, 35, 2.5); d.poly(3, 45, 41, 55, 41, 50, 47);
      d.rr(4, 30, 46, 40, 7, 3); d.rr(4, 56, 46, 8, 20, 3); d.ell(3, 42, 91, 7, 3); d.ell(3, 58, 91, 7, 3); } },
    { id: "frog", name: "Pond Frog", cat: "Animals", n: 36, pal: ["#8fd3f4", "#52b788", "#80ed99", "#ffffff", "#1b1b2a", "#ff8fab", "#2d6a4f"], draw: d => {
      d.bg(0); d.ell(1, 50, 82, 44, 15); d.poly(0, 50, 82, 88, 70, 92, 80); d.ell(3, 18, 30, 7, 2); d.ell(3, 82, 20, 6, 2);
      d.ell(2, 50, 64, 26, 18); d.circ(2, 36, 44, 10); d.circ(2, 64, 44, 10); d.circ(3, 36, 43, 6.5); d.circ(3, 64, 43, 6.5); d.circ(4, 37, 44, 3.2); d.circ(4, 65, 44, 3.2);
      d.arc(6, 2, 50, 58, 13, 0.25, PI - 0.25); d.circ(5, 34, 62, 3.5); d.circ(5, 66, 62, 3.5); d.ell(6, 30, 80, 8, 4); d.ell(6, 70, 80, 8, 4); } },
    { id: "fish", name: "Coral Fish", cat: "Animals", n: 40, pal: ["#4cc9f0", "#ff8c42", "#ffffff", "#1b1b2a", "#e8590c", "#caf0f8", "#2d9a5a", "#f7c59f"], draw: d => {
      d.bg(0); d.rect(7, 0, 90, 100, 10); d.line(6, 4, 12, 90, 9, 75, 14, 62, 10, 50); d.line(6, 4, 88, 90, 92, 72, 87, 60);
      d.poly(4, 68, 52, 90, 36, 90, 68); d.poly(4, 40, 36, 56, 24, 60, 38); d.poly(4, 44, 66, 56, 76, 58, 64);
      d.ell(1, 48, 52, 26, 16); d.clip(g => g.ellipse(48, 52, 26, 16, 0, 0, PI * 2), () => { d.rect(2, 34, 30, 7, 40); d.rect(2, 52, 30, 7, 40); });
      d.circ(2, 31, 48, 5); d.circ(3, 31, 48, 2.6); d.arc(3, 1.3, 26, 56, 3, 0.2, PI - 0.6);
      d.circ(5, 20, 30, 3); d.circ(5, 16, 20, 2); d.circ(5, 22, 12, 1.6); } },
    { id: "whale", name: "Blue Whale", cat: "Animals", n: 40, pal: ["#90e0ef", "#3a6ea5", "#cfe8ff", "#ffffff", "#0077b6", "#1b1b2a", "#ffd166"], draw: d => {
      d.bg(0); d.circ(6, 84, 16, 8); d.rect(4, 0, 74, 100, 26); for (let x = 0; x < 100; x += 12) d.arc(4, 3, x + 6, 74, 6, PI, 0);
      d.line(3, 2.5, 46, 36, 46, 22); d.line(3, 2.5, 46, 24, 38, 16); d.line(3, 2.5, 46, 24, 54, 16);
      d.ell(1, 46, 54, 30, 18); d.poly(1, 70, 50, 92, 34, 88, 50, 94, 62); d.clip(g => g.ellipse(46, 54, 30, 18, 0, 0, PI * 2), () => d.ell(2, 42, 70, 30, 10));
      d.circ(5, 30, 50, 2.5); d.arc(5, 1.4, 26, 58, 5, 0.3, PI * 0.8); d.ell(1, 52, 68, 8, 3, 0.5); } },
    { id: "turtle", name: "Sea Turtle", cat: "Animals", n: 40, pal: ["#ffe8b0", "#2d9a5a", "#7bd389", "#a7d676", "#1b1b2a", "#f4a261"], draw: d => {
      d.bg(0); [[14, 20], [86, 80], [80, 14]].forEach(([x, y]) => d.star(5, x, y, 5, 0.5));
      d.ell(3, 26, 64, 9, 5, 0.6); d.ell(3, 74, 64, 9, 5, -0.6); d.ell(3, 28, 36, 9, 5, -0.6); d.ell(3, 72, 36, 9, 5, 0.6); d.poly(3, 50, 76, 46, 84, 54, 84);
      d.circ(3, 50, 20, 9); d.circ(4, 46, 18, 1.6); d.circ(4, 54, 18, 1.6);
      d.ell(1, 50, 50, 22, 26); [[50, 50, 7], [50, 34, 5], [50, 66, 5], [37, 42, 4.5], [63, 42, 4.5], [37, 58, 4.5], [63, 58, 4.5]].forEach(([x, y, r]) => d.star(2, x, y, r, 0.86, 6, 0)); } },
    { id: "ladybug", name: "Ladybug", cat: "Animals", n: 32, pal: ["#b7e4c7", "#40916c", "#e63946", "#1b1b2a", "#ffffff"], draw: d => {
      d.bg(0); d.ell(1, 50, 56, 44, 30, -0.4); d.line(0, 2, 16, 80, 84, 32);
      d.circ(3, 50, 30, 11); d.line(3, 1.5, 45, 22, 38, 12); d.line(3, 1.5, 55, 22, 62, 12); d.circ(4, 46, 28, 2); d.circ(4, 54, 28, 2);
      d.circ(2, 50, 58, 24); d.line(3, 2, 50, 36, 50, 82); [[40, 48, 4.5], [60, 48, 4.5], [38, 64, 4], [62, 64, 4], [50, 74, 0], [44, 76, 3], [56, 76, 3]].forEach(([x, y, r]) => r && d.circ(3, x, y, r)); } },
    { id: "butterfly", name: "Butterfly", cat: "Animals", n: 40, pal: ["#fdf0ff", "#9b5de5", "#f15bb5", "#fee440", "#2b2b3a", "#00bbf9"], draw: d => {
      d.bg(0); d.ell(1, 32, 36, 20, 17, -0.5); d.ell(1, 68, 36, 20, 17, 0.5); d.ell(2, 35, 66, 14, 13, 0.4); d.ell(2, 65, 66, 14, 13, -0.4);
      d.circ(3, 30, 34, 7); d.circ(3, 70, 34, 7); d.circ(5, 36, 66, 5); d.circ(5, 64, 66, 5); d.circ(0, 22, 46, 3); d.circ(0, 78, 46, 3);
      d.ell(4, 50, 52, 4, 24); d.circ(4, 50, 27, 5); d.line(4, 1.5, 48, 23, 42, 12); d.line(4, 1.5, 52, 23, 58, 12); d.circ(4, 42, 12, 2); d.circ(4, 58, 12, 2); } },
    { id: "panda", name: "Panda", cat: "Animals", n: 40, pal: ["#d8f3dc", "#ffffff", "#1b1b2a", "#52b788", "#ff8fab", "#95d5b2"], draw: d => {
      d.bg(0); d.rect(5, 6, 0, 6, 100); d.rect(5, 88, 0, 6, 100); d.ell(3, 14, 30, 8, 3, -0.6); d.ell(3, 92, 50, 8, 3, 0.6);
      d.ell(1, 50, 84, 28, 20); d.ell(2, 26, 84, 8, 12); d.ell(2, 74, 84, 8, 12);
      d.circ(2, 28, 26, 9); d.circ(2, 72, 26, 9); d.circ(1, 50, 46, 26);
      d.ell(2, 39, 44, 7, 9, 0.5); d.ell(2, 61, 44, 7, 9, -0.5); d.circ(1, 40, 43, 2.6); d.circ(1, 60, 43, 2.6);
      d.ell(2, 50, 55, 5, 3.5); d.arc(2, 1.4, 50, 57, 4, 0.3, PI - 0.3); d.circ(4, 32, 56, 4); d.circ(4, 68, 56, 4);
      d.rect(3, 60, 62, 6, 34); d.ell(3, 70, 64, 7, 3, -0.4); } },
    { id: "bunny", name: "Bunny & Carrot", cat: "Animals", n: 40, pal: ["#e9f5db", "#ffffff", "#ffb3c6", "#d9d9e3", "#1b1b2a", "#ff8c42", "#52b788"], draw: d => {
      d.bg(0); d.ell(1, 38, 22, 7, 20, -0.15); d.ell(1, 62, 22, 7, 20, 0.15); d.ell(2, 38, 24, 3.5, 14, -0.15); d.ell(2, 62, 24, 3.5, 14, 0.15);
      d.ell(1, 50, 80, 24, 18); d.ell(3, 50, 86, 14, 10); d.circ(1, 50, 52, 20);
      d.circ(4, 42, 50, 2.6); d.circ(4, 58, 50, 2.6); d.ell(2, 50, 57, 3, 2); d.circ(2, 37, 58, 3.5); d.circ(2, 63, 58, 3.5);
      d.poly(5, 66, 70, 86, 64, 70, 92); d.poly(6, 82, 64, 92, 54, 86, 66); d.poly(6, 84, 66, 94, 66, 86, 60); } },
    { id: "chick", name: "Spring Chick", cat: "Animals", n: 32, pal: ["#caffbf", "#ffd60a", "#ff9f1c", "#ffffff", "#1b1b2a", "#e0e0e0", "#80b918"], draw: d => {
      d.bg(0); d.ell(6, 50, 102, 70, 16);
      d.circ(1, 50, 50, 24); d.ell(1, 30, 56, 7, 10, 0.6); d.ell(1, 70, 56, 7, 10, -0.6); d.poly(1, 46, 26, 50, 18, 54, 26);
      d.circ(4, 42, 46, 3); d.circ(4, 58, 46, 3); d.poly(2, 45, 53, 55, 53, 50, 60);
      d.poly(3, 20, 70, 28, 62, 36, 72, 44, 62, 50, 72, 56, 62, 64, 72, 72, 62, 80, 70, 80, 82, 20, 82); d.ell(3, 50, 84, 30, 12); d.rect(5, 22, 82, 56, 2); } },

    /* ---------------- Food ---------------- */
    { id: "icecream", name: "Triple Scoop", cat: "Food", n: 40, pal: ["#ffd6e0", "#e8a85c", "#b8743a", "#ff8fab", "#95e1c4", "#7a4a2a", "#e63946", "#ffffff"], draw: d => {
      d.bg(0); d.poly(1, 32, 52, 68, 52, 50, 96); d.clip(g => { g.moveTo(32, 52); g.lineTo(68, 52); g.lineTo(50, 96); g.closePath(); }, () => { for (let k = -60; k < 60; k += 8) { d.line(2, 1.4, 30 + k, 50, 70 + k, 100); d.line(2, 1.4, 70 - k, 50, 30 - k, 100); } });
      d.circ(4, 37, 46, 13); d.circ(3, 63, 46, 13); d.circ(5, 50, 28, 14);
      [[44, 22], [55, 30], [48, 34], [58, 22]].forEach(([x, y], i) => d.rect(i % 2 ? 7 : 3, x, y, 3, 1.4));
      d.circ(6, 50, 13, 5); d.line(5, 1.5, 50, 9, 54, 3); d.circ(7, 48, 11, 1.4); } },
    { id: "cupcake", name: "Cupcake", cat: "Food", n: 36, pal: ["#e0fbfc", "#4cc9f0", "#3a9fc8", "#ffafcc", "#ffd166", "#e63946", "#ffffff", "#7b2cbf"], draw: d => {
      d.bg(0); d.poly(1, 26, 56, 74, 56, 68, 92, 32, 92); for (let x = 30; x < 74; x += 8) d.poly(2, x, 56, x + 3, 56, x + 2, 92, x - 1, 92);
      d.ell(3, 50, 54, 28, 9); d.ell(3, 50, 44, 23, 9); d.ell(3, 50, 34, 16, 8); d.ell(3, 50, 26, 9, 6);
      [[38, 46, 4], [58, 40, 7], [46, 32, 4], [62, 50, 7], [34, 54, 4], [52, 50, 6]].forEach(([x, y, c]) => d.rr(c, x, y, 4, 1.8, 0.9));
      d.circ(5, 50, 17, 5.5); d.circ(6, 48, 15, 1.5); d.line(5, 1.5, 50, 12, 54, 5); } },
    { id: "donut", name: "Pink Donut", cat: "Food", n: 36, pal: ["#fff3d6", "#e3a857", "#ff7eb6", "#ffffff", "#ffd166", "#4cc9f0", "#c2853b"], draw: d => {
      d.bg(0); d.ell(6, 50, 58, 38, 32); d.ell(1, 50, 54, 38, 32);
      d.poly(2, 16, 48, 22, 30, 40, 20, 60, 20, 78, 30, 84, 48, 80, 58, 72, 54, 64, 64, 54, 58, 44, 66, 34, 56, 24, 62);
      d.ell(0, 50, 46, 11, 8);
      [[30, 36, 3], [40, 28, 4], [58, 27, 5], [70, 36, 3], [74, 46, 4], [26, 46, 5], [36, 52, 4], [64, 52, 5], [56, 36, 3]].forEach(([x, y, c], i) => d.rr(c, x, y, 5, 2, 1)); } },
    { id: "melon", name: "Watermelon", cat: "Food", n: 40, pal: ["#d0f4de", "#2d6a4f", "#95d5b2", "#ff4d6d", "#1b1b2a", "#ffffff"], draw: d => {
      d.bg(0); d.half(1, 50, 30, 46, 0.12 * PI, 0.88 * PI); d.half(2, 50, 30, 41, 0.12 * PI, 0.88 * PI); d.half(3, 50, 30, 37, 0.12 * PI, 0.88 * PI);
      [[40, 44], [50, 52], [60, 44], [34, 56], [66, 56], [46, 64], [56, 64]].forEach(([x, y]) => d.ell(4, x, y, 1.6, 2.6));
      d.circ(5, 22, 80, 3); d.circ(5, 80, 86, 2); } },
    { id: "pizza", name: "Pizza Slice", cat: "Food", n: 40, pal: ["#ffe5d9", "#d9933a", "#ffd166", "#d62828", "#52b788", "#f4a261"], draw: d => {
      d.bg(0); d.poly(2, 20, 26, 80, 26, 50, 94); d.rr(1, 16, 16, 68, 12, 6);
      d.line(5, 3, 30, 50, 34, 60); d.line(5, 3, 62, 46, 58, 58);
      d.circ(3, 38, 40, 6); d.circ(3, 60, 38, 6); d.circ(3, 50, 62, 5.5); d.circ(3, 46, 80, 3.5);
      d.ell(4, 48, 46, 3, 1.5, 0.6); d.ell(4, 42, 70, 3, 1.5, -0.6); d.ell(4, 66, 30, 3, 1.5, 0.4); } },
    { id: "strawberry", name: "Strawberry", cat: "Food", n: 32, pal: ["#fff0f3", "#ef233c", "#ffd60a", "#2d9a5a", "#80b918", "#ff8fa3"], draw: d => {
      d.bg(0); d.poly(1, 24, 38, 50, 30, 76, 38, 70, 64, 50, 90, 30, 64); d.ell(1, 50, 46, 27, 16);
      d.ell(5, 38, 44, 4, 6, 0.4);
      [[40, 50], [52, 48], [62, 54], [44, 62], [56, 64], [50, 76], [34, 56], [64, 44], [46, 40]].forEach(([x, y]) => d.ell(2, x, y, 1.4, 2.2));
      d.poly(3, 32, 32, 42, 26, 50, 32, 58, 26, 68, 32, 58, 20, 50, 24, 42, 20); d.rect(4, 48, 10, 4, 14); } },
    { id: "apple", name: "Red Apple", cat: "Food", n: 32, pal: ["#e8f6ff", "#e5383b", "#ff8fa3", "#6b4423", "#52b788", "#b5121b"], draw: d => {
      d.bg(0); d.circ(5, 38, 58, 24); d.circ(1, 38, 56, 24); d.circ(1, 62, 56, 24); d.ell(1, 50, 72, 26, 16);
      d.ell(2, 32, 46, 5, 9, 0.5); d.ell(0, 50, 34, 6, 3); d.line(3, 3.5, 50, 36, 52, 18); d.ell(4, 62, 22, 10, 5, -0.4); } },
    { id: "burger", name: "Burger", cat: "Food", n: 40, pal: ["#fef3c7", "#e9a23b", "#ffffff", "#52b788", "#ffd166", "#6b3e26", "#e63946"], draw: d => {
      d.bg(0); d.half(1, 50, 46, 34, PI, 0); d.rect(1, 16, 45, 68, 3);
      [[34, 30], [48, 22], [62, 30], [40, 38], [56, 38], [50, 32]].forEach(([x, y]) => d.ell(2, x, y, 2.4, 1.3, 0.4));
      d.poly(3, 14, 50, 22, 56, 30, 50, 38, 56, 46, 50, 54, 56, 62, 50, 70, 56, 78, 50, 86, 56, 86, 52, 14, 52);
      d.poly(4, 16, 56, 84, 56, 76, 64, 66, 58, 56, 66, 46, 58, 24, 60); d.rr(5, 16, 58, 68, 10, 5); d.rect(6, 18, 68, 64, 4); d.rr(1, 16, 72, 68, 12, 6); } },
    { id: "boba", name: "Bubble Tea", cat: "Food", n: 40, pal: ["#f1e3ff", "#e8f4ff", "#c89f7a", "#3d2b1f", "#ff70a6", "#ffffff", "#9b5de5"], draw: d => {
      d.bg(0); d.line(4, 5, 56, 30, 66, 4); d.poly(1, 28, 30, 72, 30, 66, 92, 34, 92); d.poly(2, 30, 42, 70, 42, 66, 92, 34, 92);
      d.rr(6, 24, 24, 52, 8, 4); for (let i = 0; i < 9; i++) d.circ(3, 38 + (i % 4) * 8 + (i > 3 ? 4 : 0), 86 - ((i / 4) | 0) * 7, 3.2);
      d.ell(5, 38, 56, 2.5, 9); } },

    /* ---------------- Nature ---------------- */
    { id: "sunny", name: "Sunny Day", cat: "Nature", n: 40, pal: ["#8ecae6", "#ffd166", "#ffffff", "#80b918", "#55a630", "#ff6b9e", "#fff3b0"], draw: d => {
      d.bg(0); d.circ(1, 74, 24, 13); for (let k = 0; k < 8; k++) { const a = k * PI / 4; d.line(1, 3, 74 + Math.cos(a) * 17, 24 + Math.sin(a) * 17, 74 + Math.cos(a) * 23, 24 + Math.sin(a) * 23); }
      d.ell(2, 28, 28, 12, 6); d.circ(2, 24, 24, 7); d.circ(2, 33, 23, 6);
      d.ell(4, 80, 100, 50, 34); d.ell(3, 20, 102, 54, 36);
      [[20, 76], [36, 84], [62, 80], [80, 74]].forEach(([x, y]) => { d.line(4, 1.5, x, y, x, y + 8); d.star(5, x, y, 4, 0.5); d.circ(6, x, y, 1.6); }); } },
    { id: "rainbow", name: "Rainbow", cat: "Nature", n: 40, pal: ["#caf0f8", "#ef476f", "#ff9f1c", "#ffd166", "#06d6a0", "#118ab2", "#7b2cbf", "#ffffff"], draw: d => {
      d.bg(0); [1, 2, 3, 4, 5, 6].forEach((c, i) => d.half(c, 50, 74, 44 - i * 5.5, PI, 0)); d.half(0, 50, 74, 11, PI, 0);
      for (const x of [16, 84]) { d.circ(7, x, 72, 9); d.circ(7, x - 9, 76, 7); d.circ(7, x + 9, 76, 7); d.rect(7, x - 16, 76, 32, 7); } } },
    { id: "tree", name: "Apple Tree", cat: "Nature", n: 40, pal: ["#e3f2fd", "#7f5539", "#40916c", "#74c69d", "#e63946", "#80b918"], draw: d => {
      d.bg(0); d.ell(5, 50, 100, 60, 12); d.poly(1, 44, 92, 56, 92, 54, 50, 46, 50); d.line(1, 4, 50, 62, 36, 50); d.line(1, 4, 52, 58, 66, 48);
      d.circ(2, 50, 36, 24); d.circ(2, 30, 46, 16); d.circ(2, 70, 46, 16); d.circ(3, 42, 26, 9); d.circ(3, 62, 40, 7);
      [[36, 40], [58, 28], [66, 52], [44, 52], [28, 54], [52, 42]].forEach(([x, y]) => d.circ(4, x, y, 3.5)); } },
    { id: "tulips", name: "Tulip Pot", cat: "Nature", n: 40, pal: ["#fff8e7", "#e07a5f", "#c05a41", "#52b788", "#ef476f", "#ffd166", "#9b5de5"], draw: d => {
      d.bg(0); d.line(3, 2.5, 50, 64, 50, 30); d.line(3, 2.5, 50, 64, 34, 36); d.line(3, 2.5, 50, 64, 66, 36);
      d.ell(3, 40, 58, 4, 10, 0.6); d.ell(3, 60, 58, 4, 10, -0.6);
      for (const [x, y, c] of [[50, 26, 4], [33, 34, 5], [67, 34, 6]]) { d.ell(c, x, y, 7, 8); d.poly(c, x - 7, y - 2, x - 6, y - 12, x - 2, y - 6, x, y - 12, x + 2, y - 6, x + 6, y - 12, x + 7, y - 2); }
      d.poly(1, 30, 66, 70, 66, 64, 94, 36, 94); d.rect(2, 28, 62, 44, 8); } },
    { id: "mushroom", name: "Toadstool", cat: "Nature", n: 36, pal: ["#d8f3dc", "#e63946", "#ffffff", "#ffe8cc", "#52b788", "#2d6a4f", "#e9c46a"], draw: d => {
      d.bg(0); d.rect(4, 0, 82, 100, 18); for (let x = 2; x < 100; x += 7) d.poly(5, x, 84, x + 3, 74, x + 6, 84);
      d.rr(3, 40, 46, 20, 40, 8); d.ell(6, 50, 60, 8, 3);
      d.half(1, 50, 50, 34, PI, 0); d.ell(1, 50, 50, 34, 5); [[38, 30, 5], [58, 26, 6], [70, 40, 4], [28, 44, 4], [50, 42, 3.5]].forEach(([x, y, r]) => d.circ(2, x, y, r)); } },
    { id: "cactus", name: "Desert Cactus", cat: "Nature", n: 40, pal: ["#ffe8d6", "#f4a261", "#2a9d8f", "#52b788", "#ff70a6", "#e76f51", "#ffd166"], draw: d => {
      d.bg(0); d.circ(6, 20, 20, 9); d.ell(1, 50, 100, 80, 20);
      d.rr(2, 40, 22, 20, 64, 10); d.rr(2, 22, 40, 12, 24, 6); d.rr(2, 22, 56, 22, 10, 5); d.rr(2, 66, 32, 12, 24, 6); d.rr(2, 56, 48, 22, 10, 5);
      d.line(3, 1.6, 50, 28, 50, 80); d.line(3, 1.6, 45, 30, 45, 80); d.line(3, 1.6, 55, 30, 55, 80);
      d.star(4, 50, 22, 5, 0.5); d.circ(6, 50, 22, 1.8); d.poly(5, 34, 80, 66, 80, 62, 96, 38, 96); } },
    { id: "sunset", name: "Mountain Sunset", cat: "Nature", n: 44, pal: ["#ffb4a2", "#ff7f51", "#ffd166", "#9d4edd", "#5a189a", "#ffffff", "#3c096c", "#e5989b"], draw: d => {
      d.bg(7); d.rect(0, 0, 0, 100, 34); d.rect(1, 0, 46, 100, 12); d.circ(2, 50, 60, 16);
      d.poly(3, -5, 72, 26, 34, 46, 60, 64, 38, 105, 76, 105, 100, -5, 100);
      d.poly(5, 26, 34, 20, 42, 26, 40, 30, 44); d.poly(5, 64, 38, 58, 46, 64, 44, 70, 48);
      d.poly(4, -5, 86, 30, 62, 58, 84, 80, 66, 105, 86, 105, 100, -5, 100); d.rect(6, 0, 92, 100, 8); } },
    { id: "island", name: "Palm Island", cat: "Nature", n: 40, pal: ["#a2d2ff", "#ffd166", "#f6bd60", "#0096c7", "#8a5a36", "#2d9a5a", "#ffffff"], draw: d => {
      d.bg(0); d.circ(1, 78, 22, 11); d.rect(3, 0, 70, 100, 30); for (let x = 0; x < 100; x += 14) d.arc(6, 1.8, x + 7, 82, 5, PI * 1.15, PI * 1.85);
      d.ell(2, 44, 74, 30, 8); d.line(4, 4, 46, 72, 44, 52, 40, 34);
      d.ell(5, 24, 36, 18, 6, 0.45); d.ell(5, 58, 36, 18, 6, -0.45); d.ell(5, 28, 24, 16, 5, -0.5); d.ell(5, 54, 22, 16, 5, 0.5); d.ell(5, 40, 20, 6, 10); d.circ(4, 38, 36, 3); d.circ(4, 44, 37, 3); } },

    /* ---------------- Things ---------------- */
    { id: "house", name: "Little House", cat: "Things", n: 40, pal: ["#bde0fe", "#fff1e6", "#e63946", "#8a5a36", "#ffd166", "#80b918", "#e5e5e5", "#a5a5a5"], draw: d => {
      d.bg(0); d.circ(6, 76, 18, 5); d.circ(6, 82, 12, 4); d.circ(6, 88, 6, 3); d.rect(7, 68, 24, 8, 20);
      d.rect(5, 0, 82, 100, 18); d.poly(7, 46, 100, 54, 100, 52, 82, 48, 82);
      d.rect(1, 24, 48, 52, 34); d.poly(2, 18, 50, 50, 22, 82, 50); d.rr(3, 44, 62, 12, 20, 5); d.circ(4, 53, 72, 1.2);
      d.rect(4, 29, 56, 10, 10); d.rect(4, 61, 56, 10, 10); d.line(3, 1, 34, 56, 34, 66); d.line(3, 1, 66, 56, 66, 66); } },
    { id: "rocket", name: "Space Rocket", cat: "Things", n: 44, pal: ["#14213d", "#ffffff", "#e63946", "#4cc9f0", "#ff9f1c", "#ffd166", "#9d4edd", "#c8c8d8"], draw: d => {
      d.bg(0); [[12, 14], [80, 10], [88, 40], [10, 60], [24, 86], [70, 88], [30, 30]].forEach(([x, y]) => d.star(5, x, y, 2));
      d.circ(6, 82, 76, 12); d.ell(5, 82, 76, 20, 3, -0.3);
      d.poly(4, 42, 76, 58, 76, 50, 98); d.poly(5, 45, 76, 55, 76, 50, 90);
      d.poly(2, 38, 56, 28, 78, 40, 74); d.poly(2, 62, 56, 72, 78, 60, 74);
      d.ell(1, 50, 46, 13, 32); d.rect(7, 37, 66, 26, 4); d.clip(g => g.ellipse(50, 46, 13, 32, 0, 0, PI * 2), () => d.rect(2, 30, 10, 40, 12));
      d.circ(7, 50, 42, 7); d.circ(3, 50, 42, 5); } },
    { id: "sailboat", name: "Sailboat", cat: "Things", n: 40, pal: ["#caf0f8", "#ffffff", "#e63946", "#0077b6", "#00b4d8", "#8a5a36", "#ffd166"], draw: d => {
      d.bg(0); d.circ(6, 18, 18, 8); d.rect(4, 0, 72, 100, 28); for (let x = 0; x < 100; x += 12) d.arc(1, 1.6, x + 6, 82, 4, PI * 1.15, PI * 1.85); d.rect(3, 0, 88, 100, 12);
      d.line(5, 2.5, 50, 70, 50, 16); d.poly(1, 52, 18, 52, 62, 80, 62); d.poly(1, 48, 26, 48, 62, 26, 62); d.poly(2, 50, 16, 62, 20, 50, 24);
      d.poly(2, 24, 66, 76, 66, 68, 78, 32, 78); d.rect(1, 28, 68, 44, 2); } },
    { id: "balloon", name: "Hot Air Balloon", cat: "Things", n: 44, pal: ["#a9def9", "#ffffff", "#ef476f", "#ffd166", "#06d6a0", "#8a5a36", "#118ab2"], draw: d => {
      d.bg(0); for (const [x, y, s] of [[18, 70, 1], [80, 30, 0.8]]) { d.ell(1, x, y, 12 * s, 6 * s); d.circ(1, x - 5 * s, y - 3 * s, 6 * s); d.circ(1, x + 4 * s, y - 4 * s, 7 * s); }
      d.clip(g => { g.ellipse(50, 38, 28, 30, 0, 0, PI * 2); }, () => { [2, 3, 4, 3, 2, 6, 2].forEach((c, i) => d.rect(c, 22 + i * 8, 0, 8, 80)); });
      d.poly(3, 32, 58, 68, 58, 58, 72, 42, 72); d.line(5, 1.2, 42, 72, 44, 82); d.line(5, 1.2, 58, 72, 56, 82); d.rr(5, 42, 80, 16, 12, 3); } },
    { id: "lighthouse", name: "Lighthouse", cat: "Things", n: 44, pal: ["#ffd6a5", "#ffffff", "#e63946", "#0096c7", "#6c757d", "#ffd166", "#1d3557", "#fff3b0"], draw: d => {
      d.bg(0); d.poly(7, 50, 22, 0, 6, 0, 30); d.poly(7, 50, 22, 100, 8, 100, 34);
      d.rect(3, 0, 80, 100, 20); d.ell(4, 50, 84, 30, 10); d.ell(4, 22, 86, 12, 6);
      d.poly(1, 40, 80, 60, 80, 56, 28, 44, 28); d.clip(g => { g.moveTo(40, 80); g.lineTo(60, 80); g.lineTo(56, 28); g.lineTo(44, 28); g.closePath(); }, () => { d.rect(2, 30, 34, 40, 9); d.rect(2, 30, 52, 40, 9); d.rect(2, 30, 70, 40, 9); });
      d.rect(6, 42, 24, 16, 5); d.rect(5, 45, 16, 10, 8); d.poly(2, 42, 16, 58, 16, 50, 8); d.rect(6, 47, 70, 6, 10); } },
    { id: "car", name: "Road Trip", cat: "Things", n: 40, pal: ["#ffe5ec", "#06d6a0", "#bde0fe", "#2b2d42", "#8d99ae", "#ffd166", "#ffffff", "#ef476f"], draw: d => {
      d.bg(0); d.circ(5, 80, 20, 9); d.rect(3, 0, 74, 100, 26); for (let x = 4; x < 100; x += 20) d.rect(6, x, 86, 10, 2);
      d.rr(1, 14, 50, 72, 20, 6); d.poly(1, 28, 52, 36, 34, 64, 34, 74, 52); d.poly(2, 33, 50, 39, 38, 49, 38, 49, 50); d.poly(2, 53, 38, 62, 38, 68, 50, 53, 50);
      d.circ(3, 32, 72, 8); d.circ(3, 68, 72, 8); d.circ(4, 32, 72, 3.5); d.circ(4, 68, 72, 3.5); d.rect(5, 82, 56, 4, 4); d.rect(7, 14, 56, 4, 4); } },
    { id: "gift", name: "Gift Box", cat: "Things", n: 36, pal: ["#e2ece9", "#9b5de5", "#ffd166", "#f15bb5", "#ffffff"], draw: d => {
      d.bg(0); [[16, 20], [84, 26], [14, 80], [86, 76]].forEach(([x, y]) => d.star(3, x, y, 4));
      d.rect(1, 24, 48, 52, 40); d.rect(1, 20, 38, 60, 12); d.rect(2, 45, 38, 10, 50);
      d.ell(2, 40, 30, 10, 6, 0.4); d.ell(2, 60, 30, 10, 6, -0.4); d.ell(0, 40, 30, 4, 2.4, 0.4); d.ell(0, 60, 30, 4, 2.4, -0.4); d.circ(2, 50, 34, 4.5); } },

    /* ---------------- Seasons ---------------- */
    { id: "snowman", name: "Snowman", cat: "Seasons", n: 40, pal: ["#1d3557", "#ffffff", "#d0e1f9", "#e63946", "#1b1b2a", "#ff9f1c", "#8a5a36"], draw: d => {
      d.bg(0); [[12, 10], [30, 22], [80, 12], [90, 34], [14, 44], [70, 30]].forEach(([x, y]) => d.circ(1, x, y, 1.4)); d.ell(1, 50, 100, 70, 18);
      d.line(6, 2, 32, 60, 18, 50); d.line(6, 2, 68, 60, 82, 50);
      d.circ(2, 52, 78, 20); d.circ(1, 50, 76, 20); d.circ(1, 50, 46, 14); d.rr(3, 34, 54, 32, 6, 3); d.rr(3, 54, 54, 7, 16, 3);
      d.rect(4, 36, 30, 28, 4); d.rect(4, 41, 12, 18, 20); d.circ(4, 45, 44, 1.8); d.circ(4, 55, 44, 1.8); d.poly(5, 50, 47, 50, 51, 60, 49);
      d.circ(4, 50, 68, 2); d.circ(4, 50, 77, 2); d.circ(4, 50, 86, 2); } },
    { id: "pumpkin", name: "Pumpkin", cat: "Seasons", n: 40, pal: ["#5a189a", "#ff8500", "#e85d04", "#55a630", "#ffd166", "#3c096c", "#ffffff"], draw: d => {
      d.bg(0); d.circ(6, 80, 18, 8); d.circ(0, 84, 15, 7); d.ell(5, 50, 94, 50, 8);
      d.ell(2, 32, 60, 18, 26); d.ell(2, 68, 60, 18, 26); d.ell(1, 50, 60, 22, 28); d.ell(1, 36, 60, 10, 25); d.ell(1, 64, 60, 10, 25);
      d.rr(3, 46, 24, 8, 12, 3); d.ell(3, 58, 30, 8, 3, -0.5);
      d.poly(4, 32, 56, 46, 56, 39, 44); d.poly(4, 54, 56, 68, 56, 61, 44); d.poly(4, 30, 64, 70, 64, 66, 76, 58, 72, 50, 80, 42, 72, 34, 76); } },
    { id: "hearts", name: "Heart Balloons", cat: "Seasons", n: 36, pal: ["#fff0f6", "#ef476f", "#ff8fab", "#c9184a", "#adb5bd", "#ffffff"], draw: d => {
      d.bg(0); d.line(4, 1, 34, 44, 48, 92); d.line(4, 1, 64, 36, 50, 92); d.line(4, 1, 52, 58, 50, 92);
      d.heart(2, 34, 34, 16); d.heart(1, 64, 26, 18); d.heart(3, 52, 52, 12); d.ell(5, 58, 18, 3, 5, 0.6); d.ell(5, 29, 28, 2.5, 4, 0.6); d.rr(1, 44, 88, 12, 6, 3); } },
    { id: "kite", name: "Windy Kite", cat: "Seasons", n: 40, pal: ["#bde0fe", "#ffffff", "#ef476f", "#ffd166", "#06d6a0", "#118ab2", "#80b918", "#5a5a6e"], draw: d => {
      d.bg(0); d.ell(1, 22, 22, 12, 5); d.circ(1, 18, 18, 6); d.ell(1, 80, 64, 10, 4); d.ell(6, 50, 104, 70, 14);
      d.line(7, 1, 56, 52, 40, 70, 30, 96); d.line(7, 1.2, 56, 52, 62, 60, 58, 70, 66, 78, 62, 88);
      for (const [x, y, c] of [[62, 60, 2], [58, 70, 3], [66, 78, 4]]) { d.poly(c, x - 4, y - 3, x, y, x - 4, y + 3); d.poly(c, x + 4, y - 3, x, y, x + 4, y + 3); }
      d.poly(2, 58, 10, 80, 30, 58, 52, 36, 30); d.poly(3, 58, 10, 80, 30, 58, 30); d.poly(5, 36, 30, 58, 30, 58, 52); d.poly(4, 58, 30, 80, 30, 58, 52);
      d.line(1, 1.4, 58, 10, 58, 52); d.line(1, 1.4, 36, 30, 80, 30); } }
  ];

  // build the pixel grid for a picture (cached)
  const cache = {};
  function build(def) {
    if (cache[def.id]) return cache[def.id];
    const N = def.n, SS = 4, W = N * SS, cv = document.createElement("canvas"); cv.width = cv.height = W;
    const g = cv.getContext("2d"); g.scale(W / 100, W / 100); def.draw(pen(g, def.pal));
    const px = g.getImageData(0, 0, W, W).data, P = def.pal.map(h => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; });
    const near = (r, gg, b) => { let bi = 0, bd = 1e9; for (let i = 0; i < P.length; i++) { const dr = r - P[i][0], dg = gg - P[i][1], db = b - P[i][2], dd = dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11; if (dd < bd) { bd = dd; bi = i; } } return bi; };
    const cells = new Uint8Array(N * N), cnt = new Array(P.length).fill(0);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const votes = new Array(P.length).fill(0);
      for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) { const o = ((y * SS + sy) * W + x * SS + sx) * 4; votes[near(px[o], px[o + 1], px[o + 2])] += (sx === 1 || sx === 2) && (sy === 1 || sy === 2) ? 1.2 : 1; }
      let b = 0; for (let i = 1; i < votes.length; i++) if (votes[i] > votes[b]) b = i; cells[y * N + x] = b; cnt[b]++;
    }
    // drop palette colours that ended up unused, renumbering the rest
    const used = P.map((_, i) => cnt[i] > 0), map = [], pal = [], rgb = [];
    P.forEach((c, i) => { if (used[i]) { map[i] = pal.length; pal.push(def.pal[i]); rgb.push(c); } });
    for (let i = 0; i < cells.length; i++) cells[i] = map[cells[i]];
    const lum = rgb.map(([r, gg, b]) => (r * 0.3 + gg * 0.59 + b * 0.11) / 255);
    return (cache[def.id] = { id: def.id, n: N, cells, pal, rgb, lum });
  }

  return { LIST, build, byId: id => LIST.find(p => p.id === id), cats: [...new Set(LIST.map(p => p.cat))] };
})();

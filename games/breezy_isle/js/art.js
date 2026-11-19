/* BREEZY ISLE — everything drawn in code: animals, items, trees, decor, the snack truck.
   All functions draw around the origin; the caller translates/scales. */
window.Art = (() => {
  const C = window.GAME_CONFIG;
  const OUT = "#3b2a4a";
  const TAU = Math.PI * 2;
  function circle(g, x, y, r, fill) { g.fillStyle = fill; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
  function ell(g, x, y, rx, ry, fill, rot = 0) { g.fillStyle = fill; g.beginPath(); g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU); g.fill(); }
  function shade(hex, k) {   // k < 0 darker, k > 0 lighter
    const n = parseInt(hex.slice(1), 16); let r = n >> 16, gg = n >> 8 & 255, b = n & 255;
    if (k < 0) { r *= 1 + k; gg *= 1 + k; b *= 1 + k; } else { r += (255 - r) * k; gg += (255 - gg) * k; b += (255 - b) * k; }
    return `rgb(${r | 0},${gg | 0},${b | 0})`;
  }

  /* ---------- animals (feet at 0,0, about 90 tall) ---------- */
  function animal(g, f, o = {}) {
    const t = o.t || 0, walk = o.walk || 0, dir = o.dir || 1, bob = walk ? Math.abs(Math.sin(t * 12)) * 4 : Math.sin(t * 2.4) * 1.5;
    const body = f.body, belly = f.belly, dark = shade(body, -0.25);
    g.save(); g.scale(dir, 1);
    // shadow
    ell(g, 0, 2, 26, 6, "rgba(40,30,60,0.18)");
    // feet
    const fp = walk ? Math.sin(t * 12) * 6 : 0;
    ell(g, -10 + fp, -3, 8, 5, dark); ell(g, 10 - fp, -3, 8, 5, dark);
    g.translate(0, -bob);
    // tail
    if (f.animal === "cat") { g.strokeStyle = body; g.lineWidth = 6; g.lineCap = "round"; g.beginPath(); g.moveTo(-20, -18); g.quadraticCurveTo(-38, -24 + Math.sin(t * 3) * 6, -32, -44); g.stroke(); }
    if (f.animal === "fox") { g.save(); g.translate(-22, -20); g.rotate(-0.6 + Math.sin(t * 3) * 0.12); ell(g, -10, -6, 16, 9, body); ell(g, -22, -8, 6, 6, "#fff"); g.restore(); }
    if (f.animal === "bunny") circle(g, -24, -18, 7, "#fff");
    if (f.animal === "turtle") { g.fillStyle = f.shell; g.beginPath(); g.ellipse(-4, -28, 30, 24, 0, Math.PI, TAU); g.fill(); g.strokeStyle = shade(f.shell, -0.2); g.lineWidth = 2; g.beginPath(); g.moveTo(-20, -36); g.lineTo(-4, -46); g.lineTo(12, -36); g.stroke(); }
    // body
    ell(g, 0, -22, 22, 19, body); ell(g, 3, -19, 13, 12, belly);
    // backpack for the player
    if (o.pack) { g.fillStyle = "#ff7a5c"; roundRect(g, -30, -40, 16, 24, 6); g.fill(); g.fillStyle = "#ffb36b"; roundRect(g, -30, -32, 16, 6, 3); g.fill(); }
    // arms
    const arm = o.arm || 0;
    g.save(); g.translate(14, -26); g.rotate(-0.4 + arm); ell(g, 6, 0, 8, 5, body); g.restore();
    // head
    const hy = -56;
    // ears behind head
    if (f.ears === "pointy") { tri(g, -20, hy - 12, -8, hy - 22, -24, hy - 32, body); tri(g, 20, hy - 12, 8, hy - 22, 22, hy - 34, body); tri(g, -18, hy - 15, -11, hy - 21, -21, hy - 27, "#ffc2c2"); }
    if (f.ears === "round") { circle(g, -18, hy - 20, 9, body); circle(g, 18, hy - 20, 9, body); circle(g, -18, hy - 20, 5, shade(body, 0.35)); circle(g, 18, hy - 20, 5, shade(body, 0.35)); }
    if (f.ears === "long") { const w = Math.sin(t * 2) * 0.06; g.save(); g.translate(-8, hy - 18); g.rotate(-0.15 + w); ell(g, 0, -18, 7, 22, body); ell(g, 0, -18, 3.5, 16, "#ffd6e0"); g.restore(); g.save(); g.translate(10, hy - 18); g.rotate(0.25 - w); ell(g, 0, -18, 7, 22, body); ell(g, 0, -18, 3.5, 16, "#ffd6e0"); g.restore(); }
    if (f.animal === "frog") { circle(g, -12, hy - 20, 10, body); circle(g, 12, hy - 20, 10, body); }
    if (f.animal === "bird" || f.animal === "duck") { g.strokeStyle = body; g.lineWidth = 3; g.beginPath(); g.moveTo(0, hy - 26); g.quadraticCurveTo(4, hy - 38, 10, hy - 36); g.stroke(); }
    ell(g, 0, hy, 27, 24, body);
    ell(g, 4, hy + 8, 16, 11, belly);
    if (f.animal === "fox" || f.animal === "cat") ell(g, 6, hy + 9, 13, 9, "#fff");
    // eyes
    const ex = 6, blink = o.blink;
    const eye = (x, y) => {
      if (f.animal === "frog") { circle(g, x, y - 18, 6, "#fff"); }
      const yy = f.animal === "frog" ? y - 18 : y;
      if (o.mood === "happy" || blink) { g.strokeStyle = OUT; g.lineWidth = 2.5; g.lineCap = "round"; g.beginPath(); if (blink) { g.moveTo(x - 4, yy); g.lineTo(x + 4, yy); } else g.arc(x, yy + 2, 4, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); return; }
      ell(g, x, yy, 3.6, 4.6, OUT); circle(g, x + 1.2, yy - 1.6, 1.4, "#fff");
    };
    eye(-6 + ex, hy - 4); eye(12 + ex, hy - 4);
    // blush
    ell(g, -6, hy + 6, 5, 3, "rgba(255,120,150,0.45)"); ell(g, 24, hy + 6, 5, 3, "rgba(255,120,150,0.45)");
    // muzzle
    if (f.animal === "pig") { ell(g, 9, hy + 6, 7, 5, shade(body, -0.12)); circle(g, 7, hy + 6, 1.4, OUT); circle(g, 11, hy + 6, 1.4, OUT); }
    else if (f.beak) { g.fillStyle = f.beak; g.beginPath(); g.moveTo(14, hy + 2); g.lineTo(28, hy + 6); g.lineTo(14, hy + 10); g.closePath(); g.fill(); }
    else { g.fillStyle = OUT; g.beginPath(); g.ellipse(9, hy + 4, 2.2, 1.6, 0, 0, TAU); g.fill();
      g.strokeStyle = OUT; g.lineWidth = 1.6; g.beginPath(); if (o.talk) { ell(g, 9, hy + 10, 3, 2 + Math.abs(Math.sin(t * 18)) * 2, "#c2405a"); } else { g.arc(7, hy + 7, 2.2, 0.1, Math.PI - 0.3); g.moveTo(13.2, hy + 7); g.arc(11, hy + 7, 2.2, 0.3, Math.PI - 0.1); g.stroke(); } }
    // sun hat for the player
    if (o.hat) { ell(g, 2, hy - 18, 34, 8, "#ffe08a"); g.fillStyle = "#ffd05c"; g.beginPath(); g.ellipse(2, hy - 22, 18, 14, 0, Math.PI, TAU); g.fill(); g.fillStyle = "#ff7a5c"; g.fillRect(-16, hy - 24, 36, 5); }
    g.restore();
  }
  function tri(g, x1, y1, x2, y2, x3, y3, fill) { g.fillStyle = fill; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.lineTo(x3, y3); g.closePath(); g.fill(); }
  function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

  /* ---------- items (centred, `s` = size in px) ---------- */
  function item(g, id, x, y, s, t = 0) {
    const it = C.items[id]; if (!it) return;
    const d = it.draw, k = s / 40;
    g.save(); g.translate(x, y); g.scale(k, k);
    const A = d.a, B = d.b;
    switch (d.shape) {
      case "coconut": circle(g, 0, 2, 16, A); circle(g, -5, -3, 3, B); circle(g, 4, -4, 3, B); circle(g, 0, 3, 3, B); ell(g, -7, -6, 4, 2.5, "rgba(255,255,255,0.25)", -0.6); break;
      case "banana": g.strokeStyle = A; g.lineWidth = 11; g.lineCap = "round"; g.beginPath(); g.arc(4, -10, 20, 1.9, 3.5); g.stroke(); g.strokeStyle = B; g.lineWidth = 3; g.beginPath(); g.arc(4, -10, 24, 2.0, 3.4); g.stroke(); circle(g, -12, 8, 2.5, "#6b4a2a"); break;
      case "round": ell(g, 0, 3, 15, 17, B); ell(g, -3, 0, 11, 13, A); ell(g, -6, -6, 4, 3, "rgba(255,255,255,0.45)", -0.5); if (d.leaf) ell(g, 5, -15, 7, 3.5, "#3fb86a", -0.5); break;
      case "star": star(g, 0, 2, 5, 17, 9, B); star(g, 0, 1, 5, 13, 7, A); circle(g, 0, 1, 3, B); break;
      case "dragon": ell(g, 0, 2, 14, 17, A); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; ell(g, Math.cos(a) * 12, 2 + Math.sin(a) * 14, 5, 2.5, "#7fd65f", a); } ell(g, -4, -4, 4, 3, "rgba(255,255,255,0.4)"); break;
      case "berries": [[-7, 4], [6, 5], [0, -5], [-1, 9]].forEach(([bx, by]) => { circle(g, bx, by, 8, B); circle(g, bx - 2, by - 2, 6, A); circle(g, bx - 3, by - 4, 1.8, "rgba(255,255,255,0.7)"); }); ell(g, 2, -14, 7, 3, "#3fb86a", 0.4); break;
      case "scallop": g.fillStyle = A; g.beginPath(); g.moveTo(0, 14); g.arc(0, 2, 16, Math.PI * 1.05, Math.PI * 1.95); g.closePath(); g.fill(); g.strokeStyle = B; g.lineWidth = 2; for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(0, 13); g.lineTo(i * 7, -11); g.stroke(); } ell(g, 0, 14, 6, 3, B); break;
      case "spiral": ell(g, 0, 2, 13, 16, A); g.strokeStyle = B; g.lineWidth = 2.5; g.beginPath(); for (let a = 0; a < 12; a += 0.2) { const r = a * 1.1; const px = Math.cos(a) * r * 0.9, py = 2 + Math.sin(a) * r; a ? g.lineTo(px, py) : g.moveTo(px, py); } g.stroke(); break;
      case "starfish": star(g, 0, 2, 5, 18, 7, A); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * TAU / 5; circle(g, Math.cos(a) * 9, 2 + Math.sin(a) * 9, 1.6, B); } break;
      case "sanddollar": circle(g, 0, 2, 16, A); circle(g, 0, 2, 16, "rgba(0,0,0,0)"); g.strokeStyle = B; g.lineWidth = 2; for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * TAU / 5; ell(g, Math.cos(a) * 6, 2 + Math.sin(a) * 6, 4, 1.8, B, a); } break;
      case "conch": g.fillStyle = B; g.beginPath(); g.moveTo(-14, -8); g.quadraticCurveTo(10, -22, 16, 2); g.quadraticCurveTo(6, 18, -12, 10); g.closePath(); g.fill(); ell(g, -2, 0, 9, 8, A); for (let i = 0; i < 3; i++) circle(g, 4 + i * 4, -12 + i * 3, 2.5, A); break;
      case "glass": g.fillStyle = B; g.beginPath(); g.moveTo(-10, -12); g.lineTo(12, -8); g.lineTo(14, 10); g.lineTo(-6, 14); g.lineTo(-14, 2); g.closePath(); g.fill(); g.fillStyle = A; g.beginPath(); g.moveTo(-7, -9); g.lineTo(8, -6); g.lineTo(3, 4); g.lineTo(-9, 2); g.closePath(); g.fill(); break;
      case "pearl": ell(g, 0, 8, 17, 8, "#b7a6e8"); circle(g, 0, 0, 11, "#f3f0ff"); circle(g, -3, -4, 4, "#fff"); circle(g, 4, 3, 2, "rgba(200,180,255,0.6)"); break;
      case "bottle": g.save(); g.rotate(-0.5); roundRect(g, -8, -10, 16, 26, 6); g.fillStyle = A; g.fill(); g.fillStyle = "#c98a4a"; g.fillRect(-4, -18, 8, 9); g.fillStyle = "#fff6d8"; g.fillRect(-4, -2, 8, 12); g.strokeStyle = "#d8a86a"; g.lineWidth = 1; g.beginPath(); g.moveTo(-2, 2); g.lineTo(2, 2); g.moveTo(-2, 6); g.lineTo(2, 6); g.stroke(); g.restore(); break;
      case "fish": case "eel": case "puffer": case "ray": fish(g, d, t); break;
      case "butterfly": case "dragonfly": case "glowbug": bug(g, d, t); break;
    }
    g.restore();
  }
  function star(g, x, y, n, R, r, fill) { g.fillStyle = fill; g.beginPath(); for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / n, rr = i % 2 ? r : R; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fill(); }
  function fish(g, d, t) {
    const A = d.a, B = d.b, sz = d.size || 1, w = Math.sin(t * 8) * 0.15;
    g.scale(sz, sz);
    if (d.shape === "eel") { g.strokeStyle = B; g.lineWidth = 10; g.lineCap = "round"; g.beginPath(); for (let i = 0; i <= 10; i++) { const x = -18 + i * 3.6, y = Math.sin(i * 0.8 + t * 6) * 5; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); g.strokeStyle = A; g.lineWidth = 5; g.stroke(); circle(g, 16, -1, 1.8, OUT); return; }
    if (d.shape === "ray") { g.fillStyle = B; g.beginPath(); g.moveTo(16, 0); g.quadraticCurveTo(0, -20, -10, -2); g.lineTo(-24, 0); g.lineTo(-10, 2); g.quadraticCurveTo(0, 20, 16, 0); g.fill(); ell(g, 4, 0, 9, 5, A); circle(g, 10, -2, 1.6, OUT); return; }
    if (d.shape === "puffer") { g.save(); g.translate(-15, 0); g.rotate(w); tri(g, 2, 0, -9, -8, -9, 8, B); g.restore(); for (let i = 0; i < 9; i++) { const a = -2.2 + i * 0.55; circle(g, Math.cos(a) * 15, Math.sin(a) * 13, 2, B); } ell(g, 0, 0, 15, 13, A); ell(g, 2, 6, 10, 5, "#fff6d8"); ell(g, -2, -12, 5, 3, B, -0.3); circle(g, 7, -3, 3.4, "#fff"); circle(g, 8, -3, 1.8, OUT); ell(g, 14, 3, 2.5, 2, "#ff8f8f"); return; }
    g.save(); g.translate(-14, 0); g.rotate(w); tri(g, 2, 0, -10, -10, -10, 10, B); g.restore();
    if (d.glow) { g.save(); g.globalCompositeOperation = "lighter"; circle(g, 18, -10, 5, d.glow); g.restore(); g.strokeStyle = B; g.lineWidth = 1.5; g.beginPath(); g.moveTo(10, -6); g.quadraticCurveTo(16, -14, 18, -10); g.stroke(); }
    ell(g, 0, 0, 17, 11, A);
    tri(g, -4, -8, 4, -16, 8, -8, d.fin || B);
    if (d.stripe) { g.save(); g.beginPath(); g.ellipse(0, 0, 17, 11, 0, 0, TAU); g.clip(); g.fillStyle = d.stripe; g.fillRect(-3, -12, 4, 24); g.fillRect(-11, -12, 3, 24); g.restore(); }
    ell(g, 2, 5, 10, 4, "rgba(255,255,255,0.35)");
    circle(g, 9, -2, 3, "#fff"); circle(g, 10, -2, 1.6, OUT);
  }
  function bug(g, d, t) {
    const A = d.a, B = d.b, flap = Math.abs(Math.sin(t * 14));
    if (d.shape === "dragonfly") { g.strokeStyle = B; g.lineWidth = 4; g.lineCap = "round"; g.beginPath(); g.moveTo(-18, 2); g.lineTo(12, 0); g.stroke(); circle(g, 14, 0, 4, B); g.globalAlpha = 0.7; [-1, 1].forEach(s => { ell(g, 0, s * (6 + flap * 4), 13, 4, A, s * 0.15); ell(g, 6, s * (5 + flap * 3), 10, 3.5, A, -s * 0.15); }); g.globalAlpha = 1; return; }
    if (d.shape === "glowbug") { g.save(); g.globalCompositeOperation = "lighter"; const gl = g.createRadialGradient(-6, 2, 0, -6, 2, 18); gl.addColorStop(0, "rgba(255,240,120,0.9)"); gl.addColorStop(1, "rgba(255,240,120,0)"); g.fillStyle = gl; g.beginPath(); g.arc(-6, 2, 18, 0, TAU); g.fill(); g.restore(); ell(g, -6, 2, 7, 5, A); ell(g, 4, 0, 6, 5, B); g.globalAlpha = 0.6; ell(g, 0, -6 - flap * 3, 7, 3, "#fff"); g.globalAlpha = 1; return; }
    const wy = 0.35 + flap * 0.65;
    [-1, 1].forEach(s => {
      g.save(); g.scale(1, 1); ell(g, s * 9, -6, 11, 12 * wy, B, s * 0.4); ell(g, s * 9, -6, 8, 9 * wy, A, s * 0.4); ell(g, s * 7, 8, 7, 7 * wy, A, -s * 0.3);
      if (d.dots) { circle(g, s * 11, -8 * wy, 2.4, "#fff"); }
      g.restore();
    });
    ell(g, 0, 0, 2.5, 11, OUT);
    g.strokeStyle = OUT; g.lineWidth = 1.2; g.beginPath(); g.moveTo(0, -10); g.lineTo(-4, -16); g.moveTo(0, -10); g.lineTo(4, -16); g.stroke();
  }

  /* ---------- trees (base at 0,0) ---------- */
  function tree(g, kind, o) {
    const sway = o.sway || 0, t = o.t || 0, h = o.h || 250, pal = o.pal;
    const bend = Math.sin(t * 0.9 + (o.seed || 0)) * 0.025 + sway;
    if (kind === "palm" || kind === "coral") {
      const trunk = kind === "coral" ? "#e89a8a" : "#c99a6a", trunkD = kind === "coral" ? "#c8706a" : "#a8784a";
      const tipX = h * 0.22 * (o.lean || 1) + Math.sin(bend) * h, tipY = -h;
      g.strokeStyle = trunkD; g.lineWidth = 22; g.lineCap = "round"; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(h * 0.04, -h * 0.55, tipX, tipY); g.stroke();
      g.strokeStyle = trunk; g.lineWidth = 16; g.stroke();
      g.strokeStyle = trunkD; g.lineWidth = 3;
      for (let i = 1; i < 9; i++) { const u = i / 9, x = (1 - u) * (1 - u) * 0 + 2 * (1 - u) * u * h * 0.04 + u * u * tipX, y = 2 * (1 - u) * u * -h * 0.55 + u * u * tipY; g.beginPath(); g.moveTo(x - 9, y + 2); g.lineTo(x + 9, y - 2); g.stroke(); }
      const leaf = kind === "coral" ? ["#ff8fb1", "#ff6f9f"] : [pal.grass, pal.grass2];
      for (let i = 0; i < 7; i++) {
        const a = -Math.PI / 2 + (i - 3) * 0.55 + Math.sin(t * 1.3 + i) * 0.05 + sway * 2;
        g.save(); g.translate(tipX, tipY); g.rotate(a);
        g.fillStyle = i % 2 ? leaf[0] : leaf[1];
        g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(50, -26, 104, 14); g.quadraticCurveTo(52, 2, 0, 8); g.closePath(); g.fill();
        g.restore();
      }
      return { x: tipX, y: tipY + 14 };
    }
    if (kind === "pine") {
      g.fillStyle = "#8a5a3c"; g.fillRect(-9, -60, 18, 60);
      const c1 = "#5fae6a", c2 = "#3f8f5a";
      for (let i = 0; i < 4; i++) { const y = -50 - i * 48, w = 80 - i * 15, dx = Math.sin(bend) * (i + 1) * 12; tri(g, -w + dx, y, w + dx, y, dx * 1.2, y - 80, i % 2 ? c1 : c2); }
      return { x: Math.sin(bend) * 40, y: -150 };
    }
    // jungle: round broad canopy on a thick trunk
    const dx = Math.sin(bend) * 50;
    g.strokeStyle = "#7a5a3c"; g.lineWidth = 26; g.lineCap = "round"; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-10, -100, dx, -h * 0.75); g.stroke();
    [[-60, -h * 0.78, 60], [55, -h * 0.8, 56], [0, -h * 0.98, 66], [-20, -h * 0.68, 50], [40, -h * 0.66, 46]].forEach(([x, y, r], i) => circle(g, x + dx, y, r, i % 2 ? pal.grass2 : pal.grass));
    [[-30, -h * 0.9, 20], [30, -h * 0.95, 16]].forEach(([x, y, r]) => circle(g, x + dx, y, r, "rgba(255,255,255,0.15)"));
    return { x: dx, y: -h * 0.8 };
  }

  /* ---------- camp decor (base at 0,0) ---------- */
  function decor(g, id, t, night) {
    switch (id) {
      case "tent": tri(g, -60, 0, 60, 0, 0, -90, "#ff9a6b"); tri(g, -60, 0, 0, 0, 0, -90, "#ff7a4c"); tri(g, -18, 0, 18, 0, 0, -50, "#5a3a4a"); g.strokeStyle = "#fff"; g.lineWidth = 3; g.beginPath(); g.moveTo(0, -90); g.lineTo(0, -104); g.stroke(); tri(g, 0, -104, 16, -99, 0, -94, "#ffe066"); break;
      case "fire": [[-16, -4], [16, -4], [0, -2]].forEach(([x, y]) => ell(g, x, y, 14, 5, "#8a5a3c")); for (let i = 0; i < 3; i++) { const f = Math.sin(t * 10 + i * 2) * 3; g.fillStyle = ["#ff6a2a", "#ffb02a", "#fff07a"][i]; g.beginPath(); g.moveTo(-14 + i * 4, -4); g.quadraticCurveTo(-10 + i * 3 + f, -40 + i * 10, 0, -50 + i * 14 + f); g.quadraticCurveTo(10 - i * 3 - f, -40 + i * 10, 14 - i * 4, -4); g.fill(); } break;
      case "hammock": g.strokeStyle = "#8a5a3c"; g.lineWidth = 8; [-60, 60].forEach(x => { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, -70); g.stroke(); }); g.strokeStyle = "#62c8e8"; g.lineWidth = 10; g.beginPath(); g.moveTo(-58, -60); g.quadraticCurveTo(0, -18 + Math.sin(t * 1.5) * 3, 58, -60); g.stroke(); g.strokeStyle = "#fff"; g.lineWidth = 3; g.stroke(); break;
      case "umbrella": g.strokeStyle = "#fff"; g.lineWidth = 4; g.beginPath(); g.moveTo(0, 0); g.lineTo(-6, -100); g.stroke(); for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? "#fff" : "#ff6f8f"; g.beginPath(); g.moveTo(-6, -104); const a0 = Math.PI + i * Math.PI / 6, a1 = a0 + Math.PI / 6; g.arc(-6, -78, 56, a0, a1); g.closePath(); g.fill(); } break;
      case "lights": g.strokeStyle = "#5a3a4a"; g.lineWidth = 3; [-70, 70].forEach(x => { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, -90); g.stroke(); }); g.lineWidth = 1.5; g.beginPath(); g.moveTo(-70, -86); g.quadraticCurveTo(0, -50, 70, -86); g.stroke();
        for (let i = 0; i < 8; i++) { const u = (i + 0.5) / 8, x = -70 + u * 140, y = (1 - u) * (1 - u) * -86 + 2 * (1 - u) * u * -50 + u * u * -86; const c = ["#ffe066", "#ff8fb1", "#7fe0ff", "#9dff7a"][i % 4]; if (night) { g.save(); g.globalCompositeOperation = "lighter"; const gl = g.createRadialGradient(x, y + 5, 0, x, y + 5, 22); gl.addColorStop(0, c); gl.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gl; g.globalAlpha = 0.6; g.beginPath(); g.arc(x, y + 5, 22, 0, TAU); g.fill(); g.restore(); } ell(g, x, y + 5, 4, 6, c); } break;
      case "surf": g.save(); g.rotate(0.12); roundRect(g, -14, -110, 28, 110, 14); g.fillStyle = "#62e8ff"; g.fill(); g.fillStyle = "#ff7a5c"; g.fillRect(-14, -64, 28, 8); g.restore(); break;
      case "castle": g.fillStyle = "#f2d08a"; g.fillRect(-40, -30, 80, 30); g.fillRect(-36, -58, 22, 28); g.fillRect(14, -58, 22, 28); g.fillRect(-12, -72, 24, 42); g.fillStyle = "#d8b06a"; g.fillRect(-6, -18, 12, 18); tri(g, -2, -72, 0, -92, 14, -84, "#ff6f8f"); g.fillStyle = "#fff"; g.fillRect(-2, -92, 2, 20); break;
      case "lantern": g.strokeStyle = "#5a3a4a"; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -90); g.lineTo(22, -90); g.stroke(); { const sw = Math.sin(t * 1.6) * 0.1; g.save(); g.translate(22, -90); g.rotate(sw); if (night) { g.save(); g.globalCompositeOperation = "lighter"; const gl = g.createRadialGradient(0, 22, 0, 0, 22, 60); gl.addColorStop(0, "rgba(255,170,90,0.7)"); gl.addColorStop(1, "rgba(255,170,90,0)"); g.fillStyle = gl; g.beginPath(); g.arc(0, 22, 60, 0, TAU); g.fill(); g.restore(); } ell(g, 0, 22, 14, 18, night ? "#ffb86a" : "#ff7a5c"); g.fillStyle = "#5a3a4a"; g.fillRect(-6, 2, 12, 4); g.fillRect(-6, 38, 12, 4); g.restore(); } break;
      case "flowers": [[-30, "#ff6f8f"], [0, "#ffe066"], [30, "#b38cff"]].forEach(([x, c], i) => { g.fillStyle = "#c97a4a"; g.beginPath(); g.moveTo(x - 12, 0); g.lineTo(x + 12, 0); g.lineTo(x + 15, -20); g.lineTo(x - 15, -20); g.fill(); g.strokeStyle = "#3fb86a"; g.lineWidth = 3; g.beginPath(); g.moveTo(x, -20); g.lineTo(x, -40); g.stroke(); for (let k = 0; k < 5; k++) { const a = k / 5 * TAU + t * 0.3; circle(g, x + Math.cos(a) * 6, -44 + Math.sin(a) * 6, 5, c); } circle(g, x, -44, 3.5, "#fff3a0"); }); break;
      case "flamingo": ell(g, 0, -10, 46, 14, "#ff8fb1"); ell(g, 0, -14, 30, 8, "#ffc2d6"); g.strokeStyle = "#ff8fb1"; g.lineWidth = 10; g.lineCap = "round"; g.beginPath(); g.moveTo(30, -16); g.quadraticCurveTo(48, -50, 30, -64); g.stroke(); circle(g, 28, -66, 9, "#ff8fb1"); tri(g, 30, -66, 44, -60, 32, -58, "#3b2a4a"); circle(g, 27, -69, 1.8, OUT); break;
      case "chair": g.strokeStyle = "#8a5a3c"; g.lineWidth = 5; g.beginPath(); g.moveTo(-34, 0); g.lineTo(10, -60); g.moveTo(34, 0); g.lineTo(-10, -30); g.stroke(); g.save(); g.translate(-12, -36); g.rotate(-0.95); for (let i = 0; i < 5; i++) { g.fillStyle = i % 2 ? "#fff" : "#62c8e8"; g.fillRect(-30 + i * 12, -8, 12, 16); } g.restore(); break;
      case "mailbox": g.fillStyle = "#8a5a3c"; g.fillRect(-4, -50, 8, 50); roundRect(g, -20, -76, 40, 28, 12); g.fillStyle = "#62a8ff"; g.fill(); g.fillStyle = "#ff5f6d"; g.fillRect(16, -86, 4, 18); g.fillRect(16, -86, 12, 8); break;
    }
  }

  /* ---------- the snack & swap truck (base at 0,0, faces right) ---------- */
  function truck(g, t, night, keeper) {
    ell(g, 0, 4, 110, 10, "rgba(40,30,60,0.18)");
    roundRect(g, -100, -110, 200, 92, 18); g.fillStyle = "#bff0e8"; g.fill();
    g.fillStyle = "#8fd8cc"; g.fillRect(-100, -40, 200, 22);
    // awning
    for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? "#fff" : "#ff7a8a"; g.beginPath(); g.moveTo(-96 + i * 24, -110); g.lineTo(-72 + i * 24, -110); g.lineTo(-72 + i * 24, -96); g.arc(-84 + i * 24, -96, 12, 0, Math.PI); g.closePath(); g.fill(); }
    // window with the shopkeeper
    roundRect(g, -60, -92, 90, 46, 8); g.fillStyle = night ? "#ffd08a" : "#5a4a6a"; g.fill();
    g.save(); g.beginPath(); roundRect(g, -60, -92, 90, 46, 8); g.clip(); g.translate(-16, -18); g.scale(0.62, 0.62); animal(g, keeper, { t, mood: Math.sin(t * 0.7) > 0.8 ? "happy" : "" }); g.restore();
    g.fillStyle = "#ffe08a"; g.fillRect(-64, -48, 98, 8);
    // cab
    roundRect(g, 60, -86, 52, 68, 14); g.fillStyle = "#bff0e8"; g.fill(); roundRect(g, 70, -78, 34, 26, 6); g.fillStyle = "#9fe3ff"; g.fill();
    // wheels
    [-60, 70].forEach(x => { circle(g, x, -14, 18, "#3b2a4a"); circle(g, x, -14, 8, "#d8d0e8"); });
    // sign on the roof: a big friendly fish
    g.save(); g.translate(-20, -128 + Math.sin(t * 2) * 2); fish(g, { a: "#ffc24a", b: "#ff9a2a", size: 1.4 }, t); g.restore();
    if (night) { g.save(); g.globalCompositeOperation = "lighter"; const gl = g.createRadialGradient(-15, -70, 10, -15, -70, 120); gl.addColorStop(0, "rgba(255,200,120,0.45)"); gl.addColorStop(1, "rgba(255,200,120,0)"); g.fillStyle = gl; g.beginPath(); g.arc(-15, -70, 120, 0, TAU); g.fill(); g.restore(); }
  }

  /* small canvas helper for the UI: draws an item into a <canvas> */
  function itemCanvas(id, px = 56, locked = false) {
    const c = document.createElement("canvas"), dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = c.height = px * dpr; c.style.width = c.style.height = px + "px";
    const g = c.getContext("2d"); g.scale(dpr, dpr);
    if (locked) g.filter = "brightness(0) opacity(0.25)";
    item(g, id, px / 2, px / 2, px * 0.8, 0.4);
    return c;
  }
  function decorCanvas(id, px = 72) {
    const c = document.createElement("canvas"), dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = c.height = px * dpr; c.style.width = c.style.height = px + "px";
    const g = c.getContext("2d"); g.scale(dpr, dpr); g.translate(px / 2, px * 0.9); g.scale(px / 160, px / 160); decor(g, id, 0.5, false);
    return c;
  }
  function animalCanvas(f, px = 64, o = {}) {
    const c = document.createElement("canvas"), dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = c.height = px * dpr; c.style.width = c.style.height = px + "px";
    const g = c.getContext("2d"); g.scale(dpr, dpr); g.translate(px / 2, px * 0.95); g.scale(px / 110, px / 110); animal(g, f, o);
    return c;
  }
  return { animal, item, tree, decor, truck, fish, itemCanvas, decorCanvas, animalCanvas, roundRect, shade, circle, ell, tri, star };
})();

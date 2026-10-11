/* Snake skins: per-segment color patterns, a shaded segment painter and an
   expressive head (eyes track the heading, blink, tongue flick). */
window.Skins = (() => {
  const C = window.GAME_CONFIG;
  const byId = id => C.skins.find(s => s.id === id) || C.skins[0];

  function hex(h) { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
  function mix(a, b, t) { const A = hex(a), B = hex(b); return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join(""); }
  function shade(h, amt) { return amt < 0 ? mix(h, "#000000", -amt) : mix(h, "#ffffff", amt); }

  // color of segment i (0 = head) out of n
  function segColor(skin, i, n, t = 0) {
    const c = skin.colors;
    switch (skin.pattern) {
      case "stripes": return Math.floor(i / 2) % 2 ? c[1] : c[0];
      case "bands": return i % 5 === 4 ? c[1] : c[0];
      case "gradient": {
        const k = (i / Math.max(1, n - 1)) * (c.length - 1), j = Math.min(c.length - 2, Math.floor(k));
        return mix(c[j], c[j + 1], k - j);
      }
      case "rainbow": return c[Math.floor(i / 3 + t * 6) % c.length];
      case "neon": return Math.floor(i / 3) % 2 ? c[1] : c[0];
      default: return c[0];
    }
  }

  function segment(x, cx, cy, r, color, skin, i) {
    if (skin.pattern === "neon") {
      x.fillStyle = "#0b0b1e"; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill();
      x.strokeStyle = color; x.lineWidth = r * 0.28; x.stroke();
      return;
    }
    x.fillStyle = shade(color, -0.22); x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill();
    x.fillStyle = color; x.beginPath(); x.arc(cx - r * 0.08, cy - r * 0.1, r * 0.86, 0, Math.PI * 2); x.fill();
    if (skin.pattern === "dots") { x.fillStyle = skin.colors[1]; x.beginPath(); x.arc(cx, cy, r * 0.32, 0, Math.PI * 2); x.fill(); }
    if (skin.pattern === "scales" && i % 2 === 0) { x.strokeStyle = shade(color, -0.3); x.lineWidth = r * 0.12; x.beginPath(); x.arc(cx, cy + r * 0.2, r * 0.6, Math.PI * 1.15, Math.PI * 1.85); x.stroke(); }
    x.fillStyle = "rgba(255,255,255,.28)"; x.beginPath(); x.arc(cx - r * 0.3, cy - r * 0.35, r * 0.32, 0, Math.PI * 2); x.fill();
  }

  function head(x, cx, cy, r, ang, skin, opts = {}) {
    const color = skin.pattern === "neon" ? skin.colors[0] : segColor(skin, 0, 10, opts.t || 0);
    const R = r * 1.12;
    if (opts.boost) { x.save(); x.shadowColor = skin.colors[0]; x.shadowBlur = r * 1.4; }
    segment(x, cx, cy, R, color, skin, 0);
    if (opts.boost) x.restore();
    // tongue flick
    if (opts.tongue) {
      const tx = cx + Math.cos(ang) * R * 1.05, ty = cy + Math.sin(ang) * R * 1.05;
      x.strokeStyle = "#ff3b5c"; x.lineWidth = Math.max(1.5, r * 0.14); x.lineCap = "round";
      x.beginPath(); x.moveTo(tx, ty); x.lineTo(tx + Math.cos(ang) * r * 0.6, ty + Math.sin(ang) * r * 0.6);
      x.lineTo(tx + Math.cos(ang + 0.5) * r * 0.85, ty + Math.sin(ang + 0.5) * r * 0.85);
      x.moveTo(tx + Math.cos(ang) * r * 0.6, ty + Math.sin(ang) * r * 0.6);
      x.lineTo(tx + Math.cos(ang - 0.5) * r * 0.85, ty + Math.sin(ang - 0.5) * r * 0.85); x.stroke();
    }
    // eyes sit forward, either side of the heading
    const er = r * 0.42, side = r * 0.52, fwd = r * 0.38;
    [-1, 1].forEach(s => {
      const ex = cx + Math.cos(ang) * fwd + Math.cos(ang + Math.PI / 2) * side * s;
      const ey = cy + Math.sin(ang) * fwd + Math.sin(ang + Math.PI / 2) * side * s;
      if (opts.dead) {
        x.strokeStyle = "#1a1a2a"; x.lineWidth = r * 0.14; x.beginPath();
        x.moveTo(ex - er * 0.6, ey - er * 0.6); x.lineTo(ex + er * 0.6, ey + er * 0.6); x.moveTo(ex + er * 0.6, ey - er * 0.6); x.lineTo(ex - er * 0.6, ey + er * 0.6); x.stroke();
        return;
      }
      x.fillStyle = "#fff"; x.beginPath(); x.ellipse(ex, ey, er, opts.blink ? er * 0.15 : er, ang, 0, Math.PI * 2); x.fill();
      if (!opts.blink) {
        const look = opts.look ?? ang;
        x.fillStyle = "#151525"; x.beginPath(); x.arc(ex + Math.cos(look) * er * 0.38, ey + Math.sin(look) * er * 0.38, er * 0.55, 0, Math.PI * 2); x.fill();
        x.fillStyle = "#fff"; x.beginPath(); x.arc(ex + Math.cos(look) * er * 0.38 - er * 0.2, ey + Math.sin(look) * er * 0.38 - er * 0.2, er * 0.18, 0, Math.PI * 2); x.fill();
      }
    });
  }

  // a little wavy snake for the shop
  function preview(id, w = 120, h = 60) {
    const skin = byId(id);
    const cv = document.createElement("canvas");
    const d = Math.min(2, window.devicePixelRatio || 1);
    cv.width = w * d; cv.height = h * d; cv.style.width = w + "px"; cv.style.height = h + "px";
    const x = cv.getContext("2d"); x.scale(d, d);
    const n = 14, r = h * 0.17, pts = [];
    for (let i = 0; i < n; i++) pts.push([w * 0.82 - i * (w * 0.62 / n), h / 2 + Math.sin(i * 0.7) * h * 0.18]);
    for (let i = n - 1; i >= 1; i--) segment(x, pts[i][0], pts[i][1], r, segColor(skin, i, n), skin, i);
    head(x, pts[0][0], pts[0][1], r, Math.atan2(pts[0][1] - pts[1][1], pts[0][0] - pts[1][0]), skin, {});
    return cv;
  }

  return { byId, segColor, segment, head, preview, mix, shade };
})();

/* Playable characters drawn in code. draw() takes a pose (run phase, air,
   slide, squash) so every hero gets the same juicy animation set. */
window.Characters = (() => {
  const C = window.GAME_CONFIG;
  const byId = id => C.characters.find(c => c.id === id) || C.characters[0];

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const t = amt < 0 ? 0 : 255, p = Math.abs(amt);
    return `rgb(${Math.round((t - r) * p + r)},${Math.round((t - g) * p + g)},${Math.round((t - b) * p + b)})`;
  }
  function rr(x, cx, cy, w, h, r) {
    x.beginPath(); x.moveTo(cx - w / 2 + r, cy - h / 2);
    x.arcTo(cx + w / 2, cy - h / 2, cx + w / 2, cy + h / 2, r); x.arcTo(cx + w / 2, cy + h / 2, cx - w / 2, cy + h / 2, r);
    x.arcTo(cx - w / 2, cy + h / 2, cx - w / 2, cy - h / 2, r); x.arcTo(cx - w / 2, cy - h / 2, cx + w / 2, cy - h / 2, r); x.closePath();
  }
  const ell = (x, cx, cy, rx, ry, fill, rot = 0) => { x.beginPath(); x.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2); x.fillStyle = fill; x.fill(); };
  const tri = (x, pts, fill) => { x.beginPath(); pts.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.closePath(); x.fillStyle = fill; x.fill(); };

  /* pose: { phase (0..1 run cycle), air (bool), vy, slide (bool), sx, sy (squash), blink (bool), dead (bool) }
     Drawn at origin = feet center; S = body size in px. */
  function draw(x, id, S, pose = {}) {
    const ch = byId(id), col = ch.color, dark = shade(col, -0.3), light = shade(col, 0.35);
    const { phase = 0, air = false, slide = false, sx = 1, sy = 1, blink = false, dead = false, vy = 0 } = pose;
    x.save();
    x.scale(sx, sy);
    const bh = slide ? S * 0.62 : S, bw = slide ? S * 1.18 : S * 0.96;
    const cy = -bh / 2 - S * 0.12;

    // shadow-ish outline glow for readability on any background
    x.shadowColor = "rgba(0,0,0,.25)"; x.shadowBlur = S * 0.08; x.shadowOffsetY = S * 0.05;

    // tail (behind)
    if (ch.style === "fox" || ch.style === "cat" || ch.style === "dino") {
      const wag = Math.sin(phase * Math.PI * 2) * 0.3;
      x.save(); x.translate(-bw * 0.42, cy + bh * 0.2); x.rotate(-0.6 + wag);
      if (ch.style === "dino") tri(x, [[0, -S * 0.12], [-S * 0.5, S * 0.05], [0, S * 0.14]], col);
      else { ell(x, -S * 0.28, 0, S * 0.3, S * 0.12, col); if (ch.style === "fox") ell(x, -S * 0.5, 0, S * 0.1, S * 0.08, "#fff"); }
      x.restore();
    }
    // feet
    const footY = -S * 0.08;
    const swing = air ? 0 : Math.sin(phase * Math.PI * 2) * S * 0.2;
    const lift = air ? -S * 0.08 : 0;
    const fc = ch.style === "robot" ? "#56688f" : ch.style === "astro" ? "#c9d2e6" : dark;
    if (!slide) {
      ell(x, -S * 0.18 + swing, footY + lift + (air ? 0 : Math.max(0, -Math.cos(phase * Math.PI * 2)) * -S * 0.06), S * 0.17, S * 0.1, fc);
      ell(x, S * 0.18 - swing, footY + lift + (air ? 0 : Math.max(0, Math.cos(phase * Math.PI * 2)) * -S * 0.06), S * 0.17, S * 0.1, fc);
    }

    // body
    if (ch.style === "robot") { rr(x, 0, cy, bw * 0.95, bh, S * 0.16); x.fillStyle = col; x.fill(); }
    else { rr(x, 0, cy, bw, bh, Math.min(bw, bh) * 0.46); x.fillStyle = col; x.fill(); }
    x.shadowColor = "transparent";
    // belly / highlights
    if (ch.style === "fox" || ch.style === "cat") ell(x, bw * 0.12, cy + bh * 0.18, bw * 0.28, bh * 0.24, "#fff");
    if (ch.style === "astro") { ell(x, 0, cy + bh * 0.25, bw * 0.3, bh * 0.12, "#e6ebf5"); }
    ell(x, -bw * 0.22, cy - bh * 0.26, bw * 0.16, bh * 0.1, "rgba(255,255,255,.45)", -0.5);

    // ears / headgear
    const top = cy - bh / 2;
    if (ch.style === "fox") { tri(x, [[-bw * 0.36, top + S * 0.12], [-bw * 0.3, top - S * 0.24], [-bw * 0.06, top + S * 0.04]], col); tri(x, [[bw * 0.36, top + S * 0.12], [bw * 0.3, top - S * 0.24], [bw * 0.06, top + S * 0.04]], col); tri(x, [[bw * 0.3, top + S * 0.06], [bw * 0.27, top - S * 0.13], [bw * 0.14, top + S * 0.02]], "#3a2416"); }
    if (ch.style === "cat") { tri(x, [[-bw * 0.38, top + S * 0.12], [-bw * 0.34, top - S * 0.18], [-bw * 0.1, top + S * 0.04]], col); tri(x, [[bw * 0.38, top + S * 0.12], [bw * 0.34, top - S * 0.18], [bw * 0.1, top + S * 0.04]], col); }
    if (ch.style === "dino") for (let i = 0; i < 3; i++) tri(x, [[-bw * 0.4 + i * bw * 0.18, top + S * 0.1 + i * 2], [-bw * 0.33 + i * bw * 0.18, top - S * 0.12], [-bw * 0.24 + i * bw * 0.18, top + S * 0.06]], dark);
    if (ch.style === "robot") {
      x.strokeStyle = "#56688f"; x.lineWidth = S * 0.05; x.beginPath(); x.moveTo(0, top); x.lineTo(0, top - S * 0.2); x.stroke();
      ell(x, 0, top - S * 0.22, S * 0.07, S * 0.07, Math.floor(Date.now() / 300) % 2 ? "#ff4d5e" : "#ffd32a");
    }
    if (ch.style === "ninja") {
      x.fillStyle = "#ff3b4e"; x.fillRect(-bw / 2, cy - bh * 0.22, bw, bh * 0.14);
      const flap = Math.sin(phase * Math.PI * 4) * S * 0.08;
      tri(x, [[-bw * 0.45, cy - bh * 0.2], [-bw * 0.95, cy - bh * 0.32 + flap], [-bw * 0.85, cy - bh * 0.08 + flap]], "#ff3b4e");
    }

    // face
    const ex = bw * 0.14, ey = ch.style === "frog" ? top + S * 0.02 : cy - bh * 0.08;
    const er = S * (ch.style === "frog" ? 0.15 : 0.13);
    const look = vy < -200 ? -S * 0.03 : vy > 200 ? S * 0.03 : 0;
    if (ch.style === "astro") {
      ell(x, bw * 0.05, cy - bh * 0.08, bw * 0.4, bh * 0.28, "#2a3d6e");
      ell(x, bw * 0.15, cy - bh * 0.14, bw * 0.12, bh * 0.07, "rgba(255,255,255,.7)");
      x.strokeStyle = "#ffa62e"; x.lineWidth = S * 0.04; x.beginPath(); x.ellipse(bw * 0.05, cy - bh * 0.08, bw * 0.42, bh * 0.3, 0, 0, Math.PI * 2); x.stroke();
    } else if (ch.style === "robot") {
      rr(x, bw * 0.06, cy - bh * 0.06, bw * 0.66, bh * 0.4, S * 0.08); x.fillStyle = "#1e2a44"; x.fill();
      if (dead) { x.fillStyle = "#ff4d5e"; x.font = `bold ${S * 0.22}px sans-serif`; x.fillText("x x", -bw * 0.12, cy); }
      else { x.fillStyle = "#7fffd4"; x.fillRect(-bw * 0.08, cy - bh * 0.12 + look, S * 0.1, blink ? S * 0.02 : S * 0.1); x.fillRect(bw * 0.18, cy - bh * 0.12 + look, S * 0.1, blink ? S * 0.02 : S * 0.1); }
    } else {
      if (ch.style === "frog") { ell(x, -ex + bw * 0.04, ey, er * 1.2, er * 1.2, col); ell(x, ex + bw * 0.14, ey, er * 1.2, er * 1.2, col); }
      const eyes = [[-ex + bw * 0.04, ey], [ex + bw * 0.14, ey]];
      eyes.forEach(([ax, ay]) => {
        if (dead) { x.strokeStyle = "#2a1a3a"; x.lineWidth = S * 0.05; x.beginPath(); x.moveTo(ax - er * 0.6, ay - er * 0.6); x.lineTo(ax + er * 0.6, ay + er * 0.6); x.moveTo(ax + er * 0.6, ay - er * 0.6); x.lineTo(ax - er * 0.6, ay + er * 0.6); x.stroke(); return; }
        if (blink) { x.strokeStyle = "#2a1a3a"; x.lineWidth = S * 0.04; x.beginPath(); x.moveTo(ax - er * 0.7, ay); x.lineTo(ax + er * 0.7, ay); x.stroke(); return; }
        ell(x, ax, ay, er, er * (ch.style === "ninja" ? 0.55 : 1), "#fff");
        ell(x, ax + er * 0.3, ay + look, er * 0.55, er * (ch.style === "ninja" ? 0.4 : 0.6), "#2a1a3a");
        ell(x, ax + er * 0.45, ay - er * 0.25 + look, er * 0.18, er * 0.18, "#fff");
      });
      // mouth / muzzle
      if (ch.style === "fox" || ch.style === "cat") ell(x, bw * 0.38, cy + bh * 0.04, S * 0.06, S * 0.05, "#3a2416");
      if (ch.style === "cat") { x.strokeStyle = "rgba(40,30,50,.6)"; x.lineWidth = 1.2; x.beginPath(); x.moveTo(bw * 0.3, cy + bh * 0.08); x.lineTo(bw * 0.62, cy + bh * 0.03); x.moveTo(bw * 0.3, cy + bh * 0.12); x.lineTo(bw * 0.62, cy + bh * 0.14); x.stroke(); }
      if (ch.style === "blob" || ch.style === "frog" || ch.style === "dino") {
        x.strokeStyle = "#2a1a3a"; x.lineWidth = S * 0.04; x.lineCap = "round";
        x.beginPath();
        if (dead) x.arc(bw * 0.12, cy + bh * 0.22, S * 0.08, Math.PI * 1.1, Math.PI * 1.9);
        else x.arc(bw * 0.12, cy + bh * 0.1, S * (air ? 0.06 : 0.1), Math.PI * 0.15, Math.PI * 0.85);
        x.stroke();
      }
      // cheeks
      if (ch.style !== "ninja") ell(x, bw * 0.34, cy + bh * 0.06, S * 0.06, S * 0.035, "rgba(255,90,120,.45)");
    }
    x.restore();
  }

  function preview(id, size = 80) {
    const cv = document.createElement("canvas");
    const d = Math.min(2, window.devicePixelRatio || 1);
    cv.width = cv.height = size * d; cv.style.width = cv.style.height = size + "px";
    const x = cv.getContext("2d");
    x.scale(d, d); x.translate(size / 2, size * 0.88);
    draw(x, id, size * 0.6, { phase: 0.25 });
    return cv;
  }

  return { draw, preview, byId, shade };
})();

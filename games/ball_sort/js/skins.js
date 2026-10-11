/* Skins: ball painters (8 looks), tube painters (local frame: origin at the
   mouth, tube hangs down +y), the cork that seals a finished tube, and small
   canvases for the shop. Everything is code-drawn. */
// roundRect for older Android WebViews (Chrome < 99)
if (typeof CanvasRenderingContext2D !== "undefined" && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    r = Math.max(0, Math.min(typeof r === "number" ? r : 0, Math.abs(w) / 2, Math.abs(h) / 2));
    this.moveTo(x + r, y); this.arcTo(x + w, y, x + w, y + h, r); this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r); this.arcTo(x, y, x + w, y, r); this.closePath();
  };
}

window.Skins = (() => {
  const C = window.GAME_CONFIG, P = C.palette;
  const TAU = Math.PI * 2;

  function hex(h) { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
  function mix(a, b, t) { const A = hex(a), B = hex(b); return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join(""); }
  const shade = (h, amt) => amt < 0 ? mix(h, "#000000", -amt) : mix(h, "#ffffff", amt);
  const HIDDEN = "#4a4f6a";

  // ---------- balls -----------------------------------------------------------
  function gloss(x, cx, cy, r, col) {
    const g = x.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r);
    g.addColorStop(0, shade(col, 0.55)); g.addColorStop(0.45, col); g.addColorStop(1, shade(col, -0.35));
    x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, TAU); x.fill();
  }
  function shine(x, cx, cy, r, a = 0.75) {
    x.fillStyle = `rgba(255,255,255,${a})`;
    x.beginPath(); x.ellipse(cx - r * 0.32, cy - r * 0.42, r * 0.3, r * 0.18, -0.6, 0, TAU); x.fill();
    x.fillStyle = `rgba(255,255,255,${a * 0.5})`;
    x.beginPath(); x.arc(cx + r * 0.35, cy + r * 0.38, r * 0.08, 0, TAU); x.fill();
  }
  function symbol(x, k, cx, cy, s) {
    x.beginPath();
    switch (k % 12) {
      case 0: x.arc(cx, cy, s * 0.8, 0, TAU); break;
      case 1: x.moveTo(cx, cy - s); x.lineTo(cx + s * 0.95, cy + s * 0.75); x.lineTo(cx - s * 0.95, cy + s * 0.75); x.closePath(); break;
      case 2: x.rect(cx - s * 0.75, cy - s * 0.75, s * 1.5, s * 1.5); break;
      case 3: for (let i = 0; i < 10; i++) { const rr = i % 2 ? s * 0.45 : s, a = -Math.PI / 2 + i * Math.PI / 5; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } x.closePath(); break;
      case 4: x.moveTo(cx, cy + s * 0.85); x.bezierCurveTo(cx - s * 1.4, cy - s * 0.2, cx - s * 0.5, cy - s * 1.2, cx, cy - s * 0.35); x.bezierCurveTo(cx + s * 0.5, cy - s * 1.2, cx + s * 1.4, cy - s * 0.2, cx, cy + s * 0.85); break;
      case 5: x.moveTo(cx, cy - s); x.lineTo(cx + s * 0.75, cy); x.lineTo(cx, cy + s); x.lineTo(cx - s * 0.75, cy); x.closePath(); break;
      case 6: { const w = s * 0.32; x.rect(cx - w, cy - s, w * 2, s * 2); x.rect(cx - s, cy - w, s * 2, w * 2); break; }
      case 7: x.arc(cx, cy, s * 0.9, 0.6, TAU - 0.6); x.arc(cx + s * 0.45, cy, s * 0.62, TAU - 0.9, 0.9, true); x.closePath(); break;
      case 8: for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; x.lineTo(cx + Math.cos(a) * s * 0.9, cy + Math.sin(a) * s * 0.9); } x.closePath(); break;
      case 9: x.arc(cx, cy, s * 0.85, 0, TAU); x.arc(cx, cy, s * 0.42, 0, TAU, true); break;
      case 10: x.moveTo(cx + s * 0.2, cy - s); x.lineTo(cx - s * 0.6, cy + s * 0.15); x.lineTo(cx, cy + s * 0.15); x.lineTo(cx - s * 0.2, cy + s); x.lineTo(cx + s * 0.6, cy - s * 0.15); x.lineTo(cx, cy - s * 0.15); x.closePath(); break;
      default: x.moveTo(cx, cy - s); x.bezierCurveTo(cx + s * 0.9, cy, cx + s * 0.8, cy + s, cx, cy + s); x.bezierCurveTo(cx - s * 0.8, cy + s, cx - s * 0.9, cy, cx, cy - s);
    }
    x.fill("evenodd");
  }

  function ball(x, cx, cy, r, ci, skinId, o = {}) {
    const t = o.t || 0;
    x.save();
    if (o.sx || o.sy) { x.translate(cx, cy + r); x.scale(o.sx || 1, o.sy || 1); x.translate(-cx, -cy - r); }
    // soft contact shadow
    x.fillStyle = "rgba(0,0,0,.18)"; x.beginPath(); x.ellipse(cx, cy + r * 0.9, r * 0.7, r * 0.18, 0, 0, TAU); x.fill();
    if (o.hidden) {
      gloss(x, cx, cy, r, HIDDEN); shine(x, cx, cy, r, 0.4);
      x.fillStyle = "#fff"; x.font = `${Math.round(r * 1.2)}px "Lilita One", sans-serif`; x.textAlign = "center"; x.textBaseline = "middle";
      x.fillText("?", cx, cy + r * 0.06);
      x.restore(); return;
    }
    const col = P[ci % P.length];
    switch (skinId) {
      case "faces": {
        gloss(x, cx, cy, r, col);
        const blink = ((t * 0.7 + ci * 0.37) % 4) < 0.12;
        x.fillStyle = "#1a1030";
        if (blink) { x.fillRect(cx - r * 0.42, cy - r * 0.12, r * 0.26, r * 0.08); x.fillRect(cx + r * 0.16, cy - r * 0.12, r * 0.26, r * 0.08); }
        else {
          [-0.28, 0.28].forEach(d => { x.beginPath(); x.ellipse(cx + d * r, cy - r * 0.08, r * 0.12, r * 0.17, 0, 0, TAU); x.fill(); });
          x.fillStyle = "#fff"; [-0.24, 0.32].forEach(d => { x.beginPath(); x.arc(cx + d * r, cy - r * 0.15, r * 0.05, 0, TAU); x.fill(); });
        }
        x.strokeStyle = "#1a1030"; x.lineWidth = r * 0.09; x.lineCap = "round";
        x.beginPath(); x.arc(cx, cy + r * 0.12, r * 0.22, 0.25, Math.PI - 0.25); x.stroke();
        x.fillStyle = "rgba(255,120,150,.45)"; [-0.52, 0.52].forEach(d => { x.beginPath(); x.ellipse(cx + d * r, cy + r * 0.18, r * 0.13, r * 0.08, 0, 0, TAU); x.fill(); });
        shine(x, cx, cy, r, 0.6);
        break;
      }
      case "candy": {
        gloss(x, cx, cy, r, col);
        x.save(); x.beginPath(); x.arc(cx, cy, r * 0.96, 0, TAU); x.clip();
        x.strokeStyle = "rgba(255,255,255,.75)"; x.lineWidth = r * 0.22;
        for (let i = -1; i <= 1; i++) { x.beginPath(); x.moveTo(cx - r * 1.2, cy + i * r * 0.75 + r * 0.6); x.quadraticCurveTo(cx, cy + i * r * 0.75 - r * 0.6, cx + r * 1.2, cy + i * r * 0.75 + r * 0.2); x.stroke(); }
        x.restore();
        shine(x, cx, cy, r, 0.7);
        break;
      }
      case "pool": {
        const striped = ci >= 8;
        if (striped) {
          gloss(x, cx, cy, r, "#fbf6ea");
          x.save(); x.beginPath(); x.arc(cx, cy, r, 0, TAU); x.clip();
          x.fillStyle = col; x.fillRect(cx - r, cy - r * 0.52, r * 2, r * 1.04);
          x.fillStyle = "rgba(0,0,0,.18)"; x.fillRect(cx - r, cy + r * 0.3, r * 2, r * 0.22);
          x.restore();
        } else gloss(x, cx, cy, r, col);
        x.fillStyle = "#fff"; x.beginPath(); x.arc(cx, cy, r * 0.44, 0, TAU); x.fill();
        x.fillStyle = "#1a1030"; x.font = `${Math.round(r * 0.6)}px "Lilita One", sans-serif`; x.textAlign = "center"; x.textBaseline = "middle";
        x.fillText(String(ci + 1), cx, cy + r * 0.04);
        shine(x, cx, cy, r, 0.65);
        break;
      }
      case "symbols": {
        gloss(x, cx, cy, r, col);
        x.fillStyle = "rgba(0,0,0,.25)"; symbol(x, ci, cx, cy + r * 0.06, r * 0.46);
        x.fillStyle = "#fff"; symbol(x, ci, cx, cy, r * 0.46);
        shine(x, cx, cy, r, 0.5);
        break;
      }
      case "gems": {
        const n = 8, pts = [];
        for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (i + 0.5) * TAU / n; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
        x.fillStyle = shade(col, -0.3); x.beginPath(); pts.forEach(p => x.lineTo(p[0], p[1])); x.closePath(); x.fill();
        for (let i = 0; i < n; i++) {
          const a = pts[i], b = pts[(i + 1) % n];
          x.fillStyle = shade(col, ((i * 37) % 5) / 10 - 0.15);
          x.beginPath(); x.moveTo(cx, cy); x.lineTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.closePath(); x.fill();
        }
        x.fillStyle = shade(col, 0.35); x.beginPath();
        for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (i + 0.5) * TAU / n; x.lineTo(cx + Math.cos(a) * r * 0.5, cy + Math.sin(a) * r * 0.5); }
        x.closePath(); x.fill();
        const tw = (Math.sin(t * 3 + ci) + 1) / 2;
        x.fillStyle = `rgba(255,255,255,${0.4 + tw * 0.5})`;
        symbol(x, 3, cx - r * 0.3, cy - r * 0.35, r * (0.12 + tw * 0.1));
        break;
      }
      case "neon": {
        x.fillStyle = "#0d0a24"; x.beginPath(); x.arc(cx, cy, r, 0, TAU); x.fill();
        x.shadowColor = col; x.shadowBlur = r * 0.8;
        x.strokeStyle = col; x.lineWidth = r * 0.22; x.beginPath(); x.arc(cx, cy, r * 0.82, 0, TAU); x.stroke();
        x.shadowBlur = 0;
        const g = x.createRadialGradient(cx, cy, 0, cx, cy, r * 0.7);
        g.addColorStop(0, shade(col, 0.2) + "aa"); g.addColorStop(1, col + "00");
        x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r * 0.7, 0, TAU); x.fill();
        x.fillStyle = "rgba(255,255,255,.85)"; x.beginPath(); x.arc(cx - r * 0.3, cy - r * 0.42, r * 0.09, 0, TAU); x.fill();
        break;
      }
      case "fruits": {
        x.fillStyle = col + "55"; x.beginPath(); x.arc(cx, cy, r * 0.95, 0, TAU); x.fill();
        x.font = `${Math.round(r * 1.55)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
        x.textAlign = "center"; x.textBaseline = "middle"; x.fillStyle = "#000";   // emoji need an opaque fill
        x.fillText(C.fruitEmoji[ci % C.fruitEmoji.length], cx, cy + r * 0.1);
        break;
      }
      default: gloss(x, cx, cy, r, col); shine(x, cx, cy, r);
    }
    x.restore();
  }

  // ---------- tubes (local frame: origin = mouth center, +y down) -------------
  const tubeById = id => C.tubeSkins.find(s => s.id === id) || C.tubeSkins[0];
  function tubePath(x, w, h) {
    const r = w / 2;
    x.beginPath(); x.moveTo(-r, 0); x.lineTo(-r, h - r); x.arc(0, h - r, r, Math.PI, 0, true); x.lineTo(r, 0);
  }
  // glass body behind the contents
  function tubeBack(x, w, h, skinId, o = {}) {
    const s = tubeById(skinId);
    tubePath(x, w, h); x.closePath();
    x.fillStyle = s.fill; x.fill();
    if (o.glow) {
      x.save(); x.shadowColor = o.glowColor || "#ffe03a"; x.shadowBlur = 26 * o.glow;
      x.strokeStyle = `rgba(255,240,150,${0.9 * o.glow})`; x.lineWidth = 5; tubePath(x, w, h); x.stroke(); x.restore();
    }
  }
  // outline, gloss and rim in front of the contents
  function tubeFront(x, w, h, skinId, o = {}) {
    const s = tubeById(skinId), lw = Math.max(2, w * 0.06);
    x.save();
    if (s.glow) { x.shadowColor = s.glow; x.shadowBlur = w * 0.35; }
    x.strokeStyle = o.selected ? "#fff6a8" : s.stroke; x.lineWidth = lw;
    tubePath(x, w, h); x.stroke();
    x.restore();
    // gloss strip
    x.fillStyle = "rgba(255,255,255,.28)";
    x.beginPath(); x.roundRect(-w / 2 + lw * 1.4, h * 0.08, w * 0.12, h * 0.72, w * 0.06); x.fill();
    // rim
    const lip = w * 0.12, rw = w + lip * 2, rh = Math.max(6, w * 0.16);
    x.fillStyle = s.rim;
    x.beginPath(); x.roundRect(-rw / 2, -rh * 0.55, rw, rh, rh / 2); x.fill();
    if (s.stripes) {
      x.save(); x.beginPath(); x.roundRect(-rw / 2, -rh * 0.55, rw, rh, rh / 2); x.clip();
      x.fillStyle = s.stripes;
      for (let i = -rw; i < rw; i += rh * 1.2) { x.beginPath(); x.moveTo(i, rh); x.lineTo(i + rh * 0.6, rh); x.lineTo(i + rh * 1.4, -rh); x.lineTo(i + rh * 0.8, -rh); x.fill(); }
      x.restore();
    }
    x.fillStyle = "rgba(255,255,255,.55)"; x.beginPath(); x.roundRect(-rw / 2 + rh * 0.4, -rh * 0.4, rw * 0.5, rh * 0.28, rh * 0.14); x.fill();
  }
  // cork that pops into a finished tube; drop: 0 = seated, 1 = high above
  function cork(x, w, drop = 0) {
    const cw = w * 0.86, ch = w * 0.62, y = -ch * 0.75 - drop * w * 2.2;
    x.save();
    const g = x.createLinearGradient(-cw / 2, 0, cw / 2, 0);
    g.addColorStop(0, "#b8783e"); g.addColorStop(0.45, "#e6aa66"); g.addColorStop(1, "#9a5e2c");
    x.fillStyle = g; x.beginPath();
    x.moveTo(-cw / 2, y); x.lineTo(cw / 2, y); x.lineTo(cw * 0.42, y + ch); x.lineTo(-cw * 0.42, y + ch); x.closePath(); x.fill();
    x.fillStyle = "#f2c48a"; x.beginPath(); x.ellipse(0, y, cw / 2, ch * 0.18, 0, 0, TAU); x.fill();
    x.fillStyle = "rgba(120,70,30,.5)";
    [[-0.2, 0.3], [0.15, 0.55], [0.05, 0.2], [-0.1, 0.7]].forEach(([dx, dy]) => { x.beginPath(); x.arc(dx * cw, y + dy * ch, w * 0.035, 0, TAU); x.fill(); });
    x.restore();
  }

  // ---------- liquid ---------------------------------------------------------
  function liquidColor(ci, hidden) { return hidden ? HIDDEN : P[ci % P.length]; }

  // ---------- shop previews -------------------------------------------------
  function canvas(w, h) {
    const cv = document.createElement("canvas"), dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = w * dpr; cv.height = h * dpr; cv.style.width = w + "px"; cv.style.height = h + "px";
    const x = cv.getContext("2d"); x.scale(dpr, dpr);
    return [cv, x];
  }
  function ballPreview(skinId, w = 96, h = 44) {
    const [cv, x] = canvas(w, h), r = h * 0.36;
    [0, 3, 7].forEach((ci, i) => ball(x, w / 2 + (i - 1) * r * 2.15, h / 2, r, ci, skinId, { t: 0.5 }));
    return cv;
  }
  function tubePreview(tubeId, ballSkin = "glossy", w = 60, h = 96) {
    const [cv, x] = canvas(w, h), tw = w * 0.42, th = h * 0.78, r = tw * 0.4;
    x.translate(w / 2, h * 0.14);
    tubeBack(x, tw, th, tubeId);
    [0, 3, 6].forEach((ci, i) => ball(x, 0, th - r * 1.15 - i * r * 2.05, r, ci, ballSkin));
    tubeFront(x, tw, th, tubeId);
    return cv;
  }

  return { ball, tubePath, tubeBack, tubeFront, cork, liquidColor, ballPreview, tubePreview, shade, mix, HIDDEN };
})();

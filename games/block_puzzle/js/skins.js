/* Block skins drawn in code and cached as sprites. Each painter draws one
   block of size s at (0,0). Add a skin: add a painter + an entry in config.skins. */
window.Skins = (() => {
  const C = window.GAME_CONFIG;
  const GRAY = "#4b5185";

  function rgb(hex) { const n = parseInt(hex.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
  function mix(hex, amt) {
    let [r, g, b] = rgb(hex);
    const t = amt < 0 ? 0 : 255, p = Math.abs(amt);
    r = Math.round((t - r) * p + r); g = Math.round((t - g) * p + g); b = Math.round((t - b) * p + b);
    return `rgb(${r},${g},${b})`;
  }
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function poly(ctx, pts, fill) { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); }

  const painters = {
    // chunky bevelled arcade block
    classic(ctx, s, c) {
      const b = s * 0.13;
      rr(ctx, 0, 0, s, s, s * 0.12); ctx.save(); ctx.clip();
      ctx.fillStyle = mix(c, -0.35); ctx.fillRect(0, 0, s, s);
      poly(ctx, [[0, 0], [s, 0], [s - b, b], [b, b]], mix(c, 0.5));
      poly(ctx, [[0, 0], [b, b], [b, s - b], [0, s]], mix(c, 0.22));
      poly(ctx, [[s, 0], [s, s], [s - b, s - b], [s - b, b]], mix(c, -0.18));
      poly(ctx, [[0, s], [b, s - b], [s - b, s - b], [s, s]], mix(c, -0.38));
      const g = ctx.createLinearGradient(0, b, 0, s - b);
      g.addColorStop(0, mix(c, 0.18)); g.addColorStop(1, mix(c, -0.06));
      ctx.fillStyle = g; ctx.fillRect(b, b, s - 2 * b, s - 2 * b);
      ctx.fillStyle = "rgba(255,255,255,.35)";
      rr(ctx, b * 1.4, b * 1.4, s * 0.26, s * 0.12, s * 0.06); ctx.fill();
      ctx.restore();
    },
    // soft, squishy candy
    jelly(ctx, s, c) {
      rr(ctx, s * 0.02, s * 0.02, s * 0.96, s * 0.96, s * 0.3);
      const g = ctx.createRadialGradient(s * 0.35, s * 0.3, s * 0.05, s * 0.5, s * 0.55, s * 0.75);
      g.addColorStop(0, mix(c, 0.55)); g.addColorStop(0.45, c); g.addColorStop(1, mix(c, -0.35));
      ctx.fillStyle = g; ctx.fill();
      ctx.lineWidth = s * 0.05; ctx.strokeStyle = mix(c, -0.3); ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,.55)";
      ctx.beginPath(); ctx.ellipse(s * 0.38, s * 0.24, s * 0.22, s * 0.1, -0.35, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(s * 0.72, s * 0.22, s * 0.05, 0, Math.PI * 2); ctx.fill();
    },
    // faceted jewel
    gem(ctx, s, c) {
      const i = s * 0.27;
      rr(ctx, 0, 0, s, s, s * 0.1); ctx.save(); ctx.clip();
      poly(ctx, [[0, 0], [s, 0], [s - i, i], [i, i]], mix(c, 0.45));
      poly(ctx, [[0, 0], [i, i], [i, s - i], [0, s]], mix(c, 0.15));
      poly(ctx, [[s, 0], [s, s], [s - i, s - i], [s - i, i]], mix(c, -0.25));
      poly(ctx, [[0, s], [i, s - i], [s - i, s - i], [s, s]], mix(c, -0.42));
      const g = ctx.createLinearGradient(i, i, s - i, s - i);
      g.addColorStop(0, mix(c, 0.35)); g.addColorStop(1, mix(c, -0.1));
      ctx.fillStyle = g; ctx.fillRect(i, i, s - 2 * i, s - 2 * i);
      ctx.strokeStyle = "rgba(255,255,255,.25)"; ctx.lineWidth = s * 0.02;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(i, i); ctx.moveTo(s, 0); ctx.lineTo(s - i, i); ctx.moveTo(0, s); ctx.lineTo(i, s - i); ctx.moveTo(s, s); ctx.lineTo(s - i, s - i); ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.translate(s * 0.36, s * 0.36);
      ctx.beginPath(); for (let k = 0; k < 8; k++) { const r = k % 2 ? s * 0.025 : s * 0.09, a = (k * Math.PI) / 4; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.fill();
      ctx.restore();
    },
    // glowing outline
    neon(ctx, s, c) {
      const p = s * 0.14;
      ctx.shadowColor = c; ctx.shadowBlur = s * 0.28;
      rr(ctx, p, p, s - 2 * p, s - 2 * p, s * 0.12);
      ctx.fillStyle = mix(c, -0.7); ctx.fill();
      ctx.lineWidth = s * 0.08; ctx.strokeStyle = c; ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.lineWidth = s * 0.03; ctx.strokeStyle = mix(c, 0.6); ctx.stroke();
      rr(ctx, s * 0.32, s * 0.32, s * 0.36, s * 0.36, s * 0.06);
      ctx.fillStyle = c; ctx.globalAlpha = 0.55; ctx.fill(); ctx.globalAlpha = 1;
    }
  };

  // image-based skin (config.blockImages)
  const images = [];
  function loadImages(loaded) {
    (C.blockImages || []).forEach((url, i) => { if (loaded(url)) { const im = new Image(); im.src = url; images[i] = im; } });
  }
  const hasCustom = () => images.length > 0 && images.every(Boolean) && images.length >= C.colors.length;

  const cache = new Map();
  function colorOf(i) { return i === "gray" ? GRAY : i === "white" ? "#ffffff" : C.colors[i] || GRAY; }

  function sprite(skin, colorIdx, size) {
    const px = Math.max(4, Math.round(size));
    const key = skin + "|" + colorIdx + "|" + px;
    let cv = cache.get(key);
    if (cv) return cv;
    cv = document.createElement("canvas");
    cv.width = cv.height = px;
    const ctx = cv.getContext("2d");
    if (skin === "custom" && hasCustom() && typeof colorIdx === "number") {
      ctx.drawImage(images[colorIdx], 0, 0, px, px);
    } else if (colorIdx === "white") {
      rr(ctx, 0, 0, px, px, px * 0.14); ctx.fillStyle = "#fff"; ctx.fill();
    } else {
      (painters[skin] || painters.classic)(ctx, px, colorOf(colorIdx));
    }
    if (cache.size > 600) cache.clear();
    cache.set(key, cv);
    return cv;
  }

  // vector gem drawn on top of "gem" cells in Adventure
  let gemImg = null;
  function setGemImage(url) { gemImg = new Image(); gemImg.src = url; }
  function drawGem(ctx, x, y, s, t) {
    const pulse = 1 + Math.sin(t / 260 + x * 0.05) * 0.06;
    const w = s * 0.62 * pulse, cx = x + s / 2, cy = y + s / 2;
    if (gemImg && gemImg.complete && gemImg.naturalWidth) { ctx.drawImage(gemImg, cx - w / 2, cy - w / 2, w, w); return; }
    const h = w * 0.9;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,.35)"; ctx.shadowBlur = s * 0.08; ctx.shadowOffsetY = s * 0.04;
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.5, cy - h * 0.18); ctx.lineTo(cx - w * 0.25, cy - h * 0.5); ctx.lineTo(cx + w * 0.25, cy - h * 0.5);
    ctx.lineTo(cx + w * 0.5, cy - h * 0.18); ctx.lineTo(cx, cy + h * 0.5); ctx.closePath();
    const g = ctx.createLinearGradient(cx, cy - h / 2, cx, cy + h / 2);
    g.addColorStop(0, "#c9fbff"); g.addColorStop(0.5, "#33d9ff"); g.addColorStop(1, "#1a6dff");
    ctx.fillStyle = g; ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.lineWidth = s * 0.035; ctx.strokeStyle = "#fff"; ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,.6)";
    ctx.beginPath(); ctx.moveTo(cx - w * 0.5, cy - h * 0.18); ctx.lineTo(cx + w * 0.5, cy - h * 0.18); ctx.lineTo(cx + w * 0.22, cy - h * 0.05); ctx.lineTo(cx - w * 0.22, cy - h * 0.05); ctx.closePath(); ctx.fill();
    // twinkle
    const tw = (Math.sin(t / 400 + y) + 1) / 2;
    if (tw > 0.7) {
      ctx.fillStyle = "#fff"; ctx.globalAlpha = (tw - 0.7) / 0.3;
      ctx.translate(cx + w * 0.22, cy - h * 0.3);
      ctx.beginPath(); for (let k = 0; k < 8; k++) { const r = k % 2 ? s * 0.02 : s * 0.09, a = (k * Math.PI) / 4; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.fill();
    }
    ctx.restore();
  }

  // little 2×2 preview for the shop
  function preview(skin, size) {
    const cv = document.createElement("canvas");
    const d = Math.min(2, window.devicePixelRatio || 1);
    cv.width = cv.height = size * d; cv.style.width = cv.style.height = size + "px";
    const ctx = cv.getContext("2d"), s = (size * d) / 2;
    [0, 4, 3, 6].forEach((ci, k) => ctx.drawImage(sprite(skin, ci % C.colors.length, s * 0.94), (k % 2) * s + s * 0.03, Math.floor(k / 2) * s + s * 0.03));
    return cv;
  }

  return { sprite, drawGem, setGemImage, preview, loadImages, hasCustom, colorOf, mix, rr };
})();

/* Tower color themes. colors(level) returns the three face colors for a slab.
   HSL themes walk the hue wheel as the tower climbs; palette themes cycle a list. */
window.Themes = (() => {
  const C = window.GAME_CONFIG;
  const byId = id => C.themes.find(t => t.id === id) || C.themes[0];

  function hexToHsl(hex) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0; const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h *= 60;
    }
    return [h, s * 100, l * 100];
  }
  const hsl = (h, s, l) => `hsl(${h % 360},${Math.max(0, Math.min(100, s))}%,${Math.max(0, Math.min(100, l))}%)`;

  function colors(themeId, level) {
    const t = byId(themeId);
    let h, s, l;
    if (t.palette) {
      // smooth blend between palette entries every 4 floors
      const k = level / 4, i = Math.floor(k) % t.palette.length, j = (i + 1) % t.palette.length, f = k - Math.floor(k);
      const a = hexToHsl(t.palette[i]), b = hexToHsl(t.palette[j]);
      let dh = b[0] - a[0]; if (dh > 180) dh -= 360; if (dh < -180) dh += 360;
      h = (a[0] + dh * f + 360) % 360; s = a[1] + (b[1] - a[1]) * f; l = a[2] + (b[2] - a[2]) * f;
    } else {
      h = (t.hue + level * t.hueStep + 360) % 360; s = t.sat; l = t.light;
    }
    if (t.neon) {
      return { top: hsl(h, s, 14), left: hsl(h, s, 9), right: hsl(h, s, 6), edge: hsl(h, 100, 62), glow: hsl(h, 100, 60), neon: true };
    }
    return {
      top: hsl(h, s, l + 8), left: hsl(h, s - 5, l - 6), right: hsl(h, s - 10, l - 18),
      edge: t.metal ? "rgba(255,255,255,.7)" : "rgba(255,255,255,.35)", metal: !!t.metal
    };
  }

  // little preview strip for the shop
  function preview(themeId, w = 56, h = 64) {
    const cv = document.createElement("canvas");
    const d = Math.min(2, window.devicePixelRatio || 1);
    cv.width = w * d; cv.height = h * d; cv.style.width = w + "px"; cv.style.height = h + "px";
    const x = cv.getContext("2d"); x.scale(d, d);
    const rows = 6, rh = h / rows;
    for (let i = 0; i < rows; i++) {
      const c = colors(themeId, (rows - 1 - i) * 3);
      const y = i * rh, inset = i * 2;
      x.fillStyle = c.left; x.fillRect(inset, y + rh * 0.45, w / 2 - inset, rh * 0.55);
      x.fillStyle = c.right; x.fillRect(w / 2, y + rh * 0.45, w / 2 - inset, rh * 0.55);
      x.fillStyle = c.top; x.fillRect(inset, y, w - inset * 2, rh * 0.45);
      if (c.neon) { x.strokeStyle = c.edge; x.lineWidth = 1.5; x.strokeRect(inset + 0.75, y + 0.75, w - inset * 2 - 1.5, rh - 1.5); }
    }
    return cv;
  }

  return { colors, preview, byId };
})();

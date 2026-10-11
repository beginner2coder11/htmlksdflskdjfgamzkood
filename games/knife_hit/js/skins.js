/* Skins: knives (local frame: tip at 0,0 and the knife hangs down +y to the
   handle end at L), targets (centered, caller rotates), apples, previews. */
if (typeof CanvasRenderingContext2D !== "undefined" && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    r = Math.max(0, Math.min(typeof r === "number" ? r : 0, Math.abs(w) / 2, Math.abs(h) / 2));
    this.moveTo(x + r, y); this.arcTo(x + w, y, x + w, y + h, r); this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r); this.arcTo(x, y, x + w, y, r); this.closePath();
  };
}

window.Skins = (() => {
  const C = window.GAME_CONFIG, TAU = Math.PI * 2;
  function hex(h) { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
  function mix(a, b, t) { const A = hex(a), B = hex(b); return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join(""); }
  const shade = (h, amt) => amt < 0 ? mix(h, "#000000", -amt) : mix(h, "#ffffff", amt);
  const knifeById = id => C.knives.find(k => k.id === id) || C.knives[0];

  // ---------- knives ----------------------------------------------------------
  function bladeFill(x, k, w, L) {
    const c = k.blade;
    if (c.length > 2) { const g = x.createLinearGradient(0, 0, 0, L * 0.6); c.forEach((col, i) => g.addColorStop(i / (c.length - 1), col)); return g; }
    const g = x.createLinearGradient(-w / 2, 0, w / 2, 0);
    g.addColorStop(0, c[0]); g.addColorStop(0.55, mix(c[0], c[1], 0.5)); g.addColorStop(1, c[1]);
    return g;
  }
  function handle(x, k, y0, L, hw, rivets) {
    const g = x.createLinearGradient(-hw / 2, 0, hw / 2, 0);
    g.addColorStop(0, shade(k.handle, 0.25)); g.addColorStop(0.5, k.handle); g.addColorStop(1, shade(k.handle, -0.35));
    x.fillStyle = g; x.beginPath(); x.roundRect(-hw / 2, y0, hw, L - y0, hw * 0.45); x.fill();
    if (rivets) {
      x.fillStyle = "#e8edf3";
      [0.3, 0.72].forEach(f => { x.beginPath(); x.arc(0, y0 + (L - y0) * f, hw * 0.16, 0, TAU); x.fill(); });
    }
  }
  function guard(x, k, y, w, h) {
    x.fillStyle = k.guard; x.beginPath(); x.roundRect(-w / 2, y, w, h, h / 2); x.fill();
    x.fillStyle = "rgba(255,255,255,.35)"; x.fillRect(-w / 2 + h * 0.4, y + h * 0.15, w - h * 0.8, h * 0.25);
  }

  function knife(x, id, L) {
    const k = typeof id === "string" ? knifeById(id) : id;
    const bl = L * 0.56, bw = L * 0.15, hw = L * 0.115, gh = L * 0.05;
    x.save();
    if (k.glow) { x.shadowColor = k.glow; x.shadowBlur = L * 0.18; }
    switch (k.shape) {
      case "pencil": {
        const w = bw * 0.82, top = bl * 0.36;
        x.fillStyle = "#f2c48a"; x.beginPath(); x.moveTo(0, 0); x.lineTo(w / 2, top); x.lineTo(-w / 2, top); x.closePath(); x.fill();
        x.fillStyle = "#3a3a44"; x.beginPath(); x.moveTo(0, 0); x.lineTo(w * 0.17, top * 0.33); x.lineTo(-w * 0.17, top * 0.33); x.closePath(); x.fill();
        x.fillStyle = bladeFill(x, k, w, L); x.fillRect(-w / 2, top, w, L * 0.86 - top);
        x.fillStyle = "rgba(0,0,0,.12)"; x.fillRect(w * 0.16, top, w * 0.18, L * 0.86 - top);
        x.fillStyle = "rgba(255,255,255,.35)"; x.fillRect(-w * 0.34, top, w * 0.14, L * 0.86 - top);
        x.fillStyle = k.guard; x.fillRect(-w / 2, L * 0.86, w, L * 0.05);
        x.fillStyle = k.handle; x.beginPath(); x.roundRect(-w / 2, L * 0.91, w, L * 0.09, w * 0.3); x.fill();
        break;
      }
      case "fork": {
        x.fillStyle = bladeFill(x, k, bw, L);
        const tl = bl * 0.42;
        for (let i = 0; i < 4; i++) { const tx = -bw / 2 + (i + 0.5) * (bw / 4); x.beginPath(); x.roundRect(tx - bw * 0.06, 0, bw * 0.12, tl + bw * 0.1, bw * 0.06); x.fill(); }
        x.beginPath(); x.moveTo(-bw / 2, tl); x.lineTo(bw / 2, tl); x.quadraticCurveTo(bw / 2, bl * 0.75, hw * 0.28, bl); x.lineTo(-hw * 0.28, bl); x.quadraticCurveTo(-bw / 2, bl * 0.75, -bw / 2, tl); x.fill();
        x.beginPath(); x.moveTo(-hw * 0.28, bl); x.lineTo(hw * 0.28, bl); x.lineTo(hw * 0.55, L - hw * 0.4); x.quadraticCurveTo(0, L + hw * 0.2, -hw * 0.55, L - hw * 0.4); x.closePath(); x.fill();
        x.fillStyle = "rgba(255,255,255,.4)"; x.fillRect(-hw * 0.1, bl, hw * 0.12, L * 0.38);
        break;
      }
      case "carrot": {
        const end = L * 0.8, w = bw * 0.95;
        const g = x.createLinearGradient(-w, 0, w, 0); g.addColorStop(0, k.blade[0]); g.addColorStop(1, k.blade[1]);
        x.fillStyle = g; x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(w * 0.85, end * 0.45, w * 0.6, end); x.lineTo(-w * 0.6, end); x.quadraticCurveTo(-w * 0.85, end * 0.45, 0, 0); x.fill();
        x.strokeStyle = "rgba(150,60,10,.45)"; x.lineWidth = L * 0.012;
        [0.3, 0.45, 0.6, 0.72].forEach((f, i) => { x.beginPath(); x.moveTo(i % 2 ? -w * 0.4 : 0, end * f); x.lineTo(i % 2 ? 0 : w * 0.4, end * f + L * 0.01); x.stroke(); });
        x.fillStyle = k.handle;
        [-0.5, 0, 0.5].forEach(d => { x.beginPath(); x.ellipse(d * w * 0.6, end + L * 0.1, w * 0.18, L * 0.11, d * 0.6, 0, TAU); x.fill(); });
        break;
      }
      case "candy": {
        const w = hw * 1.15;
        x.save(); x.beginPath(); x.moveTo(0, 0); x.lineTo(w / 2, L * 0.12); x.lineTo(w / 2, L); x.lineTo(-w / 2, L); x.lineTo(-w / 2, L * 0.12); x.closePath(); x.clip();
        x.fillStyle = k.blade[0]; x.fillRect(-w, 0, w * 2, L);
        x.fillStyle = k.blade[1];
        for (let y = -w; y < L + w; y += w * 1.3) { x.beginPath(); x.moveTo(-w, y); x.lineTo(w, y - w); x.lineTo(w, y - w * 0.45); x.lineTo(-w, y + w * 0.55); x.fill(); }
        x.fillStyle = "rgba(255,255,255,.35)"; x.fillRect(-w * 0.3, 0, w * 0.15, L);
        x.restore();
        break;
      }
      default: {
        let w = bw;
        x.fillStyle = bladeFill(x, k, w, L);
        x.beginPath();
        if (k.shape === "chef") {
          w = bw * 1.35;
          x.moveTo(0, 0); x.quadraticCurveTo(w * 0.7, bl * 0.3, w / 2, bl * 0.55); x.lineTo(w / 2, bl); x.lineTo(-w / 2, bl); x.lineTo(-w / 2, bl * 0.3); x.quadraticCurveTo(-w * 0.35, bl * 0.06, 0, 0);
        } else if (k.shape === "butter") {
          w = bw * 0.82; x.moveTo(-w / 2, bl); x.lineTo(-w / 2, w / 2); x.arc(0, w / 2, w / 2, Math.PI, 0); x.lineTo(w / 2, bl);
        } else if (k.shape === "cleaver") {
          w = bw * 1.9; x.moveTo(-bw * 0.5, 0); x.lineTo(w - bw * 0.5, 0); x.lineTo(w - bw * 0.5, bl * 0.88); x.lineTo(-bw * 0.5, bl);
        } else if (k.shape === "dagger") {
          x.moveTo(0, 0); x.lineTo(w * 0.55, bl * 0.3); x.lineTo(w * 0.42, bl); x.lineTo(-w * 0.42, bl); x.lineTo(-w * 0.55, bl * 0.3);
        } else if (k.shape === "kunai") {
          x.moveTo(0, 0); x.lineTo(w * 0.72, bl * 0.6); x.lineTo(w * 0.2, bl); x.lineTo(-w * 0.2, bl); x.lineTo(-w * 0.72, bl * 0.6);
        } else {
          x.moveTo(0, 0); x.quadraticCurveTo(w * 0.65, bl * 0.25, w / 2, bl * 0.45); x.lineTo(w / 2, bl); x.lineTo(-w / 2, bl); x.lineTo(-w / 2, bl * 0.28); x.quadraticCurveTo(-w * 0.3, bl * 0.08, 0, 0);
        }
        x.closePath(); x.fill();
        x.shadowBlur = 0;
        if (k.shape === "cleaver") { x.fillStyle = "rgba(0,0,0,.35)"; x.beginPath(); x.arc(w - bw * 1.05, bl * 0.18, bw * 0.22, 0, TAU); x.fill(); }
        if (k.shape === "dagger" || k.shape === "kunai") { x.strokeStyle = "rgba(0,0,0,.25)"; x.lineWidth = L * 0.012; x.beginPath(); x.moveTo(0, bl * 0.08); x.lineTo(0, bl); x.stroke(); }
        else { x.fillStyle = "rgba(255,255,255,.45)"; x.fillRect(-w / 2 + L * 0.012, bl * 0.32, L * 0.018, bl * 0.66); }
        if (k.shape === "kunai") {
          handle(x, k, bl, L * 0.9, hw * 0.75, false);
          x.strokeStyle = "rgba(0,0,0,.4)"; x.lineWidth = L * 0.012;
          for (let y = bl + L * 0.03; y < L * 0.88; y += L * 0.045) { x.beginPath(); x.moveTo(-hw * 0.38, y); x.lineTo(hw * 0.38, y + L * 0.02); x.stroke(); }
          x.strokeStyle = k.guard; x.lineWidth = L * 0.022; x.beginPath(); x.arc(0, L * 0.95, L * 0.045, 0, TAU); x.stroke();
        } else {
          guard(x, k, bl, k.shape === "dagger" ? bw * 1.9 : k.shape === "cleaver" ? bw * 0.9 : w * 1.15, gh);
          handle(x, k, bl + gh, L, k.shape === "butter" ? hw * 0.85 : hw, k.shape !== "butter" && k.shape !== "dagger");
          if (k.shape === "dagger") { x.fillStyle = k.guard; x.beginPath(); x.arc(0, L - hw * 0.2, hw * 0.42, 0, TAU); x.fill(); }
        }
      }
    }
    x.restore();
  }

  // ---------- targets ---------------------------------------------------------
  function seeded(n) { let a = n; return () => { a = (a * 9301 + 49297) % 233280; return a / 233280; }; }
  function target(x, kind, R, o = {}) {
    const rnd = seeded(o.seed || 7);
    x.save();
    // drop shadow
    x.fillStyle = "rgba(0,0,0,.25)"; x.beginPath(); x.arc(R * 0.04, R * 0.08, R * 1.02, 0, TAU); x.fill();
    switch (kind) {
      case "cheese": {
        x.fillStyle = "#e3a817"; x.beginPath(); x.arc(0, 0, R, 0, TAU); x.fill();
        x.fillStyle = "#ffd34d"; x.beginPath(); x.arc(0, 0, R * 0.9, 0, TAU); x.fill();
        for (let i = 0; i < 11; i++) {
          const a = rnd() * TAU, d = Math.sqrt(rnd()) * R * 0.72, r = R * (0.06 + rnd() * 0.08);
          x.fillStyle = "#e3a817"; x.beginPath(); x.arc(Math.cos(a) * d, Math.sin(a) * d, r, 0, TAU); x.fill();
          x.fillStyle = "#c98c0c"; x.beginPath(); x.arc(Math.cos(a) * d + r * 0.15, Math.sin(a) * d + r * 0.15, r * 0.7, 0, TAU); x.fill();
        }
        break;
      }
      case "tire": {
        x.fillStyle = "#26262e"; x.beginPath(); x.arc(0, 0, R, 0, TAU); x.fill();
        x.fillStyle = "#3a3a44";
        for (let i = 0; i < 24; i++) { x.save(); x.rotate(i * TAU / 24); x.fillRect(-R * 0.06, -R, R * 0.12, R * 0.16); x.restore(); }
        x.fillStyle = "#1b1b22"; x.beginPath(); x.arc(0, 0, R * 0.74, 0, TAU); x.fill();
        const g = x.createRadialGradient(-R * 0.15, -R * 0.15, R * 0.05, 0, 0, R * 0.58);
        g.addColorStop(0, "#e8edf3"); g.addColorStop(1, "#8c97a8");
        x.fillStyle = g; x.beginPath(); x.arc(0, 0, R * 0.58, 0, TAU); x.fill();
        x.fillStyle = "#5a6070"; x.beginPath(); x.arc(0, 0, R * 0.18, 0, TAU); x.fill();
        for (let i = 0; i < 5; i++) { const a = i * TAU / 5; x.fillStyle = "#3a3a44"; x.beginPath(); x.arc(Math.cos(a) * R * 0.36, Math.sin(a) * R * 0.36, R * 0.06, 0, TAU); x.fill(); }
        break;
      }
      case "orange": {
        x.fillStyle = "#f07a10"; x.beginPath(); x.arc(0, 0, R, 0, TAU); x.fill();
        x.fillStyle = "#fff4dc"; x.beginPath(); x.arc(0, 0, R * 0.88, 0, TAU); x.fill();
        for (let i = 0; i < 10; i++) {
          x.save(); x.rotate(i * TAU / 10);
          x.fillStyle = i % 2 ? "#ffa733" : "#ff9a1f";
          x.beginPath(); x.moveTo(R * 0.08, 0); x.arc(0, 0, R * 0.82, -TAU / 20 + 0.05, TAU / 20 - 0.05); x.closePath(); x.fill();
          x.restore();
        }
        x.fillStyle = "#fff4dc"; x.beginPath(); x.arc(0, 0, R * 0.1, 0, TAU); x.fill();
        break;
      }
      case "donut": {
        x.fillStyle = "#d9944a"; x.beginPath(); x.arc(0, 0, R, 0, TAU); x.fill();
        x.fillStyle = "#ff7ab8"; x.beginPath();
        for (let i = 0; i <= 40; i++) { const a = i * TAU / 40, rr = R * (0.86 + 0.06 * Math.sin(i * 1.7)); x.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
        x.fill();
        const cols = ["#ffffff", "#ffe03a", "#4fd8ff", "#7dff5a", "#9b4dff"];
        for (let i = 0; i < 34; i++) {
          const a = rnd() * TAU, d = R * (0.4 + rnd() * 0.42);
          x.save(); x.translate(Math.cos(a) * d, Math.sin(a) * d); x.rotate(rnd() * 6);
          x.fillStyle = cols[i % cols.length]; x.beginPath(); x.roundRect(-R * 0.05, -R * 0.015, R * 0.1, R * 0.03, R * 0.015); x.fill(); x.restore();
        }
        x.fillStyle = "#b8763a"; x.beginPath(); x.arc(0, 0, R * 0.3, 0, TAU); x.fill();
        x.fillStyle = "#1c1430"; x.beginPath(); x.arc(0, 0, R * 0.24, 0, TAU); x.fill();
        break;
      }
      case "pizza": {
        x.fillStyle = "#d99a4a"; x.beginPath(); x.arc(0, 0, R, 0, TAU); x.fill();
        x.fillStyle = "#ffcf5a"; x.beginPath(); x.arc(0, 0, R * 0.86, 0, TAU); x.fill();
        x.fillStyle = "#ffe08a";
        for (let i = 0; i < 10; i++) { const a = rnd() * TAU, d = rnd() * R * 0.7; x.beginPath(); x.arc(Math.cos(a) * d, Math.sin(a) * d, R * 0.12, 0, TAU); x.fill(); }
        for (let i = 0; i < 9; i++) {
          const a = i * TAU / 9 + rnd() * 0.3, d = R * (i % 3 === 0 ? 0.25 : 0.6);
          x.fillStyle = "#c42a3a"; x.beginPath(); x.arc(Math.cos(a) * d, Math.sin(a) * d, R * 0.11, 0, TAU); x.fill();
          x.fillStyle = "rgba(0,0,0,.15)"; x.beginPath(); x.arc(Math.cos(a) * d + R * 0.03, Math.sin(a) * d + R * 0.03, R * 0.04, 0, TAU); x.fill();
        }
        x.strokeStyle = "rgba(160,90,30,.5)"; x.lineWidth = R * 0.02;
        for (let i = 0; i < 6; i++) { const a = i * TAU / 6; x.beginPath(); x.moveTo(0, 0); x.lineTo(Math.cos(a) * R * 0.86, Math.sin(a) * R * 0.86); x.stroke(); }
        break;
      }
      case "cookie": {
        x.fillStyle = "#b8763a"; x.beginPath(); x.arc(0, 0, R, 0, TAU); x.fill();
        x.fillStyle = "#d99a5a"; x.beginPath(); x.arc(-R * 0.03, -R * 0.03, R * 0.92, 0, TAU); x.fill();
        for (let i = 0; i < 16; i++) {
          const a = rnd() * TAU, d = Math.sqrt(rnd()) * R * 0.8;
          x.fillStyle = "#4a2410"; x.beginPath(); x.ellipse(Math.cos(a) * d, Math.sin(a) * d, R * 0.07, R * 0.055, rnd() * 3, 0, TAU); x.fill();
        }
        break;
      }
      case "watermelon": {
        x.fillStyle = "#1f7a3a"; x.beginPath(); x.arc(0, 0, R, 0, TAU); x.fill();
        x.fillStyle = "#c9f2b0"; x.beginPath(); x.arc(0, 0, R * 0.9, 0, TAU); x.fill();
        x.fillStyle = "#ff4d6d"; x.beginPath(); x.arc(0, 0, R * 0.82, 0, TAU); x.fill();
        for (let i = 0; i < 18; i++) {
          const a = i * TAU / 18 + (i % 2) * 0.17, d = R * (i % 2 ? 0.55 : 0.35);
          x.save(); x.translate(Math.cos(a) * d, Math.sin(a) * d); x.rotate(a);
          x.fillStyle = "#1c1430"; x.beginPath(); x.ellipse(0, 0, R * 0.045, R * 0.025, 0, 0, TAU); x.fill(); x.restore();
        }
        break;
      }
      case "shield": {
        const g = x.createRadialGradient(-R * 0.3, -R * 0.3, R * 0.1, 0, 0, R);
        g.addColorStop(0, "#f2f5fa"); g.addColorStop(0.6, "#9aa6b8"); g.addColorStop(1, "#5a6070");
        x.fillStyle = g; x.beginPath(); x.arc(0, 0, R, 0, TAU); x.fill();
        x.strokeStyle = "#5a6070"; x.lineWidth = R * 0.05;
        [0.82, 0.5].forEach(f => { x.beginPath(); x.arc(0, 0, R * f, 0, TAU); x.stroke(); });
        x.fillStyle = "#c7cfdb";
        for (let i = 0; i < 14; i++) { const a = i * TAU / 14; x.beginPath(); x.arc(Math.cos(a) * R * 0.91, Math.sin(a) * R * 0.91, R * 0.045, 0, TAU); x.fill(); }
        x.fillStyle = "#ffcf33"; x.beginPath();
        for (let i = 0; i < 10; i++) { const rr = i % 2 ? R * 0.14 : R * 0.34, a = -Math.PI / 2 + i * Math.PI / 5; x.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
        x.closePath(); x.fill();
        break;
      }
      default: { // wood log
        const w = o.wood || C.woods[0];
        x.fillStyle = w.bark; x.beginPath(); x.arc(0, 0, R, 0, TAU); x.fill();
        const g = x.createRadialGradient(0, 0, R * 0.1, 0, 0, R * 0.92);
        g.addColorStop(0, w.ring); g.addColorStop(1, w.mid);
        x.fillStyle = g; x.beginPath(); x.arc(0, 0, R * 0.9, 0, TAU); x.fill();
        x.strokeStyle = shade(w.mid, -0.18); x.lineWidth = Math.max(1, R * 0.018);
        for (let i = 1; i <= 6; i++) { x.beginPath(); x.arc(R * 0.02 * Math.sin(i), R * 0.02 * Math.cos(i), R * (0.13 * i + rnd() * 0.04), 0, TAU); x.stroke(); }
        x.strokeStyle = shade(w.mid, -0.3); x.lineWidth = Math.max(1, R * 0.022);
        for (let i = 0; i < 3; i++) { const a = rnd() * TAU; x.beginPath(); x.moveTo(Math.cos(a) * R * 0.5, Math.sin(a) * R * 0.5); x.lineTo(Math.cos(a + 0.05) * R * 0.88, Math.sin(a + 0.05) * R * 0.88); x.stroke(); }
        x.fillStyle = shade(w.mid, -0.25); x.beginPath(); x.arc(0, 0, R * 0.05, 0, TAU); x.fill();
      }
    }
    if (o.flash > 0) { x.fillStyle = `rgba(255,255,255,${o.flash * 0.45})`; x.beginPath(); x.arc(0, 0, R, 0, TAU); x.fill(); }
    x.restore();
  }

  // ---------- apples ------------------------------------------------------------
  // local frame: apple center at 0,0 (caller rotates so +y points away from the target)
  function apple(x, r, half = 0) {
    x.save();
    if (half) {
      x.fillStyle = "#e8283c"; x.beginPath(); x.arc(0, 0, r, half > 0 ? -Math.PI / 2 : Math.PI / 2, half > 0 ? Math.PI / 2 : Math.PI * 1.5); x.closePath(); x.fill();
      x.fillStyle = "#fff6d8"; x.beginPath(); x.ellipse(0, 0, r * 0.25, r * 0.9, 0, 0, TAU); x.fill();
      x.restore(); return;
    }
    const g = x.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r);
    g.addColorStop(0, "#ff8a8a"); g.addColorStop(0.5, "#e8283c"); g.addColorStop(1, "#a3101f");
    x.fillStyle = g;
    x.beginPath(); x.moveTo(0, -r * 0.7);
    x.bezierCurveTo(r * 0.6, -r * 1.15, r * 1.25, -r * 0.3, r * 0.85, r * 0.45);
    x.bezierCurveTo(r * 0.6, r * 1.05, r * 0.15, r * 0.95, 0, r * 0.85);
    x.bezierCurveTo(-r * 0.15, r * 0.95, -r * 0.6, r * 1.05, -r * 0.85, r * 0.45);
    x.bezierCurveTo(-r * 1.25, -r * 0.3, -r * 0.6, -r * 1.15, 0, -r * 0.7);
    x.fill();
    x.strokeStyle = "#5a3418"; x.lineWidth = r * 0.14; x.lineCap = "round";
    x.beginPath(); x.moveTo(0, -r * 0.65); x.quadraticCurveTo(r * 0.05, -r * 1.0, r * 0.18, -r * 1.15); x.stroke();
    x.fillStyle = "#3fbf4a"; x.beginPath(); x.ellipse(r * 0.42, -r * 1.0, r * 0.32, r * 0.15, -0.5, 0, TAU); x.fill();
    x.fillStyle = "rgba(255,255,255,.55)"; x.beginPath(); x.ellipse(-r * 0.4, -r * 0.25, r * 0.14, r * 0.24, 0.4, 0, TAU); x.fill();
    x.restore();
  }

  // ---------- previews ----------------------------------------------------------
  function canvas(w, h) {
    const cv = document.createElement("canvas"), dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = w * dpr; cv.height = h * dpr; cv.style.width = w + "px"; cv.style.height = h + "px";
    const x = cv.getContext("2d"); x.scale(dpr, dpr);
    return [cv, x];
  }
  function knifePreview(id, w = 84, h = 84, ang = 0.7) {
    const [cv, x] = canvas(w, h), L = Math.min(w, h) * 1.05;
    x.translate(w / 2, h / 2); x.rotate(ang); x.translate(0, -L / 2);
    knife(x, id, L);
    return cv;
  }

  return { knife, target, apple, knifePreview, knifeById, shade, mix };
})();

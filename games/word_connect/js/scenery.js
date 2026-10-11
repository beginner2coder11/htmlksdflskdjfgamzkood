/* Chapter landscapes drawn as SVG from config colors + a seed, so every
   chapter gets its own backdrop with zero image files. */
window.Scenery = (() => {
  const C = window.GAME_CONFIG;
  const W = 400, H = 800;

  function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const chapter = i => C.chapters[i % C.chapters.length];

  // smooth ridge through random control heights
  function ridge(r, base, amp, bumps) {
    const pts = [];
    for (let i = 0; i <= bumps; i++) pts.push([(i / bumps) * W, base - r() * amp]);
    let d = `M0 ${H} L0 ${pts[0][1].toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], mx = (x0 + x1) / 2;
      d += ` C${mx.toFixed(1)} ${y0.toFixed(1)} ${mx.toFixed(1)} ${y1.toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`;
    }
    return d + ` L${W} ${H} Z`;
  }
  function peaks(r, base, amp, n) {
    let d = `M0 ${H} L0 ${base}`;
    const step = W / n;
    const tops = [];
    for (let i = 0; i < n; i++) {
      const x = i * step + step / 2 + (r() - 0.5) * step * 0.4, y = base - amp * (0.5 + r() * 0.5);
      d += ` L${x.toFixed(1)} ${y.toFixed(1)} L${((i + 1) * step).toFixed(1)} ${(base - r() * amp * 0.25).toFixed(1)}`;
      tops.push([x, y]);
    }
    return { d: d + ` L${W} ${H} Z`, tops };
  }

  function svg(index) {
    const ch = chapter(index), r = rng(index * 977 + 13);
    const [l1, l2, l3] = ch.land;
    let s = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sky${index}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${ch.sky[0]}"/><stop offset="1" stop-color="${ch.sky[1]}"/></linearGradient>
        <radialGradient id="glow${index}"><stop offset="0" stop-color="${ch.sun}" stop-opacity=".9"/><stop offset="1" stop-color="${ch.sun}" stop-opacity="0"/></radialGradient>
      </defs>
      <rect width="${W}" height="${H}" fill="url(#sky${index})"/>`;
    if (ch.night) {
      for (let i = 0; i < 70; i++) s += `<circle cx="${(r() * W).toFixed(1)}" cy="${(r() * H * 0.55).toFixed(1)}" r="${(r() * 1.4 + 0.4).toFixed(2)}" fill="#fff" opacity="${(0.4 + r() * 0.6).toFixed(2)}"/>`;
      if (ch.scene === "hills") // aurora ribbons
        for (let k = 0; k < 3; k++) s += `<path d="M-20 ${190 + k * 40} C 120 ${120 + k * 30}, 260 ${260 + k * 20}, 420 ${160 + k * 35}" stroke="${["#4fffc3", "#7fd4ff", "#b88cff"][k]}" stroke-width="${26 - k * 6}" fill="none" opacity=".28" stroke-linecap="round"/>`;
    }
    const sx = 80 + r() * 240, sy = 150 + r() * 120;
    s += `<circle cx="${sx}" cy="${sy}" r="120" fill="url(#glow${index})"/><circle cx="${sx}" cy="${sy}" r="${ch.night ? 26 : 38}" fill="${ch.sun}"/>`;
    // a few clouds by day
    if (!ch.night) for (let i = 0; i < 4; i++) {
      const cx = r() * W, cy = 80 + r() * 260, w = 50 + r() * 60;
      s += `<g fill="#fff" opacity=".7"><ellipse cx="${cx}" cy="${cy}" rx="${w}" ry="${w * 0.28}"/><ellipse cx="${cx - w * 0.3}" cy="${cy - w * 0.15}" rx="${w * 0.42}" ry="${w * 0.3}"/><ellipse cx="${cx + w * 0.25}" cy="${cy - w * 0.2}" rx="${w * 0.48}" ry="${w * 0.34}"/></g>`;
    }

    const layer = (d, fill, op = 1) => `<path d="${d}" fill="${fill}" opacity="${op}"/>`;
    switch (ch.scene) {
      case "mountains": {
        const back = peaks(r, 470, 230, 4), mid = peaks(r, 560, 170, 5);
        s += layer(back.d, l1);
        back.tops.forEach(([x, y]) => { s += `<path d="M${x - 28} ${y + 42} L${x} ${y} L${x + 28} ${y + 42} L${x + 12} ${y + 34} L${x} ${y + 46} L${x - 12} ${y + 34} Z" fill="#fff" opacity=".9"/>`; });
        s += layer(mid.d, l2) + layer(ridge(r, 680, 60, 3), l3);
        break;
      }
      case "dunes":
        s += layer(ridge(r, 520, 90, 2), l1) + layer(ridge(r, 610, 80, 2), l2) + layer(ridge(r, 700, 70, 2), l3);
        for (let i = 0; i < 3; i++) { const x = 40 + r() * 320, y = 600 + r() * 60; s += `<path d="M${x} ${y} v-34 m0 12 h-10 v-12 m10 18 h10 v-14" stroke="#3f7a3a" stroke-width="6" fill="none" stroke-linecap="round"/>`; }
        break;
      case "sea": {
        s += layer(ridge(r, 470, 60, 3), l1, 0.55);
        s += `<rect y="520" width="${W}" height="${H - 520}" fill="${l2}"/>`;
        for (let i = 0; i < 9; i++) { const y = 545 + i * 26, x = r() * 300; s += `<path d="M${x} ${y} q 20 -8 40 0 t 40 0" stroke="#fff" stroke-width="3" fill="none" opacity=".45" stroke-linecap="round"/>`; }
        s += layer(ridge(r, 720, 40, 3), l3);
        break;
      }
      case "city": {
        s += layer(ridge(r, 560, 50, 3), l1, 0.6);
        let x = -10;
        while (x < W) {
          const w = 34 + r() * 40, h = 120 + r() * 220, y = 640 - h;
          s += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h + 200}" fill="${r() < 0.5 ? l2 : l3}"/>`;
          for (let wy = y + 12; wy < 630; wy += 22) for (let wx = x + 7; wx < x + w - 10; wx += 14) if (r() < 0.45) s += `<rect x="${wx.toFixed(1)}" y="${wy.toFixed(1)}" width="7" height="10" fill="#ffe9a8" opacity=".85"/>`;
          x += w + 4;
        }
        s += `<rect y="640" width="${W}" height="${H - 640}" fill="${l3}"/>`;
        break;
      }
      case "forest":
        s += layer(ridge(r, 520, 80, 3), l1);
        for (let i = 0; i < 14; i++) { const x = r() * W, y = 560 + r() * 60, h = 70 + r() * 60; s += `<path d="M${x} ${y - h} L${x + h * 0.32} ${y} L${x - h * 0.32} ${y} Z" fill="${l2}"/>`; }
        s += layer(ridge(r, 640, 50, 3), l2);
        for (let i = 0; i < 10; i++) { const x = r() * W, y = 690 + r() * 40, h = 90 + r() * 50; s += `<path d="M${x} ${y - h} L${x + h * 0.3} ${y} L${x - h * 0.3} ${y} Z" fill="${l3}"/>`; }
        s += `<rect y="700" width="${W}" height="${H - 700}" fill="${l3}"/>`;
        break;
      default: // hills
        s += layer(ridge(r, 540, 90, 3), l1) + layer(ridge(r, 620, 80, 3), l2) + layer(ridge(r, 710, 60, 4), l3);
    }
    return s + "</svg>";
  }

  const cache = {};
  const dataUrl = i => (cache[i % C.chapters.length + "|" + i] ||= "url(\"data:image/svg+xml," + encodeURIComponent(svg(i)) + "\")");

  return { svg, dataUrl, chapter };
})();

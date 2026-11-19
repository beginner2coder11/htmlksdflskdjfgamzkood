/* SINKHOLE — city generator (no drawing). The map is a 64 × 64 grid of 4 × 4 blocks split by roads.
   Blocks become parks, houses, shops, towers, plazas or parking lots; sidewalks get lamps, bins,
   hydrants and people; roads get cars and buses (which drive along their lanes) and a few cones.
   Every object: { t, x, y, rot, size, value, color, ... }. Same seed → same city. */
window.City = (() => {
  const C = window.GAME_CONFIG, O = C.objects;
  const W = 64, ROAD = 4, BLOCK = 16;          // map size, road width, block pitch (road + 12 of block)
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const CAR_COLORS = ["#ff4d5e", "#3d8bff", "#ffc93d", "#2fc46e", "#f4f6fb", "#3b3f52", "#ff8a3d", "#a77bff"];
  const ROOF = ["#e8604a", "#5f8fd8", "#7ab85a", "#d8a84a", "#b06ad8", "#5ab8b0"];
  const WALL = ["#fff2dc", "#f4e6ff", "#e2f4ff", "#ffe8e0", "#eef8e0"];

  function make(seed) {
    const R = rng(seed), objs = [], blocks = [];
    const add = (t, x, y, extra = {}) => objs.push({ t, x, y, rot: extra.rot || 0, size: O[t].size, value: O[t].value, ...extra });
    const pick = a => a[Math.floor(R() * a.length)];
    // blocks
    for (let by = 0; by < W / BLOCK; by++) for (let bx = 0; bx < W / BLOCK; bx++) {
      const x0 = bx * BLOCK + ROAD, y0 = by * BLOCK + ROAD, x1 = x0 + 12, y1 = y0 + 12;
      const kind = pick(["park", "park", "houses", "houses", "shops", "tower", "plaza", "parking"]);
      blocks.push({ kind, x0, y0, x1, y1 });
      const ix0 = x0 + 1.4, iy0 = y0 + 1.4, ix1 = x1 - 1.4, iy1 = y1 - 1.4;     // inside the sidewalk ring
      if (kind === "park") {
        for (let i = 0; i < 9; i++) add("tree", ix0 + 0.9 + R() * (ix1 - ix0 - 1.8), iy0 + 0.9 + R() * (iy1 - iy0 - 1.8), { color: pick(["#4fb64a", "#3fa64a", "#6cc35a"]) });
        for (let i = 0; i < 4; i++) add("bench", ix0 + 1 + R() * (ix1 - ix0 - 2), iy0 + 1 + R() * (iy1 - iy0 - 2), { rot: R() < 0.5 ? 0 : Math.PI / 2 });
        for (let i = 0; i < 6; i++) add("person", ix0 + R() * (ix1 - ix0), iy0 + R() * (iy1 - iy0), { color: pick(CAR_COLORS), walk: true });
        if (R() < 0.6) add("kiosk", (ix0 + ix1) / 2, (iy0 + iy1) / 2, { color: pick(ROOF) });
      } else if (kind === "houses") {
        for (const [hx, hy] of [[ix0 + 2.6, iy0 + 2.6], [ix1 - 2.6, iy0 + 2.6], [ix0 + 2.6, iy1 - 2.6], [ix1 - 2.6, iy1 - 2.6]]) add("house", hx, hy, { roof: pick(ROOF), wall: pick(WALL), h: 2.4 + R() * 0.8 });
        for (let i = 0; i < 4; i++) add("tree", (ix0 + ix1) / 2 + (R() - 0.5) * 2, (iy0 + iy1) / 2 + (R() - 0.5) * 2, { color: "#4fb64a" });
        add("car", (ix0 + ix1) / 2, iy1 - 0.4, { color: pick(CAR_COLORS), rot: 0 });
      } else if (kind === "shops") {
        add("shop", (ix0 + ix1) / 2, iy0 + 3.2, { roof: pick(ROOF), wall: pick(WALL), h: 3.4 });
        for (let i = 0; i < 2; i++) add("kiosk", ix0 + 2 + i * 5, iy1 - 1.6, { color: pick(ROOF) });
        for (let i = 0; i < 5; i++) add("person", ix0 + R() * (ix1 - ix0), iy1 - 3 + R() * 2, { color: pick(CAR_COLORS), walk: true });
        for (let i = 0; i < 3; i++) add("bin", ix0 + 1 + i * 3.5, iy1 - 0.4);
      } else if (kind === "tower") {
        add("tower", (ix0 + ix1) / 2, (iy0 + iy1) / 2 - 0.5, { roof: "#5c6384", wall: pick(["#bcd4f0", "#d6dcf0", "#c8e0e8"]), h: 9 + R() * 4 });
        for (let i = 0; i < 4; i++) add("tree", i < 2 ? ix0 + 0.6 : ix1 - 0.6, i % 2 ? iy0 + 0.8 : iy1 - 0.8, { color: "#3fa64a" });
        for (let i = 0; i < 4; i++) add("person", ix0 + R() * (ix1 - ix0), iy1 - 0.6, { color: pick(CAR_COLORS), walk: true });
      } else if (kind === "plaza") {
        add("kiosk", (ix0 + ix1) / 2, (iy0 + iy1) / 2, { color: pick(ROOF) });
        for (let i = 0; i < 6; i++) add("bench", ix0 + 1 + (i % 3) * 3.5, i < 3 ? iy0 + 1 : iy1 - 1);
        for (let i = 0; i < 10; i++) add("person", ix0 + R() * (ix1 - ix0), iy0 + R() * (iy1 - iy0), { color: pick(CAR_COLORS), walk: true });
        for (let i = 0; i < 4; i++) add("lamp", i % 2 ? ix0 + 0.5 : ix1 - 0.5, i < 2 ? iy0 + 0.5 : iy1 - 0.5);
      } else {
        for (let r = 0; r < 2; r++) for (let i = 0; i < 4; i++) if (R() < 0.8) add("car", ix0 + 1.2 + i * 2.4, iy0 + 2 + r * 5, { color: pick(CAR_COLORS), rot: Math.PI / 2 });
        if (R() < 0.6) add("bus", (ix0 + ix1) / 2, iy1 - 1.2, { color: pick(["#ffc93d", "#3d8bff", "#ff4d5e"]), rot: 0 });
      }
      // sidewalk furniture
      for (let i = 0; i < 3; i++) add("lamp", x0 + 0.6 + i * 5.4, y1 - 0.6);
      add("hydrant", x0 + 0.6, y0 + 0.6); if (R() < 0.6) add("bin", x1 - 0.6, y0 + 0.6);
      for (let i = 0; i < 4; i++) add("person", x0 + 0.6 + R() * 10.8, R() < 0.5 ? y0 + 0.6 : y1 - 0.6, { color: pick(CAR_COLORS), walk: true });
    }
    // traffic: cars + buses driving along every road, in both directions
    for (let k = 0; k < W / BLOCK; k++) {
      const c = k * BLOCK + ROAD / 2;
      for (const [dirX, lane] of [[1, 0.9], [-1, -0.9]]) {
        for (let i = 0; i < 3; i++) { const t = R() < 0.15 ? "bus" : "car"; add(t, R() * W, c + lane, { color: pick(CAR_COLORS), rot: dirX > 0 ? 0 : Math.PI, drive: [dirX * (2.2 + R() * 1.4), 0] }); }
        for (let i = 0; i < 3; i++) { const t = R() < 0.15 ? "bus" : "car"; add(t, c - lane, R() * W, { color: pick(CAR_COLORS), rot: dirX > 0 ? Math.PI / 2 : -Math.PI / 2, drive: [0, dirX * (2.2 + R() * 1.4)] }); }
      }
      for (let i = 0; i < 3; i++) add("cone", c + (R() - 0.5) * 3, (Math.floor(R() * 4)) * BLOCK + ROAD + R() * 12);
    }
    objs.forEach((o, i) => o.id = i);
    return { W, ROAD, BLOCK, blocks, objs, total: objs.reduce((s, o) => s + o.value, 0) };
  }
  return { make, W, ROAD, BLOCK };
})();

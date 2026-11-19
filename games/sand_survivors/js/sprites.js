/* SANDSTORM SURVIVORS — pixel art made in code. Each sprite is rows of characters,
   one character per pixel, mapped through a small palette. Sprites are baked once into
   tiny canvases (plus a white "hit flash" copy) and drawn scaled up with no smoothing. */
window.Pix = (() => {
  const K = "#2a2340";
  function bake(rows, pal, flash) {
    const w = Math.max(...rows.map(r => r.length)), h = rows.length;
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const g = c.getContext("2d");
    rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) { const ch = r[x]; if (ch === "." || ch === " ") continue; const col = flash ? (ch === "k" ? "#ffffff" : "#ffffff") : (ch === "k" ? K : pal[ch]); if (!col) continue; g.fillStyle = col; g.fillRect(x, y, 1, 1); } });
    return c;
  }
  const LEGS_FB = [
    ["...kddk..kddk...", "...kbbk..kbbk...", "...kkkk..kkkk..."],
    ["...kbbk..kddk...", "...kkkk..kbbk...", ".........kkkk..."],
    ["...kddk..kddk...", "...kbbk..kbbk...", "...kkkk..kkkk..."],
    ["...kddk..kbbk...", "...kbbk..kkkk...", "...kkkk........."]
  ];
  const LEGS_S = [
    [".....kddddk.....", ".....kbbbbbk....", ".....kkkkkkk...."],
    ["....kddkkddk....", "...kbbk..kbbbk..", "...kkkk..kkkkk.."],
    [".....kddddk.....", ".....kbbbbbk....", ".....kkkkkkk...."],
    ["....kdddddk.....", "....kbbkbbbk....", "....kkkkkkkk...."]
  ];
  const ART = {
    // hero: front (walking down), back (walking up) and side (walking right; left is mirrored),
    // 4 walk frames each: stand, step, stand, other step
    hero: (() => {
      const top = ["....kkkkkkkk....", "...khhhhhhhhk...", "...khhhhhhhhk...", "...khsssssshk...", "...kssksskssk...", "...kssssssssk...", "....kssssssk....",
        "...kcccccccck...", "..ksccccccccsk..", "..ksdccyyccdsk..", "...kddddddddk..."];
      return LEGS_FB.map(l => top.concat(l));
    })(),
    heroBack: (() => {
      const top = ["....kkkkkkkk....", "...khhhhhhhhk...", "...khhhhhhhhk...", "...khhhhhhhhk...", "...khhhhhhhhk...", "...kshhhhhhsk...", "....kssssssk....",
        "...kckkkkkkck...", "..kscppppppcsk..", "..ksdpyyyypdsk..", "...kddddddddk..."];
      return LEGS_FB.map(l => top.concat(l));
    })(),
    heroSide: (() => {
      const top = [".....kkkkkk.....", "....khhhhhhk....", "...khhhhhhhhk...", "...khhhhhhhhk...", "...khhhhssksk...", "...khhhssssssk..", "....khhsssskk...",
        "....kkcccccck...", "....kpkccccck...", "....kpkccccsk...", ".....kddddddk..."];
      return LEGS_S.map(l => top.concat(l));
    })(),
    slime: [["...kkkkkk...", ".kkggggggkk.", "kgwwgggggggk", "kgwggggggggk", "kggkggggkggk", "kggggggggggk", "kdggggggggdk", ".kddddddddk.", "..kkkkkkkk.."]],
    beetle: [["..k......k..", "...k....k...", "..kkkkkkkk..", ".kbbbkkbbbk.", "kbbwbkkbbbbk", "kbbbbkkbbbbk", "kbbbbkkbbbbk", ".kbbbkkbbbk.", "k.kkkkkkkk.k", ".k.k....k.k."]],
    wasp: [[".ww......ww.", "wwww....wwww", ".wwwkkkkwww.", "...kyyyyk...", "..kykkkkyk..", "..kyyyyyyk..", "..kkkkkkkk..", "...kyyyyk...", "....kkkk....", ".....kk....."]],
    crab: [["kk..........kk", "krk........krk", ".kk.kkkkkk.kk.", "..kkrrrrrrkk..", ".krrwrrrrwrrk.", "krrrrrrrrrrrrk", ".krrrrrrrrrrk.", "k.kkkkkkkkkk.k", ".k.k......k.k."]],
    scorpion: [[".........kkk....", "........koook...", "........kk.ok...", "...........ok...", "...........ok...", ".kk...kkkkkok...", "kook.koooooook..", "kook.kowoooooook", ".kkkkooooooooook", "....kooooooooook", "....k.k.k.k.k.k."]],
    cactus: [[".....kkkk.....", "....kggggk....", "....kkggkk....", ".kk.kggggk.kk.", "kggkkgmmgkkggk", "kggggggggggggk", ".kkkkggggkkkk.", "....kggggk....", "....kgggdk....", "...kkddddkk...", "..kppppppppk..", "..kppppppppk..", "...kkkkkkkk..."]],
    worm: [["...kkkkkk...", "..kmmmmmmk..", ".kmwmmmmwmk.", ".kmmkkkkmmk.", ".kmk....kmk.", ".kmmkkkkmmk.", "..kmmmmmmk..", "..kddddddk..", "...kmmmmk...", "...kddddk...", "..kkmmmmkk..", ".k.kkkkkk.k."]]
  };
  const PAL = {
    slime: { g: "#5fd068", w: "#e8ffe0", d: "#3a9a48" }, beetle: { b: "#3fae9a", w: "#c8fff0" }, wasp: { y: "#ffd23f", w: "rgba(200,240,255,0.85)" },
    crab: { r: "#e8503a", w: "#ffffff" }, scorpion: { o: "#c8783a", w: "#ffffff" }, cactus: { g: "#4fae5a", w: "#c8ffd0", m: "#2a2340", d: "#3a8a46", p: "#c86a3a" },
    worm: { m: "#d8889a", w: "#ffffff", d: "#b86a7a" }
  };
  /* guns, drawn pointing right. px/py = where the hand grips it, tx/ty = muzzle */
  const GUNS = {
    pistol:  { px: 1, py: 3, tx: 8, ty: 1, rows: ["kkkkkkk.", "kgggggyk", "kgkkkkk.", "kgk.....", "kkk....."] },
    rifle:   { px: 5, py: 4, tx: 12, ty: 2, rows: ["...kkkkkkk..", "kkkgggggggkk", "kwwgggggggyk", "kkkkkgkkkkk.", "....kgk.....", "....kkk....."] },
    ray:     { px: 2, py: 4, tx: 9, ty: 2, rows: ["..kkkkk..", ".kgggggkk", "kgcgcgcck", ".kgkkkkk.", ".kgk.....", ".kkk....."] },
    shotgun: { px: 6, py: 4, tx: 12, ty: 1, rows: ["kkkkkkkkkkkk", "kggggggggggk", "kddddddddddk", "kwwwkkgkkkkk", "kkkk.kgk....", ".....kkk...."] }
  };
  const GPAL = { g: "#8a90a8", w: "#a8683a", d: "#4a4e60", y: "#ffd23f", c: "#5fe8ff" };
  const cache = {};
  // the gun turned to one of 16 angles, sampled pixel by pixel so it stays crisp (no blurry rotation).
  // The grip sits at (R, R) of the returned canvas; aiming left mirrors it so it is never upside down.
  function gunRot(id, step) {
    const key = "gunr_" + id + step; if (cache[key]) return cache[key];
    const d = gun(id), src = d.img, w = src.width, h = src.height, data = src.getContext("2d").getImageData(0, 0, w, h).data;
    const a = step / 16 * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a), fl = c < -1e-6 ? -1 : 1;
    const R = Math.ceil(Math.hypot(Math.max(d.px, w - d.px), Math.max(d.py, h - d.py))) + 1, S = R * 2 + 1;
    const out = document.createElement("canvas"); out.width = out.height = S; const og = out.getContext("2d"), img = og.createImageData(S, S);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const X = x - R, Y = y - R, u = c * X + sn * Y, v = (-sn * X + c * Y) * fl;
      const sx = Math.floor(u + d.px + 0.5), sy = Math.floor(v + d.py + 0.5);
      if (sx < 0 || sy < 0 || sx >= w || sy >= h) continue;
      const i = (sy * w + sx) * 4, o = (y * S + x) * 4; if (!data[i + 3]) continue;
      img.data[o] = data[i]; img.data[o + 1] = data[i + 1]; img.data[o + 2] = data[i + 2]; img.data[o + 3] = 255;
    }
    og.putImageData(img, 0, 0);
    const lx = d.tx - d.px, ly = (d.ty - d.py) * fl;
    return cache[key] = { img: out, R, tipX: c * lx - sn * ly, tipY: sn * lx + c * ly };
  }
  function gun(id) { const d = GUNS[id] || GUNS.pistol, key = "gun_" + id; if (!cache[key]) cache[key] = bake(d.rows, GPAL); return { img: cache[key], ...d }; }
  function tintPal(p, tint) { if (!tint) return p; const out = {}; for (const k in p) out[k] = mix(p[k], tint, 0.45); return out; }
  function mix(a, b, t) { if (a.startsWith("rgba")) return a; const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16); const r = (pa >> 16) + (((pb >> 16) - (pa >> 16)) * t), g = (pa >> 8 & 255) + (((pb >> 8 & 255) - (pa >> 8 & 255)) * t), bl = (pa & 255) + (((pb & 255) - (pa & 255)) * t); return `rgb(${r | 0},${g | 0},${bl | 0})`; }
  // get(name, frame, {pal, tint, flash}) → canvas
  function get(name, frame = 0, o = {}) {
    const key = name + frame + (o.key || "") + (o.tint || "") + (o.flash ? "F" : "");
    if (cache[key]) return cache[key];
    const frames = ART[name], rows = frames[frame % frames.length];
    const pal = o.pal || tintPal(PAL[name] || {}, o.tint);
    return cache[key] = bake(rows, pal, o.flash);
  }

  /* 8×8 icons for the level-up cards and HUD */
  const ICONS = {
    blaster: ["........", ".kkkkkk.", "kyyyyyyk", "kyykkkk.", "kyk.....", "kkk.....", "........", "........"],
    boomer:  ["..kkk...", ".kbbbk..", ".kbk.k..", ".kbk....", ".kbbk...", "..kbbk..", "...kbbk.", "....kk.."],
    drones:  ["........", "..kkkk..", ".kcwwck.", "kccccccc", ".kkkkkk.", "..k..k..", "........", "........"],
    saw:     ["..k..k..", ".kssssk.", "kssksssk", ".sskkss.", ".ssskss.", "kssssssk", ".kssssk.", "..k..k.."],
    tesla:   ["....kk..", "...kyk..", "..kyk...", ".kyyyyk.", "...kyk..", "..kyk...", "..kk....", "........"],
    flame:   ["...k....", "..kok...", "..koyk..", ".koyyok.", ".koyyok.", "kooyyook", ".kooook.", "..kkkk.."],
    mines:   ["...kk...", "..kyyk..", ".kkkkkk.", "kddrrddk", "kddddddk", "kddddddk", ".kkkkkk.", "........"],
    shock:   ["..kkkk..", ".kc..ck.", "kc.kk.ck", "kc.kk.ck", "kc....ck", ".kc..ck.", "..kkkk..", "........"],
    heart:   ["........", ".kk..kk.", "krrkkrrk", "krrrrrrk", ".krrrrk.", "..krrk..", "...kk...", "........"],
    boot:    ["..kkk...", "..kbbk..", "..kbbk..", "..kbbk..", ".kbbbkk.", "kbbbbbbk", "kkkkkkkk", "........"],
    magnet:  ["........", ".kk..kk.", "krk..krk", "krk..krk", "krrkkrrk", ".krrrrk.", "..kkkk..", "........"],
    shield:  [".kkkkkk.", "kccccccc", "kcwcccck", "kccccccc", ".kcccck.", ".kcccck.", "..kcck..", "...kk..."],
    cross:   ["...kk...", "..krrk..", ".kkrrkk.", "krrrrrrk", "krrrrrrk", ".kkrrkk.", "..krrk..", "...kk..."],
    fist:    ["........", ".kkkkk..", "kssssskk", "ksksksss", "kssssssk", ".ksssssk", "..kkkkk.", "........"],
    clock:   ["..kkkk..", ".kwwwwk.", "kwwkwwwk", "kwwkwwwk", "kwwkkkwk", "kwwwwwwk", ".kwwwwk.", "..kkkk.."],
    ring:    ["..kkkk..", ".kyyyyk.", "kyk..kyk", "ky....yk", "ky....yk", "kyk..kyk", ".kyyyyk.", "..kkkk.."]
  };
  const IPAL = { y: "#ffd23f", b: "#c8783a", c: "#5fc8ff", w: "#ffffff", s: "#c8ccd8", o: "#ff7a2e", r: "#e8403a", d: "#4a4a5a" };
  function icon(name) { const key = "icon_" + name; return cache[key] || (cache[key] = bake(ICONS[name] || ICONS.ring, IPAL)); }
  function iconCanvas(name, px = 48) { const c = document.createElement("canvas"); c.width = c.height = px; c.style.width = c.style.height = px + "px"; c.style.imageRendering = "pixelated"; const g = c.getContext("2d"); g.imageSmoothingEnabled = false; g.drawImage(icon(name), 0, 0, px, px); return c; }

  /* tiny 3×5 digits for damage numbers */
  const DIG = { 0: "111101101101111", 1: "010110010010111", 2: "111001111100111", 3: "111001111001111", 4: "101101111001001", 5: "111100111001111", 6: "111100111101111", 7: "111001010010010", 8: "111101111101111", 9: "111101111001111" };
  function number(g, n, x, y, col = "#ffffff") {
    const s = String(n), w = s.length * 4 - 1; let cx = Math.round(x - w / 2); y = Math.round(y);
    for (const pass of [0, 1]) {
      let px = cx;
      for (const ch of s) { const d = DIG[ch]; if (d) for (let i = 0; i < 15; i++) if (d[i] === "1") { const xx = px + (i % 3), yy = y + Math.floor(i / 3); if (pass === 0) { g.fillStyle = K; g.fillRect(xx - 1, yy, 3, 1); g.fillRect(xx, yy - 1, 1, 3); } else { g.fillStyle = col; g.fillRect(xx, yy, 1, 1); } } px += 4; }
    }
  }
  function heroPal(h) { return { h: h.hair, s: h.skin, c: h.cloth, d: mix(h.cloth, "#000000", 0.35), b: "#5a3a2a", p: mix(h.cloth, "#5a3a2a", 0.55), y: "#ffd23f" }; }
  return { get, gun, gunRot, icon, iconCanvas, number, heroPal, mix, K };
})();

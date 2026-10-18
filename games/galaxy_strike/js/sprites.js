/* ==========================================================================
   SPRITES — every ship, enemy, boss, bullet and pickup is drawn here with
   vector paths + neon glow, ONCE, into an off-screen canvas. The game then only
   blits images, which keeps it smooth on low-end phones.
   Sprites.ship(cfg) · enemy(type) · boss(cfg) · glow(color, r) · bolt(color)
   pickup(pu) · coin() · shipPreview(cfg, w, h)
   ========================================================================== */
window.Sprites = (() => {
  const C = window.GAME_CONFIG;
  const cache = {};
  const DPR = Math.min(2, window.devicePixelRatio || 1);

  // a canvas of w×h logical px (plus padding for the glow), origin in the centre
  function make(key, w, h, draw, pad = 16) {
    if (cache[key]) return cache[key];
    const c = document.createElement("canvas");
    c.width = Math.ceil((w + pad * 2) * DPR); c.height = Math.ceil((h + pad * 2) * DPR);
    const x = c.getContext("2d");
    x.scale(DPR, DPR); x.translate(w / 2 + pad, h / 2 + pad);
    draw(x);
    c.w = w + pad * 2; c.h = h + pad * 2;          // logical size for drawImage
    return (cache[key] = c);
  }
  const poly = (x, pts) => { x.beginPath(); pts.forEach(([a, b], i) => i ? x.lineTo(a, b) : x.moveTo(a, b)); x.closePath(); };
  const mirror = pts => [...pts, ...pts.slice().reverse().map(([a, b]) => [-a, b])];
  function shade(x, color, glow, blur = 12) { x.shadowColor = glow || color; x.shadowBlur = blur; x.fillStyle = color; }
  function lighten(hex, k) {
    const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const f = v => Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k));
    return `rgb(${f(r)},${f(g)},${f(b)})`;
  }
  function grad(x, top, bottom, y0, y1) { const g = x.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, top); g.addColorStop(1, bottom); return g; }

  // ---------- player ships (pointing up, ~48px long) --------------------------
  const SHIPS = {
    arrow:   s => ({ hull: mirror([[0, -s], [s * .22, -s * .35], [s * .9, s * .45], [s * .9, s * .62], [s * .3, s * .5], [s * .22, s * .8]]), wing: mirror([[s * .22, -s * .1], [s * .9, s * .45], [s * .9, s * .62], [s * .3, s * .5]]) }),
    delta:   s => ({ hull: mirror([[0, -s], [s * .18, -s * .55], [s, s * .7], [s * .25, s * .55], [s * .12, s * .8]]), wing: mirror([[s * .3, s * .05], [s, s * .7], [s * .25, s * .55]]) }),
    wing:    s => ({ hull: mirror([[0, -s], [s * .2, -s * .5], [s * .35, s * .1], [s * .95, s * .15], [s * .95, s * .7], [s * .55, s * .55], [s * .2, s * .8]]), wing: mirror([[s * .75, -s * .45], [s * .95, -s * .3], [s * .95, s * .7], [s * .75, s * .6]]) }),
    raptor:  s => ({ hull: mirror([[0, -s], [s * .15, -s * .6], [s * .5, -s * .45], [s * .3, -s * .1], [s, s * .5], [s * .7, s * .75], [s * .25, s * .55], [s * .15, s * .85]]), wing: mirror([[s * .3, -s * .1], [s, s * .5], [s * .7, s * .75]]) }),
    saucer:  s => ({ disc: s, hull: mirror([[0, -s * .55], [s * .45, -s * .35], [s, s * .1], [s * .7, s * .45], [s * .2, s * .55]]), wing: mirror([[s * .6, 0], [s, s * .1], [s * .7, s * .45]]) }),
    phoenix: s => ({ hull: mirror([[0, -s], [s * .2, -s * .45], [s * .6, -s * .2], [s, -s * .55], [s * .85, s * .2], [s * .45, s * .5], [s * .5, s * .9], [s * .15, s * .6]]), wing: mirror([[s * .6, -s * .2], [s, -s * .55], [s * .85, s * .2]]) })
  };
  function drawShip(x, cfg, s) {
    const g = (SHIPS[cfg.shape] || SHIPS.arrow)(s);
    shade(x, cfg.trim, cfg.glow, 16); poly(x, g.hull); x.fill();          // glow pass
    x.shadowBlur = 0;
    x.fillStyle = grad(x, cfg.body, lighten(cfg.trim, -0.35), -s, s);
    poly(x, g.hull); x.fill();
    x.fillStyle = cfg.trim; poly(x, g.wing); x.fill();
    x.globalAlpha = .35; x.fillStyle = "#fff"; poly(x, g.wing.map(([a, b]) => [a * .92, b - 3])); x.fill(); x.globalAlpha = 1;
    x.strokeStyle = "rgba(255,255,255,.55)"; x.lineWidth = 1.2; poly(x, g.hull); x.stroke();
    x.beginPath(); x.moveTo(0, -s * .85); x.lineTo(0, s * .55); x.strokeStyle = "rgba(0,0,0,.18)"; x.stroke();
    // cockpit
    x.fillStyle = grad(x, "#ffffff", cfg.glow, -s * .5, s * .05);
    x.beginPath(); x.ellipse(0, -s * .3, s * .14, s * .3, 0, 0, Math.PI * 2); x.fill();
    x.fillStyle = "rgba(255,255,255,.8)"; x.beginPath(); x.ellipse(-s * .04, -s * .4, s * .04, s * .1, 0, 0, Math.PI * 2); x.fill();
    if (g.disc) { x.strokeStyle = cfg.trim; x.lineWidth = 3; x.beginPath(); x.ellipse(0, s * .12, s * .9, s * .32, 0, 0, Math.PI * 2); x.stroke(); }
  }
  const ship = cfg => make("ship:" + cfg.id, 52, 52, x => drawShip(x, cfg, 24));
  function shipPreview(cfg, w, h, silhouette) {
    const c = document.createElement("canvas"); c.width = w * DPR; c.height = h * DPR; c.style.width = w + "px"; c.style.height = h + "px";
    const x = c.getContext("2d"); x.scale(DPR, DPR);
    x.translate(w / 2, h / 2);
    const s = Math.min(w, h) * .36;
    // engine flame
    const fl = x.createLinearGradient(0, s * .6, 0, s * 1.5); fl.addColorStop(0, "#fff"); fl.addColorStop(.3, cfg.glow); fl.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = fl; poly(x, [[-s * .15, s * .6], [s * .15, s * .6], [0, s * 1.5]]); x.fill();
    drawShip(x, cfg, s);
    if (silhouette) { x.globalCompositeOperation = "source-atop"; x.fillStyle = "rgba(8,6,30,.88)"; x.fillRect(-w, -h, w * 2, h * 2); }
    return c;
  }

  // ---------- enemies (pointing down) -----------------------------------------
  function drawEnemy(x, type, color, r) {
    const dark = lighten(color, -0.55), light = lighten(color, 0.45);
    shade(x, color, color, 14);
    if (type === "drone") {
      const pts = []; for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + Math.PI / 6; pts.push([Math.cos(a) * r, Math.sin(a) * r * .85]); }
      poly(x, pts); x.fill(); x.shadowBlur = 0;
      x.fillStyle = grad(x, light, dark, -r, r); poly(x, pts.map(([a, b]) => [a * .8, b * .8])); x.fill();
      x.fillStyle = "#0b0820"; x.beginPath(); x.arc(0, r * .1, r * .38, 0, 7); x.fill();
      x.fillStyle = color; x.beginPath(); x.arc(0, r * .18, r * .2, 0, 7); x.fill();
      x.fillStyle = "#fff"; x.beginPath(); x.arc(-r * .06, r * .1, r * .07, 0, 7); x.fill();
    } else if (type === "dart") {
      const pts = [[0, r * 1.15], [r * .85, -r * .7], [r * .25, -r * .35], [0, -r * .9], [-r * .25, -r * .35], [-r * .85, -r * .7]];
      poly(x, pts); x.fill(); x.shadowBlur = 0;
      x.fillStyle = grad(x, dark, light, -r, r); poly(x, pts.map(([a, b]) => [a * .75, b * .75])); x.fill();
      x.fillStyle = "#fff"; x.beginPath(); x.arc(0, r * .2, r * .14, 0, 7); x.fill();
    } else if (type === "gunner") {
      const body = [[-r * .7, -r * .6], [r * .7, -r * .6], [r, 0], [r * .55, r * .7], [-r * .55, r * .7], [-r, 0]];
      poly(x, body); x.fill(); x.shadowBlur = 0;
      x.fillStyle = grad(x, light, dark, -r, r); poly(x, body.map(([a, b]) => [a * .8, b * .8])); x.fill();
      x.fillStyle = dark; x.fillRect(-r * .75, r * .2, r * .22, r * .9); x.fillRect(r * .53, r * .2, r * .22, r * .9);   // cannons
      x.fillStyle = light; x.fillRect(-r * .72, r * .95, r * .16, r * .15); x.fillRect(r * .56, r * .95, r * .16, r * .15);
      x.fillStyle = "#0b0820"; x.beginPath(); x.arc(0, 0, r * .3, 0, 7); x.fill();
      x.fillStyle = "#fff"; x.beginPath(); x.arc(0, r * .05, r * .13, 0, 7); x.fill();
    } else if (type === "tank") {
      const pts = []; for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + Math.PI / 8; pts.push([Math.cos(a) * r, Math.sin(a) * r]); }
      poly(x, pts); x.fill(); x.shadowBlur = 0;
      x.fillStyle = grad(x, light, dark, -r, r); poly(x, pts.map(([a, b]) => [a * .85, b * .85])); x.fill();
      x.strokeStyle = "rgba(0,0,0,.35)"; x.lineWidth = 2; for (let i = -1; i <= 1; i++) { x.beginPath(); x.moveTo(-r * .6, i * r * .35); x.lineTo(r * .6, i * r * .35); x.stroke(); }
      x.fillStyle = dark; x.beginPath(); x.arc(0, 0, r * .42, 0, 7); x.fill();
      x.fillRect(-r * .1, 0, r * .2, r * 1.05); x.fillRect(-r * .55, r * .1, r * .14, r * .7); x.fillRect(r * .41, r * .1, r * .14, r * .7);
      x.fillStyle = color; x.beginPath(); x.arc(0, 0, r * .22, 0, 7); x.fill();
    } else if (type === "mine") {
      x.beginPath(); for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, rr = i % 2 ? r * .7 : r * 1.1; x.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } x.closePath(); x.fill();
      x.shadowBlur = 0; x.fillStyle = grad(x, light, dark, -r, r); x.beginPath(); x.arc(0, 0, r * .62, 0, 7); x.fill();
      x.fillStyle = "#fff"; x.beginPath(); x.arc(0, 0, r * .22, 0, 7); x.fill();
    }
  }
  const enemy = type => { const e = C.enemies[type]; return make("en:" + type, e.r * 2.4, e.r * 2.4, x => drawEnemy(x, e.shape, e.color, e.r)); };

  // ---------- bosses (~150px) --------------------------------------------------
  function drawBoss(x, b, R) {
    const c = b.color, dark = lighten(c, -0.6), light = lighten(c, 0.4);
    shade(x, c, c, 22);
    if (b.shape === "warden") {
      const pts = [[0, R * .95], [R * .45, R * .6], [R, R * .25], [R * .85, -R * .45], [R * .35, -R * .7], [-R * .35, -R * .7], [-R * .85, -R * .45], [-R, R * .25], [-R * .45, R * .6]];
      poly(x, pts); x.fill(); x.shadowBlur = 0;
      x.fillStyle = grad(x, light, dark, -R, R); poly(x, pts.map(([a, b2]) => [a * .88, b2 * .88])); x.fill();
      x.fillStyle = dark; poly(x, [[-R * .5, -R * .3], [R * .5, -R * .3], [R * .3, R * .45], [-R * .3, R * .45]]); x.fill();
      [-1, 1].forEach(sd => { x.fillStyle = dark; x.fillRect(sd * R * .7 - R * .08, R * .1, R * .16, R * .55); x.fillStyle = light; x.fillRect(sd * R * .7 - R * .05, R * .58, R * .1, R * .1); });
    } else if (b.shape === "hive") {
      x.beginPath(); for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2, rr = R * (i % 2 ? .8 : .95); x.lineTo(Math.cos(a) * rr, Math.sin(a) * rr * .8); } x.closePath(); x.fill(); x.shadowBlur = 0;
      x.fillStyle = grad(x, light, dark, -R, R); x.beginPath(); x.ellipse(0, 0, R * .72, R * .58, 0, 0, 7); x.fill();
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; x.fillStyle = dark; x.beginPath(); x.arc(Math.cos(a) * R * .48, Math.sin(a) * R * .36, R * .13, 0, 7); x.fill(); x.fillStyle = c; x.beginPath(); x.arc(Math.cos(a) * R * .48, Math.sin(a) * R * .36, R * .06, 0, 7); x.fill(); }
    } else if (b.shape === "eclipse") {
      x.beginPath(); x.arc(0, 0, R * .95, 0, 7); x.arc(0, 0, R * .62, 0, 7, true); x.fill(); x.shadowBlur = 0;
      x.fillStyle = grad(x, light, dark, -R, R); x.beginPath(); x.arc(0, 0, R * .88, 0, 7); x.arc(0, 0, R * .68, 0, 7, true); x.fill();
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; x.save(); x.rotate(a); x.fillStyle = dark; x.fillRect(-R * .06, -R * 1.05, R * .12, R * .3); x.restore(); }
      x.fillStyle = dark; x.beginPath(); x.arc(0, 0, R * .4, 0, 7); x.fill();
    } else {                                            // titan: a wide battleship
      const pts = [[0, R * .85], [R * .3, R * .55], [R * 1.1, R * .4], [R * 1.1, -R * .1], [R * .6, -R * .55], [R * .2, -R * .8], [-R * .2, -R * .8], [-R * .6, -R * .55], [-R * 1.1, -R * .1], [-R * 1.1, R * .4], [-R * .3, R * .55]];
      poly(x, pts); x.fill(); x.shadowBlur = 0;
      x.fillStyle = grad(x, light, dark, -R, R); poly(x, pts.map(([a, b2]) => [a * .9, b2 * .9])); x.fill();
      x.strokeStyle = "rgba(0,0,0,.35)"; x.lineWidth = 3; [-.5, 0, .5].forEach(k => { x.beginPath(); x.moveTo(-R * .9, k * R * .5); x.lineTo(R * .9, k * R * .5); x.stroke(); });
      [-.8, -.4, .4, .8].forEach(k => { x.fillStyle = dark; x.fillRect(k * R - R * .06, R * .2, R * .12, R * .45); });
    }
    // the glowing core (its weak spot look)
    const core = x.createRadialGradient(0, 0, 0, 0, 0, R * .3);
    core.addColorStop(0, "#fff"); core.addColorStop(.35, light); core.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = core; x.beginPath(); x.arc(0, 0, R * .3, 0, 7); x.fill();
  }
  const boss = b => make("boss:" + b.id, 170, 150, x => drawBoss(x, b, 75), 30);

  // ---------- glows, bullets, pickups ------------------------------------------
  function glow(color, r) {
    return make(`glow:${color}:${r}`, r * 2, r * 2, x => {
      const g = x.createRadialGradient(0, 0, 0, 0, 0, r);
      g.addColorStop(0, color); g.addColorStop(.4, color.length === 7 ? color + "66" : color); g.addColorStop(1, "rgba(0,0,0,0)");
      x.fillStyle = g; x.fillRect(-r, -r, r * 2, r * 2);
    }, 0);
  }
  const bolt = (color, w = 5, h = 22) => make(`bolt:${color}:${w}:${h}`, w * 3, h + 10, x => {
    shade(x, color, color, 10);
    x.beginPath(); x.ellipse(0, 0, w / 2, h / 2, 0, 0, 7); x.fill();
    x.shadowBlur = 0; x.fillStyle = "#fff"; x.beginPath(); x.ellipse(0, 0, w / 4, h / 2.4, 0, 0, 7); x.fill();
  }, 6);
  const orb = (color, r = 6) => make(`orb:${color}:${r}`, r * 2, r * 2, x => {
    shade(x, color, color, 12); x.beginPath(); x.arc(0, 0, r, 0, 7); x.fill();
    x.shadowBlur = 0; x.fillStyle = "#fff"; x.beginPath(); x.arc(0, 0, r * .5, 0, 7); x.fill();
  }, 10);
  const missile = color => make("missile:" + color, 10, 22, x => {
    shade(x, color, color, 10); poly(x, [[0, -11], [4, -4], [4, 9], [-4, 9], [-4, -4]]); x.fill();
    x.shadowBlur = 0; x.fillStyle = "#fff"; poly(x, [[0, -11], [2, -5], [-2, -5]]); x.fill();
  }, 8);
  const PU_ICON = { power: "P", shield: "S", overdrive: "O", drones: "W", magnet: "M", repair: "+", bomb: "B" };
  const pickup = pu => make("pu:" + pu.id, 34, 34, x => {
    shade(x, pu.color, pu.color, 16);
    poly(x, [[0, -16], [14, -8], [14, 8], [0, 16], [-14, 8], [-14, -8]]); x.fill(); x.shadowBlur = 0;
    x.fillStyle = "#0b0820"; poly(x, [[0, -12], [10.5, -6], [10.5, 6], [0, 12], [-10.5, 6], [-10.5, -6]]); x.fill();
    x.fillStyle = pu.color; x.font = "900 15px system-ui, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle";
    x.fillText(PU_ICON[pu.id] || "?", 0, 1);
  }, 10);
  const coin = () => make("coin", 14, 14, x => {
    const c = C.theme.coin;
    shade(x, c, c, 8); x.beginPath(); x.arc(0, 0, 7, 0, 7); x.fill(); x.shadowBlur = 0;
    x.fillStyle = lighten(c, -0.3); x.beginPath(); x.arc(0, 0, 4.6, 0, 7); x.fill();
    x.fillStyle = "#fff8d0"; x.fillRect(-1, -3.5, 2, 7);
  }, 6);
  const drone = color => make("drone:" + color, 18, 18, x => {
    shade(x, color, color, 10); poly(x, [[0, -9], [8, 6], [0, 3], [-8, 6]]); x.fill();
    x.shadowBlur = 0; x.fillStyle = "#fff"; x.beginPath(); x.arc(0, 0, 2.2, 0, 7); x.fill();
  }, 8);

  return { ship, shipPreview, enemy, boss, glow, bolt, orb, missile, pickup, coin, drone, lighten };
})();

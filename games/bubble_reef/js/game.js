/* ==========================================================================
   BUBBLE REEF — engine
   Hex grid (offset rows), shot simulation shared by the aim guide and the
   real shot, match/flood/float logic, fish rescue, boosters and the reef.
   ========================================================================== */
const Reef = (() => {
  const CFG = window.GAME_CONFIG, PLAY = CFG.play;
  const W = 400, COLS = 9, R = 20, ROWH = R * Math.sqrt(3), LEFT = 20, TOP = 70;
  const canvas = document.getElementById("stage"), g = canvas.getContext("2d");
  let H = 760, k = 1, dpr = 1, clock = 0;

  // ---- state ----
  const S = {
    mode: "adventure", phase: "idle", level: 1,
    grid: [], shift: 0, slide: 0,             // shift = row parity, slide = visual offset when a row drops in
    shot: null, current: null, next: null,
    shots: 0, shotsMax: 0, misses: 0, score: 0, fishTotal: 0, fishFreed: 0, pearls: 0,
    aimAngle: -Math.PI / 2, aiming: false, aimLong: 0, armed: null,
    pops: [], falls: [], swimmers: [], drift: [], rays: [], sparks: [], texts: [], wobble: 0
  };
  const listeners = {};
  const fire = (n, d) => listeners[n] && listeners[n](d);

  // ---- geometry ----
  const odd = r => ((r + S.shift) & 1) === 1;
  const cellX = (r, c) => LEFT + R + c * 2 * R + (odd(r) ? R : 0);
  const cellY = r => TOP + R + r * ROWH - S.slide;
  const shooter = () => ({ x: W / 2, y: H - 92 });
  const dangerY = () => shooter().y - 58;
  function neighbours(r, c) {
    const d = odd(r) ? [[-1, 0], [-1, 1], [0, -1], [0, 1], [1, 0], [1, 1]] : [[-1, -1], [-1, 0], [0, -1], [0, 1], [1, -1], [1, 0]];
    return d.map(([dr, dc]) => [r + dr, c + dc]).filter(([a, b]) => a >= 0 && b >= 0 && b < COLS && !(odd(a) && b === COLS - 1 && false));
  }
  const at = (r, c) => (S.grid[r] && S.grid[r][c]) || null;
  const lastCol = r => odd(r) ? COLS - 2 : COLS - 1;   // offset rows hold one less bubble so they fit the width
  function ensureRow(r) { while (S.grid.length <= r) S.grid.push(new Array(COLS).fill(null)); }

  // ---- generator ----
  function seeded(seed) { return () => ((seed = Math.imul(seed ^ (seed >>> 15), 2246822519) + 0x6D2B79F5 | 0) >>> 0) / 4294967296; }
  const lerp = (a, b, t) => Math.round(a + (b - a) * t);
  function levelSpec(n) {
    const t = Math.min(1, (n - 1) / (CFG.levels - 1)), cv = CFG.curve;
    return { rows: lerp(cv.rows.start, cv.rows.end, t), colors: lerp(cv.colors.start, cv.colors.end, t),
      fish: lerp(cv.fish.start, cv.fish.end, t), shots: lerp(cv.shots.start, cv.shots.end, t), stones: lerp(cv.stones.start, cv.stones.end, t) };
  }
  function randomColor(rand, n) { return Math.floor(rand() * n); }
  function buildLevel(n) {
    const sp = levelSpec(n), rand = seeded(n * 104729 + 7);
    S.grid = []; S.shift = 0;
    for (let r = 0; r < sp.rows; r++) {
      ensureRow(r);
      for (let c = 0; c <= lastCol(r); c++) {
        // cluster: often copy the colour of an upper/left neighbour
        const nb = neighbours(r, c).filter(([a, b]) => a < r || (a === r && b < c)).map(([a, b]) => at(a, b)).filter(x => x && x.kind !== "stone");
        const color = nb.length && rand() < 0.42 ? nb[Math.floor(rand() * nb.length)].color : randomColor(rand, sp.colors);
        S.grid[r][c] = { color, kind: "bubble", wob: 0 };
      }
    }
    const cells = []; S.grid.forEach((row, r) => row.forEach((b, c) => b && cells.push([r, c])));
    for (let i = cells.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [cells[i], cells[j]] = [cells[j], cells[i]]; }
    let f = 0, s = 0;
    for (const [r, c] of cells) {
      if (f < sp.fish && r <= Math.max(1, Math.floor(sp.rows * 0.4))) { S.grid[r][c].kind = "fish"; f++; }
      else if (s < sp.stones && r >= 1) { S.grid[r][c] = { color: -1, kind: "stone", wob: 0 }; s++; }
    }
    S.fishTotal = f; S.shots = S.shotsMax = sp.shots; S.colorCount = sp.colors;
  }
  function buildEndless() {
    S.grid = []; S.shift = 0; S.colorCount = CFG.endless.colors;
    const rand = Math.random;
    for (let r = 0; r < 6; r++) { ensureRow(r); for (let c = 0; c <= lastCol(r); c++) S.grid[r][c] = { color: randomColor(rand, S.colorCount), kind: rand() < 0.05 ? "fish" : "bubble", wob: 0 }; }
    S.fishTotal = 0; S.shots = S.shotsMax = Infinity;
  }

  // ---- colours in play ----
  function liveColors() {
    const set = new Set();
    S.grid.forEach(row => row.forEach(b => b && b.kind !== "stone" && set.add(b.color)));
    return [...set];
  }
  function nextBubble() {
    const cols = liveColors(), pool = cols.length ? cols : [0];
    return { color: pool[Math.floor(Math.random() * pool.length)], kind: "bubble" };
  }

  // ---- shot simulation (used by aim guide AND real shots, so they always agree) ----
  function trace(angle, maxBounces = 6, step = 4) {
    const sh = shooter(); let x = sh.x, y = sh.y, vx = Math.cos(angle), vy = Math.sin(angle), bounces = 0;
    const path = [[x, y]];
    for (let i = 0; i < 900; i++) {
      x += vx * step; y += vy * step;
      if (x < LEFT + R) { x = LEFT + R; vx = Math.abs(vx); bounces++; path.push([x, y]); if (bounces > maxBounces) break; }
      if (x > W - LEFT - R) { x = W - LEFT - R; vx = -Math.abs(vx); bounces++; path.push([x, y]); if (bounces > maxBounces) break; }
      if (y <= cellY(0)) { path.push([x, y]); return { path, hit: [x, y] }; }
      if (hitsAny(x, y)) { path.push([x, y]); return { path, hit: [x, y] }; }
    }
    path.push([x, y]);
    return { path, hit: null };
  }
  function hitsAny(x, y) {
    const r0 = Math.max(0, Math.floor((y - TOP - R + S.slide) / ROWH) - 1);
    for (let r = r0; r < Math.min(S.grid.length, r0 + 3); r++)
      for (let c = 0; c < COLS; c++) {
        if (!at(r, c)) continue;
        const dx = cellX(r, c) - x, dy = cellY(r) - y;
        if (dx * dx + dy * dy < (R * 1.75) ** 2) return true;
      }
    return false;
  }
  function snapCell(x, y) {
    let best = null, bd = 1e9;
    const rGuess = Math.round((y - TOP - R + S.slide) / ROWH);
    for (let r = Math.max(0, rGuess - 1); r <= rGuess + 1; r++)
      for (let c = 0; c <= lastCol(r); c++) {
        if (at(r, c)) continue;
        if (r > 0 && !neighbours(r, c).some(([a, b]) => at(a, b))) continue;
        const d = (cellX(r, c) - x) ** 2 + (cellY(r) - y) ** 2;
        if (d < bd) { bd = d; best = [r, c]; }
      }
    return best;
  }

  // ---- resolving a landed bubble ----
  function group(r, c, test) {
    const seen = new Set([r + "," + c]), q = [[r, c]], out = [];
    while (q.length) {
      const [a, b] = q.pop(); out.push([a, b]);
      for (const [na, nb] of neighbours(a, b)) {
        const key = na + "," + nb, bub = at(na, nb);
        if (!seen.has(key) && bub && test(bub)) { seen.add(key); q.push([na, nb]); }
      }
    }
    return out;
  }
  function removeCell(r, c, how, i) {
    const b = at(r, c); if (!b) return;
    S.grid[r][c] = null;
    const x = cellX(r, c), y = cellY(r);
    if (how === "pop") {
      S.pops.push({ x, y, color: b.color, t: -i * 0.035 });
      S.score += PLAY.popPoints;
      Sound.sfx("pop", i);
    } else {
      S.falls.push({ x, y, vx: (Math.random() - 0.5) * 120, vy: -60 - Math.random() * 120, color: b.color, kind: b.kind, t: 0 });
      S.score += PLAY.dropBonus;
      Sound.sfx("drop", i);
    }
    if (b.kind === "fish") freeFish(x, y);
  }
  function freeFish(x, y) {
    S.fishFreed++; S.pearls += PLAY.pearlsPerFish;
    S.swimmers.push({ x, y, t: 0, dir: Math.random() < 0.5 ? -1 : 1 });
    Sound.sfx("fish");
    say(x, y - 20, "FREE!", "#fff6c9");
    fire("hud");
  }
  function say(x, y, text, color) { S.texts.push({ x, y, text, color, t: 0 }); }

  function land(r, c, bub) {
    ensureRow(r);
    S.grid[r][c] = { color: bub.color, kind: "bubble", wob: 1 };
    // nudge the neighbours so the grid feels soft
    neighbours(r, c).forEach(([a, b]) => { const n = at(a, b); if (n) n.wob = 0.6; });
    let popped = 0;
    if (bub.kind === "bomb") {
      Sound.sfx("boom"); S.wobble = 1;
      const cx0 = cellX(r, c), cy0 = cellY(r);
      let i = 0;
      S.grid.forEach((row, a) => row.forEach((b, cc) => { if (b && Math.hypot(cellX(a, cc) - cx0, cellY(a) - cy0) < R * 4.3) { removeCell(a, cc, "pop", i++); popped++; } }));
      S.sparks.push({ x: cx0, y: cy0, t: 0, big: true });
    } else {
      if (bub.kind === "rainbow") {
        // take the neighbour colour that makes the biggest group
        let best = null, size = 0;
        neighbours(r, c).forEach(([a, b]) => {
          const n = at(a, b); if (!n || n.kind === "stone") return;
          S.grid[r][c].color = n.color;
          const sz = group(r, c, x => x.kind !== "stone" && x.color === n.color).length;
          if (sz > size) { size = sz; best = n.color; }
        });
        S.grid[r][c].color = best ?? bub.color;
      }
      const col = S.grid[r][c].color;
      const same = group(r, c, x => x.kind !== "stone" && x.color === col);
      if (same.length >= 3) { same.forEach(([a, b], i) => removeCell(a, b, "pop", i)); popped = same.length; }
    }
    // anything no longer hanging from the ceiling falls
    const anchored = new Set(), q = [];
    (S.grid[0] || []).forEach((b, cc) => { if (b) { anchored.add("0," + cc); q.push([0, cc]); } });
    while (q.length) { const [a, b] = q.pop(); for (const [na, nb] of neighbours(a, b)) { const key = na + "," + nb; if (!anchored.has(key) && at(na, nb)) { anchored.add(key); q.push([na, nb]); } } }
    let fell = 0;
    S.grid.forEach((row, a) => row.forEach((b, cc) => { if (b && !anchored.has(a + "," + cc)) removeCell(a, cc, "fall", fell++); }));
    if (fell >= 4) say(W / 2, H * 0.45, fell >= 10 ? "AVALANCHE!" : "NICE DROP!", "#ffffff");
    while (S.grid.length && S.grid[S.grid.length - 1].every(b => !b)) S.grid.pop();

    if (popped || fell) S.misses = 0;
    else { Sound.sfx("stick"); S.misses++; }
    if (S.mode === "endless") {
      S.endlessCount = (S.endlessCount || 0) + 1;
      if (S.endlessCount % CFG.endless.rowEvery === 0) pushRow();
    } else if (S.misses >= PLAY.missesPerRow) { pushRow(); S.misses = 0; }
    fire("hud");
    checkEnd();
  }
  function pushRow() {
    S.shift ^= 1;
    const row = new Array(COLS).fill(null), cols = liveColors().length ? liveColors() : [0];
    S.grid.unshift(row);
    for (let c = 0; c <= lastCol(0); c++) row[c] = { color: cols[Math.floor(Math.random() * cols.length)], kind: "bubble", wob: 0 };
    S.slide = ROWH;   // animate it sliding down
    Sound.sfx("row");
  }
  function checkEnd() {
    if (S.mode === "adventure" && S.fishFreed >= S.fishTotal) return finish(true);
    const low = S.grid.some((row, r) => row.some(b => b) && cellY(r) + R > dangerY());
    if (low) return finish(false, "reef");
    if (S.shots <= 0 && !S.shot) finish(false, "shots");
  }
  function finish(won, why) {
    if (S.phase !== "play") return;
    S.phase = won ? "won" : "lost";
    if (won) {
      Sound.sfx("win");
      // leftover bubbles cascade off for bonus points
      let i = 0;
      S.grid.forEach((row, r) => row.forEach((b, c) => { if (b) setTimeout(() => removeCell(r, c, "fall", 0), 30 * i++); }));
      const left = S.shots / S.shotsMax, stars = left >= 0.4 ? 3 : left >= 0.2 ? 2 : 1;
      S.score += S.shots * 50;
      const res = { level: S.level, score: S.score, stars, pearls: S.pearls + stars * PLAY.pearlsPerStar, shotsLeft: S.shots, fish: S.fishFreed };
      setTimeout(() => fire("won", res), 1400);
    } else {
      Sound.sfx("lose");
      const res = { level: S.level, score: S.score, why, mode: S.mode };
      setTimeout(() => fire("lost", res), 800);
    }
  }

  // ---- input ----
  function toWorld(e) { const b = canvas.getBoundingClientRect(); return [(e.clientX - b.left) / b.width * W, (e.clientY - b.top) / b.height * H]; }
  function setAim(x, y) {
    const sh = shooter(); let a = Math.atan2(y - sh.y, x - sh.x);
    if (a > 0) a = x < sh.x ? -Math.PI + 0.12 : -0.12;
    S.aimAngle = Math.max(-Math.PI + 0.12, Math.min(-0.12, a));
  }
  canvas.addEventListener("pointerdown", e => {
    if (S.phase !== "play" || S.shot) return;
    const [x, y] = toWorld(e), sh = shooter();
    if (Math.hypot(x - sh.x, y - sh.y) < 34 || Math.hypot(x - (sh.x + 64), y - (sh.y + 18)) < 26) { swap(); return; }
    S.aiming = true; setAim(x, y);
  });
  window.addEventListener("pointermove", e => { if (S.aiming) { const [x, y] = toWorld(e); setAim(x, y); } });
  window.addEventListener("pointerup", () => { if (S.aiming) { S.aiming = false; shoot(); } });
  window.addEventListener("keydown", e => {
    if (S.phase !== "play") return;
    if (e.key === "ArrowLeft") S.aimAngle = Math.max(-Math.PI + 0.12, S.aimAngle - 0.05);
    if (e.key === "ArrowRight") S.aimAngle = Math.min(-0.12, S.aimAngle + 0.05);
    if (e.key === " " || e.key === "ArrowUp") shoot();
    if (e.key === "s" || e.key === "x") swap();
    if (e.key === "Escape" || e.key === "p") fire("pauseKey");
  });

  function swap() {
    if (S.shot || S.phase !== "play" || S.current.kind !== "bubble") return;
    [S.current, S.next] = [S.next, S.current]; Sound.sfx("swap");
  }
  function shoot() {
    if (S.shot || S.phase !== "play" || S.shots <= 0) return;
    const t = trace(S.aimAngle, 40, 3);
    S.shot = { bub: S.current, path: t.path, hit: t.hit, seg: 0, x: t.path[0][0], y: t.path[0][1] };
    S.current = S.next; S.next = nextBubble();
    if (S.mode === "adventure") S.shots--;
    if (S.aimLong > 0) S.aimLong--;
    Sound.sfx("shoot");
    fire("hud");
  }
  function arm(kind) { if (S.phase !== "play" || S.shot) return false; S.next = S.current; S.current = { color: S.current.color, kind }; if (kind === "aim") { S.current.kind = "bubble"; S.aimLong = 10; Sound.sfx("sonar"); } return true; }

  // ---- update ----
  function update(dt) {
    clock += dt;
    if (S.phase === "paused" || S.phase === "idle") return;
    S.slide = Math.max(0, S.slide - dt * 140);
    if (S.shot) {
      // follow the pre-computed path at constant speed
      let move = PLAY.shotSpeed * dt;
      while (move > 0 && S.shot) {
        const p = S.shot.path, seg = S.shot.seg;
        if (seg >= p.length - 1) {
          const cell = S.shot.hit ? snapCell(S.shot.x, S.shot.y) : null;
          const b = S.shot.bub; S.shot = null;
          if (cell) land(cell[0], cell[1], b); else checkEnd();
          break;
        }
        const [tx, ty] = p[seg + 1], dx = tx - S.shot.x, dy = ty - S.shot.y, d = Math.hypot(dx, dy);
        if (d <= move) { S.shot.x = tx; S.shot.y = ty; S.shot.seg++; move -= d; if (seg + 1 < p.length - 1) Sound.sfx("bounce"); }
        else { S.shot.x += dx / d * move; S.shot.y += dy / d * move; move = 0; }
      }
    }
    S.grid.forEach(row => row.forEach(b => b && (b.wob = Math.max(0, b.wob - dt * 3))));
    S.wobble = Math.max(0, S.wobble - dt * 2);
    S.pops.forEach(p => p.t += dt); S.pops = S.pops.filter(p => p.t < 0.45);
    S.falls.forEach(f => { f.t += dt; f.vy += 900 * dt; f.x += f.vx * dt; f.y += f.vy * dt; }); S.falls = S.falls.filter(f => f.y < H + 40);
    S.swimmers.forEach(s => { s.t += dt; s.y -= 120 * dt; s.x += Math.sin(s.t * 6) * 40 * dt + s.dir * 30 * dt; }); S.swimmers = S.swimmers.filter(s => s.y > -30);
    S.sparks.forEach(s => s.t += dt); S.sparks = S.sparks.filter(s => s.t < 0.6);
    S.texts.forEach(t => { t.t += dt; t.y -= 30 * dt; }); S.texts = S.texts.filter(t => t.t < 1.2);
    S.drift.forEach(b => { b.y -= b.v * dt; b.x += Math.sin(clock * b.f + b.p) * 8 * dt; if (b.y < 40) { b.y = H + 10; b.x = Math.random() * W; } });
  }

  // ---- drawing ----
  function bubble(x, y, r, colorIdx, kind, alpha = 1) {
    g.globalAlpha = alpha;
    if (kind === "stone") {
      const gr = g.createRadialGradient(x - r * 0.3, y - r * 0.3, 2, x, y, r);
      gr.addColorStop(0, "#9aa8b0"); gr.addColorStop(1, "#4a5961");
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r - 1, 0, 7); g.fill();
      g.strokeStyle = "rgba(0,0,0,.25)"; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(x - r * 0.5, y - r * 0.2); g.lineTo(x, y + r * 0.1); g.lineTo(x + r * 0.3, y - r * 0.4); g.stroke();
      g.globalAlpha = 1; return;
    }
    if (kind === "bomb") colorIdx = -2;
    const col = colorIdx >= 0 ? CFG.colors[colorIdx] : { fill: "#2b3440", glow: "#ff9a5a" };
    const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
    if (kind === "rainbow") {
      const hue = (clock * 120) % 360;
      gr.addColorStop(0, "#fff"); gr.addColorStop(0.5, `hsl(${hue},90%,65%)`); gr.addColorStop(1, `hsl(${(hue + 120) % 360},80%,45%)`);
    } else { gr.addColorStop(0, col.glow); gr.addColorStop(0.55, col.fill); gr.addColorStop(1, shade(col.fill, -0.35)); }
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r - 1, 0, 7); g.fill();
    if (kind === "fish") drawFish(x, y + 1, r * 0.55, 1, clock * 3 + x);
    if (kind === "bomb") { g.fillStyle = "#ff9a5a"; g.font = `${r}px system-ui`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("✶", x, y + 1); }
    // glass shine
    g.fillStyle = "rgba(255,255,255,.55)"; g.beginPath(); g.ellipse(x - r * 0.35, y - r * 0.42, r * 0.32, r * 0.18, -0.6, 0, 7); g.fill();
    g.fillStyle = "rgba(255,255,255,.25)"; g.beginPath(); g.arc(x + r * 0.4, y + r * 0.35, r * 0.12, 0, 7); g.fill();
    g.strokeStyle = "rgba(255,255,255,.35)"; g.lineWidth = 1.2; g.beginPath(); g.arc(x, y, r - 1.5, 0, 7); g.stroke();
    g.globalAlpha = 1;
  }
  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16), f = v => Math.max(0, Math.min(255, Math.round(v + (amt < 0 ? v * amt : (255 - v) * amt))));
    return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
  }
  function drawFish(x, y, s, dir, phase) {
    g.save(); g.translate(x, y); g.scale(dir, 1);
    const tail = Math.sin(phase) * 0.35;
    g.fillStyle = "#ffb347";
    g.beginPath(); g.ellipse(0, 0, s, s * 0.62, 0, 0, 7); g.fill();
    g.beginPath(); g.moveTo(-s * 0.8, 0); g.lineTo(-s * 1.5, -s * 0.55 + tail * s); g.lineTo(-s * 1.5, s * 0.55 + tail * s); g.closePath(); g.fill();
    g.fillStyle = "#fff"; g.fillRect(-s * 0.25, -s * 0.6, s * 0.18, s * 1.2);
    g.fillStyle = "#1b2b3a"; g.beginPath(); g.arc(s * 0.45, -s * 0.12, s * 0.16, 0, 7); g.fill();
    g.restore();
  }
  function drawSea() {
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, "#0b6d8f"); gr.addColorStop(0.45, "#0a4f73"); gr.addColorStop(1, "#06243f");
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    // light rays from the surface
    g.save(); g.globalCompositeOperation = "lighter";
    for (let i = 0; i < 5; i++) {
      const x = 40 + i * 85 + Math.sin(clock * 0.3 + i) * 20, w = 30 + (i % 3) * 18;
      const lg = g.createLinearGradient(0, 0, 0, H * 0.8);
      lg.addColorStop(0, `rgba(180,240,255,${0.08 + 0.04 * Math.sin(clock + i * 2)})`); lg.addColorStop(1, "rgba(180,240,255,0)");
      g.fillStyle = lg; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + w, 0); g.lineTo(x + w * 2.4 - 60, H * 0.8); g.lineTo(x - 60, H * 0.8); g.fill();
    }
    g.restore();
    // drifting particles
    g.fillStyle = "rgba(200,240,255,.35)";
    S.drift.forEach(b => { g.beginPath(); g.arc(b.x, b.y, b.r, 0, 7); g.fill(); });
    // sand and coral at the bottom
    const sy = H - 40;
    g.fillStyle = "#c9a66b"; g.beginPath(); g.moveTo(0, sy);
    for (let x = 0; x <= W; x += 20) g.quadraticCurveTo(x + 10, sy - 6 + Math.sin(x) * 4, x + 20, sy);
    g.lineTo(W, H); g.lineTo(0, H); g.fill();
    coral(28, sy, "#ff7a8a", 1); coral(372, sy, "#ffb347", -1); kelp(70, sy); kelp(340, sy); kelp(355, sy);
    // danger line
    g.setLineDash([6, 8]); g.strokeStyle = "rgba(255,120,120,.35)"; g.lineWidth = 2;
    g.beginPath(); g.moveTo(0, dangerY()); g.lineTo(W, dangerY()); g.stroke(); g.setLineDash([]);
    // ceiling (the surface)
    g.fillStyle = "rgba(255,255,255,.12)"; g.fillRect(0, TOP - 6, W, 6);
  }
  function coral(x, y, col, d) {
    g.strokeStyle = col; g.lineCap = "round"; g.lineWidth = 7;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + 6 * d, y - 40); g.moveTo(x + 4 * d, y - 22); g.lineTo(x + 20 * d, y - 44); g.moveTo(x + 6 * d, y - 34); g.lineTo(x - 8 * d, y - 54); g.stroke();
  }
  function kelp(x, y) {
    g.strokeStyle = "#2f8f5b"; g.lineWidth = 5; g.lineCap = "round"; g.beginPath(); g.moveTo(x, y);
    for (let i = 1; i <= 6; i++) g.lineTo(x + Math.sin(clock * 1.5 + i + x) * 6, y - i * 14);
    g.stroke();
  }
  function drawGuide() {
    if (S.shot || S.phase !== "play") return;
    const long = S.aimLong > 0, t = trace(S.aimAngle, long ? 3 : PLAY.aimBounces, 3);
    const pts = t.path; let dist = 0, budget = long ? 1400 : 520, phase = (clock * 60) % 18;
    const col = CFG.colors[S.current.color] || CFG.colors[0];
    g.fillStyle = col.glow;
    for (let i = 0; i < pts.length - 1 && budget > 0; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1], d = Math.hypot(bx - ax, by - ay);
      for (let s = (18 - (dist % 18)) + phase % 18 - 18; s < d && budget > 0; s += 18) {
        if (s < 0) continue;
        const f = s / d, a = Math.max(0.15, budget / 520);
        g.globalAlpha = Math.min(0.9, a); g.beginPath(); g.arc(ax + (bx - ax) * f, ay + (by - ay) * f, 3, 0, 7); g.fill();
        budget -= 18;
      }
      dist += d;
    }
    g.globalAlpha = 1;
    if (t.hit && (long || budget > 0)) {
      const cell = snapCell(t.hit[0], t.hit[1]);
      if (cell) { g.strokeStyle = "rgba(255,255,255,.6)"; g.setLineDash([4, 4]); g.lineWidth = 2; g.beginPath(); g.arc(cellX(cell[0], cell[1]), cellY(cell[0]), R - 2, 0, 7); g.stroke(); g.setLineDash([]); }
    }
  }
  function drawShooter() {
    const sh = shooter();
    // clam launcher
    g.save(); g.translate(sh.x, sh.y + 6);
    g.fillStyle = "#f2d7b6"; g.beginPath(); g.ellipse(0, 18, 44, 18, 0, 0, Math.PI); g.fill();
    g.strokeStyle = "#c79d74"; g.lineWidth = 2;
    for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(0, 18); g.lineTo(i * 13, 34 - Math.abs(i) * 2); g.stroke(); }
    g.rotate(S.aimAngle + Math.PI / 2);
    g.fillStyle = "rgba(255,255,255,.18)"; g.beginPath(); g.roundRect(-9, -46, 18, 40, 9); g.fill();
    g.restore();
    if (S.current) bubble(sh.x, sh.y, R, S.current.color, S.current.kind);
    if (S.next) { bubble(sh.x + 64, sh.y + 18, R * 0.7, S.next.color, S.next.kind); g.fillStyle = "rgba(255,255,255,.6)"; g.font = "600 9px ui-rounded,system-ui"; g.textAlign = "center"; g.fillText("NEXT", sh.x + 64, sh.y + 42); }
  }
  function draw() {
    g.setTransform(k * dpr, 0, 0, k * dpr, 0, 0);
    g.save();
    if (S.wobble) g.translate(Math.sin(clock * 60) * S.wobble * 5, 0);
    drawSea();
    S.grid.forEach((row, r) => row.forEach((b, c) => {
      if (!b) return;
      const w = Math.sin(clock * 30) * b.wob * 2.5;
      bubble(cellX(r, c) + w, cellY(r), R, b.color, b.kind);
    }));
    S.pops.forEach(p => {
      if (p.t < 0) return;
      const f = p.t / 0.45, col = (CFG.colors[p.color] || { glow: "#fff" }).glow;
      g.strokeStyle = col; g.globalAlpha = 1 - f; g.lineWidth = 3 * (1 - f);
      g.beginPath(); g.arc(p.x, p.y, R * (0.8 + f * 0.9), 0, 7); g.stroke();
      g.fillStyle = col;
      for (let i = 0; i < 6; i++) { const a = i * 1.047 + p.x; g.beginPath(); g.arc(p.x + Math.cos(a) * R * 1.6 * f, p.y + Math.sin(a) * R * 1.6 * f, 2.5 * (1 - f), 0, 7); g.fill(); }
      g.globalAlpha = 1;
    });
    S.falls.forEach(f => bubble(f.x, f.y, R, f.color, f.kind === "fish" ? "bubble" : f.kind, Math.max(0, 1 - f.t * 0.8)));
    S.swimmers.forEach(s => drawFish(s.x, s.y, 12, s.dir, s.t * 14));
    S.sparks.forEach(s => { const f = s.t / 0.6; g.strokeStyle = `rgba(255,190,120,${1 - f})`; g.lineWidth = 8 * (1 - f); g.beginPath(); g.arc(s.x, s.y, 20 + f * 110, 0, 7); g.stroke(); });
    drawGuide();
    if (S.shot) bubble(S.shot.x, S.shot.y, R, S.shot.bub.color, S.shot.bub.kind);
    if (S.phase !== "idle") drawShooter();
    g.textAlign = "center"; g.font = "800 20px ui-rounded,'SF Pro Rounded','Nunito',system-ui";
    S.texts.forEach(t => { g.globalAlpha = Math.max(0, 1 - t.t / 1.2); g.fillStyle = t.color; g.strokeStyle = "rgba(6,36,63,.6)"; g.lineWidth = 4; g.strokeText(t.text, t.x, t.y); g.fillText(t.text, t.x, t.y); });
    g.globalAlpha = 1;
    g.restore();
  }

  // ---- sizing + loop ----
  function fit() {
    const vw = Math.max(1, innerWidth), vh = Math.max(1, innerHeight);
    H = Math.max(660, Math.min(900, W * vh / vw)); k = Math.min(vw / W, vh / H); dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = Math.round(W * k * dpr); canvas.height = Math.round(H * k * dpr);
    canvas.style.width = W * k + "px"; canvas.style.height = H * k + "px";
  }
  addEventListener("resize", fit); fit();
  for (let i = 0; i < 28; i++) S.drift.push({ x: Math.random() * W, y: Math.random() * H, r: 1 + Math.random() * 2.5, v: 10 + Math.random() * 25, f: 1 + Math.random(), p: Math.random() * 6 });
  let prev = 0;
  (function loop(t) { const dt = Math.min(0.033, (t - prev) / 1000 || 0.016); prev = t; update(dt); draw(); requestAnimationFrame(loop); })(0);

  function begin(mode, n) {
    Object.assign(S, { mode, level: n || 0, phase: "play", shot: null, misses: 0, score: 0, fishFreed: 0, pearls: 0, slide: 0, pops: [], falls: [], swimmers: [], texts: [], sparks: [], aimLong: 0, endlessCount: 0, aimAngle: -Math.PI / 2 });
    mode === "endless" ? buildEndless() : buildLevel(n);
    S.current = nextBubble(); S.next = nextBubble();
    fire("hud");
  }

  return {
    on: (n, f) => listeners[n] = f, begin, arm, swap, shoot, update, draw, trace, snapCell, levelSpec,
    pause() { if (S.phase === "play") S.phase = "paused"; },
    resume() { if (S.phase === "paused") S.phase = "play"; },
    moreShots(n) { S.shots += n; S.phase = "play"; fire("hud"); },
    rescue() { for (let i = 0; i < 3; i++) S.grid.pop(); S.phase = "play"; fire("hud"); },   // revive after the reef reaches the line
    stop() { S.phase = "idle"; S.grid = []; S.current = S.next = null; },
    aimAt(a) { S.aimAngle = a; },
    get state() { return S; }
  };
})();
window.Game = Reef;

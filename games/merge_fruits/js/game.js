/* ==========================================================================
   MERGE FRUITS — core game
   ========================================================================== */
(() => {
  const C = window.GAME_CONFIG;
  const N = C.gridSize;
  const MAX = C.tiers.length;
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];

  // ---------- storage ------------------------------------------------------
  const KEY = "mf_";
  const store = {
    get(k, d) { try { const v = localStorage.getItem(KEY + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(KEY + k, JSON.stringify(v)); } catch (e) {} }
  };

  // ---------- art loading (image → emoji fallback) -------------------------
  const loaded = {}; // url -> true/false
  function probe(url) {
    return new Promise(res => {
      if (!url) return res(false);
      const img = new Image();
      const done = ok => { loaded[url] = ok; res(ok); };
      img.onload = () => done(img.naturalWidth > 0);
      img.onerror = () => done(false);
      setTimeout(() => done(false), 4000);
      img.src = url;
    });
  }
  const hasImg = url => !!(url && loaded[url]);

  function art(key, cls = "") {
    const a = C.art[key] || {};
    if (hasImg(a.image)) return `<img class="art-img ${cls}" src="${a.image}" alt="" draggable="false">`;
    return `<span class="art-emoji ${cls}">${a.emoji || ""}</span>`;
  }
  function tierArt(tier, cls = "") {
    const t = C.tiers[tier - 1];
    if (hasImg(t.image)) return `<img class="art-img ${cls}" src="${t.image}" alt="${t.name}" draggable="false">`;
    return `<span class="art-emoji ${cls}">${t.emoji}</span>`;
  }

  // ---------- color helpers -----------------------------------------------
  function mix(hex, amt) { // amt > 0 lighten, < 0 darken
    const n = parseInt(hex.slice(1), 16);
    let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const t = amt < 0 ? 0 : 255, p = Math.abs(amt);
    r = Math.round((t - r) * p + r); g = Math.round((t - g) * p + g); b = Math.round((t - b) * p + b);
    return `rgb(${r},${g},${b})`;
  }
  function tileStyle(tier) {
    const c = C.tiers[tier - 1].color;
    return `--c:${c};--c-hi:${mix(c, 0.4)};--c-lo:${mix(c, -0.32)};--c-mid:${mix(c, -0.08)}`;
  }

  // ---------- icons --------------------------------------------------------
  const ICON = {
    pause: '<svg viewBox="0 0 24 24"><rect x="6" y="4" width="4.5" height="16" rx="1.5"/><rect x="13.5" y="4" width="4.5" height="16" rx="1.5"/></svg>',
    gear: '<svg viewBox="0 0 24 24"><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm8.9 4.7-1.7-.3a7.6 7.6 0 0 1-.7 1.7l1 1.4a1 1 0 0 1-.1 1.3l-1.2 1.2a1 1 0 0 1-1.3.1l-1.4-1a7.6 7.6 0 0 1-1.7.7l-.3 1.7a1 1 0 0 1-1 .8h-1.7a1 1 0 0 1-1-.8l-.3-1.7a7.6 7.6 0 0 1-1.7-.7l-1.4 1a1 1 0 0 1-1.3-.1L4 17.3a1 1 0 0 1-.1-1.3l1-1.4a7.6 7.6 0 0 1-.7-1.7l-1.7-.3a1 1 0 0 1-.8-1v-1.7a1 1 0 0 1 .8-1l1.7-.3c.2-.6.4-1.2.7-1.7l-1-1.4A1 1 0 0 1 4 4.2L5.2 3a1 1 0 0 1 1.3-.1l1.4 1a7.6 7.6 0 0 1 1.7-.7L9.9 1.5a1 1 0 0 1 1-.8h1.7a1 1 0 0 1 1 .8l.3 1.7c.6.2 1.2.4 1.7.7l1.4-1a1 1 0 0 1 1.3.1L19.5 4a1 1 0 0 1 .1 1.3l-1 1.4c.3.5.5 1.1.7 1.7l1.7.3a1 1 0 0 1 .8 1v1.7a1 1 0 0 1-.8 1Z"/></svg>',
    home: '<svg viewBox="0 0 24 24"><path d="M3 11.2 12 3.5l9 7.7V20a1.5 1.5 0 0 1-1.5 1.5H15v-6h-6v6H4.5A1.5 1.5 0 0 1 3 20Z"/></svg>',
    restart: '<svg viewBox="0 0 24 24"><path d="M12 4.5V1L7 6l5 5V7.5a5.5 5.5 0 1 1-5.5 5.5H3.5A8.5 8.5 0 1 0 12 4.5Z"/></svg>',
    play: '<svg viewBox="0 0 24 24"><path d="M7 4.5v15a1 1 0 0 0 1.5.9l12-7.5a1 1 0 0 0 0-1.8l-12-7.5A1 1 0 0 0 7 4.5Z"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M6.3 4.2 12 9.9l5.7-5.7 2.1 2.1-5.7 5.7 5.7 5.7-2.1 2.1-5.7-5.7-5.7 5.7-2.1-2.1 5.7-5.7-5.7-5.7Z"/></svg>'
  };

  // ---------- state --------------------------------------------------------
  let grid, score, maxTier, history, over, won, revived, busy = false, mode = null, swapPick = null;
  let nextId = 1;
  const settings = Object.assign({ sound: true, music: true, vibe: true }, store.get("settings", {}));
  let best = store.get("best", 0);
  let coins = store.get("coins", C.economy.startCoins);
  let discovered = store.get("discovered", 2);
  let gamesPlayed = store.get("games", 0);
  const powerups = store.get("powerups", null) ||
    Object.fromEntries(Object.entries(C.powerups).map(([k, v]) => [k, v.start]));
  Sound.setSfx(settings.sound);
  Sound.setMusic(settings.music);

  const board = $("#board"), tilesLayer = $("#tiles"), cellsLayer = $("#cells");
  const tileEls = new Map();
  let geo = { cell: 0, gap: 0 };

  const emptyGrid = () => Array.from({ length: N }, () => Array(N).fill(null));
  const newTile = (tier, r, c) => ({ id: nextId++, tier, r, c });
  const forEachTile = fn => grid && grid.forEach(row => row.forEach(t => t && fn(t)));
  const vibrate = ms => { if (C.vibration && settings.vibe && navigator.vibrate) navigator.vibrate(ms); };

  // ---------- layout -------------------------------------------------------
  function layout() {
    const area = $("#board-area");
    const size = Math.floor(Math.min(area.clientWidth, area.clientHeight, 560));
    if (!size) return;
    board.style.width = board.style.height = size + "px";
    const pad = size * 0.035;
    geo.gap = size * 0.025;
    geo.pad = pad;
    geo.cell = (size - pad * 2 - geo.gap * (N - 1)) / N;
    board.style.setProperty("--cell", geo.cell + "px");
    board.style.fontSize = geo.cell / 10 + "px";
    if (!cellsLayer.children.length) {
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const d = document.createElement("div"); d.className = "cell"; d.dataset.r = r; d.dataset.c = c;
        cellsLayer.appendChild(d);
      }
    }
    [...cellsLayer.children].forEach(d => { d.style.transform = xy(+d.dataset.r, +d.dataset.c); });
    tilesLayer.classList.add("no-anim");
    tileEls.forEach((el, id) => { const t = findTile(id); if (t) el.style.transform = xy(t.r, t.c); });
    tilesLayer.offsetWidth; // flush
    tilesLayer.classList.remove("no-anim");
  }
  const posOf = (r, c) => ({ x: geo.pad + c * (geo.cell + geo.gap), y: geo.pad + r * (geo.cell + geo.gap) });
  const xy = (r, c) => { const p = posOf(r, c); return `translate(${p.x}px,${p.y}px)`; };
  function screenPos(r, c) {
    const b = board.getBoundingClientRect(), p = posOf(r, c);
    return { x: b.left + p.x + geo.cell / 2, y: b.top + p.y + geo.cell / 2 };
  }
  function findTile(id) { let f = null; forEachTile(t => { if (t.id === id) f = t; }); return f; }

  // ---------- tile DOM -----------------------------------------------------
  function makeEl(t, anim) {
    const el = document.createElement("div");
    el.className = "tile";
    el.innerHTML = `<div class="tile-body ${C.tiers[t.tier - 1].legendary ? "legendary" : ""} ${anim || ""}" style="${tileStyle(t.tier)}">
      <i class="gloss"></i><div class="tile-art">${tierArt(t.tier)}</div>
      ${C.showTierNumbers ? `<b class="num">${2 ** t.tier}</b>` : ""}</div>`;
    el.style.transform = xy(t.r, t.c);
    el.dataset.id = t.id;
    tilesLayer.appendChild(el);
    tileEls.set(t.id, el);
    return el;
  }
  function removeEl(id) { const el = tileEls.get(id); if (el) el.remove(); tileEls.delete(id); }
  function renderAll() {
    tileEls.forEach(el => el.remove()); tileEls.clear();
    forEachTile(t => makeEl(t, "spawn"));
  }

  // ---------- game flow ----------------------------------------------------
  function emptyCells() {
    const out = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!grid[r][c]) out.push([r, c]);
    return out;
  }
  function spawn() {
    const e = emptyCells();
    if (!e.length) return null;
    const [r, c] = e[Math.floor(Math.random() * e.length)];
    const t = newTile(Math.random() < C.spawnTier2Chance ? 2 : 1, r, c);
    grid[r][c] = t;
    makeEl(t, "spawn");
    return t;
  }

  function newGame() {
    grid = emptyGrid(); score = 0; shownScore = 0; maxTier = 1; history = []; over = false; won = false; revived = false;
    tileEls.forEach(el => el.remove()); tileEls.clear();
    spawn(); spawn();
    forEachTile(t => { maxTier = Math.max(maxTier, t.tier); });
    updateHud(); save();
  }

  function snapshot() {
    return { tiles: grid.flat().filter(Boolean).map(t => [t.tier, t.r, t.c]), score, maxTier };
  }
  function restore(s) {
    grid = emptyGrid();
    s.tiles.forEach(([tier, r, c]) => { grid[r][c] = newTile(tier, r, c); });
    score = s.score; maxTier = s.maxTier;
    renderAll();
  }
  function save() {
    store.set("game", over ? null : { ...snapshot(), won, revived });
    store.set("best", best); store.set("coins", coins); store.set("powerups", powerups);
    store.set("discovered", discovered);
  }
  function loadSaved() {
    const s = store.get("game", null);
    if (!s || !s.tiles || !s.tiles.length) return false;
    restore(s); won = !!s.won; revived = !!s.revived; over = false; history = [];
    updateHud();
    return true;
  }

  const DIRS = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] };

  function move(dir) {
    if (busy || over || mode || !grid) return;
    const [dr, dc] = DIRS[dir];
    const rows = [...Array(N).keys()], cols = [...Array(N).keys()];
    if (dr === 1) rows.reverse();
    if (dc === 1) cols.reverse();

    const before = snapshot();
    const mergedIds = new Set();
    const merges = [];
    let moved = false;

    for (const r of rows) for (const c of cols) {
      const t = grid[r][c];
      if (!t) continue;
      let nr = r, nc = c;
      for (;;) {
        const tr = nr + dr, tc = nc + dc;
        if (tr < 0 || tr >= N || tc < 0 || tc >= N) break;
        const o = grid[tr][tc];
        if (!o) { nr = tr; nc = tc; continue; }
        if (o.tier === t.tier && t.tier < MAX && !mergedIds.has(o.id)) { nr = tr; nc = tc; }
        break;
      }
      if (nr === r && nc === c) continue;
      moved = true;
      const o = grid[nr][nc];
      grid[r][c] = null;
      if (o) {
        const nt = newTile(o.tier + 1, nr, nc);
        grid[nr][nc] = nt;
        mergedIds.add(nt.id);
        merges.push({ nt, a: t, b: o });
      } else {
        grid[nr][nc] = t;
      }
      t.r = nr; t.c = nc;
      const el = tileEls.get(t.id);
      if (el) { el.style.transform = xy(nr, nc); el.style.zIndex = 2; }
    }

    if (!moved) { nudge(dir); return; }

    history.push(before);
    if (history.length > C.undoHistory) history.shift();
    busy = true;
    Sound.play("swipe");

    setTimeout(() => {
      let gained = 0, coinGain = 0, topNew = 0;
      merges.forEach(({ nt, a, b }) => {
        removeEl(a.id); removeEl(b.id);
        makeEl(nt, "merged");
        gained += 2 ** nt.tier;
        if (nt.tier >= C.economy.coinsFromTier) coinGain += nt.tier - C.economy.coinsFromTier + 1;
        topNew = Math.max(topNew, nt.tier);
        const p = screenPos(nt.r, nt.c);
        FX.juice(p.x, p.y, C.tiers[nt.tier - 1].color, 0.7 + nt.tier * 0.12);
      });
      tileEls.forEach(el => { el.style.zIndex = ""; });

      if (merges.length) {
        const mult = 1 + (merges.length - 1) * 0.5;
        gained = Math.round(gained * mult);
        score += gained;
        Sound.play("merge", topNew);
        vibrate(merges.length > 1 ? [12, 30, 12] : 12);
        const big = merges.reduce((m, x) => (x.nt.tier > m.nt.tier ? x : m));
        const p = screenPos(big.nt.r, big.nt.c);
        FX.text(p.x, p.y - geo.cell * 0.3, `+${gained}`, "f-score");
        if (merges.length >= 2) combo(merges.length);
        if (topNew >= 8) shake(topNew >= 10 ? "big" : "");
        if (coinGain) {
          coins += coinGain;
          setTimeout(() => { FX.text(p.x, p.y + geo.cell * 0.1, `+${coinGain} ${coinArt()}`, "f-coin"); Sound.play("coin"); }, 180);
        }
        if (topNew > maxTier) maxTier = topNew;
      }

      spawn();
      Sound.play("spawn");
      if (score > best) {
        if (best > 0 && !newBestThisGame) { newBestThisGame = true; bestFlash(); }
        best = score;
      }
      updateHud();
      save();
      busy = false;

      if (topNew > discovered) {
        discovered = topNew; save();
        if (topNew >= 4) setTimeout(() => showUnlock(topNew), 350);
      } else if (topNew === MAX && !won) {
        won = true; save(); setTimeout(() => whenFree(showWin), 400);
      }
      if (!canMove()) { over = true; save(); setTimeout(() => whenFree(showGameOver), 700); }
    }, 115);
  }
  let newBestThisGame = false;

  function canMove() {
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const t = grid[r][c];
      if (!t) return true;
      if (t.tier < MAX) {
        if (c + 1 < N && grid[r][c + 1] && grid[r][c + 1].tier === t.tier) return true;
        if (r + 1 < N && grid[r + 1][c] && grid[r + 1][c].tier === t.tier) return true;
      }
    }
    return false;
  }

  function nudge(dir) {
    board.classList.remove("nudge-up", "nudge-down", "nudge-left", "nudge-right");
    board.offsetWidth;
    board.classList.add("nudge-" + dir);
    Sound.play("error");
  }
  function shake(kind) {
    const g = $("#screen-game");
    g.classList.remove("shake", "shake-big"); g.offsetWidth;
    g.classList.add(kind === "big" ? "shake-big" : "shake");
    vibrate(40);
  }
  function combo(n) {
    const label = C.combos[Math.min(n, Math.max(...Object.keys(C.combos).map(Number)))] || "Combo!";
    const b = board.getBoundingClientRect();
    FX.text(b.left + b.width / 2, b.top + b.height * 0.42, `${label}<small>x${n} COMBO</small>`, "f-combo");
    FX.sparkle(b.left + b.width / 2, b.top + b.height * 0.42, 12, b.width * 0.3);
    Sound.play("combo", n);
  }
  function bestFlash() {
    Sound.play("newbest");
    const el = $("#best").closest(".scorebox");
    el.classList.remove("flash"); el.offsetWidth; el.classList.add("flash");
    const r = el.getBoundingClientRect();
    FX.sparkle(r.left + r.width / 2, r.top + r.height / 2, 10, 30);
  }

  // ---------- HUD ----------------------------------------------------------
  const coinArt = () => art("coin", "inline");
  let shownScore = 0, scoreAnim = null;
  function updateHud() {
    // count-up animation for the score
    cancelAnimationFrame(scoreAnim);
    const from = shownScore, to = score, t0 = performance.now();
    const step = now => {
      const k = Math.min(1, (now - t0) / 300);
      shownScore = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3)));
      $("#score").textContent = shownScore.toLocaleString();
      if (k < 1) scoreAnim = requestAnimationFrame(step);
    };
    scoreAnim = requestAnimationFrame(step);
    $("#best").textContent = best.toLocaleString();
    $$(".coin-count").forEach(e => { e.textContent = coins.toLocaleString(); });
    $("#home-best").textContent = best.toLocaleString();
    // goal: current biggest fruit → next fruit
    const cur = Math.max(1, maxTier || 1), nxt = Math.min(MAX, cur + 1);
    $("#goal-cur").innerHTML = tierArt(cur);
    $("#goal-next").innerHTML = cur >= MAX ? art("trophy") : tierArt(nxt);
    $("#goal-next").classList.toggle("locked", nxt > discovered);
    $("#goal-label").textContent = cur >= MAX ? "Legendary reached!" : `Next: ${C.tiers[nxt - 1].name}`;
    $("#goal-fill").style.width = (cur / MAX) * 100 + "%";
    renderPowerups();
  }

  function renderPowerups() {
    const bar = $("#powerups");
    bar.innerHTML = Object.entries(C.powerups).map(([k, p]) => `
      <button class="pu ${mode === k ? "active" : ""}" data-pu="${k}">
        <span class="pu-ico">${art(k)}</span>
        <span class="pu-badge ${powerups[k] ? "" : "plus"}">${powerups[k] || "+"}</span>
        <span class="pu-label">${p.label}</span>
      </button>`).join("");
  }

  // ---------- power-ups ----------------------------------------------------
  function usePowerup(k) {
    if (busy || over) return;
    Sound.play("click");
    if (mode) { const same = mode === k; cancelMode(); if (same) return; }
    if (!powerups[k]) return showRefill(k);
    if (k === "undo") {
      if (!history.length) { toast("Nothing to undo yet"); return; }
      restore(history.pop()); powerups.undo--; Sound.play("whoosh");
      updateHud(); save();
    } else if (k === "shuffle") {
      if (grid.flat().filter(Boolean).length < 2) return;
      doShuffle(); powerups.shuffle--; updateHud(); save();
    } else {
      mode = k; swapPick = null;
      board.classList.add("targeting");
      $("#mode-text").textContent = k === "hammer" ? "Tap a fruit to smash it" : "Tap two fruits to swap them";
      $("#mode-banner").hidden = false;
      renderPowerups();
    }
  }
  function cancelMode() {
    mode = null; swapPick = null;
    board.classList.remove("targeting");
    $$(".tile.picked").forEach(e => e.classList.remove("picked"));
    $("#mode-banner").hidden = true;
    renderPowerups();
  }
  function onTileTap(id) {
    const t = findTile(id);
    if (!t || !mode) return;
    if (mode === "hammer") {
      const p = screenPos(t.r, t.c);
      const el = tileEls.get(id);
      el.classList.add("smashed");
      FX.smash(p.x, p.y, C.tiers[t.tier - 1].color);
      Sound.play("smash"); vibrate(50); shake("");
      grid[t.r][t.c] = null; tileEls.delete(id);
      setTimeout(() => el.remove(), 300);
      powerups.hammer--; history = [];
      if (!grid.flat().some(Boolean)) spawn();
      cancelMode(); updateHud(); save();
    } else if (mode === "swap") {
      if (!swapPick) { swapPick = t; tileEls.get(id).classList.add("picked"); Sound.play("click"); return; }
      if (swapPick.id === t.id) { tileEls.get(id).classList.remove("picked"); swapPick = null; return; }
      const a = swapPick, b = t;
      const ar = a.r, ac = a.c;
      a.r = b.r; a.c = b.c; b.r = ar; b.c = ac;
      grid[a.r][a.c] = a; grid[b.r][b.c] = b;
      tileEls.get(a.id).style.transform = xy(a.r, a.c);
      tileEls.get(b.id).style.transform = xy(b.r, b.c);
      Sound.play("whoosh");
      powerups.swap--; history = [];
      cancelMode(); updateHud(); save();
    }
  }
  function doShuffle() {
    const tiles = grid.flat().filter(Boolean);
    const cells = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) cells.push([r, c]);
    for (let i = cells.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [cells[i], cells[j]] = [cells[j], cells[i]]; }
    grid = emptyGrid();
    tiles.forEach((t, i) => { [t.r, t.c] = cells[i]; grid[t.r][t.c] = t; tileEls.get(t.id).style.transform = xy(t.r, t.c); });
    history = [];
    Sound.play("whoosh");
    const b = board.getBoundingClientRect();
    FX.sparkle(b.left + b.width / 2, b.top + b.height / 2, 16, b.width * 0.4);
  }

  // ---------- modals -------------------------------------------------------
  const modalRoot = $("#modal-root");
  function openModal(html, cls = "") {
    closeModal(true);
    modalRoot.innerHTML = `<div class="modal-back"></div><div class="modal ${cls}">${html}</div>`;
    modalRoot.classList.add("open");
    return modalRoot.querySelector(".modal");
  }
  function closeModal(instant) {
    if (!modalRoot.classList.contains("open")) return;
    if (instant) { modalRoot.classList.remove("open"); modalRoot.innerHTML = ""; return; }
    modalRoot.classList.add("closing");
    setTimeout(() => { modalRoot.classList.remove("open", "closing"); modalRoot.innerHTML = ""; }, 180);
  }
  const ribbon = text => hasImg(C.art.ribbon.image)
    ? `<div class="ribbon img" style="background-image:url('${C.art.ribbon.image}')"><span>${text}</span></div>`
    : `<div class="ribbon"><span>${text}</span></div>`;
  const rays = () => hasImg(C.art.rays.image)
    ? `<img class="rays" src="${C.art.rays.image}" alt="">` : `<div class="rays css"></div>`;
  const on = (root, sel, fn) => { const el = root.querySelector(sel); if (el) el.addEventListener("click", () => { Sound.play("click"); fn(el); }); };

  const whenFree = fn => (modalRoot.classList.contains("open") || document.body.classList.contains("ad-open")) ? setTimeout(() => whenFree(fn), 300) : fn();

  function toast(msg) {
    const el = document.createElement("div");
    el.className = "toast"; el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1800);
  }

  function showSettings(inGame) {
    const row = (k, label) => `<button class="toggle ${settings[k] ? "on" : ""}" data-k="${k}"><span>${label}</span><i></i></button>`;
    const m = openModal(`
      ${ribbon(inGame ? "PAUSED" : "SETTINGS")}
      <div class="modal-body">
        ${row("sound", "Sound effects")}${row("music", "Music")}${row("vibe", "Vibration")}
        ${inGame ? `<div class="btn-row">
          <button class="btn btn-orange" id="m-home">${ICON.home}<span>Home</span></button>
          <button class="btn btn-blue" id="m-restart">${ICON.restart}<span>Restart</span></button>
        </div>` : ""}
        <button class="btn btn-green btn-wide" id="m-resume">${inGame ? ICON.play + "<span>Resume</span>" : "<span>Done</span>"}</button>
      </div>`, "settings");
    m.querySelectorAll(".toggle").forEach(b => b.addEventListener("click", () => {
      const k = b.dataset.k; settings[k] = !settings[k]; b.classList.toggle("on", settings[k]);
      store.set("settings", settings);
      Sound.setSfx(settings.sound); Sound.setMusic(settings.music);
      Sound.play("click");
      if (k === "vibe") vibrate(30);
    }));
    on(m, "#m-resume", () => closeModal());
    on(m, "#m-home", () => { closeModal(); showScreen("home"); });
    on(m, "#m-restart", () => { closeModal(); startNew(); });
  }

  function showRefill(k) {
    const p = C.powerups[k];
    const m = openModal(`
      ${ribbon(p.label.toUpperCase())}
      <div class="modal-body center">
        <div class="big-art pop">${art(k)}</div>
        <p class="lead">Out of ${p.label}! Get one more:</p>
        <div class="btn-row">
          <button class="btn btn-orange" id="m-buy" ${coins < p.cost ? "disabled" : ""}>${coinArt()}<span>${p.cost}</span></button>
          <button class="btn btn-green" id="m-ad">${art("video", "inline")}<span>Free</span></button>
        </div>
        <button class="link-btn" id="m-close">No thanks</button>
      </div>`);
    on(m, "#m-buy", () => {
      if (coins < p.cost) return;
      coins -= p.cost; powerups[k]++; Sound.play("coin"); closeModal(); updateHud(); save();
    });
    on(m, "#m-ad", async () => {
      closeModal();
      if (await Ads.showRewarded()) { powerups[k]++; Sound.play("coin"); updateHud(); save(); toast(`+1 ${p.label}`); }
    });
    on(m, "#m-close", () => closeModal());
  }

  function showUnlock(tier) {
    const t = C.tiers[tier - 1];
    const reward = tier * C.economy.unlockReward;
    Sound.play("unlock"); vibrate([20, 40, 20, 40, 60]);
    FX.confetti(90);
    const m = openModal(`
      ${ribbon("NEW FRUIT!")}
      <div class="modal-body center">
        <div class="unlock-stage">${rays()}<div class="big-art pop bob">${tierArt(tier)}</div></div>
        <h2 class="fruit-name">${t.name}</h2>
        <p class="sub">Fruit ${tier} of ${MAX} discovered</p>
        <div class="reward">${coinArt()} +${reward}</div>
        <div class="btn-row">
          <button class="btn btn-orange" id="m-collect"><span>Collect</span></button>
          <button class="btn btn-green" id="m-x3">${art("video", "inline")}<span>x3</span></button>
        </div>
      </div>`, "unlock");
    const finish = amount => {
      coins += amount; Sound.play("coin"); updateHud(); save();
      const b = $("#coins").getBoundingClientRect();
      FX.sparkle(b.left + b.width / 2, b.top + b.height / 2, 10, 20);
      if (tier === MAX && !won) { won = true; save(); setTimeout(() => whenFree(showWin), 300); }
    };
    on(m, "#m-collect", () => { closeModal(); finish(reward); });
    on(m, "#m-x3", async () => { closeModal(); finish((await Ads.showRewarded()) ? reward * 3 : reward); });
  }

  function showWin() {
    FX.confetti(180); Sound.play("newbest");
    const m = openModal(`
      ${ribbon("LEGENDARY!")}
      <div class="modal-body center">
        <div class="unlock-stage">${rays()}<div class="big-art pop bob">${tierArt(MAX)}</div></div>
        <p class="lead">You grew the ${C.tiers[MAX - 1].name}! Keep going for a monster score.</p>
        <button class="btn btn-green btn-wide" id="m-go">${ICON.play}<span>Keep Playing</span></button>
      </div>`, "unlock");
    on(m, "#m-go", () => closeModal());
  }

  function showGameOver() {
    Sound.play("gameover"); vibrate([30, 60, 30]);
    const isBest = score >= best && score > 0;
    const m = openModal(`
      ${ribbon("NO MOVES!")}
      <div class="modal-body center">
        <div class="final-fruit">${tierArt(maxTier)}</div>
        <div class="final-score"><small>SCORE</small><b>${score.toLocaleString()}</b></div>
        ${isBest ? `<div class="new-best">${art("star", "inline")} NEW BEST! ${art("star", "inline")}</div>`
                 : `<div class="final-best">${art("trophy", "inline")} Best ${best.toLocaleString()}</div>`}
        ${!revived ? `<button class="btn btn-green btn-wide pulse" id="m-revive">${art("video", "inline")}<span>Revive</span><small>clear ${C.economy.reviveRemoves} fruits</small></button>` : ""}
        <div class="btn-row">
          <button class="btn btn-orange" id="m-home">${ICON.home}<span>Home</span></button>
          <button class="btn btn-blue" id="m-again">${ICON.restart}<span>Again</span></button>
        </div>
      </div>`, "gameover");
    if (isBest) FX.confetti(80);
    on(m, "#m-revive", async () => {
      closeModal();
      if (await Ads.showRewarded()) revive();
      else showGameOver();
    });
    on(m, "#m-again", () => { closeModal(); afterGame(startNew); });
    on(m, "#m-home", () => { closeModal(); afterGame(() => showScreen("home")); });
  }

  function revive() {
    revived = true; over = false;
    const tiles = grid.flat().filter(Boolean).sort((a, b) => a.tier - b.tier).slice(0, C.economy.reviveRemoves);
    tiles.forEach((t, i) => setTimeout(() => {
      const p = screenPos(t.r, t.c);
      FX.smash(p.x, p.y, C.tiers[t.tier - 1].color); Sound.play("smash");
      grid[t.r][t.c] = null; removeEl(t.id);
    }, i * 120));
    setTimeout(() => { history = []; save(); }, tiles.length * 120 + 50);
  }

  async function afterGame(next) {
    gamesPlayed++; store.set("games", gamesPlayed);
    if (C.ads.interstitialEveryGames && gamesPlayed % C.ads.interstitialEveryGames === 0) await Ads.showInterstitial();
    next();
  }

  // ---------- daily reward -------------------------------------------------
  const ymd = d => d.toLocaleDateString("en-CA");
  const today = () => ymd(new Date());
  function dailyState() {
    const d = store.get("daily", { last: null, streak: 0 });
    const t = today();
    const y = ymd(new Date(Date.now() - 864e5));
    const available = d.last !== t;
    const day = available ? (d.last === y ? (d.streak % C.economy.dailyRewards.length) : 0) : (d.streak - 1) % C.economy.dailyRewards.length;
    return { ...d, available, day };
  }
  function refreshDailyDot() { $("#daily-dot").hidden = !dailyState().available; }

  function showDaily() {
    const st = dailyState();
    const days = C.economy.dailyRewards.map((r, i) => `
      <div class="day ${i < st.day || (!st.available && i === st.day) ? "done" : ""} ${i === st.day && st.available ? "today" : ""} ${i === C.economy.dailyRewards.length - 1 ? "big" : ""}">
        <small>Day ${i + 1}</small>${coinArt()}<b>${r}</b></div>`).join("");
    const reward = C.economy.dailyRewards[st.day];
    const m = openModal(`
      ${ribbon("DAILY GIFT")}
      <div class="modal-body center">
        <div class="unlock-stage small">${st.available ? rays() : ""}<div class="big-art ${st.available ? "bob" : ""}" id="chest">${art(st.available ? "chestClosed" : "chestOpen")}</div></div>
        <div class="days">${days}</div>
        ${st.available ? `<div class="btn-row">
            <button class="btn btn-orange" id="m-claim"><span>Claim ${reward}</span></button>
            <button class="btn btn-green" id="m-x2">${art("video", "inline")}<span>x2</span></button>
          </div>` : `<p class="lead">Come back tomorrow for Day ${((st.day + 1) % C.economy.dailyRewards.length) + 1}!</p>
          <button class="btn btn-green btn-wide" id="m-close"><span>OK</span></button>`}
      </div>`, "daily");
    const claim = amount => {
      store.set("daily", { last: today(), streak: st.day + 1 });
      coins += amount; save(); updateHud(); refreshDailyDot();
      Sound.play("unlock"); FX.confetti(70);
      const c = m.querySelector("#chest");
      if (c) { c.innerHTML = art("chestOpen"); c.classList.add("pop"); const r = c.getBoundingClientRect(); FX.sparkle(r.left + r.width / 2, r.top + r.height / 2, 16, 50); }
      FX.text(innerWidth / 2, innerHeight * 0.45, `+${amount} ${coinArt()}`, "f-coin big");
      setTimeout(() => closeModal(), 1100);
    };
    on(m, "#m-claim", () => claim(reward));
    on(m, "#m-x2", async () => { const ok = await Ads.showRewarded(); claim(ok ? reward * 2 : reward); });
    on(m, "#m-close", () => closeModal());
  }

  // ---------- screens ------------------------------------------------------
  function showScreen(name) {
    $$(".screen").forEach(s => s.classList.toggle("active", s.id === "screen-" + name));
    if (name === "game") requestAnimationFrame(layout);
    if (name === "home") {
      buildHome();
      const hasSave = !!store.get("game", null);
      $("#btn-play span").textContent = hasSave ? "CONTINUE" : "PLAY";
      $("#btn-new").hidden = !hasSave;
      refreshDailyDot();
      updateHomeHud();
    }
  }
  function updateHomeHud() {
    $$(".coin-count").forEach(e => { e.textContent = coins.toLocaleString(); });
    $("#home-best").textContent = best.toLocaleString();
  }
  function startNew() { cancelMode(); newBestThisGame = false; showScreen("game"); requestAnimationFrame(() => { layout(); newGame(); }); }
  function continueGame() {
    cancelMode(); showScreen("game");
    requestAnimationFrame(() => { layout(); if (!loadSaved()) newGame(); newBestThisGame = false; });
  }

  function buildHome() {
    const logo = C.art.logo;
    $("#logo-wrap").innerHTML = hasImg(logo.image)
      ? `<img class="logo-img" src="${logo.image}" alt="${C.title}">`
      : `<h1 class="logo-css">${C.titleLines.map((l, i) => `<span class="l${i}">${[...l].map((ch, j) => `<i style="--i:${j}">${ch}</i>`).join("")}</span>`).join("")}</h1>`;
    $("#parade").innerHTML = C.tiers.map((t, i) =>
      `<div class="parade-item ${i + 1 > discovered ? "locked" : ""}" style="--i:${i};${tileStyle(i + 1)}">${tierArt(i + 1)}</div>`).join("");
    // background image if provided
    const wide = innerWidth > innerHeight && hasImg(C.art.backgroundWide.image) ? C.art.backgroundWide.image : null;
    const bg = wide || (hasImg(C.art.background.image) ? C.art.background.image : null);
    if (bg) { $("#bg").style.backgroundImage = `url('${bg}')`; $("#bg").classList.add("has-img"); }
  }

  // ---------- input --------------------------------------------------------
  function bindInput() {
    const area = $("#screen-game");
    let sx = 0, sy = 0, tracking = false, fired = false;
    area.addEventListener("pointerdown", e => {
      if (e.target.closest("button, .modal")) return;
      sx = e.clientX; sy = e.clientY; tracking = true; fired = false;
    });
    area.addEventListener("pointermove", e => {
      if (!tracking || fired || mode) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.max(Math.abs(dx), Math.abs(dy)) > 28) {
        fired = true;
        move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
      }
    });
    const end = e => {
      if (!tracking) return;
      tracking = false;
      if (mode && !fired) {
        const tile = document.elementFromPoint(e.clientX, e.clientY)?.closest(".tile");
        if (tile) onTileTap(+tile.dataset.id);
      }
    };
    area.addEventListener("pointerup", end);
    area.addEventListener("pointercancel", () => { tracking = false; });

    window.addEventListener("keydown", e => {
      if (!$("#screen-game").classList.contains("active") || modalRoot.classList.contains("open")) return;
      const k = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", w: "up", s: "down", a: "left", d: "right" }[e.key];
      if (k) { e.preventDefault(); move(k); }
      if (e.key === "Escape") mode ? cancelMode() : showSettings(true);
      if (e.key === "z" && (e.ctrlKey || e.metaKey)) usePowerup("undo");
    });

    $("#powerups").addEventListener("click", e => { const b = e.target.closest("[data-pu]"); if (b) usePowerup(b.dataset.pu); });
    $("#mode-cancel").addEventListener("click", () => { Sound.play("click"); cancelMode(); });
    $("#btn-pause").addEventListener("click", () => { Sound.play("click"); showSettings(true); });
    $("#btn-home-settings").addEventListener("click", () => { Sound.play("click"); showSettings(false); });
    $("#btn-play").addEventListener("click", () => { Sound.play("click"); continueGame(); });
    $("#btn-new").addEventListener("click", () => { Sound.play("click"); store.set("game", null); startNew(); });
    $("#btn-daily").addEventListener("click", () => { Sound.play("click"); showDaily(); });
    window.addEventListener("resize", () => { if ($("#screen-game").classList.contains("active")) layout(); });
    document.addEventListener("visibilitychange", () => { if (document.hidden && grid) save(); });
  }

  // ---------- boot ---------------------------------------------------------
  async function boot() {
    $("#btn-pause").innerHTML = ICON.pause;
    $("#btn-home-settings").innerHTML = ICON.gear;
    $("#mode-cancel").innerHTML = ICON.close;
    $("#btn-play").innerHTML = ICON.play + "<span>PLAY</span>";

    const urls = [...C.tiers.map(t => t.image), ...Object.values(C.art).map(a => a.image)].filter(Boolean);
    let done = 0;
    await Promise.all(urls.map(u => probe(u).then(() => {
      done++; $("#load-fill").style.width = (done / urls.length) * 100 + "%";
    })));
    if (document.fonts && document.fonts.ready) await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1500))]);

    $$("[data-art]").forEach(el => { el.innerHTML = art(el.dataset.art, "inline"); });
    buildHome();
    bindInput();
    grid = null;
    showScreen("home");
    updateHomeHud();
  }

  boot();
})();

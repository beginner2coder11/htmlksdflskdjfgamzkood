/* ==========================================================================
   UI — screens, adventure map, HUD, modals, economy, shop, daily gift,
   tutorial. Drives Play (the board) through its callbacks.
   ========================================================================== */
(() => {
  const C = window.GAME_CONFIG, K = window.Skins, E = window.Engine;
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];

  // ---------- storage ------------------------------------------------------
  const store = {
    get(k, d) { try { const v = localStorage.getItem("bb_" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("bb_" + k, JSON.stringify(v)); } catch (e) {} }
  };

  // ---------- art ----------------------------------------------------------
  const loaded = {};
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

  const ICON = {
    pause: '<svg viewBox="0 0 24 24"><rect x="6" y="4" width="4.5" height="16" rx="1.5"/><rect x="13.5" y="4" width="4.5" height="16" rx="1.5"/></svg>',
    gear: '<svg viewBox="0 0 24 24"><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm8.9 4.7-1.7-.3a7.6 7.6 0 0 1-.7 1.7l1 1.4a1 1 0 0 1-.1 1.3l-1.2 1.2a1 1 0 0 1-1.3.1l-1.4-1a7.6 7.6 0 0 1-1.7.7l-.3 1.7a1 1 0 0 1-1 .8h-1.7a1 1 0 0 1-1-.8l-.3-1.7a7.6 7.6 0 0 1-1.7-.7l-1.4 1a1 1 0 0 1-1.3-.1L4 17.3a1 1 0 0 1-.1-1.3l1-1.4a7.6 7.6 0 0 1-.7-1.7l-1.7-.3a1 1 0 0 1-.8-1v-1.7a1 1 0 0 1 .8-1l1.7-.3c.2-.6.4-1.2.7-1.7l-1-1.4A1 1 0 0 1 4 4.2L5.2 3a1 1 0 0 1 1.3-.1l1.4 1a7.6 7.6 0 0 1 1.7-.7L9.9 1.5a1 1 0 0 1 1-.8h1.7a1 1 0 0 1 1 .8l.3 1.7c.6.2 1.2.4 1.7.7l1.4-1a1 1 0 0 1 1.3.1L19.5 4a1 1 0 0 1 .1 1.3l-1 1.4c.3.5.5 1.1.7 1.7l1.7.3a1 1 0 0 1 .8 1v1.7a1 1 0 0 1-.8 1Z"/></svg>',
    home: '<svg viewBox="0 0 24 24"><path d="M3 11.2 12 3.5l9 7.7V20a1.5 1.5 0 0 1-1.5 1.5H15v-6h-6v6H4.5A1.5 1.5 0 0 1 3 20Z"/></svg>',
    restart: '<svg viewBox="0 0 24 24"><path d="M12 4.5V1L7 6l5 5V7.5a5.5 5.5 0 1 1-5.5 5.5H3.5A8.5 8.5 0 1 0 12 4.5Z"/></svg>',
    play: '<svg viewBox="0 0 24 24"><path d="M7 4.5v15a1 1 0 0 0 1.5.9l12-7.5a1 1 0 0 0 0-1.8l-12-7.5A1 1 0 0 0 7 4.5Z"/></svg>',
    back: '<svg viewBox="0 0 24 24"><path d="M15.5 3.5 7 12l8.5 8.5 2.1-2.1L11.2 12l6.4-6.4Z"/></svg>',
    next: '<svg viewBox="0 0 24 24"><path d="M8.5 3.5 17 12l-8.5 8.5-2.1-2.1 6.4-6.4-6.4-6.4Z"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M6.3 4.2 12 9.9l5.7-5.7 2.1 2.1-5.7 5.7 5.7 5.7-2.1 2.1-5.7-5.7-5.7 5.7-2.1-2.1 5.7-5.7-5.7-5.7Z"/></svg>',
    map: '<svg viewBox="0 0 24 24"><path d="M9 3 3 5.5v15.5l6-2.5 6 2.5 6-2.5V3l-6 2.5Zm0 2.2 6 2.5v11.1l-6-2.5Z"/></svg>',
    star: '<svg viewBox="0 0 24 24"><path d="m12 2 3 6.6 7.2.8-5.4 4.9 1.5 7.1L12 17.8l-6.3 3.6 1.5-7.1L1.8 9.4 9 8.6Z"/></svg>'
  };

  // ---------- persistent state --------------------------------------------
  const settings = Object.assign({ sound: true, music: true, vibe: true }, store.get("settings", {}));
  let coins = store.get("coins", C.economy.startCoins);
  let best = store.get("best", 0);
  let gamesPlayed = store.get("games", 0);
  const powerups = Object.assign(Object.fromEntries(Object.entries(C.powerups).map(([k, v]) => [k, v.start])), store.get("powerups", {}));
  const stars = store.get("stars", {});           // level -> 1..3
  const owned = new Set(store.get("skins", C.skins.filter(s => !s.price).map(s => s.id)));
  let skin = store.get("skin", "classic");
  const save = () => {
    store.set("coins", coins); store.set("best", best); store.set("powerups", powerups);
    store.set("stars", stars); store.set("skins", [...owned]); store.set("skin", skin);
  };
  const unlockedLevel = () => Math.min(C.adventure.levels, Object.keys(stars).reduce((m, k) => Math.max(m, +k), 0) + 1);

  Sound.setSfx(settings.sound); Sound.setMusic(settings.music);
  Play.setSkin(skin);

  // ---------- session ------------------------------------------------------
  let mode = "classic", level = null, revived = false, newBestShown = false, gemsShown = 0, pendingTarget = null;

  // ---------- modals -------------------------------------------------------
  const modalRoot = $("#modal-root");
  let closeTimer = 0;
  function openModal(html, cls = "") {
    clearTimeout(closeTimer); // a modal opened right after another closes must not be wiped
    modalRoot.classList.remove("closing");
    modalRoot.innerHTML = `<div class="modal-back"></div><div class="modal ${cls}">${html}</div>`;
    modalRoot.classList.add("open");
    return modalRoot.querySelector(".modal");
  }
  function closeModal() {
    if (!modalRoot.classList.contains("open")) return;
    modalRoot.classList.add("closing");
    closeTimer = setTimeout(() => { modalRoot.classList.remove("open", "closing"); modalRoot.innerHTML = ""; }, 180);
  }
  const ribbon = text => hasImg(C.art.ribbon.image)
    ? `<div class="ribbon img" style="background-image:url('${C.art.ribbon.image}')"><span>${text}</span></div>`
    : `<div class="ribbon"><span>${text}</span></div>`;
  const rays = () => hasImg(C.art.rays.image) ? `<img class="rays" src="${C.art.rays.image}" alt="">` : `<div class="rays css"></div>`;
  const on = (root, sel, fn) => { const el = root.querySelector(sel); if (el) el.addEventListener("click", () => { Sound.play("click"); fn(el); }); };
  const coinArt = () => art("coin", "inline");
  function toast(msg) {
    const el = document.createElement("div");
    el.className = "toast"; el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1800);
  }
  const vibrate = ms => { if (C.vibration && settings.vibe && navigator.vibrate) navigator.vibrate(ms); };

  // ---------- HUD ----------------------------------------------------------
  let shown = 0, scoreRaf = 0;
  function countScore(to) {
    cancelAnimationFrame(scoreRaf);
    const from = shown, t0 = performance.now();
    const step = t => {
      const k = Math.min(1, (t - t0) / 350);
      shown = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3)));
      $("#score").textContent = shown.toLocaleString();
      if (k < 1) scoreRaf = requestAnimationFrame(step);
    };
    scoreRaf = requestAnimationFrame(step);
  }
  function refreshCoins() { $$(".coin-count").forEach(e => { e.textContent = coins.toLocaleString(); }); }

  function moveStars(moves, par) { return moves <= par ? 3 : moves <= Math.ceil(par * 1.35) ? 2 : 1; }

  function updateHud(S) {
    if (!S) return;
    countScore(S.score);
    if (mode === "classic") {
      if (S.score > best) {
        if (best > 0 && !newBestShown) { newBestShown = true; Sound.play("newbest"); bump("#best-wrap"); FX.text(innerWidth / 2, 120, "NEW BEST!", "f-best"); }
        best = S.score; save();
      }
      $("#best").textContent = best.toLocaleString();
    } else {
      const L = level;
      if (L.type === "gems") {
        $("#goal-count").textContent = Math.max(0, gemsShown);
      } else {
        $("#goal-count").textContent = `${Math.min(S.score, L.target).toLocaleString()}/${L.target.toLocaleString()}`;
        $("#goal-fill").style.width = Math.min(100, (S.score / L.target) * 100) + "%";
      }
      const st = moveStars(S.moves, L.par);
      $$("#move-stars i").forEach((el, i) => el.classList.toggle("off", i >= st));
      $("#moves").textContent = S.moves;
    }
    renderPowerups();
  }
  function bump(sel) { const el = $(sel); if (!el) return; el.classList.remove("bump"); el.offsetWidth; el.classList.add("bump"); }

  function renderPowerups() {
    const t = Play.target;
    $("#powerups").innerHTML = Object.entries(C.powerups).map(([k, p]) => `
      <button class="pu ${t === k ? "active" : ""}" data-pu="${k}">
        <span class="pu-ico">${art(k)}</span>
        <span class="pu-badge ${powerups[k] ? "" : "plus"}">${powerups[k] || "+"}</span>
        <span class="pu-label">${p.label}</span>
      </button>`).join("");
  }

  function showComboBadge(n) {
    const el = $("#combo-badge");
    if (n >= 2) {
      el.innerHTML = `<span>COMBO</span><b>x${n}</b>`;
      el.hidden = false; el.classList.remove("pop"); el.offsetWidth; el.classList.add("pop");
    } else el.hidden = true;
  }

  // ---------- Play callbacks ----------------------------------------------
  Play.on.vibeOn = () => settings.vibe;
  Play.on.change = S => { updateHud(S); if (mode === "classic") store.set("game", Play.serialize()); };
  Play.on.score = (gain, x, y, lines) => { if (gain) FX.text(x, y, `+${gain}`, lines ? "f-score big" : "f-score"); };
  Play.on.comboLost = () => showComboBadge(0);
  Play.on.dragStart = () => hideHand();
  Play.on.powerUsed = k => { powerups[k]--; save(); setTarget(null); };

  Play.on.clear = ({ lines, combo, allClear, gems }) => {
    const c = Play.boardScreen();
    showComboBadge(combo);
    const word = C.praise[Math.min(lines, 5)];
    if (lines >= 2 || (lines && combo >= 3)) {
      const lvl = Math.max(lines, Math.min(5, combo - 1));
      setTimeout(() => {
        FX.text(c.x, c.y - 30, `${C.praise[Math.min(lvl, 5)] || word}`, `f-praise p${Math.min(lvl, 5)}`);
        Sound.play("praise", lvl);
        FX.sparkle(c.x, c.y - 30, 14, 120);
      }, 200);
    }
    if (combo >= 2) setTimeout(() => FX.text(c.x, c.y + 40, `COMBO x${combo}`, "f-combo"), 320);
    if (allClear) {
      setTimeout(() => { FX.text(c.x, c.y, "PERFECT!", "f-praise p5"); FX.confetti(150); Sound.play("win"); }, 450);
    }
    if (lines && mode === "classic") {
      const gain = lines * C.economy.coinsPerLines * Math.max(1, combo);
      coins += gain; save();
      setTimeout(() => FX.fly(c.x, c.y, $("#coins"), coinArt(), () => { refreshCoins(); bump("#coins"); Sound.play("coin"); }), 250);
    }
    gems.forEach((g, i) => setTimeout(() => {
      FX.fly(g.x, g.y, $("#goal-gem"), art("gem"), () => {
        gemsShown--; $("#goal-count").textContent = Math.max(0, gemsShown);
        bump("#goal-gem"); Sound.play("gem"); vibrate(8);
      });
    }, g.delay + i * 60));
  };

  Play.on.over = S => {
    store.set("game", null);
    if (mode === "classic") showGameOver(S); else showFail(S);
  };
  Play.on.win = S => showWin(S);

  // ---------- power-ups ----------------------------------------------------
  function setTarget(k) {
    pendingTarget = k;
    const b = $("#target-banner");
    if (k) {
      $("#target-text").textContent = k === "bomb" ? "Tap the board to drop a bomb" : "Tap a piece to rotate it";
      b.hidden = false;
    } else { b.hidden = true; Play.cancelTarget(); }
    renderPowerups();
  }
  function usePowerup(k) {
    Sound.play("click");
    if (pendingTarget) { const same = pendingTarget === k; setTarget(null); if (same) return; }
    if (!powerups[k]) return showRefill(k);
    const r = Play.power(k);
    if (r === "empty") return toast("Nothing to undo yet");
    if (r === "armed") return setTarget(k);
    if (r) { powerups[k]--; save(); renderPowerups(); }
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
    on(m, "#m-buy", () => { coins -= p.cost; powerups[k]++; Sound.play("coin"); save(); refreshCoins(); renderPowerups(); closeModal(); });
    on(m, "#m-ad", async () => { closeModal(); if (await Ads.showRewarded()) { powerups[k]++; save(); renderPowerups(); toast(`+1 ${p.label}`); Sound.play("coin"); } });
    on(m, "#m-close", closeModal);
  }

  // ---------- game start ---------------------------------------------------
  function enterGame() {
    showScreen("game");
    $("#hud-classic").hidden = mode !== "classic";
    $("#hud-adv").hidden = mode === "classic";
    $("#adv-bar").hidden = mode === "classic";
    showComboBadge(0);
    setTarget(null);   // also renders the power-up bar before the board is measured
    revived = false; newBestShown = false; shown = 0;
  }
  function startClassic(resume) {
    mode = "classic"; level = null;
    enterGame();
    const saved = resume ? store.get("game", null) : null;
    if (!resume) store.set("game", null);
    setTimeout(() => {
      Play.start({ mode: "classic", saved });
      if (!store.get("tutorial", false)) setTimeout(showHand, 700);
    });
  }
  function startLevel(n) {
    mode = "adventure";
    level = E.genLevel(n, C.gridSize, C.colors.length);
    gemsShown = level.gems;
    enterGame();
    $("#level-num").textContent = n;
    $("#goal-gem").innerHTML = level.type === "gems" ? art("gem") : art("star");
    $("#adv-bar").classList.toggle("score-goal", level.type === "score");
    setTimeout(() => Play.start({ mode: "adventure", level }));
  }

  function showLevelIntro(n) {
    const L = E.genLevel(n, C.gridSize, C.colors.length);
    const goal = L.type === "gems"
      ? `<div class="goal-big">${art("gem")}<b>× ${L.gems}</b></div><p class="lead">Clear lines to collect all the gems!</p>`
      : `<div class="goal-big">${art("star")}<b>${L.target.toLocaleString()}</b></div><p class="lead">Reach the target score!</p>`;
    const m = openModal(`
      ${ribbon("LEVEL " + n)}
      <div class="modal-body center">
        ${goal}
        <div class="star-rules">
          <span><i>${ICON.star}${ICON.star}${ICON.star}</i> ≤ ${L.par} moves</span>
          <span><i>${ICON.star}${ICON.star}</i> ≤ ${Math.ceil(L.par * 1.35)} moves</span>
        </div>
        <button class="btn btn-green btn-wide btn-big" id="m-go">${ICON.play}<span>PLAY</span></button>
        <button class="link-btn" id="m-close">Back</button>
      </div>`, "intro");
    on(m, "#m-go", () => { closeModal(); startLevel(n); });
    on(m, "#m-close", closeModal);
  }

  // ---------- end-of-game modals -------------------------------------------
  async function afterGame(next) {
    gamesPlayed++; store.set("games", gamesPlayed);
    if (C.ads.interstitialEveryGames && gamesPlayed % C.ads.interstitialEveryGames === 0) await Ads.showInterstitial();
    next();
  }

  function showGameOver(S) {
    Sound.play("gameover");
    const isBest = S.score >= best && S.score > 0;
    const m = openModal(`
      ${ribbon("NO SPACE!")}
      <div class="modal-body center">
        <div class="final-score"><small>SCORE</small><b>${S.score.toLocaleString()}</b></div>
        ${isBest ? `<div class="new-best">${art("crown", "inline")} NEW BEST! ${art("crown", "inline")}</div>`
                 : `<div class="final-best">${art("crown", "inline")} Best ${best.toLocaleString()}</div>`}
        ${!revived ? `<button class="btn btn-green btn-wide pulse" id="m-revive">${art("video", "inline")}<span>Continue</span><small>bomb + fresh pieces</small></button>` : ""}
        <div class="btn-row">
          <button class="btn btn-orange" id="m-home">${ICON.home}<span>Home</span></button>
          <button class="btn btn-blue" id="m-again">${ICON.restart}<span>Again</span></button>
        </div>
      </div>`, "gameover");
    if (isBest) FX.confetti(90);
    on(m, "#m-revive", async () => {
      closeModal();
      if (await Ads.showRewarded()) { revived = true; Play.revive(); } else Play.on.over(S);
    });
    on(m, "#m-again", () => { closeModal(); afterGame(() => startClassic(false)); });
    on(m, "#m-home", () => { closeModal(); afterGame(() => showScreen("home")); });
  }

  function showFail(S) {
    Sound.play("gameover");
    const L = level;
    const left = L.type === "gems" ? `${Math.max(0, S.gemsLeft)} ${art("gem", "inline")} left` : `${(L.target - S.score).toLocaleString()} points to go`;
    const m = openModal(`
      ${ribbon("OUT OF SPACE!")}
      <div class="modal-body center">
        <p class="lead big">So close! ${left}</p>
        ${!revived ? `<button class="btn btn-green btn-wide pulse" id="m-revive">${art("video", "inline")}<span>Continue</span><small>bomb + fresh pieces</small></button>` : ""}
        <div class="btn-row">
          <button class="btn btn-orange" id="m-map">${ICON.map}<span>Map</span></button>
          <button class="btn btn-blue" id="m-retry">${ICON.restart}<span>Retry</span></button>
        </div>
      </div>`, "gameover");
    on(m, "#m-revive", async () => { closeModal(); if (await Ads.showRewarded()) { revived = true; Play.revive(); } else Play.on.over(S); });
    on(m, "#m-retry", () => { closeModal(); afterGame(() => startLevel(L.n)); });
    on(m, "#m-map", () => { closeModal(); afterGame(() => showMap()); });
  }

  function showWin(S) {
    const L = level;
    const st = moveStars(S.moves, L.par);
    const prev = stars[L.n] || 0;
    if (st > prev) stars[L.n] = st;
    const reward = C.adventure.starCoins[st - 1];
    save();
    Sound.play("win"); FX.confetti(140); vibrate([30, 50, 30, 50, 80]);
    const m = openModal(`
      ${ribbon("LEVEL CLEAR!")}
      <div class="modal-body center">
        <div class="win-stars">${[0, 1, 2].map(i => `<i class="s${i} ${i < st ? "on" : ""}">${ICON.star}</i>`).join("")}</div>
        <div class="final-score"><small>SCORE</small><b>${S.score.toLocaleString()}</b></div>
        <p class="sub">${S.moves} moves</p>
        <div class="reward">${coinArt()} +${reward}</div>
        <div class="btn-row">
          <button class="btn btn-orange" id="m-collect"><span>Collect</span></button>
          <button class="btn btn-green" id="m-x2">${art("video", "inline")}<span>x2</span></button>
        </div>
      </div>`, "win");
    for (let i = 0; i < st; i++) setTimeout(() => {
      Sound.play("star", i);
      const el = m.querySelector(".s" + i); if (!el) return;
      el.classList.add("lit");
      const r = el.getBoundingClientRect(); FX.sparkle(r.left + r.width / 2, r.top + r.height / 2, 10, 25);
    }, 450 + i * 380);
    const finish = async amount => {
      coins += amount; save(); refreshCoins(); Sound.play("coin");
      closeModal();
      const next = Math.min(C.adventure.levels, L.n + 1);
      afterGame(() => (L.n < C.adventure.levels ? showMap(next) : showMap()));
    };
    on(m, "#m-collect", () => finish(reward));
    on(m, "#m-x2", async () => { const ok = await Ads.showRewarded(); finish(ok ? reward * 2 : reward); });
  }

  // ---------- settings / shop / daily ---------------------------------------
  function showSettings(inGame) {
    const row = (k, label) => `<button class="toggle ${settings[k] ? "on" : ""}" data-k="${k}"><span>${label}</span><i></i></button>`;
    const isAdv = mode === "adventure";
    const m = openModal(`
      ${ribbon(inGame ? "PAUSED" : "SETTINGS")}
      <div class="modal-body">
        ${row("sound", "Sound effects")}${row("music", "Music")}${row("vibe", "Vibration")}
        ${inGame ? `<div class="btn-row">
          <button class="btn btn-orange" id="m-home">${isAdv ? ICON.map : ICON.home}<span>${isAdv ? "Map" : "Home"}</span></button>
          <button class="btn btn-blue" id="m-restart">${ICON.restart}<span>Restart</span></button>
        </div>` : ""}
        <button class="btn btn-green btn-wide" id="m-resume">${inGame ? ICON.play + "<span>Resume</span>" : "<span>Done</span>"}</button>
      </div>`, "settings");
    m.querySelectorAll(".toggle").forEach(b => b.addEventListener("click", () => {
      const k = b.dataset.k; settings[k] = !settings[k]; b.classList.toggle("on", settings[k]);
      store.set("settings", settings);
      Sound.setSfx(settings.sound); Sound.setMusic(settings.music);
      Sound.play("click"); if (k === "vibe") vibrate(30);
    }));
    on(m, "#m-resume", closeModal);
    on(m, "#m-home", () => { closeModal(); Play.stop(); isAdv ? showMap() : showScreen("home"); });
    on(m, "#m-restart", () => { closeModal(); isAdv ? startLevel(level.n) : startClassic(false); });
  }

  function showShop() {
    const skins = [...C.skins];
    if (K.hasCustom()) skins.push({ id: "custom", name: "Custom", price: 0 });
    const m = openModal(`
      ${ribbon("BLOCK SKINS")}
      <div class="modal-body">
        <div class="shop-coins pill">${coinArt()}<b class="coin-count">${coins.toLocaleString()}</b></div>
        <div class="skins">${skins.map(s => `
          <button class="skin ${skin === s.id ? "equipped" : ""} ${owned.has(s.id) || !s.price ? "owned" : ""}" data-skin="${s.id}" data-price="${s.price}">
            <div class="skin-prev" data-prev="${s.id}"></div>
            <b>${s.name}</b>
            <span class="skin-tag">${skin === s.id ? "Equipped" : owned.has(s.id) || !s.price ? "Use" : `${coinArt()} ${s.price}`}</span>
          </button>`).join("")}</div>
        <button class="btn btn-green btn-wide" id="m-close"><span>Done</span></button>
      </div>`, "shop");
    m.querySelectorAll("[data-prev]").forEach(el => el.appendChild(K.preview(el.dataset.prev, 64)));
    m.querySelectorAll("[data-skin]").forEach(b => b.addEventListener("click", () => {
      const id = b.dataset.skin, price = +b.dataset.price;
      if (!owned.has(id) && price) {
        if (coins < price) { Sound.play("invalid"); b.classList.remove("nope"); b.offsetWidth; b.classList.add("nope"); return toast("Not enough coins"); }
        coins -= price; owned.add(id); Sound.play("unlock"); FX.confetti(50);
      } else Sound.play("click");
      skin = id; Play.setSkin(id); save(); refreshCoins(); buildFalling();
      showShop();
    }));
    on(m, "#m-close", closeModal);
  }

  const ymd = d => d.toLocaleDateString("en-CA");
  function dailyState() {
    const d = store.get("daily", { last: null, streak: 0 });
    const today = ymd(new Date()), y = ymd(new Date(Date.now() - 864e5));
    const n = C.economy.dailyRewards.length;
    const available = d.last !== today;
    const day = available ? (d.last === y ? d.streak % n : 0) : (d.streak - 1) % n;
    return { available, day };
  }
  const refreshDailyDot = () => { $("#daily-dot").hidden = !dailyState().available; };
  function showDaily() {
    const st = dailyState(), R = C.economy.dailyRewards;
    const reward = R[st.day];
    const m = openModal(`
      ${ribbon("DAILY GIFT")}
      <div class="modal-body center">
        <div class="unlock-stage">${st.available ? rays() : ""}<div class="big-art ${st.available ? "bob" : ""}" id="chest">${art(st.available ? "chestClosed" : "chestOpen")}</div></div>
        <div class="days">${R.map((r, i) => `<div class="day ${i < st.day || (!st.available && i === st.day) ? "done" : ""} ${i === st.day && st.available ? "today" : ""} ${i === R.length - 1 ? "big" : ""}"><small>Day ${i + 1}</small>${coinArt()}<b>${r}</b></div>`).join("")}</div>
        ${st.available ? `<div class="btn-row"><button class="btn btn-orange" id="m-claim"><span>Claim ${reward}</span></button>
          <button class="btn btn-green" id="m-x2">${art("video", "inline")}<span>x2</span></button></div>`
          : `<p class="lead">Come back tomorrow for Day ${((st.day + 1) % R.length) + 1}!</p><button class="btn btn-green btn-wide" id="m-close"><span>OK</span></button>`}
      </div>`, "daily");
    const claim = amount => {
      store.set("daily", { last: ymd(new Date()), streak: st.day + 1 });
      coins += amount; save(); refreshCoins(); refreshDailyDot();
      Sound.play("unlock"); FX.confetti(70);
      const c = m.querySelector("#chest");
      if (c) { c.innerHTML = art("chestOpen"); c.classList.add("pop"); }
      FX.text(innerWidth / 2, innerHeight * 0.45, `+${amount} ${coinArt()}`, "f-coin big");
      setTimeout(closeModal, 1100);
    };
    on(m, "#m-claim", () => claim(reward));
    on(m, "#m-x2", async () => { const ok = await Ads.showRewarded(); claim(ok ? reward * 2 : reward); });
    on(m, "#m-close", closeModal);
  }

  // ---------- tutorial hand ------------------------------------------------
  let handAnim = null;
  function showHand() {
    const S = Play.state;
    if (!S || store.get("tutorial", false)) return;
    const i = S.tray.findIndex(Boolean);
    if (i < 0) return;
    const from = Play.trayScreen(i), to = Play.boardScreen();
    const h = $("#hand");
    h.innerHTML = art("hand") + `<span>Drag a block onto the board</span>`;
    h.hidden = false;
    handAnim = h.animate([
      { transform: `translate(${from.x}px, ${from.y}px) scale(1)`, opacity: 0 },
      { transform: `translate(${from.x}px, ${from.y}px) scale(.85)`, opacity: 1, offset: 0.15 },
      { transform: `translate(${to.x}px, ${to.y}px) scale(.85)`, opacity: 1, offset: 0.7 },
      { transform: `translate(${to.x}px, ${to.y}px) scale(1)`, opacity: 0 }
    ], { duration: 1900, iterations: Infinity, easing: "ease-in-out" });
  }
  function hideHand() {
    if ($("#hand").hidden) return;
    $("#hand").hidden = true;
    if (handAnim) handAnim.cancel();
    store.set("tutorial", true);
  }

  // ---------- adventure map ------------------------------------------------
  const WORLDS = [
    { name: "Neon Valley", hue: 250 }, { name: "Crystal Caves", hue: 190 }, { name: "Sky Arcade", hue: 320 },
    { name: "Lava Lab", hue: 15 }, { name: "Galaxy Core", hue: 280 }
  ];
  function showMap(focus) {
    showScreen("map");
    const total = C.adventure.levels, cur = unlockedLevel();
    const step = 96, top = 80, width = $("#map-scroll").clientWidth || 360;
    const height = top * 2 + (total - 1) * step;
    const pos = i => ({ x: width / 2 + Math.sin(i * 0.85) * width * 0.28, y: height - top - (i - 1) * step });
    let worlds = "";
    const per = Math.ceil(total / WORLDS.length);
    WORLDS.forEach((w, k) => {
      const first = k * per + 1, last = Math.min(total, (k + 1) * per);
      if (first > total) return;
      const y1 = pos(last).y - step / 2, y2 = pos(first).y + step / 2;
      worlds += `<div class="world" style="top:${y1}px;height:${y2 - y1}px;--h:${w.hue}"><span>${w.name}</span></div>`;
    });
    const pts = []; for (let i = 1; i <= total; i++) { const p = pos(i); pts.push(`${p.x},${p.y}`); }
    let nodes = "";
    for (let i = 1; i <= total; i++) {
      const p = pos(i), s = stars[i] || 0, locked = i > cur;
      nodes += `<button class="node ${locked ? "locked" : ""} ${i === cur ? "current" : ""} ${s ? "done" : ""} ${i % 5 === 0 ? "boss" : ""}" data-lvl="${i}" style="left:${p.x}px;top:${p.y}px">
        ${locked ? `<span class="lk">${art("lock")}</span>` : `<b>${i}</b>`}
        ${s ? `<span class="nstars">${[0, 1, 2].map(k => `<i class="${k < s ? "on" : ""}">${ICON.star}</i>`).join("")}</span>` : ""}
        ${i === cur ? `<span class="you">▼</span>` : ""}
      </button>`;
    }
    $("#map-inner").style.height = height + "px";
    $("#map-inner").innerHTML = worlds +
      `<svg class="path" width="${width}" height="${height}"><polyline points="${pts.join(" ")}"/></svg>` + nodes;
    const totalStars = Object.values(stars).reduce((a, b) => a + b, 0);
    $("#map-stars").textContent = `${totalStars}/${total * 3}`;
    const f = pos(focus || cur);
    requestAnimationFrame(() => { $("#map-scroll").scrollTop = f.y - $("#map-scroll").clientHeight * 0.6; });
    if (focus && focus === cur && focus > 1) setTimeout(() => {
      const el = $(`.node[data-lvl="${focus}"]`); if (el) { el.classList.add("unlocking"); Sound.play("unlock"); }
    }, 400);
  }

  // ---------- home ---------------------------------------------------------
  function buildLogo() {
    const logo = C.art.logo;
    if (hasImg(logo.image)) { $("#logo-wrap").innerHTML = `<img class="logo-img" src="${logo.image}" alt="${C.title}">`; return; }
    const [a, b] = C.titleLines;
    $("#logo-wrap").innerHTML = `<h1 class="logo-css">
      <span class="tiles">${[...a].map((ch, i) => `<i style="--i:${i};--c:${C.colors[(i * 2) % C.colors.length]}">${ch}</i>`).join("")}</span>
      <span class="word">${b}</span></h1>`;
  }
  function buildFalling() {
    const wrap = $("#falling");
    wrap.innerHTML = "";
    for (let i = 0; i < 14; i++) {
      const img = new Image();
      img.src = K.sprite(skin, i % C.colors.length, 64).toDataURL();
      const s = 22 + Math.random() * 34;
      img.style.cssText = `left:${Math.random() * 100}%;width:${s}px;height:${s}px;animation-duration:${9 + Math.random() * 10}s;animation-delay:${-Math.random() * 18}s;opacity:${0.25 + Math.random() * 0.35}`;
      wrap.appendChild(img);
    }
  }
  function refreshHome() {
    $("#home-best").textContent = best.toLocaleString();
    $("#home-level").textContent = unlockedLevel();
    $("#btn-classic small").textContent = store.get("game", null) ? "Continue" : `Best ${best.toLocaleString()}`;
    refreshCoins(); refreshDailyDot();
  }

  function showScreen(name) {
    $$(".screen").forEach(s => s.classList.toggle("active", s.id === "screen-" + name));
    document.body.dataset.screen = name;
    if (name !== "game") { Play.stop(); hideHandSilently(); }
    if (name === "home") refreshHome();
    refreshCoins();
  }
  function hideHandSilently() { $("#hand").hidden = true; if (handAnim) handAnim.cancel(); }

  // ---------- wiring -------------------------------------------------------
  function bind() {
    const click = (sel, fn) => $(sel).addEventListener("click", () => { Sound.play("click"); fn(); });
    click("#btn-classic", () => startClassic(!!store.get("game", null)));
    click("#btn-adventure", () => showMap());
    click("#btn-daily", showDaily);
    click("#btn-shop", showShop);
    click("#btn-home-shop", showShop);
    click("#btn-home-settings", () => showSettings(false));
    click("#btn-pause", () => showSettings(true));
    click("#btn-map-back", () => showScreen("home"));
    click("#target-cancel", () => setTarget(null));
    $("#powerups").addEventListener("click", e => { const b = e.target.closest("[data-pu]"); if (b) usePowerup(b.dataset.pu); });
    $("#map-inner").addEventListener("click", e => {
      const n = e.target.closest(".node"); if (!n) return;
      if (n.classList.contains("locked")) { Sound.play("invalid"); n.classList.remove("nope"); n.offsetWidth; n.classList.add("nope"); return; }
      Sound.play("click"); showLevelIntro(+n.dataset.lvl);
    });
    window.addEventListener("keydown", e => {
      if (e.key !== "Escape") return;
      if (modalRoot.classList.contains("open")) return closeModal();
      if (pendingTarget) return setTarget(null);
      if ($("#screen-game").classList.contains("active")) showSettings(true);
    });
    document.addEventListener("visibilitychange", () => { if (document.hidden && mode === "classic" && Play.state) store.set("game", Play.serialize()); });
  }

  async function boot() {
    $("#btn-pause").innerHTML = ICON.pause;
    $("#btn-home-settings").innerHTML = ICON.gear;
    $("#btn-map-back").innerHTML = ICON.back;
    $("#target-cancel").innerHTML = ICON.close;
    $("#btn-classic .bi").innerHTML = ICON.play;
    $("#btn-adventure .bi").innerHTML = ICON.map;
    $$(".i-star").forEach(e => { e.innerHTML = ICON.star; });

    const urls = [...Object.values(C.art).map(a => a.image), ...(C.blockImages || [])].filter(Boolean);
    let done = 0;
    await Promise.all(urls.map(u => probe(u).then(() => { done++; $("#load-fill").style.width = (done / urls.length) * 100 + "%"; })));
    if (document.fonts && document.fonts.ready) await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1500))]);

    K.loadImages(hasImg);
    if (hasImg(C.art.gem.image)) K.setGemImage(C.art.gem.image);
    if (skin === "custom" && !K.hasCustom()) { skin = "classic"; Play.setSkin(skin); }
    const wide = innerWidth > innerHeight && hasImg(C.art.backgroundWide.image) ? C.art.backgroundWide.image : null;
    const bg = wide || (hasImg(C.art.background.image) ? C.art.background.image : null);
    if (bg) { $("#bg").style.backgroundImage = `url('${bg}')`; $("#bg").classList.add("has-img"); }

    $$("[data-art]").forEach(el => { el.innerHTML = art(el.dataset.art, "inline"); });
    buildLogo(); buildFalling(); bind();
    showScreen("home");
  }
  boot();
})();

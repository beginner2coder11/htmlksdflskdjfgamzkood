/* ==========================================================================
   UI — home, HUD, missions, theme shop, daily gift, power-ups, game over.
   Drives Tower through its callbacks.
   ========================================================================== */
(() => {
  const C = window.GAME_CONFIG, Th = window.Themes;
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];

  // ---------- storage ------------------------------------------------------
  const store = {
    get(k, d) { try { const v = localStorage.getItem("st_" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("st_" + k, JSON.stringify(v)); } catch (e) {} }
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
    tower: '<svg viewBox="0 0 24 24"><path d="M5 18h14v3H5zM6.5 13.5h11v3h-11zM8 9h8v3H8zM9.5 4.5h5v3h-5z"/></svg>'
  };

  // ---------- persistent state --------------------------------------------
  const settings = Object.assign({ sound: true, music: true, vibe: true }, store.get("settings", {}));
  let coins = store.get("coins", C.economy.startCoins);
  let best = store.get("best", 0);
  let gamesPlayed = store.get("games", 0);
  const powerups = Object.assign(Object.fromEntries(Object.entries(C.powerups).map(([k, v]) => [k, v.start])), store.get("powerups", {}));
  const owned = new Set(store.get("themes", C.themes.filter(t => !t.price).map(t => t.id)));
  let theme = store.get("theme", "sunset");
  const ms = Object.assign({ active: [], progress: {}, done: [], ready: [] }, store.get("missions", {}));
  const save = () => {
    store.set("coins", coins); store.set("best", best); store.set("powerups", powerups);
    store.set("themes", [...owned]); store.set("theme", theme); store.set("missions", ms);
  };

  Sound.setSfx(settings.sound); Sound.setMusic(settings.music);
  Tower.setTheme(theme);
  Tower.on.vibeOn = () => settings.vibe;

  // ---------- missions -----------------------------------------------------
  const mById = id => C.missions.find(m => m.id === id);
  function fillMissions() {
    while (ms.active.length < 3) {
      const next = C.missions.find(m => !ms.done.includes(m.id) && !ms.active.includes(m.id));
      if (!next) break;
      ms.active.push(next.id);
    }
  }
  function bumpMission(type, value, mode = "max") {
    let changed = false;
    ms.active.forEach(id => {
      const m = mById(id);
      if (!m || m.type !== type || ms.ready.includes(id)) return;
      const prev = ms.progress[id] || 0;
      const v = mode === "add" ? prev + value : Math.max(prev, value);
      if (v !== prev) { ms.progress[id] = v; changed = true; }
      if (v >= m.goal) { ms.ready.push(id); missionToast(m); }
    });
    if (changed) save();
    refreshMissionDot();
  }
  function missionToast(m) {
    const el = document.createElement("div");
    el.className = "mission-toast";
    el.innerHTML = `${art("check", "inline")}<div><small>MISSION COMPLETE</small><b>${m.text}</b></div>`;
    document.body.appendChild(el);
    Sound.play("unlock");
    setTimeout(() => el.remove(), 2600);
  }
  const refreshMissionDot = () => { const d = $("#missions-dot"); if (d) d.hidden = !ms.ready.length; };

  function showMissions() {
    fillMissions();
    const rows = ms.active.map(id => {
      const m = mById(id), p = Math.min(m.goal, ms.progress[id] || 0), ready = ms.ready.includes(id);
      return `<div class="mission ${ready ? "ready" : ""}">
        <div class="m-txt"><b>${m.text}</b>
          <div class="m-bar"><i style="width:${(p / m.goal) * 100}%"></i><span>${p}/${m.goal}</span></div></div>
        ${ready ? `<button class="btn btn-green m-claim" data-id="${id}">${art("coin", "inline")}<span>${m.reward}</span></button>`
                : `<div class="m-reward">${art("coin", "inline")} ${m.reward}</div>`}
      </div>`;
    }).join("") || `<p class="lead">All missions complete — legend!</p>`;
    const m = openModal(`
      ${ribbon("MISSIONS")}
      <div class="modal-body">
        ${rows}
        <p class="sub center-t">${ms.done.length} / ${C.missions.length} completed</p>
        <button class="btn btn-blue btn-wide" id="m-close"><span>Close</span></button>
      </div>`, "missions");
    m.querySelectorAll(".m-claim").forEach(b => b.addEventListener("click", () => {
      const id = b.dataset.id, mi = mById(id);
      const r = b.getBoundingClientRect();
      ms.ready = ms.ready.filter(x => x !== id); ms.active = ms.active.filter(x => x !== id); ms.done.push(id);
      coins += mi.reward; fillMissions(); save();
      Sound.play("coin"); FX.sparkle(r.left + r.width / 2, r.top + r.height / 2, 12, 30);
      FX.text(r.left + r.width / 2, r.top, `+${mi.reward}`, "f-coin");
      refreshCoins(); refreshMissionDot();
      setTimeout(showMissions, 350);
    }));
    on(m, "#m-close", closeModal);
  }

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
  const vibrate = ms_ => { if (C.vibration && settings.vibe && navigator.vibrate) navigator.vibrate(ms_); };
  function refreshCoins() { $$(".coin-count").forEach(e => { e.textContent = coins.toLocaleString(); }); }
  function bump(sel) { const el = $(sel); if (!el) return; el.classList.remove("bump"); el.offsetWidth; el.classList.add("bump"); }

  // ---------- HUD ----------------------------------------------------------
  function setScore(n) {
    const el = $("#score");
    el.textContent = n;
    el.classList.remove("tick"); el.offsetWidth; el.classList.add("tick");
    $("#meters").textContent = `${n * C.tower.metersPerLevel} m`;
  }
  function setStreak(n) {
    const el = $("#streak");
    if (n >= 2) { el.innerHTML = `PERFECT <b>x${n}</b>`; el.hidden = false; el.classList.remove("pop"); el.offsetWidth; el.classList.add("pop"); }
    else el.hidden = true;
  }
  function renderPowerups() {
    const st = Tower.state;
    $("#powerups").innerHTML = Object.entries(C.powerups).map(([k, p]) => {
      const active = (k === "slowmo" && st.slowLeft > 0) || (k === "shield" && st.shield);
      return `<button class="pu ${active ? "active" : ""}" data-pu="${k}" aria-label="${p.label}">
        <span class="pu-ico">${art(k)}</span>
        <span class="pu-badge ${powerups[k] ? "" : "plus"}">${k === "slowmo" && st.slowLeft > 0 ? st.slowLeft : powerups[k] || "+"}</span>
      </button>`;
    }).join("");
  }

  // ---------- Tower callbacks ---------------------------------------------
  let passedBest = false;
  Tower.on.place = ({ perfect, streak, score, x, y, shielded }) => {
    setScore(score);
    setStreak(streak);
    if (perfect) {
      FX.text(x, y - 40, shielded ? "SAVED!" : streak >= C.tower.growAfterStreak ? `PERFECT!<small>+GROW</small>` : "PERFECT!", `f-perfect s${Math.min(streak, 6)}`);
      FX.sparkle(x, y, 6 + Math.min(streak, 8) * 2, 50);
    }
    bumpMission("height", score);
    bumpMission("perfects", Tower.stats.perfects);
    bumpMission("streak", Tower.stats.maxStreak);
    renderPowerups();
    hideTapHint();
  };
  Tower.on.coin = (n, x, y) => {
    coins += n; save();
    FX.fly(x, y, $("#coins"), coinArt(), () => { refreshCoins(); bump("#coins"); Sound.play("coin"); });
    bumpMission("coinsTotal", n, "add");
  };
  Tower.on.milestone = floor => {
    Sound.play("milestone"); vibrate([20, 40, 20]);
    FX.text(innerWidth / 2, innerHeight * 0.3, `${floor} FLOORS!<small>+${C.economy.milestoneCoins} coins</small>`, "f-milestone");
    FX.confetti(90);
    coins += C.economy.milestoneCoins; save();
    setTimeout(() => FX.fly(innerWidth / 2, innerHeight * 0.3, $("#coins"), coinArt(), () => { refreshCoins(); bump("#coins"); Sound.play("coin"); }), 400);
  };
  Tower.on.passBest = () => {
    if (passedBest) return;
    passedBest = true;
    Sound.play("newbest");
    FX.text(innerWidth / 2, innerHeight * 0.22, "NEW BEST!", "f-milestone gold");
    FX.sparkle(innerWidth / 2, innerHeight * 0.22, 16, 120);
  };
  Tower.on.over = stats => {
    setStreak(0);
    gamesPlayed++; store.set("games", gamesPlayed);
    bumpMission("games", 1, "add");
    showGameOver(stats);
  };

  // ---------- power-ups ----------------------------------------------------
  function usePowerup(k) {
    Sound.play("click");
    if (Tower.mode !== "play") return;
    if (!powerups[k]) return showRefill(k);
    const fn = { slowmo: Tower.slowmo, widen: Tower.widen, shield: Tower.shield }[k];
    const r = fn();
    if (r === "full") return toast("Already full width!");
    if (!r) return toast(k === "shield" ? "Shield already up" : "Not now");
    powerups[k]--; save();
    bumpMission("powerups", 1, "add");
    const t = Tower.topScreen();
    FX.text(t.X, t.Y - 60, C.powerups[k].label.toUpperCase() + "!", "f-power");
    renderPowerups();
  }
  function showRefill(k) {
    const p = C.powerups[k];
    pauseGame(true);
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
    const done = () => { closeModal(); pauseGame(false); renderPowerups(); };
    on(m, "#m-buy", () => { coins -= p.cost; powerups[k]++; Sound.play("coin"); save(); refreshCoins(); done(); });
    on(m, "#m-ad", async () => { closeModal(); if (await Ads.showRewarded()) { powerups[k]++; save(); toast(`+1 ${p.label}`); Sound.play("coin"); } pauseGame(false); renderPowerups(); });
    on(m, "#m-close", done);
  }

  // pausing = freezing the tower loop's input; the slab keeps sliding behind the blurred modal
  let paused = false, revived = false;
  function pauseGame(p) { paused = p; Tower.setPaused(p); }

  // ---------- flow ---------------------------------------------------------
  function startGame() {
    closeModal();
    showScreen("game");
    passedBest = false; revived = false;
    setScore(0); setStreak(0);
    Tower.start({ best });
    renderPowerups();
    if (!store.get("tutorial", false)) showTapHint();
  }
  function showTapHint() { $("#tap-hint").hidden = false; }
  function hideTapHint() { if (!$("#tap-hint").hidden) { $("#tap-hint").hidden = true; store.set("tutorial", true); } }

  function showGameOver(stats) {
    const floorBonus = Math.floor(stats.score / C.economy.coinsPerFloors);
    const earned = stats.coins + floorBonus;
    coins += floorBonus;
    const isBest = stats.score > best;
    if (isBest) best = stats.score;
    save();
    const m = openModal(`
      ${ribbon(isBest ? "NEW RECORD!" : "TOWER FELL!")}
      <div class="modal-body center">
        <div class="final-score"><small>FLOORS</small><b>${stats.score}</b><em>${stats.score * C.tower.metersPerLevel} m tall</em></div>
        ${isBest ? `<div class="new-best">${art("crown", "inline")} NEW BEST! ${art("crown", "inline")}</div>`
                 : `<div class="final-best">${art("crown", "inline")} Best ${best}</div>`}
        <div class="stat-row">
          <div><b>${stats.perfects}</b><small>Perfects</small></div>
          <div><b>${stats.maxStreak}</b><small>Best streak</small></div>
          <div><b>+${earned}</b><small>Coins</small></div>
        </div>
        ${!revived ? `<button class="btn btn-green btn-wide pulse" id="m-revive">${art("video", "inline")}<span>Continue</span><small>keep building</small></button>` : ""}
        <div class="btn-row">
          <button class="btn btn-orange" id="m-home">${ICON.home}<span>Home</span></button>
          <button class="btn btn-blue" id="m-again">${ICON.restart}<span>Again</span></button>
        </div>
        ${earned > 0 ? `<button class="link-btn" id="m-x2">${art("video", "inline")} Double coins (+${earned})</button>` : ""}
      </div>`, "gameover");
    refreshCoins();
    if (isBest) { FX.confetti(110); Sound.play("newbest"); }
    on(m, "#m-revive", async () => {
      closeModal();
      if (await Ads.showRewarded()) { revived = true; Tower.revive(); renderPowerups(); }
      else showGameOver(stats);
    });
    on(m, "#m-x2", async el => {
      el.disabled = true;
      if (await Ads.showRewarded()) { coins += earned; save(); refreshCoins(); Sound.play("coin"); el.outerHTML = `<p class="sub">Coins doubled!</p>`; }
    });
    const after = async next => {
      if (C.ads.interstitialEveryGames && gamesPlayed % C.ads.interstitialEveryGames === 0) await Ads.showInterstitial();
      next();
    };
    on(m, "#m-again", () => { closeModal(); after(startGame); });
    on(m, "#m-home", () => { closeModal(); after(goHome); });
  }

  function goHome() { showScreen("home"); Tower.demo(); }

  // ---------- settings / shop / daily ---------------------------------------
  function showSettings(inGame) {
    if (inGame) pauseGame(true);
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
      Sound.play("click"); if (k === "vibe") vibrate(30);
    }));
    on(m, "#m-resume", () => { closeModal(); pauseGame(false); });
    on(m, "#m-home", () => { closeModal(); pauseGame(false); goHome(); });
    on(m, "#m-restart", () => { closeModal(); pauseGame(false); startGame(); });
  }

  function showShop() {
    const m = openModal(`
      ${ribbon("TOWER THEMES")}
      <div class="modal-body">
        <div class="shop-coins pill">${coinArt()}<b class="coin-count">${coins.toLocaleString()}</b></div>
        <div class="themes">${C.themes.map(t => `
          <button class="theme ${theme === t.id ? "equipped" : ""} ${owned.has(t.id) ? "owned" : ""}" data-theme="${t.id}" data-price="${t.price}">
            <div class="theme-prev" data-prev="${t.id}"></div>
            <b>${t.name}</b>
            <span class="tag">${theme === t.id ? "Equipped" : owned.has(t.id) ? "Use" : `${coinArt()} ${t.price}`}</span>
          </button>`).join("")}</div>
        <button class="btn btn-green btn-wide" id="m-close"><span>Done</span></button>
      </div>`, "shop");
    m.querySelectorAll("[data-prev]").forEach(el => el.appendChild(Th.preview(el.dataset.prev)));
    m.querySelectorAll("[data-theme]").forEach(b => b.addEventListener("click", () => {
      const id = b.dataset.theme, price = +b.dataset.price;
      if (!owned.has(id)) {
        if (coins < price) { Sound.play("click"); b.classList.remove("nope"); b.offsetWidth; b.classList.add("nope"); return toast("Not enough coins"); }
        coins -= price; owned.add(id); Sound.play("unlock"); FX.confetti(50);
      } else Sound.play("click");
      theme = id; Tower.setTheme(id); save(); refreshCoins();
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
    const st = dailyState(), R = C.economy.dailyRewards, reward = R[st.day];
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
      const c = m.querySelector("#chest"); if (c) { c.innerHTML = art("chestOpen"); c.classList.add("pop"); }
      FX.text(innerWidth / 2, innerHeight * 0.45, `+${amount} ${coinArt()}`, "f-coin big");
      setTimeout(closeModal, 1100);
    };
    on(m, "#m-claim", () => claim(reward));
    on(m, "#m-x2", async () => { const ok = await Ads.showRewarded(); claim(ok ? reward * 2 : reward); });
    on(m, "#m-close", closeModal);
  }

  // ---------- screens / wiring ---------------------------------------------
  function showScreen(name) {
    $$(".screen").forEach(s => s.classList.toggle("active", s.id === "screen-" + name));
    document.body.dataset.screen = name;
    if (name === "home") { $("#home-best").textContent = best; refreshDailyDot(); refreshMissionDot(); }
    refreshCoins();
  }
  function buildLogo() {
    if (hasImg(C.art.logo.image)) { $("#logo-wrap").innerHTML = `<img class="logo-img" src="${C.art.logo.image}" alt="${C.title}">`; return; }
    const [a, b] = C.titleLines;
    $("#logo-wrap").innerHTML = `<h1 class="logo-css">
      ${[a, b].map((w, k) => `<span class="slab s${k}"><span>${w}</span></span>`).join("")}</h1>`;
  }

  function bind() {
    const click = (sel, fn) => $(sel).addEventListener("click", e => { e.stopPropagation(); Sound.play("click"); fn(); });
    click("#btn-play", startGame);
    click("#btn-themes", showShop);
    click("#btn-missions", showMissions);
    click("#btn-daily", showDaily);
    click("#btn-home-settings", () => showSettings(false));
    click("#btn-pause", () => showSettings(true));
    $("#powerups").addEventListener("pointerdown", e => e.stopPropagation());
    $("#powerups").addEventListener("click", e => { const b = e.target.closest("[data-pu]"); if (b) usePowerup(b.dataset.pu); });
    $("#screen-game").addEventListener("pointerdown", e => {
      if (e.target.closest("button") || paused || modalRoot.classList.contains("open")) return;
      Tower.tap();
    });
    window.addEventListener("keydown", e => {
      if (e.key === "Escape") { if (modalRoot.classList.contains("open")) return; if (document.body.dataset.screen === "game" && Tower.mode === "play") showSettings(true); return; }
      if ((e.key === " " || e.key === "Enter") && document.body.dataset.screen === "game" && !modalRoot.classList.contains("open") && !paused) { e.preventDefault(); Tower.tap(); }
    });
  }

  async function boot() {
    $("#btn-pause").innerHTML = ICON.pause;
    $("#btn-home-settings").innerHTML = ICON.gear;
    $("#btn-play .bi").innerHTML = ICON.play;
    Tower.demo();
    const urls = Object.values(C.art).map(a => a.image).filter(Boolean);
    let done = 0;
    await Promise.all(urls.map(u => probe(u).then(() => { done++; $("#load-fill").style.width = (done / urls.length) * 100 + "%"; })));
    if (document.fonts && document.fonts.ready) await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1500))]);
    $$("[data-art]").forEach(el => { el.innerHTML = art(el.dataset.art, "inline"); });
    fillMissions(); save();
    buildLogo(); bind();
    showScreen("home");
  }
  boot();
})();

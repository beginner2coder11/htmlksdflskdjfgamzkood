/* ==========================================================================
   UI — loading, home (demo flight behind the menu), HUD, banners, pause,
   game over + revive / double coins, hangar (ships), upgrades, missions,
   daily gift and settings. Drives Game; listens on Game.on.*
   ========================================================================== */
(() => {
  const C = window.GAME_CONFIG, E = C.economy;
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];

  // ---------- storage --------------------------------------------------------
  const store = {
    get(k, d) { try { const v = localStorage.getItem("gs_" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("gs_" + k, JSON.stringify(v)); } catch (e) {} }
  };
  const settings = Object.assign({ sound: true, music: true, vibe: true }, store.get("settings", {}));
  let coins = store.get("coins", E.startCoins);
  const best = Object.assign({ score: 0, sector: 0 }, store.get("best", {}));
  let games = store.get("games", 0);
  const owned = new Set(store.get("owned", C.ships.filter(s => !s.price && !s.sector).map(s => s.id)));
  let shipId = store.get("ship", C.ships[0].id);
  const upg = Object.assign({}, store.get("upg", {}));
  const totals = Object.assign({ kills: 0, bosses: 0, powerups: 0, bombs: 0, sector: 0, combo: 0, score: 0 }, store.get("totals", {}));
  const claimed = new Set(store.get("claimed", []));
  const gift = Object.assign({ day: 0, last: "" }, store.get("gift", {}));
  let tutorialSeen = store.get("tut", false);
  const save = () => {
    store.set("coins", coins); store.set("best", best); store.set("games", games); store.set("owned", [...owned]); store.set("ship", shipId);
    store.set("upg", upg); store.set("totals", totals); store.set("claimed", [...claimed]); store.set("gift", gift); store.set("settings", settings); store.set("tut", tutorialSeen);
  };
  Sound.setSfx(settings.sound); Sound.setMusic(settings.music);
  const vibrate = m => { if (C.vibration && settings.vibe && navigator.vibrate) navigator.vibrate(m); };
  Game.on.vibe = vibrate;

  // ---------- art ------------------------------------------------------------
  const loaded = {};
  function probe(url) {
    return new Promise(res => {
      if (!url) return res(false);
      const img = new Image();
      const done = ok => { loaded[url] = ok; res(ok); };
      img.onload = () => done(img.naturalWidth > 0); img.onerror = () => done(false);
      setTimeout(() => done(false), 3000);
      img.src = url;
    });
  }
  const hasImg = url => !!(url && loaded[url]);
  function art(key, cls = "") {
    const a = C.art[key] || {};
    if (hasImg(a.image)) return `<img class="art-img ${cls}" src="${a.image}" alt="" draggable="false">`;
    return `<span class="art-emoji ${cls}">${a.emoji || ""}</span>`;
  }
  const coinArt = () => art("coin");
  const ICON = {
    pause: '<svg viewBox="0 0 24 24"><rect x="6" y="4" width="4.5" height="16"/><rect x="13.5" y="4" width="4.5" height="16"/></svg>',
    gear: '<svg viewBox="0 0 24 24"><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm8.9 4.7-1.7-.3a7.6 7.6 0 0 1-.7 1.7l1 1.4-1.4 2.5-1.4-1a7.6 7.6 0 0 1-1.7.7l-.3 1.7h-2.9l-.3-1.7a7.6 7.6 0 0 1-1.7-.7l-1.4 1L4 17.3l1-1.4a7.6 7.6 0 0 1-.7-1.7l-1.7-.3v-2.9l1.7-.3c.2-.6.4-1.2.7-1.7l-1-1.4L4 4.2l1.4-1 1.4 1a7.6 7.6 0 0 1 1.7-.7L9.9 1.5h2.9l.3 1.7c.6.2 1.2.4 1.7.7l1.4-1L19.5 4l-1 1.4c.3.5.5 1.1.7 1.7l1.7.3Z"/></svg>'
  };

  // ---------- helpers ----------------------------------------------------------
  const modalRoot = $("#modal-root");
  let closeTimer = 0;
  function openModal(html, cls = "") {
    clearTimeout(closeTimer); modalRoot.classList.remove("closing");
    modalRoot.innerHTML = `<div class="modal-back"></div><div class="modal ${cls}">${html}</div>`;
    modalRoot.classList.add("open");
    return modalRoot.querySelector(".modal");
  }
  function closeModal() {
    if (!modalRoot.classList.contains("open")) return;
    modalRoot.classList.add("closing");
    closeTimer = setTimeout(() => { modalRoot.classList.remove("open", "closing"); modalRoot.innerHTML = ""; }, 180);
  }
  const modalOpen = () => modalRoot.classList.contains("open") && !modalRoot.classList.contains("closing");
  const on = (root, sel, fn) => { const el = root.querySelector(sel); if (el) el.addEventListener("click", () => { Sound.play("click"); fn(el); }); };
  function toast(msg) { $$(".toast").forEach(t => t.remove()); const el = document.createElement("div"); el.className = "toast"; el.textContent = msg; document.body.appendChild(el); setTimeout(() => el.remove(), 1700); }
  function bump(el) { if (!el) return; el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); }
  function refreshCoins() { $$(".coin-count").forEach(e => { e.textContent = coins.toLocaleString(); }); }
  const fmt = n => Math.round(n).toLocaleString();
  function show(screen) {
    $$(".screen").forEach(s => s.classList.toggle("active", s.id === "screen-" + screen));
    document.body.dataset.screen = screen;
  }
  const ship = () => C.ships.find(s => s.id === shipId) || C.ships[0];
  const lvl = id => upg[id] || 0;
  const upgCfg = id => C.upgrades.find(u => u.id === id);
  function loadout() {
    const per = id => (upgCfg(id) ? upgCfg(id).per : 0) * lvl(id);
    return { ship: ship(), dmg: 1 + per("damage"), rate: 1 + per("rate"), hull: per("hull"), magnet: 40 + per("magnet"), power: per("power"), bombs: per("bombs") };
  }

  // ---------- home ------------------------------------------------------------------
  function logoHtml() {
    if (hasImg(C.art.logo.image)) return `<img class="logo-img" src="${C.art.logo.image}" alt="${C.title}">`;
    const [a, b] = C.titleLines;
    return `<div class="logo"><span class="l1">${a}</span><span class="l2">${b}</span></div>`;
  }
  function refreshHome() {
    $("#home-score").textContent = fmt(best.score);
    $("#home-sector").textContent = best.sector || "–";
    $("#home-ship").textContent = ship().name;
    refreshCoins(); refreshDots();
  }
  function canAfford() {
    const shipBuy = C.ships.some(s => !owned.has(s.id) && s.price && coins >= s.price);
    const upgBuy = C.upgrades.some(u => lvl(u.id) < u.max && coins >= u.cost[lvl(u.id)]);
    return { shipBuy, upgBuy };
  }
  function refreshDots() {
    const a = canAfford();
    $("#hangar-dot").hidden = !a.shipBuy;
    $("#upgrades-dot").hidden = !a.upgBuy;
    $("#missions-dot").hidden = !C.missions.some(m => missionDone(m) && !claimed.has(m.id));
    $("#gift-dot").hidden = !giftReady();
  }
  function goHome() {
    closeModal(); show("home"); refreshHome();
    Game.demo(ship()); setBossBar(false);
  }

  // ---------- HUD ---------------------------------------------------------------------
  const hull = $("#hull");
  Game.on.hp = (hp, max) => {
    hull.innerHTML = Array.from({ length: max }, (_, i) => `<i class="${i < hp ? "" : "off"}"></i>`).join("");
    hull.classList.toggle("low", hp === 1);
  };
  Game.on.bombs = n => { $("#bomb-n").textContent = n; $("#btn-bomb").classList.toggle("empty", n <= 0); };
  Game.on.coins = n => { $("#run-coins").textContent = fmt(n); };
  let comboHide = 0;
  Game.on.score = (s, combo, mult) => {
    $("#score").textContent = fmt(s);
    const c = $("#combo");
    if (combo >= 3) {
      c.hidden = false; $("#combo-n").textContent = combo; $("#combo-x").textContent = mult > 1 ? "x" + mult : "";
    }
  };
  Game.on.combo = (n, mult) => {
    const c = $("#combo");
    if (!n) { c.hidden = true; return; }
    bump(c); vibrate(15);
    $("#combo-x").textContent = mult > 1 ? "x" + mult : "";
  };
  // combo timer bar
  setInterval(() => {
    const r = Game.run;
    if (!r || Game.state !== "play") return;
    const bar = $("#combo-bar"); if (bar) bar.style.transform = `scaleX(${Math.max(0, r.comboT / C.play.comboWindow)})`;
    if (r.combo < 3) $("#combo").hidden = true;
    renderPowers();
  }, 100);
  function renderPowers() {
    const p = Game.player; if (!p) return;
    const list = C.powerups.filter(u => u.time && p[u.id] > 0);
    $("#powers").innerHTML = list.map(u => `<div class="pw" style="color:${u.color}"><b style="background:${u.color}">${u.name[0]}</b><span>${u.name.toUpperCase()}</span><i style="width:${Math.round(p[u.id] / u.time * 100)}%"></i></div>`).join("")
      + (p.weapon > 1 ? `<div class="pw" style="color:#ffd23f"><b style="background:#ffd23f">P</b><span>GUN LV ${p.weapon}</span></div>` : "");
  }
  Game.on.wave = (sector, wave) => { $("#sector-label").textContent = `SECTOR ${sector} · WAVE ${wave}`; };
  const banner = $("#banner");
  Game.on.banner = (title, sub, warn, small) => {
    banner.hidden = true; void banner.offsetWidth;
    $("#banner-title").textContent = title; $("#banner-sub").textContent = sub || "";
    banner.className = (warn ? "warn" : "") + (small ? " small" : "");
    banner.hidden = false;
    clearTimeout(banner._t); banner._t = setTimeout(() => { banner.hidden = true; }, 2300);
  };
  function setBossBar(onOff, name) {
    $("#boss-bar").hidden = !onOff;
    if (name) $("#boss-name").textContent = name.toUpperCase();
    $("#boss-fill").style.width = "100%";
  }
  Game.on.boss = cfg => { setBossBar(true, cfg.name); $("#sector-label").textContent = `SECTOR ${Game.run.sector} · BOSS`; vibrate([80, 60, 80]); };
  Game.on.bossHp = f => { $("#boss-fill").style.width = (f * 100).toFixed(1) + "%"; };
  Game.on.bossDown = (cfg, sector) => {
    setBossBar(false);
    setTimeout(() => Game.on.banner(`${cfg.name.toUpperCase()} DOWN!`, `+${fmt(1000 * sector)} bonus · +${cfg.coins} coins`), 900);
  };
  Game.on.powerup = () => renderPowers();

  // ---------- game flow -----------------------------------------------------------------
  function play() {
    closeModal();
    show("game");
    $("#combo").hidden = true; $("#powers").innerHTML = ""; setBossBar(false);
    Game.start(loadout());
    if (!tutorialSeen) { $("#drag-hint").hidden = false; setTimeout(() => { $("#drag-hint").hidden = true; }, 4200); tutorialSeen = true; save(); }
  }
  function pause() {
    if (Game.state !== "play" || modalOpen()) return;
    Game.pause(true);
    const m = openModal(`<h2 class="m-title">PAUSED</h2>
      ${settingsRows()}
      <div class="m-actions">
        <button class="neo-btn green" id="m-resume"><span>RESUME</span></button>
        <div class="m-row"><button class="neo-btn ghost sm" id="m-home"><span>HOME</span></button><button class="neo-btn ghost sm" id="m-restart"><span>RESTART</span></button></div>
      </div>`);
    bindSettings(m);
    on(m, "#m-resume", () => { closeModal(); Game.pause(false); });
    on(m, "#m-home", () => endRun(true));
    on(m, "#m-restart", () => { endRun(false); play(); });
  }
  // leaving a run from the pause menu still banks the coins you collected
  function endRun(home) {
    const r = Game.run;
    if (r) { coins += r.coins + r.bonusCoins; recordRun(r); save(); }
    if (home) goHome();
  }
  function recordRun(r) {
    totals.kills += r.kills; totals.bosses += r.bosses; totals.powerups += r.powerups; totals.bombs += r.bombsUsed;
    totals.sector = Math.max(totals.sector, r.sector); totals.combo = Math.max(totals.combo, r.maxCombo); totals.score = Math.max(totals.score, r.score);
    best.sector = Math.max(best.sector, r.sector);
    games++;
    C.ships.forEach(s => { if (s.sector && best.sector >= s.sector && !owned.has(s.id)) { owned.add(s.id); setTimeout(() => toast(`New ship unlocked: ${s.name}!`), 600); } });
  }

  Game.on.over = sum => {
    const newBest = sum.score > best.score;
    let earned = sum.coins, doubled = false;
    if (newBest) best.score = sum.score;
    const canRevive = !sum.revived;
    const m = openModal(`<h2 class="m-title red">SHIP DESTROYED</h2>
      <div class="big-score">${fmt(sum.score)}</div>${newBest ? '<span class="new-best">NEW BEST SCORE!</span>' : ""}
      <div class="stats" style="margin-top:14px">
        <div class="stat"><small>Sector</small><b>${sum.sector} · W${sum.wave}</b></div>
        <div class="stat"><small>Kills</small><b>${fmt(sum.kills)}</b></div>
        <div class="stat"><small>Max combo</small><b>${sum.maxCombo}</b></div>
        <div class="stat"><small>Bosses</small><b>${sum.bosses}</b></div>
      </div>
      <div class="coins-earned">${coinArt()}<b id="m-earned">+${fmt(earned)}</b></div>
      <div class="m-actions">
        ${canRevive && C.ads.enabled ? `<button class="neo-btn gold" id="m-revive"><span>${art("video")} REVIVE</span><small>Watch an ad · keep your score</small></button>` : ""}
        ${earned > 0 && C.ads.enabled ? `<button class="neo-btn ghost sm" id="m-double"><span>${art("video")} DOUBLE COINS</span></button>` : ""}
        <div class="m-row"><button class="neo-btn ghost sm" id="m-home"><span>HOME</span></button><button class="neo-btn green sm" id="m-again"><span>RETRY</span></button></div>
      </div>`);
    Sound.play("over");
    const finish = () => { coins += earned; recordRun(sum); save(); };
    let finished = false;
    const once = () => { if (!finished) { finished = true; finish(); } };
    on(m, "#m-revive", async el => {
      el.disabled = true;
      const ok = await Ads.showRewarded();
      if (ok) { closeModal(); Game.revive(); } else { el.disabled = false; toast("No ad available right now"); }
    });
    on(m, "#m-double", async el => {
      if (doubled) return;
      el.disabled = true;
      const ok = await Ads.showRewarded();
      if (ok) { doubled = true; earned *= 2; $("#m-earned").textContent = "+" + fmt(earned); Sound.play("coin"); el.remove(); } else el.disabled = false;
    });
    const leave = async next => {
      once();
      if (C.ads.enabled && games % C.ads.interstitialEveryGames === 0) await Ads.showInterstitial();
      next();
    };
    on(m, "#m-home", () => leave(goHome));
    on(m, "#m-again", () => leave(play));
  };

  // ---------- settings ------------------------------------------------------------------
  function settingsRows() {
    return [["sound", "Sound effects"], ["music", "Music"], ["vibe", "Vibration"]].map(([k, l]) =>
      `<div class="toggle-row"><span>${l}</span><button class="switch ${settings[k] ? "on" : ""}" data-set="${k}" aria-label="${l}"><i></i></button></div>`).join("");
  }
  function bindSettings(m) {
    m.querySelectorAll("[data-set]").forEach(b => b.addEventListener("click", () => {
      const k = b.dataset.set; settings[k] = !settings[k]; b.classList.toggle("on", settings[k]);
      Sound.setSfx(settings.sound); Sound.setMusic(settings.music); Sound.play("click"); save();
    }));
  }
  function showSettings() {
    const m = openModal(`<h2 class="m-title">SETTINGS</h2>${settingsRows()}<div class="m-actions"><button class="neo-btn green sm" id="m-close"><span>DONE</span></button></div>`);
    bindSettings(m); on(m, "#m-close", closeModal);
  }

  // ---------- hangar ---------------------------------------------------------------------
  const statBars = s => [["Damage", s.damage / 1.5], ["Fire rate", s.fire / 1.3], ["Hull", (C.play.hull + (s.hull || 0)) / 5]]
    .map(([l, v]) => `<div class="bar-row"><span>${l}</span><i style="--v:${Math.round(Math.min(1, v) * 100)}%"></i></div>`).join("");
  function showHangar(sel = shipId) {
    const cur = C.ships.find(s => s.id === sel);
    const have = owned.has(cur.id);
    const m = openModal(`<h2 class="m-title">HANGAR</h2>
      <div class="ship-hero"><div id="hero-prev"></div><div class="info"><h3>${cur.name}</h3>${statBars(cur)}</div></div>
      <div class="ships">${C.ships.map(s => `<button class="ship-card ${s.id === sel ? "sel" : ""}" data-id="${s.id}"><div data-prev="${s.id}"></div><b>${s.name}</b>${
        owned.has(s.id) ? `<small>${s.id === shipId ? "FLYING" : "OWNED"}</small>` : s.sector ? `<small class="req">Reach sector ${s.sector}</small>` : `<small>🪙 ${fmt(s.price)}</small>`}</button>`).join("")}</div>
      <div class="m-actions">
        ${have ? (cur.id === shipId ? `<button class="neo-btn ghost sm" disabled><span>FLYING THIS SHIP</span></button>` : `<button class="neo-btn green sm" id="m-equip"><span>FLY ${cur.name.toUpperCase()}</span></button>`)
          : cur.sector ? `<button class="neo-btn ghost sm" disabled><span>REACH SECTOR ${cur.sector}</span></button>`
          : `<button class="neo-btn ${coins >= cur.price ? "gold" : "ghost"} sm" id="m-buy"><span>BUY · ${fmt(cur.price)} COINS</span></button>`}
        <div class="m-row"><div class="chip" style="justify-content:center">${coinArt()}<b class="coin-count">${fmt(coins)}</b></div><button class="neo-btn ghost sm" id="m-close"><span>CLOSE</span></button></div>
      </div>`);
    m.querySelector("#hero-prev").appendChild(Sprites.shipPreview(cur, 90, 100, !have && !!cur.sector));
    m.querySelectorAll("[data-prev]").forEach(el => el.appendChild(Sprites.shipPreview(C.ships.find(s => s.id === el.dataset.prev), 64, 60, !owned.has(el.dataset.prev) && !!C.ships.find(s => s.id === el.dataset.prev).sector)));
    m.querySelectorAll("[data-id]").forEach(b => b.addEventListener("click", () => { Sound.play("click"); showHangar(b.dataset.id); }));
    on(m, "#m-equip", () => { shipId = cur.id; save(); Game.setShip(cur); refreshHome(); showHangar(cur.id); });
    on(m, "#m-buy", el => {
      if (coins < cur.price) { el.classList.remove("shake-x"); void el.offsetWidth; el.classList.add("shake-x"); return toast("Not enough coins"); }
      coins -= cur.price; owned.add(cur.id); shipId = cur.id; save(); Sound.play("unlock"); vibrate(40);
      Game.setShip(cur); refreshHome(); showHangar(cur.id);
    });
    on(m, "#m-close", () => { closeModal(); refreshHome(); });
  }

  // ---------- upgrades ---------------------------------------------------------------------
  function showUpgrades() {
    const m = openModal(`<h2 class="m-title">UPGRADES</h2>
      ${C.upgrades.map(u => {
        const l = lvl(u.id), maxed = l >= u.max, cost = maxed ? 0 : u.cost[l];
        return `<div class="upg"><div class="t"><b>${u.name}</b><small>${u.desc}</small><div class="pips">${Array.from({ length: u.max }, (_, i) => `<i class="${i < l ? "on" : ""}"></i>`).join("")}</div></div>
          <button class="buy ${maxed ? "max" : coins >= cost ? "" : "no"}" data-u="${u.id}">${maxed ? "MAX" : `${coinArt()} ${fmt(cost)}`}</button></div>`;
      }).join("")}
      <div class="m-actions"><div class="m-row"><div class="chip" style="justify-content:center">${coinArt()}<b class="coin-count">${fmt(coins)}</b></div><button class="neo-btn ghost sm" id="m-close"><span>CLOSE</span></button></div></div>`);
    m.querySelectorAll("[data-u]").forEach(b => b.addEventListener("click", () => {
      const u = upgCfg(b.dataset.u), l = lvl(u.id);
      if (l >= u.max) return;
      if (coins < u.cost[l]) { Sound.play("click"); b.classList.remove("shake-x"); void b.offsetWidth; b.classList.add("shake-x"); return toast("Not enough coins"); }
      coins -= u.cost[l]; upg[u.id] = l + 1; save(); Sound.play("powerup"); vibrate(30);
      const st = m.scrollTop; showUpgrades(); modalRoot.querySelector(".modal").scrollTop = st;
    }));
    on(m, "#m-close", () => { closeModal(); refreshHome(); });
  }

  // ---------- missions -----------------------------------------------------------------------
  const progressOf = m => totals[m.type] || 0;
  const missionDone = m => progressOf(m) >= m.goal;
  function showMissions() {
    const list = [...C.missions].sort((a, b) => (claimed.has(a.id) - claimed.has(b.id)) || (missionDone(b) - missionDone(a)));
    const m = openModal(`<h2 class="m-title">MISSIONS</h2>
      ${list.map(x => {
        const p = Math.min(x.goal, progressOf(x)), done = missionDone(x), got = claimed.has(x.id);
        return `<div class="mission ${got ? "done" : ""}"><div class="t">${x.text}<div class="prog"><i style="width:${p / x.goal * 100}%"></i></div><small style="color:var(--ink-dim)">${fmt(p)} / ${fmt(x.goal)}</small></div>
          <button class="buy ${got ? "max" : done ? "" : "no"}" data-m="${x.id}">${got ? "DONE" : `${coinArt()} ${x.reward}`}</button></div>`;
      }).join("")}
      <div class="m-actions"><button class="neo-btn ghost sm" id="m-close"><span>CLOSE</span></button></div>`);
    m.querySelectorAll("[data-m]").forEach(b => b.addEventListener("click", () => {
      const x = C.missions.find(q => q.id === b.dataset.m);
      if (claimed.has(x.id)) return;
      if (!missionDone(x)) { Sound.play("click"); return toast("Not finished yet"); }
      claimed.add(x.id); coins += x.reward; save(); Sound.play("coin"); Sound.play("unlock"); vibrate(30);
      toast(`+${x.reward} coins`); showMissions();
    }));
    on(m, "#m-close", () => { closeModal(); refreshHome(); });
  }

  // ---------- daily gift ------------------------------------------------------------------------
  const today = () => new Date().toISOString().slice(0, 10);
  const giftReady = () => gift.last !== today();
  function showGift() {
    // missing a day restarts the streak
    const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    if (gift.last && gift.last !== today() && gift.last !== y) gift.day = 0;
    const ready = giftReady(), idx = gift.day % E.dailyRewards.length;
    const m = openModal(`<h2 class="m-title">DAILY SUPPLY</h2>
      <div class="days">${E.dailyRewards.map((r, i) => `<div class="day ${i < idx ? "got" : i === idx && ready ? "today" : ""}"><span>DAY ${i + 1}</span><b>${r}</b>${coinArt()}</div>`).join("")}</div>
      <div class="m-actions">
        ${ready ? `<button class="neo-btn green" id="m-claim"><span>CLAIM ${E.dailyRewards[idx]}</span></button>
          ${C.ads.enabled ? `<button class="neo-btn gold sm" id="m-claim2"><span>${art("video")} CLAIM ${E.dailyRewards[idx] * 2}</span></button>` : ""}`
          : `<button class="neo-btn ghost sm" disabled><span>COME BACK TOMORROW</span></button>`}
        <button class="neo-btn ghost sm" id="m-close"><span>CLOSE</span></button>
      </div>`);
    const claim = mult => { coins += E.dailyRewards[idx] * mult; gift.day++; gift.last = today(); save(); Sound.play("unlock"); vibrate(40); toast(`+${E.dailyRewards[idx] * mult} coins`); showGift(); refreshHome(); };
    on(m, "#m-claim", () => claim(1));
    on(m, "#m-claim2", async el => { el.disabled = true; if (await Ads.showRewarded()) claim(2); else el.disabled = false; });
    on(m, "#m-close", () => { closeModal(); refreshHome(); });
  }

  // ---------- wiring ------------------------------------------------------------------------------
  $("#btn-settings").innerHTML = ICON.gear;
  $("#btn-pause").innerHTML = ICON.pause;
  const click = (sel, fn) => $(sel).addEventListener("click", () => { Sound.play("click"); fn(); });
  click("#btn-play", play);
  click("#btn-settings", showSettings);
  click("#btn-hangar", () => showHangar());
  click("#btn-upgrades", showUpgrades);
  click("#btn-missions", showMissions);
  click("#btn-gift", showGift);
  $("#btn-pause").addEventListener("click", () => { Sound.play("click"); pause(); });
  $("#btn-bomb").addEventListener("pointerdown", e => { e.stopPropagation(); if (!Game.bomb()) { Sound.play("click"); bump($("#btn-bomb")); } });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" || e.key === "p" || e.key === "P") { if (Game.state === "play") pause(); else if (Game.state === "paused" && modalOpen()) { closeModal(); Game.pause(false); } }
    if ((e.key === "Enter" || e.key === " ") && document.body.dataset.screen === "home" && !modalOpen()) { e.preventDefault(); play(); }
  });
  document.addEventListener("visibilitychange", () => { if (document.hidden && Game.state === "play") pause(); });

  // ---------- boot -------------------------------------------------------------------------------------
  (async () => {
    const tips = ["Charging plasma cannons…", "Scanning for hostiles…", "Calibrating shields…", "Plotting warp route…"];
    $("#load-tip").textContent = tips[Math.floor(Math.random() * tips.length)];
    const urls = Object.values(C.art).map(a => a.image).filter(Boolean);
    let done = 0;
    await Promise.all(urls.map(u => probe(u).then(() => { done++; $("#load-fill").style.width = Math.round(done / urls.length * 85) + "%"; })));
    $$("[data-art]").forEach(el => { el.outerHTML = art(el.dataset.art); });
    $("#logo-wrap").innerHTML = logoHtml();
    $("#tagline").textContent = C.tagline;
    document.title = C.title;
    Game.init();
    Game.demo(ship());
    $("#load-fill").style.width = "100%";
    setTimeout(goHome, 250);
  })();

  window.UI = { play, goHome, showHangar, showUpgrades, showMissions, showGift, get coins() { return coins; } };
})();

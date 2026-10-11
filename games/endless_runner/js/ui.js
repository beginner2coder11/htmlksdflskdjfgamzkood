/* ==========================================================================
   UI — home, HUD, input, missions, characters shop, upgrades, daily gift,
   game over / revive. Drives Runner via its callbacks.
   ========================================================================== */
(() => {
  const C = window.GAME_CONFIG, E = C.economy, U = C.upgrades;
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];

  // ---------- storage ------------------------------------------------------
  const store = {
    get(k, d) { try { const v = localStorage.getItem("dr_" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("dr_" + k, JSON.stringify(v)); } catch (e) {} }
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
    play: '<svg viewBox="0 0 24 24"><path d="M7 4.5v15a1 1 0 0 0 1.5.9l12-7.5a1 1 0 0 0 0-1.8l-12-7.5A1 1 0 0 0 7 4.5Z"/></svg>'
  };

  // ---------- persistent state --------------------------------------------
  const settings = Object.assign({ sound: true, music: true, vibe: true }, store.get("settings", {}));
  let coins = store.get("coins", E.startCoins);
  let best = store.get("best", 0);
  let runs = store.get("runs", 0);
  const owned = new Set(store.get("owned", C.characters.filter(c => !c.price).map(c => c.id)));
  let charId = store.get("char", C.characters[0].id);
  const levels = Object.assign({ magnet: 0, shield: 0, rocket: 0, double: 0 }, store.get("upgrades", {}));
  const ms = Object.assign({ active: [], progress: {}, done: [], ready: [] }, store.get("missions", {}));
  const save = () => {
    store.set("coins", coins); store.set("best", best); store.set("runs", runs); store.set("owned", [...owned]);
    store.set("char", charId); store.set("upgrades", levels); store.set("missions", ms);
  };
  Sound.setSfx(settings.sound); Sound.setMusic(settings.music);
  Runner.setChar(charId);
  Runner.on.vibeOn = () => settings.vibe;
  const vibrate = m => { if (C.vibration && settings.vibe && navigator.vibrate) navigator.vibrate(m); };
  const durations = () => Object.fromEntries(Object.keys(levels).map(k => [k, 1 + levels[k] * U.perLevel]));

  // ---------- modals / helpers --------------------------------------------
  const modalRoot = $("#modal-root");
  let closeTimer = 0;
  function openModal(html, cls = "") {
    clearTimeout(closeTimer);
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
    $$(".toast").forEach(t => t.remove());
    const el = document.createElement("div"); el.className = "toast"; el.textContent = msg;
    document.body.appendChild(el); setTimeout(() => el.remove(), 1600);
  }
  function refreshCoins() { $$(".coin-count").forEach(e => { e.textContent = coins.toLocaleString(); }); }
  function bump(sel) { const el = $(sel); if (!el) return; el.classList.remove("bump"); el.offsetWidth; el.classList.add("bump"); }

  // ---------- missions -----------------------------------------------------
  const mById = id => C.missions.find(m => m.id === id);
  function fillMissions() {
    while (ms.active.length < 3) {
      const next = C.missions.find(m => !ms.done.includes(m.id) && !ms.active.includes(m.id));
      if (!next) break;
      ms.active.push(next.id);
    }
  }
  function bumpMission(type, value, how = "max") {
    let changed = false;
    ms.active.forEach(id => {
      const m = mById(id);
      if (!m || m.type !== type || ms.ready.includes(id)) return;
      const prev = ms.progress[id] || 0, v = how === "add" ? prev + value : Math.max(prev, value);
      if (v !== prev) { ms.progress[id] = v; changed = true; }
      if (v >= m.goal) { ms.ready.push(id); missionToast(m); }
    });
    if (changed) save();
    refreshDots();
  }
  function missionToast(m) {
    const el = document.createElement("div"); el.className = "mission-toast";
    el.innerHTML = `${art("check", "inline")}<div><small>MISSION COMPLETE</small><b>${m.text}</b></div>`;
    document.body.appendChild(el); Sound.play("unlock"); setTimeout(() => el.remove(), 2600);
  }
  function showMissions() {
    fillMissions();
    const rows = ms.active.map(id => {
      const m = mById(id), p = Math.min(m.goal, ms.progress[id] || 0), ready = ms.ready.includes(id);
      return `<div class="mission ${ready ? "ready" : ""}"><div class="m-txt"><b>${m.text}</b>
        <div class="m-bar"><i style="width:${(p / m.goal) * 100}%"></i><span>${p.toLocaleString()}/${m.goal.toLocaleString()}</span></div></div>
        ${ready ? `<button class="btn btn-green m-claim" data-id="${id}">${coinArt()}<span>${m.reward}</span></button>` : `<div class="m-reward">${coinArt()} ${m.reward}</div>`}</div>`;
    }).join("") || `<p class="lead">All missions complete — legend!</p>`;
    const m = openModal(`${ribbon("MISSIONS")}<div class="modal-body">${rows}
      <p class="sub center-t">${ms.done.length} / ${C.missions.length} completed</p>
      <button class="btn btn-blue btn-wide" id="m-close"><span>Close</span></button></div>`, "missions");
    m.querySelectorAll(".m-claim").forEach(b => b.addEventListener("click", () => {
      const id = b.dataset.id, mi = mById(id), r = b.getBoundingClientRect();
      ms.ready = ms.ready.filter(x => x !== id); ms.active = ms.active.filter(x => x !== id); ms.done.push(id);
      coins += mi.reward; fillMissions(); save();
      Sound.play("coin"); FX.sparkle(r.left + r.width / 2, r.top + r.height / 2, 12, 30);
      refreshCoins(); refreshDots(); setTimeout(showMissions, 300);
    }));
    on(m, "#m-close", closeModal);
  }

  // ---------- HUD ----------------------------------------------------------
  let lastBestShown = false;
  Runner.on.hud = (st, fx) => {
    $("#dist").textContent = Math.floor(st.dist).toLocaleString();
    $("#run-coins").textContent = st.coins;
    const pills = Object.keys(C.powerups).filter(k => fx[k] > 0).map(k => {
      const total = C.powerups[k].base * (1 + levels[k] * U.perLevel);
      return `<div class="pw" style="--c:${C.powerups[k].color}"><span>${C.powerups[k].emoji}</span><i style="width:${Math.min(100, (fx[k] / total) * 100)}%"></i></div>`;
    }).join("");
    $("#active-pw").innerHTML = pills;
  };
  Runner.on.firstInput = () => { if (!$("#tap-hint").hidden) { $("#tap-hint").hidden = true; store.set("tutorial", true); } };
  Runner.on.power = type => {
    const p = C.powerups[type];
    FX.text(innerWidth / 2, innerHeight * 0.32, `${p.emoji} ${p.label.toUpperCase()}!`, "f-power");
  };
  Runner.on.shieldBreak = () => FX.text(innerWidth / 2, innerHeight * 0.34, "SAVED!", "f-power");
  Runner.on.stomp = (x, y) => { FX.text(x, y - 20, "STOMP!", "f-stomp"); };
  Runner.on.chain = (n, x, y) => FX.text(x, y - 30, `${n} coin streak!`, "f-chain");
  Runner.on.milestone = m => {
    Sound.play("milestone"); vibrate([20, 40, 20]);
    FX.text(innerWidth / 2, innerHeight * 0.26, `${m.toLocaleString()} m!<small>+${E.milestoneCoins} coins</small>`, "f-milestone");
    FX.confetti(70);
    coins += E.milestoneCoins; save();
  };
  Runner.on.biome = name => { FX.text(innerWidth / 2, innerHeight * 0.18, name.toUpperCase(), "f-biome"); Sound.play("whoosh"); };
  Runner.on.passBest = () => {
    if (lastBestShown) return; lastBestShown = true;
    Sound.play("newbest");
    FX.text(innerWidth / 2, innerHeight * 0.22, "NEW BEST!", "f-milestone gold"); FX.sparkle(innerWidth / 2, innerHeight * 0.22, 16, 120);
  };
  Runner.on.over = st => showGameOver(st);

  // ---------- flow ---------------------------------------------------------
  let revived = false;
  function startRun() {
    closeModal();
    showScreen("game");
    revived = false; lastBestShown = false;
    $("#dist").textContent = "0"; $("#run-coins").textContent = "0"; $("#active-pw").innerHTML = "";
    Runner.setChar(charId);
    Runner.start({ best, durations: durations() });
    if (!store.get("tutorial", false)) $("#tap-hint").hidden = false;
  }
  function goHome() { showScreen("home"); Runner.demo(); }

  function showGameOver(st) {
    const dist = Math.floor(st.dist);
    const isBest = dist > best;
    if (isBest) best = dist;
    save();
    // coins & mission progress are banked once, when the player leaves the run (not on revive)
    let banked = false;
    const bank = () => {
      if (banked) return; banked = true;
      coins += st.coins; runs++;
      bumpMission("distance", dist); bumpMission("coins", st.coins);
      bumpMission("coinsTotal", st.coins, "add"); bumpMission("stompsTotal", st.stomps, "add");
      bumpMission("powerTotal", st.powers, "add"); bumpMission("games", 1, "add");
      save(); refreshCoins();
    };
    const m = openModal(`
      ${ribbon(isBest ? "NEW RECORD!" : "OUCH!")}
      <div class="modal-body center">
        <div class="go-char" id="go-char"></div>
        <div class="final-score"><small>DISTANCE</small><b>${dist.toLocaleString()} m</b></div>
        ${isBest ? `<div class="new-best">${art("crown", "inline")} NEW BEST! ${art("crown", "inline")}</div>` : `<div class="final-best">${art("crown", "inline")} Best ${best.toLocaleString()} m</div>`}
        <div class="stat-row">
          <div><b>${st.coins}</b><small>Coins</small></div>
          <div><b>${st.stomps}</b><small>Stomps</small></div>
          <div><b>${st.powers}</b><small>Power-ups</small></div>
        </div>
        ${!revived ? `<button class="btn btn-green btn-wide pulse" id="m-revive">${art("video", "inline")}<span>Continue</span><small>keep running</small></button>` : ""}
        <div class="btn-row">
          <button class="btn btn-orange" id="m-home">${ICON.home}<span>Home</span></button>
          <button class="btn btn-blue" id="m-again">${ICON.restart}<span>Again</span></button>
        </div>
        ${st.coins > 0 ? `<button class="link-btn" id="m-x2">${art("video", "inline")} Double coins (+${st.coins})</button>` : ""}
      </div>`, "gameover");
    m.querySelector("#go-char").appendChild(Characters.preview(charId, 90));
    refreshCoins();
    if (isBest) FX.confetti(110);
    on(m, "#m-revive", async () => {
      closeModal();
      if (await Ads.showRewarded()) {
        revived = true;
        Runner.revive();
      } else showGameOver(st);
    });
    on(m, "#m-x2", async el => {
      el.disabled = true;
      if (await Ads.showRewarded()) {
        bank(); coins += st.coins; save(); refreshCoins(); Sound.play("coin");
        el.outerHTML = `<p class="sub">Coins doubled!</p>`;
        const rv = m.querySelector("#m-revive"); if (rv) rv.remove(); // run is banked now
      } else el.disabled = false;
    });
    const after = async next => {
      bank();
      if (C.ads.interstitialEveryRuns && runs % C.ads.interstitialEveryRuns === 0) await Ads.showInterstitial();
      next();
    };
    on(m, "#m-again", () => { closeModal(); after(startRun); });
    on(m, "#m-home", () => { closeModal(); after(goHome); });
  }

  // ---------- shops --------------------------------------------------------
  function showCharacters() {
    const m = openModal(`
      ${ribbon("CHARACTERS")}
      <div class="modal-body">
        <div class="shop-coins pill">${coinArt()}<b class="coin-count">${coins.toLocaleString()}</b></div>
        <div class="chars">${C.characters.map(c => `
          <button class="char ${charId === c.id ? "equipped" : ""} ${owned.has(c.id) ? "owned" : ""}" data-id="${c.id}" data-price="${c.price}">
            <div class="char-prev" data-prev="${c.id}"></div><b>${c.name}</b>
            <span class="tag">${charId === c.id ? "Running" : owned.has(c.id) ? "Pick" : `${coinArt()} ${c.price.toLocaleString()}`}</span>
          </button>`).join("")}</div>
        <button class="btn btn-green btn-wide" id="m-close"><span>Done</span></button>
      </div>`, "shop");
    m.querySelectorAll("[data-prev]").forEach(el => el.appendChild(Characters.preview(el.dataset.prev, 74)));
    m.querySelectorAll("[data-id]").forEach(b => b.addEventListener("click", () => {
      const id = b.dataset.id, price = +b.dataset.price;
      if (!owned.has(id)) {
        if (coins < price) { b.classList.remove("nope"); b.offsetWidth; b.classList.add("nope"); Sound.play("click"); return toast("Not enough coins"); }
        coins -= price; owned.add(id); Sound.play("unlock"); FX.confetti(50);
      } else Sound.play("click");
      charId = id; Runner.setChar(id); save(); refreshCoins(); refreshHome();
      showCharacters();
    }));
    on(m, "#m-close", closeModal);
  }
  function showUpgrades() {
    const rows = Object.entries(C.powerups).map(([k, p]) => {
      const lv = levels[k], max = lv >= U.maxLevel, cost = U.costs[lv];
      const secs = (p.base * (1 + lv * U.perLevel)).toFixed(1).replace(/\.0$/, "");
      return `<div class="upg" style="--c:${p.color}">
        <span class="upg-ico">${p.emoji}</span>
        <div class="upg-info"><b>${p.label}</b><small>${secs}s</small>
          <div class="upg-pips">${Array.from({ length: U.maxLevel }, (_, i) => `<i class="${i < lv ? "on" : ""}"></i>`).join("")}</div></div>
        ${max ? `<span class="upg-max">MAX</span>` : `<button class="btn btn-orange upg-buy" data-k="${k}" ${coins < cost ? "disabled" : ""}>${coinArt()}<span>${cost.toLocaleString()}</span></button>`}
      </div>`;
    }).join("");
    const m = openModal(`${ribbon("UPGRADES")}<div class="modal-body">
      <div class="shop-coins pill">${coinArt()}<b class="coin-count">${coins.toLocaleString()}</b></div>
      <p class="sub center-t">Make every power-up last longer</p>${rows}
      <button class="btn btn-green btn-wide" id="m-close"><span>Done</span></button></div>`, "upgrades");
    m.querySelectorAll(".upg-buy").forEach(b => b.addEventListener("click", () => {
      const k = b.dataset.k, cost = U.costs[levels[k]];
      if (coins < cost) return;
      coins -= cost; levels[k]++; save(); refreshCoins();
      Sound.play("unlock"); const r = b.getBoundingClientRect(); FX.sparkle(r.left + r.width / 2, r.top + r.height / 2, 12, 30);
      showUpgrades();
    }));
    on(m, "#m-close", closeModal);
  }

  // ---------- settings / daily gift ----------------------------------------
  function showSettings(inGame) {
    if (inGame) Runner.setPaused(true);
    const row = (k, label) => `<button class="toggle ${settings[k] ? "on" : ""}" data-k="${k}"><span>${label}</span><i></i></button>`;
    const m = openModal(`
      ${ribbon(inGame ? "PAUSED" : "SETTINGS")}
      <div class="modal-body">
        ${row("sound", "Sound effects")}${row("music", "Music")}${row("vibe", "Vibration")}
        ${inGame ? `<div class="btn-row">
          <button class="btn btn-orange" id="m-quit">${ICON.home}<span>Quit</span></button>
          <button class="btn btn-green" id="m-resume">${ICON.play}<span>Resume</span></button>
        </div>` : `<button class="btn btn-green btn-wide" id="m-resume"><span>Done</span></button>`}
      </div>`, "settings");
    m.querySelectorAll(".toggle").forEach(b => b.addEventListener("click", () => {
      const k = b.dataset.k; settings[k] = !settings[k]; b.classList.toggle("on", settings[k]);
      store.set("settings", settings); Sound.setSfx(settings.sound); Sound.setMusic(settings.music);
      Sound.play("click"); if (k === "vibe") vibrate(30);
    }));
    on(m, "#m-resume", () => { closeModal(); Runner.setPaused(false); });
    on(m, "#m-quit", () => { closeModal(); Runner.setPaused(false); goHome(); });
  }
  const today = () => new Date().toLocaleDateString("en-CA");
  function giftState() {
    const d = store.get("gift", { last: null, streak: 0 });
    const y = new Date(Date.now() - 864e5).toLocaleDateString("en-CA"), n = E.dailyRewards.length, available = d.last !== today();
    return { available, day: available ? (d.last === y ? d.streak % n : 0) : (d.streak - 1) % n };
  }
  function showGift() {
    const st = giftState(), R = E.dailyRewards, reward = R[st.day];
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
      store.set("gift", { last: today(), streak: st.day + 1 });
      coins += amount; save(); refreshCoins(); refreshDots();
      Sound.play("milestone"); FX.confetti(70);
      const c = m.querySelector("#chest"); if (c) { c.innerHTML = art("chestOpen"); c.classList.add("pop"); }
      FX.text(innerWidth / 2, innerHeight * 0.45, `+${amount} ${coinArt()}`, "f-coin big");
      setTimeout(closeModal, 1100);
    };
    on(m, "#m-claim", () => claim(reward));
    on(m, "#m-x2", async () => { const ok = await Ads.showRewarded(); claim(ok ? reward * 2 : reward); });
    on(m, "#m-close", closeModal);
  }

  // ---------- home / screens ----------------------------------------------
  function refreshDots() {
    $("#gift-dot").hidden = !giftState().available;
    $("#missions-dot").hidden = !ms.ready.length;
  }
  function refreshHome() {
    $("#home-best").textContent = best.toLocaleString();
    $("#home-char").textContent = Characters.byId(charId).name;
    refreshDots(); refreshCoins();
  }
  function showScreen(name) {
    $$(".screen").forEach(s => s.classList.toggle("active", s.id === "screen-" + name));
    document.body.dataset.screen = name;
    if (name === "home") refreshHome();
    refreshCoins();
  }
  function buildLogo() {
    if (hasImg(C.art.logo.image)) { $("#logo-wrap").innerHTML = `<img class="logo-img" src="${C.art.logo.image}" alt="${C.title}">`; return; }
    const [a, b] = C.titleLines;
    $("#logo-wrap").innerHTML = `<h1 class="logo-css"><span class="l1">${a}</span><span class="l2">${b}</span><i class="speed"></i></h1>`;
  }

  // ---------- input --------------------------------------------------------
  function bindInput() {
    const gs = $("#screen-game");
    let sy = 0, swiped = false, down = false;
    gs.addEventListener("pointerdown", e => {
      if (e.target.closest("button") || modalRoot.classList.contains("open")) return;
      down = true; sy = e.clientY; swiped = false;
      Runner.press();
    });
    gs.addEventListener("pointermove", e => {
      if (!down || swiped) return;
      if (e.clientY - sy > 40) { swiped = true; Runner.release(); Runner.slide(); }
    });
    const up = () => { if (!down) return; down = false; Runner.release(); };
    gs.addEventListener("pointerup", up);
    gs.addEventListener("pointercancel", up);
    window.addEventListener("keydown", e => {
      if (document.body.dataset.screen !== "game" || modalRoot.classList.contains("open")) {
        if (e.key === "Escape" && modalRoot.classList.contains("open") && Runner.mode !== "dead") { /* let buttons handle it */ }
        return;
      }
      if (e.repeat) return;
      if (e.key === " " || e.key === "ArrowUp" || e.key === "w" || e.key === "W") { e.preventDefault(); Runner.press(); }
      if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") { e.preventDefault(); Runner.slide(); }
      if (e.key === "Escape" && Runner.mode === "play") showSettings(true);
    });
    window.addEventListener("keyup", e => { if (e.key === " " || e.key === "ArrowUp" || e.key === "w" || e.key === "W") Runner.release(); });
    document.addEventListener("visibilitychange", () => { if (document.hidden && Runner.mode === "play" && document.body.dataset.screen === "game" && !modalRoot.classList.contains("open")) showSettings(true); });
  }

  function bind() {
    const click = (sel, fn) => $(sel).addEventListener("click", e => { e.stopPropagation(); Sound.play("click"); fn(); });
    click("#btn-play", startRun);
    click("#btn-chars", showCharacters);
    click("#btn-upgrades", showUpgrades);
    click("#btn-missions", showMissions);
    click("#btn-gift", showGift);
    click("#btn-settings", () => showSettings(false));
    click("#btn-pause", () => showSettings(true));
    bindInput();
  }

  async function boot() {
    $("#btn-settings").innerHTML = ICON.gear;
    $("#btn-pause").innerHTML = ICON.pause;
    $("#btn-play .bi").innerHTML = ICON.play;
    Runner.demo();
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

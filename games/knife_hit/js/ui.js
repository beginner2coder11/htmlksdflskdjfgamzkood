/* ==========================================================================
   UI — home (demo target), HUD (score, stage dots, knives left, boss banner),
   input, knife collection, boss rewards, missions, daily gift, game over /
   revive. Drives Game.
   ========================================================================== */
(() => {
  const C = window.GAME_CONFIG, E = C.economy;
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];

  // ---------- storage --------------------------------------------------------
  const store = {
    get(k, d) { try { const v = localStorage.getItem("kh_" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("kh_" + k, JSON.stringify(v)); } catch (e) {} }
  };

  // ---------- art ------------------------------------------------------------
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
    knife: '<svg viewBox="0 0 10 40"><path d="M5 0C8 6 8 12 8 22H2V7C2 4 3 2 5 0Z" fill="#e8edf3"/><rect x="1" y="22" width="8" height="2" rx="1" fill="#3a3a44"/><rect x="2.4" y="24" width="5.2" height="16" rx="2.4" fill="#8a5a30"/></svg>'
  };

  // ---------- persistent state ---------------------------------------------
  const settings = Object.assign({ sound: true, music: true, vibe: true }, store.get("settings", {}));
  let apples = store.get("apples", E.startApples);
  const best = Object.assign({ stage: 0, score: 0 }, store.get("best", {}));
  let games = store.get("games", 0);
  const owned = new Set(store.get("owned", C.knives.filter(k => !k.price && !k.boss && !k.stage).map(k => k.id)));
  let knife = store.get("knife", C.knives[0].id);
  const seen = new Set(store.get("seen", [...owned]));        // red dot on new unlocks
  const ms = Object.assign({ active: [], progress: {}, done: [], ready: [] }, store.get("missions", {}));
  const save = () => {
    store.set("apples", apples); store.set("best", best); store.set("games", games); store.set("owned", [...owned]);
    store.set("knife", knife); store.set("missions", ms); store.set("seen", [...seen]);
  };
  Sound.setSfx(settings.sound); Sound.setMusic(settings.music);
  const vibrate = m => { if (C.vibration && settings.vibe && navigator.vibrate) navigator.vibrate(m); };
  Game.on.vibe = vibrate;

  // ---------- modals / helpers ---------------------------------------------
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
  const modalOpen = () => modalRoot.classList.contains("open") && !modalRoot.classList.contains("closing");
  const ribbon = text => hasImg(C.art.ribbon.image)
    ? `<div class="ribbon img" style="background-image:url('${C.art.ribbon.image}')"><span>${text}</span></div>`
    : `<div class="ribbon"><span>${text}</span></div>`;
  const rays = () => hasImg(C.art.rays.image) ? `<img class="rays" src="${C.art.rays.image}" alt="">` : `<div class="rays css"></div>`;
  const on = (root, sel, fn) => { const el = root.querySelector(sel); if (el) el.addEventListener("click", () => { Sound.play("click"); fn(el); }); };
  const appleArt = () => art("apple", "inline");
  function toast(msg) {
    $$(".toast").forEach(t => t.remove());
    const el = document.createElement("div"); el.className = "toast"; el.textContent = msg;
    document.body.appendChild(el); setTimeout(() => el.remove(), 1700);
  }
  function refreshApples() { $$(".apple-count").forEach(e => { e.textContent = apples.toLocaleString(); }); }
  function bump(el) { if (!el) return; el.classList.remove("bump"); el.offsetWidth; el.classList.add("bump"); }

  // ---------- knives ---------------------------------------------------------------
  const kById = id => C.knives.find(k => k.id === id);
  const bossById = id => C.bosses.find(b => b.id === id);
  function lockText(k) {
    if (k.boss) return `Beat ${bossById(k.boss).name}`;
    if (k.stage) return `Reach stage ${k.stage}`;
    return null;
  }
  // stage-gated knives unlock by themselves
  function checkStageUnlocks() {
    const fresh = [];
    C.knives.forEach(k => { if (k.stage && best.stage >= k.stage && !owned.has(k.id)) { owned.add(k.id); fresh.push(k); } });
    if (fresh.length) save();
    return fresh;
  }
  function showKnives() {
    C.knives.forEach(k => { if (owned.has(k.id)) seen.add(k.id); });
    save(); refreshDots();
    const m = openModal(`
      ${ribbon("KNIVES")}
      <div class="modal-body">
        <div class="k-hero"><div id="k-hero-prev"></div><b id="k-hero-name">${kById(knife).name}</b></div>
        <div class="shop-coins pill">${appleArt()}<b class="apple-count">${apples.toLocaleString()}</b></div>
        <div class="items">${C.knives.map(k => {
          const have = owned.has(k.id), lock = lockText(k);
          return `<button class="item ${knife === k.id ? "equipped" : ""} ${have ? "owned" : "locked"}" data-id="${k.id}">
            <div class="item-prev" data-prev="${k.id}"></div>
            <span class="tag">${have ? (knife === k.id ? "Using" : k.name) : lock ? `<i class="req">${lock}</i>` : `${appleArt()} ${k.price.toLocaleString()}`}</span></button>`;
        }).join("")}</div>
        <button class="btn btn-green btn-wide" id="m-close"><span>Done</span></button>
      </div>`, "shop");
    m.querySelector("#k-hero-prev").appendChild(Skins.knifePreview(knife, 150, 110, Math.PI / 2));
    m.querySelectorAll("[data-prev]").forEach(el => {
      const cvs = Skins.knifePreview(el.dataset.prev, 64, 64, 0.75);
      if (!owned.has(el.dataset.prev)) cvs.classList.add("silhouette");
      el.appendChild(cvs);
    });
    m.querySelectorAll("[data-id]").forEach(b => b.addEventListener("click", () => {
      const k = kById(b.dataset.id);
      if (!owned.has(k.id)) {
        const lock = lockText(k);
        if (lock) { Sound.play("click"); return toast(lock + " to unlock"); }
        if (apples < k.price) { b.classList.remove("nope"); b.offsetWidth; b.classList.add("nope"); Sound.play("clang"); return toast("Not enough apples"); }
        apples -= k.price; owned.add(k.id); seen.add(k.id); Sound.play("unlock"); FX.confetti(50);
      } else Sound.play("click");
      knife = k.id; save(); refreshApples(); refreshHome(); Game.setKnife(knife);
      showKnives();
    }));
    on(m, "#m-close", closeModal);
  }

  // ---------- missions ---------------------------------------------------------
  const mById = id => C.missions.find(m => m.id === id);
  function fillMissions() {
    while (ms.active.length < 3) {
      const next = C.missions.find(m => !ms.done.includes(m.id) && !ms.active.includes(m.id));
      if (!next) break;
      ms.active.push(next.id);
    }
  }
  // stage + score missions track the best single run; the rest add up
  function bumpMission(type, value) {
    ms.active.forEach(id => {
      const m = mById(id);
      if (!m || m.type !== type || ms.ready.includes(id)) return;
      const prev = ms.progress[id] || 0, v = (m.max || type === "stage") ? Math.max(prev, value) : prev + value;
      ms.progress[id] = v;
      if (v >= m.goal) { ms.ready.push(id); missionToast(m); }
    });
    save(); refreshDots();
  }
  function missionToast(m) {
    const el = document.createElement("div"); el.className = "mission-toast";
    el.innerHTML = `${art("check", "inline")}<div><small>MISSION COMPLETE</small><b>${m.text}</b></div>`;
    document.body.appendChild(el); Sound.play("unlock"); setTimeout(() => el.remove(), 2600);
  }
  function showMissions() {
    fillMissions();
    const rows = ms.active.map(id => {
      const m = mById(id), ready = ms.ready.includes(id), p = Math.min(m.goal, ms.progress[id] || 0);
      return `<div class="mission ${ready ? "ready" : ""}"><div class="m-txt"><b>${m.text}</b>
        <div class="m-bar"><i style="width:${(p / m.goal) * 100}%"></i><span>${p}/${m.goal}</span></div></div>
        ${ready ? `<button class="btn btn-green m-claim" data-id="${id}">${appleArt()}<span>${m.reward}</span></button>` : `<div class="m-reward">${appleArt()} ${m.reward}</div>`}</div>`;
    }).join("") || `<p class="lead">All missions complete. Master blade!</p>`;
    const m = openModal(`${ribbon("MISSIONS")}<div class="modal-body">${rows}
      <p class="sub center-t">${ms.done.length} / ${C.missions.length} completed</p>
      <button class="btn btn-blue btn-wide" id="m-close"><span>Close</span></button></div>`, "missions");
    m.querySelectorAll(".m-claim").forEach(b => b.addEventListener("click", () => {
      const id = b.dataset.id, mi = mById(id), r = b.getBoundingClientRect();
      ms.ready = ms.ready.filter(x => x !== id); ms.active = ms.active.filter(x => x !== id); ms.done.push(id);
      apples += mi.reward; fillMissions(); save();
      Sound.play("coin"); FX.sparkle(r.left + r.width / 2, r.top + r.height / 2, 12, 30);
      refreshApples(); refreshDots(); setTimeout(showMissions, 300);
    }));
    on(m, "#m-close", closeModal);
  }

  // ---------- HUD ------------------------------------------------------------------
  function renderDots(n) {
    const per = C.play.stagesPerBoss, k = (n - 1) % per;
    $("#dots").innerHTML = Array.from({ length: per }, (_, i) =>
      i === per - 1 ? `<i class="boss-dot ${i < k ? "done" : ""} ${i === k ? "cur" : ""}">${art("boss", "inline")}</i>` : `<i class="${i < k ? "done" : ""} ${i === k ? "cur" : ""}"></i>`).join("");
  }
  Game.on.stage = st => {
    renderDots(st.n);
    $("#stage-label").textContent = st.boss ? `BOSS: ${st.boss.name.toUpperCase()}` : `STAGE ${st.n}`;
    $("#stage-label").classList.toggle("boss", !!st.boss);
    if (st.boss) {
      const b = $("#boss-banner");
      b.innerHTML = `<small>BOSS FIGHT</small><b>${st.boss.name}</b>`;
      b.hidden = false; b.classList.remove("go"); b.offsetWidth; b.classList.add("go");
      Sound.play("boss"); vibrate([30, 40, 30]);
      setTimeout(() => { b.hidden = true; }, 1800);
    }
  };
  Game.on.knives = (left, total) => {
    $("#kleft").innerHTML = Array.from({ length: total }, (_, i) => `<li class="${i < total - left ? "used" : ""}">${ICON.knife}</li>`).reverse().join("");
  };
  Game.on.score = sc => { $("#score").textContent = sc; if (sc) bump($("#score")); };
  Game.on.apple = (runApples, px, py) => {
    apples += C.play.applesPerSlice; runApplesBanked += C.play.applesPerSlice; save();
    const pill = $("#screen-game .apples-pill");
    FX.fly(px, py, pill, appleArt(), () => { refreshApples(); bump(pill); Sound.play("coin"); });
  };
  Game.on.clear = st => {
    const msgs = ["NICE!", "GREAT!", "AWESOME!", "SUPERB!"];
    if (!st.boss) { FX.text(innerWidth / 2, innerHeight * 0.34, msgs[(st.n - 1) % msgs.length], "f-praise"); return false; }
    bossesRun++;
    apples += E.bossApples; save();
    setTimeout(() => showBossWin(st.boss), 650);
    return true;                                     // hold the next stage until the reward closes
  };
  Game.on.fail = () => { $("#tap-hint").hidden = true; };
  Game.on.over = st => setTimeout(() => showGameOver(st), 250);

  function showBossWin(boss) {
    const reward = kById(boss.reward), isNew = reward && !owned.has(reward.id);
    if (isNew) { owned.add(reward.id); save(); }
    Sound.play("win"); FX.confetti(110);
    const m = openModal(`
      ${ribbon("BOSS DEFEATED!")}
      <div class="modal-body center">
        <p class="lead big">${boss.name} is down!</p>
        ${isNew ? `<div class="unlock-stage">${rays()}<div class="big-art bob" id="bw-knife"></div></div>
          <p class="lead">New knife: <b>${reward.name}</b></p>` : `<div class="big-art bob">${art("boss")}</div>`}
        <div class="reward">${appleArt()} +${E.bossApples}</div>
        ${isNew ? `<button class="btn btn-purple btn-wide" id="bw-equip"><span>Use it now</span></button>` : ""}
        <button class="btn btn-green btn-wide btn-big pulse" id="bw-go">${ICON.play}<span>Continue</span></button>
      </div>`, "bosswin");
    if (isNew) m.querySelector("#bw-knife").appendChild(Skins.knifePreview(reward.id, 120, 120, 0.75));
    refreshApples();
    const go = () => { closeModal(); Game.next(); };
    on(m, "#bw-equip", () => { knife = reward.id; save(); Game.setKnife(knife); refreshHome(); go(); });
    on(m, "#bw-go", go);
  }

  // ---------- input --------------------------------------------------------------------
  function bindInput() {
    const gs = $("#screen-game");
    gs.addEventListener("pointerdown", e => {
      if (e.target.closest("button") || modalOpen()) return;
      if (Game.throw()) { $("#tap-hint").hidden = true; vibrate(6); }
    });
    window.addEventListener("keydown", e => {
      if (document.body.dataset.screen !== "game" || modalOpen()) return;
      if (e.key === " " || e.key === "ArrowUp") { e.preventDefault(); if (!e.repeat) Game.throw(); }
      if (e.key === "Escape" && Game.mode === "play") showSettings(true);
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && Game.mode === "play" && document.body.dataset.screen === "game" && !modalOpen()) showSettings(true);
    });
  }

  // ---------- flow ----------------------------------------------------------------------
  let revived = false, runApplesBanked = 0, bossesRun = 0;
  function startGame() {
    closeModal();
    showScreen("game");
    revived = false; runApplesBanked = 0; bossesRun = 0;
    $("#score").textContent = "0";
    Game.start(knife);
    if (!store.get("tutorial", false)) { $("#tap-hint").hidden = false; store.set("tutorial", true); }
  }
  function goHome() { showScreen("home"); Game.demo(knife); }

  function showGameOver(st) {
    const isBest = st.score > best.score, stageBest = st.stage > best.stage;
    best.score = Math.max(best.score, st.score); best.stage = Math.max(best.stage, st.stage);
    save();
    let banked = false;
    const bank = () => {
      if (banked) return; banked = true; games++;
      bumpMission("stage", st.stage); bumpMission("score", st.score); bumpMission("apples", st.apples);
      bumpMission("bosses", bossesRun); bumpMission("games", 1); bumpMission("knives", st.thrown);
      save();
      checkStageUnlocks().forEach(k => toast(`New knife unlocked: ${k.name}!`));
    };
    Sound.play("over");
    const m = openModal(`
      ${ribbon(isBest ? "NEW RECORD!" : "GAME OVER")}
      <div class="modal-body center">
        <div class="final-score"><small>SCORE</small><b>${st.score}</b></div>
        ${isBest ? `<div class="new-best">${art("crown", "inline")} NEW BEST! ${art("crown", "inline")}</div>` : `<div class="final-best">${art("crown", "inline")} Best ${best.score}</div>`}
        <div class="stat-row">
          <div><b>${st.stage}</b><small>Stage${stageBest ? " ★" : ""}</small></div>
          <div><b>${st.apples}</b><small>Apples</small></div>
          <div><b>${bossesRun}</b><small>Bosses</small></div>
        </div>
        ${!revived ? `<button class="btn btn-green btn-wide pulse" id="m-revive">${art("video", "inline")}<span>Continue</span><small>retry stage ${st.stage}, keep your score</small></button>` : ""}
        <div class="btn-row">
          <button class="btn btn-orange" id="m-home">${ICON.home}<span>Home</span></button>
          <button class="btn btn-blue" id="m-again">${ICON.restart}<span>Again</span></button>
        </div>
        ${runApplesBanked > 0 ? `<button class="link-btn" id="m-x2">${art("video", "inline")} Double your apples (+${runApplesBanked})</button>` : ""}
      </div>`, "gameover");
    if (isBest) { FX.confetti(110); Sound.play("win"); }
    on(m, "#m-revive", async () => {
      closeModal();
      if (await Ads.showRewarded()) { revived = true; Game.revive(); }
      else showGameOver(st);
    });
    on(m, "#m-x2", async el => {
      el.disabled = true;
      if (await Ads.showRewarded()) {
        apples += runApplesBanked; runApplesBanked = 0; save(); refreshApples(); Sound.play("coin");
        el.outerHTML = `<p class="sub">Apples doubled!</p>`;
        const rv = m.querySelector("#m-revive"); if (rv) rv.remove();
      } else el.disabled = false;
    });
    const after = async next => {
      bank();
      if (C.ads.interstitialEveryGames && games % C.ads.interstitialEveryGames === 0) await Ads.showInterstitial();
      next();
    };
    on(m, "#m-again", () => { closeModal(); after(startGame); });
    on(m, "#m-home", () => { closeModal(); after(goHome); });
  }

  // ---------- settings / gift ------------------------------------------------------
  function showSettings(inGame) {
    if (inGame) Game.setPaused(true);
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
    on(m, "#m-resume", () => { closeModal(); Game.setPaused(false); });
    on(m, "#m-quit", () => {
      closeModal(); Game.setPaused(false);
      // quitting still counts the run
      if (Game.mode === "play") { best.score = Math.max(best.score, Game.score); best.stage = Math.max(best.stage, Game.stage); games++; bumpMission("games", 1); save(); }
      goHome();
    });
  }
  const today = () => new Date().toLocaleDateString("en-CA");
  function giftState() {
    const d = store.get("gift", { last: null, streak: 0 });
    const y = new Date(Date.now() - 864e5).toLocaleDateString("en-CA"), n = E.dailyRewards.length, available = d.last !== today();
    return { available, day: available ? (d.last === y ? d.streak % n : 0) : (d.streak - 1) % n };
  }
  function showGift() {
    const st = giftState(), RW = E.dailyRewards, reward = RW[st.day];
    const m = openModal(`
      ${ribbon("DAILY GIFT")}
      <div class="modal-body center">
        <div class="unlock-stage">${st.available ? rays() : ""}<div class="big-art ${st.available ? "bob" : ""}" id="chest">${art(st.available ? "chestClosed" : "chestOpen")}</div></div>
        <div class="days">${RW.map((r, i) => `<div class="day ${i < st.day || (!st.available && i === st.day) ? "done" : ""} ${i === st.day && st.available ? "today" : ""} ${i === RW.length - 1 ? "big" : ""}"><small>Day ${i + 1}</small>${appleArt()}<b>${r}</b></div>`).join("")}</div>
        ${st.available ? `<div class="btn-row"><button class="btn btn-orange" id="m-claim"><span>Claim ${reward}</span></button>
          <button class="btn btn-green" id="m-x2">${art("video", "inline")}<span>x2</span></button></div>`
          : `<p class="lead">Come back tomorrow for Day ${((st.day + 1) % RW.length) + 1}!</p><button class="btn btn-green btn-wide" id="m-close"><span>OK</span></button>`}
      </div>`, "daily");
    const claim = amount => {
      store.set("gift", { last: today(), streak: st.day + 1 });
      apples += amount; save(); refreshApples(); refreshDots();
      Sound.play("unlock"); FX.confetti(70);
      const c = m.querySelector("#chest"); if (c) { c.innerHTML = art("chestOpen"); c.classList.add("pop"); }
      FX.text(innerWidth / 2, innerHeight * 0.45, `+${amount} ${appleArt()}`, "f-coin big");
      m.querySelectorAll("#m-claim, #m-x2").forEach(b => { b.disabled = true; });
      setTimeout(closeModal, 1100);
    };
    on(m, "#m-claim", () => claim(reward));
    on(m, "#m-x2", async () => { const ok = await Ads.showRewarded(); claim(ok ? reward * 2 : reward); });
    on(m, "#m-close", closeModal);
  }

  // ---------- home / screens --------------------------------------------------------
  function refreshDots() {
    $("#gift-dot").hidden = !giftState().available;
    $("#missions-dot").hidden = !ms.ready.length;
    const affordable = C.knives.some(k => !owned.has(k.id) && k.price && apples >= k.price);
    $("#knives-dot").hidden = !(affordable || [...owned].some(id => !seen.has(id)));
  }
  function refreshHome() {
    $("#home-stage").textContent = best.stage;
    $("#home-score").textContent = best.score;
    $("#equip-prev").innerHTML = ""; $("#equip-prev").appendChild(Skins.knifePreview(knife, 40, 40, 0.75));
    refreshDots(); refreshApples();
  }
  function showScreen(name) {
    $$(".screen").forEach(s => s.classList.toggle("active", s.id === "screen-" + name));
    document.body.dataset.screen = name;
    if (name === "home") refreshHome();
    refreshApples();
  }
  function buildLogo() {
    if (hasImg(C.art.logo.image)) { $("#logo-wrap").innerHTML = `<img class="logo-img" src="${C.art.logo.image}" alt="${C.title}">`; return; }
    const [a, b] = C.titleLines;
    $("#logo-wrap").innerHTML = `<h1 class="logo-css"><span class="l1">${a}</span><span class="l2">${b}<i class="slash"></i></span></h1>`;
  }

  function bind() {
    const click = (sel, fn) => $(sel).addEventListener("click", e => { e.stopPropagation(); Sound.play("click"); fn(); });
    click("#btn-play", startGame);
    click("#btn-knives", showKnives);
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
    Game.demo(knife);
    const urls = Object.values(C.art).map(a => a.image).filter(Boolean);
    let done = 0;
    await Promise.all(urls.map(u => probe(u).then(() => { done++; $("#load-fill").style.width = (done / urls.length) * 100 + "%"; })));
    if (document.fonts && document.fonts.ready) await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1500))]);
    $$("[data-art]").forEach(el => { el.innerHTML = art(el.dataset.art, "inline"); });
    checkStageUnlocks();
    fillMissions(); save();
    buildLogo(); bind();
    showScreen("home");
  }
  boot();
})();

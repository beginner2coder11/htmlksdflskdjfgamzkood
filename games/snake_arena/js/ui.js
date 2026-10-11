/* ==========================================================================
   UI — home (nickname), HUD (leaderboard, minimap, boost, kill feed), input,
   skins shop, missions, daily gift, game over / revive. Drives Arena.
   ========================================================================== */
(() => {
  const C = window.GAME_CONFIG, E = C.economy;
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];

  // ---------- storage ------------------------------------------------------
  const store = {
    get(k, d) { try { const v = localStorage.getItem("sa_" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("sa_" + k, JSON.stringify(v)); } catch (e) {} }
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
    bolt: '<svg viewBox="0 0 24 24"><path d="M13 2 4 14h7l-1 8 9-12h-7Z"/></svg>'
  };

  // ---------- persistent state --------------------------------------------
  const settings = Object.assign({ sound: true, music: true, vibe: true }, store.get("settings", {}));
  let coins = store.get("coins", E.startCoins);
  const best = Object.assign({ len: 0, kills: 0 }, store.get("best", {}));
  let games = store.get("games", 0);
  let nick = store.get("nick", "");
  const owned = new Set(store.get("owned", C.skins.filter(s => !s.price).map(s => s.id)));
  let skin = store.get("skin", C.skins[0].id);
  const ms = Object.assign({ active: [], progress: {}, done: [], ready: [] }, store.get("missions", {}));
  const save = () => {
    store.set("coins", coins); store.set("best", best); store.set("games", games); store.set("nick", nick);
    store.set("owned", [...owned]); store.set("skin", skin); store.set("missions", ms);
  };
  Sound.setSfx(settings.sound); Sound.setMusic(settings.music);
  Arena.on.vibeOn = () => settings.vibe;
  const vibrate = m => { if (C.vibration && settings.vibe && navigator.vibrate) navigator.vibrate(m); };

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
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  function toast(msg) {
    $$(".toast").forEach(t => t.remove());
    const el = document.createElement("div"); el.className = "toast"; el.textContent = msg;
    document.body.appendChild(el); setTimeout(() => el.remove(), 1600);
  }
  function refreshCoins() { $$(".coin-count").forEach(e => { e.textContent = coins.toLocaleString(); }); }

  // ---------- missions -----------------------------------------------------
  const mById = id => C.missions.find(m => m.id === id);
  function fillMissions() {
    while (ms.active.length < 3) {
      const next = C.missions.find(m => !ms.done.includes(m.id) && !ms.active.includes(m.id));
      if (!next) break;
      ms.active.push(next.id);
    }
  }
  // "lower" missions (rank) count as done once the value is at or below the goal
  function bumpMission(type, value, how = "max") {
    ms.active.forEach(id => {
      const m = mById(id);
      if (!m || m.type !== type || ms.ready.includes(id)) return;
      if (m.lower) { if (value > 0 && value <= m.goal) { ms.progress[id] = m.goal; ms.ready.push(id); missionToast(m); } return; }
      const prev = ms.progress[id] || 0, v = how === "add" ? prev + value : Math.max(prev, value);
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
      const m = mById(id), ready = ms.ready.includes(id);
      const p = m.lower ? (ready ? 1 : 0) : Math.min(m.goal, Math.floor(ms.progress[id] || 0)), g = m.lower ? 1 : m.goal;
      return `<div class="mission ${ready ? "ready" : ""}"><div class="m-txt"><b>${m.text}</b>
        <div class="m-bar"><i style="width:${(p / g) * 100}%"></i><span>${m.lower ? (ready ? "Done!" : "Not yet") : p.toLocaleString() + "/" + g.toLocaleString()}</span></div></div>
        ${ready ? `<button class="btn btn-green m-claim" data-id="${id}">${coinArt()}<span>${m.reward}</span></button>` : `<div class="m-reward">${coinArt()} ${m.reward}</div>`}</div>`;
    }).join("") || `<p class="lead">All missions complete — legend!</p>`;
    const m = openModal(`${ribbon("MISSIONS")}<div class="modal-body">${rows}
      <p class="sub center-t">${ms.done.length} / ${C.missions.length} completed</p>
      <button class="btn btn-blue btn-wide" id="m-close"><span>Close</span></button></div>`, "missions");
    m.querySelectorAll(".m-claim").forEach(b => b.addEventListener("click", () => {
      const id = b.dataset.id, mi = mById(id), r = b.getBoundingClientRect();
      ms.ready = ms.ready.filter(x => x !== id); ms.active = ms.active.filter(x => x !== id); ms.done.push(id);
      coins += mi.reward; fillMissions(); save();
      Sound.play("unlock"); FX.sparkle(r.left + r.width / 2, r.top + r.height / 2, 12, 30);
      refreshCoins(); refreshDots(); setTimeout(showMissions, 300);
    }));
    on(m, "#m-close", closeModal);
  }

  // ---------- HUD ----------------------------------------------------------
  const minimap = $("#minimap");
  Arena.on.hud = (p, st) => {
    $("#len").textContent = Math.floor(p.mass).toLocaleString();
    $("#kills").textContent = st.kills;
    const pw = Object.keys(C.powerups).filter(k => p.fx[k] > 0).map(k => `<div class="pw" style="--c:${C.powerups[k].color}"><span>${C.powerups[k].emoji}</span><i style="width:${(p.fx[k] / C.powerups[k].time) * 100}%"></i></div>`).join("");
    $("#active-pw").innerHTML = pw;
    $("#btn-boost").classList.toggle("on", p.boosting);
    $("#btn-boost").classList.toggle("low", p.mass <= C.snake.minBoostMass + 2 && p.fx.turbo <= 0);
    Arena.drawMinimap(minimap);
  };
  Arena.on.board = (top, rank, total) => {
    if (document.body.dataset.screen !== "game") return;
    const me = Arena.player;
    $("#board").innerHTML = top.map((s, i) => `<li class="${s.isPlayer ? "me" : ""}"><b>${i + 1}</b><span>${esc(s.name)}</span><em>${Math.floor(s.mass).toLocaleString()}</em></li>`).join("")
      + (rank > 5 && me ? `<li class="me sep"><b>${rank}</b><span>${esc(me.name)}</span><em>${Math.floor(me.mass).toLocaleString()}</em></li>` : "");
    $("#rank").textContent = rank ? `#${rank}` : "–";
    $("#rank-of").textContent = `of ${total}`;
  };
  Arena.on.rankUp = rank => {
    if (rank <= 3) {
      Sound.play("rankUp");
      FX.text(innerWidth / 2, innerHeight * 0.24, rank === 1 ? "#1 — BIGGEST SNAKE!" : `TOP ${rank}!`, rank === 1 ? "f-big gold" : "f-big");
      if (rank === 1) FX.confetti(80);
    }
  };
  Arena.on.power = type => { const p = C.powerups[type]; FX.text(innerWidth / 2, innerHeight * 0.3, `${p.emoji} ${p.label.toUpperCase()}!`, "f-power"); };
  function feed(html, mine) {
    const li = document.createElement("li");
    li.className = mine ? "mine" : ""; li.innerHTML = html;
    const f = $("#feed"); f.prepend(li);
    while (f.children.length > 4) f.lastChild.remove();
    setTimeout(() => li.classList.add("fade"), 3200);
    setTimeout(() => li.remove(), 3800);
  }
  let killedBy = null;
  Arena.on.kill = (victim, killer) => {
    if (Arena.mode === "demo" || document.body.dataset.screen !== "game") return;
    if (killer && killer.isPlayer) {
      feed(`${art("skull", "inline")} You trapped <b>${esc(victim.name)}</b>!`, true);
      FX.text(innerWidth / 2, innerHeight * 0.38, `TRAPPED ${esc(victim.name).toUpperCase()}!`, "f-kill");
    } else if (victim.isPlayer) {
      killedBy = killer ? killer.name : null;
    } else if (killer) feed(`<b>${esc(killer.name)}</b> trapped ${esc(victim.name)}`);
  };
  Arena.on.over = st => showGameOver(st);

  // ---------- input --------------------------------------------------------
  function bindInput() {
    const gs = $("#screen-game");
    const aimAt = (x, y) => Arena.setAim(Math.atan2(y - innerHeight / 2, x - innerWidth / 2));
    let steer = null;
    gs.addEventListener("pointerdown", e => {
      if (e.target.closest("button") || modalRoot.classList.contains("open")) return;
      steer = e.pointerId; aimAt(e.clientX, e.clientY);
      if (e.pointerType === "mouse" && e.button === 0) Arena.setBoost(true);
    });
    gs.addEventListener("pointermove", e => {
      if (e.pointerType === "mouse" || e.pointerId === steer) aimAt(e.clientX, e.clientY);
    });
    const up = e => { if (e.pointerId === steer) steer = null; if (e.pointerType === "mouse") Arena.setBoost(false); };
    gs.addEventListener("pointerup", up); gs.addEventListener("pointercancel", up);
    const boost = $("#btn-boost");
    boost.addEventListener("pointerdown", e => { e.preventDefault(); e.stopPropagation(); Arena.setBoost(true); Sound.play("boost"); });
    ["pointerup", "pointercancel", "pointerleave"].forEach(ev => boost.addEventListener(ev, () => Arena.setBoost(false)));
    // keyboard: arrows / A-D turn, Space boosts
    const keys = new Set();
    window.addEventListener("keydown", e => {
      if (document.body.dataset.screen !== "game" || modalRoot.classList.contains("open")) return;
      if (e.key === " ") { e.preventDefault(); if (!e.repeat) Sound.play("boost"); Arena.setBoost(true); }
      if (["ArrowLeft", "ArrowRight", "a", "d", "A", "D"].includes(e.key)) { keys.add(e.key.toLowerCase()); e.preventDefault(); }
      if (e.key === "Escape" && Arena.mode === "play") showSettings(true);
    });
    window.addEventListener("keyup", e => { if (e.key === " ") Arena.setBoost(false); keys.delete(e.key.toLowerCase()); });
    setInterval(() => {
      if (!keys.size || !Arena.player) return;
      const dir = (keys.has("arrowright") || keys.has("d") ? 1 : 0) - (keys.has("arrowleft") || keys.has("a") ? 1 : 0);
      if (dir) Arena.setAim(Arena.player.target + dir * 0.12);
    }, 30);
    document.addEventListener("visibilitychange", () => { if (document.hidden && Arena.mode === "play" && document.body.dataset.screen === "game" && !modalRoot.classList.contains("open")) showSettings(true); });
  }

  // ---------- flow ---------------------------------------------------------
  let revived = false;
  function startGame() {
    closeModal();
    nick = ($("#nick").value || "").trim().slice(0, 12); save();
    showScreen("game");
    revived = false; killedBy = null;
    $("#feed").innerHTML = ""; $("#active-pw").innerHTML = "";
    Arena.start({ name: nick || "You", skin });
    if (!store.get("tutorial", false)) { $("#tap-hint").hidden = false; setTimeout(() => { $("#tap-hint").hidden = true; store.set("tutorial", true); }, 4500); }
  }
  function goHome() { showScreen("home"); Arena.demo(); }

  function showGameOver(st) {
    const len = st.maxLen, isBest = len > best.len;
    if (isBest) best.len = len;
    best.kills = Math.max(best.kills, st.kills);
    save();
    const earned = Math.floor(len * E.coinsPerLength + st.kills * E.coinsPerKill);
    let banked = false;
    const bank = () => {
      if (banked) return; banked = true;
      coins += earned; games++;
      bumpMission("length", len); bumpMission("kills", st.kills); bumpMission("rank", st.bestRank);
      bumpMission("foodTotal", st.food, "add"); bumpMission("killsTotal", st.kills, "add"); bumpMission("games", 1, "add");
      save(); refreshCoins();
    };
    const mins = Math.floor(st.time / 60), secs = Math.floor(st.time % 60);
    const m = openModal(`
      ${ribbon(isBest ? "NEW RECORD!" : killedBy ? "TRAPPED!" : "OUT OF BOUNDS!")}
      <div class="modal-body center">
        <div class="go-snake" id="go-snake"></div>
        <p class="lead">${killedBy ? `You ran into <b>${esc(killedBy)}</b>` : "You hit the arena wall"}</p>
        <div class="final-score"><small>LENGTH</small><b>${len.toLocaleString()}</b></div>
        ${isBest ? `<div class="new-best">${art("crown", "inline")} NEW BEST! ${art("crown", "inline")}</div>` : `<div class="final-best">${art("crown", "inline")} Best ${best.len.toLocaleString()}</div>`}
        <div class="stat-row">
          <div><b>${st.kills}</b><small>Trapped</small></div>
          <div><b>#${st.bestRank < 99 ? st.bestRank : "–"}</b><small>Best rank</small></div>
          <div><b>${mins}:${String(secs).padStart(2, "0")}</b><small>Time</small></div>
        </div>
        <div class="reward">${coinArt()} +${earned}</div>
        ${!revived ? `<button class="btn btn-green btn-wide pulse" id="m-revive">${art("video", "inline")}<span>Continue</span><small>respawn with half your length</small></button>` : ""}
        <div class="btn-row">
          <button class="btn btn-orange" id="m-home">${ICON.home}<span>Home</span></button>
          <button class="btn btn-blue" id="m-again">${ICON.restart}<span>Again</span></button>
        </div>
        ${earned > 0 ? `<button class="link-btn" id="m-x2">${art("video", "inline")} Double coins (+${earned})</button>` : ""}
      </div>`, "gameover");
    m.querySelector("#go-snake").appendChild(Skins.preview(skin, 150, 60));
    refreshCoins();
    if (isBest) { FX.confetti(110); Sound.play("newbest"); }
    on(m, "#m-revive", async () => {
      closeModal();
      if (await Ads.showRewarded()) { revived = true; killedBy = null; Arena.revive(); }
      else showGameOver(st);
    });
    on(m, "#m-x2", async el => {
      el.disabled = true;
      if (await Ads.showRewarded()) {
        bank(); coins += earned; save(); refreshCoins(); Sound.play("unlock");
        el.outerHTML = `<p class="sub">Coins doubled!</p>`;
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

  // ---------- skins / settings / daily gift --------------------------------
  function showSkins() {
    const m = openModal(`
      ${ribbon("SKINS")}
      <div class="modal-body">
        <div class="shop-coins pill">${coinArt()}<b class="coin-count">${coins.toLocaleString()}</b></div>
        <div class="skins">${C.skins.map(s => `
          <button class="skin ${skin === s.id ? "equipped" : ""} ${owned.has(s.id) ? "owned" : ""}" data-id="${s.id}" data-price="${s.price}">
            <div class="skin-prev" data-prev="${s.id}"></div><b>${s.name}</b>
            <span class="tag">${skin === s.id ? "Wearing" : owned.has(s.id) ? "Wear" : `${coinArt()} ${s.price.toLocaleString()}`}</span>
          </button>`).join("")}</div>
        <button class="btn btn-green btn-wide" id="m-close"><span>Done</span></button>
      </div>`, "shop");
    m.querySelectorAll("[data-prev]").forEach(el => el.appendChild(Skins.preview(el.dataset.prev, 96, 40)));
    m.querySelectorAll("[data-id]").forEach(b => b.addEventListener("click", () => {
      const id = b.dataset.id, price = +b.dataset.price;
      if (!owned.has(id)) {
        if (coins < price) { b.classList.remove("nope"); b.offsetWidth; b.classList.add("nope"); Sound.play("click"); return toast("Not enough coins"); }
        coins -= price; owned.add(id); Sound.play("unlock"); FX.confetti(50);
      } else Sound.play("click");
      skin = id; save(); refreshCoins(); refreshHome();
      showSkins();
    }));
    on(m, "#m-close", closeModal);
  }
  function showSettings(inGame) {
    if (inGame) Arena.setPaused(true);
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
    on(m, "#m-resume", () => { closeModal(); Arena.setPaused(false); });
    on(m, "#m-quit", () => { closeModal(); Arena.setPaused(false); goHome(); });
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
      Sound.play("unlock"); FX.confetti(70);
      const c = m.querySelector("#chest"); if (c) { c.innerHTML = art("chestOpen"); c.classList.add("pop"); }
      FX.text(innerWidth / 2, innerHeight * 0.45, `+${amount} ${coinArt()}`, "f-coin big");
      setTimeout(closeModal, 1100);
    };
    on(m, "#m-claim", () => claim(reward));
    on(m, "#m-x2", async () => { const ok = await Ads.showRewarded(); claim(ok ? reward * 2 : reward); });
    on(m, "#m-close", closeModal);
  }

  // ---------- home / screens ----------------------------------------------
  function refreshDots() { $("#gift-dot").hidden = !giftState().available; $("#missions-dot").hidden = !ms.ready.length; }
  function refreshHome() {
    $("#home-best").textContent = best.len.toLocaleString();
    $("#home-skin").innerHTML = ""; $("#home-skin").appendChild(Skins.preview(skin, 120, 48));
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
    $("#logo-wrap").innerHTML = `<h1 class="logo-css"><span class="l1">${[...a].map((ch, i) => `<i style="--i:${i}">${ch}</i>`).join("")}</span><span class="l2">${b}</span></h1>`;
  }

  function bind() {
    const click = (sel, fn) => $(sel).addEventListener("click", e => { e.stopPropagation(); Sound.play("click"); fn(); });
    click("#btn-play", startGame);
    click("#btn-skins", showSkins);
    click("#home-skin", showSkins);
    click("#btn-missions", showMissions);
    click("#btn-gift", showGift);
    click("#btn-settings", () => showSettings(false));
    click("#btn-pause", () => showSettings(true));
    $("#nick").addEventListener("change", () => { nick = $("#nick").value.trim().slice(0, 12); save(); });
    $("#nick").addEventListener("keydown", e => { if (e.key === "Enter") { e.target.blur(); startGame(); } });
    bindInput();
  }

  async function boot() {
    $("#btn-settings").innerHTML = ICON.gear;
    $("#btn-pause").innerHTML = ICON.pause;
    $("#btn-play .bi").innerHTML = ICON.play;
    $("#btn-boost").innerHTML = ICON.bolt + "<span>BOOST</span>";
    $("#nick").value = nick;
    Arena.demo();
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

/* ==========================================================================
   UI — home (mode switch + self-solving demo), level map, HUD and helpers
   (undo / +tube / hint / restart), win & chest flow, daily challenge, shop,
   missions, daily gift, settings. Drives Board.
   ========================================================================== */
(() => {
  const C = window.GAME_CONFIG, E = C.economy, R = C.rules;
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];

  // ---------- storage --------------------------------------------------------
  const store = {
    get(k, d) { try { const v = localStorage.getItem("bs_" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("bs_" + k, JSON.stringify(v)); } catch (e) {} }
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
    gear: '<svg viewBox="0 0 24 24"><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm8.9 4.7-1.7-.3a7.6 7.6 0 0 1-.7 1.7l1 1.4a1 1 0 0 1-.1 1.3l-1.2 1.2a1 1 0 0 1-1.3.1l-1.4-1a7.6 7.6 0 0 1-1.7.7l-.3 1.7a1 1 0 0 1-1 .8h-1.7a1 1 0 0 1-1-.8l-.3-1.7a7.6 7.6 0 0 1-1.7-.7l-1.4 1a1 1 0 0 1-1.3-.1L4 17.3a1 1 0 0 1-.1-1.3l1-1.4a7.6 7.6 0 0 1-.7-1.7l-1.7-.3a1 1 0 0 1-.8-1v-1.7a1 1 0 0 1 .8-1l1.7-.3c.2-.6.4-1.2.7-1.7l-1-1.4A1 1 0 0 1 4 4.2L5.2 3a1 1 0 0 1 1.3-.1l1.4 1a7.6 7.6 0 0 1 1.7-.7L9.9 1.5a1 1 0 0 1 1-.8h1.7a1 1 0 0 1 1 .8l.3 1.7c.6.2 1.2.4 1.7.7l1.4-1a1 1 0 0 1 1.3.1L19.5 4a1 1 0 0 1 .1 1.3l-1 1.4c.3.5.5 1.1.7 1.7l1.7.3a1 1 0 0 1 .8 1v1.7a1 1 0 0 1-.8 1Z"/></svg>',
    home: '<svg viewBox="0 0 24 24"><path d="M3 11.2 12 3.5l9 7.7V20a1.5 1.5 0 0 1-1.5 1.5H15v-6h-6v6H4.5A1.5 1.5 0 0 1 3 20Z"/></svg>',
    restart: '<svg viewBox="0 0 24 24"><path d="M12 4.5V1L7 6l5 5V7.5a5.5 5.5 0 1 1-5.5 5.5H3.5A8.5 8.5 0 1 0 12 4.5Z"/></svg>',
    play: '<svg viewBox="0 0 24 24"><path d="M7 4.5v15a1 1 0 0 0 1.5.9l12-7.5a1 1 0 0 0 0-1.8l-12-7.5A1 1 0 0 0 7 4.5Z"/></svg>',
    back: '<svg viewBox="0 0 24 24"><path d="M15.5 3.5 7 12l8.5 8.5 2-2L11 12l6.5-6.5Z"/></svg>',
    star: '<svg viewBox="0 0 24 24"><path d="m12 2 2.9 6.6 7.1.7-5.4 4.8 1.6 7L12 17.3 5.8 21l1.6-7L2 9.3l7.1-.7Z"/></svg>',
    lock: '<svg viewBox="0 0 24 24"><path d="M7 10V7a5 5 0 0 1 10 0v3h1a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V11a1 1 0 0 1 1-1Zm2 0h6V7a3 3 0 0 0-6 0Z"/></svg>',
    map: '<svg viewBox="0 0 24 24"><path d="M9 3 3 5.5v15.5l6-2.5 6 2.5 6-2.5V3l-6 2.5Zm0 2.2 6 2.5v11.1l-6-2.5Z"/></svg>'
  };

  // ---------- persistent state ---------------------------------------------
  const settings = Object.assign({ sound: true, music: true, vibe: true }, store.get("settings", {}));
  let coins = store.get("coins", E.startCoins);
  let mode = store.get("mode", "balls");
  const prog = Object.assign({ balls: { level: 1, stars: {} }, water: { level: 1, stars: {} } }, store.get("progress", {}));
  const owned = Object.assign({ balls: C.ballSkins.filter(s => !s.price).map(s => s.id), tubes: C.tubeSkins.filter(s => !s.price).map(s => s.id), themes: C.themes.filter(s => !s.price).map(s => s.id) }, store.get("owned", {}));
  const equip = Object.assign({ balls: C.ballSkins[0].id, tubes: C.tubeSkins[0].id, themes: C.themes[0].id }, store.get("equip", {}));
  const ms = Object.assign({ active: [], progress: {}, done: [], ready: [] }, store.get("missions", {}));
  let chest = store.get("chest", 0), levelsPlayed = store.get("played", 0);
  const daily = Object.assign({ last: null, streak: 0, count: 0 }, store.get("daily", {}));
  const save = () => {
    store.set("coins", coins); store.set("mode", mode); store.set("progress", prog); store.set("owned", owned);
    store.set("equip", equip); store.set("missions", ms); store.set("chest", chest); store.set("played", levelsPlayed); store.set("daily", daily);
  };
  Sound.setSfx(settings.sound); Sound.setMusic(settings.music);
  const vibrate = m => { if (C.vibration && settings.vibe && navigator.vibrate) navigator.vibrate(m); };
  Board.on.vibe = vibrate;
  const applyLooks = () => { Board.setSkins(equip.balls, equip.tubes); Board.setTheme(equip.themes); };
  applyLooks();

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
  const coinArt = () => art("coin", "inline");
  function toast(msg) {
    $$(".toast").forEach(t => t.remove());
    const el = document.createElement("div"); el.className = "toast"; el.textContent = msg;
    document.body.appendChild(el); setTimeout(() => el.remove(), 1700);
  }
  function refreshCoins() { $$(".coin-count").forEach(e => { e.textContent = coins.toLocaleString(); }); refreshTools(); }
  function bumpCoins() { $$(".pill").forEach(p => { p.classList.remove("bump"); p.offsetWidth; p.classList.add("bump"); }); }
  function spend(n) { if (coins < n) return false; coins -= n; save(); refreshCoins(); return true; }

  // ---------- levels --------------------------------------------------------
  // The same 500 solver-verified layouts serve both modes; each mode/level gets
  // its own color picks (and water shuffles the tube order) so they feel new.
  // Past 500 the list loops with fresh colors.
  function levelData(n, m = mode) {
    const base = Engine.decode(LEVELS[(n - 1) % LEVELS.length]);
    const lap = Math.floor((n - 1) / LEVELS.length);
    const rnd = Engine.RNG(n * 977 + lap * 31337 + (m === "water" ? 50021 : 0));
    const perm = rnd.shuffle([...Array(C.palette.length).keys()]);
    let tubes = base.tubes.map(t => t.map(c => perm[c]));
    if (m === "water" || lap) {
      const full = rnd.shuffle(tubes.filter(t => t.length)), empty = tubes.filter(t => !t.length);
      tubes = full.concat(empty);
    }
    const par = m === "balls" && !C.modes.balls.moveAll ? base.parBalls : base.par;
    return Object.assign(base, { tubes, par, n });
  }
  function starsFor(moves, par, extra) {
    const s = moves <= Math.ceil(par * (1 + R.starSlack)) ? 3 : moves <= Math.ceil(par * 1.7) ? 2 : 1;
    return extra ? Math.min(s, R.extraTubeMaxStars) : s;
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
  function bumpMission(type, value = 1) {
    ms.active.forEach(id => {
      const m = mById(id);
      if (!m || m.type !== type || ms.ready.includes(id)) return;
      const v = (ms.progress[id] || 0) + value;
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
        ${ready ? `<button class="btn btn-green m-claim" data-id="${id}">${coinArt()}<span>${m.reward}</span></button>` : `<div class="m-reward">${coinArt()} ${m.reward}</div>`}</div>`;
    }).join("") || `<p class="lead">All missions complete. You're a sorting legend!</p>`;
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

  // ---------- game -----------------------------------------------------------
  let cur = null;            // { n, daily, level, hinted, tutorial }
  let praiseStep = 0, lastTubeMove = -9;
  const PRAISE = ["Nice!", "Great!", "Sweet!", "Awesome!", "Amazing!", "Brilliant!"];

  function refreshTools() {
    if (!cur) return;
    const u = Board.undoLeft;
    $("#undo-count").innerHTML = u > 0 ? u : art("video", "inline");
    const tubeLeft = Board.extraUsed < R.extraTubes;
    $("#t-tube").classList.toggle("spent", !tubeLeft);
    $("#tube-cost").innerHTML = !tubeLeft ? "✓" : coins >= R.extraTubeCost ? `${R.extraTubeCost}` : art("video", "inline");
    $("#hint-cost").innerHTML = coins >= R.hintCost ? `${R.hintCost}` : art("video", "inline");
  }
  function refreshHud() {
    if (!cur) return;
    $("#moves").textContent = Board.moves;
    const s = starsFor(Board.moves, cur.level.par, Board.extraUsed > 0);
    $("#mini-stars").innerHTML = [0, 1, 2].map(i => `<i class="${i < s ? "on" : ""}">${ICON.star}</i>`).join("");
    refreshTools();
  }
  function startLevel(n, opts = {}) {
    closeModal();
    const isDaily = !!opts.daily;
    const level = isDaily ? dailyLevel() : levelData(n);
    if (!level) return toast("Could not build today's puzzle");
    cur = { n, daily: isDaily, level, tutorial: !isDaily && n <= 2 && !store.get("tut_" + mode, false) };
    showScreen("game");
    Board.stopDemo();
    Board.setSlot($("#board-slot"));
    Board.load(level, { mode });
    praiseStep = 0; lastTubeMove = -9;
    $("#lvl-title").textContent = isDaily ? "DAILY" : `LEVEL ${n}`;
    const badge = $("#lvl-badge");
    badge.hidden = !(level.hard || level.mystery);
    badge.className = "badge " + (level.hard ? "hard" : "mystery");
    badge.textContent = level.hard ? "HARD" : "MYSTERY";
    refreshHud();
    if (level.hard || level.mystery) {
      setTimeout(() => FX.text(innerWidth / 2, innerHeight * 0.3, level.hard ? "HARD LEVEL!" : "MYSTERY BALLS!", "f-big " + (level.hard ? "red" : "")), 350);
    }
    tutorial();
  }

  // tutorial: level 1–2 of each mode shows the move to make
  function tutorial() {
    const tut = $("#tut"), hand = $("#hand");
    if (!cur || !cur.tutorial || Board.won) { tut.hidden = true; hand.hidden = true; return; }
    setTimeout(() => {
      if (!cur || !cur.tutorial || Board.won) { tut.hidden = true; hand.hidden = true; return; }
      const h = Board.hint();
      if (!h) return;
      const sel = Board.selected;
      const target = Board.tubeRect(sel === -1 ? h.a : h.b);
      tut.hidden = false;
      tut.innerHTML = mode === "water"
        ? (Board.moves === 0 ? "Tap a tube, then tap where to <b>pour</b> it.<br>Liquid only goes onto the <b>same color</b> or an empty tube." : "Keep going: fill each tube with <b>one color</b>!")
        : (Board.moves === 0 ? "Tap a tube to pick up the top ball,<br>then tap where to drop it." : "Only the <b>same color</b> or an <b>empty</b> tube.<br>Fill each tube with one color!");
      if (target) { hand.hidden = false; hand.style.left = target.x + "px"; hand.style.top = (target.y + target.h * 0.55) + "px"; }
    }, 450);
  }

  Board.on.canTap = () => document.body.dataset.screen === "game" && !modalOpen();
  Board.on.select = () => { if (cur && cur.tutorial) { $("#hand").hidden = true; tutorial(); } };
  Board.on.move = mv => {
    refreshHud();
    if (mv.tubeDone) bumpMission("tubes", 1);
    if (cur && cur.tutorial) { $("#hand").hidden = true; tutorial(); }
  };
  Board.on.tube = (i, L) => {
    const rect = Board.tubeRect(i);
    if (!rect) return;
    FX.sparkle(rect.x, rect.y + rect.h * 0.3, 14, rect.w);
    FX.ring(rect.x, rect.y + rect.h * 0.5, "#fff6a8", 10, 8);
    const quick = Board.moves - lastTubeMove <= 3;
    praiseStep = quick ? Math.min(PRAISE.length - 1, praiseStep + 1) : 0;
    lastTubeMove = Board.moves;
    if (!Board.won) FX.text(rect.x, rect.y - rect.r * 1.5, PRAISE[praiseStep], "f-praise");
  };
  Board.on.nope = () => { if (cur && cur.tutorial) toast("Only the same color, or an empty tube!"); };
  Board.on.stuck = () => {
    if (!cur || Board.won) return;
    Sound.play("nope");
    const canTube = Board.extraUsed < R.extraTubes;
    const m = openModal(`${ribbon("NO MOVES!")}<div class="modal-body center">
      <div class="big-art">🤔</div>
      <p class="lead">You're out of moves. Try one of these:</p>
      <div class="btn-row"><button class="btn btn-blue" id="s-undo">${art("undo", "inline")}<span>Undo</span></button>
      ${canTube ? `<button class="btn btn-purple" id="s-tube">${art("tube", "inline")}<span>+Tube</span></button>` : ""}</div>
      <button class="btn btn-orange btn-wide" id="s-restart">${ICON.restart}<span>Restart</span></button></div>`, "stuck");
    on(m, "#s-undo", () => { closeModal(); doUndo(); });
    on(m, "#s-tube", () => { closeModal(); doTube(); });
    on(m, "#s-restart", () => { closeModal(); doRestart(); });
  };
  Board.on.win = st => showWin(st);

  // ---------- helpers -----------------------------------------------------------------
  async function doUndo() {
    if (!Board.historyLen) return toast("Nothing to undo");
    if (Board.undoLeft <= 0) {
      if (await Ads.showRewarded()) { Board.undoLeft += R.undoPerLevel; toast(`+${R.undoPerLevel} undos`); refreshHud(); }
      return;
    }
    if (Board.undo()) { Board.undoLeft--; refreshHud(); }
  }
  async function doTube() {
    if (Board.extraUsed >= R.extraTubes) return toast(R.extraTubes === 1 ? "Only one extra tube per level" : "No more extra tubes");
    const fire = () => { Board.addTube(); Sound.play("unlock"); refreshHud(); setTimeout(() => { const t = Board.tubeRect(Board.tubes.length - 1); if (t) FX.sparkle(t.x, t.y + t.h / 2, 12, t.w); }, 60); };
    if (spend(R.extraTubeCost)) { floatCost(R.extraTubeCost, "#t-tube"); fire(); }
    else if (await Ads.showRewarded()) fire();
  }
  async function doHint() {
    if (Board.won) return;
    const free = !!(cur && cur.tutorial);
    const show = () => { const h = Board.hint(); if (!h) { toast("No solution from here. Try Undo or +Tube"); return false; } Sound.play("reveal"); return true; };
    if (free) return show();
    if (coins >= R.hintCost) {
      if (Engine.solve(Board.colors, 4, { limit: 60000 }) === null) return toast("No solution from here. Try Undo or +Tube");
      spend(R.hintCost); floatCost(R.hintCost, "#t-hint"); show();
    } else if (await Ads.showRewarded()) show();
  }
  function doRestart() {
    if (!cur) return;
    Board.restart(); Sound.play("undo"); refreshHud(); tutorial();
  }
  function floatCost(n, sel) {
    const r = $(sel).getBoundingClientRect();
    FX.text(r.left + r.width / 2, r.top - 10, `-${n} ${coinArt()}`, "f-coin");
  }

  // ---------- win / chest ---------------------------------------------------------
  function showWin(st) {
    if (!cur) return;
    const L = cur.level, stars = starsFor(st.moves, L.par, st.extraUsed > 0);
    let earned;
    if (cur.daily) {
      const first = daily.last !== today();
      earned = first ? E.dailyChallengeCoins : 10;
      if (first) {
        const y = new Date(Date.now() - 864e5).toLocaleDateString("en-CA");
        daily.streak = daily.last === y ? daily.streak + 1 : 1; daily.last = today(); daily.count++;
        bumpMission("daily");
      }
    } else {
      const P = prog[mode], prev = P.stars[cur.n] || 0, firstClear = !prev;
      earned = firstClear ? (E.levelCoins + E.starCoins * stars) * (L.hard ? 2 : 1) : (stars > prev ? E.starCoins * (stars - prev) : 3);
      P.stars[cur.n] = Math.max(prev, stars);
      if (cur.n >= P.level) P.level = cur.n + 1;
      if (firstClear) { chest++; }
      if (cur.tutorial) store.set("tut_" + mode, true);
      bumpMission("levels");
      if (mode === "water") bumpMission("water");
      if (stars === 3) bumpMission("stars3");
      if (!st.usedUndo) bumpMission("noUndo");
      if (L.hard) bumpMission("hard");
      if (L.mystery) bumpMission("mystery");
    }
    levelsPlayed++;
    coins += earned; save();
    $("#tut").hidden = true; $("#hand").hidden = true;
    FX.confetti(130);
    const title = cur.daily ? "DAILY DONE!" : stars === 3 ? "PERFECT!" : stars === 2 ? "GREAT JOB!" : "LEVEL CLEAR!";
    const m = openModal(`
      ${ribbon(title)}
      <div class="modal-body center">
        <div class="win-stars">${[0, 1, 2].map(i => `<i class="s${i}">${ICON.star}</i>`).join("")}</div>
        <p class="lead">${cur.daily ? `Streak: <b>${daily.streak}</b> day${daily.streak === 1 ? "" : "s"} 🔥` : `Solved in <b>${st.moves}</b> moves · 3★ ≤ ${Math.ceil(L.par * (1 + R.starSlack))}`}</p>
        ${st.extraUsed ? `<p class="sub">Extra tube used: max 2★</p>` : ""}
        <div class="reward" id="w-reward">${coinArt()} +<span id="w-amt">${earned}</span></div>
        <button class="btn btn-green btn-wide btn-big pulse" id="w-next">${cur.daily ? ICON.home : ICON.play}<span>${cur.daily ? "Home" : "Next"}</span></button>
        <div class="btn-row slim">
          <button class="btn btn-blue" id="w-replay">${ICON.restart}<span>Replay</span></button>
          <button class="btn btn-purple" id="w-x2">${art("video", "inline")}<span>x2 coins</span></button>
        </div>
      </div>`, "win");
    // stars pop in one by one
    m.querySelectorAll(".win-stars i").forEach((el, i) => {
      if (i >= stars) return;
      setTimeout(() => { el.classList.add("on"); Sound.play("star", i); const r = el.getBoundingClientRect(); FX.sparkle(r.left + r.width / 2, r.top + r.height / 2, 10, 24); }, 350 + i * 300);
    });
    setTimeout(() => { Sound.play("coin"); refreshCoins(); bumpCoins(); }, 400 + stars * 300);
    on(m, "#w-x2", async el => {
      el.disabled = true;
      if (await Ads.showRewarded()) {
        coins += earned; save(); refreshCoins(); bumpCoins(); Sound.play("coin");
        const a = m.querySelector("#w-amt"); if (a) a.textContent = earned * 2;
        el.querySelector("span:last-child").textContent = "Doubled!";
      } else el.disabled = false;
    });
    const go = async next => {
      closeModal();
      if (C.ads.interstitialEveryLevels && levelsPlayed % C.ads.interstitialEveryLevels === 0) await Ads.showInterstitial();
      next();
    };
    on(m, "#w-replay", () => go(() => startLevel(cur.n, { daily: cur.daily })));
    on(m, "#w-next", () => go(() => {
      if (cur.daily) return goHome();
      if (chest >= E.chestEvery) return showChest(() => startLevel(cur.n + 1));
      startLevel(cur.n + 1);
    }));
  }
  function showChest(then) {
    chest = 0;
    const [lo, hi] = E.chestCoins, amount = lo + Math.floor(Math.random() * (hi - lo + 1));
    save();
    const m = openModal(`${ribbon("LEVEL CHEST")}<div class="modal-body center">
      <div class="unlock-stage">${rays()}<div class="big-art bob tap-me" id="chest">${art("chestClosed")}</div></div>
      <p class="lead" id="c-msg">You cleared ${E.chestEvery} levels! Tap to open.</p>
      <button class="btn btn-orange btn-wide" id="c-open"><span>Open</span></button></div>`, "chest");
    let opened = false;
    const open = () => {
      if (opened) return; opened = true;
      coins += amount; save(); refreshCoins(); bumpCoins();
      m.querySelector("#chest").innerHTML = art("chestOpen"); m.querySelector("#chest").classList.add("pop");
      Sound.play("unlock"); FX.confetti(80);
      FX.text(innerWidth / 2, innerHeight * 0.42, `+${amount} ${coinArt()}`, "f-coin big");
      m.querySelector("#c-msg").innerHTML = `+${amount} coins!`;
      const b = m.querySelector("#c-open"); b.querySelector("span").textContent = "Continue";
      b.onclick = () => { Sound.play("click"); closeModal(); then(); };
    };
    m.querySelector("#chest").addEventListener("click", open);
    m.querySelector("#c-open").addEventListener("click", () => { if (!opened) { Sound.play("click"); open(); } });
  }

  // ---------- daily challenge -------------------------------------------------------
  const today = () => new Date().toLocaleDateString("en-CA");
  function dailyLevel() {
    const d = today(), seed = +d.replace(/-/g, "") * 7 + (mode === "water" ? 13 : 0);
    const dow = new Date().getDay(), weekend = dow === 0 || dow === 6;
    const L = Engine.generate({ colors: weekend ? 10 : 9, empty: 2, cap: 4, hard: false, mystery: weekend, tries: 4 }, seed);
    if (!L) return null;
    L.par = mode === "balls" && !C.modes.balls.moveAll ? L.parBalls : L.par;
    return L;
  }
  function showDaily() {
    const done = daily.last === today();
    const dow = new Date().getDay(), weekend = dow === 0 || dow === 6;
    const m = openModal(`${ribbon("DAILY CHALLENGE")}<div class="modal-body center">
      <div class="big-art ${done ? "" : "bob"}">${done ? art("check") : art("daily")}</div>
      <p class="lead big">${done ? "Today's puzzle is solved!" : `A fresh ${weekend ? "<b>mystery</b> " : ""}puzzle every day`}</p>
      <div class="stat-row"><div><b>${daily.streak}</b><small>Day streak 🔥</small></div><div><b>${daily.count}</b><small>Solved</small></div><div><b>${coinArt()}${E.dailyChallengeCoins}</b><small>Reward</small></div></div>
      ${done ? `<p class="sub">Come back tomorrow to keep your streak.</p><button class="btn btn-green btn-wide" id="d-close"><span>OK</span></button>`
        : `<button class="btn btn-orange btn-wide btn-big pulse" id="d-play">${ICON.play}<span>Play</span></button>`}
    </div>`, "daily-ch");
    on(m, "#d-play", () => startLevel(0, { daily: true }));
    on(m, "#d-close", closeModal);
  }

  // ---------- level map ---------------------------------------------------------
  function showLevels() {
    showScreen("levels");
    const P = prog[mode], per = 20, last = Math.max(LEVELS.length, Math.ceil((P.level + 1) / per) * per);
    let html = "", total = 0;
    for (let ch = 0; ch * per < last; ch++) {
      let cs = 0, cells = "";
      for (let n = ch * per + 1; n <= (ch + 1) * per; n++) {
        const s = P.stars[n] || 0, open = n <= P.level, curLv = n === P.level;
        cs += s;
        const raw = LEVELS[(n - 1) % LEVELS.length].split(";")[3] || "";
        cells += `<button class="lv ${open ? "open" : "locked"} ${curLv ? "current" : ""} ${raw.includes("h") ? "hard" : ""}" data-n="${n}" ${open ? "" : "disabled"}>
          ${open ? `<b>${n}</b>` : ICON.lock}
          ${s ? `<span class="lv-stars">${[0, 1, 2].map(k => `<i class="${k < s ? "on" : ""}">${ICON.star}</i>`).join("")}</span>` : ""}
          ${raw.includes("m") && open ? `<em class="lv-m">?</em>` : ""}</button>`;
      }
      total += cs;
      const name = C.chapters[ch % C.chapters.length] + (ch >= C.chapters.length ? ` ${Math.floor(ch / C.chapters.length) + 1}` : "");
      html += `<section class="chapter" style="--h:${(ch * 37) % 360}"><header><b>${name}</b><small>${ch * per + 1}–${(ch + 1) * per} · ${cs}/${per * 3} ★</small></header><div class="lv-grid">${cells}</div></section>`;
    }
    $("#lv-list").innerHTML = html;
    $("#lv-stars").textContent = `${total} / ${last * 3}`;
    $("#lv-mode").textContent = C.modes[mode].label;
    const curEl = $("#lv-list .lv.current");
    if (curEl) setTimeout(() => { $("#lv-scroll").scrollTop = curEl.offsetTop - $("#lv-scroll").clientHeight * 0.4; }, 30);
  }

  // ---------- shop -----------------------------------------------------------------
  let shopTab = "balls";
  function showShop() {
    const list = shopTab === "balls" ? C.ballSkins : shopTab === "tubes" ? C.tubeSkins : C.themes;
    const m = openModal(`
      ${ribbon("SHOP")}
      <div class="modal-body">
        <div class="tabs">${[["balls", "Balls"], ["tubes", "Tubes"], ["themes", "Themes"]].map(([k, l]) => `<button class="tab ${shopTab === k ? "on" : ""}" data-tab="${k}">${l}</button>`).join("")}</div>
        <div class="shop-coins pill">${coinArt()}<b class="coin-count">${coins.toLocaleString()}</b></div>
        <div class="items">${list.map(s => {
          const have = owned[shopTab].includes(s.id), on2 = equip[shopTab] === s.id;
          return `<button class="item ${on2 ? "equipped" : ""} ${have ? "owned" : ""}" data-id="${s.id}" data-price="${s.price}">
            <div class="item-prev" data-prev="${s.id}"></div><b>${s.name}</b>
            <span class="tag">${on2 ? "Using" : have ? "Use" : `${coinArt()} ${s.price.toLocaleString()}`}</span></button>`;
        }).join("")}</div>
        <button class="btn btn-green btn-wide" id="m-close"><span>Done</span></button>
      </div>`, "shop");
    m.querySelectorAll("[data-prev]").forEach(el => {
      const id = el.dataset.prev;
      if (shopTab === "balls") el.appendChild(Skins.ballPreview(id, 92, 40));
      else if (shopTab === "tubes") el.appendChild(Skins.tubePreview(id, equip.balls, 56, 80));
      else { const t = C.themes.find(t => t.id === id); el.innerHTML = `<div class="theme-sw" style="background:radial-gradient(circle at 30% 30%, ${t.bokeh[0]}55, transparent 40%),radial-gradient(circle at 75% 70%, ${t.bokeh[1]}55, transparent 40%),linear-gradient(${t.bg[0]}, ${t.bg[1]})"></div>`; }
    });
    m.querySelectorAll(".tab").forEach(b => b.addEventListener("click", () => { Sound.play("click"); shopTab = b.dataset.tab; showShop(); }));
    m.querySelectorAll("[data-id]").forEach(b => b.addEventListener("click", () => {
      const id = b.dataset.id, price = +b.dataset.price;
      if (!owned[shopTab].includes(id)) {
        if (coins < price) { b.classList.remove("nope"); b.offsetWidth; b.classList.add("nope"); Sound.play("nope"); return toast("Not enough coins"); }
        coins -= price; owned[shopTab].push(id); Sound.play("unlock"); FX.confetti(50);
      } else Sound.play("click");
      equip[shopTab] = id; save(); applyLooks(); refreshCoins();
      showShop();
    }));
    on(m, "#m-close", closeModal);
  }

  // ---------- settings / gift ------------------------------------------------------
  function showSettings(inGame) {
    const row = (k, label) => `<button class="toggle ${settings[k] ? "on" : ""}" data-k="${k}"><span>${label}</span><i></i></button>`;
    const m = openModal(`
      ${ribbon(inGame ? "PAUSED" : "SETTINGS")}
      <div class="modal-body">
        ${row("sound", "Sound effects")}${row("music", "Music")}${row("vibe", "Vibration")}
        ${inGame ? `<div class="btn-row">
          <button class="btn btn-orange" id="m-quit">${ICON.home}<span>Home</span></button>
          <button class="btn btn-green" id="m-resume">${ICON.play}<span>Resume</span></button>
        </div>` : `<button class="btn btn-green btn-wide" id="m-resume"><span>Done</span></button>`}
      </div>`, "settings");
    m.querySelectorAll(".toggle").forEach(b => b.addEventListener("click", () => {
      const k = b.dataset.k; settings[k] = !settings[k]; b.classList.toggle("on", settings[k]);
      store.set("settings", settings); Sound.setSfx(settings.sound); Sound.setMusic(settings.music);
      Sound.play("click"); if (k === "vibe") vibrate(30);
    }));
    on(m, "#m-resume", closeModal);
    on(m, "#m-quit", () => { closeModal(); goHome(); });
  }
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
        <div class="days">${RW.map((r, i) => `<div class="day ${i < st.day || (!st.available && i === st.day) ? "done" : ""} ${i === st.day && st.available ? "today" : ""} ${i === RW.length - 1 ? "big" : ""}"><small>Day ${i + 1}</small>${coinArt()}<b>${r}</b></div>`).join("")}</div>
        ${st.available ? `<div class="btn-row"><button class="btn btn-orange" id="m-claim"><span>Claim ${reward}</span></button>
          <button class="btn btn-green" id="m-x2">${art("video", "inline")}<span>x2</span></button></div>`
          : `<p class="lead">Come back tomorrow for Day ${((st.day + 1) % RW.length) + 1}!</p><button class="btn btn-green btn-wide" id="m-close"><span>OK</span></button>`}
      </div>`, "daily");
    const claim = amount => {
      store.set("gift", { last: today(), streak: st.day + 1 });
      coins += amount; save(); refreshCoins(); refreshDots(); bumpCoins();
      Sound.play("unlock"); FX.confetti(70);
      const c = m.querySelector("#chest"); if (c) { c.innerHTML = art("chestOpen"); c.classList.add("pop"); }
      FX.text(innerWidth / 2, innerHeight * 0.45, `+${amount} ${coinArt()}`, "f-coin big");
      m.querySelectorAll("#m-claim, #m-x2").forEach(b => { b.disabled = true; });
      setTimeout(closeModal, 1100);
    };
    on(m, "#m-claim", () => claim(reward));
    on(m, "#m-x2", async () => { const ok = await Ads.showRewarded(); claim(ok ? reward * 2 : reward); });
    on(m, "#m-close", closeModal);
  }

  // ---------- home / screens ----------------------------------------------------
  function refreshDots() {
    $("#gift-dot").hidden = !giftState().available;
    $("#missions-dot").hidden = !ms.ready.length;
    $("#daily-dot").hidden = daily.last === today();
    $("#daily-sub").textContent = daily.last === today() ? "Solved ✓" : `+${E.dailyChallengeCoins}`;
  }
  function refreshHome() {
    $("#play-label").textContent = `LEVEL ${prog[mode].level}`;
    $$("#mode-switch button").forEach(b => b.classList.toggle("on", b.dataset.mode === mode));
    $("#mode-switch").dataset.mode = mode;
    $("#chest-fill").style.width = Math.min(100, (chest / E.chestEvery) * 100) + "%";
    $("#chest-txt").textContent = `${Math.min(chest, E.chestEvery)}/${E.chestEvery}`;
    refreshDots(); refreshCoins();
  }
  function showScreen(name) {
    $$(".screen").forEach(s => s.classList.toggle("active", s.id === "screen-" + name));
    document.body.dataset.screen = name;
    if (name !== "game") { $("#tut").hidden = true; $("#hand").hidden = true; }
    if (name === "home") refreshHome();
    refreshCoins();
  }
  function goHome() {
    cur = null;
    showScreen("home");
    Board.setSlot($("#demo-slot"));
    Board.demo(mode);
  }
  function setMode(m) {
    if (m === mode) return;
    mode = m; save(); refreshHome();
    Sound.play(m === "water" ? "pour" : "pick");
    Board.demo(mode);
  }
  function buildLogo() {
    if (hasImg(C.art.logo.image)) { $("#logo-wrap").innerHTML = `<img class="logo-img" src="${C.art.logo.image}" alt="${C.title}">`; return; }
    const [a, b] = C.titleLines;
    $("#logo-wrap").innerHTML = `<h1 class="logo-css"><span class="l1">${[...a].map((ch, i) => `<i style="--i:${i};--c:${C.palette[[0, 2, 6, 3, 8][i % 5]]}">${ch}</i>`).join("")}</span><span class="l2">${b}</span></h1>`;
  }

  function bind() {
    const click = (sel, fn) => $(sel).addEventListener("click", e => { e.stopPropagation(); Sound.play("click"); fn(); });
    click("#btn-play", () => startLevel(prog[mode].level));
    click("#btn-daily", showDaily);
    click("#btn-levels", showLevels);
    click("#btn-shop", showShop);
    click("#btn-missions", showMissions);
    click("#btn-gift", showGift);
    click("#btn-settings", () => showSettings(false));
    click("#btn-pause", () => showSettings(true));
    click("#btn-home", goHome);
    click("#btn-levels-back", goHome);
    $$("#mode-switch button").forEach(b => b.addEventListener("click", () => setMode(b.dataset.mode)));
    $("#lv-list").addEventListener("click", e => {
      const b = e.target.closest(".lv.open"); if (!b) return;
      Sound.play("click"); startLevel(+b.dataset.n);
    });
    const tool = (sel, fn) => $(sel).addEventListener("click", e => { e.stopPropagation(); if (modalOpen() || !cur) return; Sound.play("click"); fn(); });
    tool("#t-undo", doUndo);
    tool("#t-tube", doTube);
    tool("#t-hint", doHint);
    tool("#t-restart", doRestart);
    window.addEventListener("keydown", e => {
      if (document.body.dataset.screen !== "game" || modalOpen()) return;
      if (e.key === "Escape") showSettings(true);
      if ((e.ctrlKey || e.metaKey) && e.key === "z") { e.preventDefault(); doUndo(); }
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= 9) Board.tap(n - 1);
      if (e.key === "0") Board.tap(9);
    });
  }

  async function boot() {
    $("#btn-settings").innerHTML = ICON.gear;
    $("#btn-pause").innerHTML = ICON.gear;
    $("#btn-home").innerHTML = ICON.home;
    $("#btn-levels-back").innerHTML = ICON.back;
    $("#btn-play .bi").innerHTML = ICON.play;
    $$("#mode-switch button").forEach(b => { const md = C.modes[b.dataset.mode]; b.innerHTML = `<span>${md.emoji}</span>${md.label}`; });
    const urls = Object.values(C.art).map(a => a.image).filter(Boolean);
    let done = 0;
    await Promise.all(urls.map(u => probe(u).then(() => { done++; $("#load-fill").style.width = (done / urls.length) * 100 + "%"; })));
    if (document.fonts && document.fonts.ready) await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1500))]);
    $$("[data-art]").forEach(el => { el.innerHTML = art(el.dataset.art, "inline"); });
    fillMissions(); save();
    buildLogo(); bind();
    goHome();
  }
  boot();
})();

/* ==========================================================================
   UI — home, chapters, HUD, hints, bonus jar, level/chapter complete,
   daily puzzle, daily gift, tutorial. Drives Puzzle via its callbacks.
   ========================================================================== */
(() => {
  const C = window.GAME_CONFIG, E = C.economy;
  const LEVELS = window.LEVELS, DAILY = window.DAILY;
  const PER = C.levelsPerChapter;
  const CHAPTERS = Math.ceil(LEVELS.length / PER);
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];

  // ---------- storage ------------------------------------------------------
  const store = {
    get(k, d) { try { const v = localStorage.getItem("wc_" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("wc_" + k, JSON.stringify(v)); } catch (e) {} }
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
    gear: '<svg viewBox="0 0 24 24"><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm8.9 4.7-1.7-.3a7.6 7.6 0 0 1-.7 1.7l1 1.4a1 1 0 0 1-.1 1.3l-1.2 1.2a1 1 0 0 1-1.3.1l-1.4-1a7.6 7.6 0 0 1-1.7.7l-.3 1.7a1 1 0 0 1-1 .8h-1.7a1 1 0 0 1-1-.8l-.3-1.7a7.6 7.6 0 0 1-1.7-.7l-1.4 1a1 1 0 0 1-1.3-.1L4 17.3a1 1 0 0 1-.1-1.3l1-1.4a7.6 7.6 0 0 1-.7-1.7l-1.7-.3a1 1 0 0 1-.8-1v-1.7a1 1 0 0 1 .8-1l1.7-.3c.2-.6.4-1.2.7-1.7l-1-1.4A1 1 0 0 1 4 4.2L5.2 3a1 1 0 0 1 1.3-.1l1.4 1a7.6 7.6 0 0 1 1.7-.7L9.9 1.5a1 1 0 0 1 1-.8h1.7a1 1 0 0 1 1 .8l.3 1.7c.6.2 1.2.4 1.7.7l1.4-1a1 1 0 0 1 1.3.1L19.5 4a1 1 0 0 1 .1 1.3l-1 1.4c.3.5.5 1.1.7 1.7l1.7.3a1 1 0 0 1 .8 1v1.7a1 1 0 0 1-.8 1Z"/></svg>',
    home: '<svg viewBox="0 0 24 24"><path d="M3 11.2 12 3.5l9 7.7V20a1.5 1.5 0 0 1-1.5 1.5H15v-6h-6v6H4.5A1.5 1.5 0 0 1 3 20Z"/></svg>',
    back: '<svg viewBox="0 0 24 24"><path d="M15.5 3.5 7 12l8.5 8.5 2.1-2.1L11.2 12l6.4-6.4Z"/></svg>',
    play: '<svg viewBox="0 0 24 24"><path d="M7 4.5v15a1 1 0 0 0 1.5.9l12-7.5a1 1 0 0 0 0-1.8l-12-7.5A1 1 0 0 0 7 4.5Z"/></svg>',
    next: '<svg viewBox="0 0 24 24"><path d="M8.5 3.5 17 12l-8.5 8.5-2.1-2.1 6.4-6.4-6.4-6.4Z"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="m9 16.2-3.5-3.5L4 14.2l5 5 11-11-1.5-1.5Z"/></svg>'
  };

  // ---------- persistent state --------------------------------------------
  const settings = Object.assign({ sound: true, music: true, vibe: true }, store.get("settings", {}));
  let coins = store.get("coins", E.startCoins);
  let level = store.get("level", 0);                 // next level to play (0-based)
  let jar = store.get("jar", 0);
  const save = () => { store.set("coins", coins); store.set("level", level); store.set("jar", jar); };
  Sound.setSfx(settings.sound); Sound.setMusic(settings.music);
  Puzzle.on.vibeOn = () => settings.vibe;
  const vibrate = ms => { if (C.vibration && settings.vibe && navigator.vibrate) navigator.vibrate(ms); };

  // session
  let mode = "level", playing = 0, replay = false;   // mode: level | daily
  const chapterOf = i => Math.floor(i / PER);
  const today = () => new Date().toLocaleDateString("en-CA");
  const dayIndex = () => Math.floor(Date.now() / 864e5);

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
    $$(".toast").forEach(t => t.remove());
    const el = document.createElement("div");
    el.className = "toast"; el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1600);
  }
  function refreshCoins() { $$(".coin-count").forEach(e => { e.textContent = coins.toLocaleString(); }); }
  function bump(sel) { const el = $(sel); if (!el) return; el.classList.remove("bump"); el.offsetWidth; el.classList.add("bump"); }
  function setScene(ch) {
    const url = Scenery.dataUrl(ch);
    const a = $("#scene"), b = $("#scene-next");
    if (a.dataset.ch === String(ch)) return;
    b.style.backgroundImage = url; b.classList.add("show");
    setTimeout(() => { a.style.backgroundImage = url; a.dataset.ch = ch; b.classList.remove("show"); }, 600);
    document.documentElement.style.setProperty("--accent", Scenery.chapter(ch).accent);
  }

  // ---------- HUD ----------------------------------------------------------
  function renderHud() {
    const p = Puzzle.progress;
    if (mode === "daily") {
      $("#hud-title").textContent = "DAILY PUZZLE";
      $("#hud-sub").textContent = new Date().toLocaleDateString(undefined, { month: "long", day: "numeric" });
    } else {
      $("#hud-title").textContent = `LEVEL ${playing + 1}`;
      $("#hud-sub").textContent = Scenery.chapter(chapterOf(playing)).name;
    }
    $("#words-left").textContent = p ? `${p.found}/${p.total}` : "";
    $("#jar-fill").style.height = Math.min(100, (jar / E.bonusJarSize) * 100) + "%";
    $("#jar-count").textContent = jar;
    $("#btn-jar").classList.toggle("full", jar >= E.bonusJarSize);
    $("#hint-cost").textContent = E.hintCost;
    $("#target-cost").textContent = E.targetCost;
    refreshCoins();
  }
  function saveProgress() {
    const s = Puzzle.serialize();
    if (mode === "daily") { const d = store.get("dailyPuzzle", {}); if (d.date === today()) { d.state = s; store.set("dailyPuzzle", d); } }
    else if (!replay) store.set("progress", { level: playing, state: s });
  }

  // ---------- Puzzle callbacks --------------------------------------------
  Puzzle.on.change = () => { renderHud(); saveProgress(); };
  Puzzle.on.touch = () => hideHand();
  Puzzle.on.found = (word, idx, viaHint) => {
    if (viaHint) return;
    const len = word.length;
    Sound.play("found", len); vibrate(15);
    const words = C.praise;
    const best = Object.keys(words).map(Number).filter(n => n <= len).pop();
    if (best) {
      const r = $("#grid-area").getBoundingClientRect();
      FX.text(r.left + r.width / 2, r.top + r.height * 0.45, words[best], `f-praise l${Math.min(len, 7)}`);
      FX.sparkle(r.left + r.width / 2, r.top + r.height * 0.45, 8 + len * 2, 90);
    }
  };
  Puzzle.on.repeat = () => { Sound.play("repeat"); toast("Already found"); };
  Puzzle.on.wrong = () => { Sound.play("wrong"); vibrate([20, 30, 20]); };
  Puzzle.on.bonusRepeat = () => { Sound.play("repeat"); toast("Bonus word already found"); };
  Puzzle.on.bonus = (word, rects) => {
    Sound.play("bonus"); vibrate(10);
    // count it now; the flying letters are just the visual
    jar++; save();
    const full = jar === E.bonusJarSize;
    const target = $("#btn-jar");
    rects.forEach((r, i) => FX.fly(r.left + r.width / 2, r.top + r.height / 2, target, `<b class="fly-chip">${word[i]}</b>`, i === rects.length - 1 ? () => {
      renderHud(); bump("#btn-jar");
      if (full) { Sound.play("unlock"); toast("Bonus jar full! Tap to claim"); }
    } : null, i * 50));
    toast(`Bonus word: ${word}`);
  };
  Puzzle.on.complete = () => setTimeout(levelComplete, 200);

  // ---------- actions ------------------------------------------------------
  function spend(cost, onOk, label) {
    if (coins >= cost) { coins -= cost; save(); refreshCoins(); onOk(); return; }
    // not enough coins: offer a free one for an ad
    const m = openModal(`
      ${ribbon("NEED COINS")}
      <div class="modal-body center">
        <div class="big-art pop">${art(label === "Hint" ? "hint" : "target")}</div>
        <p class="lead">You need ${cost} coins for a ${label.toLowerCase()}. Watch a short video for a free one?</p>
        <button class="btn btn-green btn-wide" id="m-ad">${art("video", "inline")}<span>Free ${label}</span></button>
        <button class="link-btn" id="m-close">No thanks</button>
      </div>`);
    on(m, "#m-ad", async () => { closeModal(); if (await Ads.showRewarded()) onOk(); });
    on(m, "#m-close", closeModal);
  }
  function useHint() {
    if (Puzzle.targeting) Puzzle.setTargeting(false);
    spend(E.hintCost, () => {
      const el = Puzzle.hint();
      if (el) { Sound.play("hint"); const r = el.getBoundingClientRect(); FX.sparkle(r.left + r.width / 2, r.top + r.height / 2, 10, 20); }
    }, "Hint");
  }
  // Target: tap any hidden cell to reveal it. Charged on pick; free when granted by an ad.
  let targetFree = false;
  function useTarget() {
    if (Puzzle.targeting) { Puzzle.setTargeting(false); $("#target-banner").hidden = true; return; }
    if (coins >= E.targetCost) { targetFree = false; armTarget(); }
    else spend(E.targetCost, () => { targetFree = true; armTarget(); }, "Target");
  }
  function armTarget() {
    Puzzle.setTargeting(true);
    $("#target-banner").hidden = false;
  }
  Puzzle.on.targetPicked = k => {
    $("#target-banner").hidden = true;
    if (!targetFree) { coins -= E.targetCost; save(); refreshCoins(); }
    targetFree = false;
    const el = Puzzle.revealCell(k);
    if (el) { Sound.play("hint"); const r = el.getBoundingClientRect(); FX.sparkle(r.left + r.width / 2, r.top + r.height / 2, 12, 20); }
  };
  function claimJar() {
    if (jar < E.bonusJarSize) {
      const m = openModal(`
        ${ribbon("BONUS JAR")}
        <div class="modal-body center">
          <div class="big-art">${art("jar")}</div>
          <p class="lead">Find extra words that aren't in the puzzle to fill the jar.</p>
          <div class="jar-bar"><i style="width:${(jar / E.bonusJarSize) * 100}%"></i><span>${jar} / ${E.bonusJarSize}</span></div>
          <p class="sub">Full jar = ${coinArt()} ${E.bonusJarReward}</p>
          <button class="btn btn-blue btn-wide" id="m-close"><span>Got it</span></button>
        </div>`);
      on(m, "#m-close", closeModal);
      return;
    }
    jar -= E.bonusJarSize; coins += E.bonusJarReward; save();
    Sound.play("coin"); FX.confetti(60);
    const r = $("#btn-jar").getBoundingClientRect();
    FX.fly(r.left + r.width / 2, r.top, $("#coins"), coinArt(), () => { refreshCoins(); bump("#coins"); });
    FX.text(r.left + r.width / 2, r.top - 20, `+${E.bonusJarReward}`, "f-coin");
    renderHud();
  }

  // ---------- flow ---------------------------------------------------------
  function startLevel(i, isReplay = false) {
    if (i >= LEVELS.length) return allDone();
    mode = "level"; playing = i; replay = isReplay;
    const saved = store.get("progress", null);
    showScreen("game");
    setScene(chapterOf(i));
    Puzzle.load(LEVELS[i], !isReplay && saved && saved.level === i ? saved.state : null);
    Puzzle.locked = false;
    renderHud();
    if (i === 0 && !store.get("tutorial", false)) setTimeout(showHand, 600);
  }
  function startDaily() {
    let d = store.get("dailyPuzzle", {});
    if (d.date !== today()) d = { date: today(), done: false, state: null };
    store.set("dailyPuzzle", d);
    if (d.done) return toast("Today's puzzle is done — come back tomorrow!");
    mode = "daily"; replay = false;
    showScreen("game");
    setScene((dayIndex() % C.chapters.length));
    Puzzle.load(DAILY[dayIndex() % DAILY.length], d.state);
    Puzzle.locked = false;
    renderHud();
  }

  function levelComplete() {
    Sound.play("complete"); vibrate([30, 50, 30, 50, 80]);
    FX.confetti(120);
    $$(".cell").forEach((el, k) => setTimeout(() => { el.classList.remove("wave"); el.offsetWidth; el.classList.add("wave"); }, k * 25));
    let reward = 0, chapterDone = false;
    if (mode === "daily") {
      reward = E.dailyPuzzleReward;
      const d = store.get("dailyPuzzle", {}); d.done = true; d.state = null; store.set("dailyPuzzle", d);
    } else if (!replay) {
      reward = E.levelReward;
      level = Math.max(level, playing + 1);
      chapterDone = (playing + 1) % PER === 0 || playing + 1 === LEVELS.length;
      store.set("progress", null);
    }
    coins += reward; save();
    const word = C.completeWords[Math.floor(Math.random() * C.completeWords.length)];
    const ch = chapterOf(playing), inCh = (playing % PER) + 1;
    const m = openModal(`
      ${ribbon(word)}
      <div class="modal-body center">
        <div class="complete-stage">${rays()}<div class="big-art pop bob">${art("trophy")}</div></div>
        ${mode === "daily" ? `<p class="lead big">Daily puzzle solved!</p>` : `
          <p class="lead big">Level ${playing + 1} complete</p>
          <div class="ch-progress"><span>${Scenery.chapter(ch).name}</span><div class="ch-bar"><i style="width:${(inCh / PER) * 100}%"></i></div><small>${inCh}/${PER}</small></div>`}
        ${reward ? `<div class="reward">${coinArt()} +${reward}</div>` : ""}
        <div class="btn-row">
          ${reward ? `<button class="btn btn-orange" id="m-x2">${art("video", "inline")}<span>x2</span></button>` : ""}
          <button class="btn btn-green" id="m-next">${mode === "daily" ? ICON.home + "<span>Home</span>" : "<span>Next</span>" + ICON.next}</button>
        </div>
      </div>`, "complete");
    refreshCoins();
    const go = async () => {
      closeModal();
      if (chapterDone) return chapterComplete(ch);
      if (mode === "daily") return showScreen("home");
      if (C.ads.interstitialEveryLevels && (playing + 1) % C.ads.interstitialEveryLevels === 0) await Ads.showInterstitial();
      startLevel(replay ? playing + 1 : level, replay && playing + 1 < level);
    };
    on(m, "#m-x2", async el => { el.disabled = true; if (await Ads.showRewarded()) { coins += reward; save(); refreshCoins(); Sound.play("coin"); el.outerHTML = ""; } });
    on(m, "#m-next", go);
  }

  function chapterComplete(ch) {
    coins += E.chapterReward; save();
    Sound.play("complete"); FX.confetti(180);
    const next = ch + 1 < CHAPTERS ? Scenery.chapter(ch + 1).name : null;
    const m = openModal(`
      ${ribbon("CHAPTER CLEAR!")}
      <div class="modal-body center">
        <div class="chapter-badge" style="background-image:${Scenery.dataUrl(ch)}"><span>${Scenery.chapter(ch).name}</span></div>
        <div class="reward">${coinArt()} +${E.chapterReward}</div>
        ${next ? `<p class="lead">Next stop: <b>${next}</b></p>` : `<p class="lead">You finished every chapter!</p>`}
        <button class="btn btn-green btn-wide" id="m-go"><span>${next ? "Continue" : "Home"}</span>${ICON.next}</button>
      </div>`, "chapter");
    refreshCoins();
    on(m, "#m-go", () => { closeModal(); next ? startLevel(level) : showScreen("home"); });
  }
  function allDone() {
    const m = openModal(`
      ${ribbon("ALL DONE!")}
      <div class="modal-body center">
        <div class="big-art bob">${art("trophy")}</div>
        <p class="lead">You've solved all ${LEVELS.length} levels! Play the Daily Puzzle or replay any chapter.</p>
        <button class="btn btn-green btn-wide" id="m-close"><span>OK</span></button>
      </div>`);
    on(m, "#m-close", () => { closeModal(); showScreen("home"); });
  }

  // ---------- chapters screen ---------------------------------------------
  function showChapters() {
    showScreen("chapters");
    $("#chapter-list").innerHTML = Array.from({ length: CHAPTERS }, (_, ch) => {
      const first = ch * PER, count = Math.min(PER, LEVELS.length - first);
      const done = Math.max(0, Math.min(count, level - first));
      const locked = level < first;
      return `<button class="chapter-card ${locked ? "locked" : ""} ${done === count ? "done" : ""}" data-ch="${ch}" style="background-image:${Scenery.dataUrl(ch)}">
        <div class="cc-info"><b>${Scenery.chapter(ch).name}</b><small>Levels ${first + 1}–${first + count}</small>
          <div class="ch-bar"><i style="width:${(done / count) * 100}%"></i></div></div>
        <span class="cc-state">${locked ? art("lock") : done === count ? ICON.check : `${done}/${count}`}</span>
      </button>`;
    }).join("");
    const cur = $(`.chapter-card[data-ch="${Math.min(chapterOf(level), CHAPTERS - 1)}"]`);
    if (cur) cur.scrollIntoView({ block: "center" });
  }
  function showChapterLevels(ch) {
    const first = ch * PER, count = Math.min(PER, LEVELS.length - first);
    const m = openModal(`
      ${ribbon(Scenery.chapter(ch).name.toUpperCase())}
      <div class="modal-body">
        <div class="level-grid">${Array.from({ length: count }, (_, k) => {
          const i = first + k, st = i < level ? "done" : i === level ? "current" : "locked";
          return `<button class="lv ${st}" data-i="${i}" ${st === "locked" ? "disabled" : ""}>${st === "locked" ? art("lock") : i + 1}</button>`;
        }).join("")}</div>
        <button class="btn btn-blue btn-wide" id="m-close"><span>Close</span></button>
      </div>`, "levels");
    m.querySelectorAll(".lv:not(.locked)").forEach(b => b.addEventListener("click", () => {
      Sound.play("click"); closeModal();
      const i = +b.dataset.i;
      startLevel(i, i < level);
    }));
    on(m, "#m-close", closeModal);
  }

  // ---------- settings / daily gift ----------------------------------------
  function showSettings() {
    const row = (k, label) => `<button class="toggle ${settings[k] ? "on" : ""}" data-k="${k}"><span>${label}</span><i></i></button>`;
    const m = openModal(`
      ${ribbon("SETTINGS")}
      <div class="modal-body">
        ${row("sound", "Sound effects")}${row("music", "Music")}${row("vibe", "Vibration")}
        <button class="btn btn-green btn-wide" id="m-close"><span>Done</span></button>
      </div>`, "settings");
    m.querySelectorAll(".toggle").forEach(b => b.addEventListener("click", () => {
      const k = b.dataset.k; settings[k] = !settings[k]; b.classList.toggle("on", settings[k]);
      store.set("settings", settings);
      Sound.setSfx(settings.sound); Sound.setMusic(settings.music);
      Sound.play("click"); if (k === "vibe") vibrate(30);
    }));
    on(m, "#m-close", closeModal);
  }
  function giftState() {
    const d = store.get("gift", { last: null, streak: 0 });
    const t = today(), y = new Date(Date.now() - 864e5).toLocaleDateString("en-CA");
    const n = E.dailyRewards.length, available = d.last !== t;
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
      coins += amount; save(); refreshCoins(); refreshHome();
      Sound.play("unlock"); FX.confetti(70);
      const c = m.querySelector("#chest"); if (c) { c.innerHTML = art("chestOpen"); c.classList.add("pop"); }
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
    const L = Puzzle.level; if (!L) return;
    const word = L.w[0][0], used = [], pts = [];
    for (const ch of word) { const p = Puzzle.letterScreen(ch, used); if (!p) return; used.push(p.i); pts.push(p); }
    const h = $("#hand");
    h.innerHTML = art("hand") + `<span>Swipe the letters to spell <b>${word}</b></span>`;
    h.hidden = false;
    const frames = [{ transform: `translate(${pts[0].x}px,${pts[0].y}px)`, opacity: 0, offset: 0 }];
    pts.forEach((p, k) => frames.push({ transform: `translate(${p.x}px,${p.y}px)`, opacity: 1, offset: 0.1 + (k / Math.max(1, pts.length - 1)) * 0.7 }));
    frames.push({ transform: `translate(${pts[pts.length - 1].x}px,${pts[pts.length - 1].y}px)`, opacity: 0, offset: 1 });
    handAnim = h.animate(frames, { duration: 2400, iterations: Infinity, easing: "ease-in-out" });
  }
  function hideHand() {
    if ($("#hand").hidden) return;
    $("#hand").hidden = true;
    if (handAnim) handAnim.cancel();
    store.set("tutorial", true);
  }

  // ---------- home / screens ----------------------------------------------
  function refreshHome() {
    const L = Math.min(level, LEVELS.length - 1), ch = chapterOf(L);
    $("#play-label").textContent = level >= LEVELS.length ? "ALL DONE" : `LEVEL ${level + 1}`;
    $("#home-chapter").textContent = Scenery.chapter(ch).name;
    const inCh = level - ch * PER;
    $("#home-ch-fill").style.width = Math.min(100, (inCh / PER) * 100) + "%";
    $("#home-ch-count").textContent = `${Math.min(inCh, PER)}/${PER}`;
    const d = store.get("dailyPuzzle", {});
    $("#daily-done").hidden = !(d.date === today() && d.done);
    $("#gift-dot").hidden = !giftState().available;
    refreshCoins();
  }
  function showScreen(name) {
    $$(".screen").forEach(s => s.classList.toggle("active", s.id === "screen-" + name));
    document.body.dataset.screen = name;
    if (name !== "game") { $("#hand").hidden = true; if (handAnim) handAnim.cancel(); }
    if (name === "home") { refreshHome(); setScene(chapterOf(Math.min(level, LEVELS.length - 1))); }
    if (name === "game") requestAnimationFrame(() => Puzzle.layout());
    refreshCoins();
  }
  function buildLogo() {
    if (hasImg(C.art.logo.image)) { $("#logo-wrap").innerHTML = `<img class="logo-img" src="${C.art.logo.image}" alt="${C.title}">`; return; }
    const [a, b] = C.titleLines;
    $("#logo-wrap").innerHTML = `<h1 class="logo-css">
      <span class="tiles">${[...a].map((ch, i) => `<i style="--i:${i}">${ch}</i>`).join("")}</span>
      <span class="word">${b}</span></h1>`;
  }

  function bind() {
    const click = (sel, fn) => $(sel).addEventListener("click", () => { Sound.play("click"); fn(); });
    click("#btn-play", () => startLevel(level));
    click("#btn-daily", startDaily);
    click("#btn-gift", showGift);
    click("#btn-chapters", showChapters);
    click("#btn-settings", showSettings);
    click("#btn-back-home", () => showScreen("home"));
    click("#btn-chapters-back", () => showScreen("home"));
    click("#btn-shuffle", () => { Puzzle.shuffle(); Sound.play("shuffle"); });
    click("#btn-hint", useHint);
    click("#btn-target", useTarget);
    click("#btn-jar", claimJar);
    click("#target-cancel", () => { Puzzle.setTargeting(false); $("#target-banner").hidden = true; });
    $("#chapter-list").addEventListener("click", e => {
      const c = e.target.closest(".chapter-card"); if (!c) return;
      if (c.classList.contains("locked")) { Sound.play("wrong"); c.classList.remove("nope"); c.offsetWidth; c.classList.add("nope"); return; }
      Sound.play("click"); showChapterLevels(+c.dataset.ch);
    });
    window.addEventListener("keydown", e => {
      if (e.key === "Escape") { if (modalRoot.classList.contains("open")) closeModal(); else if (document.body.dataset.screen !== "home") showScreen("home"); }
    });
  }

  async function boot() {
    $("#btn-settings").innerHTML = ICON.gear;
    $("#btn-back-home").innerHTML = ICON.home;
    $("#btn-chapters-back").innerHTML = ICON.back;
    $("#btn-play .bi").innerHTML = ICON.play;
    $("#target-cancel").textContent = "✕";
    const urls = Object.values(C.art).map(a => a.image).filter(Boolean);
    let done = 0;
    await Promise.all(urls.map(u => probe(u).then(() => { done++; $("#load-fill").style.width = (done / urls.length) * 100 + "%"; })));
    if (document.fonts && document.fonts.ready) await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1500))]);
    $$("[data-art]").forEach(el => { el.innerHTML = art(el.dataset.art, "inline"); });
    buildLogo(); bind();
    showScreen("home");
  }
  boot();
})();

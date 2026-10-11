/* ==========================================================================
   UI — home, player card & XP, topic picker, HUD, lifelines, results,
   daily challenge, daily gift, stats. Drives Quiz via its callbacks.
   ========================================================================== */
(() => {
  const C = window.GAME_CONFIG, E = C.economy, P = C.progression;
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];

  // ---------- storage ------------------------------------------------------
  const store = {
    get(k, d) { try { const v = localStorage.getItem("qr_" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("qr_" + k, JSON.stringify(v)); } catch (e) {} }
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
    star: '<svg viewBox="0 0 24 24"><path d="m12 2 3 6.6 7.2.8-5.4 4.9 1.5 7.1L12 17.8l-6.3 3.6 1.5-7.1L1.8 9.4 9 8.6Z"/></svg>',
    chart: '<svg viewBox="0 0 24 24"><path d="M4 20h16v2H4zM6 10h3v8H6zm5-6h3v14h-3zm5 9h3v5h-3z"/></svg>'
  };

  // ---------- persistent state --------------------------------------------
  const settings = Object.assign({ sound: true, music: true, vibe: true }, store.get("settings", {}));
  let coins = store.get("coins", E.startCoins);
  let xp = store.get("xp", 0);
  let avatar = store.get("avatar", C.avatars[0]);
  const best = Object.assign({ survival: 0, lightning: 0 }, store.get("best", {}));
  const stars = store.get("stars", {});                 // category id (or "mixed") -> best stars
  const stats = Object.assign({ answered: 0, correct: 0, rounds: 0, byCat: {} }, store.get("stats", {}));
  const lifelines = Object.assign(Object.fromEntries(Object.entries(C.lifelines).map(([k, v]) => [k, v.start])), store.get("lifelines", {}));
  const seen = new Set(store.get("seen", []));
  let rounds = store.get("rounds", 0);
  const save = () => {
    store.set("coins", coins); store.set("xp", xp); store.set("avatar", avatar); store.set("best", best);
    store.set("stars", stars); store.set("stats", stats); store.set("lifelines", lifelines);
    store.set("seen", [...seen]); store.set("rounds", rounds);
  };
  Sound.setSfx(settings.sound); Sound.setMusic(settings.music);
  const vibrate = ms => { if (C.vibration && settings.vibe && navigator.vibrate) navigator.vibrate(ms); };

  function levelInfo(total) {
    let level = 1, need = P.xpBase, left = total;
    while (left >= need) { left -= need; level++; need += P.xpGrowth; }
    return { level, into: left, need };
  }

  // seen-tracking for the picker; reset a topic once every question in it has been seen
  Quiz.on.seen = () => seen;
  Quiz.on.seenAdd = id => { seen.add(id); if (seen.size >= Quiz.bankSize) seen.clear(); };

  // ---------- modals -------------------------------------------------------
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
    const el = document.createElement("div");
    el.className = "toast"; el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1600);
  }
  function refreshCoins() { $$(".coin-count").forEach(e => { e.textContent = coins.toLocaleString(); }); }
  function bump(sel) { const el = $(sel); if (!el) return; el.classList.remove("bump"); el.offsetWidth; el.classList.add("bump"); }

  // ---------- HUD ----------------------------------------------------------
  let shownScore = 0, scoreRaf = 0;
  function countTo(el, to, from = 0, ms = 500) {
    cancelAnimationFrame(scoreRaf);
    const t0 = performance.now();
    const step = t => {
      const k = Math.min(1, (t - t0) / ms);
      const v = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3)));
      el.textContent = v.toLocaleString();
      if (k < 1) scoreRaf = requestAnimationFrame(step);
    };
    scoreRaf = requestAnimationFrame(step);
  }
  function renderHud(R) {
    if (!R) return;
    const mode = R.mode;
    $("#hud-progress").hidden = !(mode === "classic" || mode === "daily");
    $("#hud-lives").hidden = mode !== "survival";
    $("#hud-mode").hidden = !(mode === "lightning" || mode === "survival");
    if (mode === "classic" || mode === "daily") {
      $("#hud-q").textContent = `${Math.min(R.i + 1, R.total)}/${R.total}`;
      $("#hud-dots").innerHTML = Array.from({ length: R.total }, (_, k) => {
        const r = R.results[k]; return `<i class="${r ? (r.ok ? "ok" : "bad") : k === R.i ? "cur" : ""}"></i>`;
      }).join("");
    }
    if (mode === "survival") {
      $("#hud-lives").innerHTML = Array.from({ length: C.modes.survival.lives }, (_, k) => `<span class="${k < R.lives ? "" : "lost"}">${art("heart")}</span>`).join("");
      $("#hud-mode").textContent = `Q${R.i + 1}`;
    }
    if (mode === "lightning") $("#hud-mode").innerHTML = `${art("bolt", "inline")} LIGHTNING`;
    if (+$("#score").dataset.v !== R.score) { countTo($("#score"), R.score, shownScore); shownScore = R.score; $("#score").dataset.v = R.score; }
    const st = $("#streak");
    if (R.streak >= 2) { st.hidden = false; st.innerHTML = `${art("fire", "inline")} ${R.streak} <small>×${Quiz.mult().toFixed(2).replace(/\.?0+$/, "")}</small>`; }
    else st.hidden = true;
    renderLifelines();
  }
  function renderLifelines() {
    $("#lifelines").innerHTML = Object.entries(C.lifelines).map(([k, l]) => `
      <button class="life" data-l="${k}"><span class="life-ico">${l.emoji}</span><span class="life-lbl">${l.label}</span>
        <em class="${lifelines[k] ? "" : "plus"}">${lifelines[k] || "+"}</em></button>`).join("");
  }

  Quiz.on.change = R => renderHud(R);
  Quiz.on.answer = ({ ok, gain, streak, btn, R }) => {
    const r = btn.getBoundingClientRect();
    stats.answered++; if (ok) stats.correct++;
    const bc = stats.byCat[R.q.c] || (stats.byCat[R.q.c] = [0, 0]);
    bc[1]++; if (ok) bc[0]++;
    if (ok) {
      Sound.play("correct", streak); vibrate(15);
      FX.text(r.left + r.width / 2, r.top, `+${gain}`, "f-gain");
      FX.sparkle(r.left + r.width / 2, r.top + r.height / 2, 10, r.width * 0.35);
      if (streak >= 3) {
        setTimeout(() => Sound.play("streak", streak), 250);
        const words = { 3: "ON FIRE!", 5: "UNSTOPPABLE!", 8: "GENIUS!", 12: "LEGENDARY!" };
        const w = words[streak] || (streak > 12 && streak % 4 === 0 ? "LEGENDARY!" : null);
        if (w) { FX.text(innerWidth / 2, innerHeight * 0.3, w, "f-streak"); FX.confetti(50); }
      }
      coins += E.coinsPerCorrect;
    } else {
      Sound.play("wrong"); vibrate([30, 40, 30]);
      const card = $("#q-card"); card.classList.remove("shake"); card.offsetWidth; card.classList.add("shake");
      if (R.mode === "survival") loseHeart();
    }
    save(); refreshCoins();
  };
  Quiz.on.timeup = R => {
    vibrate([30, 40, 30]);
    FX.text(innerWidth / 2, innerHeight * 0.32, "TIME'S UP!", "f-timeup");
    if (R.mode === "survival") loseHeart();
    stats.answered++;
    const bc = stats.byCat[R.q.c] || (stats.byCat[R.q.c] = [0, 0]); bc[1]++;
    save();
  };
  function loseHeart() {
    setTimeout(() => {
      const hearts = $$("#hud-lives span:not(.lost)");
      const h = hearts[hearts.length - 1];
      if (h) { h.classList.add("breaking"); }
    }, 10);
  }
  Quiz.on.end = R => setTimeout(() => showResults(R), 500);

  // ---------- lifelines ----------------------------------------------------
  function useLifeline(k) {
    const R = Quiz.round; if (!R || R.locked) return;
    Sound.play("click");
    if (!lifelines[k]) return showRefill(k);
    const r = Quiz.lifeline(k);
    if (r === "tf") return toast("50/50 isn't available on True/False");
    if (r === "used") return toast("Already used on this question");
    if (!r) return;
    lifelines[k]--; save();
    Sound.play("lifeline");
    const b = $(`.life[data-l="${k}"]`).getBoundingClientRect();
    FX.text(b.left + b.width / 2, b.top - 10, C.lifelines[k].label + "!", "f-life");
    renderLifelines();
  }
  function showRefill(k) {
    const l = C.lifelines[k];
    Quiz.setPaused(true);
    const m = openModal(`
      ${ribbon(l.label.toUpperCase())}
      <div class="modal-body center">
        <div class="big-art pop">${l.emoji}</div>
        <p class="lead">Out of ${l.label}! Get one more:</p>
        <div class="btn-row">
          <button class="btn btn-orange" id="m-buy" ${coins < l.cost ? "disabled" : ""}>${coinArt()}<span>${l.cost}</span></button>
          <button class="btn btn-green" id="m-ad">${art("video", "inline")}<span>Free</span></button>
        </div>
        <button class="link-btn" id="m-close">No thanks</button>
      </div>`);
    const done = () => { closeModal(); Quiz.setPaused(false); renderLifelines(); };
    on(m, "#m-buy", () => { coins -= l.cost; lifelines[k]++; Sound.play("coin"); save(); refreshCoins(); done(); });
    on(m, "#m-ad", async () => { closeModal(); if (await Ads.showRewarded()) { lifelines[k]++; save(); toast(`+1 ${l.label}`); } Quiz.setPaused(false); renderLifelines(); });
    on(m, "#m-close", done);
  }

  // ---------- flow ---------------------------------------------------------
  let lastStart = null;
  function startRound(mode, cat = null) {
    if (mode === "daily") {
      const d = store.get("daily", {});
      if (d.date === today()) return toast("Daily challenge done — come back tomorrow!");
    }
    lastStart = { mode, cat };
    closeModal();
    showScreen("game");
    shownScore = 0; $("#score").textContent = "0"; $("#score").dataset.v = 0;
    $("#timer").hidden = true;
    countdown(() => { Sound.setIntense(true); Quiz.start({ mode, cat }); });
  }
  function countdown(done) {
    const el = $("#countdown");
    el.hidden = false;
    const steps = ["3", "2", "1", "GO!"];
    Sound.play("start");
    $("#q-text").textContent = ""; $("#answers").innerHTML = ""; $("#q-chip").innerHTML = "";
    steps.forEach((s, i) => setTimeout(() => {
      el.textContent = s; el.classList.remove("pop"); el.offsetWidth; el.classList.add("pop");
      if (i === steps.length - 1) setTimeout(() => { el.hidden = true; done(); }, 450);
    }, i * 400));
  }
  const today = () => new Date().toLocaleDateString("en-CA");

  function showResults(R) {
    rounds++; stats.rounds++;
    const before = levelInfo(xp);
    const gainedXp = R.correct * P.xpPerCorrect + (R.mode === "daily" ? 50 : 0);
    xp += gainedXp;
    const after = levelInfo(xp);
    const levelUps = after.level - before.level;
    let starsWon = 0, bonus = 0, title = "ROUND OVER", record = false;
    if (R.mode === "classic") {
      starsWon = C.scoring.stars.filter(n => R.correct >= n).length;
      const key = R.cat || "mixed";
      stars[key] = Math.max(stars[key] || 0, starsWon);
      title = ["NICE TRY!", "GOOD JOB!", "GREAT!", "PERFECT!"][starsWon];
      if (R.correct === R.total) title = "FLAWLESS!";
    } else if (R.mode === "survival" || R.mode === "lightning") {
      record = R.score > best[R.mode];
      if (record) best[R.mode] = R.score;
      title = record ? "NEW RECORD!" : R.mode === "survival" ? "GAME OVER" : "TIME'S UP!";
    } else if (R.mode === "daily") {
      bonus = C.modes.daily.reward;
      store.set("daily", { date: today(), score: R.score, correct: R.correct });
      title = "DAILY DONE!";
    }
    const earned = R.correct * E.coinsPerCorrect;        // already credited per answer
    coins += bonus + levelUps * E.levelUpCoins;
    save();
    const acc = R.correct + R.wrong ? Math.round((R.correct / (R.correct + R.wrong)) * 100) : 0;
    const m = openModal(`
      ${ribbon(title)}
      <div class="modal-body center">
        ${R.mode === "classic" ? `<div class="win-stars">${[0, 1, 2].map(i => `<i class="s${i}">${ICON.star}</i>`).join("")}</div>` : `<div class="big-art pop">${art(R.mode === "lightning" ? "bolt" : R.mode === "daily" ? "calendar" : "trophy")}</div>`}
        <div class="final-score"><small>SCORE</small><b id="res-score">0</b></div>
        <div class="stat-row">
          <div><b>${R.correct}${R.total ? "/" + R.total : ""}</b><small>Correct</small></div>
          <div><b>${acc}%</b><small>Accuracy</small></div>
          <div><b>${R.bestStreak}</b><small>Best streak</small></div>
        </div>
        <div class="xp-box">
          <div class="xp-top"><span>${avatar} Level <b id="res-level">${before.level}</b></span><span>+${gainedXp} XP</span></div>
          <div class="xp-bar"><i id="res-xp" style="width:${(before.into / before.need) * 100}%"></i></div>
          <div class="levelup" id="res-levelup" hidden>LEVEL UP! ${coinArt()} +${levelUps * E.levelUpCoins}</div>
        </div>
        <div class="reward">${coinArt()} +${earned + bonus + levelUps * E.levelUpCoins}</div>
        <div class="btn-row">
          <button class="btn btn-orange" id="m-home">${ICON.home}<span>Home</span></button>
          <button class="btn btn-green" id="m-again">${ICON.restart}<span>${R.mode === "daily" ? "Classic" : "Again"}</span></button>
        </div>
        ${earned + bonus > 0 ? `<button class="link-btn" id="m-x2">${art("video", "inline")} Double coins (+${earned + bonus})</button>` : ""}
      </div>`, "results");
    refreshCoins();
    countTo(m.querySelector("#res-score"), R.score, 0, 900);
    if (R.mode === "classic") for (let i = 0; i < starsWon; i++) setTimeout(() => {
      const s = m.querySelector(".s" + i); if (!s) return;
      s.classList.add("lit"); Sound.play("correct", i + 1);
      const b = s.getBoundingClientRect(); FX.sparkle(b.left + b.width / 2, b.top + b.height / 2, 10, 25);
    }, 500 + i * 350);
    if (record || starsWon === 3) FX.confetti(120);
    // XP bar fills (wrapping around on level-ups)
    setTimeout(() => {
      const bar = m.querySelector("#res-xp"); if (!bar) return;
      if (levelUps) {
        bar.style.width = "100%";
        setTimeout(() => {
          bar.style.transition = "none"; bar.style.width = "0%"; bar.offsetWidth; bar.style.transition = "";
          bar.style.width = (after.into / after.need) * 100 + "%";
          m.querySelector("#res-level").textContent = after.level;
          m.querySelector("#res-levelup").hidden = false;
          Sound.play("levelup"); FX.confetti(100); vibrate([30, 50, 30]);
        }, 700);
      } else bar.style.width = (after.into / after.need) * 100 + "%";
    }, 900);
    const after2 = async next => {
      if (C.ads.interstitialEveryRounds && rounds % C.ads.interstitialEveryRounds === 0) await Ads.showInterstitial();
      next();
    };
    on(m, "#m-x2", async el => { el.disabled = true; if (await Ads.showRewarded()) { coins += earned + bonus; save(); refreshCoins(); Sound.play("coin"); el.outerHTML = `<p class="sub">Coins doubled!</p>`; } });
    on(m, "#m-again", () => { closeModal(); after2(() => R.mode === "daily" ? showTopics() : startRound(lastStart.mode, lastStart.cat)); });
    on(m, "#m-home", () => { closeModal(); after2(() => showScreen("home")); });
  }

  // ---------- topics -------------------------------------------------------
  function showTopics() {
    showScreen("topics");
    const tile = (id, name, emoji, color) => {
      const s = stars[id || "mixed"] || 0;
      return `<button class="topic" data-cat="${id || ""}" style="--c:${color}">
        <span class="t-emoji">${emoji}</span><b>${name}</b>
        <span class="t-stars">${[0, 1, 2].map(i => `<i class="${i < s ? "on" : ""}">${ICON.star}</i>`).join("")}</span>
        <small>${Quiz.count(id)} questions</small></button>`;
    };
    $("#topic-grid").innerHTML = tile(null, "Mix of Everything", "🎲", "#ff5fa2") + C.categories.map(c => tile(c.id, c.name, c.emoji, c.color)).join("");
  }

  // ---------- settings / profile / daily gift -------------------------------
  function showSettings(inGame) {
    if (inGame) Quiz.setPaused(true);
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
      store.set("settings", settings);
      Sound.setSfx(settings.sound); Sound.setMusic(settings.music);
      Sound.play("click"); if (k === "vibe") vibrate(30);
    }));
    on(m, "#m-resume", () => { closeModal(); Quiz.setPaused(false); });
    on(m, "#m-quit", () => { closeModal(); Quiz.quit(); showScreen("home"); });
  }

  function showProfile() {
    const L = levelInfo(xp);
    const acc = stats.answered ? Math.round((stats.correct / stats.answered) * 100) : 0;
    const m = openModal(`
      ${ribbon("MY STATS")}
      <div class="modal-body">
        <div class="avatars">${C.avatars.map(a => `<button class="av ${a === avatar ? "on" : ""}" data-a="${a}">${a}</button>`).join("")}</div>
        <div class="stat-row">
          <div><b>${L.level}</b><small>Level</small></div>
          <div><b>${stats.answered}</b><small>Answered</small></div>
          <div><b>${acc}%</b><small>Accuracy</small></div>
        </div>
        <div class="stat-row">
          <div><b>${best.survival}</b><small>Survival best</small></div>
          <div><b>${best.lightning}</b><small>Lightning best</small></div>
        </div>
        <div class="cat-stats">${C.categories.map(c => {
          const [ok, n] = stats.byCat[c.id] || [0, 0];
          const p = n ? Math.round((ok / n) * 100) : 0;
          return `<div class="cs"><span>${c.emoji} ${c.name}</span><div class="cs-bar"><i style="width:${p}%;background:${c.color}"></i></div><b>${n ? p + "%" : "–"}</b></div>`;
        }).join("")}</div>
        <button class="btn btn-blue btn-wide" id="m-close"><span>Close</span></button>
      </div>`, "profile");
    m.querySelectorAll(".av").forEach(b => b.addEventListener("click", () => {
      avatar = b.dataset.a; save(); Sound.play("click");
      m.querySelectorAll(".av").forEach(x => x.classList.toggle("on", x === b));
      refreshHome();
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
      Sound.play("levelup"); FX.confetti(70);
      const c = m.querySelector("#chest"); if (c) { c.innerHTML = art("chestOpen"); c.classList.add("pop"); }
      FX.text(innerWidth / 2, innerHeight * 0.45, `+${amount} ${coinArt()}`, "f-coin big");
      setTimeout(closeModal, 1100);
    };
    on(m, "#m-claim", () => claim(reward));
    on(m, "#m-x2", async () => { const ok = await Ads.showRewarded(); claim(ok ? reward * 2 : reward); });
    on(m, "#m-close", closeModal);
  }

  // ---------- home ---------------------------------------------------------
  function refreshHome() {
    const L = levelInfo(xp);
    $("#pc-avatar").textContent = avatar;
    $("#pc-level").textContent = L.level;
    $("#pc-xp").style.width = (L.into / L.need) * 100 + "%";
    $("#pc-xp-text").textContent = `${L.into} / ${L.need} XP`;
    $("#best-survival").textContent = best.survival.toLocaleString();
    $("#best-lightning").textContent = best.lightning.toLocaleString();
    const d = store.get("daily", {});
    $("#daily-state").textContent = d.date === today() ? `Done · ${d.correct}/10` : "+" + C.modes.daily.reward + " coins";
    $("#btn-daily").classList.toggle("done", d.date === today());
    $("#gift-dot").hidden = !giftState().available;
    refreshCoins();
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
    $("#logo-wrap").innerHTML = `<h1 class="logo-css"><span class="l1">${a}</span><span class="l2">${b}</span><i class="qmark">?</i></h1>`;
  }

  function bind() {
    const click = (sel, fn) => $(sel).addEventListener("click", () => { Sound.play("click"); fn(); });
    click("#btn-play", showTopics);
    click("#btn-survival", () => startRound("survival"));
    click("#btn-lightning", () => startRound("lightning"));
    click("#btn-daily", () => startRound("daily"));
    click("#btn-gift", showGift);
    click("#btn-settings", () => showSettings(false));
    click("#player-card", showProfile);
    click("#btn-topics-back", () => showScreen("home"));
    click("#btn-pause", () => showSettings(true));
    $("#topic-grid").addEventListener("click", e => { const t = e.target.closest(".topic"); if (t) { Sound.play("click"); startRound("classic", t.dataset.cat || null); } });
    $("#lifelines").addEventListener("click", e => { const b = e.target.closest(".life"); if (b) useLifeline(b.dataset.l); });
    window.addEventListener("keydown", e => {
      if (e.key !== "Escape") return;
      if (modalRoot.classList.contains("open")) return;
      if (document.body.dataset.screen === "game" && Quiz.round && !Quiz.round.ended) showSettings(true);
      else if (document.body.dataset.screen !== "home") showScreen("home");
    });
    document.addEventListener("visibilitychange", () => { if (document.hidden && Quiz.round && !Quiz.round.ended && document.body.dataset.screen === "game" && !modalRoot.classList.contains("open")) showSettings(true); });
  }

  async function loadRemote() {
    if (!C.questionsUrl) return;
    try {
      const r = await fetch(C.questionsUrl, { cache: "no-cache" });
      const rows = await r.json();
      if (Array.isArray(rows) && rows.length) Quiz.setBank(rows);
    } catch (e) { /* keep the bundled questions */ }
  }

  async function boot() {
    $("#btn-settings").innerHTML = ICON.gear;
    $("#btn-pause").innerHTML = ICON.pause;
    $("#btn-topics-back").innerHTML = ICON.back;
    $("#btn-play .bi").innerHTML = ICON.play;
    const urls = Object.values(C.art).map(a => a.image).filter(Boolean);
    let done = 0;
    await Promise.all([loadRemote(), ...urls.map(u => probe(u).then(() => { done++; $("#load-fill").style.width = (done / urls.length) * 100 + "%"; }))]);
    if (document.fonts && document.fonts.ready) await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1500))]);
    $$("[data-art]").forEach(el => { el.innerHTML = art(el.dataset.art, "inline"); });
    buildLogo(); bind();
    showScreen("home");
  }
  boot();
})();

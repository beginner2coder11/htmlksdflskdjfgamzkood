/* SUDOKU DAILY — title (Daily Challenge card, continue, new game), play screen (tools, number pad, timer,
   mistakes), sheets: difficulty, daily calendar + monthly trophies, journey, stats, themes shop, win / lose,
   pause + settings, how to play, daily gift. */
window.UI = (() => {
  const C = window.GAME_CONFIG, P = C.storagePrefix, DF = C.difficulties, JN = C.journey.count;
  const $ = s => document.querySelector(s);
  const wrap = $("#wrap"), sheet = $("#sheet");
  const fresh = () => ({ coins: 0, theme: C.themes[0].id, themes: [C.themes[0].id], daily: { last: "", streak: 0 }, solved: {}, dstreak: { last: "", n: 0, best: 0 }, trophies: [],
    journey: 1, jstars: {}, stats: {}, wins: 0, howSeen: false, game: null, opts: { autoNotes: true, same: true, limit: true } });
  let S = fresh();
  try { S = Object.assign(fresh(), JSON.parse(localStorage.getItem(P + "save") || "{}")); } catch (e) {}
  const save = () => { try { localStorage.setItem(P + "save", JSON.stringify(S)); } catch (e) {} };

  /* ---------- helpers ---------- */
  const at = s => { document.body.dataset.at = s; };
  function open(html, x = true) { sheet.innerHTML = (x ? `<button class="x" data-close aria-label="Close">✕</button>` : "") + html; wrap.hidden = false; sheet.querySelectorAll("[data-close]").forEach(b => b.onclick = () => { Sound.play("tap"); close(); }); }
  function close() { wrap.hidden = true; sheet.innerHTML = ""; if (document.body.dataset.at === "play" && Game.paused && !(Game.state && (Game.state.done || Game.state.over))) Game.pause(false); }
  let toastT = 0;
  function toast(s) { const t = $("#toast"); t.textContent = s; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 1800); }
  let tipT = 0;
  function tip(s, ms = 4200) { const t = $("#tip"); t.textContent = s; t.hidden = false; clearTimeout(tipT); tipT = setTimeout(() => t.hidden = true, ms); }
  const coin = n => `<span class="price"><i class="coin"></i>${n}</span>`;
  const fmt = s => { s = Math.round(s); const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, x = s % 60; return (h ? h + ":" + String(m).padStart(2, "0") : m) + ":" + String(x).padStart(2, "0"); };
  const key = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  const today = () => key(new Date());
  const fromKey = k => { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d); };
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const dailyDiff = k => C.dailyByWeekday[fromKey(k).getDay()];
  const journeyDiff = n => { let d = C.journey.bands[0][1]; for (const [from, id] of C.journey.bands) if (n >= from) d = id; return d; };
  function refresh() {
    document.querySelectorAll("[data-coins]").forEach(e => e.textContent = S.coins);
    $("#b-gift").hidden = !giftReady();
    const t = today(), d = new Date(), done = S.solved[t];
    $("#dc-mon").textContent = MON[d.getMonth()].toUpperCase(); $("#dc-day").textContent = d.getDate();
    $("#dc-sub").textContent = done ? `Solved in ${fmt(done.time)} ✓` : `${DF[dailyDiff(t)].name} · tap to play`;
    $("#t-daily").classList.toggle("done", !!done);
    $("#dc-streak").textContent = "🔥 " + curStreak();
    const g = S.game; $("#t-continue").hidden = !g;
    if (g) $("#t-cont-sub").textContent = `${specName(g.spec)} · ${fmt(g.time)}`;
  }
  function curStreak() { const y = key(new Date(Date.now() - 864e5)); return S.dstreak.last === today() || S.dstreak.last === y ? S.dstreak.n : 0; }
  function addCoins(n) { S.coins += n; save(); refresh(); }
  function specName(sp) { return sp.mode === "daily" ? "Daily " + MON[fromKey(sp.key).getMonth()] + " " + fromKey(sp.key).getDate() : sp.mode === "journey" ? "Journey " + sp.n : DF[sp.diff].name; }

  /* ---------- theme ---------- */
  function applyTheme() {
    const th = C.themes.find(t => t.id === S.theme) || C.themes[0], R = document.documentElement.style;
    Game.setTheme(th.id);
    R.setProperty("--bg", th.bg); R.setProperty("--tx", th.dark ? "#eef2ff" : th.given); R.setProperty("--tx2", th.dark ? "#a9b6d8" : th.note);
    R.setProperty("--key", th.board); R.setProperty("--keytx", th.user); R.setProperty("--sh", th.dark ? "rgba(0,0,0,.35)" : th.line);
    const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = th.bg;
  }

  /* ---------- play screen ---------- */
  const pad = $("#pad");
  for (let d = 1; d <= 9; d++) { const b = document.createElement("button"); b.className = "num"; b.dataset.d = d; b.innerHTML = `${d}<small>9</small>`; b.onclick = () => { Sound.unlock(); Game.input(d); }; pad.appendChild(b); }
  Game.on.change = s => {
    pad.querySelectorAll(".num").forEach(b => { const d = +b.dataset.d, left = 9 - s.counts[d]; b.querySelector("small").textContent = left; b.classList.toggle("gone", left <= 0); b.classList.toggle("notes", s.notesMode); });
    const lim = Game.opts.limit && C.mistakes > 0;
    $("#i-mist").innerHTML = `Mistakes <b class="${s.mistakes ? "bad" : ""}">${s.mistakes}${lim ? "/" + C.mistakes : ""}</b>`;
    $("#t-notes").classList.toggle("on", s.notesMode); $("#t-notes-b").textContent = s.notesMode ? "ON" : "OFF";
    const hb = $("#t-hint-b"); hb.textContent = s.hintsLeft > 0 ? s.hintsLeft : "AD"; hb.classList.toggle("ad", s.hintsLeft <= 0);
    $("#t-undo").disabled = !s.canUndo;
    saveSoon();
  };
  Game.on.digitDone = d => toast(`All the ${d}s are done!`);
  let saveT = 0;
  function saveSoon() { clearTimeout(saveT); saveT = setTimeout(() => { const g = Game.state; if (g && !g.done && !g.over && document.body.dataset.at === "play") { S.game = Game.snapshot(); save(); } }, 400); }
  setInterval(() => { const g = Game.state; if (g && document.body.dataset.at === "play") $("#i-time").textContent = fmt(g.time); }, 250);
  setInterval(saveSoon, 5000);

  function enter(sp) {
    $("#p-title").textContent = sp.mode === "daily" ? "Daily Challenge" : sp.mode === "journey" ? "Journey " + sp.n : DF[sp.diff].name;
    $("#p-sub").textContent = sp.mode === "daily" ? MON[fromKey(sp.key).getMonth()] + " " + fromKey(sp.key).getDate() + ", " + fromKey(sp.key).getFullYear() : sp.mode === "journey" ? "Level " + sp.n + " of " + JN : "New game";
    const chip = $("#i-diff"); chip.textContent = DF[sp.diff].name; chip.style.background = DF[sp.diff].color;
    $("#tip").hidden = true;
    at("play"); requestAnimationFrame(() => Game.resize());
  }
  function play(sp) {
    close(); enter(sp); Game.resize(); Game.start(sp);
    const st = stat(sp.diff); st.played++; S.game = Game.snapshot(); save();
    if (!S.howSeen) { S.howSeen = true; save(); setTimeout(how, 500); }
  }
  function cont() { const g = S.game; if (!g) return; close(); enter(g.spec); Game.resize(); Game.resume(g); }
  function playDaily(k) { play({ mode: "daily", key: k, diff: dailyDiff(k), seed: +k.replace(/-/g, "") }); }
  function playJourney(n) { play({ mode: "journey", n, diff: journeyDiff(n), seed: C.journey.seed * 1000 + n }); }
  function playClassic(diff) { play({ mode: "classic", diff, seed: (Date.now() % 1e9) + Math.floor(Math.random() * 1e5) }); }
  function home() { if (Game.state && !Game.state.done && !Game.state.over && document.body.dataset.at === "play") S.game = Game.snapshot(); save(); close(); Game.pause(false); at("title"); refresh(); }
  const stat = d => (S.stats[d] = S.stats[d] || { played: 0, won: 0, best: 0, total: 0 });

  // tools
  $("#t-undo").onclick = () => Game.undo();
  $("#t-erase").onclick = () => Game.erase();
  $("#t-notes").onclick = () => Game.toggleNotes();
  $("#t-auto").onclick = () => { Game.fillNotes(); tip("Notes show every number that still fits. Tap Undo to clear them.", 2600); };
  $("#t-hint").onclick = async () => {
    Sound.unlock();
    let r = Game.hint(); if (!r) return;
    if (r.empty) { const b = $("#t-hint"); b.disabled = true; const ok = await Ads.showRewarded(); b.disabled = false; if (!ok) return; Game.addHints(1); r = Game.hint(); if (!r || r.empty) return; }
    tip(r.text);
  };
  $("#p-back").onclick = () => { Sound.play("tap"); home(); };

  /* ---------- win / lose ---------- */
  Game.on.win = r => {
    $("#tip").hidden = true;
    const sp = r.spec, d = DF[sp.diff], st = stat(sp.diff);
    st.won++; st.total += r.time; if (!st.best || r.time < st.best) { st.best = r.time; r.best = true; }
    let reward = d.coins, extra = "";
    const stars = r.mistakes === 0 && r.hints === 0 ? 3 : r.mistakes <= 1 && r.hints <= 1 ? 2 : 1;
    if (sp.mode === "daily") {
      reward += C.dailyBonus;
      if (!S.solved[sp.key]) S.solved[sp.key] = { time: r.time, stars };
      if (sp.key === today()) { const y = key(new Date(Date.now() - 864e5)); if (S.dstreak.last !== today()) { S.dstreak.n = S.dstreak.last === y ? S.dstreak.n + 1 : 1; S.dstreak.last = today(); S.dstreak.best = Math.max(S.dstreak.best, S.dstreak.n); } }
      const mk = sp.key.slice(0, 7), dt = fromKey(sp.key), days = new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate();
      let all = true; for (let i = 1; i <= days; i++) if (!S.solved[mk + "-" + String(i).padStart(2, "0")]) { all = false; break; }
      if (all && !S.trophies.includes(mk)) { S.trophies.push(mk); reward += C.monthTrophy; extra = `<p class="best">🏆 ${MON[dt.getMonth()]} trophy! +${C.monthTrophy}</p>`; }
    }
    if (sp.mode === "journey") { S.jstars[sp.n] = Math.max(S.jstars[sp.n] || 0, stars); if (sp.n >= S.journey) S.journey = Math.min(JN + 1, sp.n + 1); }
    S.coins += reward; S.wins++; S.game = null; save(); refresh();
    let doubled = false;
    const nextLbl = sp.mode === "journey" ? (sp.n < JN ? "Level " + (sp.n + 1) : "Journey") : sp.mode === "daily" ? "Calendar" : "New " + d.name;
    open(`<div class="banner">${sp.mode === "daily" ? "DAILY SOLVED!" : "SOLVED!"}</div>
      <div class="stars"><i class="${stars >= 1 ? "on" : ""}">★</i><i class="${stars >= 2 ? "on" : ""}">★</i><i class="${stars >= 3 ? "on" : ""}">★</i></div>
      <div class="res-row"><div>${fmt(r.time)}<small>${r.best ? "New best!" : "Time"}</small></div><div>${r.mistakes}<small>Mistakes</small></div><div>${r.hints}<small>Hints</small></div></div>
      ${extra}${sp.mode === "daily" && sp.key === today() ? `<p class="sub">🔥 ${S.dstreak.n} day streak</p>` : ""}
      <div class="reward"><i class="coin"></i><span id="w-c">+${reward}</span></div>
      <div class="stack"><button class="btn blue" id="w-dbl">Collect ×2 <span class="ad">AD</span></button>
      <div class="row2"><button class="btn white" id="w-home">Home</button><button class="btn green" id="w-next">${nextLbl}</button></div></div>`, false);
    $("#w-dbl").onclick = async () => { if (doubled) return; const b = $("#w-dbl"); b.disabled = true; if (await Ads.showRewarded()) { doubled = true; addCoins(reward); $("#w-c").textContent = "+" + reward * 2; Sound.play("coin"); } else b.disabled = false; };
    const after = async fn => { Sound.play("tap"); close(); if (C.ads.interstitialEvery > 0 && S.wins % C.ads.interstitialEvery === 0) await Ads.showInterstitial(); fn(); };
    $("#w-home").onclick = () => after(home);
    $("#w-next").onclick = () => after(() => sp.mode === "journey" ? (sp.n < JN ? playJourney(sp.n + 1) : (home(), journey())) : sp.mode === "daily" ? (home(), calendar()) : playClassic(sp.diff));
  };
  Game.on.lose = r => {
    $("#tip").hidden = true;
    Game.pause(true); let used = false;
    open(`<div class="banner lose">GAME OVER</div><div class="big-ico">🧩</div>
      <p class="sub">That was mistake number ${r.mistakes}. Keep your progress with a second chance!</p>
      <div class="stack"><button class="btn blue" id="l-ad">Second chance <span class="ad">AD</span></button>
      <div class="row2"><button class="btn white" id="l-home">Home</button><button class="btn green" id="l-re">Restart</button></div></div>`, false);
    $("#l-ad").onclick = async () => { if (used) return; const b = $("#l-ad"); b.disabled = true; if (await Ads.showRewarded()) { used = true; Game.secondChance(); Game.pause(false); close(); toast("Second chance! Careful now."); } else b.disabled = false; };
    $("#l-home").onclick = () => { S.game = null; save(); Game.pause(false); home(); };
    $("#l-re").onclick = () => { Sound.play("tap"); const sp = r.spec; S.game = null; Game.pause(false); play(sp); };
  };

  /* ---------- pause / settings ---------- */
  const tg = (id, on, label) => `<button class="tg ${on ? "on" : ""}" id="${id}">${label}<i></i></button>`;
  const toggles = () => `<div class="toggles">${tg("tg-sfx", Sound.sfx, "Sound effects")}${tg("tg-mus", Sound.music, "Music")}${tg("tg-auto", S.opts.autoNotes, "Auto-remove notes")}${tg("tg-same", S.opts.same, "Highlight same numbers")}${tg("tg-lim", S.opts.limit, `Mistake limit (${C.mistakes})`)}</div>`;
  function bindToggles() {
    $("#tg-sfx").onclick = e => { Sound.setSfx(!Sound.sfx); e.currentTarget.classList.toggle("on", Sound.sfx); Sound.play("tap"); };
    $("#tg-mus").onclick = e => { Sound.setMusic(!Sound.music); e.currentTarget.classList.toggle("on", Sound.music); };
    const opt = (id, k) => $(id).onclick = e => { S.opts[k] = !S.opts[k]; e.currentTarget.classList.toggle("on", S.opts[k]); Game.setOpts(S.opts); save(); Sound.play("tap"); Game.ping(); };
    opt("#tg-auto", "autoNotes"); opt("#tg-same", "same"); opt("#tg-lim", "limit");
  }
  function pause() {
    if (document.body.dataset.at !== "play" || !Game.state || Game.state.done) return;
    Game.pause(true); Sound.play("tap");
    open(`<h2>Paused</h2><p class="sub">${fmt(Game.state.time)} · ${specName(Game.state.spec)}</p>${toggles()}<div class="stack"><button class="btn green" id="p-go">Resume</button><div class="row2"><button class="btn white" id="p-re">Restart</button><button class="btn white" id="p-home">Home</button></div></div>`, false);
    bindToggles();
    $("#p-go").onclick = () => { Sound.play("tap"); close(); };
    $("#p-re").onclick = () => { Sound.play("tap"); const sp = Game.state.spec; S.game = null; Game.pause(false); play(sp); };
    $("#p-home").onclick = () => { Sound.play("tap"); Game.pause(false); home(); };
  }
  $("#p-pause").onclick = pause;
  $("#t-set").onclick = () => { Sound.unlock(); Sound.play("tap"); open(`<h2>Settings</h2>${toggles()}<div class="stack"><button class="btn white" id="s-how">How to play</button></div>`); bindToggles(); $("#s-how").onclick = how; };
  addEventListener("keydown", e => { if (e.key === "Escape" && wrap.hidden) pause(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden && document.body.dataset.at === "play" && wrap.hidden) pause(); if (document.hidden) saveSoon(); });

  /* ---------- new game: difficulty ---------- */
  function newGame() {
    Sound.play("tap");
    open(`<h2>New Game</h2><p class="sub">Pick a difficulty</p><div class="diffs">${Object.entries(DF).map(([id, d]) => { const st = S.stats[id]; return `<button class="diff" data-d="${id}"><span><i style="background:${d.color}"></i>${d.name}</span><small>${st && st.best ? "Best " + fmt(st.best) : coin(d.coins)}</small></button>`; }).join("")}</div>`);
    sheet.querySelectorAll("[data-d]").forEach(b => b.onclick = () => { Sound.play("tap"); S.game = null; playClassic(b.dataset.d); });
  }

  /* ---------- daily calendar ---------- */
  let calM = null;
  function calendar(m) {
    Sound.play("tap");
    const now = new Date(); calM = m || calM || new Date(now.getFullYear(), now.getMonth(), 1);
    const y = calM.getFullYear(), mo = calM.getMonth(), days = new Date(y, mo + 1, 0).getDate(), first = new Date(y, mo, 1).getDay(), mk = y + "-" + String(mo + 1).padStart(2, "0");
    let h = ["S", "M", "T", "W", "T", "F", "S"].map(w => `<span class="wd">${w}</span>`).join("") + "<span></span>".repeat(first), done = 0;
    for (let d = 1; d <= days; d++) {
      const k = mk + "-" + String(d).padStart(2, "0"), fut = fromKey(k) > now, sv = S.solved[k]; if (sv) done++;
      h += `<button class="${sv ? "done" : ""} ${k === today() ? "today" : ""}" data-k="${k}" ${fut ? "disabled" : ""}>${d}</button>`;
    }
    const isNow = y === now.getFullYear() && mo === now.getMonth(), minM = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const tro = S.trophies.includes(mk);
    open(`<h2>Daily Challenge</h2><p class="sub">🔥 ${curStreak()} day streak · best ${S.dstreak.best}</p>
      <div class="cal-head"><button id="c-prev" ${calM <= minM ? "disabled" : ""}>‹</button><b>${MON[mo]} ${y}</b><button id="c-next" ${isNow ? "disabled" : ""}>›</button></div>
      <div class="cal">${h}</div>
      <div class="trophy-row"><span class="tro ${tro ? "got" : ""}">🏆</span><span class="prog"><i style="width:${done / days * 100}%"></i></span><span>${done}/${days}</span></div>
      <p class="sub" style="margin-top:8px">Solve every day of the month to win its trophy (+${C.monthTrophy} coins).</p>`);
    $("#c-prev").onclick = () => calendar(new Date(y, mo - 1, 1));
    $("#c-next").onclick = () => calendar(new Date(y, mo + 1, 1));
    sheet.querySelectorAll("[data-k]").forEach(b => b.onclick = () => {
      const k = b.dataset.k, sv = S.solved[k];
      if (S.game && S.game.spec.mode === "daily" && S.game.spec.key === k) return cont();
      Sound.play("tap"); if (sv) toast(`Solved in ${fmt(sv.time)}. Playing it again!`); playDaily(k);
    });
  }

  /* ---------- journey ---------- */
  function journey() {
    Sound.play("tap");
    let h = "";
    for (let i = 1; i <= JN; i++) {
      const done = i < S.journey, cur = i === S.journey, lock = i > S.journey;
      h += `<button class="lv ${done ? "done" : cur ? "cur" : "lock"}" data-n="${i}" ${lock ? "disabled" : ""}><span class="band" style="background:${DF[journeyDiff(i)].color}"></span>${lock ? "🔒" : i}${done ? `<small class="lvs">${"★".repeat(S.jstars[i] || 0)}</small>` : ""}</button>`;
    }
    open(`<h2>Journey</h2><p class="sub">${Math.min(S.journey - 1, JN)} of ${JN} solved · ${Object.values(S.jstars).reduce((a, b) => a + b, 0)} ★</p><div class="grid jr">${h}</div>`);
    sheet.querySelectorAll(".lv:not(.lock)").forEach(b => b.onclick = () => { Sound.play("tap"); const n = +b.dataset.n; if (S.game && S.game.spec.mode === "journey" && S.game.spec.n === n) return cont(); playJourney(n); });
    const c = sheet.querySelector(".lv.cur"); if (c) c.scrollIntoView({ block: "center" });
  }

  /* ---------- stats ---------- */
  function stats() {
    Sound.play("tap");
    const rows = Object.entries(DF).map(([id, d]) => { const s = S.stats[id] || { played: 0, won: 0, best: 0, total: 0 }; return `<div class="st-row"><b style="color:${d.color}">${d.name}</b><span>${s.won}/${s.played}</span><span>${s.best ? fmt(s.best) : "–"}</span><span>${s.won ? fmt(s.total / s.won) : "–"}</span></div>`; }).join("");
    open(`<h2>Statistics</h2><div class="stats"><div class="st-row h"><span></span><span>Won</span><span>Best</span><span>Average</span></div>${rows}</div>
      <div class="res-row" style="margin-top:12px"><div>${Object.keys(S.solved).length}<small>Dailies</small></div><div>${curStreak()}<small>Streak</small></div><div>${S.trophies.length}<small>Trophies</small></div></div>`);
  }

  /* ---------- themes shop ---------- */
  const mini = th => `<div class="mini" style="background:${th.bold}">${[5, "", 3, "", 7, "", 9, 4, ""].map((v, i) => `<i style="background:${i === 4 ? th.same : th.board};color:${i === 7 ? th.user : th.given}">${v}</i>`).join("")}</div>`;
  function shop() {
    Sound.play("tap");
    open(`<h2>Themes</h2><div class="items">${C.themes.map(th => { const own = S.themes.includes(th.id), on = S.theme === th.id;
      return `<button class="item ${on ? "on" : ""}" data-s="${th.id}"><div class="sw" style="background:${th.bg};display:grid;place-items:center;height:96px">${mini(th)}</div>${th.name}${on ? "<small>In use</small>" : own ? "<small>Owned</small>" : coin(th.price)}</button>`; }).join("")}</div>`);
    sheet.querySelectorAll("[data-s]").forEach(b => b.onclick = () => {
      const id = b.dataset.s, it = C.themes.find(x => x.id === id);
      if (!S.themes.includes(id)) { if (S.coins < it.price) return toast(`Need ${it.price - S.coins} more coins`); S.coins -= it.price; S.themes.push(id); Sound.play("buy"); } else Sound.play("tap");
      S.theme = id; save(); refresh(); applyTheme(); shop();
    });
  }

  /* ---------- daily gift ---------- */
  const giftReady = () => S.daily.last !== today();
  function gift() {
    Sound.unlock(); Sound.play("tap");
    const yest = key(new Date(Date.now() - 864e5));
    const streak = giftReady() ? (S.daily.last === yest ? S.daily.streak % 7 : 0) : (S.daily.streak - 1 + 7) % 7;
    const days = C.daily.map((c, i) => `<div class="day ${i < streak ? "got" : i === streak && giftReady() ? "now" : ""}">Day ${i + 1}<i class="coin"></i><b>${c}</b></div>`).join("");
    open(`<h2>Daily gift</h2><p class="sub">Come back every day for bigger gifts.</p><div class="days">${days}</div>
      <div class="stack">${giftReady() ? `<button class="btn green" id="g-get">Collect ${C.daily[streak]}</button><button class="btn blue" id="g-x2">Collect ×2 <span class="ad">AD</span></button>` : `<p class="sub">Next gift tomorrow!</p>`}</div>`);
    const claim = mult => { const n = C.daily[streak] * mult; S.daily = { last: today(), streak: streak + 1 }; addCoins(n); Sound.play("coin"); toast(`+${n} coins`); close(); };
    if (giftReady()) { $("#g-get").onclick = () => claim(1); $("#g-x2").onclick = async () => { const b = $("#g-x2"); b.disabled = true; if (await Ads.showRewarded()) claim(2); else b.disabled = false; }; }
  }

  /* ---------- how to play ---------- */
  function how() {
    Sound.play("tap");
    open(`<h2>How to play</h2><div class="how">
      <div><b>1</b>Fill the grid so every row, column and 3×3 box has the numbers 1 to 9 once each.</div>
      <div><b>2</b>Tap a cell, then a number. Turn on Notes to pencil in the numbers that might fit.</div>
      <div><b>3</b>Stuck? A hint fills a cell and tells you why it has to be that number.</div>
      <div><b>4</b>Three mistakes and the game is over. Every puzzle can be solved without guessing!</div>
    </div><div class="stack"><button class="btn green" data-close>Let's play</button></div>`);
  }

  /* ---------- title ---------- */
  $("#tagline").textContent = C.tagline;
  $("#t-daily").onclick = () => { Sound.unlock(); const t = today(); if (S.game && S.game.spec.mode === "daily" && S.game.spec.key === t) return cont(); if (S.solved[t]) return calendar(); playDaily(t); };
  $("#t-continue").onclick = () => { Sound.unlock(); Sound.play("tap"); cont(); };
  $("#t-new").onclick = () => { Sound.unlock(); newGame(); };
  $("#t-journey").onclick = () => { Sound.unlock(); journey(); };
  $("#t-cal").onclick = () => { Sound.unlock(); calendar(); };
  $("#t-shop").onclick = () => { Sound.unlock(); shop(); };
  $("#t-stats").onclick = () => { Sound.unlock(); stats(); };
  $("#t-gift").onclick = gift;
  wrap.addEventListener("pointerdown", e => { if (e.target === wrap && sheet.querySelector("[data-close]")) close(); });

  Game.setOpts(S.opts); applyTheme(); at("title"); refresh();
  return { play, playDaily, playJourney, playClassic, cont, home, newGame, calendar, journey, stats, shop, gift, how, pause, close, toast, state: S, save, refresh };
})();

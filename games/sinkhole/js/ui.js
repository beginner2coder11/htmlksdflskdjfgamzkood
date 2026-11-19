/* SINKHOLE — title, HUD (timer, leaderboard, solo goal), win / lose sheets, level grid, shop, daily gift */
window.UI = (() => {
  const C = window.GAME_CONFIG, P = C.storagePrefix, N = C.levels.count;
  const $ = s => document.querySelector(s);
  const wrap = $("#wrap"), sheet = $("#sheet");
  const fresh = () => ({ level: 1, coins: 0, stars: {}, skin: C.skins[0].id, skins: [C.skins[0].id], daily: { last: "", streak: 0 }, wins: 0, howSeen: false });
  let S = fresh();
  try { S = Object.assign(fresh(), JSON.parse(localStorage.getItem(P + "save") || "{}")); } catch (e) {}
  const save = () => { try { localStorage.setItem(P + "save", JSON.stringify(S)); } catch (e) {} };
  let cur = 1, revived = false;

  /* ---------- helpers ---------- */
  const at = s => { document.body.dataset.at = s; };
  function open(html, x = true) { sheet.innerHTML = (x ? `<button class="x" data-close aria-label="Close">✕</button>` : "") + html; wrap.hidden = false; sheet.querySelectorAll("[data-close]").forEach(b => b.onclick = () => { Sound.play("tap"); close(); }); }
  function close() { wrap.hidden = true; sheet.innerHTML = ""; if (document.body.dataset.at === "play" && Game.mode === "paused") Game.pause(false); }
  let toastT = 0;
  function toast(s) { const t = $("#toast"); t.textContent = s; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 1700); }
  const coin = n => `<span class="price"><i class="coin"></i>${n}</span>`;
  function refresh() {
    document.querySelectorAll("[data-coins]").forEach(e => e.textContent = S.coins);
    $("#h-coins").textContent = S.coins;
    $("#t-play-l").textContent = S.level > N ? "Replay" : "Level " + S.level;
    $("#b-gift").hidden = !giftReady();
  }
  function addCoins(n) { S.coins += n; save(); refresh(); }
  // HUD: timer (or solo goal) + live leaderboard
  setInterval(() => {
    if (document.body.dataset.at !== "play" || !Game.me) return;
    const tl = Math.max(0, Math.ceil(Game.timeLeft)), solo = Game.holes.length === 1;
    $("#g-time").textContent = Math.floor(tl / 60) + ":" + String(tl % 60).padStart(2, "0");
    if (solo) { $("#g-label").textContent = Math.round(Game.pct * 100) + "%"; $("#g-fill").style.width = Math.min(100, Game.pct / Game.level.solo * 100) + "%"; }
    else { $("#g-label").textContent = "⏱"; $("#g-fill").style.width = (tl / Game.level.time * 100) + "%"; }
    const rank = Game.holes.slice().sort((a, b) => b.score - a.score);
    $("#board").innerHTML = solo ? "" : rank.slice(0, 5).map((h, i) => `<li class="${h.isMe ? "me" : ""}"><span>${i + 1}</span><i style="background:${h.color}"></i>${h.name}<b>${h.score}</b></li>`).join("") + (rank.indexOf(Game.me) >= 5 ? `<li class="me"><span>${rank.indexOf(Game.me) + 1}</span><i style="background:${Game.me.color}"></i>You<b>${Game.me.score}</b></li>` : "");
  }, 250);

  /* ---------- play ---------- */
  function play(n) {
    close(); cur = Math.max(1, Math.min(N, n)); revived = false;
    at("play");
    Game.start(cur);
    $("#h-lvl-n").textContent = "Level " + cur; $("#h-hard").hidden = !Game.isSolo(cur); $("#h-hard").textContent = "SOLO";
    if (Game.isSolo(cur)) toast(`SOLO: eat ${Math.round(Game.level.solo * 100)}% of the city!`);
    refresh();
    if (cur === 1 && !S.howSeen) { S.howSeen = true; save(); setTimeout(how, 400); }
  }
  function home() { close(); at("title"); Game.attract(); refresh(); }

  Game.on.win = r => {
    const lv = r.n, stars = r.solo ? (r.time > 30 ? 3 : r.time > 10 ? 2 : 1) : (r.ranking[1] && r.score >= r.ranking[1].score * 1.5 ? 3 : r.ranking[1] && r.score >= r.ranking[1].score * 1.15 ? 2 : 1);
    const reward = Math.round(C.coins.win + (r.solo ? 20 : C.coins.perPlace[0]) + r.score * C.coins.perValue);
    S.coins += reward; S.wins++; S.stars[lv] = Math.max(S.stars[lv] || 0, stars); if (lv >= S.level) S.level = lv + 1; save(); refresh();
    const last = lv >= N; let doubled = false;
    open(`<div class="banner">${r.solo ? "CITY SWALLOWED!" : "BIGGEST HOLE!"}</div>
      <div class="stars"><i class="${stars >= 1 ? "on" : ""}">★</i><i class="${stars >= 2 ? "on" : ""}">★</i><i class="${stars >= 3 ? "on" : ""}">★</i></div>
      <p class="sub">${r.solo ? `You ate ${Math.round(r.pct * 100)}% of the city` : `1st place with ${r.score} points`}</p>
      <div class="reward"><i class="coin"></i><span id="w-c">+${reward}</span></div>
      <div class="stack"><button class="btn blue" id="w-dbl">Collect ×2 <span class="ad">AD</span></button>
      <button class="btn green" id="w-next">${last ? "Level list" : "Next level"}</button></div>`, false);
    $("#w-dbl").onclick = async () => { if (doubled) return; const b = $("#w-dbl"); b.disabled = true; if (await Ads.showRewarded()) { doubled = true; addCoins(reward); $("#w-c").textContent = "+" + reward * 2; Sound.play("coin"); } else b.disabled = false; };
    $("#w-next").onclick = async () => { Sound.play("tap"); close(); if (C.ads.interstitialEvery > 0 && S.wins % C.ads.interstitialEvery === 0) await Ads.showInterstitial(); last ? levels() : play(lv + 1); };
  };
  Game.on.lose = r => {
    const coinsWon = r.solo ? 0 : Math.round((C.coins.perPlace[r.place - 1] || 0) + r.score * C.coins.perValue);
    if (coinsWon) addCoins(coinsWon);
    let used = false;
    open(`<div class="banner lose">${r.solo ? "TIME'S UP!" : r.place === 2 ? "SO CLOSE!" : "TRY AGAIN"}</div>
      <div class="big-ico">${r.solo ? "⏱️" : ["", "🥇", "🥈", "🥉"][r.place] || "🕳️"}</div>
      <p class="sub">${r.solo ? `You ate ${Math.round(r.pct * 100)}% of ${Math.round(r.need * 100)}%.` : `You came ${r.place}${["", "st", "nd", "rd"][r.place] || "th"}. ${r.ranking[0].name} ate ${r.ranking[0].score}.`}${coinsWon ? ` +${coinsWon} coins` : ""}</p>
      <div class="stack">${r.solo ? `<button class="btn blue" id="l-ad">+20 seconds <span class="ad">AD</span></button>` : ""}
      <button class="btn green" id="l-retry">Play again</button></div>`, false);
    const ad = $("#l-ad"); if (ad) ad.onclick = async () => { if (used) return; ad.disabled = true; if (await Ads.showRewarded()) { used = true; close(); Game.extraTime(20); } else ad.disabled = false; };
    $("#l-retry").onclick = () => { Sound.play("tap"); play(cur); };
  };

  /* ---------- pause / settings ---------- */
  const toggles = () => `<div class="toggles"><button class="tg ${Sound.sfx ? "on" : ""}" id="tg-sfx">Sound effects<i></i></button><button class="tg ${Sound.music ? "on" : ""}" id="tg-mus">Music<i></i></button></div>`;
  function bindToggles() {
    $("#tg-sfx").onclick = e => { Sound.setSfx(!Sound.sfx); e.currentTarget.classList.toggle("on", Sound.sfx); Sound.play("tap"); };
    $("#tg-mus").onclick = e => { Sound.setMusic(!Sound.music); e.currentTarget.classList.toggle("on", Sound.music); };
  }
  function pause() {
    if (Game.mode !== "play") return;
    Game.pause(true); Sound.play("tap");
    open(`<h2>Paused</h2>${toggles()}<div class="stack"><button class="btn green" id="p-go">Resume</button><div class="row2"><button class="btn white" id="p-re">Restart</button><button class="btn white" id="p-home">Home</button></div></div>`, false);
    bindToggles();
    $("#p-go").onclick = () => { Sound.play("tap"); close(); };
    $("#p-re").onclick = () => { Sound.play("tap"); play(cur); };
    $("#p-home").onclick = () => { Sound.play("tap"); home(); };
  }
  $("#h-pause").onclick = pause;
  $("#t-sound").onclick = () => { Sound.unlock(); Sound.play("tap"); open(`<h2>Settings</h2>${toggles()}<div class="stack"><button class="btn white" id="s-how">How to play</button></div>`); bindToggles(); $("#s-how").onclick = how; };
  addEventListener("keydown", e => { if ((e.key === "Escape" || e.key === "p") && wrap.hidden) pause(); if (e.key === "Enter" && document.body.dataset.at === "title" && wrap.hidden) play(Math.min(S.level, N)); });
  document.addEventListener("visibilitychange", () => { if (document.hidden && Game.mode === "play" && wrap.hidden) pause(); });

  /* ---------- levels ---------- */
  function levels() {
    Sound.play("tap");
    let h = "";
    for (let i = 1; i <= N; i++) {
      const done = i < S.level, curL = i === S.level, lock = i > S.level;
      h += `<button class="lv ${done ? "done" : curL ? "cur" : "lock"}" data-n="${i}" ${lock ? "disabled" : ""}>${lock ? "🔒" : i}${done ? `<small class="lvs">${"★".repeat(S.stars[i] || 0)}</small>` : ""}</button>`;
    }
    open(`<h2>Levels</h2><p class="sub">${Math.min(S.level - 1, N)} of ${N} cleared</p><div class="grid">${h}</div>`);
    sheet.querySelectorAll(".lv:not(.lock)").forEach(b => b.onclick = () => { Sound.play("tap"); play(+b.dataset.n); });
    const c = sheet.querySelector(".lv.cur"); if (c) c.scrollIntoView({ block: "center" });
  }

  /* ---------- shop ---------- */
  function shop() {
    Sound.play("tap");
    const body = `<div class="items">${C.skins.map(k => { const own = S.skins.includes(k.id), on = S.skin === k.id;
      return `<button class="item ${on ? "on" : ""}" data-s="${k.id}"><div class="sw" style="background:#5c6274;display:grid;place-items:center"><i style="width:70px;height:30px;border-radius:50%;background:radial-gradient(ellipse at 50% 65%,#05060c 40%,#2a3048);box-shadow:0 0 0 5px ${k.rim},0 0 0 7px ${k.glow}"></i></div>${k.name}${on ? "<small>In use</small>" : own ? "<small>Owned</small>" : coin(k.price)}</button>`; }).join("")}</div>`;
    open(`<h2>Hole colours</h2>${body}`);
    sheet.querySelectorAll("[data-s]").forEach(b => b.onclick = () => {
      const id = b.dataset.s, it = C.skins.find(x => x.id === id);
      if (!S.skins.includes(id)) { if (S.coins < it.price) return toast(`Need ${it.price - S.coins} more coins`); S.coins -= it.price; S.skins.push(id); Sound.play("buy"); } else Sound.play("tap");
      S.skin = id; save(); refresh(); Game.setSkin(id); shop();
    });
  }

  /* ---------- daily gift ---------- */
  const today = () => new Date().toISOString().slice(0, 10);
  const giftReady = () => S.daily.last !== today();
  function gift() {
    Sound.unlock(); Sound.play("tap");
    const yest = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
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
      <div><b>1</b>Drag anywhere to steer your hole around the city.</div>
      <div><b>2</b>Anything smaller than the hole falls in. The more you eat, the bigger you get.</div>
      <div><b>3</b>Start with people and cones, then cars, buses, houses... and towers!</div>
      <div><b>4</b>Out-eat the rival holes before time runs out. Bigger holes swallow smaller ones, so watch out!</div>
    </div><div class="stack"><button class="btn green" data-close>Let's eat!</button></div>`);
  }

  /* ---------- title ---------- */
  $("#tagline").textContent = C.tagline;
  $("#t-play").onclick = () => { Sound.unlock(); Sound.play("tap"); play(Math.min(S.level, N)); };
  $("#t-levels").onclick = () => { Sound.unlock(); levels(); };
  $("#t-shop").onclick = () => { Sound.unlock(); shop(); };
  $("#t-how").onclick = () => { Sound.unlock(); how(); };
  $("#t-gift").onclick = gift;
  wrap.addEventListener("pointerdown", e => { if (e.target === wrap && sheet.querySelector("[data-close]")) close(); });

  Game.setSkin(S.skin);
  home();
  return { play, home, levels, shop, gift, how, pause, close, toast, state: S, save, refresh };
})();

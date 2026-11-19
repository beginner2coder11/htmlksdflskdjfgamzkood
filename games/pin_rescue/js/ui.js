/* PIN RESCUE — title, HUD (treasure bar), hint, win (stars) / lose sheets, level grid, shop, daily gift */
window.UI = (() => {
  const C = window.GAME_CONFIG, P = C.storagePrefix, N = window.LEVELS.length;
  const $ = s => document.querySelector(s);
  const wrap = $("#wrap"), sheet = $("#sheet");
  const fresh = () => ({ level: 1, coins: 0, stars: {}, boost: { hint: C.boosters.hint.start }, theme: C.themes[0].id, themes: [C.themes[0].id], daily: { last: "", streak: 0 }, wins: 0, howSeen: false });
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
    for (const k of ["hint"]) { const e = $("#n-" + k); e.textContent = S.boost[k] || "+"; e.classList.toggle("plus", !S.boost[k]); }
  }
  function addCoins(n) { S.coins += n; save(); refresh(); }
  Game.on.gems = (have, need, total) => { $("#g-have").textContent = have; $("#g-goal").textContent = total; $("#g-fill").style.width = Math.min(100, have / total * 100) + "%"; $("#g-need").style.left = (need / total * 100) + "%"; $("#goal").classList.toggle("full", have >= need); };

  /* ---------- play ---------- */
  function play(n) {
    close(); cur = Math.max(1, Math.min(N, n)); revived = false;
    at("play");
    Game.start(cur);
    $("#h-lvl-n").textContent = "Level " + cur; $("#h-hard").hidden = true;
    refresh();
    if (cur === 1 && !S.howSeen) { S.howSeen = true; save(); setTimeout(how, 400); }
  }
  function home() { close(); at("title"); Game.attract(); refresh(); }

  Game.on.win = (l, lv, gems, total) => {
    const share = gems / total, stars = C.stars.filter(x => share >= x - 1e-9).length;
    const reward = C.coins.win + stars * C.coins.perStar + Math.round(gems * C.coins.perGem);
    S.coins += reward; S.wins++; S.stars[lv] = Math.max(S.stars[lv] || 0, stars); if (lv >= S.level) S.level = lv + 1; save(); refresh();
    const last = lv >= N; let doubled = false;
    setTimeout(() => {
      if (Game.level !== l || Game.mode !== "won" || document.body.dataset.at !== "play") return;   // player already moved on
      open(`<div class="banner">${last ? "ALL CLEAR!" : "TREASURE SAVED!"}</div>
        <div class="stars"><i class="${stars >= 1 ? "on" : ""}">★</i><i class="${stars >= 2 ? "on" : ""}">★</i><i class="${stars >= 3 ? "on" : ""}">★</i></div>
        <p class="sub">💎 ${gems} of ${total} gems saved${stars < 3 ? ` · ★★★ at ${Math.ceil(total * C.stars[2])}` : " · every last one!"}</p>
        <div class="reward"><i class="coin"></i><span id="w-c">+${reward}</span></div>
        <div class="stack"><button class="btn blue" id="w-dbl">Collect ×2 <span class="ad">AD</span></button>
        <button class="btn green" id="w-next">${last ? "Level list" : "Next level"}</button></div>`, false);
      $("#w-dbl").onclick = async () => { if (doubled) return; const b = $("#w-dbl"); b.disabled = true; if (await Ads.showRewarded()) { doubled = true; addCoins(reward); $("#w-c").textContent = "+" + reward * 2; Sound.play("coin"); } else b.disabled = false; };
      $("#w-next").onclick = async () => { Sound.play("tap"); close(); if (C.ads.interstitialEvery > 0 && S.wins % C.ads.interstitialEvery === 0) await Ads.showInterstitial(); last ? levels() : play(lv + 1); };
    }, 900);
  };
  Game.on.lose = (l, lv, why) => {
    const T = { lava: ["OUCH, LAVA!", "🔥", "The lava reached the explorer. Cool it with water first, or keep it away."], monster: ["MONSTER!", "👾", "The monster got in. Knock it out with lava or a boulder before it can drop."], gems: ["NOT ENOUGH!", "💎", "Not enough treasure reached the explorer. Try another order."] }[why] || ["TRY AGAIN", "🔄", ""];
    open(`<div class="banner lose">${T[0]}</div>
      <div class="big-ico">${T[1]}</div>
      <p class="sub">${T[2]}</p>
      <div class="stack"><button class="btn green" id="l-retry">Try again</button>
      <button class="btn blue" id="l-hint">Retry with a hint <span class="ad">AD</span></button></div>`, false);
    $("#l-retry").onclick = () => { Sound.play("tap"); play(cur); };
    $("#l-hint").onclick = async () => { const b = $("#l-hint"); b.disabled = true; if (await Ads.showRewarded()) { play(cur); setTimeout(() => Game.hint(), 300); } else b.disabled = false; };
  };

  /* ---------- boosters ---------- */
  const ICON = { hint: "💡" }, WHAT = { hint: "Flashes the next pin to pull." };
  $("#b-restart").onclick = () => { if (Game.mode !== "play") return; Sound.play("tap"); play(cur); };
  $("#b-hint").onclick = () => {
    if (Game.mode !== "play") return; Sound.play("tap");
    if (!S.boost.hint) return buyBooster("hint");
    const r = Game.hint();
    if (r === "restart") toast("That order won't work. Restart for a hint!");
    else if (r) { S.boost.hint--; save(); refresh(); }
  };
  function buyBooster(k) {
    const b = C.boosters[k];
    Game.pause(true);
    open(`<h2>${b.name}</h2><div class="big-ico">${ICON[k]}</div>
      <p class="sub">${WHAT[k]}</p>
      <div class="stack"><button class="btn blue" id="bb-ad">Get 1 free <span class="ad">AD</span></button>
      <button class="btn white" id="bb-coin" ${S.coins < b.price ? "disabled" : ""}>Buy 3 · ${coin(b.price)}</button></div>`);
    $("#bb-ad").onclick = async () => { const x = $("#bb-ad"); x.disabled = true; if (await Ads.showRewarded()) { S.boost[k]++; save(); refresh(); toast("+1 " + b.name); close(); } else x.disabled = false; };
    $("#bb-coin").onclick = () => { if (S.coins < b.price) return; S.coins -= b.price; S.boost[k] += 3; save(); refresh(); Sound.play("buy"); toast("+3 " + b.name); close(); };
  }

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
  function shop(tab = "themes") {
    Sound.play("tap");
    let body = "";
    if (tab === "themes") body = `<div class="items">${C.themes.map(t => { const own = S.themes.includes(t.id), on = S.theme === t.id;
      return `<button class="item ${on ? "on" : ""}" data-s="${t.id}"><div class="sw" style="background:linear-gradient(${t.sky[0]},${t.sky[1]})"><i style="position:absolute;left:0;right:0;bottom:0;height:40%;background:${t.hills[0]};border-radius:50% 50% 0 0/30% 30% 0 0"></i><i style="position:absolute;left:38%;top:14%;width:24%;height:62%;border:4px solid ${t.glass};border-bottom:0;border-radius:6px 6px 0 0"></i></div>${t.name}${on ? "<small>In use</small>" : own ? "<small>Owned</small>" : coin(t.price)}</button>`; }).join("")}</div>`;
    if (tab === "boost") body = `<div class="bst">${Object.entries(C.boosters).map(([k, b]) => `<div class="item"><span>${ICON[k]} ${b.name}<br><small>You have ${S.boost[k]}</small></span><button class="btn small" data-k="${k}" ${S.coins < b.price ? "disabled" : ""}>3 for ${b.price}</button></div>`).join("")}</div>`;
    open(`<h2>Shop</h2><div class="tabs" style="grid-template-columns:1fr 1fr"><button data-t="themes" class="${tab === "themes" ? "on" : ""}">Scenery</button><button data-t="boost" class="${tab === "boost" ? "on" : ""}">Hints</button></div>${body}`);
    sheet.querySelectorAll("[data-t]").forEach(b => b.onclick = () => shop(b.dataset.t));
    sheet.querySelectorAll("[data-s]").forEach(b => b.onclick = () => {
      const id = b.dataset.s, it = C.themes.find(x => x.id === id);
      if (!S.themes.includes(id)) { if (S.coins < it.price) return toast(`Need ${it.price - S.coins} more coins`); S.coins -= it.price; S.themes.push(id); Sound.play("buy"); } else Sound.play("tap");
      S.theme = id; save(); refresh(); Game.setTheme(id); shop("themes");
    });
    sheet.querySelectorAll("[data-k]").forEach(b => b.onclick = () => { const k = b.dataset.k, p = C.boosters[k].price; if (S.coins < p) return; S.coins -= p; S.boost[k] += 3; save(); refresh(); Sound.play("buy"); shop("boost"); });
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
      <div><b>1</b>Tap a golden pin to slide it out. Whatever sits on it falls.</div>
      <div><b>2</b>Get the gems and coins down to the explorer's room.</div>
      <div><b>3</b>Keep the lava away! Water poured on lava turns both into safe stone.</div>
      <div><b>4</b>Knock out the monster with lava or a boulder before it can drop in.</div>
    </div><div class="stack"><button class="btn green" data-close>Let's go!</button></div>`);
  }

  /* ---------- title ---------- */
  $("#tagline").textContent = C.tagline;
  $("#t-play").onclick = () => { Sound.unlock(); Sound.play("tap"); play(Math.min(S.level, N)); };
  $("#t-levels").onclick = () => { Sound.unlock(); levels(); };
  $("#t-shop").onclick = () => { Sound.unlock(); shop(); };
  $("#t-how").onclick = () => { Sound.unlock(); how(); };
  $("#t-gift").onclick = gift;
  wrap.addEventListener("pointerdown", e => { if (e.target === wrap && sheet.querySelector("[data-close]")) close(); });

  Game.setTheme(S.theme);
  home();
  return { play, home, levels, shop, gift, how, pause, close, toast, state: S, save, refresh };
})();

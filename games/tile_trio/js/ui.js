/* TILE TRIO — title, HUD (tiles left + clock), boosters, win (stars) / tray-full sheets, level grid, shop, daily gift */
window.UI = (() => {
  const C = window.GAME_CONFIG, P = C.storagePrefix, N = C.levels.count;
  const $ = s => document.querySelector(s);
  const wrap = $("#wrap"), sheet = $("#sheet");
  const fresh = () => ({ level: 1, coins: 0, stars: {}, boost: { undo: C.boosters.undo.start, pop: C.boosters.pop.start, shuffle: C.boosters.shuffle.start }, style: C.tileStyles[0].id, styles: [C.tileStyles[0].id], daily: { last: "", streak: 0 }, wins: 0, howSeen: false });
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
    for (const k of ["undo", "pop", "shuffle"]) { const e = $("#n-" + k); e.textContent = S.boost[k] || "+"; e.classList.toggle("plus", !S.boost[k]); }
  }
  function addCoins(n) { S.coins += n; save(); refresh(); }
  // goal bar: tiles left + clock (polled; cheap)
  setInterval(() => {
    if (document.body.dataset.at !== "play" || !Game.state) return;
    const st = Game.state, total = st.tiles.length, left = st.tiles.filter(x => x.at !== "gone").length, e = Math.floor(Game.elapsed);
    $("#g-left").textContent = left + " left"; $("#g-fill").style.width = ((total - left) / total * 100) + "%"; $("#g-time").textContent = Math.floor(e / 60) + ":" + String(e % 60).padStart(2, "0");
  }, 200);

  /* ---------- play ---------- */
  function play(n) {
    close(); cur = Math.max(1, Math.min(N, n)); revived = false;
    at("play");
    Game.start(cur);
    $("#h-lvl-n").textContent = "Level " + cur; $("#h-hard").hidden = !Rules.isHard(cur);
    refresh();
    if (Rules.isHard(cur)) toast("HARD LEVEL · double coins!");
    if (cur === 1 && !S.howSeen) { S.howSeen = true; save(); setTimeout(how, 400); }
  }
  function home() { close(); at("title"); Game.attract(); refresh(); }

  Game.on.win = (l, secs) => {
    const par = l.tiles.length * C.parSeconds, stars = secs <= par ? 3 : secs <= par * 2 ? 2 : 1;
    const reward = (l.hard ? C.coins.hard : C.coins.win) + stars * C.coins.perStar;
    S.coins += reward; S.wins++; S.stars[l.n] = Math.max(S.stars[l.n] || 0, stars); if (l.n >= S.level) S.level = l.n + 1; save(); refresh();
    const last = l.n >= N; let doubled = false; const m = Math.floor(secs / 60), sec = Math.floor(secs % 60), pm = Math.floor(par / 60), ps = Math.floor(par % 60);
    setTimeout(() => {
      if (Game.level !== l || Game.mode !== "won" || document.body.dataset.at !== "play") return;   // player already moved on
      open(`<div class="banner">${last ? "ALL CLEAR!" : "LEVEL " + l.n + " DONE!"}</div>
        <div class="stars"><i class="${stars >= 1 ? "on" : ""}">★</i><i class="${stars >= 2 ? "on" : ""}">★</i><i class="${stars >= 3 ? "on" : ""}">★</i></div>
        <p class="sub">Cleared in ${m}:${String(sec).padStart(2, "0")}${stars < 3 ? ` · ★★★ under ${pm}:${String(ps).padStart(2, "0")}` : " · lightning fast!"}</p>
        <div class="reward"><i class="coin"></i><span id="w-c">+${reward}</span></div>
        <div class="stack"><button class="btn blue" id="w-dbl">Collect ×2 <span class="ad">AD</span></button>
        <button class="btn green" id="w-next">${last ? "Level list" : "Next level"}</button></div>`, false);
      $("#w-dbl").onclick = async () => { if (doubled) return; const b = $("#w-dbl"); b.disabled = true; if (await Ads.showRewarded()) { doubled = true; addCoins(reward); $("#w-c").textContent = "+" + reward * 2; Sound.play("coin"); } else b.disabled = false; };
      $("#w-next").onclick = async () => { Sound.play("tap"); close(); if (C.ads.interstitialEvery > 0 && S.wins % C.ads.interstitialEvery === 0) await Ads.showInterstitial(); last ? levels() : play(l.n + 1); };
    }, 1000);
  };
  Game.on.lose = l => {
    const price = 150;
    open(`<div class="banner lose">TRAY FULL!</div>
      <div class="big-ico">🧺</div>
      <p class="sub">No room for another tile. Pop 3 tiles out to the shelf and keep going?</p>
      <div class="stack">${revived ? "" : `<button class="btn blue" id="l-ad">Pop out 3 <span class="ad">AD</span></button>
      <button class="btn white" id="l-coin" ${S.coins < price ? "disabled" : ""}>Pop out 3 · ${coin(price)}</button>`}
      <button class="btn" id="l-retry">Try again</button></div>`, false);
    const rv = () => { revived = true; close(); Game.revive(); };
    if (!revived) {
      $("#l-ad").onclick = async () => { const b = $("#l-ad"); b.disabled = true; if (await Ads.showRewarded()) rv(); else b.disabled = false; };
      $("#l-coin").onclick = () => { if (S.coins < price) return; S.coins -= price; save(); refresh(); Sound.play("buy"); rv(); };
    }
    $("#l-retry").onclick = () => { Sound.play("tap"); play(cur); };
  };

  /* ---------- boosters ---------- */
  const ICON = { undo: "↩️", pop: "⏏️", shuffle: "🔀" }, WHAT = { undo: "Takes back your last tile.", pop: "Moves 3 tiles from the tray up to a shelf, where you can tap them again later.", shuffle: "Mixes up the pictures on the pile." };
  const use = { undo: () => Game.undo(), pop: () => Game.popOut(), shuffle: () => Game.shuffle() };
  for (const k of ["undo", "pop", "shuffle"]) $("#b-" + k).onclick = () => {
    if (Game.mode !== "play" || Game.busy()) return; Sound.play("tap");
    if (!S.boost[k]) return buyBooster(k);
    if (use[k]()) { S.boost[k]--; save(); refresh(); } else toast(k === "undo" ? "Nothing to undo" : k === "pop" ? "The shelf is full" : "Nothing to shuffle");
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
      h += `<button class="lv ${done ? "done" : curL ? "cur" : "lock"} ${Rules.isHard(i) ? "h" : ""}" data-n="${i}" ${lock ? "disabled" : ""}>${lock ? "🔒" : i}${done ? `<small class="lvs">${"★".repeat(S.stars[i] || 0)}</small>` : ""}</button>`;
    }
    open(`<h2>Levels</h2><p class="sub">${Math.min(S.level - 1, N)} of ${N} cleared</p><div class="grid">${h}</div>`);
    sheet.querySelectorAll(".lv:not(.lock)").forEach(b => b.onclick = () => { Sound.play("tap"); play(+b.dataset.n); });
    const c = sheet.querySelector(".lv.cur"); if (c) c.scrollIntoView({ block: "center" });
  }

  /* ---------- shop ---------- */
  function shop(tab = "tiles") {
    Sound.play("tap");
    let body = "";
    if (tab === "tiles") body = `<div class="items">${C.tileStyles.map(t => { const own = S.styles.includes(t.id), on = S.style === t.id;
      return `<button class="item ${on ? "on" : ""}" data-s="${t.id}"><div class="sw" style="background:#f6efe4;display:grid;place-items:center"><i style="font-style:normal;font-size:30px;width:46px;height:54px;display:grid;place-items:center;border-radius:10px;background:linear-gradient(${t.face[0]},${t.face[1]});box-shadow:3px 4px 0 ${t.edge},inset 0 0 0 1.5px ${t.line}">🍓</i></div>${t.name}${on ? "<small>In use</small>" : own ? "<small>Owned</small>" : coin(t.price)}</button>`; }).join("")}</div>`;
    if (tab === "boost") body = `<div class="bst">${Object.entries(C.boosters).map(([k, b]) => `<div class="item"><span>${ICON[k]} ${b.name}<br><small>You have ${S.boost[k]}</small></span><button class="btn small" data-k="${k}" ${S.coins < b.price ? "disabled" : ""}>3 for ${b.price}</button></div>`).join("")}</div>`;
    open(`<h2>Shop</h2><div class="tabs" style="grid-template-columns:1fr 1fr"><button data-t="tiles" class="${tab === "tiles" ? "on" : ""}">Tiles</button><button data-t="boost" class="${tab === "boost" ? "on" : ""}">Boosters</button></div>${body}`);
    sheet.querySelectorAll("[data-t]").forEach(b => b.onclick = () => shop(b.dataset.t));
    sheet.querySelectorAll("[data-s]").forEach(b => b.onclick = () => {
      const id = b.dataset.s, it = C.tileStyles.find(x => x.id === id);
      if (!S.styles.includes(id)) { if (S.coins < it.price) return toast(`Need ${it.price - S.coins} more coins`); S.coins -= it.price; S.styles.push(id); Sound.play("buy"); } else Sound.play("tap");
      S.style = id; save(); refresh(); Game.setStyle(id); shop("tiles");
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
      <div><b>1</b>Tap a tile with nothing on top of it. It drops into the tray.</div>
      <div><b>2</b>Tiles with the same picture line up together in the tray.</div>
      <div><b>3</b>Three of a kind pop and leave the tray. Clear the whole pile!</div>
      <div><b>4</b>If the tray fills up (${C.traySlots} tiles) without a match, you lose. Plan ahead!</div>
    </div><div class="stack"><button class="btn green" data-close>Let's match!</button></div>`);
  }

  /* ---------- title ---------- */
  $("#tagline").textContent = C.tagline;
  $("#t-play").onclick = () => { Sound.unlock(); Sound.play("tap"); play(Math.min(S.level, N)); };
  $("#t-levels").onclick = () => { Sound.unlock(); levels(); };
  $("#t-shop").onclick = () => { Sound.unlock(); shop(); };
  $("#t-how").onclick = () => { Sound.unlock(); how(); };
  $("#t-gift").onclick = gift;
  wrap.addEventListener("pointerdown", e => { if (e.target === wrap && sheet.querySelector("[data-close]")) close(); });

  Game.setStyle(S.style);
  home();
  return { play, home, levels, shop, gift, how, pause, close, toast, state: S, save, refresh };
})();

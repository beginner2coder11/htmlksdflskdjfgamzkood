/* HEX STACKS — title, HUD (goal bar), boosters, win / board-full sheets, level grid, shop, daily gift */
window.UI = (() => {
  const C = window.GAME_CONFIG, P = C.storagePrefix, N = C.levels.count;
  const $ = s => document.querySelector(s);
  const wrap = $("#wrap"), sheet = $("#sheet");
  const fresh = () => ({ level: 1, coins: 0, boost: { hammer: C.boosters.hammer.start, swap: C.boosters.swap.start }, board: C.boards[0].id, boards: [C.boards[0].id], daily: { last: "", streak: 0 }, wins: 0, howSeen: false });
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
    for (const k of ["hammer", "swap"]) { const e = $("#n-" + k); e.textContent = S.boost[k] || "+"; e.classList.toggle("plus", !S.boost[k]); }
  }
  function addCoins(n) { S.coins += n; save(); refresh(); }
  Game.on.score = (sc, target) => { $("#g-score").textContent = Math.min(sc, target); $("#g-target").textContent = target; $("#g-fill").style.width = Math.min(100, sc / target * 100) + "%"; $("#goal").classList.toggle("full", sc >= target); };

  /* ---------- play ---------- */
  function play(n) {
    close(); cur = Math.max(1, Math.min(N, n)); revived = false;
    at("play"); Game.setHammer(false); hammerUi(false);
    Game.start(cur);
    $("#h-lvl-n").textContent = "Level " + cur; $("#h-hard").hidden = !Rules.isHard(cur);
    refresh();
    if (Rules.isHard(cur)) toast("HARD LEVEL · double coins!");
    if (cur === 1 && !S.howSeen) { S.howSeen = true; save(); setTimeout(how, 400); }
  }
  function home() { close(); at("title"); Game.attract(); refresh(); }

  Game.on.win = l => {
    const reward = l.hard ? C.coins.hard : C.coins.win;
    S.coins += reward; S.wins++; if (l.n >= S.level) S.level = l.n + 1; save(); refresh();
    const last = l.n >= N; let doubled = false;
    setTimeout(() => {
      if (Game.level !== l || Game.mode !== "won" || document.body.dataset.at !== "play") return;   // player already moved on
      open(`<div class="banner">${last ? "ALL CLEAR!" : "LEVEL " + l.n + " DONE!"}</div>
        <div class="big-ico">🍯</div>
        <p class="sub">${last ? "You finished every level. Replay any level from the list." : "Target reached. Sweet sorting!"}</p>
        <div class="reward"><i class="coin"></i><span id="w-c">+${reward}</span></div>
        <div class="stack"><button class="btn blue" id="w-dbl">Collect ×2 <span class="ad">AD</span></button>
        <button class="btn green" id="w-next">${last ? "Level list" : "Next level"}</button></div>`, false);
      $("#w-dbl").onclick = async () => { if (doubled) return; const b = $("#w-dbl"); b.disabled = true; if (await Ads.showRewarded()) { doubled = true; addCoins(reward); $("#w-c").textContent = "+" + reward * 2; Sound.play("coin"); } else b.disabled = false; };
      $("#w-next").onclick = async () => { Sound.play("tap"); close(); if (C.ads.interstitialEvery > 0 && S.wins % C.ads.interstitialEvery === 0) await Ads.showInterstitial(); last ? levels() : play(l.n + 1); };
    }, 1100);
  };
  Game.on.lose = (l, score) => {
    const price = 150;
    open(`<div class="banner lose">BOARD FULL!</div>
      <div class="big-ico">🧱</div>
      <p class="sub">${score} of ${l.target} tiles cleared. Smash the 4 messiest stacks and keep going?</p>
      <div class="stack">${revived ? "" : `<button class="btn blue" id="l-ad">Clear 4 stacks <span class="ad">AD</span></button>
      <button class="btn white" id="l-coin" ${S.coins < price ? "disabled" : ""}>Clear 4 stacks · ${coin(price)}</button>`}
      <button class="btn" id="l-retry">Try again</button></div>`, false);
    const rv = () => { revived = true; close(); Game.reviveClear(4); };
    if (!revived) {
      $("#l-ad").onclick = async () => { const b = $("#l-ad"); b.disabled = true; if (await Ads.showRewarded()) rv(); else b.disabled = false; };
      $("#l-coin").onclick = () => { if (S.coins < price) return; S.coins -= price; save(); refresh(); Sound.play("buy"); rv(); };
    }
    $("#l-retry").onclick = () => { Sound.play("tap"); play(cur); };
  };
  Game.on.hammerUsed = () => { S.boost.hammer = Math.max(0, S.boost.hammer - 1); save(); refresh(); hammerUi(false); };

  /* ---------- boosters ---------- */
  function hammerUi(v) { $("#b-hammer").classList.toggle("on", v); $("#hammer-tip").hidden = !v; }
  $("#b-restart").onclick = () => { if (Game.mode !== "play") return; Sound.play("tap"); play(cur); };
  $("#b-hammer").onclick = () => {
    if (Game.mode !== "play") return; Sound.play("tap");
    if (Game.hammer) { Game.setHammer(false); hammerUi(false); return; }
    if (!S.boost.hammer) return buyBooster("hammer");
    Game.setHammer(true); hammerUi(true);
  };
  $("#b-swap").onclick = () => {
    if (Game.mode !== "play" || Game.busy()) return; Sound.play("tap");
    if (!S.boost.swap) return buyBooster("swap");
    if (Game.swapTray()) { S.boost.swap--; save(); refresh(); }
  };
  function buyBooster(k) {
    const b = C.boosters[k];
    Game.pause(true);
    open(`<h2>${b.name}</h2><div class="big-ico">${k === "hammer" ? "🔨" : "🔄"}</div>
      <p class="sub">${k === "hammer" ? "Smash any stack off the board." : "Swap the tray for 3 new stacks."}</p>
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
      h += `<button class="lv ${done ? "done" : curL ? "cur" : "lock"} ${Rules.isHard(i) ? "h" : ""}" data-n="${i}" ${lock ? "disabled" : ""}>${lock ? "🔒" : i}</button>`;
    }
    open(`<h2>Levels</h2><p class="sub">${Math.min(S.level - 1, N)} of ${N} cleared</p><div class="grid">${h}</div>`);
    sheet.querySelectorAll(".lv:not(.lock)").forEach(b => b.onclick = () => { Sound.play("tap"); play(+b.dataset.n); });
    const c = sheet.querySelector(".lv.cur"); if (c) c.scrollIntoView({ block: "center" });
  }

  /* ---------- shop ---------- */
  function shop(tab = "boards") {
    Sound.play("tap");
    let body = "";
    if (tab === "boards") body = `<div class="items">${C.boards.map(b => { const own = S.boards.includes(b.id), on = S.board === b.id;
      return `<button class="item ${on ? "on" : ""}" data-b="${b.id}"><div class="sw" style="background:linear-gradient(135deg, ${b.bg[0]}, ${b.bg[1]})"><i style="position:absolute;left:32%;top:20%;width:36%;height:60%;clip-path:polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%);background:${b.board}"></i><i style="position:absolute;left:41%;top:34%;width:18%;height:32%;clip-path:polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%);background:${b.slot}"></i></div>${b.name}${on ? "<small>In use</small>" : own ? "<small>Owned</small>" : coin(b.price)}</button>`; }).join("")}</div>`;
    if (tab === "boost") body = `<div class="bst">${Object.entries(C.boosters).map(([k, b]) => `<div class="item"><span>${k === "hammer" ? "🔨" : "🔄"} ${b.name}<br><small>You have ${S.boost[k]}</small></span><button class="btn small" data-k="${k}" ${S.coins < b.price ? "disabled" : ""}>3 for ${b.price}</button></div>`).join("")}</div>`;
    open(`<h2>Shop</h2><div class="tabs" style="grid-template-columns:1fr 1fr"><button data-t="boards" class="${tab === "boards" ? "on" : ""}">Boards</button><button data-t="boost" class="${tab === "boost" ? "on" : ""}">Boosters</button></div>${body}`);
    sheet.querySelectorAll("[data-t]").forEach(b => b.onclick = () => shop(b.dataset.t));
    sheet.querySelectorAll("[data-b]").forEach(b => b.onclick = () => {
      const id = b.dataset.b, it = C.boards.find(x => x.id === id);
      if (!S.boards.includes(id)) { if (S.coins < it.price) return toast(`Need ${it.price - S.coins} more coins`); S.coins -= it.price; S.boards.push(id); Sound.play("buy"); } else Sound.play("tap");
      S.board = id; save(); refresh(); Game.setBoard(id); shop("boards");
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
      <div><b>1</b>Drag a stack from the tray onto an empty hex (or tap the stack, then tap a hex).</div>
      <div><b>2</b>Next to a stack with the same top colour, the tiles flip across and merge.</div>
      <div><b>3</b>${C.clearAt} tiles of one colour on top pop! Uncovered colours can merge again for combos.</div>
      <div><b>4</b>Reach the target before the board fills. Locked hexes open as your score grows.</div>
    </div><div class="stack"><button class="btn green" data-close>Let's sort!</button></div>`);
  }

  /* ---------- title ---------- */
  $("#tagline").textContent = C.tagline;
  $("#t-play").onclick = () => { Sound.unlock(); Sound.play("tap"); play(Math.min(S.level, N)); };
  $("#t-levels").onclick = () => { Sound.unlock(); levels(); };
  $("#t-shop").onclick = () => { Sound.unlock(); shop(); };
  $("#t-how").onclick = () => { Sound.unlock(); how(); };
  $("#t-gift").onclick = gift;
  wrap.addEventListener("pointerdown", e => { if (e.target === wrap && sheet.querySelector("[data-close]")) close(); });

  Game.setBoard(S.board);
  home();
  return { play, home, levels, shop, gift, how, pause, close, toast, state: S, save, refresh };
})();

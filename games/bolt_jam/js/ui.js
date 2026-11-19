/* BOLT JAM — title, HUD, boosters, win / out-of-space sheets, level grid, shop, daily gift, settings */
window.UI = (() => {
  const C = window.GAME_CONFIG, P = C.storagePrefix, N = C.levels.count;
  const $ = s => document.querySelector(s);
  const wrap = $("#wrap"), sheet = $("#sheet");
  const fresh = () => ({ level: 1, coins: 0, boost: { hole: C.boosters.hole.start, drill: C.boosters.drill.start }, board: C.boards[0].id, head: C.heads[0].id, boards: [C.boards[0].id], heads: [C.heads[0].id], daily: { last: "", streak: 0 }, wins: 0, howSeen: false });
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
    const nh = $("#n-hole"), nd = $("#n-drill");
    nh.textContent = S.boost.hole || "+"; nh.classList.toggle("plus", !S.boost.hole);
    nd.textContent = S.boost.drill || "+"; nd.classList.toggle("plus", !S.boost.drill);
  }
  function addCoins(n) { S.coins += n; save(); refresh(); }

  /* ---------- play ---------- */
  function play(n) {
    close(); cur = Math.max(1, Math.min(N, n)); revived = false;
    at("play"); Game.setDrill(false); drillUi(false);
    Game.start(cur);
    $("#h-lvl-n").textContent = "Level " + cur; $("#h-hard").hidden = !Levels.isHard(cur);
    refresh();
    if (Levels.isHard(cur)) toast("HARD LEVEL · double coins!");
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
        <div class="big-ico">🧰</div>
        <p class="sub">${last ? "You finished every level. Replay any level from the list." : "Every plate dropped. Nice sorting!"}</p>
        <div class="reward"><i class="coin"></i><span id="w-c">+${reward}</span></div>
        <div class="stack"><button class="btn blue" id="w-dbl">Collect ×2 <span class="ad">AD</span></button>
        <button class="btn green" id="w-next">${last ? "Level list" : "Next level"}</button></div>`, false);
      $("#w-dbl").onclick = async () => { if (doubled) return; const b = $("#w-dbl"); b.disabled = true; if (await Ads.showRewarded()) { doubled = true; addCoins(reward); $("#w-c").textContent = "+" + reward * 2; Sound.play("coin"); } else b.disabled = false; };
      $("#w-next").onclick = async () => { Sound.play("tap"); close(); if (C.ads.interstitialEvery > 0 && S.wins % C.ads.interstitialEvery === 0) await Ads.showInterstitial(); last ? levels() : play(l.n + 1); };
    }, 900);
  };
  Game.on.lose = l => {
    const price = C.boosters.hole.price;
    open(`<div class="banner lose">OUT OF SPACE</div>
      <div class="big-ico">🔩</div>
      <p class="sub">Every spare hole is full and no screw fits an open box.</p>
      <div class="stack">${revived ? "" : `<button class="btn blue" id="l-ad">+1 Spare Hole <span class="ad">AD</span></button>
      <button class="btn white" id="l-coin" ${S.coins < price ? "disabled" : ""}>+1 Spare Hole · ${coin(price)}</button>`}
      <button class="btn" id="l-retry">Try again</button></div>`, false);
    const rv = () => { revived = true; close(); Game.revive(); };
    if (!revived) {
      $("#l-ad").onclick = async () => { const b = $("#l-ad"); b.disabled = true; if (await Ads.showRewarded()) rv(); else b.disabled = false; };
      $("#l-coin").onclick = () => { if (S.coins < price) return; S.coins -= price; save(); refresh(); Sound.play("buy"); rv(); };
    }
    $("#l-retry").onclick = () => { Sound.play("tap"); play(cur); };
  };
  Game.on.drillUsed = () => { S.boost.drill = Math.max(0, S.boost.drill - 1); save(); refresh(); drillUi(false); };

  /* ---------- boosters ---------- */
  function drillUi(v) { $("#b-drill").classList.toggle("on", v); $("#drill-tip").hidden = !v; }
  $("#b-restart").onclick = () => { if (Game.mode !== "play") return; Sound.play("tap"); play(cur); };
  $("#b-hole").onclick = () => {
    if (Game.mode !== "play") return; Sound.play("tap");
    if (Game.extra >= C.maxExtraHoles) return toast("Extra hole already added");
    if (!S.boost.hole) return buyBooster("hole");
    if (Game.addHole()) { S.boost.hole--; save(); refresh(); }
  };
  $("#b-drill").onclick = () => {
    if (Game.mode !== "play") return; Sound.play("tap");
    if (Game.drill) { Game.setDrill(false); drillUi(false); return; }
    if (!S.boost.drill) return buyBooster("drill");
    Game.setDrill(true); drillUi(true);
  };
  function buyBooster(k) {
    const b = C.boosters[k];
    Game.pause(true);
    open(`<h2>${b.name}</h2><div class="big-ico">${k === "hole" ? "🕳️" : "🪛"}</div>
      <p class="sub">${k === "hole" ? "Adds one more spare hole for this level." : "Pulls out ANY screw, even one under another plate."}</p>
      <div class="stack"><button class="btn blue" id="bb-ad">Get 1 free <span class="ad">AD</span></button>
      <button class="btn white" id="bb-coin" ${S.coins < b.price ? "disabled" : ""}>Buy 3 · ${coin(b.price)}</button></div>`);
    $("#bb-ad").onclick = async () => { const x = $("#bb-ad"); x.disabled = true; if (await Ads.showRewarded()) { S.boost[k]++; save(); refresh(); toast("+1 " + b.name); close(); } else x.disabled = false; };
    $("#bb-coin").onclick = () => { if (S.coins < b.price) return; S.coins -= b.price; S.boost[k] += 3; save(); refresh(); Sound.play("buy"); toast("+3 " + b.name); close(); };
  }

  /* ---------- pause / settings ---------- */
  function toggles() {
    return `<div class="toggles"><button class="tg ${Sound.sfx ? "on" : ""}" id="tg-sfx">Sound effects<i></i></button><button class="tg ${Sound.music ? "on" : ""}" id="tg-mus">Music<i></i></button></div>`;
  }
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
      h += `<button class="lv ${done ? "done" : curL ? "cur" : "lock"} ${Levels.isHard(i) ? "h" : ""}" data-n="${i}" ${lock ? "disabled" : ""}>${lock ? "🔒" : i}</button>`;
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
      return `<button class="item ${on ? "on" : ""}" data-b="${b.id}"><div class="sw" style="background:radial-gradient(circle at 50% 55%, ${b.board[0]} 0 38%, transparent 39%), linear-gradient(${b.bg[0]}, ${b.bg[1]})"></div>${b.name}${on ? "<small>In use</small>" : own ? "<small>Owned</small>" : coin(b.price)}</button>`; }).join("")}</div>`;
    if (tab === "heads") body = `<div class="items" id="heads">${C.heads.map(h => { const own = S.heads.includes(h.id), on = S.head === h.id;
      return `<button class="item ${on ? "on" : ""}" data-h="${h.id}"><span class="cv"></span>${h.name}${on ? "<small>In use</small>" : own ? "<small>Owned</small>" : coin(h.price)}</button>`; }).join("")}</div>`;
    if (tab === "boost") body = `<div class="bst">${Object.entries(C.boosters).map(([k, b]) => `<div class="item"><span>${k === "hole" ? "🕳️" : "🪛"} ${b.name}<br><small>You have ${S.boost[k]}</small></span><button class="btn small" data-k="${k}" ${S.coins < b.price ? "disabled" : ""}>3 for ${b.price}</button></div>`).join("")}</div>`;
    open(`<h2>Shop</h2><div class="tabs"><button data-t="boards" class="${tab === "boards" ? "on" : ""}">Boards</button><button data-t="heads" class="${tab === "heads" ? "on" : ""}">Screws</button><button data-t="boost" class="${tab === "boost" ? "on" : ""}">Boosters</button></div>${body}`);
    sheet.querySelectorAll("[data-t]").forEach(b => b.onclick = () => shop(b.dataset.t));
    sheet.querySelectorAll("[data-h] .cv").forEach(sp => { const id = sp.parentElement.dataset.h, cv = Game.headPreview(id, 150, 70); cv.style.width = "100%"; cv.style.height = "70px"; sp.replaceWith(cv); });
    const buy = (list, owned, key, id) => {
      const it = list.find(x => x.id === id);
      if (!S[owned].includes(id)) { if (S.coins < it.price) return toast(`Need ${it.price - S.coins} more coins`); S.coins -= it.price; S[owned].push(id); Sound.play("buy"); }
      else Sound.play("tap");
      S[key] = id; save(); refresh(); Game.setLooks(S.board, S.head); shop(tab);
    };
    sheet.querySelectorAll("[data-b]").forEach(b => b.onclick = () => buy(C.boards, "boards", "board", b.dataset.b));
    sheet.querySelectorAll("[data-h]").forEach(b => b.onclick = () => buy(C.heads, "heads", "head", b.dataset.h));
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
      <div><b>1</b>Tap a screw to unscrew it. It flies into the toolbox of the same colour.</div>
      <div><b>2</b>A box holds 3 screws, then it closes and the next box slides in.</div>
      <div><b>3</b>Screws with no matching box wait in the spare holes. Fill them all and you're out of space!</div>
      <div><b>4</b>Screws under another plate are stuck. Free the plates on top first. A plate swings on its last screw and drops when it's free.</div>
    </div><div class="stack"><button class="btn green" data-close>Got it!</button></div>`);
  }

  /* ---------- title ---------- */
  $("#tagline").textContent = C.tagline;
  $("#t-play").onclick = () => { Sound.unlock(); Sound.play("tap"); play(Math.min(S.level, N)); };
  $("#t-levels").onclick = () => { Sound.unlock(); levels(); };
  $("#t-shop").onclick = () => { Sound.unlock(); shop(); };
  $("#t-how").onclick = () => { Sound.unlock(); how(); };
  $("#t-gift").onclick = gift;
  wrap.addEventListener("pointerdown", e => { if (e.target === wrap && sheet.querySelector("[data-close]")) close(); });

  Game.setLooks(S.board, S.head);
  home();
  return { play, home, levels, shop, gift, how, pause, close, toast, state: S, save, refresh };
})();

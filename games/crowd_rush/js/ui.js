/* CROWD RUSH — title (upgrades), HUD (distance bar), win (multiplier) / lose sheets, level grid, shop, daily gift */
window.UI = (() => {
  const C = window.GAME_CONFIG, P = C.storagePrefix, N = C.levels.count;
  const $ = s => document.querySelector(s);
  const wrap = $("#wrap"), sheet = $("#sheet");
  const fresh = () => ({ level: 1, coins: 0, stars: {}, up: { start: 0, income: 0 }, skin: C.skins[0].id, skins: [C.skins[0].id], daily: { last: "", streak: 0 }, wins: 0, howSeen: false });
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
    for (const k of ["start", "income"]) {
      const U = C.upgrades[k], lv = S.up[k], max = lv >= U.max, cost = upCost(k), el = $("#u-" + k);
      $("#u-" + k + "-v").textContent = k === "start" ? 1 + lv * U.per : "×" + (1 + lv * U.per).toFixed(1);
      $("#u-" + k + "-c").innerHTML = max ? "MAX" : `<i class="coin"></i>${cost}`;
      el.classList.toggle("cant", !max && S.coins < cost); el.classList.toggle("max", max);
    }
  }
  function addCoins(n) { S.coins += n; save(); refresh(); }
  const upCost = k => { const U = C.upgrades[k]; return Math.round(U.cost[0] * U.cost[1] ** S.up[k] / 5) * 5; };
  for (const k of ["start", "income"]) $("#u-" + k).onclick = () => {
    Sound.unlock(); const U = C.upgrades[k], cost = upCost(k);
    if (S.up[k] >= U.max) return toast("Maxed out!");
    if (S.coins < cost) return toast(`Need ${cost - S.coins} more coins`);
    S.coins -= cost; S.up[k]++; save(); refresh(); Sound.play("buy");
  };
  setInterval(() => { if (document.body.dataset.at === "play") $("#g-fill").style.width = (Game.progress * 100) + "%"; }, 120);
  $("#g-end").textContent = "🏁";

  /* ---------- play ---------- */
  function play(n) {
    close(); cur = Math.max(1, Math.min(N, n)); revived = false;
    at("play");
    Game.start(cur, 1 + S.up.start * C.upgrades.start.per); $("#g-end").textContent = Levels.isBoss(cur) ? "👹" : "🏁";
    $("#h-lvl-n").textContent = "Level " + cur; $("#h-hard").hidden = !Levels.isBoss(cur); $("#h-hard").textContent = "BOSS";
    refresh();
    if (cur === 1 && !S.howSeen) { S.howSeen = true; save(); setTimeout(how, 400); }
  }
  function home() { close(); at("title"); Game.attract(); refresh(); }

  Game.on.win = (l, left, mult) => {
    const lv = l.n, inc = 1 + S.up.income * C.upgrades.income.per;
    const reward = Math.round((C.coins.base + left * C.coins.perRunner) * mult * inc);
    const stars = l.boss ? 3 : mult >= 3 ? 3 : mult >= 1.6 ? 2 : 1;
    S.coins += reward; S.wins++; S.stars[lv] = Math.max(S.stars[lv] || 0, stars); if (lv >= S.level) S.level = lv + 1; save(); refresh();
    const last = lv >= N; let doubled = false;
    setTimeout(() => {
      if (Game.level !== l || Game.mode !== "won" || document.body.dataset.at !== "play") return;   // player already moved on
      open(`<div class="banner">${l.boss ? "BOSS DOWN!" : last ? "ALL CLEAR!" : "LEVEL " + lv + " CLEAR!"}</div>
        <div class="stars"><i class="${stars >= 1 ? "on" : ""}">★</i><i class="${stars >= 2 ? "on" : ""}">★</i><i class="${stars >= 3 ? "on" : ""}">★</i></div>
        <p class="sub">${l.boss ? "Your crowd took down the giant!" : `Climbed to <b>×${mult}</b> with ${left} runners left`}</p>
        <div class="reward"><i class="coin"></i><span id="w-c">+${reward}</span></div>
        <div class="stack"><button class="btn blue" id="w-dbl">Collect ×3 <span class="ad">AD</span></button>
        <button class="btn green" id="w-next">${last ? "Level list" : "Next level"}</button></div>`, false);
      $("#w-dbl").onclick = async () => { if (doubled) return; const b = $("#w-dbl"); b.disabled = true; if (await Ads.showRewarded()) { doubled = true; addCoins(reward * 2); $("#w-c").textContent = "+" + reward * 3; Sound.play("coin"); } else b.disabled = false; };
      $("#w-next").onclick = async () => { Sound.play("tap"); close(); if (C.ads.interstitialEvery > 0 && S.wins % C.ads.interstitialEvery === 0) await Ads.showInterstitial(); last ? levels() : play(lv + 1); };
    }, 700);
  };
  Game.on.lose = (l, why) => {
    const T = { enemy: ["OUTNUMBERED!", "😵", "The red crowd was bigger. Pick gates that grow your crowd first."], boss: ["THE BOSS WON", "👹", "Not enough runners to take down the giant. Go for ×2 and ×3 gates!"], obstacle: ["WIPED OUT!", "💥", "Steer around the saws and through the gaps in the walls."], gate: ["NO ONE LEFT!", "🚪", "That gate took everyone. Watch for − and ÷ gates."] }[why] || ["TRY AGAIN", "🔄", ""];
    let revived = false;
    open(`<div class="banner lose">${T[0]}</div>
      <div class="big-ico">${T[1]}</div>
      <p class="sub">${T[2]}</p>
      <div class="stack"><button class="btn blue" id="l-ad">+15 runners, keep going <span class="ad">AD</span></button>
      <button class="btn green" id="l-retry">Try again</button></div>`, false);
    $("#l-ad").onclick = async () => { if (revived) return; const b = $("#l-ad"); b.disabled = true; if (await Ads.showRewarded()) { revived = true; close(); Game.revive(15); } else b.disabled = false; };
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
      return `<button class="item ${on ? "on" : ""}" data-s="${k.id}"><div class="sw" style="background:linear-gradient(#cdeeff,#9fd6ff);display:flex;align-items:flex-end;justify-content:center;gap:4px;padding-bottom:8px">${[0, 1, 2].map(i => `<i style="width:16px;height:${30 + (i % 2) * 6}px;border-radius:8px 8px 6px 6px;background:linear-gradient(90deg,${k.body},${k.shade});position:relative;box-shadow:0 -14px 0 -3px ${k.hat || k.body}"></i>`).join("")}</div>${k.name}${on ? "<small>In use</small>" : own ? "<small>Owned</small>" : coin(k.price)}</button>`; }).join("")}</div>`;
    open(`<h2>Crowd colours</h2>${body}`);
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
      <div><b>1</b>Drag left and right to steer your crowd.</div>
      <div><b>2</b>Run through blue gates (+, ×) to grow the crowd; red gates (−, ÷) shrink it.</div>
      <div><b>3</b>Red crowds fight yours one-for-one. Be bigger! Dodge saws, sweepers and walls.</div>
      <div><b>4</b>At the end, climb the multiplier stairs or take down the giant boss for big coins.</div>
    </div><div class="stack"><button class="btn green" data-close>Let's run!</button></div>`);
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

/* SLICE RUSH — title (mode cards with best scores, current goal), HUD (score, timer, lives, power-fruit pills),
   revive offer, results, pause + settings, goals list, shop (blades + backgrounds), daily gift, how to play. */
window.UI = (() => {
  const C = window.GAME_CONFIG, P = C.storagePrefix, MD = C.modes, GL = C.goals;
  const $ = s => document.querySelector(s);
  const wrap = $("#wrap"), sheet = $("#sheet");
  const fresh = () => ({ coins: 0, best: {}, plays: {}, total: 0, goal: 0, goalProg: 0, blade: C.blades[0].id, blades: [C.blades[0].id], bg: C.backgrounds[0].id, bgs: [C.backgrounds[0].id], daily: { last: "", streak: 0 }, runs: 0, howSeen: false, shopTab: "blades" });
  let S = fresh();
  try { S = Object.assign(fresh(), JSON.parse(localStorage.getItem(P + "save") || "{}")); } catch (e) {}
  const save = () => { try { localStorage.setItem(P + "save", JSON.stringify(S)); } catch (e) {} };
  let cur = "classic";

  /* ---------- helpers ---------- */
  const at = s => { document.body.dataset.at = s; };
  function open(html, x = true) { sheet.innerHTML = (x ? `<button class="x" data-close aria-label="Close">✕</button>` : "") + html; wrap.hidden = false; sheet.querySelectorAll("[data-close]").forEach(b => b.onclick = () => { Sound.play("tap"); close(); }); }
  function close() { wrap.hidden = true; sheet.innerHTML = ""; if (document.body.dataset.at === "play" && Game.paused && Game.mode === "play") Game.pause(false); }
  let toastT = 0;
  function toast(s) { const t = $("#toast"); t.textContent = s; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 1900); }
  const coin = n => `<span class="price"><i class="coin"></i>${n}</span>`;
  const key = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  const today = () => key(new Date());
  function refresh() {
    document.querySelectorAll("[data-coins]").forEach(e => e.textContent = S.coins);
    $("#b-gift").hidden = !giftReady();
    $("#modes").querySelectorAll(".mode").forEach(b => b.querySelector("small").textContent = "Best " + (S.best[b.dataset.m] || 0));
    goalCard();
  }
  function addCoins(n) { S.coins += n; save(); refresh(); }

  /* ---------- goals ---------- */
  const goalText = g => g.type === "score" ? `Score ${g.n} in ${MD[g.mode].name}` : g.type === "play" ? `Play ${MD[g.mode].name} ${g.n} time${g.n > 1 ? "s" : ""}` : g.type === "combo" ? `Get ${g.n} combos in one game` : g.type === "swipe" ? `Slice ${g.n} fruits in one swipe` : g.type === "total" ? `Slice ${g.n} fruits in total` : `Slice ${g.n} power fruits`;
  function goalCard() {
    const g = GL[S.goal], card = $("#t-goal");
    if (!g) { $("#gc-n").textContent = "✓"; $("#gc-text").textContent = "All goals cleared!"; $("#gc-fill").style.width = "100%"; $("#gc-rew").hidden = true; card.classList.remove("ready"); return; }
    $("#gc-n").textContent = S.goal + 1; $("#gc-text").textContent = goalText(g); $("#gc-rew").innerHTML = `<i class="coin"></i>${g.reward}`; $("#gc-rew").hidden = false;
    $("#gc-fill").style.width = Math.min(100, S.goalProg / g.n * 100) + "%"; card.classList.toggle("ready", S.goalProg >= g.n);
  }
  function checkGoals(r) {
    const cleared = [];
    for (let k = 0; k < 3; k++) {
      const g = GL[S.goal]; if (!g) break;
      let p = S.goalProg;
      if (g.type === "score" && r.mode === g.mode) p = Math.max(p, r.score);
      if (g.type === "play" && r.mode === g.mode) p += k === 0 ? 1 : 0;
      if (g.type === "combo") p = Math.max(p, r.combos);
      if (g.type === "swipe") p = Math.max(p, r.bestSwipe);
      if (g.type === "total") p = S.total;
      if (g.type === "special") p += k === 0 ? r.specials : 0;
      S.goalProg = p;
      if (p >= g.n) { cleared.push(g); S.coins += g.reward; S.goal++; S.goalProg = 0; if (GL[S.goal] && GL[S.goal].type === "total") S.goalProg = S.total; } else break;
    }
    return cleared;
  }

  /* ---------- HUD ---------- */
  setInterval(() => {
    if (document.body.dataset.at !== "play" || !Game.run) return;
    const r = Game.run; $("#h-score").textContent = r.score;
    const t = Math.ceil(r.time), tm = $("#h-time"); tm.hidden = r.mode === "classic"; tm.textContent = Math.floor(t / 60) + ":" + String(t % 60).padStart(2, "0"); tm.classList.toggle("low", t <= 10 && r.mode !== "classic");
    const lv = $("#h-lives"); lv.hidden = r.mode !== "classic"; [...lv.children].forEach((i, k) => i.classList.toggle("lost", k < MD.classic.lives - r.lives));
    const fx = Game.fx; $("#h-fx").innerHTML = Object.keys(C.specials).filter(k => fx[k] > 0).map(k => `<span style="background:${C.specials[k].color}">${C.specials[k].name} ${Math.ceil(fx[k])}</span>`).join("");
  }, 100);

  /* ---------- play ---------- */
  function play(m) {
    close(); cur = m; at("play"); Game.start(m);
    $("#h-best").textContent = "Best " + (S.best[m] || 0);
    toast(MD[m].about);
    if (!S.howSeen) { S.howSeen = true; save(); setTimeout(() => { Game.pause(true); how(true); }, 300); }
  }
  function home() { close(); Game.pause(false); at("title"); Game.attract(); refresh(); }
  Game.on.end = r => {
    if (r.canRevive && r.score > 0) return reviveOffer(r);
    results(r);
  };
  function reviveOffer(r) {
    let left = 5, done = false;
    open(`<h2>Keep going?</h2><p class="sub">${r.ending === "bomb" ? "Boom! That was a bomb." : "Three fruits dropped."} Score: <b>${r.score}</b></p>
      <div class="revive-ring" id="rv-ring"><b id="rv-n">5</b></div>
      <div class="stack"><button class="btn blue" id="rv-ad">Continue <span class="ad">AD</span></button><button class="btn white" id="rv-no">No thanks</button></div>`, false);
    const tick = setInterval(() => { left -= 0.1; const ring = $("#rv-ring"); if (!ring) return clearInterval(tick); ring.style.setProperty("--p", Math.max(0, left / 5 * 100) + "%"); $("#rv-n").textContent = Math.ceil(Math.max(0, left)); if (left <= 0 && !done) { done = true; clearInterval(tick); close(); results(r); } }, 100);
    $("#rv-ad").onclick = async () => { if (done) return; done = true; clearInterval(tick); const b = $("#rv-ad"); b.disabled = true; if (await Ads.showRewarded()) { close(); Game.revive(); } else { close(); results(r); } };
    $("#rv-no").onclick = () => { if (done) return; done = true; clearInterval(tick); Sound.play("tap"); close(); results(r); };
  }
  function results(r) {
    const m = r.mode, best = S.best[m] || 0, isBest = r.score > best;
    if (isBest) S.best[m] = r.score;
    S.plays[m] = (S.plays[m] || 0) + 1; S.total += r.sliced; S.runs++;
    const coins = Math.round(r.score * C.coins.perPoint), cleared = checkGoals(r);
    S.coins += coins; save(); refresh();
    Sound.play(isBest ? "best" : "over");
    let doubled = false;
    open(`<div class="banner ${isBest ? "" : "lose"}">${isBest ? "NEW BEST!" : r.ending === "bomb" ? "BOOM!" : r.ending === "time" ? "TIME'S UP!" : "GAME OVER"}</div>
      <p class="sub">${MD[m].name}</p><div class="big-score">${r.score}</div>${isBest ? "" : `<p class="sub">Best ${best}</p>`}
      <div class="res"><div>${r.sliced}<small>Fruits</small></div><div>${r.bestSwipe}<small>Best swipe</small></div><div>${r.combos}<small>Combos</small></div></div>
      ${cleared.map(g => `<p class="sub" style="color:var(--green-d)">🎯 Goal done: ${goalText(g)} +${g.reward}</p>`).join("")}
      <div class="reward"><i class="coin"></i><span id="w-c">+${coins}</span></div>
      <div class="stack"><button class="btn blue" id="w-dbl" ${coins ? "" : "disabled"}>Collect ×2 <span class="ad">AD</span></button>
      <div class="row2"><button class="btn white" id="w-home">Home</button><button class="btn green" id="w-again">Play again</button></div></div>`, false);
    $("#w-dbl").onclick = async () => { if (doubled) return; const b = $("#w-dbl"); b.disabled = true; if (await Ads.showRewarded()) { doubled = true; addCoins(coins); $("#w-c").textContent = "+" + coins * 2; Sound.play("coin"); } else b.disabled = false; };
    const after = async fn => { Sound.play("tap"); close(); if (C.ads.interstitialEvery > 0 && S.runs % C.ads.interstitialEvery === 0) await Ads.showInterstitial(); fn(); };
    $("#w-home").onclick = () => after(home);
    $("#w-again").onclick = () => after(() => play(m));
  }

  /* ---------- pause / settings ---------- */
  const toggles = () => `<div class="toggles"><button class="tg ${Sound.sfx ? "on" : ""}" id="tg-sfx">Sound effects<i></i></button><button class="tg ${Sound.music ? "on" : ""}" id="tg-mus">Music<i></i></button></div>`;
  function bindToggles() {
    $("#tg-sfx").onclick = e => { Sound.setSfx(!Sound.sfx); e.currentTarget.classList.toggle("on", Sound.sfx); Sound.play("tap"); };
    $("#tg-mus").onclick = e => { Sound.setMusic(!Sound.music); e.currentTarget.classList.toggle("on", Sound.music); };
  }
  function pause() {
    if (document.body.dataset.at !== "play" || Game.mode !== "play" || !wrap.hidden) return;
    Game.pause(true); Sound.play("tap");
    open(`<h2>Paused</h2>${toggles()}<div class="stack"><button class="btn green" id="p-go">Resume</button><div class="row2"><button class="btn white" id="p-re">Restart</button><button class="btn white" id="p-home">Home</button></div></div>`, false);
    bindToggles();
    $("#p-go").onclick = () => { Sound.play("tap"); close(); };
    $("#p-re").onclick = () => { Sound.play("tap"); Game.pause(false); play(cur); };
    $("#p-home").onclick = () => { Sound.play("tap"); home(); };
  }
  $("#h-pause").onclick = pause;
  $("#t-set").onclick = () => { Sound.unlock(); Sound.play("tap"); open(`<h2>Settings</h2>${toggles()}<div class="stack"><button class="btn white" id="s-how">How to play</button></div>`); bindToggles(); $("#s-how").onclick = () => how(); };
  addEventListener("keydown", e => { if (e.key === "Escape" || e.key === "p") pause(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden) pause(); });

  /* ---------- goals list ---------- */
  function goals() {
    Sound.play("tap");
    open(`<h2>Goals</h2><p class="sub">${Math.min(S.goal, GL.length)} of ${GL.length} cleared</p><div class="goals">${GL.map((g, i) => `<div class="gl ${i < S.goal ? "done" : i === S.goal ? "cur" : ""}"><i>${i < S.goal ? "✓" : i + 1}</i><span>${goalText(g)}${i === S.goal ? ` <small>(${Math.min(S.goalProg, g.n)}/${g.n})</small>` : ""}</span>${coin(g.reward)}</div>`).join("")}</div>`);
    const c = sheet.querySelector(".gl.cur"); if (c) c.scrollIntoView({ block: "center" });
  }

  /* ---------- shop ---------- */
  function shop() {
    Sound.play("tap");
    const tabs = `<div class="tabs"><button class="${S.shopTab === "blades" ? "on" : ""}" data-tab="blades">Blades</button><button class="${S.shopTab === "bgs" ? "on" : ""}" data-tab="bgs">Backgrounds</button></div>`;
    const list = S.shopTab === "blades" ? C.blades : C.backgrounds, own = S.shopTab === "blades" ? S.blades : S.bgs, sel = S.shopTab === "blades" ? S.blade : S.bg;
    open(`<h2>Shop</h2>${tabs}<div class="items">${list.map(it => `<button class="item ${sel === it.id ? "on" : ""}" data-s="${it.id}">${S.shopTab === "blades" ? `<canvas class="bl" width="240" height="140"></canvas>` : `<canvas class="bgp" width="240" height="140"></canvas>`}${it.name}${sel === it.id ? "<small>In use</small>" : own.includes(it.id) ? "<small>Owned</small>" : coin(it.price)}</button>`).join("")}</div>`);
    sheet.querySelectorAll("[data-tab]").forEach(b => b.onclick = () => { S.shopTab = b.dataset.tab; save(); shop(); });
    sheet.querySelectorAll(".item").forEach((b, i) => {
      const it = list[i], c = b.querySelector("canvas"), g = c.getContext("2d");
      if (S.shopTab === "blades") { g.fillStyle = "#2a1d14"; g.fillRect(0, 0, 240, 140); for (let pass = 0; pass < 2; pass++) for (let k = 1; k < 20; k++) { const x0 = 20 + (k - 1) * 10.5, x1 = 20 + k * 10.5, y0 = 110 - Math.sin((k - 1) / 19 * 2.4) * 80, y1 = 110 - Math.sin(k / 19 * 2.4) * 80; g.strokeStyle = pass ? it.a : it.b === "rainbow" ? `hsl(${k * 19},95%,60%)` : it.b; g.globalAlpha = pass ? 1 : 0.6; g.lineWidth = (pass ? 6 : 16) * k / 19; g.lineCap = "round"; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); } g.globalAlpha = 1; }
      else { const src = Game.bgPreview(it.id); g.drawImage(src, 0, 0, src.width, src.width * 140 / 240 > src.height ? src.height : src.width * 140 / 240, 0, 0, 240, 140); }
      b.onclick = () => {
        if (!own.includes(it.id)) { if (S.coins < it.price) return toast(`Need ${it.price - S.coins} more coins`); S.coins -= it.price; own.push(it.id); Sound.play("buy"); } else Sound.play("tap");
        if (S.shopTab === "blades") { S.blade = it.id; Game.setBlade(it.id); } else { S.bg = it.id; Game.setBg(it.id); }
        save(); refresh(); shop();
      };
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
  function how(inGame) {
    Sound.play("tap");
    open(`<h2>How to play</h2><div class="how">
      <div><b>1</b>Swipe across the fruit to slice it. Slice 3 or more in one swipe for a combo!</div>
      <div><b>2</b>Don't touch the bombs. In Classic a bomb ends the game; in Arcade it costs points.</div>
      <div><b>3</b>Classic: drop 3 fruits and it's over. Zen: 90 calm seconds, no bombs.</div>
      <div><b>4</b>Arcade: slice glowing power fruit for Freeze, Frenzy and Double points.</div>
    </div><div class="stack"><button class="btn green" id="how-go">Let's slice!</button></div>`, !inGame);
    $("#how-go").onclick = () => { Sound.play("tap"); close(); };
  }

  /* ---------- title ---------- */
  $("#tagline").textContent = C.tagline;
  const icons = { classic: C.fruits[0], arcade: null, zen: C.fruits[4] };
  $("#modes").innerHTML = Object.entries(MD).map(([id, m]) => `<button class="mode ${id}" data-m="${id}"><canvas width="128" height="128"></canvas><b>${m.name}</b><small>Best 0</small></button>`).join("");
  $("#modes").querySelectorAll(".mode").forEach(b => { const m = b.dataset.m; Game.drawFruitPreview(b.querySelector("canvas"), icons[m], m === "arcade" ? "frenzy" : null); b.onclick = () => { Sound.unlock(); Sound.play("tap"); play(m); }; });
  $("#t-goal").onclick = () => { Sound.unlock(); goals(); };
  $("#t-goals").onclick = () => { Sound.unlock(); goals(); };
  $("#t-shop").onclick = () => { Sound.unlock(); shop(); };
  $("#t-how").onclick = () => { Sound.unlock(); how(); };
  $("#t-gift").onclick = gift;
  wrap.addEventListener("pointerdown", e => { if (e.target === wrap && sheet.querySelector("[data-close]")) close(); });

  Game.setBlade(S.blade); Game.setBg(S.bg);
  home();
  return { play, home, goals, shop, gift, how, pause, close, toast, state: S, save, refresh };
})();

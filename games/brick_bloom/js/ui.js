/* BRICK BLOOM — screens, saves, shop, daily gift, modals. */
window.UI = (() => {
  const C = window.GAME_CONFIG, PAL = C.palette, $ = s => document.querySelector(s);
  const KEY = C.storagePrefix + "save";
  const def = { coins: 0, stars: {}, best: 0, owned: ["bar", "circle"], paddle: "bar", ball: "circle", sfx: true, music: true, finished: 0, daily: "", streak: 0 };
  let save = def;
  try { save = Object.assign({}, def, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) {}
  const store = () => { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) {} };
  const totalStars = () => Object.values(save.stars).reduce((a, b) => a + b, 0);
  const unlocked = () => Math.min(Game.totalLevels(), Object.keys(save.stars).length + 1);
  let revived = false, shopTab = "paddles";

  function show(name) { document.body.dataset.screen = name; refresh(); }
  function refresh() {
    document.querySelectorAll("[data-coins]").forEach(e => e.textContent = save.coins);
    $("#h-stars").textContent = totalStars(); $("#h-level").textContent = unlocked(); $("#h-best").textContent = save.best;
    $("#play-level").textContent = "Level " + unlocked(); $("#l-stars").textContent = totalStars();
    $("#daily-dot").hidden = save.daily === today();
  }
  const today = () => new Date().toISOString().slice(0, 10);
  function toast(t) { const e = document.createElement("div"); e.className = "toast"; e.textContent = t; document.body.appendChild(e); setTimeout(() => e.remove(), 1600); }

  function modal(html, cls = "") {
    const m = $("#modal"); m.innerHTML = `<div class="card ${cls}">${html}</div>`; m.hidden = false;
    return m.firstElementChild;
  }
  function close() { $("#modal").hidden = true; $("#modal").innerHTML = ""; }

  /* ---------- play ---------- */
  function play(n) {
    close();
    revived = false;
    Game.setSkin(C.paddles.find(p => p.id === save.paddle), C.balls.find(b => b.id === save.ball));
    show("game");
    Game.start(n);
    Sound.muffle(false);
  }

  Game.on("hud", () => {
    $("#hud-level").textContent = "LEVEL " + Game.level;
    $("#hud-score").textContent = Game.score;
    $("#hud-lives").innerHTML = "<i></i>".repeat(Math.max(0, Math.min(6, Game.lives)));
  });
  Game.on("powers", () => {
    const pw = Game.powers;
    $("#power-bar").innerHTML = Object.keys(pw).map(k => {
      const p = C.powers.find(q => q.id === k); if (!p) return "";
      return `<span class="pw"><i style="background:${PAL[p.color]}">${p.label}</i>${p.name}</span>`;
    }).join("");
  });
  Game.on("pauseKey", () => { if (document.body.dataset.screen === "game" && $("#modal").hidden) pause(); });

  Game.on("clear", r => {
    const prev = save.stars[r.level] || 0;
    save.stars[r.level] = Math.max(prev, r.stars);
    save.best = Math.max(save.best, r.score);
    save.coins += r.coins; save.finished++;
    store();
    const card = modal(`<h3>Level ${r.level} clear</h3>
      <div class="stars">${[0, 1, 2].map(i => `<i class="star ${i < r.stars ? "on" : ""}" style="animation-delay:${0.2 + i * 0.25}s"></i>`).join("")}</div>
      <div class="kv"><span>Score</span><b>${r.score}</b><span>Time</span><b>${r.time.toFixed(1)}s</b><span>Coins</span><b id="won-coins">+${r.coins}</b></div>
      <button class="btn yellow" id="m-double">▶ Double coins</button>
      <div class="btn-row"><button class="btn" id="m-home">Home</button><button class="btn red" id="m-next">Next</button></div>`, "win");
    for (let i = 0; i < r.stars; i++) setTimeout(() => Sound.sfx("star", i), 200 + i * 250);
    const next = () => {
      const go = () => r.level < Game.totalLevels() ? play(r.level + 1) : goHome();
      if (save.finished % C.ads.interstitialEvery === 0) Ads.showInterstitial().then(go); else go();
    };
    card.querySelector("#m-next").onclick = next;
    card.querySelector("#m-home").onclick = goHome;
    card.querySelector("#m-double").onclick = e => {
      e.target.disabled = true;
      Ads.showRewarded().then(ok => { if (!ok) return; save.coins += r.coins; store(); card.querySelector("#won-coins").textContent = "+" + r.coins * 2; Sound.sfx("coin"); });
    };
  });

  Game.on("lost", r => {
    save.best = Math.max(save.best, r.score); store();
    const card = modal(`<h3>Out of balls</h3><p>Level ${r.level} · ${r.score} pts</p>
      ${revived ? "" : `<button class="btn green" id="m-revive">▶ Extra ball</button>`}
      <div class="btn-row"><button class="btn" id="m-home">Home</button><button class="btn red" id="m-retry">Retry</button></div>`, "lose");
    card.querySelector("#m-home").onclick = goHome;
    card.querySelector("#m-retry").onclick = () => play(r.level);
    const rv = card.querySelector("#m-revive");
    if (rv) rv.onclick = () => Ads.showRewarded().then(ok => { if (ok) { revived = true; close(); Game.revive(); } });
  });

  function pause() {
    Game.pause(); Sound.muffle(true);
    const card = modal(`<h3>Paused</h3>
      <button class="btn red" id="m-resume">Resume</button>
      <div class="btn-row"><button class="btn" id="m-restart">Restart</button><button class="btn" id="m-home">Home</button></div>`);
    card.querySelector("#m-resume").onclick = () => { close(); Game.resume(); Sound.muffle(false); };
    card.querySelector("#m-restart").onclick = () => play(Game.level);
    card.querySelector("#m-home").onclick = goHome;
  }
  function goHome() { close(); Game.quit(); Sound.muffle(false); show("home"); }

  /* ---------- levels ---------- */
  function levels() {
    const u = unlocked();
    $("#level-grid").innerHTML = Array.from({ length: Game.totalLevels() }, (_, i) => {
      const n = i + 1, s = save.stars[n] || 0, cls = n > u ? "lock" : n === u ? "cur" : "done";
      return `<button class="lv ${cls}" data-lv="${n}" ${n > u ? "disabled" : ""}>${n > u ? "▪" : n}<span class="st">${n < u || s ? "★".repeat(s) + "☆".repeat(3 - s) : ""}</span></button>`;
    }).join("");
    show("levels");
  }
  $("#level-grid").addEventListener("click", e => { const b = e.target.closest("[data-lv]"); if (b) { Sound.sfx("tap"); play(+b.dataset.lv); } });

  /* ---------- shop ---------- */
  function previewItem(c, item, kind) {
    const x = c.getContext("2d"); c.width = 280; c.height = 128; x.scale(2, 2);
    const fakeSkin = kind === "paddles" ? item : C.paddles[0];
    // reuse simple drawing here so the shop does not depend on game state
    x.lineWidth = 2.5; x.strokeStyle = PAL.ink;
    if (kind === "paddles") {
      x.fillStyle = PAL[fakeSkin.color] || PAL.ink; x.beginPath();
      if (item.shape === "pill") x.roundRect(30, 26, 80, 14, 7);
      else if (item.shape === "arch") { x.moveTo(30, 40); x.quadraticCurveTo(70, 14, 110, 40); x.closePath(); }
      else x.rect(30, 26, 80, 14);
      x.fill(); x.stroke();
      x.fillStyle = PAL.paper;
      if (item.shape === "notch") x.fillRect(64, 26, 12, 5);
      if (item.shape === "split") { x.fillStyle = PAL.yellow; x.fillRect(32, 28, 26, 10); x.fillStyle = PAL.red; x.fillRect(82, 28, 26, 10); }
      if (item.shape === "dots") for (let i = 38; i < 108; i += 9) { x.beginPath(); x.arc(i, 33, 2.2, 0, 7); x.fill(); }
    } else {
      x.fillStyle = PAL[item.color]; x.beginPath();
      if (item.shape === "square") x.rect(58, 20, 24, 24); else x.arc(70, 32, 12, 0, 7);
      x.fill(); x.stroke();
      if (item.shape === "ring") { x.fillStyle = PAL.paper; x.beginPath(); x.arc(70, 32, 5, 0, 7); x.fill(); }
      if (item.shape === "half") { x.fillStyle = PAL.ink; x.beginPath(); x.arc(70, 32, 12, Math.PI / 2, Math.PI * 1.5); x.fill(); }
    }
  }
  function shop() {
    document.querySelectorAll(".tab").forEach(t => t.classList.toggle("on", t.dataset.tab === shopTab));
    const list = shopTab === "paddles" ? C.paddles : C.balls, cur = shopTab === "paddles" ? save.paddle : save.ball;
    const g = $("#shop-grid");
    g.innerHTML = list.map(it => {
      const own = save.owned.includes(it.id);
      const lockStars = it.stars && totalStars() < it.stars;
      const label = it.id === cur ? "Equipped" : own ? "Equip" : it.stars ? (lockStars ? `★ ${it.stars}` : "Unlock") : `● ${it.price}`;
      return `<div class="item ${it.id === cur ? "on" : ""}"><canvas></canvas><b>${it.name}</b>
        <button class="btn ${own ? "" : "yellow"}" data-buy="${it.id}" ${it.id === cur || lockStars || (!own && !it.stars && save.coins < it.price) ? "disabled" : ""}>${label}</button></div>`;
    }).join("");
    g.querySelectorAll("canvas").forEach((c, i) => previewItem(c, list[i], shopTab));
    show("shop");
  }
  $("#shop-grid").addEventListener("click", e => {
    const b = e.target.closest("[data-buy]"); if (!b) return;
    const list = shopTab === "paddles" ? C.paddles : C.balls, it = list.find(i => i.id === b.dataset.buy);
    if (!save.owned.includes(it.id)) {
      if (it.price) { if (save.coins < it.price) return; save.coins -= it.price; }
      save.owned.push(it.id); Sound.sfx("coin");
    }
    if (shopTab === "paddles") save.paddle = it.id; else save.ball = it.id;
    store(); shop();
  });
  document.querySelectorAll(".tab").forEach(t => t.onclick = () => { shopTab = t.dataset.tab; Sound.sfx("tap"); shop(); });

  /* ---------- daily / settings ---------- */
  function daily() {
    if (save.daily === today()) { toast("Come back tomorrow!"); return; }
    const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    save.streak = save.daily === y ? save.streak % 7 + 1 : 1;
    const amt = 20 + save.streak * 15;
    const card = modal(`<h3>Daily gift</h3><p>Day ${save.streak} of 7</p>
      <div class="stars" style="height:auto">${Array.from({ length: 7 }, (_, i) => `<i class="coin" style="width:26px;height:26px;opacity:${i < save.streak ? 1 : .3}"></i>`).join("")}</div>
      <p style="font-size:28px">+${amt}</p>
      <div class="btn-row"><button class="btn" id="m-take">Take</button><button class="btn yellow" id="m-x2">▶ ×2</button></div>`, "win");
    const take = mult => { save.coins += amt * mult; save.daily = today(); store(); Sound.sfx("coin"); close(); refresh(); };
    card.querySelector("#m-take").onclick = () => take(1);
    card.querySelector("#m-x2").onclick = () => Ads.showRewarded().then(ok => take(ok ? 2 : 1));
  }
  function settings() {
    const card = modal(`<h3>Settings</h3>
      <button class="toggle ${save.sfx ? "on" : ""}" id="t-sfx">Sound <i></i></button>
      <button class="toggle ${save.music ? "on" : ""}" id="t-music">Music <i></i></button>
      <button class="btn" id="m-reset">Reset progress</button>
      <button class="btn red" id="m-close">Close</button>`);
    card.querySelector("#t-sfx").onclick = e => { save.sfx = !save.sfx; Sound.setSfx(save.sfx); e.currentTarget.classList.toggle("on", save.sfx); store(); };
    card.querySelector("#t-music").onclick = e => { save.music = !save.music; Sound.setMusic(save.music); e.currentTarget.classList.toggle("on", save.music); store(); };
    card.querySelector("#m-reset").onclick = e => {
      if (e.target.dataset.sure) { save = Object.assign({}, def, { owned: [...def.owned], stars: {} }); store(); close(); refresh(); toast("Progress reset"); }
      else { e.target.dataset.sure = 1; e.target.textContent = "Tap again to confirm"; }
    };
    card.querySelector("#m-close").onclick = close;
  }

  /* ---------- wiring ---------- */
  $("#tagline").textContent = C.tagline;
  document.title = C.title;
  Sound.setSfx(save.sfx); Sound.setMusic(save.music);
  document.addEventListener("pointerdown", () => Sound.unlock(), { once: false });
  $("#btn-play").onclick = () => { Sound.sfx("tap"); play(unlocked()); };
  $("#btn-levels").onclick = () => { Sound.sfx("tap"); levels(); };
  $("#btn-shop").onclick = () => { Sound.sfx("tap"); shop(); };
  $("#btn-daily").onclick = () => { Sound.sfx("tap"); daily(); };
  $("#btn-settings").onclick = () => { Sound.sfx("tap"); settings(); };
  $("#btn-pause").onclick = pause;
  document.querySelectorAll("[data-back]").forEach(b => b.onclick = () => { Sound.sfx("tap"); show("home"); });
  document.addEventListener("visibilitychange", () => { if (document.hidden && Game.state === "play") pause(); });
  refresh();

  return { play, goHome, levels, shop, daily, settings, get save() { return save; } };
})();

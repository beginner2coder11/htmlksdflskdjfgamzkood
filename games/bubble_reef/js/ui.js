/* BUBBLE REEF — menus, reef map, pearl shop, treasure chest, sheets, saves. */
(() => {
  const CFG = window.GAME_CONFIG, q = s => document.querySelector(s);
  const KEY = CFG.storagePrefix + "data";
  const blank = { pearls: 60, stars: {}, fish: 0, endlessBest: 0, inv: { bomb: 1, rainbow: 1, aim: 1 }, sfx: true, music: true, plays: 0, chest: 0 };
  let D;
  try { D = Object.assign({}, blank, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) { D = { ...blank }; }
  D.inv = Object.assign({ bomb: 0, rainbow: 0, aim: 0 }, D.inv);
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (e) {} };
  const reached = () => Math.min(CFG.levels, Object.keys(D.stars).length + 1);
  const starSum = () => Object.values(D.stars).reduce((a, b) => a + b, 0);
  let lastRun = null, rescued = false;

  function go(view) { document.body.dataset.view = view; paint(); }
  function paint() {
    document.querySelectorAll("[data-pearls]").forEach(e => e.textContent = D.pearls);
    q("#hs-level").textContent = reached(); q("#hs-fish").textContent = D.fish; q("#hs-best").textContent = D.endlessBest;
    q("#play-sub").textContent = "Level " + reached(); q("#map-stars").textContent = starSum();
    q("#chest-badge").hidden = Date.now() - D.chest < 4 * 3600e3;
  }
  function toast(t) { const e = document.createElement("div"); e.className = "toast"; e.textContent = t; document.body.appendChild(e); setTimeout(() => e.remove(), 1500); }
  function sheet(html) { const s = q("#sheet"); s.innerHTML = `<div class="sheet-card">${html}</div>`; s.hidden = false; return s.firstElementChild; }
  function closeSheet() { q("#sheet").hidden = true; q("#sheet").innerHTML = ""; }

  /* ---------- runs ---------- */
  function start(mode, n) {
    closeSheet(); rescued = false; lastRun = { mode, n };
    go("game"); Game.begin(mode, n); Sound.muffle(false); boosters();
  }
  function boosters() {
    q("#boosters").innerHTML = CFG.boosters.map(b => `<button class="glass boost ${D.inv[b.id] ? "" : "empty"}" data-boost="${b.id}" aria-label="${b.name}">${b.icon}<b>${D.inv[b.id] || "+"}</b></button>`).join("");
  }
  q("#boosters").addEventListener("click", e => {
    const el = e.target.closest("[data-boost]"); if (!el) return;
    const id = el.dataset.boost, b = CFG.boosters.find(x => x.id === id);
    if (!D.inv[id]) {
      if (D.pearls < b.price) { toast(`Need ${b.price} pearls`); return; }
      D.pearls -= b.price; D.inv[id]++; Sound.sfx("coin");
    }
    if (Game.arm(id)) { D.inv[id]--; persist(); toast(b.name + " ready!"); }
    boosters();
  });

  Game.on("hud", () => {
    const s = Game.state;
    q("#h-title").textContent = s.mode === "endless" ? "Endless" : "Level " + s.level;
    q("#h-score").textContent = s.score;
    q("#h-fish-box").hidden = s.mode === "endless";
    q("#h-fish").textContent = `${s.fishFreed}/${s.fishTotal}`;
    q("#h-shots").textContent = s.shots === Infinity ? "∞" : s.shots;
    q("#h-shots").parentElement.classList.toggle("warn", s.shots <= 5);
  });
  Game.on("pauseKey", () => { if (q("#sheet").hidden && document.body.dataset.view === "game") pause(); });

  Game.on("won", r => {
    D.stars[r.level] = Math.max(D.stars[r.level] || 0, r.stars);
    D.pearls += r.pearls; D.fish += r.fish; D.plays++;
    persist();
    const card = sheet(`<h3>Reef cleared!</h3>
      <div class="stars">${[0, 1, 2].map(i => `<span class="${i < r.stars ? "on" : ""}" style="animation-delay:${.15 + i * .2}s">⭐</span>`).join("")}</div>
      <div class="chips"><span>Score ${r.score}</span><span>${r.shotsLeft} shots left</span><span id="w-p">+${r.pearls} pearls</span></div>
      <button class="btn aqua" id="w-double">▶ Double pearls</button>
      <div class="row"><button class="btn" id="w-map">Map</button><button class="btn gold" id="w-next">Next level</button></div>`);
    card.querySelector("#w-double").onclick = e => { e.target.disabled = true; Ads.showRewarded().then(ok => { if (ok) { D.pearls += r.pearls; persist(); card.querySelector("#w-p").textContent = `+${r.pearls * 2} pearls`; Sound.sfx("coin"); } }); };
    const after = fn => (D.plays % CFG.ads.interstitialEvery === 0 ? Ads.showInterstitial() : Promise.resolve()).then(fn);
    card.querySelector("#w-next").onclick = () => after(() => start("adventure", Math.min(CFG.levels, r.level + 1)));
    card.querySelector("#w-map").onclick = () => after(() => { closeSheet(); Game.stop(); map(); });
  });
  Game.on("lost", r => {
    if (r.mode === "endless") { D.endlessBest = Math.max(D.endlessBest, r.score); }
    D.plays++; persist();
    const why = r.why === "shots" ? "Out of shots" : "The reef reached the line";
    const offer = rescued ? "" : r.why === "shots" ? `<button class="btn aqua" id="l-more">▶ +5 shots</button>` : `<button class="btn aqua" id="l-more">▶ Clear 3 rows</button>`;
    const card = sheet(`<h3>${r.mode === "endless" ? "Game over" : "So close!"}</h3><p>${why}</p>
      <div class="chips"><span>Score ${r.score}</span>${r.mode === "endless" ? `<span>Best ${D.endlessBest}</span>` : ""}</div>
      ${offer}<div class="row"><button class="btn" id="l-home">Home</button><button class="btn gold" id="l-retry">Try again</button></div>`);
    const m = card.querySelector("#l-more");
    if (m) m.onclick = () => Ads.showRewarded().then(ok => { if (!ok) return; rescued = true; closeSheet(); r.why === "shots" ? Game.moreShots(5) : Game.rescue(); });
    card.querySelector("#l-home").onclick = home;
    card.querySelector("#l-retry").onclick = () => (D.plays % CFG.ads.interstitialEvery === 0 ? Ads.showInterstitial() : Promise.resolve()).then(() => start(lastRun.mode, lastRun.n));
  });

  function pause() {
    Game.pause(); Sound.muffle(true);
    const card = sheet(`<h3>Paused</h3><button class="btn gold" id="p-go">Keep diving</button>
      <div class="row"><button class="btn" id="p-retry">Restart</button><button class="btn" id="p-home">Home</button></div>`);
    card.querySelector("#p-go").onclick = () => { closeSheet(); Game.resume(); Sound.muffle(false); };
    card.querySelector("#p-retry").onclick = () => start(lastRun.mode, lastRun.n);
    card.querySelector("#p-home").onclick = home;
  }
  function home() { closeSheet(); Game.stop(); Sound.muffle(false); go("home"); }

  /* ---------- reef map: a winding path drawn bottom-up ---------- */
  function map() {
    const n = CFG.levels, step = 92, h = n * step + 120, cur = reached(), el = q("#map");
    el.style.height = h + "px";
    const pts = Array.from({ length: n }, (_, i) => ({ x: 50 + Math.sin(i * 0.9) * 30, y: h - 70 - i * step }));
    const path = pts.map((p, i) => (i ? "L" : "M") + p.x + " " + p.y).join(" ");
    const deco = ["🐚", "🪸", "🐙", "🦀", "🐡", "🌿", "🐢", "⭐"];
    el.innerHTML = `<svg viewBox="0 0 100 ${h}" preserveAspectRatio="none"><path d="${path}" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="1.6" stroke-dasharray="2 3" vector-effect="non-scaling-stroke" style="stroke-width:5px"/></svg>`
      + pts.map((p, i) => {
        const lv = i + 1, s = D.stars[lv] || 0, cls = lv > cur ? "lock" : lv === cur ? "cur" : "";
        return `<button class="node ${cls}" style="left:${p.x}%;top:${p.y}px" data-lv="${lv}" ${lv > cur ? "disabled" : ""}>${lv > cur ? "🔒" : lv}<span class="st">${"★".repeat(s)}</span></button>`;
      }).join("")
      + pts.filter((_, i) => i % 3 === 1).map((p, i) => `<span class="deco" style="left:${p.x > 50 ? 8 : 78}%;top:${p.y - 20}px">${deco[i % deco.length]}</span>`).join("");
    go("map");
    const node = el.querySelector(".node.cur") || el.querySelector(".node");
    requestAnimationFrame(() => { const sc = q("#map-scroll"); sc.scrollTop = node.offsetTop - sc.clientHeight / 2; });
  }
  q("#map").addEventListener("click", e => { const b = e.target.closest("[data-lv]"); if (!b) return; Sound.sfx("tap"); preview(+b.dataset.lv); });
  function preview(n) {
    const sp = Game.levelSpec(n);
    const card = sheet(`<h3>Level ${n}</h3><p>Free all ${sp.fish} fish trapped in bubbles.</p>
      <div class="chips"><span>🐟 ${sp.fish}</span><span>🎯 ${sp.shots} shots</span><span>🎨 ${sp.colors} colors</span>${sp.stones ? `<span>🪨 ${sp.stones}</span>` : ""}</div>
      <div class="row"><button class="btn" id="pv-x">Close</button><button class="btn gold" id="pv-go">Play</button></div>`);
    card.querySelector("#pv-x").onclick = closeSheet;
    card.querySelector("#pv-go").onclick = () => start("adventure", n);
  }

  /* ---------- shop / chest / settings ---------- */
  function shop() {
    q("#shop").innerHTML = CFG.boosters.map(b => `<div class="glass offer"><div class="ic">${b.icon}<b>${D.inv[b.id]}</b></div>
      <div class="tx"><b>${b.name}</b><small>${b.desc}</small></div>
      <button class="buy" data-buy="${b.id}" ${D.pearls < b.price ? "disabled" : ""}><span class="pearl"></span>${b.price}</button></div>`).join("")
      + `<div class="glass offer"><div class="ic">🎬</div><div class="tx"><b>Free pearls</b><small>Watch a short video for 25 pearls</small></div><button class="buy" id="free-pearls">▶ Free</button></div>`;
    go("shop");
  }
  q("#shop").addEventListener("click", e => {
    const b = e.target.closest("[data-buy]");
    if (b) { const it = CFG.boosters.find(x => x.id === b.dataset.buy); if (D.pearls >= it.price) { D.pearls -= it.price; D.inv[it.id]++; persist(); Sound.sfx("coin"); shop(); } return; }
    if (e.target.closest("#free-pearls")) Ads.showRewarded().then(ok => { if (ok) { D.pearls += 25; persist(); Sound.sfx("coin"); shop(); } });
  });
  function chest() {
    const wait = 4 * 3600e3 - (Date.now() - D.chest);
    if (wait > 0) { const h = Math.floor(wait / 3600e3), m = Math.ceil(wait % 3600e3 / 60e3); toast(`Chest refills in ${h}h ${m}m`); return; }
    const amt = 15 + Math.floor(Math.random() * 4) * 10, gift = CFG.boosters[Math.floor(Math.random() * CFG.boosters.length)];
    const card = sheet(`<div class="chest">🧰</div><h3>Treasure!</h3><div class="chips"><span><span class="pearl" style="display:inline-block;vertical-align:-2px"></span> ${amt}</span><span>${gift.icon} ${gift.name}</span></div>
      <div class="row"><button class="btn" id="c-take">Collect</button><button class="btn aqua" id="c-x2">▶ ×2</button></div>`);
    const take = x => { D.pearls += amt * x; D.inv[gift.id] += x; D.chest = Date.now(); persist(); Sound.sfx("coin"); closeSheet(); paint(); };
    card.querySelector("#c-take").onclick = () => take(1);
    card.querySelector("#c-x2").onclick = () => Ads.showRewarded().then(ok => take(ok ? 2 : 1));
  }
  function settings() {
    const card = sheet(`<h3>Settings</h3>
      <button class="switch ${D.sfx ? "on" : ""}" id="s-sfx">Sound effects<i></i></button>
      <button class="switch ${D.music ? "on" : ""}" id="s-music">Ocean ambience<i></i></button>
      <button class="btn" id="s-reset">Reset progress</button><button class="btn gold" id="s-x">Done</button>`);
    card.querySelector("#s-sfx").onclick = e => { D.sfx = !D.sfx; Sound.setSfx(D.sfx); e.currentTarget.classList.toggle("on", D.sfx); persist(); };
    card.querySelector("#s-music").onclick = e => { D.music = !D.music; Sound.setMusic(D.music); e.currentTarget.classList.toggle("on", D.music); persist(); };
    card.querySelector("#s-reset").onclick = e => {
      if (!e.target.dataset.ok) { e.target.dataset.ok = 1; e.target.textContent = "Tap again to reset"; return; }
      D = JSON.parse(JSON.stringify(blank)); persist(); closeSheet(); paint(); toast("Progress reset");
    };
    card.querySelector("#s-x").onclick = closeSheet;
  }

  q("#tagline").textContent = CFG.tagline; document.title = CFG.title;
  Sound.setSfx(D.sfx); Sound.setMusic(D.music);
  document.addEventListener("pointerdown", () => Sound.unlock());
  q("#b-play").onclick = () => { Sound.sfx("tap"); start("adventure", reached()); };
  q("#b-map").onclick = () => { Sound.sfx("tap"); map(); };
  q("#b-endless").onclick = () => { Sound.sfx("tap"); start("endless", 0); };
  q("#b-shop").onclick = () => { Sound.sfx("tap"); shop(); };
  q("#b-chest").onclick = () => { Sound.sfx("tap"); chest(); };
  q("#b-settings").onclick = () => { Sound.sfx("tap"); settings(); };
  q("#b-pause").onclick = pause;
  q("#sheet").addEventListener("click", e => { if (e.target.id === "sheet" && Game.state.phase === "paused") { closeSheet(); Game.resume(); Sound.muffle(false); } });
  document.querySelectorAll("[data-home]").forEach(b => b.onclick = () => { Sound.sfx("tap"); go("home"); });
  document.addEventListener("visibilitychange", () => { if (document.hidden && Game.state.phase === "play") pause(); });
  paint();
  window.UI = { start, home, map, shop, chest, settings, get data() { return D; } };
})();

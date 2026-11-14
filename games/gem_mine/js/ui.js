/* GEM MINE — pages, HUD, dialogs, shaft list, supplies ledger, lucky dig, saves. */
window.UI = (() => {
  const CF = window.GAME_CONFIG, $ = id => document.getElementById(id);
  const KEY = CF.storagePrefix + "progress";
  const fresh = () => ({ coins: 100, stars: {}, tools: { pick: 2, shuffle: 1, dynamite: 1 }, sfx: true, music: true, games: 0, dig: 0 });
  let P = fresh();
  try { P = Object.assign(fresh(), JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(P)); } catch (e) {} };
  const top = () => Math.min(CF.levels, Object.keys(P.stars).length + 1);
  const starTotal = () => Object.values(P.stars).reduce((a, b) => a + b, 0);
  let current = 1, extraUsed = false;

  function page(name) { document.body.dataset.page = name; refresh(); }
  function refresh() {
    document.querySelectorAll("[data-coins]").forEach(e => e.textContent = P.coins);
    $("home-depth").textContent = "Level " + top(); $("lv-stars").textContent = starTotal();
    $("dig-pip").hidden = Date.now() - P.dig < 6 * 3600e3;
  }
  function toast(s) { const e = document.createElement("div"); e.className = "toast"; e.textContent = s; document.body.appendChild(e); setTimeout(() => e.remove(), 1500); }
  function dialog(html) { const d = $("dialog"); d.innerHTML = `<div class="board">${html}</div>`; d.hidden = false; return d.firstElementChild; }
  function closeDialog() { $("dialog").hidden = true; $("dialog").innerHTML = ""; }
  function gemIcon(kind) { const c = document.createElement("canvas"); c.width = c.height = 56; const x = c.getContext("2d"); Game.draw && x.drawImage(spriteFor(kind), 0, 0, 56, 56); return c; }
  // borrow the engine's gem art by drawing a tiny board-free sprite
  const spriteCache = {};
  function spriteFor(kind) {
    if (spriteCache[kind]) return spriteCache[kind];
    const G = CF.gems[kind], c = document.createElement("canvas"); c.width = c.height = 56; const x = c.getContext("2d");
    const n = G.sides || 14; x.translate(28, 28); x.beginPath();
    for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + i * 2 * Math.PI / n + (G.sides === 4 ? Math.PI / 4 : 0); x.lineTo(Math.cos(a) * 24, Math.sin(a) * 24); }
    x.closePath(); const g = x.createLinearGradient(-20, -20, 20, 20); g.addColorStop(0, G.light); g.addColorStop(.5, G.color); g.addColorStop(1, G.dark); x.fillStyle = g; x.fill();
    x.fillStyle = "rgba(255,255,255,.6)"; x.beginPath(); x.ellipse(-7, -9, 6, 3, -.7, 0, 7); x.fill();
    return spriteCache[kind] = c;
  }

  /* ---------- game ---------- */
  function play(n) {
    closeDialog(); current = n; extraUsed = false;
    page("game"); Game.setup(n); tools(); Sound.muffle(false);
    const g = Game.goal, s = describe(g);
    const d = dialog(`<h3>Level ${n}</h3><p>${s}</p><div class="tally"><span>Moves</span><b>${g.moves}</b><span>⭐ score</span><b>${g.stars[0]}</b><span>⭐⭐⭐ score</span><b>${g.stars[2]}</b></div><button class="brass-btn" id="d-go">Start digging</button>`);
    d.querySelector("#d-go").onclick = closeDialog;
  }
  function describe(g) {
    const parts = [];
    if (g.type === "score") parts.push(`Score ${g.target} points`);
    Object.entries(g.collect).forEach(([k, v]) => parts.push(`collect ${v} ${CF.gems[k].name.toLowerCase()}s`));
    if (g.type === "ice" || g.type === "mixed") parts.push("break all the ice");
    const s = parts.join(" and "); return s.charAt(0).toUpperCase() + s.slice(1) + ".";
  }
  function hud() {
    const g = Game.goal; if (!g) return;
    $("hud-moves").textContent = Game.moves; $("hud-moves").parentElement.classList.toggle("low", Game.moves <= 5);
    $("hud-score").textContent = Game.score;
    const max = g.stars[2] * 1.05; $("hud-fill").style.width = Math.min(100, Game.score / max * 100) + "%";
    g.stars.forEach((s, i) => { const m = $("mk" + (i + 1)); m.style.left = (s / max * 100) + "%"; m.classList.toggle("on", Game.score >= s); });
    const box = $("hud-goals"); box.innerHTML = "";
    if (g.type === "score") box.insertAdjacentHTML("beforeend", `<div class="goal ${Game.score >= g.target ? "done" : ""}"><span class="tgt">🎯</span>${Math.min(Game.score, g.target)}/${g.target}</div>`);
    Object.entries(g.collect).forEach(([k, v]) => {
      const left = Math.max(0, v - Game.progress.collect[k]), el = document.createElement("div");
      el.className = "goal" + (left ? "" : " done"); el.appendChild(gemIcon(+k)); el.insertAdjacentHTML("beforeend", left ? left : "✓"); box.appendChild(el);
    });
    if (g.type === "ice" || g.type === "mixed") { const left = Game.iceLeft(); box.insertAdjacentHTML("beforeend", `<div class="goal ${left ? "" : "done"}"><i class="ice"></i>${left || "✓"}</div>`); }
  }
  function tools() {
    $("tools").innerHTML = CF.boosters.map(b => `<button class="tool" data-tool="${b.id}" aria-label="${b.name}">${b.icon}<b>${P.tools[b.id] || "+"}</b></button>`).join("");
  }
  $("tools").addEventListener("click", e => {
    const el = e.target.closest("[data-tool]"); if (!el) return;
    const id = el.dataset.tool, b = CF.boosters.find(x => x.id === id);
    if (!P.tools[id]) { if (P.coins < b.price) { toast(`${b.name} costs 🪙${b.price}`); return; } P.coins -= b.price; P.tools[id] = 1; save(); Sound.sfx("coin"); tools(); return; }
    if (id === "shuffle") { if (Game.busy || Game.over) return; P.tools[id]--; save(); tools(); Game.useBooster("shuffle"); return; }
    if (Game.arm(id)) { el.classList.add("on"); $("armed-tip").hidden = false; }
  });
  $("disarm").onclick = () => { Game.disarm(); $("armed-tip").hidden = true; tools(); };
  Game.on("armed", () => { $("armed-tip").hidden = true; });
  Game.on("boosterUsed", r => { if (r.ok) { P.tools[r.id]--; save(); } tools(); });
  Game.on("hud", hud);
  Game.on("pauseKey", () => { if ($("dialog").hidden && document.body.dataset.page === "game") pause(); });

  Game.on("won", r => {
    P.stars[r.level] = Math.max(P.stars[r.level] || 0, r.stars); P.coins += r.coins; P.games++; save();
    setTimeout(() => {
      const d = dialog(`<h3>Vein cleared!</h3><div class="stars">${[0, 1, 2].map(i => `<i class="${i < r.stars ? "on" : ""}" style="animation-delay:${.2 + i * .25}s"></i>`).join("")}</div>
        <div class="tally"><span>Score</span><b>${r.score}</b><span>Coins</span><b id="d-coins">🪙 ${r.coins}</b></div>
        <button class="wood-btn" id="d-double">▶ Double coins</button>
        <div class="row"><button class="wood-btn" id="d-home">Camp</button><button class="brass-btn" id="d-next" style="flex:1">Next ▼</button></div>`);
      for (let i = 0; i < r.stars; i++) setTimeout(() => Sound.sfx("star", i), 250 + i * 250);
      d.querySelector("#d-double").onclick = e => { e.target.disabled = true; Ads.showRewarded().then(ok => { if (ok) { P.coins += r.coins; save(); d.querySelector("#d-coins").textContent = "🪙 " + r.coins * 2; Sound.sfx("coin"); } }); };
      const gate = fn => (P.games % CF.ads.interstitialEvery === 0 ? Ads.showInterstitial() : Promise.resolve()).then(fn);
      d.querySelector("#d-next").onclick = () => gate(() => play(Math.min(CF.levels, r.level + 1)));
      d.querySelector("#d-home").onclick = () => gate(home);
    }, 400);
  });
  Game.on("lost", r => {
    P.games++; save();
    const d = dialog(`<h3>Out of moves</h3><p>The vein holds its secrets… for now.</p><div class="tally"><span>Score</span><b>${r.score}</b></div>
      ${extraUsed ? "" : `<button class="brass-btn" id="d-more">▶ +5 moves</button>`}
      <div class="row"><button class="wood-btn" id="d-home">Camp</button><button class="wood-btn" id="d-retry">Retry</button></div>`);
    const m = d.querySelector("#d-more");
    if (m) m.onclick = () => Ads.showRewarded().then(ok => { if (ok) { extraUsed = true; closeDialog(); Game.addMoves(5); } });
    d.querySelector("#d-home").onclick = home;
    d.querySelector("#d-retry").onclick = () => (P.games % CF.ads.interstitialEvery === 0 ? Ads.showInterstitial() : Promise.resolve()).then(() => play(current));
  });
  function pause() {
    Game.pause(); Sound.muffle(true);
    const d = dialog(`<h3>Resting</h3><button class="brass-btn" id="d-res">Back to work</button><div class="row"><button class="wood-btn" id="d-re">Restart</button><button class="wood-btn" id="d-home">Camp</button></div>`);
    d.querySelector("#d-res").onclick = () => { closeDialog(); Game.resume(); Sound.muffle(false); };
    d.querySelector("#d-re").onclick = () => play(current);
    d.querySelector("#d-home").onclick = home;
  }
  function home() { closeDialog(); Game.quit(); Sound.muffle(false); page("home"); }

  /* ---------- shaft ---------- */
  const typeName = { score: "Score run", collect: "Gem haul", ice: "Ice vein", mixed: "Deep vein" };
  function levels() {
    const t = top();
    $("shaft").innerHTML = Array.from({ length: CF.levels }, (_, i) => {
      const n = i + 1, g = Game.spec(n), s = P.stars[n] || 0, cls = n > t ? "lock" : n === t ? "cur" : "";
      return `<button class="floor ${cls}" data-lv="${n}" ${n > t ? "disabled" : ""}><span class="no">${n}</span><span class="nm"><b>${typeName[g.type]}</b><small>${n * 25} m deep · ${g.moves} moves</small></span><span class="st">${n > t ? "🔒" : "★".repeat(s) + "☆".repeat(3 - s)}</span></button>`;
    }).join("");
    page("levels");
    const cur = $("shaft").querySelector(".cur"); if (cur) cur.scrollIntoView({ block: "center" });
  }
  $("shaft").addEventListener("click", e => { const b = e.target.closest("[data-lv]"); if (b) { Sound.sfx("tap"); play(+b.dataset.lv); } });

  /* ---------- supplies ---------- */
  function shop() {
    $("ledger").innerHTML = CF.boosters.map(b => `<div class="ln"><span class="ic">${b.icon}</span><span class="tx"><b>${b.name}</b><small>${b.desc}</small></span><span class="own">×${P.tools[b.id] || 0}</span><button class="brass-btn" data-buy="${b.id}" ${P.coins < b.price ? "disabled" : ""}>🪙 ${b.price}</button></div>`).join("")
      + `<div class="ln"><span class="ic">🎬</span><span class="tx"><b>Prospector's tip</b><small>Watch a video for 🪙 30</small></span><button class="brass-btn" id="free-coins">▶ Free</button></div>`;
    page("shop");
  }
  $("ledger").addEventListener("click", e => {
    const b = e.target.closest("[data-buy]");
    if (b) { const it = CF.boosters.find(x => x.id === b.dataset.buy); if (P.coins >= it.price) { P.coins -= it.price; P.tools[it.id] = (P.tools[it.id] || 0) + 1; save(); Sound.sfx("coin"); shop(); } }
    if (e.target.closest("#free-coins")) Ads.showRewarded().then(ok => { if (ok) { P.coins += 30; save(); Sound.sfx("coin"); shop(); } });
  });

  /* ---------- lucky dig: pick one of three rocks ---------- */
  function dig() {
    const left = 6 * 3600e3 - (Date.now() - P.dig);
    if (left > 0) { toast(`New rocks in ${Math.ceil(left / 3600e3)}h`); return; }
    const prizes = [{ t: "🪙 40", f: () => P.coins += 40 }, { t: "🪙 80", f: () => P.coins += 80 }, { t: "⛏️ ×2", f: () => P.tools.pick += 2 }, { t: "🧨 ×1", f: () => P.tools.dynamite += 1 }, { t: "🔀 ×2", f: () => P.tools.shuffle += 2 }]
      .sort(() => Math.random() - 0.5).slice(0, 3);
    const d = dialog(`<h3>Lucky dig</h3><p>Swing at one rock. What's inside is yours.</p><div class="rocks">${prizes.map((_, i) => `<button class="rock" data-rock="${i}">🪨</button>`).join("")}</div><p id="dig-msg">&nbsp;</p><button class="wood-btn" id="dig-close" hidden>Collect</button>`);
    d.querySelector(".rocks").onclick = e => {
      const r = e.target.closest("[data-rock]"); if (!r || d.dataset.done) return;
      d.dataset.done = 1; Sound.sfx("blast");
      d.querySelectorAll(".rock").forEach((el, i) => { el.classList.add("open"); el.textContent = prizes[i].t; el.style.fontSize = "17px"; if (el !== r) el.style.opacity = .4; });
      const p = prizes[+r.dataset.rock]; p.f(); P.dig = Date.now(); save();
      d.querySelector("#dig-msg").textContent = "You found " + p.t + "!"; d.querySelector("#dig-close").hidden = false; Sound.sfx("coin");
    };
    d.querySelector("#dig-close").onclick = () => { closeDialog(); refresh(); };
  }
  function settings() {
    const d = dialog(`<h3>Settings</h3><button class="toggle ${P.sfx ? "on" : ""}" id="t-sfx">Sound effects<i></i></button><button class="toggle ${P.music ? "on" : ""}" id="t-mus">Music<i></i></button><button class="wood-btn" id="t-reset">Reset progress</button><button class="brass-btn" id="t-x">Close</button>`);
    d.querySelector("#t-sfx").onclick = e => { P.sfx = !P.sfx; Sound.setSfx(P.sfx); e.currentTarget.classList.toggle("on", P.sfx); save(); };
    d.querySelector("#t-mus").onclick = e => { P.music = !P.music; Sound.setMusic(P.music); e.currentTarget.classList.toggle("on", P.music); save(); };
    d.querySelector("#t-reset").onclick = e => { if (!e.target.dataset.y) { e.target.dataset.y = 1; e.target.textContent = "Tap again to confirm"; return; } P = fresh(); save(); closeDialog(); refresh(); toast("Progress reset"); };
    d.querySelector("#t-x").onclick = closeDialog;
  }

  $("tagline").textContent = CF.tagline; document.title = CF.title;
  Sound.setSfx(P.sfx); Sound.setMusic(P.music);
  document.addEventListener("pointerdown", () => Sound.unlock());
  $("go-play").onclick = () => { Sound.sfx("tap"); play(top()); };
  $("go-levels").onclick = () => { Sound.sfx("tap"); levels(); };
  $("go-shop").onclick = () => { Sound.sfx("tap"); shop(); };
  $("go-dig").onclick = () => { Sound.sfx("tap"); dig(); };
  $("go-settings").onclick = () => { Sound.sfx("tap"); settings(); };
  $("go-pause").onclick = pause;
  document.querySelectorAll("[data-home]").forEach(b => b.onclick = () => { Sound.sfx("tap"); page("home"); });
  document.addEventListener("visibilitychange", () => { if (document.hidden && document.body.dataset.page === "game" && $("dialog").hidden && !Game.over) pause(); });
  refresh();
  return { play, home, levels, shop, dig, settings, get data() { return P; } };
})();

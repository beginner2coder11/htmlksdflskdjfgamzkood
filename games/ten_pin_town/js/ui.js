/* TEN PIN TOWN — lobby, scorecard, pin map, Spare Shots list, ball shop, results, saves. */
window.UI = (() => {
  const CF = window.GAME_CONFIG, $ = id => document.getElementById(id);
  const KEY = CF.storagePrefix + "locker";
  const fresh = () => ({ coins: 0, best: 0, games: 0, cleared: {}, owned: ["cherry"], ball: "cherry", sfx: true, music: true, seenHow: false });
  let K = fresh();
  try { K = Object.assign(fresh(), JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) {}
  const keep = () => { try { localStorage.setItem(KEY, JSON.stringify(K)); } catch (e) {} };
  const ballDef = () => CF.balls.find(b => b.id === K.ball) || CF.balls[0];
  const open = i => i === 0 || !!K.cleared[i - 1];
  let current = null, earned = 0, callT = 0;

  function at(v) { document.body.dataset.at = v; if (v === "lobby") lobby(); Sound.muffle(v !== "play"); }
  function modal(html) { const m = $("modal"); m.innerHTML = `<div class="ticket">${html}</div>`; m.hidden = false; return m.firstElementChild; }
  function close() { $("modal").hidden = true; $("modal").innerHTML = ""; }
  const coins = () => document.querySelectorAll("[data-coins]").forEach(e => { e.textContent = K.coins; });

  function lobby() {
    $("l-best").textContent = `10 frames · best ${K.best || "—"}`;
    $("l-spares").textContent = `${Object.keys(K.cleared).length} / ${CF.challenges.length} cleared`;
    coins();
  }

  // ---------- the scorecard + pin map ----------
  function card() {
    const tot = Game.totals(Game.frames), cur = Game.frame;
    $("card").innerHTML = Array.from({ length: 10 }, (_, f) => {
      const m = Game.marks(f), boxes = f === 9 ? 3 : 2;
      return `<div class="fr${f === cur ? " on" : ""}"><small>${f + 1}</small><span class="rolls">${Array.from({ length: boxes }, (_, k) => `<i>${m[k] || ""}</i>`).join("")}</span><b>${tot[f] !== undefined ? tot[f] : ""}</b></div>`;
    }).join("");
  }
  function pinmap() {
    const up = new Set(Game.standing), inRack = new Set(Game.rack);
    $("pinmap").innerHTML = [[7, 8, 9, 10], [4, 5, 6], [2, 3], [1]].map(r => `<div>${r.map(n => `<i class="${up.has(n) ? "up" : inRack.has(n) ? "down" : ""}"></i>`).join("")}</div>`).join("");
  }
  function hud() {
    if (current && current.kind === "spare") {
      const c = CF.challenges[current.level];
      $("card").innerHTML = `<div class="fr wide on"><small>SPARE SHOT ${current.level + 1}</small><b>${c.name}</b></div>`;
      $("h-sub").textContent = "Knock down every pin in one roll";
    } else { card(); $("h-sub").textContent = `Frame ${Math.min(10, Game.frame + 1)} · ball ${(Game.frames[Game.frame] || []).length + 1}`; }
    pinmap();
  }
  Game.on("hud", hud);
  Game.on("aim", () => { hud(); $("hint").hidden = false; });
  Game.on("roll", () => { $("hint").hidden = true; });
  Game.on("touch", () => Sound.unlock());
  Game.on("call", (text, kind) => {
    const c = $("call"); c.textContent = text; c.className = "call " + (kind || ""); c.hidden = false;
    clearTimeout(callT); callT = setTimeout(() => { c.hidden = true; }, text === "STRIKE!" ? 1600 : 1100);
    pinmap();
  });
  Game.on("strike", () => { earned += CF.coins.strike; });
  Game.on("spare", () => { earned += CF.coins.spare; });

  // ---------- play ----------
  function play(m) {
    close(); current = m; earned = 0;
    at("play"); Game.start(m, ballDef()); hud();
    if (!K.seenHow) { K.seenHow = true; keep(); how(); }
  }
  Game.on("over", r => {
    K.games++; const best = r.score > K.best; if (best) K.best = r.score;
    earned += Math.floor(r.score / 10) * CF.coins.perTen; K.coins += earned; keep(); coins();
    setTimeout(() => {
      const m = modal(`<span class="stub">FINAL SCORE</span><div class="big">${r.score}</div>
        <p>${best ? "A new house record! " : `Best ${K.best}. `}${r.strikes} strike${r.strikes === 1 ? "" : "s"} · ${r.spares} spare${r.spares === 1 ? "" : "s"}</p>
        <p class="earn">+${earned} 🪙</p>
        <div class="acts"><button class="tile hot wide" id="o-dbl"><b>▶ Watch ad · double coins</b></button><button class="tile" id="o-lobby"><b>Lobby</b></button><button class="tile go" id="o-again"><b>Bowl again</b></button></div>`);
      const gate = fn => (K.games % CF.ads.interstitialEvery === 0 ? Ads.showInterstitial() : Promise.resolve()).then(fn);
      m.querySelector("#o-dbl").onclick = e => { const b = e.currentTarget; Ads.showRewarded().then(ok => { if (!ok) return; K.coins += earned; keep(); coins(); Sound.sfx("coin"); b.remove(); m.querySelector(".earn").textContent = `+${earned * 2} 🪙`; }); };
      m.querySelector("#o-lobby").onclick = () => gate(() => { close(); Game.quit(); at("lobby"); });
      m.querySelector("#o-again").onclick = () => gate(() => play({ kind: "open" }));
    }, 500);
  });
  Game.on("spareDone", r => {
    const first = r.ok && !K.cleared[r.level];
    if (r.ok) { K.cleared[r.level] = 1; if (first) { K.coins += CF.coins.challenge; Sound.sfx("coin"); } }
    K.games++; keep(); coins();
    const next = r.level + 1 < CF.challenges.length;
    const m = modal(`<span class="stub">SPARE SHOT ${r.level + 1}</span><h3>${r.ok ? "Cleared!" : "So close"}</h3>
      <p>${r.ok ? (first ? `+${CF.coins.challenge} 🪙 · ` : "") + CF.challenges[r.level].name : `${r.left} pin${r.left === 1 ? "" : "s"} still standing.`}</p>
      <div class="acts"><button class="tile" id="s-list"><b>All shots</b></button>${r.ok && next ? `<button class="tile go" id="s-next"><b>Next shot</b></button>` : `<button class="tile go" id="s-retry"><b>Try again</b></button>`}</div>`);
    const gate = fn => (K.games % CF.ads.interstitialEvery === 0 ? Ads.showInterstitial() : Promise.resolve()).then(fn);
    m.querySelector("#s-list").onclick = () => gate(() => { Game.quit(); at("lobby"); spareList(); });
    const n = m.querySelector("#s-next"); if (n) n.onclick = () => gate(() => play({ kind: "spare", level: r.level + 1 }));
    const t = m.querySelector("#s-retry"); if (t) t.onclick = () => play({ kind: "spare", level: r.level });
  });

  // ---------- Spare Shots list ----------
  function mini(list) {
    const s = new Set(list);
    return `<span class="mini">${[[7, 8, 9, 10], [4, 5, 6], [2, 3], [1]].map(r => `<span>${r.map(n => `<i class="${s.has(n) ? "up" : ""}"></i>`).join("")}</span>`).join("")}</span>`;
  }
  function spareList() {
    const m = modal(`<span class="stub">SPARE SHOTS</span><h3>One roll. Every pin.</h3>
      <div class="shots">${CF.challenges.map((c, i) => `<button class="shot${K.cleared[i] ? " done" : ""}" data-i="${i}" ${open(i) ? "" : "disabled"}><small>${i + 1}</small>${mini(c.pins)}<span>${open(i) ? c.name : "locked"}</span></button>`).join("")}</div>
      <button class="tile" id="x"><b>Back</b></button>`);
    m.querySelector(".shots").onclick = e => { const b = e.target.closest("[data-i]"); if (b && !b.disabled) { Sound.sfx("tap"); play({ kind: "spare", level: +b.dataset.i }); } };
    m.querySelector("#x").onclick = close;
  }

  // ---------- ball shop ----------
  function shop() {
    const m = modal(`<span class="stub">BALL SHOP · 🪙 <b data-coins>${K.coins}</b></span>
      <div class="balls">${CF.balls.map(b => {
        const own = K.owned.includes(b.id), on = K.ball === b.id;
        return `<button class="ballbtn${on ? " on" : ""}" data-b="${b.id}"><i style="--c:${b.color};--s:${b.swirl}"></i><b>${b.name}</b><small>hook ${b.hook.toFixed(2)} · ${b.mass} kg</small><span>${on ? "IN HAND" : own ? "USE" : "🪙 " + b.price}</span></button>`;
      }).join("")}</div><button class="tile" id="x"><b>Done</b></button>`);
    m.querySelector(".balls").onclick = e => {
      const btn = e.target.closest("[data-b]"); if (!btn) return;
      const b = CF.balls.find(x => x.id === btn.dataset.b);
      if (!K.owned.includes(b.id)) { if (K.coins < b.price) { btn.classList.add("no"); setTimeout(() => btn.classList.remove("no"), 400); return; } K.coins -= b.price; K.owned.push(b.id); Sound.sfx("coin"); }
      K.ball = b.id; keep(); coins(); shop();
    };
    m.querySelector("#x").onclick = () => { close(); lobby(); };
  }

  function how() {
    const m = modal(`<span class="stub">HOW TO BOWL</span><ul class="how">
      <li><b>Swipe up</b> from where you want the ball to start. Faster flick = faster ball.</li>
      <li>Point the swipe left or right to <b>aim</b>. Drag sideways first to slide the ball along the line.</li>
      <li><b>Curve</b> the end of your swipe to put hook on the ball. It bends once it leaves the oil.</li>
      <li>Aim for the <b>pocket</b> between the head pin and the pin behind it for strikes.</li>
      <li>Strike = all 10 with the first ball. Spare = all 10 with two.</li></ul>
      <button class="tile go" id="x"><b>Let's bowl</b></button>`);
    if (Game.state === "aim") Game.pause();
    m.querySelector("#x").onclick = () => { close(); Game.resume(); };
  }
  function settings() {
    const m = modal(`<span class="stub">SETTINGS</span>
      <button class="opt" id="o-s">Sound effects <b>${K.sfx ? "ON" : "OFF"}</b></button>
      <button class="opt" id="o-m">Lounge music <b>${K.music ? "ON" : "OFF"}</b></button>
      <button class="opt" id="o-r">Reset progress <b>—</b></button>
      <button class="tile go" id="x"><b>Done</b></button>`);
    m.querySelector("#o-s").onclick = e => { K.sfx = !K.sfx; Sound.setSfx(K.sfx); e.currentTarget.querySelector("b").textContent = K.sfx ? "ON" : "OFF"; keep(); };
    m.querySelector("#o-m").onclick = e => { K.music = !K.music; Sound.setMusic(K.music); e.currentTarget.querySelector("b").textContent = K.music ? "ON" : "OFF"; keep(); };
    m.querySelector("#o-r").onclick = e => { const b = e.currentTarget.querySelector("b"); if (b.textContent !== "SURE?") { b.textContent = "SURE?"; return; } K = fresh(); keep(); b.textContent = "DONE"; lobby(); };
    m.querySelector("#x").onclick = () => { close(); lobby(); };
  }
  function pause() {
    if (document.body.dataset.at !== "play" || !$("modal").hidden) return;
    Game.pause();
    const m = modal(`<span class="stub">PAUSED</span><div class="acts"><button class="tile go wide" id="p-go"><b>Resume</b></button><button class="tile" id="p-how"><b>How to bowl</b></button><button class="tile" id="p-lobby"><b>Lobby</b></button></div>`);
    m.querySelector("#p-go").onclick = () => { close(); Game.resume(); };
    m.querySelector("#p-how").onclick = () => { close(); how(); };
    m.querySelector("#p-lobby").onclick = () => { close(); Game.resume(); Game.quit(); at("lobby"); };
  }

  $("h-pause").onclick = pause;
  $("l-open").onclick = () => { Sound.sfx("tap"); play({ kind: "open" }); };
  $("l-spare").onclick = () => { Sound.sfx("tap"); spareList(); };
  $("l-balls").onclick = () => { Sound.sfx("tap"); shop(); };
  $("l-how").onclick = () => { Sound.sfx("tap"); how(); };
  $("l-settings").onclick = () => { Sound.sfx("tap"); settings(); };
  $("tagline").textContent = CF.tagline; document.title = CF.title;
  Sound.setSfx(K.sfx); Sound.setMusic(K.music);
  document.addEventListener("pointerdown", () => Sound.unlock());
  document.addEventListener("visibilitychange", () => { if (document.hidden) pause(); });
  at("lobby");
  return { play, shop, spareList, get locker() { return K; } };
})();

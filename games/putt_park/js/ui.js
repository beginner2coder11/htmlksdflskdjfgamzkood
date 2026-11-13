/* PUTT PARK — cover, chapters, HUD, scorecards, ball colours, saves. */
window.UI = (() => {
  const CF = window.GAME_CONFIG, $ = id => document.getElementById(id);
  const KEY = CF.storagePrefix + "book";
  const fresh = () => ({ best: {}, stars: {}, ball: "white", plays: 0, sfx: true, music: true });
  let B = fresh();
  try { B = Object.assign(fresh(), JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) {}
  const keep = () => { try { localStorage.setItem(KEY, JSON.stringify(B)); } catch (e) {} };
  const starSum = () => Object.values(B.stars).reduce((a, b) => a + b, 0);
  let extraUsed = false;

  function page(p) { document.body.dataset.page = p; if (p === "cover") cover(); }
  function modal(html) { const m = $("modal"); m.innerHTML = `<div class="card">${html}</div>`; m.hidden = false; return m.firstElementChild; }
  function close() { $("modal").hidden = true; $("modal").innerHTML = ""; }
  function cover() {
    $("chapters").innerHTML = CF.courses.map((c, i) => {
      const locked = i > 0 && B.best[CF.courses[i - 1].id] === undefined, st = c.holes.reduce((s, _, h) => s + (B.stars[c.id + h] || 0), 0);
      const par = c.holes.reduce((s, h) => s + h.par, 0);
      return `<button class="chapter" data-c="${i}" ${locked ? "disabled" : ""}><span class="no">${["I", "II", "III", "IV"][i]}</span><span><b>${c.name}</b><small>${locked ? "finish the previous chapter" : `${c.holes.length} holes · par ${par}${B.best[c.id] ? " · best " + B.best[c.id] : ""}`}</small></span><span class="st">${st}/${c.holes.length * 3} ★</span></button>`;
    }).join("");
  }
  $("chapters").addEventListener("click", e => { const b = e.target.closest("[data-c]"); if (b && !b.disabled) { Sound.sfx("tap"); play(+b.dataset.c); } });

  function play(c) { close(); page("play"); Game.setBall((CF.balls.find(x => x.id === B.ball) || CF.balls[0]).color); Game.playCourse(c); Sound.muffle(false); }
  Game.on("hole", h => {
    $("h-hole").textContent = `Hole ${h.n} of ${CF.courses[Game.courseIndex].holes.length}`; $("h-name").textContent = h.name; $("h-par").textContent = h.par;
    const r = $("ribbon"); r.innerHTML = `Hole ${h.n} · ${h.name}<small>par ${h.par} — drag back from anywhere, then let go</small>`; r.hidden = false; r.style.animation = "none"; void r.offsetWidth; r.style.animation = ""; clearTimeout(r.t); r.t = setTimeout(() => r.hidden = true, 2200);
    extraUsed = false;
  });
  Game.on("hud", () => { $("h-strokes").textContent = Game.strokes; });
  Game.on("power", p => { $("power").hidden = p <= 0; $("power-fill").style.width = p * 100 + "%"; });
  Game.on("pauseKey", () => { if ($("modal").hidden && document.body.dataset.page === "play") pause(); });
  const table = cards => {
    const c = CF.courses[Game.courseIndex];
    return `<table class="score"><tr><th>Hole</th>${c.holes.map((_, i) => `<th>${i + 1}</th>`).join("")}<th>Σ</th></tr><tr><th>Par</th>${c.holes.map(h => `<td>${h.par}</td>`).join("")}<td>${c.holes.reduce((s, h) => s + h.par, 0)}</td></tr><tr><th>You</th>${c.holes.map((h, i) => cards[i] ? `<td class="${cards[i].strokes < h.par ? "under" : cards[i].strokes > h.par ? "over" : ""}">${cards[i].strokes}</td>` : "<td></td>").join("")}<td>${cards.reduce((s, x) => s + (x ? x.strokes : 0), 0)}</td></tr></table>`;
  };
  function saveStars(cards) { const c = CF.courses[Game.courseIndex]; cards.forEach((x, i) => { if (x) B.stars[c.id + i] = Math.max(B.stars[c.id + i] || 0, x.stars); }); keep(); }
  Game.on("holeDone", r => {
    saveStars(r.cards);
    const m = modal(`<h3>${r.strokes === 1 ? "Hole in one!" : r.strokes < r.par ? "Lovely putt." : r.strokes === r.par ? "Right on par." : "Onward."}</h3>
      <div class="stars">${[0, 1, 2].map(i => `<span class="${i < r.stars ? "" : "off"}">★</span>`).join("")}</div>${table(r.cards)}
      <div class="acts">${r.stars < 3 && !extraUsed ? `<button class="ink wide" id="m-retry">▶ Watch ad · replay this hole</button>` : ""}<button class="ink" id="m-quit">Close book</button><button class="ink go" id="m-next">Next hole →</button></div>`);
    for (let i = 0; i < r.stars; i++) setTimeout(() => Sound.sfx("star", i), 200 + i * 220);
    const rt = m.querySelector("#m-retry"); if (rt) rt.onclick = () => Ads.showRewarded().then(ok => { if (ok) { extraUsed = true; close(); Game.retryHole(); } });
    m.querySelector("#m-next").onclick = () => { close(); Game.nextHole(); };
    m.querySelector("#m-quit").onclick = () => { close(); Game.quit(); page("cover"); };
  });
  Game.on("courseDone", r => {
    saveStars(r.cards); B.plays++;
    const c = CF.courses[r.ci], total = r.cards.reduce((s, x) => s + x.strokes, 0), par = c.holes.reduce((s, h) => s + h.par, 0);
    const best = B.best[c.id] === undefined || total < B.best[c.id]; if (best) B.best[c.id] = total; keep();
    const m = modal(`<h3>The end of ${c.name}</h3><p>${total} strokes · ${total - par === 0 ? "even par" : total - par > 0 ? "+" + (total - par) : total - par} ${best ? "· a new best!" : ""}</p>${table(r.cards)}
      <div class="acts"><button class="ink" id="m-cover">Contents</button><button class="ink go" id="m-again">Play again</button></div>`);
    const gate = fn => (B.plays % CF.ads.interstitialEvery === 0 ? Ads.showInterstitial() : Promise.resolve()).then(fn);
    m.querySelector("#m-cover").onclick = () => gate(() => { close(); Game.quit(); page("cover"); });
    m.querySelector("#m-again").onclick = () => gate(() => play(r.ci));
  });
  function pause() {
    Game.pause(); Sound.muffle(true);
    const m = modal(`<h3>Bookmark</h3><div class="acts"><button class="ink go wide" id="p-go">Keep playing</button><button class="ink" id="p-re">Restart hole</button><button class="ink" id="p-q">Contents</button></div>`);
    m.querySelector("#p-go").onclick = () => { close(); Game.resume(); Sound.muffle(false); };
    m.querySelector("#p-re").onclick = () => { close(); Game.resume(); Game.retryHole(); };
    m.querySelector("#p-q").onclick = () => { close(); Game.quit(); Sound.muffle(false); page("cover"); };
  }
  $("h-pause").onclick = pause;
  function balls() {
    const m = modal(`<h3>Ball colours</h3><p>${starSum()} stars collected</p><div class="balls">${CF.balls.map(b => `<button data-b="${b.id}" class="${B.ball === b.id ? "on" : ""}" ${starSum() < b.stars ? "disabled" : ""}><i style="background:${b.color}"></i>${starSum() < b.stars ? b.stars + "★" : b.name}</button>`).join("")}</div><button class="ink go" id="b-x">Done</button>`);
    m.querySelector(".balls").onclick = e => { const b = e.target.closest("[data-b]"); if (!b || b.disabled) return; B.ball = b.dataset.b; keep(); Sound.sfx("tap"); balls(); };
    m.querySelector("#b-x").onclick = close;
  }
  function settings() {
    const m = modal(`<h3>Settings</h3><button class="opt" id="o-s">Sounds <span>${B.sfx ? "on" : "off"}</span></button><button class="opt" id="o-m">Music box <span>${B.music ? "on" : "off"}</span></button><button class="opt" id="o-r">Start a fresh book <span>—</span></button><button class="ink go" id="o-x">Done</button>`);
    m.querySelector("#o-s").onclick = e => { B.sfx = !B.sfx; Sound.setSfx(B.sfx); e.currentTarget.querySelector("span").textContent = B.sfx ? "on" : "off"; keep(); };
    m.querySelector("#o-m").onclick = e => { B.music = !B.music; Sound.setMusic(B.music); e.currentTarget.querySelector("span").textContent = B.music ? "on" : "off"; keep(); };
    m.querySelector("#o-r").onclick = e => { const s = e.currentTarget.querySelector("span"); if (s.textContent !== "sure?") { s.textContent = "sure?"; return; } B = fresh(); keep(); s.textContent = "done"; cover(); };
    m.querySelector("#o-x").onclick = close;
  }
  $("tagline").textContent = CF.tagline; document.title = CF.title;
  Sound.setSfx(B.sfx); Sound.setMusic(B.music);
  document.addEventListener("pointerdown", () => Sound.unlock());
  $("c-balls").onclick = () => { Sound.sfx("tap"); balls(); };
  $("c-settings").onclick = () => { Sound.sfx("tap"); settings(); };
  document.addEventListener("visibilitychange", () => { if (document.hidden && document.body.dataset.page === "play" && $("modal").hidden) pause(); });
  page("cover");
  return { play, get book() { return B; } };
})();

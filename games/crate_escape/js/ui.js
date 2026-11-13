/* CRATE ESCAPE — shelf of puzzle packs, HUD, hints, results, wood picker, saves. */
window.UI = (() => {
  const CF = window.GAME_CONFIG, L = window.LEVELS, $ = id => document.getElementById(id);
  const KEY = CF.storagePrefix + "box";
  const fresh = () => ({ stars: {}, hints: CF.hints, hintStars: 0, wood: "pine", plays: 0, sfx: true, music: true });
  let B = fresh();
  try { B = Object.assign(fresh(), JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) {}
  const keep = () => { try { localStorage.setItem(KEY, JSON.stringify(B)); } catch (e) {} };
  const PACKS = ["Beginner", "Easy", "Medium", "Hard", "Expert"], per = Math.ceil(L.length / PACKS.length);
  const next = () => Math.min(L.length - 1, Object.keys(B.stars).length);
  const total = () => Object.values(B.stars).reduce((a, b) => a + b, 0);

  function wood() { const w = CF.woods.find(x => x.id === B.wood) || CF.woods[0]; document.documentElement.style.setProperty("--board", w.board); document.documentElement.style.setProperty("--rim", w.rim); }
  function at(v) { document.body.dataset.at = v; if (v === "shelf") shelf(); }
  function modal(html) { const m = $("modal"); m.innerHTML = `<div class="card">${html}</div>`; m.hidden = false; return m.firstElementChild; }
  function close() { $("modal").hidden = true; $("modal").innerHTML = ""; }
  function shelf() {
    $("s-stars").textContent = total(); $("s-done").textContent = Object.keys(B.stars).length; $("s-hints").textContent = B.hints;
    const cur = next();
    $("packs").innerHTML = PACKS.map((p, pi) => `<div class="pack"><h3>${p}<small>${L[pi * per] ? L[pi * per].min : ""}–${L[Math.min(L.length - 1, pi * per + per - 1)].min} moves</small></h3><div class="slots">${Array.from({ length: per }, (_, k) => { const i = pi * per + k; if (i >= L.length) return ""; const s = B.stars[i] || 0; return `<button class="slot ${i === cur ? "cur" : ""}" data-i="${i}" ${i > cur ? "disabled" : ""}>${i + 1}<i>${"★".repeat(s)}</i></button>`; }).join("")}</div></div>`).join("");
  }
  $("packs").addEventListener("click", e => { const b = e.target.closest("[data-i]"); if (b) { Sound.sfx("tap"); play(+b.dataset.i); } });

  function play(i) { close(); at("table"); requestAnimationFrame(() => { Game.load(i); $("box").classList.remove("open"); }); Sound.muffle(false); }
  Game.on("hud", () => { $("t-pack").textContent = PACKS[Math.floor(Game.level / per)]; $("t-level").textContent = "Puzzle " + (Game.level + 1); $("t-moves").textContent = Game.moves; $("t-min").textContent = Game.min; $("t-hints").textContent = B.hints; });
  Game.on("won", r => {
    B.plays++; B.stars[r.level] = Math.max(B.stars[r.level] || 0, r.stars);
    const add = Math.floor(total() / CF.hintEveryStars) - B.hintStars; if (add > 0) { B.hints += add; B.hintStars += add; } keep();
    const m = modal(`<h3>${r.moves === r.min ? "Perfect!" : "Escaped!"}</h3><div class="stars">${[0, 1, 2].map(i => `<span class="${i < r.stars ? "" : "off"}">★</span>`).join("")}</div><p>${r.moves} moves · best possible ${r.min}${add > 0 ? ` · +${add} hint` : ""}</p>
      <div class="acts"><button class="peg" id="w-shelf">Shelf</button><button class="peg go" id="w-next">Next →</button></div>`);
    for (let i = 0; i < r.stars; i++) setTimeout(() => Sound.sfx("star", i), 200 + i * 220);
    const gate = fn => (B.plays % CF.ads.interstitialEvery === 0 ? Ads.showInterstitial() : Promise.resolve()).then(fn);
    m.querySelector("#w-next").onclick = () => gate(() => play(Math.min(L.length - 1, r.level + 1)));
    m.querySelector("#w-shelf").onclick = () => gate(() => { close(); at("shelf"); });
  });
  $("t-undo").onclick = () => Game.undo();
  $("t-reset").onclick = () => { Sound.sfx("tap"); Game.reset(); };
  $("t-hint").onclick = () => {
    if (Game.done) return;
    if (B.hints <= 0) { const m = modal(`<h3>No hints left</h3><p>Earn one every ${CF.hintEveryStars} stars, or watch a short video.</p><div class="acts"><button class="peg go wide" id="h-ad">▶ +2 hints</button><button class="peg wide" id="h-x">Not now</button></div>`); m.querySelector("#h-ad").onclick = () => Ads.showRewarded().then(ok => { if (ok) { B.hints += 2; keep(); $("t-hints").textContent = B.hints; } close(); }); m.querySelector("#h-x").onclick = close; return; }
    const h = Game.hint(); if (h) { B.hints--; keep(); $("t-hints").textContent = B.hints; }
  };
  function pause() {
    Game.pause(); Sound.muffle(true);
    const m = modal(`<h3>Lid closed</h3><div class="acts"><button class="peg go wide" id="p-go">Keep sliding</button><button class="peg" id="p-re">Reset</button><button class="peg" id="p-shelf">Shelf</button></div>`);
    m.querySelector("#p-go").onclick = () => { close(); Game.resume(); Sound.muffle(false); };
    m.querySelector("#p-re").onclick = () => { close(); Game.resume(); Game.reset(); };
    m.querySelector("#p-shelf").onclick = () => { close(); Game.resume(); Sound.muffle(false); at("shelf"); };
  }
  $("t-back").onclick = pause;
  Game.on("pauseKey", () => { if ($("modal").hidden && document.body.dataset.at === "table") pause(); });
  function woods() {
    const m = modal(`<h3>Wood</h3><p>${total()} stars</p><div class="woods">${CF.woods.map(w => `<button data-w="${w.id}" class="${B.wood === w.id ? "on" : ""}" ${total() < w.wins ? "disabled" : ""} style="--b:${w.board};--r:${w.rim}"><i></i><span>${w.name}${total() < w.wins ? " · " + w.wins + "★" : ""}</span></button>`).join("")}</div><button class="peg go" id="wd-x">Done</button>`);
    m.querySelector(".woods").onclick = e => { const b = e.target.closest("[data-w]"); if (!b || b.disabled) return; B.wood = b.dataset.w; keep(); wood(); Sound.sfx("tap"); woods(); };
    m.querySelector("#wd-x").onclick = close;
  }
  function settings() {
    const m = modal(`<h3>Settings</h3><button class="opt" id="o-s">Sounds <b>${B.sfx ? "on" : "off"}</b></button><button class="opt" id="o-m">Lullaby <b>${B.music ? "on" : "off"}</b></button><button class="opt" id="o-r">Reset progress <b>—</b></button><button class="peg go" id="o-x">Done</button>`);
    m.querySelector("#o-s").onclick = e => { B.sfx = !B.sfx; Sound.setSfx(B.sfx); e.currentTarget.querySelector("b").textContent = B.sfx ? "on" : "off"; keep(); };
    m.querySelector("#o-m").onclick = e => { B.music = !B.music; Sound.setMusic(B.music); e.currentTarget.querySelector("b").textContent = B.music ? "on" : "off"; keep(); };
    m.querySelector("#o-r").onclick = e => { const b = e.currentTarget.querySelector("b"); if (b.textContent !== "sure?") { b.textContent = "sure?"; return; } B = fresh(); keep(); wood(); b.textContent = "done"; shelf(); };
    m.querySelector("#o-x").onclick = close;
  }
  $("tagline").textContent = CF.tagline; document.title = CF.title;
  Sound.setSfx(B.sfx); Sound.setMusic(B.music); wood();
  document.addEventListener("pointerdown", () => Sound.unlock());
  $("s-wood").onclick = () => { Sound.sfx("tap"); woods(); };
  $("s-settings").onclick = () => { Sound.sfx("tap"); settings(); };
  document.addEventListener("visibilitychange", () => { if (document.hidden && document.body.dataset.at === "table" && $("modal").hidden && !Game.done) pause(); });
  at("shelf");
  return { play, get box() { return B; } };
})();

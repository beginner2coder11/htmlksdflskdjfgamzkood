/* PIXEL LOGIC — studio (books of prints), press HUD, modes, hints, reveals, saves. */
window.UI = (() => {
  const CF = window.GAME_CONFIG, $ = id => document.getElementById(id);
  const KEY = CF.storagePrefix + "portfolio";
  const fresh = () => ({ done: {}, best: {}, hints: CF.hints, earned: 0, plays: 0, sfx: true, music: true });
  let P = fresh();
  try { P = Object.assign(fresh(), JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) {}
  const keep = () => { try { localStorage.setItem(KEY, JSON.stringify(P)); } catch (e) {} };
  const all = CF.books.flatMap((b, bi) => b.pics.map((p, pi) => ({ ...p, book: b.name, id: `${bi}-${pi}` })));
  const doneCount = () => Object.keys(P.done).length;
  const firstOpen = () => all.findIndex(p => !P.done[p.id]);
  const fmt = s => Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
  let current = -1;

  // two-ink thumbnail of a picture, slightly misregistered like a riso print
  function thumb(p, size = 64) {
    const c = document.createElement("canvas"), n = p.p.length, k = Math.max(1, Math.floor(size / n)); c.width = c.height = n * k + 2; const x = c.getContext("2d");
    x.globalCompositeOperation = "multiply";
    [[CF.inks.b, 0, 0], [CF.inks.a, 1.5, 1]].forEach(([col, dx, dy]) => { x.fillStyle = col; x.globalAlpha = col === CF.inks.a ? 0.75 : 1; p.p.forEach((row, r) => [...row].forEach((ch, cc) => { if (ch === "#") x.fillRect(cc * k + dx, r * k + dy, k, k); })); });
    return c;
  }
  function at(v) { document.body.dataset.at = v; if (v === "studio") studio(); }
  function modal(html) { const m = $("modal"); m.innerHTML = `<div class="card">${html}</div>`; m.hidden = false; return m.firstElementChild; }
  function close() { $("modal").hidden = true; $("modal").innerHTML = ""; }
  function studio() {
    $("m-count").textContent = doneCount(); const open = firstOpen();
    $("books").innerHTML = CF.books.map((b, bi) => { const ids = b.pics.map((_, pi) => `${bi}-${pi}`), got = ids.filter(i => P.done[i]).length; return `<div class="book"><h3>${b.name.toUpperCase()}<small>${got}/${b.pics.length} · ${b.pics[0].p.length}×${b.pics[0].p.length}</small></h3><div class="prints">${b.pics.map((p, pi) => { const idx = all.findIndex(x => x.id === `${bi}-${pi}`), d = P.done[`${bi}-${pi}`]; const locked = !d && idx > open + 2 && open >= 0; return `<button class="print ${d ? "" : "locked"} ${idx === open ? "next" : ""}" data-i="${idx}" ${locked ? "disabled" : ""}>${d ? "<span class='th'></span><small>" + p.n.toUpperCase() + "</small>" : "<b>?</b><small>NO. " + (idx + 1) + "</small>"}</button>`; }).join("")}</div></div>`; }).join("");
    $("books").querySelectorAll(".print").forEach(b => { const p = all[+b.dataset.i], th = b.querySelector(".th"); if (th) th.replaceWith(thumb(p)); });
  }
  $("books").addEventListener("click", e => { const b = e.target.closest("[data-i]"); if (b && !b.disabled) { Sound.sfx("tap"); play(+b.dataset.i); } });

  function play(i) { close(); current = i; at("press"); const p = all[i]; Game.load(p); Game.setMode(1); $("p-book").textContent = p.book.toUpperCase(); $("p-name").textContent = "NO. " + (i + 1); $("p-hints").textContent = P.hints; Sound.muffle(false); $("puzzle").classList.remove("printed"); }
  Game.on("hud", () => { $("p-time").textContent = fmt(Game.time); $("p-fill").textContent = `${Game.filled}/${Game.target}`; });
  Game.on("mode", m => document.querySelectorAll(".modes button").forEach(b => b.classList.toggle("on", +b.dataset.m === m)));
  document.querySelector(".modes").addEventListener("click", e => { const b = e.target.closest("[data-m]"); if (b) { Game.setMode(+b.dataset.m); Sound.sfx("tap"); } });
  Game.on("won", r => {
    const p = all[current], first = !P.done[p.id]; P.done[p.id] = 1; P.plays++; if (!P.best[p.id] || r.time < P.best[p.id]) P.best[p.id] = r.time;
    const add = Math.floor(doneCount() / CF.hintEvery) - P.earned; if (add > 0) { P.hints += add; P.earned += add; } keep();
    const m = modal(`<h3>${r.name.toUpperCase()}</h3><span class="th"></span><p>PRINTED IN ${fmt(r.time)}${first ? "" : " · BEST " + fmt(P.best[p.id])}${add > 0 ? " · +1 HINT" : ""}</p>
      <div class="acts"><button class="ink" id="w-studio">STUDIO</button><button class="ink solid" id="w-next">NEXT →</button></div>`);
    m.querySelector(".th").replaceWith(thumb(p, 180));
    const nxt = all.findIndex((x, k) => k > current && !P.done[x.id]), go = nxt >= 0 ? nxt : Math.min(all.length - 1, current + 1);
    const gate = fn => (P.plays % CF.ads.interstitialEvery === 0 ? Ads.showInterstitial() : Promise.resolve()).then(fn);
    m.querySelector("#w-next").onclick = () => gate(() => play(go));
    m.querySelector("#w-studio").onclick = () => gate(() => { close(); at("studio"); });
  });
  $("p-undo").onclick = () => Game.undo();
  $("p-hint").onclick = () => {
    if (Game.done) return;
    if (P.hints <= 0) { const m = modal(`<h3>OUT OF HINTS</h3><p>+1 every ${CF.hintEvery} prints, or watch a video.</p><div class="acts"><button class="ink solid wide" id="h-ad">▶ +2 HINTS</button><button class="ink wide" id="h-check">CHECK MY GRID (${Game.mistakes()} WRONG)</button><button class="ink wide" id="h-x">CLOSE</button></div>`); m.querySelector("#h-ad").onclick = () => Ads.showRewarded().then(ok => { if (ok) { P.hints += 2; keep(); $("p-hints").textContent = P.hints; } close(); }); m.querySelector("#h-check").onclick = close; m.querySelector("#h-x").onclick = close; return; }
    if (Game.hint()) { P.hints--; keep(); $("p-hints").textContent = P.hints; }
  };
  function pause() {
    Game.pause(); Sound.muffle(true);
    const m = modal(`<h3>PAUSED</h3><p>${Game.mistakes() ? Game.mistakes() + " SQUARES DON'T MATCH THE PICTURE" : "NO MISTAKES SO FAR"}</p><div class="acts"><button class="ink solid wide" id="z-go">RESUME</button><button class="ink" id="z-re">RESTART</button><button class="ink" id="z-studio">STUDIO</button></div>`);
    m.querySelector("#z-go").onclick = () => { close(); Game.resume(); Sound.muffle(false); };
    m.querySelector("#z-re").onclick = () => play(current);
    m.querySelector("#z-studio").onclick = () => { close(); Game.stop(); Sound.muffle(false); at("studio"); };
  }
  $("p-back").onclick = pause;
  Game.on("pauseKey", () => { if ($("modal").hidden && document.body.dataset.at === "press") pause(); });
  function settings() {
    const m = modal(`<h3>SETTINGS</h3><button class="opt" id="o-s">SOUND <b>${P.sfx ? "ON" : "OFF"}</b></button><button class="opt" id="o-m">VIBRAPHONE <b>${P.music ? "ON" : "OFF"}</b></button><button class="opt" id="o-r">CLEAR PORTFOLIO <b>—</b></button><button class="ink solid" id="o-x">DONE</button>`);
    m.querySelector("#o-s").onclick = e => { P.sfx = !P.sfx; Sound.setSfx(P.sfx); e.currentTarget.querySelector("b").textContent = P.sfx ? "ON" : "OFF"; keep(); };
    m.querySelector("#o-m").onclick = e => { P.music = !P.music; Sound.setMusic(P.music); e.currentTarget.querySelector("b").textContent = P.music ? "ON" : "OFF"; keep(); };
    m.querySelector("#o-r").onclick = e => { const b = e.currentTarget.querySelector("b"); if (b.textContent !== "SURE?") { b.textContent = "SURE?"; return; } P = fresh(); keep(); b.textContent = "DONE"; studio(); };
    m.querySelector("#o-x").onclick = close;
  }
  $("tagline").textContent = CF.tagline; document.title = CF.title;
  Sound.setSfx(P.sfx); Sound.setMusic(P.music);
  document.addEventListener("pointerdown", () => Sound.unlock());
  $("m-settings").onclick = () => { Sound.sfx("tap"); settings(); };
  document.addEventListener("visibilitychange", () => { if (document.hidden && document.body.dataset.at === "press" && $("modal").hidden && !Game.done) pause(); });
  at("studio");
  return { play, get portfolio() { return P; } };
})();

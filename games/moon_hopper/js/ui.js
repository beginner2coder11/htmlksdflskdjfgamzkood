/* MOON HOPPER — mission control screen, missions, controls, telemetry reports, saves. */
window.UI = (() => {
  const CF = window.GAME_CONFIG, $ = id => document.getElementById(id);
  const KEY = CF.storagePrefix + "log";
  const fresh = () => ({ stars: {}, landings: 0, bestHops: 0, plays: 0, sfx: true, music: true });
  let L = fresh();
  try { L = Object.assign(fresh(), JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) {}
  const keep = () => { try { localStorage.setItem(KEY, JSON.stringify(L)); } catch (e) {} };
  const next = () => Math.min(CF.missions.length - 1, Object.keys(L.stars).length);
  let refuelled = false;

  function at(v) { document.body.dataset.at = v; if (v === "control") control(); }
  function modal(html) { const m = $("modal"); m.innerHTML = `<div class="tele">${html}</div>`; m.hidden = false; Sound.sfx("type"); return m.firstElementChild; }
  function close() { $("modal").hidden = true; $("modal").innerHTML = ""; }
  function control() {
    $("c-land").textContent = L.landings; $("c-stars").textContent = Object.values(L.stars).reduce((a, b) => a + b, 0); $("c-hops").textContent = L.bestHops;
    const n = next();
    $("missions").innerHTML = CF.missions.map((m, i) => `<button class="ms ${i === n ? "next" : ""}" data-i="${i}" ${i > n ? "disabled" : ""}><b>${m.name}<i>${"★".repeat(L.stars[i] || 0)}</i></b><small>${m.body} · g ${m.gravity}${m.wind ? " · wind " + m.wind : ""}</small></button>`).join("");
  }
  setInterval(() => { const d = new Date(); $("c-clock").textContent = [d.getHours(), d.getMinutes(), d.getSeconds()].map(v => String(v).padStart(2, "0")).join(":"); }, 1000);
  $("missions").addEventListener("click", e => { const b = e.target.closest("[data-i]"); if (b && !b.disabled) { Sound.sfx("tap"); brief(+b.dataset.i); } });
  function brief(i) {
    const m = CF.missions[i];
    const c = modal(`<h3>${m.name} BRIEFING</h3><p>TARGET: ${m.body}<br>GRAVITY: ${m.gravity} M/S²<br>WIND: ${m.wind || "NONE"}<br>FUEL: ${m.fuel}%<br>PADS: ${m.pads.map(p => "×" + p).join(" ")}</p><p>LAND ON A PAD BELOW ${CF.landing.maxV} M/S DOWN, ${CF.landing.maxH} M/S SIDEWAYS, NEARLY LEVEL. HIGHER × PADS SCORE MORE.</p><div class="acts"><button class="key" id="b-x">ABORT</button><button class="key go" id="b-go">LAUNCH</button></div>`);
    c.querySelector("#b-x").onclick = close; c.querySelector("#b-go").onclick = () => fly("mission", i);
  }
  function fly(mode, i) { close(); refuelled = false; at("fly"); Game.start(mode, i); $("h-title").textContent = mode === "free" ? "FREE FLIGHT" : CF.missions[i].name; Sound.muffle(false); }

  // hold-to-act console keys (multi-touch)
  const held = new Map();
  const set = (el, on) => { if (!el) return; el.classList.toggle("on", on); Game.key(el.dataset.k, on); };
  document.querySelector(".controls").addEventListener("pointerdown", e => { const b = e.target.closest("[data-k]"); if (!b) return; e.preventDefault(); held.set(e.pointerId, b); set(b, true); });
  const lift = e => { const b = held.get(e.pointerId); if (b) { set(b, false); held.delete(e.pointerId); } };
  document.addEventListener("pointerup", lift); document.addEventListener("pointercancel", lift);

  Game.on("landed", r => {
    L.plays++; L.landings++; L.stars[r.mission] = Math.max(L.stars[r.mission] || 0, r.stars); keep();
    const c = modal(`<h3>THE EAGLE HAS LANDED</h3><div class="stars">${[0, 1, 2].map(k => `<span class="${k < r.stars ? "" : "off"}">★</span>`).join("")}</div><p>PAD ×${r.mult}<br>FUEL LEFT ${r.fuel.toFixed(0)}%<br>SCORE ${r.score}</p>
      <div class="acts"><button class="key" id="l-ctrl">CONTROL</button><button class="key go" id="l-next">NEXT MISSION</button></div>`);
    for (let k = 0; k < r.stars; k++) setTimeout(() => Sound.sfx("star", k), 300 + k * 250);
    const gate = fn => (L.plays % CF.ads.interstitialEvery === 0 ? Ads.showInterstitial() : Promise.resolve()).then(fn);
    c.querySelector("#l-ctrl").onclick = () => gate(() => { close(); Game.quit(); at("control"); });
    c.querySelector("#l-next").onclick = () => gate(() => brief(Math.min(CF.missions.length - 1, r.mission + 1)));
  });
  Game.on("crashed", r => {
    L.plays++; if (r.mode === "free") L.bestHops = Math.max(L.bestHops, r.hops); keep();
    const c = modal(`<h3 class="bad">SIGNAL LOST</h3><p>CAUSE: ${r.why}${r.mode === "free" ? `<br>HOPS ${r.hops} · SCORE ${r.score}` : ""}</p>
      <div class="acts"><button class="key" id="x-ctrl">CONTROL</button><button class="key go" id="x-retry">RETRY</button></div>`);
    const gate = fn => (L.plays % CF.ads.interstitialEvery === 0 ? Ads.showInterstitial() : Promise.resolve()).then(fn);
    c.querySelector("#x-ctrl").onclick = () => gate(() => { close(); Game.quit(); at("control"); });
    c.querySelector("#x-retry").onclick = () => gate(() => fly(r.mode, r.mission));
  });
  function pause() {
    if (Game.state !== "fly") return; Game.pause(); Sound.muffle(true);
    const c = modal(`<h3>HOLD</h3><p>FUEL ${Game.ship.fuel.toFixed(0)}%</p><div class="acts">${refuelled ? "" : `<button class="key go wide" id="p-fuel">▶ AD · +40% FUEL</button>`}<button class="key" id="p-go">RESUME</button><button class="key" id="p-ctrl">CONTROL</button></div>`);
    const f = c.querySelector("#p-fuel"); if (f) f.onclick = () => Ads.showRewarded().then(ok => { if (ok) { refuelled = true; Game.refuel(); } close(); Game.resume(); Sound.muffle(false); });
    c.querySelector("#p-go").onclick = () => { close(); Game.resume(); Sound.muffle(false); };
    c.querySelector("#p-ctrl").onclick = () => { close(); Game.quit(); Sound.muffle(false); at("control"); };
  }
  $("h-pause").onclick = pause;
  Game.on("pauseKey", () => { if ($("modal").hidden && document.body.dataset.at === "fly") pause(); });
  function settings() {
    const c = modal(`<h3>SETTINGS</h3><button class="opt" id="o-s">SOUND <b>${L.sfx ? "ON" : "OFF"}</b></button><button class="opt" id="o-m">SPACE DRONE <b>${L.music ? "ON" : "OFF"}</b></button><button class="opt" id="o-r">WIPE MISSION LOG <b>—</b></button><button class="key go" id="o-x">DONE</button>`);
    c.querySelector("#o-s").onclick = e => { L.sfx = !L.sfx; Sound.setSfx(L.sfx); e.currentTarget.querySelector("b").textContent = L.sfx ? "ON" : "OFF"; keep(); };
    c.querySelector("#o-m").onclick = e => { L.music = !L.music; Sound.setMusic(L.music); e.currentTarget.querySelector("b").textContent = L.music ? "ON" : "OFF"; keep(); };
    c.querySelector("#o-r").onclick = e => { const b = e.currentTarget.querySelector("b"); if (b.textContent !== "SURE?") { b.textContent = "SURE?"; return; } L = fresh(); keep(); b.textContent = "DONE"; control(); };
    c.querySelector("#o-x").onclick = close;
  }
  $("tagline").textContent = CF.tagline; document.title = CF.title;
  Sound.setSfx(L.sfx); Sound.setMusic(L.music);
  document.addEventListener("pointerdown", () => Sound.unlock());
  $("c-free").onclick = () => { Sound.sfx("tap"); fly("free", 0); };
  $("c-settings").onclick = () => { Sound.sfx("tap"); settings(); };
  document.addEventListener("visibilitychange", () => { if (document.hidden && document.body.dataset.at === "fly" && $("modal").hidden) pause(); });
  at("control");
  return { fly, get log() { return L; } };
})();

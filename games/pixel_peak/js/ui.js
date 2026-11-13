/* PIXEL PEAK — handheld buttons (touch + keyboard), saves, ads, LED, sound toggles. */
(() => {
  const CF = window.GAME_CONFIG, KEY = CF.storagePrefix + "cart";
  let S = { unlocked: 1, stars: {}, sfx: true, music: true, plays: 0 };
  try { S = Object.assign(S, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) {}
  const keep = () => { try { S.unlocked = Game.unlocked; S.stars = Game.stars; localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
  Game.load(S); Sound.setSfx(S.sfx); Sound.setMusic(S.music);

  // on-screen buttons: multi-touch, slide between d-pad arrows
  const held = new Map();
  const btnAt = (x, y) => { const el = document.elementFromPoint(x, y); return el && el.closest("[data-k]"); };
  function set(el, on) { if (!el) return; el.classList.toggle("on", on); Game.press(el.dataset.k, on); if (on && navigator.vibrate) try { navigator.vibrate(8); } catch (e) {} }
  document.addEventListener("pointerdown", e => { const b = btnAt(e.clientX, e.clientY); if (!b) return; e.preventDefault(); held.set(e.pointerId, b); set(b, true); });
  document.addEventListener("pointermove", e => { if (!held.has(e.pointerId)) return; const b = btnAt(e.clientX, e.clientY), old = held.get(e.pointerId); if (b && b !== old && b.closest(".dpad")) { set(old, false); held.set(e.pointerId, b); set(b, true); } });
  const up = e => { const b = held.get(e.pointerId); if (b) { set(b, false); held.delete(e.pointerId); } };
  document.addEventListener("pointerup", up); document.addEventListener("pointercancel", up);
  // tapping the screen itself works like A (handy on menus)
  document.getElementById("screen").addEventListener("pointerdown", () => { if (Game.mode !== "play") { Game.press("a", true); Game.press("a", false); } });
  const KM = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down", a: "left", d: "right", w: "up", s: "down", z: "a", " ": "a", x: "b", Enter: "start", Escape: "start", Shift: "select" };
  addEventListener("keydown", e => { const k = KM[e.key]; if (!k || e.repeat) return; e.preventDefault(); const el = document.querySelector(`[data-k="${k}"]`); if (el) el.classList.add("on"); Game.press(k, true); });
  addEventListener("keyup", e => { const k = KM[e.key]; if (!k) return; const el = document.querySelector(`[data-k="${k}"]`); if (el) el.classList.remove("on"); Game.press(k, false); });

  Game.on("clear", () => { S.plays++; keep(); });
  Game.on("next", which => (S.plays % CF.ads.interstitialEvery === 0 ? Ads.showInterstitial() : Promise.resolve()).then(() => which === "next" ? Game.nextLevel() : Game.toMap()));
  Game.on("over", () => { S.plays++; keep(); });
  Game.on("overChoice", c => {
    if (c === "continue") Ads.showRewarded().then(ok => ok ? Game.continueRun() : null);
    if (c === "retry") (S.plays % CF.ads.interstitialEvery === 0 ? Ads.showInterstitial() : Promise.resolve()).then(() => Game.startLevel(Game.level));
    if (c === "map") Game.toMap();
  });
  Game.on("pause", () => Sound.muffle(true)); Game.on("resume", () => Sound.muffle(false));
  Game.on("shake", () => { document.body.classList.remove("shake"); void document.body.offsetWidth; document.body.classList.add("shake"); });
  setInterval(() => document.getElementById("led").classList.toggle("low", Game.mode === "play" && Game.hearts === 1), 300);
  const ob = (id, k, fn) => { const b = document.getElementById(id); b.classList.toggle("off", !S[k]); b.onclick = () => { S[k] = !S[k]; fn(S[k]); b.classList.toggle("off", !S[k]); keep(); }; };
  ob("o-sound", "sfx", v => Sound.setSfx(v)); ob("o-music", "music", v => Sound.setMusic(v));
  document.addEventListener("visibilitychange", () => { if (document.hidden) Game.pauseExternal(); });
  window.UI = { get save() { return S; } };
})();

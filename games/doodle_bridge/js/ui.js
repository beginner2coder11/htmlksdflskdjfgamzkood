/* DOODLE BRIDGE — screens, HUD, saves, win/fail, style shop, daily gift */
window.UI = (() => {
  const C = window.GAME_CONFIG, P = C.storagePrefix, $ = q => document.querySelector(q);
  const fresh = () => ({ coins: 0, stars: {}, owned: ["beanie", "pencil"], skin: "beanie", pen: "pencil", wins: 0, daily: { last: "", streak: 0 }, tips: {} });
  let S = fresh();
  try { const r = localStorage.getItem(P + "save"); if (r) S = Object.assign(fresh(), JSON.parse(r)); } catch (e) {}
  const save = () => { try { localStorage.setItem(P + "save", JSON.stringify(S)); } catch (e) {} };
  const totalStars = () => Object.values(S.stars).reduce((a, b) => a + b, 0);
  const worldOpen = w => totalStars() >= C.unlock[w];
  const levelOpen = i => i % 8 === 0 ? worldOpen(Math.floor(i / 8)) : (S.stars[i - 1] || 0) > 0 && worldOpen(Math.floor(i / 8));
  const coinTag = n => `<i class="coin"></i>${n}`;
  const at = s => { document.body.dataset.at = s; };

  function coins() { document.querySelectorAll("[data-coins]").forEach(e => e.textContent = S.coins); }
  let toastT = 0;
  function toast(m) { const t = $("#toast"); t.hidden = false; t.textContent = m; t.style.animation = "none"; void t.offsetWidth; t.style.animation = ""; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 2600); }

  /* ---------- HUD ---------- */
  Game.on.ink = (used, max) => {
    const L = Game.L; if (!L) return;
    $("#ink-fill").style.width = Math.max(0, (1 - used / max) * 100).toFixed(1) + "%";
    $("#m3").style.left = (100 - L.stars[0] / max * 100) + "%"; $("#m2").style.left = (100 - L.stars[1] / max * 100) + "%";
    const st = used <= L.stars[0] + 0.5 ? 3 : used <= L.stars[1] + 0.5 ? 2 : 1;
    document.querySelectorAll("#ink-stars i").forEach((el, i) => el.classList.toggle("off", i >= st));
    if (used > 0) $("#tip").hidden = true;
    $("#b-undo").disabled = !Game.strokes.length; $("#b-clear").disabled = !Game.strokes.length;
    $("#b-go").classList.toggle("pulse", Game.mode === "edit" && Game.strokes.length > 0);
  };
  Game.on.mode = m => {
    const go = $("#b-go");
    go.classList.toggle("running", m !== "edit"); $("#go-label").textContent = m === "edit" ? "GO" : "Retry";
    $("#b-retry").classList.remove("pulse");
  };
  Game.on.noInk = () => toast("Out of ink! Undo a line or clear and try again.");
  Game.on.stuck = () => { $("#b-retry").classList.add("pulse"); toast("Stuck? Tap Retry to tweak your lines."); };
  Game.on.win = r => setTimeout(() => win(r), 700);
  Game.on.fail = why => fail(why);

  function startLevel(i) {
    Game.play(i); at("play");
    $("#l-num").textContent = `${Math.floor(i / 8) + 1}-${i % 8 + 1}`; $("#l-name").textContent = C.levels[i].name;
    const tip = C.levels[i].tip; $("#tip").hidden = !tip; $("#tip").textContent = tip || "";
    coins(); Game.on.ink(0, C.levels[i].ink);
  }
  $("#b-go").onclick = () => { Sound.unlock(); if (Game.mode === "edit") Game.go(); else { Sound.play("tap"); Game.retry(); } };
  $("#b-undo").onclick = () => Game.undo();
  $("#b-clear").onclick = () => Game.clear();
  $("#b-retry").onclick = () => { Sound.play("tap"); Game.retry(); };
  $("#b-hint").onclick = () => hint();
  $("#b-levels").onclick = () => { Sound.play("tap"); levels(); };

  /* ---------- sheets ---------- */
  const wrap = $("#wrap"), sheet = $("#sheet");
  function open(html, closable = true) { sheet.innerHTML = (closable ? `<button class="x" data-close>✕</button>` : "") + html; wrap.hidden = false; sheet.querySelectorAll("[data-close]").forEach(b => b.onclick = close); }
  function close() { wrap.hidden = true; sheet.innerHTML = ""; }

  function hint() {
    const L = Game.L; if (!L) return;
    if (!L.sol.length) { open(`<h2>Hint</h2><p class="sub">This one needs no ink at all. Press GO and watch what the kid pushes…</p><div class="stack"><button class="btn" data-close>Got it</button></div>`); return; }
    open(`<h2>Need a hint?</h2><p class="sub">See a bridge that works for a few seconds.</p>
      <div class="stack"><button class="btn alt" id="h-ad">Show hint <span class="ad">AD</span></button><button class="btn gold" id="h-coin" ${S.coins >= C.hintPrice ? "" : "disabled"}>Show hint · ${coinTag(C.hintPrice)}</button></div>`);
    $("#h-ad").onclick = async () => { const ok = await Ads.showRewarded(); close(); if (ok) Game.hint(4.5); };
    $("#h-coin").onclick = () => { S.coins -= C.hintPrice; save(); coins(); close(); Game.hint(4.5); };
  }

  function win(r) {
    const i = r.level, old = S.stars[i] || 0, first = !old;
    let earned = (first ? C.coins.clear : 0) + Math.max(0, r.stars - old) * C.coins.perStar;
    S.stars[i] = Math.max(old, r.stars); S.coins += earned; S.wins++; save(); coins();
    const hasNext = i + 1 < C.levels.length, nextOpen = hasNext && levelOpen(i + 1);
    let doubled = false;
    open(`<h2>${r.stars === 3 ? "Perfect!" : r.stars === 2 ? "Great job!" : "You made it!"}</h2>
      <div class="bigstars"><i class="star"></i><i class="star"></i><i class="star"></i></div>
      <p class="sub">Ink used: ${r.ink} · ★★★ at ${C.levels[i].stars[0]} or less</p>
      <p class="earn">+<span id="w-c">${earned}</span> <i class="coin"></i></p>
      <div class="stack">
        ${earned > 0 ? `<button class="btn alt" id="w-dbl">Double coins <span class="ad">AD</span></button>` : ""}
        <div class="row2"><button class="btn white" id="w-again">Replay</button>${nextOpen ? `<button class="btn alt2" id="w-next">Next ›</button>` : `<button class="btn alt2" id="w-lv">Levels</button>`}</div>
        ${hasNext && !nextOpen ? `<p class="note">Collect ${C.unlock[Math.floor((i + 1) / 8)]} stars to open the next world.</p>` : ""}
      </div>`, false);
    const stars = sheet.querySelectorAll(".bigstars .star");
    stars.forEach((s, k) => setTimeout(() => { s.classList.add("pop"); if (k < r.stars) { s.classList.add("on"); Sound.play("star", k); } }, 350 + k * 320));
    const dbl = $("#w-dbl");
    if (dbl) dbl.onclick = async () => { if (doubled) return; dbl.disabled = true; const ok = await Ads.showRewarded(); if (ok) { doubled = true; S.coins += earned; save(); coins(); $("#w-c").textContent = earned * 2; Sound.play("coin"); } else dbl.disabled = false; };
    $("#w-again").onclick = () => { close(); startLevel(i); };
    const nx = $("#w-next"); if (nx) nx.onclick = async () => { close(); if (C.ads.interstitialEvery > 0 && S.wins % C.ads.interstitialEvery === 0) await Ads.showInterstitial(); startLevel(i + 1); };
    const lv = $("#w-lv"); if (lv) lv.onclick = () => { close(); levels(); };
  }
  function fail(why) {
    open(`<h2>Oops!</h2><p class="sub">${why === "spikes" ? "Ouch, spikes! Keep the kid away from them." : "The kid fell. Try a sturdier or longer bridge."}</p>
      <div class="stack"><button class="btn alt2" id="f-edit">Fix my lines</button><div class="row2"><button class="btn white" id="f-fresh">Start fresh</button><button class="btn gold" id="f-hint">Hint</button></div></div>`, false);
    $("#f-edit").onclick = () => { close(); Game.retry(); };
    $("#f-fresh").onclick = () => { close(); Game.reset(); };
    $("#f-hint").onclick = () => { close(); Game.retry(); hint(); };
  }

  /* ---------- level select ---------- */
  function levels() {
    close(); at("levels"); Game.startDemo(); coins();
    $("#lv-total").textContent = totalStars(); $("#lv-max").textContent = C.levels.length * 3;
    const box = $("#worlds"); box.innerHTML = "";
    const firstOpenNotDone = C.levels.findIndex((_, i) => levelOpen(i) && !S.stars[i]);
    C.worlds.forEach((w, wi) => {
      const open_ = worldOpen(wi), el = document.createElement("div");
      el.className = "world" + (open_ ? "" : " locked");
      el.style.background = `linear-gradient(160deg, ${w.sky[0]}, ${w.city[0]})`;
      const got = C.levels.slice(wi * 8, wi * 8 + 8).reduce((a, _, j) => a + (S.stars[wi * 8 + j] || 0), 0);
      el.innerHTML = `<h3>${w.name}<small>★ ${got}/24</small></h3>` + (open_ ? `<div class="lgrid"></div>` : `<div class="lockmsg">Collect ${C.unlock[wi]} ★ to open<br><small>You have ${totalStars()}</small></div>`);
      const g = el.querySelector(".lgrid");
      if (g) for (let j = 0; j < 8; j++) {
        const i = wi * 8 + j, ok = levelOpen(i), st = S.stars[i] || 0, b = document.createElement("button");
        b.className = "lbtn" + (ok ? "" : " lock") + (i === firstOpenNotDone ? " next" : "");
        b.innerHTML = ok ? `${j + 1}<span class="st">${[0, 1, 2].map(q => `<i class="star ${q < st ? "on" : ""}"></i>`).join("")}</span>` : "🔒";
        if (ok) b.onclick = () => { Sound.unlock(); Sound.play("tap"); startLevel(i); };
        g.appendChild(b);
      }
      box.appendChild(el);
    });
  }

  /* ---------- style shop ---------- */
  function style(tab = "skins") {
    const list = tab === "skins" ? C.skins : C.pens;
    open(`<h2>Style</h2><p class="sub">You have ${coinTag(S.coins)}</p>
      <div class="tabs"><button class="tab ${tab === "skins" ? "on" : ""}" data-t="skins">Outfits</button><button class="tab ${tab === "pens" ? "on" : ""}" data-t="pens">Pens</button></div><div class="grid" id="sg"></div>`);
    sheet.querySelectorAll("[data-t]").forEach(b => b.onclick = () => style(b.dataset.t));
    list.forEach(it => {
      const own = S.owned.includes(it.id), on = (tab === "skins" ? S.skin : S.pen) === it.id, can = S.coins >= it.price;
      const c = document.createElement("button"); c.className = "card" + (on ? " on" : "") + (!own && !can ? " cant" : "");
      const cv = document.createElement("canvas"), dpr = Math.min(2, devicePixelRatio || 1); cv.width = cv.height = 76 * dpr; cv.style.width = cv.style.height = "76px";
      const g = cv.getContext("2d"); g.scale(dpr, dpr);
      if (tab === "skins") { g.translate(38, 70); g.scale(1.45, 1.45); Game.kidArt(g, it, { mood: on ? "happy" : "", t: 0 }); }
      else penSample(g, it);
      c.appendChild(cv);
      c.insertAdjacentHTML("beforeend", `<b>${it.name}</b><small>${on ? "Using" : own ? "Use" : coinTag(it.price)}</small>`);
      c.onclick = () => {
        if (!own) { if (!can) { toast(`You need ${it.price - S.coins} more coins`); return; } S.coins -= it.price; S.owned.push(it.id); Sound.play("coin"); }
        else Sound.play("tap");
        if (tab === "skins") { S.skin = it.id; Game.setSkin(it.id); } else { S.pen = it.id; Game.setPen(it.id); }
        save(); coins(); style(tab);
      };
      $("#sg").appendChild(c);
    });
  }
  function penSample(g, p) {
    const pts = [[10, 50], [24, 34], [40, 42], [56, 26], [68, 30]];
    const path = () => { g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); };
    g.lineCap = "round"; g.lineJoin = "round";
    g.strokeStyle = "#2e2a40"; g.lineWidth = 15; path(); g.stroke();
    if (p.rainbow) { for (let i = 1; i < pts.length; i++) { g.strokeStyle = `hsl(${i * 70},90%,60%)`; g.lineWidth = 10; g.beginPath(); g.moveTo(...pts[i - 1]); g.lineTo(...pts[i]); g.stroke(); } }
    else { if (p.glow) { g.shadowColor = p.a; g.shadowBlur = 12; } g.strokeStyle = p.a; g.lineWidth = 10; path(); g.stroke(); g.shadowBlur = 0; if (p.stripe) { g.setLineDash([7, 7]); g.strokeStyle = p.b; g.lineWidth = 7; path(); g.stroke(); g.setLineDash([]); } }
  }

  /* ---------- daily gift & settings ---------- */
  const day = (o = 0) => { const d = new Date(Date.now() + o * 864e5); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); };
  const dailyReady = () => S.daily.last !== day();
  function more() {
    const ready = dailyReady(), cont = S.daily.last === day(-1), next = ready ? (cont ? S.daily.streak % 7 + 1 : 1) : S.daily.streak;
    open(`<h2>Daily gift</h2><p class="sub">Come back every day: the gift grows for 7 days.</p>
      <div class="days">${C.daily.map((g, i) => { const n = i + 1, got = ready ? n < next : n <= next, now = ready && n === next; return `<div class="day ${got ? "got" : ""} ${now ? "now" : ""} ${n === 7 ? "d7" : ""}">Day ${n}<b>${coinTag(g)}</b></div>`; }).join("")}</div>
      <button class="btn gold" id="dl" style="width:100%" ${ready ? "" : "disabled"}>${ready ? "Claim " + C.daily[next - 1] + " coins" : "Come back tomorrow"}</button>
      <div class="row" style="justify-content:center;margin-top:14px"><button class="btn small white" id="sfx">Sound: ${Sound.sfx ? "On" : "Off"}</button><button class="btn small white" id="mus">Music: ${Sound.music ? "On" : "Off"}</button></div>`);
    $("#dl").onclick = () => { const g = C.daily[next - 1]; S.coins += g; S.daily = { last: day(), streak: next }; save(); coins(); Sound.play("coin"); toast(`+${g} coins`); badge(); more(); };
    $("#sfx").onclick = () => { Sound.unlock(); Sound.toggleSfx(); more(); };
    $("#mus").onclick = () => { Sound.unlock(); Sound.toggleMusic(); more(); };
  }
  function badge() { $("#b-daily").hidden = !dailyReady(); }

  /* ---------- title ---------- */
  function title() { close(); at("title"); Game.startDemo(); badge(); }
  $("#tagline").textContent = C.tagline;
  $("#t-play").onclick = () => { Sound.unlock(); Sound.play("tap"); const next = C.levels.findIndex((_, i) => levelOpen(i) && !S.stars[i]); if (!totalStars()) startLevel(0); else levels(); };
  $("#t-style").onclick = () => { Sound.unlock(); Sound.play("tap"); style(); };
  $("#t-more").onclick = () => { Sound.unlock(); Sound.play("tap"); more(); };
  $("#lv-back").onclick = () => { Sound.play("tap"); title(); };
  addEventListener("keydown", e => {
    if (document.body.dataset.at !== "play" || !wrap.hidden) return;
    if (e.key === " " || e.key === "Enter") { e.preventDefault(); $("#b-go").click(); }
    if (e.key === "z" || e.key === "Backspace") Game.undo();
    if (e.key === "r") Game.retry();
  });
  Game.setSkin(S.skin); Game.setPen(S.pen);
  title();

  return { startLevel, levels, title, style, more, hint, state: S, close, levelOpen };
})();

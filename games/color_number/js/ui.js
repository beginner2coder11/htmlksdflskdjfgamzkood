/* COLOR BY NUMBER — gallery (picture of the day, category tabs, cards with progress, locks), painting screen
   (palette with progress rings, boosters, zoom), finished sheet (time-lapse, coins, save picture), booster shop,
   daily gift, settings, how to play. */
window.UI = (() => {
  const C = window.GAME_CONFIG, PR = C.storagePrefix, L = Pictures.LIST, BO = C.boosters;
  const $ = s => document.querySelector(s);
  const wrap = $("#wrap"), sheet = $("#sheet");
  const fresh = () => ({ coins: 0, unlocked: [], prog: {}, done: {}, boosters: Object.fromEntries(Object.entries(BO).map(([k, b]) => [k, b.start])), daily: { last: "", streak: 0 }, dailyPic: {}, wins: 0, howSeen: false, tab: "All" });
  let S = fresh();
  try { S = Object.assign(fresh(), JSON.parse(localStorage.getItem(PR + "save") || "{}")); } catch (e) {}
  const save = () => { try { localStorage.setItem(PR + "save", JSON.stringify(S)); } catch (e) { toast("Storage is full"); } };
  let cur = null;

  /* ---------- helpers ---------- */
  const at = s => { document.body.dataset.at = s; };
  function open(html, x = true) { sheet.innerHTML = (x ? `<button class="x" data-close aria-label="Close">✕</button>` : "") + html; wrap.hidden = false; sheet.querySelectorAll("[data-close]").forEach(b => b.onclick = () => { Sound.play("tap"); close(); }); }
  function close() { wrap.hidden = true; sheet.innerHTML = ""; document.body.classList.remove("body-replay"); }
  let toastT = 0;
  function toast(s) { const t = $("#toast"); t.textContent = s; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 1800); }
  const coin = n => `<span class="price"><i class="coin"></i>${n}</span>`;
  const key = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  const today = () => key(new Date());
  const dayNo = () => Math.floor(new Date(today() + "T00:00:00").getTime() / 864e5);
  const todayPic = () => L[(dayNo() * 7 + 3) % L.length];
  const idx = d => L.indexOf(d);
  const unlocked = d => idx(d) < C.freePictures || S.unlocked.includes(d.id) || d === todayPic() || S.done[d.id] || S.prog[d.id];
  const pct = d => { const p = S.prog[d.id]; if (S.done[d.id]) return 100; if (!p) return 0; const n = Pictures.build(d).n; return Math.floor(p.o.length / 3 / (n * n) * 100); };
  const reward = d => { const n = Pictures.build(d).n; return Math.max(C.coins.min, Math.round(n * n * C.coins.perCell)); };
  function refresh() { document.querySelectorAll("[data-coins]").forEach(e => e.textContent = S.coins); $("#b-gift").hidden = !giftReady(); boostBadges(); }
  function addCoins(n) { S.coins += n; save(); refresh(); }

  /* ---------- gallery ---------- */
  const tabs = ["All", ...Pictures.cats, "My Works"];
  function gallery() {
    const td = todayPic(); Game.thumb(td, S.done[td.id] ? fullProg(td) : S.prog[td.id], $("#today-c"));
    $("#today-name").textContent = td.name;
    $("#today-sub").textContent = S.dailyPic[today()] ? "Done! Come back tomorrow ✓" : S.prog[td.id] ? `${pct(td)}% · tap to keep painting` : `+${C.coins.daily} bonus coins · tap to paint`;
    $("#tabs").innerHTML = tabs.map(t => `<button class="${S.tab === t ? "on" : ""}" data-t="${t}">${t}${t === "My Works" ? ` (${Object.keys(S.done).length})` : ""}</button>`).join("");
    $("#tabs").querySelectorAll("button").forEach(b => b.onclick = () => { Sound.play("tap"); S.tab = b.dataset.t; save(); gallery(); });
    const list = L.filter(d => S.tab === "All" ? true : S.tab === "My Works" ? S.done[d.id] : d.cat === S.tab);
    const box = $("#cards"); box.innerHTML = "";
    if (!list.length) box.innerHTML = `<p class="foot" style="grid-column:1/-1">Finished pictures show up here.</p>`;
    for (const d of list) {
      const b = document.createElement("button"); b.className = "card"; const p = pct(d), open_ = unlocked(d);
      b.innerHTML = `<canvas></canvas><b>${d.name}</b><span class="bar"><i style="width:${p}%"></i></span>` + (S.done[d.id] ? `<span class="done">✓</span>` : "") + (!open_ ? `<span class="lock"><span>🔒 ${idx(d) % 3 === 2 ? "AD" : `<i class="coin"></i>${C.unlockPrice}`}</span></span>` : "") + (d === td && !S.done[d.id] ? `<span class="new">TODAY</span>` : "");
      Game.thumb(d, S.done[d.id] ? fullProg(d) : S.prog[d.id], b.querySelector("canvas"));
      b.onclick = () => { Sound.unlock(); pick(d); };
      box.appendChild(b);
    }
    refresh();
  }
  function fullProg(d) { const n = Pictures.build(d).n; let o = ""; for (let i = 0; i < n * n; i++) o += i.toString(36).padStart(3, "0"); return { o }; }
  function pick(d) {
    if (S.done[d.id]) return finishedMenu(d);
    if (!unlocked(d)) return unlockSheet(d);
    Sound.play("tap"); paintPic(d);
  }
  function unlockSheet(d) {
    Sound.play("tap"); const ad = idx(d) % 3 === 2;
    const c = document.createElement("canvas"); Game.thumb(d, null, c);
    open(`<h2>${d.name}</h2><img class="done-pic" src="${c.toDataURL()}" alt=""><p class="sub">${Pictures.build(d).pal.length} colours · ${Pictures.build(d).n}×${Pictures.build(d).n}</p>
      <div class="stack">${ad ? `<button class="btn blue" id="u-ad">Unlock free <span class="ad">AD</span></button>` : `<button class="btn green" id="u-buy">Unlock for ${coin(C.unlockPrice)}</button><button class="btn blue" id="u-ad">Unlock free <span class="ad">AD</span></button>`}</div>`);
    const done = () => { S.unlocked.push(d.id); save(); Sound.play("unlock"); close(); paintPic(d); };
    const bb = $("#u-buy"); if (bb) bb.onclick = () => { if (S.coins < C.unlockPrice) return toast(`Need ${C.unlockPrice - S.coins} more coins`); S.coins -= C.unlockPrice; done(); };
    $("#u-ad").onclick = async () => { const b = $("#u-ad"); b.disabled = true; if (await Ads.showRewarded()) done(); else b.disabled = false; };
  }
  function finishedMenu(d) {
    Sound.play("tap"); const src = Game.png(d, 8);
    open(`<h2>${d.name}</h2><img class="done-pic" src="${src}" alt=""><div class="stack"><button class="btn blue" id="f-replay">Watch time-lapse</button><div class="row2"><button class="btn white" id="f-save">Save picture</button><button class="btn green" id="f-again">Paint again</button></div></div>`);
    $("#f-replay").onclick = () => { close(); cur = d; at("paint"); setTitle(d); Game.showReplay(d, S.prog[d.id] || fullProg(d)); replayMode = "view"; };
    $("#f-save").onclick = () => savePng(d);
    $("#f-again").onclick = () => { delete S.prog[d.id]; save(); close(); paintPic(d); };
  }
  function savePng(d) { const a = document.createElement("a"); a.href = Game.png(d, 16); a.download = "color-by-number-" + d.id + ".png"; document.body.appendChild(a); a.click(); a.remove(); toast("Picture saved"); }

  /* ---------- painting ---------- */
  let replayMode = "paint";
  function setTitle(d) { $("#p-name").textContent = d.name; }
  function paintPic(d) {
    close(); cur = d; replayMode = "paint"; at("paint"); setTitle(d);
    requestAnimationFrame(() => { Game.start(d, S.prog[d.id]); buildPalette(); });
    if (!S.howSeen) { S.howSeen = true; save(); setTimeout(how, 500); }
  }
  function buildPalette() {
    const P = Game.pic, pal = $("#palette"); pal.innerHTML = "";
    P.pal.forEach((h, i) => { const b = document.createElement("button"); b.className = "chip"; b.dataset.c = i; const l = P.lum[i]; b.innerHTML = `<i style="background:${h};color:${l > 0.62 ? "#2b2546" : "#ffffff"}"><span>${i + 1}</span></i>`; b.onclick = () => { Sound.play("pick"); Game.select(i); }; pal.appendChild(b); });
  }
  Game.on.progress = p => {
    if (document.body.dataset.at !== "paint") return;
    const chips = $("#palette").children, totals = {}; const P = Game.pic; for (let i = 0; i < P.cells.length; i++) totals[P.cells[i]] = (totals[P.cells[i]] || 0) + 1;
    for (const ch of chips) { const c = +ch.dataset.c, tot = totals[c] || 1, done = tot - p.left[c]; ch.style.setProperty("--p", (done / tot * 100) + "%"); ch.classList.toggle("on", c === p.sel); ch.classList.toggle("fin", p.left[c] === 0); }
    const on = $("#palette").querySelector(".chip.on"); if (on) { const pr = on.parentElement, x = on.offsetLeft - pr.clientWidth / 2 + on.clientWidth / 2; if (Math.abs(pr.scrollLeft - x) > on.clientWidth * 2) pr.scrollTo({ left: x, behavior: "smooth" }); }
    const pc = Math.floor(p.done / p.total * 100); $("#p-pct").textContent = pc + "%"; $("#p-bar").style.width = (p.done / p.total * 100) + "%";
  };
  let saveT = 0;
  Game.on.change = () => { clearTimeout(saveT); saveT = setTimeout(store, 600); };
  Game.on.save = () => store();
  function store() { if (!cur || Game.mode !== "paint" || replayMode !== "paint") return; S.prog[cur.id] = Game.serialize(); save(); }
  Game.on.colorDone = c => { const ch = $("#palette").querySelector(`[data-c="${c}"]`); if (ch) { ch.animate([{ transform: "scale(1.35)" }, { transform: "scale(1)" }], { duration: 400, easing: "cubic-bezier(.2,1.6,.4,1)" }); } };
  Game.on.finished = () => { if (replayMode === "paint" && cur) { S.prog[cur.id] = Game.serialize(); save(); } $("#armed").hidden = true; };
  Game.on.complete = () => {
    const d = cur; if (!d) return;
    if (replayMode === "view") { document.body.classList.add("body-replay"); open(`<h2>${d.name}</h2><div class="stack"><button class="btn blue" id="v-again">Watch again</button><button class="btn green" id="v-back">Back to gallery</button></div>`, false); $("#v-again").onclick = () => { close(); Game.showReplay(d, S.prog[d.id] || fullProg(d)); }; $("#v-back").onclick = () => { close(); home(); }; return; }
    const first = !S.done[d.id]; let r = first ? reward(d) : Math.round(reward(d) / 3), daily = false;
    if (d === todayPic() && !S.dailyPic[today()]) { S.dailyPic[today()] = d.id; r += C.coins.daily; daily = true; }
    S.done[d.id] = true; S.coins += r; S.wins++; save(); refresh();
    let doubled = false; document.body.classList.add("body-replay");
    open(`<div class="banner">MASTERPIECE!</div><p class="sub">${d.name}${daily ? " · picture of the day!" : ""}</p>
      <div class="reward"><i class="coin"></i><span id="w-c">+${r}</span></div>
      <div class="stack"><button class="btn blue" id="w-dbl">Collect ×2 <span class="ad">AD</span></button>
      <div class="row2"><button class="btn white" id="w-save">Save picture</button><button class="btn green" id="w-next">Next picture</button></div></div>`, false);
    $("#w-dbl").onclick = async () => { if (doubled) return; const b = $("#w-dbl"); b.disabled = true; if (await Ads.showRewarded()) { doubled = true; addCoins(r); $("#w-c").textContent = "+" + r * 2; Sound.play("coin"); } else b.disabled = false; };
    $("#w-save").onclick = () => savePng(d);
    $("#w-next").onclick = async () => { Sound.play("tap"); close(); if (C.ads.interstitialEvery > 0 && S.wins % C.ads.interstitialEvery === 0) await Ads.showInterstitial(); const nx = L.slice(idx(d) + 1).concat(L).find(x => !S.done[x.id] && unlocked(x)); nx ? paintPic(nx) : home(); };
  };
  function home() { store(); close(); Game.stop(); at("gallery"); gallery(); }
  $("#p-back").onclick = () => { Sound.play("tap"); home(); };
  $("#p-fit").onclick = () => { Sound.play("zoom"); Game.fit(); };
  $("#z-in").onclick = () => { Sound.play("zoom"); Game.zoomIn(); };
  $("#z-out").onclick = () => { Sound.play("zoom"); Game.zoomOut(); };

  /* ---------- boosters ---------- */
  function boostBadges() { document.querySelectorAll(".boost").forEach(b => { const k = b.dataset.b, n = S.boosters[k] || 0, em = b.querySelector("em"); em.textContent = n > 0 ? n : "+"; em.classList.toggle("buy", n <= 0); b.classList.toggle("on", Game.armed === k); }); }
  document.querySelectorAll(".boost").forEach(b => b.onclick = () => {
    if (Game.mode !== "paint") return;
    const k = b.dataset.b;
    if ((S.boosters[k] || 0) <= 0) return buyBooster(k);
    if (k === "find") { if (Game.find()) { S.boosters.find--; save(); refresh(); } return; }
    const a = Game.arm(k); Sound.play("tap"); const ar = $("#armed"); ar.hidden = !a; if (a) ar.textContent = BO[k].about; boostBadges();
  });
  Game.on.boosterUsed = k => { $("#armed").hidden = true; if (k) { S.boosters[k]--; save(); } refresh(); };
  function buyBooster(k) {
    Sound.play("tap"); const b = BO[k], ic = { bucket: "🪣", blast: "💥", find: "🔍" }[k];
    open(`<h2>${b.name}</h2><div class="b-row"><span class="bi">${ic}</span><span>${b.about}<small>You have ${S.boosters[k] || 0}</small></span></div>
      <div class="stack"><button class="btn green" id="bb-buy">Buy 3 for ${coin(b.price * 3)}</button><button class="btn blue" id="bb-ad">Get 1 free <span class="ad">AD</span></button></div>`);
    $("#bb-buy").onclick = () => { const c = b.price * 3; if (S.coins < c) return toast(`Need ${c - S.coins} more coins`); S.coins -= c; S.boosters[k] = (S.boosters[k] || 0) + 3; save(); refresh(); Sound.play("buy"); close(); };
    $("#bb-ad").onclick = async () => { const bt = $("#bb-ad"); bt.disabled = true; if (await Ads.showRewarded()) { S.boosters[k] = (S.boosters[k] || 0) + 1; save(); refresh(); Sound.play("coin"); close(); } else bt.disabled = false; };
  }

  /* ---------- settings / gift / how ---------- */
  const toggles = () => `<div class="toggles"><button class="tg ${Sound.sfx ? "on" : ""}" id="tg-sfx">Sound effects<i></i></button><button class="tg ${Sound.music ? "on" : ""}" id="tg-mus">Music<i></i></button></div>`;
  function settings() {
    Sound.unlock(); Sound.play("tap");
    open(`<h2>Settings</h2>${toggles()}<div class="stack"><button class="btn white" id="s-how">How to play</button></div>`);
    $("#tg-sfx").onclick = e => { Sound.setSfx(!Sound.sfx); e.currentTarget.classList.toggle("on", Sound.sfx); Sound.play("tap"); };
    $("#tg-mus").onclick = e => { Sound.setMusic(!Sound.music); e.currentTarget.classList.toggle("on", Sound.music); };
    $("#s-how").onclick = how;
  }
  $("#t-set").onclick = settings;
  const giftReady = () => S.daily.last !== today();
  function gift() {
    Sound.unlock(); Sound.play("tap");
    const yest = key(new Date(Date.now() - 864e5));
    const streak = giftReady() ? (S.daily.last === yest ? S.daily.streak % 7 : 0) : (S.daily.streak - 1 + 7) % 7;
    const days = C.daily.map((c, i) => `<div class="day ${i < streak ? "got" : i === streak && giftReady() ? "now" : ""}">Day ${i + 1}<i class="coin"></i><b>${c}</b></div>`).join("");
    open(`<h2>Daily gift</h2><p class="sub">Come back every day for bigger gifts.</p><div class="days">${days}</div>
      <div class="stack">${giftReady() ? `<button class="btn green" id="g-get">Collect ${C.daily[streak]}</button><button class="btn blue" id="g-x2">Collect ×2 <span class="ad">AD</span></button>` : `<p class="sub">Next gift tomorrow!</p>`}</div>`);
    const claim = mult => { const n = C.daily[streak] * mult; S.daily = { last: today(), streak: streak + 1 }; addCoins(n); Sound.play("coin"); toast(`+${n} coins`); close(); };
    if (giftReady()) { $("#g-get").onclick = () => claim(1); $("#g-x2").onclick = async () => { const b = $("#g-x2"); b.disabled = true; if (await Ads.showRewarded()) claim(2); else b.disabled = false; }; }
  }
  $("#t-gift").onclick = gift;
  function how() {
    Sound.play("tap");
    open(`<h2>How to play</h2><div class="how">
      <div><b>1</b>Pick a colour at the bottom. Its cells light up in the picture.</div>
      <div><b>2</b>Tap or drag over the cells with that number to paint them.</div>
      <div><b>3</b>Pinch or scroll to zoom. Zoomed out, drag to move and tap to zoom in.</div>
      <div><b>4</b>Stuck? Bucket fills a patch, Blast paints an area, Find shows a cell left to paint.</div>
    </div><div class="stack"><button class="btn green" data-close>Start painting</button></div>`);
  }
  $("#today").onclick = () => { Sound.unlock(); const d = todayPic(); if (S.done[d.id]) return finishedMenu(d); Sound.play("tap"); paintPic(d); };
  $("#tagline").textContent = C.tagline;
  wrap.addEventListener("pointerdown", e => { if (e.target === wrap && sheet.querySelector("[data-close]")) close(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden) store(); });
  addEventListener("keydown", e => { if (e.key === "Escape" && document.body.dataset.at === "paint" && wrap.hidden) home(); });

  at("gallery"); gallery();
  return { gallery, paintPic, pick, home, gift, settings, how, buyBooster, close, toast, state: S, save, refresh, todayPic };
})();

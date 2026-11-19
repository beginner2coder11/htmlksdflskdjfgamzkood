/* BREEZY ISLE — HUD and every panel: friends, snack truck shop, basket, journal, camp, map, daily gift */
window.UI = (() => {
  const C = window.GAME_CONFIG, St = window.Store, A = window.Art, $ = q => document.querySelector(q);
  const S = () => St.S;
  const IT = C.items;
  const coinTag = n => `<i class="coin"></i>${n}`;
  const areaById = id => C.areas.find(a => a.id === id);

  /* ---------- HUD ---------- */
  let lastCoins = null;
  function hud() {
    const c = S().coins, el = $("#h-coins");
    if (lastCoins !== null && c > lastCoins) { el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); }
    lastCoins = c; el.textContent = c;
    $("#h-bagn").textContent = St.bagUsed() + "/" + St.bagCap();
    $("#h-bag").classList.toggle("full", St.bagUsed() >= St.bagCap());
    if (Game.area) $("#h-area").textContent = Game.area.name;
    $("#h-time").classList.toggle("moon", Game.isNight());
    const ready = readyFriends().length; $("#b-friends").hidden = !ready; $("#b-friends").textContent = ready;
    $("#b-journal").hidden = !journalClaimable(); $("#b-journal").textContent = "!";
    $("#b-menu").hidden = !St.dailyReady();
  }
  setInterval(hud, 1000);
  const readyFriends = () => C.areas.filter(a => S().unlocked.includes(a.id)).flatMap(a => a.friends).filter(fid => { const f = St.friend(fid); return St.count(f.req.item) >= f.req.n; });
  const journalClaimable = () => { const r = C.journalRewards[S().journalClaimed]; return r && St.journalCount() >= r[0]; };

  let toastT = 0;
  function toast(msg) { const t = $("#toast"); t.hidden = false; t.textContent = msg; t.style.animation = "none"; void t.offsetWidth; t.style.animation = ""; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 2600); }
  let newT = 0;
  function newCard(id) {
    const el = $("#newcard"); el.innerHTML = ""; el.appendChild(A.itemCanvas(id, 52));
    const d = document.createElement("div"); d.innerHTML = `<small>NEW IN YOUR JOURNAL</small><b>${IT[id].name}</b>`; el.appendChild(d);
    el.hidden = false; el.style.animation = "none"; void el.offsetWidth; el.style.animation = ""; clearTimeout(newT); newT = setTimeout(() => el.hidden = true, 2800);
  }

  Game.on.area = () => hud();
  Game.on.got = (id, isNew) => { hud(); if (isNew) { newCard(id); Sound.play("find", 2); } };
  Game.on.toast = m => { toast(m); hud(); };
  Game.on.talk = fid => talk(fid);
  Game.on.shop = () => shop("sell");
  Game.on.camp = i => camp(i);
  Game.on.map = () => map();
  Game.on.fishing = on => { $("#stopfish").hidden = !on; document.body.classList.toggle("fishing", on); };
  Game.on.caught = () => hud();

  /* ---------- sheets ---------- */
  const wrap = $("#wrap"), sheet = $("#sheet");
  function open(html) { sheet.innerHTML = `<button class="x" data-close>✕</button>` + html; wrap.hidden = false; sheet.querySelectorAll("[data-close]").forEach(b => b.onclick = close); sheet.scrollTop = 0; }
  function close() { wrap.hidden = true; sheet.innerHTML = ""; hud(); }
  wrap.addEventListener("pointerdown", e => { if (e.target === wrap) close(); });
  const put = (sel, node) => { const el = sheet.querySelector(sel); if (el) { el.innerHTML = ""; el.appendChild(node); } };

  /* ---------- friends ---------- */
  const heartsText = h => { const next = C.hearts.find(x => x > h) || C.hearts[C.hearts.length - 1]; return "♥".repeat(Math.min(h, next)) + "♡".repeat(Math.max(0, next - h)); };
  const asks = ["Could you bring me something?", "I've been thinking about this all day…", "If you find these, I'd be so happy!", "A little favour, friend?"];
  function talk(fid, after) {
    const F = C.friends[fid], f = St.friend(fid), r = f.req, have = St.count(r.item), ok = have >= r.n;
    const line = after || (!f.met ? F.hi + " I'm " + F.name + "." : asks[(f.done + fid.length) % asks.length]);
    f.met = true; St.save();
    open(`<div class="talk"><div class="portrait" id="pt"></div><div class="speech">${line}</div></div>
      <div class="row" style="margin-top:10px"><b style="font-size:20px">${F.name}</b><span class="hearts">${heartsText(f.hearts)}</span><span class="spacer"></span><small class="note">${f.done} favours done</small></div>
      <div class="want"><span id="wi"></span><div class="meta"><b>${IT[r.item].name} × ${r.n}</b><small class="${ok ? "have-ok" : "have-no"}">You have ${have}</small><br><small>Reward: ${r.coins} coins + ♥</small></div></div>
      <div class="row" style="margin-top:14px"><button class="btn ghost" data-close>Later</button><span class="spacer"></span><button class="btn mint" id="give" ${ok ? "" : "disabled"}>Give ${IT[r.item].name}</button></div>`);
    put("#pt", A.animalCanvas(F, 88, { mood: ok ? "happy" : "", t: 0.3 }));
    put("#wi", A.itemCanvas(r.item, 56));
    $("#give").onclick = () => {
      const res = St.giveRequest(fid); if (!res) return;
      Sound.play("quest"); setTimeout(() => Sound.play("heart"), 500);
      let msg = `Thank you!! Here's ${res.coins} coins.`;
      if (res.gift && res.gift !== "coins") msg += ` And a present: ${C.decor.find(d => d.id === res.gift).name} for your camp!`;
      if (res.gift === "coins") msg += " And 100 bonus coins!";
      talk(fid, msg); hud();
    };
  }
  function friends() {
    const rows = C.areas.map(a => {
      const open_ = S().unlocked.includes(a.id);
      return a.friends.map(fid => {
        const F = C.friends[fid];
        if (!open_) return `<div class="li"><div style="width:52px;height:52px;border-radius:16px;background:var(--paper-2);display:grid;place-items:center;font-weight:900;color:#b8a8c0">?</div><div class="meta"><b>???</b><small>Lives on ${a.name}</small></div></div>`;
        const f = St.friend(fid), ok = St.count(f.req.item) >= f.req.n;
        return `<div class="li"><span data-p="${fid}"></span><div class="meta"><b>${F.name} <span class="hearts">${heartsText(f.hearts)}</span></b><small>${a.name} · wants ${IT[f.req.item].name} ×${f.req.n} <span class="${ok ? "have-ok" : "have-no"}">(${St.count(f.req.item)})</span></small></div>
          ${a.id === Game.area.id ? (ok ? `<span class="bonus">Ready!</span>` : "") : `<button class="btn small sky" data-go="${a.id}">Go</button>`}</div>`;
      }).join("");
    }).join("");
    open(`<h2>Friends</h2><p class="sub">Bring them what they ask for. Hearts unlock gifts for your camp.</p><div class="list">${rows}</div>`);
    sheet.querySelectorAll("[data-p]").forEach(el => el.appendChild(A.animalCanvas(C.friends[el.dataset.p], 52, { t: 0.2 })));
    sheet.querySelectorAll("[data-go]").forEach(b => b.onclick = () => { close(); travel(b.dataset.go); });
  }

  /* ---------- snack truck ---------- */
  let adReadyAt = 0;
  function shop(tab) {
    const tabs = ["sell", "decor", "tools"].map(t => `<button class="tab ${t === tab ? "on" : ""}" data-tab="${t}">${{ sell: "Sell", decor: "Camp decor", tools: "Tools" }[t]}</button>`).join("");
    open(`<h2>Bao's Snack &amp; Swap</h2><p class="sub">You have ${coinTag(S().coins)}</p><div class="tabs">${tabs}</div><div id="tabbody"></div>`);
    sheet.querySelectorAll("[data-tab]").forEach(b => b.onclick = () => { Sound.play("tap"); shop(b.dataset.tab); });
    const body = $("#tabbody");
    if (tab === "sell") {
      const ids = Object.keys(S().bag);
      const total = ids.reduce((a, id) => a + St.priceOf(id) * St.count(id), 0);
      body.innerHTML = `<div class="row wrap" style="margin-bottom:10px"><span class="bonus">Camp comfort bonus +${Math.round(St.sellBonus() * 100)}%</span><span class="spacer"></span>
        <button class="btn small gold" id="adcoins" ${Date.now() < adReadyAt ? "disabled" : ""}>+50 coins <span class="ad">AD</span></button></div>
        ${ids.length ? `<div class="grid" id="sg"></div><div class="row" style="margin-top:14px"><span class="note">Tap an item to sell one.</span><span class="spacer"></span><button class="btn mint" id="sellall">Sell all · ${total}</button></div>` : `<p class="note">Your basket is empty. Go pick fruit, dig shells, catch bugs and fish!</p>`}`;
      const g = $("#sg");
      if (g) ids.forEach(id => {
        const c = document.createElement("button"); c.className = "cell";
        c.appendChild(A.itemCanvas(id, 50));
        c.insertAdjacentHTML("beforeend", `<span class="n">${St.count(id)}</span><b>${IT[id].name}</b><small>${coinTag(St.priceOf(id))}</small>`);
        c.onclick = () => { const got = St.sell(id, 1); if (got) { Sound.play("coin"); shop("sell"); } };
        g.appendChild(c);
      });
      const sa = $("#sellall"); if (sa) sa.onclick = () => { let sum = 0; Object.keys(S().bag).forEach(id => sum += St.sell(id, St.count(id))); Sound.play("coin"); toast(`Sold everything for ${sum} coins!`); shop("sell"); };
      $("#adcoins").onclick = async () => { const ok = await Ads.showRewarded(); if (ok) { S().coins += 50; St.save(); adReadyAt = Date.now() + 5 * 60e3; Sound.play("coin"); toast("+50 coins"); } shop("sell"); };
    }
    if (tab === "decor") {
      body.innerHTML = `<p class="note">Decor makes your camp comfier: each comfort point adds 1% to what you earn when selling (up to 50%). Place it at the camp on Palm Beach.</p><div class="grid" id="dg"></div>`;
      C.decor.forEach(d => {
        const own = S().owned.includes(d.id), c = document.createElement("div"); c.className = "cell" + (own ? " on" : "");
        c.appendChild(A.decorCanvas(d.id, 70));
        c.insertAdjacentHTML("beforeend", `<b>${d.name}</b><small>+${d.comfort} comfort</small>${own ? `<small class="have-ok">Owned</small>` : `<button class="btn small ${S().coins >= d.price ? "" : "ghost"}" data-buy="${d.id}">${coinTag(d.price)}</button>`}`);
        $("#dg").appendChild(c);
      });
      body.querySelectorAll("[data-buy]").forEach(b => b.onclick = () => {
        const d = C.decor.find(x => x.id === b.dataset.buy);
        if (S().coins < d.price) { toast(`You need ${d.price - S().coins} more coins`); return; }
        S().coins -= d.price; S().owned.push(d.id); St.save(); Sound.play("coin"); toast(d.name + " bought! Place it at your camp.");
        const free = S().camp.indexOf(null); if (free >= 0 && Game.area.id === "palm") { S().camp[free] = d.id; St.save(); }
        shop("decor");
      });
    }
    if (tab === "tools") {
      body.innerHTML = `<div class="list" id="tl"></div>`;
      Object.entries(C.tools).forEach(([k, t]) => {
        const lvl = S().tools[k], price = t.prices[lvl], el = document.createElement("div"); el.className = "li";
        el.innerHTML = `<div class="meta"><b>${t.name} <small>Lv ${lvl + 1}${lvl >= t.prices.length ? " (max)" : ""}</small></b><small>${t.what}${k === "basket" ? ` · holds ${St.bagCap()}` : ""}</small></div>
          ${price != null ? `<button class="btn small ${S().coins >= price ? "mint" : "ghost"}" data-up="${k}">${coinTag(price)}</button>` : `<span class="bonus">Max</span>`}`;
        $("#tl").appendChild(el);
      });
      body.querySelectorAll("[data-up]").forEach(b => b.onclick = () => {
        const k = b.dataset.up, price = C.tools[k].prices[S().tools[k]];
        if (S().coins < price) { toast(`You need ${price - S().coins} more coins`); return; }
        S().coins -= price; S().tools[k]++; St.save(); Sound.play("unlock"); toast(C.tools[k].name + " upgraded!"); shop("tools");
      });
    }
    hud();
  }

  /* ---------- basket ---------- */
  function bag() {
    const ids = Object.keys(S().bag);
    open(`<h2>Basket</h2><p class="sub">${St.bagUsed()} / ${St.bagCap()} · sell things at the snack truck</p>${ids.length ? `<div class="grid" id="bg"></div>` : `<p class="note">Nothing yet! Shake a tree, dig a sparkly spot, net a butterfly or fish off the pier.</p>`}`);
    const g = $("#bg");
    if (g) ids.forEach(id => { const c = document.createElement("div"); c.className = "cell"; c.appendChild(A.itemCanvas(id, 50)); c.insertAdjacentHTML("beforeend", `<span class="n">${St.count(id)}</span><b>${IT[id].name}</b><small>${coinTag(St.priceOf(id))}</small>`); g.appendChild(c); });
  }

  /* ---------- journal ---------- */
  function journal(tab = "fish") {
    const kinds = { fish: "Fish", bug: "Bugs", shell: "Shells", fruit: "Fruit" };
    const total = Object.keys(IT).length, n = St.journalCount(), rw = C.journalRewards[S().journalClaimed];
    open(`<h2>Island Journal</h2><p class="sub">${n} of ${total} found</p>
      <div class="bar"><i style="width:${(n / total * 100).toFixed(0)}%"></i></div>
      ${rw ? `<div class="row" style="margin:10px 0"><span class="note">Find ${rw[0]} things: reward ${coinTag(rw[1])}</span><span class="spacer"></span><button class="btn small gold" id="jr" ${n >= rw[0] ? "" : "disabled"}>Claim</button></div>` : `<p class="note">You've earned every journal reward!</p>`}
      <div class="tabs">${Object.entries(kinds).map(([k, v]) => `<button class="tab ${k === tab ? "on" : ""}" data-tab="${k}">${v}</button>`).join("")}</div><div class="grid" id="jg"></div>`);
    sheet.querySelectorAll("[data-tab]").forEach(b => b.onclick = () => journal(b.dataset.tab));
    Object.entries(IT).filter(([, it]) => it.kind === tab).forEach(([id, it]) => {
      const f = S().found[id], c = document.createElement("div"); c.className = "cell" + (f ? "" : " locked");
      const where = C.areas.filter(a => [...a.fruit, ...a.shells, ...a.fish, ...a.bugs].includes(id)).map(a => a.name).join(", ");
      c.appendChild(A.itemCanvas(id, 50, !f));
      c.insertAdjacentHTML("beforeend", `<b>${f ? it.name : "???"}</b><small style="font-size:10px">${where}${it.time && it.time !== "any" ? " · " + (it.time === "night" ? "night" : "day") : ""}</small>${f ? `<span class="n">${f}</span>` : ""}`);
      $("#jg").appendChild(c);
    });
    const jr = $("#jr"); if (jr) jr.onclick = () => { S().coins += rw[1]; S().journalClaimed++; St.save(); Sound.play("unlock"); toast(`+${rw[1]} coins`); journal(tab); };
  }

  /* ---------- camp ---------- */
  function camp(i) {
    const cur = S().camp[i];
    const free = S().owned.filter(id => !S().camp.includes(id) || id === cur);
    open(`<h2>Your camp</h2><p class="sub">Comfort ${St.comfort()} · sell bonus +${Math.round(St.sellBonus() * 100)}%</p><div class="grid" id="cg"></div>
      <div class="row" style="margin-top:12px"><span class="note">Buy more decor at the snack truck.</span><span class="spacer"></span>${cur ? `<button class="btn small ghost" id="clear">Empty this spot</button>` : ""}</div>`);
    if (!free.length) $("#cg").outerHTML = `<p class="note">You've placed everything you own. Buy more at the snack truck!</p>`;
    free.forEach(id => {
      const d = C.decor.find(x => x.id === id), c = document.createElement("button"); c.className = "cell" + (id === cur ? " on" : "");
      c.appendChild(A.decorCanvas(id, 70)); c.insertAdjacentHTML("beforeend", `<b>${d.name}</b><small>+${d.comfort} comfort</small>`);
      c.onclick = () => { S().camp[i] = id; St.save(); Sound.play("pick"); close(); toast(d.name + " placed!"); };
      $("#cg") && $("#cg").appendChild(c);
    });
    const cl = $("#clear"); if (cl) cl.onclick = () => { S().camp[i] = null; St.save(); close(); };
  }

  /* ---------- map ---------- */
  function map() {
    open(`<h2>Island map</h2><p class="sub">New beaches have new fruit, shells, fish, bugs and friends.</p><div class="isles" id="mi"></div>`);
    C.areas.forEach(a => {
      const own = S().unlocked.includes(a.id), here = Game.area.id === a.id, el = document.createElement("div");
      el.className = "isle" + (own ? "" : " locked") + (here ? " here" : "");
      el.style.background = `linear-gradient(120deg, ${a.sky[0]}, ${a.sea} 60%, ${a.grass2})`;
      el.innerHTML = `<div class="pic" data-f></div><div class="meta"><b>${a.name}</b><small>${a.friends.length} friends · ${a.fish.length} fish · ${a.bugs.length} bugs</small></div>
        ${here ? "" : own ? `<button class="btn small" data-go="${a.id}">Go</button>` : `<button class="btn small ${S().coins >= a.unlock ? "gold" : "ghost"}" data-un="${a.id}">Open ${coinTag(a.unlock)}</button>`}`;
      el.querySelector("[data-f]").appendChild(A.itemCanvas(a.fruit[0], 48));
      $("#mi").appendChild(el);
    });
    sheet.querySelectorAll("[data-go]").forEach(b => b.onclick = () => { close(); travel(b.dataset.go); });
    sheet.querySelectorAll("[data-un]").forEach(b => b.onclick = () => {
      const a = areaById(b.dataset.un);
      if (S().coins < a.unlock) { toast(`You need ${a.unlock - S().coins} more coins`); return; }
      S().coins -= a.unlock; S().unlocked.push(a.id); St.save(); Sound.play("unlock"); toast(a.name + " is open!"); close(); travel(a.id);
    });
  }
  async function travel(id) {
    if (!Game.travel(id)) return;
    S().trips++; St.save();
    if (C.ads.interstitialEvery > 0 && S().trips % C.ads.interstitialEvery === 0) { await new Promise(r => setTimeout(r, 500)); await Ads.showInterstitial(); }
  }

  /* ---------- more: daily, sound, help ---------- */
  function more() {
    const ready = St.dailyReady(), cont = S().daily.last === St.day(-1), next = ready ? (cont ? S().daily.streak % 7 + 1 : 1) : S().daily.streak;
    open(`<h2>Daily gift</h2><p class="sub">Visit every day: the gift grows for 7 days.</p>
      <div class="days">${C.daily.map((g, i) => { const k = i + 1, got = ready ? k < next : k <= next, now = ready && k === next; return `<div class="day ${got ? "got" : ""} ${now ? "now" : ""} ${k === 7 ? "d7" : ""}">Day ${k}<b>${coinTag(g)}</b></div>`; }).join("")}</div>
      <button class="btn gold" id="dl" style="width:100%" ${ready ? "" : "disabled"}>${ready ? "Claim " + C.daily[next - 1] + " coins" : "Come back tomorrow"}</button>
      <h2 style="margin-top:18px;font-size:19px">Settings</h2>
      <div class="row wrap" style="margin-top:8px"><button class="btn small ghost" id="sfx">Sound: ${Sound.sfx ? "On" : "Off"}</button><button class="btn small ghost" id="mus">Music: ${Sound.music ? "On" : "Off"}</button><button class="btn small ghost" id="how">How to play</button></div>
      <p class="note" style="margin-top:14px">Basket ${St.bagUsed()}/${St.bagCap()} · ${S().stats.fish} fish, ${S().stats.bugs} bugs, ${S().stats.digs} finds, ${S().stats.fruit} fruit, ${S().stats.quests} favours</p>
      <button class="btn small ghost" id="reset">Start over</button>`);
    $("#dl").onclick = () => { const g = St.claimDaily(); if (g) { Sound.play("coin"); toast(`+${g} coins`); } more(); };
    $("#sfx").onclick = () => { Sound.unlock(); Sound.toggleSfx(); more(); };
    $("#mus").onclick = () => { Sound.unlock(); Sound.toggleMusic(); more(); };
    $("#how").onclick = how;
    $("#reset").onclick = () => {
      const b = $("#reset");
      if (b.dataset.sure) { St.reset(); location.reload(); return; }
      b.dataset.sure = 1; b.textContent = "Tap again to erase everything"; b.classList.remove("ghost");
    };
    hud();
  }
  function how() {
    open(`<h2>How to play</h2><div class="list" style="margin-top:10px">
      <div class="li"><div class="meta"><b>Walk</b><small>Tap or hold anywhere on the ground. Keyboard: ← → and Space.</small></div></div>
      <div class="li"><div class="meta"><b>Use things</b><small>Tap a tree to shake it, a sparkly spot to dig, a butterfly to net it.</small></div></div>
      <div class="li"><div class="meta"><b>Fish</b><small>Walk to the end of the pier. Wait for the "!", tap, then hold to keep the green zone on the fish until the bar fills.</small></div></div>
      <div class="li"><div class="meta"><b>Friends</b><small>The bubble above each friend shows what they'd like. Bring it for coins and hearts. Hearts unlock gifts.</small></div></div>
      <div class="li"><div class="meta"><b>Snack truck</b><small>Sell what you find, buy camp decor and better tools.</small></div></div>
      <div class="li"><div class="meta"><b>Day and night</b><small>Some fish and bugs only come out at night. Lights glow after sunset.</small></div></div>
      <div class="li"><div class="meta"><b>Map</b><small>Save up coins to open new beaches with new friends and finds.</small></div></div>
    </div><button class="btn" data-close style="width:100%;margin-top:14px">Let's go!</button>`);
  }

  /* ---------- title / start ---------- */
  $("#tagline").textContent = C.tagline;
  $("#t-play").onclick = () => {
    Sound.unlock(); Sound.play("tap");
    document.body.dataset.at = "play"; hud();
    if (!S().intro) { S().intro = true; St.save(); setTimeout(() => talk("miso", "Hi there, welcome to the island! I'm Miso. Tap around to explore: shake trees, dig sparkly spots, catch butterflies and fish off the pier. Bring me what's in my bubble and I'll pay you back!"), 400); }
  };
  $("#h-map").onclick = () => { Sound.play("tap"); map(); };
  $("#d-map").onclick = () => { Sound.play("tap"); map(); };
  $("#h-bag").onclick = () => { Sound.play("tap"); bag(); };
  $("#d-journal").onclick = () => { Sound.play("tap"); journal(); };
  $("#d-friends").onclick = () => { Sound.play("tap"); friends(); };
  $("#d-menu").onclick = () => { Sound.play("tap"); more(); };
  $("#stopfish").onclick = () => { Game.stopFishing(); hud(); };
  hud();

  return { hud, talk, shop, bag, journal, camp, map, friends, more, how, toast, close, travel };
})();

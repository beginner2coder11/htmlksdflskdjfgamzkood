/* ==========================================================================
   UI — business list, buy modes, managers, upgrades, stars (prestige), gem
   shop, boost, lucky balloon, welcome-back earnings, missions, daily gift,
   tutorial hints, saving. Drives Econ + Street.
   ========================================================================== */
(() => {
  const C = window.GAME_CONFIG, B = C.businesses, E = C.economy;
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const fmt = Econ.fmt, money = n => C.currency + fmt(n);

  // ---------- storage --------------------------------------------------------
  const store = {
    get(k, d) { try { const v = localStorage.getItem("it_" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("it_" + k, JSON.stringify(v)); } catch (e) {} }
  };

  // ---------- art ------------------------------------------------------------
  const loaded = {};
  function probe(url) {
    return new Promise(res => {
      if (!url) return res(false);
      const img = new Image();
      const done = ok => { loaded[url] = ok; res(ok); };
      img.onload = () => done(img.naturalWidth > 0);
      img.onerror = () => done(false);
      setTimeout(() => done(false), 4000);
      img.src = url;
    });
  }
  const hasImg = url => !!(url && loaded[url]);
  function art(key, cls = "") {
    const a = C.art[key] || {};
    if (hasImg(a.image)) return `<img class="art-img ${cls}" src="${a.image}" alt="" draggable="false">`;
    return `<span class="art-emoji ${cls}">${a.emoji || ""}</span>`;
  }
  const gemArt = () => art("gem", "inline");
  const ICON = {
    gear: '<svg viewBox="0 0 24 24"><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm8.9 4.7-1.7-.3a7.6 7.6 0 0 1-.7 1.7l1 1.4a1 1 0 0 1-.1 1.3l-1.2 1.2a1 1 0 0 1-1.3.1l-1.4-1a7.6 7.6 0 0 1-1.7.7l-.3 1.7a1 1 0 0 1-1 .8h-1.7a1 1 0 0 1-1-.8l-.3-1.7a7.6 7.6 0 0 1-1.7-.7l-1.4 1a1 1 0 0 1-1.3-.1L4 17.3a1 1 0 0 1-.1-1.3l1-1.4a7.6 7.6 0 0 1-.7-1.7l-1.7-.3a1 1 0 0 1-.8-1v-1.7a1 1 0 0 1 .8-1l1.7-.3c.2-.6.4-1.2.7-1.7l-1-1.4A1 1 0 0 1 4 4.2L5.2 3a1 1 0 0 1 1.3-.1l1.4 1a7.6 7.6 0 0 1 1.7-.7L9.9 1.5a1 1 0 0 1 1-.8h1.7a1 1 0 0 1 1 .8l.3 1.7c.6.2 1.2.4 1.7.7l1.4-1a1 1 0 0 1 1.3.1L19.5 4a1 1 0 0 1 .1 1.3l-1 1.4c.3.5.5 1.1.7 1.7l1.7.3a1 1 0 0 1 .8 1v1.7a1 1 0 0 1-.8 1Z"/></svg>'
  };

  // ---------- state ----------------------------------------------------------
  const econ = Econ.create(C, store.get("econ", null));
  const S = econ.S;
  const settings = Object.assign({ sound: true, music: true, vibe: true }, store.get("settings", {}));
  const meta = Object.assign({ buyMode: "1", lastSeen: Date.now(), missionsDone: [], tut: 0, adGems: { day: null, n: 0 } }, store.get("meta", {}));
  function save() { meta.lastSeen = Date.now(); store.set("econ", econ.save()); store.set("meta", meta); }
  Sound.setSfx(settings.sound); Sound.setMusic(settings.music);
  const vibrate = m => { if (C.vibration && settings.vibe && navigator.vibrate) navigator.vibrate(m); };

  // ---------- modals / helpers ---------------------------------------------
  const modalRoot = $("#modal-root");
  let closeTimer = 0;
  function openModal(html, cls = "") {
    clearTimeout(closeTimer);
    modalRoot.classList.remove("closing");
    modalRoot.innerHTML = `<div class="modal-back"></div><div class="modal ${cls}">${html}</div>`;
    modalRoot.classList.add("open");
    return modalRoot.querySelector(".modal");
  }
  function closeModal() {
    if (!modalRoot.classList.contains("open")) return;
    modalRoot.classList.add("closing");
    closeTimer = setTimeout(() => { modalRoot.classList.remove("open", "closing"); modalRoot.innerHTML = ""; }, 180);
  }
  const modalOpen = () => modalRoot.classList.contains("open") && !modalRoot.classList.contains("closing");
  const ribbon = text => hasImg(C.art.ribbon.image)
    ? `<div class="ribbon img" style="background-image:url('${C.art.ribbon.image}')"><span>${text}</span></div>`
    : `<div class="ribbon"><span>${text}</span></div>`;
  const rays = () => hasImg(C.art.rays.image) ? `<img class="rays" src="${C.art.rays.image}" alt="">` : `<div class="rays css"></div>`;
  const on = (root, sel, fn) => { const el = root.querySelector(sel); if (el) el.addEventListener("click", () => { Sound.play("click"); fn(el); }); };
  function toast(msg, cls = "") {
    $$(".toast").forEach(t => t.remove());
    const el = document.createElement("div"); el.className = "toast " + cls; el.innerHTML = msg;
    document.body.appendChild(el); setTimeout(() => el.remove(), 2000);
  }
  function bump(el) { if (!el) return; el.classList.remove("bump"); el.offsetWidth; el.classList.add("bump"); }

  // ---------- business list ----------------------------------------------------
  let tab = "biz";
  const cardEls = [];
  function visibleBiz() {
    const firstLocked = S.biz.findIndex(b => !b.n);
    return B.map((b, i) => i).filter(i => S.biz[i].n || i === firstLocked);
  }
  // ---------- street: customers drive up to every shop -------------------------------
  const street = Street.create(econ, {
    sale: (i, v, info) => onSale(i, v, info),
    angry: (i, car) => onAngry(i, car)
  });
  street.served = meta.served || 0; street.bestCombo = meta.bestCombo || 0;
  const laneRect = i => { const rd = roadEls[street.roadOf(i)]; return rd && rd.cv.getBoundingClientRect(); };
  let lastCashSnd = 0, lastFly = 0;
  function onSale(i, v, info) {
    econ.earn(v);
    meta.served = street.served; meta.bestCombo = street.bestCombo;
    if (!info.auto) { earnedFrame += v; vibrate(10); }
    const now = performance.now();
    if (now - lastCashSnd > 120 && (!info.auto || now - lastCashSnd > 600)) { lastCashSnd = now; Sound.play(info.tip ? "tip" : "cash"); }
    const r = tab === "biz" && laneRect(i);
    if (r && r.width && r.bottom > 0 && r.top < innerHeight) {
      const px = r.left + r.width * info.x, py = r.top + r.height * 0.5;
      FX.text(px, py, `+${money(v)}`, info.auto ? "f-cash" : "f-cash big");
      if (info.tip) setTimeout(() => FX.text(px, py - 26, "FAST! TIP +25%", "f-tip"), 120);
      if (!info.auto && now - lastFly > 160) { lastFly = now; for (let k = 0; k < 3; k++) FX.fly(px, py, $("#cash"), "🪙", k === 2 ? () => bump($("#cash")) : null, k * 70); }
    }
    if (info.combo >= 3 && info.combo % 5 === 0) Sound.play("milestone");
    if (meta.tut === 0 && !info.auto) { meta.tapCount = (meta.tapCount || 0) + 1; if (meta.tapCount >= 4) meta.tut = 1; }
    refreshCombo();
  }
  function onAngry(i, car) {
    Sound.play("angry"); vibrate([30, 30, 30]);
    const r = tab === "biz" && laneRect(i);
    if (r && r.width) FX.text(r.left + r.width * car.x, r.top + r.height * 0.45, "😠 Too slow!", "f-angry");
    refreshCombo();
  }
  function refreshCombo() {
    const c = street.combo, el = $("#combo");
    el.hidden = c < 2;
    if (c >= 2) { el.innerHTML = `🔥 Combo <b>${c}</b> · +${Math.round(Math.min(C.street.comboMax, c * C.street.comboStep) * 100)}%`; if (c % 5 === 0) bump(el); }
  }

  // roads with three shops each; show every road that has an open shop or the next one to buy
  const roadEls = [];
  function visibleRoads() {
    const firstLocked = S.biz.findIndex(b => !b.n);
    return Street.ROADS.map((shops, r) => r).filter(r => Street.ROADS[r].some(i => i < B.length && (S.biz[i].n || i === firstLocked)));
  }
  function buildBiz() {
    const roads = visibleRoads(), firstLocked = S.biz.findIndex(b => !b.n);
    const hiddenRoads = Street.ROADS.length - roads.length;
    $("#page-biz").innerHTML = roads.map(r => `
      <div class="road" data-road="${r}">
        <div class="r-head"><b>🛣️ ${C.roadNames[r % C.roadNames.length]}</b><small>${Street.ROADS[r].filter(i => i < B.length && S.biz[i].n).length}/${Street.ROADS[r].filter(i => i < B.length).length} shops open</small></div>
        <canvas class="lane" data-road-cv="${r}"></canvas>
        <div class="r-cols">${Street.ROADS[r].map(i => {
          if (i >= B.length) return `<div class="col park"><span>🌳</span><small>Park</small></div>`;
          const b = B[i];
          if (S.biz[i].n) return `<div class="col" data-i="${i}" style="--c:${b.color}">
              <div class="c-top"><span class="c-emoji">${b.emoji}</span><b class="b-n">1</b>${econ.hasMgr(i) ? `<em class="c-auto">${b.manager.emoji}</em>` : ""}</div>
              <small class="c-name">${b.name}</small>
              <span class="s-price"></span>
              <i class="b-ms"><i></i></i>
              <button class="b-buy" data-i="${i}"><small class="b-k">×1</small><b class="b-cost"></b></button></div>`;
          if (i === firstLocked) return `<div class="col locked" data-i="${i}" style="--c:${b.color}">
              <div class="c-top"><span class="c-emoji">${b.emoji}</span></div><small class="c-name">${b.name}</small>
              <button class="b-unlock" data-i="${i}"><small>Open</small><b>${money(b.cost)}</b></button></div>`;
          return `<div class="col soon"><span>🔒</span><small>Coming soon</small></div>`;
        }).join("")}</div>
      </div>`).join("") + (hiddenRoads > 0 ? `<div class="biz-more">🛣️ ${hiddenRoads} more road${hiddenRoads > 1 ? "s" : ""} to build…</div>` : "");
    cardEls.length = 0; roadEls.length = 0;
    $$("#page-biz .road").forEach(el => { roadEls[+el.dataset.road] = { el, cv: el.querySelector("canvas") }; });
    $$("#page-biz .col[data-i]").forEach(el => {
      const i = +el.dataset.i;
      cardEls[i] = { el, n: el.querySelector(".b-n"), price: el.querySelector(".s-price"), buy: el.querySelector(".b-buy, .b-unlock"), k: el.querySelector(".b-k"), cost: el.querySelector(".b-cost, .b-unlock b"), ms: el.querySelector(".b-ms i") };
    });
    updateBiz(true);
  }
  function buyAmount(i) {
    if (meta.buyMode === "max") return Math.max(1, econ.maxBuy(i));
    return +meta.buyMode;
  }
  function updateBiz(texts) {
    if (!texts) return;
    for (const i of visibleBiz()) {
      const c = cardEls[i]; if (!c) continue;
      const b = S.biz[i];
      if (!b.n) { c.buy.classList.toggle("can", S.cash >= B[i].cost); continue; }
      const k = buyAmount(i), cost = econ.cost(i, k), per = econ.perSec(i) * street.interval(i);
      c.n.textContent = `Lv ${b.n}`;
      c.price.innerHTML = `<b>${money(per)}</b>/order`;
      c.k.textContent = `Buy ×${k}`;
      c.cost.textContent = money(cost);
      c.buy.classList.toggle("can", S.cash >= cost);
      const nm = econ.nextMilestone(i);
      c.ms.style.width = (nm ? Math.min(100, ((b.n - (nm.prev || 0)) / (nm.at - (nm.prev || 0))) * 100) : 100) + "%";
      c.ms.parentNode.title = nm ? `${b.n}/${nm.at}: ${nm.kind === "speed" ? "more customers" : "prices"} ×2` : "Maxed";
    }
  }
  // draw the roads that are on screen
  function renderLanes() {
    if (tab !== "biz") return;
    roadEls.forEach((rd, r) => {
      if (!rd) return;
      const rc = rd.cv.getBoundingClientRect();
      if (!rc.width || rc.bottom < 0 || rc.top > innerHeight) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (rd.cv.width !== Math.round(rc.width * dpr) || rd.cv.height !== Math.round(rc.height * dpr)) { rd.cv.width = Math.round(rc.width * dpr); rd.cv.height = Math.round(rc.height * dpr); }
      const x = rd.cv.getContext("2d"); x.setTransform(dpr, 0, 0, dpr, 0, 0);
      street.renderRoad(r, x, rc.width, rc.height);
    });
  }

  function doBuy(i, el) {
    const first = !S.biz[i].n, k = first ? 1 : buyAmount(i);
    const res = econ.buy(i, k);
    if (!res) { bump(el); Sound.play("click"); return; }
    Sound.play("buy"); vibrate(8);
    const r = el.getBoundingClientRect();
    FX.sparkle(r.left + r.width / 2, r.top + r.height / 2, 5, 18);
    if (first) {
      buildBiz(); Sound.play("unlock"); FX.confetti(60);
      toast(`${B[i].emoji} <b>${B[i].name}</b> is open for business!`);
    }
    if (cardEls[i]) bump(cardEls[i].el);
    res.milestones.forEach(m => {
      const sp = C.speedMilestones.includes(m);
      Sound.play("milestone");
      const card = cardEls[i] && cardEls[i].el.getBoundingClientRect();
      if (card) { FX.text(card.left + card.width / 2, card.top + 30, sp ? "MORE CUSTOMERS!" : "PRICES ×2!", "f-ms"); FX.sparkle(card.left + card.width * 0.7, card.top + card.height * 0.3, 14, 30); }
      toast(`${B[i].emoji} ${B[i].name} reached <b>${m}</b>: ${sp ? "customers come twice as often" : "prices ×2"}!`);
    });
    res.global.forEach(m => { FX.confetti(140); Sound.play("prestige"); FX.text(innerWidth / 2, innerHeight * 0.4, `ALL ${m}+ → PROFITS ×2!`, "f-big"); });
    if (meta.tut === 1) { meta.tutBuys = (meta.tutBuys || 0) + 1; if (meta.tutBuys >= 3) meta.tut = 2; }
    updateBiz(true); refreshDots();
  }
  function doServe(i) {
    if (!S.biz[i].n) return;
    if (street.serve(i)) return;
    if (econ.hasMgr(i)) toast(`${B[i].manager.emoji} ${B[i].manager.name} is serving here!`);
  }

  // ---------- managers / upgrades / stars / shop ---------------------------------------
  function buildMgr() {
    $("#page-mgr").innerHTML = `<p class="page-note">Managers run a business for you, even while you're away.</p>` + B.map((b, i) => {
      const m = b.manager, hired = econ.hasMgr(i), own = S.biz[i].n > 0;
      return `<div class="row-card ${hired ? "done" : ""}" style="--c:${b.color}">
        <div class="rc-icon">${m.emoji}</div>
        <div class="rc-mid"><b>${m.name}</b><small>Runs ${b.emoji} ${b.name}</small></div>
        ${hired ? `<span class="rc-done">${art("check", "inline")} Hired</span>`
          : own ? `<button class="rc-buy" data-mgr="${i}" data-cost="${m.cost}"><small>Hire</small><b>${money(m.cost)}</b></button>`
          : `<span class="rc-req">Open ${b.name} first</span>`}
      </div>`;
    }).join("");
    updateAffordable();
  }
  function upgName(u) { return u.biz >= 0 ? `${B[u.biz].name} profit ×${u.mult}` : `All profits ×${u.mult}`; }
  function buildUpg() {
    const list = econ.availableUpgrades(8);
    $("#page-upg").innerHTML = `<p class="page-note">Upgrades multiply profits for good (until you collect stars). <b>${S.upgrades.length}</b> / ${econ.upgrades.length} bought</p>` +
      (list.length ? list.map(u => `<div class="row-card" style="--c:${u.biz >= 0 ? B[u.biz].color : "#ffcf33"}">
        <div class="rc-icon">${u.biz >= 0 ? B[u.biz].emoji : "🌟"}</div>
        <div class="rc-mid"><b>${upgName(u)}</b><small>Tier ${u.tier + 1}</small></div>
        <button class="rc-buy" data-upg="${u.id}" data-cost="${u.cost}"><small>Buy</small><b>${money(u.cost)}</b></button></div>`).join("")
        : `<p class="lead">Every upgrade bought. Incredible!</p>`);
    updateAffordable();
  }
  function buildStars() {
    const total = econ.starsTotal(), pend = econ.starsPending(), next = Math.pow(total + 1, 2) * C.prestige.divisor - S.earnedAll;
    $("#page-stars").innerHTML = `
      <div class="stars-hero"><div class="big-star">⭐</div><b id="st-have">${fmt(S.stars)}</b><small>Stars · +${fmt(S.stars * C.prestige.bonusPerStar * 100)}% profit</small></div>
      <div class="stars-card">
        <div class="sc-row"><span>Stars waiting to collect</span><b id="st-pend">+${fmt(pend)}</b></div>
        <div class="sc-row"><span>Next star in</span><b id="st-next">${money(Math.max(0, next))}</b></div>
        <div class="sc-row"><span>Lifetime earnings</span><b id="st-life">${money(S.earnedAll)}</b></div>
        <div class="sc-row"><span>Times sold</span><b>${S.prestiges}</b></div>
      </div>
      <p class="page-note">Sell your empire to collect your stars. You restart from one lemonade stand, but every star adds <b>+${C.prestige.bonusPerStar * 100}%</b> profit forever. Gems and boosts are kept.</p>
      <button class="btn btn-orange btn-wide" id="btn-prestige" ${pend ? "" : "disabled"}><span>⭐ Sell empire · collect +${fmt(pend)}</span></button>`;
    on($("#page-stars"), "#btn-prestige", confirmPrestige);
  }
  function confirmPrestige() {
    const pend = econ.starsPending();
    if (!pend) return;
    const now = S.stars * C.prestige.bonusPerStar * 100, after = (S.stars + pend) * C.prestige.bonusPerStar * 100;
    const m = openModal(`${ribbon("SELL EMPIRE?")}<div class="modal-body center">
      <div class="unlock-stage">${rays()}<div class="big-art bob">⭐</div></div>
      <p class="lead big">Collect <b>+${fmt(pend)}</b> stars</p>
      <p class="lead">Profit bonus <b>+${fmt(now)}%</b> → <b>+${fmt(after)}%</b></p>
      <p class="sub">Your businesses, cash, managers and upgrades reset. Stars, gems and boosts stay.</p>
      <div class="btn-row"><button class="btn btn-blue" id="p-no"><span>Not yet</span></button><button class="btn btn-orange" id="p-yes"><span>Sell!</span></button></div></div>`, "prestige");
    on(m, "#p-no", closeModal);
    on(m, "#p-yes", () => {
      const add = econ.prestige();
      closeModal(); save();
      Sound.play("prestige"); FX.confetti(180);
      FX.text(innerWidth / 2, innerHeight * 0.4, `+${fmt(add)} ⭐`, "f-big");
      displayCash = 0; setTab("biz"); buildBiz(); refreshDots();
    });
  }
  function buildShop() {
    const today = new Date().toLocaleDateString("en-CA"), adLeft = meta.adGems.day === today ? 5 - meta.adGems.n : 5;
    $("#page-shop").innerHTML = `<p class="page-note">Spend gems on instant cash and permanent boosts.</p>` +
      C.shop.map(it => {
        const lvl = it.id === "x2" ? S.gemX2 : 0, maxed = it.max && lvl >= it.max;
        const desc = it.warp ? `Instantly earn ${money(econ.offline(it.warp))} (managed businesses)` : `All profits ×${it.mult} forever${it.max ? ` · ${lvl}/${it.max}` : ""}`;
        return `<div class="row-card shop-item">
          <div class="rc-icon">${it.emoji}</div>
          <div class="rc-mid"><b>${it.name}</b><small>${desc}</small></div>
          ${maxed ? `<span class="rc-done">MAX</span>` : `<button class="rc-buy gem" data-shop="${it.id}" data-gems="${it.gems}"><small>Buy</small><b>${gemArt()} ${it.gems}</b></button>`}</div>`;
      }).join("") +
      `<div class="row-card shop-item ad"><div class="rc-icon">${art("video")}</div><div class="rc-mid"><b>Free gems</b><small>Watch a video for +5 gems · ${adLeft} left today</small></div>
        <button class="rc-buy can" id="ad-gems" ${adLeft > 0 ? "" : "disabled"}><small>Watch</small><b>+5 ${gemArt()}</b></button></div>`;
    $$("#page-shop [data-shop]").forEach(b => b.addEventListener("click", () => {
      const it = C.shop.find(s => s.id === b.dataset.shop);
      if (S.gems < it.gems) { Sound.play("click"); bump(b); return toast("Not enough gems"); }
      if (it.warp && econ.offline(it.warp) <= 0) { Sound.play("click"); bump(b); return toast("Hire a manager first. Time warps pay out businesses that run themselves."); }
      S.gems -= it.gems;
      if (it.warp) { const v = econ.offline(it.warp); econ.earn(v); Sound.play("prestige"); FX.text(innerWidth / 2, innerHeight * 0.4, `+${money(v)}`, "f-big"); }
      else { S.gemX2++; Sound.play("upgrade"); FX.confetti(80); toast("All profits ×2 forever!"); }
      save(); refreshGems(); buildShop();
    }));
    on($("#page-shop"), "#ad-gems", async el => {
      el.disabled = true;
      if (await Ads.showRewarded()) {
        const d = new Date().toLocaleDateString("en-CA");
        if (meta.adGems.day !== d) meta.adGems = { day: d, n: 0 };
        meta.adGems.n++; S.gems += 5; save(); Sound.play("gem"); refreshGems(); bump($("#gem-pill"));
      }
      buildShop();
    });
  }
  function updateAffordable() {
    $$("[data-cost]").forEach(b => b.classList.toggle("can", S.cash >= +b.dataset.cost));
    $$("[data-gems]").forEach(b => b.classList.toggle("can", S.gems >= +b.dataset.gems));
  }

  // ---------- tabs ---------------------------------------------------------------------
  function setTab(t) {
    tab = t;
    $$("#tabbar button").forEach(b => b.classList.toggle("on", b.dataset.tab === t));
    $$(".tab-page").forEach(p => { p.hidden = p.id !== "page-" + t; });
    ({ biz: buildBiz, mgr: buildMgr, upg: buildUpg, stars: buildStars, shop: buildShop })[t]();
    $("#panel").scrollTop = 0;
  }

  // ---------- top bar / dots ----------------------------------------------------------------
  let displayCash = S.cash, rateEMA = 0, earnedFrame = 0;
  function refreshGems() { $$(".gem-count").forEach(e => { e.textContent = fmt(S.gems); }); }
  function refreshDots() {
    $("#mgr-dot").hidden = !B.some((b, i) => S.biz[i].n && !econ.hasMgr(i) && S.cash >= b.manager.cost);
    const u = econ.availableUpgrades(1)[0];
    $("#upg-dot").hidden = !(u && S.cash >= u.cost);
    $("#stars-dot").hidden = !(econ.starsPending() >= Math.max(1, S.stars));
    $("#gift-dot").hidden = !giftState().available;
    $("#missions-dot").hidden = !readyMissions().length;
    $("#star-badge").hidden = !S.stars;
    $("#star-badge").textContent = `⭐ ${fmt(S.stars)} · +${fmt(S.stars * C.prestige.bonusPerStar * 100)}%`;
  }
  function updateTop(dt) {
    displayCash = S.cash < displayCash ? S.cash : displayCash + (S.cash - displayCash) * Math.min(1, dt * 10);
    $("#cash").textContent = money(Math.abs(S.cash - displayCash) < 0.01 ? S.cash : displayCash);
    // smoothed recent income: managed businesses plus whatever you're tapping
    const now = Date.now(), managed = econ.totalPerSec(now, true);
    rateEMA += (Math.max(managed, earnedFrame / Math.max(dt, 1e-3)) - rateEMA) * Math.min(1, dt * 0.8);
    earnedFrame = 0;
    $("#rate").textContent = `${money(Math.max(managed, rateEMA))} / sec`;
    const left = S.boostUntil - now;
    $("#btn-boost").classList.toggle("active", left > 0);
    $("#boost-txt").textContent = left > 0 ? `×${C.boost.multiplier} · ${Econ.fmtTime(left / 1000)}` : `×${C.boost.multiplier} profit`;
  }

  // ---------- boost / lucky balloon / welcome back ----------------------------------------
  async function doBoost() {
    const now = Date.now(), left = Math.max(0, S.boostUntil - now);
    if (left >= (C.boost.maxHours - C.boost.hoursPerAd) * 3600e3) return toast(`Boost is full (max ${C.boost.maxHours}h)`);
    const m = openModal(`${ribbon("PROFIT BOOST")}<div class="modal-body center">
      <div class="unlock-stage">${rays()}<div class="big-art bob">${art("boost")}</div></div>
      <p class="lead big">All profits <b>×${C.boost.multiplier}</b> for <b>${C.boost.hoursPerAd} hours</b></p>
      <p class="sub">${left > 0 ? `Active: ${Econ.fmtTime(left / 1000)} left. Stacks up to ${C.boost.maxHours}h.` : `Stacks up to ${C.boost.maxHours}h.`}</p>
      <button class="btn btn-green btn-wide pulse" id="b-go">${art("video", "inline")}<span>Watch video</span></button>
      <button class="link-btn" id="b-no">No thanks</button></div>`, "boost");
    on(m, "#b-no", closeModal);
    on(m, "#b-go", async () => {
      closeModal();
      if (await Ads.showRewarded()) {
        S.boostUntil = Math.min(Date.now() + C.boost.maxHours * 3600e3, Math.max(Date.now(), S.boostUntil) + C.boost.hoursPerAd * 3600e3);
        save(); Sound.play("prestige"); FX.confetti(80); toast(`🚀 Profits ×${C.boost.multiplier}!`);
      }
    });
  }
  let luckyIn = randRange(C.lucky.everySeconds);
  function randRange([a, b]) { return a + Math.random() * (b - a); }
  function luckyIncome() { const now = Date.now(); return Math.max(50, B.reduce((s, b, i) => s + econ.perSec(i, now), 0) * C.lucky.incomeSeconds); }
  function spawnBalloon() {
    const el = $("#balloon");
    el.innerHTML = `${art("balloon")}<span class="bl-gift">${art("gift")}</span>`;
    el.hidden = false; el.classList.remove("fly"); el.offsetWidth; el.classList.add("fly");
    clearTimeout(el._t); el._t = setTimeout(() => { el.hidden = true; }, 14000);
  }
  function popBalloon() {
    const el = $("#balloon"); el.hidden = true; clearTimeout(el._t);
    const r = el.getBoundingClientRect(); FX.sparkle(r.left + 20, r.top + 20, 12, 24);
    Sound.play("unlock");
    const gems = Math.random() < 0.2, amount = gems ? 3 : luckyIncome();
    const m = openModal(`${ribbon("LUCKY DELIVERY!")}<div class="modal-body center">
      <div class="unlock-stage">${rays()}<div class="big-art bob">${art(gems ? "gem" : "chestClosed")}</div></div>
      <p class="lead big">${gems ? `<b>+${amount}</b> gems!` : `<b>${money(amount)}</b> in cash!`}</p>
      <div class="btn-row"><button class="btn btn-orange" id="l-take"><span>Collect</span></button>
      <button class="btn btn-green" id="l-x">${art("video", "inline")}<span>×${C.lucky.adMultiplier}</span></button></div></div>`, "lucky");
    const give = mult => {
      if (gems) { S.gems += amount * mult; refreshGems(); Sound.play("gem"); }
      else { econ.earn(amount * mult); Sound.play("prestige"); FX.text(innerWidth / 2, innerHeight * 0.35, `+${money(amount * mult)}`, "f-big"); }
      FX.confetti(60); save(); closeModal();
    };
    on(m, "#l-take", () => give(1));
    on(m, "#l-x", async () => { const ok = await Ads.showRewarded(); give(ok ? C.lucky.adMultiplier : 1); });
  }
  let awayShown = false;
  function handleAway(seconds) {
    if (seconds < 60 || awayShown) return;
    const capped = Math.min(seconds, C.offline.capHours * 3600), amount = econ.offline(capped);
    if (amount <= 0) return;
    awayShown = true;
    const h = Math.floor(capped / 3600), mm = Math.floor((capped % 3600) / 60);
    const m = openModal(`${ribbon("WELCOME BACK!")}<div class="modal-body center">
      <div class="unlock-stage">${rays()}<div class="big-art bob">${art("chestOpen")}</div></div>
      <p class="lead">Your managers earned while you were away (${h ? h + "h " : ""}${mm}m${seconds > capped ? `, max ${C.offline.capHours}h` : ""})</p>
      <div class="final-score"><b>${money(amount)}</b></div>
      <div class="btn-row"><button class="btn btn-orange" id="w-take"><span>Collect</span></button>
      <button class="btn btn-green pulse" id="w-x2">${art("video", "inline")}<span>×2</span></button></div></div>`, "away");
    const give = async mult => {
      econ.earn(amount * mult); save(); closeModal(); awayShown = false;
      Sound.play("prestige"); FX.confetti(90);
      FX.text(innerWidth / 2, innerHeight * 0.3, `+${money(amount * mult)}`, "f-big");
      if (C.ads.interstitialAfterAwayMinutes && seconds >= C.ads.interstitialAfterAwayMinutes * 60 && mult === 1) await Ads.showInterstitial();
    };
    on(m, "#w-take", () => give(1));
    on(m, "#w-x2", async () => { const ok = await Ads.showRewarded(); give(ok ? 2 : 1); });
  }

  // ---------- missions (progress read straight from the economy) -----------------------------
  // missions remember their best progress, so selling the empire never undoes them
  function missionValue(m) {
    meta.mBest = meta.mBest || {};
    const v = liveValue(m);
    if (v > (meta.mBest[m.id] || 0)) meta.mBest[m.id] = v;
    return meta.mBest[m.id] || 0;
  }
  function liveValue(m) {
    switch (m.type) {
      case "own": return S.biz[m.biz].n;
      case "managers": return S.managers.length;
      case "earned": return S.earnedAll;
      case "upgrades": return S.upgrades.length;
      case "prestige": return S.prestiges;
      case "ownAll": return Math.min(...S.biz.map(b => b.n));
      case "served": return street.served;
      case "combo": return street.bestCombo;
      default: return 0;
    }
  }
  const activeMissions = () => C.missions.filter(m => !meta.missionsDone.includes(m.id)).slice(0, 3);
  const readyMissions = () => activeMissions().filter(m => missionValue(m) >= m.goal);
  let announced = new Set();
  function checkMissions() {
    C.missions.forEach(missionValue);                    // keep every best value current
    readyMissions().forEach(m => {
      if (announced.has(m.id)) return; announced.add(m.id);
      const el = document.createElement("div"); el.className = "mission-toast";
      el.innerHTML = `${art("check", "inline")}<div><small>MISSION COMPLETE</small><b>${m.text}</b></div>`;
      document.body.appendChild(el); Sound.play("unlock"); setTimeout(() => el.remove(), 2600);
    });
  }
  function showMissions() {
    const rows = activeMissions().map(m => {
      const v = missionValue(m), ready = v >= m.goal, p = Math.min(1, v / m.goal);
      return `<div class="mission ${ready ? "ready" : ""}"><div class="m-txt"><b>${m.text}</b>
        <div class="m-bar"><i style="width:${p * 100}%"></i><span>${m.type === "earned" ? money(Math.min(v, m.goal)) + " / " + money(m.goal) : Math.min(v, m.goal) + "/" + m.goal}</span></div></div>
        ${ready ? `<button class="btn btn-green m-claim" data-id="${m.id}">${gemArt()}<span>${m.gems}</span></button>` : `<div class="m-reward">${gemArt()} ${m.gems}</div>`}</div>`;
    }).join("") || `<p class="lead">All missions complete. True tycoon!</p>`;
    const m = openModal(`${ribbon("MISSIONS")}<div class="modal-body">${rows}
      <p class="sub center-t">${meta.missionsDone.length} / ${C.missions.length} completed</p>
      <button class="btn btn-blue btn-wide" id="m-close"><span>Close</span></button></div>`, "missions");
    m.querySelectorAll(".m-claim").forEach(b => b.addEventListener("click", () => {
      const mi = C.missions.find(x => x.id === b.dataset.id), r = b.getBoundingClientRect();
      if (meta.missionsDone.includes(mi.id)) return;
      meta.missionsDone.push(mi.id); S.gems += mi.gems; save();
      Sound.play("gem"); FX.sparkle(r.left + r.width / 2, r.top + r.height / 2, 12, 30);
      refreshGems(); refreshDots(); setTimeout(showMissions, 300);
    }));
    on(m, "#m-close", closeModal);
  }

  // ---------- gift / settings ----------------------------------------------------------------
  const today = () => new Date().toLocaleDateString("en-CA");
  function giftState() {
    const d = store.get("gift", { last: null, streak: 0 });
    const y = new Date(Date.now() - 864e5).toLocaleDateString("en-CA"), n = E.dailyGems.length, available = d.last !== today();
    return { available, day: available ? (d.last === y ? d.streak % n : 0) : (d.streak - 1) % n };
  }
  function showGift() {
    const st = giftState(), RW = E.dailyGems, reward = RW[st.day];
    const m = openModal(`
      ${ribbon("DAILY GIFT")}
      <div class="modal-body center">
        <div class="unlock-stage">${st.available ? rays() : ""}<div class="big-art ${st.available ? "bob" : ""}" id="chest">${art(st.available ? "chestClosed" : "chestOpen")}</div></div>
        <div class="days">${RW.map((r, i) => `<div class="day ${i < st.day || (!st.available && i === st.day) ? "done" : ""} ${i === st.day && st.available ? "today" : ""} ${i === RW.length - 1 ? "big" : ""}"><small>Day ${i + 1}</small>${gemArt()}<b>${r}</b></div>`).join("")}</div>
        ${st.available ? `<div class="btn-row"><button class="btn btn-orange" id="m-claim"><span>Claim ${reward}</span></button>
          <button class="btn btn-green" id="m-x2">${art("video", "inline")}<span>x2</span></button></div>`
          : `<p class="lead">Come back tomorrow for Day ${((st.day + 1) % RW.length) + 1}!</p><button class="btn btn-green btn-wide" id="m-close"><span>OK</span></button>`}
      </div>`, "daily");
    const claim = amount => {
      store.set("gift", { last: today(), streak: st.day + 1 });
      S.gems += amount; save(); refreshGems(); refreshDots(); bump($("#gem-pill"));
      Sound.play("gem"); FX.confetti(70);
      const c = m.querySelector("#chest"); if (c) { c.innerHTML = art("chestOpen"); c.classList.add("pop"); }
      FX.text(innerWidth / 2, innerHeight * 0.45, `+${amount} ${gemArt()}`, "f-coin big");
      m.querySelectorAll("#m-claim, #m-x2").forEach(b => { b.disabled = true; });
      setTimeout(closeModal, 1100);
    };
    on(m, "#m-claim", () => claim(reward));
    on(m, "#m-x2", async () => { const ok = await Ads.showRewarded(); claim(ok ? reward * 2 : reward); });
    on(m, "#m-close", closeModal);
  }
  function showSettings() {
    const row = (k, label) => `<button class="toggle ${settings[k] ? "on" : ""}" data-k="${k}"><span>${label}</span><i></i></button>`;
    const m = openModal(`
      ${ribbon("SETTINGS")}
      <div class="modal-body">
        ${row("sound", "Sound effects")}${row("music", "Music")}${row("vibe", "Vibration")}
        <button class="btn btn-green btn-wide" id="m-resume"><span>Done</span></button>
        <button class="link-btn" id="m-reset">Reset all progress</button>
      </div>`, "settings");
    m.querySelectorAll(".toggle").forEach(b => b.addEventListener("click", () => {
      const k = b.dataset.k; settings[k] = !settings[k]; b.classList.toggle("on", settings[k]);
      store.set("settings", settings); Sound.setSfx(settings.sound); Sound.setMusic(settings.music);
      Sound.play("click"); if (k === "vibe") vibrate(30);
    }));
    on(m, "#m-resume", closeModal);
    on(m, "#m-reset", () => {
      const c = openModal(`${ribbon("RESET?")}<div class="modal-body center"><p class="lead big">Erase everything and start over?</p><p class="sub">Cash, businesses, stars and gems will be lost.</p>
        <div class="btn-row"><button class="btn btn-blue" id="r-no"><span>Cancel</span></button><button class="btn btn-orange" id="r-yes"><span>Reset</span></button></div></div>`, "reset");
      on(c, "#r-no", closeModal);
      on(c, "#r-yes", () => { Object.keys(localStorage).filter(k => k.startsWith("it_")).forEach(k => localStorage.removeItem(k)); resetting = true; location.reload(); });
    });
  }

  // ---------- tutorial hints ------------------------------------------------------------------
  function hintAt(el, text) {
    const h = $("#hint");
    if (!el || modalOpen()) { h.hidden = true; return; }
    const r = el.getBoundingClientRect();
    if (!r.width) { h.hidden = true; return; }
    h.hidden = false; h.innerHTML = text;
    const below = r.top < innerHeight * 0.5;
    h.className = "hint " + (below ? "below" : "above");
    h.style.left = Math.max(12, Math.min(innerWidth - 232, r.left + r.width / 2 - 110)) + "px";
    h.style.top = (below ? r.bottom + 12 : r.top - 12) + "px";
    h.style.setProperty("--ax", (r.left + r.width / 2 - parseFloat(h.style.left)) + "px");
  }
  function updateHint() {
    if (tab !== "biz" && meta.tut < 2) { $("#hint").hidden = true; return; }
    if (meta.tut === 0) return street.frontWaiting(0) ? hintAt($('[data-road-cv="0"]'), "A customer stopped at your stand! Tap the car to sell 🍋") : ($("#hint").hidden = true);
    if (meta.tut === 1) return S.cash >= econ.cost(0, 1) ? hintAt($('.b-buy[data-i="0"]'), "Buy more stands to earn more!") : ($("#hint").hidden = true);
    if (meta.tut === 2) {
      if (econ.hasMgr(0)) { meta.tut = 3; save(); }
      else if (S.cash >= B[0].manager.cost) return hintAt(tab === "mgr" ? $('[data-mgr="0"]') : $('#tabbar [data-tab="mgr"]'), tab === "mgr" ? "Hire Lemon Lou!" : "Hire a manager to serve customers for you!");
    }
    $("#hint").hidden = true;
  }

  // ---------- main loop -------------------------------------------------------------------------
  let last = performance.now(), textT = 0, slowT = 0, saveT = 0, resetting = false;
  function step(dt) {
    street.update(dt);
    textT -= dt; slowT -= dt; saveT -= dt;
    const texts = textT <= 0;
    if (texts) textT = 0.1;
    if (tab === "biz") updateBiz(texts); else if (texts) updateAffordable();
    updateTop(dt);
    if (slowT <= 0) {
      slowT = 0.5;
      refreshDots(); checkMissions(); updateHint(); refreshGems();
      if (tab === "stars") { const pe = $("#st-pend"); if (pe) { pe.textContent = "+" + fmt(econ.starsPending()); $("#st-life").textContent = money(S.earnedAll); const b = $("#btn-prestige"); if (b) b.disabled = !econ.starsPending(); } }
      if (tab === "biz" && visibleBiz().some(i => !cardEls[i] || (S.biz[i].n > 0) === cardEls[i].el.classList.contains("locked"))) buildBiz();
    }
    luckyIn -= dt;
    if (luckyIn <= 0 && !modalOpen() && S.biz[1].n) { luckyIn = randRange(C.lucky.everySeconds); spawnBalloon(); }
    if (saveT <= 0) { saveT = 5; save(); }
    renderLanes();
  }
  function frame(now) {
    const real = (now - last) / 1000; last = now;
    if (real > 5) handleAway(real);                       // device slept / tab frozen
    if (!document.hidden) step(Math.min(real, 0.25));
    requestAnimationFrame(frame);
  }
  let hiddenAt = 0;
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { hiddenAt = Date.now(); save(); }
    else if (hiddenAt) { const away = (Date.now() - hiddenAt) / 1000; hiddenAt = 0; last = performance.now(); handleAway(away); }
  });
  window.addEventListener("pagehide", () => { if (!resetting) save(); });

  // ---------- binding / boot ------------------------------------------------------------------
  function bind() {
    $("#panel").addEventListener("click", e => {
      const cv = e.target.closest("[data-road-cv]");
      if (cv) {                                  // which of the three shops was tapped?
        const rc = cv.getBoundingClientRect(), slot = Math.floor((e.clientX - rc.left) / rc.width * Street.PER_ROAD);
        const i = +cv.dataset.roadCv * Street.PER_ROAD + Math.max(0, Math.min(Street.PER_ROAD - 1, slot));
        if (i < B.length) doServe(i);
        return;
      }
      const buyEl = e.target.closest(".b-buy, .b-unlock");
      if (buyEl) return doBuy(+buyEl.dataset.i, buyEl);
      const mgr = e.target.closest("[data-mgr]");
      if (mgr) {
        const i = +mgr.dataset.mgr;
        if (!econ.hire(i)) { bump(mgr); Sound.play("click"); return toast("Not enough cash yet"); }
        Sound.play("manager"); FX.confetti(70); vibrate(20);
        toast(`${B[i].manager.emoji} <b>${B[i].manager.name}</b> now runs ${B[i].name}!`);
        save(); buildMgr(); refreshDots(); return;
      }
      const upg = e.target.closest("[data-upg]");
      if (upg) {
        if (!econ.buyUpgrade(upg.dataset.upg)) { bump(upg); Sound.play("click"); return; }
        Sound.play("upgrade"); const r = upg.getBoundingClientRect(); FX.sparkle(r.left + r.width / 2, r.top + r.height / 2, 14, 30);
        save(); buildUpg(); refreshDots();
      }
    });
    $$("#tabbar button").forEach(b => b.addEventListener("click", () => { Sound.play("click"); setTab(b.dataset.tab); }));
    $$("#buy-mode button").forEach(b => b.addEventListener("click", () => {
      Sound.play("click"); meta.buyMode = b.dataset.m; save();
      $$("#buy-mode button").forEach(x => x.classList.toggle("on", x === b)); updateBiz(true);
    }));
    $("#btn-boost").addEventListener("click", () => { Sound.play("click"); doBoost(); });
    $("#btn-missions").addEventListener("click", () => { Sound.play("click"); showMissions(); });
    $("#btn-gift").addEventListener("click", () => { Sound.play("click"); showGift(); });
    $("#btn-settings").addEventListener("click", () => { Sound.play("click"); showSettings(); });
    $("#gem-pill").addEventListener("click", () => { Sound.play("click"); setTab("shop"); });
    $("#balloon").addEventListener("click", popBalloon);
  }
  function buildLogo() {
    if (hasImg(C.art.logo.image)) { $("#logo-wrap").innerHTML = `<img class="logo-img" src="${C.art.logo.image}" alt="${C.title}">`; return; }
    const [a, b] = C.titleLines;
    $("#logo-wrap").innerHTML = `<h1 class="logo-css"><span class="l1">${a}</span><span class="l2">${b}</span></h1>`;
  }

  async function boot() {
    buildLogo();
    $("#btn-settings").innerHTML = ICON.gear;
    const urls = Object.values(C.art).map(a => a.image).filter(Boolean);
    let done = 0;
    await Promise.all(urls.map(u => probe(u).then(() => { done++; $("#load-fill").style.width = (done / urls.length) * 100 + "%"; })));
    if (document.fonts && document.fonts.ready) await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1500))]);
    $$("[data-art]").forEach(el => { el.innerHTML = art(el.dataset.art, "inline"); });
    buildLogo(); bind();
    $$("#buy-mode button").forEach(x => x.classList.toggle("on", x.dataset.m === meta.buyMode));
    $$(".screen").forEach(s => s.classList.toggle("active", s.id === "screen-game"));
    document.body.dataset.screen = "game";
    setTab("biz"); refreshGems(); refreshDots();
    const away = (Date.now() - (meta.lastSeen || Date.now())) / 1000;
    last = performance.now();
    requestAnimationFrame(frame);
    setTimeout(() => handleAway(away), 400);
  }
  // test hooks (a hidden tab pauses requestAnimationFrame)
  window.Tycoon = { econ, step, save, setTab, handleAway, spawnBalloon };
  boot();
})();

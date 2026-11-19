/* PENALTY PRO — title, HUD (round, cup, live shootout scoreboard), win / lose sheets, cup ladder, kits shop, daily gift */
window.UI = (() => {
  const C = window.GAME_CONFIG, P = C.storagePrefix, N = C.levels.count, R = C.rounds.length;
  const $ = s => document.querySelector(s);
  const wrap = $("#wrap"), sheet = $("#sheet");
  const fresh = () => ({ level: 1, coins: 0, stars: {}, kit: C.kits[0].id, kits: [C.kits[0].id], cups: 0, daily: { last: "", streak: 0 }, wins: 0, howSeen: false });
  let S = fresh();
  try { S = Object.assign(fresh(), JSON.parse(localStorage.getItem(P + "save") || "{}")); } catch (e) {}
  const save = () => { try { localStorage.setItem(P + "save", JSON.stringify(S)); } catch (e) {} };
  let cur = 1;

  const cupOf = n => C.cups[Math.min(C.cups.length - 1, Math.floor((n - 1) / R) % C.cups.length)] + (n > R * C.cups.length ? " " + (Math.floor((n - 1) / (R * C.cups.length)) + 1) : "");
  const roundOf = n => C.rounds[(n - 1) % R];
  const isFinal = n => (n - 1) % R === R - 1;

  /* ---------- helpers ---------- */
  const at = s => { document.body.dataset.at = s; };
  function open(html, x = true) { sheet.innerHTML = (x ? `<button class="x" data-close aria-label="Close">✕</button>` : "") + html; wrap.hidden = false; sheet.querySelectorAll("[data-close]").forEach(b => b.onclick = () => { Sound.play("tap"); close(); }); }
  function close() { wrap.hidden = true; sheet.innerHTML = ""; if (document.body.dataset.at === "play" && Game.mode === "paused") Game.pause(false); }
  let toastT = 0;
  function toast(s) { const t = $("#toast"); t.textContent = s; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 1700); }
  const coin = n => `<span class="price"><i class="coin"></i>${n}</span>`;
  const kitNow = () => C.kits.find(k => k.id === S.kit) || C.kits[0];
  function refresh() {
    document.querySelectorAll("[data-coins]").forEach(e => e.textContent = S.coins);
    $("#h-coins").textContent = S.coins;
    $("#t-play-l").textContent = S.level > N ? "Replay" : S.level === 1 ? "Play" : roundOf(S.level);
    $("#b-gift").hidden = !giftReady();
  }
  function addCoins(n) { S.coins += n; save(); refresh(); }

  /* ---------- live scoreboard ---------- */
  Game.on.score = (st, opp) => {
    const K = C.kicks, meNext = st.me.length === st.them.length && !st.over, opNext = st.me.length > st.them.length && !st.over;
    const start = Math.max(K, st.me.length + (meNext ? 1 : 0), st.them.length + (opNext ? 1 : 0)) - K;   // sudden death scrolls the dots
    const dots = (arr, next) => { let h = ""; for (let i = start; i < start + K; i++) h += `<b class="${i < arr.length ? (arr[i] ? "g" : "x") : i === arr.length && next ? "now" : ""}"></b>`; return h; };
    $("#s-me").innerHTML = dots(st.me, meNext); $("#s-op").innerHTML = dots(st.them, opNext);
    $("#s-me-n").textContent = st.me.filter(x => x).length; $("#s-op-n").textContent = st.them.filter(x => x).length;
    $("#s-op-name").textContent = opp.short; $("#s-op-c").style.background = opp.shirt; $("#s-me-c").style.background = kitNow().shirt;
    $("#s-sd").hidden = !(st.me.length >= K && st.them.length >= K);
  };

  /* ---------- play ---------- */
  function play(n) {
    close(); cur = Math.max(1, Math.min(N, n));
    at("play");
    Game.start(cur);
    $("#h-round").textContent = roundOf(cur); $("#h-cup").textContent = cupOf(cur);
    toast(`${roundOf(cur)} vs ${Game.opp.name}`);
    refresh();
    if (cur === 1 && !S.howSeen) { S.howSeen = true; save(); setTimeout(how, 400); }
  }
  function home() { close(); at("title"); Game.attract(); refresh(); }

  Game.on.win = r => {
    const lv = r.n, fin = isFinal(lv), stars = r.sd ? 1 : r.me - r.them >= 2 ? 3 : 2;
    const reward = C.coins.win + r.me * C.coins.perGoal + r.saves * C.coins.perSave + (fin ? C.coins.final : 0);
    S.coins += reward; S.wins++; S.stars[lv] = Math.max(S.stars[lv] || 0, stars); if (lv >= S.level) S.level = lv + 1; if (fin) S.cups = Math.max(S.cups, Math.ceil(lv / R)); save(); refresh();
    const last = lv >= N; let doubled = false;
    open(`<div class="banner">${fin ? "CUP WINNERS!" : "YOU WIN!"}</div>
      ${fin ? `<div class="trophy">🏆</div><p class="sub">You won the ${cupOf(lv)}!</p>` : `<div class="stars"><i class="${stars >= 1 ? "on" : ""}">★</i><i class="${stars >= 2 ? "on" : ""}">★</i><i class="${stars >= 3 ? "on" : ""}">★</i></div>`}
      <div class="final-score">${r.me} – ${r.them}<small>vs ${r.opp.name}${r.sd ? " · sudden death" : ""}</small></div>
      <div class="reward"><i class="coin"></i><span id="w-c">+${reward}</span></div>
      <div class="stack"><button class="btn blue" id="w-dbl">Collect ×2 <span class="ad">AD</span></button>
      <button class="btn green" id="w-next">${last ? "Cups" : fin ? "Next cup" : roundOf(lv + 1)}</button></div>`, false);
    $("#w-dbl").onclick = async () => { if (doubled) return; const b = $("#w-dbl"); b.disabled = true; if (await Ads.showRewarded()) { doubled = true; addCoins(reward); $("#w-c").textContent = "+" + reward * 2; Sound.play("coin"); } else b.disabled = false; };
    $("#w-next").onclick = async () => { Sound.play("tap"); close(); if (C.ads.interstitialEvery > 0 && S.wins % C.ads.interstitialEvery === 0) await Ads.showInterstitial(); last ? levels() : play(lv + 1); };
  };
  Game.on.lose = r => {
    const coinsWon = r.me * C.coins.perGoal + r.saves * C.coins.perSave;
    if (coinsWon) addCoins(coinsWon);
    open(`<div class="banner lose">${r.sd ? "SO CLOSE!" : "KNOCKED OUT"}</div>
      <div class="big-ico">🥅</div>
      <div class="final-score">${r.me} – ${r.them}<small>${r.opp.name} go through${r.sd ? " in sudden death" : ""}</small></div>
      <p class="sub">${coinsWon ? `+${coinsWon} coins for goals and saves` : "Aim for the corners and bend it!"}</p>
      <div class="stack"><button class="btn green" id="l-retry">Rematch</button><button class="btn white" id="l-home">Home</button></div>`, false);
    $("#l-retry").onclick = () => { Sound.play("tap"); play(cur); };
    $("#l-home").onclick = () => { Sound.play("tap"); home(); };
  };

  /* ---------- pause / settings ---------- */
  const toggles = () => `<div class="toggles"><button class="tg ${Sound.sfx ? "on" : ""}" id="tg-sfx">Sound effects<i></i></button><button class="tg ${Sound.music ? "on" : ""}" id="tg-mus">Music<i></i></button></div>`;
  function bindToggles() {
    $("#tg-sfx").onclick = e => { Sound.setSfx(!Sound.sfx); e.currentTarget.classList.toggle("on", Sound.sfx); Sound.play("tap"); };
    $("#tg-mus").onclick = e => { Sound.setMusic(!Sound.music); e.currentTarget.classList.toggle("on", Sound.music); };
  }
  function pause() {
    if (Game.mode !== "play") return;
    Game.pause(true); Sound.play("tap");
    open(`<h2>Paused</h2>${toggles()}<div class="stack"><button class="btn green" id="p-go">Resume</button><div class="row2"><button class="btn white" id="p-re">Restart</button><button class="btn white" id="p-home">Home</button></div></div>`, false);
    bindToggles();
    $("#p-go").onclick = () => { Sound.play("tap"); close(); };
    $("#p-re").onclick = () => { Sound.play("tap"); play(cur); };
    $("#p-home").onclick = () => { Sound.play("tap"); home(); };
  }
  $("#h-pause").onclick = pause;
  $("#t-sound").onclick = () => { Sound.unlock(); Sound.play("tap"); open(`<h2>Settings</h2>${toggles()}<div class="stack"><button class="btn white" id="s-how">How to play</button></div>`); bindToggles(); $("#s-how").onclick = how; };
  addEventListener("keydown", e => { if ((e.key === "Escape" || e.key === "p") && wrap.hidden) pause(); if (e.key === "Enter" && document.body.dataset.at === "title" && wrap.hidden) play(Math.min(S.level, N)); });
  document.addEventListener("visibilitychange", () => { if (document.hidden && Game.mode === "play" && wrap.hidden) pause(); });

  /* ---------- cup ladder (levels) ---------- */
  function levels() {
    Sound.play("tap");
    let h = "";
    for (let i = 1; i <= N; i++) {
      if ((i - 1) % R === 0) h += `<h3 class="cup-h">${S.cups >= Math.ceil(i / R) ? "🏆 " : ""}${cupOf(i)}</h3>`;
      const done = i < S.level, curL = i === S.level, lock = i > S.level, lab = ["R16", "QF", "SF", "F"][(i - 1) % R] || i;
      h += `<button class="lv ${done ? "done" : curL ? "cur" : "lock"}" data-n="${i}" ${lock ? "disabled" : ""}>${lock ? "🔒" : lab}${done ? `<small class="lvs">${"★".repeat(S.stars[i] || 0)}</small>` : ""}</button>`;
    }
    open(`<h2>Cups</h2><p class="sub">${S.cups} of ${Math.ceil(N / R)} cups won</p><div class="grid cups">${h}</div>`);
    sheet.querySelectorAll(".lv:not(.lock)").forEach(b => b.onclick = () => { Sound.play("tap"); play(+b.dataset.n); });
    const c = sheet.querySelector(".lv.cur"); if (c) c.scrollIntoView({ block: "center" });
  }

  /* ---------- kits shop ---------- */
  const shirt = k => `<svg viewBox="0 0 100 90"><defs><pattern id="st-${k.id}" width="16" height="90" patternUnits="userSpaceOnUse"><rect width="8" height="90" fill="${k.shirt}"/><rect x="8" width="8" height="90" fill="${k.trim}"/></pattern></defs>
    <path d="M30 6 L18 10 L2 28 L16 42 L24 34 L24 84 L76 84 L76 34 L84 42 L98 28 L82 10 L70 6 Q50 22 30 6 Z" fill="${k.stripes ? `url(#st-${k.id})` : k.shirt}" stroke="rgba(0,0,0,.25)" stroke-width="2"/>
    <path d="M30 6 Q50 22 70 6" fill="none" stroke="${k.trim}" stroke-width="5"/><path d="M2 28 L16 42 M98 28 L84 42" stroke="${k.trim}" stroke-width="5"/>
    <rect x="62" y="60" width="26" height="26" rx="6" fill="${k.keeper}" stroke="#fff" stroke-width="3"/><circle cx="75" cy="73" r="5" fill="#fff"/></svg>`;
  function shop() {
    Sound.play("tap");
    const body = `<p class="sub">Your kit and your keeper's shirt (corner badge).</p><div class="items">${C.kits.map(k => { const own = S.kits.includes(k.id), on = S.kit === k.id;
      return `<button class="item ${on ? "on" : ""}" data-s="${k.id}"><div class="sw kit-sw">${shirt(k)}</div>${k.name}${on ? "<small>In use</small>" : own ? "<small>Owned</small>" : coin(k.price)}</button>`; }).join("")}</div>`;
    open(`<h2>Kits</h2>${body}`);
    sheet.querySelectorAll("[data-s]").forEach(b => b.onclick = () => {
      const id = b.dataset.s, it = C.kits.find(x => x.id === id);
      if (!S.kits.includes(id)) { if (S.coins < it.price) return toast(`Need ${it.price - S.coins} more coins`); S.coins -= it.price; S.kits.push(id); Sound.play("buy"); } else Sound.play("tap");
      S.kit = id; save(); refresh(); Game.setKit(id); shop();
    });
  }

  /* ---------- daily gift ---------- */
  const today = () => new Date().toISOString().slice(0, 10);
  const giftReady = () => S.daily.last !== today();
  function gift() {
    Sound.unlock(); Sound.play("tap");
    const yest = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    const streak = giftReady() ? (S.daily.last === yest ? S.daily.streak % 7 : 0) : (S.daily.streak - 1 + 7) % 7;
    const days = C.daily.map((c, i) => `<div class="day ${i < streak ? "got" : i === streak && giftReady() ? "now" : ""}">Day ${i + 1}<i class="coin"></i><b>${c}</b></div>`).join("");
    open(`<h2>Daily gift</h2><p class="sub">Come back every day for bigger gifts.</p><div class="days">${days}</div>
      <div class="stack">${giftReady() ? `<button class="btn green" id="g-get">Collect ${C.daily[streak]}</button><button class="btn blue" id="g-x2">Collect ×2 <span class="ad">AD</span></button>` : `<p class="sub">Next gift tomorrow!</p>`}</div>`);
    const claim = mult => { const n = C.daily[streak] * mult; S.daily = { last: today(), streak: streak + 1 }; addCoins(n); Sound.play("coin"); toast(`+${n} coins`); close(); };
    if (giftReady()) { $("#g-get").onclick = () => claim(1); $("#g-x2").onclick = async () => { const b = $("#g-x2"); b.disabled = true; if (await Ads.showRewarded()) claim(2); else b.disabled = false; }; }
  }

  /* ---------- how to play ---------- */
  function how() {
    Sound.play("tap");
    open(`<h2>How to play</h2><div class="how">
      <div><b>1</b>Your shot: swipe up from the ball. Where your finger stops is where you aim.</div>
      <div><b>2</b>Bend your swipe to curl the ball. Swipe too hard and it flies over the bar!</div>
      <div><b>3</b>Their shot: tap where you think it's going and your keeper dives there.</div>
      <div><b>4</b>Five kicks each, then sudden death. Win four rounds to lift the cup!</div>
    </div><div class="stack"><button class="btn green" data-close>Kick off!</button></div>`);
  }

  /* ---------- title ---------- */
  $("#tagline").textContent = C.tagline;
  $("#t-play").onclick = () => { Sound.unlock(); Sound.play("tap"); play(Math.min(S.level, N)); };
  $("#t-levels").onclick = () => { Sound.unlock(); levels(); };
  $("#t-shop").onclick = () => { Sound.unlock(); shop(); };
  $("#t-how").onclick = () => { Sound.unlock(); how(); };
  $("#t-gift").onclick = gift;
  wrap.addEventListener("pointerdown", e => { if (e.target === wrap && sheet.querySelector("[data-close]")) close(); });

  Game.setKit(S.kit);
  home();
  return { play, home, levels, shop, gift, how, pause, close, toast, state: S, save, refresh };
})();

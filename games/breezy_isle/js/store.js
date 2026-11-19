/* BREEZY ISLE — save data and the rules around it (bag, coins, friends, journal, camp) */
window.Store = (() => {
  const C = window.GAME_CONFIG, P = C.storagePrefix;
  const fresh = () => ({
    coins: C.startCoins, bag: {}, found: {}, friends: {}, tools: { basket: 0, rod: 0, net: 0, shovel: 0 },
    unlocked: ["palm"], area: "palm", x: 420, clock: 0.3, camp: ["tent", null, null, null, null, null].slice(0, C.campSlots),
    owned: ["tent"], daily: { last: "", streak: 0 }, journalClaimed: 0, trips: 0, intro: false,
    stats: { fruit: 0, digs: 0, bugs: 0, fish: 0, quests: 0, sold: 0 }
  });
  let S = fresh();
  try { const raw = localStorage.getItem(P + "save"); if (raw) S = Object.assign(fresh(), JSON.parse(raw)); } catch (e) {}
  let dirty = false;
  const save = () => { dirty = true; };
  setInterval(() => { if (dirty) { dirty = false; try { localStorage.setItem(P + "save", JSON.stringify(S)); } catch (e) {} } }, 1500);
  addEventListener("pagehide", () => { try { localStorage.setItem(P + "save", JSON.stringify(S)); } catch (e) {} });

  const count = id => S.bag[id] || 0;
  const bagUsed = () => Object.values(S.bag).reduce((a, b) => a + b, 0);
  const bagCap = () => C.bag[Math.min(S.tools.basket, C.bag.length - 1)];
  function add(id, n = 1) {
    const room = Math.max(0, bagCap() - bagUsed()), k = Math.min(n, room);
    if (k > 0) { S.bag[id] = count(id) + k; save(); }
    return k;
  }
  function take(id, n = 1) { if (count(id) < n) return false; S.bag[id] -= n; if (!S.bag[id]) delete S.bag[id]; save(); return true; }
  function discover(id) { if (S.found[id]) { S.found[id]++; save(); return false; } S.found[id] = 1; save(); return true; }
  const comfort = () => S.camp.reduce((a, id) => a + (id ? (C.decor.find(d => d.id === id) || { comfort: 0 }).comfort : 0), 0);
  const sellBonus = () => Math.min(0.5, comfort() / 100);
  const priceOf = id => Math.round(C.items[id].value * (1 + sellBonus()));
  function sell(id, n) { const k = Math.min(n, count(id)); if (!k) return 0; take(id, k); const c = priceOf(id) * k; S.coins += c; S.stats.sold += k; save(); return c; }

  /* friends & requests */
  const areaOfFriend = fid => C.areas.find(a => a.friends.includes(fid));
  function friend(fid) {
    if (!S.friends[fid]) S.friends[fid] = { hearts: 0, req: null, done: 0, met: false, gifts: 0 };
    if (S.friends[fid].req && !C.items[S.friends[fid].req.item]) S.friends[fid].req = null;
    const f = S.friends[fid];
    if (!f.req) f.req = newRequest(fid);
    return f;
  }
  function newRequest(fid) {
    const ar = areaOfFriend(fid), F = C.friends[fid];
    // each animal has a favourite kind of thing, with some variety
    const fav = { cat: "fish", bunny: "fruit", turtle: "shells", bird: "shells", frog: "bugs", bear: "fruit", duck: "fish", pig: "fruit", fox: "bugs" }[F.animal];
    const kinds = ["fruit", "shells", "fish", "bugs"];
    const kind = Math.random() < 0.6 ? fav : kinds[Math.floor(Math.random() * 4)];
    const f0 = S.friends[fid];
    if (!f0 || !f0.done) {   // the very first favour is always something easy to find nearby
      const easy = [...ar.fruit, ...ar.shells].filter(id => C.items[id].value <= 10);
      const id0 = easy[(fid.length) % easy.length];
      return { item: id0, n: 2, coins: Math.round(C.items[id0].value * 2 * 1.8 + 20) };
    }
    let pool = ar[kind].filter(id => !C.items[id].rarity || C.items[id].rarity <= 3);
    pool = pool.filter(id => C.items[id].difficulty == null || C.items[id].difficulty <= 4);
    const id = pool[Math.floor(Math.random() * pool.length)];
    const v = C.items[id].value, n = v < 12 ? 3 + (Math.random() < 0.5 ? 1 : 0) : v < 22 ? 2 : 1;
    return { item: id, n, coins: Math.round(v * n * 1.8 + 10) };
  }
  function giveRequest(fid) {
    const f = friend(fid), r = f.req;
    if (!take(r.item, r.n)) return null;
    S.coins += r.coins; f.hearts++; f.done++; S.stats.quests++;
    const lvl = C.hearts.filter(h => f.hearts >= h).length;
    let gift = null;
    if (lvl > f.gifts) { gift = C.gifts[(f.gifts) % C.gifts.length]; f.gifts = lvl; if (!S.owned.includes(gift)) S.owned.push(gift); else { S.coins += 100; gift = "coins"; } }
    const res = { coins: r.coins, hearts: f.hearts, gift };
    f.req = newRequest(fid); save();
    return res;
  }

  /* daily */
  const day = (o = 0) => { const d = new Date(Date.now() + o * 864e5); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); };
  const dailyReady = () => S.daily.last !== day();
  function claimDaily() {
    if (!dailyReady()) return 0;
    const next = S.daily.last === day(-1) ? S.daily.streak % 7 + 1 : 1;
    const g = C.daily[next - 1]; S.coins += g; S.daily = { last: day(), streak: next }; save(); return g;
  }
  const journalCount = () => Object.keys(S.found).length;
  const journalTotal = () => Object.values(C.items).filter(i => i.kind !== "fruit").length + Object.values(C.items).filter(i => i.kind === "fruit").length;

  return {
    get S() { return S; }, save, count, bagUsed, bagCap, add, take, discover, comfort, sellBonus, priceOf, sell,
    friend, giveRequest, areaOfFriend, dailyReady, claimDaily, day, journalCount, journalTotal,
    reset() { S = fresh(); save(); }
  };
})();

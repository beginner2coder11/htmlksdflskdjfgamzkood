/* MEADOW KEEPER — save data and the rules that read it */
window.Store = (() => {
  const C = window.GAME_CONFIG, P = C.storagePrefix;
  const fresh = () => ({
    nectar: C.start.nectar, seeds: C.start.seeds, xp: 0,
    items: C.start.items.map(([id, c, r], i) => ({ id, c, r, seed: i * 1.37 })),
    cleared: C.startChunks.map(([a, b]) => a + "," + b), journal: {},
    stats: { planted: 0, photos: 0, collected: 0, cleared: 0, night: 0 },
    tasks: [0, 1, 2], taskPtr: 3, last: Date.now(), clock: 0.3, daily: { last: "", streak: 0 }, clears: 0, intro: false
  });
  let S = fresh();
  try { const r = localStorage.getItem(P + "save"); if (r) S = Object.assign(fresh(), JSON.parse(r)); } catch (e) {}
  let dirty = false;
  const save = () => { dirty = true; };
  const flush = () => { S.last = Date.now(); try { localStorage.setItem(P + "save", JSON.stringify(S)); } catch (e) {} dirty = false; };
  setInterval(() => { if (dirty) flush(); else { S.last = Date.now(); try { localStorage.setItem(P + "save", JSON.stringify(S)); } catch (e) {} } }, 3000);
  addEventListener("pagehide", flush);

  const level = () => { let l = 1; C.levels.forEach((x, i) => { if (S.xp >= x) l = i + 1; }); return Math.min(l, C.levels.length); };
  const levelProgress = () => { const l = level(), a = C.levels[l - 1], b = C.levels[l] ?? a + 1000; return Math.min(1, (S.xp - a) / (b - a)); };
  function addXp(n) { const before = level(); S.xp += n; save(); return level() > before; }
  const tagCount = () => { const t = {}; for (const it of S.items) for (const g of C.items[it.id].tags) t[g] = (t[g] || 0) + 1; return t; };
  const species = () => Object.keys(S.journal).length;
  function stat(s) {
    if (s.startsWith("tag:")) return tagCount()[s.slice(4)] || 0;
    if (s.startsWith("sp:")) return S.journal[s.slice(3)] || 0;
    if (s === "species") return species();
    if (s === "level") return level();
    return S.stats[s] || 0;
  }
  function clearCost() { return C.clearCost[Math.min(S.stats.cleared, C.clearCost.length - 1)]; }
  const day = (o = 0) => { const d = new Date(Date.now() + o * 864e5); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); };
  return { get S() { return S; }, save, flush, level, levelProgress, addXp, tagCount, species, stat, clearCost, day, reset() { S = fresh(); flush(); } };
})();

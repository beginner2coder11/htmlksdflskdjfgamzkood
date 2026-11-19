/* CROWD RUSH — level generator + best-path solver (shared by the game and the tests).
   A level is a list of events along the track: gate pairs, enemy crowds, obstacles, then the finale.
   The solver tries every combination of gate choices (with expected obstacle losses) to find the best
   crowd a smart player can have at every point; enemy crowds and the boss are sized from that, so the
   best path always wins and poor choices don't. Levels come from seed + level number. */
window.Levels = (() => {
  const C = window.GAME_CONFIG;
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const step = n => C.levels.curve.find(s => n <= s.upTo) || C.levels.curve[C.levels.curve.length - 1];
  const isBoss = n => C.levels.bossEvery > 0 && n % C.levels.bossEvery === 0;
  const MAXR = 2.9, OBST = 0.22;                                                    // widest crowd (units), most an obstacle can take
  const radius = N => Math.min(MAXR, 0.36 * Math.sqrt(Math.max(1, Math.min(N, C.maxShown)) + 0.3));   // crowd formation radius

  function apply(N, op) {
    if (op.t === "+") return N + op.v;
    if (op.t === "x") return N * op.v;
    if (op.t === "-") return Math.max(0, N - op.v);
    return Math.max(0, Math.floor(N / op.v));
  }
  // runners an obstacle costs a careful player (the game's real losses depend on steering)
  function obstacleLoss(N, ev) {
    if (ev.k === "wall") { const R = radius(N), w = ev.gap[1] - ev.gap[0]; return w >= 2 * R ? 0 : Math.ceil(N * Math.min(0.9, 1 - w / (2 * R))); }
    return Math.ceil(N * OBST);
  }
  // the best crowd size through the events, and the gate choices (0 = left, 1 = right) that give it
  function solve(events, start) {
    const gates = events.filter(e => e.k === "gate").length;
    let best = -1, bestChoice = null, bestTrace = null;
    for (let mask = 0; mask < 1 << gates; mask++) {
      let N = start, g = 0, ok = true; const trace = [];
      for (const e of events) {
        if (e.k === "gate") N = apply(N, e.ops[(mask >> g++) & 1]);
        else if (e.k === "enemy") N -= e.n;
        else if (e.k === "sweep" || e.k === "saw" || e.k === "wall") N -= obstacleLoss(N, e);
        N = Math.min(N, 9999);
        trace.push(N);
        if (N <= 0) { ok = false; break; }
      }
      if (ok && N > best) { best = N; bestChoice = mask; bestTrace = trace; }
    }
    return { best, choice: bestChoice, trace: bestTrace };
  }

  const cache = {};
  function get(n) {
    if (cache[n]) return cache[n];
    const st = step(n), R = rng(C.levels.seed * 7919 + n * 104729), boss = isBoss(n);
    const events = []; let z = 34, E = 1;
    const pick = a => a[Math.floor(R() * a.length)];
    for (let i = 0; i < st.events; i++) {
      const roll = R();
      if (i > 0 && roll < st.obstacles) {
        const k = pick(["sweep", "saw", "wall"]);
        const ev = { k, z };
        if (k === "wall") { const w = 2.5 + R() * 3, c = (R() - 0.5) * (C.trackWidth - w); ev.gap = [c - w / 2, c + w / 2]; }
        if (k === "saw") ev.speed = 1.6 + R() * 1.2;
        if (k === "sweep") ev.spin = (R() < 0.5 ? -1 : 1) * (1.6 + R() * 1.2);
        events.push(ev); E -= obstacleLoss(E, ev);
      } else if (i > 1 && st.enemy > 0 && roll < st.obstacles + 0.2) {
        const m = Math.max(2, Math.round(E * st.enemy * (0.8 + R() * 0.4)));
        events.push({ k: "enemy", z, n: m }); E -= m;
      } else {
        // a gate pair: usually one good + one bad, sometimes two good ones to weigh up
        const scale = Math.max(4, E);
        const good = () => R() < 0.4 && E >= 3 ? { t: "x", v: R() < 0.7 ? 2 : 3 } : { t: "+", v: Math.max(3, Math.round(scale * (0.3 + R() * 0.7) / 5) * 5 || 5) };
        const bad = () => R() < 0.4 && E >= 6 ? { t: "/", v: 2 } : { t: "-", v: Math.max(2, Math.round(scale * (0.2 + R() * 0.4))) };
        let ops = R() < st.trap ? [good(), good()] : [good(), bad()];
        if (R() < 0.5) ops.reverse();
        events.push({ k: "gate", z, ops });
        E = Math.max(...ops.map(o => apply(E, o)));
      }
      E = Math.max(1, E);
      z += 30 + R() * 10;
    }
    const start = 1;
    let sol = solve(events, start);
    // make sure every enemy is beatable on the best path (shrink enemies that aren't)
    for (let guard = 0; sol.best <= 0 && guard < 20; guard++) { events.filter(e => e.k === "enemy").forEach(e => e.n = Math.max(1, Math.floor(e.n * 0.7))); sol = solve(events, start); }
    const finale = boss ? { k: "boss", z: z + 10, hp: Math.max(3, Math.round(sol.best * st.boss)) } : { k: "stairs", z: z + 10 };
    const L = { n, boss, events, finale, start, best: sol.best, choice: sol.choice, trace: sol.trace, length: finale.z + (boss ? 30 : 60) };
    return (cache[n] = L);
  }

  return { get, solve, apply, radius, obstacleLoss, isBoss, MAXR, OBST, count: () => C.levels.count };
})();

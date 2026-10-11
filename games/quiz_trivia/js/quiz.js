/* ==========================================================================
   QUIZ — question bank, round runner (classic / survival / lightning / daily),
   timer, scoring and lifelines. Renders the question screen; ui.js handles
   everything around it through Quiz.on callbacks.
   ========================================================================== */
window.Quiz = (() => {
  const C = window.GAME_CONFIG, S = C.scoring;
  const $ = s => document.querySelector(s);
  const on = {};

  // ---------- bank ---------------------------------------------------------
  let bank = [];
  function setBank(rows) {
    bank = rows.map((r, id) => {
      const [c, d, q, ...rest] = r;
      if (typeof rest[0] === "boolean") return { id, c, d, q, type: "tf", answers: ["True", "False"], correct: rest[0] ? "True" : "False" };
      return { id, c, d, q, type: "mc", answers: rest.slice(0, 4), correct: rest[0] };
    }).filter(x => x.q && x.correct);
  }
  setBank(window.QUESTIONS || []);
  const count = cat => bank.filter(b => !cat || b.c === cat).length;

  function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const shuffle = (a, r = Math.random) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // prefer questions the player hasn't seen yet
  function pick(n, { cat = null, diff = null, exclude = new Set(), rand = Math.random, seen = on.seen ? on.seen() : new Set() } = {}) {
    let pool = bank.filter(b => (!cat || b.c === cat) && (!diff || diff.includes(b.d)) && !exclude.has(b.id));
    if (!pool.length && diff) pool = bank.filter(b => (!cat || b.c === cat) && !exclude.has(b.id));
    const fresh = shuffle(pool.filter(b => !seen.has(b.id)), rand);
    const old = shuffle(pool.filter(b => seen.has(b.id)), rand);
    return fresh.concat(old).slice(0, n);
  }

  // ---------- round state --------------------------------------------------
  let R = null, timer = 0, paused = false;
  const el = {
    get card() { return $("#q-card"); }, get text() { return $("#q-text"); }, get answers() { return $("#answers"); },
    get chip() { return $("#q-chip"); }, get ring() { return $("#timer-ring"); }, get time() { return $("#timer-num"); }
  };

  function start(opts) {
    const m = C.modes[opts.mode];
    R = {
      mode: opts.mode, cat: opts.cat || null, i: 0, score: 0, correct: 0, wrong: 0, streak: 0, bestStreak: 0,
      lives: m.lives || 0, total: m.questions || 0, used: new Set(), results: [], qTime: m.time || 0,
      totalLeft: m.seconds || 0, list: null
    };
    if (opts.mode === "classic") R.list = pick(m.questions, { cat: R.cat });
    if (opts.mode === "daily") {
      const day = Math.floor(Date.now() / 864e5), r = rng(day * 131 + 7);
      R.list = [...pick(3, { diff: [1], rand: r, seen: new Set() }), ...pick(4, { diff: [2], rand: r, seen: new Set() }), ...pick(3, { diff: [3], rand: r, seen: new Set() })];
      R.total = R.list.length;
    }
    R.list && (R.total = R.list.length);
    paused = false;
    on.change && on.change(R);
    next();
  }

  function nextQuestion() {
    if (R.list) return R.list[R.i] || null;
    // survival ramps difficulty; lightning favours quick ones
    let diff;
    if (R.mode === "survival") diff = R.i < 5 ? [1] : R.i < 12 ? [1, 2] : R.i < 20 ? [2, 3] : [3];
    else diff = R.i < 6 ? [1, 2] : [1, 2, 3];
    return pick(1, { diff, exclude: R.used })[0] || pick(1, { exclude: R.used })[0] || null;
  }

  function next() {
    if (R.mode !== "lightning") clearInterval(timer); // lightning's clock runs across questions
    if (R.mode !== "lightning" && R.list && R.i >= R.total) return end();
    const q = nextQuestion();
    if (!q) return end();
    R.q = q; R.used.add(q.id); R.locked = false;
    R.order = q.type === "tf" ? ["True", "False"] : shuffle(q.answers.slice());
    R.removed = new Set(); R.poll = null;
    on.seenAdd && on.seenAdd(q.id);
    render();
    if (R.mode === "lightning") startLightningClock();
    else startTimer(R.qTime);
    on.change && on.change(R);
  }

  function render() {
    const q = R.q, cat = C.categories.find(c => c.id === q.c) || C.categories[0];
    document.documentElement.style.setProperty("--cat", cat.color);
    el.chip.innerHTML = `<span>${cat.emoji}</span>${cat.name}<i class="diff d${q.d}">${"●".repeat(q.d)}</i>`;
    el.text.textContent = q.q;
    el.answers.className = "answers " + q.type;
    el.answers.innerHTML = R.order.map((a, i) => `
      <button class="ans" data-i="${i}" style="--d:${i * 60}ms">
        <b class="key">${q.type === "tf" ? (a === "True" ? "✓" : "✕") : "ABCD"[i]}</b><span>${a}</span><i class="poll"></i>
      </button>`).join("");
    // replay entrance animations
    el.card.classList.remove("enter"); el.card.offsetWidth; el.card.classList.add("enter");
    Sound.play("whoosh");
  }

  // ---------- timers -------------------------------------------------------
  let tEnd = 0, tTotal = 0, lastTick = -1;
  function startTimer(sec) {
    tTotal = sec; tEnd = performance.now() + sec * 1000; lastTick = -1;
    $("#timer").hidden = false;
    clearInterval(timer);
    timer = setInterval(tickTimer, 100);
    tickTimer();
  }
  function tickTimer() {
    if (paused || R.locked) return;
    const left = Math.max(0, (tEnd - performance.now()) / 1000);
    drawTimer(left, tTotal);
    const whole = Math.ceil(left);
    if (whole !== lastTick && whole <= 5 && whole > 0) { Sound.play("tick", whole <= 3); lastTick = whole; }
    if (left <= 0) { clearInterval(timer); timeUp(); }
  }
  function drawTimer(left, total) {
    const k = total ? left / total : 0;
    el.ring.style.strokeDashoffset = (1 - k) * 283;
    el.time.textContent = Math.ceil(left);
    $("#timer").classList.toggle("urgent", left <= 5);
  }
  function startLightningClock() {
    $("#timer").hidden = false;
    if (R.clockOn) return;
    R.clockOn = true; R.clockEnd = performance.now() + R.totalLeft * 1000; tTotal = C.modes.lightning.seconds;
    clearInterval(timer);
    timer = setInterval(() => {
      if (paused) return;
      const left = Math.max(0, (R.clockEnd - performance.now()) / 1000);
      R.totalLeft = left;
      drawTimer(left, Math.max(tTotal, left));
      const whole = Math.ceil(left);
      if (whole !== lastTick && whole <= 5 && whole > 0) { Sound.play("tick", true); lastTick = whole; }
      if (left <= 0) { clearInterval(timer); R.locked = true; Sound.play("timeup"); setTimeout(end, 600); }
    }, 100);
  }
  function setPaused(p) {
    if (!R) return;
    if (p && !paused) { paused = true; R.pausedAt = performance.now(); }
    else if (!p && paused) {
      const d = performance.now() - R.pausedAt;
      tEnd += d; if (R.clockEnd) R.clockEnd += d;
      paused = false;
    }
  }

  // ---------- answering ----------------------------------------------------
  function mult() { return Math.min(S.streakMax, 1 + Math.max(0, R.streak - 1) * S.streakStep); }

  function answer(i) {
    if (!R || R.locked || paused) return;
    R.locked = true;
    if (R.mode !== "lightning") clearInterval(timer);
    const q = R.q, picked = R.order[i], ok = picked === q.correct;
    const btns = [...el.answers.children];
    const btn = btns[i], good = btns[R.order.indexOf(q.correct)];
    btn.classList.add(ok ? "right" : "wrong");
    if (!ok) setTimeout(() => good.classList.add("right", "reveal"), 350);
    btns.forEach(b => b.classList.add("done"));

    let gain = 0;
    if (ok) {
      R.streak++; R.correct++;
      R.bestStreak = Math.max(R.bestStreak, R.streak);
      const left = R.mode === "lightning" ? 0 : Math.max(0, (tEnd - performance.now()) / 1000);
      gain = Math.round((S.correct + Math.ceil(left) * S.timeBonus) * mult());
      R.score += gain;
      if (R.mode === "lightning") R.clockEnd += C.modes.lightning.bonusPerCorrect * 1000;
    } else {
      R.streak = 0; R.wrong++;
      if (R.mode === "survival") R.lives--;
    }
    R.results.push({ id: q.id, c: q.c, ok });
    on.answer && on.answer({ ok, gain, streak: R.streak, btn, R });
    on.change && on.change(R);
    advance(ok);
  }
  function timeUp() {
    if (R.locked) return;
    R.locked = true;
    const btns = [...el.answers.children];
    btns.forEach(b => b.classList.add("done"));
    btns[R.order.indexOf(R.q.correct)].classList.add("right", "reveal");
    R.streak = 0; R.wrong++;
    if (R.mode === "survival") R.lives--;
    R.results.push({ id: R.q.id, c: R.q.c, ok: false });
    Sound.play("timeup");
    on.timeup && on.timeup(R);
    on.change && on.change(R);
    advance(false);
  }
  function advance(ok) {
    const delay = R.mode === "lightning" ? (ok ? 450 : 900) : ok ? 1100 : 1700;
    setTimeout(() => {
      if (!R) return;
      R.i++;
      if (R.mode === "survival" && R.lives <= 0) return end();
      if (R.mode === "lightning" && R.totalLeft <= 0) return;
      next();
    }, delay);
  }
  function end() {
    clearInterval(timer);
    if (!R || R.ended) return;
    R.ended = true;
    Sound.setIntense(false);
    on.end && on.end(R);
  }
  function quit() { clearInterval(timer); if (R) R.ended = true; R = null; Sound.setIntense(false); }

  // ---------- lifelines ----------------------------------------------------
  function lifeline(k) {
    if (!R || R.locked || paused) return false;
    const q = R.q, btns = [...el.answers.children];
    if (k === "fifty") {
      if (q.type === "tf") return "tf";
      if (R.removed.size) return "used";
      const wrong = R.order.map((a, i) => i).filter(i => R.order[i] !== q.correct);
      shuffle(wrong).slice(0, 2).forEach(i => { R.removed.add(i); btns[i].classList.add("gone"); btns[i].disabled = true; });
      return true;
    }
    if (k === "time") {
      const s = C.lifelines.time.seconds;
      if (R.mode === "lightning") R.clockEnd += s * 1000; else { tEnd += s * 1000; tTotal += s; }
      return true;
    }
    if (k === "skip") {
      R.locked = true;
      if (R.mode !== "lightning") clearInterval(timer);
      // skipped questions don't count; Classic swaps in a fresh one so the round stays the same length
      if (R.list) { const extra = pick(1, { cat: R.cat, exclude: new Set([...R.used, ...R.list.map(x => x.id)]) })[0]; if (extra) R.list[R.i] = extra; else R.i++; }
      setTimeout(next, 250);
      return true;
    }
    if (k === "poll") {
      if (R.poll) return "used";
      // the crowd is usually right — less sure on hard questions
      const live = R.order.map((a, i) => i).filter(i => !R.removed.has(i));
      const ci = R.order.indexOf(q.correct);
      const sure = [0.7, 0.55, 0.42][q.d - 1] + Math.random() * 0.15;
      const pct = {}; let rest = 1 - sure;
      live.filter(i => i !== ci).forEach((i, n, arr) => { const v = n === arr.length - 1 ? rest : rest * Math.random(); pct[i] = v; rest -= v; });
      pct[ci] = sure;
      R.poll = pct;
      live.forEach(i => { const p = Math.round(pct[i] * 100); btns[i].style.setProperty("--p", p + "%"); btns[i].querySelector(".poll").textContent = p + "%"; btns[i].classList.add("polled"); });
      return true;
    }
    return false;
  }

  // ---------- input --------------------------------------------------------
  document.addEventListener("click", e => {
    const b = e.target.closest(".ans");
    if (!b || b.disabled || !R) return;
    Sound.play("select");
    answer(+b.dataset.i);
  });
  window.addEventListener("keydown", e => {
    if (!R || R.locked || document.body.dataset.screen !== "game") return;
    const k = e.key.toLowerCase();
    const map = R.q.type === "tf" ? { t: 0, f: 1, "1": 0, "2": 1 } : { a: 0, b: 1, c: 2, d: 3, "1": 0, "2": 1, "3": 2, "4": 3 };
    if (k in map && !R.removed.has(map[k])) answer(map[k]);
  });

  return {
    on, start, quit, lifeline, setPaused, setBank, count, pick, answer,
    get round() { return R; },
    get bankSize() { return bank.length; },
    mult: () => (R ? mult() : 1)
  };
})();

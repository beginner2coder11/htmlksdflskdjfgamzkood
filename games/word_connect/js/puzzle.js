/* ==========================================================================
   PUZZLE — crossword grid + swipe letter wheel for one level.
   UI drives it with Puzzle.load / hint / target / shuffle and listens via
   Puzzle.on callbacks.
   ========================================================================== */
window.Puzzle = (() => {
  const $ = s => document.querySelector(s);
  const gridEl = $("#grid"), gridArea = $("#grid-area");
  const wheelEl = $("#wheel"), wheelArea = $("#wheel-area"), linesEl = $("#wheel-lines");
  const previewEl = $("#preview");
  const on = {};

  let L = null;                 // level data
  let found = new Set(), revealed = new Set(), bonus = new Set();
  let cells = new Map();        // "r,c" -> { r, c, ch, words: [i], el }
  let order = [];               // wheel letter order (indexes into L.l)
  let letters = [];             // { ch, el, x, y }
  let chain = [], dragging = false, pointer = null, targeting = false, locked = false;
  let geo = { cell: 40, wheel: 260 };

  const key = (r, c) => r + "," + c;
  const wordCells = i => { const [w, r, c, d] = L.w[i]; return [...w].map((_, k) => key(d ? r + k : r, d ? c : c + k)); };
  const shown = k => { const cell = cells.get(k); return revealed.has(k) || cell.words.some(i => found.has(L.w[i][0])); };

  // ---------- load ---------------------------------------------------------
  function load(level, saved) {
    L = level;
    found = new Set(saved?.found || []);
    revealed = new Set(saved?.revealed || []);
    bonus = new Set(saved?.bonus || []);
    order = saved?.order || [...L.l].map((_, i) => i);
    cells = new Map();
    L.w.forEach(([w, r, c, d], i) => {
      [...w].forEach((ch, k) => {
        const kk = key(d ? r + k : r, d ? c : c + k);
        const cell = cells.get(kk) || { r: d ? r + k : r, c: d ? c : c + k, ch, words: [] };
        cell.words.push(i);
        cells.set(kk, cell);
      });
    });
    buildGrid();
    buildWheel();
    clearChain();
    layout();
  }
  const serialize = () => L && { found: [...found], revealed: [...revealed], bonus: [...bonus], order };

  // ---------- grid ---------------------------------------------------------
  function buildGrid() {
    gridEl.innerHTML = "";
    cells.forEach((cell, k) => {
      const el = document.createElement("div");
      el.className = "cell";
      el.dataset.k = k;
      el.innerHTML = `<span>${cell.ch}</span>`;
      if (shown(k)) el.classList.add("shown", revealed.has(k) && !cell.words.some(i => found.has(L.w[i][0])) ? "hinted" : "solid");
      gridEl.appendChild(el);
      cell.el = el;
    });
  }
  function layoutGrid() {
    const w = gridArea.clientWidth, h = gridArea.clientHeight;
    if (!w || !h) return;
    const size = Math.floor(Math.min(w / L.C, h / L.R, 62));
    geo.cell = size;
    gridEl.style.width = size * L.C + "px";
    gridEl.style.height = size * L.R + "px";
    gridEl.style.fontSize = size * 0.56 + "px";
    cells.forEach(cell => {
      cell.el.style.width = cell.el.style.height = size + "px";
      cell.el.style.transform = `translate(${cell.c * size}px, ${cell.r * size}px)`;
    });
  }

  // ---------- wheel --------------------------------------------------------
  function buildWheel() {
    wheelEl.querySelectorAll(".letter").forEach(e => e.remove());
    letters = order.map(i => {
      const el = document.createElement("div");
      el.className = "letter";
      el.textContent = L.l[i];
      wheelEl.appendChild(el);
      return { ch: L.l[i], el, x: 0, y: 0 };
    });
  }
  function layoutWheel(animate) {
    const size = Math.floor(Math.min(wheelArea.clientWidth * 0.86, wheelArea.clientHeight * 0.98, 320));
    if (!size) return;
    geo.wheel = size;
    wheelEl.style.width = wheelEl.style.height = size + "px";
    const n = letters.length;
    const ls = size * (n <= 4 ? 0.27 : n <= 5 ? 0.25 : n === 6 ? 0.23 : 0.21);
    const rad = size / 2 - ls * 0.62 - size * 0.04;
    letters.forEach((l, i) => {
      const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
      const x = size / 2 + Math.cos(a) * rad, y = size / 2 + Math.sin(a) * rad;
      const from = l.el.getBoundingClientRect();
      l.x = x; l.y = y;
      Object.assign(l.el.style, { width: ls + "px", height: ls + "px", fontSize: ls * 0.62 + "px", left: x - ls / 2 + "px", top: y - ls / 2 + "px" });
      if (animate && from.width) {
        const to = l.el.getBoundingClientRect();
        l.el.animate([{ transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(.8)` }, { transform: "none" }],
          { duration: 380, easing: "cubic-bezier(.2,1.4,.4,1)" });
      }
    });
    linesEl.setAttribute("viewBox", `0 0 ${size} ${size}`);
    geo.letter = ls;
  }
  function layout() { if (!L) return; layoutGrid(); layoutWheel(false); }

  function shuffle() {
    if (dragging || locked) return;
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    // keep each letter's element, just move it to its new seat
    const pool = letters.slice();
    letters = order.map(i => pool.splice(pool.findIndex(l => l.ch === L.l[i]), 1)[0]);
    layoutWheel(true);
    on.change && on.change();
  }

  // ---------- swiping ------------------------------------------------------
  function local(e) { const b = wheelEl.getBoundingClientRect(); return { x: e.clientX - b.left, y: e.clientY - b.top }; }
  function letterAt(p) {
    const r = geo.letter * 0.58;
    return letters.findIndex(l => Math.hypot(l.x - p.x, l.y - p.y) < r);
  }
  function drawLines() {
    const pts = chain.map(i => `${letters[i].x},${letters[i].y}`);
    if (dragging && pointer && chain.length) pts.push(`${pointer.x},${pointer.y}`);
    linesEl.innerHTML = pts.length > 1 ? `<polyline points="${pts.join(" ")}"/>` : "";
  }
  function renderPreview(state = "") {
    const word = chain.map(i => letters[i].ch).join("");
    previewEl.className = "preview " + state + (word ? " has" : "");
    previewEl.innerHTML = [...word].map(ch => `<b>${ch}</b>`).join("");
  }
  function clearChain() {
    chain = []; dragging = false; pointer = null;
    letters.forEach(l => l.el.classList.remove("on"));
    drawLines();
  }

  wheelEl.addEventListener("pointerdown", e => {
    if (!L || locked) return;
    const p = local(e), i = letterAt(p);
    on.touch && on.touch();
    if (i < 0) return;
    try { wheelEl.setPointerCapture(e.pointerId); } catch (err) { /* synthetic pointer */ }
    dragging = true; pointer = p; chain = [i];
    letters[i].el.classList.add("on");
    Sound.play("select", 0);
    renderPreview(); drawLines();
  });
  wheelEl.addEventListener("pointermove", e => {
    if (!dragging) return;
    pointer = local(e);
    const i = letterAt(pointer);
    if (i >= 0) {
      if (chain.length > 1 && i === chain[chain.length - 2]) {
        // back-track
        letters[chain.pop()].el.classList.remove("on");
        Sound.play("select", Math.max(0, chain.length - 1));
        renderPreview();
      } else if (!chain.includes(i)) {
        chain.push(i);
        letters[i].el.classList.add("on");
        Sound.play("select", chain.length - 1);
        if (navigator.vibrate && on.vibeOn && on.vibeOn()) navigator.vibrate(6);
        renderPreview();
      }
    }
    drawLines();
  });
  const end = () => {
    if (!dragging) return;
    const word = chain.map(i => letters[i].ch).join("");
    dragging = false; pointer = null;
    drawLines();
    if (word.length < 2) { clearChain(); renderPreview(); return; }
    submit(word);
  };
  wheelEl.addEventListener("pointerup", end);
  wheelEl.addEventListener("pointercancel", end);

  // ---------- checking words ----------------------------------------------
  function previewRects() { return [...previewEl.children].map(b => b.getBoundingClientRect()); }

  function submit(word) {
    const idx = L.w.findIndex(w => w[0] === word);
    if (idx >= 0 && !found.has(word)) {
      const rects = previewRects();
      found.add(word);
      flyToCells(idx, rects);
      finishChain("ok");
      on.found && on.found(word, idx);
      on.change && on.change();
      if (L.w.every(w => found.has(w[0]))) { locked = true; setTimeout(() => on.complete && on.complete(), 900 + word.length * 70); }
      return;
    }
    if (idx >= 0) {
      wordCells(idx).forEach(k => { const el = cells.get(k).el; el.classList.remove("flash"); el.offsetWidth; el.classList.add("flash"); });
      finishChain("repeat");
      on.repeat && on.repeat(word);
      return;
    }
    if (L.b.includes(word)) {
      const rects = previewRects();
      if (bonus.has(word)) { finishChain("repeat"); on.bonusRepeat && on.bonusRepeat(word); return; }
      bonus.add(word);
      finishChain("bonus");
      on.bonus && on.bonus(word, rects);
      on.change && on.change();
      return;
    }
    finishChain("wrong");
    on.wrong && on.wrong(word);
  }
  function finishChain(state) {
    renderPreview(state);
    letters.forEach(l => l.el.classList.remove("on"));
    chain = [];
    setTimeout(() => { if (!dragging) renderPreview(); }, state === "wrong" ? 450 : 260);
  }

  // letters travel from the preview bubble into their grid cells
  function flyToCells(idx, rects) {
    wordCells(idx).forEach((k, n) => {
      const cell = cells.get(k), el = cell.el;
      const to = el.getBoundingClientRect();
      const from = rects[n] || to;
      const already = el.classList.contains("solid");
      const fl = document.createElement("div");
      fl.className = "fly-letter";
      fl.textContent = cell.ch;
      Object.assign(fl.style, { left: to.left + "px", top: to.top + "px", width: to.width + "px", height: to.height + "px", fontSize: to.width * 0.56 + "px" });
      document.body.appendChild(fl);
      const sx = from.width / to.width;
      const a = fl.animate([
        { transform: `translate(${from.left - to.left + (from.width - to.width) / 2}px, ${from.top - to.top + (from.height - to.height) / 2}px) scale(${sx})`, opacity: 1 },
        { transform: "translate(0,0) scale(1.15)", opacity: 1, offset: 0.85 },
        { transform: "none", opacity: 1 }
      ], { duration: 420, delay: n * 70, easing: "cubic-bezier(.3,.1,.3,1)", fill: "backwards" });
      a.onfinish = () => {
        fl.remove();
        el.classList.remove("hinted");
        el.classList.add("shown", "solid");
        if (!already) { el.classList.remove("pop"); el.offsetWidth; el.classList.add("pop"); }
        Sound.play("flip");
      };
    });
  }

  // ---------- hints --------------------------------------------------------
  function revealCell(k) {
    if (shown(k)) return false;
    revealed.add(k);
    const el = cells.get(k).el;
    el.classList.add("shown", "hinted", "pop");
    // a word whose every letter is now visible counts as found
    cells.get(k).words.forEach(i => {
      const w = L.w[i][0];
      if (!found.has(w) && wordCells(i).every(shown)) {
        found.add(w);
        wordCells(i).forEach(kk => { const e = cells.get(kk).el; e.classList.remove("hinted"); e.classList.add("solid"); });
        on.found && on.found(w, i, true);
      }
    });
    on.change && on.change();
    if (L.w.every(w => found.has(w[0]))) { locked = true; setTimeout(() => on.complete && on.complete(), 900); }
    return el;
  }
  function hint() {
    // prefer the unfinished word with the fewest letters showing; reveal its first hidden letter
    let best = null;
    L.w.forEach((w, i) => {
      if (found.has(w[0])) return;
      const ks = wordCells(i), hidden = ks.filter(k => !shown(k));
      if (!hidden.length) return;
      const score = ks.length - hidden.length;
      if (!best || score < best.score) best = { score, k: hidden[0] };
    });
    return best ? revealCell(best.k) : false;
  }
  function setTargeting(onOff) {
    targeting = onOff;
    gridEl.classList.toggle("targeting", onOff);
  }
  gridEl.addEventListener("click", e => {
    if (!targeting) return;
    const el = e.target.closest(".cell");
    if (!el || el.classList.contains("shown")) return;
    setTargeting(false);
    on.targetPicked && on.targetPicked(el.dataset.k);
  });

  window.addEventListener("resize", layout);
  if (window.ResizeObserver) new ResizeObserver(layout).observe(gridArea);

  return {
    on, load, layout, shuffle, hint, revealCell, setTargeting, serialize,
    get targeting() { return targeting; },
    set locked(v) { locked = v; },
    get level() { return L; },
    get progress() { return L ? { found: found.size, total: L.w.length, bonus: bonus.size } : null; },
    // positions of wheel letters on screen (tutorial hand)
    letterScreen(ch, used = []) {
      const b = wheelEl.getBoundingClientRect();
      const i = letters.findIndex((l, k) => l.ch === ch && !used.includes(k));
      return i < 0 ? null : { i, x: b.left + letters[i].x, y: b.top + letters[i].y };
    }
  };
})();

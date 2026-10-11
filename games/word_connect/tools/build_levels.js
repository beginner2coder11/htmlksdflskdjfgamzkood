#!/usr/bin/env node
/* ==========================================================================
   WORD CONNECT — level builder (run once, ships the result as js/levels.js)

     node tools/build_levels.js            # 150 levels + 60 daily puzzles
     node tools/build_levels.js --levels 300 --daily 90 --seed 7

   • Answers come from tools/common_words.txt (familiar words only).
   • Bonus words come from that list + /usr/share/dict/words (if present) + simple
     plurals, minus tools/blocklist.txt. Only each level's bonus words are shipped.
   • Crosswords are built by placing words one by one where they cross existing
     letters, keeping the layout compact; the best of many attempts wins.
   ========================================================================== */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const arg = (name, def) => { const i = process.argv.indexOf("--" + name); return i > 0 ? Number(process.argv[i + 1]) : def; };
const LEVELS = arg("levels", 150), DAILY = arg("daily", 60), SEED = arg("seed", 2026);
// Hand-picked openers so the first puzzles are friendly; the rest are generated.
const PINNED = ["cat", "tea", "now", "star", "time", "cold", "heart", "stone"];

// ---- word lists -------------------------------------------------------------
const readWords = file => fs.readFileSync(file, "utf8").split("\n")
  .filter(l => !l.trim().startsWith("#")).join(" ").split(/\s+/).map(w => w.trim().toLowerCase()).filter(Boolean);
const valid = w => /^[a-z]{3,7}$/.test(w);
const block = new Set(readWords(path.join(__dirname, "blocklist.txt")));
const common = [...new Set(readWords(path.join(__dirname, "common_words.txt")).filter(valid))].filter(w => !block.has(w));
const commonSet = new Set(common);

const bonusDict = new Set(common);
const SYS = "/usr/share/dict/words";
if (fs.existsSync(SYS)) fs.readFileSync(SYS, "utf8").split("\n").forEach(w => { if (valid(w)) bonusDict.add(w); });
common.forEach(w => { if (w.length < 7 && !w.endsWith("s")) bonusDict.add(w + "s"); });
block.forEach(w => bonusDict.delete(w));
const bonusArr = [...bonusDict];

// ---- helpers ----------------------------------------------------------------
function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const rand = rng(SEED);
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const counts = w => { const c = {}; for (const ch of w) c[ch] = (c[ch] || 0) + 1; return c; };
function formable(word, base) {
  const c = {};
  for (const ch of word) { c[ch] = (c[ch] || 0) + 1; if (c[ch] > (base[ch] || 0)) return false; }
  return true;
}
const subWords = (letters, list) => { const b = counts(letters); return list.filter(w => w.length <= letters.length && formable(w, b)); };

// ---- crossword ----------------------------------------------------------------
// cells: Map "r,c" -> { ch, h: bool, v: bool }
function buildCrossword(words, maxW, maxSize) {
  const cells = new Map();
  const key = (r, c) => r + "," + c;
  const placed = [];
  const get = (r, c) => cells.get(key(r, c));
  function check(word, r, c, d) {
    const dr = d ? 1 : 0, dc = d ? 0 : 1;
    if (get(r - dr, c - dc) || get(r + dr * word.length, c + dc * word.length)) return -1;
    let cross = 0;
    for (let i = 0; i < word.length; i++) {
      const rr = r + dr * i, cc = c + dc * i, cell = get(rr, cc);
      if (cell) {
        if (cell.ch !== word[i] || (d ? cell.v : cell.h)) return -1;
        cross++;
      } else {
        // no side-by-side neighbours for new letters
        if (get(rr + dc, cc + dr) || get(rr - dc, cc - dr)) return -1;
      }
    }
    return cross;
  }
  function put(word, r, c, d) {
    const dr = d ? 1 : 0, dc = d ? 0 : 1;
    for (let i = 0; i < word.length; i++) {
      const k = key(r + dr * i, c + dc * i);
      const cell = cells.get(k) || { ch: word[i], h: false, v: false };
      if (d) cell.v = true; else cell.h = true;
      cells.set(k, cell);
    }
    placed.push([word, r, c, d]);
  }
  function bounds(extra) {
    let r0 = Infinity, r1 = -Infinity, c0 = Infinity, c1 = -Infinity;
    const add = (r, c) => { r0 = Math.min(r0, r); r1 = Math.max(r1, r); c0 = Math.min(c0, c); c1 = Math.max(c1, c); };
    cells.forEach((_, k) => { const [r, c] = k.split(",").map(Number); add(r, c); });
    if (extra) { const [w, r, c, d] = extra; add(r, c); add(r + (d ? w.length - 1 : 0), c + (d ? 0 : w.length - 1)); }
    return { r0, r1, c0, c1, rows: r1 - r0 + 1, cols: c1 - c0 + 1 };
  }

  put(words[0], 0, 0, 0);
  for (const w of words.slice(1)) {
    if (placed.length >= maxW) break;
    let best = null;
    cells.forEach((cell, k) => {
      const [r, c] = k.split(",").map(Number);
      if (cell.h && cell.v) return;
      const d = cell.h ? 1 : 0; // cross perpendicular
      for (let i = 0; i < w.length; i++) {
        if (w[i] !== cell.ch) continue;
        const sr = d ? r - i : r, sc = d ? c : c - i;
        const cross = check(w, sr, sc, d);
        if (cross < 1) continue;
        const b = bounds([w, sr, sc, d]);
        if (b.rows > maxSize.rows || b.cols > maxSize.cols) continue;
        const score = cross * 8 - (b.rows * b.cols) * 0.35 - Math.abs(b.rows - b.cols) * 0.8 + rand() * 3;
        if (!best || score > best.score) best = { score, args: [w, sr, sc, d] };
      }
    });
    if (best) put(...best.args);
  }
  const b = bounds();
  return {
    words: placed.map(([w, r, c, d]) => [w, r - b.r0, c - b.c0, d]),
    rows: b.rows, cols: b.cols
  };
}

function makeLevel(base, minW, maxW, maxSize) {
  const subs = subWords(base, common).filter(w => w !== base);
  if (subs.length + 1 < minW) return null;
  let best = null;
  for (let attempt = 0; attempt < 70; attempt++) {
    // longer words first (they anchor the grid), with a little shuffle inside each length
    const pool = shuffle(subs.slice()).sort((a, b) => b.length - a.length + (rand() - 0.5) * 1.2);
    const cw = buildCrossword([base, ...pool], maxW, maxSize);
    if (cw.words.length < minW) continue;
    const score = cw.words.length * 20 - cw.rows * cw.cols * 0.6 + cw.words.reduce((s, w) => s + w[0].length, 0);
    if (!best || score > best.score) best = { ...cw, score };
  }
  if (!best) return null;
  const answers = new Set(best.words.map(w => w[0]));
  const bonus = subWords(base, bonusArr).filter(w => !answers.has(w)).sort();
  return {
    l: shuffle(base.split("")).join("").toUpperCase(),
    w: best.words.map(([w, r, c, d]) => [w.toUpperCase(), r, c, d]),
    R: best.rows, C: best.cols,
    b: bonus.map(w => w.toUpperCase())
  };
}

// difficulty curve
function plan(n) {
  if (n <= 3) return { len: 3, minW: 2, maxW: 3, size: { rows: 4, cols: 5 } };
  if (n <= 12) return { len: 4, minW: 3, maxW: 4, size: { rows: 6, cols: 6 } };
  if (n <= 40) return { len: 5, minW: 4, maxW: 6, size: { rows: 7, cols: 8 } };
  if (n <= 90) return { len: 6, minW: 5, maxW: 8, size: { rows: 9, cols: 9 } };
  return { len: 7, minW: 6, maxW: 9, size: { rows: 10, cols: 10 } };
}

const usedSets = new Set();
const byLen = {};
common.forEach(w => { (byLen[w.length] = byLen[w.length] || []).push(w); });
Object.values(byLen).forEach(shuffle);

function nextLevel(p) {
  const list = byLen[p.len];
  while (list.length) {
    const base = list.shift();
    const sig = base.split("").sort().join("");
    if (usedSets.has(sig)) continue;
    const L = makeLevel(base, p.minW, p.maxW, p.size);
    if (L) { usedSets.add(sig); return L; }
  }
  throw new Error("Ran out of base words for length " + p.len + " — add more words to common_words.txt");
}

const levels = [];
for (let n = 1; n <= LEVELS; n++) {
  const p = plan(n), pin = PINNED[n - 1];
  const L = pin && pin.length === p.len ? makeLevel(pin, p.minW, p.maxW, p.size) : null;
  if (L) { usedSets.add(pin.split("").sort().join("")); levels.push(L); }
  else levels.push(nextLevel(p));
}
const daily = [];
for (let n = 0; n < DAILY; n++) daily.push(nextLevel({ len: 6, minW: 5, maxW: 8, size: { rows: 9, cols: 9 } }));

const out = `/* Generated by tools/build_levels.js — do not edit by hand.
   l = wheel letters, w = [word, row, col, dir(0 across / 1 down)], R×C grid, b = bonus words */
window.LEVELS = ${JSON.stringify(levels)};
window.DAILY = ${JSON.stringify(daily)};
`;
fs.writeFileSync(path.join(ROOT, "js", "levels.js"), out);

const avgW = (levels.reduce((s, l) => s + l.w.length, 0) / levels.length).toFixed(1);
console.log(`levels: ${levels.length}  daily: ${daily.length}  avg words/level: ${avgW}  file: ${(out.length / 1024).toFixed(0)} KB`);
console.log(`answer words: ${common.length}  bonus dictionary: ${bonusDict.size}`);

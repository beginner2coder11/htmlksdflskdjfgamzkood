/* ==========================================================================
   CRATE ESCAPE — GAME CONFIG
   Slide the wooden blocks so the red crate can leave through the gate.
   Puzzles live in js/levels.js (made by tools/gen.js with a BFS solver, so
   each one has an exact minimum move count). Blocks are DOM elements.
   ========================================================================== */
window.GAME_CONFIG = {
  title: "Crate Escape",
  tagline: "A wooden puzzle box",

  stars: { three: 0, two: 4 },      // moves ≤ min + three → 3★, ≤ min + two → 2★
  hints: 3,                         // starting hints; a hint shows the best next move
  hintEveryStars: 6,                // +1 hint per this many stars earned

  // paint colours for the wooden blocks (cycled), the crate is always `crate`
  crate: "#d6453a",
  paints: ["#e9c46a", "#7fb8a4", "#f4a261", "#8fa9d8", "#c9a7d8", "#a3c46a", "#f2d0a4", "#9cc5d0"],
  woods: [
    { id: "pine",   name: "Pine",   board: "#d9b483", rim: "#8a5a32", wins: 0 },
    { id: "walnut", name: "Walnut", board: "#8a6040", rim: "#4a2f1c", wins: 10 },
    { id: "birch",  name: "Birch",  board: "#ecd9b8", rim: "#b08a5a", wins: 25 }
  ],

  ads: { enabled: true, simulate: true, interstitialEvery: 3 },
  storagePrefix: "ce_"
};

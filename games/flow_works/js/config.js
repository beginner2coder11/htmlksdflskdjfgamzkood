/* ==========================================================================
   FLOW WORKS — GAME CONFIG
   Rotate pipe tiles until every pipe joins one network fed by the pump, with
   no open ends. Each board is generated from a random spanning tree, so it
   always has a solution. Drawn as an SVG engineering blueprint.
   ========================================================================== */
window.GAME_CONFIG = {
  title: "Flow Works",
  tagline: "Rotate. Connect. Pressurise.",

  levels: 60,
  // size grows with the level; from `wrapFrom` the edges wrap around like a torus
  sizes: [[4, 4], [5, 5], [5, 6], [6, 6], [6, 7], [7, 7], [7, 8], [8, 8], [8, 9], [9, 9]],
  levelsPerSize: 6,
  wrapFrom: 37,
  crossChance: 0.12,          // chance a 4-way junction is allowed in the tree

  hints: 3,                    // free hints at start; +1 per 3 stars
  stars: [1.15, 1.6],          // turns ≤ minimum×1.15 → 3★, ≤ ×1.6 → 2★, otherwise 1★

  ads: { enabled: true, simulate: true, interstitialEvery: 3 },
  storagePrefix: "fw_"
};

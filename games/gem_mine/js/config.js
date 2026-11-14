/* ==========================================================================
   GEM MINE — GAME CONFIG
   A lantern-lit match-3 in an old mine: carved wood, brass and cut gems.
   Gems are drawn as faceted polygons in code; assets/ can stay empty.
   ========================================================================== */
window.GAME_CONFIG = {
  title: "Gem Mine",
  tagline: "Match the gems. Dig deeper.",

  // Gem kinds. sides = polygon cut (0 = round brilliant). Up to 6 are used.
  gems: [
    { id: "ruby",     name: "Ruby",     color: "#e0314b", light: "#ff98a6", dark: "#7a0b1f", sides: 6 },
    { id: "emerald",  name: "Emerald",  color: "#1fb36b", light: "#8ef2be", dark: "#0b5a33", sides: 8, rect: true },
    { id: "sapphire", name: "Sapphire", color: "#2f6fe4", light: "#9cc0ff", dark: "#102f73", sides: 4 },
    { id: "topaz",    name: "Topaz",    color: "#f2a81d", light: "#ffe08a", dark: "#7d4c00", sides: 3 },
    { id: "amethyst", name: "Amethyst", color: "#9b4de0", light: "#d6b0ff", dark: "#43136e", sides: 0 },
    { id: "diamond",  name: "Diamond",  color: "#cfe8f2", light: "#ffffff", dark: "#6c8d9c", sides: 5 }
  ],

  board: { cols: 8, rows: 8 },

  scoring: {
    match3: 60, match4: 120, match5: 200,
    perSpecialCell: 20,      // each gem cleared by a special
    cascadeBonus: 0.5        // each cascade step multiplies by (1 + n * this)
  },

  // Boosters bought with gold coins
  boosters: [
    { id: "pick",    name: "Pickaxe", icon: "⛏️", desc: "Break any one gem", price: 60 },
    { id: "shuffle", name: "Shuffle", icon: "🔀", desc: "Mix up the board",  price: 40 },
    { id: "dynamite",name: "Dynamite",icon: "🧨", desc: "Blast a 3×3 area",  price: 90 }
  ],

  /* Level generator. Goals rotate: score → collect → ice → mixed.
     Board shapes (holes) are picked from `shapes`. */
  levels: 50,
  shapes: [
    ["........","........","........","........","........","........","........","........"],
    ["#......#","........","........","........","........","........","........","#......#"],
    ["##....##","#......#","........","........","........","........","#......#","##....##"],
    ["...##...","........","........","#......#","#......#","........","........","...##..."],
    ["........",".#....#.","........","...##...","...##...","........",".#....#.","........"],
    ["###..###","##....##","#......#","........","........","#......#","##....##","###..###"],
    ["........","........","##....##","........","........","##....##","........","........"]
  ],
  coinsPerStar: 15,
  coinsPerMoveLeft: 3,

  ads: { enabled: true, simulate: true, interstitialEvery: 3 },
  storagePrefix: "gm_"
};

/* ==========================================================================
   TILE FUSE — GAME CONFIG
   A brutalist number-fusing slider. Two equal tiles fuse into the next number.
   The board is plain HTML (no canvas), so tiles are styled in css/style.css.
   ========================================================================== */
window.GAME_CONFIG = {
  title: "Tile Fuse",
  tagline: "Slide. Fuse. Climb.",

  // Modes. size = board size, goal = tile to reach for the "win" banner (you can keep going).
  modes: [
    { id: "classic", name: "Classic", code: "01", size: 4, goal: 11, desc: "4×4 · reach 11" },
    { id: "grand",   name: "Grand",   code: "02", size: 5, goal: 12, desc: "5×5 · reach 12" },
    { id: "tight",   name: "Tight",   code: "03", size: 3, goal: 8,  desc: "3×3 · reach 8" },
    { id: "rush",    name: "Rush",    code: "04", size: 4, goal: 9,  desc: "4×4 · 120 s clock", time: 120 },
    { id: "daily",   name: "Daily",   code: "05", size: 4, goal: 10, desc: "Same seed for everyone today", daily: true }
  ],

  spawn: {
    twoChance: 0.1,          // chance a new tile is a 2 instead of a 1
    wildChance: 0.02,        // chance of a wild ✱ tile that fuses with anything (+1)
    rushBonusSeconds: 3      // seconds added in Rush for every fuse of 6 or higher
  },

  // Score for creating a tile of value v is 2^v. Combo = more than one fuse in a slide.
  comboBonus: 0.25,          // +25% score per extra fuse in the same slide

  tools: {
    undoStart: 2,            // free undos per game
    smashPrice: 25,          // tokens to remove one tile
    undoPrice: 10            // tokens for an extra undo
  },
  tokensPerGame: 2,          // + highest tile value / 2 at the end of a game

  ads: { enabled: true, simulate: true, interstitialEvery: 2 },
  storagePrefix: "tf_"
};

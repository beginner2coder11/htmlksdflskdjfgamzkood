/* ==========================================================================
   BUG BARRICADE — GAME CONFIG
   A sketchbook tower defense: bugs march to your picnic, you doodle defenses.
   Everything is drawn with wobbly "pencil" lines in code; assets/ can stay empty.
   The map is a 10 × 14 grid of 40-unit cells.
   ========================================================================== */
window.GAME_CONFIG = {
  title: "Bug Barricade",
  tagline: "Defend the picnic!",

  start: { coins: 110, lives: 20 },
  wavesPerMap: 25,
  earlyCallBonus: 15,          // coins for calling the next wave early

  /* Towers. Each has 3 levels: [level1, level2, level3].
     targets: "ground" | "all". kind decides how it attacks. */
  towers: {
    squirt: { name: "Squirt Gun", icon: "💧", kind: "bullet", targets: "all", color: "#3a8ee6",
      cost: [50, 60, 90], range: [92, 104, 118], rate: [0.45, 0.36, 0.28], dmg: [6, 10, 16], desc: "Quick water shots. Hits flying bugs." },
    swatter: { name: "Swatter", icon: "🪰", kind: "slam", targets: "ground", color: "#e8553a",
      cost: [70, 80, 120], range: [56, 62, 70], rate: [1.3, 1.1, 0.9], dmg: [22, 36, 58], desc: "Slaps every ground bug nearby." },
    honey: { name: "Honey Pot", icon: "🍯", kind: "slow", targets: "ground", color: "#f2b632",
      cost: [60, 60, 90], range: [70, 80, 92], rate: [0.5, 0.5, 0.5], dmg: [0, 1, 2], slow: [0.45, 0.55, 0.65], desc: "Sticky honey slows ground bugs." },
    lens: { name: "Sun Lens", icon: "🔍", kind: "beam", targets: "all", color: "#ff8a1f",
      cost: [90, 100, 150], range: [110, 122, 136], rate: [0.1, 0.1, 0.1], dmg: [1.6, 2.6, 4.2], desc: "A focused sunbeam that heats up on one target." },
    frog: { name: "Frog", icon: "🐸", kind: "tongue", targets: "all", color: "#3aa655",
      cost: [110, 120, 180], range: [130, 145, 165], rate: [1.6, 1.35, 1.1], dmg: [55, 90, 150], desc: "Long tongue, huge single hits." }
  },
  sellBack: 0.7,

  // Bugs. hp grows each wave by hpGrowth. armor = flat damage blocked per hit.
  bugs: {
    ant:     { name: "Ant",         hp: 14,  speed: 62, coins: 3,  armor: 0, size: 9 },
    lady:    { name: "Ladybug",     hp: 30,  speed: 44, coins: 5,  armor: 0, size: 12 },
    beetle:  { name: "Beetle",      hp: 60,  speed: 34, coins: 8,  armor: 4, size: 15 },
    bee:     { name: "Bee",         hp: 24,  speed: 70, coins: 6,  armor: 0, size: 11, flying: true },
    cater:   { name: "Caterpillar", hp: 110, speed: 28, coins: 12, armor: 1, size: 18, splits: "ant" },
    queen:   { name: "Queen Ant",   hp: 900, speed: 22, coins: 80, armor: 6, size: 26, boss: true, lives: 5 }
  },
  hpGrowth: 0.14,

  /* Maps: path as grid points (col,row), walked in order. Off-grid ends let bugs walk in/out. */
  maps: [
    { id: "lawn", name: "Back Lawn", paper: "#fbfaf4", path: [[-1, 2], [7, 2], [7, 6], [2, 6], [2, 10], [8, 10], [8, 14]] },
    { id: "porch", name: "The Porch", paper: "#f7f4ff", unlock: 1, path: [[4, -1], [4, 3], [1, 3], [1, 8], [6, 8], [6, 4], [8, 4], [8, 12], [3, 12], [3, 14]] },
    { id: "park", name: "Picnic Park", paper: "#f3fbf6", unlock: 2, path: [[-1, 1], [3, 1], [3, 5], [6, 5], [6, 1], [9, 1], [9, 9], [5, 9], [5, 12], [1, 12], [1, 14]] }
  ],

  ads: { enabled: true, simulate: true, interstitialEvery: 2 },
  storagePrefix: "bbx_"
};

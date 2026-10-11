/* ==========================================================================
   SNAKE ARENA — GAME CONFIG
   Snakes, food, arena and effects are drawn in code, so the game looks
   finished with an empty assets/ folder. Fully offline: rivals are AI bots.
   ========================================================================== */
window.GAME_CONFIG = {
  title: "Snake Arena",
  titleLines: ["SNAKE", "ARENA"],

  arena: {
    radius: 2600,                        // world units
    food: 900,                           // pellets kept on the map
    bots: 22,
    powerOrbs: 6                         // rare power-ups on the map
  },

  snake: {
    startMass: 30,
    speed: 190,                          // units / s
    boostSpeed: 360,
    boostDrain: 9,                       // mass per second while boosting
    turnRate: 4.2,                       // radians / s (bigger snakes turn a bit slower)
    minBoostMass: 18,
    spacing: 0.45                        // segment spacing × radius
  },

  // Bot personalities: weight = how common, aggression = chases/cuts off others.
  botTypes: [
    { id: "eater",  weight: 5, aggression: 0.1, boostChance: 0.1 },
    { id: "hunter", weight: 3, aggression: 0.7, boostChance: 0.5 },
    { id: "zoomer", weight: 2, aggression: 0.3, boostChance: 0.8 }
  ],
  botNames: [
    "Noodle", "Zippy", "Wiggles", "Pretzel", "Slinky", "Spaghetti", "Ziggy", "Pixel", "Biscuit", "Mango",
    "Turbo", "Squiggle", "Doodle", "Pickle", "Bubbles", "Rocket", "Waffles", "Jellybean", "Sprout", "Taco",
    "Comet", "Nugget", "Sushi", "Lemon", "Marble", "Cosmo", "Peanut", "Gizmo", "Hopscotch", "Banjo",
    "Kiwi", "Popcorn", "Sparky", "Whiskers", "Nacho", "Pudding", "Zigzag", "Blitz", "Dumpling", "Twix"
  ],

  // Skins (js/skins.js draws the patterns). price 0 = owned from the start.
  skins: [
    { id: "lime",    name: "Lime",     price: 0,    colors: ["#7dff5a", "#3fcf2a"], pattern: "stripes" },
    { id: "ocean",   name: "Ocean",    price: 0,    colors: ["#5ad1ff", "#2a7dff"], pattern: "stripes" },
    { id: "candy",   name: "Candy",    price: 250,  colors: ["#ff7ab8", "#ffffff"], pattern: "bands" },
    { id: "tiger",   name: "Tiger",    price: 400,  colors: ["#ffa52e", "#2a1a10"], pattern: "bands" },
    { id: "mint",    name: "Mint",     price: 500,  colors: ["#7dffd4", "#2ec4a0"], pattern: "dots" },
    { id: "grape",   name: "Grape",    price: 600,  colors: ["#b07dff", "#6a3fd1"], pattern: "dots" },
    { id: "lava",    name: "Lava",     price: 800,  colors: ["#ff4d2e", "#ffd32a"], pattern: "gradient" },
    { id: "galaxy",  name: "Galaxy",   price: 1000, colors: ["#3a2a8f", "#ff6bd8", "#5ad1ff"], pattern: "gradient" },
    { id: "zebra",   name: "Zebra",    price: 1200, colors: ["#ffffff", "#1a1a2a"], pattern: "bands" },
    { id: "rainbow", name: "Rainbow",  price: 1600, colors: ["#ff4d6d", "#ffa52e", "#ffd32a", "#7dff5a", "#5ad1ff", "#b07dff"], pattern: "rainbow" },
    { id: "gold",    name: "Golden",   price: 2500, colors: ["#ffe27a", "#d9a514"], pattern: "scales" },
    { id: "neon",    name: "Neon",     price: 3200, colors: ["#00ffe0", "#ff00d4"], pattern: "neon" }
  ],

  powerups: {
    magnet: { label: "Magnet", emoji: "🧲", color: "#ff4d6d", time: 10, range: 260 },
    turbo:  { label: "Turbo",  emoji: "⚡", color: "#ffd32a", time: 8 },
    grow:   { label: "2× Growth", emoji: "✨", color: "#7dff5a", time: 12 }
  },

  missions: [
    { id: "l100",  text: "Reach length 100",            type: "length", goal: 100,  reward: 40 },
    { id: "k1",    text: "Trap 1 snake",                type: "kills",  goal: 1,    reward: 40 },
    { id: "t5",    text: "Reach the top 5",              type: "rank",   goal: 5,    reward: 50, lower: true },
    { id: "f500",  text: "Eat 500 pellets in total",     type: "foodTotal", goal: 500, reward: 50 },
    { id: "l250",  text: "Reach length 250",            type: "length", goal: 250,  reward: 80 },
    { id: "k3",    text: "Trap 3 snakes in one game",    type: "kills",  goal: 3,    reward: 80 },
    { id: "g5",    text: "Play 5 games",                 type: "games",  goal: 5,    reward: 50 },
    { id: "t1",    text: "Take the #1 spot",             type: "rank",   goal: 1,    reward: 150, lower: true },
    { id: "l500",  text: "Reach length 500",            type: "length", goal: 500,  reward: 150 },
    { id: "k25",   text: "Trap 25 snakes in total",      type: "killsTotal", goal: 25, reward: 200 },
    { id: "l1000", text: "Reach length 1,000",          type: "length", goal: 1000, reward: 300 },
    { id: "k10",   text: "Trap 10 snakes in one game",   type: "kills",  goal: 10,   reward: 300 }
  ],

  economy: {
    startCoins: 100,
    coinsPerLength: 0.1,                 // coins per length point at game over
    coinsPerKill: 5,
    dailyRewards: [50, 75, 100, 125, 150, 200, 400]
  },

  art: {
    logo:       { image: "assets/ui/logo.png" },
    coin:       { image: "assets/ui/coin.png",         emoji: "🪙" },
    crown:      { image: "assets/ui/crown.png",        emoji: "👑" },
    gift:       { image: "assets/ui/gift.png",         emoji: "🎁" },
    chestClosed:{ image: "assets/ui/chest_closed.png", emoji: "🧰" },
    chestOpen:  { image: "assets/ui/chest_open.png",   emoji: "💰" },
    video:      { image: "assets/ui/video.png",        emoji: "🎬" },
    missions:   { image: "assets/ui/missions.png",     emoji: "📜" },
    skins:      { image: "assets/ui/skins.png",        emoji: "🎨" },
    check:      { image: "assets/ui/check.png",        emoji: "✅" },
    skull:      { image: "assets/ui/trap.png",         emoji: "💥" },
    rays:       { image: "assets/fx/rays.png" },
    ribbon:     { image: "assets/fx/ribbon.png" }
  },

  ads: {
    enabled: true,
    simulate: true,                      // fake ad overlay when no SDK/bridge exists (turn off for release)
    interstitialEveryGames: 2
  },

  sounds: {
    eat: null, bigEat: null, boost: null, kill: null, death: null, power: null,
    click: null, whoosh: null, newbest: null, unlock: null, rankUp: null,
    music: null                          // e.g. "assets/sfx/music_loop.mp3"
  },

  vibration: true
};

/* ==========================================================================
   DASH RUNNER — GAME CONFIG
   Characters, world and effects are drawn in code, so the game looks
   finished with an empty assets/ folder.
   ========================================================================== */
window.GAME_CONFIG = {
  title: "Dash Runner",
  titleLines: ["DASH", "RUNNER"],

  physics: {
    gravity: 2600,                       // units / s²
    jump: 900,                           // first jump velocity
    doubleJump: 820,
    holdBoost: 0.55,                     // releasing early cuts the jump (variable height)
    coyote: 0.1,                         // seconds you can still jump after leaving a ledge
    buffer: 0.12,                        // a tap this early before landing still jumps
    slideTime: 0.6,
    startSpeed: 330,
    maxSpeed: 760,
    accel: 0.11                          // speed gained per meter
  },

  metersPerUnit: 1 / 40,
  milestoneEvery: 500,                   // meters
  biomeEvery: 600,                       // meters per biome

  // Cycled in order as you run. Colors drive sky, hills, scenery and ground.
  biomes: [
    { name: "Sunny Meadow",  sky: ["#7fd3ff", "#d6f3ff"], far: "#9fd8a8", mid: "#6fbf73", ground: "#7a4a2a", top: "#5ccf4f", deco: "tree",     sun: "#fff6c4" },
    { name: "Desert Dunes",  sky: ["#ffb877", "#ffe7c2"], far: "#f2c27a", mid: "#e0a256", ground: "#c47f3a", top: "#f7d08a", deco: "cactus",   sun: "#fff3d6" },
    { name: "Snowy Peaks",   sky: ["#a9d4ff", "#f2f8ff"], far: "#c9d8ee", mid: "#9fb4d6", ground: "#6b7fa8", top: "#ffffff", deco: "pine",     sun: "#ffffff" },
    { name: "Neon City",     sky: ["#2a1a6e", "#7a3fbf"], far: "#3d2a8f", mid: "#5a3ab8", ground: "#241a52", top: "#ff4fd8", deco: "building", sun: "#ffe7f8", night: true },
    { name: "Volcano Valley", sky: ["#3a1020", "#a8341f"], far: "#5a1f24", mid: "#7a2a1f", ground: "#2a1414", top: "#ff7a2a", deco: "rock",     sun: "#ffb36b", night: true }
  ],

  // Characters for the shop. Drawn in code (js/characters.js). price 0 = owned.
  characters: [
    { id: "blob",  name: "Blobby", price: 0,    color: "#4fd17a", style: "blob" },
    { id: "fox",   name: "Foxy",   price: 300,  color: "#ff8a3d", style: "fox" },
    { id: "cat",   name: "Mittens", price: 500, color: "#9aa7c7", style: "cat" },
    { id: "frog",  name: "Hoppy",  price: 700,  color: "#7ed957", style: "frog" },
    { id: "robot", name: "Bolt",   price: 1000, color: "#7fb6ff", style: "robot" },
    { id: "ninja", name: "Shadow", price: 1500, color: "#3a3a5a", style: "ninja" },
    { id: "dino",  name: "Rex",    price: 2200, color: "#5ac8a8", style: "dino" },
    { id: "astro", name: "Cosmo",  price: 3000, color: "#ffffff", style: "astro" }
  ],

  powerups: {
    magnet: { label: "Magnet",  emoji: "🧲", color: "#ff4d6d", base: 8,  range: 230 },
    shield: { label: "Shield",  emoji: "🛡️", color: "#3fa6ff", base: 14 },
    rocket: { label: "Rocket",  emoji: "🚀", color: "#ffa62e", base: 3.5 },
    double: { label: "2× Coins", emoji: "✨", color: "#ffd32a", base: 10 }
  },
  upgrades: { maxLevel: 5, perLevel: 0.25, costs: [150, 300, 600, 1000, 1600] }, // +25% duration per level

  missions: [
    { id: "d500",  text: "Run 500 m in one run",          type: "distance", goal: 500,  reward: 40 },
    { id: "c50",   text: "Collect 50 coins in one run",   type: "coins",    goal: 50,   reward: 40 },
    { id: "s3",    text: "Stomp 3 bees",                  type: "stompsTotal", goal: 3, reward: 50 },
    { id: "p3",    text: "Grab 3 power-ups",              type: "powerTotal", goal: 3,  reward: 50 },
    { id: "d1000", text: "Run 1,000 m in one run",        type: "distance", goal: 1000, reward: 80 },
    { id: "g5",    text: "Play 5 runs",                   type: "games",    goal: 5,    reward: 50 },
    { id: "c500",  text: "Collect 500 coins in total",    type: "coinsTotal", goal: 500, reward: 100 },
    { id: "s15",   text: "Stomp 15 bees",                 type: "stompsTotal", goal: 15, reward: 120 },
    { id: "d2000", text: "Run 2,000 m in one run",        type: "distance", goal: 2000, reward: 200 },
    { id: "c150",  text: "Collect 150 coins in one run",  type: "coins",    goal: 150,  reward: 150 },
    { id: "d3000", text: "Run 3,000 m in one run",        type: "distance", goal: 3000, reward: 300 },
    { id: "c3000", text: "Collect 3,000 coins in total",  type: "coinsTotal", goal: 3000, reward: 400 }
  ],

  economy: {
    startCoins: 100,
    milestoneCoins: 20,
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
    shop:       { image: "assets/ui/characters.png",   emoji: "🧸" },
    upgrade:    { image: "assets/ui/upgrades.png",     emoji: "⬆️" },
    check:      { image: "assets/ui/check.png",        emoji: "✅" },
    rays:       { image: "assets/fx/rays.png" },
    ribbon:     { image: "assets/fx/ribbon.png" }
  },

  ads: {
    enabled: true,
    simulate: true,                      // fake ad overlay when no SDK/bridge exists (turn off for release)
    interstitialEveryRuns: 3
  },

  sounds: {
    jump: null, djump: null, land: null, coin: null, stomp: null, hit: null, slide: null,
    power: null, shield: null, rocket: null, click: null, whoosh: null, newbest: null,
    milestone: null, unlock: null,
    music: null                          // e.g. "assets/sfx/music_loop.mp3"
  },

  vibration: true
};

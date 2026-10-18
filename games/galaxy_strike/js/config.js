/* ==========================================================================
   GALAXY STRIKE — GAME CONFIG
   Ships, enemies, bosses, bullets and effects are drawn in code, so the game
   looks finished with an empty assets/ folder. Change anything here to reskin.
   The world is 400 px wide; its height follows the screen (about 700–860 px).
   ========================================================================== */
window.GAME_CONFIG = {
  title: "Galaxy Strike",
  titleLines: ["GALAXY", "STRIKE"],
  tagline: "Blast the swarm. Beat the bosses. Save the galaxy.",

  play: {
    fireRate: 7,                         // player shots per second
    bulletSpeed: 900,                    // px/s
    dragFollow: 0.35,                    // 0–1: how fast the ship follows your finger
    hull: 3,                             // hits you can take (upgrades add more)
    invulnerable: 1.4,                   // seconds of safety after a hit
    comboWindow: 1.5,                    // seconds between kills to keep the combo going
    comboStep: 10,                       // every N combo kills the score multiplier grows by 0.5
    wavesPerBoss: 5,                     // a boss after every 5 waves = one sector
    dropChance: 0.09,                    // chance an enemy drops a power-up
    coinChance: 0.55,                    // chance an enemy drops coins
    bombsStart: 1,                       // bombs at the start of a run
    bombDamage: 40,                      // damage a bomb deals to every enemy on screen
    reviveInvulnerable: 3
  },

  // Every sector (5 waves + boss) makes enemies tougher, faster and shoot more.
  difficulty: {
    hpPerSector: 0.35,                   // +35% enemy health per sector
    speedPerSector: 0.07,
    fireRatePerSector: 0.14,
    maxSectorScale: 12                   // scaling stops growing after this sector
  },

  // Power-ups (weighted random). time = seconds, 0 = instant.
  powerups: [
    { id: "power",     name: "Power Up",  color: "#ffd23f", weight: 5, time: 0 },     // weapon level +1 (max 5)
    { id: "shield",    name: "Shield",    color: "#3fd8ff", weight: 3, time: 7 },
    { id: "overdrive", name: "Overdrive", color: "#ff4fd8", weight: 2, time: 6 },     // double fire rate + homing missiles
    { id: "drones",    name: "Wingmen",   color: "#7dff5a", weight: 2, time: 10 },    // two drones fly and shoot with you
    { id: "magnet",    name: "Magnet",    color: "#ffa23f", weight: 2, time: 10 },
    { id: "repair",    name: "Repair",    color: "#ff5f8f", weight: 2, time: 0 },     // +1 hull
    { id: "bomb",      name: "Bomb",      color: "#ffffff", weight: 1, time: 0 }      // +1 bomb
  ],

  // Player ships (js/sprites.js draws the shapes: arrow, delta, wing, raptor, saucer, phoenix).
  // unlock: price (coins) | sector reached.  Stats are multipliers.
  ships: [
    { id: "falcon",  name: "Falcon",   shape: "arrow",   body: "#e8f1ff", trim: "#3fd8ff", glow: "#3fd8ff", damage: 1,    fire: 1,    hull: 0, price: 0 },
    { id: "viper",   name: "Viper",    shape: "delta",   body: "#ffe9f6", trim: "#ff4fd8", glow: "#ff4fd8", damage: 1.15, fire: 1,    hull: 0, price: 600 },
    { id: "hornet",  name: "Hornet",   shape: "wing",    body: "#fff7d6", trim: "#ffb21f", glow: "#ffd23f", damage: 1,    fire: 1.2,  hull: 0, price: 1200 },
    { id: "raptor",  name: "Raptor",   shape: "raptor",  body: "#e6ffe9", trim: "#36d35a", glow: "#7dff5a", damage: 1.2,  fire: 1.1,  hull: 1, price: 2500 },
    { id: "nebula",  name: "Nebula",   shape: "saucer",  body: "#efe6ff", trim: "#9b5cff", glow: "#b48cff", damage: 1.3,  fire: 1.15, hull: 1, sector: 4 },
    { id: "phoenix", name: "Phoenix",  shape: "phoenix", body: "#fff1e6", trim: "#ff5a1f", glow: "#ff8a3d", damage: 1.45, fire: 1.25, hull: 2, sector: 8 }
  ],

  // Enemy types. hp/speed are at sector 1. move: sine | dive | hover | snake | drift
  enemies: {
    drone:  { name: "Drone",   hp: 2,   speed: 120, r: 16, score: 10,  color: "#ff4f6d", shape: "drone" },
    dart:   { name: "Dart",    hp: 1,   speed: 260, r: 13, score: 15,  color: "#ffb21f", shape: "dart" },
    gunner: { name: "Gunner",  hp: 7,   speed: 90,  r: 20, score: 40,  color: "#b46bff", shape: "gunner", fireEvery: 1.6 },
    tank:   { name: "Crusher", hp: 26,  speed: 55,  r: 30, score: 120, color: "#3fd8ff", shape: "tank",   fireEvery: 2.0 },
    mine:   { name: "Mine",    hp: 4,   speed: 70,  r: 15, score: 25,  color: "#ff5a1f", shape: "mine" }      // bursts into bullets when destroyed
  },

  // Bosses cycle in order, one per sector. patterns: fan | spiral | ring | aimed | rain
  bosses: [
    { id: "warden",   name: "The Warden",     hp: 320,  color: "#ff4f6d", shape: "warden",   patterns: ["fan", "aimed", "ring"],          coins: 120 },
    { id: "hive",     name: "Hive Queen",     hp: 560,  color: "#7dff5a", shape: "hive",     patterns: ["spiral", "rain", "fan"],         coins: 160 },
    { id: "eclipse",  name: "Eclipse",        hp: 720,  color: "#b46bff", shape: "eclipse",  patterns: ["ring", "spiral", "aimed"],       coins: 200 },
    { id: "titan",    name: "Iron Titan",     hp: 900,  color: "#3fd8ff", shape: "titan",    patterns: ["rain", "fan", "spiral", "ring"], coins: 260 }
  ],

  // Hangar upgrades bought with coins. per = bonus per level.
  upgrades: [
    { id: "damage", name: "Plasma Damage",  desc: "+12% bullet damage",           max: 8, per: 0.12, cost: [80, 160, 280, 450, 700, 1000, 1400, 2000] },
    { id: "rate",   name: "Fire Rate",      desc: "+8% shots per second",         max: 8, per: 0.08, cost: [80, 160, 280, 450, 700, 1000, 1400, 2000] },
    { id: "hull",   name: "Hull Plating",   desc: "+1 hull point",                max: 3, per: 1,    cost: [300, 900, 2000] },
    { id: "magnet", name: "Coin Magnet",    desc: "Pull coins from further away", max: 5, per: 30,   cost: [100, 250, 500, 900, 1500] },
    { id: "power",  name: "Start Power",    desc: "Start runs with a stronger gun", max: 3, per: 1,  cost: [400, 1200, 2600] },
    { id: "bombs",  name: "Bomb Bay",       desc: "+1 bomb at the start",         max: 2, per: 1,    cost: [500, 1500] }
  ],

  missions: [
    { id: "k50",   text: "Destroy 50 enemies",          type: "kills",   goal: 50,   reward: 60 },
    { id: "s2",    text: "Reach sector 2",              type: "sector",  goal: 2,    reward: 80 },
    { id: "b1",    text: "Defeat a boss",               type: "bosses",  goal: 1,    reward: 100 },
    { id: "c20",   text: "Reach a 20x combo",           type: "combo",   goal: 20,   reward: 80, max: true },
    { id: "p10",   text: "Collect 10 power-ups",        type: "powerups",goal: 10,   reward: 60 },
    { id: "sc5k",  text: "Score 5,000 in one run",      type: "score",   goal: 5000, reward: 120, max: true },
    { id: "k500",  text: "Destroy 500 enemies",         type: "kills",   goal: 500,  reward: 200 },
    { id: "s4",    text: "Reach sector 4",              type: "sector",  goal: 4,    reward: 250 },
    { id: "bomb5", text: "Use 5 bombs",                 type: "bombs",   goal: 5,    reward: 80 },
    { id: "c50",   text: "Reach a 50x combo",           type: "combo",   goal: 50,   reward: 250, max: true },
    { id: "b5",    text: "Defeat 5 bosses",             type: "bosses",  goal: 5,    reward: 400 },
    { id: "sc50k", text: "Score 50,000 in one run",     type: "score",   goal: 50000,reward: 500, max: true }
  ],

  economy: {
    startCoins: 100,
    coinValue: 1,                        // coins per pickup
    dailyRewards: [50, 80, 120, 160, 220, 300, 600]
  },

  // Canvas colors for the space background.
  theme: {
    spaceTop: "#05031a",
    spaceBottom: "#140a3a",
    nebulas: ["#7b2ff7", "#1fb4ff", "#ff2f9e"],
    stars: "#ffffff",
    playerBullet: "#7df9ff",
    enemyBullet: "#ff3d6e",
    coin: "#ffd23f"
  },

  // Optional images: drop files in assets/ and they replace the drawn/emoji versions.
  art: {
    logo:     { image: "assets/ui/logo.png" },
    coin:     { image: "assets/ui/coin.png",     emoji: "🪙" },
    gift:     { image: "assets/ui/gift.png",     emoji: "🎁" },
    hangar:   { image: "assets/ui/hangar.png",   emoji: "🚀" },
    upgrades: { image: "assets/ui/upgrades.png", emoji: "⚙️" },
    missions: { image: "assets/ui/missions.png", emoji: "🎯" },
    bomb:     { image: "assets/ui/bomb.png",     emoji: "💥" },
    video:    { image: "assets/ui/video.png",    emoji: "🎬" },
    lock:     { image: "assets/ui/lock.png",     emoji: "🔒" },
    trophy:   { image: "assets/ui/trophy.png",   emoji: "🏆" }
  },

  ads: {
    enabled: true,
    simulate: true,                      // fake ad overlay when no SDK/bridge exists (turn off for release)
    interstitialEveryGames: 2
  },

  // Leave null to use the built-in synthesized sounds, or give a file path (e.g. "assets/sfx/laser.mp3").
  sounds: {
    laser: null, hit: null, explode: null, bigExplode: null, powerup: null, coin: null, shield: null,
    bomb: null, warning: null, hurt: null, click: null, unlock: null, win: null, over: null,
    music: null
  },

  vibration: true
};

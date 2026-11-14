/* ==========================================================================
   LANE RUSH — GAME CONFIG
   A top-down traffic racer in soft "clay toy" style. Cars, trees and houses
   are drawn in code with soft shadows; assets/ can stay empty.
   ========================================================================== */
window.GAME_CONFIG = {
  title: "Lane Rush",
  tagline: "Weave. Near-miss. Boost.",

  road: { left: 64, right: 336, lanes: 4 },

  drive: {
    startSpeed: 300,       // units per second
    maxSpeed: 760,
    accel: 7,              // speed gained per second
    nitroBoost: 1.45,      // speed multiplier while boosting
    nitroDrain: 0.28,      // nitro meter used per second
    nearMissDist: 14,      // gap (units) that counts as a near miss
    nearMissNitro: 0.12,
    coinValue: 1,
    metresPerUnit: 0.05    // distance shown = units × this
  },

  // Areas change every `areaEvery` metres and loop.
  areaEvery: 1500,
  areas: [
    { id: "suburb", name: "Suburbs",  grass: "#a8d98a", grass2: "#94cc78", road: "#b8b1cc", line: "#fdfcf7", deco: ["tree", "house", "bush"] },
    { id: "desert", name: "Desert",   grass: "#f2d29b", grass2: "#e8c385", road: "#c7a98a", line: "#fff6e0", deco: ["cactus", "rock", "cactus"] },
    { id: "snow",   name: "Snowfield",grass: "#eef4fb", grass2: "#dde8f5", road: "#a9b4c7", line: "#ffffff", deco: ["pine", "snowman", "pine"] },
    { id: "city",   name: "Night City",grass: "#5d5a8a", grass2: "#4f4c7a", road: "#3d3b5e", line: "#ffd86b", deco: ["tower", "lamp", "tower"] }
  ],

  // Traffic: w/h in units, speed = fraction of the player's start speed.
  traffic: [
    { id: "hatch", w: 30, h: 50, speed: 0.55, weight: 5 },
    { id: "sedan", w: 32, h: 58, speed: 0.6,  weight: 4 },
    { id: "van",   w: 34, h: 66, speed: 0.5,  weight: 2 },
    { id: "truck", w: 38, h: 104, speed: 0.42, weight: 1 },
    { id: "bus",   w: 38, h: 96, speed: 0.38, weight: 1 }
  ],
  trafficColors: ["#ff8fa3", "#8ecdf7", "#ffd36e", "#9be3b4", "#c7a6ff", "#ffb27a", "#f5f5f5"],
  laneChangeChance: 0.35,  // share of cars that will signal and change lanes

  pickups: [
    { id: "shield", name: "Bumper Shield", color: "#6fd3ff", time: 6, weight: 2 },
    { id: "magnet", name: "Coin Magnet",   color: "#ff7ab6", time: 8, weight: 2 },
    { id: "nitro",  name: "Nitro Can",     color: "#ffb22e", time: 0, weight: 3 }
  ],

  // Garage: grip = steering speed, top = max speed multiplier, tank = nitro capacity multiplier.
  cars: [
    { id: "bean",   name: "Bean",    body: "#ff6f61", roof: "#ffd1c9", grip: 1.0,  top: 1.0,  tank: 1.0, price: 0 },
    { id: "pebble", name: "Pebble",  body: "#4fb7ff", roof: "#d4eeff", grip: 1.1,  top: 1.02, tank: 1.0, price: 250 },
    { id: "mango",  name: "Mango",   body: "#ffb22e", roof: "#fff0c9", grip: 1.05, top: 1.06, tank: 1.1, price: 600 },
    { id: "mint",   name: "Mint",    body: "#3ecf9a", roof: "#d2f7e8", grip: 1.2,  top: 1.04, tank: 1.15, price: 1100 },
    { id: "grape",  name: "Grape",   body: "#9b6bff", roof: "#e6dbff", grip: 1.15, top: 1.12, tank: 1.2, price: 1800 },
    { id: "comet",  name: "Comet",   body: "#2b2b3c", roof: "#ff4fa0", grip: 1.3,  top: 1.18, tank: 1.35, price: 3000 }
  ],

  // Mission pool: three are active at once; finishing one pays and draws a new one.
  missions: [
    { id: "dist",  text: "Drive {n} m in one run",       n: [800, 1500, 2500, 4000], reward: [40, 70, 110, 180] },
    { id: "near",  text: "Make {n} near misses in a run", n: [8, 15, 25, 40],         reward: [40, 70, 110, 180] },
    { id: "coins", text: "Collect {n} coins in a run",    n: [20, 40, 70, 110],       reward: [30, 60, 90, 150] },
    { id: "nitro", text: "Boost for {n} s in a run",      n: [5, 10, 18, 30],         reward: [30, 60, 90, 150] },
    { id: "two",   text: "Drive {n} m in Two-Way",        n: [500, 1000, 2000, 3500], reward: [50, 80, 130, 200] }
  ],

  ads: { enabled: true, simulate: true, interstitialEvery: 3 },
  storagePrefix: "lr_"
};

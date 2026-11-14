/* ==========================================================================
   BULLSEYE RIDGE — GAME CONFIG
   A calm, minimal archery game in the mountains. The camera follows each
   arrow; wind, distance and moving targets make every shot different.
   World units: 10 units = 1 metre. Everything is drawn in code.
   ========================================================================== */
window.GAME_CONFIG = {
  title: "Bullseye Ridge",
  tagline: "Breathe. Draw. Release.",

  physics: {
    gravity: 330,            // units/s²
    windForce: 14,           // units/s² per 1 m/s of wind
    slowmoNear: 0.3,         // time scale when the arrow is close to the target
    pullMax: 150             // drag distance (px on a 400-wide screen) for full power
  },

  arrowsPerStage: 5,
  stages: 30,
  // stage n grows from start → end
  curve: {
    distance: { start: 22, end: 92 },     // metres
    radius:   { start: 44, end: 31 },     // target radius in units
    wind:     { start: 0,  end: 7 },      // max wind in m/s
    pass:     { start: 26, end: 33 }      // points (of 50) needed to clear the stage
  },
  movingFrom: 8,             // targets bob up and down from this stage
  balloonsFrom: 4,           // bonus balloons drift above the range from this stage
  balloonPoints: 3,

  // Bows: speed = max launch speed, sway = aim wobble (lower is steadier), guide = aim-preview length 0–1
  bows: [
    { id: "ash",    name: "Ash Longbow",    speed: 880,  sway: 1.0,  guide: 0.32, color: "#b08a5a", price: 0 },
    { id: "birch",  name: "Birch Recurve",  speed: 940,  sway: 0.8,  guide: 0.36, color: "#d8c7a4", price: 300 },
    { id: "yew",    name: "Yew Classic",    speed: 1000, sway: 0.7,  guide: 0.4,  color: "#8a5a3a", price: 700 },
    { id: "slate",  name: "Slate Compound", speed: 1060, sway: 0.5,  guide: 0.45, color: "#5d6b73", price: 1300 },
    { id: "aurora", name: "Aurora",         speed: 1120, sway: 0.35, guide: 0.52, color: "#7fa89a", price: 2200 }
  ],

  // Palettes for the landscape, chosen by stage (every 10 stages)
  seasons: [
    { name: "Summer meadow", sky: ["#e9efe9", "#f6f1e7"], hills: ["#c9d6c3", "#a9bfa6", "#86a487", "#6b8c6f"], ground: "#5f7d61", mist: "rgba(255,255,255,.35)" },
    { name: "Autumn fjord",  sky: ["#efe6dc", "#f7efe6"], hills: ["#d9c3a8", "#c7a582", "#a9805e", "#8a6448"], ground: "#7a5a40", mist: "rgba(255,248,240,.4)" },
    { name: "Winter peaks",  sky: ["#e6edf3", "#f5f7f9"], hills: ["#cfdbe6", "#b4c6d6", "#93aac0", "#768fa8"], ground: "#e9eef3", mist: "rgba(255,255,255,.5)" }
  ],

  coinsPerPoint: 1,
  coinsPerStar: 10,

  ads: { enabled: true, simulate: true, interstitialEvery: 3 },
  storagePrefix: "br2_"
};

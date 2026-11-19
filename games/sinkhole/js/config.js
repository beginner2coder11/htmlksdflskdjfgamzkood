/* ==========================================================================
   SINKHOLE — GAME CONFIG
   A hole .io game. Steer your hole around the city with the joystick and
   swallow anything that fits: people and cones first, then benches, trees,
   cars, buses, houses and finally towers. Each bite makes the hole bigger.
   Battle levels: out-eat the rival holes before the clock runs out (a bigger
   hole can swallow a smaller one). Solo levels: eat a share of the city.
   Everything is drawn in code.
   ========================================================================== */
window.GAME_CONFIG = {
  // Game name (browser tab, app name default)
  title: "Sinkhole",
  // Short line under the logo on the title screen
  tagline: "Swallow the city. Grow huge!",
  // the logo on the title screen, one entry per line
  titleLines: ["SINK", "HOLE"],
  // UI colours (buttons, panels, text): CSS variables from css/style.css
  theme: {
    "ink": "#1e2238",
    "ink-2": "#5c6384",
    "paper": "#fbfcff",
    "cream": "#eef1ff",
    "accent": "#7b5cff",
    "accent-d": "#5537d6",
    "green": "#2fc46e",
    "green-d": "#1d9452",
    "blue": "#3d8bff",
    "blue-d": "#2363d1",
    "gold": "#ffc93d",
    "red": "#ff4d5e"
  },

  // Things in the city: size = footprint radius (the hole must be bigger to swallow it), value = growth + score
  objects: {
    person:  { size: 0.28, value: 1 },
    cone:    { size: 0.3,  value: 1 },
    hydrant: { size: 0.3,  value: 1 },
    bin:     { size: 0.42, value: 2 },
    lamp:    { size: 0.42, value: 2 },
    bench:   { size: 0.6,  value: 3 },
    tree:    { size: 0.9,  value: 6 },
    car:     { size: 1.05, value: 10 },
    kiosk:   { size: 1.4,  value: 16 },
    bus:     { size: 1.9,  value: 26 },
    house:   { size: 2.5,  value: 60 },
    shop:    { size: 3.1,  value: 100 },
    tower:   { size: 4.2,  value: 220 }
  },
  hole: { start: 1.0, grow: 0.06, speed: 6.2, eatHoles: 1.18 },   // grow = area added per value point; eatHoles = size ratio to swallow a hole

  levels: {
    count: 60,                     // levels in the game
    seed: 8807,                    // change it for a whole new set of cities
    soloEvery: 3,                  // every Nth level is a solo challenge (eat a share of the city)
    // difficulty steps: bots = rival holes, skill = how well they play (0..1), time = seconds, solo = share to eat on solo levels
    curve: [
      { upTo: 2,   bots: 3, skill: 0.25, time: 100, solo: 0.2 },
      { upTo: 8,   bots: 4, skill: 0.4,  time: 110, solo: 0.28 },
      { upTo: 20,  bots: 5, skill: 0.55, time: 120, solo: 0.34 },
      { upTo: 40,  bots: 6, skill: 0.7,  time: 120, solo: 0.4 },
      { upTo: 999, bots: 7, skill: 0.85, time: 120, solo: 0.46 }
    ]
  },

  botNames: ["Gobbler", "Muncher", "Vortex", "Crater", "Sinky", "Abyss", "Chomp", "Pit Boss", "Swirl", "Gulp", "Nomzilla", "Black Pearl"],
  botColors: ["#ff4d5e", "#ffc93d", "#2fc46e", "#ff8a3d", "#3fd8d0", "#ff7ec8", "#a77bff", "#8fd14f"],

  coins: { win: 25, perPlace: [25, 15, 8], perValue: 0.02 },

  // Hole rims in the shop
  skins: [
    { id: "violet", name: "Violet",  price: 0,    rim: "#7b5cff", glow: "#b9a6ff" },
    { id: "ocean",  name: "Ocean",   price: 300,  rim: "#3d8bff", glow: "#9cc6ff" },
    { id: "lime",   name: "Lime",    price: 600,  rim: "#5fd32f", glow: "#b8f59a" },
    { id: "sunset", name: "Sunset",  price: 900,  rim: "#ff7a3d", glow: "#ffc29a" },
    { id: "candy",  name: "Candy",   price: 1300, rim: "#ff5fb8", glow: "#ffb3df" },
    { id: "gold",   name: "Gold",    price: 2000, rim: "#ffc93d", glow: "#fff0a8" }
  ],

  // Daily gift: coins for day 1..7 of the login streak
  daily: [50, 80, 100, 150, 200, 300, 500],
  // Ads: enabled = show ads, simulate = fake ads in the browser (the APK uses real AdMob), interstitialEvery = an interstitial every N finished rounds (0 = off)
  ads: { enabled: true, simulate: true, interstitialEvery: 3 },
  // Save-data key prefix. Give each reskin its own so saves never mix
  storagePrefix: "sk_"
};

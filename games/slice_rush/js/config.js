/* ==========================================================================
   SLICE RUSH — GAME CONFIG
   Fruit slicing. Fruit flies up from the bottom; swipe through it to slice it
   in two with a splash of juice. Slice several in one swipe for a combo. Don't
   touch the bombs! Three modes: Classic (3 lives), Arcade (60 s with power
   fruit) and Zen (90 s, no bombs). Blades and backgrounds in the shop, a
   chain of goals to clear. Everything is drawn in code.
   ========================================================================== */
window.GAME_CONFIG = {
  // Game name (browser tab, app name default)
  title: "Slice Rush",
  // Short line under the logo on the title screen
  tagline: "Swipe. Slice. Splash!",
  // the logo on the title screen, one entry per line
  titleLines: ["SLICE", "RUSH"],
  // UI colours (buttons, panels, text): CSS variables from css/style.css
  theme: {
    "ink": "#2a1d14",
    "ink-2": "#7a6352",
    "paper": "#fffaf3",
    "cream": "#fff3e3",
    "accent": "#ff7a2e",
    "accent-d": "#d9561a",
    "green": "#3cc46a",
    "green-d": "#24944a",
    "blue": "#3d8bff",
    "blue-d": "#2363d1",
    "gold": "#ffc93d",
    "red": "#ff4d5e"
  },

  // Fruits. r = size, kind = how it's drawn (see drawFruit in js/game.js), score = points
  fruits: [
    { id: "apple",  name: "Apple",      kind: "apple",  r: 1.0,  skin: "#e8323e", skin2: "#ff7a7a", flesh: "#fff1c9", flesh2: "#6b3a1e", juice: "#ffe7a8", score: 1 },
    { id: "orange", name: "Orange",     kind: "citrus", r: 1.0,  skin: "#ff9a1f", skin2: "#ffc46b", flesh: "#ffb347", flesh2: "#fff1d6", juice: "#ffa53a", score: 1 },
    { id: "lemon",  name: "Lemon",      kind: "lemon",  r: 0.95, skin: "#ffd93d", skin2: "#fff09a", flesh: "#fff2a1", flesh2: "#fffbe0", juice: "#fff176", score: 1 },
    { id: "lime",   name: "Lime",       kind: "citrus", r: 0.85, skin: "#5cc23a", skin2: "#a6ea7a", flesh: "#b9f07c", flesh2: "#ecffd6", juice: "#a8f06a", score: 1 },
    { id: "melon",  name: "Watermelon", kind: "melon",  r: 1.45, skin: "#2f9a4a", skin2: "#7fd36b", flesh: "#ff4d5e", flesh2: "#1b1b2a", juice: "#ff5a6a", score: 1 },
    { id: "kiwi",   name: "Kiwi",       kind: "kiwi",   r: 0.85, skin: "#8a6234", skin2: "#b38a55", flesh: "#7ccc3a", flesh2: "#1b1b2a", juice: "#9be05a", score: 1 },
    { id: "peach",  name: "Peach",      kind: "peach",  r: 1.0,  skin: "#ffa07a", skin2: "#ffd0a8", flesh: "#ffc163", flesh2: "#9a4a24", juice: "#ffb870", score: 1 },
    { id: "plum",   name: "Plum",       kind: "peach",  r: 0.9,  skin: "#7b3fa0", skin2: "#b77ad8", flesh: "#e8d36a", flesh2: "#7a3a1a", juice: "#c38ae0", score: 1 },
    { id: "coco",   name: "Coconut",    kind: "coco",   r: 1.1,  skin: "#7a4a2a", skin2: "#a8714a", flesh: "#ffffff", flesh2: "#f2ece4", juice: "#f4f0ea", score: 1 },
    { id: "berry",  name: "Strawberry", kind: "berry",  r: 0.8,  skin: "#ef233c", skin2: "#ff6b81", flesh: "#ffd1d8", flesh2: "#ef233c", juice: "#ff5c77", score: 1 }
  ],
  // Arcade power fruit: slice it for an effect lasting `time` seconds
  specials: {
    freeze: { name: "Freeze", color: "#7fd8ff", time: 4.5, about: "Slows everything down" },
    frenzy: { name: "Frenzy", color: "#ffc93d", time: 4,   about: "Fruit pours in from the sides" },
    double: { name: "Double", color: "#c77dff", time: 6,   about: "Double points" }
  },
  modes: {
    classic: { name: "Classic", lives: 3, about: "Don't drop 3 fruits or hit a bomb" },
    arcade:  { name: "Arcade",  time: 60, bombPenalty: 10, about: "60 seconds, power fruit, bombs cost 10" },
    zen:     { name: "Zen",     time: 90, about: "90 relaxing seconds, no bombs" }
  },
  comboMin: 3,                     // fruits in one swipe for a combo (bonus = fruits)
  coins: { perPoint: 0.5 },        // coins after a run = score × perPoint

  // Blades (swipe trail) in the shop
  blades: [
    { id: "steel",   name: "Steel",   price: 0,    a: "#ffffff", b: "#c8d6ff" },
    { id: "fire",    name: "Fire",    price: 300,  a: "#fff3a8", b: "#ff5a1f" },
    { id: "frost",   name: "Frost",   price: 500,  a: "#ffffff", b: "#3fc8ff" },
    { id: "neon",    name: "Neon",    price: 800,  a: "#e8ffd6", b: "#39ff6a" },
    { id: "candy",   name: "Candy",   price: 1200, a: "#ffffff", b: "#ff5fa2" },
    { id: "rainbow", name: "Rainbow", price: 2000, a: "#ffffff", b: "rainbow" }
  ],
  // Backgrounds in the shop
  backgrounds: [
    { id: "board",  name: "Chopping Board", price: 0 },
    { id: "picnic", name: "Picnic",         price: 400 },
    { id: "beach",  name: "Beach",          price: 700 },
    { id: "night",  name: "Night Market",   price: 1000 },
    { id: "bamboo", name: "Bamboo Grove",   price: 1500 }
  ],
  // Goals, cleared in order. type: score (in a mode), combo, swipe (fruit in one swipe), total (fruit ever), play (runs of a mode), special
  goals: [
    { type: "score", mode: "classic", n: 25, reward: 50 },  { type: "play", mode: "zen", n: 1, reward: 40 },
    { type: "combo", n: 3, reward: 60 },                    { type: "score", mode: "arcade", n: 60, reward: 60 },
    { type: "total", n: 200, reward: 80 },                  { type: "score", mode: "classic", n: 60, reward: 80 },
    { type: "special", n: 3, reward: 80 },                  { type: "swipe", n: 4, reward: 100 },
    { type: "score", mode: "zen", n: 120, reward: 100 },    { type: "score", mode: "arcade", n: 120, reward: 120 },
    { type: "combo", n: 5, reward: 120 },                   { type: "total", n: 1000, reward: 150 },
    { type: "score", mode: "classic", n: 120, reward: 150 }, { type: "play", mode: "arcade", n: 10, reward: 150 },
    { type: "swipe", n: 6, reward: 200 },                   { type: "score", mode: "arcade", n: 200, reward: 200 },
    { type: "score", mode: "zen", n: 220, reward: 200 },    { type: "total", n: 3000, reward: 250 },
    { type: "score", mode: "classic", n: 200, reward: 300 }, { type: "combo", n: 7, reward: 300 }
  ],

  // Daily gift: coins for day 1..7 of the login streak
  daily: [50, 80, 100, 150, 200, 300, 500],
  // Ads: enabled = show ads, simulate = fake ads in the browser (the APK uses real AdMob), interstitialEvery = an interstitial every N runs (0 = off)
  ads: { enabled: true, simulate: true, interstitialEvery: 3 },
  // Save-data key prefix. Give each reskin its own so saves never mix
  storagePrefix: "slr_"
};

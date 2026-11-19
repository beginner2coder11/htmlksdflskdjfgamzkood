/* ==========================================================================
   DOODLE BRIDGE — GAME CONFIG
   Draw lines with your finger: each one drops in as a real physics plank.
   Press GO and the kid walks right — get them to the GOAL flag.
   Use less ink for more stars. Everything is drawn in code.

   Level coordinates: the world is 600 wide × 900 tall, y grows downward.
   P(x0, x1, top)          a cliff pillar from top down past the bottom
   S(x, y, w, h)           any solid block (walls, ceilings, posts)
   spikes: [x0, x1, y]     a spike strip lying on a surface at height y
   springs: [x, y]         a spring pad standing on a surface at height y
   boulders: [x, y, r]     a heavy rolling rock (centre and radius)
   zones: [x, y, w, h]     "no doodle" areas where you can't draw
   sol: the reference solution (also used by the Hint button)
   ========================================================================== */
(() => {
  const P = (x0, x1, top) => [x0, top, x1 - x0, 1600 - top];
  const S = (x, y, w, h) => [x, y, w, h];

  window.GAME_CONFIG = {
    // Game name (browser tab, app name default)
    title: "Doodle Bridge",
    // Short line under the logo on the title screen
    tagline: "Draw a bridge. Watch it hold. Get the kid home.",
    // the logo on the title screen, one entry per line
    titleLines: ["Doodle", "Bridge"],
    // UI colours (buttons, panels, text): CSS variables from css/style.css
    theme: {
      "ink": "#2e2a40",
      "paper": "#fffaf0",
      "paper-2": "#fff0d8",
      "coral": "#ff7a5c",
      "teal": "#5fc7a8",
      "blue": "#4f9fe8",
      "sun": "#ffd23f",
      "pink": "#ff8fd0",
      "mute": "#6f6a85"
    },

    // Physics: gravity, kid walk speed, spring strength, plank point spacing and thickness
    physics: { gravity: 1400, walk: 72, spring: 800, springPush: 150, spacing: 12, thick: 5 },
    // Coins for clearing a level and per star
    coins: { clear: 10, perStar: 5 },
    // Coins for a hint (shows the reference solution)
    hintPrice: 40,
    unlock: [0, 12, 30],          // stars needed to open each world

    // 3 worlds: sky gradient, city skyline, cliff and grass colours
    worlds: [
      { name: "Sunny City",   sky: ["#bfe6f5", "#eef9fc"], city: ["#9fcde2", "#b8dcec"], lit: "#e8f6fb", cliff: "#f2a65a", cliffD: "#d9813b", grass: "#5fc7a8", grassD: "#3a9f84", cloud: "#ffffff", night: false },
      { name: "Sunset Bay",   sky: ["#ff9e7a", "#ffe2b8"], city: ["#e2848a", "#f0a69a"], lit: "#ffd9a0", cliff: "#b98ad8", cliffD: "#9366b8", grass: "#ffcf6b", grassD: "#e0a83c", cloud: "#ffe9e0", night: false },
      { name: "Night Lights", sky: ["#1c1f4a", "#3b3a7c"], city: ["#2a2c63", "#363a7a"], lit: "#ffe27a", cliff: "#5f78d8", cliffD: "#4359b0", grass: "#7fe0c8", grassD: "#4fb8a0", cloud: "#4a4f8f", night: true }
    ],

    // 24 levels: solids, spikes, springs, boulders, no-draw zones, start/goal x, ink limit, ink needed for ★★★/★★ (stars) and a reference solution (sol)
    levels: [
      // ---------- Sunny City ----------
      { name: "First Steps", solids: [P(0, 200, 560), P(380, 600, 560)], start: 60, goal: 540, ink: 600, stars: [280, 420],
        sol: [[[170, 554], [410, 554]]], tip: "Draw a line across the gap, then press GO." },
      { name: "Mind the Gap", solids: [P(0, 160, 560), P(420, 600, 560)], start: 60, goal: 540, ink: 700, stars: [360, 480],
        sol: [[[130, 554], [450, 554]]] },
      { name: "Uphill", solids: [P(0, 200, 620), P(400, 600, 500)], start: 60, goal: 540, ink: 650, stars: [330, 450],
        sol: [[[170, 614], [396, 492], [440, 494]]], tip: "Slopes work too. Not too steep!" },
      { name: "Downhill", solids: [P(0, 180, 480), P(400, 600, 640)], start: 60, goal: 540, ink: 650, stars: [340, 460],
        sol: [[[150, 474], [186, 474], [420, 634], [440, 634]]] },
      { name: "Stepping Stone", solids: [P(0, 140, 560), P(270, 330, 600), P(460, 600, 560)], start: 50, goal: 540, ink: 700, stars: [400, 520],
        sol: [[[110, 554], [146, 554], [290, 594]], [[310, 594], [336, 594], [454, 554], [490, 554]]], tip: "You can draw more than one line." },
      { name: "Spike Pit", solids: [P(0, 170, 560), P(170, 430, 720), P(430, 600, 560)], spikes: [[170, 430, 720]], start: 60, goal: 540, ink: 650, stars: [340, 460],
        sol: [[[140, 554], [460, 554]]] },
      { name: "Over the Wall", solids: [P(0, 600, 600), S(330, 440, 60, 160)], start: 50, goal: 545, ink: 600, stars: [300, 420],
        sol: [[[150, 594], [326, 434], [350, 434]]], tip: "Build a ramp up and over." },
      { name: "Boing!", solids: [P(0, 150, 560), P(150, 420, 740), P(420, 600, 560)], spikes: [[150, 320, 740]], springs: [[372, 740]], start: 50, goal: 545, ink: 600, stars: [300, 420],
        sol: [[[120, 554], [156, 554], [322, 718], [340, 734]]], tip: "Springs bounce the kid up high." },

      // ---------- Sunset Bay ----------
      { name: "Duck Under", solids: [P(0, 170, 560), P(430, 600, 560)], zones: [[220, 380, 160, 190]], start: 60, goal: 540, ink: 700, stars: [400, 520],
        sol: [[[140, 554], [176, 554], [214, 580], [386, 580], [424, 553], [440, 553], [470, 553]]], tip: "You can't draw inside striped areas." },
      { name: "Low Ceiling", solids: [P(0, 170, 560), S(170, 0, 220, 500), P(430, 600, 520)], start: 60, goal: 540, ink: 700, stars: [390, 500],
        sol: [[[140, 554], [380, 554], [424, 514], [450, 514]]] },
      { name: "Rolling Stone", solids: [P(0, 220, 560), P(420, 600, 560)], boulders: [[118, 534, 26]], start: 40, goal: 535, ink: 600, stars: [310, 430],
        sol: [[[160, 554], [450, 554]]], tip: "Boulders are heavy. The kid can push them." },
      { name: "Up and Over", solids: [P(0, 140, 560), P(140, 300, 760), P(300, 380, 560), P(460, 600, 560)], springs: [[230, 760]], start: 50, goal: 540, ink: 400, stars: [140, 220],
        sol: [[[355, 554], [485, 554]]] },
      { name: "Long Haul", solids: [P(0, 130, 560), P(270, 330, 640), P(470, 600, 560)], start: 50, goal: 545, ink: 700, stars: [450, 560],
        sol: [[[100, 554], [136, 554], [284, 634], [316, 634], [464, 554], [500, 554]]] },
      { name: "Zigzag", solids: [P(0, 170, 560), P(440, 600, 560)], zones: [[200, 0, 80, 590], [330, 560, 80, 340]], start: 60, goal: 545, ink: 750, stars: [440, 560],
        sol: [[[140, 554], [176, 554], [198, 598], [282, 598], [326, 552], [412, 552], [436, 554], [470, 554]]] },
      { name: "Stone Step", solids: [P(0, 250, 560), P(250, 316, 628), P(316, 600, 560)], boulders: [[190, 528, 32]], start: 50, goal: 545, ink: 300, stars: [0, 80],
        sol: [], tip: "Sometimes the best bridge is no bridge at all…" },
      { name: "Sunset Steps", solids: [P(0, 120, 640), P(220, 300, 560), P(400, 480, 480), P(540, 600, 420)], start: 40, goal: 572, ink: 800, stars: [480, 600],
        sol: [[[95, 634], [214, 552], [240, 554]], [[288, 554], [394, 472], [420, 474]], [[468, 474], [534, 412], [556, 414]]] },

      // ---------- Night Lights ----------
      { name: "Spike Floor", solids: [P(0, 110, 560), S(220, 560, 40, 1040), P(490, 600, 560)], spikes: [[110, 490, 860]], start: 45, goal: 548, ink: 600, stars: [440, 540],
        sol: [[[90, 554], [510, 554]]] },
      { name: "Double Stone", solids: [P(0, 240, 560), P(240, 294, 616), P(294, 380, 560), P(380, 434, 616), P(434, 600, 560)], boulders: [[140, 534, 26], [196, 534, 26]], start: 40, goal: 548, ink: 300, stars: [0, 80],
        sol: [] },
      { name: "The Funnel", solids: [P(0, 160, 600), S(160, 0, 140, 505), P(420, 600, 460)], start: 50, goal: 545, ink: 700, stars: [390, 500],
        sol: [[[130, 594], [300, 562], [414, 452], [440, 454]]] },
      { name: "High Jump", solids: [P(0, 140, 560), P(250, 330, 640), P(380, 600, 440)], spikes: [[140, 600, 880]], springs: [[290, 640]], start: 50, goal: 545, ink: 500, stars: [200, 320],
        sol: [[[110, 554], [146, 554], [248, 630], [262, 634]]] },
      { name: "Narrow Posts", solids: [P(0, 100, 560), S(200, 600, 20, 1000), S(380, 560, 20, 1040), P(520, 600, 560)], spikes: [[100, 520, 880]], start: 40, goal: 555, ink: 700, stars: [480, 600],
        sol: [[[80, 554], [540, 554]]] },
      { name: "Under and Up", solids: [P(0, 150, 620), P(470, 600, 520)], zones: [[150, 0, 200, 600]], start: 50, goal: 545, ink: 700, stars: [420, 540],
        sol: [[[120, 614], [354, 614], [464, 514], [490, 514]]] },
      { name: "Double Trouble", solids: [P(0, 140, 560), P(250, 330, 520), S(330, 0, 120, 455), P(450, 600, 560)], spikes: [[140, 600, 880]], start: 50, goal: 545, ink: 600, stars: [345, 460],
        sol: [[[110, 554], [244, 512], [270, 514]], [[310, 514], [336, 514], [444, 554], [470, 554]]] },
      { name: "Grand Finale", solids: [P(0, 130, 640), P(260, 340, 600), P(470, 600, 500)], zones: [[140, 0, 100, 560]], spikes: [[130, 600, 900]], start: 40, goal: 548, ink: 800, stars: [460, 600],
        sol: [[[105, 634], [136, 634], [254, 594], [280, 594]], [[320, 594], [346, 594], [464, 494], [490, 494]]] }
    ],

    // the kid's outfits: hat style + colours
    skins: [
      { id: "beanie", name: "Beanie",     price: 0,   hat: "beanie", a: "#ff7a5c", shirt: "#ffffff", pants: "#4f7fd8", hair: "#3b3355", skin: "#ffd9b8" },
      { id: "cat",    name: "Cat Hood",   price: 120, hat: "cat",    a: "#ffb347", shirt: "#ffb347", pants: "#5a4a7a", hair: "#3b3355", skin: "#ffd9b8" },
      { id: "space",  name: "Astronaut",  price: 220, hat: "helmet", a: "#ffffff", shirt: "#e8eef8", pants: "#c8d4e8", hair: "#3b3355", skin: "#f2c8a0" },
      { id: "dino",   name: "Dino Hoodie",price: 300, hat: "dino",   a: "#7fd65f", shirt: "#7fd65f", pants: "#3f8f4a", hair: "#3b3355", skin: "#ffd9b8" },
      { id: "chef",   name: "Little Chef",price: 360, hat: "chef",   a: "#ffffff", shirt: "#ffffff", pants: "#3b3355", hair: "#8a5a3c", skin: "#e8b890" },
      { id: "bee",    name: "Bee Suit",   price: 450, hat: "bee",    a: "#ffd23f", shirt: "#ffd23f", pants: "#3b3355", hair: "#3b3355", skin: "#ffd9b8" },
      { id: "robot",  name: "Robo Kid",   price: 600, hat: "robot",  a: "#9fb4c8", shirt: "#9fb4c8", pants: "#6a7f94", hair: "#3b3355", skin: "#ffd9b8" }
    ],
    // pens: the colour (or pattern) of your drawn bridges
    pens: [
      { id: "pencil",  name: "Pencil",   price: 0,   a: "#3b3355" },
      { id: "crayon",  name: "Red Crayon", price: 80, a: "#e8473c" },
      { id: "ocean",   name: "Ocean",    price: 150, a: "#2f8fe0" },
      { id: "candy",   name: "Candy",    price: 250, a: "#ff6fb0", b: "#ffffff", stripe: true },
      { id: "wood",    name: "Wood",     price: 320, a: "#b8763c", b: "#8a5428", stripe: true },
      { id: "rainbow", name: "Rainbow",  price: 500, rainbow: true },
      { id: "neon",    name: "Neon",     price: 650, a: "#3cffd8", glow: true }
    ],

    // Daily gift: coins for day 1..7 of the login streak
    daily: [20, 30, 40, 60, 80, 100, 150],
    // Ads: enabled = show ads, simulate = fake ads in the browser (the APK uses real AdMob), interstitialEvery = an interstitial every N finished rounds (0 = off)
    ads: { enabled: true, simulate: true, interstitialEvery: 3 },   // interstitial every N level wins
    // Save-data key prefix. Give each reskin its own so saves never mix
    storagePrefix: "db_"
  };
})();

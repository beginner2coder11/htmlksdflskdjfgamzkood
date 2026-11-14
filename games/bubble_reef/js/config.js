/* ==========================================================================
   BUBBLE REEF — GAME CONFIG
   An underwater bubble shooter. Bubbles, fish, light rays and coral are all
   drawn in code, so the game is complete with an empty assets/ folder.
   The playfield is 400 units wide; its height follows the screen.
   ========================================================================== */
window.GAME_CONFIG = {
  title: "Bubble Reef",
  tagline: "Pop the bubbles · Free the fish",

  // Bubble colors (first N are used, N grows with the level).
  colors: [
    { id: "coral",  fill: "#ff6b6b", glow: "#ffb3a7" },
    { id: "kelp",   fill: "#3ddc97", glow: "#a8f5d2" },
    { id: "lagoon", fill: "#3fa7ff", glow: "#a9d8ff" },
    { id: "sun",    fill: "#ffd166", glow: "#fff0bd" },
    { id: "urchin", fill: "#b07bff", glow: "#dcc6ff" },
    { id: "shell",  fill: "#ff9ad5", glow: "#ffd5ee" }
  ],

  play: {
    shotSpeed: 1150,          // units per second
    missesPerRow: 6,          // a new row drops in after this many shots that pop nothing
    dropBonus: 30,            // points per bubble that falls
    popPoints: 10,
    pearlsPerFish: 2,
    pearlsPerStar: 8,
    aimBounces: 1             // how many wall bounces the aim guide shows (Aim+ booster shows 3)
  },

  // Level generator: values grow from `start` to `end` over `levels` levels.
  levels: 60,
  curve: {
    rows:   { start: 5,  end: 11 },
    colors: { start: 3,  end: 6 },
    fish:   { start: 2,  end: 7 },
    shots:  { start: 20, end: 42 },
    stones: { start: 0,  end: 7 }
  },

  // Boosters you can buy with pearls and fire as your next bubble.
  boosters: [
    { id: "bomb",    name: "Depth Charge", desc: "Blasts every bubble around where it lands", price: 40, icon: "💣" },
    { id: "rainbow", name: "Prism Pearl",  desc: "Matches any color it touches",              price: 30, icon: "🌈" },
    { id: "aim",     name: "Sonar Aim",    desc: "Longer aim guide for 10 shots",             price: 20, icon: "📡" }
  ],

  // Endless mode: a new row slides in every N shots, no shot limit.
  endless: { rowEvery: 5, colors: 5 },

  ads: {
    enabled: true,
    simulate: true,
    interstitialEvery: 3
  },

  storagePrefix: "br_"
};

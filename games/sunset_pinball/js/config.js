/* ==========================================================================
   SUNSET PINBALL — GAME CONFIG
   A tropical-sunset pinball table with real flipper physics. The whole table
   is drawn in code; an amber dot-matrix display shows scores and missions.
   ========================================================================== */
window.GAME_CONFIG = {
  title: "Sunset Pinball",
  tagline: "Flip till the sun goes down",

  balls: 3,
  ballSave: 8,               // seconds of ball save at the start of each ball
  extraBallAt: [150000, 500000],

  physics: {
    gravity: 950,            // table slope
    maxSpeed: 1700,
    wallBounce: 0.45,
    flipperSpeed: 26,        // radians per second
    flipperBounce: 0.25,
    bumperKick: 640,
    slingKick: 520,
    plungerMax: 1500         // launch speed at full pull
  },

  scores: {
    bumper: 100, sling: 30, target: 250, allTargets: 2500, lane: 500, laneSet: 3000,
    saucer: 1500, spinner: 20, mission: 10000
  },

  // Missions run in order and loop. The third one starts a two-ball multiball.
  missions: [
    { id: "bumpers", text: "HIT BUMPERS", need: 12 },
    { id: "targets", text: "DROP ALL TARGETS", need: 1 },
    { id: "lanes",   text: "LIGHT S-U-N", need: 1 },
    { id: "saucer",  text: "SHOOT THE VOLCANO", need: 2 },
    { id: "sling",   text: "SLINGSHOTS", need: 15 }
  ],

  // Table palettes. unlock = best score needed.
  themes: [
    { id: "sunset",   name: "Sunset",   unlock: 0,      sky: ["#ff9a3c", "#ff4f7b", "#5b2a86"], wood: "#8a4b22", glow: "#ffd36b", accent: "#ff4f7b", palm: "#2a1035" },
    { id: "midnight", name: "Midnight", unlock: 60000,  sky: ["#28437a", "#1a2350", "#0b0d22"], wood: "#4b3a2a", glow: "#7fe3ff", accent: "#b48cff", palm: "#060716" },
    { id: "lagoon",   name: "Lagoon",   unlock: 150000, sky: ["#7ff0d6", "#2bb6c8", "#165a84"], wood: "#9a6a3a", glow: "#fff27a", accent: "#ff8a5b", palm: "#0d3a4a" }
  ],

  ads: { enabled: true, simulate: true, interstitialEvery: 2 },
  storagePrefix: "sp_"
};

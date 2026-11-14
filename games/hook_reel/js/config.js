/* ==========================================================================
   HOOK & REEL — GAME CONFIG
   Drop the hook as deep as your line allows (dodging fish on the way down),
   then reel up and snag every fish you can. Woodblock-print art: indigo inks,
   cream paper, carved wave patterns. Everything is drawn in code.
   Depth is in metres; the screen shows about 14 m at a time.
   ========================================================================== */
window.GAME_CONFIG = {
  title: "Hook & Reel",
  tagline: "Down to the deep, up with the catch",

  sink: 7,             // m/s going down
  reel: 9,             // m/s coming up (upgrades add speed)
  steer: 5,            // how fast the hook follows your finger

  // fish: depth range in metres, value in coins, size in metres, speed m/s
  fish: [
    { id: "minnow",  name: "Minnow",      from: 0,   to: 40,  value: 2,   size: 0.6, speed: 2.2, color: "#e9c46a", stripe: "#2a3a6a" },
    { id: "perch",   name: "Sun Perch",   from: 10,  to: 70,  value: 5,   size: 0.8, speed: 1.8, color: "#f4a261", stripe: "#7a2e1e" },
    { id: "mack",    name: "Mackerel",    from: 30,  to: 110, value: 9,   size: 1.0, speed: 2.8, color: "#8ab0c8", stripe: "#1e2f5a" },
    { id: "snapper", name: "Red Snapper", from: 60,  to: 160, value: 15,  size: 1.1, speed: 1.6, color: "#d1495b", stripe: "#5a1420" },
    { id: "tuna",    name: "Blue Tuna",   from: 100, to: 230, value: 26,  size: 1.4, speed: 3.2, color: "#3d5a99", stripe: "#e8e4d8" },
    { id: "angler",  name: "Lantern Fish",from: 170, to: 320, value: 42,  size: 1.0, speed: 1.2, color: "#2a2f45", stripe: "#f2e2a0", glow: true },
    { id: "eel",     name: "Ribbon Eel",  from: 220, to: 400, value: 60,  size: 1.8, speed: 1.4, color: "#6a8f5a", stripe: "#1e2e18" },
    { id: "golden",  name: "Golden Koi",  from: 40,  to: 400, value: 150, size: 0.9, speed: 3.6, color: "#f2c230", stripe: "#a0521a", rare: 0.03 }
  ],
  jellyChance: 0.18,     // share of creatures that are jellyfish (they knock fish off your hook on the way up)

  upgrades: [
    { id: "line",  name: "Line length", desc: "+30 m depth",        base: 40, per: 30, cost: [40, 90, 160, 260, 400, 600, 850, 1200, 1700], max: 9 },
    { id: "hooks", name: "Hook size",   desc: "+3 fish per trip",   base: 6,  per: 3,  cost: [50, 120, 220, 380, 600, 900], max: 6 },
    { id: "reel",  name: "Reel gear",   desc: "+15% reel speed",    base: 0,  per: 0.15, cost: [60, 140, 260, 450, 700], max: 5 },
    { id: "lure",  name: "Shiny lure",  desc: "More rare fish",     base: 0,  per: 0.5, cost: [100, 300, 700], max: 3 }
  ],

  ads: { enabled: true, simulate: true, interstitialEvery: 3 },
  storagePrefix: "hr_"
};

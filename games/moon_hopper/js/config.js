/* ==========================================================================
   MOON HOPPER — GAME CONFIG
   Land a lunar module on glowing vector terrain, 1960s mission-control style.
   Everything is drawn as phosphor lines on a canvas; no images needed.
   World units are metres; the camera zooms in near the ground.
   ========================================================================== */
window.GAME_CONFIG = {
  title: "Moon Hopper",
  tagline: "ONE SMALL HOP AT A TIME",

  craft: { thrust: 3.1, turn: 2.4, fuelBurn: 6.5, fuel: 100, size: 5 },          // thrust in multiples of local gravity at full fuel mass
  landing: { maxV: 4.2, maxH: 3.0, maxAngle: 0.2 },                          // safe vertical m/s, horizontal m/s, radians from upright
  // Missions: gravity m/s², wind m/s (pushes the craft), pads = landing pads with score multipliers, rough = terrain roughness
  missions: [
    { name: "LUNA 1",      body: "MOON",   gravity: 1.62, wind: 0,    pads: [2, 3],    rough: 0.6, fuel: 100 },
    { name: "LUNA 2",      body: "MOON",   gravity: 1.62, wind: 0,    pads: [2, 4],    rough: 0.8, fuel: 90 },
    { name: "LUNA 3",      body: "MOON",   gravity: 1.62, wind: 0,    pads: [3, 5],    rough: 1.0, fuel: 80 },
    { name: "PHOBOS",      body: "PHOBOS", gravity: 0.9,  wind: 0,    pads: [2, 3, 5], rough: 1.2, fuel: 70 },
    { name: "LUNA 4",      body: "MOON",   gravity: 1.62, wind: 0.3,  pads: [2, 5],    rough: 1.2, fuel: 80 },
    { name: "EUROPA",      body: "EUROPA", gravity: 1.31, wind: 0,    pads: [3, 4],    rough: 1.4, fuel: 75 },
    { name: "TITAN",       body: "TITAN",  gravity: 1.35, wind: 0.9,  pads: [2, 4],    rough: 1.1, fuel: 85 },
    { name: "LUNA 5",      body: "MOON",   gravity: 1.62, wind: 0.5,  pads: [3, 5],    rough: 1.6, fuel: 70 },
    { name: "MARS",        body: "MARS",   gravity: 3.71, wind: 0.8,  pads: [2, 3],    rough: 1.3, fuel: 100 },
    { name: "IO",          body: "IO",     gravity: 1.8,  wind: 0,    pads: [4, 5],    rough: 1.8, fuel: 70 },
    { name: "MARS 2",      body: "MARS",   gravity: 3.71, wind: 1.3,  pads: [3, 5],    rough: 1.6, fuel: 95 },
    { name: "CALLISTO",    body: "CALLISTO", gravity: 1.24, wind: 0,  pads: [5],       rough: 2.0, fuel: 60 },
    { name: "TITAN 2",     body: "TITAN",  gravity: 1.35, wind: 1.6,  pads: [3, 5],    rough: 1.5, fuel: 75 },
    { name: "MERCURY",     body: "MERCURY", gravity: 3.7, wind: 0,    pads: [4],       rough: 1.8, fuel: 90 },
    { name: "LUNA 6",      body: "MOON",   gravity: 1.62, wind: 1.0,  pads: [5],       rough: 2.2, fuel: 60 },
    { name: "MARS 3",      body: "MARS",   gravity: 3.71, wind: 2.0,  pads: [5],       rough: 2.0, fuel: 90 }
  ],
  freeFlight: { gravity: 1.62, refuel: 35 },        // endless: hop from pad to pad, each landing refuels

  ads: { enabled: true, simulate: true, interstitialEvery: 3 },
  storagePrefix: "mh_"
};

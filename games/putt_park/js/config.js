/* ==========================================================================
   PUTT PARK — GAME CONFIG
   Storybook mini golf painted in watercolor. Holes are plain data below: a
   world 400 wide × 640 tall, walls as polygons, plus sand, water, slopes,
   bumpers and moving blockers. Everything is drawn in code.
   ========================================================================== */
window.GAME_CONFIG = {
  title: "Putt Park",
  tagline: "A little storybook of putting greens",

  physics: {
    ballR: 7, cupR: 11, maxShot: 900,       // shot speed at full pull
    grass: 1.05, sand: 4.2,                 // friction (per second)
    wall: 0.72, bumper: 1.15,               // bounce
    sinkSpeed: 340,                         // faster than this and the ball lips out
    pullMax: 130, maxStrokes: 8
  },

  // Two chapters of six holes. poly = outer wall (closed). inner = extra wall polygons.
  courses: [
    { id: "meadow", name: "The Meadow", paper: "#fbf6ea", grass: "#9ccf8a", grass2: "#7fbf73", rough: "#cfe6b8", holes: [
      { name: "First Steps", par: 2, tee: [200, 560], cup: [200, 120], poly: [[120, 60], [280, 60], [280, 610], [120, 610]] },
      { name: "The Bend", par: 3, tee: [120, 560], cup: [290, 150], poly: [[60, 610], [60, 70], [340, 70], [340, 240], [180, 240], [180, 610]] },
      { name: "Sandy Hollow", par: 2, tee: [200, 565], cup: [200, 110], poly: [[80, 60], [320, 60], [320, 610], [80, 610]], sand: [{ c: [200, 330], r: 62 }, { c: [110, 180], r: 30 }] },
      { name: "Little Bridge", par: 3, tee: [200, 565], cup: [200, 105], poly: [[70, 60], [330, 60], [330, 610], [70, 610]], water: [[70, 280, 175, 360], [225, 280, 330, 360]] },
      { name: "Pinball Patch", par: 3, tee: [200, 570], cup: [200, 95], poly: [[70, 55], [330, 55], [330, 615], [70, 615]], bumpers: [[140, 260, 18], [260, 260, 18], [200, 360, 18], [120, 440, 14], [280, 440, 14], [200, 180, 14]] },
      { name: "The Gate", par: 2, tee: [200, 570], cup: [200, 105], poly: [[100, 60], [300, 60], [300, 615], [100, 615]], movers: [{ x: 200, y: 330, w: 90, h: 16, axis: "x", range: 55, speed: 1.4 }] }
    ] },
    { id: "seaside", name: "Seaside Cliffs", paper: "#f4f7f8", grass: "#8ec9a3", grass2: "#6fb68e", rough: "#e9dcb8", holes: [
      { name: "Sea Breeze", par: 3, tee: [130, 570], cup: [270, 110], poly: [[60, 60], [340, 60], [340, 615], [60, 615]], slopes: [{ r: [60, 240, 340, 420], f: [260, 0] }] },
      { name: "Zig and Zag", par: 4, tee: [110, 575], cup: [290, 100], poly: [[60, 60], [340, 60], [340, 615], [60, 615]], inner: [[[60, 420], [255, 420], [255, 436], [60, 436]], [[145, 250], [340, 250], [340, 266], [145, 266]]] },
      { name: "Lighthouse Isle", par: 3, tee: [200, 575], cup: [200, 140], poly: [[60, 60], [340, 60], [340, 615], [60, 615]], water: [[60, 60, 340, 100], [60, 100, 140, 260], [260, 100, 340, 260], [60, 220, 175, 260], [225, 220, 340, 260]] },
      { name: "The Wedge", par: 3, tee: [200, 575], cup: [200, 100], poly: [[70, 55], [330, 55], [330, 615], [70, 615]], inner: [[[200, 260], [260, 380], [140, 380]]] },
      { name: "Busy Harbor", par: 3, tee: [200, 575], cup: [200, 100], poly: [[80, 55], [320, 55], [320, 615], [80, 615]], sand: [{ c: [200, 210], r: 40 }], movers: [{ x: 200, y: 450, w: 80, h: 14, axis: "x", range: 70, speed: 1.1 }, { x: 200, y: 300, w: 80, h: 14, axis: "x", range: 70, speed: -1.6 }] },
      { name: "Cliff Top Finale", par: 4, tee: [110, 575], cup: [290, 575], poly: [[60, 615], [60, 60], [340, 60], [340, 615], [240, 615], [240, 200], [160, 200], [160, 615]], slopes: [{ r: [60, 60, 340, 200], f: [180, 0] }], water: [[60, 60, 120, 120]] }
    ] }
  ],

  balls: [
    { id: "white", name: "Classic", color: "#ffffff", stars: 0 },
    { id: "rose", name: "Rose", color: "#f2a7b0", stars: 6 },
    { id: "sky", name: "Sky", color: "#9cc8ea", stars: 12 },
    { id: "lemon", name: "Lemon", color: "#f5dc72", stars: 20 },
    { id: "plum", name: "Plum", color: "#a98bd1", stars: 28 }
  ],

  ads: { enabled: true, simulate: true, interstitialEvery: 3 },
  storagePrefix: "pk_"
};

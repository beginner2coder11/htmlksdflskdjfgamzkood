/* ==========================================================================
   SPIRAL DROP — GAME CONFIG
   Spin the tower, drop the ball through the gaps, never touch the striped
   slices. Memphis-style art (bold pastels, squiggles, thick outlines) is
   drawn in code; assets/ can stay empty.
   ========================================================================== */
window.GAME_CONFIG = {
  title: "Spiral Drop",
  tagline: "Spin it. Drop it. Don't touch the stripes.",

  tower: { slices: 12, spacing: 92, outer: 122, inner: 26, tilt: 0.3 },   // tilt = ellipse squash (view angle)
  ball: { r: 12, bounce: 58, gravity: 1500, maxFall: 720 },               // bounce = jump height, maxFall = terminal speed
  spinSpeed: 0.013,                                                       // radians per dragged pixel

  feverAfter: 3,               // floors in a row without bouncing → fever smash
  levels: 100,
  // per level: floors, gap slices and danger slices grow from start to end
  curve: { floors: [12, 42], gaps: [3, 1], danger: [0, 4] },
  dangerFrom: 2,

  // Memphis palettes rotate every few levels: bg, pole, slice colors, danger stripe pair, ink
  palettes: [
    { bg: "#ffe7d6", pole: "#ffd23f", slices: ["#3ec6c1", "#ff6fa3"], danger: ["#161616", "#ff4f4f"], ink: "#161616", deco: ["#ff6fa3", "#3ec6c1", "#ffd23f", "#7b61ff"] },
    { bg: "#e6f4ff", pole: "#ff6fa3", slices: ["#7b61ff", "#ffd23f"], danger: ["#161616", "#ff8a1f"], ink: "#161616", deco: ["#7b61ff", "#ffd23f", "#3ec6c1", "#ff6fa3"] },
    { bg: "#f3ffe6", pole: "#3ec6c1", slices: ["#ff8a1f", "#7b61ff"], danger: ["#161616", "#ff4f4f"], ink: "#161616", deco: ["#ff8a1f", "#7b61ff", "#ff6fa3", "#3ec6c1"] },
    { bg: "#fff6cc", pole: "#7b61ff", slices: ["#ff6fa3", "#3ec6c1"], danger: ["#161616", "#ff4f4f"], ink: "#161616", deco: ["#ff6fa3", "#3ec6c1", "#7b61ff", "#ff8a1f"] }
  ],
  paletteEvery: 5,

  // Ball skins: pattern = solid | dots | stripes | half | ring | zigzag
  balls: [
    { id: "pop",    name: "Pop",    color: "#ff4f4f", pattern: "solid",   level: 1 },
    { id: "dot",    name: "Dotty",  color: "#3ec6c1", pattern: "dots",    level: 4 },
    { id: "candy",  name: "Candy",  color: "#ff6fa3", pattern: "stripes", level: 8 },
    { id: "moon",   name: "Moon",   color: "#ffd23f", pattern: "half",    level: 13 },
    { id: "donut",  name: "Donut",  color: "#7b61ff", pattern: "ring",    level: 20 },
    { id: "zag",    name: "Zigzag", color: "#ff8a1f", pattern: "zigzag",  level: 30 }
  ],

  ads: { enabled: true, simulate: true, interstitialEvery: 3 },
  storagePrefix: "sd_"
};

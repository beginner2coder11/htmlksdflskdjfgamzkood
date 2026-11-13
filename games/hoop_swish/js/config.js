/* ==========================================================================
   HOOP SWISH — GAME CONFIG
   Swipe-to-shoot street basketball. The court is a small 3D scene in metres
   (rim at 3.05 m) drawn with perspective onto a canvas, in a spray-paint
   graffiti style. Nothing needs image files.
   ========================================================================== */
window.GAME_CONFIG = {
  title: "Hoop Swish",
  tagline: "Swipe. Shoot. Swish.",

  court: { rimY: 3.05, rimZ: 4.6, rimR: 0.23, ballR: 0.12, board: { z: 4.95, w: 1.8, y0: 2.85, y1: 3.95 }, gravity: 9.8 },
  swipe: { perfect: 0.42, spread: 0.22, aimSlop: 0.35 },   // perfect = swipe length as share of screen height
  modes: {
    street: { name: "Street 60", time: 60, desc: "Score as much as you can in 60 seconds" },
    streak: { name: "Streak", time: 0, desc: "Keep scoring. One miss and it's over" }
  },
  points: { basket: 2, swish: 3, fireAfter: 3, fireMult: 2, moveFrom: 40, bonusTime: 4 },   // moveFrom: score at which the hoop starts sliding

  balls: [
    { id: "classic", name: "Classic", base: "#e8742c", seam: "#2a1a10", price: 0 },
    { id: "neon",    name: "Neon",    base: "#39ff88", seam: "#0d3b24", price: 120 },
    { id: "galaxy",  name: "Midnight",base: "#5a3df0", seam: "#f5d0ff", price: 260 },
    { id: "gold",    name: "Gold",    base: "#f2c230", seam: "#6a4a08", price: 450 },
    { id: "candy",   name: "Candy",   base: "#ff5fa8", seam: "#ffffff", price: 700 }
  ],

  ads: { enabled: true, simulate: true, interstitialEvery: 2 },
  storagePrefix: "hs_"
};

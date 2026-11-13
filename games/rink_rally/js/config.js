/* ==========================================================================
   RINK RALLY — GAME CONFIG
   Groovy 1970s air hockey. Climb the ladder of opponents, play a quick match
   or two players on one phone. The table is 400 × 700 units; you play from
   the bottom. Everything is drawn in code.
   ========================================================================== */
window.GAME_CONFIG = {
  title: "Rink Rally",
  tagline: "Far-out air hockey",

  table: { w: 400, h: 700, goal: 130, corner: 40 },
  puck: { r: 17, friction: 0.35, max: 1700, wall: 0.86 },
  mallet: { r: 28, followRate: 30 },       // how fast your mallet chases your finger
  winScore: 7,

  // Opponents on the ladder. speed = units/s, react = 0..1 (lower is lazier), aim = 0..1, aggro = attack eagerness
  rivals: [
    { name: "Disco Dan",   color: "#e3742b", speed: 460,  react: 0.4, aim: 0.3, aggro: 0.35, quote: "Let's boogie, baby." },
    { name: "Roller Rita", color: "#d94f6b", speed: 560,  react: 0.5, aim: 0.45, aggro: 0.45, quote: "Skate or eat my dust." },
    { name: "Funky Fred",  color: "#8f5bd6", speed: 660,  react: 0.6, aim: 0.55, aggro: 0.55, quote: "Can you dig it?" },
    { name: "Groovy Gail", color: "#2f9f8f", speed: 760,  react: 0.7, aim: 0.65, aggro: 0.6, quote: "Stay groovy, rookie." },
    { name: "Captain Cool",color: "#3b6fd1", speed: 880,  react: 0.8, aim: 0.75, aggro: 0.7, quote: "Ice cold. Always." },
    { name: "The Champ",   color: "#c99a1e", speed: 1000, react: 0.9, aim: 0.88, aggro: 0.8, quote: "Nobody beats the Champ." }
  ],

  // Table themes (stripe colours), unlocked by ladder wins
  tables: [
    { id: "sunset", name: "Sunset", stripes: ["#f2a541", "#e3742b", "#c94b2c", "#8a3b2a"], felt: "#f6e7c8", rim: "#5b3a24", wins: 0 },
    { id: "lime",   name: "Lime Lounge", stripes: ["#c9d64a", "#8fb33a", "#4f8a3a", "#2e5a35"], felt: "#f1f0d2", rim: "#3a3a24", wins: 2 },
    { id: "berry",  name: "Berry Bowl", stripes: ["#f29bb2", "#d94f6b", "#8f3a6a", "#4a2a52"], felt: "#f7e4ea", rim: "#3a2240", wins: 4 },
    { id: "ocean",  name: "Surf Shack", stripes: ["#7fd1d9", "#2f9f8f", "#2a6f8a", "#1f3a5a"], felt: "#e8f4f2", rim: "#1f3040", wins: 6 }
  ],

  ads: { enabled: true, simulate: true, interstitialEvery: 2 },
  storagePrefix: "rr_"
};

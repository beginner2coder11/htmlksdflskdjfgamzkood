/* ==========================================================================
   BRICK BLOOM — GAME CONFIG
   A Bauhaus-style brick breaker. Everything is drawn in code (flat shapes,
   thick outlines), so the game is complete with an empty assets/ folder.
   The playfield is 400 units wide; its height follows the screen.
   ========================================================================== */
window.GAME_CONFIG = {
  title: "Brick Bloom",
  tagline: "Bounce. Break. Bloom.",

  // Bauhaus palette. Change these to reskin the whole game (canvas + UI).
  palette: {
    paper: "#f3ead8",       // background
    ink: "#161616",         // outlines and text
    red: "#e2412f",
    yellow: "#f5b915",
    blue: "#2257a8",
    green: "#2f9a6a",
    grey: "#8d8a83"
  },

  play: {
    lives: 3,
    ballSpeed: 430,          // units per second at level 1
    speedPerLevel: 6,        // +units/s per level
    maxSpeed: 720,
    paddleWidth: 78,
    paddleMin: 46,
    paddleMax: 132,
    powerDropChance: 0.13,   // chance a normal brick drops a power-up
    powerTime: 12,           // seconds a timed power lasts
    comboWindow: 0.9,        // seconds between brick hits to keep a combo
    coinsPerBrick: 1,
    coinsPerStar: 10
  },

  // Power-ups (weighted). bad:true ones are avoided by smart players.
  powers: [
    { id: "wide",   label: "W", name: "Wide",       color: "blue",   weight: 5 },
    { id: "multi",  label: "M", name: "Multi Ball", color: "red",    weight: 4 },
    { id: "laser",  label: "L", name: "Lasers",     color: "yellow", weight: 3 },
    { id: "slow",   label: "S", name: "Slow",       color: "green",  weight: 3 },
    { id: "fire",   label: "F", name: "Fireball",   color: "red",    weight: 2 },
    { id: "sticky", label: "C", name: "Catch",      color: "blue",   weight: 2 },
    { id: "life",   label: "+", name: "Extra Life", color: "green",  weight: 1 },
    { id: "shrink", label: "−", name: "Shrink",     color: "grey",   weight: 2, bad: true }
  ],

  // Paddle skins: shape = bar | pill | notch | arch | split | dots
  paddles: [
    { id: "bar",   name: "Bar",     shape: "bar",   color: "ink",    price: 0 },
    { id: "pill",  name: "Pill",    shape: "pill",  color: "red",    price: 150 },
    { id: "notch", name: "Notch",   shape: "notch", color: "blue",   price: 300 },
    { id: "arch",  name: "Arch",    shape: "arch",  color: "yellow", price: 500 },
    { id: "split", name: "Split",   shape: "split", color: "green",  price: 800 },
    { id: "dots",  name: "Dotwork", shape: "dots",  color: "red",    stars: 60 }
  ],

  // Ball skins: shape = circle | square | ring | half
  balls: [
    { id: "circle", name: "Circle", shape: "circle", color: "ink",  price: 0 },
    { id: "square", name: "Square", shape: "square", color: "red",  price: 200 },
    { id: "ring",   name: "Ring",   shape: "ring",   color: "blue", price: 400 },
    { id: "half",   name: "Half",   shape: "half",   color: "yellow", stars: 30 }
  ],

  /* Hand-made levels. 10 columns per row.
       .  empty      1 2 3  bricks needing 1–3 hits (red / yellow / blue)
       X  steel (unbreakable)   B  bomb (blasts neighbours)   P  power brick
     Levels after these are generated (see game.js → genLevel). */
  levels: [
    ["..........","..1111111.","..1111111.","..2222222.","..........",".........."],
    ["1111111111","1........1","1.222222.1","1.2....2.1","1.222222.1","1........1","1111111111"],
    ["....33....","...3223...","..321123..",".32111123.","..321123..","...3223...","....33...."],
    ["1.1.1.1.1.",".2.2.2.2.2","1.1.P.1.1.",".2.2.2.2.2","1.1.1.1.1."],
    ["XX......XX","1111111111","2222BB2222","3333333333","..........","....XX...."],
    ["3........3","33......33","323....323","3213..3123","32P1111P23","3333333333"],
    ["..XXXXXX..","..X1111X..","..X1BB1X..","..X1111X..","..XX..XX..","2222222222"],
    ["1212121212","2121212121","1212P21212","2121212121","XXXX..XXXX"],
    ["....P.....","...222....","..23332...",".2311132..","2311B11322",".2311132..","..23332...","...222....","....2....."],
    ["3333333333","3XXXXXXXX3","3X222222X3","3X2BPPB2X3","3X222222X3","3XXX..XXX3","3........3"],
    ["1.2.33.2.1",".1.2..2.1.","B.1.22.1.B","..........","XX.XX.XX.X","1111111111"],
    ["2222222222","2........2","2.XXXXXX.2","2.X3BB3X.2","2.X3PP3X.2","2.XX..XX.2","2........2","2222222222"]
  ],
  generatedLevels: 48,      // levels 13..60 are generated → 60 levels total

  ads: {
    enabled: true,
    simulate: true,          // shows a fake ad overlay; set false for release
    interstitialEvery: 3     // show an interstitial every N finished levels
  },

  storagePrefix: "bb_"
};

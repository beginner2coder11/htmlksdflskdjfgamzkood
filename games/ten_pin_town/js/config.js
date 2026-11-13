/* ==========================================================================
   TEN PIN TOWN — GAME CONFIG
   Ten-pin bowling in a 1950s atomic-age alley. The lane is simulated top-down
   in metres (regulation sizes) and drawn through a camera that follows the
   ball. Nothing needs image or sound files.
   ========================================================================== */
window.GAME_CONFIG = {
  title: "Ten Pin Town",
  tagline: "Roll one down the atomic alley",

  // lane geometry in metres (regulation: 1.05 m wide, head pin 18.29 m from the foul line)
  lane: { half: 0.527, gutter: 0.24, headPin: 18.29, pinSpacing: 0.3048, deckEnd: 19.3, pitZ: 19.9, oil: 12, ballR: 0.109, pinR: 0.061 },
  // feel: speeds in m/s, hook in m/s² at full spin, knock = impact speed that topples a pin
  physics: { minSpeed: 5.5, maxSpeed: 9.5, hook: 0.85, ballDrag: 0.12, pinMass: 1.6, pinFriction: 2.6, knock: 0.3, ballBounce: 0.55, pinBounce: 0.6 },
  swipe: { minLength: 0.06, angle: 0.22, spin: 1.6 },    // minLength = share of screen height; angle/spin = swipe sensitivity

  coins: { strike: 10, spare: 5, perTen: 1, challenge: 15 },   // perTen: coins per 10 points at the end of a game

  // Spare Shots: the pins left standing (1 = head pin, 7-10 = back row, left to right). One roll to clear them.
  challenges: [
    { name: "Head pin", pins: [1] },
    { name: "Corner seven", pins: [7] },
    { name: "Corner ten", pins: [10] },
    { name: "The five", pins: [5] },
    { name: "Bucket left", pins: [2, 4, 5, 8] },
    { name: "Three-six", pins: [3, 6] },
    { name: "Two-four", pins: [2, 4] },
    { name: "Six-ten", pins: [6, 10] },
    { name: "Four-seven", pins: [4, 7] },
    { name: "Fence right", pins: [3, 6, 10] },
    { name: "Fence left", pins: [2, 4, 7] },
    { name: "Washout", pins: [1, 2, 4, 10] },
    { name: "Front three", pins: [1, 2, 3] },
    { name: "Bucket right", pins: [3, 5, 6, 9] },
    { name: "Two-eight", pins: [2, 8] },
    { name: "Three-nine", pins: [3, 9] },
    { name: "Back row left", pins: [4, 7, 8] },
    { name: "Back row right", pins: [6, 9, 10] },
    { name: "Clothesline", pins: [1, 2, 4, 7] },
    { name: "Five-nine", pins: [5, 9] },
    { name: "Diamond", pins: [1, 2, 3, 5] },
    { name: "Wide spread", pins: [2, 3, 5, 8, 9] },
    { name: "Baby split", pins: [3, 10] },
    { name: "Baby split left", pins: [2, 7] }
  ],

  // balls: hook = how much the spin bends it, mass in kg (heavier = less deflection off the pins)
  balls: [
    { id: "cherry",  name: "Cherry",      color: "#e8473c", swirl: "#ffb3a3", hook: 1.0,  mass: 6.4, price: 0 },
    { id: "teal",    name: "Atomic Teal", color: "#1aa6a0", swirl: "#bff5ee", hook: 1.15, mass: 6.4, price: 120 },
    { id: "mustard", name: "Mustard",     color: "#e8b13c", swirl: "#fff1c4", hook: 1.05, mass: 7.0, price: 260 },
    { id: "orbit",   name: "Orbit",       color: "#3b3f8f", swirl: "#ff8a5c", hook: 1.3,  mass: 6.8, price: 450 },
    { id: "pearl",   name: "Pearl",       color: "#f4ece0", swirl: "#9fd8d2", hook: 1.25, mass: 7.2, price: 700 }
  ],

  ads: { enabled: true, simulate: true, interstitialEvery: 2 },
  storagePrefix: "tp_"
};

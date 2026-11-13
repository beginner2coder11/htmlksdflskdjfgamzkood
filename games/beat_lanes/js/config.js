/* ==========================================================================
   BEAT LANES — GAME CONFIG
   A four-lane rhythm game in a Y2K chrome style. Every song is composed by
   the synth in js/audio.js from the settings below, and the note chart is
   built from the same music, so notes always land on the beat.
   ========================================================================== */
window.GAME_CONFIG = {
  title: "Beat Lanes",
  tagline: "tap to the beat ✦ chrome edition",

  lanes: ["#7af0ff", "#c49bff", "#ff9be0", "#9bffc4"],
  keys: ["d", "f", "j", "k"],
  windows: { perfect: 0.05, great: 0.095, good: 0.14 },      // seconds either side of the note
  points: { perfect: 300, great: 200, good: 100, hold: 20 },
  speed: { easy: 0.9, normal: 1.1, hard: 1.35 },              // screen heights per second… scaled below
  leadTime: 1.6,                                              // seconds a note takes to fall at speed 1

  // Songs. key = root MIDI note, scale = minor | major | dorian, bars = length, style picks the drum/bass feel.
  songs: [
    { id: "bubble",  name: "Bubble Pop",     artist: "DJ Gloss",   bpm: 112, key: 60, scale: "major",  bars: 28, style: "pop",   seed: 3 },
    { id: "chrome",  name: "Chrome Heart",   artist: "Mirrorball", bpm: 124, key: 57, scale: "minor",  bars: 32, style: "house", seed: 7 },
    { id: "pixel",   name: "Pixel Kiss",     artist: "Neon Angelfish", bpm: 132, key: 62, scale: "dorian", bars: 32, style: "break", seed: 11 },
    { id: "jelly",   name: "Jelly Drive",    artist: "Glitter Grid", bpm: 100, key: 55, scale: "major", bars: 26, style: "pop",   seed: 19 },
    { id: "hyper",   name: "Hyper Sparkle",  artist: "Y2Kid",      bpm: 144, key: 64, scale: "minor",  bars: 36, style: "house", seed: 23 },
    { id: "orbit",   name: "Orbit Gloss",    artist: "Starmilk",   bpm: 156, key: 59, scale: "dorian", bars: 40, style: "break", seed: 29 }
  ],
  difficulties: {
    easy:   { density: 0.35, chords: 0,    holds: 0.08, sixteenths: 0 },
    normal: { density: 0.6,  chords: 0.08, holds: 0.12, sixteenths: 0.05 },
    hard:   { density: 0.85, chords: 0.2,  holds: 0.15, sixteenths: 0.25 }
  },

  ads: { enabled: true, simulate: true, interstitialEvery: 2 },
  storagePrefix: "bl_"
};

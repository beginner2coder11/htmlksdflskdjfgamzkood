/* ==========================================================================
   SANDSTORM SURVIVORS — GAME CONFIG
   Top-down pixel-art survival. Move with the joystick, your gear fires on
   its own. Collect gems to level up and pick 1 of 3 upgrades. Bosses arrive
   at 3, 6 and 9 minutes. Survive 10 minutes to clear the stage.
   Everything (sprites, font, sound) is made in code.
   ========================================================================== */
window.GAME_CONFIG = {
  // Game name (browser tab, app name default)
  title: "Sandstorm Survivors",
  // Short line under the logo on the title screen
  tagline: "Gear up. Hold out. Ten minutes to dawn.",
  // the logo on the title screen, one entry per line
  titleLines: ["SANDSTORM", "SURVIVORS"],
  // UI colours (buttons, panels, text): CSS variables from css/style.css
  theme: {
    "ink": "#2a2340",
    "panel": "#3a2f55",
    "panel-2": "#4a3d6a",
    "sand": "#f0c070",
    "gold": "#ffd23f",
    "red": "#e8403a",
    "green": "#5fd068",
    "cyan": "#5fc8ff",
    "white": "#fff8e8",
    "mute": "#b8aed0"
  },
  // Seconds to survive to clear a stage (600 = 10 minutes)
  stageTime: 600,
  // Seconds when each boss arrives
  bossAt: [180, 360, 540],

  // 3 stages: ground and prop colours, grass, enemy tint and how many stages must be cleared to unlock
  stages: [
    { id: "dust",    name: "Dust Flats",     ground: ["#d8925a", "#cf8650", "#e3a06a"], deco: ["#b86a3a", "#8a4a2a", "#f0c070"], grass: "#c8b04a", tint: null,      unlock: 0 },
    { id: "fungus",  name: "Fungus Wood",    ground: ["#5a8f4a", "#4f8442", "#689c56"], deco: ["#3a6a32", "#b85aa8", "#e8d870"], grass: "#7fbf5a", tint: "#b47cff", unlock: 1 },
    { id: "crystal", name: "Crystal Hollow", ground: ["#4a5a8a", "#43527e", "#566898"], deco: ["#2f3a6a", "#7fe8ff", "#c8b8ff"], grass: "#6a7ab8", tint: "#5fe0ff", unlock: 2 }
  ],

  // Heroes: starting weapon, gun (pistol, rifle, ray, shotgun), price in coins, hair/cloth/skin colours
  heroes: [
    { id: "rookie",  name: "Rookie",  weapon: "blaster", gun: "pistol",  price: 0,    hair: "#3a2a5a", cloth: "#3f7fd8", skin: "#ffd0a8", note: "Pistol. Starts with the Blaster." },
    { id: "ranger",  name: "Ranger",  weapon: "boomer",  gun: "rifle",   price: 800,  hair: "#8a4a2a", cloth: "#4fae5a", skin: "#e8b088", note: "Rifle. Blaster + Boomerang." },
    { id: "tinker",  name: "Tinker",  weapon: "drones",  gun: "ray",     price: 1500, hair: "#ffb347", cloth: "#9b7bff", skin: "#ffd0a8", note: "Ray gun. Blaster + Orbit Drones." },
    { id: "brawler", name: "Brawler", weapon: "shock",   gun: "shotgun", price: 2500, hair: "#2a2340", cloth: "#e8403a", skin: "#b8784a", note: "Shotgun. Blaster + Shockwave." }
  ],

  // weapons: values per level 1..5. cd = seconds between shots
  weapons: {
    blaster: { name: "Blaster",       desc: "Fires at the nearest enemy.",          cd: [0.85, 0.75, 0.65, 0.55, 0.45], dmg: [10, 13, 16, 19, 23], count: [1, 1, 2, 2, 3], pierce: [0, 0, 0, 1, 1] },
    boomer:  { name: "Boomerang",     desc: "Thrown out and back, hits everything.", cd: [1.6, 1.45, 1.3, 1.15, 1.0], dmg: [14, 17, 21, 25, 30], count: [1, 1, 2, 2, 3] },
    drones:  { name: "Orbit Drones",  desc: "Little drones circle you.",            count: [2, 3, 3, 4, 5], dmg: [8, 10, 12, 15, 18], radius: [32, 34, 37, 40, 44] },
    saw:     { name: "Saw Blades",    desc: "Bouncing blades that tear through.",    cd: [2.2, 2.0, 1.7, 1.5, 1.2], dmg: [12, 15, 18, 22, 26], count: [1, 1, 2, 2, 3] },
    tesla:   { name: "Tesla Coil",    desc: "Zaps a chain of nearby enemies.",       cd: [2.0, 1.8, 1.5, 1.25, 1.0], dmg: [16, 19, 23, 28, 34], chain: [2, 3, 4, 5, 6] },
    flame:   { name: "Flamethrower",  desc: "Short cone of fire where you face.",    dmg: [4, 5, 6, 7, 9], range: [44, 50, 56, 62, 70] },
    mines:   { name: "Land Mines",    desc: "Drops mines that blow up enemies.",     cd: [1.8, 1.6, 1.4, 1.2, 1.0], dmg: [30, 36, 44, 52, 60], radius: [26, 29, 32, 36, 40] },
    shock:   { name: "Shockwave",     desc: "Pulses out, damages and pushes back.",  cd: [3.0, 2.7, 2.4, 2.1, 1.8], dmg: [14, 17, 21, 25, 30], radius: [42, 48, 55, 62, 70] }
  },
  // Passive upgrades: name, description and card icon
  passives: {
    vigor:  { name: "Vigor",    desc: "+20 max health",       icon: "heart" },
    boots:  { name: "Boots",    desc: "+8% move speed",       icon: "boot" },
    magnet: { name: "Magnet",   desc: "+30% pickup range",    icon: "magnet" },
    armor:  { name: "Armor",    desc: "-1 damage taken",      icon: "shield" },
    regen:  { name: "Bandages", desc: "Heal 0.3 health a second", icon: "cross" },
    might:  { name: "Might",    desc: "+10% damage",          icon: "fist" },
    haste:  { name: "Haste",    desc: "-8% weapon cooldown",  icon: "clock" },
    area:   { name: "Reach",    desc: "+10% weapon area",     icon: "ring" }
  },
  // How many weapons a hero can carry
  maxWeapons: 6,
  // How many passives a hero can carry
  maxPassives: 6,
  // Max level of each weapon and passive
  maxLevel: 5,

  // enemies: base stats; hp and damage grow with time
  enemies: {
    slime:    { hp: 12, speed: 22, dmg: 5,  xp: 1, from: 0 },
    beetle:   { hp: 16, speed: 36, dmg: 6,  xp: 1, from: 30 },
    wasp:     { hp: 10, speed: 50, dmg: 5,  xp: 2, from: 75, fly: true },
    crab:     { hp: 22, speed: 30, dmg: 7,  xp: 2, from: 120 },
    scorpion: { hp: 40, speed: 26, dmg: 10, xp: 4, from: 200, dash: true },
    cactus:   { hp: 75, speed: 17, dmg: 12, xp: 5, from: 260 },
    worm:     { hp: 55, speed: 30, dmg: 11, xp: 4, from: 330 }
  },
  // Bosses in order: sprite, hp, speed, damage and size
  bosses: [
    { id: "kingslime", name: "King Slime",    sprite: "slime",    hp: 1400, speed: 20, dmg: 15, scale: 3 },
    { id: "scorpking", name: "Dune Scorpion", sprite: "scorpion", hp: 4200, speed: 26, dmg: 20, scale: 2.6 },
    { id: "wormqueen", name: "Worm Queen",    sprite: "worm",     hp: 9000, speed: 30, dmg: 24, scale: 3 }
  ],

  // Permanent upgrades bought with coins: max level and cost per level
  meta: {
    power:  { name: "Power",       desc: "+5% damage",         max: 5, cost: [200, 400, 700, 1100, 1600] },
    health: { name: "Toughness",   desc: "+10 max health",     max: 5, cost: [150, 300, 550, 900, 1400] },
    swift:  { name: "Swiftness",   desc: "+4% move speed",     max: 5, cost: [150, 300, 550, 900, 1400] },
    reach:  { name: "Reach",       desc: "+15% pickup range",  max: 5, cost: [120, 250, 450, 750, 1100] },
    greed:  { name: "Greed",       desc: "+10% coins",         max: 5, cost: [200, 400, 700, 1100, 1600] },
    revive: { name: "Second Wind", desc: "Revive once a run",  max: 1, cost: [2500] }
  },
  // Daily gift: coins for day 1..7 of the login streak
  daily: [100, 150, 200, 300, 400, 600, 1000],
  // Ads: enabled = show ads, simulate = fake ads in the browser (the APK uses real AdMob), interstitialEvery = an interstitial every N finished rounds (0 = off)
  ads: { enabled: true, simulate: true, interstitialEvery: 2 },
  // Save-data key prefix. Give each reskin its own so saves never mix
  storagePrefix: "ss_"
};

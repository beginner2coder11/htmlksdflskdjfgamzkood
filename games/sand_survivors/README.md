# Sandstorm Survivors: pixel-art survival template

A top-down pixel-art survival game. You move with a floating joystick while your gear fires on its own.
Monsters close in from every side. Collect the gems they drop to level up, and pick 1 of 3 upgrades each
time. Bosses arrive at 3, 6 and 9 minutes, and surviving 10 minutes clears the stage. Everything (sprites,
font and sound) is made in code, with no build step, no dependencies and no files. It plays fully offline.

## Controls
Drag anywhere to move (a floating joystick appears under your finger). On a keyboard, use WASD or the arrows,
and P/Esc to pause.

## Features
- **True pixel look:** the game is drawn into a low-res canvas (about 200 px wide on phones) and scaled up
  with no smoothing. Sprites are hand-made pixel maps baked once, with white hit-flash copies, and damage
  numbers use a tiny bitmap font.
- **8 weapons** (all gear, nothing magic), 5 levels each:
  - Blaster, Boomerang, Orbit Drones, Saw Blades (bounce off the screen edges).
  - Tesla Coil (chain zap), Flamethrower (cone where you face), Land Mines and Shockwave (knockback).
- **8 passives:** Vigor, Boots, Magnet, Armor, Bandages, Might, Haste and Reach. You can carry up to 6
  weapons and 6 passives.
- **Enemies:**
  - Slimes, beetles, weaving wasps, crabs, dashing scorpions, cactus brutes and worms, unlocking over time.
  - Ring "SWARM!" events every minute, and glowing elites that drop chests (1 or 3 free upgrades).
  - Bosses: King Slime (spawns slimes), Dune Scorpion (charges) and Worm Queen (spawns worms).
- **Pickups:** gems (merge when there are too many), coins, food, a magnet (pulls in every gem) and a bomb
  (clears the screen).
- **3 stages:** Dust Flats, Fungus Wood and Crystal Hollow. Each has its own ground, props and enemy tint,
  and you unlock the next by surviving 10 minutes.
- **4 heroes**, each with their own gun (pistol, rifle, ray gun, shotgun). The body faces the way you walk,
  with front, back and side views and a 4-frame walk. The gun turns on its own toward the nearest monster, and
  Blaster shots leave the barrel with a muzzle flash. Every hero starts with the Blaster; the paid heroes also
  get a second weapon. Permanent upgrades are bought with coins (Power, Toughness, Swiftness, Reach, Greed and
  Second Wind).
- **Ads and retention:** reroll a level-up (rewarded), revive (rewarded, once per run), double coins at the
  end, an interstitial every 2 runs (`js/ads.js` uses the `GameAdsBridge` contract) and a 7-day daily gift.

## Balance audit
The built-in autoplay bot runs the title screen and the test runs. Results:
- Starter hero with no upgrades: survives about 1.5–6 min.
- Mid permanent upgrades: about 5–7 min.
- Maxed upgrades: clears all three stages most of the time.

The bot is a careful but mediocre player, so these are rough numbers.
```js
Game.start(stageIdx, "rookie", { power: 5, health: 5 }, { bot: true });
while (Game.mode === "play") { Game.simulate(1/60, 1); if (Game.mode === "levelup") Game.choose(Game.reroll()[0]); }
```

## Reskin
- **Name, logo and UI colours:** `title`, `titleLines` (one entry per logo line) and `theme` (the CSS variables
  from `css/style.css`) in `js/config.js`. `js/skin.js` applies them when the game starts.
- `js/config.js`: stages (ground and prop colours, enemy tint), heroes, weapon and passive tables, enemy
  stats and unlock times, bosses, permanent upgrades, daily gift, ads and the storage prefix (`ss_`).
- `js/sprites.js`: the pixel maps for the hero (front/back/side, 4 walk frames) and monsters, the guns
  (`GUNS`: grip point + muzzle point; the 16 aim angles are baked from them), the 8×8 upgrade icons and the
  digit font. Each hero's `gun` is set in `config.js`.

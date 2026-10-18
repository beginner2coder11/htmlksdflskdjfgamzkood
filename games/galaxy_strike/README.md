# Galaxy Strike: HTML5 space shooter template

A neon arcade space shooter. Drag to fly while your ship fires by itself. Blast alien formations, chain kills into
combos, grab power-ups and take down a giant boss at the end of every sector. It plays **fully offline**.
Pure HTML/CSS/JS with no build step, no dependencies and no image or sound files. It runs on the web or wrapped
as an Android APK.

## Run
Serve the folder with any static server (for example `python3 -m http.server`), or drop it into an HTML-to-APK converter.

## Controls
- **Phones:** drag anywhere to fly. The drag is relative, so your finger never covers the ship. Tap 💥 for a bomb.
- **Desktop:** arrow keys / WASD to fly, B or Shift for a bomb, Esc or P to pause.

## Features
- **Sectors:** each sector is 5 waves and a boss. Every sector makes enemies tougher, faster and more trigger-happy
  (see `difficulty` in config).
- **Formations:** lines, V-formations, snakes, side sweeps, homing darts, hovering gunners, armoured Crushers and
  mines that burst into bullets.
- **4 bosses with bullet patterns:** The Warden, Hive Queen, Eclipse and Iron Titan.
  - Patterns: fan, spiral, ring, aimed bursts and bullet rain.
  - Bosses enrage at 66% and 33% health, fire faster and call in escorts.
  - A siren and **WARNING** screen announce each boss.
  - The music switches to a faster boss track during the fight.
- **Weapons:**
  - 5 gun levels, from a single bolt to a 7-way spread.
  - **Overdrive:** double fire rate plus homing missiles.
  - **Wingmen:** two drones that fly and shoot with you.
  - **Bombs:** clear every bullet and damage everything on screen.
- **Power-ups:** Power Up, Shield, Overdrive, Wingmen, Magnet, Repair and Bomb.
- **Combo system:** every 10 quick kills raises the score multiplier by 0.5. A timer bar shows how long the combo lasts.
- **Juice:**
  - Explosions with fireballs, sparks, shockwave rings and tumbling debris.
  - Hit flashes, hit-stop on big kills, screen shake, slow motion when a boss dies and a warp-speed starfield
    between sectors.
  - Parallax stars, drifting nebulas and planets.
- **Sound:** synthesized SFX (lasers that get brighter with gun level, explosions, power-ups, shield, bomb, siren)
  and a synthwave soundtrack with a boss track. No audio files.
- **Meta:**
  - 6 ships with different stats: four bought with coins, two unlocked by reaching a sector.
  - 6 upgrades: damage, fire rate, hull, magnet, start power and bomb bay.
  - 12 missions and a 7-day daily supply.
  - Best score and best sector.
- **Ads:** an interstitial every N games, plus rewarded ads for revive (once per run), double coins and double
  daily reward. They work through an Android WebView bridge or any web SDK.

## Reskin
1. `js/config.js`:
   - Play feel: fire rate, hull, combo and drop chances.
   - Difficulty curve, power-ups, ships, enemies, bosses (name, health, color, shape, patterns, coins),
     upgrades, missions, economy and the space colors.
2. `js/sprites.js`: ship, enemy and boss shapes.
3. `css/style.css`: UI tokens in `:root` (neon colors, cut-corner size, fonts).
4. `assets/`: optional art and sounds (see `assets/README.md`). Every image has a drawn or emoji fallback.

## Ads
All ad calls go through `js/ads.js`:
- **Android (AdMob):** expose `window.GameAdsBridge.showInterstitial()` / `.showRewarded()` and call back
  `window.onAdClosed()` / `window.onRewardedResult(true|false)`.
- **Web portals:** fill in `webSdk` in `ads.js`. Set `ads.simulate: false` in config for release.

## Testing hooks
- `Game.step(dt)` and `Game.renderNow()` advance and draw frames, even in a hidden tab.
- `Game.state`, `Game.run`, `Game.player`, `Game.enemies`, `Game.bullets` and `Game.boss` can be inspected.
- `Game.bomb()` and `Game.revive()`.
- `UI.play()`, `UI.goHome()`, `UI.showHangar()` and so on.

In testing, a simple dodging bot clears the first sector in about a third of its runs and has reached sector 3.
With upgrades, bombs and power-ups, players go a lot further.

## Files
```
index.html        screens
css/style.css     neon UI
js/config.js      ← reskin here
js/game.js        loop, background, waves, enemies, bosses + patterns, weapons, power-ups, collisions, effects
js/sprites.js     ships, enemies, bosses, bullets, pickups (drawn once into off-screen canvases)
js/ui.js          home, HUD, pause, game over, hangar, upgrades, missions, daily, settings
js/audio.js       synthesized SFX + synthwave music
js/ads.js         ad bridge
```

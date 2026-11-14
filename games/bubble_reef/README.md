# Bubble Reef: HTML5 bubble shooter template

An underwater bubble shooter with a frosted-glass UI. Pop groups of 3+ bubbles, drop whole clusters and free the
fish trapped inside bubbles. Pure HTML/CSS/JS with no build step, no dependencies and no image or sound files.
It plays fully offline and runs on the web or wrapped as an Android APK.

## Run
Serve the folder with any static server (`python3 -m http.server`) or drop it into an HTML-to-APK converter.

## Controls
- **Phones:** touch and drag to aim, release to shoot. Tap the launcher or the NEXT bubble to swap.
- **Desktop:** mouse, or ← → to aim, Space to shoot, S to swap, Esc/P to pause.

## Features
- **60 reef levels** from a seeded generator. Rows, colors, fish, shots and stones grow along a curve you set in
  config. Goal: free every fish. Stars depend on shots left.
- **Endless mode:** no shot limit, a new row slides in every few shots, best score saved.
- **Hex grid** with offset rows, wall bank shots, a dotted aim guide and a ghost ring showing where the bubble lands.
  The guide and the real shot use the same path simulation, so the preview is always right.
- **Pops and drops:** groups of 3+ pop; anything no longer hanging from the surface falls for bonus points.
  A new row drops in after several shots that pop nothing.
- **Specials:** fish bubbles, stone blockers (only removable by dropping or bombs).
- **Boosters (bought with pearls):** Depth Charge (area blast), Prism Pearl (matches any color) and Sonar Aim
  (longer guide for 10 shots).
- **Juice:** soft wobble of neighbours, ring-burst pops, falling bubbles, freed fish swimming to the surface,
  light rays, drifting particles, swaying kelp and coral, shake on blasts, floating text.
- **Sound:** synthesized bloops, pops and sonar, all heard through a "water" low-pass filter, plus an ambient
  chord pad with random bubbling. No audio files.
- **Meta:** winding reef map, level preview sheet, pearl shop, treasure chest every 4 hours, settings.
- **Ads:** interstitial every N games, rewarded ads for +5 shots, clearing 3 rows, double pearls, double chest
  and free pearls.

## Reskin
1. `js/config.js`: bubble colors, play values, level curve, boosters, endless mode, ads.
2. `css/style.css`: glass UI tokens in `:root`.
3. `js/game.js`: `drawSea`, `bubble`, `drawFish`, `drawShooter`.

## Ads
All ad calls go through `js/ads.js` (Android `window.GameAdsBridge` or a web SDK; set `ads.simulate: false` for release).

## Testing hooks
`Game.begin(mode, level)`, `Game.update(dt)`, `Game.draw()`, `Game.aimAt(angle)`, `Game.shoot()`, `Game.trace(angle)`,
`Game.snapCell(x, y)`, `Game.state`, `UI.start(mode, level)`. With a greedy bot (4 runs each): levels 1–25 win
every time, level 45 wins 3 of 4 and level 60 wins 1 of 4.

## Files
```
index.html      screens
css/style.css   glass UI
js/config.js    ← reskin here
js/game.js      hex grid, shot path, match/float logic, fish, boosters, drawing
js/ui.js        home, reef map, shop, chest, sheets, saves
js/audio.js     synthesized underwater SFX + ambience
js/ads.js       ad bridge
```

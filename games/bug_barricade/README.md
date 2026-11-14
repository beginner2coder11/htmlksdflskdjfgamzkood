# Bug Barricade: HTML5 tower defense template

A sketchbook tower defense. Ants, ladybugs, beetles, bees and caterpillars march along a dirt trail to your picnic
basket, and you doodle defenses on graph paper. Lines are drawn as wobbly pencil strokes that "boil" (redraw with
fresh wobble 8 times a second) and fills look like marker. Pure HTML/CSS/JS, no build step, no dependencies, no
image or sound files. Plays fully offline, on the web or as an APK.

## Run
Serve the folder with any static server (`python3 -m http.server`) or drop it into an HTML-to-APK converter.

## Controls
Tap an empty square to build, tap a tower to upgrade or sell. Send each wave when you are ready (Space), or call
it early for bonus coins. 1×/2×/3× speed. Esc/P pauses.

## Features
- **3 maps × 25 waves** (Back Lawn, The Porch, Picnic Park); each map unlocks the next. Stars from sandwiches left.
- **5 towers, 3 levels each:**
  - Squirt Gun (fast bullets, hits flyers)
  - Swatter (area slam, ground only)
  - Honey Pot (slows ground bugs)
  - Sun Lens (beam that heats up on one target and mostly ignores armour)
  - Frog (long-range tongue, huge single hits)
- **6 bugs:** fast ants, ladybugs, armoured beetles, flying bees, caterpillars that split into ants, and a Queen
  Ant boss every 10 waves.
- **Waves:** generated per wave number; every third wave is a themed swarm. HP scales per wave and per map.
- **Juice:** boiling pencil lines, marker blobs, "SMACK!" slams, tongue snaps, sunbeams that glow hotter, water
  splashes, ink splats that fade from the paper, coin popups, banners.
- **Sound:** cartoon foley (squirts, slaps, sizzles, tongue thwip, squishes) and a toy-piano march. No files.
- **Meta:** Bug book that fills in as you meet each bug, best wave per map, settings.
- **Ads:** interstitial every N games, rewarded ads for +5 sandwiches (once per game) and +60 coins.

## Reskin
1. `js/config.js`: start coins and lives, waves per map, towers (cost/range/rate/damage per level), bugs, HP
   growth, maps (paths as grid points), ads.
2. `js/game.js`: `drawBug`, `drawTower`, `drawPaper`, `drawPath` and `waveList(w)`.
3. `css/style.css`: sketch tokens in `:root`.

## Ads
All ad calls go through `js/ads.js` (Android `window.GameAdsBridge` or a web SDK; set `ads.simulate: false` for release).

## Testing hooks
`Game.start(mapIndex)`, `Game.build(type, col, row)`, `Game.upgrade(tower)`, `Game.sendWave()`, `Game.update(dt)`,
`Game.render()`, `Game.towers`, `Game.bugs`, `UI.play(mapIndex)`. A greedy bot that keeps building next to the path
and maxes every tower wins Back Lawn and The Porch with 15/20 lives and Picnic Park with 1 life.

## Files
```
index.html      HUD, dock, cover, maps
css/style.css   sketchbook UI
js/config.js    ← reskin here
js/game.js      path, waves, towers, bugs, sketch renderer
js/ui.js        screens, build/tower popover, bug book, results, saves
js/audio.js     synthesized foley + march
js/ads.js       ad bridge
```

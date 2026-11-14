# Spiral Drop: HTML5 helix-drop template

Spin the tower, drop the ball through the gaps and never touch the striped slices. A bold Memphis design: pastel
blocks, thick black outlines, hard offset shadows, squiggles, dots and confetti shapes. The tower is a pseudo-3D
stack of elliptical ring slices drawn in depth order. Pure HTML/CSS/JS, no build step, no dependencies, no image or
sound files. Plays fully offline, on the web or as an APK.

## Run
Serve the folder with any static server (`python3 -m http.server`) or drop it into an HTML-to-APK converter.

## Controls
Drag left/right anywhere to spin the tower (or ← → / A D). Esc/P pauses.

## Features
- **100 levels** from a seeded generator: floors grow from 12 to 42, gaps shrink from 3 slices to 1, and striped
  danger slices appear from level 2. Danger is never placed right under the gap above, so a fair landing always
  exists.
- **Physics:** gravity with a terminal speed, a fixed bounce height, slice detection under the ball.
- **Fever:** drop 3 floors in a row without bouncing and the ball catches fire; the next floor it touches (even a
  striped one) smashes.
- **Juice:** floors burst into flying slices, squash-and-stretch bounces, paint splats left on every slice you
  bounce on, ball trail, fever glow, score popups, confetti at the finish, a slowly drifting Memphis background.
- **4 palettes** that rotate every 5 levels.
- **6 ball skins** (solid, dots, stripes, half, donut ring, zigzag) unlocked by level.
- **Sound:** rubbery bounces, glassy breaks that climb with the combo, a fever riser and a funky bass + clap loop.
  No audio files.
- **Meta:** progress bar to the next level, best score, level list, settings.
- **Ads:** interstitial every N games, rewarded ad to continue after hitting a stripe (clears the stripes on the
  next 3 floors).

## Reskin
1. `js/config.js`: tower size and tilt, ball physics, spin speed, fever, level curve, palettes, ball skins, ads.
2. `js/game.js`: `drawFloor`, `drawPole`, `drawBall`, `drawDeco`.
3. `css/style.css`: Memphis tokens in `:root`.

## Ads
All ad calls go through `js/ads.js` (Android `window.GameAdsBridge` or a web SDK; set `ads.simulate: false` for release).

## Testing hooks
`Game.start(level, ball)`, `Game.step(dt)`, `Game.render()`, `Game.spin(radians)`, `Game.sliceAtBall()`,
`Game.floors`, `Game.ballY`, `Game.vy`, `UI.play(level)`. A bot that turns the nearest gap under the ball clears
levels 1, 10 and 25 every time; later levels need faster, smarter spinning.

## Files
```
index.html      HUD + home
css/style.css   Memphis UI
js/config.js    ← reskin here
js/game.js      tower generator, ball physics, fever, shards, pseudo-3D renderer
js/ui.js        home, balls, levels, results, saves
js/audio.js     synthesized SFX + funk loop
js/ads.js       ad bridge
```

# Sunset Pinball: HTML5 pinball template

A tropical-sunset pinball table with real flipper physics and an amber dot-matrix display. Striped setting sun,
palm silhouettes, wooden rails, hibiscus pop bumpers and a chrome-trimmed arcade cabinet UI. Pure HTML/CSS/JS,
no build step, no dependencies, no image or sound files. Plays fully offline, on the web or as an APK.

## Run
Serve the folder with any static server (`python3 -m http.server`) or drop it into an HTML-to-APK converter.

## Controls
- **Phones:** hold the left / right half of the screen for each flipper. When the ball is in the lane, hold
  anywhere and release to launch (longer hold = stronger shot).
- **Desktop:** ← / Z / Shift and → / M / ÷ for flippers, Space/↓/Enter to pull the plunger, Esc/P pauses.

## Features
- **Physics:** 10 sub-steps per frame against segments; flippers are capsules with real surface velocity, so
  where the ball hits the flipper decides how hard it flies. One-way lane gate, max speed clamp, ball search.
- **Table:** 3 pop bumpers, 2 slingshots, 4 drop targets, S-U-N rollover lanes, a volcano capture saucer,
  plunger with power meter, inlanes that feed the flippers.
- **Rules:** 3 balls, 8 s ball save, extra balls at score thresholds, bonus × multiplier on drain.
- **5 looping missions** (bumpers, targets, lanes, volcano, slingshots). Each raises the multiplier; every third
  one starts a **two-ball multiball** and pays a jackpot.
- **Dot-matrix display:** text is drawn tiny, sampled pixel by pixel and shown as round amber dots, with
  scrolling and flashing messages.
- **3 tables (themes):** Sunset, Midnight and Lagoon, unlocked by best score.
- **Juice:** bumper flashes and glow, sparks, score popups, screen shake, table flash, ball trail and chrome shading.
- **Sound:** solenoid thunks, bell bumpers, rubber boings, a rolling-ball rumble that follows ball speed and a
  steel-drum + bass groove. No audio files.
- **Meta:** local top-8 high scores, rules page, settings.
- **Ads:** interstitial every N games, rewarded ad for one more ball.

## Reskin
1. `js/config.js`: balls, ball save, extra-ball scores, physics, points, missions, themes (sky, wood, glow, accent).
2. `js/game.js`: table layout at the top (segments, bumpers, targets, saucer, flippers) and the `background` art.
3. `css/style.css`: cabinet tokens in `:root`.

## Ads
All ad calls go through `js/ads.js` (Android `window.GameAdsBridge` or a web SDK; set `ads.simulate: false` for release).

## Testing hooks
`Game.start()`, `Game.step(dt)`, `Game.render()`, `Game.flip("left"|"right", on)`, `Game.pull(on)`, `Game.balls`,
`Game.state`, `Game.score`, `UI.play()`. A random-flipping bot plays full 3-ball games of 1–6 minutes
(29k–204k points) and the ball never leaves the table.

## Files
```
index.html      display, table, title
css/style.css   cabinet UI
js/config.js    ← reskin here
js/game.js      table geometry, physics, rules, missions, drawing
js/ui.js        dot-matrix display, menus, high scores, saves
js/audio.js     synthesized table sounds + groove
js/ads.js       ad bridge
```

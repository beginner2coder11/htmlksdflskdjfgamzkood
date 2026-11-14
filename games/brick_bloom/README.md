# Brick Bloom: HTML5 brick breaker template

A Bauhaus-style brick breaker: flat primary colors, thick ink outlines, hard offset shadows and geometric type.
Pure HTML/CSS/JS with no build step, no dependencies and no image or sound files. It plays fully offline and
runs on the web or wrapped as an Android APK.

## Run
Serve the folder with any static server (`python3 -m http.server`) or drop it into an HTML-to-APK converter.

## Controls
- **Phones:** drag anywhere to move the paddle, tap to launch.
- **Desktop:** mouse, or arrow keys / A-D. Space launches. Esc or P pauses.

## Features
- **60 levels:** 12 hand-made maps plus 48 generated ones (mirror, checker, stripes, diamond, frames, wedge).
  A flood-fill check opens any brick that steel would seal in, so every level can be finished.
- **Bricks:** 1–3 hit bricks (red / yellow / blue), steel, bombs that blast their neighbours, power bricks.
- **8 power-ups:** Wide, Multi Ball, Lasers, Slow, Fireball (pierces bricks), Catch, Extra Life and a bad Shrink.
- **Stars:** 3 for a no-miss run under par time, 2 for one miss, 1 otherwise.
- **Juice:** squash-and-stretch bricks and paddle, confetti in circles/squares/triangles, shock rings, screen shake,
  hit-stop on bombs, combo text and a slowly moving Bauhaus background composition.
- **Sound:** marimba-style synthesized SFX. Each brick in a combo plays the next note of a pentatonic scale,
  over a generative marimba loop. No audio files.
- **Meta:** coins, 6 paddle skins and 4 ball skins (bought with coins or unlocked with stars), level select with
  stars, 7-day daily gift, settings, best score.
- **Ads:** interstitial every N cleared levels, rewarded ads for an extra ball, double coins and double gift.

## Reskin
1. `js/config.js`: palette, play feel, power-ups, paddles, balls, level maps, number of generated levels, ads.
2. `css/style.css`: UI tokens in `:root`.
3. `js/game.js`: drawing functions (`drawBrick`, `drawPaddle`, `drawBackground`).

## Ads
All ad calls go through `js/ads.js`:
- **Android (AdMob):** expose `window.GameAdsBridge.showInterstitial()` / `.showRewarded()` and call back
  `window.onAdClosed()` / `window.onRewardedResult(true|false)`.
- **Web portals:** fill in `webSdk` in `ads.js`. Set `ads.simulate: false` in config for release.

## Testing hooks
`Game.step(dt)`, `Game.renderNow()`, `Game.aim(x)`, `Game.launch()`, `Game.state`, `Game.bricks`, `Game.balls`,
`UI.play(level)`. A simple paddle-follows-ball bot clears levels 1, 5, 9, 12, 20, 33 and 40 without losing a ball.

## Files
```
index.html      screens
css/style.css   Bauhaus UI
js/config.js    ← reskin here
js/game.js      physics, levels + generator, power-ups, effects, drawing
js/ui.js        home, levels, shop, daily gift, settings, modals, saves
js/audio.js     synthesized marimba SFX + music
js/ads.js       ad bridge
```

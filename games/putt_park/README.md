# Putt Park: HTML5 mini golf template

Storybook mini golf painted in watercolor: cream paper grain, layered translucent pigment washes, brown ink outlines
and italic old-style type. Each hole is painted once to an offscreen canvas; the ball, flag, mushrooms and moving
gates draw live. Pure HTML/CSS/JS, no build step, no dependencies, no image or sound files. Plays fully offline.

## Run
Serve the folder with any static server (`python3 -m http.server`) or drop it into an HTML-to-APK converter.

## Controls
Drag back from anywhere and let go. The dotted arrow shows direction and strength; a power bar fills at the bottom.

## Features
- **12 hand-made holes** in 2 chapters (The Meadow, Seaside Cliffs). Holes are plain data in `config.js`:
  wall polygons, inner walls, sand (high friction), water (+1 stroke, back to the last spot), slopes (constant
  push), mushroom bumpers and moving wooden gates.
- **Cup physics:** a gentle pull near the cup, sink only below a speed limit, lip-outs when you hit it too hard.
- **Scoring:** par per hole, hole-in-one / eagle / birdie labels, an 8-stroke pick-up, stars per hole
  (under par = 3, par = 2, par+1 = 1), a scorecard after every hole and best totals per chapter.
- **Ball colours** unlocked by stars.
- **Juice:** waving flag, petal confetti for birdies, splash droplets, bouncing mushrooms, hole ribbons, page-turn
  modals.
- **Sound:** putter tock, wall taps, cup rattle, splash, sand hiss, birdsong and a music-box waltz. No audio files.
- **Ads:** interstitial every N rounds, rewarded ad to replay a hole you didn't 3-star.

## Reskin
`js/config.js` (physics, holes, chapters, colours, balls, ads), `js/game.js` → `painted()` for the art,
`css/style.css` tokens in `:root`.

## Ads
All ad calls go through `js/ads.js` (Android `window.GameAdsBridge` or a web SDK; set `ads.simulate: false` for release).

## Testing hooks
`Game.playCourse(i)`, `Game.shoot(angle, power)`, `Game.update(dt)`, `Game.render()`, `Game.nextHole()`,
`Game.ball`, `Game.hole`, `Game.strokes`, `UI.play(i)`. A simple aim-at-the-cup bot finishes every hole.

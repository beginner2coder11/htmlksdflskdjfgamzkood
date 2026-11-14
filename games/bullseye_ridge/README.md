# Bullseye Ridge: HTML5 archery template

A calm, minimal archery game in the mountains, in a Scandinavian style: muted sage and oat, hairline rules, light
type and lots of air. Read the wind, draw the bow, and the camera follows the arrow with slow motion near the
target. Pure HTML/CSS/JS, no build step, no dependencies, no image or sound files. Plays fully offline, on the web
or as an APK.

## Run
Serve the folder with any static server (`python3 -m http.server`) or drop it into an HTML-to-APK converter.

## Controls
Touch anywhere and drag back (like a slingshot) to aim and set power; let go to shoot. A short dotted guide shows
the start of the arc (no wind). Your aim sways gently with breathing, and more once your arms tire after 2.5 s.

## Features
- **30 stages** across 3 seasons (summer meadow, autumn fjord, winter peaks). 5 arrows per stage, a pass mark out
  of 50 and stars for high scores. Distance grows from 22 m to 92 m, wind up to 7 m/s, the target gets smaller and
  starts to bob from stage 8.
- **Wind trial:** endless; each hit moves the target further back and the wind gets wilder. One miss ends it.
- **Physics:** gravity plus wind force, sub-stepped flight, ring scoring 1–10 with streaks of bullseyes,
  balloons for bonus points.
- **Camera:** pans to the target before each shot, follows the arrow, slows time and zooms near the target, then
  holds on the hit while the arrow quivers.
- **5 bows** with power, steadiness and guide length, bought with coins.
- **Landscape:** 4 parallax ridges with pine silhouettes and soft mist, distance marks, falling leaves or snow by
  season.
- **Sound:** bow creak while drawing, string twang, arrow whistle, wooden thunk, looping wind that follows the wind
  speed, and a sparse kalimba melody. No audio files.
- **Ads:** interstitial every N stages, rewarded ad for two extra arrows after a failed stage.

## Reskin
1. `js/config.js`: physics, arrows per stage, the stage curve, bows, seasons (sky, ridge, ground and mist colors),
   coins, ads.
2. `js/game.js`: `drawWorld`, `drawTarget`, `drawArcher`, `drawArrowAt`.
3. `css/style.css`: tokens in `:root`.

## Ads
All ad calls go through `js/ads.js` (Android `window.GameAdsBridge` or a web SDK; set `ads.simulate: false` for release).

## Testing hooks
`Game.begin(mode, stage, bow)`, `Game.update(dt)`, `Game.render()`, `Game.shoot(angle, power)`, `Game.target`,
`Game.wind`, `Game.shots`, `UI.play("stage", n)`. A bot that solves the exact angle (but cannot time the sway or
lead a moving target) scores 49–50 on stage 1, 35–38 on stage 15 and 17–27 on stage 30.

## Files
```
index.html      HUD + menu
css/style.css   minimal UI
js/config.js    ← reskin here
js/game.js      aiming, flight, camera, scoring, landscape
js/ui.js        menu, stages, bows, results, saves
js/audio.js     synthesized nature sounds + kalimba
js/ads.js       ad bridge
```

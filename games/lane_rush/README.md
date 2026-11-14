# Lane Rush: HTML5 traffic racer template

A top-down endless traffic racer in a soft "clay toy" style: puffy pastel cars with soft shadows, round clay trees
and houses, and chunky rounded type. Weave through traffic, chain near misses, fill the nitro ring and boost.
Pure HTML/CSS/JS, no build step, no dependencies, no image or sound files. Plays fully offline, on the web or as an APK.

## Run
Serve the folder with any static server (`python3 -m http.server`) or drop it into an HTML-to-APK converter.

## Controls
- **Phones:** drag anywhere to steer (relative drag, so your finger never hides the car). Hold ⚡ to boost.
- **Desktop:** ← → / A D to steer, Space/↑ to boost, Esc/P to pause.

## Features
- **Two modes:** Endless (4 lanes, one direction) and Two-Way (oncoming traffic in the left lanes, worth double
  near-miss points).
- **Traffic:** hatchbacks, sedans, vans, trucks and buses at different speeds. Some signal with blinkers and then
  change lanes. Spawning always keeps two lanes open, so the road is never walled off.
- **Near misses:** passing a car by less than 14 units scores, builds a combo and fills the nitro meter.
- **Nitro:** 1.45× speed while held; the ring shows the tank.
- **Pickups:** Bumper Shield (smash through cars), Coin Magnet, Nitro Can. Coin lines, some curved.
- **4 areas** that blend into each other every 1,500 m: Suburbs, Desert, Snowfield and Night City, each with its own
  roadside decorations.
- **Garage:** 6 cars with grip, top speed and nitro-tank stats, shown on a spinning turntable.
- **Missions:** 3 active missions from a pool of 5, with rising tiers and coin rewards.
- **Juice:** countdown, speed streaks, exhaust flames, crash slow motion with clay debris, smash spins, shake,
  combo and area banners.
- **Sound:** an engine drone that follows speed and boost, near-miss whooshes, honks, coin pings, crash crunch and
  a lo-fi electric-piano loop. No audio files.
- **Meta:** best score and farthest distance per mode, settings. The road keeps driving behind the garage.
- **Ads:** interstitial every N runs, rewarded ads to keep driving after a crash and for double coins.

## Reskin
1. `js/config.js`: road, driving feel, areas (colors + decorations), traffic, colors, pickups, cars, missions, ads.
2. `js/game.js`: `drawCar`, `drawDeco`, `clay`, `blob`.
3. `css/style.css`: clay UI tokens in `:root`.

## Ads
All ad calls go through `js/ads.js` (Android `window.GameAdsBridge` or a web SDK; set `ads.simulate: false` for release).

## Testing hooks
`Game.start(mode, car)`, `Game.step(dt)`, `Game.render()`, `Game.steer(x)`, `Game.setNitro(on)`, `Game.traffic`,
`Game.metres`, `UI.drive()`. A simple lane-picking bot drives 570–3,900 m (30 s – 2 min) before crashing.

## Files
```
index.html      HUD + garage
css/style.css   clay UI
js/config.js    ← reskin here
js/game.js      road, traffic, near misses, nitro, pickups, areas, clay renderer
js/ui.js        garage, modes, missions, records, sheets, saves
js/audio.js     engine + synthesized SFX + lo-fi loop
js/ads.js       ad bridge
```

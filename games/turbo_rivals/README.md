# Turbo Rivals: arcade street racing template

Arcade street racing against four rival cars. Hold to drive, slide your finger to steer, fill the nitro bar by
drafting, overtaking and hitting boost pads, then fire it. Ramps launch you into the air, while cones and oil
slicks slow you down. Finish in the top 3 to unlock the next race. It uses a classic pseudo-3D road engine with
curves, hills and fog, and draws everything in code: no build step, no dependencies and no image or sound
files. It plays fully offline.

## Controls
- **Phone:** hold anywhere to accelerate and slide left or right to steer. Let go to coast. Tap NOS for nitro
  when the ring is full.
- **Keyboard:** ↑ (or W) to accelerate, ← → to steer, Space for nitro, P/Esc to pause.

## Features
- **30 races in 3 venues:**
  - Harbor Docks: container stacks, cranes, and overhead gantries with hanging containers.
  - Canyon Run: mesas, cacti and billboards.
  - Neon City: a night skyline, neon signs and glowing street lamps.
  - Each venue ends with a longer final race. Tracks are seeded from the level, and later races are twistier,
    hillier and more crowded.
- **Rival AI:** each rival has a racing line, steers around cones, oil and other cars, and rubber-bands gently.
  Floating 1ST / 2ND / 3RD badges show the live order.
- **Driving model:**
  - Grip limits steering, and corners push you outward.
  - Off-road slows you down, and you can bump and draft rivals.
  - Boost pads, ramps (jumps with a landing thud and sparks), cones and oil slicks.
- **Nitro:** fills from drafting, overtakes, boost pads and air time. Firing it gives exhaust flames, speed
  lines and stronger acceleration.
- **Garage:** 6 cars with different top speed, acceleration, grip and nitro, 10 paint colours, and 4 upgrades
  per car (engine, turbo, tyres and nitro tank, 5 levels each).
- **Juice:** start lights, a position HUD in gold/silver/bronze, a progress bar with a dot for every car, a
  speedometer, tyre smoke in hard corners, a podium results screen and confetti.
- **Sound:** a synthesized engine that revs through the gears, tyre squeal, nitro roar, bumps and a driving
  synth loop.
- **Ads and retention:** double coins (rewarded), an interstitial every 3 races (`js/ads.js` uses the
  `GameAdsBridge` contract), a 7-day daily gift and coins for each overtake.

## Difficulty audit
Rivals are tuned against a fixed 210 km/h reference car, so better cars and upgrades really matter. Results
from the built-in bot (which also races on the title screen), by position:
- Starter car with no upgrades: podiums up to about race 14, then the rivals pull away.
- Volt GT with mid upgrades, or a maxed Phantom: wins all 30.

```js
window.__audit = []; Game.setCar("zip", null, {}); Game.start(i, { bot: true });
while (!Game.finished) Game.simulate(1/60, 1);   // window.__audit → { lvl, place, t }
```

## Reskin
- **Name, logo and UI colours:** `title`, `titleLines` (one entry per logo line) and `theme` (the CSS variables
  from `css/style.css`) in `js/config.js`. `js/skin.js` applies them when the game starts.
- `js/config.js`: venues (colours, props, gantries, night), the level formula (length, rival speed, curves,
  hills, hazards), rival names and colours, cars, paints, upgrade prices, rewards, daily gift, ads and the
  storage prefix (`tr_`).
- `js/game.js`: `build()` makes the track, `drawProp()` draws the scenery, `carArt()` the cars and
  `background()` the skyline.

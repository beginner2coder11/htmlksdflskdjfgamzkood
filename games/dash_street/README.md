# Dash Street: timed 3-lane runner template (levels and stars)

You're a courier dog racing the clock down the street. Swipe to change lanes, jump traffic cones, slide under
"DUCK!" banners, steer round "LANE CLOSED" barriers, parked cars and oncoming cars, run up ramps onto flatbed
trucks, hit dash pads, avoid puddles, and grab bones and golden parcels. Reach the finish flag before the
stopwatch runs out. Bumping into things never ends the run: it slows you down while the clock keeps ticking.
Every 6th level is a chase after a runaway delivery truck. Everything is drawn in code, with no build step,
no dependencies and no image or sound files, and it plays fully offline.

## Controls
Swipe ← → to change lanes, ↑ (or tap) to jump and ↓ to slide. Swiping down in the air drops you fast. On a
keyboard, use the arrows or WASD and Space. P/Esc pauses.

## Features
- **36 levels over 3 streets:** Maple Street (houses, picket fences, mailboxes), Harbor Road (sea, boats,
  cranes, containers) and Downtown (tower blocks, crosswalks). Pace and density rise level by level, and each
  course is seeded so it's the same every time.
- **3 stars per level:** ★ finish in time, ★★ collect the bone target, and ★★★ a rotating challenge: finish
  with time to spare, no bumps, or all 3 golden parcels (which sit over cones, so you have to jump for them).
- **Truck chases (levels 6, 12, 18, 24, 30 and 36):** close the gap before time runs out. Dash pads pull you
  closer, every bump lets the truck pull away, and the truck throws boxes for you to hop. The HUD shows how far
  away it is.
- **Dash pads, puddles and moving cars.** Power-ups: Bone Magnet, Double Bones, Turbo Paws and Bubble Shield
  (the timed ones upgrade in 5 steps).
- **6 dogs with perks:** Corgi, Shiba (+10% bones), Dalmatian (longer power-ups), Pug (recovers from bumps
  faster), Husky (starts with a shield) and Poodle (stronger dash pads). Each wears a helmet and courier bag,
  with a back-view run cycle that shows toe beans as the paws kick up.
- **Juice:** a 3-2-1-GO countdown, a stopwatch that pulses red in the last seconds, a progress bar, live goal
  chips, a checkered finish arch, confetti, star pops, speed lines on dash, and screen shake on bumps.
- **Ads and retention:** double bones (rewarded), an interstitial every 3 finished levels (`js/ads.js` uses
  the `GameAdsBridge` contract), a 7-day daily gift, and bonus bones for each new star.

## Level audit
Each level is checked with the built-in bot, which also runs behind the title screen. All 36 are won with
time to spare (normal levels: 7–15 s left; truck chases: 6–21 s left):
```js
window.__audit = []; Game.start(i, { bot: true });
while (!Game.run.done) Game.simulate(1/60, 1);
window.__audit   // { lvl, won, stars, left, bumps, bones, parcels }
```

## Reskin
- **Name, logo and UI colours:** `title`, `titleLines` (one entry per logo line) and `theme` (the CSS variables
  from `css/style.css`) in `js/config.js`. `js/skin.js` applies them when the game starts.
- `js/config.js`: streets (colours plus scenery style), the level formula (speed, length, clock, goals, truck
  gap), dash and bump tuning, dogs, power-ups, upgrade prices, daily gift, ads and the storage prefix (`ds_`).
- `js/game.js`: `genRow()` builds the course patterns, `prop()` draws the scenery, `dogArt()` the dogs and
  `drawObs()` the obstacles.

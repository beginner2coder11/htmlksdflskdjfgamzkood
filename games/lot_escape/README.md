# Lot Escape: parking-jam puzzle template

Cars are packed into a parking lot. Tap a car to drive it forward, or swipe along it to choose forward or
reverse. A car with a clear lane drives out, turns onto the ring road, follows it round to the exit gate (the
barrier lifts) and earns a coin. A blocked car drives up to whatever is in the way, crashes ("HONK!"),
backs into its space again, and costs a heart. Clear the whole lot. Everything (cars, lot, road, trees,
sound) is made in code, with no build step, no dependencies and no image or sound files. It plays fully
offline.

## Controls
- **Tap** a car to drive it forward. The windscreen and headlights show the front.
- **Swipe** along a car: towards its front sends it forward, towards its back reverses it out.
- P or Esc pauses.

## Features
- **120 levels** (every 10th is HARD: a bigger lot, a deeper jam, one heart less, double coins). Lots grow
  from 4×5 to 9×12 spaces, with cars, buses and trucks (3 spaces long), traffic cones and fence pieces that
  block parts of the lot edge.
- **Always solvable, never a dead end:** each car is placed only where it has a clear way out past the cars
  already on the lot (the ones that leave after it), so the reverse of the placement order always works. The
  generator prefers spots that cut off other cars' lanes, which builds chains of "these must go first", and
  keeps the deepest of several attempts. Some cars face their blocked way, so tapping without looking
  crashes. Removing a car never blocks another, so the player can't paint themselves into a corner.
- **8 car models drawn in code (top-down):** sedan, hatchback, sports car (stripes and spoiler), pickup (with
  cargo), van, taxi (roof sign and checker stripe), bus and truck, in 10 paints. Each has glass, roof, lights,
  wheels, mirrors and a soft shadow, and reverse lights show when it backs up.
- **Driving:** cars accelerate out of the lot, turn smoothly onto the ring road (smoothed paths) and take the
  shorter way round to the gate. A reversing car turns round once it's on the road. Exhaust puffs, skid marks
  on crashes, "!" bubbles on both cars, a lifting gate barrier and "+1" coins.
- **Stars:** 3 for no crashes, 2 for one, 1 otherwise.
- **6 lot themes** in the shop: Sunny Day, Autumn, Snowy, Beach, City Night and Neon (night themes have
  headlight beams and lamp-post glow).
- **Boosters:** Hint (shows a car that can leave and which way) and Crane (lifts any car out).
- **Ads and retention:** "+2 hearts" (rewarded) when you run out, double coins on a win, free boosters for an
  ad, an interstitial every 3 wins (`js/ads.js` uses the `GameAdsBridge` contract), and a 7-day daily gift.
- **Sound (js/audio.js):** engine revs, reverse beeps, crash thud and two-tone horn, gate chime, crane winch
  and a bouncy loop, with separate sound and music toggles.

## Level audit
- Every level's stored solution is replayed through the real game: 120 / 120 cleared with no crashes.
- A careless player who taps random cars and never swipes crashes on almost every level, so reading which way
  each car faces really matters.

```js
UI.play(n);
for (const [id, dir] of Game.level.order) { /* wait until the previous car is moving, then */ Game.drive(Game.cars[id], dir); }
```

## Reskin
- **Name, logo and UI colours:** `title`, `titleLines` (one entry per logo line) and `theme` (the CSS variables
  from `css/style.css`) in `js/config.js`. `js/skin.js` applies them when the game starts.
- `js/config.js` also holds the car paints and models, the level count, seed and difficulty curve (lot size,
  fill, depth, long vehicles, cones, fences, how often cars face the blocked way), hearts, driving speeds,
  booster prices, coins, the lot themes, the daily gift, ads and the storage prefix (`le_`).
- `js/game.js` → `bakeCar` draws every car model; `bake` draws the grass, road, lot, fences, cones, trees,
  lamps and gate booth.

## Testing hooks
`Game.start(n)`, `Game.drive(car, dir)` (dir 0 right, 1 down, 2 left, 3 up), `Game.lift(car)`,
`Game.showHint()`, `Game.step(dt, n)`, `Game.level` (with `order`, the stored solution), `Game.cars`,
`Game.hearts`, `Game.grid()`, `Levels.lane(level, grid, car, dir)`, `Levels.canLeave(level, grid, car)`,
`UI.levels()`, `UI.shop(tab)`, `UI.gift()` and `UI.state` (the save).

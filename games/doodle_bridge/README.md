# Doodle Bridge: draw-to-cross physics puzzle template

In this game you draw lines with your finger, and each one drops into the level as a real physics plank. Press
GO and a kid in a beanie walks right. Get them to the GOAL flag. If you use less ink, you earn more stars. The
art is clean and outlined, like a sticker book, with cliff pillars over a city skyline. There is no build step,
no dependencies and no image or sound files, and it plays fully offline.

## Controls
- Draw anywhere with your finger or mouse.
- **GO** starts the kid walking, and after a run the same button becomes **Retry**, which keeps your lines.
- **Undo** and **Clear** remove lines. **Hint** shows a dashed line that works (for a rewarded ad or 40 coins).
- Keyboard: Space/Enter is GO, Z or Backspace is undo, R is retry.

## Features
- **Physics engine written from scratch:** Verlet points at 240 Hz. A drawn line keeps its shape through 2D
  shape matching, so it acts like a stiff plank that can still tip, slide and fall. Planks have static
  friction, collide with each other, and react to the kid's weight. Boulders roll and can be pushed, and the
  kid walks along whatever surface they stand on.
- **24 handmade levels in 3 worlds** (Sunny City, Sunset Bay, Night Lights), with gaps, slopes, walls,
  ceilings, spike pits, springs, boulders, no-drawing zones, and two "no ink needed" puzzles.
- **Drawing rules:** you can't draw inside rock, no-draw zones, the kid or boulders, and a stroke splits around
  them. The ink meter shows the 3★ and 2★ marks as you draw.
- **Progression:** stars open the worlds (12 and 30 stars). Coins come from first clears and star upgrades, and
  you spend them on 7 outfits and 7 pens.
- **Juice:** confetti, bouncing stars, a waving goal flag, a pencil scratch sound while drawing, a "tok" when a
  plank lands, and a soft marimba loop.
- **Ads (js/ads.js):** rewarded hints, double coins on a win, and an interstitial every 3 wins. Uses the same
  `GameAdsBridge` contract as the other templates.

## Reskin
- **Name, logo and UI colours:** `title`, `titleLines` (one entry per logo line) and `theme` (the CSS variables
  from `css/style.css`) in `js/config.js`. `js/skin.js` applies them when the game starts.
- `js/config.js` also holds the worlds' colours, the kid's outfits, the pens, coins, daily gifts, ads and the
  storage prefix (`db_`).

## Level format (js/config.js)
`P(x0, x1, top)` is a pillar, `S(x, y, w, h)` is a solid block, `spikes: [x0, x1, y]`, `springs: [x, y]`,
`boulders: [x, y, r]` and `zones: [x, y, w, h]` (no drawing). Each level also has `start`, `goal`, `ink`,
`stars: [ink for 3★, ink for 2★]` and `sol`, a working solution that is also used for the Hint. The world is
600 × 900 and only the region from y 250 to 910 is shown.

## Testing
Every level is checked by playing its `sol` through the real physics, and all 24 win. Only the two
no-ink puzzles can be won without drawing.
```js
UI.startLevel(i); GAME_CONFIG.levels[i].sol.forEach(s => Game.addStroke(s)); Game.go();
while (Game.mode === "run") Game.step(1/60);   // ends as "win" or "fail"
```
Other hooks: `Game.toScreen(x, y)`, `Game.kid`, `Game.strokes`, `Game.boulders`, `Game.hint(sec)`,
`UI.levels()` and `UI.style()`.

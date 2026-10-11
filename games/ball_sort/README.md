# Ball Sort: HTML5 Ball Sort + Water Sort template

Two puzzle games in one. Sort colored balls (or pour colored liquids) until every tube holds a single color.
It ships with **500 solver-verified levels** and plays **fully offline**. Pure HTML/CSS/JS with no build step and no
dependencies. It runs on the web or wrapped as an Android APK.

## Run
Serve the folder with any static server (for example `python3 -m http.server`), or drop it into an HTML-to-APK converter.

## Controls
- **Play:** tap a tube to pick up its top ball (or lift it to pour), then tap the target tube.
  Only the same color or an empty tube is allowed.
- **Keyboard:** 1–9 / 0 select tubes, Ctrl/Cmd+Z undoes, Esc pauses.

## Features
- **Two modes, one switch on the home screen:**
  - **Ball Sort:** balls lift, fly along an arc and land with a squash.
  - **Water Sort:** the tube flies over, tilts and pours a stream, with level liquid surfaces and bubbles.
- **500 levels** (`js/levels.js`). Every layout is generated with a fixed seed and **proven solvable** by the built-in
  A* solver; its solution length sets the 3-star par. Each mode gets its own colors for the same layout, and after
  level 500 the list loops with fresh colors.
  - **Difficulty curve:** 2 colors to 12 colors.
  - **HARD** every 10th level (one extra color, deepest of 8 deals).
  - **MYSTERY** levels: only the top ball is visible; the rest reveal as you dig.
- **Helpers:**
  - **Undo:** 5 free per level, +5 for a rewarded ad.
  - **+Tube:** coins or ad; caps the level at 2★.
  - **Hint:** the solver shows the next move with an animated arrow (coins or ad).
  - **Restart.**
  - A "No moves!" rescue dialog appears when you're stuck.
- **Juice:** cork pops into finished tubes with sparkles and rings, praise combos (Nice! → Brilliant!), win hop wave,
  stars popping in, confetti, synthesized SFX (pitched ball clacks, glugs, chimes) and a marimba music loop.
- **Tutorial:** levels 1–2 of each mode show a hand and hint arrow.
- **Meta:**
  - Level map with chapters and stars.
  - Daily challenge with a streak (mystery puzzles on weekends).
  - Level chest every 5 levels.
  - 14 missions and a 7-day daily gift.
- **Shop:**
  - 8 ball skins: Glossy, Smiley, Candy, Pool, Shapes (color-blind friendly), Gems, Neon, Fruits.
  - 5 tube styles.
  - 6 animated backgrounds.
- **Home screen:** a live demo board solves itself behind the menu.
- **Ads:** interstitial every N levels and rewarded ads (undo, +tube, hint, x2 coins, daily gift x2), via an
  Android WebView bridge or any web SDK.

## Reskin
1. `js/config.js`:
   - 12-color palette, modes (`moveAll` for multi-ball moves), rules (undo count, costs, star slack).
   - Chapters, skins and themes with prices, missions, economy.
2. `js/skins.js`: ball painters, tube painters, cork.
3. `css/style.css`: UI tokens in `:root`.
4. `assets/`: optional art (see `assets/README.md`).

## Levels
```
node tools/build_levels.js [count=500] [seedBase=7331]
```
This regenerates `js/levels.js`. Every level is solved and the solution is replayed before it is written. Change
`seedBase` for a completely new set (handy for selling several distinct reskins), or edit the curve in
`Engine.spec()` (`js/engine.js`). The first level is pinned as a tutorial in `PINNED`.

## Ads
All ad calls go through `js/ads.js`:
- **Android (AdMob):** expose `window.GameAdsBridge.showInterstitial()` / `.showRewarded()` and call back
  `window.onAdClosed()` / `window.onRewardedResult(true|false)`.
- **Web portals:** fill in `webSdk` in `ads.js`. Set `ads.simulate: false` in config for release.

## Testing hooks
- `Board.tap(i)`, `Board.colors`, `Board.won`.
- `Board.step(dt)` / `Board.renderNow()` advance and draw frames, for when a hidden tab pauses requestAnimationFrame.
- `Engine` runs in Node: `require("./js/engine.js")`.

## Files
```
index.html         screens
css/style.css      UI visuals
js/config.js       ← reskin here
js/engine.js       rules, seeded generator, A* solver (browser + Node)
js/levels.js       500 generated levels (tools/build_levels.js)
js/board.js        playfield: state, ball flights, water pours, corks, input, demo
js/skins.js        balls, tubes, cork, shop previews
js/ui.js           home, level map, HUD + helpers, win/chest, daily challenge, shop, missions, gift
js/fx.js · audio.js · ads.js
fonts/             bundled Lilita One + Fredoka (OFL, offline)
tools/             build_levels.js
```

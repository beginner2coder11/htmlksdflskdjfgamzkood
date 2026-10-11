# Block Burst — HTML5 block puzzle template

Drag blocks onto an 8×8 board, clear rows and columns, chain combos, and play through 100
Adventure levels. Pure HTML/CSS/JS with no build step and no dependencies. It runs offline,
on the web or wrapped as an Android APK.

## Run
Serve the folder with any static server (for example `python3 -m http.server`), or drop it into an HTML-to-APK converter.

## Features
- **Classic mode:** endless play with auto-save and resume, and a best score.
- **Adventure mode:** 100 generated levels on a scrolling map across 5 worlds.
  - Gem-collect and target-score goals.
  - 1–3 stars based on moves, and boss nodes every 5 levels.
  - Mirrored hand-made-looking layouts.
- **Fair piece generator:** it prefers trays where all 3 pieces can be placed, eases off as the board fills,
  and sometimes deals a piece that completes a line.
- **Drag and drop:** the piece lifts above your finger, a ghost preview shows where it lands, and lines that
  would clear light up before you drop.
- **Juice:**
  - Cascading block shatter and light beams when lines clear.
  - Praise words (Good! / Great! / Excellent! / Amazing! / Unbelievable!).
  - Combo badge, rainbow board glow during a combo, and screen shake.
  - "PERFECT!" all-clear bonus, confetti, and gems that fly to the goal counter.
- **Power-ups:** Rotate, Bomb (3×3), New pieces and Undo. Each can be refilled with coins or a rewarded ad.
- **Skins shop:** 4 code-drawn block styles (Classic, Jelly, Gem, Neon), plus an optional image skin.
- **Economy:** coins, a 7-day daily gift streak, and a revive offer (bomb + fresh pieces) on game over.
- **Tutorial:** an animated hand on the first game.
- **Audio:** synthesized SFX and music loop (no audio files needed). Haptics on mobile.
- **Ads:** interstitial every N games and rewarded ads, via an Android WebView bridge or any web SDK.

## Reskin
1. `js/config.js`: title, block colors, skins and prices, scoring, praise words, economy, levels.
2. `css/style.css`: UI colors in `:root`.
3. `assets/`: optional art (see `assets/README.md`). Every missing image has a built-in fallback.

## Ads
All ad calls go through `js/ads.js`:
- **Android (AdMob):** expose `window.GameAdsBridge.showInterstitial()` / `.showRewarded()` and call back
  `window.onAdClosed()` / `window.onRewardedResult(true|false)`.
- **Web portals:** fill in `webSdk` in `ads.js`. Set `ads.simulate: false` in config for release.

## Files
```
index.html       screens
css/style.css    all UI visuals (tokens at top)
js/config.js     ← reskin here
js/engine.js     rules: shapes, placement, lines, fair generator, level generator
js/skins.js      code-drawn block skins + gem
js/play.js       canvas board: rendering, drag & drop, clears, combos, power-up targeting
js/ui.js         screens, adventure map, HUD, modals, shop, daily gift, tutorial
js/fx.js         particles + floating text + fly-to-HUD
js/audio.js      synthesized SFX/music or your files
js/ads.js        ad network adapter
fonts/           bundled Lilita One + Fredoka (OFL, offline)
assets/          optional art
```

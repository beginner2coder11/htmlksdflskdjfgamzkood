# Stack Tower — HTML5 stacking game template

Tap to drop each sliding slab. Overhangs slice off and tumble away, and perfect drops snap, ripple and
grow the tower back. Climb from a sunset sky into deep space. Pure HTML/CSS/JS with no build step and
no dependencies. It runs offline, on the web or wrapped as an Android APK.

## Run
Serve the folder with any static server (for example `python3 -m http.server`), or drop it into an HTML-to-APK converter.

## Features
- **Isometric 3D tower** drawn on canvas. Slicing uses real overlap math, and cut pieces fall with physics.
- **Perfect drops:** a white ripple and a rising musical note that climbs a scale with your streak.
  A 4+ streak grows the block back.
- **World that changes with height:**
  - The sky shifts from sunset to pink dusk, lavender, day, stratosphere and then space.
  - Clouds drift in parallax and stars fade in up high.
- **Juice:** sparkles, a "PERFECT x5" streak badge, milestone banners and confetti every 25 floors,
  a "NEW BEST" marker line on the tower, and a zoom-out view of the whole tower when it falls.
- **Coins** ride on some blocks: +1 when you land the block, +2 if it's a perfect drop.
- **Power-ups:** Slow-Mo (half speed for 6 blocks, music slows too), Widen (restore full size) and
  Shield (forgives one bad drop). Each can be refilled with coins or a rewarded ad.
- **Retention:** 12 missions with a claim flow, 5 tower themes in a shop, a 7-day daily gift,
  revive with an ad, and double coins with an ad.
- **Home screen:** a live auto-building demo tower plays behind the menu.
- **Audio:** synthesized SFX and a lo-fi music loop (no audio files needed). Haptics on mobile.
- **Ads:** interstitial every N games and rewarded ads, via an Android WebView bridge or any web SDK.

## Reskin
1. `js/config.js`: tower feel (speed, tolerance, growth), sky colors, themes and prices, power-ups,
   missions, economy.
2. `css/style.css`: UI colors in `:root`.
3. `assets/`: optional art (see `assets/README.md`). Everything has a built-in fallback.

## Ads
All ad calls go through `js/ads.js`:
- **Android (AdMob):** expose `window.GameAdsBridge.showInterstitial()` / `.showRewarded()` and call back
  `window.onAdClosed()` / `window.onRewardedResult(true|false)`.
- **Web portals:** fill in `webSdk` in `ads.js`. Set `ads.simulate: false` in config for release.

## Testing hooks
`Tower.step(dt)` advances the simulation and `Tower.renderNow()` draws one frame. Use them for bots,
automated tests or screenshots while the tab is in the background.

## Files
```
index.html       screens
css/style.css    UI visuals (tokens at top)
js/config.js     ← reskin here
js/tower.js      isometric engine: sliding, slicing, debris, camera, sky, rendering
js/themes.js     tower color themes + shop previews
js/ui.js         home, HUD, missions, shop, daily gift, power-ups, game over
js/fx.js         particles + floating text + fly-to-HUD
js/audio.js      synthesized SFX/music or your files
js/ads.js        ad network adapter
fonts/           bundled Lilita One + Fredoka (OFL, offline)
assets/          optional art
```

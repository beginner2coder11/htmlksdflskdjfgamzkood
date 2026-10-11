# Snake Arena — HTML5 .io-style snake template

Eat glowing pellets, grow, and trap rival snakes into crashing into you. It plays **fully offline**:
the 22 rivals are AI bots with personalities. Pure HTML/CSS/JS with no build step and no dependencies.
It runs on the web or wrapped as an Android APK.

## Run
Serve the folder with any static server (for example `python3 -m http.server`), or drop it into an HTML-to-APK converter.

## Controls
- **Touch:** drag anywhere to steer (your snake follows your finger's direction) and hold ⚡ to boost.
- **Mouse:** point to steer and hold the button to boost.
- **Keyboard:** ← → / A D turn, Space boosts, Esc pauses.

## Features
- **Rules:** run your head into any snake and you burst into big glowing orbs. The wall is deadly too.
  Boosting is fast but costs length and drops a trail of pellets.
- **Bots:** cautious eaters, hunters that try to cut you off, and zoomers.
  - They look ahead along their heading, veer away from incoming heads, and safety-check every turn.
  - New players get a short grace period before hunters notice them.
  - Bots respawn with varied sizes, so the leaderboard always has big targets.
- **Tuned with simulations:** about 15 bot crashes a minute keeps fresh orb piles appearing without chaos.
- **Juice:** glowing food sprites, patterned bodies with eyes that track direction, blinking and tongue
  flicks, a boost glow, a camera that zooms out as you grow, slow motion on death, and "TOP 3 / #1" banners.
- **HUD:** live top-5 leaderboard with your rank, a kill feed, a minimap, active power-up timers and a boost button.
- **Power orbs:** 🧲 Magnet, ⚡ Turbo (free boost), ✨ 2× Growth.
- **Meta:**
  - 12 skins (stripes, bands, dots, gradient, rainbow, golden scales, neon) and an editable nickname.
  - 12 missions, best length, a 7-day daily gift, revive (respawn with half your length) and double coins.
  - Coins and missions are banked once per run.
- **Home screen:** a live bot match plays behind the menu.
- **Audio:** synthesized SFX (pellet chimes climb a scale) and a synthwave loop. Haptics on mobile.
- **Ads:** interstitial every N games and rewarded ads, via an Android WebView bridge or any web SDK.

## Reskin
1. `js/config.js`: arena size, food and bot counts, speeds, bot personalities and names, skins and
   prices, power-ups, missions, economy.
2. `js/skins.js`: add a pattern (a color rule plus a segment painter).
3. `css/style.css`: UI tokens in `:root`.
4. `assets/`: optional art (see `assets/README.md`).

## Ads
All ad calls go through `js/ads.js`:
- **Android (AdMob):** expose `window.GameAdsBridge.showInterstitial()` / `.showRewarded()` and call back
  `window.onAdClosed()` / `window.onRewardedResult(true|false)`.
- **Web portals:** fill in `webSdk` in `ads.js`. Set `ads.simulate: false` in config for release.

## Testing hooks
`Arena.step(dt)` advances the simulation and `Arena.renderNow()` draws a frame. The engine also runs
headless in Node with a stub canvas, which is how the bot AI was tuned (crash rates, causes, survival times).

## Files
```
index.html        screens
css/style.css     UI visuals
js/config.js      ← reskin here
js/arena.js       snakes, food, spatial grid, collisions, bot AI, power orbs, renderer, minimap
js/skins.js       segment patterns, heads, shop previews
js/ui.js          home, HUD, input, skins, missions, daily gift, game over
js/fx.js · audio.js · ads.js
fonts/            bundled Lilita One + Fredoka (OFL, offline)
```

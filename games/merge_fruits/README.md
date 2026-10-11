# Merge Fruits — HTML5 game template

Swipe to merge matching fruits and grow the legendary Golden Melon. Pure HTML/CSS/JS:
no build step and no dependencies. It runs offline, on the web or wrapped as an Android APK.

## Run
Open `index.html` through any static server (for example `python3 -m http.server`), or drop the folder
into an HTML-to-APK converter.

## Features
- 4×4 merge board (5×5 via config) with swipe, mouse-drag and keyboard (arrows/WASD) controls
- 12 fruit tiers, and a "New Fruit!" unlock popup with coin rewards
- Combos (Juicy! / Fruity! / Smoothie!) with score multiplier
- Juice particles, sparkles, shockwaves, confetti, screen shake, haptics
- Power-ups: Undo, Smash, Swap, Shuffle (each can be refilled with coins or a rewarded ad)
- Coin economy, 7-day daily gift streak, revive-with-ad on game over
- Auto-save and resume, best score, sound/music/vibration settings
- Built-in synthesized SFX and music loop (no audio files needed)
- Ad hooks: interstitial every N games and rewarded ads, which work with an Android WebView bridge or any web SDK

## Reskin in 3 steps
1. Replace the images in `assets/` (see `assets/README.md` for exact sizes).
2. Edit `js/config.js` for names, tile colors, combo words, economy and power-up prices.
3. Change the UI colors in the `:root` tokens at the top of `css/style.css`.

Any missing image falls back to an emoji, so the game always runs.

## Ads
All ad calls go through `js/ads.js`:
- **Android (AdMob):** expose `window.GameAdsBridge.showInterstitial()` / `.showRewarded()` from your
  WebView, then call back `window.onAdClosed()` and `window.onRewardedResult(true|false)`.
- **Web portals (CrazyGames, Poki, GameDistribution):** fill in `webSdk` in `ads.js`.
- Set `ads.simulate: false` in `config.js` for release builds.

## Files
```
index.html        screens & layout
css/style.css     all visuals (theme tokens at top)
js/config.js      ← reskin here
js/game.js        board logic, power-ups, modals, daily reward
js/fx.js          canvas particles + floating text
js/audio.js       synthesized SFX/music or your audio files
js/ads.js         ad network adapter
assets/           your art (see assets/README.md)
fonts/            bundled Lilita One + Fredoka (OFL, works offline)
```

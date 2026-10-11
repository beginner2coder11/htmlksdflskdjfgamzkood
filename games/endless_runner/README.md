# Dash Runner — HTML5 endless runner template

Jump, double jump, slide and stomp your way through five worlds. Everything (heroes, scenery,
hazards, effects, sound) is drawn or synthesized in code. Pure HTML/CSS/JS with no build step and
no dependencies. It runs offline, on the web or wrapped as an Android APK.

## Run
Serve the folder with any static server (for example `python3 -m http.server`), or drop it into an HTML-to-APK converter.

## Controls
- **Touch:** tap to jump (hold for higher), tap again in the air to double jump, swipe down to slide
  (or slam down from the air).
- **Keyboard:** Space / ↑ / W to jump, ↓ / S to slide, Esc to pause.

## Features
- **Feel:**
  - Variable jump height, double jump with a flip, coyote time and jump buffering (forgiving controls).
  - Squash and stretch, dust puffs, speed lines, screen shake, and slow-motion on crash.
- **Fair world generator:** gaps are sized from the jump physics and current speed (audited over 9.5 km:
  zero impossible gaps). It mixes flat runs, gaps, floating platforms and steps.
- **Hazards:** spikes, crates you can land on, saw blades, slide-under bars, and bees you can stomp
  for a bounce and bonus coins.
- **5 biomes:** Sunny Meadow, Desert Dunes, Snowy Peaks, Neon City and Volcano Valley. Each has
  parallax hills and scenery, crossfades into the next, and announces itself with a banner.
- **Power-ups:**
  - 🧲 Magnet pulls in nearby coins.
  - 🛡️ Shield survives one hit, pops you onto a ledge, or bounces you out of a pit.
  - 🚀 Rocket flies you over everything along a coin trail.
  - ✨ Double Coins.
- **Coin streaks:** the pitch climbs as you chain coins.
- **Meta:**
  - 8 code-drawn heroes in a shop and power-up duration upgrades.
  - 12 missions, distance milestones, a "BEST" flag in the world, and a 7-day daily gift.
  - Revive (with an ad) and double coins at game over. A run's coins are banked once, when you leave it.
- **Home screen:** a live demo run plays behind the menu.
- **Audio:** synthesized SFX and a chiptune loop (no audio files needed). Haptics on mobile.
- **Ads:** interstitial every N runs and rewarded ads, via an Android WebView bridge or any web SDK.

## Reskin
1. `js/config.js`: physics feel, biome names and colors, heroes and prices, power-up durations,
   upgrade costs, missions, economy.
2. `js/characters.js`: add a hero style (each is a few drawing calls on the shared body).
3. `css/style.css`: UI tokens in `:root`.
4. `assets/`: optional art (see `assets/README.md`).

## Ads
All ad calls go through `js/ads.js`:
- **Android (AdMob):** expose `window.GameAdsBridge.showInterstitial()` / `.showRewarded()` and call back
  `window.onAdClosed()` / `window.onRewardedResult(true|false)`.
- **Web portals:** fill in `webSdk` in `ads.js`. Set `ads.simulate: false` in config for release.

## Testing hooks
`Runner.step(dt)` advances the simulation, `Runner.renderNow()` draws a frame, and `Runner.world` exposes
the generated level. Use them for bots, balance checks and screenshots while the tab is in the background.

## Files
```
index.html          screens
css/style.css       UI visuals
js/config.js        ← reskin here
js/runner.js        physics, generator, collisions, power-ups, renderer
js/characters.js    code-drawn heroes
js/ui.js            home, HUD, input, shop, upgrades, missions, daily gift, game over
js/fx.js · audio.js · ads.js
fonts/              bundled Lilita One + Fredoka (OFL, offline)
```

# Knife Hit: HTML5 knife-throwing template

Tap to throw knives into a spinning target without hitting the knives already stuck in it. Slice apples, smash
boss targets and collect 16 knives. It plays **fully offline**. Pure HTML/CSS/JS with no build step and no
dependencies. It runs on the web or wrapped as an Android APK.

## Run
Serve the folder with any static server (for example `python3 -m http.server`), or drop it into an HTML-to-APK converter.

## Controls
Tap anywhere (or press Space / ↑) to throw. Esc pauses.

## Features
- **Fair collisions:** the hit test compares the flying knife with the stuck knives' actual blades and handles, so
  what you see is what counts. Throws are sub-stepped, so fast knives never pass through each other.
- **Endless stages** in groups of 5, and every 5th stage is a **boss**:
  Cheese Wheel, Monster Tire, Big Orange, Donut King, Pizza Pie, Choco Cookie, Watermelon and Iron Shield.
  Each boss has its own spin pattern and rewards a new knife.
- **Spin patterns:** constant, wobble, reverse, stop-and-go and surge. Speed, knife count and pre-placed knives
  ramp up each tier, and the wood type changes as you go.
- **Apples on the rim:** slice them for currency.
- **Juice:**
  - Wood chips, target recoil and a white hit flash; the thunk pitch rises as the target fills.
  - The target bursts into wedges and the knives fly off.
  - Apple halves, a boss banner, slow motion and screen shake on a miss.
  - Praise text, synthesized SFX and a music loop.
- **Meta:**
  - 16 knives in 9 shapes (classic, chef, butter, cleaver, dagger, kunai, carrot, candy cane, pencil, fork…),
    with glow effects. Unlocked with apples, by beating bosses or by reaching a stage.
  - Best stage and score, 12 missions and a 7-day daily gift.
  - Continue (retry the stage and keep your score) and double apples.
- **Home screen:** a demo plays behind the menu.
- **Ads:** interstitial every N games and rewarded ads (continue, x2 apples, daily gift x2), via an Android
  WebView bridge or any web SDK.

## Reskin
1. `js/config.js`:
   - Throw speed and hit width.
   - The difficulty curve: speed, knives and pre-placed knives per tier.
   - Woods, bosses (name, pattern, speed, knives, reward knife), knives, missions and economy.
2. `js/skins.js`: knife shapes, target painters, apple.
3. `css/style.css`: UI tokens in `:root`.
4. `assets/`: optional art (see `assets/README.md`).

## Ads
All ad calls go through `js/ads.js`:
- **Android (AdMob):** expose `window.GameAdsBridge.showInterstitial()` / `.showRewarded()` and call back
  `window.onAdClosed()` / `window.onRewardedResult(true|false)`.
- **Web portals:** fill in `webSdk` in `ads.js`. Set `ads.simulate: false` in config for release.

## Testing hooks
- `Game.step(dt)` and `Game.renderNow()` advance and draw frames.
- `Game.predict(margin)` simulates the flight of a throw made right now (used by the demo AI).
- `Game.throw()`, `Game.stage`, `Game.score` and `Game.target`.

The engine also runs headless in Node with a stub canvas. In testing, a bot that only throws when
`predict()` says it's safe clears 60 stages and 12 bosses.

## Files
```
index.html        screens
css/style.css     UI visuals
js/config.js      ← reskin here
js/game.js        targets, spin patterns, throws, collisions, apples, bosses, shatter, demo AI, renderer
js/skins.js       knives, targets, apples, previews
js/ui.js          home, HUD, input, knife collection, boss rewards, missions, gift, game over
js/fx.js · audio.js · ads.js
fonts/            bundled Lilita One + Fredoka (OFL, offline)
```

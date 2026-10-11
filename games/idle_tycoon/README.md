# Idle Tycoon: HTML5 idle/incremental template

Grow a snack empire from a single lemonade stand into a theme park. Cartoon cars drive up to your shops and
order; tap a car to serve it. Buy more to raise your prices, hire managers to serve for you, earn while away
and sell your empire for permanent Stars. It plays **fully offline**. Pure HTML/CSS/JS
with no build step and no dependencies. It runs on the web or wrapped as an Android APK.

## Run
Serve the folder with any static server (for example `python3 -m http.server`), or drop it into an HTML-to-APK converter.

## Features
- **Customers on request:** shops line up three to a road (Main Street, Market Road, Sunset Boulevard,
  Harbor Avenue). Traffic drives past; only customers pull over to the curb and stop right in front of the
  seller's window.
  - Cartoon cars (cars, vans, pickups, beetles) queue at the window. Drivers blink and get worried, then angry,
    as they wait.
  - Each driver shows a speech bubble with the order (for example 🍕×3) and a patience bar.
  - Tap the car to serve: the order flies from the window, the driver smiles, coins and hearts pop, and the car
    drives off.
  - Serve fast for a **+25% tip**, and keep a **combo** going (+2% per happy customer, up to +50%).
  - Customers who wait too long leave angry, honking and fuming, and the combo resets.
  - Bigger orders pay more. Milestones bring customers more often and raise prices.
- **10 businesses:** Lemonade Stand → Donut Shop → Pizza Place → Burger Joint → Ice Cream Truck → Sushi Bar →
  Coffee Chain → Candy Factory → Movie Studio → Theme Park. Costs grow exponentially, and the longer
  cycles pay more.
- **Buy ×1 / ×10 / ×100 / MAX** with exact geometric pricing.
- **Milestones:**
  - Owning 25/50/100/200/300/400 doubles a business's speed; 500+ doubles its profit.
  - When every business reaches 25, 50, 100… all profits double.
- **Managers** (cute animal mascots) stand by the shop door and serve customers automatically, including
  while you're away.
- **Upgrades:** 110 generated ×3 profit upgrades (per business plus "all").
- **Prestige: Stars.** Sell the empire to collect stars from lifetime earnings. Each star adds +2% profit
  forever; gems and boosts are kept.
- **Welcome-back earnings:** managed businesses earn offline (capped, default 8h), and a video doubles it.
- **Profit boost:** a video gives ×2 for 4 hours, stacking to 24h.
- **Lucky delivery balloon:** floats over the shops every few minutes with cash or gems, ×5 with a video.
- **Gems:** from missions, the daily gift, the balloon and capped free videos. Spend them on Time Warps
  (1h / 24h of income) and permanent ×2 profit.
- **Shop buildings** grow taller as you buy more, with a striped awning, a worker in the window, the shop's sign,
  and a "FOR SALE" lot for the next one.
- **Juice:** coins fly to your cash counter, "+$" and "FAST! TIP" pop-ups, cartoon honks, milestone banners,
  confetti, synthesized SFX and a lo-fi music loop.
- **Tutorial hints** guide the first tap, first purchases and first manager.
- **Missions:** 14, paying gems. Progress is remembered through prestiges.
- Daily gift, settings, and a reset with confirmation.
- **Big numbers:** K, M, B, T, Qa, Qi, Sx, Sp, Oc, No, Dc, then aa, ab…
- **Saving:** every 5 seconds and when the app is hidden.

## Reskin
1. `js/config.js`:
   - Businesses (name, emoji, color, cost, growth, cycle time, revenue, manager).
   - Milestones, upgrade generator, prestige (name, emoji, divisor, bonus).
   - Customers (`street`: frequency, patience, tip, combo) and `roadNames`.
   - Offline cap, boost, lucky balloon, gem shop, missions and economy.
2. `css/style.css`: UI tokens in `:root`.
3. `js/street.js`: shop scenes, cartoon cars, drivers and customer logic.
4. `assets/`: optional art (see `assets/README.md`).

Change the theme freely, for example a space mining or farm tycoon, by editing the business list. The economy
math doesn't care about names.

## Balancing
```
node tools/simulate.js [hours=8] [tapEvery=5]
```
This simulates a greedy player that taps every few seconds, buys whatever pays back fastest and prestiges when
it at least doubles its stars. It prints a timeline of unlocks, managers, milestones and prestiges.

With the default config:
- First manager at about 4 minutes, first stars at about 19 minutes.
- Candy Factory at about 2 hours, Theme Park at about 6 hours.
- Faster loops after each prestige.

## Ads
All ad calls go through `js/ads.js`:
- **Android (AdMob):** expose `window.GameAdsBridge.showInterstitial()` / `.showRewarded()` and call back
  `window.onAdClosed()` / `window.onRewardedResult(true|false)`.
- **Web portals:** fill in `webSdk` in `ads.js`. Set `ads.simulate: false` in config for release.

Rewarded ads cover the boost, offline ×2, balloon ×5, daily gift ×2 and free gems. An optional interstitial
shows after a long absence.

## Testing hooks
- `Tycoon.step(dt)` advances the game (a hidden tab pauses requestAnimationFrame). Click a road canvas
  (`[data-road-cv]`) in a shop's third to serve that shop.
- `node tools/street_test.js` runs the traffic headless and reports customers served versus expected, angry
  customers, and any car stuck in traffic.
- `Tycoon.econ` is the economy (`S` holds the state).
- `Tycoon.handleAway(seconds)` and `Tycoon.spawnBalloon()`.
- `js/econ.js` runs in Node.

## Files
```
index.html        layout
css/style.css     UI visuals
js/config.js      ← reskin + economy here
js/econ.js        economy engine: costs, cycles, milestones, managers, upgrades, prestige, offline (browser + Node)
js/street.js      roads of 3 shops: traffic, customers pulling over, orders, serving, tips, combo, angry leave
js/ui.js          cards, tabs, buy modes, boost, balloon, welcome back, missions, gift, hints, saving
js/fx.js · audio.js · ads.js
fonts/            bundled Lilita One + Fredoka (OFL, offline)
tools/simulate.js balancing simulator
tools/street_test.js headless traffic check (every customer served, no stuck cars)
```

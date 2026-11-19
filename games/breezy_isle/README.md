# Breezy Isle: cozy island explorer template

A cozy, side-view island adventure. You play a little bear in a sun hat who explores four beaches: you pick
fruit, dig up shells, net butterflies, fish off the pier, help animal friends, decorate a camp and save up to
open new beaches. It has soft pastel art with depth layers and a day/night cycle. Everything is drawn in code,
with no build step, no dependencies and no image or sound files, and it plays fully offline.

## Controls
- **Walk:** tap or hold anywhere on the ground. On desktop, use ←/→ or A/D.
- **Use something:** tap it, and the bear walks over and uses it. Space, E or Enter uses the nearest thing.
- **Fishing:** walk to the end of the pier. When the "!" shows, tap, then hold so the green zone stays on the
  fish until the bar fills.

## Features
- **Four beaches** with their own sky, sea, hills, tree type, fruit, shells, fish, bugs and friends: Palm
  Beach, Coral Cove, Sunset Cliffs and Mango Jungle. You open them with coins on the Map.
- **Activities:** shake fruit trees (they regrow), dig sparkly spots (finds are weighted by rarity, and a better
  shovel finds rarer things), net butterflies (fast ones are harder to catch, and a better net helps), and a
  fishing mini-game (fish move by difficulty, and a better rod gives a bigger catch zone).
- **Day and night:** the sun and moon cross the sky, there's a sunset glow, and the night brings stars,
  fireflies and glowing lights from the camp and truck. Some fish and bugs only appear at night.
- **9 animal friends** (cat, bunny, turtle, bird, frog, bear, duck, pig and fox). Each one has a request bubble
  showing what they want, and a green tick appears when you have it. Favours earn coins and hearts, and heart
  levels unlock gifts for your camp.
- **Bao's Snack & Swap truck:** sell your finds, buy 12 camp decor pieces, and upgrade 4 tools (basket, rod,
  net and shovel).
- **Camp:** 6 spots to decorate. Comfort raises your selling price by up to 50%.
- **Island Journal:** 31 entries with silhouettes for things you haven't found yet, plus coin rewards at
  milestones.
- **Juice:** depth layers, swaying palms, footprints and dust puffs, bouncing fruit drops, items that fly into
  your basket, "New in your journal" cards, and sparkles.
- **Retention:** a 7-day daily gift and per-friend request chains.
- **Ads (js/ads.js):** "+50 coins" from a rewarded ad at the truck (5-minute cooldown) and an interstitial
  every N beach trips. Uses the same `GameAdsBridge` contract as the other templates.
- **Sound (js/audio.js):** a plucked-string island loop that turns softer at night, surf, and effects for each
  action. Sound effects and music have separate toggles.

## Reskin
- **Name, logo and UI colours:** `title`, `titleLines` (one entry per logo line) and `theme` (the CSS variables
  from `css/style.css`) in `js/config.js`. `js/skin.js` applies them when the game starts.
- `js/config.js`: walk speed, day length, basket sizes, regrow times, all items (value, rarity, difficulty,
  time of day, and how each is drawn), the beaches, friends, decor, tool prices, journal rewards, daily gifts,
  ads and the storage prefix (`bz_`).
- `js/art.js`: draws the animals, items, trees, decor and the truck.
- `css/style.css`: UI tokens in `:root`.

## Testing hooks
`Game.goTo("tree" | "dig" | "bug" | "npc" | "truck" | "slot" | "fish", index)`, `Game.step(dt, n)`,
`Game.setClock(0..1)` (0.9 is night), `Game.travel(areaId)`, `Game.fishing`, `Game.fishPress(down)`,
`Store.S` (the save), `UI.shop()`, `UI.journal()`, `UI.map()`, `UI.friends()`, `UI.talk(friendId)`.

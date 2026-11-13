# Rink Rally: HTML5 air hockey template

Groovy 1970s air hockey: brown, mustard and orange stripes, a chunky soft serif, a flip-number scoreboard and
rainbow arcs around each goal. Pure HTML/CSS/JS, no build step, no dependencies, no image or sound files.
Plays fully offline, on the web or as an APK.

## Controls
Drag anywhere in the bottom half to move your orange mallet (it sits a little above your finger so you can see it).
In Two players mode, player 2 drags in the top half.

## Features
- **Physics:** sub-stepped puck against rim segments, cut corners and round goal posts; mallets carry their speed
  into hits, so a fast swipe makes a fast shot; friction, max speed and a nudge for a dead puck.
- **Ladder of 6 rivals** (Disco Dan to The Champ), each with speed, reaction, aim and aggression. Rivals guard
  between the puck and their goal, get around a puck behind them and drive through it at an aim point (sometimes
  off the wall).
- **Quick match** against any rival you've reached and **two players on one phone** (multi-touch).
- **First to 7**, faceoffs on the side that conceded.
- **4 tables** (Sunset, Lime Lounge, Berry Bowl, Surf Shack) unlocked by wins.
- **Juice:** puck trail, star sparks on hits, screen shake on big hits, a striped GOAL! banner, flip animation on the
  scoreboard, a light vibration on your hits.
- **Sound:** plastic clacks, rim thuds, air-table hiss, brassy goal stabs and a disco bass groove.
- **Ads:** interstitial every N matches, rewarded ad for a rematch that keeps your score and cuts the rival's by 2.

## Reskin
`js/config.js` (table size, puck and mallet, win score, rivals, table themes, ads), `js/game.js` → `drawTable`,
`css/style.css` tokens in `:root`.

## Testing hooks
`Game.start({rival, two, theme})`, `Game.step(dt)`, `Game.render()`, `Game.aimMe(x, y)`, `Game.puck`, `Game.score`,
`UI.begin({rival, kind})`. A tracking bot beats the first four rivals and wins about 2 of 3 against the last two.

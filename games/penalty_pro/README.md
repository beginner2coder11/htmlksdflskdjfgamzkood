# Penalty Pro: football penalty shootout template

Take turns with a rival team in a penalty shootout. On your kick, swipe up from the ball: where your finger stops is
where you aim, a bent swipe curls the ball, and a swipe that's too hard sails over the bar. On their kick, tap where
you think the shot is going and your keeper dives there. Five kicks each, then sudden death. Win the Round of 16,
Quarter-final, Semi-final and Final to lift each of 5 cups (60 matches). Everything (stadium, players, ball, sound)
is made in code, with no build step, no dependencies and no image or sound files. It plays fully offline.

## Controls
Your kick: swipe up from the ball (bend the swipe to curl it). Their kick: tap the goal where you want to dive.
P or Esc pauses.

## Features
- **Real ball and keeper rules (js/kick.js):** the ball flies in metres and seconds with gravity and curl (the
  start velocity is solved so the ball still reaches the aimed point). The keeper is a body + arms + hands shape
  that dives toward a point, and a shot is saved only if the ball passes through it. Post and crossbar hits ring
  off the woodwork.
- **A lively keeper:** a jointed figure (arms, legs, big gloves, face) posed every frame. He bounces on his toes
  and shuffles along the line, the rival waves his arms while you line up, he split-steps at the kick, dives with
  gloves stretched (his eyes follow the ball), tracks the ball with his gloves if he stays central, then lands and
  slides, punches the air after a save or puts his hands on his head when beaten. Saves and woodwork hits flash
  and shake the screen.
- **Two cameras:** behind the ball when you shoot; a TV view from further back when you keep, so you watch
  their taker run up and strike.
- **A floodlit stadium:** three tiers of crowd, floodlights, ad boards, a striped pitch and box lines; the net
  bulges where the ball hits it, and goals and great saves throw confetti.
- **Rival AI:** keepers read your shot (curl fools them), react and dive at speeds that rise with the level;
  takers pick corners more precisely and miss less as you go.
- **60 matches in 5 cups** (`levels`), 12 made-up teams, a live scoreboard with sudden death, stars per win
  (3 = won by 2+ in normal time, 1 = sudden death) and a trophy screen for each cup.
- **6 kits** in the shop (shirt, shorts and keeper shirt), a 7-day daily gift, double coins for an ad and an
  interstitial every 3 wins (`js/ads.js` uses the `GameAdsBridge` contract).
- **Sound (js/audio.js):** referee whistle, the thump of the kick, the swish of the net, a ringing post, crowd
  roars and groans and a stadium drum-and-chant loop.

## Balance check
A Node simulation with a human-like shooter (random aim + noise) and keeper (0.36 s+ reaction, aim noise) wins
about 99% of match 1, 93% of match 15, 79% of match 30, 55% of match 45 and 26% of the last match.

## Reskin
- **Name, logo and UI colours:** `title`, `titleLines` (one entry per logo line) and `theme` (the CSS variables
  from `css/style.css`) in `js/config.js`. `js/skin.js` applies them when the game starts.
- `js/config.js` also holds the kicks per side, your keeper's speed and reach, the rival teams and colours, cup
  and round names, the difficulty from the first to the last match, coins, kits, the daily gift, ads and the
  storage prefix (`pp_`).
- `js/game.js` → `bake` draws the stadium (crowd colours, ad board words), `drawKeeper` / `drawShooter` / `drawBall`
  draw the players and ball.

## Testing hooks
`Kick.resolve(shot, keeper)`, `Kick.aiShot(diff)`, `Kick.aiKeeper(shot, diff)`; in the page: `Game.start(n)`,
`Game.shoot(tx, ty, T, curl)`, `Game.dive(px, py)`, `Game.step(dt, n)`, `Game.state`, `Game.goalXY(x, y)`,
`Game.ballXY()`, `UI.levels()`, `UI.shop()`, `UI.gift()` and `UI.state`.

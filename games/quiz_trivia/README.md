# Quiz Rush — HTML5 trivia template

A fast, game-show style trivia game with 191 questions across 8 topics, four game modes,
lifelines, XP levels and a daily challenge. Pure HTML/CSS/JS with no build step and no dependencies.
It runs offline, on the web or wrapped as an Android APK.

## Run
Serve the folder with any static server (for example `python3 -m http.server`), or drop it into an HTML-to-APK converter.

## Game modes
- **Classic:** 10 questions from a topic (or a mix of everything). Earn up to 3 stars per topic.
- **Survival:** 3 lives, and questions get harder the longer you last. Best score is saved.
- **Lightning:** 60 seconds on the clock, and every correct answer adds 2 seconds.
- **Daily Challenge:** the same 10 questions for everyone that day (3 easy, 4 medium, 3 hard).
  One attempt per day, with a bonus reward.

## Features
- **Timer:** a countdown ring that ticks and turns red in the last 5 seconds, with a 3-2-1-GO intro.
- **Scoring:** 100 points plus a time bonus, multiplied by your streak (🔥 up to ×2).
  Shout-outs at streaks of 3, 5, 8 and 12.
- **Feedback:** right answers pop green with sparkles. Wrong answers shake red and the right one is shown.
- **Lifelines:** 50/50, +Time, Skip and Crowd poll (bars show percentages; the crowd is less sure on
  hard questions). Each can be refilled with coins or a rewarded ad.
- **Player profile:** avatar picker, XP levels (with level-up rewards), accuracy per topic,
  and best scores.
- **Variety:** unseen questions come first, so players rarely repeat a question until they've seen the topic.
- **Retention:** coins, a 7-day daily gift, and double coins with an ad.
- **Audio:** synthesized SFX and a game-show music loop (no audio files needed). Haptics on mobile.
- **Controls:** keyboard support (A–D or 1–4, T/F) for desktop and web portals.
- **Ads:** interstitial every N rounds and rewarded ads, via an Android WebView bridge or any web SDK.

## Questions: edit in a spreadsheet
1. Open `tools/questions_template.csv` in Google Sheets or Excel. It already holds all 191 bundled questions.
2. Columns: `category, difficulty, question, correct, wrong1, wrong2, wrong3`.
   For True/False, put `TRUE` or `FALSE` in `correct` and leave the wrong columns empty.
3. Export as CSV and run:
   ```
   node tools/csv_to_questions.js my_questions.csv
   ```
   This rewrites `js/questions.js` and reports any row problems.

**Live updates without a new build:** run with `--json questions.json`, host the file anywhere, and
set `questionsUrl` in `js/config.js`. The game loads it at start and falls back to the bundled
questions when offline.

New topics: add an entry to `categories` in `js/config.js` (id, name, emoji, color), then use that id in the sheet.

## Reskin
1. `js/config.js`: title, topics, timers, scoring, lifelines and prices, XP curve, avatars, economy.
2. `css/style.css`: UI tokens in `:root`.
3. `assets/`: optional art (see `assets/README.md`).

## Ads
All ad calls go through `js/ads.js`:
- **Android (AdMob):** expose `window.GameAdsBridge.showInterstitial()` / `.showRewarded()` and call back
  `window.onAdClosed()` / `window.onRewardedResult(true|false)`.
- **Web portals:** fill in `webSdk` in `ads.js`. Set `ads.simulate: false` in config for release.

## Files
```
index.html                 screens
css/style.css              UI visuals
js/config.js               ← reskin here
js/questions.js            question bank
js/quiz.js                 rounds, timer, scoring, lifelines, question screen
js/ui.js                   home, topics, HUD, results, profile, daily challenge/gift
js/fx.js · audio.js · ads.js
tools/csv_to_questions.js  spreadsheet → questions
tools/questions_template.csv
fonts/                     bundled Lilita One + Fredoka (OFL, offline)
```

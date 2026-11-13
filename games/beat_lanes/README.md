# Beat Lanes: HTML5 rhythm game template

A four-lane rhythm game in shiny Y2K chrome: liquid-metal type, an iridescent pastel backdrop, jelly buttons, blobs
and sparkles. Every song is composed live by the synth, and the note chart is built from the same music, so notes
always land on the beat. No build step, no dependencies, no image or audio files. Plays fully offline.

## Controls
Tap a lane as a note reaches the chrome bar (or D F J K). Hold long notes until their tail ends.

## Features
- **6 synth songs** (100–156 BPM, pop / house / breakbeat feels, major, minor and dorian), each in **Easy, Normal and
  Hard** charts (about 1.3 to 4.3 notes a second). Songs are data in `js/config.js`: BPM, key, scale, length, style
  and a seed.
- **Charts from the music:** lead notes map to lanes by pitch, drums fill the gaps, harder charts add 16ths, chords
  and more hold notes.
- **Judging:** Perfect ±50 ms, Great ±95 ms, Good ±140 ms; combo multiplier; an energy bar that misses drain.
- **Grades** S/A/B/C/D from accuracy, full-combo detection, best score and grade per song and difficulty; each
  cleared song unlocks the next.
- **Clock:** the game reads the same audio clock the music is scheduled on; pausing suspends it so notes and music
  freeze together (falls back to a timer without audio). **Timing offset** and **note speed** settings.
- **Juice:** perspective chrome highway, glossy jelly notes, glowing lanes when pressed, sparkle bursts, chrome
  combo counter and judgement pops.
- **Ads:** interstitial every N songs, rewarded ad to keep playing when energy runs out.

## Reskin
`js/config.js` (lane colours, keys, timing windows, points, speed, songs, difficulty rules, ads),
`js/game.js` → `render` for the highway, `css/style.css` tokens in `:root`.

## Testing hooks
`Game.start(song, difficulty, {offset, speedMul})`, `Game.press(lane)`, `Game.release(lane)`, `Game.notes`,
`Game.now()`, `Game.chart(song, Sound.compose(song), difficulty)`, `UI.play(song)`. An autoplay bot that presses each
note on time scores only Perfects.

# Pixel Logic: HTML5 picture-logic (nonogram) template

Read the numbers, fill the squares and reveal a picture. Styled like a two-ink risograph print: warm paper grain,
fluoro pink and blue spot inks that overprint with slight misregistration, halftone dots and condensed type. The
grid is DOM, no canvas. No build step, no dependencies, no image or sound files. Plays fully offline.

## Controls
Tap a square to fill it (or cross it in ✕ mode, X key). Drag to paint a straight line of squares. U = undo.

## Features
- **24 pictures in 3 books:** Postcards (5×5), Notebook (10×10) and Poster (15×15). Pictures are plain pixel
  strings in `js/config.js`.
- **Logic-only puzzles:** `node tools/check.js` proves every picture can be solved by line logic without guessing
  (so the answer is unique). `node tools/fix.js` nudges a few pixels in any picture that fails.
- **Any valid answer wins:** the board is checked against the clues, not just the stored picture.
- Satisfied clues strike through, bold 5×5 guide lines, a live "inked" counter, a timer and best times.
- **Hints** fix one wrong square (earned every 3 prints, or by rewarded ad); the pause screen tells you how many
  squares don't match.
- **Print reveal:** a press animation, then the picture as a two-ink print; finished prints fill the studio gallery.
- **Sound:** ink stamps, pencil crosses, a printer roll on completion and a soft vibraphone jazz loop.
- **Ads:** interstitial every N prints, rewarded ad for +2 hints.

## Reskin
`js/config.js` (inks, hints, books and pictures), `css/style.css` (riso tokens in `:root`, `.cell.on`).

## Testing hooks
`Game.load(picture)`, `Game.paint(r, c, value)`, `Game.check()`, `Game.hint()`, `Game.solution`, `Game.grid`,
`UI.play(i)`.

# B, kitchen tool

## What it keeps from the current app

The name and wordmark, dark default, bottom sheet on mobile with a centred panel at desktop, the three meta pills, Save on the card and in the sheet, ten vibes, the single-column stack. The card follows the Eat This Much reference from your brief: photo, then the actions directly under it, then the facts.

## What it drops

- Colour as decoration. Surfaces are cool greys (`#0e1116` / `#171b22` / `#222834`). The only hues are green (`#5bd48a`) for "on" (a checked ingredient, saved, the active vibe tile, focus) and amber (`#f0b64a`) for an estimate marker, following the MealThinker reference where colour marks state. The primary action is the brightest neutral, not a hue.
- Fredoka One and Nunito. IBM Plex Sans, drawn for interfaces, with tabular figures so measures line up. Body in the sheet is 18px, larger than the rest of the page, because the sheet is read from a counter.
- The native `<select>`. The vibe is a full-width toggle that opens a 2 × 5 grid of tiles, each with a three-word hint of what the vibe actually scores for, so the choice is informed rather than guessed.
- The rounded card. Radius is 8px throughout; corners are soft enough not to look like a spreadsheet and no softer.
- Emoji. None.

## What it adds

- Checkable ingredients with a running "4 of 16" count, so you can tick things off as they go in the pan.
- Save, Print and Close pinned to the sheet's bottom edge, 60px tall, in thumb reach with the phone on the counter.
- Step numbers as high-contrast discs you can find again after looking away.

## The spin

A terse tick through eight candidate titles in the card's title slot, accelerating slightly and stopping on the pick, while the image sits dimmed and switches on when the title lands. About a second. It shows the search without pretending to be a slot machine. With reduced motion the title is set and the image is on.

## How the card-to-modal transition was chosen

This direction's argument is speed. The sheet rises in 220ms with a sharp ease-out and the card dims to 35% so your eye has somewhere to go; nothing else moves. It is three CSS transitions and no JS beyond a class toggle. A shared-element flight was tried and rejected here because it adds 200ms between tap and ingredients, and at arm's length you do not watch the transition, you wait for it.

## The one thing to react to

The checkable ingredients and the pinned bottom bar. They are the two things that only make sense if the phone really is on the counter while you cook. If you find yourself scrolling past the checkboxes without using them, B is over-built and A's calmer sheet is the better read.

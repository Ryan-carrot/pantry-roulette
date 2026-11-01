# C, roulette

## What it keeps from the current app

The name, and the slot-machine identity, more than either other direction. Dark default, bottom sheet on mobile with a centred panel at desktop, the three meta pills, Save on the card and in the sheet, ten vibes, the 560px column.

## What it drops

- Navy and orange, for an aubergine-black room (`#100c18` / `#1a1426` / `#261d38`) with one gold light (`#f4c54b`). Gold is rationed to the three things that are "lit": the spin button, the reel's payline, and the vibe you have set. Green (`#5fdc9b`) is saved; coral (`#ff6e6e`) is reserved for notices and does not appear on the page. The sheet uses no gold at all so it stays calm enough to cook from.
- Fredoka One and Nunito, for two families with clearly different jobs: Bricolage Grotesque (sharp, slightly eccentric, with an optical-size axis) for anything that names something, and Archivo for anything you read.
- The native `<select>`, for a dial: a horizontal snap-scrolling rail where the centred vibe is the set one, with a marker notch above it. Swipe to set. "See all ten" flips it into a grid for anyone who prefers to pick.
- Emoji. None; the reel does the work the 🎰 was doing.

## The spin

The spin is the hero and it is visible: a reel window with a gold payline sits under the Spin button, showing three candidate rows (thumbnail and title). On Spin the strip runs 1.7s with a long decelerating ease and lands on the pick, the payline brightens, and the card pays out beneath it. Before the first spin the reel already shows the dimmed pick on the payline, so the control explains itself. With reduced motion the strip jumps to its final position and the card appears.

## How the card-to-modal transition was chosen

The card is a ticket the machine paid out; opening the recipe should feel like cashing it. The card tips away (a 14° rotateX with a 10px lift, fading over 260ms) and 120ms into that the sheet rises with a small overshoot (`cubic-bezier(.2,1.1,.3,1)` over 500ms). The overshoot is the only place the page is allowed to be playful; the sheet's contents are set in the plainest layout of the three.

Rejected: a flip that reveals the sheet on the card's back (reads as a trick, and the sheet is far taller than the card) and a slide where the sheet pushes the card up off screen (loses the pay-out metaphor).

## The one thing to react to

The reel. It is the only part of any direction that is more than a styling choice, and it costs about 1.7s on every spin. If the reel feels like the app finally doing what its name promises, C is the direction. If after three spins you want it to just show the result, the reel should be cut and the gold-on-aubergine palette can be judged on its own.

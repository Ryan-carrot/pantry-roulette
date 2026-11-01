# A, editorial

## What it keeps from the current app

The name and wordmark, dark default, the bottom sheet on mobile with a centred panel at desktop, the three meta pills on the card (ingredients, score, vibe), Save on the card and in the sheet, ten vibes, the single-column 560px stack. The image-then-title-then-pills order of the current result card is unchanged so the page still reads as Pantry Roulette.

## What it drops

- Navy and orange. The surfaces go to a warm near-black (`#15120f` / `#221d19`) so the food photo is the only saturated thing on screen. The orange is replaced by a turmeric accent (`#e9a23b`) used in exactly one place, the primary action, and a sage (`#8fcfb8`) used only for state: saved, the active vibe chip, focus rings.
- Fredoka One and Nunito. Instrument Sans at 400 and 600 does both jobs. Its terminals are cut, not rounded; titles at 34px with tight tracking read as decisive.
- The ten-item native `<select>`. The vibe is a disclosure row ("Vibe · Comfort") that opens into wrapped chips. Closed, it is one line; open, all ten are visible at once with the active one inverted.
- Emoji. None.
- Filled pills. Pills are outlined so they sit under the title instead of competing with it.

## The spin

The card arrives and its image shuffles through three candidate photos, 260ms apart, before settling on the pick; only then does the body fade in. It is short (about a second) and it shows *what* is being chosen between. With reduced motion the card simply appears settled.

## How the card-to-modal transition was chosen

The brief says the card is a stepping stone and the modal is the star, so the transition should make the card *become* the modal rather than be replaced by it. The only element the two surfaces share is the photo, so the photo is the shared element: on tap, a clone of the card image is positioned exactly over it, then animates to the sheet's header position while the sheet rises underneath. Same 420ms and the same easing for both, so they arrive together. It is about twenty lines of JS (`getBoundingClientRect` twice, one clone, one class toggle) and no library. With reduced motion the sheet appears without the flight.

Rejected: a scale-up of the whole card into the sheet (text re-flows mid-animation and looks broken) and a crossfade (no sense of where the sheet came from).

## The one thing to react to

The warm neutral palette. It is the biggest departure from navy and it is what makes the photo the hero. If it reads as brown or muddy on your phone rather than warm, this direction loses its reason to exist and the type and transition could move to B's greys instead.

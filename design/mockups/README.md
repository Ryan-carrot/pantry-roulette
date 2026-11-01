# Three design directions: result card → recipe modal

Static mockups made for the 2.0 redesign, from the brief in `../brief/`. Each is one self-contained HTML file that opens straight from disk and walks the whole flow: Spin → spin transition → result card → Open recipe → card-to-modal transition → bottom sheet → Close. Nothing in `src/` changed.

## How to view

Open any `index.html` in a browser. On a phone, the simplest way is to serve the folder (`npx serve design/mockups` or `python3 -m http.server` from this directory) and open it over Wi-Fi; or use your browser's device toolbar at 390 × 844. Widen the window past 720px to see the sheet become a centred panel. Each page ends with a palette block (every colour, its role, measured contrast) and a type block.

All three use the same recipe, `shared/sample-recipe.json` (Chicken Handi, 16 ingredients, 9 steps, from TheMealDB id 52795) and its photo. The two other photos in `shared/` are only there to be shuffled through during a spin. The servings stepper and the "You'll need" line are visual mocks of two separate inference experiments; they change nothing.

## A, editorial (`a-editorial/`)

Photo-led. Warm near-black surfaces so the food is the only saturated thing on screen; one family, Instrument Sans, at two weights; one warm colour for the primary action and one cool one for state. The spin shuffles the card's image through candidates and settles. Opening the recipe flies the card's image up into the sheet's header while the sheet rises to meet it. The vibe selector is a disclosure that opens into chips.

## B, kitchen tool (`b-kitchen-tool/`)

Utilitarian, for a phone on the counter at arm's length. Cool greys and nothing else; green means "on", amber marks an estimate, the primary action is the brightest neutral. IBM Plex Sans, with 18px body in the sheet. Ingredients are checkable, step numbers are high-contrast discs, and Save / Print / Close are pinned to the bottom edge in thumb reach. The spin ticks through candidate titles like a departures board. Opening the recipe is a fast rise with the card dimming; no flourish.

## C, roulette (`c-roulette/`)

Leans into the name. An aubergine-black room with one gold light, rationed to the three things that are lit: the spin button, the reel's payline, and the vibe you set. Bricolage Grotesque for anything that names something, Archivo for anything you read. The spin is a visible reel that decelerates onto the pick. The vibe selector is a snap-scrolling dial you set rather than a list you choose from. Opening the recipe tips the card away like a paid-out ticket and the sheet rises with a small overshoot. The sheet itself uses no gold at all.

## What to react to

Each `NOTES.md` ends with the one thing that direction most wants a reaction on. Across all three the question is the same: on your phone, at dinner time, which sheet would you actually cook from?

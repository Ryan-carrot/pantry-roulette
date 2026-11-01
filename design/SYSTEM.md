# Pantry Roulette design system

The single reference for the chosen direction. Everything here is also a token in `src/styles/tokens.css`; this document explains the choices. Component inventory and the motion table are completed at the end of the UI rebuild (Phase 7).

## Where it came from

Ryan's phone test of the three mockups in `design/mockups/`: direction C is the skeleton (page layout, reel, card, palette, type, vibe dial, card-to-sheet transition); direction B contributes the recipe sheet's structure (density, 18px body, high-contrast step markers, checkable ingredients, Save / Print / Close pinned at the bottom edge) and the lit-when-saved treatment on the Save button. B's structure is rendered in C's type and colour. Nothing from A.

## Colour

Four hues with assigned roles. Gold is rationed to the things that are "lit"; the sheet uses none of it. Ratios are WCAG 2 contrast against the surface named.

| Token | Value | Role | Contrast |
|---|---|---|---|
| `--surface` | `#100c18` | page | |
| `--elevated` | `#1a1426` | card, sheet, reel, dial, inputs | |
| `--raised` | `#261d38` | pills, ingredient rows, ghost buttons | |
| `--line` | `#3a2f52` | outlines, dividers | |
| `--text-1` | `#fbf6ff` | titles, step numerals, primary text | 18.1 on surface, 16.8 on elevated, 15.0 on raised |
| `--text-2` | `#c9bfdd` | body, measures | 11.0 / 10.2 / 9.1 |
| `--text-3` | `#948aae` | labels, captions, idle reel rows | 6.0 on surface, 5.6 on elevated, 5.0 on raised |
| `--accent` | `#f4c54b` | gold: Spin, the payline, the set vibe, focus rings | 11.9 on surface, 11.0 on elevated |
| `--on-accent` | `#1b1405` | text on gold | 11.3 on accent |
| `--state` | `#5fdc9b` | green: saved, checked | 11.2 on surface, 10.4 on elevated, 9.3 on raised |
| `--on-state` | `#0b1a12` | text on a green fill (checkbox tick) | 11.6 on state |
| `--notice` | `#ff6e6e` | coral: connection and partial-failure notices | 7.1 on surface, 6.6 on elevated |
| `--estimate` | `#e0b35a` | amber: the cook-time estimate marker | 9.6 on surface, 8.9 on elevated |
| `--glow` | `rgba(95,220,155,.35)` | the halo behind a lit Save button; decorative, no contrast requirement | |

Rule of thumb: if something is gold, it is a thing you set or press to make the machine go. If it is green, it is on. If it is coral, something went wrong. Everything else is a shade of the room.

## Type

Two families with clearly different jobs.

- **Bricolage Grotesque** (`--font-display`) for anything that names something: wordmark, recipe titles, the vibes on the dial, reel rows, step numerals, section headings, the Spin label. Weights 700 and 800. At the 96 optical size it tightens and gets more character without turning rounded. Letter-spacing `-0.02em`, line-height 1.05.
- **Archivo** (`--font-body`) for anything you read: body, steps, ingredients, inputs, buttons, pills. Weights 400, 500, 600. Tabular figures so "¾ cup" and "1 tbsp" line up.

| Size | Weight | Family | Use |
|---|---|---|---|
| 34 | 700 | display | sheet title |
| 30 | 700 | display | card title |
| 24 | 800 | display | step numerals |
| 22 | 800 | display | wordmark, section headings |
| 20 | 700 | display | dial labels, reel rows, Spin |
| 18 | 400 | body | sheet body: steps and ingredients, line-height 1.55 (from B) |
| 17 | 400 | body | page body, inputs; buttons at 600 |
| 15 | 400 | body | secondary labels |
| 14 | 400 | body | pills, captions, hints |
| 13 | 400 | body | smallest captions |

Fonts load from Google Fonts with `preconnect` and `display=swap`; the system sans stands in until they arrive.

## Spacing and radius

4 / 6 / 8 / 12 / 16 / 18 / 24 / 32. Content column 560px, centred. Radii: sheet 20, card 14, controls 12, rows 8, pills full.

## Motion

Every duration is a token so feel can be tuned in one place; `--reel-spin` is the one Ryan is most likely to change.

| What | Duration | Easing | Reduced motion |
|---|---|---|---|
| Reel spin: Spin → landed | `--reel-spin` 1700ms target. A linear loop (`reel-loop`, 560ms per copy) runs while data loads, then one decelerating leg of `--reel-land` 900ms lands on the pick. The landing starts no earlier than `spin - land` after Spin, so the total is never under 1700ms. | loop linear, landing `--ease-out` | no loop and no landing; rows appear settled when the pick lands (`'instant'`) |
| Reel with slow data | if the pick arrives so late that landing would end after `--reel-max` 2500ms, the strip jumps to the pick and the card pulses once (`pulse`, 900ms) | | card appears without the pulse |
| Card pay-out (arrival) | `payout` 500ms | `--ease-out` | none |
| Card tip (opening the sheet from the card) | `--card-tip` 260ms, rotateX −14° and 10px lift, fading | `--ease-in` | card dims to 40%, no rotation |
| Sheet rise | `--sheet-rise` 500ms after `--sheet-delay` 120ms; on desktop a 6% rise with a fade | `--ease-overshoot` | appears in place |
| Overlay | `--overlay-fade` 300ms | ease | appears |
| Save lamp | `--save-glow` 220ms on colour, border and box-shadow | ease | instant |
| Hover and toggle feedback | `--quick` 150ms | ease | instant |

## Components

What each one is, the tokens it leans on, and the one CSS detail that is easy to get wrong. Markup lives in `index.html` for the static parts and in `src/ui/*.ts` for the rendered ones.

### Wordmark and tagline (`shell.css`)
`h1.wordmark` in the display face at 22/800 with `font-variation-settings: "opsz" 96`; tagline in text-3 at 14. Tricky bit: the optical-size axis only engages if the Google Fonts request includes the `opsz` range.

### Ingredient field (`shell.css`)
Text input on elevated with a line border, text-1 value, text-3 placeholder, hint beneath in text-3 at 13. Tricky bit: the gold focus ring uses `outline-offset: 2px` so it clears the border.

### Vibe dial (`ui/vibeSelector.ts`, `shell.css`)
A `fieldset` of ten radio inputs, each inside a `label.vibe-item` on a snap-scroll rail (`scroll-snap-type: x mandatory`, items 120px, `padding: 6px calc(50% - 60px)` so the first and last can centre). The radio is visually hidden over the label (`position: absolute; inset: 0; opacity: 0`), so a tap anywhere on the item checks it and the native keyboard behaviour is kept. `:checked + .vibe-name` is the gold "set" state with `on-accent` text; a 2px gold notch above the rail marks the centre. "See all ten" toggles `.vibe-all` on the fieldset, which turns the rail into a 2-column grid (5 on desktop). Tricky bits: centre the set item by setting `rail.scrollLeft`, not `scrollIntoView`, which also moves the page's focus starting point; and intercept Arrow keys yourself with `preventDefault` so the browser's radio stepping does not double-move.

### Spin button (`shell.css`)
Full-width gold, display face 20/800, on-accent text. Disabled while a spin is in flight: raised background, text-3. Tricky bit: the default gold focus ring is invisible on gold, so `:focus-visible` uses text-1 here.

### Surprise me (`shell.css`)
A text link under Spin: text-2 at 15, underlined, text-1 on hover, text-3 and no underline while disabled. It is deliberately not a second gold button; gold is for the machine. Tricky bit: it shares the in-flight guard with Spin, so both disable together.

### Exhausted notice (`ui/resultCard.ts`, `result.css`)
`p.message.exhausted` in text-2: "You've seen everything for these ingredients. Clear history to start over.", with "Clear history" as an inline `button.btn-inline` in gold, underlined. Not coral: nothing is wrong. Clicking clears the seen list and spins again.

### Reel (`ui/reel.ts`, `reel.css`)
A 228px window on elevated with a gold payline at rows 2 of 3 (`top: 76px; height: 76px`) and gradient fades top and bottom. The strip holds 24 rows (6 slots × 4 copies); rows are 76px with a 52px thumbnail and the name in the display face at 20. `.reel.spinning .strip` runs `reel-loop`, one copy (456px) per 560ms. Landing freezes the loop by reading the computed `matrix()` Y, sets it inline, then transitions to `-(16 × 76)px` so the pick in the third copy sits on the payline with a row showing below. Hidden until the first spin. Tricky bit: `ROW_HEIGHT` in the TS and `.row { height }` in the CSS must agree.

### Scroll after a spin (`ui/scroll.ts`)
Not a visual component but part of the card's arrival: focus the result region with `preventScroll`, then one `window.scrollBy` computed from the region's rect so the card's bottom edge sits `--card-scroll-margin` (16px) above the viewport bottom. Measure the region, not the card, because the card's arrival animation transforms it. Smooth unless reduced motion.

### Result card (`ui/resultCard.ts`, `result.css`)
`article.card` on elevated, radius 14: 16:9 image, title 30/700 display, description, three pills on raised (`b` in text-1 for the numbers), then a grid of View recipe (gold `.btn-primary`) and the Save lamp, a full-width ghost "Spin again" beneath, and an optional coral `.search-note`. Arrival: `payout`. When the sheet opens from it the region gets `.away`: `perspective(900px) rotateX(-14deg) translateY(-10px)` fading, with `transform-origin: 50% 0`. Tricky bit: the card's `transition` must stay on `transform` and `opacity` only, or the `.away` tip and the `payout` keyframe fight.

### Save lamp (`result.css`, `sheet.css`)
A ghost button (raised background, text-1) whose `aria-pressed="true"` state is green text, a green border and `box-shadow: 0 0 0 1px var(--state), 0 0 18px var(--glow)`; the heart fills with `currentColor`. In the sheet bar it is the same colour with a `text-shadow` glow. No `filter: blur`, which repaints the whole layer. The favourite card's `.lamp` dot is the same green with a 2px elevated ring and the glow.

### Recipe sheet (`ui/modal.ts`, `sheet.css`)
`position: fixed` bottom sheet, `max-height: 94vh`, flex column: `.sheet-scroll` (image `min(58vw, 240px)`, eyebrow text-3 14, title 34/700 display, meta pills, ingredients, steps, status) and `.sheet-bar`. Body text is 18 with line-height 1.55 (B's density). Ingredient rows are a 28 / 96 / 1fr grid inside a `label`, min-height 52 so they are easy to hit; the custom checkbox is `appearance: none` with a drawn tick in `on-state`; checked rows strike through in text-3. Step markers are 36px text-1 discs with the number in the display face at 20/800. The bar is three equal buttons, 60px tall, `padding-bottom: env(safe-area-inset-bottom)`, on elevated with 1px line gaps. At ≥1024px the sheet becomes a centred 640px panel with the bar rounded at its foot. Tricky bits: `.sheet-scroll { min-height: 0 }` is what lets the body scroll inside the flex column instead of pushing the bar off screen; and the rise transition is on `transform` with the delay in the shorthand, so `.hidden` (display none) must be removed a frame before `.open` is added.

### Saved cards (`ui/favourites.ts`, `favourites.css`)
84px thumbnail, title at 18 with the lamp dot, two-line clamped description in text-2 at 15, a raised "View recipe" button and a 40px remove button that turns coral on hover. At 320px the thumbnail drops to 64px.

### Recently viewed (`ui/recentlyViewed.ts`, `recently.css`)
A horizontal strip of 100px buttons: thumbnail with a 2px transparent border that turns gold on hover and focus, name clamped to two lines at 14. Tricky bit: the buttons need `font: inherit` and `padding: 0` reset because the global button style is for the gold Spin.

### Notices (`base.css`, `result.css`)
`.notice` is coral text, centred, 15. Used for the connection failure and "couldn't load" messages in the result region and for the partial-failure line under the card. Coral is never used for anything that is not a problem.

### Clear seen history (`ui/clearHistory.ts`, `shell.css`)
A text button (text-2, icon, 15/500) with a hint beneath; the text span swaps to "History cleared" for two seconds and the icon stays.

### Footer (`footer.css`)
Text-3 at 14 above a line border; links in text-2 with an underline.

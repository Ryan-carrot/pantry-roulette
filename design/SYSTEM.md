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
| `--text-3` | `#948aae` | labels, captions, idle reel rows | 6.0 on surface, 5.6 on elevated, 4.7 on raised (large text only on raised) |
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
| Reel spin (Spin → landed) | `--reel-spin` 1700ms, of which the last `--reel-land` 900ms decelerates | linear loop, then `--ease-out` | no reel motion; rows appear settled when the pick arrives |
| Reel past `--reel-max` 2500ms (slow data) | none | | card appears with a subtle pulse instead of a landing |
| Card tip (opening the sheet from the card) | `--card-tip` 260ms | `--ease-in` | card dims, no rotation |
| Sheet rise | `--sheet-rise` 500ms, after `--sheet-delay` 120ms | `--ease-overshoot` | appears in place |
| Overlay | `--overlay-fade` 300ms | ease | appears |
| Save glow | `--save-glow` 220ms | ease | instant |
| Hover and toggle feedback | `--quick` 150ms | ease | instant |

## Still to come in Phase 7

Component inventory (what each component is, the tokens it uses, the tricky CSS bit) and the final motion table once the reel's slow-data behaviour is implemented.

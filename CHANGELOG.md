# Changelog

> Versions here are informal and nothing in this directory was ever released. This file is a record of what was built in the sandbox and why, kept so the reasoning survives. The v1.0.x entries at the bottom describe the production app this rebuild started from.

## Final sandbox pass (27 October 2026)

The last build pass. From here the project is a reference implementation and the production app is hand-coded from `handoff/`.

- After a spin the whole card, buttons included, is scrolled into view (Round 3 note). Smooth unless reduced motion.
- Seen recipes are excluded from the pool instead of penalised. When every candidate has been seen the result is its own state, "You've seen everything for these ingredients — clear history to start over", with the clear action inline.
- "Surprise me": a text link under Spin that rolls `random.php`, re-rolls past seen recipes up to three times, caches the roll, and renders through the same reel and card with "— ingredients".
- Servings spike: a measure parser in `core/` and a go verdict in `design/SERVINGS_SPIKE.md` (90.8% of strings yield a quantity). No servings control.
- Handoff finalised: spec §5, §6, §8 rewritten for the final UI, §9 build order added, issues for the post-bug changes, Round 4 in the manual tests.
- 204 tests (was 162).

## UI rebuild against the chosen design (sandbox, late October 2026)

Ryan phone-tested three mockup directions (`design/mockups/`) and chose C as the skeleton with B's recipe sheet structure. `src/ui/`, `src/styles/` and `index.html` were rebuilt against it; `core/`, `api/` and `storage/` are unchanged except for the cook-time estimator.

- Tokens: aubergine-black surfaces, one gold accent rationed to the lit things, green for saved and checked, coral for notices, amber for the estimate. Bricolage Grotesque for anything that names something, Archivo for anything you read, 18px in the sheet. All motion durations are tokens; `--reel-spin` is the one to tune.
- The vibe dial replaces the dropdown: ten radios on a snap-scroll rail, the set one in gold, with a "see all" grid. Native keyboard semantics.
- The spin is a visible reel that runs while candidates load and decelerates onto the pick. It never lands early; past 2.5 s it skips the landing and the card pulses.
- The result card is the pay-out: pills, "View recipe", a Save lamp that lights green with a halo, "Spin again".
- The recipe sheet has B's structure: checkable ingredients with a count, 18px steps with disc numerals, and Save / Print / Close pinned to the bottom edge. Opening it from the card tips the card away.
- Cook-time estimate buckets from the instruction text, shown as "~30–60 min · estimate" or a dash.
- Emoji are gone; coral notices replace them for failures.
- 162 tests (was 132): dial, reel, card, sheet, saved, recent, estimator.

## Rebuild (sandbox, October 2026)

Full rebuild of the production app in TypeScript with tests. Same product, UX, visual identity and vibe engine semantics; new foundations. Everything listed below is reference material for the hand-coded production build, not a shipped release.

### Changed

- Rebuilt on Vite + TypeScript (strict) with Vitest. 100 unit tests cover normalisation, the vibe engine, scoring, the API merge logic, storage and the DOM renderers.
- Code split by responsibility: `api/`, `core/` (pure), `storage/`, `ui/`, `styles/`.
- All colours, radii, shadows, fonts and spacing are CSS custom properties in `tokens.css`.
- The `simple` vibe's `lengthWeight` is 0.3 (was 0.2), so its weights sum to 1.0 like every other profile. This is the one deliberate change to v1 scoring semantics; `simple` could previously never score above 0.9.
- The vibe engine now reads the real instruction text. Keyword and length scoring work for the first time, so vibe scores differentiate recipes instead of sitting at 10 to 20%.
- The result card labels the blended value "score" and the ingredient overlap "X/Y ingredients". Nothing is labelled "match".
- Candidate selection interleaves per-ingredient results before the 30-slot cap, so a fourth or fifth ingredient contributes.
- Recently viewed cards are buttons and work from the keyboard.
- The modal returns focus to whatever opened it on every close path.
- Favourites are capped at 50. The save button tells you when the list is full instead of silently dropping one.
- The print document is built with DOM APIs, survives a blocked pop-up with a visible message, and closes after printing rather than before.
- Reset keeps its icon; the spin button label is the same before and after a spin.
- Dim text (`#5a6a8a`) lifted to `#8292ac` so it clears WCAG AA on the card surface.
- Text on orange surfaces (spin button, skip link, step counters, hover states) is dark navy via a new `--color-on-accent` token: 6.0:1 on the brand orange and 4.7:1 on the pulse end colour, where white was 2.8:1 and 3.6:1.
- Favourites, the seen list and recently viewed are keyed by TheMealDB `idMeal`, falling back to the name only for v1 entries that have none. Two different meals with the same title no longer collide.
- Recipes with no instructions read "No description available." instead of "A delicious meal worth trying.".
- "Reset Suggestions" is now "Clear seen history", with a hint explaining that it lets previously shown recipes come back and a "History cleared" confirmation. The button never generated suggestions.

### Removed

- The "30 mins" cook time. TheMealDB provides no cook time; v1 hardcoded it. See REPORT.md for an honest estimation proposal.
- The unused local recipe database (`recipes.js`) and the dead `filterRecipes` path.
- `innerHTML` rendering. Every dynamic node is built with `createElement` and `textContent`.
- Debug logging.

### Fixed

Ranking ties (common when ingredient overlap is zero) are now broken by matched count, then name, so the same input gives the same pick on a cold spin and on a cached spin. Before, the pick depended on candidate pool order and could change after clearing history.

All 23 items from the rebuild handoff; see [BUGS_RESOLVED.md](BUGS_RESOLVED.md). In short: instructions never reaching the vibe engine, unencoded ingredients, the misleading "% match" pill, the favourites remove handler, missing focus return, unguarded `JSON.parse`, markup injection from recipe names, the fabricated cook time, uncapped favourites, console noise, label drift, mixed indentation, the ingredient-starving cap, the unreachable fallback and silent crash on an empty pool, network errors shown as "no results", concurrent spins, print window crashes, mouse-only recently viewed cards, the discarded `idMeal`, spin scores leaking into storage, the Fazier link, CRLF churn, and dead CSS.

### Added

- `prefers-reduced-motion` support.
- A 15 s timeout on every TheMealDB request.
- A per-session cache of normalised lookups in `sessionStorage`, keyed by `idMeal`. A repeat spin with overlapping candidates makes no lookup calls for them.
- A status line under the result naming any ingredient whose search failed, when the spin still found a recipe.
- A GitHub Pages deploy workflow, later removed along with `CNAME`, the sitemap and the social meta tags when the project was reframed as local-only.
- A connection-failure message distinct from "nothing found".
- Validation and upgrade of v1 localStorage entries on read.
- `ROADMAP.md` with the experiments to run next.
- Google Fonts preconnect, a `<noscript>` notice, `.editorconfig`, `.gitattributes`.

## [1.0.1] — 2026-06-14

### Added

- Print recipe button in the modal with a clean print layout.
- Recently viewed recipes section with localStorage persistence.

## [1.0.0] — 2026-04-26

### Added

- Initial release: ingredient search against TheMealDB, ten vibes, favourites, seen-recipe tracking with reset, full-recipe modal with focus trap, accessibility audit, Open Graph image, custom domain.

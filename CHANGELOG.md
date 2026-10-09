# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [2.0.0] — Unreleased

Full rebuild. Same product, UX, visual identity and vibe engine semantics; new foundations.

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

### Removed

- The "30 mins" cook time. TheMealDB provides no cook time; v1 hardcoded it. See REPORT.md for an honest estimation proposal.
- The unused local recipe database (`recipes.js`) and the dead `filterRecipes` path.
- `innerHTML` rendering. Every dynamic node is built with `createElement` and `textContent`.
- Debug logging.

### Fixed

All 23 items from the rebuild handoff; see [BUGS_RESOLVED.md](BUGS_RESOLVED.md). In short: instructions never reaching the vibe engine, unencoded ingredients, the misleading "% match" pill, the favourites remove handler, missing focus return, unguarded `JSON.parse`, markup injection from recipe names, the fabricated cook time, uncapped favourites, console noise, label drift, mixed indentation, the ingredient-starving cap, the unreachable fallback and silent crash on an empty pool, network errors shown as "no results", concurrent spins, print window crashes, mouse-only recently viewed cards, the discarded `idMeal`, spin scores leaking into storage, the Fazier link, CRLF churn, and dead CSS.

### Added

- `prefers-reduced-motion` support.
- A 15 s timeout on every TheMealDB request.
- A connection-failure message distinct from "nothing found".
- Validation and upgrade of v1 localStorage entries on read.
- Google Fonts preconnect, a `<noscript>` notice, `.editorconfig`, `.gitattributes`.

## [1.0.1] — 2026-06-14

### Added

- Print recipe button in the modal with a clean print layout.
- Recently viewed recipes section with localStorage persistence.

## [1.0.0] — 2026-04-26

### Added

- Initial release: ingredient search against TheMealDB, ten vibes, favourites, seen-recipe tracking with reset, full-recipe modal with focus trap, accessibility audit, Open Graph image, custom domain.

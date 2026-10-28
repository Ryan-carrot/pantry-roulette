# Pantry Roulette (sandbox rebuild)

## What this is

A local, experimental rebuild of [Pantry Roulette](https://github.com/Ryan-carrot/pantry-roulette). The git remote has been removed and nothing here is deployed or published. Its purpose is to work out the logic, behaviour and eventually a redesigned UI so that Ryan can hand-code the production app himself, in the public repo. The code and docs in this directory are written for a person to read and rebuild from, not for end users.

The deliverable is the handoff pack in [`handoff/`](handoff/). Start there if you are here to build.

What the app does: you type a comma-separated list of ingredients, pick one of ten vibes (Lazy, Impressive, Hearty, Fun, Healthy, Comfort, Fancy, Elegant, Classic, Simple) and spin. It asks [TheMealDB](https://www.themealdb.com) for meals containing each ingredient, merges and dedups the hits, fetches details for up to 30, scores each one 50/50 on ingredient overlap and vibe fit, leaves out recipes you have already been shown (and says so when you have seen them all), and renders the best pick. "Surprise me" skips the input and rolls a random recipe instead. Favourites, a seen list and a recently-viewed strip live in localStorage. No backend, no account.

## Run and test

```sh
npm install
npm run dev        # http://localhost:5173
npm test           # vitest run (204 tests)
npm run typecheck  # tsc --noEmit
npm run build      # tsc --noEmit && vite build → dist/ (local check only)
npm run preview    # serve dist/ on http://localhost:4173
```

## Stack

- [Vite](https://vite.dev) vanilla TypeScript template, TypeScript in strict mode (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`)
- [Vitest](https://vitest.dev) for unit tests, happy-dom for the DOM tests
- No UI framework, no component library, no CSS framework
- Google Fonts: Bricolage Grotesque (display) and Archivo (body)

The production app is vanilla JavaScript with no build step. The handoff spec says, item by item, what changes when you carry each piece across without TypeScript or a bundler.

## Architecture

```
src/
  main.ts                 bootstrap: wires storage, API, UI and the spin flow
  types.ts                Recipe, ScoredRecipe, VibeKey, VibeProfile, MealDB shapes
  api/mealdb.ts           fetch client (injected fetch, 15s timeout), interleave, dedup, cap
  api/loadRecipes.ts      stubs → recipes via the session cache, one lookup per unseen id
  api/surprise.ts         one random recipe, re-rolled up to three times past seen ones, cached
  core/cookTime.ts        duration phrases → under-30 / 30-60 / over-60 bucket, or null (pure)
  core/identity.ts        recipeKey / sameRecipe / isSeen: id with name fallback for v1 entries
  core/normalize.ts       MealDB meal → Recipe (pure)
  core/vibes.ts           vibeProfiles (from v1, one weight retuned) + scoreRecipeForVibe (pure)
  core/scoring.ts         parseIngredients, overlap, blend, seen exclusion, tiebreak, pick → pick / exhausted / empty (pure)
  core/measurements.ts    measure string → quantity and unit; the servings spike, not wired (pure)
  storage/                typed localStorage wrappers; every read is guarded and validated
  ui/el.ts                typed createElement helper and inline SVG icons
  ui/vibeSelector.ts      the vibe dial: ten radios on a snap-scroll rail, with a "see all" grid
  ui/reel.ts              the spin reel: skeleton rows, fed by candidates, lands on the pick or pulses
  ui/resultCard.ts        the pay-out card: pills, View recipe, the Save lamp, Spin again, notices, the exhausted state
  ui/scroll.ts            bring the whole card into view after a spin
  ui/clearHistory.ts      "Clear seen history" button with its two-second confirmation
  ui/favourites.ts        favourite cards
  ui/recentlyViewed.ts    recently viewed buttons
  ui/modal.ts             recipe sheet: checkable ingredients, numbered steps, pinned Save / Print / Close, focus trap and return
  ui/print.ts             standalone print document built with DOM APIs
  styles/tokens.css       every colour, size, radius and motion value (see design/SYSTEM.md)
  styles/*.css            one file per component; no raw hex outside tokens.css and print.css
tests/                    one file per module; mealdb tests mock fetch, storage tests use a memory store
handoff/                  the hand-code pack: spec, decisions, issues to create, reference map
```

Everything under `core/` and the merge/dedup logic in `api/` is pure: no DOM, no `localStorage`, no network. That is what makes it testable, and it is the part most worth carrying across unchanged. Nothing in `src/` uses `innerHTML`.

### Storage keys

Unchanged from v1 so existing data carries over.

| Key | Shape | Cap |
|---|---|---|
| `pantryRouletteFavorites` | `Recipe[]`, insertion order | 50 (new; the save button tells you when it is full) |
| `pantryRouletteSeenRecipes` | `string[]` of ids (names for v1 entries), oldest first | 20 |
| `pantryRouletteRecentlyViewed` | `Recipe[]`, newest first | 5 |
| `pantryRouletteLookup:<id>` (sessionStorage) | one normalised `Recipe` per TheMealDB id | none; cleared with the tab |

Identity is the TheMealDB `id`; v1 entries (no `id`, no `instructions`, extra score fields) are read and upgraded on the fly and matched by name. Corrupt values are ignored, not thrown.

## Design decisions

Every decision made during the rebuild, with its reasoning, is in [`handoff/DECISIONS.md`](handoff/DECISIONS.md). The longer narrative is in [`REPORT.md`](REPORT.md). New decisions go in `DECISIONS.md` with a why.

## Other docs

- [`design/SYSTEM.md`](design/SYSTEM.md): the design system the UI is built on; tokens, type, motion, components.
- [`design/SERVINGS_SPIKE.md`](design/SERVINGS_SPIKE.md): can MealDB measures be scaled? Go, with caveats; nothing built.
- [`design/mockups/`](design/mockups/): the three directions Ryan chose from.
- [`handoff/`](handoff/): the pack to take to the production repo.
- [`BUGS_RESOLVED.md`](BUGS_RESOLVED.md): the 24 bugs, each mapped to the commit and file that fixes it. Primary input to the hand-code spec.
- [`REPORT.md`](REPORT.md): builder notes, disagreements with the scout handoff, open questions.
- [`CHANGELOG.md`](CHANGELOG.md): what was built and why, as an informal record.
- [`ROADMAP.md`](ROADMAP.md): experiments to run next, starting with the redesign.
- [`docs/MANUAL_TEST.md`](docs/MANUAL_TEST.md): Ryan's manual test rounds and results; Round 3 covers the redesigned UI.

## Manual smoke test

See `docs/MANUAL_TEST.md`, Rounds 3 and 4. It covers the spin, the dial, the sheet, a keyboard-only walk, reduced motion, and two break-it-on-purpose checks, each with the expected result.

## Licence

MIT

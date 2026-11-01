# Pantry Roulette

Tell it what's in your fridge, pick a vibe, and let it spin up a meal you can actually make tonight.

**[pantryroulette.com](https://pantryroulette.com)**

## What it does

Type the ingredients you have, separated by commas, set the vibe dial (Lazy, Simple, Comfort, Hearty, Healthy, Fun, Classic, Fancy, Elegant, Impressive) and hit Spin. The reel runs through real recipes from [TheMealDB](https://www.themealdb.com) that use your ingredients and lands on the one that best fits both your pantry and your mood. Open it and you get everything you need to cook from your phone: ingredients you can tick off as they go in the pan, numbered steps in large type, a rough cook-time estimate, and Save, Print and Close within reach of your thumb. It won't show you the same recipe twice until you clear your history, and "Surprise me" skips the typing altogether. Saved recipes and your recent picks stay on your device; there is no account.

## How this was built

Ryan wrote the design brief and the spec, built the v1 app by hand, and ran a code review of it. He then directed AI agents (Claude Code) through a phased rebuild in TypeScript, with tests written at every phase and four rounds of manual QA on a real phone between passes. The process is all in the repo: the brief, the three design directions he chose between and the resulting design system in [`design/`](design/), the decision log and manual test rounds in [`docs/`](docs/), every v1 bug and the commit that fixed it in [`BUGS_RESOLVED.md`](BUGS_RESOLVED.md), and the commit history itself. The core logic modules are being rewritten by hand as ongoing ownership work, with the test suite as the contract.

## Stack

- [Vite](https://vite.dev) with vanilla TypeScript in strict mode (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`)
- [Vitest](https://vitest.dev) for unit tests, with happy-dom for the DOM tests
- No UI framework, component library or CSS framework
- Google Fonts: Bricolage Grotesque (display) and Archivo (body)
- Static build, hosted on GitHub Pages

## Architecture

```
src/
  main.ts                 wires storage, API and UI together; the spin and surprise flows
  types.ts                Recipe, ScoredRecipe, VibeKey, VibeProfile, MealDB shapes
  api/mealdb.ts           fetch client (15s timeout), interleave, dedup, cap
  api/loadRecipes.ts      candidates → recipes via the session cache
  api/surprise.ts         one random recipe, re-rolled past ones you've seen
  core/normalize.ts       MealDB meal → Recipe
  core/vibes.ts           the ten vibe profiles and the vibe score
  core/scoring.ts         ingredient overlap, blend, seen exclusion, tiebreak, pick
  core/identity.ts        recipe identity by id, with a name fallback for old saves
  core/cookTime.ts        instruction text → under 30 / 30–60 / over 60 min estimate
  core/measurements.ts    measure string → quantity and unit (groundwork for servings)
  storage/                localStorage and sessionStorage wrappers; every read guarded and validated
  ui/                     dial, reel, result card, recipe sheet, saved, recent, print
  styles/tokens.css       every colour, size, radius and motion value
  styles/*.css            one file per component
tests/                    one file per module
```

Everything under `core/` and the merge logic in `api/` is pure: no DOM, no storage, no network. Nothing in `src/` uses `innerHTML`. The design system behind `styles/` is documented in [`design/SYSTEM.md`](design/SYSTEM.md).

Storage keys are unchanged from v1, so existing favourites carry over:

| Key | Holds | Cap |
|---|---|---|
| `pantryRouletteFavorites` | saved recipes | 50 |
| `pantryRouletteSeenRecipes` | ids of recipes already shown | 20 |
| `pantryRouletteRecentlyViewed` | the last picks, newest first | 5 |
| `pantryRouletteLookup:<id>` (session) | one cached recipe per TheMealDB id | cleared with the tab |

## Running locally

```sh
npm install
npm run dev        # http://localhost:5173
npm test           # vitest run
npm run typecheck  # tsc --noEmit
npm run build      # typecheck, then vite build → dist/
npm run preview    # serve dist/ on http://localhost:4173
```

The manual test rounds, with expected results, are in [`docs/MANUAL_TEST.md`](docs/MANUAL_TEST.md). What changed in each release is in [`CHANGELOG.md`](CHANGELOG.md) and what comes next is in [`ROADMAP.md`](ROADMAP.md).

## License

Source is public for reference and portfolio purposes. All rights reserved; see [LICENSE](LICENSE).

## Contact

Built by Ryan Christian. Questions and feedback: [support@pantryroulette.com](mailto:support@pantryroulette.com).

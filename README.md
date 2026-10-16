# Pantry Roulette (sandbox rebuild)

## What this is

A local, experimental rebuild of [Pantry Roulette](https://github.com/Ryan-carrot/pantry-roulette). The git remote has been removed and nothing here is deployed or published. Its purpose is to work out the logic, behaviour and eventually a redesigned UI so that Ryan can hand-code the production app himself, in the public repo. The code and docs in this directory are written for a person to read and rebuild from, not for end users.

The deliverable is the handoff pack in [`handoff/`](handoff/). Start there if you are here to build.

What the app does: you type a comma-separated list of ingredients, pick one of ten vibes (Lazy, Impressive, Hearty, Fun, Healthy, Comfort, Fancy, Elegant, Classic, Simple) and spin. It asks [TheMealDB](https://www.themealdb.com) for meals containing each ingredient, merges and dedups the hits, fetches details for up to 30, scores each one 50/50 on ingredient overlap and vibe fit, penalises recipes you have already been shown, and renders the best pick. Favourites, a seen list and a recently-viewed strip live in localStorage. No backend, no account.

## Run and test

```sh
npm install
npm run dev        # http://localhost:5173
npm test           # vitest run (132 tests)
npm run typecheck  # tsc --noEmit
npm run build      # tsc --noEmit && vite build → dist/ (local check only)
npm run preview    # serve dist/ on http://localhost:4173
```

## Stack

- [Vite](https://vite.dev) vanilla TypeScript template, TypeScript in strict mode (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`)
- [Vitest](https://vitest.dev) for unit tests, happy-dom for the DOM tests
- No UI framework, no component library, no CSS framework
- Google Fonts: Fredoka One and Nunito

The production app is vanilla JavaScript with no build step. The handoff spec says, item by item, what changes when you carry each piece across without TypeScript or a bundler.

## Architecture

```
src/
  main.ts                 bootstrap: wires storage, API, UI and the spin flow
  types.ts                Recipe, ScoredRecipe, VibeKey, VibeProfile, MealDB shapes
  api/mealdb.ts           fetch client (injected fetch, 15s timeout), interleave, dedup, cap
  api/loadRecipes.ts      stubs → recipes via the session cache, one lookup per unseen id
  core/identity.ts        recipeKey / sameRecipe / isSeen: id with name fallback for v1 entries
  core/normalize.ts       MealDB meal → Recipe (pure)
  core/vibes.ts           vibeProfiles (from v1, one weight retuned) + scoreRecipeForVibe (pure)
  core/scoring.ts         parseIngredients, ingredient overlap, blend, seen penalty, tiebreak, pick (pure)
  storage/                typed localStorage wrappers; every read is guarded and validated
  ui/el.ts                typed createElement helper and inline SVG icons
  ui/resultCard.ts        result region, save and view buttons, messages
  ui/clearHistory.ts      "Clear seen history" button with its two-second confirmation
  ui/favourites.ts        favourite cards
  ui/recentlyViewed.ts    recently viewed buttons
  ui/modal.ts             recipe modal: fill, focus trap, focus return, Escape, backdrop
  ui/print.ts             standalone print document built with DOM APIs
  styles/tokens.css       every colour, radius, shadow, font and spacing value
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

- [`handoff/`](handoff/): the pack to take to the production repo.
- [`BUGS_RESOLVED.md`](BUGS_RESOLVED.md): the 24 bugs, each mapped to the commit and file that fixes it. Primary input to the hand-code spec.
- [`REPORT.md`](REPORT.md): builder notes, disagreements with the scout handoff, open questions.
- [`CHANGELOG.md`](CHANGELOG.md): what was built and why, as an informal record.
- [`ROADMAP.md`](ROADMAP.md): experiments to run next, starting with the redesign.
- [`MANUAL_TEST.md`](MANUAL_TEST.md): Ryan's manual test rounds and results.

## Manual smoke test

Run `npm run dev`, then:

1. Spin with one ingredient (`chicken`). A result appears, focus moves to it, the spin button reads "Spin the Pantry 🎰" again. Click "Clear seen history": it reads "History cleared" for two seconds, keeps its icon, and `pantryRouletteSeenRecipes` is gone from localStorage.
2. Spin with three (`chicken, rice, garlic`) and five (`beef, potato, onion, carrot, tomato`). The ingredients pill should reflect overlap and later ingredients should influence the pick.
3. Cycle all ten vibes with the same ingredients. Lazy and Simple should favour short recipes, Impressive long ones; the vibe pill should move.
4. Save a favourite. The button turns green and disables; the card appears under "Your Favorites". Remove it by clicking the × icon itself; the save button on the result card flips back.
5. Keyboard only: Tab to a "Recently viewed" card, press Enter or Space. The modal opens with focus on the close button. Tab wraps between print and close. Escape closes it and focus lands back on the card you came from.
6. Open the modal from "View Full Recipe" and press Print. A new window with the Arial-on-white layout opens and the print dialog appears. Block pop-ups and try again: the modal shows a status line instead of throwing.
7. DevTools → Application → Local Storage → set the `pantryRouletteFavorites` value to `garbage` and reload. The page loads, favourites are empty, nothing is thrown.
8. Spin with an empty input: "Enter at least one ingredient". Spin with `unobtainium`: "Nothing found". Go offline and spin: the connection message. In DevTools → Network, block the exact URL `https://www.themealdb.com/api/json/v1/1/filter.php?i=garlic` and spin `chicken, garlic, lemon`: the result appears with "Couldn't search for: garlic" underneath.
9. Spin twice with the same ingredients and watch the Network tab: the second spin makes no `lookup.php` requests and picks the same recipe.
10. Resize to 320, 400 and 600 px. Nothing overflows; the modal is a bottom sheet below 600 and a centred card above.
11. Enable "reduce motion" in the OS. The spin pulse, card slide and modal fade are gone.

## Licence

MIT

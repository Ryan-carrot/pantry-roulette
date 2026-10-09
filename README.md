# Pantry Roulette

Tell it what's in your fridge, pick a vibe, and let it spin up a meal you can actually make tonight.

Live at [pantryroulette.com](https://pantryroulette.com). This is the v2 rebuild: same product, same look, same vibe engine, rebuilt in TypeScript with tests and the v1 bugs fixed. See [CHANGELOG.md](CHANGELOG.md) for the list and [ROADMAP.md](ROADMAP.md) for what comes next.

## How it works

1. Type a comma-separated list of ingredients and pick one of ten vibes (Lazy, Impressive, Hearty, Fun, Healthy, Comfort, Fancy, Elegant, Classic, Simple).
2. The app asks [TheMealDB](https://www.themealdb.com) for meals containing each ingredient, interleaves the lists so every ingredient gets a fair share, dedups, and fetches full details for up to 30 of them.
3. Each candidate is scored 50/50 on ingredient overlap and vibe fit (keywords in the instructions, ingredient count, instruction length). Recipes you have already been shown are penalised so you get variety.
4. The top pick is shown with the image, a short description, and three pills: how many of your ingredients it uses, the blended score, and the vibe score.
5. Save it to favourites, open the full recipe (ingredients with measurements, numbered steps, print button), or spin again. The last five picks sit in a "Recently viewed" strip.

Everything is stored in your browser's localStorage. There is no backend and no account.

## Stack

- [Vite](https://vite.dev) with the vanilla TypeScript template
- TypeScript in strict mode (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`)
- [Vitest](https://vitest.dev) for unit tests, with happy-dom for the DOM tests
- No UI framework, no component library, no CSS framework
- Google Fonts: Fredoka One and Nunito
- Builds to a static `dist/` for GitHub Pages

## Run, test, build

```sh
npm install
npm run dev        # http://localhost:5173
npm test           # vitest run
npm run typecheck  # tsc --noEmit
npm run build      # tsc --noEmit && vite build  → dist/
npm run preview    # serve dist/ locally
```

## Architecture

```
src/
  main.ts                 bootstrap: wires storage, API, UI and the spin flow
  types.ts                Recipe, ScoredRecipe, VibeKey, VibeProfile, MealDB shapes
  api/mealdb.ts           fetch client (injected fetch, 15s timeout), interleave, dedup, cap
  api/loadRecipes.ts      stubs → recipes via the session cache, one lookup per unseen id
  core/identity.ts        recipeKey / sameRecipe / isSeen: id with name fallback for v1 entries
  core/normalize.ts       MealDB meal → Recipe (pure)
  core/vibes.ts           vibeProfiles (verbatim from v1) + scoreRecipeForVibe (pure)
  core/scoring.ts         parseIngredients, ingredient overlap, blend, seen penalty, pick (pure)
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
```

Everything under `core/` and the merge/dedup logic in `api/` is pure: no DOM, no `localStorage`, no network. That is what makes it testable. Nothing in `src/` uses `innerHTML`.

### localStorage keys

Unchanged from v1 so existing data carries over.

| Key | Shape | Cap |
|---|---|---|
| `pantryRouletteFavorites` | `Recipe[]`, insertion order | 50 (new in v2; the save button tells you when it is full) |
| `pantryRouletteSeenRecipes` | `string[]` of names, oldest first | 20 |
| `pantryRouletteRecentlyViewed` | `Recipe[]`, newest first | 5 |
| `pantryRouletteLookup:<id>` (sessionStorage) | one normalised `Recipe` per TheMealDB id | none; cleared with the tab |

Identity is the TheMealDB `id`; v1 entries (no `id`, no `instructions`, extra score fields) are read and upgraded on the fly and matched by name. Corrupt values are ignored, not thrown.

## Manual smoke test

Run `npm run dev`, then:

1. Spin with one ingredient (`chicken`). A result appears, focus moves to it, the spin button reads "Spin the Pantry 🎰" again. Click "Clear seen history": it reads "History cleared" for two seconds, keeps its icon, and `pantryRouletteSeenRecipes` is gone from localStorage.
2. Spin with three (`chicken, rice, garlic`) and five (`beef, potato, onion, carrot, tomato`). The ingredients pill should reflect overlap and later ingredients should influence the pick.
3. Cycle all ten vibes with the same ingredients. Lazy and Simple should favour short recipes, Impressive long ones; the vibe pill should move.
4. Save a favourite. The button turns green and disables; the card appears under "Your Favorites". Remove it by clicking the × icon itself; the save button on the result card flips back.
5. Keyboard only: Tab to a "Recently viewed" card, press Enter or Space. The modal opens with focus on the close button. Tab wraps between print and close. Escape closes it and focus lands back on the card you came from.
6. Open the modal from "View Full Recipe" and press Print. A new window with the Arial-on-white layout opens and the print dialog appears. Block pop-ups and try again: the modal shows a status line instead of throwing.
7. In DevTools, set `localStorage.pantryRouletteFavorites = '{broken'` and reload. The page loads, favourites are empty, nothing is thrown.
8. Spin with an empty input: "Enter at least one ingredient". Spin with `unobtainium`: "Nothing found". Go offline and spin: the connection message. Block one ingredient's `filter.php` request in DevTools and spin with two: the result appears with "Couldn't search for: ..." underneath.
9. Spin twice with the same ingredients and watch the Network tab: the second spin makes no `lookup.php` requests.
10. Resize to 320, 400 and 600 px. Nothing overflows; the modal is a bottom sheet below 600 and a centred card above.
11. Enable "reduce motion" in the OS. The spin pulse, card slide and modal fade are gone.

## Licence

MIT

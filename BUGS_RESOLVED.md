# Bugs resolved

Every item from HANDOFF.md §11, with the commit and file that addresses it.
Commits are on the `rebuild/v2` branch.

| Commit | Phase |
|---|---|
| `e92c836` | 0, scaffold |
| `21f6b03` | 1, types and pure core |
| `c72eb8b` | 2, API layer |
| `3a3c973` | 3, storage |
| `c8532d9` | 4, UI |

| # | Bug | Status | Where |
|---|---|---|---|
| 1 | `instructions` never populated, vibe engine only saw titles | Fixed | `21f6b03` `src/core/normalize.ts` keeps the raw text; `tests/vibes.test.ts` proves lazy and impressive now rank short and long instructions oppositely |
| 2 | No `encodeURIComponent`, no empty-entry filter | Fixed | `c72eb8b` `src/api/mealdb.ts` encodes every ingredient and id; `21f6b03` `parseIngredients` in `src/core/scoring.ts` drops blanks and duplicates |
| 3 | "% match" pill showed the blended score | Fixed | `c8532d9` `src/ui/resultCard.ts`: "X/Y ingredients" is the overlap, the blend is labelled "score", and nothing says "match" |
| 4 | Favourites remove handler relied on `pointer-events:none` and a broken `closest()` | Fixed | `c8532d9` `src/ui/favourites.ts` reads `event.currentTarget.dataset.name`; `tests/ui.test.ts` clicks the SVG inside the button |
| 5 | Modal did not return focus | Fixed | `c8532d9` `src/ui/modal.ts` returns focus to the trigger on close button, Escape and backdrop click; tested for all three |
| 6 | Unguarded `JSON.parse` broke page load | Fixed | `3a3c973` `src/storage/storage.ts` wraps reads in try/catch; `src/storage/recipeCodec.ts` validates shape and discards entries without a name |
| 7 | `innerHTML` with interpolated API strings | Fixed | `c8532d9` `src/ui/el.ts` and every renderer build DOM with `createElement`/`textContent`; `grep innerHTML src` is empty and tests feed `<b>` and `"` through names |
| 8 | Hardcoded 30-minute cook time | Fixed | `21f6b03` drops `time` from `Recipe`; `c8532d9` removes the pill from card, modal, favourites and print. Estimation is deferred to REPORT.md |
| 9 | Favourites had no cap | Fixed | `3a3c973` `src/storage/favourites.ts` caps at 50 and returns `'full'` so the UI can say so instead of silently dropping one |
| 10 | Debug `console.log` | Fixed | No `console.*` anywhere in `src/` |
| 11 | Button labels drifted between HTML and JS | Fixed | `c8532d9` `src/main.ts` reads the idle labels from the HTML; reset keeps its SVG and swaps only a text span; the save button uses one saved label in both paths |
| 12 | Mixed indentation, typos, stray `};` | Fixed | Whole rebuild in TypeScript with `.editorconfig` (`e92c836`); `tsc --noEmit` is clean |
| 13 | 30-slot cap filled in input order, starving later ingredients | Fixed | `c72eb8b` `interleave` and `mergeCandidates` in `src/api/mealdb.ts`; test asserts 4 × 10 capped to 30 gives each ingredient at least 7 |
| 14 | Unreachable fallback and silent crash on an empty pool | Fixed | `21f6b03` `pickRecipe` returns `null` for an empty pool and the random fallback is reachable and tested; `c8532d9` `src/main.ts` renders a message for the null case |
| 15 | Network errors indistinguishable from "no results" | Fixed | `c72eb8b` client throws on non-ok or malformed responses and `findCandidates` reports `failedIngredients`; `c8532d9` shows a connection message when every ingredient failed. Partial failures (some ingredients down) still proceed with what came back |
| 16 | Concurrent spins via keyboard | Fixed | `c8532d9` `src/main.ts` disables the button while in flight and guards with `spinInFlight` |
| 17 | Print window could be `null`; `document.write`; closed before dialog | Fixed | `c8532d9` `src/ui/print.ts` returns false on a null window (modal shows a status line), builds the document with DOM APIs and closes on `afterprint` |
| 18 | Recently viewed cards mouse-only | Fixed | `c8532d9` `src/ui/recentlyViewed.ts` renders `<button>` elements |
| 19 | `idMeal` discarded | Fixed | `21f6b03` captures `id` on every recipe; identity commit `src/core/identity.ts` (`recipeKey`, `sameRecipe`, `isSeen`) keys favourites, seen and recently viewed by id, falling back to name only for legacy v1 entries that have none. Two meals sharing a title no longer collide; existing localStorage keeps working with no migration |
| 20 | Spin scores persisted into favourites and recently viewed | Fixed | `21f6b03` `ScoredRecipe` wraps a `Recipe` instead of extending it; `3a3c973` `toStoredRecipe` writes only the `Recipe` shape |
| 21 | Fazier link without `rel=noopener`, doubled slash | Fixed | `c8532d9` `index.html` |
| 22 | CRLF churn, no `.gitattributes`, `favicon_io.zip` in root, no preconnect, no noscript | Fixed, one leftover | `e92c836` adds `.gitattributes` (`* text=auto eol=lf`), `.editorconfig`, ignores for the zip and `Zone.Identifier` files; `c8532d9` adds preconnect and noscript. The zip and the old v1 source files are still in the working tree because this session could not delete them; see REPORT.md |
| 23 | Dead statements and duplicate selectors | Fixed | Not reproduced in the rebuilt stylesheets |
| 24 | Nondeterministic pick on tied scores (found in manual testing, not in the handoff): `chicken, garlic, lemon` gave "Banana Pancakes" cold and "Apple Pie" after clearing history | Fixed | `2db8941` `compareScored` in `src/core/scoring.ts` orders by blended score desc, matched count desc, name asc; `tests/spin.test.ts` runs the cold and cached paths with different lookup timing and asserts the same pick. `src/api/loadRecipes.ts` was already in candidate order on both paths, now pinned by tests |

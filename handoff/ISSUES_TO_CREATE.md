# Issues to create

The twelve `BUGS_RESOLVED.md` rows that have no GitHub issue yet (#13 to #24), each formatted like your Sprint 7 issues: title, labels, body with the code context, a fix, and acceptance criteria. Suggested milestone for all of them: **Sprint 7 — v1.0.2 Bug Fix Release**, or a Sprint 8 if you want to keep Sprint 7 as the code-review set. Labels are from your existing label set.

Line references are to the v1.0.1 files (`ed443d1`). An appendix at the end covers two older rows (#7, #9) that also have no issue.

---

## Candidate cap starves later ingredients (BUGS_RESOLVED #13)

**Labels:** `bug`, `api`

In `app.js`, `fetchRecipesByIngredients()` (lines 14 to 33) caps each ingredient's results at 10, concatenates the lists in input order, and dedups. The spin handler (line 558) then takes the first 30 of that list for detail lookups:

```javascript
const detailPromises = rawMeals.slice(0, 30).map(meal => fetchRecipeDetails(meal.idMeal));
```

With four ingredients that each return 10 unique meals, the first three fill all 30 slots and the fourth never contributes. The pool is biased toward whatever the user typed first.

**Fix:** Interleave the per-ingredient lists round-robin (first of each, then second of each, ...) before dedup, then apply the cap. Dedup before capping so a meal that appears under two ingredients does not take two slots. Reference: sandbox `src/api/mealdb.ts`, `interleave()` and `mergeCandidates()`.

**Acceptance Criteria:**
- [ ] With 4 ingredients × 10 results each and a cap of 30, every ingredient contributes at least 7 candidates
- [ ] Duplicate `idMeal`s are removed before the cap, first occurrence wins
- [ ] A 5-ingredient spin produces results that include meals from the 5th ingredient
- [ ] Unit test covers the 4 × 10 → 30 case

---

## Unreachable fallback and silent crash on empty pool (BUGS_RESOLVED #14)

**Labels:** `bug`, `robustness`

In the spin handler (`app.js` lines 593 to 597):

```javascript
const pick = scored.length > 0
  ? scored[0]
  : normalized[Math.floor(Math.random() * normalized.length)];
```

Two problems. First, because every vibe profile gives a non-zero score to any recipe with at least one ingredient, `scored` is never empty while `normalized` is non-empty, so the random fallback is unreachable; if it were reached, `pick.matchedCount` would be `undefined` and the pill would read "undefined/12 ingredients". Second, if every detail lookup fails, `normalized` is empty, the fallback indexes an empty array, `pick` is `undefined`, and `pick.name` throws an uncaught `TypeError`. The button has already been restored by then and the user sees nothing happen.

**Fix:** Make picking a function that returns `null` for an empty pool. The handler shows a "couldn't load any recipes, try again" message for `null`. The random fallback should produce a fully scored object (with `matchedCount`) and take the random function as a parameter so it can be tested. Reference: sandbox `src/core/scoring.ts`, `pickRecipe()`.

**Acceptance Criteria:**
- [ ] `pickRecipe([])` returns `null` and nothing throws
- [ ] The UI shows a visible message when the pick is `null`
- [ ] The random fallback returns an object with `matchedCount` set
- [ ] Unit tests for the empty pool and the fallback path

---

## Distinguish network failure from no results (BUGS_RESOLVED #15)

**Labels:** `bug`, `api`, `robustness`

`fetchRecipesByIngredient()` and `fetchRecipeDetails()` (`app.js` lines 1 to 12 and 35 to 46) never check `response.ok` and `catch` every error into `[]` or `null`:

```javascript
} catch (error) {
  console.error("Error fetching recipes:", error);
  return [];
}
```

A dead network, a 500 from TheMealDB, and a genuinely empty result all reach the handler as "no meals", so the user sees "😬 Nothing found" when the real problem is their connection. `Promise.all` also means one failed ingredient request discards the results of the others.

**Fix:** Throw on `!response.ok` and on an unexpected body shape. Use `Promise.allSettled` for the per-ingredient calls and collect which ingredients failed. In the handler: if every ingredient failed, show a connection-failure message; if some failed but candidates exist, continue and show a "Couldn't search for: ..." line under the result; if none failed and the pool is empty, show "Nothing found". Add a request timeout (`AbortSignal.timeout(15000)`) so a stalled request becomes a failure instead of a hang. Reference: sandbox `src/api/mealdb.ts` (`findCandidates`), `src/main.ts` (the message branches).

**Acceptance Criteria:**
- [ ] A non-2xx response rejects instead of resolving to an empty list
- [ ] One failed ingredient request does not discard the others
- [ ] Offline spin shows a connection message, not "Nothing found"
- [ ] A spin with one failed ingredient and a result shows "Couldn't search for: <ingredient>"
- [ ] A request that never answers is abandoned after 15 s and the spin button re-enables
- [ ] Unit tests for the all-failed and partial-failure cases with a mocked fetch

---

## Concurrent spins via keyboard (BUGS_RESOLVED #16)

**Labels:** `bug`, `ui`

During a spin the button gets `.spinning`, which sets `pointer-events: none` in CSS. The button is never `disabled`, so Enter or Space on the focused button starts a second spin while the first is in flight. Both write `#result` and both call `addSeenRecipe()`; the last to finish wins the DOM.

**Fix:** Set `btn.disabled = true` at the start of the spin and restore it in a `finally` block, alongside an `inFlight` guard in the handler. Reference: sandbox `src/main.ts`, `setSpinning()` and `spinInFlight`.

**Acceptance Criteria:**
- [ ] Pressing Enter twice quickly on the spin button produces one result and one seen-list entry
- [ ] The button is re-enabled after a spin that throws
- [ ] `.spinning` visual state unchanged

---

## Print window can be null; document.write; closed before dialog (BUGS_RESOLVED #17)

**Labels:** `bug`, `robustness`, `ui`

In the print handler (`app.js` lines 271 to 408):

```javascript
const printWindow = window.open("", "_blank");
printWindow.document.write(`...`);
// ...
setTimeout(() => {
  printWindow.print();
  printWindow.close();
}, 500);
```

Under a pop-up blocker `window.open` returns `null` and the next line throws. `document.write` is deprecated. Calling `close()` right after `print()` can close the window before the print dialog opens in browsers where `print()` is non-blocking. The content is also read from the modal's `innerHTML`, so the ⏱ emoji (which lives in CSS `::before`) is lost.

**Fix:** Guard the null window and show a status line in the modal ("Printing was blocked. Allow pop-ups for this site and try again."). Build the print document with `createElement` / `textContent` from the recipe object, set `document.title`, append a `<style>` element with the existing print CSS, and close the window on the `afterprint` event. Reference: sandbox `src/ui/print.ts`.

**Acceptance Criteria:**
- [ ] With pop-ups blocked, pressing Print shows a message and nothing throws
- [ ] The print window contains title, category, ingredients with measurements, numbered steps and the footer
- [ ] The window closes after the print dialog is dismissed, not before it opens
- [ ] No `document.write` and no `innerHTML` in the print path
- [ ] Unit test for the document builder with a recipe name containing `<script>`

---

## Recently viewed cards are mouse-only (BUGS_RESOLVED #18)

**Labels:** `bug`, `accessibility`

`renderRecentlyViewed()` (`app.js` lines 493 to 523) creates each card as a `div.recent-card` with a click listener and no `tabindex`, `role` or keydown handling. Keyboard and screen-reader users cannot reach them.

**Fix:** Render each card as `<button type="button" class="recent-card" aria-label="View {name}">` with CSS resets (`background: transparent; border: none; padding: 0; font: inherit`) so it looks as it does now. Reference: sandbox `src/ui/recentlyViewed.ts` and `src/styles/recently.css`.

**Acceptance Criteria:**
- [ ] Each recent card is focusable with Tab
- [ ] Enter and Space open the modal for that recipe
- [ ] The card's visual appearance is unchanged
- [ ] Closing the modal returns focus to the card (depends on #31)

---

## Keep idMeal on normalised recipes (BUGS_RESOLVED #19)

**Labels:** `bug`, `data-integrity`, `favourites`

`normalizeMeal()` (`app.js` lines 48 to 82) discards `idMeal`. Favourites, the seen list and recently viewed are all keyed by `name`, so two different meals with the same title collide, and a favourite can never be re-fetched.

**Fix:** Capture `id: meal.idMeal` (and `area: meal.strArea || null` while there). Add three helpers: `recipeKey(r) = r.id ?? r.name`, `sameRecipe(a, b)` (compare ids when both have one, otherwise names), and `isSeen(set, r)` (`set.has(r.id) || set.has(r.name)`). Use them wherever identity is compared. Favourites already saved by the current app have no `id` and must keep working by name; no migration. Reference: sandbox `src/core/identity.ts` and its uses in `src/storage/*` and `src/ui/*`.

**Acceptance Criteria:**
- [ ] `normalizeMeal` output includes `id`
- [ ] Two recipes with the same name and different ids can both be saved as favourites
- [ ] A favourite saved by the current app (no `id`) still shows as "saved" when the same recipe is spun again
- [ ] Seen list stores ids for new spins and still honours existing name entries
- [ ] Remove button works for both id-bearing and legacy favourites
- [ ] Unit tests for the three helpers and the storage behaviour

---

## Spin scores persisted into favourites and recently viewed (BUGS_RESOLVED #20)

**Labels:** `bug`, `data-integrity`, `favourites`

After scoring, the spin handler spreads `score`, `vibeScore` and `matchedCount` onto the recipe object (`app.js` lines 575 to 595) and then passes that object to `saveFavorite()` and `addRecentlyViewed()`. Three numbers that only mean something relative to one spin are written to localStorage with every favourite.

**Fix:** Keep the scored result as a wrapper `{ recipe, matchedCount, ingredientMatch, vibeScore, blendedScore, seen }` and store `pick.recipe`, never `pick`. As a second guard, strip to the recipe shape on every storage write. Reference: sandbox `src/types.ts` (`ScoredRecipe`), `src/storage/recipeCodec.ts` (`toStoredRecipe`).

**Acceptance Criteria:**
- [ ] A saved favourite contains no `score`, `vibeScore` or `matchedCount`
- [ ] Existing favourites that have those fields are read without error and the fields are dropped on next write
- [ ] Unit test that a stored favourite has only the recipe shape

---

## Fazier badge link: rel=noopener and doubled slash (BUGS_RESOLVED #21)

**Labels:** `chore`, `code-quality`

In `index.html` (footer):

```html
<a href="https://fazier.com/launches/pantryroulette.com" target="_blank">
<img src="https://fazier.com/api/v1//public/badges/launch_badges.svg?badge_type=featured&theme=dark" ... />
```

`target="_blank"` without `rel="noopener"` gives the opened page a reference to this window. The image URL has a doubled slash.

**Fix:** Add `rel="noopener"`, fix the URL to `/api/v1/public/...`, and add `width`/`height` and `loading="lazy"` on the image.

**Acceptance Criteria:**
- [ ] The badge link has `rel="noopener"`
- [ ] The image URL has a single slash and still renders

---

## Repo hygiene: line endings, stray files, preconnect, noscript (BUGS_RESOLVED #22)

**Labels:** `chore`, `maintainability`

Committed files are LF, the Windows working tree is CRLF, there is no `.gitattributes` and `core.autocrlf` is unset, so `git status` shows every text file as fully modified with zero semantic changes. `favicon_io.zip` and `*:Zone.Identifier` files sit untracked in the root. Google Fonts loads with no `preconnect`, and there is no `<noscript>` message.

**Fix:** Add `.gitattributes` with `* text=auto eol=lf` (plus `*.png binary`, `*.ico binary`, `*.zip binary`) and run `git add --renormalize .` once. Add `.editorconfig` (2-space, LF, trim trailing whitespace). Add `favicon_io.zip` and `*:Zone.Identifier` to `.gitignore`. Add `<link rel="preconnect">` for `fonts.googleapis.com` and `fonts.gstatic.com` and a `<noscript>` line in the main card. Reference: sandbox root files and `index.html` head.

**Acceptance Criteria:**
- [ ] `git status` is clean after a fresh checkout on Windows
- [ ] `.gitattributes`, `.editorconfig` committed
- [ ] Preconnect links present before the fonts stylesheet
- [ ] A `<noscript>` message is visible with JavaScript disabled

---

## Minor dead statements and duplicate selectors (BUGS_RESOLVED #23)

**Labels:** `chore`, `dead-code`, `css`

Three no-ops left over from earlier fixes: `list.classList.remove("hidden")` in `renderFavorites()` (`app.js` line 444; the class is never set), `.save-btn svg { color: currentColor }` in `style.css` (the default), and the duplicate selector `.meta span, .result-card .meta span`. The 320 px and 400 px media blocks are each declared twice, with a "targeted fixes" block at the end of the stylesheet undoing part of the 320 px block.

**Fix:** Delete the three statements. Merge each breakpoint into a single block and fold the "targeted fixes" into the rules they override. Related: #32 (dead code), #34 (custom properties).

**Acceptance Criteria:**
- [ ] No duplicate media query blocks in `style.css`
- [ ] The favourites card layout at 320 px is unchanged after the merge
- [ ] The three dead statements are gone

---

## Nondeterministic pick on tied scores (BUGS_RESOLVED #24)

**Labels:** `bug`, `vibe-engine`

Found in manual testing: spin `chicken, garlic, lemon` cold → "Banana Pancakes". Clear the seen list (verified: `pantryRouletteSeenRecipes` is `null` afterwards). Spin again → "Apple Pie", and "Apple Pie" every time after that.

The two recipes tie on blended score (common when ingredient overlap is zero and the vibe keyword hits are equal). The sort in the spin handler compares score only:

```javascript
.sort((a, b) => b.score - a.score)
```

so the winner is whichever tied recipe came first in the candidate pool, and the pool order can differ between a cold spin and a later one. The same input must produce the same pick.

**Fix:** Sort by blended score desc, then matched ingredient count desc, then name asc (lowercased, plain string comparison, not `localeCompare`). Keep `Math.random` out of the primary path. Make sure detail-lookup results are collected in candidate order, not resolution order. Reference: sandbox `src/core/scoring.ts` (`compareScored`), `tests/spin.test.ts`.

**Acceptance Criteria:**
- [ ] Two recipes with identical scores and different names rank alphabetically regardless of input order
- [ ] Same input through a cold spin and a repeat spin yields the same pick
- [ ] Unit test for the comparator and an integration-style test for cold vs. repeat

---

## Appendix: two older rows without an issue

### Build cards with DOM APIs, not innerHTML (BUGS_RESOLVED #7)

**Labels:** `bug`, `robustness`, `ui`

`renderFavorites()` (lines 449 to 465), `renderRecentlyViewed()` (509 to 515) and the spin handler (605 to 635) assign template literals containing `recipe.name`, `recipe.description` and `recipe.image` to `innerHTML`. A `"` in a name breaks the `alt` and `aria-label` attributes; a `<` injects markup. The modal is already built safely with `textContent`.

**Fix:** A small `el(tag, attrs, children)` helper built on `createElement`, `setAttribute` and `createTextNode`; rebuild the three renderers with it. Reference: sandbox `src/ui/el.ts`.

**Acceptance Criteria:**
- [ ] No `innerHTML` assignment with interpolated strings in `app.js`
- [ ] A recipe named `<b>x</b> "y"` renders as literal text with an intact `alt`
- [ ] Unit test for the helper

### Cap favourites (BUGS_RESOLVED #9)

**Labels:** `bug`, `favourites`

`saveFavorite()` (lines 108 to 115) pushes without limit; each entry is a full recipe with steps. Related to #19 in the backlog (free-tier favourites limit).

**Fix:** Cap at 50. `saveFavorite` returns `'added' | 'exists' | 'full'`; on `'full'` the result card shows "Favorites are full (50). Remove one to save this recipe." and the button stays enabled. Reference: sandbox `src/storage/favourites.ts`, `src/ui/resultCard.ts`.

**Acceptance Criteria:**
- [ ] The 51st save is refused with a visible message
- [ ] Existing favourites are never dropped silently
- [ ] Unit test for the cap

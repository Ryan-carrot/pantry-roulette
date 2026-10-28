# Reference map

Where each production (v1.0.1, `ed443d1`) file or function went in the sandbox. Line numbers are the scout's, from the committed LF versions of the v1 files; inside the 526–657 spin handler they are approximate to a few lines. "Removed" means the sandbox has no equivalent on purpose; the reason is in `DECISIONS.md`.

## `app.js`

| Production | Lines | Sandbox |
|---|---|---|
| `fetchRecipesByIngredient(ingredient)` | 1–12 | `src/api/mealdb.ts`: `createMealDbClient().searchByIngredient()` (encodes, checks `ok`, throws) |
| `fetchRecipesByIngredients(ingredients)` | 14–33 | `src/api/mealdb.ts`: `findCandidates()` (`allSettled`), with the pure `interleave()` and `mergeCandidates()` |
| `fetchRecipeDetails(id)` | 35–46 | `src/api/mealdb.ts`: `createMealDbClient().lookup()`; batched and cached by `src/api/loadRecipes.ts`: `loadRecipes()` |
| `normalizeMeal(meal)` | 48–82 | `src/core/normalize.ts`: `normalizeMeal()` |
| `filterRecipes(userIngredients, selectedVibe)` | 84–98 | Removed (never called) |
| `getFavorites()` | 102–106 | `src/storage/favourites.ts`: `createFavouritesStore(storage).list()` |
| `saveFavorite(recipe)` | 108–115 | `createFavouritesStore(storage).add()` → `'added' \| 'exists' \| 'full'` |
| `removeFavorite(name)` | 118–122 | `createFavouritesStore(storage).remove(key)` where `key = recipeKey(recipe)` |
| "already saved" check (`getFavorites().some(...)`) | 601 | `createFavouritesStore(storage).has(recipe)` via `sameRecipe()` |
| `getSeenRecipes()` | 128–131 | `src/storage/seen.ts`: `createSeenStore(storage).list()` / `.asSet()` |
| `addSeenRecipe(name)` | 133–139 | `createSeenStore(storage).addRecipe(recipe)` (stores `recipeKey`) |
| `clearSeenRecipes()` | 141–143 | `createSeenStore(storage).clear()` |
| `getRecentlyViewed()` | 145–148 | `src/storage/recentlyViewed.ts`: `createRecentlyViewedStore(storage).list()` |
| `addRecentlyViewed(recipe)` | 150–157 | `createRecentlyViewedStore(storage).add()` |
| unguarded `JSON.parse(localStorage.getItem(key))` | 104, 130, 147 | `src/storage/storage.ts`: `readJson()`, `readArray()`, `writeJson()`; shape validation in `src/storage/recipeCodec.ts`: `toRecipe()`, `toStoredRecipe()`, `readRecipes()` |
| `openRecipeModal(recipe)` | 166–225 | `src/ui/modal.ts`: `createModal(document, { onPrint, isSaved, onSave }).open(recipe, trigger, { tip })` (B's structure: checkable ingredients, pinned Save / Print / Close bar) |
| `closeRecipeModal()` | 227–232 | `createModal(...).close()` (returns focus to the trigger) |
| `trapFocus(element)` / `removeFocusTrap()` | 237–268 | `src/ui/modal.ts`: `trapTab()` keydown listener inside `createModal` |
| print button handler (`window.open` + `document.write`) | 271–408 | `src/ui/print.ts`: `printRecipe()` (null guard, `afterprint` close) and `buildPrintDocument()`; CSS in `src/styles/print.css` |
| close button, backdrop click, Escape listeners | 410–430 | wired inside `createModal()` |
| `renderFavorites()` | 431–491 | `src/ui/favourites.ts`: `renderFavourites(list, empty, favourites, { onView, onRemove })` |
| remove-button handler (`e.target.closest("remove-btn")`) | 467–483 | `renderFavourites` listener using `event.currentTarget.dataset.key`; save-button reset via `src/ui/resultCard.ts`: `markResultUnsaved()` |
| `renderRecentlyViewed()` | 493–523 | `src/ui/recentlyViewed.ts`: `renderRecentlyViewed(section, list, recent, { onView })` (a strip of `<button>`s) |
| spin click handler | 526–657 | `src/main.ts`: `spin()` |
| input parsing (`split(",").map(trim).map(toLowerCase)`) | 540 | `src/core/scoring.ts`: `parseIngredients()` (also drops blanks and duplicates) |
| spinning state (`.spinning`, "Spinning... 🎰") | 536–538, 549–550 | `src/main.ts`: `setSpinning()` (also sets `disabled`) and `spinInFlight`; the visible spin is `src/ui/reel.ts`: `createReel().start() / feed() / settle()` |
| empty guards and messages ("🥄", "😬 Nothing found") | 530–533, 552–556 | `src/main.ts`: the four `showMessage()` branches; `src/ui/resultCard.ts`: `renderMessage()` |
| `console.log("Raw meals pool:", ...)` | 547 | Removed |
| inline scoring (`matched`, `ingredientScore`, `combinedScore`, seen `× 0.3`) | 571–585 | `src/core/scoring.ts`: `scoreRecipe()` → `ScoredRecipe` |
| `.filter(score > 0).sort(...)` | 586–591 | `src/core/scoring.ts`: `rankRecipes()` with `compareScored()`; seen recipes are excluded here, not penalised |
| `scored[0]` or random fallback | 593–597 | `src/core/scoring.ts`: `pickRecipe()` → `PickResult` (`'pick'`, `'exhausted'` when every candidate is seen, `'empty'`); random fallback from unseen only, RNG injected |
| result card template literal → `resultDiv.innerHTML` | 605–635 | `src/ui/resultCard.ts`: `renderResult(container, scored, { isSaved, vibeLabel, onSave, onView, onSpinAgain, failedIngredients })` |
| save-button click (`"Saved! ✅"`) | 643–650 | `renderResult`'s save listener and `setSavedState()` |
| view-recipe-button click | 653–655 | `renderResult`'s `onView(trigger)` → `main.ts`: `openRecipe()` |
| page-load `renderFavorites(); renderRecentlyViewed();` | 660–662 | `src/main.ts`: `refreshFavourites()`, `refreshRecentlyViewed()` |
| reset-seen button handler (`"✅ Reset!"` / `"🔄 Reset Suggestions"`) | 664–671 | `src/ui/clearHistory.ts`: `wireClearHistory(button, textSpan, onClear)` |
| identity by `name` everywhere | throughout | `src/core/identity.ts`: `recipeKey()`, `sameRecipe()`, `isSeen()` |
| `resultDiv.focus()` after render | 637–639 | `src/main.ts`: `showPick()` focuses with `preventScroll` then `src/ui/scroll.ts`: `scrollCardIntoView()` |
| (none) | — | `src/api/surprise.ts`: `surpriseMe()` and `createMealDbClient().random()` (new: Surprise me) |
| (none) | — | `src/ui/resultCard.ts`: `renderExhausted()` (new: every candidate seen) |
| (none) | — | `src/core/measurements.ts`: `parseMeasure()` (new: servings spike, not wired) |
| (none) | — | `src/storage/lookupCache.ts`: `createLookupCache()` (new: sessionStorage cache of normalised lookups) |
| (none) | — | `src/main.ts`: `resolveStorage()` (new: in-memory fallback when web storage throws) |

## `vibes.js`

| Production | Lines | Sandbox |
|---|---|---|
| `vibeProfiles` | 1–61 | `src/core/vibes.ts`: `vibeProfiles` (one change: `simple.lengthWeight` 0.3) |
| `scoreRecipeForVibe(recipe, vibe)` | 63–113 | `src/core/vibes.ts`: `scoreRecipeForVibe()` (same algorithm; now receives real `instructions`) |
| vibe keys as implicit strings | — | `src/types.ts`: `VIBE_KEYS`, `VibeKey`, `isVibeKey()` |

## `recipes.js`

| Production | Sandbox |
|---|---|
| `recipes` array (14 local recipes) | Removed (dead code; never read) |

## `index.html`

| Production | Sandbox |
|---|---|
| `<script src="vibes.js">`, `recipes.js`, `app.js` | `<script type="module" src="/src/main.ts">` |
| `<meta property="og:*">`, `twitter:*` | Removed (sandbox is not a public site) |
| `#result` static div (gets `tabindex="-1"` from JS) | same markup with `tabindex="-1"` in the HTML; `#reel` sits above it |
| `#reset-seen-btn` "Reset Suggestions" | `#clear-history-btn` "Clear seen history" with `#clear-history-text` span and `#clear-history-hint` |
| (none) | `.sheet-bar` with `#modal-save-btn`, `#modal-print-btn`, `#modal-close-btn` pinned to the sheet's bottom edge |
| `#btn-text` "Spin the Pantry" (JS adds 🎰 later) | `#btn-text` "Spin" (JS reads it back); `#surprise-btn` "Surprise me" beneath |
| `.modal-meta` with static `<span class="meta-time">30 mins</span>` | `#modal-meta`, filled by JS with ingredient count, cuisine and the cook-time bucket from `src/core/cookTime.ts`: `estimateCookTime()` (a dash when null) |
| `<select id="vibe" aria-label="Select a cooking vibe">` | `<fieldset id="vibe">` filled by `src/ui/vibeSelector.ts`: `createVibeSelector()`, ten radios on a snap-scroll rail with a "see all" grid |
| `#recipe-modal` with `aria-describedby="modal-body"` | without `aria-describedby` |
| (none) | `#modal-status` (`role="status"`) for the blocked-print message; `<noscript>` line; Google Fonts `preconnect` |
| `favicon*.png`, `favicon.ico`, `apple-touch-icon.png` at root | `public/` (same files, served from `/`) |
| `CNAME`, `sitemap.xml`, `og-image.png` | Removed |

## `style.css`

The v1 stylesheet maps onto the new token-driven files. `design/SYSTEM.md` is the human reference for all of them.

| Production | Sandbox |
|---|---|
| literal colours (21 × `#ff6b35`, 11 × `#0f3460`, ...) | `src/styles/tokens.css`: every colour, size, radius and motion value |
| reset, body, `.container`, `.hidden`, `.skip-link`, icon alignment | `src/styles/base.css` |
| `.hero`, `.subtitle` | `src/styles/shell.css` (`.wordmark`, `.tagline`) |
| `.input-group`, `input`, `select`, `button`, `.reset-btn` | `src/styles/shell.css` (field, dial, `.btn-spin`, `.btn-text`) |
| (none) | `src/styles/reel.css` |
| `.result-card`, `.meta`, `.meta-*::before` emoji, `.save-btn`, `.view-recipe-btn`, `.no-match` | `src/styles/result.css` (`.card`, `.pill`, `.btn-primary`, `.btn-save` lamp, `.message`, `.search-note`; no emoji) |
| `.modal-*`, `.modal-ingredients-list`, `.modal-steps-list` | `src/styles/sheet.css` (`.sheet`, `.ingredient` rows with `.tick`, `.steps`, `.sheet-bar`) |
| `.favorites-*`, `.fav-card`, `.remove-btn` (+ the "targeted fixes" block) | `src/styles/favourites.css` (`.fav`, `.lamp`) |
| `.recently-viewed-*`, `.recent-card` | `src/styles/recently.css` |
| `.site-footer`, `.footer-badges` | `src/styles/footer.css` (badge removed) |
| `@keyframes pulse`, `slideUp`, `fadeIn` | `src/styles/motion.css` (`rise`, `pulse`) plus per-component keyframes (`payout`, `reel-loop`) and reduced-motion fallbacks |
| `@media (max-width: 600px)`, `400px`, `320px` ×2 | per-component `@media (max-width: 360px)` and `(min-width: 720px / 1024px)` blocks |
| print CSS inside `app.js`'s template literal | `src/styles/print.css` |
| `.remove-btn svg { pointer-events: none }` | Removed (handler uses `currentTarget`) |

## Tests (no production equivalent)

| Sandbox test | What it pins |
|---|---|
| `tests/normalize.test.ts` | `Recipe` shape, `instructions`, steps split, description, no `time` |
| `tests/vibes.test.ts` | ten keys, weights sum to 1.0, keyword lists verbatim, length and count rules, lazy vs impressive |
| `tests/scoring.test.ts` | `parseIngredients`, blend, seen penalty by id and name, tiebreak, `pickRecipe` null and fallback |
| `tests/identity.test.ts` | `recipeKey`, `sameRecipe`, `isSeen` |
| `tests/mealdb.test.ts` | encoding, `ok` check, `allSettled`, interleave fairness, dedup, timeout signal |
| `tests/lookupCache.test.ts` | cache read/write/corrupt, one lookup per id, candidate order |
| `tests/spin.test.ts` | cold vs cached spin picks the same recipe |
| `tests/storage.test.ts` | guarded parse, v1 upgrade, caps, id identity, legacy names |
| `tests/ui.test.ts` | `el()` never parses HTML, card labels, remove via icon, modal focus paths, print builder |
| `tests/clearHistory.test.ts` | label swap and restore, icon kept |
| `tests/vibeSelector.test.ts` | ten radios, arrow keys without wrap, see-all toggle, value read-back |
| `tests/reel.test.ts` | skeleton then fill, never lands early, holds for slow data, pulses past the max, reduced motion, cancel |
| `tests/resultCard.test.ts` | fields, no markup, save lamp states incl. full, view and spin again, failure notice, messages |
| `tests/modal.test.ts` | fill, meta row with dash, ticks and reset, bar order, focus return on three paths, trap, save from bar, blocked print, card tip |
| `tests/favourites.test.ts`, `tests/recentlyViewed.test.ts` | lamp, remove by key incl. legacy, view trigger; strip of buttons |
| `tests/cookTime.test.ts` | durations, ranges, overnight, buckets, max not sum, step heuristic, codec |
| `tests/scroll.test.ts` | nearest first, nudge when clipped, instant under reduced motion |
| `tests/surprise.test.ts` | random.php URL, re-roll past seen, three-try ceiling, cache by id, failure → null |
| `tests/measurements.test.ts` | integers, decimals, fractions, mixed numbers, ranges, units, vague units, non-quantities |

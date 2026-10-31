# Hand-code spec

A build plan for hand-coding the production Pantry Roulette with the behaviour worked out in this sandbox. Items are in build order: each section depends only on the ones before it. Tick a decision on every item before you start.

Issue numbers refer to your production repo. Sprint 7 (milestone "Sprint 7 — v1.0.2 Bug Fix Release") is #27 to #39. Bugs #13 to #24 in `../BUGS_RESOLVED.md` have no issue yet; `ISSUES_TO_CREATE.md` has them ready to paste. Two more rows, #7 (`innerHTML`) and #9 (favourites cap), also lack issues and are included there as an appendix.

Format of every item:

```
### <short title>
**Decision:** [ ] Keep  [ ] Consider  [ ] Skip
**What it fixes / does:**
**Original bug:** BUGS_RESOLVED #n, or "new behaviour"
**Issue:** #n, or "create"
**Reference:** sandbox file and function(s)
**Why it works this way:**
**Hand-code notes:**
**Test to write:**
```

Where a reference file is named, open it next to this document; each is short and reads as JavaScript with type annotations.

---

## 1. Data model

The one shape everything else depends on. Get this right first and every later section gets simpler.

### The `Recipe` shape

**Decision:** [ ] Keep  [ ] Consider  [ ] Skip
**What it fixes / does:** One object shape for a recipe, used by the API layer, scoring, storage and UI alike. Fields: `id`, `name`, `ingredients`, `measurements`, `steps`, `instructions`, `description`, `image`, `category`, `area`, `source`. Nothing else.
**Original bug:** BUGS_RESOLVED #8, #19, #20 together
**Issue:** #35 covers the `time` field; the rest has none
**Reference:** `src/types.ts` (`Recipe`), `src/core/normalize.ts` (`normalizeMeal`)
**Why it works this way:** v1's normalised object carried `time` (hardcoded), `vibe` (vestigial), and after scoring, `score`, `vibeScore` and `matchedCount`. Those last three only mean something relative to one spin, yet they were saved into favourites. Keeping the shape to "facts about the meal" means any `Recipe` can be stored, compared or rendered without wondering which spin it came from. Spin results are a separate wrapper (see section 3, "Blended score vs ingredient match").
**Hand-code notes:** In vanilla JS this is a JSDoc `@typedef` at the top of `normalize.js` and a discipline, not a type check. The discipline that matters: `normalizeMeal` is the only place a `Recipe` is created from API data, and nothing ever spreads extra fields onto one. Every optional field is `null` when absent, never `undefined`, so `JSON.stringify` round-trips it unchanged.
**Test to write:** `normalizeMeal` on a fixture meal returns exactly those eleven keys, with `null` for a missing thumbnail, category, area and source.

### Populate `instructions`

**Decision:** [ ] Keep  [ ] Consider  [ ] Skip
**What it fixes / does:** `normalizeMeal` keeps the raw `strInstructions` string as `instructions` alongside the split `steps` array. The vibe engine reads `instructions`; in v1 it was never set, so the engine only ever saw the recipe title.
**Original bug:** BUGS_RESOLVED #1
**Issue:** #27
**Reference:** `src/core/normalize.ts` (`normalizeMeal`, the `instructions` line)
**Why it works this way:** `scoreRecipeForVibe` needs the full text for keyword matching and its length for the lazy / simple / impressive length rules. `steps` is for display. Keeping both avoids re-joining steps with guessed newlines, and the raw string is what the length thresholds (300, 400, 800 chars) were tuned against.
**Hand-code notes:** One line: `instructions: meal.strInstructions || ""`. Keep `steps` as it is. This is the single highest-impact change in the whole spec; do it first and spin a few times to see vibe scores move from 10 to 20% up to 40 to 70%.
**Test to write:** With a fixture that has multi-line instructions, `normalizeMeal(...).instructions` equals the raw string and `.steps` equals the trimmed, non-empty lines.

### Keep `idMeal` and `strArea`

**Decision:** [ ] Keep  [ ] Consider  [ ] Skip
**What it fixes / does:** `id` and `area` (cuisine) are captured on every recipe. `id` becomes the identity key (section 4); `area` is shown as a pill in the modal where the fake cook time used to be.
**Original bug:** BUGS_RESOLVED #19
**Issue:** create (ISSUES_TO_CREATE "Keep idMeal on normalised recipes")
**Reference:** `src/core/normalize.ts`
**Why it works this way:** Two different MealDB meals can share a title. With `id` on the object, favourites and the seen list can tell them apart, and a favourite could be re-fetched in future. `area` costs nothing to keep and gives the modal a real fact to show.
**Hand-code notes:** `id: meal.idMeal`, `area: meal.strArea || null`. Everything that reads `id` must tolerate `null`, because favourites saved by the current production app have none.
**Test to write:** `normalizeMeal` carries `idMeal` to `id` and `strArea` to `area`.

### No fabricated cook time

**Decision:** [ ] Keep  [ ] Consider  [ ] Skip
**What it fixes / does:** Removes `time: 30` from the recipe, the "⏱ 30 mins" pill from the card, the modal, the favourites card and the print-out, and the static "30 mins" span in `index.html`.
**Original bug:** BUGS_RESOLVED #8
**Issue:** #35
**Reference:** `src/core/normalize.ts` (no `time` field), `src/ui/modal.ts` (`fill`, the meta row)
**Why it works this way:** TheMealDB has no cook-time field. Showing a constant as if it were data is the one thing in v1 that was simply untrue. The honest replacement is an estimate derived from the instruction text, shown as a range bucket and labelled as an estimate; that is a separate experiment (`../ROADMAP.md`) because the parser needs its own tests.
**Hand-code notes:** Delete, don't replace. The modal meta row can show `"${ingredients.length} ingredients"` and the cuisine pill so it is not empty. Resist estimating inline; do it as its own module later.
**Test to write:** `normalizeMeal` output has no `time` key, and the rendered result card contains no text matching `/mins?/`.

### Description from the first step, neutral fallback

**Decision:** [ ] Keep  [ ] Consider  [ ] Skip
**What it fixes / does:** `description` is the first 120 characters of the first step plus "...". When there are no instructions it reads "No description available." instead of v1's "A delicious meal worth trying."
**Original bug:** new behaviour (copy only)
**Issue:** none
**Reference:** `src/core/normalize.ts` (`DESCRIPTION_LENGTH`, `FALLBACK_DESCRIPTION`)
**Why it works this way:** The truncation is derived from real data, so it stays. The fallback was marketing filler presented as a blurb; a neutral line is honest and no less friendly.
**Hand-code notes:** Two constants and a ternary. Keep the "..." behaviour exactly as v1 so cards look the same.
**Test to write:** A 200-character first step yields 120 characters plus "..."; empty instructions yield the fallback.

---

## 2. API layer

Everything that talks to TheMealDB, plus the pure merge logic. The pure parts (interleave, dedup, cap) are worth separating from the fetch code so they can be tested without a network.

### Encode ingredients and drop empty entries

**Decision:** [ ] Keep  [ ] Consider  [ ] Skip
**What it fixes / does:** Each ingredient goes through `encodeURIComponent` before it lands in the URL. The input parser splits on commas, trims, lowercases, drops blanks (`eggs,,butter,`) and duplicates.
**Original bug:** BUGS_RESOLVED #2
**Issue:** #28
**Reference:** `src/api/mealdb.ts` (`searchByIngredient`), `src/core/scoring.ts` (`parseIngredients`)
**Why it works this way:** `&` or `#` in the input corrupts the query string; a trailing comma sends `filter.php?i=`. Verified against the live API: `chicken%20breast`, `chicken_breast` and `chicken+breast` all return the same meals, so plain percent-encoding is enough and no underscore conversion is needed.
**Hand-code notes:** `parseIngredients` is a pure function; put it next to the scoring code, not the fetch code, because scoring also needs the cleaned list. Use a `Set` for dedup to keep first-occurrence order.
**Test to write:** `parseIngredients(" Eggs, Butter ,,eggs,")` returns `["eggs", "butter"]`; the fetch URL for `"chicken breast & thyme"` contains `chicken%20breast%20%26%20thyme`.

### Check `response.ok` and the body shape; throw, don't return `[]`

**Decision:** [ ] Keep  [ ] Consider  [ ] Skip
**What it fixes / does:** The fetch helpers throw on a non-2xx status or a body that is not `{ meals: [...] | null }`. They no longer swallow errors into an empty list.
**Original bug:** BUGS_RESOLVED #15 (first half)
**Issue:** create ("Distinguish network failure from no results")
**Reference:** `src/api/mealdb.ts` (`getMeals`, `isMealsEnvelope`)
**Why it works this way:** In v1 a dead network and a genuinely empty result both became `[]`, so the user saw "Nothing found" when the problem was their connection. Letting the error propagate is what lets the next item tell the two apart. `{ meals: null }` is TheMealDB's real "no results" and stays a successful empty list.
**Hand-code notes:** `if (!response.ok) throw new Error(...)`. For the shape check, `Array.isArray(body.meals) || body.meals === null` is enough; filter each meal for a string `idMeal` and `strMeal` so a malformed entry cannot reach `normalizeMeal`.
**Test to write:** A mocked 500 response rejects with an error mentioning the status; `{ meals: null }` resolves to `[]`.

### `Promise.allSettled` with a list of failed ingredients

**Decision:** [ ] Keep  [ ] Consider  [ ] Skip
**What it fixes / does:** The per-ingredient filter calls run in parallel with `allSettled`. One failure does not sink the spin. The result is `{ candidates, failedIngredients }`.
**Original bug:** BUGS_RESOLVED #15 (second half)
**Issue:** create (same issue as above)
**Reference:** `src/api/mealdb.ts` (`findCandidates`)
**Why it works this way:** With `Promise.all`, one timeout kills three good requests. With `allSettled` the spin uses what came back and the UI can say which ingredient it could not search for (section 5). When every ingredient failed, `candidates` is empty and `failedIngredients` is the full list, which is how the UI knows to show the connection message instead of "Nothing found".
**Hand-code notes:** `allSettled` returns results in input order, so `settled[i]` belongs to `ingredients[i]`. Do not re-collect results in a callback that fires in resolution order.
**Test to write:** With a mock that rejects for `milk` and resolves for `eggs`, `findCandidates` returns the egg candidates and `failedIngredients === ["milk"]`.

### Interleave per-ingredient lists before dedup and the cap

**Decision:** [ ] Keep  [ ] Consider  [ ] Skip
**What it fixes / does:** Each ingredient's list is capped at 10, the lists are merged round-robin (first of each, then second of each...), deduped by `idMeal` keeping the first occurrence, then capped at 30 for detail lookups.
**Original bug:** BUGS_RESOLVED #13
**Issue:** create ("Candidate cap starves later ingredients")
**Reference:** `src/api/mealdb.ts` (`interleave`, `mergeCandidates`)
**Why it works this way:** v1 concatenated in input order and took the first 30, so with four ingredients returning 10 each, the fourth never contributed. Round-robin gives 4 × 10 capped to 30 a split of 8/8/7/7. Dedup before the cap so a meal that appears under two ingredients does not use two slots.
**Hand-code notes:** `interleave` is a nested loop over the longest list length; about ten lines. Keep it and `mergeCandidates` as standalone pure functions so they can be tested with plain arrays of `{ idMeal }`.
**Test to write:** Four lists of ten stubs capped to 30 give every prefix at least 7 entries; two lists sharing an id yield one entry in the merged output with the first list's name.

### Request timeout

**Decision:** [ ] Keep  [ ] Consider  [ ] Skip
**What it fixes / does:** Every fetch gets `AbortSignal.timeout(15000)`. A stalled request becomes a rejection after 15 s instead of leaving the spin button disabled forever.
**Original bug:** new behaviour
**Issue:** none (fold into the network-failure issue if you like)
**Reference:** `src/api/mealdb.ts` (`REQUEST_TIMEOUT_MS`, `getMeals`)
**Why it works this way:** During testing a five-ingredient spin hung past 30 s once, most likely TheMealDB throttling a burst of 90 requests. With the button disabled while in flight (section 5), a hang with no timeout is a dead page.
**Hand-code notes:** `fetch(url, { signal: AbortSignal.timeout(15000) })`. Supported in every current browser. The abort surfaces as a rejection, which the `allSettled` item already handles.
**Test to write:** The fetch stub receives an `init.signal` that is an `AbortSignal`.

### Session cache for lookups

**Decision:** [ ] Keep  [ ] Consider  [ ] Skip
**What it fixes / does:** `lookup.php` results are normalised and cached in `sessionStorage` under `pantryRouletteLookup:<idMeal>`. A spin only fetches ids it has not seen this tab session. Failed lookups are not cached so a later spin retries them.
**Original bug:** new behaviour
**Issue:** none
**Reference:** `src/storage/lookupCache.ts` (`createLookupCache`), `src/api/loadRecipes.ts` (`loadRecipes`)
**Why it works this way:** A cold three-ingredient spin costs 3 filter + about 28 lookup requests. The same spin again costs 3 + 0; adding a fourth ingredient costs 4 + 5. That removes the burst that appeared to trigger throttling, and makes "spin again" feel instant. Caching the normalised `Recipe` rather than the raw payload means the cache reads go straight into scoring. `sessionStorage` because the tab lifetime is the right TTL and it never needs invalidating.
**Hand-code notes:** `loadRecipes` is a map over stubs: cache hit → return it, miss → `lookup`, `normalizeMeal`, `cache.set`, return. Wrap it in `allSettled` and keep results in stub order (this matters for section 3's determinism). Use the same guarded read/write helpers as the other stores (section 4). The minimal version is an in-memory `Map` that lives for the page; `sessionStorage` adds survival across reloads for little extra.
**Test to write:** Two `loadRecipes` calls whose stub lists overlap make one network call per distinct id; a rejected lookup is absent from the result and from the cache.

---

## 3. Scoring

The vibe engine and the blend. All pure functions: no DOM, no storage, no fetch. This is the part of the app that is uniquely yours; the sandbox kept its semantics and fixed what was broken around it.

### Vibe engine over real instruction text

**Decision:** [ ] Keep  [ ] Consider  [ ] Skip
**What it fixes / does:** `scoreRecipeForVibe` is the v1 algorithm unchanged: keyword fraction × keywordWeight + ingredient-count score × ingredientWeight + length score × lengthWeight. The only change is that it now receives real `instructions`, so the keyword and length terms do work.
**Original bug:** BUGS_RESOLVED #1
**Issue:** #27
**Reference:** `src/core/vibes.ts` (`vibeProfiles`, `scoreRecipeForVibe`)
**Why it works this way:** The profile shape (keywords, optional min/max ingredient count, optional min/max instruction length, weights) is sound. With text, Impressive finally rewards long, careful recipes and Lazy rewards short ones. The substring matching ("rest" matches "restaurant") and the exact thresholds were left alone so the behaviour is comparable to v1 rather than redesigned; `../ROADMAP.md` is where tuning experiments go.
**Hand-code notes:** No code change beyond the `instructions` line in section 1. Keep the stray `};` out of `vibes.js` while you are there (#38 territory). If you want one guard, return 0 for an unknown vibe key as v1 did.
**Test to write:** A short-instruction recipe outscores a long one for `lazy`, and the reverse for `impressive`, with everything else equal.

### `simple` weights sum to 1.0

**Decision:** [ ] Keep  [ ] Consider  [ ] Skip
**What it fixes / does:** `simple.lengthWeight` is 0.3 instead of 0.2, so the profile sums to 1.0 like the other nine.
**Original bug:** new behaviour (the one deliberate change to v1 scoring)
**Issue:** none
**Reference:** `src/core/vibes.ts` (the `simple` profile)
**Why it works this way:** v1 shipped `0.3 + 0.4 + 0.2 = 0.9`, so Simple could never score above 0.9 and was slightly disadvantaged in the 50/50 blend. `impressive` has the same three-term structure at 0.3/0.4/0.3, so matching it is the least surprising fix.
**Hand-code notes:** One number. Add a test that loops the ten profiles and asserts the sum, so the next retune cannot reintroduce the drift.
**Test to write:** For every vibe key, `ingredientWeight + keywordWeight + (lengthWeight || 0)` is 1.0 within float tolerance.

### Blended score vs ingredient match, as separate numbers

**Decision:** [ ] Keep  [ ] Consider  [ ] Skip
**What it fixes / does:** Scoring returns a wrapper `{ recipe, matchedCount, ingredientMatch, vibeScore, blendedScore, seen }`. The card shows "X/Y ingredients" (matchedCount / total), "N% score" (blendedScore) and "N% vibe". Nothing is labelled "match".
**Original bug:** BUGS_RESOLVED #3, and #20 (scores leaking into storage)
**Issue:** #29
**Reference:** `src/types.ts` (`ScoredRecipe`), `src/core/scoring.ts` (`scoreRecipe`)
**Why it works this way:** v1's "% match" was `(ingredient × 0.5 + vibe × 0.5) × 0.3 if seen`, so a perfect ingredient match with a weak vibe read "55% match" and a seen recipe could read "12% match". Keeping the components separate and naming the blend "score" makes every number on the card true. Wrapping the recipe instead of spreading fields onto it is what keeps spin-specific numbers out of favourites (section 1).
**Hand-code notes:** `const scored = { recipe, matchedCount, ingredientMatch, vibeScore, blendedScore, seen }`. Everywhere v1 did `pick.name`, you now do `pick.recipe.name`. Save and recently-viewed get `pick.recipe`, never `pick`.
**Test to write:** With 2 of 4 ingredients matched, `ingredientMatch === 0.5` and `blendedScore === 0.5 * 0.5 + 0.5 * vibeScore`; a seen recipe keeps its `ingredientMatch` and has `blendedScore` scaled by 0.3.

### Deterministic tiebreak

**Decision:** [ ] Keep  [ ] Consider  [ ] Skip
**What it fixes / does:** Candidates sort by `blendedScore` desc, then `matchedCount` desc, then `name` asc (lowercased, plain string comparison). The same input always gives the same pick.
**Original bug:** BUGS_RESOLVED #24
**Issue:** create ("Nondeterministic pick on tied scores")
**Reference:** `src/core/scoring.ts` (`compareScored`, `rankRecipes`)
**Why it works this way:** Ties are common when ingredient overlap is zero (the vibe score alone decides, and many recipes get identical keyword hits). With only a score comparator, the winner was whichever tied recipe came first in the pool, and pool order can differ between a cold spin and a cached one. Manual testing saw "Banana Pancakes" cold and "Apple Pie" after clearing history for the same input. Three-level ordering removes the dependence on pool order entirely.
**Hand-code notes:** One comparator function; `.sort()` is stable in every current engine but the comparator should not rely on that. Compare lowercased names with `<` and `>` rather than `localeCompare` so the order does not depend on the user's locale. Keep `Math.random` only in the fallback path for a pool where nothing scores above zero.
**Test to write:** Two recipes with identical scores and different names rank alphabetically regardless of input order; a full cold-then-cached spin against a fake API with reversed lookup timing picks the same name both times.

### Null pick on an empty pool, reachable fallback

**Decision:** [ ] Keep  [ ] Consider  [ ] Skip
**What it fixes / does:** `pickRecipe` returns the best ranked candidate; if nothing scores above zero it returns a random candidate; if the pool is empty it returns `null`. The caller shows a message for `null`.
**Original bug:** BUGS_RESOLVED #14
**Issue:** create ("Unreachable fallback and silent crash on empty pool")
**Reference:** `src/core/scoring.ts` (`pickRecipe`), `src/main.ts` (the `if (!pick)` branch)
**Why it works this way:** v1 indexed `normalized[Math.floor(Math.random() * 0)]` when every lookup failed, got `undefined`, and threw on `.name` with the button already restored and nothing on screen. Returning `null` makes the empty case explicit and the random fallback testable by injecting the random function.
**Hand-code notes:** `pickRecipe(candidates, ingredients, vibe, seenSet, random = Math.random)`. Three early returns. The random fallback is only reachable for an unknown vibe value in practice, which is fine.
**Test to write:** An empty candidate list returns `null`; with no overlap and an unknown vibe, an injected `random = () => 0.99` picks the last candidate.

### Seen recipes are excluded, not penalised

**Decision:** [ ] Keep  [ ] Consider  [ ] Skip
**What it fixes / does:** Seen recipes leave the ranked pool; the seen check uses the recipe's `id` when it has one and falls back to `name` so seen lists written by the current production app still work. `pickRecipe` returns one of three results: `{ kind: 'pick', pick }`, `{ kind: 'exhausted' }` when every candidate has been seen, `{ kind: 'empty' }` when there were no candidates. The random fallback (nothing scores above zero) draws from unseen candidates only.
**Original bug:** BUGS_RESOLVED #19 (scoring side); the exclusion itself is new behaviour from manual round 2
**Issue:** create ("Exclude seen recipes instead of penalising them") and ("Keep idMeal on normalised recipes")
**Reference:** `src/core/identity.ts` (`isSeen`), `src/core/scoring.ts` (`rankRecipes`, `pickRecipe`, `PickResult`)
**Why it works this way:** v1 multiplied the blended score by 0.3 for a seen recipe. With a small pool the penalised recipe still won, so "clear history" looked like it did nothing. Exclusion makes every spin show something new until there is nothing new, and then says so: the exhausted state is its own message with the clear action inline, because the fix is different from "nothing found" (change the input) or a connection error (check the network). `scoreRecipe` still reports `seen` on the scored object so a card could show it.
**Hand-code notes:** In `rankRecipes`, filter `!scored.seen` before the zero-score filter. `pickRecipe` becomes: empty pool → `empty`; best ranked → `pick`; else unseen candidates → random one; else `exhausted`. A tagged object (`kind`) rather than `null` because three outcomes need three messages. The old multiplier is one line to put back if you ever want the softer behaviour.
**Test to write:** A pool where every candidate is seen yields `exhausted`; a pool with one unseen candidate picks it even if a seen one scores higher; clearing the seen set and picking again returns the top scorer; the seen flag matches ids and legacy names.

---

## 4. Storage

Three stores plus the lookup cache, all through the same guarded read and write helpers. Same localStorage key names as production so existing data carries over.

### Guarded `JSON.parse`

**Decision:** [ ] Keep  [ ] Consider  [ ] Skip
**What it fixes / does:** Every read is `try { JSON.parse(getItem(key)) } catch { return null }`, including the case where `getItem` itself throws. Writes are try/catch too.
**Original bug:** BUGS_RESOLVED #6
**Issue:** #33
**Reference:** `src/storage/storage.ts` (`readJson`, `writeJson`, `readArray`)
**Why it works this way:** A hand-edited or corrupt value threw inside `renderFavorites()` at page load and killed the rest of the script. Storage is best-effort; the page must load with empty lists rather than not at all. Manual round 2 confirmed: set the favourites value to `garbage`, reload, clean page, no console errors.
**Hand-code notes:** Three ten-line helpers in `storage.js`. `readArray` returns `[]` for anything that is not an array, which covers `null`, `42` and `{}`.
**Test to write:** `readJson` on `'{not json'` returns `null` and does not throw; a storage whose `getItem` throws also yields `null`.

### Shape validation and v1 upgrade on read

**Decision:** [ ] Keep  [ ] Consider  [ ] Skip
**What it fixes / does:** Each stored entry goes through `toRecipe(value)`: anything without a string `name` is discarded; `id` defaults to `null`; `instructions` is derived from `steps` when missing; extra fields (`time`, `vibe`, `score`, `vibeScore`, `matchedCount`) are dropped. `toStoredRecipe` strips to the `Recipe` shape before writing.
**Original bug:** BUGS_RESOLVED #6 (shape), #20 (contextual fields)
**Issue:** #33 and create
**Reference:** `src/storage/recipeCodec.ts` (`toRecipe`, `toStoredRecipe`, `readRecipes`)
**Why it works this way:** Users already have favourites saved by production. Upgrading on read means no migration code and no "clear your data" moment; a v1 favourite becomes a valid `Recipe` the first time it is read. Discarding instead of crashing on a bad entry is the same best-effort stance as the parse guard.
**Hand-code notes:** One function with a type check per field; `typeof value.name === "string"` is the only hard requirement. Keep it in its own file so all three stores share it.
**Test to write:** A v1-shaped favourite (no `id`, no `instructions`, with `score`) reads back as a `Recipe` with `id: null`, `instructions` joined from `steps`, and no `score`; an entry without `name` is dropped and the rest survive.

### Caps: seen 20, recently viewed 5, favourites 50

**Decision:** [ ] Keep  [ ] Consider  [ ] Skip
**What it fixes / does:** Seen keeps the newest 20 (FIFO, as v1). Recently viewed keeps 5 newest-first (as v1). Favourites are capped at 50, and `add()` returns `'full'` rather than dropping the oldest.
**Original bug:** BUGS_RESOLVED #9
**Issue:** create ("Cap favourites")
**Reference:** `src/storage/favourites.ts` (`FAVOURITES_CAP`, `add`), `src/storage/seen.ts`, `src/storage/recentlyViewed.ts`
**Why it works this way:** Each favourite is a full recipe with steps, so an uncapped list grows without bound. Silently discarding a saved recipe felt worse than a message, so `add()` returns one of `'added' | 'exists' | 'full'` and the UI (section 5) says "Favorites are full (50)". Issue #19 in your backlog (free-tier favourites limit) is the same mechanism with a different number.
**Hand-code notes:** `add` reads the list, checks `sameRecipe`, checks length, writes. Return a string so the caller can branch; a boolean loses the "already saved" case.
**Test to write:** The 51st `add` returns `'full'` and the list still has 50 with the first entry intact.

### Identity: `id ?? name`

**Decision:** [ ] Keep  [ ] Consider  [ ] Skip
**What it fixes / does:** Three helpers: `recipeKey(r) = r.id ?? r.name`, `sameRecipe(a, b)` (by id when both have one, else by name), `isSeen(set, r)`. Favourites dedup and removal, recently-viewed dedup, the seen list and the result card's saved state all go through them.
**Original bug:** BUGS_RESOLVED #19
**Issue:** create ("Keep idMeal on normalised recipes")
**Reference:** `src/core/identity.ts`
**Why it works this way:** Keying by name collided on duplicate titles; keying by id alone would orphan every favourite production has already saved. `sameRecipe` compares by id when it can and by name when it must, so the switch needs no migration. The remove button carries `data-key` = `recipeKey(recipe)` so a legacy favourite is still removable.
**Hand-code notes:** Three one-liners in `identity.js`. The one trap: never compare `a.id === b.id` directly, because `null === null` is true and would make all legacy entries the same recipe.
**Test to write:** Two recipes with the same name and different ids are both saveable; a legacy entry without an id counts as saved when the name matches; `remove("Legacy Pie")` removes the legacy entry and `remove("1")` removes the id-bearing one.

### In-memory fallback when web storage throws

**Decision:** [ ] Keep  [ ] Consider  [ ] Skip
**What it fixes / does:** On startup, probe `localStorage` (and `sessionStorage`) with a set/remove; if it throws, use a `Map`-backed object with the same `getItem` / `setItem` / `removeItem` methods.
**Original bug:** new behaviour
**Issue:** none
**Reference:** `src/main.ts` (`resolveStorage`)
**Why it works this way:** Private windows and blocked-storage settings make `localStorage` throw on access in some browsers. The app works for the session either way; it just does not persist.
**Hand-code notes:** Ten lines. Pass the resolved storage object into the store factories so the stores never touch `window.localStorage` directly; that is also what makes them testable with a plain object.
**Test to write:** The stores accept any object with the three methods; the test suite's memory store is proof.

---

## 5. UI behaviour

Behaviour only; the look is §8. Everything here is design-independent and was first built against the v1 markup, then carried into the redesign unchanged.

### Build DOM with `createElement` and `textContent`, never `innerHTML` with API strings

**Decision:** [ ] Keep  [ ] Consider  [ ] Skip
**What it fixes / does:** A small `el(tag, attrs, children)` helper that sets attributes and appends text nodes or elements; `svgIcon(name)` builds the inline icons with `createElementNS`. Every rendered surface (card, sheet, saved, recent, reel rows, print document) uses it. No `innerHTML` anywhere.
**Original bug:** BUGS_RESOLVED #7
**Issue:** create (appendix: "Build cards with DOM APIs")
**Reference:** `src/ui/el.ts` (`el`, `append`, `replaceChildren`, `svgIcon`)
**Why it works this way:** Recipe names come from the API and are round-tripped through localStorage. A `"` in a name broke `alt` and `aria-label` in the template literal; a `<` injected markup. The helper keeps call sites about as short as the template literals were.
**Hand-code notes:** `el` is about fifteen lines. Template literals are fine for the static markup in `index.html`; the rule is only about interpolated strings.
**Test to write:** Rendering a recipe named `<b>Evil</b> "Dish"` yields an `h2` with that literal text, no `<b>` child, and an image `alt` equal to the raw name.

### The spin flow and the reel's hold-until-data rule

**Decision:** [ ] Keep  [ ] Consider  [ ] Skip
**What it fixes / does:** One `spin()` function: parse input → start the reel → `findCandidates` → feed the reel with the stubs → `loadRecipes` → `pickRecipe` → settle the reel on the pick → render the card → focus → scroll. The reel runs while data loads and only lands when the pick exists. It never lands before `--reel-spin` even if the cache answers instantly; if the pick arrives so late that landing would end after `--reel-max`, it skips the landing and the card pulses instead. Spin and Surprise me are both disabled while either is in flight.
**Original bug:** BUGS_RESOLVED #14, #16; the reel is Ryan's brief item one
**Issue:** create ("Unreachable fallback and silent crash on empty pool"), ("Concurrent spins"), epic
**Reference:** `src/main.ts` (`spin`, `showPick`, `setSpinning`), `src/ui/reel.ts` (`settle`)
**Why it works this way:** The reel is the sense of spin the brief asked for, and it is honest: it shows real candidates (names and thumbnails arrive from the filter calls before the details do). The timing rules keep it from feeling like a hang when the network is slow or like a flicker when the cache is warm. `finally` re-enables the buttons so an exception never leaves the page dead.
**Hand-code notes:** `settle(pick)` records `elapsed = now - startedAt`, then: reduced motion → place the pick and resolve `'instant'`; `elapsed + land > max` → jump to the final offset and resolve `'pulsed'`; else wait `max(0, spin - land - elapsed)` and run the landing transition for `land`. Read the three durations from the custom properties at startup. Keep the reel `aria-hidden`; the result region is the live region.
**Test to write:** With fake timers, a settle at once resolves after exactly `--reel-spin` with `'landed'`; a settle at 2.0 s resolves immediately with `'pulsed'`; under reduced motion `'instant'`.

### Scroll the whole card into view after a spin

**Decision:** [ ] Keep  [ ] Consider  [ ] Skip
**What it fixes / does:** After the card renders: `resultRegion.focus({ preventScroll: true })`, then one `window.scrollBy` computed from the result region's rect so the card's bottom edge lands `--card-scroll-margin` (16px) above the viewport bottom; if the card is above the viewport, its top comes down to 0 instead, never so far that the bottom goes out. Smooth unless reduced motion. Never for a notice.
**Original bug:** new behaviour (manual round 3)
**Issue:** create ("Scroll the whole card into view after a spin")
**Reference:** `src/ui/scroll.ts` (`scrollCardIntoView`), the end of `showPick` in `src/main.ts`
**Why it works this way:** On a phone the reel lands with the card's action row below the fold. Focus first so the ring is on the card; scroll second so the ring is on screen. One computed scroll, not `scrollIntoView` followed by a nudge: the first version did that, and on a phone the two smooth scrolls interrupted each other and the nudge measured the card before it had moved, which left "Spin again" flush against the bottom edge (manual round 4). Measure the result region, not the card: the card's arrival animation transforms it by tens of pixels in its first frames, and transforms change `getBoundingClientRect` but not layout. For a card taller than the viewport the bottom wins; the buttons matter more than the top of the photo.
**Hand-code notes:** `delta = rect.bottom - (innerHeight - margin)` when positive; else if `rect.top < 0`, `delta = Math.max(rect.top, rect.bottom - (innerHeight - margin))`; one `scrollBy({ top: delta })`. Read the margin with `parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--card-scroll-margin'))` so it is tuned in CSS. Inject `scrollBy` so the test can stub it. About twenty lines.
**Test to write:** With a stubbed rect and a `scrollBy` that moves it: a card flush with the bottom ends 16px above it; a card below the fold ends with its bottom 16px above the viewport bottom in a single call; a card that fits with room is not scrolled; reduced motion passes `behavior: 'auto'`; setting `--card-scroll-margin` changes the result.

### Three result states that are not a pick

**Decision:** [ ] Keep  [ ] Consider  [ ] Skip
**What it fixes / does:** "Enter at least one ingredient." for blank input; "Nothing found. Try different ingredients." for an empty candidate list with no failures; "Couldn't reach the recipe service. Check your connection and try again." in coral when every ingredient request failed; "Found recipes but couldn't load any of them." in coral when candidates existed but every lookup failed; and, when every candidate has been seen, "You've seen everything for these ingredients. Clear history to start over." with "Clear history" as an inline button. A partial failure (some ingredients down, result found) adds a coral "Couldn't search for: ..." under the card.
**Original bug:** BUGS_RESOLVED #14, #15; exhausted is §3
**Issue:** create (both network issues), ("Exclude seen recipes")
**Reference:** `src/main.ts` (`spin`), `src/ui/resultCard.ts` (`renderMessage`, `renderExhausted`)
**Why it works this way:** Each message maps to a different thing the user can do about it. Coral means something went wrong; the exhausted state is not wrong, so it is not coral.
**Hand-code notes:** `renderMessage(container, text, kind)` is `replaceChildren` with one `<p>`; `renderExhausted` builds the sentence around an inline `<button>`.
**Test to write:** `renderMessage` with `'notice'` renders `.message.notice`; `renderExhausted` renders the sentence and clicking the inline button calls the handler.

### Surprise me

**Decision:** [ ] Keep  [ ] Consider  [ ] Skip
**What it fixes / does:** A text link under Spin. `surpriseMe(client, cache, seen)` calls `random.php`, normalises the meal through `normalizeMeal`, caches it by id, and re-rolls up to three times while the roll is seen, returning the last roll if all three were. The result runs through the same reel (fed with the one roll) and the same card with "— ingredients"; "Spin again" on that card rolls again.
**Original bug:** new behaviour; production issue #40
**Issue:** #40 and create ("Surprise me")
**Reference:** `src/api/surprise.ts`, `createMealDbClient().random()` in `src/api/mealdb.ts`, `surprise()` and `showPick()` in `src/main.ts`
**Why it works this way:** It fits the name of the app better than anything else and solves the blank-pantry start. Sharing `showPick` with the normal spin means the reel, seen list, recently viewed, Save and scroll all behave the same for free.
**Hand-code notes:** Score the roll with an empty ingredient list; the vibe half of the score is real, the ingredient half is zero, and the card hides the match count behind a dash. Three rolls is the request ceiling.
**Test to write:** A stubbed `random.php` returning a seen id twice then an unseen one yields the unseen one in three calls; every roll is in the cache; a failing service yields null.

### Focus return from the sheet

**Decision:** [ ] Keep  [ ] Consider  [ ] Skip
**What it fixes / does:** `open(recipe, trigger)` remembers the element that opened the sheet; `close()` returns focus to it on every path: Close in the bar, Escape, backdrop click. If the trigger is no longer in the document, nothing is focused rather than throwing.
**Original bug:** BUGS_RESOLVED #5
**Issue:** #31
**Reference:** `src/ui/modal.ts` (`open`, `close`)
**Why it works this way:** Without it a keyboard user lands on `<body>`. Passing the trigger explicitly is more reliable than reading `activeElement` after a click has already moved focus. The Escape listener is added on open and removed on close so it is not global forever.
**Hand-code notes:** One module-level `returnTo`, set in `open`, used and cleared in `close`. Every call site passes the button it is wired to.
**Test to write:** Open from a button, close by each of the three paths, assert `document.activeElement` is that button each time.

### Opening the sheet from the card tips the card away

**Decision:** [ ] Keep  [ ] Consider  [ ] Skip
**What it fixes / does:** `open(recipe, trigger, { tip })` adds `.away` to the given element while the sheet is open and removes it on close. `main.ts` passes the result region when the trigger is inside it, and nothing when the sheet opens from a saved or recent card.
**Original bug:** new behaviour (Ryan's brief: no transition from card to modal)
**Issue:** epic
**Reference:** `src/ui/modal.ts` (`OpenOptions`), `openRecipe` in `src/main.ts`
**Why it works this way:** The caller knows where the sheet came from; the sheet should not guess by walking the DOM.
**Hand-code notes:** The CSS for `.away` is in §8; the JS is one class toggle each way.
**Test to write:** Opening with `{ tip }` adds `.away`; close removes it.

### The sheet's pinned bar and session-only ticks

**Decision:** [ ] Keep  [ ] Consider  [ ] Skip
**What it fixes / does:** The sheet is a flex column: a scrolling body and a bar with Save, Print, Close that never scrolls away. Ingredients are `<input type="checkbox">` rows with a running "3 of 16"; ticks are kept only in the DOM while the sheet is open and reset on every open. Save in the bar lights green and reports `'full'` as a status line; Print reports a blocked pop-up as a status line.
**Original bug:** BUGS_RESOLVED #17 (print); the structure is B's, from Ryan's brief
**Issue:** epic
**Reference:** `src/ui/modal.ts` (`fill`, `updateCount`, the bar listeners)
**Why it works this way:** With the phone on the counter the three actions must be reachable with a thumb. Ticks answer "what have I added to the pan"; persisting them would need a key per recipe and a reset affordance for no gain.
**Hand-code notes:** Reset ticks by rebuilding the list in `fill`, which `open` always calls. The count is `querySelectorAll(':checked').length`.
**Test to write:** Two ticks give "2 of 3" and reopening clears them; the bar's three buttons follow the content in document order.

### Favourites remove via `currentTarget`, keyboard-reachable recent cards

**Decision:** [ ] Keep  [ ] Consider  [ ] Skip
**What it fixes / does:** The remove handler reads `event.currentTarget.dataset.key`; no `pointer-events: none` crutch. Recently viewed cards are `<button>`s.
**Original bug:** BUGS_RESOLVED #4, #18
**Issue:** #30, create ("Recently viewed cards are mouse-only")
**Reference:** `src/ui/favourites.ts`, `src/ui/recentlyViewed.ts`
**Why it works this way:** `currentTarget` is always the element the listener is on. A real button gets the tab stop and Enter/Space for free.
**Hand-code notes:** Use `data-key` (the identity key from §4), not `data-name`.
**Test to write:** A click on the SVG inside the second remove button calls the handler with the second key; every recent card is a `button`.

### The save lamp's three answers

**Decision:** [ ] Keep  [ ] Consider  [ ] Skip
**What it fixes / does:** Save on the card and in the sheet calls the favourites store and reads one of `'added' | 'exists' | 'full'`. `added` lights the lamp; `exists` renders it lit on arrival; `full` leaves it unlit and shows "Saved recipes are full (50). Remove one to save this." Removing a favourite unlights the matching card button by key.
**Original bug:** BUGS_RESOLVED #9, #11
**Issue:** create ("Cap favourites"), #39
**Reference:** `src/ui/resultCard.ts` (`setSavedState`, `markResultSaved`, `markResultUnsaved`), the `saveButton` listener in `src/ui/modal.ts`
**Why it works this way:** `aria-pressed` is the single source of truth for "saved", so the visual and the announced state cannot disagree. A string result rather than a boolean lets the UI tell "full" from "already saved".
**Hand-code notes:** Never set `disabled` on the lamp; a disabled button leaves the tab order and its colour is overridden.
**Test to write:** `onSave` returning each of the three values produces the matching state and note.

### "Clear seen history" and labels that do not drift

**Decision:** [ ] Keep  [ ] Consider  [ ] Skip
**What it fixes / does:** The button is labelled "Clear seen history", with a hint beneath and a two-second "History cleared" swap of the text span only, so the icon stays. The Spin button's idle label is read from the HTML at startup and restored after a spin.
**Original bug:** BUGS_RESOLVED #11, plus the rename from manual round 2
**Issue:** #39
**Reference:** `src/ui/clearHistory.ts`, `SPIN_IDLE_LABEL` in `src/main.ts`
**Why it works this way:** "Reset Suggestions" promised a new suggestion; the button only clears a list. One source for a label cannot drift.
**Hand-code notes:** Wrap the label text in a `<span>`; the handler is eight lines with a `clearTimeout` guard.
**Test to write:** Click sets the span to "History cleared" and keeps the SVG; after 2000 ms it reads "Clear seen history" again.

---

## 6. Accessibility

What v1 already did well is preserved: skip link, `aria-live` result region, labelled icon buttons, `aria-hidden` SVGs, focus trap, Escape and backdrop close. These are the additions and the two removals, as they stand in the final UI.

### Contrast on the dark room, measured

**Decision:** [ ] Keep  [ ] Consider  [ ] Skip
**What it fixes / does:** Every text token measured against every surface it sits on. Lowest pair: text-3 (`#948aae`) on raised (`#261d38`) at 5.0:1. Gold text on the dark surfaces 11.9:1; dark text on gold 11.3:1; green 11.2:1; coral 7.1:1; amber 9.9:1. The full table is in `design/SYSTEM.md`.
**Original bug:** none in the list; the v1 button was 2.84:1
**Issue:** #34 is the natural home
**Reference:** `src/styles/tokens.css` (ratios in the comments)
**Why it works this way:** Three text levels on three surfaces is nine pairs; naming them once in the token file means nobody re-measures by hand.
**Hand-code notes:** If you change a surface, re-measure text-3 on it first; it is the only pair with little headroom.
**Test to write:** None automated.

### Focus rings that survive gold

**Decision:** [ ] Keep  [ ] Consider  [ ] Skip
**What it fixes / does:** `:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px }` everywhere, except on the gold Spin button where the ring is text-1, and inside the sheet bar where the offset is negative so the ring stays inside the rounded panel.
**Original bug:** none in the list
**Issue:** epic
**Reference:** `src/styles/base.css`, `.btn-spin:focus-visible` in `shell.css`, `.bar-btn:focus-visible` in `sheet.css`
**Why it works this way:** A gold ring on a gold button is invisible; a ring outside a clipped panel is cut off.
**Hand-code notes:** Use `:focus-visible`, not `:focus`, so mouse clicks do not paint rings.
**Test to write:** None automated; the keyboard walk in `docs/MANUAL_TEST.md` Round 3 covers it.

### The dial is a radio group

**Decision:** [ ] Keep  [ ] Consider  [ ] Skip
**What it fixes / does:** Ten `<input type="radio" name="vibe">` inside labels in a `<fieldset>` with a `<legend>`. Screen readers announce "Vibe, radio group, Comfort, 3 of 10"; Tab enters at the checked one; the arrow keys step. The visually hidden radio sits over its label with `opacity: 0`, not `display: none`, so it stays in the tab order.
**Original bug:** none; replaces a native `<select>` without losing its semantics
**Issue:** epic
**Reference:** `src/ui/vibeSelector.ts`
**Why it works this way:** The alternative, buttons with `role="radio"` and `aria-checked`, needs every behaviour re-implemented in JS and still announces worse.
**Hand-code notes:** Centre the set item by setting `rail.scrollLeft`; `scrollIntoView` moves the page's focus starting point and broke the skip link on load.
**Test to write:** Ten radios exist; ArrowRight from Comfort selects Hearty and moves focus; ArrowLeft at Lazy stays.

### Skip link that lands

**Decision:** [ ] Keep  [ ] Consider  [ ] Skip
**What it fixes / does:** `<main id="main-content" tabindex="-1">` so the skip link moves focus into the main area in every browser, with `#main-content:focus { outline: none }` because the ring would wrap the whole page.
**Original bug:** none; found by the headless keyboard walk
**Issue:** epic
**Reference:** `index.html`, `src/styles/base.css`
**Why it works this way:** Without `tabindex`, some browsers scroll to the fragment but leave focus where it was.
**Hand-code notes:** One attribute, one rule.
**Test to write:** None automated; Round 3 keyboard walk step 1.

### `prefers-reduced-motion`, per animation

**Decision:** [ ] Keep  [ ] Consider  [ ] Skip
**What it fixes / does:** Every animation has a named fallback: the reel does not move and resolves `'instant'`; the card's pay-out and tip become a dim; the sheet appears in place; the save glow and hover lifts are instant; scrolling is `auto`. Each component's `@media (prefers-reduced-motion: reduce)` block sits at the end of its own stylesheet; the reel and the scroll also check `matchMedia` in JS so no timers run.
**Original bug:** none in the list (§10 gap); production issue #36
**Issue:** #36
**Reference:** the end of each `src/styles/*.css`, `reduceMotion` in `src/main.ts`, the motion table in `design/SYSTEM.md`
**Why it works this way:** A global `* { animation: none !important }` would also kill the fallbacks you want to keep, and hides which animations exist. Per component, the fallback is next to the rule it cancels.
**Hand-code notes:** Read `matchMedia('(prefers-reduced-motion: reduce)').matches` once at startup and pass it in; do not re-query inside hot paths.
**Test to write:** The reel test with `reduceMotion: true` resolves `'instant'` and never sets the `spinning` class; the scroll test passes `behavior: 'auto'`.

### Two ARIA attributes removed

**Decision:** [ ] Keep  [ ] Consider  [ ] Skip
**What it fixes / does:** `aria-label="Select a cooking vibe"` on the old select is gone (the fieldset's legend is the name now), and `aria-describedby="modal-body"` on the dialog is gone, so screen readers do not read the whole sheet, buttons included, as a description on open. `aria-labelledby="modal-title"` remains.
**Original bug:** none in the list (§10 gaps)
**Issue:** none
**Reference:** `index.html`
**Why it works this way:** An `aria-label` that differs from the visible label is a label-in-name mismatch; a description that includes the controls is noise.
**Hand-code notes:** Delete two attributes.
**Test to write:** None.

### Live region and the reel

**Decision:** [ ] Keep  [ ] Consider  [ ] Skip
**What it fixes / does:** The result region keeps `aria-live="polite"` and `aria-atomic`; the reel is `aria-hidden` throughout because it is decoration for the same event the region announces. Notices and the exhausted state render inside the region so they are announced too; the exhausted message's inline button is a real `<button>`.
**Original bug:** none; preserved from v1 and extended
**Issue:** epic
**Reference:** `index.html`, `src/ui/resultCard.ts`
**Why it works this way:** Announcing the reel's rows would read six recipe names before the one that matters.
**Hand-code notes:** Keep the reel outside the live region in the DOM.
**Test to write:** None automated.

---

## 7. Project hygiene

### `.gitattributes` and `.editorconfig`

**Decision:** [ ] Keep  [ ] Consider  [ ] Skip
**What it fixes / does:** `* text=auto eol=lf` (with `binary` for png, ico, zip) ends the CRLF churn that made every file show as modified on Windows. `.editorconfig` fixes 2-space indentation and trailing-whitespace trimming in any editor.
**Original bug:** BUGS_RESOLVED #22, and the indentation half of #12
**Issue:** create ("Repo hygiene"); #38 for indentation
**Reference:** `.gitattributes`, `.editorconfig` at the sandbox root
**Why it works this way:** `core.autocrlf` is per-machine; `.gitattributes` is per-repo and wins. After adding it, run `git add --renormalize .` once.
**Hand-code notes:** Copy both files. Also `.gitignore` the `*:Zone.Identifier` files WSL leaves behind and the `favicon_io.zip`.
**Test to write:** None. `git status` is clean after a checkout on Windows.

### Remove dead code

**Decision:** [ ] Keep  [ ] Consider  [ ] Skip
**What it fixes / does:** `recipes.js`, `filterRecipes()`, the `vibe: "any"` field, the debug `console.log`, the no-op `list.classList.remove("hidden")`, the `.save-btn svg { color: currentColor }` rule and the duplicate `.meta span` selector.
**Original bug:** BUGS_RESOLVED #10, #23, and #12's stray `};`
**Issue:** #32; create ("Minor dead statements")
**Reference:** none; the sandbox simply does not have them
**Why it works this way:** The README still described `recipes.js` as the local database, which misled the scout for a while. Dead code costs reading time every time.
**Hand-code notes:** Delete. Update the README's project-structure section at the same time.
**Test to write:** None.

### A minimal Vitest setup for a vanilla project (optional)

**Decision:** [ ] Keep  [ ] Consider  [ ] Skip
**What it fixes / does:** Lets you run the "Test to write" items in this spec without adopting a bundler or TypeScript.
**Original bug:** none
**Issue:** none
**Reference:** `vite.config.ts` (`test` block), `tests/helpers/memoryStorage.ts`, any `tests/*.test.ts`
**Why it works this way:** The sandbox's tests are the executable form of this spec. Pure functions (`normalizeMeal`, `scoreRecipeForVibe`, `parseIngredients`, `interleave`, `compareScored`, the storage codec) can be tested with nothing but Node and Vitest. DOM behaviour (modal focus, card rendering) needs `happy-dom`, which is one more dev dependency and a one-line comment at the top of the test file.
**Hand-code notes:** The only structural requirement is that the logic you want to test lives in ES modules (`export function ...`) rather than global-scope `<script>` files. Browsers load ES modules natively with `<script type="module" src="app.js">`, so this does not require a bundler; the trade-off is that production's "no build step" stays true but the file layout changes from three globals to a handful of modules. The minimal setup:

```sh
npm init -y
npm install --save-dev vitest happy-dom
```

`package.json`: `"type": "module"`, `"scripts": { "test": "vitest run" }`. Tests go in `tests/*.test.js` and import from `../src/...`. A test that needs a DOM starts with `// @vitest-environment happy-dom`. No config file is needed until you want one. Start with `normalize.test.js` and `scoring.test.js`; they cover the two bugs that mattered most and need no DOM.
**Test to write:** The first one: `normalizeMeal` populates `instructions`.

---

## 8. UI design

The chosen direction is C's skeleton with B's sheet structure, rendered in C's type and colour. The reference for every value is `design/SYSTEM.md`; the tokens are `src/styles/tokens.css`; the three mockups Ryan chose from are in `design/mockups/`. Each component below: what it is, the tokens it uses, the one tricky CSS bit, and the test that proves it. Start with the tokens, then the sheet, then the reel; everything else is small.

### Tokens and fonts

**Decision:** [ ] Keep  [ ] Consider  [ ] Skip
**What it does:** One `:root` block with every colour, size, radius and motion duration. Surfaces `#100c18` / `#1a1426` / `#261d38`, line `#3a2f52`; text `#fbf6ff` / `#c9bfdd` / `#948aae`; gold `#f4c54b` with `#1b1405` on it; green `#5fdc9b`; coral `#ff6e6e`; amber `#e0b35a`. Bricolage Grotesque (700, 800, with the `opsz` axis) for anything that names something, Archivo (400, 500, 600) for anything you read. Page body 17px, sheet body 18px.
**Original bug:** none; replaces the v1 palette and Fredoka One / Nunito (production issue #34 for the custom properties)
**Reference:** `src/styles/tokens.css`, `design/SYSTEM.md` (colour table with ratios, type table, motion table)
**Why it works this way:** Gold is rationed to the three things you set or press to make the machine go (Spin, the payline, the set vibe), green means on, coral means wrong, amber means estimate. Everything else is a shade of the room, so the food photo is the only saturated thing. Every motion duration is a token so feel is tuned in one place; `--reel-spin` is the one most likely to change.
**Hand-code notes:** The Google Fonts request must include the `opsz` range for Bricolage (`Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800`) or the optical size does nothing. `font-display: swap` is in the URL (`display=swap`). Keep `--reel-max` as `2500ms` with the unit; the reel parses it with `parseFloat`.
**Test to write:** None automated; recheck the lowest pair (text-3 on raised, 5.0:1) in a contrast tool if you change any surface.

### Vibe dial

**Decision:** [ ] Keep  [ ] Consider  [ ] Skip
**What it does:** A `<fieldset>` of ten `<input type="radio" name="vibe">`, each inside a `label.vibe-item` on a horizontal snap-scroll rail. The checked one is gold under a notch. "See all ten" turns the rail into a 2-column grid (5 on desktop) and closes again on choice.
**Original bug:** replaces the ten-option native `<select>` (Ryan's brief: wrong control for a mood)
**Reference:** `src/ui/vibeSelector.ts` (`createVibeSelector`), `src/styles/shell.css` (`.vibe*`)
**Why it works this way:** Radios give you the group semantics, the single tab stop and the announcement for free, with no ARIA. The gold state is pure CSS: `.vibe-input:checked + .vibe-name`. Arrow keys are intercepted so selection does not wrap and the rail scrolls to the new item.
**Hand-code notes:** Tokens: `--elevated`, `--line`, `--accent`, `--on-accent`, `--text-3`, `--size-20`, `--font-display`. The tricky bit: centre the set item with `rail.scrollTo({ left: label.offsetLeft - (rail.clientWidth - label.offsetWidth) / 2 })`, not `scrollIntoView`, which moves the page's sequential focus starting point and breaks the skip link on load. Rail padding is `6px calc(50% - 60px)` (half the item width) so the first and last items can reach the centre. Hide the radio over its label with `position: absolute; inset: 0; opacity: 0`, not `display: none`, or it leaves the tab order. In the arrow handler, `preventDefault()` first, then set `checked` on the neighbour, focus it and fire your change handler.
**Test to write:** Ten radios exist; ArrowRight from Comfort selects Hearty and moves focus; ArrowLeft at Lazy stays on Lazy; "see all" toggles a class and `aria-expanded`; choosing from the grid closes it.

### Spin button and reel

**Decision:** [ ] Keep  [ ] Consider  [ ] Skip
**What it does:** A full-width gold Spin. Beneath it a 228px reel window with a gold payline on the middle row, hidden until the first spin. On Spin the reel shows skeleton rows, fills them with the filter results as they arrive, loops, then decelerates onto the pick, which the card then pays out beneath.
**Original bug:** Ryan's brief, item one: "no sense of spin"
**Reference:** `src/ui/reel.ts` (`createReel`: `start`, `feed`, `settle`, `cancel`), `src/styles/reel.css`, the spin flow in `src/main.ts`
**Why it works this way:** Three timing rules make it feel like a machine and never like a hang: it never lands before `--reel-spin` (1.7 s) even when the cache answers instantly; when data is so late that landing would end after `--reel-max` (2.5 s) it skips the landing and the card pulses; under reduced motion nothing moves. The strip is 24 rows (6 candidate slots × 4 copies) so the loop is seamless and the landing row in the third copy has a row showing below it.
**Hand-code notes:** Tokens: `--elevated`, `--line`, `--accent`, `--raised`, `--text-3`, `--text-1`, `--size-20`, `--reel-spin`, `--reel-land`, `--reel-max`, `--ease-out`. Rows are 76px in both the CSS and the JS constant; the loop keyframe moves exactly one copy (6 × 76 = 456px) per 560ms. The tricky bit is the landing: read the strip's current `translateY` from `getComputedStyle(strip).transform` (a `matrix(a,b,c,d,tx,ty)` string; `ty` is the sixth number), set it as an inline transform with `transition: none`, force a reflow (`void strip.offsetHeight`), then set the final offset `-(16 × 76)px` with `transition: transform 900ms var(--ease-out)`. Keep the reel `aria-hidden`; the result region is the live region. Reading the three durations from `getComputedStyle(document.documentElement).getPropertyValue('--reel-spin')` with `parseFloat` keeps the timing in CSS.
**Test to write:** With fake timers: a settle called at once resolves only after 1.7 s with `'landed'`; a settle at 2.0 s resolves immediately with `'pulsed'`; under reduced motion it resolves with `'instant'` and the `spinning` class is never set.

### Surprise me link and the exhausted notice

**Decision:** [ ] Keep  [ ] Consider  [ ] Skip
**What it does:** Under Spin, a centred text link "Surprise me" in text-2 at 15, underlined, text-1 on hover, text-3 without the underline while a spin is in flight. The exhausted state is a plain `p.message.exhausted` in text-2 with an inline gold `button.btn-inline` ("Clear history", which starts the second sentence), underlined; not coral, because nothing is wrong. The copy is two sentences with a full stop, no dash.
**Original bug:** none; §5 "Surprise me" and "Three result states"
**Issue:** create ("Surprise me"), ("Exclude seen recipes")
**Reference:** `src/styles/shell.css` (`.surprise`, `.btn-link`), `src/styles/result.css` (`.message.exhausted`, `.btn-inline`)
**Why it works this way:** Gold is for the machine, so a random roll is a text link, not a second primary. The exhausted message keeps its action inline so the fix is one tap.
**Hand-code notes:** Tokens: `--text-2`, `--text-1`, `--text-3`, `--accent`, `--size-15`. Both are plain buttons styled as text; keep `type="button"` and a focus ring.
**Test to write:** `renderExhausted` renders the sentence with a working inline button.

### Result card and the Save lamp

**Decision:** [ ] Keep  [ ] Consider  [ ] Skip
**What it does:** `article.card`: 16:9 image, title at 30 in the display face, description, three pills ("4 of 16 ingredients", "62% score", "71% comfort"), a grid of gold "View recipe" and the Save lamp, a ghost "Spin again", and an optional coral "Couldn't search for: ..." line beneath. The region above it can instead hold one of the non-pick messages, including the exhausted notice. Save is a quiet ghost button that lights green with a halo when saved and stays lit if the recipe was already saved.
**Original bug:** BUGS_RESOLVED #3, #7, #9, #11 all still hold; this is their new skin
**Reference:** `src/ui/resultCard.ts` (`renderResult`, `renderMessage`, `markResultSaved`, `markResultUnsaved`), `src/styles/result.css`
**Why it works this way:** The card is a stepping stone to the sheet, so it stays plain; the one memorable thing on it is the lamp. `aria-pressed` drives both the visual and the announced state, so there is one source of truth for "saved".
**Hand-code notes:** Tokens: `--elevated`, `--line`, `--raised`, `--accent`, `--on-accent`, `--state`, `--glow`, `--notice`, `--size-30`, `--save-glow`, `--card-tip`, `--ease-in`. The ingredients pill reads "— ingredients" when the spin had no input (Surprise me). After render, `scrollCardIntoView` (§5) brings the whole card on screen. The lamp is `box-shadow: 0 0 0 1px var(--state), 0 0 18px var(--glow)` with the heart's `fill: currentColor`; never `filter: blur`, which repaints the whole layer for the length of the transition. The tricky bit: the card's `transition` must list only `transform` and `opacity` so the `.away` tip (used when the sheet opens) and the `payout` arrival keyframe do not fight. `transform-origin: 50% 0` makes the tip hinge at the top.
**Test to write:** Renders name, image, description and the three pills from a `ScoredRecipe`; a name containing `<b>` renders as text; `onSave` returning `'added'` lights the lamp, `'exists'` renders it lit, `'full'` leaves it unlit and shows the note.

### Recipe sheet

**Decision:** [ ] Keep  [ ] Consider  [ ] Skip
**What it does:** The star. A bottom sheet (a centred panel at ≥1024px) that is a flex column: a scrolling body (image, category eyebrow, title at 34, a meta row of ingredient count, cuisine and the cook-time estimate or a dash, checkable ingredient rows with a running "3 of 16", steps at 18px with disc numerals, a status line) and a bar pinned at the bottom with Save, Print and Close, 60px tall. Opening it from the card tips the card away as the sheet rises with a small overshoot.
**Original bug:** BUGS_RESOLVED #5, #17 hold; structure is B's, from Ryan's brief ("everything I need is right there")
**Reference:** `src/ui/modal.ts` (`createModal` → `open(recipe, trigger, { tip })`, `close`), `src/styles/sheet.css`
**Why it works this way:** Ticks live only while the sheet is open (what is in the pan right now). The bar is a flex footer, not `position: sticky`, because sticky inside an overflow container misbehaves across mobile browsers. Focus goes to Close on open and back to the trigger on every close path; the trap now spans the checkboxes and the bar.
**Hand-code notes:** Tokens: `--elevated`, `--raised`, `--line`, `--text-1/2/3`, `--state`, `--on-state`, `--estimate`, `--size-18`, `--size-34`, `--leading-sheet`, `--radius-sheet`, `--sheet-rise`, `--sheet-delay`, `--ease-overshoot`, `--overlay`. The tricky bit is the scroll: `.sheet { display: flex; flex-direction: column; max-height: 94vh }` and `.sheet-scroll { flex: 1 1 auto; min-height: 0; overflow-y: auto }`. Without `min-height: 0` the body refuses to shrink and pushes the bar off screen. The rise is a `transform` transition with the delay in the shorthand; remove `.hidden` (display none) and add `.open` on the next animation frame, or the transition never runs. The checkbox is `appearance: none` with a drawn tick (`::after`, a rotated two-sided border) in `--on-state`. Ingredient rows are a `28px 96px 1fr` grid inside a `<label>` with `min-height: 52px`. `padding-bottom: env(safe-area-inset-bottom)` on the bar clears the iPhone home indicator.
**Test to write:** Fill from a recipe; meta row shows count, cuisine and a dash when `cookTime` is null; two ticks give "2 of 3" and reopening clears them; the bar's three buttons follow the content in document order; focus returns to the trigger after close button, Escape and backdrop; Tab from Close wraps to the first checkbox; opening with `{ tip }` adds `.away` to that element and close removes it.

### Saved cards and recently viewed

**Decision:** [ ] Keep  [ ] Consider  [ ] Skip
**What it does:** Saved cards: 84px thumbnail, title with a lit green lamp dot, two-line description, "View recipe", a remove button. Recently viewed: a strip of 100px buttons.
**Original bug:** BUGS_RESOLVED #4, #18 hold
**Reference:** `src/ui/favourites.ts`, `src/ui/recentlyViewed.ts`, `src/styles/favourites.css`, `src/styles/recently.css`
**Why it works this way:** The lamp on a saved card is always on; it is in the list because it is saved. Remove still reads `currentTarget.dataset.key`.
**Hand-code notes:** Tokens: `--elevated`, `--raised`, `--line`, `--state`, `--glow`, `--notice` (remove hover), `--accent` (recent thumbnail border on hover and focus). The tricky bit: the recent buttons need `font: inherit; padding: 0; letter-spacing: normal` because the global `button` style is the gold Spin. The two-line clamp is `display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden`.
**Test to write:** The card for a saved recipe contains `.lamp`; clicking the SVG inside the second remove button calls `onRemove` with the second key; recent cards are `button` elements.

### Notices, clear history, footer

**Decision:** [ ] Keep  [ ] Consider  [ ] Skip
**What it does:** `.notice` is coral text, used for the connection failure, the "couldn't load" case and the partial-failure line; nothing else is coral. "Clear seen history" is a text button with an icon, a hint, and a two-second "History cleared" swap of the text span. The footer is text-3 with underlined links; the Fazier badge is gone.
**Original bug:** BUGS_RESOLVED #15, #21 hold
**Reference:** `src/styles/base.css` (`.notice`), `src/styles/shell.css` (`.history`, `.btn-text`), `src/styles/footer.css`
**Why it works this way:** If coral only ever means "something went wrong", the user learns it in one spin.
**Hand-code notes:** Tokens: `--notice`, `--text-2`, `--text-3`, `--line`, `--size-15`, `--size-14`.
**Test to write:** `renderMessage(container, text, 'notice')` renders `.message.notice`; the plain kind does not.

### Motion and reduced motion

**Decision:** [ ] Keep  [ ] Consider  [ ] Skip
**What it does:** The motion table in `design/SYSTEM.md`: reel loop and landing, card pay-out, card tip, sheet rise with delay, overlay fade, save glow, hover feedback, each with its reduced-motion fallback.
**Original bug:** BUGS_RESOLVED #22 era `prefers-reduced-motion` (production issue #36)
**Reference:** `src/styles/motion.css` and the `@media (prefers-reduced-motion: reduce)` block at the end of each component file
**Why it works this way:** Each component owns its own fallback next to the rule it cancels, so a future animation cannot be forgotten by a global `* { animation: none }`. The reel also checks `matchMedia` in JS so no timers run under reduced motion.
**Hand-code notes:** Under reduced motion the card tip becomes a 40% dim with no rotation; the reel sets no `spinning` class and the strip jumps to its final offset.
**Test to write:** The reel test with `reduceMotion: true` resolves `'instant'` and never sets `spinning`.

---

## 9. Suggested build order for the production app

The order the sandbox was built in, with the reason each step comes before the next. Each step leaves the app working, so you can stop at any line and ship. Tests are optional at every step; where one is cheap and catches a real v1 bug, it is named.

**1. Repo hygiene first (§7).** `.gitattributes`, `.editorconfig`, delete the dead code, convert the three global scripts to ES modules with `<script type="module">`. Everything after this is easier to diff and, if you want tests later, modules are the precondition. Half an hour.

**2. The `Recipe` shape and `normalizeMeal` (§1).** Add `instructions`, `id`, `area`, drop `time`. This is one function and it is the single highest-impact change: the vibe engine starts working the moment `instructions` exists. Do it before touching scoring so you can see scores move. First test if you add any: `normalizeMeal` populates `instructions`.

**3. Scoring (§3), in this order:** keep `scoreRecipeForVibe` as it is and retune `simple` to 0.3; split the scored result into `{ recipe, matchedCount, ingredientMatch, vibeScore, blendedScore, seen }`; add the three-level comparator; then exclusion and the tagged `pickRecipe`. Each is pure and each changes what the card shows, so do them before the card. The comparator before exclusion, because exclusion makes ties more common (fewer candidates).

**4. Storage (§4).** Guarded parse and the shape validator first (the page stops dying on bad data), then identity by `id ?? name`, then the caps. Do this before the UI because the UI's "saved" states all read through `sameRecipe`. Keep the v1 key names; your existing favourites keep working.

**5. The API layer (§2).** `encodeURIComponent` and `parseIngredients`, then `response.ok` and `allSettled` with `failedIngredients`, then interleave and dedup, then the timeout, then the session cache. Each is independent; the cache last because it is the only one that adds a storage concern. By the end of this step a spin is fast, fair and honest about failures, still with the old UI.

**6. The result card and the three non-pick states (§5).** Rebuild the card with `el()`: the honest pills, the save lamp with its three answers, "Spin again", and the four messages plus the exhausted state. This is where `innerHTML` leaves the codebase. It can wear the v1 CSS for now.

**7. The sheet (§5, §8).** Focus return, the card tip hook, checkable ingredients, the pinned bar, print via DOM. Do the behaviour against the v1 modal markup first, then restyle; the focus tests do not care about the CSS.

**8. Tokens and the skin (§8).** Only now the palette, the fonts and the component styles. By this point every behaviour exists and is testable, so the restyle is pure CSS and cannot break logic. Start with `tokens.css`, then the sheet (the star), then the card, then the shell.

**9. The dial (§8).** It replaces the `<select>` and depends on nothing but the vibe keys. After the skin so it is built once, in the final look.

**10. The reel (§8).** Last of the big pieces because it is the only one that touches timing. It plugs into the spin flow you built in step 6 with three calls: `start()` before the search, `feed()` after the filter results, `settle()` after the pick. Add the scroll-to-card at the same time; it is the arrival the reel sets up.

**11. Surprise me, cook time, accessibility pass (§5, §6).** Surprise me reuses everything (`random()` on the client, `surpriseMe`, `showPick`). The cook-time estimator is pure and only adds a pill. The accessibility pass is a keyboard walk and a contrast check; it goes last because it checks the whole.

**What to skip if you want a shorter path:** the cache (step 5, last part), the reel (step 10) and Surprise me (step 11) are the three things the app works without. Everything else fixes a bug or a lie in the current app.

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

### Seen penalty keyed by id

**Decision:** [ ] Keep  [ ] Consider  [ ] Skip
**What it fixes / does:** The seen check uses the recipe's `id` when it has one, and falls back to `name` so seen lists written by the current production app still work.
**Original bug:** BUGS_RESOLVED #19 (scoring side)
**Issue:** create ("Keep idMeal on normalised recipes")
**Reference:** `src/core/identity.ts` (`isSeen`), `src/core/scoring.ts` (`scoreRecipe`)
**Why it works this way:** Section 4 stores ids in the seen list. Checking `seen.has(id) || seen.has(name)` means a list containing old names and new ids both penalise correctly, with no migration step.
**Hand-code notes:** Pass the seen list as a `Set` of strings; the check is two `has` calls.
**Test to write:** A seen set containing the id penalises the recipe; one containing a different id does not even if the name matches; a seen set of names (legacy) still penalises.

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

Behaviour only. Markup and styling are yours (section 8 is the stub for the redesign).

### Build DOM with `createElement` and `textContent`, never `innerHTML` with API strings

**Decision:** [ ] Keep  [ ] Consider  [ ] Skip
**What it fixes / does:** A small `el(tag, attrs, children)` helper that sets attributes and appends text nodes or elements. The result card, favourite cards, recent cards and the print document are built with it. No `innerHTML` anywhere.
**Original bug:** BUGS_RESOLVED #7
**Issue:** create (appendix: "Build cards with DOM APIs")
**Reference:** `src/ui/el.ts` (`el`, `append`, `replaceChildren`, `svgIcon`)
**Why it works this way:** Recipe names come from the API and are round-tripped through localStorage. A `"` in a name broke `alt` and `aria-label` in the template literal; a `<` injected markup. The modal was already built safely in v1; this brings the other three renderers in line. The helper keeps the call sites about as short as the template literals were.
**Hand-code notes:** `el` is about fifteen lines. For the inline SVG icons, `document.createElementNS` with the Lucide path data; `svgIcon(name)` in the reference shows the six you need. Template literals are fine for static markup in `index.html`; the rule is only about interpolated strings.
**Test to write:** Rendering a recipe named `<b>Evil</b> "Dish"` yields an `h2` with that literal text and no `<b>` child, and the image `alt` equals the raw name.

### Focus return from the modal

**Decision:** [ ] Keep  [ ] Consider  [ ] Skip
**What it fixes / does:** `open(recipe, trigger)` remembers the element that opened the modal; `close()` returns focus to it on every path: close button, Escape, backdrop click.
**Original bug:** BUGS_RESOLVED #5
**Issue:** #31
**Reference:** `src/ui/modal.ts` (`createModal`, `open`, `close`)
**Why it works this way:** Without it a keyboard user lands on `<body>` and has to Tab from the top. Passing the trigger explicitly (rather than reading `document.activeElement` on open) is more reliable when the modal is opened from a click that already moved focus. If the trigger is no longer in the document (the result was re-rendered), skip the focus call rather than throw.
**Hand-code notes:** One module-level `returnTo` variable, set in `open`, used and cleared in `close`. Every call site that opens the modal passes the button it is wired to. The Escape listener should be added on open and removed on close so it is not global forever.
**Test to write:** Open from a button, close by each of the three paths, assert `document.activeElement` is that button each time.

### Keyboard-reachable recently-viewed cards

**Decision:** [ ] Keep  [ ] Consider  [ ] Skip
**What it fixes / does:** Each recent card is a `<button type="button">` with an `aria-label` of "View {name}", styled to look like the v1 div.
**Original bug:** BUGS_RESOLVED #18
**Issue:** create ("Recently viewed cards are mouse-only")
**Reference:** `src/ui/recentlyViewed.ts` (`renderRecentlyViewed`), `src/styles/recently.css` (`.recent-card` resets)
**Why it works this way:** A `div` with a click listener has no tab stop and no Enter/Space handling. A real button gets all of that for free; the CSS resets (`background: transparent; border: none; font: inherit`) are cheaper than re-implementing keyboard handling on a div.
**Hand-code notes:** Change the tag and add the resets. The image inside gets `alt=""` because the button's label already names the recipe.
**Test to write:** The rendered list contains only `button.recent-card` elements and clicking one calls the handler with that recipe.

### Favourites remove via `currentTarget`

**Decision:** [ ] Keep  [ ] Consider  [ ] Skip
**What it fixes / does:** The remove handler reads `event.currentTarget.dataset.key`. The `pointer-events: none` rule on the SVG goes away.
**Original bug:** BUGS_RESOLVED #4
**Issue:** #30
**Reference:** `src/ui/favourites.ts` (the `removeButton` listener)
**Why it works this way:** `currentTarget` is always the element the listener is attached to, whatever child the pointer hit. The v1 `closest("remove-btn")` was missing its dot and the `pointer-events` rule only masked the `e.target` problem.
**Hand-code notes:** Your issue #30 proposes `e.target.closest(".remove-btn")`, which also works; `currentTarget` is one fewer DOM walk and cannot miss. Use `data-key` (the identity key from section 4), not `data-name`.
**Test to write:** Dispatch a click on the SVG inside the second remove button; the handler receives the second recipe's key.

### Partial-failure notice

**Decision:** [ ] Keep  [ ] Consider  [ ] Skip
**What it fixes / does:** When the spin produced a result but some ingredient requests failed, a line under the card reads "Couldn't search for: olive oil, soy sauce" (`role="status"`, secondary text colour). When every ingredient failed, the connection message shows instead.
**Original bug:** new behaviour, completing BUGS_RESOLVED #15
**Issue:** create ("Distinguish network failure from no results")
**Reference:** `src/ui/resultCard.ts` (`failedIngredients` in `renderResult`), `src/main.ts` (the two empty-candidate messages)
**Why it works this way:** The `allSettled` change (section 2) means a spin can succeed with a gap. Saying so is cheaper than a retry and keeps the user from thinking an ingredient was ignored. Note: a misspelled ingredient is not a failure, it is an empty result list, and gets no notice. Manual round 1 tripped on exactly that.
**Hand-code notes:** One optional array into the render function, one `<p>` at the end of the card when it is non-empty.
**Test to write:** `renderResult` with `failedIngredients: ["olive oil"]` renders the status line with that text; without it, no `.search-note` exists.

### Full-favourites notice

**Decision:** [ ] Keep  [ ] Consider  [ ] Skip
**What it fixes / does:** When `add()` returns `'full'`, a note appears under the save button ("Favorites are full (50). Remove one to save this recipe.") and the button stays enabled.
**Original bug:** BUGS_RESOLVED #9 (UI half)
**Issue:** create ("Cap favourites")
**Reference:** `src/ui/resultCard.ts` (the `saveButton` click handler)
**Why it works this way:** The cap needs a visible reason, or the save button appears broken.
**Hand-code notes:** A hidden `<p role="status">` after the button; toggle `hidden` on the result string.
**Test to write:** With an `onSave` that returns `'full'`, clicking save leaves the button enabled and shows a note matching `/full/i`.

### "Clear seen history" naming and confirmation

**Decision:** [ ] Keep  [ ] Consider  [ ] Skip
**What it fixes / does:** The reset button is labelled "Clear seen history", with a hint beneath ("Lets previously shown recipes come back."), `aria-label` "Clear the list of recipes you have already been shown", and a two-second "History cleared" confirmation that swaps only the text span so the icon stays.
**Original bug:** BUGS_RESOLVED #11 (the icon loss) plus a naming fix from manual testing
**Issue:** #39 for the label swap; the rename has none
**Reference:** `src/ui/clearHistory.ts` (`wireClearHistory`), `index.html` (the `.clear-history` block)
**Why it works this way:** "Reset Suggestions" promised a new suggestion; the button only clears a list. Manual round 2 expected a different recipe after reset and got the same one (a tie, see section 3), and the name made that feel like a bug. Swapping only a `<span>` means the SVG survives and the accessible name does not change mid-interaction.
**Hand-code notes:** Wrap the label text in a `<span id="clear-history-text">`. The handler is eight lines with a `setTimeout` and a `clearTimeout` guard for double clicks.
**Test to write:** Click sets the span to "History cleared" and leaves the SVG in place; after 2000 ms it reads "Clear seen history" again.

### Print via DOM APIs with a pop-up guard

**Decision:** [ ] Keep  [ ] Consider  [ ] Skip
**What it fixes / does:** `window.open("", "_blank")`; if it returns `null`, show "Printing was blocked. Allow pop-ups for this site and try again." in the modal and stop. Otherwise set `document.title`, append a `<style>` with the print CSS, build the body with `createElement`, call `print()` after a short delay, and close on `afterprint`.
**Original bug:** BUGS_RESOLVED #17
**Issue:** create ("Print window can be null")
**Reference:** `src/ui/print.ts` (`buildPrintDocument`, `printRecipe`), `src/styles/print.css`
**Why it works this way:** v1 threw on `.document` under a pop-up blocker, used the deprecated `document.write`, and called `close()` right after `print()`, which can close the window before the dialog opens in browsers where `print()` does not block. Building from the `Recipe` object (not the modal's `innerHTML`) also means the print-out does not depend on what the modal happens to show.
**Hand-code notes:** Keep the exact v1 print stylesheet; it was good. Pass the new window's `document` into the builder so `createElement` creates nodes in the right document. A print stylesheet on the modal itself would avoid pop-up permission entirely; that is a reasonable alternative to consider.
**Test to write:** `buildPrintDocument(doc, recipe)` on a blank document yields the title, category, ingredient `li`s with measurements, step `li`s and the footer, and a `<script>` in the recipe name does not produce a script element.

### Disable the spin button while a spin is in flight

**Decision:** [ ] Keep  [ ] Consider  [ ] Skip
**What it fixes / does:** `button.disabled = true` and an `inFlight` flag for the duration of a spin; both reset in `finally`.
**Original bug:** BUGS_RESOLVED #16
**Issue:** create ("Concurrent spins")
**Reference:** `src/main.ts` (`setSpinning`, `spinInFlight`)
**Why it works this way:** `pointer-events: none` stops the mouse but not Enter or Space on the focused button. Two concurrent spins both wrote the result region and both added to the seen list.
**Hand-code notes:** `finally` is the important part; an exception must re-enable the button.
**Test to write:** (behavioural, in the smoke list) Press Enter on the spin button twice quickly; only one result renders and the seen list gains one entry.

### Labels that do not drift

**Decision:** [ ] Keep  [ ] Consider  [ ] Skip
**What it fixes / does:** The spin button's idle label is read from the HTML at startup and restored verbatim after a spin. The save button uses one saved label ("Saved to Favorites", filled heart) whether the recipe was already saved or was saved just now.
**Original bug:** BUGS_RESOLVED #11
**Issue:** #39
**Reference:** `src/main.ts` (`SPIN_IDLE_LABEL`), `src/ui/resultCard.ts` (`setSavedState`)
**Why it works this way:** Two copies of a label drift; one source cannot. Reading it from the DOM makes the HTML the source of truth and the JS cannot disagree with it.
**Hand-code notes:** `const idle = btnText.textContent` at startup. Decide on the 🎰 once and put it in the HTML.
**Test to write:** After a spin the button text equals the text it had before.

### Three distinct empty-result messages

**Decision:** [ ] Keep  [ ] Consider  [ ] Skip
**What it fixes / does:** "Enter at least one ingredient" for blank input; "Nothing found. Try different ingredients." for an empty candidate list with no failures; "Couldn't reach the recipe service. Check your connection and try again." when every ingredient request failed; and a fourth for the rare case where candidates existed but every detail lookup failed.
**Original bug:** BUGS_RESOLVED #14, #15
**Issue:** create (both issues)
**Reference:** `src/main.ts` (`spin`), `src/ui/resultCard.ts` (`renderMessage`)
**Why it works this way:** Each message maps to a different thing the user can do about it. Sections 2 and 3 produce the signals (`failedIngredients`, `null` pick); this item just reads them.
**Hand-code notes:** Four `showMessage` calls in the spin function, each behind the condition described. `renderMessage` is `container.replaceChildren(p)` with a text node.
**Test to write:** (behavioural) Offline spin shows the connection message; `unobtainium` shows "Nothing found".

---

## 6. Accessibility

What v1 already did well is preserved: skip link, `aria-live` result region, labelled icon buttons, `aria-hidden` SVGs, focus trap, Escape and backdrop close. These are the additions and the two removals.

### Contrast tokens, with the measured ratios

**Decision:** [ ] Keep  [ ] Consider  [ ] Skip
**What it fixes / does:** Three colour changes, each a token in `tokens.css`:

| Token | Value | Replaces | Ratio |
|---|---|---|---|
| `--color-on-accent` | `#1a1a2e` (navy) as the foreground on the orange | white | 6.02:1 on `#ff6b35`, 4.73:1 on the pulse end `#e55a25` (white was 2.84:1 and 3.61:1) |
| `--color-text-dim` | `#8292ac` for reset/remove button text and borders | `#5a6a8a` | 5.04:1 on the card surface (was 2.92:1) |
| `--color-placeholder` | `#a0a0c0` for input placeholder text | `#5a6a8a` | 4.93:1 on the input background (was 2.30:1) |

The orange itself is unchanged.
**Original bug:** none in the list; found while measuring
**Issue:** #34 (CSS custom properties) is the natural home
**Reference:** `src/styles/tokens.css`, and the usages in `form.css`, `base.css`, `result.css`, `modal.css`, `print.css`
**Why it works this way:** The README claimed AA; the primary button and the dim text did not meet it. Darkening the orange would change the identity; changing what sits on it does not. Manual round 1 confirmed the navy-on-orange button looks right.
**Hand-code notes:** Put every colour in `:root` custom properties first (your #34), then change three values. The ratios were computed with the WCAG relative-luminance formula; a quick script is in `../REPORT.md` §1 territory if you want to recheck.
**Test to write:** None automated. Check the three pairs in a contrast tool once.

### `prefers-reduced-motion`

**Decision:** [ ] Keep  [ ] Consider  [ ] Skip
**What it fixes / does:** A media query that sets `animation: none` on the spinning button, result card, modal card and overlay, and `transition: none` and `transform: none` on the hover-lift elements.
**Original bug:** none in the list (§10 gap)
**Issue:** #36
**Reference:** `src/styles/motion.css`
**Why it works this way:** The pulse, slide and fade are decorative. Targeting the specific selectors rather than `* { animation: none !important }` keeps the rule readable and avoids surprising any future animation that is functional.
**Hand-code notes:** Copy the block; adjust selectors to your class names.
**Test to write:** None automated. Toggle the OS setting and spin.

### Two ARIA attributes removed

**Decision:** [ ] Keep  [ ] Consider  [ ] Skip
**What it fixes / does:** `aria-label="Select a cooking vibe"` on `#vibe` is gone, so the visible `<label>` ("What's the vibe?") is the accessible name. `aria-describedby="modal-body"` on the dialog is gone, so screen readers do not read the whole modal, buttons included, as a description on open.
**Original bug:** none in the list (§10 gaps)
**Issue:** none
**Reference:** `index.html` (the `#vibe` select and `#recipe-modal` div)
**Why it works this way:** An `aria-label` that differs from the visible label is a label-in-name mismatch (WCAG 2.5.3). `aria-describedby` pointing at a container that includes interactive controls is noise; pointing it at the steps list instead would read every step on open, which is worse. `aria-labelledby="modal-title"` remains and is enough.
**Hand-code notes:** Delete two attributes.
**Test to write:** None.

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

To be written after the redesign experiment. See `../ROADMAP.md`: the design brief comes from Ryan before any UI code is written in the sandbox, and this section is filled in from that experiment. Until then, the behaviour items in section 5 are design-independent and can be built against the current v1 markup.

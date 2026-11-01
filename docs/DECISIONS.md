# Decisions

Every design decision behind 2.0, one per line, with the reasoning, grouped by module and in the order the work happened. Commit hashes are from the rebuild history in this repo. The early sections describe a phase when the rebuild was a local experiment that was not expected to ship; they are kept as written because they explain why things are the way they are. New decisions go at the end.

## Project and repository

- **Branch, not `git init`.** The directory was a clone with history and a push-disabled remote, not a fresh folder, and the session could not delete files. Built on `rebuild/v2` instead; history preserved. (Pass 1.)
- **Vite vanilla-ts, strict TypeScript, Vitest.** Fixed by the brief. `exactOptionalPropertyTypes` added on top because it caught a real mistake in a test on day one; kept after review.
- **happy-dom as a dev dependency.** The brief listed only pure-module tests; the modal focus logic and the `el()` helper are where the v1 bugs lived, so DOM tests were worth one more dev dependency. `css: true` in the Vitest config is needed only so the `print.css?raw` import resolves in tests.
- **Old v1 sources left in place, then removed by Ryan** (`1a1f2f8`). The session's permission rules blocked deletion; flagging beat working around it.
- **Deploy workflow added (`51503cb`) then removed (`64b9a10`).** Added when the rebuild was framed as a production candidate; removed when `~/projects/CLAUDE.md` reframed every project as local-only. `CNAME`, sitemap, OG image and social meta removed for the same reason (`0d00276`). Favicons stay because the sandbox still opens in a tab.
- **Remote removed by Ryan** before the reframe pass. The sandbox never pushes.

## Data model (`src/types.ts`, `src/core/normalize.ts`)

- **`Recipe` holds only facts about the meal.** Spin scores live in a `ScoredRecipe` wrapper `{ recipe, matchedCount, ingredientMatch, vibeScore, blendedScore, seen }`, never spread onto the recipe. Stops v1's score fields leaking into favourites (bug 20) without a strip step at every write.
- **`instructions` kept as the raw string next to `steps`.** The vibe engine reads text and length; the UI reads steps. Re-joining steps would guess at newlines the length thresholds were tuned against (bug 1).
- **`id` and `area` captured.** `id` for identity (bug 19); `area` because it costs nothing and fills the modal meta row where the fake time was.
- **No `time` field.** TheMealDB has none; v1's constant 30 was the one untrue thing on the card (bug 8). Estimation deferred to its own experiment so the parser gets its own tests.
- **Optional fields are `null`, never `undefined`.** Survives `JSON.stringify` unchanged and reads the same from storage as from the API.
- **Description = first 120 chars of step one + "...", exactly as v1.** Derived from real data, so kept. Fallback changed from "A delicious meal worth trying." to "No description available." on Ryan's decision: the old line was filler shown as a blurb.

## API layer (`src/api/mealdb.ts`, `src/api/loadRecipes.ts`)

- **`encodeURIComponent` only, no underscore conversion.** Checked against the live API: `%20`, `_` and `+` all return the same meals for `chicken breast`. The scout's handoff said this was undeterminable; it was a thirty-second curl.
- **Injected `fetch`.** The client takes a `fetch`-shaped function so tests pass a fake and count calls. No mocking library.
- **Non-ok responses and malformed bodies throw.** v1 swallowed everything into `[]`, so "offline" looked like "no results" (bug 15). `{ meals: null }` is the API's real empty answer and stays a successful `[]`.
- **`Promise.allSettled` over per-ingredient calls, with `failedIngredients` reported.** One bad request must not sink three good ones. Results are read by index so order is input order.
- **Round-robin interleave, then dedup, then cap at 30.** v1's input-order concatenation starved the fourth ingredient (bug 13). Dedup before the cap so a meal under two ingredients does not use two slots. Per-ingredient cap of 10 kept from v1.
- **15 s `AbortSignal.timeout` on every request.** A five-ingredient spin hung past 30 s once in testing (throttling, probably). With the button disabled during a spin, no timeout means a dead page.
- **Session cache of normalised recipes, one `sessionStorage` key per id.** Cuts a repeat spin from about 28 lookups to 0 and removes the request burst. Normalised rather than raw so cache reads feed scoring directly. Per-id keys rather than one blob so a write is a few KB, not the whole cache. Tab lifetime is the TTL; nothing to invalidate. Failed lookups are not cached so a later spin retries.
- **Results kept in candidate order on both the cold and cached paths.** `allSettled` plus an index loop. Pinned by tests after the tiebreak bug made order matter.
- **`fetchRecipeDetails` removed** once `loadRecipes` existed; one detail path only.

## Scoring (`src/core/vibes.ts`, `src/core/scoring.ts`, `src/core/identity.ts`)

- **`vibeProfiles` reproduced from v1; one weight retuned.** `simple.lengthWeight` 0.2 → 0.3 so all ten profiles sum to 1.0 (`b3a6802`, Ryan's decision after the first pass flagged it). v1's `simple` could never score above 0.9. Everything else, including substring keyword matching and the exact thresholds, is untouched so behaviour is comparable rather than redesigned.
- **`scoreRecipeForVibe` returns 0 for an unknown vibe**, as v1 did, rather than throwing; the select value is user-controlled at runtime.
- **Ingredient match stays exact string equality.** Fuzzy matching is a separate experiment; changing it here would have muddied the comparison with v1.
- **Blend is `ingredient × 0.5 + vibe × 0.5`, then `× 0.3` if seen**, exactly v1. The fix was in what gets displayed, not the formula (bug 3).
- **`ingredientMatch` is 0, not NaN, for a recipe with no ingredients.** Guard the division.
- **Deterministic comparator: blended desc, matched count desc, name asc.** Ties are common with zero overlap; pool order differs between cold and cached spins; manual testing saw two different picks for one input (bug 24, `2db8941`). Name comparison is lowercased `<`/`>`, not `localeCompare`, so it does not depend on the user's locale.
- **`pickRecipe` returns `null` on an empty pool; random fallback takes an injected RNG.** v1 indexed an empty array and threw silently (bug 14). Injection makes the fallback testable and keeps `Math.random` out of the primary path.
- **Seen check: `seen.has(id) || seen.has(name)`.** Ids for new entries, names for lists the current production app wrote. No migration.
- **Seen penalty stays a multiplier in this build.** Manual round 2 asked for exclusion with a "you've seen everything" message; recorded in `ROADMAP.md` as the next logic experiment rather than changed mid-pass.
- **`parseIngredients` lives with scoring, not fetch.** Both need the cleaned list; the parser is pure.

## Storage (`src/storage/*`)

- **Same key names as v1.** Users keep their favourites, seen list and recently viewed with no migration (bug 6 context).
- **Every read is try/catch, including `getItem` itself; every write too.** Storage is best-effort. A corrupt value yields an empty list, not a dead page (bug 6).
- **Shape validation on read; v1 entries upgraded on the fly.** `name` is the only hard requirement; `id` defaults to `null`, `instructions` is derived from `steps`, score fields dropped. Discarding a bad entry beats crashing on it.
- **`toStoredRecipe` strips to the `Recipe` shape on write.** Belt and braces with the wrapper type; guarantees nothing contextual persists (bug 20).
- **Favourites cap 50, `add()` returns `'added' | 'exists' | 'full'`.** v1 had no cap (bug 9). Refusing the 51st with a message beat silently dropping a saved recipe. A string return, not a boolean, so the UI can tell "full" from "already saved".
- **Seen cap 20 FIFO, recently viewed cap 5 newest-first**, both exactly v1.
- **Identity by `id ?? name`.** Ryan's decision after the first pass kept name-only for carry-over. `sameRecipe` compares ids when both exist, names otherwise; `recipeKey` is what the remove button carries. Never `a.id === b.id` alone, because `null === null`.
- **Seen list stores `recipeKey`** (ids for new spins). Legacy names remain and age out of the 20-slot FIFO.
- **In-memory fallback when web storage throws.** Private windows. The stores take any object with `getItem`/`setItem`/`removeItem`, which is also what makes them testable.
- **Lookup cache in `sessionStorage`, same helpers as the other stores.** See API layer.

## UI (`src/ui/*`, `src/main.ts`, `index.html`)

- **No `innerHTML` with interpolated strings; a typed `el()` helper instead** (bug 7). Recipe names from the API break attributes and inject markup. The helper keeps call sites short; SVG icons via `createElementNS`.
- **Result card pills: "X/Y ingredients", "N% score", "N% vibe".** The blend is never called "match" (bug 3). The "% vibe" pill kept because it is true and useful.
- **Cook-time pill removed everywhere; modal meta shows ingredient count and cuisine instead** (bug 8). Both are real data.
- **Modal `open(recipe, trigger)` records the trigger explicitly and `close()` focuses it on all three paths** (bug 5). Explicit beats reading `activeElement` after a click has already moved focus. Skip the focus if the trigger left the DOM.
- **Escape listener added on open, removed on close.** Not a permanent global.
- **Focus trap recomputes focusables on each Tab.** Cheap, and correct if the modal's buttons change.
- **Recently viewed cards are `<button>`s with CSS resets** (bug 18). Free keyboard handling beats re-implementing it on a div.
- **Favourites remove reads `event.currentTarget.dataset.key`; the `pointer-events: none` rule is gone** (bug 4).
- **Spin button `disabled` plus an `inFlight` flag, reset in `finally`** (bug 16). `pointer-events: none` does not stop Enter.
- **Spin idle label read from the HTML at startup** (bug 11). One source of truth. The 🎰 is in the HTML.
- **Save button copy unified to "Saved to Favorites" with a filled heart** in both the pre-saved and just-saved states (bug 11). v1 had two different strings.
- **"Reset Suggestions" → "Clear seen history"** with a hint and a two-second "History cleared" swap of the text span only (`a5c0873`, Ryan's decision after manual testing). The button never generated suggestions; the name made a tie look like a bug. Swapping a span keeps the SVG and the accessible name stable.
- **Enter in the ingredients input spins.** Small addition; Ryan kept it.
- **Partial-failure line under the result, `role="status"`.** Says which ingredient could not be searched when the spin still succeeded. A misspelling is an empty result, not a failure, and gets no line.
- **Four distinct empty-result messages**: blank input, nothing found, service unreachable, details failed. Each maps to something the user can do.
- **Print: new window, DOM-built, null-window guard, `afterprint` close** (bug 17). The brief fixed the new-window approach; a print stylesheet on the modal is the noted alternative. Built from the `Recipe`, not the modal's markup, so it is independent of what the modal shows.
- **Print document carries its own small token set** (`--print-brand` etc.) because it cannot read the page's custom properties.
- **Fazier badge link gets `rel="noopener"` and the doubled slash removed** (bug 21). Google Fonts `preconnect` and a `<noscript>` line added (bug 22).
- **`aria-label` on `#vibe` and `aria-describedby="modal-body"` removed.** Label-in-name mismatch, and a description that reads the buttons. `aria-labelledby="modal-title"` is enough.
- **No `inert` behind the modal.** Would need the modal moved out of `.container`; `aria-modal` plus the trap covers it. Left as is on Ryan's decision.

## Styles (`src/styles/*`)

- **Every value a custom property in `tokens.css`; component files use no raw hex.** The v1 stylesheet had 21 copies of the orange. (Production issue #34.)
- **`--color-on-accent: #1a1a2e`** as the foreground on orange: 6.02:1 on brand, 4.73:1 on the pulse end; white was 2.84:1 and 3.61:1 (`97d37d2`, Ryan's decision: fix the foreground, not the orange).
- **`#5a6a8a` → `#8292ac` for dim text, `#a0a0c0` for placeholders.** 2.92:1 and 2.30:1 became 5.04:1 and 4.93:1.
- **`prefers-reduced-motion` targets the specific animated selectors**, not `*`. Readable, and does not catch a future functional animation.
- **`--font-display` falls back to Nunito, not `cursive`.** v1's `cursive` fallback rendered Comic Sans if the webfont failed.
- **The 320 / 400 / 600 breakpoints are each declared once**, in `responsive.css`; v1 declared two of them twice with a "targeted fixes" override block at the end.
- **Visual identity otherwise reproduced exactly** (navy surfaces, orange, Fredoka One + Nunito, pill row, bottom-sheet modal) so behaviour could be compared like for like. The redesign is a separate experiment with its own brief.

## Testing

- **Tests before code for every behavioural change**, and the project suite run before every commit. One slip (a commit made while another item's test was red) was reset and recommitted in the right order.
- **Pure modules tested with plain data; fetch and storage injected.** No mocking library, no network, no real `localStorage`.
- **Headless smoke script in the scratchpad, not the repo.** Drove the built site through spins, keyboard paths, print, corrupt storage and breakpoints. Not committed because it depends on a locally installed Chromium and is not part of the deliverable.

## UI rebuild against the chosen design (`src/ui/*`, `src/styles/*`, `index.html`)

- **C's skeleton, B's sheet structure, nothing from A** (Ryan's decision after phone-testing `design/mockups/`). B's structure is rendered in C's type and colour: the 18px sheet body and the density carry over; IBM Plex Sans and the cool greys do not.
- **Every motion value is a token** (`--reel-spin`, `--reel-land`, `--reel-max`, `--card-tip`, `--sheet-rise`, `--sheet-delay`, `--save-glow`, `--quick`) and the reel reads them from `getComputedStyle` at startup, so timing is tuned in `tokens.css` alone.
- **An amber `--estimate` token for the cook-time pill**, not coral. The brief said "amber-adjacent warning token"; C's only warning colour is coral, and coral on an estimate reads as an error. Amber at 9.9:1 on surface is a fourth hue with one job.
- **The dial is a fieldset of radio inputs**, not buttons with ARIA. Radios give the group semantics, the checked tab stop and screen-reader announcement for free; the label's `:checked + span` carries the gold state. Arrow keys are intercepted with `preventDefault` so the browser's own stepping does not double-move, and selection does not wrap at the ends.
- **The dial centres its set item with `rail.scrollTo`, never `scrollIntoView`.** `scrollIntoView` on load moved the page's focus starting point past the skip link and the input (found by the headless keyboard walk).
- **The reel never lands before `--reel-spin`**, even when the pick is instant, so a fast cache hit still feels like a spin. **Past `--reel-max` it skips the landing** and reports `'pulsed'` so the card pulses instead; a 4 s spin would feel like a hang. **Reduced motion means no reel movement at all.**
- **The reel is hidden until the first spin.** An empty 228px window with a payline before any spin was the first thing on the page and said nothing.
- **The reel's landing freezes the loop by reading the computed `matrix()`** and continues from there, so the deceleration is continuous with the loop.
- **Reel rows are built from the filter stubs** (name and thumbnail arrive before details), so the reel shows real candidates while the lookups load.
- **The Save lamp is `aria-pressed` plus `box-shadow`**, no `filter: blur`. Blur repaints the layer every frame of the glow transition; a shadow does not.
- **The saved card's lamp is always lit.** It is in the Saved list, so it is saved; the dot says so without a second toggle.
- **Ticks in the sheet live only while it is open.** Persisting them would need a key per recipe and a reset affordance; for "what have I added to the pan" the open session is the right lifetime.
- **Save, Print, Close are a flex-column footer, not `position: sticky`.** The sheet is a fixed flex column with `min-height: 0` on the scroll area; sticky inside an overflow container behaves differently across mobile browsers.
- **The sheet becomes a centred panel at 1024px** (the brief) rather than 720px (the mockup).
- **The card tip is applied to the result region, passed in by the caller**, so opening the sheet from a saved or recent card tips nothing.
- **Cook time: largest single duration plus three minutes per step**, bucketed; never a number. Ranges take the larger end, "overnight" is 12 hours, "half an hour" is 30. No duration at all gives null and the sheet shows a dash rather than a guess.
- **The estimate is derived in `normalizeMeal` and carried by the storage codec**, so it is cached with the recipe and v1 entries read back as null.
- **`main` has `tabindex="-1"`** so the skip link actually moves focus in every browser.
- **Emoji are gone.** Messages are plain text; failures are coral.
- **Out of scope and not built**: Surprise Me, exclusion instead of penalty, servings scaling, equipment inference, a real logo.

## Final sandbox pass (scroll, exclusion, surprise me, servings spike)

- **Scroll after focus, with `preventScroll` on the focus call.** Focus first so the ring is on the card, then scroll so the ring is on screen; the other order scrolls to the region's top and can leave the buttons clipped again.
- **One computed scroll, measured on the result region, with a `--card-scroll-margin` token.** The first version called `scrollIntoView({ block: 'nearest' })` and then nudged by the overflow; on a phone the two smooth scrolls interrupted each other and the nudge measured the card before it had moved, leaving "Spin again" flush with the bottom edge (manual round 4). The card's arrival animation also transforms it, which shifts its rect but not its layout, so the region (untransformed) is what gets measured. For a card taller than the viewport the bottom wins, accepting that the image's top goes off screen. The buttons matter more than the photo right after a spin.
- **Never scroll for a notice.** A one-line message does not need the page to move.
- **Exclusion, not a penalty.** The 0.3× multiplier let a seen recipe win a small pool, which made "clear history" feel broken (Ryan, manual round 2). Seen recipes leave the ranked pool; `scoreRecipe` still reports `seen` so the card could show it.
- **`pickRecipe` returns a tagged result** (`pick` / `exhausted` / `empty`) instead of `ScoredRecipe | null`. The three outcomes need three different messages, and a null cannot say which.
- **The exhausted notice carries the clear action inline and spins again on click.** The message says "Clear history to start over.", two sentences with a full stop rather than a dash (Ryan, round 4); making the user find the button at the bottom of the page would be a second step for no reason. The main "Clear seen history" button stays for the deliberate case.
- **The random fallback draws from unseen candidates only.** Otherwise a pool where every unseen candidate scores zero could re-show a seen one.
- **Surprise me is a text link, not a second gold button.** Gold is for the machine; a random roll is a shortcut.
- **Surprise me re-rolls at most three times and then returns the last roll even if seen.** Three `random.php` calls is the cost ceiling; after that, showing something beats showing nothing.
- **Every surprise roll is cached by id**, so a later ingredient spin that lands on it skips the lookup.
- **Surprise results score with an empty ingredient list** (`ingredientMatch` 0, so the blend is half the vibe score) and the card shows "— ingredients". The score pill stays because the vibe half is real.
- **Surprise and Spin share `showPick`** so the reel, seen list, recently viewed, card and scroll behave identically; "Spin again" on a surprise card rolls again rather than spinning with an empty input.
- **The measure parser canonicalises units but drops vague ones** (pinch, sprig, dash, handful) to null while keeping the quantity, so a scaler can multiply "2 sprigs" without a weight.
- **Ranges take the low end** ("1-2 cloves" → 1). Scaling the low end is the conservative choice; the high end can be reintroduced later as a second field.
- **The spike's bar was quantity rate, not unit rate.** Scaling needs a number; a unit is only needed for conversion, which a servings control does not do. 90.8% clears the 85% bar; the misses are strings that should not scale anyway.
- **No servings control**, per the brief. The real question the spike surfaced is that MealDB has no base servings, so any control is a multiplier with an assumed base; that is design work for the production app, not the sandbox.

## Publication as 2.0.0

- **The rebuild ships as 2.0.0, with its commit history.** It replaces the v1 app at pantryroulette.com. The history shows how it was built, which is part of the point of publishing it. Ryan's decision.
- **Proprietary, not MIT.** The source is public for reference and portfolio purposes; `LICENSE` reserves all rights. v1's `package.json` said MIT; that field is removed rather than changed to a licence identifier, since npm publishing is not a use.
- **Private planning moved out of the repo, history not rewritten.** The hand-code spec, its issue drafts, the reference map, the rebuild report and the internal roadmap now live outside the repo. Their old versions remain in past commits; rewriting history to remove them would break every hash quoted in `BUGS_RESOLVED.md` and in this file.
- **The hand-code plan is retired.** `core/` and `api/` will be rewritten by hand after launch, as ownership work, with the existing tests as the contract.
- **A public `ROADMAP.md`** in plain language for people who use the app, not the internal experiment list.
- **The design brief stays public** as `design/brief/DESIGN_BRIEF.md`; it is the first artifact of the process the README describes.
- **Social and search tags restored** (`og:*`, `twitter:*`, canonical, sitemap, `CNAME`) now that this is the public site. The `og:image` URL points at a PNG Ryan adds himself.
- **Agents work on feature branches and never push** (`CLAUDE.md`). Ryan reviews and pushes.

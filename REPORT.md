# Rebuild report

> **Read this first.** When this report was written the rebuild was being treated as a candidate to replace the production site. That was the wrong frame. This directory is a local sandbox: no remote, no deploys, nothing shipped. Its output is a reference implementation and a set of written-down decisions that Ryan uses to hand-code the production app himself in the public repo. Everything below is kept as a record of what was found and why things were built the way they were; the merge and deploy guidance that used to be here has been removed. The condensed, per-decision version lives in `handoff/DECISIONS.md`, and the build plan in `handoff/HANDCODE_SPEC.md`.

Builder notes for Ryan. Branch `rebuild/v2`; 20 commits across three passes (rebuild, release readiness, pre-merge fix); 132 tests. Build output at the end of the third pass: 9.4 kB HTML + 14.9 kB CSS + 19.7 kB JS (2.6 / 3.3 / 7.5 kB gzipped), measured for reference only.

## 1. Where I disagreed with the handoff, or found it inaccurate

- **TheMealDB and `%20`.** §5 says it is not determinable whether MealDB accepts `%20` for multi-word ingredients. I checked: `chicken%20breast`, `chicken_breast` and `chicken+breast` all return the same meals. Plain `encodeURIComponent` is enough; no underscore conversion needed.
- **"Weights sum to 1.0".** The brief asked for a test asserting each profile's weights sum to 1.0. Nine do. `simple` is `0.3 + 0.4 + 0.2 = 0.9`, exactly as shipped in v1. The handoff reproduces the profile correctly but does not call this out. I kept 0.9 (the mandate was "do not retune") and the test asserts 0.9 for `simple` and 1.0 for the rest. The practical effect: `simple` can never score above 0.9, so it is slightly disadvantaged in the 50/50 blend. Worth a one-line retune to `lengthWeight: 0.3` when you do a tuning pass.
- **WCAG AA.** §10 says the light text colours clear AA, which is true, and flags `#5a6a8a` as borderline. It is worse than borderline: 2.9:1 on the card surface and 2.3:1 as placeholder text on the input. I lifted it to `#8292ac` (5.0:1) and the placeholder to `#a0a0c0` (4.9:1). What the handoff does not mention: white on the brand orange `#ff6b35` is 2.84:1, which fails AA for the primary button, and the orange on navy headings are fine only because they are large. I did not change the orange because it is the visual identity. Your call whether to darken the button to around `#e04e10` or accept it.
- **Bug 14's "random fallback is unreachable".** Correct, and still mostly true after the fix: with real instruction text every known vibe gives a non-zero score for any recipe with at least one ingredient, so the fallback only triggers for an unknown vibe value. It is now reachable, deterministic under test, and cannot crash. I did not redesign the scoring to make it matter.
- **§8 modal `aria-describedby="modal-body"`.** §10 lists it as a gap (it points at the whole modal including buttons). I dropped the attribute rather than point it at the steps list, which would make screen readers read every step on open. Same for the `aria-label` on `#vibe`, which overrode the visible label.
- **The print "Arial on white" look.** §13 suggests a print stylesheet or iframe instead of `window.open`. The brief fixed the approach to a new window, so that is what I built, but with DOM construction, a null-window guard and `afterprint` close. A print stylesheet on the modal would be smaller and would not need pop-up permission; worth revisiting.

## 2. Decisions you should review

Updated after the release-readiness pass (commits `97d37d2` to `d4101bb`) and the pre-merge fix (`2db8941` to `3c614ad`). Every item flagged in the first pass got a decision; what follows is what was resolved and what is still worth a look when hand-coding.

**Resolved by the later passes.**

- v1 sources removed in `1a1f2f8`; the sandbox tree is TypeScript only.
- White on orange fixed with `--color-on-accent: #1a1a2e` (6.02:1 on brand, 4.73:1 on pulse end). The orange is unchanged.
- `simple.lengthWeight` retuned to 0.3; all ten profiles sum to 1.0. Logged in the changelog as the one deliberate scoring change.
- Identity by `idMeal` with name fallback for legacy entries (`src/core/identity.ts`). No migration.
- Lookup cache in `sessionStorage`. Measured in the headless smoke run: a cold three-ingredient spin made 3 filter + 28 lookup requests; the same spin again made 3 + 0; adding a fourth ingredient made 4 + 5. Per-spin cost is now `ingredients + uncached candidate ids`.
- Partial-failure notice under the result. Note the distinction: a misspelled ingredient is not a failure, it is an empty result list and shows nothing. The notice fires only when the request itself fails (network, HTTP error, timeout).
- Description fallback is "No description available."
- A GitHub Pages deploy workflow was added in `51503cb` and removed again in `64b9a10` once the project was reframed as local-only. `CNAME`, the sitemap, the OG image and the social meta tags were removed for the same reason. Favicons stay because the sandbox still renders in a browser tab.
- Ranking ties are broken deterministically (`2db8941`); the "Banana Pancakes then Apple Pie" repro from manual testing no longer happens.
- "Reset Suggestions" is "Clear seen history" (`a5c0873`); the button only ever cleared the list.

**Still worth a look.**

- The seen list now stores ids for new spins and keeps any v1 names. A v1 name that matches a new recipe's title still penalises it. Harmless, and it ages out of the 20-slot FIFO.
- `fetchRecipeDetails` was removed with the cache; `loadRecipes` is the only detail path.
- Partial failures with one ingredient down proceed and show the note. If you would rather block, `findCandidates` already returns what you need.
- Scoring design otherwise untouched: substring keywords, exact-equality ingredient matching, multiplier seen penalty (handoff §14 Q5, Q6, Q9).
- No `inert` behind the modal and the print flow still uses `window.open`, per the brief.
- Manual testing asked for a different seen-list behaviour: exclusion instead of a 0.3× penalty, with a "you've seen everything" message. Recorded in `ROADMAP.md` as the next logic experiment.

## 3. Three feature proposals (not built)

### Honest cook-time estimate from instruction text

**What.** Scan `instructions` for duration phrases (`20 minutes`, `1 hour`, `45 mins`, `1-2 hrs`), take the sum of distinct cooking steps' times, and show "~45 min (est.)" only when at least one duration was found. Hide the pill otherwise.

**For.** It replaces the removed time pill with something derived from real data; MealDB instructions mention durations often; the parser is pure and testable; users scan for time first.

**Against.** Summing is wrong when steps overlap ("simmer 20 minutes while the rice cooks") and max is wrong when steps are sequential, so any single rule is sometimes off by a lot. Prep time, marinating and resting ("rest overnight") swing it further. Roughly a third of recipes would show no estimate, which makes the card inconsistent.

**Recommendation.** Build it, but as a range bucket rather than a number: "under 30 min", "30 to 60 min", "over an hour", computed from the max single duration plus a step-count heuristic, and always labelled as an estimate. Buckets absorb the parser's error. One pure module, one test file, no API change.

### "Surprise me"

**What.** A secondary button that calls MealDB's `random.php` and renders the result through the same card, with the vibe score shown but no ingredient pill.

**For.** It fits the "roulette" identity better than anything else in the app. Zero input, so it solves the blank-pantry start. One endpoint, one function, no new state.

**Against.** It ignores the pantry, which is the product's core promise. The seen penalty does not apply, so it can repeat.

**Recommendation.** Build it as a small text link under the spin button rather than a second primary button, so it reads as a shortcut and not a competing mode. Re-roll up to three times if the result is in the seen list. Half a day.

### Cuisine filter

**What.** A select for `strArea` (British, Italian, Japanese, ...) that filters or boosts candidates.

**For.** The data is already captured on every recipe. It is the most common recipe-site filter.

**Against.** MealDB's `filter.php?a=` cannot be combined with ingredient filtering, so a hard filter has to run on the post-fetch pool of at most 30 candidates. With two or three ingredients, picking a cuisine will often leave zero candidates and the app shows "nothing found". A third input also crowds the card on a 320 px screen, and cuisine overlaps conceptually with vibes (Classic, Fancy).

**Recommendation.** Do not build it as a filter. If you want it at all, make it a soft boost inside scoring (`+0.1` to the blend when the area matches) with the select defaulting to "Any". Even then I would wait until the candidate pool is larger or cached.

## 4. Things I am unsure about

- Emoji in the CSS `::before` pills still cannot be confirmed visually; the headless smoke browser has no emoji font. Same pattern as v1.
- Emoji pills were confirmed rendering in Ryan's manual round 1, so that worry is closed; the headless limitation remains for any future automated check.
- `sessionStorage` quota: each cached recipe is a few KB and a long session could cache a few hundred ids. Writes are best-effort and a quota error is swallowed, so the worst case is a cache miss, not a crash.

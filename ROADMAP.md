# Roadmap: experiments to run

This sandbox never ships, so nothing here is a feature to release. Each entry is an experiment to run here first, write up, and then carry into the hand-coded production app if it earns its place. Decisions are recorded in `handoff/DECISIONS.md` as they are made.

## Done: redesign

Three directions were mocked up (`design/mockups/`), Ryan chose C with B's sheet structure, and `src/ui/` and `src/styles/` were rebuilt against it. The system is written up in `design/SYSTEM.md` and §8 of `handoff/HANDCODE_SPEC.md`. Ryan's Round 3 manual test (`docs/MANUAL_TEST.md`) is the gate before anything else happens.

## Done: Round 3

All PASS on a real phone; the fonts render, 1.7 s of reel feels right, fast "Spin again" does not fight the card tip. Its two notes became the scroll-to-card fix and the servings spike. Round 4 (`docs/MANUAL_TEST.md`) covers the final pass: scroll to card, exclusion, Surprise me.

## After the sandbox

This was the last build pass here. The project is now a reference implementation; Ryan hand-codes the production app from `handoff/`, starting with `HANDCODE_SPEC.md` §9. Still open for a future sandbox pass, if any: the servings control (parser ready), equipment inference, a real logo.

## Servings scaling: spike says go, not built

`src/core/measurements.ts` parses a MealDB measure string into quantity and unit. Measured on 50 random recipes (467 measure strings): 90.8% yield a numeric quantity, above the 85% bar; 69.2% also resolve a known unit. What does not parse is almost all genuinely unquantified ("Pinch", "To taste", "To serve", "Garnish"), which a servings control should leave alone rather than scale. Full numbers and the recommendation in `design/SERVINGS_SPIKE.md`. The control itself is out of scope for the sandbox; the parser is ready for whoever builds it.

## Logic experiments, approved

### Done: exclusion instead of penalty

Built in the final sandbox pass (`pickRecipe` returns `'exhausted'` when every candidate has been seen; the notice carries an inline clear-history action). The original plan, for the record: spin excludes seen recipes outright; the 0.3× multiplier goes away. When every candidate for the input has been seen, show a result-area message, "You've seen everything for these ingredients — clear history to start over", with the clear-history action inline. Keep the seen list cap of 20. This came out of manual testing, where the penalty made "clear history" feel like it did nothing when two recipes tied.

### Done: cook-time range buckets

Built as `src/core/cookTime.ts` during the UI rebuild. The original plan, for the record: derive an estimate from duration phrases in the instruction text (`20 minutes`, `1 hour`, `45 mins`, `1-2 hrs`) and show it as a bucket, not a number: "under 30 min", "30 to 60 min", "over an hour". Compute from the largest single duration plus a step-count heuristic. Always label it as an estimate. Hide the pill entirely when no duration is found. One pure module in `core/`, one test file, no API change. Related production issues: #35 (hardcoded cook time), #41 (cook time filter).

### Done: "Surprise me"

Built in the final sandbox pass (`api/surprise.ts`). The original plan, for the record: a text link under the spin button that calls TheMealDB `random.php` and renders the result through the normal card with the vibe score but no ingredient pill. Re-roll up to three times if the result is already in the seen list. Styled as a shortcut, not a second primary button. Related production issue: #40.

## Rejected

### Cuisine filter

TheMealDB cannot combine `filter.php?a=` with ingredient filtering, so a cuisine filter would have to run on the post-fetch pool of at most 30 candidates and would mostly produce "nothing found". `strArea` is captured on every recipe and shown in the modal; revisit only as a soft scoring boost if the candidate pool ever grows.

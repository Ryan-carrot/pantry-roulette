# Roadmap

Decisions from the v2.0.0 release review. Nothing here is built yet.

## v2.1

### Approved: cook-time range buckets

Derive an estimate from duration phrases in the instruction text (`20 minutes`, `1 hour`, `45 mins`, `1-2 hrs`) and show it as a bucket, not a number: "under 30 min", "30 to 60 min", "over an hour". Compute from the largest single duration plus a step-count heuristic. Always label it as an estimate. Hide the pill entirely when no duration is found. One pure module in `core/`, one test file, no API change.

### Approved: "Surprise me"

A text link under the spin button that calls TheMealDB `random.php` and renders the result through the normal card with the vibe score but no ingredient pill. Re-roll up to three times if the result is already in the seen list. Styled as a shortcut, not a second primary button.

### Approved: exclusion instead of penalty

Spin excludes seen recipes outright; the current 0.3× multiplier is replaced by exclusion. When every candidate for the input has been seen, show a result-area message, "You've seen everything for these ingredients — clear history to start over", with the clear-history action inline. Preserves the seen list cap of 20.

### Rejected: cuisine filter

TheMealDB cannot combine `filter.php?a=` with ingredient filtering, so a cuisine filter would have to run on the post-fetch pool of at most 30 candidates and would mostly produce "nothing found". `strArea` is captured on every recipe and shown in the modal; revisit only as a soft scoring boost if the candidate pool ever grows.

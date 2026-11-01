# Servings spike: can MealDB measures be scaled?

A go / no-go on a servings control, not a feature. The question: if the user taps "6 servings" on a recipe written for 4, can we multiply the measures? That needs a numeric quantity in most measure strings. The bar set for "go": at least 85% of measure strings yield one.

## Method

`src/core/measurements.ts` (`parseMeasure`, pure, 27 unit tests) turns a MealDB measure string into `{ qty, unit, raw }`: integers, decimals, unicode and ASCII fractions ("¾", "1/2", "1 1/2", "2½"), ranges ("1-2" and "1–2" take the low end), and a table of common units with plurals and abbreviations folded to one spelling. Vague units ("pinch", "sprig", "handful", "dash") keep their quantity but report no unit, so a scaler can multiply "2 sprigs" without pretending to know what a sprig weighs.

Sample: 50 random recipes from `random.php` (the app's lookup cache lives in the browser, so the script fetched fresh), 467 measure strings, run through the parser from a Node script in the scratchpad on 2026-10-27.

## Result

| | Count | Rate |
|---|---|---|
| Measure strings | 467 | |
| With a numeric quantity | 424 | **90.8%** |
| With a quantity and a known unit | 323 | 69.2% |
| With a quantity but an unmapped word after it | 101 | 21.6% |
| No quantity | 43 | 9.2% |

Units found, most common first: none/unmapped 101, tsp 75, g 72, tbsp 62, cup 54, ml 17, clove 14, lb 13, l 5, oz 4, kg 3, quart 2, bunch 1, can 1.

### The 17 distinct strings with no quantity (all 43 occurrences)

| String | Count | Note |
|---|---|---|
| Pinch | 10 | not a quantity; leave as is when scaling |
| To taste | 7 | same |
| To serve | 6 | same |
| Zest of 1 | 4 | the number is of the fruit, not the zest; parseable with a special case |
| Garnish | 3 | not a quantity |
| For frying | 2 | not a quantity |
| Dash | 1 | not a quantity |
| To Glaze | 1 | not a quantity |
| to serve | 1 | case variant of the above |
| pinch | 1 | case variant |
| Half | 1 | 0.5; parseable with a word-number table |
| Grated | 1 | not a quantity |
| Sprinkling | 1 | not a quantity |
| Splash | 1 | not a quantity |
| For brushing | 1 | not a quantity |
| Handful | 1 | vague; not a quantity |
| Drizzle | 1 | not a quantity |

Only "Zest of 1" and "Half" are failures of the parser; the other 15 are strings a servings control should display unchanged. Counting those as correctly handled, the effective rate is 94.2%.

### Words after a parsed quantity that are not units

large 14, medium 9, sliced 7, chopped 7, small 5, diced 3, tbls 2, pinch 2, beaten 2, sprigs 2, bag 1, parts 1, handfull 1, knob 1. These are sizes and preparations ("4 large", "2 sliced"), which is fine: the quantity scales and the word stays. "tbls" and "handfull" are spellings worth adding to the table.

## Recommendation: go

The parser clears the bar on the first pass and the misses are the right misses. A servings control built on it should:

1. Scale `qty` where it exists and render the rest of the string unchanged ("4 large" → "6 large", "Pinch" → "Pinch").
2. Format scaled quantities back into the recipe's own idiom: fractions for cups and spoons (1.5 → "1½"), integers for grams and millilitres (rounded), and never more than one decimal.
3. Treat the recipe's base servings as unknown. MealDB has no servings field, so the control is a multiplier ("×1.5") or a relative stepper ("4 → 6" with 4 assumed), and the UI should say which. This is the real design question and the reason it stays out of scope here.
4. Add "Zest of N", "Half", "tbls" and "handfull" to the parser first; that moves the quantity rate to about 92% and costs ten lines.

Not built: the control, the formatting, the base-servings assumption. The parser is in `core/` with tests so the production app can pick it up when the UI question is answered.

# Round 1 - Manual Tests

## Feel checks — things the builder couldn’t see

- Do the emoji pills (⏱ 🧄 ✅ 🎭) render? The builder’s headless Chromium had no emoji font, so this is unverified.
- Does the spin button read correctly with dark navy text on orange? That contrast fix is new. If it looks wrong to your eye, say so, passing AA doesn’t mean it looks good.
- Does the modal still feel like the modal? Bottom sheet on a narrow window, centred card on wide.

### Result =>

- PASS: Emoji pills render
- PASS: The contract on the spin button looks okay
- PASS: The modal still feels like a modal

## Behaviour checks — the fixes from this pass

- Spin chicken, garlic, lemon → note the result → spin again with the same input. Second spin should be noticeably faster (lookup cache).
- Spin eggs, pasta, olivee oil (misspelled on purpose). You should get a result and a “Couldn’t search for: olivee oil” line under it.
- Save the result, then open the favourites card and confirm “Saved to Favorites” state matches on both.
- Reset suggestions, spin the same ingredients, confirm the result changes.

### Result =>

- PASS: Very slightly faster on the second spin
- N/A: spinning eggs, pasta and olivee oil yielded a result for applie pie, and no “Couldn’t search for: olivee oil” line under it.
- PASS: "Saved to Favorites" state matches
- FAIL: first spin was banana pancakes. Reset suggestions and next result was applie pie. Reset suggestions two more times and the result was stuck on apple pie.

## Keyboard-only run — no mouse

- Tab from page load: skip link → ingredients → vibe → spin → reset. Enter in the ingredients field should spin.
- Tab to a recently-viewed card, Enter opens the modal. Escape closes it and focus lands back on that card.
- Tab to “View Full Recipe” on the result, Enter, close with the X button, confirm focus returns to “View Full Recipe.”

### Result =>

- PASS: tabbing works, enter in ingredients fields spins
- PASS: worked as described
- PASS: worked as described

## Break it on purpose

- DevTools → Application → Local Storage → set pantryRouletteFavorites to the literal string garbage. Reload. Page should load clean, favourites empty, no console errors.

### Result =>

- NOT COMPLETED: "set pantryRouletteFavorites to the literal string garbage" is not a descriptive test step. Please revise this test step.

## Partial-failure test revised

- Open DevTools → Network tab → right-click any request → “Block request URL” → enter _filter.php?i=garlic_. Then spin chicken, garlic, lemon. You should get a result from chicken and lemon plus a “Couldn’t search for: garlic” line. Remove the block afterward.

### Result =>

- NOT COMPLETED: _filter.php?i=garlic_ fails to parse as a URLPattern and cannot be added as a block. Please revise this test step.

# Round 2 - Manual Tests

## Reset suggestions Diagnostic

1. Spin chicken, garlic, lemon
2. Click Reset Suggestions
3. F12 → Console tab → paste and press Enter:
   localStorage.getItem("pantryRouletteSeenRecipes")

### Result =>

- null
- UX Expectation: "Reset Suggestions" returns a different recipe every time. If there is a tie, alternate the result. After the result alternates once, and ends up on an already viewed recipe again, provide a tooltip that states: "no other recipes". Or something similar.

## Revised test steps - Corrupt storage

1. F12 → Application tab (top bar; may be under » if the window is narrow)
2. Left sidebar → Storage → Local Storage → click http://localhost:4173
3. In the table, find the row where Key = pantryRouletteFavorites
4. Double-click its Value cell, select all, type: garbage → press Enter
5. Reload the page (F5)
   Expected: page loads normally, favourites section shows empty state,
   Console tab shows zero red errors.

### Result =>

- PASS: Behaved as described

## Revised test steps - Partial failure

1. F12 → Network tab
2. Right-click any row in the request list → "Block request URL"
   (if the list is empty, spin once first to populate it)
3. In the blocking panel that opens, click the + and enter exactly:
   _filter.php?i=garlic_
4. Spin: chicken, garlic, lemon
   Expected: a result appears, with a line underneath reading
   "Couldn't search for: garlic"
5. Afterwards: uncheck or delete the pattern in the blocking panel

### Result =>

- PASS: Had to input: https://www.themealdb.com/api/json/v1/1/filter.php?i=garlic exactly, and remove all asterisks or any preceding characters. Finally got the "Couldn't search for: garlic" message

# Round 3 - Manual Tests (redesigned UI)

Run `npm run dev` and open it on your phone over Wi-Fi (`npm run dev -- --host`), then once more in a desktop window wider than 1024px. Expected results are in brackets. Record PASS / FAIL and what you saw.

## Look

- Fonts: headings and the vibes on the dial should be the sharp display face (Bricolage Grotesque), body the plainer one (Archivo). [Neither should look like the system default after the page settles.]
- The only gold things on screen before a spin: the Spin button, the notch above the dial, and the vibe you have set. [Nothing else is gold.]
- Resize to 320px wide. [No horizontal scroll; the card title wraps; the dial still shows three vibes.]

### Result =>

-

## The spin

1. Type `chicken, onion, tomato`, leave the vibe on Comfort, tap Spin. [The reel appears under Spin and runs for about 1.7 s, decelerates, and stops with a recipe on the gold payline. The card pays out beneath it. The reel stays, showing the landed row.]
2. Tap "Spin again" on the card. [Same, and the previous card is replaced, not stacked.]
3. Tap Spin again immediately after a result, three or four times in a row. [Each spin runs cleanly; no card is left tipped or half-faded.]
4. Turn on airplane mode and spin. [The reel stops and a coral line reads "Couldn't reach the recipe service..."]
5. In DevTools → Network, throttle to "Slow 3G" and spin. [The reel keeps running while data loads. If the data takes longer than about 2.5 s, the reel stops without the decelerating landing and the card appears with a brief pulse instead.]

### Result =>

-

## The dial

1. Swipe the dial left and right. [It snaps so one vibe sits under the notch, set in gold.]
2. Tap "See all ten". [The rail becomes a two-column grid (five columns on desktop); the set vibe is gold. Tap one: the grid closes and the dial shows it.]
3. Keyboard: Tab to the dial, press Right arrow twice, Left arrow once. [Focus and the gold move together; it does not wrap past Lazy or Impressive.]

### Result =>

-

## The sheet

1. Tap "View recipe" on the card. [The card tips away and the sheet rises from the bottom with a small overshoot. Close is focused.]
2. Check the meta row. [Ingredient count, cuisine, and an amber "~30–60 min · estimate" pill, or a dash if the recipe text mentions no times.]
3. Tap three ingredient rows. [Each ticks green with a strike-through; the count reads "3 of N".]
4. Close and reopen the same recipe. [Ticks are cleared.]
5. Scroll to the bottom of the steps. [Save, Print and Close never leave the bottom edge.]
6. Tap Save in the bar. [It turns green and reads "Saved"; close the sheet and the card's Save button is lit too, and the recipe is in Saved below.]
7. Desktop: open the sheet. [It is a centred panel, not a bottom sheet, with the bar at its foot.]

### Result =>

-

## Keyboard-only walk (no mouse)

Tab from page load, then Enter / Space where noted:

1. Skip link → Enter [focus lands in the main area] → Tab → ingredients field → type → Tab → "See all ten" → Tab → the set vibe → Tab → Spin → Enter.
2. After the spin: [focus is on the result card]. Tab → View recipe → Tab → Save → Shift+Tab → Enter on View recipe.
3. In the sheet: [Close is focused]. Tab → [first ingredient checkbox]; Space ticks it. Shift+Tab, Shift+Tab → [Close again: the trap wraps].
4. Escape. [The sheet closes and focus is back on View recipe.]
5. Tab to a Recently viewed thumbnail, Enter. [Sheet opens, no card tip]. Escape → [focus back on that thumbnail].

### Result =>

-

## Reduced motion

Turn on "Reduce motion" in the OS (Android: Settings → Accessibility → Remove animations; iOS: Accessibility → Motion). Reload and spin. [No reel movement: the rows appear settled when the pick lands. The card appears without tipping or sliding. The sheet appears in place.]

### Result =>

-

## Break it on purpose

1. DevTools → Application → Local Storage → set `pantryRouletteFavorites` to `garbage` and reload. [Page loads clean, Saved is empty, no console errors.]
2. Block `https://www.themealdb.com/api/json/v1/1/filter.php?i=onion` in Network and spin `chicken, onion, tomato`. [A result appears with a coral "Couldn't search for: onion" under the card.]

### Result =>

-

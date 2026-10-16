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

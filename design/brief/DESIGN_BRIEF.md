# Pantry Roulette — Redesign Brief

Fill this in. Rough notes are fine; specificity matters more than polish.
Vague answers ("clean", "modern", "professional") produce generic output.
Specific answers ("the way Linear uses one accent colour and everything
else is grey") produce something with a point of view.

Save this as `handoff/DESIGN_BRIEF.md` in the sandbox when done.

---

## 1. Three references

Three apps, sites, or screens whose _feel_ you want. For each, one
sentence naming the specific thing — not the overall vibe.

Good: "Mela (recipe app) — the recipe view puts the photo full-bleed at
the top and the ingredients in a sticky column you can check off."
Bad: "Mela — it looks clean and modern."

Where to look if you need prompts: real apps you already use and like,
even outside food. Mobbin.com has real app screenshots by category
(free tier works). Avoid Dribbble — it's concept art, not shipped UI.

**Reference 1:**
Name: SuperCook - https://play.google.com/store/apps/details?id=com.supercook.app&hl=en_US&pli=1
The specific thing:

**Reference 2:**
Name: Eat This Much - https://play.google.com/store/apps/details?id=com.eatthismuch&pli=1
The specific thing: I like the card layout on the recipes, with options underneath the image, and then prep time and cook time underneath that. I also liked the ability to adjust servings right there at the top before you dive into a recipe.

**Reference 3:**
Name: MealThinker - https://play.google.com/store/apps/details?id=com.mealthinker.app
The specific thing: They use darker background tones with headings being the brightest, then paragraphs being a little muted. Then they highlight actions in the UI with color, like toggle switches having a green boarder on the pull and a green background when activated to show it's activated. Or highlighting one of the nav icons green to signify that that is the page you are currently on.

---

## 2. What stays

Decide each one. "Keep", "Drop", or "Open" (let the mockups decide).

| Element                                               | Decision | Note |
| ----------------------------------------------------- | -------- | ---- |
| The name "Pantry Roulette" and slot-machine identity  | Keep     |      |
| Dark mode as the default                              | Keep     |      |
| Navy palette (#1a1a2e / #16213e / #0f3460)            | Open     |      |
| Orange accent (#ff6b35)                               | Open     |      |
| Fredoka One for headings                              | Open     |      |
| Nunito for body                                       | Open     |      |
| The "vibe" concept as a named-mood selector           | Open     |      |
| Ten vibes (vs. fewer)                                 | Open     |      |
| Emoji anywhere in the UI                              | Open     |      |
| Single-column stacked layout                          | Open     |      |
| Bottom-sheet modal on mobile                          | Keep     |      |
| Meta pills (ingredients / score / vibe) on the result | Keep     |      |
| Recently viewed strip                                 | Open     |      |
| Favourites list on the main page (vs. its own view)   | Keep     |      |
| The 540px max-width card feel                         | Open     |      |

---

## 3. What's concretely wrong now

"Child's play" is a reaction, not a diagnosis. Name the actual things.
Look at the current app on your phone and on desktop and write down
what bothers you, one per line. Examples of the kind of specificity
that helps:

- "Every element is the same width, stacked. Nothing has hierarchy."
- "The result card's image is a flat rectangle with no relationship
  to the text around it."
- "The spin button looks like a generic form submit."
- "The ten-item dropdown is the wrong control for choosing a mood."
- "There's no sense of the 'spin' — the result just appears."
- "It reads as a tutorial project because of X."

Your list:

- There is no sense of spin when you click the button to spin for a recipe. I would like to incorporate some form of spin animation or transition
- Orange and navy as the only two colors feels flat and lifeless. I want a more complex color palette with more colors
- The rounded font feels too playful and unprofessional. The font should be more sharp and carry more of a professional, modern tone
- The lack of a transition between clicking on the open recipe button on the card to opening the modal makes it feel unfinished
- The rest is branding, which I (Ryan) need to get a better logo
- ***

## 4. Context of use

Where and how is this actually used? Answer honestly from your own
and my wife's usage. This constrains layout more than any aesthetic
preference.

- Device, realistically: Mobile device / phone
- Time of day / mental state: Dinner time / exhausted and wanting something quick
- One-handed? Hands dirty?: One-handed or set on counter
- How many seconds before you expect a result?: 5 to 10 seconds
- Do you read the full recipe on the phone, or print it / move to a
  bigger screen?: read recipe on phone
- Is anyone else in the household using it? How?: No, just me and my wife currently. Although I do have a few friends that say they use it

---

## 5. The one screen that has to be great

If one screen is excellent and the rest is merely fine, the app feels
redesigned. Which screen? (Probably the result card, but decide.)

Screen: the recipe modal

What "great" means for that screen, in your words: Great means that the food/recipe is clearly represented with the image that displays, the recipe title is descriptive, and every function one would need for a recipe is all present, right there. It should look and feel complete and intentional, like someone knows the struggle of cooking with their phone out or on the counter while exhausted and just wanting some food. I do think that the card to modal flow is the way it should work and the card is a stepping stone to the modal which is the star of the show. It would be cool to see a transition or animation when you click on the card to open up the modal.

What it needs to make you feel when it appears: it needs to make me feel like everything I need is right there. I won't need to hop to another recipe or Google anything else. Cook time, ingredients, steps, materials, print function, save function - it's all there because it feels intentional and thought-through.

---

## 6. Mood, in your words

Three to five words that describe the feel you want. Then three to five
you want to avoid. Examples: warm / fast / confident / playful / calm;
avoid: corporate / sterile / cluttered / cute / AI-generated.

Want:

Avoid:

---

## 7. Hard constraints for the builder

Anything non-negotiable. Fill in or strike out.

- Accessibility stays at WCAG AA minimum
- Works at 320px
- No UI framework / component library (keep it hand-code-able)
- Google Fonts are fine; no paid fonts
- No images or illustrations that would need a designer to produce
- Other:

---

## 8. Anything else

Screenshots you want to attach, a sketch, a sentence about something
you saw once and can't stop thinking about. Anything.

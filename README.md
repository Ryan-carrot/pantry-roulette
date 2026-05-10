# 🎰 Pantry Roulette

**Spin the wheel. Feed yourself.**

Pantry Roulette isn't your typical recipe app — it's a constraint-based meal suggester. Tell it what's in your fridge, pick a vibe, and let it spin up something you can actually make tonight.

🌐 **[pantryroulette.com](https://pantryroulette.com)**

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)

---

## 🍳 What is Pantry Roulette?

Most meal planning tools are built for discovery, not execution. They assume you have everything already. Pantry Roulette works the other way — it starts with what you actually have and finds the best possible meal from there.

Enter your ingredients, pick a vibe, and hit spin. The app queries a live recipe database, scores every result against your ingredients and chosen vibe, filters out things you've already seen, and serves up the best match — complete with a full recipe, ingredients list, measurements, and step by step instructions.

---

## ✨ Features

- **Multi-ingredient search** — Enter as many ingredients as you have. Every ingredient queries the API independently and results are merged and deduplicated for a richer pool.
- **10 vibe profiles** — Lazy, Impressive, Hearty, Fun, Healthy, Comfort, Fancy, Elegant, Classic, and Simple. Each vibe uses a custom keyword and structural scoring engine to find the most relevant match.
- **Smart scoring** — Recipes are ranked by a blended score combining ingredient match percentage and vibe alignment. The best match wins.
- **Diversity filter** — A seen recipe tracker ensures you get fresh results every spin. Previously seen recipes are penalised in scoring so new options surface naturally.
- **Full recipe modal** — View the complete recipe without leaving the app. Ingredients with measurements, numbered step by step instructions, and the meal image all in one place.
- **Save to Favourites** — Save recipes you love with a single click. Favourites persist across sessions via localStorage.
- **Fully accessible** — Keyboard navigable, ARIA labelled, screen reader tested with NVDA and Windows Narrator, and WCAG AA colour contrast compliant.
- **Fully responsive** — Tested from 320px (iPhone 4) to desktop. Looks great on everything in between.
- **No frameworks, no build tools** — Pure HTML, CSS, and JavaScript. Open and go.

---

## 🌐 Live App

👉 **[pantryroulette.com](https://pantryroulette.com)**

---

## 🚀 Getting Started

```bash
git clone https://github.com/Ryan-carrot/pantry-roulette.git
cd pantry-roulette
```

Open `index.html` in your browser. No installs, no dependencies, no setup.

---

## 📁 Project Structure

```
pantry-roulette/
├── index.html        # App structure and semantic markup
├── style.css         # Dark theme, animations, responsive layout
├── app.js            # Core logic — API calls, scoring, DOM updates, modal, favourites
├── recipes.js        # Local recipe database with vibes and ingredients
├── vibes.js          # Vibe profiles and keyword scoring engine
├── og-image.png      # Open Graph social preview image
├── sitemap.xml       # Sitemap for search engine indexing
└── README.md         # You are here
```

---

## 🔌 API

Pantry Roulette is powered by the **[TheMealDB API](https://www.themealdb.com/)** — a free, open source meal database with thousands of recipes, ingredient lists, measurements, and instructions.

- Each ingredient is queried independently via `/filter.php?i={ingredient}`
- Full recipe details are fetched via `/lookup.php?i={id}`
- Results are merged, deduplicated, normalised, and scored locally

---

## 📝 Technical Notes

- **Case-insensitive matching** — All inputs and recipe ingredients are normalised to lowercase before comparison.
- **Vibe scoring** — Each vibe profile defines keyword sets, ingredient count thresholds, and instruction length signals. Recipes are scored against these profiles and the result is blended 50/50 with the ingredient match score.
- **Diversity filter** — Seen recipes are stored in localStorage and capped at 20 entries. Previously seen recipes receive a 0.3x score multiplier, pushing fresher results to the top.
- **Focus trapping** — The recipe modal implements full keyboard focus trapping for accessibility compliance.
- **No backend** — All state is managed client-side via localStorage. No server, no database, no authentication required.

---

## 🔮 What's Next

- **Backend & database** — Move favourites and seen recipes to a real database for cross-device persistence
- **User accounts & authentication** — Let users save profiles, meal histories, and preferences
- **Fuzzy ingredient matching** — Match "cheddar" to "cheese" and "spring onion" to "scallion" for smarter scoring
- **Meal planning** — Save a week's worth of meals and generate a consolidated shopping list
- **Nutritional information** — Surface calorie counts and macro breakdowns alongside recipes

---

## 👤 Author

Built by Ryan — a front end developer learning by building things that actually solve problems.

# 🎰 Pantry Roulette

**"What Should I Cook?" Randomizer with a Twist**

Pantry Roulette isn't your typical recipe app — it's a constraint-based meal suggester. Tell it what's in your fridge, pick a vibe, and let it spin up something you can actually make tonight.

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)

---

## 🌐 Live Preview

Check it out on GitHub Pages:  
👉 **[https://ryan-carrot.github.io/pantry-roulette/](https://ryan-carrot.github.io/pantry-roulette/)**

---

## 📖 Project Overview

Pantry Roulette helps you decide what to cook based on two simple inputs:

1. **What's in your pantry** — Enter the ingredients you have on hand (comma-separated).
2. **What's the vibe** — Pick a mood like 😴 Lazy, ✨ Impress Someone, 🍲 Comfort, 🥗 Healthy, and more.

The app scores recipes by how well they match your available ingredients and selected vibe, then serves up a suggestion complete with an image, description, ingredient match percentage, and estimated cook time.

It pulls from both a **local recipe database** and the **[TheMealDB API](https://www.themealdb.com/)** to find the best match for you.

---

## 🚀 Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/Ryan-carrot/pantry-roulette.git
   ```
2. **Open the Project**
   ```bash
   cd pantry-roulette
   ```
3. **Launch it** - Open index.html directly in your browser — no build tools or dependencies required.
   _This is a fully static front-end project. No server, no installs, no setup._

## 🧩 What's in the Project

- **Ingredient Input** — Type in what you have, comma-separated (e.g. eggs, butter, pasta).
- **Vibe Selector** — Choose from 10 moods: Lazy, Impress Someone, Hearty, Fun, Healthy, Comfort, Fancy, Elegant, Classic, and Simple.
- **Smart Matching** — Recipes are scored based on the ratio of matched ingredients to total ingredients required.
- **API Integration** — Fetches real recipes from TheMealDB using your primary ingredient, then scores detailed results against all your inputs.
- **Local Recipe Database** — A curated set of recipes in recipes.js with hand-picked vibes and descriptions.
- **Animated Spin** — A pulsing button animation while results are loading.
- **Dark-Themed UI** — A clean, modern dark interface using Fredoka One and Nunito fonts.

## 📁 Project Structure

```bash
pantry-roulette/
├── index.html      # Main HTML page with input form and result display
├── style.css       # All styling — dark theme, animations, responsive layout
├── app.js          # Core logic — API calls, scoring, DOM updates
├── recipes.js      # Local recipe database with vibes and ingredients
└── README.md       # You are here
```

## 📝 Additional Notes

- **No frameworks or build tools** — This is pure HTML, CSS, and JavaScript. Just open and go.
- **API dependency** — The app uses TheMealDB free API. If the API is down, the app falls back to whatever it can find locally.
- **Ingredient matching is case-insensitive** — Inputs are normalized to lowercase before comparison.
- **First ingredient drives the API search** — The primary (first) ingredient you enter is used to query TheMealDB; all entered ingredients are then used for scoring.
- **Vibe filtering** — The local recipe database filters by vibe; API results are scored by ingredient match regardless of vibe.

## 🔮 Next Steps / Enhancements

- [] **Save Feature** — Let users save favorite recipes to local storage so they can revisit them later without re-spinning.
- [] **Improved Match Logic** — Incorporate fuzzy matching and synonyms (e.g. "cheddar" matching "cheese") to improve ingredient scoring accuracy.
- [] **Expanded Meal Database** — Grow the local recipes.js collection with more recipes across all vibe categories for better offline coverage.
- [] **UI Improvements** — Add ingredient tag chips, recipe cards with flip animations, and a history of past spins.
- [] **Accessibility Improvements** — Add ARIA labels, keyboard navigation support, screen reader–friendly result announcements, and improved color contrast.

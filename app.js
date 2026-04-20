async function fetchRecipesByIngredient(ingredient) {
  try {
    const response = await fetch(
      `https://www.themealdb.com/api/json/v1/1/filter.php?i=${ingredient}`
    );
    const data = await response.json();
    return data.meals || [];
  } catch (error) {
    console.error(`Failed to fetch recipes for ${ingredient}:`, error);
    return [];
  }
}

async function fetchRecipesByIngredients(ingredients) {
  // Query MealDB for each ingredient simultaneously
  const queries = ingredients.map(ingredient =>
    fetchRecipesByIngredient(ingredient)
  );
  const results = await Promise.all(queries);

  // Cap each ingredient's results at 10 then merge
  const merged = results.flatMap(meals => meals.slice(0, 10));

  // Deduplicate by idMeal
  const seen = new Set();
  const deduplicated = merged.filter(meal => {
    if (seen.has(meal.idMeal)) return false;
    seen.add(meal.idMeal);
    return true;
  });

  return deduplicated;
}

async function fetchRecipeDetails(id) {
    try {
        const response = await fetch(
            `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${id}`
        );
        const data = await response.json();
        return data.meals ? data.meals[0] : null;
      } catch (error) {
        console.error("Failed to fetch recipe details:", error);
        return null;
    }
}

function normalizeMeal(meal) {
    const ingredients = [];
    for (let i = 1; i <= 20; i++) {
        const ingredient = meal[`strIngredient${i}`];
        if (ingredient && ingredient.trim() !== "") {
            ingredients.push( ingredient.toLowerCase().trim());
        }
    }
    return {
        name: meal.strMeal,
        ingredients,
        description: meal.strInstructions
            ? meal.strInstructions.substring(0, 120) + "..."
            : "A delicious meal worth trying.",
        image: meal.strMealThumb,
        time: 30,
        vibe: "any"
    };
}

function filterRecipes(userIngredients, selectedVibe) {
    const scored = recipes
        .filter(recipe => recipe.vibe === selectedVibe)
        .map(recipe => { // Transforms each recipe into the same recipe object but with score and matchedCount properties added
            const matched = recipe.ingredients.filter(ingredient =>
                userIngredients.includes(ingredient.toLowerCase())
            );
            const score = matched.length / recipe.ingredients.length; // Calculate a score between 0 and 1 based on how many ingredients match
            return { ...recipe, score, matchedCount: matched.length }; // Spread operator - copies existing recipe properties into a new object, doesn't mutate OG data
        })
        .filter(recipe => recipe.score > 0) // Only consider recipes with at least one match
        .sort((a, b) => b.score - a.score); // Sorts highest score to the top

    return scored;
}

// Focused functions - separation of concerns
// Reads from localStorage and parses the JSON string back into a JS array. If nothing is saved yet, it returns an empty array instead of crashing
function getFavorites() {
    const stored = localStorage.getItem("pantryRouletteFavorites");
    return stored ? JSON.parse(stored) : [];
}

// Gets the current list, checks if the recipe is already saved to prevent dupes, adds it, and writes it back. Returns true or false so the UI can respond accordingly
function saveFavorite(recipe) {
    const favorites = getFavorites();
    const alreadySaved = favorites.some(fav => fav.name === recipe.name);
    if (alreadySaved) return false; // Prevent duplicates
    favorites.push(recipe);
    localStorage.setItem("pantryRouletteFavorites", JSON.stringify(favorites));
    return true;
}

// Filters out the recipe by name and overwrites localStorage with the updated list
function removeFavorite(recipeName) {
    const favorites = getFavorites();
    const updated = favorites.filter(fav => fav.name !== recipeName);
    localStorage.setItem("pantryRouletteFavorites", JSON.stringify(updated));
}

// Filter will persist across searches - we'll store previously picked recipe names in localStorage so they survive page refreshes 
// Each time a recipe is picked, it gets added to "recently seen" list
// When scoring, recipces on that list get a score pneality so fresher results are prioritized
// List caps at 20 recipes to prevent it from growing indefinitely
function getSeenRecipes() {
    const stored = localStorage.getItem("pantryRouletteSeenRecipes");
    return stored ? JSON.parse(stored) : [];
}

function addSeenRecipe(recipeName) {
    const seen = getSeenRecipes();
    if (seen.includes(recipeName)) return; // Prevent duplicates
    seen.push(recipeName);
    if (seen.length > 20) seen.shift(); // Keep only the last 20 seen recipes
    localStorage.setItem("pantryRouletteSeenRecipes", JSON.stringify(seen));
}

function clearSeenRecipes() {
    localStorage.removeItem("pantryRouletteSeenRecipes");
}

const btn = document.getElementById("spin-btn");
const resultDiv = document.getElementById("result");

// Render favorites - lives OUTSIDE the click handler
function renderFavorites() {
  const favorites = getFavorites();
  const list = document.getElementById("favorites-list");
  const empty = document.getElementById("favorites-empty");

  list.innerHTML = "";

  if (favorites.length === 0) {
    empty.classList.remove("hidden");
    return;
  }

  empty.classList.add("hidden");
  list.classList.remove("hidden");

  favorites.forEach(recipe => {
    const card = document.createElement("div");
    card.classList.add("fav-card");
    card.innerHTML = `
      ${recipe.image ? `<img src="${recipe.image}" alt="${recipe.name}" class="fav-img" />` : ""}
      <div class="fav-info">
        <h3>${recipe.name}</h3>
        <p>${recipe.description}</p>
        <div class="meta">
          <span>⏱ ${recipe.time} mins</span>
        </div>
      </div>
      <button class="remove-btn" data-name="${recipe.name}" aria-label="Remove ${recipe.name} from favorites">
        <svg aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
        </svg>
      </button>
    `;

    card.querySelector(".remove-btn").addEventListener("click", (e) => {
      const btn = e.target.closest("remove-btn");
      const name = e.target.getAttribute("data-name");
      removeFavorite(name);
      renderFavorites();

      const saveBtn = document.getElementById("save-btn");
      if (saveBtn && saveBtn.dataset.recipeName === name) {
        saveBtn.innerHTML = `
          <svg aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
          </svg>
          Save to Favorites`;
        saveBtn.disabled = false;
        saveBtn.classList.remove("saved");
      }
    });

    list.appendChild(card);
  });
}

// Click handler - main logic lives here
btn.addEventListener("click", async () => {
  const input = document.getElementById("ingredients").value.trim();
  const selectedVibe = document.getElementById("vibe").value;
  const btnText = document.getElementById("btn-text");

  if (!input) {
    resultDiv.innerHTML = `<p class="no-match">🥄 Enter at least one ingredient to get started!</p>`;
    resultDiv.classList.remove("hidden");
    return;
  }

  btn.classList.add("spinning");
  btnText.textContent = "Spinning... 🎰";
  resultDiv.classList.add("hidden");

  const userIngredients = input
    .split(",")
    .map(item => item.trim().toLowerCase());

  // Query API for all ingredients and merge results
  const rawMeals = await fetchRecipesByIngredients(userIngredients);
  console.log("Raw meals pool:", rawMeals); // temporary debug line

  btn.classList.remove("spinning");
  btnText.textContent = "Spin the Pantry 🎰";

  if (!rawMeals || rawMeals.length === 0) {
    resultDiv.innerHTML = `<p class="no-match">😬 Nothing found for those ingredients. Try something different!</p>`;
    resultDiv.classList.remove("hidden");
    return;
  }

  const detailPromises = rawMeals.slice(0, 30).map(meal =>
    fetchRecipeDetails(meal.idMeal)
  );
  const detailedMeals = await Promise.all(detailPromises);

  const normalized = detailedMeals
    .filter(Boolean)
    .map(meal => normalizeMeal(meal));

  const seen = getSeenRecipes();

  const scored = normalized
    .map(recipe => {
      const matched = recipe.ingredients.filter(ingredient =>
        userIngredients.includes(ingredient)
      );
      const ingredientScore = matched.length / recipe.ingredients.length;
      const vibeScore = scoreRecipeForVibe(recipe, selectedVibe);
      let combinedScore = (ingredientScore * 0.5) + (vibeScore * 0.5);

      // Apply penalty for recently seen recipes
      if (seen.includes(recipe.name)) {
        combinedScore *= 0.3;
      }

      return { 
        ...recipe, 
        score: combinedScore,
        vibeScore,
        matchedCount: matched.length 
      };
    })
    .filter(recipe => recipe.score > 0)
    .sort((a, b) => b.score - a.score);

  const pick = scored.length > 0
    ? scored[0]
    : normalized[Math.floor(Math.random() * normalized.length)];

  addSeenRecipe(pick.name);

  // Check if already saved BEFORE building the HTML
  const alreadySaved = getFavorites().some(fav => fav.name === pick.name);
  const matchPercent = Math.round((pick.score || 0) * 100);
  const vibePercent = Math.round((pick.vibeScore || 0) * 100);

  resultDiv.innerHTML = `
    <p class="result-label">Tonight you're making...</p>
    <h2>${pick.name}</h2>
    ${pick.image ? `<img src="${pick.image}" alt="${pick.name}" class="result-img" />` : ""}
    <p class="description">${pick.description}</p>
    <div class="meta">
      <span class="meta-time">${pick.time} mins</span>
      <span class="meta-ingredients">${pick.matchedCount}/${pick.ingredients.length} ingredients</span>
      <span class="meta-match">${matchPercent}% match</span>
      <span class="meta-vibe">${vibePercent}% vibe</span>
    </div>
    <button 
      id="save-btn" 
      class="save-btn ${alreadySaved ? "saved" : ""}" 
      data-recipe-name="${pick.name}"
      ${alreadySaved ? "disabled" : ""}
      aria-label="${alreadySaved ? `${pick.name} is already saved to favorites` : `Save ${pick.name} to favorites`}"
    >
      <svg aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="${alreadySaved ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
      </svg>
      ${alreadySaved ? "Already Saved" : "Save to Favorites"}
    </button>
  `;

  resultDiv.classList.remove("hidden");
  resultDiv.setAttribute("tabindex", "-1");
  resultDiv.focus();

  // Only attach the click listener if not already saved
  if (!alreadySaved) {
    document.getElementById("save-btn").addEventListener("click", () => {
      saveFavorite(pick);
      const saveBtn = document.getElementById("save-btn");
      saveBtn.textContent = "Saved! ✅";
      saveBtn.disabled = true;
      saveBtn.classList.add("saved");
      renderFavorites();
    });
  }
});

// Render favorites on page load
renderFavorites();

document.getElementById("reset-seen-btn").addEventListener("click", () => {
  clearSeenRecipes();
  const resetBtn = document.getElementById("reset-seen-btn");
  resetBtn.textContent = "✅ Reset!";
  setTimeout(() => {
    resetBtn.textContent = "🔄 Reset Suggestions";
  }, 2000);
});
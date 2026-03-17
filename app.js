async function fetchRecipesByIngredient(ingredient) {
    try {
        const response = await fetch(
            `https://www.themealdb.com/api/json/v1/1/filter.php?i=${ingredient}`
        );
        const data = await response.json();
        return data.meals || [];
      } catch (error) {
        console.error("Failed to fetch recipes:", error);
        return [];
    }
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
        .map(recipe => { // Transforms each recipe into the same recipce object but with score and matchedCount properties added
            const matched = recipe.ingredients.filter(ingredient =>
                userIngredients.includes(ingredient.toLowerCase())
            );
            const score = matched.length / recipe.ingredients.length; // Calculate a score between 0 and 1 based on how many ingredients match
            return { ...recipe, score, matchedCount: matched.length }; // Spread operator - copies existing recipe properties into a new obect, doesn't mutate OG data
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
      <button class="remove-btn" data-name="${recipe.name}">✕</button>
    `;

    card.querySelector(".remove-btn").addEventListener("click", (e) => {
      const name = e.target.getAttribute("data-name");
      removeFavorite(name);
      renderFavorites();

      const saveBtn = document.getElementById("save-btn");
      if (saveBtn && saveBtn.dataset.recipeName === name) {
        saveBtn.textContent = "Save to Favorites ❤️";
        saveBtn.disabled = false;
        saveBtn.classList.remove("saved");
      }
    });

    list.appendChild(card);
  });
}

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

  const primaryIngredient = userIngredients[0];
  const rawMeals = await fetchRecipesByIngredient(primaryIngredient);

  btn.classList.remove("spinning");
  btnText.textContent = "Spin the Pantry 🎰";

  if (!rawMeals || rawMeals.length === 0) {
    resultDiv.innerHTML = `<p class="no-match">😬 Nothing found for "${primaryIngredient}". Try a different ingredient!</p>`;
    resultDiv.classList.remove("hidden");
    return;
  }

  const detailPromises = rawMeals.slice(0, 5).map(meal =>
    fetchRecipeDetails(meal.idMeal)
  );
  const detailedMeals = await Promise.all(detailPromises);

  const normalized = detailedMeals
    .filter(Boolean)
    .map(meal => normalizeMeal(meal));

  const scored = normalized
    .map(recipe => {
      const matched = recipe.ingredients.filter(ingredient =>
        userIngredients.includes(ingredient)
      );
      const score = matched.length / recipe.ingredients.length;
      return { ...recipe, score, matchedCount: matched.length };
    })
    .filter(recipe => recipe.score > 0)
    .sort((a, b) => b.score - a.score);

  const pick = scored.length > 0
    ? scored[0]
    : normalized[Math.floor(Math.random() * normalized.length)];

  const matchPercent = Math.round((pick.score || 0) * 100);

  // Check if already saved BEFORE building the HTML
  const alreadySaved = getFavorites().some(fav => fav.name === pick.name);

  resultDiv.innerHTML = `
    <p class="result-label">Tonight you're making...</p>
    <h2>${pick.name}</h2>
    ${pick.image ? `<img src="${pick.image}" alt="${pick.name}" class="result-img" />` : ""}
    <p class="description">${pick.description}</p>
    <div class="meta">
      <span>⏱ ${pick.time} mins</span>
      <span>🧄 ${pick.matchedCount}/${pick.ingredients.length} ingredients</span>
      <span>✅ ${matchPercent}% match</span>
    </div>
    <button 
      id="save-btn" 
      class="save-btn ${alreadySaved ? "saved" : ""}" 
      data-recipe-name="${pick.name}"
      ${alreadySaved ? "disabled" : ""}
    >
      ${alreadySaved ? "Already Saved ✅" : "Save to Favorites ❤️"}
    </button>
  `;

  resultDiv.classList.remove("hidden");

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
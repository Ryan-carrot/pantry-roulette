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

const btn = document.getElementById("spin-btn");
const resultDiv = document.getElementById("result");

btn.addEventListener("click", async () => {
  const input = document.getElementById("ingredients").value.trim();
  const selectedVibe = document.getElementById("vibe").value;
  const btnText = document.getElementById("btn-text");

  if (!input) {
    resultDiv.innerHTML = `<p class="no-match">🥄 Enter at least one ingredient to get started!</p>`;
    resultDiv.classList.remove("hidden");
    return;
  }

  // Animate the button
  btn.classList.add("spinning");
  btnText.textContent = "Spinning... 🎰";
  resultDiv.classList.add("hidden");

  const userIngredients = input
    .split(",")
    .map(item => item.trim().toLowerCase());

  // Use the first ingredient to search the API
  const primaryIngredient = userIngredients[0];
  const rawMeals = await fetchRecipesByIngredient(primaryIngredient);

  btn.classList.remove("spinning");
  btnText.textContent = "Spin the Pantry 🎰";

  if (!rawMeals || rawMeals.length === 0) {
    resultDiv.innerHTML = `<p class="no-match">😬 Nothing found for "${primaryIngredient}". Try a different ingredient!</p>`;
    resultDiv.classList.remove("hidden");
    return;
  }

  // Fetch full details for up to 5 meals
  const detailPromises = rawMeals.slice(0, 5).map(meal =>
    fetchRecipeDetails(meal.idMeal)
  );
  const detailedMeals = await Promise.all(detailPromises);

  // Normalize and score them
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
  `;

  resultDiv.classList.remove("hidden");
});
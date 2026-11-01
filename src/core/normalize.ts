import type { MealDbMeal, Recipe } from '../types';
import { estimateCookTime } from './cookTime';

const MAX_INGREDIENT_SLOTS = 20;
const DESCRIPTION_LENGTH = 120;
const FALLBACK_DESCRIPTION = 'No description available.';

function orNull(value: string | null | undefined): string | null {
  return value ? value : null;
}

/** Convert a raw TheMealDB `lookup.php` meal into a Recipe. Pure. */
export function normalizeMeal(meal: MealDbMeal): Recipe {
  const ingredients: string[] = [];
  const measurements: string[] = [];

  for (let i = 1; i <= MAX_INGREDIENT_SLOTS; i++) {
    const ingredient = meal[`strIngredient${i}`];
    if (!ingredient || ingredient.trim() === '') continue;
    const measure = meal[`strMeasure${i}`];
    ingredients.push(ingredient.trim().toLowerCase());
    measurements.push(measure ? measure.trim() : '');
  }

  const instructions = meal.strInstructions ?? '';
  const steps = instructions
    .split(/\r?\n/)
    .map((step) => step.trim())
    .filter((step) => step.length > 0);

  const firstStep = steps[0];
  const description = firstStep
    ? `${firstStep.substring(0, DESCRIPTION_LENGTH)}...`
    : FALLBACK_DESCRIPTION;

  return {
    id: meal.idMeal,
    name: meal.strMeal,
    ingredients,
    measurements,
    steps,
    instructions,
    description,
    image: orNull(meal.strMealThumb),
    category: orNull(meal.strCategory),
    area: orNull(meal.strArea),
    source: orNull(meal.strSource),
    cookTime: estimateCookTime(instructions, steps),
  };
}

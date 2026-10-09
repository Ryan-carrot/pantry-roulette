import type { Recipe } from '../types';

export type RecipeRef = Pick<Recipe, 'id' | 'name'>;

/** Identity key: the MealDB id, or the name for legacy (v1) entries that have none. */
export function recipeKey(recipe: RecipeRef): string {
  return recipe.id ?? recipe.name;
}

/** Same meal? By id when both sides have one; otherwise by name so legacy entries still match. */
export function sameRecipe(a: RecipeRef, b: RecipeRef): boolean {
  if (a.id !== null && b.id !== null) return a.id === b.id;
  return a.name === b.name;
}

/** Is the recipe in a seen set? Matches ids, and names for legacy seen lists. */
export function isSeen(seenKeys: ReadonlySet<string>, recipe: RecipeRef): boolean {
  if (recipe.id !== null && seenKeys.has(recipe.id)) return true;
  return seenKeys.has(recipe.name);
}

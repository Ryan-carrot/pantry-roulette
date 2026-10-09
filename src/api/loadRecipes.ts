import { normalizeMeal } from '../core/normalize';
import type { LookupCache } from '../storage/lookupCache';
import type { MealDbStub, Recipe } from '../types';
import type { MealDbClient } from './mealdb';

/**
 * Turn candidate stubs into normalised recipes, hitting the network only
 * for ids the session cache has not seen. Failed or unknown lookups are
 * dropped and left uncached so a later spin can retry them.
 */
export async function loadRecipes(
  client: MealDbClient,
  cache: LookupCache,
  stubs: readonly MealDbStub[],
): Promise<Recipe[]> {
  const settled = await Promise.allSettled(
    stubs.map(async (stub): Promise<Recipe | null> => {
      const cached = cache.get(stub.idMeal);
      if (cached) return cached;
      const meal = await client.lookup(stub.idMeal);
      if (!meal) return null;
      const recipe = normalizeMeal(meal);
      cache.set(recipe);
      return recipe;
    }),
  );
  const recipes: Recipe[] = [];
  for (const result of settled) {
    if (result.status === 'fulfilled' && result.value) recipes.push(result.value);
  }
  return recipes;
}

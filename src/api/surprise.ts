import { isSeen } from '../core/identity';
import { normalizeMeal } from '../core/normalize';
import type { LookupCache } from '../storage/lookupCache';
import type { Recipe } from '../types';
import type { MealDbClient } from './mealdb';

const MAX_ROLLS = 3;

/**
 * "Surprise me": one random recipe, re-rolled up to three times while the
 * roll is one the user has already been shown. Every roll is normalised
 * and cached by id so a later ingredient spin finds it without a lookup.
 * Returns null only when the service fails on the first roll.
 */
export async function surpriseMe(
  client: MealDbClient,
  cache: LookupCache,
  seenKeys: ReadonlySet<string>,
): Promise<Recipe | null> {
  let last: Recipe | null = null;
  for (let roll = 0; roll < MAX_ROLLS; roll++) {
    let meal;
    try {
      meal = await client.random();
    } catch {
      return last;
    }
    if (!meal) return last;
    const recipe = normalizeMeal(meal);
    cache.set(recipe);
    last = recipe;
    if (!isSeen(seenKeys, recipe)) return recipe;
  }
  return last;
}

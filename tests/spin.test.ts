import { describe, expect, it } from 'vitest';
import { loadRecipes } from '../src/api/loadRecipes';
import { createMealDbClient, findCandidates, type FetchLike } from '../src/api/mealdb';
import { pickRecipe } from '../src/core/scoring';
import { createLookupCache } from '../src/storage/lookupCache';
import { createSeenStore } from '../src/storage/seen';
import type { StorageLike } from '../src/storage/storage';
import { createMemoryStorage } from './helpers/memoryStorage';

/**
 * A fake MealDB where every meal shares the same ingredients and
 * instructions, so every candidate ties on blended score. Lookups resolve
 * in reverse order to mimic the network.
 */
const MEALS: Record<string, string> = {
  '10': 'Banana Pancakes',
  '11': 'Apple Pie',
  '12': 'Cherry Tart',
};

function fakeFetch(resolveOrder: 'forward' | 'reverse'): FetchLike {
  return (url) => {
    const u = new URL(url);
    const i = u.searchParams.get('i') ?? '';
    if (u.pathname.endsWith('filter.php')) {
      const meals = Object.keys(MEALS).map((id) => ({ idMeal: id, strMeal: MEALS[id], strMealThumb: null }));
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ meals }) });
    }
    const index = Object.keys(MEALS).indexOf(i);
    const delay = resolveOrder === 'forward' ? index * 5 : (3 - index) * 5;
    return new Promise((resolve) =>
      setTimeout(
        () =>
          resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                meals: [
                  {
                    idMeal: i,
                    strMeal: MEALS[i],
                    strInstructions: 'Mix and bake.',
                    strIngredient1: 'chicken',
                    strIngredient2: 'garlic',
                    strIngredient3: 'lemon',
                  },
                ],
              }),
          }),
        delay,
      ),
    );
  };
}

async function spin(storage: StorageLike, fetchImpl: FetchLike): Promise<string | undefined> {
  const client = createMealDbClient(fetchImpl);
  const cache = createLookupCache(storage);
  const seen = createSeenStore(storage);
  const ingredients = ['chicken', 'garlic', 'lemon'];
  const search = await findCandidates(client, ingredients);
  const recipes = await loadRecipes(client, cache, search.candidates);
  const result = pickRecipe(recipes, ingredients, 'lazy', seen.asSet());
  return result.kind === 'pick' ? result.pick.recipe.name : undefined;
}

describe('spin determinism', () => {
  it('picks the same recipe on a cold spin and on a cached spin after clearing history', async () => {
    const storage = createMemoryStorage();
    const cold = await spin(storage, fakeFetch('reverse'));
    createSeenStore(storage).clear();
    const warm = await spin(storage, fakeFetch('forward'));
    expect(cold).toBe('Apple Pie');
    expect(warm).toBe('Apple Pie');
  });
});

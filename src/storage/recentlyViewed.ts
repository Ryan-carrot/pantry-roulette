import type { Recipe } from '../types';
import { readRecipes, toStoredRecipe } from './recipeCodec';
import { readArray, writeJson, type StorageLike } from './storage';

/** Same key as v1. Newest first. */
export const RECENTLY_VIEWED_KEY = 'pantryRouletteRecentlyViewed';
export const RECENTLY_VIEWED_CAP = 5;

export interface RecentlyViewedStore {
  list(): Recipe[];
  add(recipe: Recipe): void;
}

export function createRecentlyViewedStore(storage: StorageLike): RecentlyViewedStore {
  const list = () => readRecipes(readArray(storage, RECENTLY_VIEWED_KEY));
  return {
    list,
    add(recipe) {
      const rest = list().filter((r) => r.name !== recipe.name);
      writeJson(
        storage,
        RECENTLY_VIEWED_KEY,
        [toStoredRecipe(recipe), ...rest].slice(0, RECENTLY_VIEWED_CAP),
      );
    },
  };
}

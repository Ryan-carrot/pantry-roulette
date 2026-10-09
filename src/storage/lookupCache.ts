import type { Recipe } from '../types';
import { toRecipe, toStoredRecipe } from './recipeCodec';
import { readJson, writeJson, type StorageLike } from './storage';

/** One sessionStorage entry per MealDB id. Lives for the tab session; no TTL. */
export const LOOKUP_CACHE_PREFIX = 'pantryRouletteLookup:';

export interface LookupCache {
  get(id: string): Recipe | null;
  set(recipe: Recipe): void;
}

export function createLookupCache(storage: StorageLike): LookupCache {
  return {
    get: (id) => toRecipe(readJson(storage, `${LOOKUP_CACHE_PREFIX}${id}`)),
    set(recipe) {
      if (recipe.id === null) return;
      writeJson(storage, `${LOOKUP_CACHE_PREFIX}${recipe.id}`, toStoredRecipe(recipe));
    },
  };
}

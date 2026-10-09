import { recipeKey, sameRecipe, type RecipeRef } from '../core/identity';
import type { Recipe } from '../types';
import { readRecipes, toStoredRecipe } from './recipeCodec';
import { readArray, writeJson, type StorageLike } from './storage';

/** Same key as v1 so existing favourites carry over. */
export const FAVOURITES_KEY = 'pantryRouletteFavorites';
/** New in v2. v1 had no cap. */
export const FAVOURITES_CAP = 50;

export type AddResult = 'added' | 'exists' | 'full';

export interface FavouritesStore {
  list(): Recipe[];
  has(recipe: RecipeRef): boolean;
  add(recipe: Recipe): AddResult;
  /** Remove by recipeKey: the id, or the name for legacy entries. */
  remove(key: string): void;
}

export function createFavouritesStore(storage: StorageLike): FavouritesStore {
  const list = () => readRecipes(readArray(storage, FAVOURITES_KEY));
  return {
    list,
    has: (recipe) => list().some((r) => sameRecipe(r, recipe)),
    add(recipe) {
      const current = list();
      if (current.some((r) => sameRecipe(r, recipe))) return 'exists';
      if (current.length >= FAVOURITES_CAP) return 'full';
      writeJson(storage, FAVOURITES_KEY, [...current, toStoredRecipe(recipe)]);
      return 'added';
    },
    remove(key) {
      writeJson(
        storage,
        FAVOURITES_KEY,
        list().filter((r) => recipeKey(r) !== key),
      );
    },
  };
}

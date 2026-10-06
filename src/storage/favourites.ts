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
  has(name: string): boolean;
  add(recipe: Recipe): AddResult;
  remove(name: string): void;
}

export function createFavouritesStore(storage: StorageLike): FavouritesStore {
  const list = () => readRecipes(readArray(storage, FAVOURITES_KEY));
  return {
    list,
    has: (name) => list().some((r) => r.name === name),
    add(recipe) {
      const current = list();
      if (current.some((r) => r.name === recipe.name)) return 'exists';
      if (current.length >= FAVOURITES_CAP) return 'full';
      writeJson(storage, FAVOURITES_KEY, [...current, toStoredRecipe(recipe)]);
      return 'added';
    },
    remove(name) {
      writeJson(
        storage,
        FAVOURITES_KEY,
        list().filter((r) => r.name !== name),
      );
    },
  };
}

import { recipeKey, type RecipeRef } from '../core/identity';
import { readArray, writeJson, type StorageLike } from './storage';

/** Same key as v1. v1 stored names; v2 stores ids, with names only for legacy entries. */
export const SEEN_KEY = 'pantryRouletteSeenRecipes';
export const SEEN_CAP = 20;

export interface SeenStore {
  /** Keys, oldest first. */
  list(): string[];
  asSet(): Set<string>;
  add(key: string): void;
  addRecipe(recipe: RecipeRef): void;
  clear(): void;
}

export function createSeenStore(storage: StorageLike): SeenStore {
  const list = () =>
    readArray(storage, SEEN_KEY).filter((v): v is string => typeof v === 'string');
  const add = (key: string): void => {
    const current = list();
    if (current.includes(key)) return;
    current.push(key);
    writeJson(storage, SEEN_KEY, current.slice(-SEEN_CAP));
  };
  return {
    list,
    asSet: () => new Set(list()),
    add,
    addRecipe: (recipe) => add(recipeKey(recipe)),
    clear() {
      try {
        storage.removeItem(SEEN_KEY);
      } catch {
        // Storage blocked; nothing to clear.
      }
    },
  };
}

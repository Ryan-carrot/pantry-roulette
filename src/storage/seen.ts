import { readArray, writeJson, type StorageLike } from './storage';

/** Same key as v1. */
export const SEEN_KEY = 'pantryRouletteSeenRecipes';
export const SEEN_CAP = 20;

export interface SeenStore {
  /** Names, oldest first. */
  list(): string[];
  asSet(): Set<string>;
  add(name: string): void;
  clear(): void;
}

export function createSeenStore(storage: StorageLike): SeenStore {
  const list = () =>
    readArray(storage, SEEN_KEY).filter((v): v is string => typeof v === 'string');
  return {
    list,
    asSet: () => new Set(list()),
    add(name) {
      const current = list();
      if (current.includes(name)) return;
      current.push(name);
      writeJson(storage, SEEN_KEY, current.slice(-SEEN_CAP));
    },
    clear() {
      try {
        storage.removeItem(SEEN_KEY);
      } catch {
        // Storage blocked; nothing to clear.
      }
    },
  };
}

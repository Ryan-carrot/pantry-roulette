/** The subset of window.localStorage we use, so tests can inject a fake. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Parse a stored JSON value. Returns null for missing, corrupt, or inaccessible storage. */
export function readJson(storage: StorageLike, key: string): unknown {
  try {
    const raw = storage.getItem(key);
    if (raw === null) return null;
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

/** Write a JSON value. Swallows quota and security errors; storage is best-effort. */
export function writeJson(storage: StorageLike, key: string, value: unknown): void {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked. The in-memory state the caller holds is still correct.
  }
}

/** Read a stored array, or [] when the value is missing or not an array. */
export function readArray(storage: StorageLike, key: string): unknown[] {
  const value = readJson(storage, key);
  return Array.isArray(value) ? value : [];
}

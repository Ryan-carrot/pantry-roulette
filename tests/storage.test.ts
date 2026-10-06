import { describe, expect, it } from 'vitest';
import { createFavouritesStore, FAVOURITES_KEY } from '../src/storage/favourites';
import { createRecentlyViewedStore, RECENTLY_VIEWED_KEY } from '../src/storage/recentlyViewed';
import { createSeenStore, SEEN_KEY } from '../src/storage/seen';
import { readJson } from '../src/storage/storage';
import type { Recipe } from '../src/types';
import { createMemoryStorage } from './helpers/memoryStorage';

function recipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    id: '1',
    name: 'Test Dish',
    ingredients: ['eggs'],
    measurements: ['2'],
    steps: ['Mix.'],
    instructions: 'Mix.',
    description: 'Mix....',
    image: null,
    category: null,
    area: null,
    source: null,
    ...overrides,
  };
}

/** A favourite exactly as v1 wrote it: no id, no instructions, plus contextual scores. */
const v1Favourite = {
  name: 'Legacy Pie',
  ingredients: ['apple', 'sugar'],
  measurements: ['3', '1 cup'],
  steps: ['Peel apples.', 'Bake.'],
  description: 'Peel apples....',
  image: 'https://example.com/pie.jpg',
  time: 30,
  vibe: 'any',
  source: null,
  category: 'Dessert',
  score: 0.42,
  vibeScore: 0.1,
  matchedCount: 2,
};

describe('readJson', () => {
  it('returns null for a missing key', () => {
    expect(readJson(createMemoryStorage(), 'k')).toBeNull();
  });

  it('returns null instead of throwing on corrupt JSON', () => {
    const storage = createMemoryStorage({ k: '{not json' });
    expect(readJson(storage, 'k')).toBeNull();
  });

  it('returns null when getItem itself throws', () => {
    const storage = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {},
      removeItem: () => {},
    };
    expect(readJson(storage, 'k')).toBeNull();
  });
});

describe('favourites store', () => {
  it('uses the v1 key so existing favourites carry over', () => {
    expect(FAVOURITES_KEY).toBe('pantryRouletteFavorites');
  });

  it('starts empty', () => {
    expect(createFavouritesStore(createMemoryStorage()).list()).toEqual([]);
  });

  it('returns an empty list on corrupt JSON instead of throwing', () => {
    const storage = createMemoryStorage({ [FAVOURITES_KEY]: '[{"name":' });
    expect(createFavouritesStore(storage).list()).toEqual([]);
  });

  it('returns an empty list when the stored value is not an array', () => {
    const storage = createMemoryStorage({ [FAVOURITES_KEY]: '{"name":"x"}' });
    expect(createFavouritesStore(storage).list()).toEqual([]);
  });

  it('discards entries that have no name and keeps the rest', () => {
    const storage = createMemoryStorage({
      [FAVOURITES_KEY]: JSON.stringify([{ ingredients: [] }, recipe({ name: 'Keep' }), 42, null]),
    });
    expect(createFavouritesStore(storage).list().map((r) => r.name)).toEqual(['Keep']);
  });

  it('upgrades a v1 favourite: derives instructions from steps and drops score fields', () => {
    const storage = createMemoryStorage({ [FAVOURITES_KEY]: JSON.stringify([v1Favourite]) });
    const [fav] = createFavouritesStore(storage).list();
    expect(fav).toEqual({
      id: null,
      name: 'Legacy Pie',
      ingredients: ['apple', 'sugar'],
      measurements: ['3', '1 cup'],
      steps: ['Peel apples.', 'Bake.'],
      instructions: 'Peel apples.\nBake.',
      description: 'Peel apples....',
      image: 'https://example.com/pie.jpg',
      category: 'Dessert',
      area: null,
      source: null,
    });
  });

  it('adds a recipe and reports it as saved', () => {
    const store = createFavouritesStore(createMemoryStorage());
    expect(store.add(recipe())).toBe('added');
    expect(store.has('Test Dish')).toBe(true);
    expect(store.list()).toHaveLength(1);
  });

  it('does not add the same name twice', () => {
    const store = createFavouritesStore(createMemoryStorage());
    store.add(recipe());
    expect(store.add(recipe())).toBe('exists');
    expect(store.list()).toHaveLength(1);
  });

  it('refuses a 51st favourite instead of silently dropping one', () => {
    const store = createFavouritesStore(createMemoryStorage());
    for (let i = 0; i < 50; i++) store.add(recipe({ name: `R${i}` }));
    expect(store.add(recipe({ name: 'One too many' }))).toBe('full');
    expect(store.list()).toHaveLength(50);
    expect(store.has('R0')).toBe(true);
  });

  it('removes by name', () => {
    const store = createFavouritesStore(createMemoryStorage());
    store.add(recipe({ name: 'A' }));
    store.add(recipe({ name: 'B' }));
    store.remove('A');
    expect(store.list().map((r) => r.name)).toEqual(['B']);
  });

  it('persists only the Recipe shape, never spin scores', () => {
    const storage = createMemoryStorage();
    const store = createFavouritesStore(storage);
    store.add({ ...recipe(), blendedScore: 0.9 } as Recipe);
    const raw = JSON.parse(storage.getItem(FAVOURITES_KEY) ?? '[]') as unknown[];
    expect(raw[0]).not.toHaveProperty('blendedScore');
  });
});

describe('seen store', () => {
  it('uses the v1 key', () => {
    expect(SEEN_KEY).toBe('pantryRouletteSeenRecipes');
  });

  it('returns an empty set on corrupt or wrong-shape data', () => {
    expect(createSeenStore(createMemoryStorage({ [SEEN_KEY]: 'nope' })).list()).toEqual([]);
    expect(createSeenStore(createMemoryStorage({ [SEEN_KEY]: '{"a":1}' })).list()).toEqual([]);
  });

  it('ignores non-string entries', () => {
    const storage = createMemoryStorage({ [SEEN_KEY]: JSON.stringify(['A', 2, null, 'B']) });
    expect(createSeenStore(storage).list()).toEqual(['A', 'B']);
  });

  it('adds names once, oldest first', () => {
    const store = createSeenStore(createMemoryStorage());
    store.add('A');
    store.add('B');
    store.add('A');
    expect(store.list()).toEqual(['A', 'B']);
  });

  it('keeps only the newest 20 names', () => {
    const store = createSeenStore(createMemoryStorage());
    for (let i = 0; i < 25; i++) store.add(`R${i}`);
    const list = store.list();
    expect(list).toHaveLength(20);
    expect(list[0]).toBe('R5');
    expect(list[19]).toBe('R24');
  });

  it('exposes the names as a Set for scoring', () => {
    const store = createSeenStore(createMemoryStorage());
    store.add('A');
    expect(store.asSet().has('A')).toBe(true);
  });

  it('clears everything', () => {
    const storage = createMemoryStorage();
    const store = createSeenStore(storage);
    store.add('A');
    store.clear();
    expect(store.list()).toEqual([]);
    expect(storage.getItem(SEEN_KEY)).toBeNull();
  });
});

describe('recently viewed store', () => {
  it('uses the v1 key', () => {
    expect(RECENTLY_VIEWED_KEY).toBe('pantryRouletteRecentlyViewed');
  });

  it('returns an empty list on corrupt data', () => {
    const storage = createMemoryStorage({ [RECENTLY_VIEWED_KEY]: '[[[' });
    expect(createRecentlyViewedStore(storage).list()).toEqual([]);
  });

  it('puts the newest entry first', () => {
    const store = createRecentlyViewedStore(createMemoryStorage());
    store.add(recipe({ name: 'A' }));
    store.add(recipe({ name: 'B' }));
    expect(store.list().map((r) => r.name)).toEqual(['B', 'A']);
  });

  it('moves a re-viewed recipe to the front instead of duplicating it', () => {
    const store = createRecentlyViewedStore(createMemoryStorage());
    store.add(recipe({ name: 'A' }));
    store.add(recipe({ name: 'B' }));
    store.add(recipe({ name: 'A' }));
    expect(store.list().map((r) => r.name)).toEqual(['A', 'B']);
  });

  it('keeps only the five most recent', () => {
    const store = createRecentlyViewedStore(createMemoryStorage());
    for (let i = 0; i < 7; i++) store.add(recipe({ name: `R${i}` }));
    expect(store.list().map((r) => r.name)).toEqual(['R6', 'R5', 'R4', 'R3', 'R2']);
  });

  it('reads v1 entries', () => {
    const storage = createMemoryStorage({ [RECENTLY_VIEWED_KEY]: JSON.stringify([v1Favourite]) });
    expect(createRecentlyViewedStore(storage).list()[0]?.name).toBe('Legacy Pie');
  });
});

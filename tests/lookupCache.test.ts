import { describe, expect, it, vi } from 'vitest';
import { loadRecipes } from '../src/api/loadRecipes';
import { createMealDbClient, type FetchLike } from '../src/api/mealdb';
import { createLookupCache, LOOKUP_CACHE_PREFIX } from '../src/storage/lookupCache';
import type { MealDbStub, Recipe } from '../src/types';
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

function stub(id: string): MealDbStub {
  return { idMeal: id, strMeal: `Meal ${id}`, strMealThumb: null };
}

describe('lookup cache', () => {
  it('returns null for an id it has not seen', () => {
    expect(createLookupCache(createMemoryStorage()).get('1')).toBeNull();
  });

  it('stores a normalised recipe under a per-id key and reads it back', () => {
    const storage = createMemoryStorage();
    const cache = createLookupCache(storage);
    cache.set(recipe({ id: '52772' }));
    expect(cache.get('52772')).toEqual(recipe({ id: '52772' }));
    expect(storage.getItem(`${LOOKUP_CACHE_PREFIX}52772`)).not.toBeNull();
  });

  it('returns null instead of throwing for a corrupt or wrong-shape entry', () => {
    const storage = createMemoryStorage({
      [`${LOOKUP_CACHE_PREFIX}1`]: '{nope',
      [`${LOOKUP_CACHE_PREFIX}2`]: '{"ingredients":[]}',
    });
    const cache = createLookupCache(storage);
    expect(cache.get('1')).toBeNull();
    expect(cache.get('2')).toBeNull();
  });

  it('ignores a recipe without an id', () => {
    const storage = createMemoryStorage();
    createLookupCache(storage).set(recipe({ id: null }));
    expect(storage.getItem(`${LOOKUP_CACHE_PREFIX}null`)).toBeNull();
  });
});

describe('loadRecipes', () => {
  function clientCounting() {
    const fetchImpl = vi.fn<FetchLike>((url) => {
      const id = new URL(url).searchParams.get('i') ?? '';
      if (id === 'bad') return Promise.reject(new Error('boom'));
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ meals: [{ idMeal: id, strMeal: `Meal ${id}`, strInstructions: 'Mix.' }] }),
      });
    });
    return { client: createMealDbClient(fetchImpl), fetchImpl };
  }

  it('fetches, normalises and caches each candidate', async () => {
    const { client, fetchImpl } = clientCounting();
    const cache = createLookupCache(createMemoryStorage());
    const recipes = await loadRecipes(client, cache, [stub('1'), stub('2')]);
    expect(recipes.map((r) => r.id)).toEqual(['1', '2']);
    expect(recipes[0]?.instructions).toBe('Mix.');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(cache.get('2')?.name).toBe('Meal 2');
  });

  it('makes one network call per id across two spins that share candidates', async () => {
    const { client, fetchImpl } = clientCounting();
    const cache = createLookupCache(createMemoryStorage());
    await loadRecipes(client, cache, [stub('1'), stub('2'), stub('3')]);
    const second = await loadRecipes(client, cache, [stub('2'), stub('3'), stub('4')]);
    expect(second.map((r) => r.id)).toEqual(['2', '3', '4']);
    expect(fetchImpl).toHaveBeenCalledTimes(4);
  });

  it('returns recipes in candidate order even when lookups resolve out of order', async () => {
    const delays: Record<string, number> = { '1': 30, '2': 0, '3': 15 };
    const fetchImpl: FetchLike = (url) => {
      const id = new URL(url).searchParams.get('i') ?? '';
      return new Promise((resolve) =>
        setTimeout(
          () =>
            resolve({
              ok: true,
              status: 200,
              json: () => Promise.resolve({ meals: [{ idMeal: id, strMeal: `Meal ${id}` }] }),
            }),
          delays[id] ?? 0,
        ),
      );
    };
    const client = createMealDbClient(fetchImpl);
    const cache = createLookupCache(createMemoryStorage());
    const cold = await loadRecipes(client, cache, [stub('1'), stub('2'), stub('3')]);
    expect(cold.map((r) => r.id)).toEqual(['1', '2', '3']);
    const warm = await loadRecipes(client, cache, [stub('1'), stub('2'), stub('3')]);
    expect(warm.map((r) => r.id)).toEqual(['1', '2', '3']);
  });

  it('keeps candidate order when some ids are cached and others are fetched', async () => {
    const { client } = clientCounting();
    const cache = createLookupCache(createMemoryStorage());
    cache.set(recipe({ id: '2', name: 'Cached 2' }));
    const recipes = await loadRecipes(client, cache, [stub('1'), stub('2'), stub('3')]);
    expect(recipes.map((r) => r.id)).toEqual(['1', '2', '3']);
    expect(recipes[1]?.name).toBe('Cached 2');
  });

  it('drops failed lookups and does not cache them', async () => {
    const { client, fetchImpl } = clientCounting();
    const cache = createLookupCache(createMemoryStorage());
    const recipes = await loadRecipes(client, cache, [stub('1'), stub('bad')]);
    expect(recipes.map((r) => r.id)).toEqual(['1']);
    expect(cache.get('bad')).toBeNull();
    await loadRecipes(client, cache, [stub('bad')]);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });
});

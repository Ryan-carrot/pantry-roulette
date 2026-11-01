import { describe, expect, it, vi } from 'vitest';
import { createMealDbClient, type FetchLike } from '../src/api/mealdb';
import { surpriseMe } from '../src/api/surprise';
import { createLookupCache } from '../src/storage/lookupCache';
import { createMemoryStorage } from './helpers/memoryStorage';

function randomClient(ids: string[]) {
  let call = 0;
  const fetchImpl = vi.fn<FetchLike>((url) => {
    if (!url.includes('random.php')) return Promise.reject(new Error(`unexpected ${url}`));
    const id = ids[Math.min(call, ids.length - 1)] ?? '0';
    call += 1;
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ meals: [{ idMeal: id, strMeal: `Meal ${id}`, strInstructions: 'Mix for 10 minutes.', strIngredient1: 'eggs', strMeasure1: '2' }] }) });
  });
  return { client: createMealDbClient(fetchImpl), fetchImpl };
}

describe('surpriseMe', () => {
  it('asks random.php and returns the normalised recipe', async () => {
    const { client, fetchImpl } = randomClient(['7']);
    const cache = createLookupCache(createMemoryStorage());
    const recipe = await surpriseMe(client, cache, new Set());
    expect(fetchImpl.mock.calls[0]?.[0]).toBe('https://www.themealdb.com/api/json/v1/1/random.php');
    expect(recipe?.id).toBe('7');
    expect(recipe?.ingredients).toEqual(['eggs']);
    expect(recipe?.cookTime).toBe('under-30');
  });

  it('re-rolls past seen recipes, up to three tries, and returns the first unseen one', async () => {
    const { client, fetchImpl } = randomClient(['1', '2', '3']);
    const cache = createLookupCache(createMemoryStorage());
    const recipe = await surpriseMe(client, cache, new Set(['1', '2']));
    expect(recipe?.id).toBe('3');
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('gives up after three tries and returns the last roll even if seen', async () => {
    const { client, fetchImpl } = randomClient(['1', '1', '1']);
    const recipe = await surpriseMe(client, createLookupCache(createMemoryStorage()), new Set(['1']));
    expect(recipe?.id).toBe('1');
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('caches every roll by id so a later spin does not look it up again', async () => {
    const { client } = randomClient(['1', '2']);
    const cache = createLookupCache(createMemoryStorage());
    await surpriseMe(client, cache, new Set(['1']));
    expect(cache.get('1')?.name).toBe('Meal 1');
    expect(cache.get('2')?.name).toBe('Meal 2');
  });

  it('returns null when the service fails', async () => {
    const client = createMealDbClient(() => Promise.reject(new TypeError('Failed to fetch')));
    await expect(surpriseMe(client, createLookupCache(createMemoryStorage()), new Set())).resolves.toBeNull();
  });
});

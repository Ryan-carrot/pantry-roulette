import { describe, expect, it, vi } from 'vitest';
import {
  createMealDbClient,
  findCandidates,
  interleave,
  mergeCandidates,
  type FetchLike,
} from '../src/api/mealdb';
import type { MealDbStub } from '../src/types';

function stub(id: string, name = `Meal ${id}`): MealDbStub {
  return { idMeal: id, strMeal: name, strMealThumb: null };
}

function jsonResponse(body: unknown, ok = true, status = 200) {
  return Promise.resolve({ ok, status, json: () => Promise.resolve(body) });
}

describe('interleave', () => {
  it('round-robins across lists so no list is starved', () => {
    const out = interleave([
      ['a1', 'a2', 'a3'],
      ['b1'],
      ['c1', 'c2'],
    ]);
    expect(out).toEqual(['a1', 'b1', 'c1', 'a2', 'c2', 'a3']);
  });

  it('returns an empty list for no input', () => {
    expect(interleave([])).toEqual([]);
  });
});

describe('mergeCandidates', () => {
  it('gives every ingredient at least 7 of 30 slots with 4 lists of 10', () => {
    const lists = ['a', 'b', 'c', 'd'].map((prefix) =>
      Array.from({ length: 10 }, (_, i) => stub(`${prefix}${i}`)),
    );
    const merged = mergeCandidates(lists, 30);
    expect(merged).toHaveLength(30);
    for (const prefix of ['a', 'b', 'c', 'd']) {
      const count = merged.filter((m) => m.idMeal.startsWith(prefix)).length;
      expect(count, prefix).toBeGreaterThanOrEqual(7);
    }
  });

  it('dedups by idMeal, keeping the first occurrence', () => {
    const merged = mergeCandidates(
      [[stub('1', 'first'), stub('2')], [stub('1', 'second'), stub('3')]],
      30,
    );
    expect(merged.map((m) => m.idMeal)).toEqual(['1', '2', '3']);
    expect(merged[0]?.strMeal).toBe('first');
  });

  it('dedups before applying the cap so duplicates do not waste slots', () => {
    const merged = mergeCandidates([[stub('1'), stub('2')], [stub('1'), stub('3')]], 3);
    expect(merged.map((m) => m.idMeal)).toEqual(['1', '2', '3']);
  });
});

describe('createMealDbClient', () => {
  it('encodes the ingredient in the filter URL', async () => {
    const fetchImpl = vi.fn<FetchLike>(() => jsonResponse({ meals: [] }));
    const client = createMealDbClient(fetchImpl);
    await client.searchByIngredient('chicken breast & thyme');
    expect(fetchImpl.mock.calls[0]?.[0]).toBe(
      'https://www.themealdb.com/api/json/v1/1/filter.php?i=chicken%20breast%20%26%20thyme',
    );
  });

  it('passes an abort signal so a stalled request cannot hang the spin forever', async () => {
    const fetchImpl = vi.fn<FetchLike>(() => jsonResponse({ meals: [] }));
    const client = createMealDbClient(fetchImpl);
    await client.searchByIngredient('eggs');
    const init = fetchImpl.mock.calls[0]?.[1];
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it('returns an empty list when MealDB reports no meals', async () => {
    const client = createMealDbClient(() => jsonResponse({ meals: null }));
    await expect(client.searchByIngredient('unobtainium')).resolves.toEqual([]);
  });

  it('throws on a non-ok response instead of pretending there were no results', async () => {
    const client = createMealDbClient(() => jsonResponse('Server Error', false, 500));
    await expect(client.searchByIngredient('eggs')).rejects.toThrow(/500/);
  });

  it('throws when the response body is not the expected shape', async () => {
    const client = createMealDbClient(() => jsonResponse({ nope: true }));
    await expect(client.searchByIngredient('eggs')).rejects.toThrow();
  });

  it('looks up a meal by id and returns the first meal', async () => {
    const fetchImpl = vi.fn<FetchLike>(() =>
      jsonResponse({ meals: [{ idMeal: '52772', strMeal: 'Teriyaki' }] }),
    );
    const client = createMealDbClient(fetchImpl);
    const meal = await client.lookup('52772');
    expect(fetchImpl.mock.calls[0]?.[0]).toBe(
      'https://www.themealdb.com/api/json/v1/1/lookup.php?i=52772',
    );
    expect(meal?.strMeal).toBe('Teriyaki');
  });

  it('returns null from lookup when the id is unknown', async () => {
    const client = createMealDbClient(() => jsonResponse({ meals: null }));
    await expect(client.lookup('0')).resolves.toBeNull();
  });
});

describe('findCandidates', () => {
  it('queries every ingredient in parallel and merges the results', async () => {
    const client = createMealDbClient((url) => {
      const i = new URL(url).searchParams.get('i') ?? '';
      return jsonResponse({ meals: [stub(`${i}-1`), stub(`${i}-2`)] });
    });
    const result = await findCandidates(client, ['eggs', 'milk']);
    expect(result.candidates.map((c) => c.idMeal)).toEqual([
      'eggs-1',
      'milk-1',
      'eggs-2',
      'milk-2',
    ]);
    expect(result.failedIngredients).toEqual([]);
  });

  it('keeps going when one ingredient request fails and reports which failed', async () => {
    const client = createMealDbClient((url) => {
      if (url.includes('i=milk')) return Promise.reject(new TypeError('Failed to fetch'));
      return jsonResponse({ meals: [stub('e1')] });
    });
    const result = await findCandidates(client, ['eggs', 'milk']);
    expect(result.candidates.map((c) => c.idMeal)).toEqual(['e1']);
    expect(result.failedIngredients).toEqual(['milk']);
  });

  it('reports every ingredient as failed with no candidates when the service is down', async () => {
    const client = createMealDbClient(() => Promise.reject(new TypeError('Failed to fetch')));
    const result = await findCandidates(client, ['eggs', 'milk']);
    expect(result.candidates).toEqual([]);
    expect(result.failedIngredients).toEqual(['eggs', 'milk']);
  });

  it('caps each ingredient list before interleaving', async () => {
    const client = createMealDbClient((url) => {
      const i = new URL(url).searchParams.get('i') ?? '';
      return jsonResponse({ meals: Array.from({ length: 50 }, (_, n) => stub(`${i}-${n}`)) });
    });
    const result = await findCandidates(client, ['eggs'], { perIngredientCap: 10, totalCap: 30 });
    expect(result.candidates).toHaveLength(10);
  });
});

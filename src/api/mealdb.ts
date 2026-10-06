import type { MealDbMeal, MealDbStub } from '../types';

const BASE_URL = 'https://www.themealdb.com/api/json/v1/1';

/** The subset of `fetch` we rely on, so tests can inject a fake. */
export type FetchLike = (url: string) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}>;

export interface MealDbClient {
  /** Stubs for meals containing the ingredient. Throws on network or HTTP failure. */
  searchByIngredient(ingredient: string): Promise<MealDbStub[]>;
  /** Full meal by id, or null when MealDB has no such meal. Throws on failure. */
  lookup(id: string): Promise<MealDbMeal | null>;
}

interface MealsEnvelope<T> {
  meals: T[] | null;
}

function isMealsEnvelope(value: unknown): value is MealsEnvelope<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'meals' in value &&
    (Array.isArray((value as { meals: unknown }).meals) ||
      (value as { meals: unknown }).meals === null)
  );
}

function hasIdAndName(value: unknown): value is { idMeal: string; strMeal: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { idMeal?: unknown }).idMeal === 'string' &&
    typeof (value as { strMeal?: unknown }).strMeal === 'string'
  );
}

async function getMeals<T>(
  fetchImpl: FetchLike,
  url: string,
  isItem: (v: unknown) => v is T,
): Promise<T[]> {
  const response = await fetchImpl(url);
  if (!response.ok) {
    throw new Error(`TheMealDB responded ${response.status} for ${url}`);
  }
  const body: unknown = await response.json();
  if (!isMealsEnvelope(body)) {
    throw new Error(`Unexpected response shape from ${url}`);
  }
  return (body.meals ?? []).filter(isItem);
}

export function createMealDbClient(fetchImpl: FetchLike = (url) => fetch(url)): MealDbClient {
  return {
    searchByIngredient(ingredient) {
      const url = `${BASE_URL}/filter.php?i=${encodeURIComponent(ingredient)}`;
      return getMeals(fetchImpl, url, (v): v is MealDbStub => hasIdAndName(v));
    },
    async lookup(id) {
      const url = `${BASE_URL}/lookup.php?i=${encodeURIComponent(id)}`;
      const meals = await getMeals(fetchImpl, url, (v): v is MealDbMeal => hasIdAndName(v));
      return meals[0] ?? null;
    },
  };
}

/** Round-robin merge: first of each list, then second of each, and so on. Pure. */
export function interleave<T>(lists: readonly (readonly T[])[]): T[] {
  const out: T[] = [];
  const longest = Math.max(0, ...lists.map((l) => l.length));
  for (let i = 0; i < longest; i++) {
    for (const list of lists) {
      const item = list[i];
      if (item !== undefined) out.push(item);
    }
  }
  return out;
}

/** Interleave per-ingredient lists, dedup by idMeal (first wins), then cap. Pure. */
export function mergeCandidates(
  lists: readonly (readonly MealDbStub[])[],
  cap: number,
): MealDbStub[] {
  const seen = new Set<string>();
  const out: MealDbStub[] = [];
  for (const stub of interleave(lists)) {
    if (seen.has(stub.idMeal)) continue;
    seen.add(stub.idMeal);
    out.push(stub);
    if (out.length >= cap) break;
  }
  return out;
}

export interface CandidateSearch {
  candidates: MealDbStub[];
  /** Ingredients whose request failed (network or HTTP error). */
  failedIngredients: string[];
}

export interface CandidateOptions {
  /** Max stubs taken from each ingredient's result list. v1 used 10. */
  perIngredientCap?: number;
  /** Max stubs sent on for detail lookup. v1 used 30. */
  totalCap?: number;
}

/** Query every ingredient in parallel; one failure does not sink the spin. */
export async function findCandidates(
  client: MealDbClient,
  ingredients: readonly string[],
  options: CandidateOptions = {},
): Promise<CandidateSearch> {
  const perIngredientCap = options.perIngredientCap ?? 10;
  const totalCap = options.totalCap ?? 30;

  const settled = await Promise.allSettled(
    ingredients.map((ingredient) => client.searchByIngredient(ingredient)),
  );

  const lists: MealDbStub[][] = [];
  const failedIngredients: string[] = [];
  settled.forEach((result, index) => {
    const ingredient = ingredients[index];
    if (result.status === 'fulfilled') {
      lists.push(result.value.slice(0, perIngredientCap));
    } else if (ingredient !== undefined) {
      failedIngredients.push(ingredient);
    }
  });

  return { candidates: mergeCandidates(lists, totalCap), failedIngredients };
}

/** Look up every stub in parallel, dropping failures and unknown ids. */
export async function fetchRecipeDetails(
  client: MealDbClient,
  stubs: readonly MealDbStub[],
): Promise<MealDbMeal[]> {
  const settled = await Promise.allSettled(stubs.map((s) => client.lookup(s.idMeal)));
  const meals: MealDbMeal[] = [];
  for (const result of settled) {
    if (result.status === 'fulfilled' && result.value !== null) meals.push(result.value);
  }
  return meals;
}

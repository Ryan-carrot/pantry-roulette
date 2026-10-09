import { describe, expect, it } from 'vitest';
import {
  parseIngredients,
  pickRecipe,
  rankRecipes,
  scoreRecipe,
} from '../src/core/scoring';
import type { Recipe, ScoredRecipe } from '../src/types';

function recipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    id: '1',
    name: 'Test Dish',
    ingredients: ['eggs', 'butter', 'flour', 'milk'],
    measurements: ['', '', '', ''],
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

describe('parseIngredients', () => {
  it('splits on commas, trims and lowercases', () => {
    expect(parseIngredients(' Eggs, Butter ,pasta')).toEqual(['eggs', 'butter', 'pasta']);
  });

  it('drops empty entries from double or trailing commas', () => {
    expect(parseIngredients('eggs,,butter,')).toEqual(['eggs', 'butter']);
  });

  it('removes duplicates', () => {
    expect(parseIngredients('eggs, Eggs, egg')).toEqual(['eggs', 'egg']);
  });

  it('returns an empty list for blank input', () => {
    expect(parseIngredients('   ')).toEqual([]);
  });
});

describe('scoreRecipe', () => {
  it('reports ingredientMatch as matched over the recipe total', () => {
    const s = scoreRecipe(recipe(), ['eggs', 'milk', 'cheese'], 'hearty', new Set());
    expect(s.matchedCount).toBe(2);
    expect(s.ingredientMatch).toBe(0.5);
  });

  it('matches by exact string equality only', () => {
    const s = scoreRecipe(recipe({ ingredients: ['chicken breast'] }), ['chicken'], 'hearty', new Set());
    expect(s.matchedCount).toBe(0);
  });

  it('blends ingredient and vibe scores 50/50', () => {
    const s = scoreRecipe(recipe(), ['eggs', 'butter'], 'hearty', new Set());
    expect(s.ingredientMatch).toBe(0.5);
    expect(s.blendedScore).toBeCloseTo(0.5 * 0.5 + 0.5 * s.vibeScore, 10);
  });

  it('keeps ingredientMatch untouched by the seen penalty but scales blendedScore by 0.3', () => {
    const fresh = scoreRecipe(recipe(), ['eggs', 'butter'], 'hearty', new Set());
    const seen = scoreRecipe(recipe(), ['eggs', 'butter'], 'hearty', new Set(['1']));
    expect(seen.seen).toBe(true);
    expect(seen.ingredientMatch).toBe(fresh.ingredientMatch);
    expect(seen.blendedScore).toBeCloseTo(fresh.blendedScore * 0.3, 10);
  });

  it('applies the seen penalty by id, so a different meal with the same title is not penalised', () => {
    const other = scoreRecipe(recipe({ id: '2' }), ['eggs', 'butter'], 'hearty', new Set(['1']));
    expect(other.seen).toBe(false);
  });

  it('still honours a legacy seen list of names', () => {
    const seen = scoreRecipe(recipe(), ['eggs', 'butter'], 'hearty', new Set(['Test Dish']));
    expect(seen.seen).toBe(true);
  });

  it('returns 0 ingredientMatch for a recipe with no ingredients instead of NaN', () => {
    const s = scoreRecipe(recipe({ ingredients: [] }), ['eggs'], 'hearty', new Set());
    expect(s.ingredientMatch).toBe(0);
    expect(Number.isNaN(s.blendedScore)).toBe(false);
  });
});

describe('rankRecipes', () => {
  it('sorts by blendedScore descending', () => {
    const a = recipe({ name: 'A', ingredients: ['eggs', 'x', 'y', 'z'] });
    const b = recipe({ name: 'B', ingredients: ['eggs', 'butter'] });
    const ranked = rankRecipes([a, b], ['eggs', 'butter'], 'hearty', new Set());
    expect(ranked.map((r) => r.recipe.name)).toEqual(['B', 'A']);
  });

  it('keeps zero-score candidates out of the ranking', () => {
    // No ingredient overlap, and an unknown vibe gives vibeScore 0.
    const ranked = rankRecipes([recipe()], ['tofu'], 'nope', new Set());
    expect(ranked).toEqual([]);
  });
});

describe('rankRecipes tiebreak', () => {
  it('breaks a blended-score tie by matched count, then by name, regardless of input order', () => {
    // Same ingredient lists, same instructions: identical vibe and ingredient scores.
    const banana = recipe({ id: '1', name: 'Banana Pancakes' });
    const apple = recipe({ id: '2', name: 'Apple Pie' });
    const forward = rankRecipes([banana, apple], ['eggs'], 'hearty', new Set());
    const reverse = rankRecipes([apple, banana], ['eggs'], 'hearty', new Set());
    expect(forward.map((r) => r.recipe.name)).toEqual(['Apple Pie', 'Banana Pancakes']);
    expect(reverse.map((r) => r.recipe.name)).toEqual(['Apple Pie', 'Banana Pancakes']);
  });

  it('prefers more matched ingredients when blended scores tie', () => {
    // b matches 2 of 4, a matches 1 of 2: same ingredientMatch, same vibe, different matchedCount.
    const a = recipe({ id: '1', name: 'Aaa', ingredients: ['eggs', 'x'] });
    const b = recipe({ id: '2', name: 'Zzz', ingredients: ['eggs', 'milk', 'y', 'z'] });
    const ranked = rankRecipes([a, b], ['eggs', 'milk'], 'hearty', new Set());
    expect(ranked.map((r) => r.recipe.name)).toEqual(['Zzz', 'Aaa']);
  });

  it('compares names case-insensitively', () => {
    const lower = recipe({ id: '1', name: 'apple crumble' });
    const upper = recipe({ id: '2', name: 'Banana Bread' });
    const ranked = rankRecipes([upper, lower], ['eggs'], 'hearty', new Set());
    expect(ranked[0]?.recipe.name).toBe('apple crumble');
  });
});

describe('pickRecipe', () => {
  it('returns the top-ranked candidate', () => {
    const a = recipe({ name: 'A', ingredients: ['eggs', 'x', 'y', 'z'] });
    const b = recipe({ name: 'B', ingredients: ['eggs', 'butter'] });
    const pick = pickRecipe([a, b], ['eggs', 'butter'], 'hearty', new Set());
    expect(pick?.recipe.name).toBe('B');
  });

  it('falls back to a random candidate when nothing scores above zero', () => {
    const a = recipe({ name: 'A' });
    const b = recipe({ name: 'B' });
    const pick = pickRecipe([a, b], ['tofu'], 'nope', new Set(), () => 0.99);
    expect(pick?.recipe.name).toBe('B');
    expect(pick?.matchedCount).toBe(0);
  });

  it('returns null for an empty candidate pool', () => {
    const pick: ScoredRecipe | null = pickRecipe([], ['eggs'], 'hearty', new Set());
    expect(pick).toBeNull();
  });
});

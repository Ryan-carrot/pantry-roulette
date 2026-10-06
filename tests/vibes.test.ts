import { describe, expect, it } from 'vitest';
import { scoreRecipeForVibe, vibeProfiles } from '../src/core/vibes';
import { VIBE_KEYS } from '../src/types';

function recipe(overrides: { name?: string; ingredients?: string[]; instructions?: string }) {
  return {
    name: overrides.name ?? 'Plain Dish',
    ingredients: overrides.ingredients ?? ['a', 'b', 'c'],
    instructions: overrides.instructions ?? '',
  };
}

describe('vibeProfiles', () => {
  it('defines exactly the ten vibe keys', () => {
    expect(Object.keys(vibeProfiles).sort()).toEqual([...VIBE_KEYS].sort());
  });

  it('weights sum to 1.0 for every profile except simple, which the original left at 0.9', () => {
    for (const key of VIBE_KEYS) {
      const p = vibeProfiles[key];
      const sum = p.ingredientWeight + p.keywordWeight + (p.lengthWeight ?? 0);
      const expected = key === 'simple' ? 0.9 : 1.0;
      expect(sum, key).toBeCloseTo(expected, 10);
    }
  });

  it('reproduces the original keyword lists verbatim', () => {
    expect(vibeProfiles.lazy.keywords).toEqual([
      'mix', 'stir', 'microwave', 'simple', 'easy', 'toss', 'combine',
    ]);
    expect(vibeProfiles.impressive.keywords).toEqual([
      'marinate', 'reduce', 'simmer', 'layer', 'carefully', 'slowly', 'rest', 'fold',
    ]);
    expect(vibeProfiles.elegant.keywords).toContain('flambé');
    expect(vibeProfiles.lazy.maxIngredients).toBe(5);
    expect(vibeProfiles.lazy.maxInstructionLength).toBe(300);
    expect(vibeProfiles.impressive.minIngredients).toBe(8);
    expect(vibeProfiles.impressive.minInstructionLength).toBe(800);
    expect(vibeProfiles.simple.maxIngredients).toBe(6);
    expect(vibeProfiles.simple.maxInstructionLength).toBe(400);
  });
});

describe('scoreRecipeForVibe', () => {
  it('returns 0 for an unknown vibe', () => {
    expect(scoreRecipeForVibe(recipe({}), 'spicy')).toBe(0);
  });

  it('matches keywords against the instruction text, not only the title', () => {
    const withText = recipe({ instructions: 'Carefully fold the egg whites and simmer slowly.' });
    const without = recipe({ instructions: 'Bake it.' });
    expect(scoreRecipeForVibe(withText, 'impressive')).toBeGreaterThan(
      scoreRecipeForVibe(without, 'impressive'),
    );
  });

  it('scores a keyword-only vibe as 0.1 + 0.8 * keyword fraction', () => {
    // hearty: 9 keywords, ingredientScore constant 0.5 * 0.2 = 0.1
    const r = recipe({ instructions: 'A thick beef stew with gravy.' });
    // beef, stew, gravy, thick = 4/9
    expect(scoreRecipeForVibe(r, 'hearty')).toBeCloseTo(0.1 + 0.8 * (4 / 9), 10);
  });

  it('matches keywords as substrings, as the original did', () => {
    const r = recipe({ instructions: 'Serve with popcorn at the restaurant.' });
    // "pop" in popcorn (fun), "rest" in restaurant (impressive)
    expect(scoreRecipeForVibe(r, 'fun')).toBeCloseTo(0.1 + 0.8 * (1 / 9), 10);
  });

  it('decays the lazy ingredient score linearly above maxIngredients', () => {
    const five = recipe({ ingredients: Array(5).fill('x') });
    const ten = recipe({ ingredients: Array(10).fill('x') });
    const fifteen = recipe({ ingredients: Array(15).fill('x') });
    // lazy with empty instructions: keyword 0, length 1 (0 <= 300) → 0.2 + ingredient * 0.4
    expect(scoreRecipeForVibe(five, 'lazy')).toBeCloseTo(0.2 + 0.4 * 1, 10);
    expect(scoreRecipeForVibe(ten, 'lazy')).toBeCloseTo(0.2 + 0.4 * 0.5, 10);
    expect(scoreRecipeForVibe(fifteen, 'lazy')).toBeCloseTo(0.2 + 0.4 * 0, 10);
  });

  it('scales the impressive ingredient score up to minIngredients', () => {
    const four = recipe({ ingredients: Array(4).fill('x') });
    const eight = recipe({ ingredients: Array(8).fill('x') });
    // impressive, empty instructions: keyword 0, length 0 → ingredient * 0.3
    expect(scoreRecipeForVibe(four, 'impressive')).toBeCloseTo(0.3 * 0.5, 10);
    expect(scoreRecipeForVibe(eight, 'impressive')).toBeCloseTo(0.3 * 1, 10);
  });

  it('ranks short and long instructions oppositely for lazy and impressive', () => {
    const shortRecipe = recipe({ ingredients: ['a'], instructions: 'Bake it.' });
    const longRecipe = recipe({ ingredients: ['a'], instructions: 'Bake it. '.repeat(250) });

    expect(scoreRecipeForVibe(shortRecipe, 'lazy')).toBeGreaterThan(
      scoreRecipeForVibe(longRecipe, 'lazy'),
    );
    expect(scoreRecipeForVibe(longRecipe, 'impressive')).toBeGreaterThan(
      scoreRecipeForVibe(shortRecipe, 'impressive'),
    );
  });

  it('decays the lazy length score to 0 at maxInstructionLength + 500', () => {
    const r = recipe({ ingredients: ['a'], instructions: 'x'.repeat(800) });
    // keyword 0, ingredient 1 → 0.4 + length 0 → 0.4
    expect(scoreRecipeForVibe(r, 'lazy')).toBeCloseTo(0.4, 10);
  });

  it('always returns a value between 0 and 1', () => {
    const r = recipe({
      ingredients: Array(20).fill('x'),
      instructions: vibeProfiles.impressive.keywords.join(' ').repeat(50),
    });
    for (const key of VIBE_KEYS) {
      const s = scoreRecipeForVibe(r, key);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(1);
    }
  });
});

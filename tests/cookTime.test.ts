import { describe, expect, it } from 'vitest';
import { estimateCookTime, parseDurations } from '../src/core/cookTime';
import { normalizeMeal } from '../src/core/normalize';
import { toRecipe } from '../src/storage/recipeCodec';

describe('parseDurations', () => {
  it('finds minutes and hours in their common spellings, in minutes', () => {
    expect(parseDurations('Bake for 20 minutes, then rest 5 mins. Simmer 1 hour; chill 2 hrs. Fry 3 min.')).toEqual([20, 5, 60, 120, 3]);
  });

  it('takes the larger end of a range', () => {
    expect(parseDurations('cook 1-2 hrs, then 10–15 minutes')).toEqual([120, 15]);
  });

  it('reads overnight and half an hour', () => {
    expect(parseDurations('Marinate overnight. Rest for half an hour.')).toEqual([720, 30]);
  });

  it('ignores numbers that are not durations', () => {
    expect(parseDurations('Preheat the oven to 180C. Add 2 eggs and 200g flour.')).toEqual([]);
  });
});

describe('estimateCookTime', () => {
  const steps = (n: number) => Array.from({ length: n }, (_, i) => `Step ${i + 1}.`);

  it('returns null when the text mentions no duration at all', () => {
    expect(estimateCookTime('Mix everything and serve.', steps(2))).toBeNull();
  });

  it('buckets a quick recipe as under-30', () => {
    expect(estimateCookTime('Fry for 8 minutes and serve.', steps(3))).toBe('under-30');
  });

  it('buckets a medium recipe as 30-60', () => {
    expect(estimateCookTime('Simmer for 35 minutes.', steps(4))).toBe('30-60');
  });

  it('buckets a long recipe as over-60', () => {
    expect(estimateCookTime('Roast for 1 hour 30 minutes.', steps(5))).toBe('over-60');
  });

  it('treats overnight as over-60', () => {
    expect(estimateCookTime('Marinate overnight, then grill 10 minutes.', steps(3))).toBe('over-60');
  });

  it('uses the largest duration when phrases overlap, not their sum', () => {
    // 20 + 20 + 20 would be over an hour; the largest single leg is 20, plus the step heuristic
    expect(estimateCookTime('Cook 20 minutes. Cook another 20 minutes. Bake 20 minutes.', steps(3))).toBe('under-30');
  });

  it('lets a long step list push a short duration up a bucket', () => {
    // 25 min + 3 min for each of 9 steps = 52
    expect(estimateCookTime('Bake 25 minutes.', steps(9))).toBe('30-60');
  });
});

describe('cookTime on the recipe', () => {
  it('is derived by normalizeMeal and cached with the recipe', () => {
    const recipe = normalizeMeal({ idMeal: '1', strMeal: 'Stew', strInstructions: 'Brown the beef.\nSimmer for 2 hours.' });
    expect(recipe.cookTime).toBe('over-60');
    const none = normalizeMeal({ idMeal: '2', strMeal: 'Salad', strInstructions: 'Toss and serve.' });
    expect(none.cookTime).toBeNull();
  });

  it('survives the storage codec and defaults to null for legacy entries', () => {
    expect(toRecipe({ name: 'Stew', cookTime: '30-60' })?.cookTime).toBe('30-60');
    expect(toRecipe({ name: 'Stew', cookTime: 'bogus' })?.cookTime).toBeNull();
    expect(toRecipe({ name: 'Legacy' })?.cookTime).toBeNull();
  });
});

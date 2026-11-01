import { describe, expect, it } from 'vitest';
import { normalizeMeal } from '../src/core/normalize';
import type { MealDbMeal } from '../src/types';

function meal(overrides: Partial<MealDbMeal> = {}): MealDbMeal {
  return {
    idMeal: '52772',
    strMeal: 'Teriyaki Chicken Casserole',
    strMealThumb: 'https://www.themealdb.com/images/media/meals/wvpsxx1468256321.jpg',
    strInstructions: 'Preheat oven to 350.\r\nMix the sauce.\r\n\r\n  Bake for 20 mins.  ',
    strCategory: 'Chicken',
    strArea: 'Japanese',
    strSource: null,
    strIngredient1: 'soy sauce',
    strMeasure1: '3/4 cup',
    strIngredient2: ' Chicken Breast ',
    strMeasure2: ' 1 lb ',
    strIngredient3: 'sesame seeds',
    strMeasure3: null,
    strIngredient4: '',
    strMeasure4: '1 tsp',
    strIngredient5: null,
    strMeasure5: null,
    ...overrides,
  };
}

describe('normalizeMeal', () => {
  it('keeps the raw instruction text alongside the split steps', () => {
    const recipe = normalizeMeal(meal());
    expect(recipe.instructions).toBe(
      'Preheat oven to 350.\r\nMix the sauce.\r\n\r\n  Bake for 20 mins.  ',
    );
    expect(recipe.steps).toEqual(['Preheat oven to 350.', 'Mix the sauce.', 'Bake for 20 mins.']);
  });

  it('lowercases and trims ingredients and drops empty or null slots', () => {
    const recipe = normalizeMeal(meal());
    expect(recipe.ingredients).toEqual(['soy sauce', 'chicken breast', 'sesame seeds']);
  });

  it('keeps measurements index-aligned with ingredients, empty string when missing', () => {
    const recipe = normalizeMeal(meal());
    expect(recipe.measurements).toEqual(['3/4 cup', '1 lb', '']);
  });

  it('captures id, image, category, area and source', () => {
    const recipe = normalizeMeal(meal({ strSource: 'https://example.com/r' }));
    expect(recipe.id).toBe('52772');
    expect(recipe.name).toBe('Teriyaki Chicken Casserole');
    expect(recipe.image).toBe(
      'https://www.themealdb.com/images/media/meals/wvpsxx1468256321.jpg',
    );
    expect(recipe.category).toBe('Chicken');
    expect(recipe.area).toBe('Japanese');
    expect(recipe.source).toBe('https://example.com/r');
  });

  it('nulls out missing optional fields instead of storing undefined', () => {
    const bare: MealDbMeal = { idMeal: '1', strMeal: 'Bare', strMealThumb: null, strArea: null };
    const recipe = normalizeMeal(bare);
    expect(recipe.image).toBeNull();
    expect(recipe.category).toBeNull();
    expect(recipe.area).toBeNull();
    expect(recipe.source).toBeNull();
  });

  it('builds the description from the first 120 characters of the first step', () => {
    const longStep = 'a'.repeat(200);
    const recipe = normalizeMeal(meal({ strInstructions: `${longStep}\nsecond` }));
    expect(recipe.description).toBe(`${'a'.repeat(120)}...`);
  });

  it('falls back to a placeholder description when there are no instructions', () => {
    const recipe = normalizeMeal(meal({ strInstructions: null }));
    expect(recipe.instructions).toBe('');
    expect(recipe.steps).toEqual([]);
    expect(recipe.description).toBe('No description available.');
  });

  it('does not invent a cook time', () => {
    const recipe = normalizeMeal(meal());
    expect('time' in recipe).toBe(false);
  });
});

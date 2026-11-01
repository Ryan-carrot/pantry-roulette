import { describe, expect, it } from 'vitest';
import { isSeen, recipeKey, sameRecipe } from '../src/core/identity';

const withId = { id: '52772', name: 'Teriyaki Chicken' };
const sameIdOtherName = { id: '52772', name: 'Teriyaki Chicken Casserole' };
const otherIdSameName = { id: '99999', name: 'Teriyaki Chicken' };
const legacy = { id: null, name: 'Teriyaki Chicken' };

describe('recipeKey', () => {
  it('uses the id when present', () => {
    expect(recipeKey(withId)).toBe('52772');
  });

  it('falls back to the name for legacy entries without an id', () => {
    expect(recipeKey(legacy)).toBe('Teriyaki Chicken');
  });
});

describe('sameRecipe', () => {
  it('compares by id when both sides have one', () => {
    expect(sameRecipe(withId, sameIdOtherName)).toBe(true);
    expect(sameRecipe(withId, otherIdSameName)).toBe(false);
  });

  it('compares by name when either side is a legacy entry', () => {
    expect(sameRecipe(withId, legacy)).toBe(true);
    expect(sameRecipe(legacy, withId)).toBe(true);
    expect(sameRecipe(legacy, { id: null, name: 'Other' })).toBe(false);
  });
});

describe('isSeen', () => {
  it('matches a seen list of ids', () => {
    expect(isSeen(new Set(['52772']), withId)).toBe(true);
    expect(isSeen(new Set(['52772']), otherIdSameName)).toBe(false);
  });

  it('still matches a legacy seen list of names', () => {
    expect(isSeen(new Set(['Teriyaki Chicken']), withId)).toBe(true);
    expect(isSeen(new Set(['Teriyaki Chicken']), legacy)).toBe(true);
  });
});

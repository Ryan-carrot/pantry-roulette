import { describe, expect, it } from 'vitest';
import { parseMeasure } from '../src/core/measurements';

describe('parseMeasure', () => {
  it.each([
    ['2', 2, null],
    ['200g', 200, 'g'],
    ['1.5 kg', 1.5, 'kg'],
    ['3 tbsp', 3, 'tbsp'],
    ['1 tsp', 1, 'tsp'],
    ['¾ cup', 0.75, 'cup'],
    ['½', 0.5, null],
    ['1/2 cup', 0.5, 'cup'],
    ['1 1/2 cups', 1.5, 'cup'],
    ['2½ tbsp', 2.5, 'tbsp'],
    ['1-2 cloves', 1, 'clove'],
    ['1–2 tbsp', 1, 'tbsp'],
    ['250ml', 250, 'ml'],
    ['2 cloves, chopped', 2, 'clove'],
    ['8 ounces', 8, 'oz'],
    ['1 lb', 1, 'lb'],
    ['4 large', 4, null],
    ['1 can', 1, 'can'],
  ] as const)('parses %j', (raw, qty, unit) => {
    const parsed = parseMeasure(raw);
    expect(parsed.qty).toBe(qty);
    expect(parsed.unit).toBe(unit);
    expect(parsed.raw).toBe(raw);
  });

  it.each(['To taste', 'Pinch', 'Dash', 'Handful', '', '   ', 'Garnish', 'Juice of'])('yields no quantity for %j', (raw) => {
    const parsed = parseMeasure(raw);
    expect(parsed.qty).toBeNull();
    expect(parsed.raw).toBe(raw);
  });

  it('keeps a unit it does not recognise as null, with the quantity intact', () => {
    expect(parseMeasure('2 sprigs')).toEqual({ qty: 2, unit: null, raw: '2 sprigs' });
  });
});

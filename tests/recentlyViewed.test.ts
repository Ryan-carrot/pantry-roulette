// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { el } from '../src/ui/el';
import { renderRecentlyViewed } from '../src/ui/recentlyViewed';
import type { Recipe } from '../src/types';

function recipe(overrides: Partial<Recipe> = {}): Recipe {
  return { id: '1', name: 'Test Dish', ingredients: ['eggs'], measurements: ['2'], steps: ['Mix.'], instructions: 'Mix.', description: 'Mix....', image: 'https://example.com/dish.jpg', category: null, area: null, source: null, ...overrides };
}

describe('recently viewed', () => {
  it('hides the section when empty', () => {
    const section = el('section', { class: 'hidden' });
    const list = el('div');
    renderRecentlyViewed(section, list, [], { onView: () => {} });
    expect(section.classList.contains('hidden')).toBe(true);
  });

  it('renders each card as a real button that opens the recipe', () => {
    const section = el('section', { class: 'hidden' });
    const list = el('div');
    const onView = vi.fn();
    renderRecentlyViewed(section, list, [recipe({ name: 'A' }), recipe({ id: '2', name: 'B', image: null })], { onView });
    expect(section.classList.contains('hidden')).toBe(false);
    const cards = list.querySelectorAll('button.recent-card');
    expect(cards).toHaveLength(2);
    expect(list.querySelector('.recent-placeholder')).not.toBeNull();
    (cards[1] as HTMLButtonElement).click();
    expect(onView).toHaveBeenCalledWith(expect.objectContaining({ name: 'B' }), cards[1]);
  });
});

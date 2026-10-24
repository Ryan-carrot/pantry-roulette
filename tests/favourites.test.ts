// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { el } from '../src/ui/el';
import { renderFavourites } from '../src/ui/favourites';
import type { Recipe } from '../src/types';

function recipe(overrides: Partial<Recipe> = {}): Recipe {
  return { id: '1', name: 'Test Dish', ingredients: ['eggs'], measurements: ['2'], steps: ['Mix.'], instructions: 'Mix.', description: 'Mix....', image: 'https://example.com/dish.jpg', category: 'Dessert', area: 'British', source: null, ...overrides };
}

describe('saved recipes', () => {
  it('shows the empty message when there are no favourites', () => {
    const list = el('div');
    const empty = el('p', { class: 'hidden' });
    renderFavourites(list, empty, [], { onView: () => {}, onRemove: () => {} });
    expect(empty.classList.contains('hidden')).toBe(false);
    expect(list.children).toHaveLength(0);
  });

  it('renders a card per favourite with a lit saved indicator', () => {
    const list = el('div');
    const empty = el('p');
    renderFavourites(list, empty, [recipe({ id: '1', name: 'A' }), recipe({ id: '2', name: 'B' })], { onView: () => {}, onRemove: () => {} });
    expect(empty.classList.contains('hidden')).toBe(true);
    const cards = list.querySelectorAll('.fav');
    expect(cards).toHaveLength(2);
    expect(cards[0]?.querySelector('h3')?.textContent).toBe('A');
    expect(cards[0]?.querySelector('.lamp')).not.toBeNull();
    expect(cards[0]?.querySelector('.lamp')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('removes the right favourite even when the click lands on the icon inside the button', () => {
    const list = el('div');
    const onRemove = vi.fn();
    renderFavourites(list, el('p'), [recipe({ id: '1', name: 'A' }), recipe({ id: '2', name: 'B' })], { onView: () => {}, onRemove });
    const second = list.querySelectorAll('.remove-btn')[1];
    second?.querySelector('svg')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onRemove).toHaveBeenCalledWith('2');
  });

  it('removes a legacy favourite by name when it has no id', () => {
    const list = el('div');
    const onRemove = vi.fn();
    renderFavourites(list, el('p'), [recipe({ id: null, name: 'Legacy Pie' })], { onView: () => {}, onRemove });
    list.querySelector<HTMLButtonElement>('.remove-btn')?.click();
    expect(onRemove).toHaveBeenCalledWith('Legacy Pie');
  });

  it('opens the recipe from the view button, passing the button as the trigger', () => {
    const list = el('div');
    const onView = vi.fn();
    renderFavourites(list, el('p'), [recipe({ name: 'A' })], { onView, onRemove: () => {} });
    const view = list.querySelector<HTMLButtonElement>('.fav-view-btn') as HTMLButtonElement;
    view.click();
    expect(onView).toHaveBeenCalledWith(expect.objectContaining({ name: 'A' }), view);
  });

  it('renders names as text and shows no cook time', () => {
    const list = el('div');
    renderFavourites(list, el('p'), [recipe({ name: '<i>x</i>' })], { onView: () => {}, onRemove: () => {} });
    expect(list.querySelector('h3 i')).toBeNull();
    expect(list.textContent).not.toMatch(/mins/);
  });
});

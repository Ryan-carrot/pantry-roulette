// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { el, svgIcon } from '../src/ui/el';
import { renderFavourites } from '../src/ui/favourites';
import { buildPrintDocument } from '../src/ui/print';
import { renderRecentlyViewed } from '../src/ui/recentlyViewed';
import type { Recipe } from '../src/types';

function recipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    id: '1',
    name: 'Test Dish',
    ingredients: ['eggs', 'butter', 'flour'],
    measurements: ['2', '50g', ''],
    steps: ['Mix.', 'Bake.'],
    instructions: 'Mix.\nBake.',
    description: 'Mix....',
    image: 'https://example.com/dish.jpg',
    category: 'Dessert',
    area: 'British',
    source: null,
    ...overrides,
  };
}



describe('el', () => {
  it('builds an element with attributes and text children', () => {
    const node = el('p', { class: 'x', 'data-name': 'a' }, ['hi']);
    expect(node.tagName).toBe('P');
    expect(node.className).toBe('x');
    expect(node.dataset['name']).toBe('a');
    expect(node.textContent).toBe('hi');
  });

  it('never parses text as HTML', () => {
    const node = el('h2', {}, ['<img src=x onerror=alert(1)>']);
    expect(node.children).toHaveLength(0);
    expect(node.textContent).toBe('<img src=x onerror=alert(1)>');
  });

  it('builds hidden, non-focusable svg icons', () => {
    const icon = svgIcon('heart');
    expect(icon.getAttribute('aria-hidden')).toBe('true');
    expect(icon.getAttribute('focusable')).toBe('false');
    expect(icon.querySelector('path')).not.toBeNull();
  });
});

describe('renderRecentlyViewed', () => {
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
    renderRecentlyViewed(section, list, [recipe({ name: 'A' }), recipe({ name: 'B', image: null })], {
      onView,
    });
    expect(section.classList.contains('hidden')).toBe(false);
    const cards = list.querySelectorAll('button.recent-card');
    expect(cards).toHaveLength(2);
    expect(list.querySelector('.recent-img-placeholder')).not.toBeNull();
    (cards[1] as HTMLButtonElement).click();
    expect(onView).toHaveBeenCalledWith(expect.objectContaining({ name: 'B' }), cards[1]);
  });
});

describe('renderFavourites', () => {
  it('shows the empty message when there are no favourites', () => {
    const list = el('div');
    const empty = el('p', { class: 'hidden' });
    renderFavourites(list, empty, [], { onView: () => {}, onRemove: () => {} });
    expect(empty.classList.contains('hidden')).toBe(false);
  });

  it('removes the right favourite even when the click lands on the icon inside the button', () => {
    const list = el('div');
    const empty = el('p');
    const onRemove = vi.fn();
    renderFavourites(list, empty, [recipe({ id: '1', name: 'A' }), recipe({ id: '2', name: 'B' })], {
      onView: () => {},
      onRemove,
    });
    expect(empty.classList.contains('hidden')).toBe(true);
    const secondRemove = list.querySelectorAll('.remove-btn')[1];
    const svg = secondRemove?.querySelector('svg');
    svg?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onRemove).toHaveBeenCalledWith('2');
  });

  it('removes a legacy favourite by name when it has no id', () => {
    const list = el('div');
    const onRemove = vi.fn();
    renderFavourites(list, el('p'), [recipe({ id: null, name: 'Legacy Pie' })], {
      onView: () => {},
      onRemove,
    });
    list.querySelector<HTMLButtonElement>('.remove-btn')?.click();
    expect(onRemove).toHaveBeenCalledWith('Legacy Pie');
  });

  it('has no time pill and no markup injection', () => {
    const list = el('div');
    renderFavourites(list, el('p'), [recipe({ name: '<i>x</i>' })], {
      onView: () => {},
      onRemove: () => {},
    });
    expect(list.querySelector('h3 i')).toBeNull();
    expect(list.textContent).not.toMatch(/mins/);
  });
});

describe('buildPrintDocument', () => {
  it('builds the print layout with DOM nodes and no cook time', () => {
    const doc = document.implementation.createHTMLDocument('x');
    buildPrintDocument(doc, recipe());
    expect(doc.title).toBe('Pantry Roulette — Test Dish');
    expect(doc.querySelector('h2')?.textContent).toBe('Test Dish');
    expect(doc.querySelector('.category')?.textContent).toBe('Dessert');
    const items = Array.from(doc.querySelectorAll('ul li')).map((li) => li.textContent);
    expect(items).toEqual(['2 eggs', '50g butter', 'flour']);
    expect(doc.querySelectorAll('ol li')).toHaveLength(2);
    expect(doc.querySelector('.footer')?.textContent).toBe('Printed from pantryroulette.com');
    expect(doc.querySelector('style')?.textContent).toMatch(/Arial/);
    expect(doc.body.textContent).not.toMatch(/mins/);
  });

  it('does not inject markup from the recipe name', () => {
    const doc = document.implementation.createHTMLDocument('x');
    buildPrintDocument(doc, recipe({ name: '<script>alert(1)</script>' }));
    expect(doc.querySelector('script')).toBeNull();
  });
});

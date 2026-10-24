// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { markResultUnsaved, renderMessage, renderResult, type ResultHandlers } from '../src/ui/resultCard';
import type { Recipe, ScoredRecipe } from '../src/types';

function recipe(overrides: Partial<Recipe> = {}): Recipe {
  return { id: '1', name: 'Chicken Handi', ingredients: ['chicken', 'onion', 'tomato'], measurements: ['1 kg', '5', '2'], steps: ['Cook.'], instructions: 'Cook.', description: 'Fried onions and ginger....', image: 'https://example.com/handi.jpg', category: 'Chicken', area: 'Indian', source: null, ...overrides };
}
function scored(overrides: Partial<ScoredRecipe> = {}): ScoredRecipe {
  return { recipe: recipe(), matchedCount: 2, ingredientMatch: 2 / 3, vibeScore: 0.71, blendedScore: 0.62, seen: false, ...overrides };
}
function handlers(overrides: Partial<ResultHandlers> = {}): ResultHandlers {
  return { isSaved: false, vibeLabel: 'comfort', onSave: () => 'added', onView: () => {}, onSpinAgain: () => {}, ...overrides };
}

describe('result card', () => {
  let container: HTMLElement;
  beforeEach(() => { container = document.createElement('div'); document.body.replaceChildren(container); });

  it('renders every field of the scored recipe', () => {
    renderResult(container, scored(), handlers());
    expect(container.querySelector('h2')?.textContent).toBe('Chicken Handi');
    expect(container.querySelector('img')?.getAttribute('src')).toBe('https://example.com/handi.jpg');
    expect(container.querySelector('.desc')?.textContent).toBe('Fried onions and ginger....');
    const pills = [...container.querySelectorAll('.pill')].map((p) => p.textContent);
    expect(pills).toEqual(['2 of 3 ingredients', '62% score', '71% comfort']);
    expect(container.querySelector('#view-recipe-btn')?.textContent).toBe('View recipe');
  });

  it('renders names as text, never markup', () => {
    renderResult(container, scored({ recipe: recipe({ name: '<b>x</b> "y"' }) }), handlers());
    expect(container.querySelector('h2 b')).toBeNull();
    expect(container.querySelector('h2')?.textContent).toBe('<b>x</b> "y"');
    expect(container.querySelector('img')?.getAttribute('alt')).toBe('<b>x</b> "y"');
  });

  it('shows the save button lit when the recipe is already saved', () => {
    renderResult(container, scored(), handlers({ isSaved: true, onSave: () => 'exists' }));
    const save = container.querySelector<HTMLButtonElement>('#save-btn');
    expect(save?.getAttribute('aria-pressed')).toBe('true');
    expect(save?.textContent?.trim()).toBe('Saved');
    expect(save?.disabled).toBe(false);
  });

  it('lights up on a successful save', () => {
    const onSave = vi.fn(() => 'added' as const);
    renderResult(container, scored(), handlers({ onSave }));
    const save = container.querySelector<HTMLButtonElement>('#save-btn') as HTMLButtonElement;
    expect(save.getAttribute('aria-pressed')).toBe('false');
    save.click();
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(save.getAttribute('aria-pressed')).toBe('true');
    expect(save.textContent?.trim()).toBe('Saved');
  });

  it('stays unlit and explains when favourites are full', () => {
    renderResult(container, scored(), handlers({ onSave: () => 'full' }));
    const save = container.querySelector<HTMLButtonElement>('#save-btn') as HTMLButtonElement;
    save.click();
    expect(save.getAttribute('aria-pressed')).toBe('false');
    expect(container.querySelector('.save-note')?.textContent).toMatch(/full/i);
  });

  it('wires view and spin again', () => {
    const onView = vi.fn(); const onSpinAgain = vi.fn();
    renderResult(container, scored(), handlers({ onView, onSpinAgain }));
    container.querySelector<HTMLButtonElement>('#view-recipe-btn')?.click();
    container.querySelector<HTMLButtonElement>('#spin-again-btn')?.click();
    expect(onView).toHaveBeenCalledTimes(1);
    expect(onSpinAgain).toHaveBeenCalledTimes(1);
  });

  it('lists failed ingredient searches as a notice under the card', () => {
    renderResult(container, scored(), handlers({ failedIngredients: ['olive oil'] }));
    const note = container.querySelector('.search-note');
    expect(note?.textContent).toBe("Couldn't search for: olive oil");
    expect(note?.getAttribute('role')).toBe('status');
  });

  it('unlights the save button only when the removed key matches', () => {
    renderResult(container, scored(), handlers({ isSaved: true }));
    markResultUnsaved(container, '2');
    expect(container.querySelector('#save-btn')?.getAttribute('aria-pressed')).toBe('true');
    markResultUnsaved(container, '1');
    expect(container.querySelector('#save-btn')?.getAttribute('aria-pressed')).toBe('false');
  });

  it('renders plain and notice messages', () => {
    renderMessage(container, 'Nothing found');
    expect(container.querySelector('.message')?.textContent).toBe('Nothing found');
    expect(container.querySelector('.message.notice')).toBeNull();
    renderMessage(container, "Couldn't reach the recipe service", 'notice');
    expect(container.querySelector('.message.notice')?.textContent).toBe("Couldn't reach the recipe service");
  });
});

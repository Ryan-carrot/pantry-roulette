import { recipeKey } from '../core/identity';
import type { AddResult } from '../storage/favourites';
import type { ScoredRecipe } from '../types';
import { el, replaceChildren, svgIcon } from './el';

export interface ResultHandlers {
  isSaved: boolean;
  /** Lowercase label for the vibe pill, e.g. "comfort". */
  vibeLabel: string;
  onSave: () => AddResult;
  onView: (trigger: HTMLElement) => void;
  onSpinAgain: () => void;
  /** Ingredients whose filter request failed; shown as a notice under the card. */
  failedIngredients?: readonly string[];
  /** The spin had no ingredient input (surprise me), so the match pill shows a dash. */
  noInput?: boolean;
}

/** The lit-when-saved treatment: aria-pressed drives the glow in result.css. */
function setSavedState(button: HTMLButtonElement, saved: boolean): void {
  button.setAttribute('aria-pressed', String(saved));
  const text = button.querySelector('.save-text');
  if (text) text.textContent = saved ? 'Saved' : 'Save';
  const name = button.dataset['recipeName'] ?? '';
  button.setAttribute('aria-label', saved ? `${name} is saved` : `Save ${name}`);
}

/** Render the picked recipe into the result region. The card is the pay-out; the sheet is the star. */
export function renderResult(container: HTMLElement, scored: ScoredRecipe, handlers: ResultHandlers): void {
  const { recipe } = scored;
  const scorePercent = Math.round(scored.blendedScore * 100);
  const vibePercent = Math.round(scored.vibeScore * 100);

  const saveButton = el('button', {
    id: 'save-btn', type: 'button', class: 'btn-save', 'data-recipe-key': recipeKey(recipe), 'data-recipe-name': recipe.name,
  }, [svgIcon('heart', { size: 18 }), el('span', { class: 'save-text' }, ['Save'])]);
  setSavedState(saveButton, handlers.isSaved);
  const note = el('p', { class: 'save-note hidden', role: 'status' });
  saveButton.addEventListener('click', () => {
    if (saveButton.getAttribute('aria-pressed') === 'true') return;
    const result = handlers.onSave();
    if (result === 'full') {
      note.textContent = 'Saved recipes are full (50). Remove one to save this.';
      note.classList.remove('hidden');
      return;
    }
    note.classList.add('hidden');
    setSavedState(saveButton, true);
  });

  const viewButton = el('button', { id: 'view-recipe-btn', type: 'button', class: 'btn-primary' }, ['View recipe']);
  viewButton.addEventListener('click', () => handlers.onView(viewButton));
  const againButton = el('button', { id: 'spin-again-btn', type: 'button', class: 'btn-ghost' }, ['Spin again']);
  againButton.addEventListener('click', () => handlers.onSpinAgain());

  replaceChildren(container, [
    el('article', { class: 'card' }, [
      el('div', { class: 'card-media' }, [
        recipe.image ? el('img', { src: recipe.image, alt: recipe.name }) : el('div', { class: 'card-placeholder' }),
      ]),
      el('div', { class: 'card-body' }, [
        el('h2', { class: 'card-title' }, [recipe.name]),
        el('p', { class: 'desc' }, [recipe.description]),
        el('div', { class: 'pills', 'aria-label': 'How this matched' }, [
          el('span', { class: 'pill' }, [el('b', {}, [handlers.noInput ? '—' : `${scored.matchedCount} of ${recipe.ingredients.length}`]), ' ingredients']),
          el('span', { class: 'pill' }, [el('b', {}, [`${scorePercent}%`]), ' score']),
          el('span', { class: 'pill' }, [el('b', {}, [`${vibePercent}%`]), ` ${handlers.vibeLabel}`]),
        ]),
        el('div', { class: 'card-actions' }, [viewButton, saveButton]),
        note,
        el('div', { class: 'card-again' }, [againButton]),
      ]),
    ]),
    handlers.failedIngredients && handlers.failedIngredients.length > 0
      ? el('p', { class: 'search-note notice', role: 'status' }, [`Couldn't search for: ${handlers.failedIngredients.join(', ')}`])
      : null,
  ]);
}

/** Replace the result region with one line: a plain message, or a coral notice when something failed. */
export function renderMessage(container: HTMLElement, message: string, kind: 'plain' | 'notice' = 'plain'): void {
  replaceChildren(container, [el('p', { class: kind === 'notice' ? 'message notice' : 'message' }, [message])]);
}

/**
 * Every candidate for these ingredients has been seen. Not an error: the
 * fix is to clear history, so the action sits inline in the message.
 */
export function renderExhausted(container: HTMLElement, onClear: () => void): void {
  const button = el('button', { type: 'button', class: 'btn-inline' }, ['clear history']);
  button.addEventListener('click', onClear);
  replaceChildren(container, [
    el('p', { class: 'message exhausted' }, [
      "You've seen everything for these ingredients — ",
      button,
      ' to start over.',
    ]),
  ]);
}

/** Unlight the card's save button after a favourite is removed by key. */
export function markResultUnsaved(container: HTMLElement, key: string): void {
  const button = container.querySelector<HTMLButtonElement>('#save-btn');
  if (button && button.dataset['recipeKey'] === key) setSavedState(button, false);
}

/** Mark the card as re-saved (the favourite was added from the sheet). */
export function markResultSaved(container: HTMLElement, key: string): void {
  const button = container.querySelector<HTMLButtonElement>('#save-btn');
  if (button && button.dataset['recipeKey'] === key) setSavedState(button, true);
}

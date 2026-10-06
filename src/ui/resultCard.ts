import type { AddResult } from '../storage/favourites';
import type { ScoredRecipe } from '../types';
import { el, replaceChildren, svgIcon } from './el';

export interface ResultHandlers {
  isSaved: boolean;
  onSave: () => AddResult;
  onView: (trigger: HTMLElement) => void;
}

const SAVE_LABEL = 'Save to Favorites';
const SAVED_LABEL = 'Saved to Favorites';

function setSavedState(button: HTMLButtonElement, name: string, saved: boolean): void {
  replaceChildren(button, [
    svgIcon('heart', { size: 16, filled: saved }),
    ` ${saved ? SAVED_LABEL : SAVE_LABEL}`,
  ]);
  button.disabled = saved;
  button.classList.toggle('saved', saved);
  button.setAttribute(
    'aria-label',
    saved ? `${name} is already saved to favorites` : `Save ${name} to favorites`,
  );
}

/** Render the picked recipe into the aria-live result region. */
export function renderResult(
  container: HTMLElement,
  scored: ScoredRecipe,
  handlers: ResultHandlers,
): void {
  const { recipe } = scored;
  const scorePercent = Math.round(scored.blendedScore * 100);
  const vibePercent = Math.round(scored.vibeScore * 100);

  const saveButton = el('button', { id: 'save-btn', class: 'save-btn', 'data-recipe-name': recipe.name });
  setSavedState(saveButton, recipe.name, handlers.isSaved);

  const note = el('p', { class: 'save-note hidden', role: 'status' });

  saveButton.addEventListener('click', () => {
    const result = handlers.onSave();
    if (result === 'full') {
      note.textContent = 'Favorites are full (50). Remove one to save this recipe.';
      note.classList.remove('hidden');
      return;
    }
    note.classList.add('hidden');
    setSavedState(saveButton, recipe.name, true);
  });

  const viewButton = el(
    'button',
    { id: 'view-recipe-btn', class: 'view-recipe-btn', 'aria-label': `View full recipe for ${recipe.name}` },
    ['View Full Recipe'],
  );
  viewButton.addEventListener('click', () => handlers.onView(viewButton));

  replaceChildren(container, [
    el('p', { class: 'result-label' }, ["Tonight you're making..."]),
    el('h2', {}, [recipe.name]),
    recipe.image ? el('img', { src: recipe.image, alt: recipe.name, class: 'result-img' }) : null,
    el('p', { class: 'description' }, [recipe.description]),
    el('div', { class: 'meta' }, [
      el('span', { class: 'meta-ingredients' }, [
        `${scored.matchedCount}/${recipe.ingredients.length} ingredients`,
      ]),
      el('span', { class: 'meta-score' }, [`${scorePercent}% score`]),
      el('span', { class: 'meta-vibe' }, [`${vibePercent}% vibe`]),
    ]),
    saveButton,
    note,
    viewButton,
  ]);
}

/** Replace the result region with a single message (empty input, nothing found, errors). */
export function renderMessage(container: HTMLElement, message: string): void {
  replaceChildren(container, [el('p', { class: 'no-match' }, [message])]);
}

/** Flip the result card's save button back to unsaved (after a favourite is removed). */
export function markResultUnsaved(container: HTMLElement, name: string): void {
  const button = container.querySelector<HTMLButtonElement>('#save-btn');
  if (button && button.dataset['recipeName'] === name) setSavedState(button, name, false);
}

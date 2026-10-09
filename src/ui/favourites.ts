import { recipeKey } from '../core/identity';
import type { Recipe } from '../types';
import { el, replaceChildren, svgIcon } from './el';

export interface FavouriteHandlers {
  onView: (recipe: Recipe, trigger: HTMLElement) => void;
  /** Receives recipeKey(recipe): the id, or the name for legacy entries. */
  onRemove: (key: string) => void;
}

export function renderFavourites(
  list: HTMLElement,
  empty: HTMLElement,
  favourites: readonly Recipe[],
  handlers: FavouriteHandlers,
): void {
  if (favourites.length === 0) {
    replaceChildren(list, []);
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  replaceChildren(
    list,
    favourites.map((recipe) => {
      const viewButton = el(
        'button',
        { class: 'view-recipe-btn fav-view-btn', 'aria-label': `View full recipe for ${recipe.name}` },
        ['View Full Recipe'],
      );
      viewButton.addEventListener('click', () => handlers.onView(recipe, viewButton));

      const removeButton = el(
        'button',
        { class: 'remove-btn', 'data-key': recipeKey(recipe), 'aria-label': `Remove ${recipe.name} from favorites` },
        [svgIcon('close', { size: 16 })],
      );
      removeButton.addEventListener('click', (event) => {
        // currentTarget is always the button, whatever child the pointer hit.
        const button = event.currentTarget as HTMLButtonElement;
        const key = button.dataset['key'];
        if (key !== undefined) handlers.onRemove(key);
      });

      return el('div', { class: 'fav-card' }, [
        recipe.image ? el('img', { src: recipe.image, alt: recipe.name, class: 'fav-img' }) : null,
        el('div', { class: 'fav-info' }, [
          el('h3', {}, [recipe.name]),
          el('p', {}, [recipe.description]),
          el('div', { class: 'fav-actions' }, [viewButton, removeButton]),
        ]),
      ]);
    }),
  );
}

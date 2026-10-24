import { recipeKey } from '../core/identity';
import type { Recipe } from '../types';
import { el, replaceChildren, svgIcon } from './el';

export interface FavouriteHandlers {
  onView: (recipe: Recipe, trigger: HTMLElement) => void;
  /** Receives recipeKey(recipe): the id, or the name for legacy entries. */
  onRemove: (key: string) => void;
}

/** Saved recipes on the main page. Every card carries a lit lamp: it is saved, so the lamp is on. */
export function renderFavourites(list: HTMLElement, empty: HTMLElement, favourites: readonly Recipe[], handlers: FavouriteHandlers): void {
  if (favourites.length === 0) {
    replaceChildren(list, []);
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  replaceChildren(list, favourites.map((recipe) => {
    const viewButton = el('button', { type: 'button', class: 'fav-view-btn', 'aria-label': `View ${recipe.name}` }, ['View recipe']);
    viewButton.addEventListener('click', () => handlers.onView(recipe, viewButton));

    const removeButton = el('button', { type: 'button', class: 'remove-btn', 'data-key': recipeKey(recipe), 'aria-label': `Remove ${recipe.name} from saved` }, [svgIcon('close', { size: 18 })]);
    removeButton.addEventListener('click', (event) => {
      /* currentTarget is always the button, whatever child the pointer hit */
      const key = (event.currentTarget as HTMLButtonElement).dataset['key'];
      if (key !== undefined) handlers.onRemove(key);
    });

    return el('article', { class: 'fav' }, [
      recipe.image ? el('img', { src: recipe.image, alt: '', class: 'fav-img' }) : el('div', { class: 'fav-placeholder' }),
      el('div', { class: 'fav-body' }, [
        el('h3', { class: 'fav-title' }, [el('span', { class: 'lamp', 'aria-hidden': 'true' }), recipe.name]),
        el('p', { class: 'fav-desc' }, [recipe.description]),
        el('div', { class: 'fav-actions' }, [viewButton, removeButton]),
      ]),
    ]);
  }));
}

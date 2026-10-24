import type { Recipe } from '../types';
import { el, replaceChildren } from './el';

export interface RecentHandlers {
  onView: (recipe: Recipe, trigger: HTMLElement) => void;
}

/** The last five picks as a strip of buttons, so they are reachable from the keyboard. */
export function renderRecentlyViewed(section: HTMLElement, list: HTMLElement, recent: readonly Recipe[], handlers: RecentHandlers): void {
  if (recent.length === 0) {
    section.classList.add('hidden');
    replaceChildren(list, []);
    return;
  }
  section.classList.remove('hidden');

  replaceChildren(list, recent.map((recipe) => {
    const card = el('button', { type: 'button', class: 'recent-card', 'aria-label': `View ${recipe.name}` }, [
      recipe.image ? el('img', { src: recipe.image, alt: '', class: 'recent-img' }) : el('div', { class: 'recent-placeholder' }),
      el('span', { class: 'recent-name' }, [recipe.name]),
    ]);
    card.addEventListener('click', () => handlers.onView(recipe, card));
    return card;
  }));
}

import type { Recipe } from '../types';
import { el, replaceChildren } from './el';

export interface RecentHandlers {
  onView: (recipe: Recipe, trigger: HTMLElement) => void;
}

export function renderRecentlyViewed(
  section: HTMLElement,
  list: HTMLElement,
  recent: readonly Recipe[],
  handlers: RecentHandlers,
): void {
  if (recent.length === 0) {
    section.classList.add('hidden');
    replaceChildren(list, []);
    return;
  }
  section.classList.remove('hidden');

  replaceChildren(
    list,
    recent.map((recipe) => {
      const card = el('button', { class: 'recent-card', type: 'button', 'aria-label': `View ${recipe.name}` }, [
        recipe.image
          ? el('img', { src: recipe.image, alt: '', class: 'recent-img' })
          : el('div', { class: 'recent-img-placeholder' }),
        el('p', { class: 'recent-name' }, [recipe.name]),
      ]);
      card.addEventListener('click', () => handlers.onView(recipe, card));
      return card;
    }),
  );
}

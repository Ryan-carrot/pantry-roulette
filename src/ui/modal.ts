import type { Recipe } from '../types';
import { el, replaceChildren } from './el';

export interface ModalOptions {
  /** Print the recipe. Return false when the print window could not be opened. */
  onPrint: (recipe: Recipe) => boolean;
}

export interface RecipeModal {
  open(recipe: Recipe, trigger: HTMLElement | null): void;
  close(): void;
  isOpen(): boolean;
}

const FOCUSABLE = 'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

function byId<T extends HTMLElement>(root: Document, id: string): T {
  const node = root.getElementById(id);
  if (!node) throw new Error(`Missing #${id} in the modal markup`);
  return node as T;
}

/** Wire the static modal markup. Focus is trapped while open and returned to the trigger on close. */
export function createModal(root: Document, options: ModalOptions): RecipeModal {
  const overlay = byId<HTMLDivElement>(root, 'recipe-modal');
  const card = byId<HTMLDivElement>(root, 'modal-card');
  const image = byId<HTMLImageElement>(root, 'modal-image');
  const category = byId<HTMLElement>(root, 'modal-category');
  const title = byId<HTMLElement>(root, 'modal-title');
  const meta = byId<HTMLElement>(root, 'modal-meta');
  const ingredients = byId<HTMLElement>(root, 'modal-ingredients');
  const steps = byId<HTMLElement>(root, 'modal-steps');
  const status = byId<HTMLElement>(root, 'modal-status');
  const printButton = byId<HTMLButtonElement>(root, 'modal-print-btn');
  const closeButton = byId<HTMLButtonElement>(root, 'modal-close-btn');

  let current: Recipe | null = null;
  let returnTo: HTMLElement | null = null;

  function isOpen(): boolean {
    return !overlay.classList.contains('hidden');
  }

  function fill(recipe: Recipe): void {
    if (recipe.image) {
      image.src = recipe.image;
      image.alt = recipe.name;
      image.classList.remove('hidden');
    } else {
      image.removeAttribute('src');
      image.alt = '';
      image.classList.add('hidden');
    }
    category.textContent = recipe.category ?? '';
    title.textContent = recipe.name;

    replaceChildren(meta, [
      el('span', { class: 'meta-ingredients' }, [`${recipe.ingredients.length} ingredients`]),
      recipe.area ? el('span', { class: 'meta-area' }, [recipe.area]) : null,
    ]);

    replaceChildren(
      ingredients,
      recipe.ingredients.map((ingredient, index) => {
        const measure = recipe.measurements[index] ?? '';
        return el('li', {}, [measure ? `${measure} ${ingredient}` : ingredient]);
      }),
    );

    replaceChildren(
      steps,
      recipe.steps.length > 0
        ? recipe.steps.map((step) => el('li', {}, [step]))
        : [el('li', {}, [recipe.description || 'No instructions available.'])],
    );
    status.textContent = '';
  }

  function onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && isOpen()) {
      event.preventDefault();
      close();
    }
  }

  function trapTab(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;
    const focusable = Array.from(overlay.querySelectorAll<HTMLElement>(FOCUSABLE));
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;
    const active = root.activeElement;
    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function open(recipe: Recipe, trigger: HTMLElement | null): void {
    current = recipe;
    returnTo = trigger ?? (root.activeElement as HTMLElement | null);
    fill(recipe);
    overlay.classList.remove('hidden');
    root.body.classList.add('modal-open');
    root.addEventListener('keydown', onKeydown);
    closeButton.focus();
  }

  function close(): void {
    if (!isOpen()) return;
    overlay.classList.add('hidden');
    root.body.classList.remove('modal-open');
    root.removeEventListener('keydown', onKeydown);
    current = null;
    const target = returnTo;
    returnTo = null;
    if (target && target.isConnected) target.focus();
  }

  overlay.addEventListener('keydown', trapTab);
  closeButton.addEventListener('click', close);
  overlay.addEventListener('click', (event) => {
    // Only the backdrop closes; clicks inside the card do not bubble to a close.
    if (event.target === overlay) close();
  });
  card.addEventListener('click', (event) => event.stopPropagation());
  printButton.addEventListener('click', () => {
    if (!current) return;
    const ok = options.onPrint(current);
    status.textContent = ok ? '' : 'Printing was blocked. Allow pop-ups for this site and try again.';
  });

  return { open, close, isOpen };
}

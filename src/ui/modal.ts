import { cookTimeLabel } from '../core/cookTime';
import type { AddResult } from '../storage/favourites';
import type { Recipe } from '../types';
import { el, replaceChildren } from './el';

export interface ModalOptions {
  /** Print the recipe. Return false when the print window could not be opened. */
  onPrint: (recipe: Recipe) => boolean;
  isSaved: (recipe: Recipe) => boolean;
  onSave: (recipe: Recipe) => AddResult;
}

export interface OpenOptions {
  /** An element to tip away while the sheet is open (the result region holding the card). */
  tip?: HTMLElement;
}

export interface RecipeModal {
  open(recipe: Recipe, trigger: HTMLElement | null, options?: OpenOptions): void;
  close(): void;
  isOpen(): boolean;
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

function byId<T extends HTMLElement>(root: Document, id: string): T {
  const node = root.getElementById(id);
  if (!node) throw new Error(`Missing #${id} in the sheet markup`);
  return node as T;
}

/**
 * The recipe sheet: B's structure in C's skin. A scrolling body (image,
 * eyebrow, title, meta row, checkable ingredients, numbered steps) and a
 * pinned bar with Save, Print and Close. Focus is trapped while open and
 * returned to the trigger on every close path. Ticks live only while open.
 */
export function createModal(root: Document, options: ModalOptions): RecipeModal {
  const sheet = byId<HTMLDivElement>(root, 'recipe-modal');
  const overlay = root.getElementById('overlay');
  const scroll = byId<HTMLDivElement>(root, 'modal-card');
  const image = byId<HTMLImageElement>(root, 'modal-image');
  const category = byId<HTMLElement>(root, 'modal-category');
  const title = byId<HTMLElement>(root, 'modal-title');
  const meta = byId<HTMLElement>(root, 'modal-meta');
  const tickCount = byId<HTMLElement>(root, 'modal-tick-count');
  const ingredients = byId<HTMLElement>(root, 'modal-ingredients');
  const steps = byId<HTMLElement>(root, 'modal-steps');
  const status = byId<HTMLElement>(root, 'modal-status');
  const saveButton = byId<HTMLButtonElement>(root, 'modal-save-btn');
  const saveText = byId<HTMLElement>(root, 'modal-save-text');
  const printButton = byId<HTMLButtonElement>(root, 'modal-print-btn');
  const closeButton = byId<HTMLButtonElement>(root, 'modal-close-btn');

  let current: Recipe | null = null;
  let returnTo: HTMLElement | null = null;
  let tipped: HTMLElement | null = null;

  function isOpen(): boolean { return !sheet.classList.contains('hidden'); }

  function setSaved(saved: boolean): void {
    saveButton.setAttribute('aria-pressed', String(saved));
    saveText.textContent = saved ? 'Saved' : 'Save';
  }

  function updateCount(): void {
    const boxes = ingredients.querySelectorAll<HTMLInputElement>('input[type=checkbox]');
    const ticked = [...boxes].filter((b) => b.checked).length;
    tickCount.textContent = `${ticked} of ${boxes.length}`;
  }

  function fill(recipe: Recipe): void {
    if (recipe.image) { image.src = recipe.image; image.alt = recipe.name; image.classList.remove('hidden'); }
    else { image.removeAttribute('src'); image.alt = ''; image.classList.add('hidden'); }
    category.textContent = recipe.category ?? '';
    title.textContent = recipe.name;

    const cookTime = recipe.cookTime ? cookTimeLabel(recipe.cookTime) : null;
    replaceChildren(meta, [
      el('span', { class: 'meta-item' }, [`${recipe.ingredients.length} ingredients`]),
      recipe.area ? el('span', { class: 'meta-item' }, [recipe.area]) : null,
      el('span', { class: cookTime ? 'meta-item meta-estimate' : 'meta-item meta-none', 'aria-label': cookTime ? undefined : 'Cook time not estimated' }, [cookTime ?? '—']),
    ]);

    replaceChildren(ingredients, recipe.ingredients.map((ingredient, index) => {
      const measure = recipe.measurements[index] ?? '';
      const box = el('input', { type: 'checkbox', class: 'tick' });
      box.addEventListener('change', updateCount);
      return el('li', {}, [el('label', { class: 'ingredient' }, [
        box,
        el('span', { class: 'measure' }, [measure]),
        ' ',
        el('span', { class: 'name' }, [ingredient]),
      ])]);
    }));
    updateCount();

    replaceChildren(steps, recipe.steps.length > 0
      ? recipe.steps.map((step) => el('li', {}, [el('p', {}, [step])]))
      : [el('li', {}, [el('p', {}, [recipe.description || 'No instructions available.'])])]);

    status.textContent = '';
    setSaved(options.isSaved(recipe));
  }

  function onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && isOpen()) { event.preventDefault(); close(); }
  }

  function trapTab(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;
    const focusable = [...sheet.querySelectorAll<HTMLElement>(FOCUSABLE)];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;
    const active = root.activeElement;
    if (event.shiftKey && active === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && active === last) { event.preventDefault(); first.focus(); }
  }

  function open(recipe: Recipe, trigger: HTMLElement | null, openOptions: OpenOptions = {}): void {
    current = recipe;
    returnTo = trigger ?? (root.activeElement as HTMLElement | null);
    fill(recipe);
    tipped = openOptions.tip ?? null;
    tipped?.classList.add('away');
    overlay?.classList.add('on');
    sheet.classList.remove('hidden');
    scroll.scrollTop = 0;
    root.body.classList.add('modal-open');
    root.addEventListener('keydown', onKeydown);
    /* the rise is delayed a beat behind the card tip; the class drives the CSS transition */
    requestAnimationFrame(() => sheet.classList.add('open'));
    closeButton.focus();
  }

  function close(): void {
    if (!isOpen()) return;
    sheet.classList.remove('open');
    sheet.classList.add('hidden');
    overlay?.classList.remove('on');
    tipped?.classList.remove('away');
    tipped = null;
    root.body.classList.remove('modal-open');
    root.removeEventListener('keydown', onKeydown);
    current = null;
    const target = returnTo;
    returnTo = null;
    if (target && target.isConnected) target.focus();
  }

  sheet.addEventListener('keydown', trapTab);
  closeButton.addEventListener('click', close);
  overlay?.addEventListener('click', close);
  printButton.addEventListener('click', () => {
    if (!current) return;
    status.textContent = options.onPrint(current) ? '' : 'Printing was blocked. Allow pop-ups for this site and try again.';
  });
  saveButton.addEventListener('click', () => {
    if (!current || saveButton.getAttribute('aria-pressed') === 'true') return;
    const result = options.onSave(current);
    if (result === 'full') { status.textContent = 'Saved recipes are full (50). Remove one to save this.'; return; }
    status.textContent = '';
    setSaved(true);
  });

  return { open, close, isOpen };
}

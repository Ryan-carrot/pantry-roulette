// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createModal, type ModalOptions } from '../src/ui/modal';
import type { Recipe } from '../src/types';

function recipe(overrides: Partial<Recipe> = {}): Recipe {
  return { id: '1', name: 'Chicken Handi', ingredients: ['chicken', 'onion', 'tomato'], measurements: ['1 kg', '5', ''], steps: ['Heat the oil.', 'Add the onion.'], instructions: 'Heat the oil.\nAdd the onion.', description: 'Heat the oil....', image: 'https://example.com/handi.jpg', category: 'Chicken', area: 'Indian', source: null, ...overrides };
}

const SHEET = `
  <button id="trigger">open</button>
  <div id="result"><article class="card">card</article></div>
  <div class="overlay" id="overlay"></div>
  <div id="recipe-modal" class="sheet hidden" role="dialog" aria-modal="true" aria-labelledby="modal-title">
    <div class="sheet-scroll" id="modal-card">
      <div class="sheet-media"><img id="modal-image" alt="" class="sheet-img hidden" /></div>
      <div class="sheet-body">
        <p id="modal-category" class="eyebrow"></p>
        <h2 id="modal-title" class="sheet-title"></h2>
        <div id="modal-meta" class="sheet-meta"></div>
        <h3 class="sheet-heading">Ingredients <span id="modal-tick-count"></span></h3>
        <ul id="modal-ingredients" class="ingredients"></ul>
        <h3 class="sheet-heading">Steps</h3>
        <ol id="modal-steps" class="steps"></ol>
        <p id="modal-status" role="status"></p>
      </div>
    </div>
    <div class="sheet-bar">
      <button id="modal-save-btn" type="button" aria-pressed="false"><span id="modal-save-text">Save</span></button>
      <button id="modal-print-btn" type="button">Print</button>
      <button id="modal-close-btn" type="button">Close</button>
    </div>
  </div>`;

function options(overrides: Partial<ModalOptions> = {}): ModalOptions {
  return { onPrint: () => true, isSaved: () => false, onSave: () => 'added', ...overrides };
}
const trigger = () => document.getElementById('trigger') as HTMLButtonElement;

describe('recipe sheet', () => {
  beforeEach(() => { document.body.innerHTML = SHEET; document.body.classList.remove('modal-open'); });

  it('fills the sheet from the recipe and focuses the close button', () => {
    const modal = createModal(document, options());
    modal.open(recipe(), trigger());
    expect(document.getElementById('recipe-modal')?.classList.contains('hidden')).toBe(false);
    expect(document.getElementById('modal-title')?.textContent).toBe('Chicken Handi');
    expect(document.getElementById('modal-category')?.textContent).toBe('Chicken');
    expect(document.getElementById('modal-image')?.getAttribute('src')).toBe('https://example.com/handi.jpg');
    const rows = [...document.querySelectorAll('#modal-ingredients li')].map((li) => li.textContent?.replace(/\s+/g, ' ').trim());
    expect(rows).toEqual(['1 kg chicken', '5 onion', 'tomato']);
    expect(document.querySelectorAll('#modal-steps li')).toHaveLength(2);
    expect(document.activeElement?.id).toBe('modal-close-btn');
    expect(document.body.classList.contains('modal-open')).toBe(true);
  });

  it('shows ingredient count, cuisine and a dash for the cook time until an estimate exists', () => {
    createModal(document, options()).open(recipe(), trigger());
    const meta = [...document.querySelectorAll('#modal-meta .meta-item')].map((m) => m.textContent?.trim());
    expect(meta).toEqual(['3 ingredients', 'Indian', '—']);
  });

  it('lets you tick ingredients off and counts them, and resets on reopen', () => {
    const modal = createModal(document, options());
    modal.open(recipe(), trigger());
    const boxes = document.querySelectorAll<HTMLInputElement>('#modal-ingredients input[type=checkbox]');
    expect(boxes).toHaveLength(3);
    boxes[0]!.click();
    boxes[2]!.click();
    expect(document.getElementById('modal-tick-count')?.textContent).toBe('2 of 3');
    modal.close();
    modal.open(recipe(), trigger());
    const again = document.querySelectorAll<HTMLInputElement>('#modal-ingredients input[type=checkbox]');
    expect([...again].every((b) => !b.checked)).toBe(true);
    expect(document.getElementById('modal-tick-count')?.textContent).toBe('0 of 3');
  });

  it('keeps Save, Print and Close in the pinned bar after the content, in that order', () => {
    createModal(document, options()).open(recipe(), trigger());
    const sheet = document.getElementById('recipe-modal') as HTMLElement;
    const bar = sheet.querySelector('.sheet-bar') as HTMLElement;
    expect(bar.previousElementSibling?.id).toBe('modal-card');
    expect([...bar.querySelectorAll('button')].map((b) => b.id)).toEqual(['modal-save-btn', 'modal-print-btn', 'modal-close-btn']);
  });

  it('returns focus to the trigger on close button, Escape and backdrop', () => {
    const modal = createModal(document, options());
    modal.open(recipe(), trigger());
    (document.getElementById('modal-close-btn') as HTMLButtonElement).click();
    expect(document.getElementById('recipe-modal')?.classList.contains('hidden')).toBe(true);
    expect(document.activeElement).toBe(trigger());
    modal.open(recipe(), trigger());
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(document.activeElement).toBe(trigger());
    modal.open(recipe(), trigger());
    document.getElementById('overlay')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(document.activeElement).toBe(trigger());
    expect(document.body.classList.contains('modal-open')).toBe(false);
  });

  it('traps Tab between the first ingredient checkbox and the close button', () => {
    createModal(document, options()).open(recipe(), trigger());
    const close = document.getElementById('modal-close-btn') as HTMLButtonElement;
    close.focus();
    const forward = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    document.getElementById('recipe-modal')?.dispatchEvent(forward);
    expect(forward.defaultPrevented).toBe(true);
    const first = document.activeElement as HTMLElement;
    expect(first.matches('#modal-ingredients input[type=checkbox]')).toBe(true);
    const back = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true });
    document.getElementById('recipe-modal')?.dispatchEvent(back);
    expect(document.activeElement?.id).toBe('modal-close-btn');
  });

  it('saves from the bar and reflects the saved state on open', () => {
    const onSave = vi.fn(() => 'added' as const);
    const modal = createModal(document, options({ onSave }));
    modal.open(recipe(), trigger());
    const save = document.getElementById('modal-save-btn') as HTMLButtonElement;
    expect(save.getAttribute('aria-pressed')).toBe('false');
    save.click();
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ name: 'Chicken Handi' }));
    expect(save.getAttribute('aria-pressed')).toBe('true');
    expect(document.getElementById('modal-save-text')?.textContent).toBe('Saved');
    modal.close();
    createModal(document, options({ isSaved: () => true })).open(recipe(), trigger());
    expect(document.getElementById('modal-save-btn')?.getAttribute('aria-pressed')).toBe('true');
  });

  it('shows a status line when saved recipes are full', () => {
    createModal(document, options({ onSave: () => 'full' })).open(recipe(), trigger());
    (document.getElementById('modal-save-btn') as HTMLButtonElement).click();
    expect(document.getElementById('modal-status')?.textContent).toMatch(/full/i);
    expect(document.getElementById('modal-save-btn')?.getAttribute('aria-pressed')).toBe('false');
  });

  it('shows a status line when printing is blocked', () => {
    createModal(document, options({ onPrint: () => false })).open(recipe(), trigger());
    (document.getElementById('modal-print-btn') as HTMLButtonElement).click();
    expect(document.getElementById('modal-status')?.textContent).toMatch(/pop-?up/i);
  });

  it('tips the card away while open and restores it on close', () => {
    const modal = createModal(document, options());
    const result = document.getElementById('result') as HTMLElement;
    modal.open(recipe(), trigger(), { tip: result });
    expect(result.classList.contains('away')).toBe(true);
    modal.close();
    expect(result.classList.contains('away')).toBe(false);
  });
});

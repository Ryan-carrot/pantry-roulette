import type { MealDbStub, Recipe } from '../types';
import { el, replaceChildren } from './el';

/**
 * The reel: a strip of candidate rows that runs while the spin is loading
 * and decelerates onto the pick. Timing contract (all tokens in tokens.css):
 *  - it never lands before `spinMs` from start, even if the pick is instant;
 *  - if the pick arrives late enough that landing would push the total past
 *    `maxMs`, it skips the landing, shows the pick, and reports 'pulsed' so
 *    the card can pulse instead;
 *  - under reduced motion nothing moves and it reports 'instant'.
 */
export const REEL_ROWS = 24;          /* 6 candidate slots × 4 copies; the strip loops over one copy */
export const REEL_SLOTS = 6;
export const ROW_HEIGHT = 76;         /* keep in step with .row height in reel.css */
const LANDING_ROW = REEL_SLOTS * 2 + REEL_SLOTS - 1; /* last row of the third copy: a row shows below it */

export type ReelOutcome = 'landed' | 'pulsed' | 'instant';

export interface ReelOptions {
  spinMs: number;
  landMs: number;
  maxMs: number;
  reduceMotion: boolean;
  now?: () => number;
}

export interface Reel {
  start(): void;
  feed(stubs: readonly MealDbStub[]): void;
  settle(pick: Recipe): Promise<ReelOutcome>;
  cancel(): void;
}

interface Row { root: HTMLElement; img: HTMLImageElement; name: HTMLElement }

export function createReel(container: HTMLElement, options: ReelOptions): Reel {
  const strip = container.querySelector<HTMLElement>('.strip') ?? container;
  const now = options.now ?? (() => Date.now());
  let rows: Row[] = [];
  let startedAt = 0;
  let timers: number[] = [];
  let active = false;

  function buildRows(): void {
    rows = [];
    for (let i = 0; i < REEL_ROWS; i++) {
      const img = el('img', { alt: '', class: 'row-img' });
      const name = el('span', { class: 'row-name' });
      const root = el('div', { class: 'row skeleton' }, [img, name]);
      rows.push({ root, img, name });
    }
    replaceChildren(strip, rows.map((r) => r.root));
  }

  function fillRow(row: Row, name: string, image: string | null): void {
    row.name.textContent = name;
    if (image) row.img.src = image; else row.img.removeAttribute('src');
    row.root.classList.remove('skeleton');
  }

  function clearTimers(): void { timers.forEach((t) => clearTimeout(t)); timers = []; }
  function later(fn: () => void, ms: number): void { timers.push(window.setTimeout(fn, ms)); }

  function start(): void {
    clearTimers();
    buildRows();
    active = true;
    startedAt = now();
    container.classList.remove('landed', 'settled');
    strip.style.transition = 'none';
    strip.style.transform = 'translateY(0)';
    container.classList.toggle('spinning', !options.reduceMotion);
  }

  function feed(stubs: readonly MealDbStub[]): void {
    const slots = stubs.slice(0, REEL_SLOTS);
    if (slots.length === 0) return;
    rows.forEach((row, i) => {
      const stub = slots[i % slots.length];
      if (stub) fillRow(row, stub.strMeal, stub.strMealThumb ?? null);
    });
  }

  /** Read the strip's current translateY so the landing continues from where the loop is. */
  function currentY(): number {
    const transform = getComputedStyle(strip).transform;
    const match = /matrix\(([^)]+)\)/.exec(transform);
    if (!match) return 0;
    const parts = (match[1] ?? '').split(',').map((v) => parseFloat(v));
    return parts[5] ?? 0;
  }

  function placePick(pick: Recipe): Row {
    const row = rows[LANDING_ROW] ?? rows[rows.length - 1];
    if (!row) throw new Error('reel has no rows; call start() first');
    rows.forEach((r) => r.root.classList.remove('pick'));
    fillRow(row, pick.name, pick.image);
    row.root.classList.add('pick');
    return row;
  }

  function finalOffset(): number { return -(LANDING_ROW - 1) * ROW_HEIGHT; }

  function settle(pick: Recipe): Promise<ReelOutcome> {
    return new Promise((resolve) => {
      if (!active) { placePick(pick); resolve('instant'); return; }
      placePick(pick);
      const elapsed = now() - startedAt;

      const finish = (outcome: ReelOutcome) => {
        active = false;
        container.classList.remove('spinning');
        container.classList.add('landed');
        resolve(outcome);
      };

      if (options.reduceMotion) {
        strip.style.transform = `translateY(${finalOffset()}px)`;
        finish('instant');
        return;
      }
      if (elapsed + options.landMs > options.maxMs) {
        strip.style.transition = 'none';
        strip.style.transform = `translateY(${finalOffset()}px)`;
        container.classList.remove('spinning');
        finish('pulsed');
        return;
      }
      const wait = Math.max(0, options.spinMs - options.landMs - elapsed);
      later(() => {
        /* freeze the loop where it is, then run one decelerating leg to the landing row */
        const y = currentY();
        container.classList.remove('spinning');
        strip.style.transition = 'none';
        strip.style.transform = `translateY(${y}px)`;
        void strip.offsetHeight;
        strip.style.transition = `transform ${options.landMs}ms var(--ease-out)`;
        strip.style.transform = `translateY(${finalOffset()}px)`;
        later(() => finish('landed'), options.landMs);
      }, wait);
    });
  }

  function cancel(): void {
    clearTimers();
    active = false;
    container.classList.remove('spinning');
  }

  return { start, feed, settle, cancel };
}

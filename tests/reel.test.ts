// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createReel, REEL_ROWS } from '../src/ui/reel';
import type { MealDbStub, Recipe } from '../src/types';

function recipe(overrides: Partial<Recipe> = {}): Recipe {
  return { id: '9', name: 'Chicken Handi', ingredients: ['chicken'], measurements: ['1 kg'], steps: ['Cook.'], instructions: 'Cook.', description: 'Cook....', image: 'https://example.com/handi.jpg', category: 'Chicken', area: 'Indian', source: null, ...overrides };
}
function stub(id: string, name: string): MealDbStub { return { idMeal: id, strMeal: name, strMealThumb: `https://example.com/${id}.jpg` }; }

function mount() {
  document.body.innerHTML = `<div class="reel" id="reel"><div class="payline"></div><div class="strip" id="strip"></div></div>`;
  return document.getElementById('reel') as HTMLDivElement;
}

const timing = { spinMs: 1700, landMs: 900, maxMs: 2500 };

describe('reel', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('builds skeleton rows on start and fills them when candidates arrive', () => {
    const reel = createReel(mount(), { ...timing, reduceMotion: false });
    reel.start();
    const rows = document.querySelectorAll('.strip .row');
    expect(rows.length).toBe(REEL_ROWS);
    expect(document.getElementById('reel')?.classList.contains('spinning')).toBe(true);
    reel.feed([stub('1', 'Beef Stew'), stub('2', 'Karaage')]);
    const names = [...document.querySelectorAll('.strip .row .row-name')].map((n) => n.textContent);
    expect(names).toContain('Beef Stew');
    expect(names).toContain('Karaage');
  });

  it('never lands before the spin time even when the pick arrives at once', async () => {
    const reel = createReel(mount(), { ...timing, reduceMotion: false });
    reel.start();
    const done = vi.fn();
    void reel.settle(recipe()).then(done);
    await vi.advanceTimersByTimeAsync(timing.spinMs - 50);
    expect(done).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(100);
    expect(done).toHaveBeenCalledWith('landed');
    expect(document.getElementById('reel')?.classList.contains('landed')).toBe(true);
    const landing = document.querySelector('.strip .row.pick .row-name');
    expect(landing?.textContent).toBe('Chicken Handi');
  });

  it('holds the spin while data is slow and still lands if it arrives in time', async () => {
    const reel = createReel(mount(), { ...timing, reduceMotion: false });
    reel.start();
    await vi.advanceTimersByTimeAsync(1200);
    expect(document.getElementById('reel')?.classList.contains('spinning')).toBe(true);
    const done = vi.fn();
    void reel.settle(recipe()).then(done);
    await vi.advanceTimersByTimeAsync(timing.landMs + 20);
    expect(done).toHaveBeenCalledWith('landed');
  });

  it('skips the landing and reports a pulse when data is too slow for a 2.5 s total', async () => {
    const reel = createReel(mount(), { ...timing, reduceMotion: false });
    reel.start();
    await vi.advanceTimersByTimeAsync(2000);
    const done = vi.fn();
    void reel.settle(recipe()).then(done);
    await vi.advanceTimersByTimeAsync(0);
    expect(done).toHaveBeenCalledWith('pulsed');
    expect(document.getElementById('reel')?.classList.contains('spinning')).toBe(false);
    expect(document.querySelector('.strip .row.pick .row-name')?.textContent).toBe('Chicken Handi');
  });

  it('does not animate at all under reduced motion', async () => {
    const reel = createReel(mount(), { ...timing, reduceMotion: true });
    reel.start();
    expect(document.getElementById('reel')?.classList.contains('spinning')).toBe(false);
    const done = vi.fn();
    void reel.settle(recipe()).then(done);
    await vi.advanceTimersByTimeAsync(0);
    expect(done).toHaveBeenCalledWith('instant');
    expect(document.querySelector('.strip .row.pick .row-name')?.textContent).toBe('Chicken Handi');
  });

  it('cancel stops a spin without resolving a settle', async () => {
    const reel = createReel(mount(), { ...timing, reduceMotion: false });
    reel.start();
    reel.cancel();
    expect(document.getElementById('reel')?.classList.contains('spinning')).toBe(false);
  });
});

// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { scrollCardIntoView } from '../src/ui/scroll';

/** A card whose rect we control; scrollIntoView and scrollBy are stubs that move the rect. */
function fakeCard(top: number, bottom: number) {
  const card = document.createElement('article');
  let rect = { top, bottom, left: 0, right: 390, width: 390, height: bottom - top, x: 0, y: top, toJSON() {} };
  card.getBoundingClientRect = () => rect as DOMRect;
  const scrollIntoView = vi.fn((opts: ScrollIntoViewOptions) => {
    /* block: nearest on a card that overflows the bottom aligns its top with the viewport top */
    if (opts.block === 'nearest' && rect.bottom > 844) rect = { ...rect, top: 0, bottom: rect.height, y: 0 };
  });
  card.scrollIntoView = scrollIntoView as unknown as typeof card.scrollIntoView;
  const scrollBy = vi.fn((opts: ScrollToOptions) => { const dy = opts.top ?? 0; rect = { ...rect, top: rect.top - dy, bottom: rect.bottom - dy, y: rect.y - dy }; });
  return { card, scrollIntoView, scrollBy, rect: () => rect };
}

describe('scrollCardIntoView', () => {
  it('leaves a card that already fits where it is', () => {
    const { card, scrollIntoView, scrollBy } = fakeCard(100, 700);
    scrollCardIntoView(card, { viewportHeight: 844, reduceMotion: false, scrollBy });
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest', behavior: 'smooth' });
    expect(scrollBy).not.toHaveBeenCalled();
  });

  it('brings a tall card fully into a 390px viewport, action row included', () => {
    // 640px tall card starting below the fold: nearest aligns its top, which still fits (640 < 844)
    const { card, scrollBy, rect } = fakeCard(900, 1540);
    scrollCardIntoView(card, { viewportHeight: 844, reduceMotion: false, scrollBy });
    expect(rect().top).toBeGreaterThanOrEqual(0);
    expect(rect().bottom).toBeLessThanOrEqual(844);
  });

  it('nudges the page when nearest leaves the bottom edge clipped', () => {
    // a card taller than the viewport: nearest aligns the top, the bottom is still clipped, so we scroll
    // the clipped amount plus the margin and accept the top going off screen
    const { card, scrollBy, rect } = fakeCard(0, 1000);
    scrollCardIntoView(card, { viewportHeight: 844, reduceMotion: false, scrollBy, margin: 16 });
    expect(scrollBy).toHaveBeenCalledWith({ top: 1000 - 844 + 16, behavior: 'smooth' });
    expect(rect().bottom).toBeLessThanOrEqual(844 - 16);
  });

  it('uses instant scrolling under reduced motion', () => {
    const { card, scrollIntoView, scrollBy } = fakeCard(0, 1000);
    scrollCardIntoView(card, { viewportHeight: 844, reduceMotion: true, scrollBy });
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest', behavior: 'auto' });
    expect(scrollBy).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'auto' }));
  });
});

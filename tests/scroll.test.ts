// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { scrollCardIntoView } from '../src/ui/scroll';

const VIEWPORT = 844;

/** An element whose rect we control; the scrollBy stub moves the rect the way the page would. */
function fakeTarget(top: number, bottom: number) {
  const el = document.createElement('div');
  let rect = { top, bottom };
  el.getBoundingClientRect = () => ({ ...rect, left: 0, right: 390, width: 390, height: rect.bottom - rect.top, x: 0, y: rect.top, toJSON() {} }) as DOMRect;
  const scrollBy = vi.fn((opts: ScrollToOptions) => { const dy = opts.top ?? 0; rect = { top: rect.top - dy, bottom: rect.bottom - dy }; });
  return { el, scrollBy, rect: () => rect };
}

describe('scrollCardIntoView', () => {
  afterEach(() => { document.documentElement.style.removeProperty('--card-scroll-margin'); });

  it('leaves a card alone when it already fits with room under it', () => {
    const { el, scrollBy } = fakeTarget(100, 700);
    scrollCardIntoView(el, { viewportHeight: VIEWPORT, reduceMotion: false, margin: 16, scrollBy });
    expect(scrollBy).not.toHaveBeenCalled();
  });

  it('lifts a card sitting flush with the bottom edge so it has 16px of room', () => {
    const { el, scrollBy, rect } = fakeTarget(200, 840);
    scrollCardIntoView(el, { viewportHeight: VIEWPORT, reduceMotion: false, margin: 16, scrollBy });
    expect(scrollBy).toHaveBeenCalledTimes(1);
    expect(rect().bottom).toBe(VIEWPORT - 16);
  });

  it('brings a card below the fold up until its bottom edge is 16px above the viewport bottom', () => {
    const { el, scrollBy, rect } = fakeTarget(900, 1540);
    scrollCardIntoView(el, { viewportHeight: VIEWPORT, reduceMotion: false, margin: 16, scrollBy });
    expect(scrollBy).toHaveBeenCalledWith({ top: 1540 - (VIEWPORT - 16), behavior: 'smooth' });
    expect(rect().bottom).toBe(VIEWPORT - 16);
    expect(rect().top).toBeGreaterThanOrEqual(0);
  });

  it('brings a card above the viewport down to the top', () => {
    const { el, scrollBy, rect } = fakeTarget(-200, 400);
    scrollCardIntoView(el, { viewportHeight: VIEWPORT, reduceMotion: false, margin: 16, scrollBy });
    expect(rect().top).toBe(0);
  });

  it('favours the action row when the card is taller than the viewport', () => {
    const { el, scrollBy, rect } = fakeTarget(0, 1000);
    scrollCardIntoView(el, { viewportHeight: VIEWPORT, reduceMotion: false, margin: 16, scrollBy });
    expect(rect().bottom).toBe(VIEWPORT - 16);
  });

  it('scrolls once, not twice, so two smooth scrolls cannot interrupt each other', () => {
    const { el, scrollBy } = fakeTarget(900, 1540);
    scrollCardIntoView(el, { viewportHeight: VIEWPORT, reduceMotion: false, margin: 16, scrollBy });
    expect(scrollBy).toHaveBeenCalledTimes(1);
  });

  it('uses instant scrolling under reduced motion', () => {
    const { el, scrollBy } = fakeTarget(900, 1540);
    scrollCardIntoView(el, { viewportHeight: VIEWPORT, reduceMotion: true, margin: 16, scrollBy });
    expect(scrollBy).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'auto' }));
  });

  it('reads the margin from --card-scroll-margin when none is passed', () => {
    document.documentElement.style.setProperty('--card-scroll-margin', '24px');
    const { el, scrollBy, rect } = fakeTarget(900, 1540);
    scrollCardIntoView(el, { viewportHeight: VIEWPORT, reduceMotion: false, scrollBy });
    expect(rect().bottom).toBe(VIEWPORT - 24);
  });
});

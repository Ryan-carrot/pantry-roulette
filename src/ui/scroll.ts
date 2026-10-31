export interface ScrollOptions {
  viewportHeight: number;
  reduceMotion: boolean;
  /** Space to leave under the bottom edge. Defaults to the --card-scroll-margin token. */
  margin?: number;
  /** Injected for tests; defaults to window.scrollBy. */
  scrollBy?: (options: ScrollToOptions) => void;
}

const FALLBACK_MARGIN = 16;

function marginToken(): number {
  const value = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--card-scroll-margin'));
  return Number.isFinite(value) ? value : FALLBACK_MARGIN;
}

/**
 * After a spin, bring the whole card (action row included) into view with
 * room under its bottom edge. One computed scroll, not scrollIntoView plus a
 * nudge: two smooth scrolls interrupt each other, and the second one measured
 * the card before the first had moved it.
 *
 * Pass an element with no transform on it (main.ts passes the result region,
 * not the card): the card's arrival animation shifts its rect by tens of
 * pixels for the first frames, which would make the measurement wrong.
 */
export function scrollCardIntoView(target: HTMLElement, options: ScrollOptions): void {
  const behavior: ScrollBehavior = options.reduceMotion ? 'auto' : 'smooth';
  const margin = options.margin ?? marginToken();
  const scrollBy = options.scrollBy ?? ((o: ScrollToOptions) => window.scrollBy(o));

  const rect = target.getBoundingClientRect();
  const bottomLimit = options.viewportHeight - margin;

  let delta = 0;
  if (rect.bottom > bottomLimit) {
    /* below the fold or flush with it: lift until the bottom edge has its margin */
    delta = rect.bottom - bottomLimit;
  } else if (rect.top < 0) {
    /* above the viewport: bring the top down, but never far enough to push the bottom out */
    delta = Math.max(rect.top, rect.bottom - bottomLimit);
  }
  if (delta !== 0) scrollBy({ top: delta, behavior });
}

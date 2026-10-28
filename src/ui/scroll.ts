export interface ScrollOptions {
  viewportHeight: number;
  reduceMotion: boolean;
  /** Space to leave under the card's bottom edge. */
  margin?: number;
  /** Injected for tests; defaults to window.scrollBy. */
  scrollBy?: (options: ScrollToOptions) => void;
}

/**
 * After a spin, bring the whole card (action row included) into view.
 * `block: 'nearest'` does the least movement; if the card is taller than
 * what that leaves visible, nudge the page so the bottom edge, where the
 * buttons are, sits above the viewport bottom with a margin. Call it after
 * focus() so the focus ring is on screen too.
 */
export function scrollCardIntoView(card: HTMLElement, options: ScrollOptions): void {
  const behavior: ScrollBehavior = options.reduceMotion ? 'auto' : 'smooth';
  const margin = options.margin ?? 16;
  const scrollBy = options.scrollBy ?? ((o: ScrollToOptions) => window.scrollBy(o));

  card.scrollIntoView({ block: 'nearest', behavior });

  const rect = card.getBoundingClientRect();
  const overflow = rect.bottom - (options.viewportHeight - margin);
  if (overflow > 0) scrollBy({ top: overflow, behavior });
}

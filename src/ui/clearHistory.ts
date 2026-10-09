const CONFIRMATION_LABEL = 'History cleared';
const CONFIRMATION_MS = 2000;

/**
 * Wire the "Clear seen history" button. Only the text span changes, so the
 * icon and the accessible name survive the confirmation swap.
 */
export function wireClearHistory(
  button: HTMLButtonElement,
  text: HTMLElement,
  onClear: () => void,
): void {
  const idleLabel = text.textContent ?? 'Clear seen history';
  let timer: number | undefined;
  button.addEventListener('click', () => {
    onClear();
    text.textContent = CONFIRMATION_LABEL;
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      text.textContent = idleLabel;
    }, CONFIRMATION_MS);
  });
}

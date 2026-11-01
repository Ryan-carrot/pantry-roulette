// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { wireClearHistory } from '../src/ui/clearHistory';

describe('wireClearHistory', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <button id="clear-history-btn" aria-label="Clear the list of recipes you have already been shown">
        <svg aria-hidden="true"></svg>
        <span id="clear-history-text">Clear seen history</span>
      </button>`;
    vi.useFakeTimers();
  });

  it('clears history and shows a confirmation for two seconds, then restores the label', () => {
    const button = document.getElementById('clear-history-btn') as HTMLButtonElement;
    const text = document.getElementById('clear-history-text') as HTMLSpanElement;
    const onClear = vi.fn();
    wireClearHistory(button, text, onClear);

    button.click();
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(text.textContent).toBe('History cleared');
    expect(button.querySelector('svg')).not.toBeNull();

    vi.advanceTimersByTime(1999);
    expect(text.textContent).toBe('History cleared');
    vi.advanceTimersByTime(1);
    expect(text.textContent).toBe('Clear seen history');
    expect(button.querySelector('svg')).not.toBeNull();
  });

  it('restarts the confirmation window on a second click', () => {
    const button = document.getElementById('clear-history-btn') as HTMLButtonElement;
    const text = document.getElementById('clear-history-text') as HTMLSpanElement;
    wireClearHistory(button, text, () => {});
    button.click();
    vi.advanceTimersByTime(1500);
    button.click();
    vi.advanceTimersByTime(1500);
    expect(text.textContent).toBe('History cleared');
    vi.advanceTimersByTime(500);
    expect(text.textContent).toBe('Clear seen history');
  });
});

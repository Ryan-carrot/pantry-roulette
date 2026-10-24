// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createVibeSelector } from '../src/ui/vibeSelector';
import { VIBE_KEYS } from '../src/types';

function mount() {
  document.body.innerHTML = `<fieldset id="vibe"><legend>Vibe</legend></fieldset>`;
  return document.getElementById('vibe') as HTMLFieldSetElement;
}

describe('vibe selector', () => {
  beforeEach(() => { mount(); });

  it('renders one radio per vibe key, with comfort set by default', () => {
    const selector = createVibeSelector(mount(), { initial: 'comfort' });
    const radios = document.querySelectorAll<HTMLInputElement>('input[type=radio][name=vibe]');
    expect(radios).toHaveLength(10);
    expect([...radios].map((r) => r.value).sort()).toEqual([...VIBE_KEYS].sort());
    expect(selector.value()).toBe('comfort');
    expect(document.querySelector<HTMLInputElement>('input[value=comfort]')?.checked).toBe(true);
  });

  it('reads back whichever radio is checked', () => {
    const selector = createVibeSelector(mount(), { initial: 'lazy' });
    const fancy = document.querySelector<HTMLInputElement>('input[value=fancy]') as HTMLInputElement;
    fancy.checked = true;
    fancy.dispatchEvent(new Event('change', { bubbles: true }));
    expect(selector.value()).toBe('fancy');
  });

  it('moves the selection with the arrow keys and reports the change', () => {
    const onChange = vi.fn();
    const selector = createVibeSelector(mount(), { initial: 'comfort', onChange });
    const comfort = document.querySelector<HTMLInputElement>('input[value=comfort]') as HTMLInputElement;
    comfort.focus();
    comfort.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    expect(selector.value()).toBe('hearty');
    expect(onChange).toHaveBeenLastCalledWith('hearty');
    expect((document.activeElement as HTMLInputElement).value).toBe('hearty');
    const left = () => document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }));
    left();
    left();
    expect(selector.value()).toBe('simple');
    expect((document.activeElement as HTMLInputElement).value).toBe('simple');
  });

  it('does not wrap past the ends', () => {
    const selector = createVibeSelector(mount(), { initial: 'lazy' });
    const lazy = document.querySelector<HTMLInputElement>('input[value=lazy]') as HTMLInputElement;
    lazy.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }));
    expect(selector.value()).toBe('lazy');
  });

  it('toggles between the dial and the full grid with "see all"', () => {
    const fieldset = mount();
    createVibeSelector(fieldset, { initial: 'comfort' });
    const toggle = fieldset.querySelector<HTMLButtonElement>('.vibe-toggle') as HTMLButtonElement;
    expect(fieldset.classList.contains('vibe-all')).toBe(false);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    toggle.click();
    expect(fieldset.classList.contains('vibe-all')).toBe(true);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    toggle.click();
    expect(fieldset.classList.contains('vibe-all')).toBe(false);
  });

  it('closes the grid again once a vibe is chosen from it', () => {
    const fieldset = mount();
    createVibeSelector(fieldset, { initial: 'comfort' });
    fieldset.querySelector<HTMLButtonElement>('.vibe-toggle')?.click();
    const fun = fieldset.querySelector<HTMLInputElement>('input[value=fun]') as HTMLInputElement;
    fun.checked = true;
    fun.dispatchEvent(new Event('change', { bubbles: true }));
    expect(fieldset.classList.contains('vibe-all')).toBe(false);
  });
});

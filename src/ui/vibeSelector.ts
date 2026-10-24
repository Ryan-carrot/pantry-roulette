import { VIBE_KEYS, isVibeKey, type VibeKey } from '../types';
import { el, replaceChildren } from './el';

/** Display labels for the ten keys, in the order they sit on the dial. */
const LABELS: Record<VibeKey, string> = {
  lazy: 'Lazy',
  simple: 'Simple',
  comfort: 'Comfort',
  hearty: 'Hearty',
  healthy: 'Healthy',
  fun: 'Fun',
  classic: 'Classic',
  fancy: 'Fancy',
  elegant: 'Elegant',
  impressive: 'Impressive',
};

/** Dial order differs from VIBE_KEYS: calm vibes on the left, effortful on the right. */
const DIAL_ORDER: readonly VibeKey[] = [
  'lazy', 'simple', 'comfort', 'hearty', 'healthy', 'fun', 'classic', 'fancy', 'elegant', 'impressive',
];

export interface VibeSelectorOptions {
  initial?: VibeKey;
  onChange?: (vibe: VibeKey) => void;
}

export interface VibeSelector {
  value(): VibeKey;
}

/**
 * The vibe dial: a fieldset of radio inputs. Each radio sits inside a label
 * styled as a rail item; the checked one is "set" in gold. Radios give us
 * keyboard and screen-reader behaviour for free; the only scripting is the
 * arrow-key stepping (so it works without wrapping and scrolls the rail) and
 * the "see all" toggle that turns the rail into a grid.
 */
export function createVibeSelector(fieldset: HTMLFieldSetElement, options: VibeSelectorOptions = {}): VibeSelector {
  const initial = options.initial ?? 'comfort';
  const legend = fieldset.querySelector('legend');
  const order = DIAL_ORDER.filter((k) => (VIBE_KEYS as readonly string[]).includes(k));

  const rail = el('div', { class: 'vibe-rail' });
  const inputs: HTMLInputElement[] = [];
  for (const key of order) {
    const input = el('input', { type: 'radio', name: 'vibe', value: key, class: 'vibe-input' });
    input.checked = key === initial;
    inputs.push(input);
    rail.append(el('label', { class: 'vibe-item' }, [input, el('span', { class: 'vibe-name' }, [LABELS[key]])]));
  }

  const toggle = el('button', { type: 'button', class: 'vibe-toggle', 'aria-expanded': 'false' }, ['See all ten']);
  const head = el('div', { class: 'vibe-head' }, [
    legend ?? el('span', {}, ['Vibe']),
    el('span', { class: 'vibe-hint' }, ['swipe to set']),
    toggle,
  ]);
  replaceChildren(fieldset, [head, el('div', { class: 'vibe-marker', 'aria-hidden': 'true' }), rail]);

  function current(): VibeKey {
    const checked = inputs.find((i) => i.checked);
    const value = checked?.value;
    return isVibeKey(value) ? value : initial;
  }

  function centre(input: HTMLInputElement): void {
    const label = input.parentElement;
    if (label && typeof label.scrollIntoView === 'function' && !fieldset.classList.contains('vibe-all')) {
      const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
      label.scrollIntoView({ inline: 'center', block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
    }
  }

  function setOpen(open: boolean): void {
    fieldset.classList.toggle('vibe-all', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? 'Back to the dial' : 'See all ten';
  }

  function select(input: HTMLInputElement, focus: boolean): void {
    inputs.forEach((i) => { i.checked = i === input; });
    if (focus) input.focus();
    setOpen(false);
    centre(input);
    options.onChange?.(current());
  }

  fieldset.addEventListener('change', (event) => {
    const target = event.target;
    if (target instanceof HTMLInputElement && target.name === 'vibe') select(target, false);
  });

  fieldset.addEventListener('keydown', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || target.name !== 'vibe') return;
    const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1
      : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
    if (step === 0) return;
    event.preventDefault();
    const index = inputs.indexOf(target);
    const next = inputs[index + step];
    if (next) select(next, true);
  });

  toggle.addEventListener('click', () => setOpen(!fieldset.classList.contains('vibe-all')));

  const initialInput = inputs.find((i) => i.checked);
  if (initialInput) requestAnimationFrame(() => centre(initialInput));

  return { value: current };
}

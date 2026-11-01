/**
 * Cook-time estimate from instruction text. TheMealDB has no cook-time
 * field, so this is honest only as a bucket: the largest single duration
 * mentioned, plus a little per step, never a precise number. Pure.
 */
export type CookTimeBucket = 'under-30' | '30-60' | 'over-60';

const MINUTES_PER_STEP = 3;      /* the step-count heuristic: prep and handling between timed legs */
const OVERNIGHT_MINUTES = 12 * 60;

/* "20 minutes", "5 mins", "3 min", "1 hour", "2 hrs", "1-2 hrs", "10–15 minutes", "1.5 hours" */
const DURATION = /(\d+(?:[.,]\d+)?)(?:\s*(?:-|–|to)\s*(\d+(?:[.,]\d+)?))?\s*(hours?|hrs?|h\b|minutes?|mins?|min\b)/gi;

/** Every duration in the text, in minutes, in order of appearance. Ranges yield their larger end. */
export function parseDurations(text: string): number[] {
  const out: number[] = [];
  const lower = text.toLowerCase();
  for (const match of lower.matchAll(DURATION)) {
    const low = parseFloat((match[1] ?? '0').replace(',', '.'));
    const high = match[2] ? parseFloat(match[2].replace(',', '.')) : low;
    const unit = match[3] ?? '';
    const value = Math.max(low, high);
    out.push(unit.startsWith('h') ? value * 60 : value);
  }
  if (/\bovernight\b/.test(lower)) out.push(OVERNIGHT_MINUTES);
  if (/\bhalf an hour\b/.test(lower)) out.push(30);
  return out;
}

/** The bucket for a recipe, or null when the text mentions no duration at all. */
export function estimateCookTime(instructions: string, steps: readonly string[]): CookTimeBucket | null {
  const durations = parseDurations(instructions);
  if (durations.length === 0) return null;
  const estimate = Math.max(...durations) + MINUTES_PER_STEP * steps.length;
  if (estimate < 30) return 'under-30';
  if (estimate <= 60) return '30-60';
  return 'over-60';
}

export function isCookTimeBucket(value: unknown): value is CookTimeBucket {
  return value === 'under-30' || value === '30-60' || value === 'over-60';
}

/** The label the sheet shows; the tilde and "estimate" say it is a guess. */
export function cookTimeLabel(bucket: CookTimeBucket): string {
  return bucket === 'under-30' ? '~under 30 min · estimate' : bucket === '30-60' ? '~30–60 min · estimate' : '~over 60 min · estimate';
}

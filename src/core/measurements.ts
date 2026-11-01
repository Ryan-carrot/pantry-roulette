/**
 * Parse a TheMealDB measure string ("1 1/2 cups", "200g", "¾ cup", "To taste")
 * into a quantity and a unit. Written for the servings spike; not wired into
 * the UI. Pure. Unknown units are reported as null with the quantity intact,
 * so a caller can still scale "2 sprigs" even though it cannot convert it.
 */
export interface ParsedMeasure {
  qty: number | null;
  unit: string | null;
  raw: string;
}

const FRACTIONS: Record<string, number> = {
  '½': 0.5, '⅓': 1 / 3, '⅔': 2 / 3, '¼': 0.25, '¾': 0.75, '⅕': 0.2, '⅖': 0.4, '⅗': 0.6, '⅘': 0.8,
  '⅙': 1 / 6, '⅚': 5 / 6, '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875,
};

/** Canonical unit per spelling. Plurals and dots are stripped before lookup. */
const UNITS: Record<string, string> = {
  g: 'g', gram: 'g', grams: 'g', gr: 'g',
  kg: 'kg', kilogram: 'kg', kilograms: 'kg',
  mg: 'mg',
  ml: 'ml', millilitre: 'ml', milliliter: 'ml', millilitres: 'ml', milliliters: 'ml',
  l: 'l', litre: 'l', liter: 'l', litres: 'l', liters: 'l',
  tsp: 'tsp', teaspoon: 'tsp', teaspoons: 'tsp',
  tbsp: 'tbsp', tbs: 'tbsp', tablespoon: 'tbsp', tablespoons: 'tbsp', tblsp: 'tbsp',
  cup: 'cup', cups: 'cup',
  oz: 'oz', ounce: 'oz', ounces: 'oz',
  lb: 'lb', lbs: 'lb', pound: 'lb', pounds: 'lb',
  pint: 'pint', pints: 'pint', pt: 'pint',
  quart: 'quart', quarts: 'quart', qt: 'quart',
  clove: 'clove', cloves: 'clove',
  can: 'can', cans: 'can', tin: 'can', tins: 'can',
  slice: 'slice', slices: 'slice',
  stick: 'stick', sticks: 'stick',
  piece: 'piece', pieces: 'piece',
  bunch: 'bunch', bunches: 'bunch',
  sprig: 'sprig', sprigs: 'sprig',
  leaf: 'leaf', leaves: 'leaf',
  pinch: 'pinch', dash: 'dash', handful: 'handful',
  cm: 'cm', inch: 'inch', inches: 'inch',
};
/* "2 sprigs" should still parse its quantity, but the spike wants to know how many
   strings fall back to these vague units, so they are not canonicalised above the line. */
const VAGUE = new Set(['sprig', 'pinch', 'dash', 'handful', 'leaf']);

const NUMBER = String.raw`(\d+(?:[.,]\d+)?)`;
const VULGAR = `[${Object.keys(FRACTIONS).join('')}]`;
/* integer, optional fraction (unicode or a/b), or a bare fraction; then an optional range end */
const QTY = new RegExp(
  `^\\s*(?:${NUMBER}\\s*(${VULGAR})|${NUMBER}\\s+(\\d+)\\s*/\\s*(\\d+)|(\\d+)\\s*/\\s*(\\d+)|(${VULGAR})|${NUMBER})` +
  String.raw`(?:\s*(?:-|–|to)\s*(?:\d+(?:[.,]\d+)?|` + VULGAR + String.raw`))?\s*`,
);

function num(value: string): number { return parseFloat(value.replace(',', '.')); }

export function parseMeasure(raw: string): ParsedMeasure {
  const text = raw.trim().toLowerCase();
  const match = QTY.exec(text);
  if (!match) return { qty: null, unit: null, raw };

  let qty: number;
  if (match[1] !== undefined && match[2] !== undefined) qty = num(match[1]) + (FRACTIONS[match[2]] ?? 0);           // 2½
  else if (match[3] !== undefined) qty = num(match[3]) + Number(match[4]) / Number(match[5]);                       // 1 1/2
  else if (match[6] !== undefined) qty = Number(match[6]) / Number(match[7]);                                       // 1/2
  else if (match[8] !== undefined) qty = FRACTIONS[match[8]] ?? 0;                                                  // ½
  else qty = num(match[9] ?? '0');                                                                                   // 2, 1.5
  if (!Number.isFinite(qty) || qty === 0) return { qty: null, unit: null, raw };

  const rest = text.slice(match[0].length);
  const word = /^([a-z]+)/.exec(rest)?.[1]?.replace(/\.$/, '') ?? '';
  const unit = UNITS[word] ?? null;
  return { qty, unit: unit && !VAGUE.has(unit) ? unit : null, raw };
}

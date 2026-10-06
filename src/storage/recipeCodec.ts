import type { Recipe } from '../types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null;
}

/**
 * Validate a stored value into a Recipe, or null if it is unusable.
 * Accepts v1 entries (no id, no instructions, extra score fields) and
 * upgrades them. Anything without a string name is discarded.
 */
export function toRecipe(value: unknown): Recipe | null {
  if (!isRecord(value)) return null;
  if (typeof value['name'] !== 'string' || value['name'] === '') return null;

  const steps = stringArray(value['steps']);
  const instructions =
    typeof value['instructions'] === 'string' ? value['instructions'] : steps.join('\n');

  return {
    id: stringOrNull(value['id']),
    name: value['name'],
    ingredients: stringArray(value['ingredients']),
    measurements: stringArray(value['measurements']),
    steps,
    instructions,
    description: typeof value['description'] === 'string' ? value['description'] : '',
    image: stringOrNull(value['image']),
    category: stringOrNull(value['category']),
    area: stringOrNull(value['area']),
    source: stringOrNull(value['source']),
  };
}

/** Strip anything that is not part of the Recipe shape before persisting. */
export function toStoredRecipe(recipe: Recipe): Recipe {
  return {
    id: recipe.id,
    name: recipe.name,
    ingredients: recipe.ingredients,
    measurements: recipe.measurements,
    steps: recipe.steps,
    instructions: recipe.instructions,
    description: recipe.description,
    image: recipe.image,
    category: recipe.category,
    area: recipe.area,
    source: recipe.source,
  };
}

/** Read a stored recipe list, dropping entries that fail validation. */
export function readRecipes(values: unknown[]): Recipe[] {
  const out: Recipe[] = [];
  for (const value of values) {
    const recipe = toRecipe(value);
    if (recipe) out.push(recipe);
  }
  return out;
}

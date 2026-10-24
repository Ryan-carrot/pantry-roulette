import type { CookTimeBucket } from './core/cookTime';

/** The ten vibe keys, in VIBE_KEYS order. The dial shows them in its own order. */
export const VIBE_KEYS = [
  'lazy',
  'impressive',
  'hearty',
  'fun',
  'healthy',
  'comfort',
  'fancy',
  'elegant',
  'classic',
  'simple',
] as const;

export type VibeKey = (typeof VIBE_KEYS)[number];

export function isVibeKey(value: unknown): value is VibeKey {
  return typeof value === 'string' && (VIBE_KEYS as readonly string[]).includes(value);
}

/**
 * Scoring profile for a vibe. Shape reproduced from the original vibes.js.
 * Only lazy, impressive and simple carry ingredient-count and length thresholds.
 */
export interface VibeProfile {
  readonly keywords: readonly string[];
  readonly maxIngredients?: number;
  readonly minIngredients?: number;
  readonly maxInstructionLength?: number;
  readonly minInstructionLength?: number;
  readonly ingredientWeight: number;
  readonly keywordWeight: number;
  readonly lengthWeight?: number;
}

/** A raw meal object from TheMealDB `lookup.php`. Only the fields we read are named. */
export interface MealDbMeal {
  idMeal: string;
  strMeal: string;
  strMealThumb?: string | null;
  strInstructions?: string | null;
  strCategory?: string | null;
  strArea?: string | null;
  strSource?: string | null;
  // strIngredient1..20 and strMeasure1..20 arrive as dynamic keys.
  [key: string]: string | null | undefined;
}

/** A stub from `filter.php?i=`: enough to identify a meal and fetch its details. */
export interface MealDbStub {
  idMeal: string;
  strMeal: string;
  strMealThumb?: string | null;
}

/** Normalised recipe. This is the shape persisted to localStorage. */
export interface Recipe {
  /** TheMealDB `idMeal`. Absent on favourites saved by v1. */
  id: string | null;
  /** Identity key for favourites, seen and recently viewed (v1 contract). */
  name: string;
  /** Lowercased, trimmed, empty entries removed. */
  ingredients: string[];
  /** Index-aligned with `ingredients`; `""` when MealDB has no measure. */
  measurements: string[];
  /** `instructions` split on newlines, trimmed, empty lines dropped. */
  steps: string[];
  /** The raw instruction text. Read by the vibe engine. */
  instructions: string;
  /** First 120 characters of the first step, for the result and favourite cards. */
  description: string;
  image: string | null;
  category: string | null;
  area: string | null;
  source: string | null;
  /** Bucketed estimate from the instruction text; null when no duration is mentioned. Absent on v1 entries. */
  cookTime?: CookTimeBucket | null;
}

/** A recipe plus the scores from one spin. Scores are contextual and never persisted. */
export interface ScoredRecipe {
  recipe: Recipe;
  /** Number of the user's ingredients found in the recipe. */
  matchedCount: number;
  /** matchedCount / recipe.ingredients.length, 0..1. */
  ingredientMatch: number;
  /** scoreRecipeForVibe result, 0..1. */
  vibeScore: number;
  /** ingredientMatch * 0.5 + vibeScore * 0.5, then * 0.3 if already seen. */
  blendedScore: number;
  /** Whether the seen-list penalty was applied. */
  seen: boolean;
}

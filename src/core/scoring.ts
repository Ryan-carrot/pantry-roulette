import type { Recipe, ScoredRecipe } from '../types';
import { isSeen } from './identity';
import { scoreRecipeForVibe } from './vibes';

const INGREDIENT_WEIGHT = 0.5;
const VIBE_WEIGHT = 0.5;
const SEEN_PENALTY = 0.3;

/** Split "Eggs, butter ,,pasta," into ['eggs', 'butter', 'pasta']. */
export function parseIngredients(input: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input.split(',')) {
    const value = raw.trim().toLowerCase();
    if (value === '' || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

/** Score one recipe against the user's ingredients and vibe. Pure. */
export function scoreRecipe(
  recipe: Recipe,
  userIngredients: readonly string[],
  vibe: string,
  seenKeys: ReadonlySet<string>,
): ScoredRecipe {
  const matchedCount = recipe.ingredients.filter((i) => userIngredients.includes(i)).length;
  const ingredientMatch =
    recipe.ingredients.length === 0 ? 0 : matchedCount / recipe.ingredients.length;
  const vibeScore = scoreRecipeForVibe(recipe, vibe);
  const seen = isSeen(seenKeys, recipe);

  let blendedScore = ingredientMatch * INGREDIENT_WEIGHT + vibeScore * VIBE_WEIGHT;
  if (seen) blendedScore *= SEEN_PENALTY;

  return { recipe, matchedCount, ingredientMatch, vibeScore, blendedScore, seen };
}

/** Score every candidate, drop zero scores, sort best first. Pure. */
export function rankRecipes(
  candidates: readonly Recipe[],
  userIngredients: readonly string[],
  vibe: string,
  seenKeys: ReadonlySet<string>,
): ScoredRecipe[] {
  return candidates
    .map((recipe) => scoreRecipe(recipe, userIngredients, vibe, seenKeys))
    .filter((scored) => scored.blendedScore > 0)
    .sort((a, b) => b.blendedScore - a.blendedScore);
}

/**
 * Choose tonight's recipe. Best ranked candidate wins; if nothing scores
 * above zero, a random candidate is used; an empty pool returns null.
 */
export function pickRecipe(
  candidates: readonly Recipe[],
  userIngredients: readonly string[],
  vibe: string,
  seenKeys: ReadonlySet<string>,
  random: () => number = Math.random,
): ScoredRecipe | null {
  const ranked = rankRecipes(candidates, userIngredients, vibe, seenKeys);
  const best = ranked[0];
  if (best) return best;

  if (candidates.length === 0) return null;
  const index = Math.min(candidates.length - 1, Math.floor(random() * candidates.length));
  const fallback = candidates[index];
  if (!fallback) return null;
  return scoreRecipe(fallback, userIngredients, vibe, seenKeys);
}

import type { Recipe, ScoredRecipe } from '../types';
import { isSeen } from './identity';
import { scoreRecipeForVibe } from './vibes';

const INGREDIENT_WEIGHT = 0.5;
const VIBE_WEIGHT = 0.5;

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

  const blendedScore = ingredientMatch * INGREDIENT_WEIGHT + vibeScore * VIBE_WEIGHT;

  /* `seen` is reported, not scored: rankRecipes excludes seen recipes outright.
     v1 multiplied the blend by 0.3 instead, which let a seen recipe win a small pool. */
  return { recipe, matchedCount, ingredientMatch, vibeScore, blendedScore, seen };
}

/**
 * Deterministic ranking: blended score desc, then matched ingredient count
 * desc, then name asc (case-insensitive, locale-independent). Ties are
 * common when ingredient overlap is zero, and the pool order differs
 * between cold and cached spins, so the comparator must settle them.
 */
export function compareScored(a: ScoredRecipe, b: ScoredRecipe): number {
  if (b.blendedScore !== a.blendedScore) return b.blendedScore - a.blendedScore;
  if (b.matchedCount !== a.matchedCount) return b.matchedCount - a.matchedCount;
  const an = a.recipe.name.toLowerCase();
  const bn = b.recipe.name.toLowerCase();
  if (an < bn) return -1;
  if (an > bn) return 1;
  return 0;
}

/** Score every candidate, drop seen ones and zero scores, sort best first. Pure. */
export function rankRecipes(
  candidates: readonly Recipe[],
  userIngredients: readonly string[],
  vibe: string,
  seenKeys: ReadonlySet<string>,
): ScoredRecipe[] {
  return candidates
    .map((recipe) => scoreRecipe(recipe, userIngredients, vibe, seenKeys))
    .filter((scored) => !scored.seen && scored.blendedScore > 0)
    .sort(compareScored);
}

/**
 * What a spin produced. 'exhausted' is its own state because the fix is
 * different: nothing is wrong with the input or the network, the user has
 * simply seen every candidate and can clear history.
 */
export type PickResult =
  | { kind: 'pick'; pick: ScoredRecipe }
  | { kind: 'exhausted' }
  | { kind: 'empty' };

/**
 * Choose tonight's recipe. The best ranked unseen candidate wins; if no
 * unseen candidate scores above zero, a random unseen one is used; if every
 * candidate has been seen the result is 'exhausted'; an empty pool is 'empty'.
 */
export function pickRecipe(
  candidates: readonly Recipe[],
  userIngredients: readonly string[],
  vibe: string,
  seenKeys: ReadonlySet<string>,
  random: () => number = Math.random,
): PickResult {
  if (candidates.length === 0) return { kind: 'empty' };
  const ranked = rankRecipes(candidates, userIngredients, vibe, seenKeys);
  const best = ranked[0];
  if (best) return { kind: 'pick', pick: best };

  const unseen = candidates.filter((recipe) => !isSeen(seenKeys, recipe));
  if (unseen.length === 0) return { kind: 'exhausted' };
  const index = Math.min(unseen.length - 1, Math.floor(random() * unseen.length));
  const fallback = unseen[index];
  if (!fallback) return { kind: 'exhausted' };
  return { kind: 'pick', pick: scoreRecipe(fallback, userIngredients, vibe, seenKeys) };
}

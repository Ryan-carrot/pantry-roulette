import { isVibeKey, type Recipe, type VibeKey, type VibeProfile } from '../types';

/**
 * Vibe profiles, reproduced from the original vibes.js. One deliberate
 * change: `simple.lengthWeight` is 0.3 (v1: 0.2) so every profile sums to 1.0.
 */
export const vibeProfiles: Readonly<Record<VibeKey, VibeProfile>> = {
  lazy: {
    keywords: ['mix', 'stir', 'microwave', 'simple', 'easy', 'toss', 'combine'],
    maxIngredients: 5,
    maxInstructionLength: 300,
    ingredientWeight: 0.4,
    keywordWeight: 0.4,
    lengthWeight: 0.2,
  },
  impressive: {
    keywords: ['marinate', 'reduce', 'simmer', 'layer', 'carefully', 'slowly', 'rest', 'fold'],
    minIngredients: 8,
    minInstructionLength: 800,
    ingredientWeight: 0.3,
    keywordWeight: 0.4,
    lengthWeight: 0.3,
  },
  hearty: {
    keywords: ['beef', 'stew', 'potato', 'roast', 'gravy', 'filling', 'pork', 'dumpling', 'thick'],
    ingredientWeight: 0.2,
    keywordWeight: 0.8,
  },
  fun: {
    keywords: ['crispy', 'loaded', 'smash', 'finger', 'dip', 'wrap', 'crunch', 'pop', 'bite'],
    ingredientWeight: 0.2,
    keywordWeight: 0.8,
  },
  healthy: {
    keywords: ['salad', 'steam', 'grill', 'fresh', 'light', 'veggie', 'lean', 'bake', 'raw'],
    ingredientWeight: 0.2,
    keywordWeight: 0.8,
  },
  comfort: {
    keywords: ['creamy', 'cheese', 'bake', 'warm', 'soup', 'casserole', 'melt', 'buttery', 'rich'],
    ingredientWeight: 0.2,
    keywordWeight: 0.8,
  },
  fancy: {
    keywords: ['sear', 'deglaze', 'garnish', 'drizzle', 'truffle', 'wine', 'glaze', 'crust'],
    ingredientWeight: 0.2,
    keywordWeight: 0.8,
  },
  elegant: {
    keywords: ['poach', 'infuse', 'delicate', 'sauce', 'fillet', 'herb', 'flambé', 'mousse'],
    ingredientWeight: 0.2,
    keywordWeight: 0.8,
  },
  classic: {
    keywords: ['traditional', 'original', 'homemade', 'slow', 'sunday', 'roast', 'grandmother', 'heritage'],
    ingredientWeight: 0.2,
    keywordWeight: 0.8,
  },
  simple: {
    keywords: ['toss', 'season', 'slice', 'chop', 'quick', 'minimal', 'basic', 'plain'],
    maxIngredients: 6,
    maxInstructionLength: 400,
    ingredientWeight: 0.3,
    keywordWeight: 0.4,
    // v1 shipped 0.2 (sum 0.9). Retuned to 0.3 so the profile sums to 1.0 like impressive.
    lengthWeight: 0.3,
  },
};

export type VibeInput = Pick<Recipe, 'name' | 'ingredients' | 'instructions'>;

/**
 * Score a recipe 0..1 for a vibe. Same algorithm as the original
 * `scoreRecipeForVibe`, now fed the real instruction text.
 * Unknown vibes score 0.
 */
export function scoreRecipeForVibe(recipe: VibeInput, vibe: string): number {
  if (!isVibeKey(vibe)) return 0;
  const profile = vibeProfiles[vibe];

  const instructions = recipe.instructions.toLowerCase();
  const name = recipe.name.toLowerCase();
  const searchText = `${instructions} ${name}`;
  const ingredientCount = recipe.ingredients.length;

  const matchedKeywords = profile.keywords.filter((word) => searchText.includes(word));
  const keywordScore = matchedKeywords.length / profile.keywords.length;

  let ingredientScore: number;
  if (profile.maxIngredients !== undefined) {
    ingredientScore =
      ingredientCount <= profile.maxIngredients
        ? 1
        : Math.max(0, 1 - (ingredientCount - profile.maxIngredients) / 10);
  } else if (profile.minIngredients !== undefined) {
    ingredientScore =
      ingredientCount >= profile.minIngredients ? 1 : ingredientCount / profile.minIngredients;
  } else {
    ingredientScore = 0.5;
  }

  const length = instructions.length;
  let lengthScore: number;
  if (profile.maxInstructionLength !== undefined) {
    lengthScore =
      length <= profile.maxInstructionLength
        ? 1
        : Math.max(0, 1 - (length - profile.maxInstructionLength) / 500);
  } else if (profile.minInstructionLength !== undefined) {
    lengthScore = length >= profile.minInstructionLength ? 1 : length / profile.minInstructionLength;
  } else {
    lengthScore = 0.5;
  }

  return (
    keywordScore * profile.keywordWeight +
    ingredientScore * profile.ingredientWeight +
    lengthScore * (profile.lengthWeight ?? 0)
  );
}

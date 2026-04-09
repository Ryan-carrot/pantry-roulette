const vibeProfiles = {
    lazy: {
        keywords: ["mix", "stir", "microwave", "simple", "easy", "toss", "combine"],
        maxIngredients: 5,
        maxInstructionLength: 300,
        ingredientWeight: 0.4,
        keywordWeight: 0.4,
        lengthWeight: 0.2
    },
    impressive: {
        keywords: ["marinate", "reduce", "simmer", "layer", "carefully", "slowly", "rest", "fold"],
        minIngredients: 8,
        minInstructionLength: 800,
        ingredientWeight: 0.3,
        keywordWeight: 0.4,
        lengthWeight: 0.3
    },
    hearty: {
        keywords: ["beef", "stew", "potato", "roast", "gravy", "filling", "pork", "dumpling", "thick"],
        ingredientWeight: 0.2,
        keywordWeight: 0.8
    },
    fun: {
       keywords: ["crispy", "loaded", "smash", "finger", "dip", "wrap", "crunch", "pop", "bite"],
       ingredientWeight: 0.2,
       keywordWeight: 0.8
     },
    healthy: {
        keywords: ["salad", "steam", "grill", "fresh", "light", "veggie", "lean", "bake", "raw"],
        ingredientWeight: 0.2,
        keywordWeight: 0.8
     },
    comfort: {
        keywords: ["creamy", "cheese", "bake", "warm", "soup", "casserole", "melt", "buttery", "rich"],
        ingredientWeight: 0.2,
        keywordWeight: 0.8
    },
    fancy: {
        keywords: ["sear", "deglaze", "garnish", "drizzle", "truffle", "wine", "glaze", "crust"],
        ingredientWeight: 0.2,
        keywordWeight: 0.8
    },
    elegant: {
        keywords: ["poach", "infuse", "delicate", "sauce", "fillet", "herb", "flambé", "mousse"],
        ingredientWeight: 0.2,
        keywordWeight: 0.8
    },
    classic: {
        keywords: ["traditional", "original", "homemade", "slow", "sunday", "roast", "grandmother", "heritage"],
        ingredientWeight: 0.2,
        keywordWeight: 0.8
    },
    simple: {
         keywords: ["toss", "season", "slice", "chop", "quick", "minimal", "basic", "plain"],
         maxIngredients: 6,
         maxInstructionLength: 400,
         ingredientWeight: 0.3,
         keywordWeight: 0.4,
         lengthWeight: 0.2
    }
};

function scoreRecipeForVibe(recipe, vibe) {
    const profile = vibeProfiles[vibe];
    if (!profile) return 0;

    const instructions = (recipe.instructions || "").toLowerCase();
    const name = (recipe.name || "").toLowerCase();
    const searchText = instructions + " " + name;
    const ingredientCount = recipe.ingredients ? recipe.ingredients.length : 0;

    let keywordScore = 0;
    let ingredientScore = 0;
    let lengthScore = 0;

    // Keyword scoring
    const matchedKeywords = profile.keywords.filter(word => 
        searchText.includes(word)
    );
    keywordScore = matchedKeywords.length / profile.keywords.length;

    // Ingredient count scoring
    if (profile.maxIngredients !== undefined) {
        // for "lazy" and "simple" vibes, fewer ingredients is better
        ingredientScore = ingredientCount <= profile.maxIngredients ? 1 :
            Math.max(0, 1 - (ingredientCount - profile.maxIngredients) / 10);
    } else if (profile.minIngredients !== undefined) {
        // for "impressive" vibe, more ingredients is better
        ingredientScore = ingredientCount >= profile.minIngredients ? 1 :
            ingredientCount / profile.minIngredients;
    } else {
        ingredientScore = 0.5;
    }

    // Instruction length scoring
    if (profile.maxInstructionLength !== undefined) {
        lengthScore = instructions.length <= profile.maxInstructionLength ? 1 :
            Math.max(0, 1 - (instructions.length - profile.maxInstructionLength) / 500);
    } else if (profile.minInstructionLength !== undefined) {
        lengthScore = instructions.length >= profile.minInstructionLength ? 1 :
            instructions.length / profile.minInstructionLength;
    } else {
        lengthScore = 0.5;
    }

    // Weighted final score
    const finalScore = 
        (keywordScore * (profile.keywordWeight || 0)) +
        (ingredientScore * (profile.ingredientWeight || 0)) +
        (lengthScore * (profile.lengthWeight || 0));

    return finalScore;
};
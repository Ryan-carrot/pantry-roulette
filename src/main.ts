import './styles/index.css';

import { createMealDbClient, fetchRecipeDetails, findCandidates } from './api/mealdb';
import { normalizeMeal } from './core/normalize';
import { parseIngredients, pickRecipe } from './core/scoring';
import { createFavouritesStore } from './storage/favourites';
import { createRecentlyViewedStore } from './storage/recentlyViewed';
import { createSeenStore } from './storage/seen';
import type { StorageLike } from './storage/storage';
import type { Recipe } from './types';
import { renderFavourites } from './ui/favourites';
import { createModal } from './ui/modal';
import { printRecipe } from './ui/print';
import { renderRecentlyViewed } from './ui/recentlyViewed';
import { markResultUnsaved, renderMessage, renderResult } from './ui/resultCard';

function byId<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing #${id}`);
  return node as T;
}

/** localStorage can throw in private windows or when blocked; fall back to memory. */
function resolveStorage(): StorageLike {
  try {
    const probe = '__pantry_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    const map = new Map<string, string>();
    return {
      getItem: (k) => map.get(k) ?? null,
      setItem: (k, v) => void map.set(k, v),
      removeItem: (k) => void map.delete(k),
    };
  }
}

const storage = resolveStorage();
const favourites = createFavouritesStore(storage);
const seen = createSeenStore(storage);
const recentlyViewed = createRecentlyViewedStore(storage);
const mealDb = createMealDbClient();

const ingredientsInput = byId<HTMLInputElement>('ingredients');
const vibeSelect = byId<HTMLSelectElement>('vibe');
const spinButton = byId<HTMLButtonElement>('spin-btn');
const spinText = byId<HTMLSpanElement>('btn-text');
const resetButton = byId<HTMLButtonElement>('reset-seen-btn');
const resetText = byId<HTMLSpanElement>('reset-text');
const resultRegion = byId<HTMLDivElement>('result');
const recentSection = byId<HTMLElement>('recently-viewed-section');
const recentList = byId<HTMLDivElement>('recently-viewed-list');
const favouritesList = byId<HTMLDivElement>('favorites-list');
const favouritesEmpty = byId<HTMLParagraphElement>('favorites-empty');

/* The idle label comes from the HTML so the two can never drift apart. */
const SPIN_IDLE_LABEL = spinText.textContent ?? 'Spin the Pantry 🎰';
const SPIN_BUSY_LABEL = 'Spinning... 🎰';
const RESET_IDLE_LABEL = resetText.textContent ?? 'Reset Suggestions';

const modal = createModal(document, { onPrint: printRecipe });

function openRecipe(recipe: Recipe, trigger: HTMLElement): void {
  modal.open(recipe, trigger);
}

function refreshFavourites(): void {
  renderFavourites(favouritesList, favouritesEmpty, favourites.list(), {
    onView: openRecipe,
    onRemove(name) {
      favourites.remove(name);
      refreshFavourites();
      markResultUnsaved(resultRegion, name);
    },
  });
}

function refreshRecentlyViewed(): void {
  renderRecentlyViewed(recentSection, recentList, recentlyViewed.list(), { onView: openRecipe });
}

function showMessage(message: string): void {
  renderMessage(resultRegion, message);
  resultRegion.classList.remove('hidden');
}

function setSpinning(spinning: boolean): void {
  spinButton.disabled = spinning;
  spinButton.classList.toggle('spinning', spinning);
  spinText.textContent = spinning ? SPIN_BUSY_LABEL : SPIN_IDLE_LABEL;
}

let spinInFlight = false;

async function spin(): Promise<void> {
  if (spinInFlight) return;

  const userIngredients = parseIngredients(ingredientsInput.value);
  if (userIngredients.length === 0) {
    showMessage('🥄 Enter at least one ingredient');
    return;
  }
  const vibe = vibeSelect.value;

  spinInFlight = true;
  setSpinning(true);
  resultRegion.classList.add('hidden');

  try {
    const search = await findCandidates(mealDb, userIngredients);

    if (search.candidates.length === 0) {
      if (search.failedIngredients.length === userIngredients.length) {
        showMessage("📡 Couldn't reach the recipe service. Check your connection and try again.");
      } else {
        showMessage('😬 Nothing found. Try different ingredients.');
      }
      return;
    }

    const meals = await fetchRecipeDetails(mealDb, search.candidates);
    const recipes = meals.map(normalizeMeal);
    const pick = pickRecipe(recipes, userIngredients, vibe, seen.asSet());

    if (!pick) {
      showMessage("😬 Found some recipes but couldn't load any of them. Try again.");
      return;
    }

    seen.add(pick.recipe.name);
    recentlyViewed.add(pick.recipe);

    renderResult(resultRegion, pick, {
      isSaved: favourites.has(pick.recipe.name),
      onSave() {
        const result = favourites.add(pick.recipe);
        if (result === 'added') refreshFavourites();
        return result;
      },
      onView: (trigger) => openRecipe(pick.recipe, trigger),
    });
    resultRegion.classList.remove('hidden');
    resultRegion.focus();
    refreshRecentlyViewed();
  } catch {
    showMessage('😬 Something went wrong. Try again.');
  } finally {
    spinInFlight = false;
    setSpinning(false);
  }
}

spinButton.addEventListener('click', () => void spin());
ingredientsInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') void spin();
});

let resetTimer: number | undefined;
resetButton.addEventListener('click', () => {
  seen.clear();
  resetText.textContent = 'Reset!';
  window.clearTimeout(resetTimer);
  resetTimer = window.setTimeout(() => {
    resetText.textContent = RESET_IDLE_LABEL;
  }, 2000);
});

refreshFavourites();
refreshRecentlyViewed();

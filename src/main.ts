import './styles/index.css';

import { loadRecipes } from './api/loadRecipes';
import { createMealDbClient, findCandidates } from './api/mealdb';
import { parseIngredients, pickRecipe } from './core/scoring';
import { createFavouritesStore } from './storage/favourites';
import { createLookupCache } from './storage/lookupCache';
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

/** Web storage can throw in private windows or when blocked; fall back to memory. */
function resolveStorage(pick: () => Storage): StorageLike {
  try {
    const storage = pick();
    const probe = '__pantry_probe__';
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    return storage;
  } catch {
    const map = new Map<string, string>();
    return {
      getItem: (k) => map.get(k) ?? null,
      setItem: (k, v) => void map.set(k, v),
      removeItem: (k) => void map.delete(k),
    };
  }
}

const storage = resolveStorage(() => window.localStorage);
const sessionCache = resolveStorage(() => window.sessionStorage);
const favourites = createFavouritesStore(storage);
const seen = createSeenStore(storage);
const recentlyViewed = createRecentlyViewedStore(storage);
const mealDb = createMealDbClient();
const lookupCache = createLookupCache(sessionCache);

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
    onRemove(key) {
      favourites.remove(key);
      refreshFavourites();
      markResultUnsaved(resultRegion, key);
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

    const recipes = await loadRecipes(mealDb, lookupCache, search.candidates);
    const pick = pickRecipe(recipes, userIngredients, vibe, seen.asSet());

    if (!pick) {
      showMessage("😬 Found some recipes but couldn't load any of them. Try again.");
      return;
    }

    seen.addRecipe(pick.recipe);
    recentlyViewed.add(pick.recipe);

    renderResult(resultRegion, pick, {
      isSaved: favourites.has(pick.recipe),
      onSave() {
        const result = favourites.add(pick.recipe);
        if (result === 'added') refreshFavourites();
        return result;
      },
      onView: (trigger) => openRecipe(pick.recipe, trigger),
      failedIngredients: search.failedIngredients,
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

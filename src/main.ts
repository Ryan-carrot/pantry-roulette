import './styles/index.css';

import { loadRecipes } from './api/loadRecipes';
import { createMealDbClient, findCandidates } from './api/mealdb';
import { surpriseMe } from './api/surprise';
import { recipeKey } from './core/identity';
import { parseIngredients, pickRecipe, scoreRecipe } from './core/scoring';
import { createFavouritesStore } from './storage/favourites';
import { createLookupCache } from './storage/lookupCache';
import { createRecentlyViewedStore } from './storage/recentlyViewed';
import { createSeenStore } from './storage/seen';
import type { StorageLike } from './storage/storage';
import type { Recipe, ScoredRecipe } from './types';
import { wireClearHistory } from './ui/clearHistory';
import { renderFavourites } from './ui/favourites';
import { createModal } from './ui/modal';
import { printRecipe } from './ui/print';
import { renderRecentlyViewed } from './ui/recentlyViewed';
import { createReel } from './ui/reel';
import { createVibeSelector } from './ui/vibeSelector';
import { markResultSaved, markResultUnsaved, renderExhausted, renderMessage, renderResult } from './ui/resultCard';
import { scrollCardIntoView } from './ui/scroll';

/** Read a motion duration token so the reel's timing is tuned in tokens.css, not here. */
function motionMs(token: string, fallback: number): number {
  const value = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(token));
  return Number.isFinite(value) ? value : fallback;
}
const reduceMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

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
const vibeSelector = createVibeSelector(byId<HTMLFieldSetElement>('vibe'), { initial: 'comfort' });
const spinButton = byId<HTMLButtonElement>('spin-btn');
const surpriseButton = byId<HTMLButtonElement>('surprise-btn');
const spinText = byId<HTMLSpanElement>('btn-text');
const clearHistoryButton = byId<HTMLButtonElement>('clear-history-btn');
const clearHistoryText = byId<HTMLSpanElement>('clear-history-text');
const resultRegion = byId<HTMLDivElement>('result');
const recentSection = byId<HTMLElement>('recently-viewed-section');
const recentList = byId<HTMLDivElement>('recently-viewed-list');
const favouritesList = byId<HTMLDivElement>('favorites-list');
const favouritesEmpty = byId<HTMLParagraphElement>('favorites-empty');

/* The idle label comes from the HTML so the two can never drift apart. */
const SPIN_IDLE_LABEL = spinText.textContent ?? 'Spin';
const SPIN_BUSY_LABEL = 'Spinning';

const modal = createModal(document, {
  onPrint: printRecipe,
  isSaved: (recipe) => favourites.has(recipe),
  onSave(recipe) {
    const result = favourites.add(recipe);
    if (result === 'added') { refreshFavourites(); markResultSaved(resultRegion, recipeKey(recipe)); }
    return result;
  },
});
const reelRegion = byId<HTMLDivElement>('reel');
const reel = createReel(reelRegion, {
  spinMs: motionMs('--reel-spin', 1700),
  landMs: motionMs('--reel-land', 900),
  maxMs: motionMs('--reel-max', 2500),
  reduceMotion,
});

/** Open the sheet. When opened from the result card, the card tips away behind it. */
function openRecipe(recipe: Recipe, trigger: HTMLElement): void {
  const fromCard = resultRegion.contains(trigger);
  modal.open(recipe, trigger, fromCard ? { tip: resultRegion } : {});
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

function showMessage(message: string, kind: 'plain' | 'notice' = 'plain'): void {
  reel.cancel();
  renderMessage(resultRegion, message, kind);
  resultRegion.classList.remove('hidden');
}

function setSpinning(spinning: boolean): void {
  spinButton.disabled = spinning;
  surpriseButton.disabled = spinning;
  spinButton.classList.toggle('spinning', spinning);
  spinText.textContent = spinning ? SPIN_BUSY_LABEL : SPIN_IDLE_LABEL;
}

let spinInFlight = false;

/** Land the reel on the pick, then render the card and bring it into view. Shared by spin and surprise. */
async function showPick(pick: ScoredRecipe, vibe: string, extra: { failedIngredients?: readonly string[]; noInput?: boolean }): Promise<void> {
  const outcome = await reel.settle(pick.recipe);
  seen.addRecipe(pick.recipe);
  recentlyViewed.add(pick.recipe);

  renderResult(resultRegion, pick, {
    isSaved: favourites.has(pick.recipe),
    vibeLabel: vibe,
    onSave() {
      const result = favourites.add(pick.recipe);
      if (result === 'added') refreshFavourites();
      return result;
    },
    onView: (trigger) => openRecipe(pick.recipe, trigger),
    onSpinAgain: () => void (extra.noInput ? surprise() : spin()),
    failedIngredients: extra.failedIngredients ?? [],
    noInput: extra.noInput ?? false,
  });
  resultRegion.classList.toggle('pulse', outcome === 'pulsed');
  resultRegion.classList.remove('hidden');
  resultRegion.focus({ preventScroll: true });
  const card = resultRegion.querySelector<HTMLElement>('.card');
  /* measure the region, not the card: the card's arrival animation transforms it */
  if (card) scrollCardIntoView(resultRegion, { viewportHeight: window.innerHeight, reduceMotion });
  refreshRecentlyViewed();
}

/** "Surprise me": no input, one random recipe through the same reel and card. */
async function surprise(): Promise<void> {
  if (spinInFlight) return;
  const vibe = vibeSelector.value();
  spinInFlight = true;
  setSpinning(true);
  resultRegion.classList.add('hidden');
  resultRegion.classList.remove('pulse', 'away');
  reelRegion.classList.remove('hidden');
  reel.start();
  try {
    const recipe = await surpriseMe(mealDb, lookupCache, seen.asSet());
    if (!recipe) {
      showMessage("Couldn't reach the recipe service. Check your connection and try again.", 'notice');
      return;
    }
    reel.feed([{ idMeal: recipe.id ?? '', strMeal: recipe.name, strMealThumb: recipe.image }]);
    await showPick(scoreRecipe(recipe, [], vibe, seen.asSet()), vibe, { noInput: true });
  } catch {
    showMessage('Something went wrong. Try again.', 'notice');
  } finally {
    spinInFlight = false;
    setSpinning(false);
  }
}

async function spin(): Promise<void> {
  if (spinInFlight) return;

  const userIngredients = parseIngredients(ingredientsInput.value);
  if (userIngredients.length === 0) {
    showMessage('Enter at least one ingredient.');
    return;
  }
  const vibe = vibeSelector.value();

  spinInFlight = true;
  setSpinning(true);
  resultRegion.classList.add('hidden');
  resultRegion.classList.remove('pulse', 'away');
  reelRegion.classList.remove('hidden');
  reel.start();

  try {
    const search = await findCandidates(mealDb, userIngredients);

    if (search.candidates.length === 0) {
      if (search.failedIngredients.length === userIngredients.length) {
        showMessage("Couldn't reach the recipe service. Check your connection and try again.", 'notice');
      } else {
        showMessage('Nothing found. Try different ingredients.');
      }
      return;
    }
    reel.feed(search.candidates);

    const recipes = await loadRecipes(mealDb, lookupCache, search.candidates);
    const result = pickRecipe(recipes, userIngredients, vibe, seen.asSet());

    if (result.kind === 'empty') {
      showMessage("Found recipes but couldn't load any of them. Try again.", 'notice');
      return;
    }
    if (result.kind === 'exhausted') {
      reel.cancel();
      renderExhausted(resultRegion, () => { seen.clear(); void spin(); });
      resultRegion.classList.remove('hidden');
      resultRegion.focus({ preventScroll: true });
      return;
    }
    await showPick(result.pick, vibe, { failedIngredients: search.failedIngredients });
  } catch {
    showMessage('Something went wrong. Try again.', 'notice');
  } finally {
    spinInFlight = false;
    setSpinning(false);
  }
}

spinButton.addEventListener('click', () => void spin());
surpriseButton.addEventListener('click', () => void surprise());
ingredientsInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') void spin();
});

wireClearHistory(clearHistoryButton, clearHistoryText, () => seen.clear());

refreshFavourites();
refreshRecentlyViewed();

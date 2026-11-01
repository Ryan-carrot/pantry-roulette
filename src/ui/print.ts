import printCss from '../styles/print.css?raw';
import type { Recipe } from '../types';

/**
 * Fill a blank document with the standalone print layout from v1
 * (Arial on white, orange rules, two-column ingredients, numbered steps),
 * using DOM APIs only. Exported for tests.
 */
export function buildPrintDocument(doc: Document, recipe: Recipe): void {
  const make = <K extends keyof HTMLElementTagNameMap>(
    tag: K,
    className?: string,
    text?: string,
  ): HTMLElementTagNameMap[K] => {
    const node = doc.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  doc.title = `Pantry Roulette — ${recipe.name}`;
  const style = make('style');
  style.textContent = printCss;
  doc.head.appendChild(style);

  const meta = make('div', 'meta');
  meta.appendChild(make('span', undefined, `${recipe.ingredients.length} ingredients`));
  if (recipe.area) meta.appendChild(make('span', undefined, recipe.area));

  const ingredients = make('ul');
  recipe.ingredients.forEach((ingredient, index) => {
    const measure = recipe.measurements[index] ?? '';
    ingredients.appendChild(make('li', undefined, measure ? `${measure} ${ingredient}` : ingredient));
  });

  const steps = make('ol');
  const stepText = recipe.steps.length > 0 ? recipe.steps : [recipe.description];
  for (const step of stepText) steps.appendChild(make('li', undefined, step));

  doc.body.replaceChildren(
    make('p', 'category', recipe.category ?? ''),
    make('h2', undefined, recipe.name),
    meta,
    make('h3', undefined, 'Ingredients'),
    ingredients,
    make('h3', undefined, 'Instructions'),
    steps,
    make('div', 'footer', 'Printed from pantryroulette.com'),
  );
}

/**
 * Open a new window with the print layout and trigger print.
 * Returns false when a popup blocker stopped the window from opening.
 */
export function printRecipe(recipe: Recipe): boolean {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return false;

  buildPrintDocument(printWindow.document, recipe);
  printWindow.focus();
  printWindow.addEventListener('afterprint', () => printWindow.close());
  // Give the new document a moment to lay out before the print dialog opens.
  window.setTimeout(() => printWindow.print(), 500);
  return true;
}

// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/** The footer and the author meta live in static markup, so test the shipped index.html itself. */
const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
const doc = new DOMParser().parseFromString(html, 'text/html');

describe('site credit', () => {
  it('credits Ryan Christian @ Hexry Development in the rendered footer', () => {
    const footer = doc.querySelector('footer.site-footer');
    expect(footer?.textContent).toContain('Built by Ryan Christian @ Hexry Development');
  });

  it('links Hexry Development in a new tab without an opener', () => {
    const link = doc.querySelector<HTMLAnchorElement>('footer.site-footer a[href="https://hexry.dev"]');
    expect(link?.textContent).toBe('Hexry Development');
    expect(link?.getAttribute('target')).toBe('_blank');
    expect(link?.getAttribute('rel')).toBe('noopener');
  });

  it('keeps the support email and GitHub links', () => {
    const hrefs = [...doc.querySelectorAll('footer.site-footer a')].map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('mailto:support@pantryroulette.com');
    expect(hrefs).toContain('https://github.com/Ryan-carrot/pantry-roulette');
  });

  it('names the company in the author meta and leaves the site name alone', () => {
    expect(doc.querySelector('meta[name="author"]')?.getAttribute('content')).toBe('Ryan Christian, Hexry Development');
    expect(doc.querySelector('meta[property="og:site_name"]')?.getAttribute('content')).toBe('Pantry Roulette');
    expect(doc.title).toBe('Pantry Roulette');
  });
});

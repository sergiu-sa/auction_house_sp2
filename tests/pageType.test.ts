// @vitest-environment node
// Reads files and Vite's config; a DOM would only stop `vite.config.ts` importing at all.
import { readFileSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import viteConfig from '../vite.config';

/**
 * `data-page-type` picks the navbar in `Navbar.ts` and the header reservation in `main.css`.
 * It is written on the two auth pages and nowhere else, so **absence** is what tells the other six they get the main navbar and the unqualified base reservation.
 *
 * The harm of a wrong one is the navbar, not the reservation, and that is measured rather than reasoned:
 *   stamping `auth` on `index.html` and stripping it from `login.html` moved every reservation to match, 0.0px of shift across 14 readings at 7 widths.
 * Both sides read the same attribute, so they cannot disagree.
 * What a mislabelled page ships is login rendering nav links and a guest banner it is designed not to have, or the catalog rendering a navbar with no links.
 *
 * Nothing else can see that. jsdom tests set the attribute themselves, so they never read the markup, and the smoke suite asserts what a page renders rather than which pages opt in.
 */

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * From Vite's entry map, not a directory listing.
 * That map is the authority on what a page is — an unlisted root `.html` is never built;
 *  and it keeps a stray file out: `lighthouse` writes its report into the working directory by default, and a directory listing turns that into a failure in this file about a count.
 */
const HTML_ENTRIES = Object.values(
  viteConfig.build?.rollupOptions?.input as Record<string, string>
).map((entry) => basename(entry));

const AUTH_PAGES = ['login.html', 'register.html'];

/**
 * Quoting is the attacker here, not the value.
 * A double-quote-only pattern reads `data-page-type='auth'` on a browse page as "no attribute" and passes, which is the one direction that matters;
 *  the DOM and the CSS see it identically either way.
 */
const attribute = (file: string): string | null => {
  const body = /<body[^>]*>/.exec(readFileSync(join(REPO_ROOT, file), 'utf8'));
  if (!body) return null;
  const m = /\sdata-page-type\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/.exec(
    body[0]
  );
  return m ? (m[1] ?? m[2] ?? m[3]) : null;
};

describe('data-page-type', () => {
  it('scans every page Vite builds', () => {
    // So "scanned nothing" cannot pass as "scanned and clean", and so a ninth page is scanned the
    // moment it is buildable rather than whenever someone remembers this file.
    expect(HTML_ENTRIES.length).toBeGreaterThan(1);
    expect(HTML_ENTRIES).toEqual(expect.arrayContaining(AUTH_PAGES));
  });

  it('is on the auth pages, and says auth', () => {
    for (const file of AUTH_PAGES) {
      expect(attribute(file), file).toBe('auth');
    }
  });

  it('is on no other page, at any value', () => {
    const others = HTML_ENTRIES.filter((f) => !AUTH_PAGES.includes(f));
    // Named, not counted: a failure should say which page, and 'browse' is as wrong here as 'auth'.
    expect(Object.fromEntries(others.map((f) => [f, attribute(f)]))).toEqual(
      Object.fromEntries(others.map((f) => [f, null]))
    );
  });
});

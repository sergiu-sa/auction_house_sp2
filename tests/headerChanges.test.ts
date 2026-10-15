import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { REPO_ROOT } from '../scripts/icons/scan.mjs';
import { HEADER_CHANGES } from './e2e/support/header';

/**
 * `pages.spec.ts` measures the header either side of each width in `HEADER_CHANGES`, so a breakpoint `main.css` reserves the header at and the list leaves out is never measured.
 * Each block is matched up to a `}` in column 0, which Prettier guarantees for `main.css`.
 */
const MAIN_CSS = readFileSync(join(REPO_ROOT, 'src/styles/main.css'), 'utf8');

describe('HEADER_CHANGES', () => {
  it('names every width main.css reserves the header at', () => {
    const headerBlocks = [
      ...MAIN_CSS.matchAll(/@media ([^{]+?) \{([\s\S]*?)\n\}/g),
    ].filter(([, , block]) => /#header(?![\w-])/.test(block));
    // Anchored: a pattern that stopped matching would otherwise pass as "nothing to check".
    expect(headerBlocks.length).toBeGreaterThan(0);

    const reservedAt = headerBlocks.map(([, condition]) => {
      // Any other way of writing a breakpoint would read as no breakpoint, so it fails here instead.
      const width = /^\(min-width: (\d+)px\)$/.exec(condition);
      expect(width, `@media ${condition}`).not.toBeNull();
      return Number(width![1]);
    });
    expect(HEADER_CHANGES).toEqual(expect.arrayContaining(reservedAt));
  });
});

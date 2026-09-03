import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  NON_ICON_CLASSES,
  REPO_ROOT,
  OUT_CSS,
  OUT_FONT,
  OUT_MANIFEST,
  faCodepoints,
  resolveIcons,
  scanIconUsage,
} from '../scripts/icons/scan.mjs';

/**
 * The standing rule for the self-hosted icon font:
 *  adding an icon means regenerating the asset.
 * Get that wrong and the icon is simply absent in production, with nothing logged;
 *    which is exactly what `fa-sparkles` did at ProductCard.ts:46 for as long as it existed, because it is a Font Awesome Pro icon and the site ships Free.
 *
 * This lives in tests/ rather than beside the source because it reads the filesystem, and the root tsconfig gives src/ no Node types.
 */

const manifest = JSON.parse(readFileSync(OUT_MANIFEST, 'utf8')) as {
  glyphs: number;
  fontSha256: string;
  icons: Record<string, string>;
};
const css = readFileSync(OUT_CSS, 'utf8');

/** `.fa-house::before { content: '\f015'; }` -> fa-house => f015 */
function cssRules(): Map<string, string> {
  const rules = new Map<string, string>();
  for (const m of css.matchAll(
    /\.(fa-[a-z0-9-]+)::before\s*\{\s*content:\s*'\\([0-9a-f]{1,6})';\s*\}/g
  )) {
    rules.set(m[1], m[2]);
  }
  return rules;
}

describe('icon font coverage', () => {
  it('ships a glyph for every fa-* class in the source', () => {
    const shipped = cssRules();
    const orphans = [...scanIconUsage()]
      // scanIconUsage() already drops the utility classes, so anything it returns is an icon.
      .filter(([name]) => !shipped.has(name))
      .map(([name, sites]) => `${name} (${sites.join(', ')})`);

    expect(
      orphans,
      'run `npm run icons:build` — these classes have no glyph in the shipped font'
    ).toEqual([]);
  });

  it('resolves every shipped name against Font Awesome Free 6.5.1', () => {
    // The step that rejects a Pro-only class: Free's own stylesheet cannot give it a codepoint.
    const free = faCodepoints();
    const wrong = Object.entries(manifest.icons)
      .filter(([name, cp]) => free.get(name) !== cp)
      .map(([name, cp]) => `${name} -> ${cp} (Free says ${free.get(name) ?? 'no such icon'})`);

    expect(wrong).toEqual([]);
  });

  it('keeps the stylesheet and the manifest in step', () => {
    expect(Object.fromEntries(cssRules())).toEqual(manifest.icons);
  });

  it('ships the font the manifest was generated from', () => {
    // The two text files are easy to check and are not the thing that renders.
    // The generator writes a binary into a directory that did not exist before, and this repo is staged by hand;
    //  so a woff2 that is missing, unstaged, or left behind by a rebase would otherwise pass typecheck, unit, smoke and visual while production serves @font-face pointing at nothing.
    // Under font-display: block that is every icon as a blank box, with nothing logged.
    const font = readFileSync(OUT_FONT);
    expect(createHash('sha256').update(font).digest('hex')).toBe(
      manifest.fontSha256
    );
  });

  it('ships nothing it does not use', () => {
    // Not tidiness: an unused rule means the scan and the generator disagree about the source.
    const used = new Set(scanIconUsage().keys());
    expect(Object.keys(manifest.icons).filter((n) => !used.has(n))).toEqual([]);
  });

  it('counts the glyphs the aliases collapse onto', () => {
    // 67 class names, fewer glyphs: the codebase spells five icons both the v5 and the v6 way.
    const { resolved, glyphs } = resolveIcons();
    expect(resolved.size).toBe(Object.keys(manifest.icons).length);
    expect(glyphs.length).toBe(manifest.glyphs);
    expect(glyphs.length).toBeLessThan(resolved.size);
  });

  it('declares a self-hosted woff2 and no third-party origin', () => {
    expect(css).toContain("src: url('./fonts/aucto-icons.woff2') format('woff2')");
    expect(css).not.toContain('cdnjs');
    // block, not swap: private-use codepoints have no fallback glyph, so swap paints .notdef.
    expect(css).toContain('font-display: block');
  });

  it('sizes the icon box from CSS that is present at first paint', () => {
    // Collection mobile measured 0.4305 CLS with Font Awesome and 0.0122 with it blocked.
    // The cause was the *stylesheet* arriving, not the font:
    //   it loaded async via media="print", so until it applied .fa-solid had no rules at all and every icon control was laid out small.
    // These rules now ship inside the render-blocking app stylesheet, so the box is right on the first frame and a late glyph paints into a box that is already the correct size.
    expect(css).toMatch(/\.fa-solid\s*\{[^}]*line-height:\s*1/s);
    expect(css).toMatch(/\.fa-solid\s*\{[^}]*display:\s*inline-block/s);
  });

  it('is imported before the Tailwind utilities', () => {
    // Font Awesome arrived as its own <link> and Vite injects the app stylesheet after it, so a sized icon takes Tailwind's line-height and an unsized one takes Font Awesome's 1.
    // Importing after the utilities inverts that and shrinks every sized icon.
    const main = readFileSync(join(REPO_ROOT, 'src/styles/main.css'), 'utf8');
    expect(main.indexOf("@import './icons.css'")).toBeGreaterThan(-1);
    expect(main.indexOf("@import './icons.css'")).toBeLessThan(
      main.indexOf("@import 'tailwindcss/utilities'")
    );
  });

  it('keeps fa-spin, which Collection.ts adds at runtime', () => {
    expect(css).toContain('.fa-spin');
    expect(css).toContain('@keyframes fa-spin');
    expect(css).toContain('prefers-reduced-motion');
  });
});

describe('the scan itself', () => {
  it('finds icons that never appear inside a class attribute', () => {
    // Four live as `icon:` fields in Navbar/CategoryFilters and two as class strings returned from Toast.
    // A markup-keyed scan drops all six, and with them every category filter.
    const found = scanIconUsage();
    for (const name of [
      'fa-house',
      'fa-microchip',
      'fa-shirt',
      'fa-palette',
      'fa-info-circle',
      'fa-times',
    ]) {
      expect(found.has(name), `${name} must be discoverable`).toBe(true);
    }
  });

  it('treats an unknown fa-* class as an icon rather than ignoring it', () => {
    // The allow-list is explicit so a new utility class fails loudly instead of silently dropping out of the subset.
    expect([...NON_ICON_CLASSES].sort()).toEqual(['fa-solid', 'fa-spin']);
  });
});

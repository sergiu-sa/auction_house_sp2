import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { LISTING_PLACEHOLDER } from '../src/utils/listingImage';
import { SAFE } from './placeholderGeometry';

/**
 * Nothing else can see this asset. Axe cannot read inside an <img>, a crop only shows at widths
 * no baseline visits, and the hand-written paths are overwritten by JS before any screenshot.
 */

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p: string): string => readFileSync(join(REPO_ROOT, p), 'utf8');

/** Every entry, not a fixed pair: a path added to a third file must not escape a later rename. */
const HTML_ENTRIES = [
  ...readdirSync(REPO_ROOT)
    .filter((f) => f.endsWith('.html'))
    .map((f) => f),
  // public/404.html is hand-written and copied verbatim rather than built, so it can only reach an
  // asset by a literal path — exactly the kind of reference a rename misses.
  ...readdirSync(join(REPO_ROOT, 'public'))
    .filter((f) => f.endsWith('.html'))
    .map((f) => join('public', f)),
];

/** So "scanned nothing" cannot pass as "scanned and clean". */
const HTML_ENTRIES_WITH_PLACEHOLDER = ['login.html', 'register.html'];

// Guarded: an unguarded module-scope read turns a missing asset into an ENOENT during collection,
// killing every assertion below instead of failing the existence check written for it.
const svgPath = join(REPO_ROOT, LISTING_PLACEHOLDER.replace(/^\//, 'public/'));
const svgExists = existsSync(svgPath);
const svg = svgExists ? readFileSync(svgPath, 'utf8') : '';

// Word-anchored: an unanchored `y="` also matches inside `font-family="serif"`.
function attr(tag: string, name: string): string {
  return new RegExp(`(?:^|\\s)${name}="([^"]*)"`).exec(tag)?.[1] ?? '';
}

// Only #rrggbb: anything else parses to NaN and would report "below AA" for an unreadable fill.
function relativeLuminance(hex: string): number {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) {
    throw new Error(
      `fill "${hex}" is not a #rrggbb colour; contrast cannot be measured`
    );
  }
  const channel = (value: number): number => {
    const c = value / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const h = hex.slice(1);
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort(
    (x, y) => y - x
  );
  return (hi + 0.05) / (lo + 0.05);
}

describe('the placeholder asset', () => {
  it('exists at the path the code asks for', () => {
    expect(svgExists, `${LISTING_PLACEHOLDER} is missing from public/`).toBe(
      true
    );
  });

  /** ProductShowcase overwrites these before any screenshot, so no baseline records their value. */
  it('is the only placeholder path any HTML entry references', () => {
    for (const entry of HTML_ENTRIES) {
      const paths =
        read(entry).match(/\/images\/placeholder[\w-]*\.svg/g) ?? [];
      for (const path of paths) {
        expect(path, `${entry} points at a stale placeholder`).toBe(
          LISTING_PLACEHOLDER
        );
      }
    }
  });

  it('still finds the hand-written paths it is meant to be watching', () => {
    for (const entry of HTML_ENTRIES_WITH_PLACEHOLDER) {
      const paths =
        read(entry).match(/\/images\/placeholder[\w-]*\.svg/g) ?? [];
      expect(
        paths.length,
        `${entry} references no placeholder`
      ).toBeGreaterThan(0);
    }
  });
});

describe.skipIf(!svgExists)('the placeholder artwork', () => {
  // Captured together: `indexOf(tag)` would find the first element with that open tag.
  const texts = [...svg.matchAll(/<text([^>]*)>([^<]*)</g)].map((m) => ({
    tag: m[1],
    content: m[2],
  }));
  const ground = attr(
    /<rect width="600" height="600" fill="[^"]*"\/>/.exec(svg)?.[0] ?? '',
    'fill'
  );

  it('renders every mark inside both halves of the crop', () => {
    // Every positioned rect: the full-bleed ground rects carry no x/y and are not candidates.
    const panels = [
      ...svg.matchAll(
        /<rect x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)"/g
      ),
    ];
    expect(panels.length, 'no knockout panel found').toBeGreaterThan(0);

    for (const match of panels) {
      const [x, y, w, h] = match.slice(1).map(Number);
      expect(x).toBeGreaterThanOrEqual(SAFE.xMin);
      expect(x + w).toBeLessThanOrEqual(SAFE.xMax);
      expect(y).toBeGreaterThanOrEqual(SAFE.yMin);
      expect(y + h).toBeLessThanOrEqual(SAFE.yMax);
    }

    // 1.2em above the baseline covers the measured italic ascender, which font metrics
    // under-predict by 6 units. Width is an estimate - advance width needs a browser - and 0.75em
    // per character over-states every face here, so it errs towards failing.
    for (const { tag, content } of texts) {
      const baseline = Number(attr(tag, 'y'));
      const size = Number(attr(tag, 'font-size'));

      // Both must be on the element: Number('') is 0, so font-size moved to a wrapping <g> would
      // zero the allowance and the width estimate and leave all four bounds asserting nothing.
      expect(
        size,
        `<text> has no font-size of its own: ${tag.trim()}`
      ).toBeGreaterThan(0);
      expect(
        baseline,
        `<text> has no y of its own: ${tag.trim()}`
      ).toBeGreaterThan(0);

      expect(baseline - size * 1.2).toBeGreaterThanOrEqual(SAFE.yMin);
      expect(baseline + size * 0.3).toBeLessThanOrEqual(SAFE.yMax);

      const spacing = Number(attr(tag, 'letter-spacing') || '0');
      const halfWidth = (content.length * (size * 0.75 + spacing)) / 2;
      expect(300 - halfWidth).toBeGreaterThanOrEqual(SAFE.xMin);
      expect(300 + halfWidth).toBeLessThanOrEqual(SAFE.xMax);
    }
  });

  /** 4.44:1 shipped once, from a slate one step too light, under a green axe run. */
  it('keeps every mark at AA contrast against its ground', () => {
    expect(texts.length).toBeGreaterThan(0);
    for (const { tag } of texts) {
      const fill = attr(tag, 'fill');
      expect(
        contrast(fill, ground),
        `${fill} on ${ground} is below AA for text this small`
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  /** The pattern scales with the box: 26 lands 12-18px apart on a card, 16 and 11 read as speckle. */
  it('holds the dot pitch that was measured against the card boxes', () => {
    const pattern = /<pattern[^>]*width="(\d+)"/.exec(svg);
    expect(Number(pattern?.[1])).toBe(26);
  });
});

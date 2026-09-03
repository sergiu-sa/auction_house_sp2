// Shared by scripts/build-icon-font.mjs and tests/icons.test.ts, so the set of icons the/ generator ships and the set the guard checks cannot drift apart.

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Vitest transforms this module, and under that transform `import.meta.url` is not a file:
 *  URL, so the usual derivation throws.
 * Both callers run with the repo root as cwd (npm sets it), and the package.json check turns a wrong cwd into a loud failure rather than an empty scan.
 */
function findRepoRoot() {
  let root;
  try {
    root = fileURLToPath(new URL('../..', import.meta.url));
  } catch {
    root = process.cwd();
  }
  if (!existsSync(join(root, 'package.json'))) {
    throw new Error(`icon scan: no package.json at ${root}; run from the repo root`);
  }
  return root;
}

export const REPO_ROOT = findRepoRoot();

/**
 * The Font Awesome Free 6.5.1 stylesheet, vendored for the e2e suite long before this script existed.
 * Reusing it means the icon set is pinned to the same release the fixtures record, and the repo carries one copy of Font Awesome rather than two.
 */
export const FA_CSS = join(REPO_ROOT, 'tests/e2e/assets/fa-all.min.css');
export const FA_SOLID_WOFF2 = join(REPO_ROOT, 'tests/e2e/assets/fa-solid-900.woff2');

export const OUT_CSS = join(REPO_ROOT, 'src/styles/icons.css');
export const OUT_FONT = join(REPO_ROOT, 'src/styles/fonts/aucto-icons.woff2');
export const OUT_MANIFEST = join(REPO_ROOT, 'src/styles/icons.manifest.json');

/**
 * `fa-` classes that select no glyph.
 * Anything matching `fa-*` and absent from this list is treated as an icon and must resolve to a codepoint, so a newly introduced utility class fails the guard rather than being silently ignored.
 */
export const NON_ICON_CLASSES = new Set(['fa-solid', 'fa-spin']);

const SCAN_DIRS = ['src'];
/** Every top-level HTML page, including the 404 that Vite copies verbatim. */
export const SCAN_FILES = [
  'index.html',
  'collection.html',
  'listing.html',
  'listing-create.html',
  'listing-edit.html',
  'login.html',
  'register.html',
  'profile.html',
  'public/404.html',
];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, out);
    } else if (/\.(ts|html)$/.test(entry) && !entry.endsWith('.test.ts')) {
      // .test.ts files carry `fa-` strings inside XSS payloads, not markup.
      out.push(full);
    }
  }
  return out;
}

/** Every file the icon set is allowed to come from. */
export function sourceFiles() {
  const files = SCAN_DIRS.flatMap((d) => walk(join(REPO_ROOT, d)));
  return [...files, ...SCAN_FILES.map((f) => join(REPO_ROOT, f))].sort();
}

/**
 * Bare-token scan, deliberately not a markup scan.
 * Six icons never appear inside a `class=` attribute: four are `icon:` fields in Navbar and CategoryFilters, two are class strings returned from Toast.
 * A scan keyed on `class="fa-solid …"` silently drops all six, and with them every category filter and the Feed nav icon.
 *
 * @returns {Map<string, string[]>} icon class -> repo-relative `path:line` sites
 */
export function scanIconUsage() {
  const uses = new Map();
  for (const file of sourceFiles()) {
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      // The lookbehind keeps `sofa-set` in a filename or a line of copy from yielding `fa-set`, which would have no glyph and fail the build over a string that is not markup.
      for (const match of line.matchAll(/(?<![\w-])fa-[a-z0-9-]+/g)) {
        const name = match[0];
        if (NON_ICON_CLASSES.has(name)) continue;
        const site = `${relative(REPO_ROOT, file).split(sep).join('/')}:${i + 1}`;
        const sites = uses.get(name);
        if (sites) sites.push(site);
        else uses.set(name, [site]);
      }
    });
  }
  return new Map([...uses].sort(([a], [b]) => a.localeCompare(b)));
}

/**
 * Font Awesome's own name -> codepoint mapping, read from the release the site ships.
 * This is what makes the guard able to reject a Pro-only class:
 *   a name Free does not define cannot get a codepoint from Free's stylesheet.
 *
 * @returns {Map<string, string>} icon class -> codepoint as a hex string, e.g. 'f015'
 */
export function faCodepoints() {
  const css = readFileSync(FA_CSS, 'utf8');
  const rule =
    /((?:\.fa-[a-z0-9-]+(?::before)?\s*,\s*)*\.fa-[a-z0-9-]+(?::before)?)\s*\{\s*content\s*:\s*"\\([0-9a-f]{1,6})\s*"\s*\}/g;
  const map = new Map();
  for (const match of css.matchAll(rule)) {
    for (const [, name] of match[1].matchAll(/\.(fa-[a-z0-9-]+)/g)) {
      map.set(name, match[2]);
    }
  }
  return map;
}

/**
 * Resolve the scanned usage against Font Awesome Free.
 * `missing` is the failure the guard exists for: a class in the source with no glyph behind it.
 */
export function resolveIcons() {
  const uses = scanIconUsage();
  const codepoints = faCodepoints();

  const resolved = new Map();
  const missing = new Map();
  for (const [name, sites] of uses) {
    const cp = codepoints.get(name);
    if (cp) resolved.set(name, cp);
    else missing.set(name, sites);
  }

  // Aliases collapse: five icons are spelled both the v5 and the v6 way.
  const glyphs = [...new Set(resolved.values())].sort();
  // `uses` stays internal; a caller that wants the raw sites calls scanIconUsage() directly.
  return { resolved, missing, glyphs };
}

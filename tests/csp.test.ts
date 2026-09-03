import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  REPO_ROOT,
  SCAN_FILES as HTML,
  sourceFiles,
} from '../scripts/icons/scan.mjs';

/**
 * The enforcing policy is `script-src 'self'` with no escape hatch, and that is a fragile thing to hold:
 *   an inline `on*=` handler does not error under it, it simply never fires.
 * The site renders, nothing is logged, and the button is dead.
 * Reintroducing one is a one-line change nobody would think twice about, so it needs a tripwire rather than a convention.
 *
 * The same is true of a third-party `<link>`:
 *   adding one back would be blocked at load with no visible failure beyond a missing font.
 */


const netlify = readFileSync(join(REPO_ROOT, 'netlify.toml'), 'utf8');
const policy = /Content-Security-Policy = "([^"]+)"/.exec(netlify)?.[1] ?? '';

function directive(name: string): string {
  const m = new RegExp(`(?:^|;)\\s*${name} ([^;]+)`).exec(policy);
  return m ? m[1].trim() : '';
}

describe('the enforcing Content-Security-Policy', () => {
  it('blocks inline script', () => {
    // The whole point of the phase. If this loosens, the policy stops being an XSS backstop.
    expect(directive('script-src')).toBe("'self'");
  });

  it('allows no third-party origin except the API', () => {
    const origins = [...policy.matchAll(/https:\/\/[^\s;']+/g)].map((m) => m[0]);
    expect([...new Set(origins)]).toEqual(['https://v2.api.noroff.dev']);
  });

  it('keeps the closures that do not depend on inline script', () => {
    expect(directive('object-src')).toBe("'none'");
    expect(directive('base-uri')).toBe("'self'");
    expect(directive('form-action')).toBe("'self'");
    expect(directive('frame-ancestors')).toBe("'none'");
  });

  it('does not send the obsolete X-XSS-Protection header', () => {
    // Ignored by every current browser, and its filtering mode was itself exploitable.
    expect(netlify).not.toMatch(/^\s*X-XSS-Protection\s*=/m);
  });
});

describe('nothing reintroduces what the policy forbids', () => {
  it('has no inline event handler in any page', () => {
    const offenders: string[] = [];
    for (const file of HTML) {
      const html = readFileSync(join(REPO_ROOT, file), 'utf8');
      // Whole-file, tag by tag, never line by line.
      // Prettier puts one attribute per line, so the handler and its `<` land on different lines and a line-scoped regex misses the only shape this repo has ever written:
      //   <link\n  rel="stylesheet"\n  media="print"\n  onload="this.media='all'"\n/>
      const withoutComments = html.replace(/<!--[\s\S]*?-->/g, '');
      const tags = withoutComments.match(/<[^>]+>/g) ?? [];
      // A scan that matches nothing produces the same empty list as a clean page.
      expect(tags.length, `${file} parsed to no tags at all`).toBeGreaterThan(20);
      for (const tag of tags) {
        if (/\son[a-z]+\s*=/.test(tag)) {
          const line = html.slice(0, html.indexOf(tag)).split('\n').length;
          offenders.push(`${file}:${line} ${tag.replace(/\s+/g, ' ').slice(0, 60)}`);
        }
      }
    }
    expect(
      offenders,
      "script-src 'self' means an inline handler never fires, silently"
    ).toEqual([]);
  });

  it('has no inline event handler in any rendered markup', () => {
    // Components build markup as strings, so the same hazard lives in src/ too.
    const offenders: string[] = [];
    const scanned = sourceFiles().filter((f) => f.endsWith('.ts'));
    expect(scanned.length, 'the source scan found no .ts files').toBeGreaterThan(30);
    for (const file of scanned) {
      readFileSync(file, 'utf8')
        .split('\n')
        .forEach((line, i) => {
          // Any `on<word>=`, not a list of the ones we happened to think of: ontoggle, onpointerdown and onmouseover fail just as silently under script-src 'self'.
          if (/\son[a-z]+\s*=\s*["']/.test(line)) {
            offenders.push(`${file.replace(REPO_ROOT, '')}:${i + 1}`);
          }
        });
    }
    expect(offenders).toEqual([]);
  });

  it('loads no stylesheet, script or font from a third-party origin', () => {
    const offenders: string[] = [];
    expect(HTML.length, 'no pages to scan').toBe(9);
    for (const file of HTML) {
      const html = readFileSync(join(REPO_ROOT, file), 'utf8');
      for (const m of html.matchAll(/https:\/\/[a-z0-9.-]+/gi)) {
        // og:url and canonical point at our own deployed origin; those are metadata, not loads.
        if (/auctohouse\.netlify\.app|schema\.org|www\.w3\.org/.test(m[0])) continue;
        offenders.push(`${file}: ${m[0]}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('the self-hosted faces', () => {
  const fontsCss = readFileSync(join(REPO_ROOT, 'src/styles/fonts.css'), 'utf8');

  it('resolves every url() to a file that ships', () => {
    const urls = [...fontsCss.matchAll(/url\('([^']+)'\)/g)].map((m) => m[1]);
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) {
      expect(
        existsSync(join(REPO_ROOT, 'public', url.replace(/^\//, ''))),
        `${url} is declared but not shipped`
      ).toBe(true);
    }
  });

  it('declares every weight the pages ask for', () => {
    // Both families are variable, so one file backs several weights;
    //   but each weight still needs its own @font-face or the browser synthesises a fake bold.
    const declared = [...fontsCss.matchAll(/font-family: '([^']+)';[\s\S]*?font-weight: (\d+);/g)]
      .map((m) => `${m[1]} ${m[2]}`);
    for (const want of [
      'Cormorant 600',
      'Cormorant 700',
      'Source Sans 3 400',
      'Source Sans 3 600',
      'Source Sans 3 700',
    ]) {
      expect(declared, `${want} is used by the design`).toContain(want);
    }
  });

  it('leaves no orphaned font in the e2e fixtures', () => {
    // Nothing serves these any more; what remains must be what the icon generator reads.
    expect(readdirSync(join(REPO_ROOT, 'tests/e2e/assets')).sort()).toEqual([
      'fa-all.min.css',
      'fa-solid-900.woff2',
    ]);
  });

  it('preloads exactly the two latin faces on every page', () => {
    // latin-ext must NOT be preloaded: a preload fetches unconditionally, which is precisely
    // what its unicode-range exists to avoid. Repeated by hand across nine files, so it drifts.
    for (const file of HTML) {
      const html = readFileSync(join(REPO_ROOT, file), 'utf8');
      const preloaded = [...html.matchAll(/rel="preload"[^>]*?href="(\/fonts\/[^"]+)"/gs)]
        .concat([...html.matchAll(/href="(\/fonts\/[^"]+)"[^>]*?rel="preload"/gs)])
        .map((m) => m[1])
        .sort();
      expect(preloaded, `${file} preloads the wrong faces`).toEqual([
        '/fonts/cormorant-latin.woff2',
        '/fonts/source-sans-3-latin.woff2',
      ]);
    }
  });

  it('keeps 404.html pointing at faces that ship', () => {
    // 404.html is copied verbatim, so it declares its own @font-face rules and cannot share
    // fonts.css. Nothing else covers it: no e2e spec navigates there. A rename in fonts.css
    // would orphan this copy silently.
    const html = readFileSync(join(REPO_ROOT, 'public/404.html'), 'utf8');
    const urls = [...html.matchAll(/url\('([^']+)'\)/g)].map((m) => m[1]);
    expect(urls.length, '404.html declares no faces').toBeGreaterThan(0);
    for (const url of urls) {
      expect(
        existsSync(join(REPO_ROOT, 'public', url.replace(/^\//, ''))),
        `404.html references ${url}, which does not ship`
      ).toBe(true);
    }
  });

  it('pins the vendored faces to the bytes they were vendored as', () => {
    // These ship under stable names so 404.html can reach them, which means netlify.toml's
    // one-year immutable header would serve a stale face to everyone if one were re-vendored
    // in place. The convention is "change the filename"; this makes forgetting it fail loudly.
    const expected: Record<string, string> = {
      'cormorant-latin.woff2':
        'c27d01380ad1595adba884ee5a63c5475999ff2bf01d0a2a45c6caa9d75f301d',
      'cormorant-latin-ext.woff2':
        'd0b78842597f7bfbebbb301a1f350337d3e35c66ad7b7a1f0eecf1c325a58d4b',
      'source-sans-3-latin.woff2':
        'ac057a5593cbe3df0d2585da5dd5f33b8efa84aa30550c710fe061b37fc5c54b',
      'source-sans-3-latin-ext.woff2':
        'ed3571ea9ff752f1c846f1c9ad2b0006de42f478a2db9163a74db0729a4eb281',
    };
    for (const [file, sha] of Object.entries(expected)) {
      const bytes = readFileSync(join(REPO_ROOT, 'public/fonts', file));
      expect(
        createHash('sha256').update(bytes).digest('hex'),
        `${file} changed without changing its name — returning visitors would keep the old one`
      ).toBe(sha);
    }
  });
});

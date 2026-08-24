#!/usr/bin/env node
/**
 * Seed short-duration auction listings.
 *
 * The shared Noroff pool has nothing closing inside a day;
 *  the soonest lot is a week out;
 *  so anything time-sensitive ("Ending Soon", countdowns, the "Next Closes" tile) has no data that exercises it.
 * This creates a handful of lots that close in hours instead, then cleans them up again.
 *
 * `--stress` additionally creates the awkward content later phases need:
 *  long strings, entity-bearing titles, zero and many media, a lot that expires mid session, and enough active lots to paginate.
 *
 * It asks for your Noroff email and password and exchanges them for a token in
 * memory. Nothing is stored. Set AUCTO_TOKEN to skip the prompt.
 *
 * Usage:
 *   node scripts/seed-ending-soon.mjs                                     # create the 4 short-duration lots
 *   node scripts/seed-ending-soon.mjs --stress                            # + the stress set
 *   node scripts/seed-ending-soon.mjs --stress --count=40
 *   node scripts/seed-ending-soon.mjs --stress --dry-run                  # print payloads, no token, no network
 *   node scripts/seed-ending-soon.mjs --clean                             # list what cleanup would remove
 *   node scripts/seed-ending-soon.mjs --clean --yes                       # actually remove them
 *
 * Cleanup only ever touches listings on your own profile whose titles match the LOTS table below or carry the stress prefix.
 * Anything else you own is left alone.
 */

import { readFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Minimal .env reader so the script needs no dependencies. */
function readEnvFile() {
  try {
    return Object.fromEntries(
      readFileSync(join(projectRoot, '.env'), 'utf8')
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#'))
        .map((line) => {
          const eq = line.indexOf('=');
          const key = line.slice(0, eq).trim();
          // KEY="value" and KEY='value' are both common; keep the value, not the quotes
          const value = line
            .slice(eq + 1)
            .trim()
            .replace(/^(["'])(.*)\1$/, '$2');
          return [key, value];
        })
    );
  } catch {
    return {};
  }
}

const env = readEnvFile();
const BASE_URL = env.VITE_API_BASE_URL || 'https://v2.api.noroff.dev';
const API_KEY = env.VITE_API_KEY;
// Optional. Trimmed and unquoted because it usually arrives via `pbpaste`, which can carry quotes or whitespace the API rejects.
// If it is absent or malformed, the script logs in instead — see ensureToken().
let TOKEN = (process.env.AUCTO_TOKEN || '')
  .trim()
  .replace(/^(["'])(.*)\1$/s, '$2')
  .trim();

let RESOLVED_USER = process.env.AUCTO_USER || null;

/** Hours from now that each demo lot should close. */
const LOTS = [
  {
    hours: 2,
    title: 'Brass Desk Lamp with Green Glass Shade',
    description:
      'A mid-century banker\'s lamp in solid brass, with the original green glass shade and pull-chain switch. Rewired and ready to use.',
    tags: ['vintage', 'lighting'],
  },
  {
    hours: 7,
    title: 'Walnut Drafting Table with Cast Iron Base',
    description:
      'Adjustable drafting table, walnut top over a cast iron base. Surface has the honest marks of use; the mechanism runs smoothly.',
    tags: ['furniture', 'vintage'],
  },
  {
    hours: 21,
    title: 'Set of Six Hand-Thrown Stoneware Bowls',
    description:
      'Six stoneware bowls in a matte oatmeal glaze, thrown by hand so no two are identical. Dishwasher safe, no chips or crazing.',
    tags: ['ceramics', 'home'],
  },
  {
    hours: 45,
    title: 'Leather Bound Atlas, 1911 Edition',
    description:
      'Full-leather atlas from 1911 with hand-coloured plates. Binding is tight, plates are clean, spine shows light shelf wear.',
    tags: ['books', 'antiques'],
  },
];

/** How --clean finds stress lots without knowing how many were generated. */
const STRESS_PREFIX = 'AUCTO STRESS';

/** Default number of bulk lots. 24 fills a catalog page, so 30 forces pagination. */
const DEFAULT_STRESS_COUNT = 30;

const IMG = (seed) => `https://picsum.photos/seed/${encodeURIComponent(seed)}/800/600`;

/**
 * One row per fixture need.
 * Three needs are absent because one account cannot produce them:
 *  >20 bids (self-bidding is rejected), an already-ended own lot (create rejects a past endsAt), and a zero-result catalog.
 * Those are covered by fixtures in tests/e2e/fixtures instead.
 */
function buildStressLots(count) {
  const lots = [
    {
      need: 'entities in title and description — escaping must not double-escape them',
      hours: 30,
      title: `${STRESS_PREFIX} Ampersands & <angles> and 'apostrophes'`,
      description:
        "Fish & chips, a < b > c, it's got \"everything\" — & an ampersand that must survive a round trip unescaped.",
      tags: ['stress', 'entities'],
      media: [{ url: IMG('entities'), alt: 'A & B < C' }],
    },
    {
      need: 'a double quote in the title — it can break out of a quoted HTML attribute',
      hours: 31,
      title: `${STRESS_PREFIX} The "Genuine" Article, 36 mm`,
      description: 'The quote in the title is the point: it is what closes alt=" in an unescaped sink.',
      tags: ['stress', 'quotes'],
      media: [{ url: IMG('quote'), alt: 'The "Genuine" Article' }],
    },
    {
      need: 'markup inside media[].alt — alt= is the most common attribute sink',
      hours: 32,
      title: `${STRESS_PREFIX} Alt Text Carrying Markup`,
      description: 'The alt attribute below contains angle brackets and a quote.',
      tags: ['stress', 'alt'],
      media: [{ url: IMG('alt'), alt: '<b>bold</b> "quoted" & escaped' }],
    },
    {
      need: 'longest title and description the API allows — clamping, overflow, card height',
      hours: 33,
      // 280 is the API's hard cap on description, measured 2026-08-23.
      // Anything longer is rejected outright, so no listing can ever exceed it.
      title: `${STRESS_PREFIX} ${'Extraordinarily Verbose Lot Title '.repeat(6)}`.slice(0, 220),
      description: `${'This description is as long as the API permits, so clamping, truncation and card height can be measured rather than guessed. '.repeat(3)}`.slice(0, 280),
      tags: ['stress', 'long'],
      media: [{ url: IMG('long'), alt: 'Long content lot' }],
    },
    {
      need: 'zero media — the placeholder branch, and a card rendered without an image',
      hours: 34,
      title: `${STRESS_PREFIX} No Media At All`,
      description: 'This lot has no media array entries, so the placeholder path renders.',
      tags: ['stress', 'nomedia'],
      media: [],
    },
    {
      need: 'more than four media — the gallery\'s "+N more" overflow indicator',
      hours: 35,
      title: `${STRESS_PREFIX} Six Photographs`,
      description: 'Six images, so the gallery overflow indicator has something to indicate.',
      tags: ['stress', 'gallery'],
      media: Array.from({ length: 6 }, (_, i) => ({
        url: IMG(`gallery-${i}`),
        alt: `View ${i + 1} of 6`,
      })),
    },
    {
      need: 'expires during the session — the guard for a lot that ends while a page sits open',
      minutes: 2,
      title: `${STRESS_PREFIX} Closing In Two Minutes`,
      description: 'Open a listings page and leave it. This lot should drop out of the active set.',
      tags: ['stress', 'expiring'],
      media: [{ url: IMG('expiring'), alt: 'Closing shortly' }],
    },
  ];

  for (let i = 1; i <= count; i += 1) {
    lots.push({
      need: i === 1 ? `bulk fill — ${count} lots, enough to paginate a 24-per-page catalog` : null,
      hours: 36 + i,
      title: `${STRESS_PREFIX} Bulk Lot ${String(i).padStart(3, '0')}`,
      description: `Filler lot ${i} of ${count}, created so the catalog has enough active rows to paginate.`,
      tags: ['stress', 'bulk'],
      media: [{ url: IMG(`bulk-${i}`), alt: `Bulk lot ${i}` }],
    });
  }

  return lots;
}

function requireConfig() {
  if (!API_KEY) {
    console.error('Missing VITE_API_KEY in .env — copy it from .env.example and fill it in.');
    process.exit(1);
  }
}

/** Ask a question on the terminal. `hidden` suppresses echo, for passwords. */
function ask(question, { hidden = false } = {}) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });

    if (hidden) {
      rl._writeToOutput = (chunk) => {
        // Echo the prompt itself, then nothing, so the password never appears.
        if (chunk.includes(question)) rl.output.write(chunk);
      };
    }

    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write('\n');
      resolve(answer.trim());
    });
  });
}

/**
 * Exchange email and password for a token, in memory only.
 *
 * The alternative:
 *  — copying the token out of the browser;
 *  — depends on the clipboard, and a clipboard manager or Universal Clipboard can silently hand back something else.
 * This path has no such failure mode.
 * The password is neverechoed, never stored, and never written to disk or shell history.
 */
async function loginForToken() {
  console.log(`Log in to ${BASE_URL}\n`);
  const email = await ask('Noroff email: ');
  const password = await ask('Password (hidden): ', { hidden: true });

  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Noroff-API-Key': API_KEY },
    body: JSON.stringify({ email, password }),
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    console.error(`\nLogin failed: ${response.status} ${body?.errors?.[0]?.message || response.statusText}`);
    process.exit(1);
  }

  RESOLVED_USER = body.data.name;
  console.log(`\nLogged in as @${RESOLVED_USER}\n`);
  return body.data.accessToken;
}

/** Resolve a usable token, from the environment or by logging in. */
async function ensureToken() {
  if (TOKEN && /^[\w-]+\.[\w-]+\.[\w-]+$/.test(TOKEN)) return;

  if (TOKEN) {
    console.error('AUCTO_TOKEN is set but does not look like a token.');
    console.error(`  length: ${TOKEN.length}  parts: ${TOKEN.split('.').length}`);
    console.error('Ignoring it and logging in instead.\n');
  }

  TOKEN = await loginForToken();
}

async function api(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Noroff-API-Key': API_KEY,
      Authorization: `Bearer ${TOKEN}`,
      ...options.headers,
    },
  });

  if (response.status === 204) return null;

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message = body?.errors?.[0]?.message || response.statusText;
    throw new Error(`${response.status} ${message}`);
  }

  return body;
}

/** The token is a JWT; its payload carries the profile name. */
function usernameFromToken() {
  if (RESOLVED_USER) return RESOLVED_USER;

  try {
    const payload = JSON.parse(
      Buffer.from(TOKEN.split('.')[1], 'base64').toString('utf8')
    );
    if (payload.name) return payload.name;
  } catch {
    // fall through to the explicit error below
  }

  console.error(
    'Could not read your profile name from the token. Set AUCTO_USER=<your name> and retry.'
  );
  process.exit(1);
}

function endsAtFromNow(hours) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

/** A lot's closing time, from either `hours` or `minutes`. */
function endsAtFor(lot) {
  return lot.minutes !== undefined
    ? new Date(Date.now() + lot.minutes * 60 * 1000).toISOString()
    : endsAtFromNow(lot.hours);
}

function payloadFor(lot) {
  return {
    title: lot.title,
    description: lot.description,
    tags: lot.tags,
    media:
      lot.media ??
      [{ url: `https://picsum.photos/seed/${encodeURIComponent(lot.title)}/800/600`, alt: lot.title }],
    endsAt: endsAtFor(lot),
  };
}

async function seed(lots, { dryRun }) {
  if (dryRun) {
    console.log(`Dry run — ${lots.length} lot(s) would be created on ${BASE_URL}. Nothing is sent.\n`);
    for (const lot of lots) {
      if (lot.need) console.log(`  # ${lot.need}`);
      const payload = payloadFor(lot);
      console.log(
        `  ${payload.endsAt}  media:${payload.media.length}  title:${payload.title.length}ch  desc:${payload.description.length}ch`
      );
      console.log(`    ${payload.title}`);
    }
    console.log(`\nRe-run without --dry-run to create them.`);
    return;
  }

  console.log(`Creating ${lots.length} lot(s) on ${BASE_URL}\n`);

  let created = 0;
  for (const lot of lots) {
    try {
      const result = await api('/auction/listings', {
        method: 'POST',
        body: JSON.stringify(payloadFor(lot)),
      });

      created += 1;
      console.log(`  created  ${result.data.id}  ${lot.title.slice(0, 60)}`);
    } catch (error) {
      // Printed, not thrown, so the rest of the set still lands.
      console.error(`  FAILED   ${lot.title.slice(0, 60)}\n           ${error.message}`);
    }
  }

  console.log(`\nDone — ${created}/${lots.length} created. Re-run with --clean --yes when finished.`);
}

async function clean(confirmed) {
  const username = usernameFromToken();
  const seededTitles = new Set(LOTS.map((lot) => lot.title));

  // Paginated because --stress can exceed one page, and bounded because an API that clamps an out-of-range page would loop forever.
  const MAX_PAGES = 50;
  const owned = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const response = await api(
      `/auction/profiles/${encodeURIComponent(username)}/listings?limit=100&page=${page}`
    );
    const rows = response.data || [];
    if (rows.length === 0) break;
    owned.push(...rows);
    if (!response.meta || response.meta.isLastPage !== false) break;
    if (page === MAX_PAGES) {
      console.warn(`Stopped after ${MAX_PAGES} pages. Re-run --clean to catch any remainder.`);
    }
  }

  const matches = owned.filter(
    (listing) =>
      typeof listing.title === 'string' &&
      (seededTitles.has(listing.title) || listing.title.startsWith(STRESS_PREFIX))
  );

  if (matches.length === 0) {
    console.log('Nothing to clean up — no seeded lots found on your profile.');
    return;
  }

  console.log(`Seeded lots found on @${username} (of ${owned.length} owned):\n`);
  matches.forEach((listing) => {
    console.log(`  ${listing.id}  ${listing.title}`);
  });

  if (!confirmed) {
    console.log(
      `\n${matches.length} listing(s) would be deleted. Re-run with --clean --yes to delete them.`
    );
    return;
  }

  console.log('');
  for (const listing of matches) {
    try {
      await api(`/auction/listings/${listing.id}`, { method: 'DELETE' });
      console.log(`  deleted  ${listing.title}`);
    } catch (error) {
      console.error(`  FAILED   ${listing.title}\n           ${error.message}`);
    }
  }
}

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const countArg = args.find((a) => a.startsWith('--count='));
const stressCount = countArg ? Number.parseInt(countArg.split('=')[1], 10) : DEFAULT_STRESS_COUNT;

if (!Number.isInteger(stressCount) || stressCount < 0) {
  console.error(`--count must be a non-negative integer, got: ${countArg}`);
  process.exit(1);
}

if (args.includes('--clean')) {
  // Cleanup always talks to the API, even to list.
  // --dry-run must never delete, so it downgrades --yes to listing-only.
  requireConfig();
  await ensureToken();

  if (dryRun && args.includes('--yes')) {
    console.log('--dry-run overrides --yes: listing what would be removed, deleting nothing.\n');
  }

  await clean(args.includes('--yes') && !dryRun);
} else if (args.includes('--stress')) {
  // A seeding dry run needs no credentials.
  if (!dryRun) {
    requireConfig();
    await ensureToken();
  }
  await seed([...LOTS, ...buildStressLots(stressCount)], { dryRun });
} else {
  if (!dryRun) {
    requireConfig();
    await ensureToken();
  }
  await seed(LOTS, { dryRun });
}

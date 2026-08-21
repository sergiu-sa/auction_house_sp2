#!/usr/bin/env node
/**
 * Seed short-duration auction listings.
 *
 * The shared Noroff pool has nothing closing inside a day — the soonest lot is
 * a week out — so anything time-sensitive ("Ending Soon", countdowns, the
 * "Next Closes" tile) has no data that exercises it. This creates a handful of
 * lots that close in hours instead, then cleans them up again.
 *
 * Usage:
 *   AUCTO_TOKEN=<token> node scripts/seed-ending-soon.mjs           # create
 *   AUCTO_TOKEN=<token> node scripts/seed-ending-soon.mjs --clean   # list what cleanup would remove
 *   AUCTO_TOKEN=<token> node scripts/seed-ending-soon.mjs --clean --yes   # actually remove them
 *
 * Get your token from the browser console while logged in to the app:
 *   copy(localStorage.getItem('token'))
 *
 * Cleanup only ever touches listings on your own profile whose titles match
 * the LOTS table below. Anything else you own is left alone.
 */

import { readFileSync } from 'node:fs';
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
const TOKEN = process.env.AUCTO_TOKEN;

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

function requireConfig() {
  const missing = [];
  if (!API_KEY) missing.push('VITE_API_KEY (from .env)');
  if (!TOKEN) missing.push('AUCTO_TOKEN (environment variable)');

  if (missing.length > 0) {
    console.error('Missing required config:');
    missing.forEach((item) => console.error(`  - ${item}`));
    console.error('\nGet your token from the browser console while logged in:');
    console.error("  copy(localStorage.getItem('token'))");
    process.exit(1);
  }
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
  if (process.env.AUCTO_USER) return process.env.AUCTO_USER;

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

async function seed() {
  console.log(`Creating ${LOTS.length} short-duration lots on ${BASE_URL}\n`);

  for (const lot of LOTS) {
    try {
      const created = await api('/auction/listings', {
        method: 'POST',
        body: JSON.stringify({
          title: lot.title,
          description: lot.description,
          tags: lot.tags,
          media: [
            {
              url: `https://picsum.photos/seed/${encodeURIComponent(lot.title)}/800/600`,
              alt: lot.title,
            },
          ],
          endsAt: endsAtFromNow(lot.hours),
        }),
      });

      console.log(`  created  closes in ${String(lot.hours).padStart(2)}h  ${lot.title}`);
      console.log(`           ${created.data.id}`);
    } catch (error) {
      console.error(`  FAILED   ${lot.title}\n           ${error.message}`);
    }
  }

  console.log('\nDone. Re-run with --clean when you are finished with them.');
}

async function clean(confirmed) {
  const username = usernameFromToken();
  const seededTitles = new Set(LOTS.map((lot) => lot.title));

  const response = await api(
    `/auction/profiles/${encodeURIComponent(username)}/listings?limit=100`
  );

  const matches = (response.data || []).filter((listing) =>
    seededTitles.has(listing.title)
  );

  if (matches.length === 0) {
    console.log('Nothing to clean up — no seeded lots found on your profile.');
    return;
  }

  console.log(`Seeded lots found on @${username}:\n`);
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

requireConfig();

const args = process.argv.slice(2);
if (args.includes('--clean')) {
  await clean(args.includes('--yes'));
} else {
  await seed();
}

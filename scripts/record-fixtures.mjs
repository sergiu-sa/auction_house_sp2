#!/usr/bin/env node
/**
 * Record the smoke suite's API fixtures, or check them against the live API.
 *
 * The suite in tests/e2e never reaches the network: every request is answered from tests/e2e/fixtures.
 * That is what makes a red run mean "we broke the code" rather than "the shared Noroff pool changed overnight".
 * The cost is that those files are frozen photographs, so nothing tells you when the API has moved underneath them —
 * which is what `--check` is for.
 *
 *   node scripts/record-fixtures.mjs --check          compare shapes, write nothing
 *   node scripts/record-fixtures.mjs                  re-record every listings fixture
 *   node scripts/record-fixtures.mjs --only=listings-active
 *
 * Only the listings fixtures are covered.
 * The profile and single-listing ones need a logged-in token, and the derived ones (listing-lowbid, listing-own, bid-created, error-500) describe states the live pool cannot produce — see the fixtures README.
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const FIXTURES = join(process.cwd(), 'tests', 'e2e', 'fixtures');

/**
 * Must match FROZEN_AT in tests/e2e/support/mock.ts.
 * Re-recording data whose endsAt values fall before this instant would hand the suite lots that are already closed at the clock it runs on.
 */
const FROZEN_AT = new Date('2026-08-22T15:30:00.000Z');

/** The account the suite signs in as; its name is not pseudonymised. */
const KEEP_NAME = 'Oltenks';

const RECORDABLE = {
  'listings-page':
    '/auction/listings?limit=50&sort=created&sortOrder=desc&_seller=true&_bids=true',
  'listings-active':
    '/auction/listings?limit=100&_active=true&_seller=true&_bids=true&sort=created&sortOrder=desc',
  'listings-ending-soon':
    '/auction/listings?limit=4&_active=true&sort=endsAt&sortOrder=asc&_seller=true&_bids=true',
  'listings-stats':
    '/auction/listings?limit=1&_active=true&sort=endsAt&sortOrder=asc',
  'listings-search-hit':
    '/auction/listings/search?limit=12&q=vintage&_seller=true&_bids=true',
};

/** Fixtures whose rows must all still be running at the frozen clock. */
const ACTIVE_ONLY = new Set(['listings-active', 'listings-ending-soon']);

function env() {
  const parsed = Object.fromEntries(
    readFileSync('.env', 'utf8')
      .split('\n')
      .filter((line) => line.includes('=') && !line.trim().startsWith('#'))
      .map((line) => [
        line.slice(0, line.indexOf('=')).trim(),
        line.slice(line.indexOf('=') + 1).trim(),
      ])
  );
  if (!parsed.VITE_API_KEY) {
    throw new Error('VITE_API_KEY missing from .env — see .env.example');
  }
  return {
    base: parsed.VITE_API_BASE_URL || 'https://v2.api.noroff.dev',
    key: parsed.VITE_API_KEY,
  };
}

const readFixture = (name) =>
  JSON.parse(readFileSync(join(FIXTURES, `${name}.json`), 'utf8'));

async function fetchJson(base, key, path) {
  const response = await fetch(base + path, {
    headers: { 'X-Noroff-API-Key': key },
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(
      `${response.status} on ${path}: ${body?.errors?.[0]?.message ?? 'unknown'}`
    );
  }
  return body;
}

// --- pseudonymisation -----------------------------------------------------

/**
 * Rebuild the alias map Phase 1A established, so a seller keeps the same SellerNN across every fixture.
 * Any listing or bid present in both a fixture and the live response reveals one pairing; the rest are allocated from the first free number.
 */
function buildAliasMap(liveResponses) {
  const realToAlias = new Map();
  const used = new Set();

  for (const file of readdirSync(FIXTURES).filter((f) => f.endsWith('.json'))) {
    const body = JSON.parse(readFileSync(join(FIXTURES, file), 'utf8'));
    const rows = Array.isArray(body.data) ? body.data : [body.data];
    for (const row of rows) {
      const names = [
        row?.seller?.name,
        ...(row?.bids ?? []).map((bid) => bid?.bidder?.name),
      ];
      for (const name of names) {
        const match = /^Seller(\d+)$/.exec(name ?? '');
        if (match) used.add(Number(match[1]));
      }
    }
  }

  for (const [name, live] of Object.entries(liveResponses)) {
    let fixture;
    try {
      fixture = readFixture(name);
    } catch {
      continue; // first recording of this fixture
    }
    const liveById = new Map((live.data ?? []).map((row) => [row.id, row]));
    for (const row of fixture.data ?? []) {
      const real = liveById.get(row.id);
      if (!real) continue;
      if (real.seller?.name && row.seller?.name) {
        realToAlias.set(real.seller.name, row.seller.name);
      }
      const aliasByBidId = new Map(
        (row.bids ?? []).map((bid) => [bid.id, bid?.bidder?.name])
      );
      for (const bid of real.bids ?? []) {
        const alias = aliasByBidId.get(bid.id);
        if (alias && bid.bidder?.name) realToAlias.set(bid.bidder.name, alias);
      }
    }
  }

  let next = Math.max(0, ...used) + 1;
  return (realName) => {
    if (!realName || realName === KEEP_NAME) return realName;
    if (!realToAlias.has(realName)) {
      while (used.has(next)) next++;
      used.add(next);
      realToAlias.set(realName, `Seller${next}`);
    }
    return realToAlias.get(realName);
  };
}

/** This repo is public and these are other students' accounts. */
function scrubUser(user, alias) {
  if (!user) return user;
  const name = alias(user.name);
  const swapName = (text) =>
    typeof text === 'string' && user.name
      ? text.split(user.name).join(name)
      : text;

  return {
    ...user,
    name,
    ...(user.email !== undefined && { email: 'redacted@stud.noroff.no' }),
    ...(user.avatar && {
      avatar: { ...user.avatar, alt: swapName(user.avatar.alt) },
    }),
    ...(user.banner && {
      banner: { ...user.banner, alt: swapName(user.banner.alt) },
    }),
  };
}

function scrubBody(body, alias) {
  return {
    ...body,
    data: (body.data ?? []).map((listing) => ({
      ...listing,
      seller: scrubUser(listing.seller, alias),
      bids: (listing.bids ?? []).map((bid) => ({
        ...bid,
        bidder: scrubUser(bid.bidder, alias),
      })),
    })),
  };
}

// --- shape comparison -----------------------------------------------------

/** Field paths and their types, so drift is reported without diffing volatile values. */
function shapeOf(value, path = '', seen = new Set()) {
  if (Array.isArray(value)) {
    value.slice(0, 3).forEach((item) => shapeOf(item, `${path}[]`, seen));
  } else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      shapeOf(child, path ? `${path}.${key}` : key, seen);
    }
  } else {
    seen.add(`${path}: ${value === null ? 'null' : typeof value}`);
  }
  return seen;
}

function compareShapes(name, live, fixture) {
  const liveShape = shapeOf(live);
  const fixtureShape = shapeOf(fixture);
  // A nullable field recorded as null shows up as a type change on a later recording, so match on the path and report the types together.
  const pathsOf = (shape) => {
    const map = new Map();
    for (const entry of shape) {
      const [p, t] = entry.split(': ');
      map.set(p, new Set([...(map.get(p) ?? []), t]));
    }
    return map;
  };
  const livePaths = pathsOf(liveShape);
  const fixturePaths = pathsOf(fixtureShape);

  const added = [...livePaths.keys()].filter((p) => !fixturePaths.has(p));
  const removed = [...fixturePaths.keys()].filter((p) => !livePaths.has(p));
  const retyped = [...livePaths.keys()]
    .filter((p) => fixturePaths.has(p))
    .filter((p) => {
      const l = livePaths.get(p);
      const f = fixturePaths.get(p);
      return ![...l].some((t) => f.has(t)) && !l.has('null') && !f.has('null');
    });

  return { name, added, removed, retyped };
}

// --- main -----------------------------------------------------------------

const args = process.argv.slice(2);
const isCheck = args.includes('--check');
const only = args.find((a) => a.startsWith('--only='))?.split('=')[1];
const targets = only ? { [only]: RECORDABLE[only] } : RECORDABLE;

if (only && !RECORDABLE[only]) {
  console.error(
    `Unknown fixture "${only}". Known: ${Object.keys(RECORDABLE).join(', ')}`
  );
  process.exit(1);
}

const { base, key } = env();
const live = {};
for (const [name, path] of Object.entries(targets)) {
  live[name] = await fetchJson(base, key, path);
}

if (isCheck) {
  console.log(
    `Comparing ${Object.keys(targets).length} fixture(s) with ${base}\n`
  );
  let drifted = 0;

  for (const name of Object.keys(targets)) {
    const fixture = readFixture(name);
    const { added, removed, retyped } = compareShapes(
      name,
      live[name],
      fixture
    );
    const liveCount = live[name].meta?.totalCount ?? live[name].data?.length;
    const fixtureCount = fixture.meta?.totalCount ?? fixture.data?.length;

    if (added.length || removed.length || retyped.length) {
      drifted++;
      console.log(`✗ ${name}`);
      if (added.length) console.log(`    new in API:  ${added.join(', ')}`);
      if (removed.length)
        console.log(`    gone from API: ${removed.join(', ')}`);
      if (retyped.length)
        console.log(`    type changed: ${retyped.join(', ')}`);
    } else {
      console.log(
        `✓ ${name}  (recorded totalCount ${fixtureCount}, live ${liveCount})`
      );
    }
  }

  console.log(
    drifted === 0
      ? '\nNo shape drift. Row counts differ because the pool is shared; that is expected and does not need a re-record.'
      : `\n${drifted} fixture(s) drifted. Re-record, then re-run the suite — assertions keyed to these shapes may need updating.`
  );
  process.exit(drifted === 0 ? 0 : 1);
}

const alias = buildAliasMap(live);
for (const name of Object.keys(targets)) {
  let body = live[name];

  if (ACTIVE_ONLY.has(name)) {
    const kept = body.data.filter((l) => new Date(l.endsAt) > FROZEN_AT);
    if (kept.length !== body.data.length) {
      console.warn(
        `  ${name}: dropped ${body.data.length - kept.length} lot(s) that close before FROZEN_AT`
      );
    }
    body = {
      ...body,
      data: kept,
      meta: { ...body.meta, totalCount: kept.length },
    };
  }

  const scrubbed = scrubBody(body, alias);
  writeFileSync(
    join(FIXTURES, `${name}.json`),
    JSON.stringify(scrubbed, null, 2) + '\n'
  );

  const leaked = JSON.stringify(scrubbed).match(/@stud\.noroff\.no/g) ?? [];
  const redacted =
    JSON.stringify(scrubbed).match(/redacted@stud\.noroff\.no/g) ?? [];
  console.log(
    `wrote ${name}.json — ${scrubbed.data.length} rows, ${leaked.length - redacted.length} un-redacted email(s)`
  );
}

console.log(
  `\nRe-recorded against a live pool that has moved since ${FROZEN_AT.toISOString()}.\n` +
    'Run `npm run test:e2e` — the exact counts in home.spec.ts and collection.spec.ts are\n' +
    'keyed to this data and will need updating. If you re-recorded everything, FROZEN_AT in\n' +
    'tests/e2e/support/mock.ts should move to now.'
);

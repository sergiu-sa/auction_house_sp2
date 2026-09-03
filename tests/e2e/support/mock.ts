/// <reference types="node" />
// Root tsconfig sets types: ["vite/client"]; this file runs in Node.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Page, Route, Request } from '@playwright/test';

// From the repo root: avoids __dirname/import.meta ambiguity in an ESM package.
const FIXTURES = join(process.cwd(), 'tests', 'e2e', 'fixtures');
const ASSETS = join(process.cwd(), 'tests', 'e2e', 'assets');

/**
 * When the fixtures were recorded.
 * Every test freezes the page clock here, which stops the recorded `endsAt` values decaying and keeps countdowns constant.
 */
export const FROZEN_AT = new Date('2026-08-22T15:30:00.000Z');

export const IDS = {
  /** Another seller's; highest bid 1000, above the test user's 968 credits. */
  otherSeller: '3493a610-af8a-4028-bb55-a181f8ab3801',
  /** Highest bid 100, so a bid is reachable. Derived fixture. */
  lowBid: 'c0ffee00-1111-4222-8333-444455556666',
  /** The test user's own, so listing-edit survives requireOwnership(). */
  own: '1b22b753-d3d0-418f-8ec1-b6a1e344cbb3',
  /** In no fixture; exercises the 404 branch. */
  missing: '00000000-0000-4000-8000-000000000000',
};

/** One recorded fixture, parsed. Exported so a spec overriding a route reads from the same place this server does, rather than re-deriving the path. */
export function loadFixture<T = unknown>(name: string): T {
  return JSON.parse(readFileSync(join(FIXTURES, `${name}.json`), 'utf8')) as T;
}

const json = (name: string): unknown => loadFixture(name);

/** 1x1 #e2e8f0 PNG behind every listing image.
 * Grey, not the copy-paste "transparent" pixel, which is half-opaque green and floods the baselines. */
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADklEQVR4AWJ69OLDfwAAAAD//w4k+LAAAAAGSURBVAMACS4DvBBD42oAAAAASUVORK5CYII=',
  'base64'
);

export type ListingsMode = 'default' | 'empty' | 'error';

export interface MockController {
  /** Requests no handler expected. Empty means the mocking is complete. */
  unexpected: string[];
  /** console.error text and uncaught page errors, in order. */
  consoleErrors: string[];
  /** Non-GET API calls, as "METHOD /path". Proves a guard stopped a write. */
  apiWrites: string[];
}

interface Options {
  listings?: ListingsMode;
}

const LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//;

/**
 * Serve every request from disk.
 * Two rules keep this trustworthy:
 * fulfil, never abort (an aborted subresource logs a console error and would  trip the zero-console-errors assertion);
 *  and record anything unclaimed in `unexpected`, which fails the test on teardown.
 */
export async function installMocks(
  page: Page,
  options: Options = {}
): Promise<MockController> {
  const mode: ListingsMode = options.listings ?? 'default';
  const controller: MockController = {
    unexpected: [],
    consoleErrors: [],
    apiWrites: [],
  };

  page.on('console', (msg) => {
    if (msg.type() === 'error') controller.consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) =>
    controller.consoleErrors.push(`pageerror: ${err.message}`)
  );

  // First, so the handlers below win: routes match in reverse registration order.
  await page.route('**/*', async (route: Route, request: Request) => {
    const url = request.url();
    if (LOCAL.test(url)) return route.continue();

    const path = new URL(url).pathname;

    // Vendored assets, referenced relatively from the stylesheets below.
    if (path.startsWith('/e2e-assets/'))
      return serveAsset(route, path.slice('/e2e-assets/'.length));

    if (request.resourceType() === 'image') {
      return route.fulfill({
        status: 200,
        contentType: 'image/png',
        body: PIXEL,
      });
    }
    if (request.resourceType() === 'font') {
      return route.fulfill({
        status: 200,
        contentType: 'font/woff2',
        body: Buffer.alloc(0),
      });
    }

    controller.unexpected.push(`${request.method()} ${url}`);
    return route.fulfill({ status: 200, contentType: 'text/plain', body: '' });
  });

  await page.route('**/fonts.googleapis.com/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/css',
      body: readFileSync(join(ASSETS, 'gf-latin.css')),
    })
  );

  // No cdnjs route: the icon font is self-hosted and same-origin, so the preview server serves it.
  // `fa-all.min.css` and `fa-solid-900.woff2` stay in ASSETS;
  //   they are what scripts/build-icon-font.mjs subsets and what tests/icons.test.ts resolves names against.

  // After the host handlers so it wins for them:
  //  the stylesheets reference these relatively, so requests land on cdnjs/gstatic rather than our own origin.
  await page.route('**/e2e-assets/**', (route, request) =>
    serveAsset(route, new URL(request.url()).pathname.split('/e2e-assets/')[1])
  );

  const api = (route: Route, request: Request): Promise<void> => {
    if (request.method() !== 'GET') {
      controller.apiWrites.push(
        `${request.method()} ${new URL(request.url()).pathname}`
      );
    }
    return serveApi(route, request, mode, controller);
  };

  await page.route('**/v2.api.noroff.dev/**', api);
  // By path too, so a changed VITE_API_BASE_URL cannot silently un-mock us.
  await page.route('**/auction/**', api);

  return controller;
}

function serveAsset(route: Route, file: string): Promise<void> {
  const contentType = file.endsWith('.css') ? 'text/css' : 'font/woff2';
  try {
    return route.fulfill({
      status: 200,
      contentType,
      body: readFileSync(join(ASSETS, file)),
    });
  } catch {
    // FA references faces we did not vendor.
    // An empty 200 is silent; abort is not.
    return route.fulfill({ status: 200, contentType, body: Buffer.alloc(0) });
  }
}

function ok(route: Route, body: unknown): Promise<void> {
  return route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

interface FixtureListing {
  tags?: string[];
}

/**
 * Serve one page of a fixture, applying `_tag` and rewriting `meta` to describe the whole set rather than the slice.
 *
 * The mock has to paginate because the app now does:
 *  returned whole, page 2 would be identical to page 1 and the pagination assertions would pass on a broken layer.
 * Recorded fixtures hold fewer rows than their own totalCount (50 of 3,200), so pages past the recorded rows come back short — tests stay near the front.
 * A tag filter can only be counted over what was recorded, so it replaces totalCount; without one the fixture keeps standing in for the larger set.
 */
function listingsPage(fixture: string, q: URLSearchParams): unknown {
  const body = json(fixture) as {
    data: FixtureListing[];
    meta?: { totalCount?: number };
  };

  const tag = q.get('_tag');
  const rows = tag
    ? body.data.filter((listing) =>
        listing.tags?.some((t) => t.toLowerCase() === tag.toLowerCase())
      )
    : body.data;

  const limit = Number(q.get('limit') ?? '100') || 100;
  const page = Number(q.get('page') ?? '1') || 1;
  const totalCount = tag ? rows.length : (body.meta?.totalCount ?? rows.length);
  const pageCount = Math.max(1, Math.ceil(totalCount / limit));

  return {
    data: rows.slice((page - 1) * limit, page * limit),
    meta: {
      isFirstPage: page === 1,
      isLastPage: page >= pageCount,
      currentPage: page,
      previousPage: page > 1 ? page - 1 : null,
      nextPage: page < pageCount ? page + 1 : null,
      pageCount,
      totalCount,
    },
  };
}

function serveApi(
  route: Route,
  request: Request,
  mode: ListingsMode,
  controller: MockController
): Promise<void> {
  const url = new URL(request.url());
  const path = url.pathname;
  const q = url.searchParams;

  // --- bids ---------------------------------------------------------------
  const bidsMatch = path.match(/^\/auction\/listings\/([^/]+)\/bids$/);
  if (bidsMatch) {
    if (request.method() === 'POST') return ok(route, json('bid-created'));
    const listing = listingById(bidsMatch[1]) as {
      data?: { bids?: unknown[] };
    } | null;
    return ok(route, { data: listing?.data?.bids ?? [], meta: {} });
  }

  // Before the single-listing regex, which would match id === 'search' and 404.
  if (path === '/auction/listings/search')
    return ok(route, listingsPage('listings-search-hit', q));

  // --- single listing -----------------------------------------------------
  const singleMatch = path.match(/^\/auction\/listings\/([^/]+)$/);
  if (singleMatch) {
    const listing = listingById(singleMatch[1]);
    if (!listing) {
      return route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify(json('listing-404')),
      });
    }
    return ok(route, listing);
  }

  // --- listings collection ------------------------------------------------
  if (path === '/auction/listings') {
    if (mode === 'error') {
      return route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify(json('error-500')),
      });
    }
    if (mode === 'empty') return ok(route, json('listings-empty'));

    // Collection's stats tile asks for one row and reads meta.totalCount.
    if (q.get('limit') === '1') return ok(route, json('listings-stats'));
    // Home's Ending Soon asks for the four soonest active lots.
    if (q.get('sort') === 'endsAt' && q.get('_active') === 'true') {
      return ok(route, json('listings-ending-soon'));
    }
    // The active pool, and any catalog page narrowed to active lots.
    if (q.get('_active') === 'true') {
      return ok(route, listingsPage('listings-active', q));
    }
    return ok(route, listingsPage('listings-page', q));
  }

  // --- profiles -----------------------------------------------------------
  const profileMatch = path.match(
    /^\/auction\/profiles\/([^/]+)(?:\/(listings|bids|wins))?$/
  );
  if (profileMatch) {
    const sub = profileMatch[2];
    if (sub === 'listings') return ok(route, json('profile-listings'));
    if (sub === 'bids') return ok(route, json('profile-bids'));
    if (sub === 'wins') return ok(route, json('profile-wins'));
    return ok(route, json('profile'));
  }

  // Unclaimed path: record it, or a renamed endpoint leaves specs green against
  // silently empty data.
  controller.unexpected.push(`${request.method()} ${path}`);
  return ok(route, { data: [], meta: {} });
}

function listingById(id: string): unknown | null {
  if (id === IDS.otherSeller) return json('listing-single');
  if (id === IDS.lowBid) return json('listing-lowbid');
  if (id === IDS.own) return json('listing-own');
  return null;
}

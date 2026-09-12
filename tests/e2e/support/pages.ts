import { IDS } from './mock';

/**
 * The eight page entries, shared by the specs that sweep all of them.
 *
 * One declaration because two had already drifted:
 *  `pages.spec.ts` and `a11y.spec.ts` each carried a `PageCase` and a copy of these lists, identical in every `name`/`url`/`ready` triple, and the type diverged the moment one of them needed a field the other did not.
 *
 * `visual.spec.ts` deliberately does **not** use this.
 * Its membership is genuinely different (a no-media lot, and Home twice under two auth states under different snapshot names);
 *  and its`name` is a snapshot key rather than a label.
 * Bending it onto this list would produce a config object whose only job is to describe how the two sets differ, which is the shape being removed.
 */
export interface PageCase {
  name: string;
  url: string;
  /** Something only that page renders, proving it got past its data load. */
  ready: string;
  /**
   * How many `input[type=search]` this page must carry.
   * A field rather than a lookup table: `tsconfig` has no `noUncheckedIndexedAccess`, so a name-keyed map types as `number` even when the key is missing, and a rename would quietly assert `toHaveCount(undefined)` instead of failing to compile.
   */
  searchFields: number;
}

export const PUBLIC_PAGES: PageCase[] = [
  { name: 'home', url: '/index.html', ready: '#hero-mosaic', searchFields: 1 },
  {
    name: 'collection',
    url: '/collection.html',
    ready: '#collection-cards-grid',
    searchFields: 1,
  },
  {
    name: 'listing detail',
    url: `/listing.html?id=${IDS.otherSeller}`,
    ready: '#listing-details',
    searchFields: 0,
  },
  {
    name: 'login',
    url: '/login.html',
    ready: '#login-form',
    searchFields: 0,
  },
  {
    name: 'register',
    url: '/register.html',
    ready: '#register-form',
    searchFields: 0,
  },
];

/**
 * Signed in, login and register redirect to index.html, so including them would silently measure Home twice rather than the auth pages.
 * Named rather than sliced positionally:
 *  a sixth public page inserted above would move the boundary and quietly change what every signed-in loop covers.
 */
export const PUBLIC_PAGES_WHEN_SIGNED_IN = PUBLIC_PAGES.filter(
  (page_) => !['login', 'register'].includes(page_.name)
);

export const GATED_PAGES: PageCase[] = [
  {
    name: 'profile',
    url: '/profile.html',
    ready: '#profile-content',
    searchFields: 0,
  },
  {
    name: 'listing create',
    url: '/listing-create.html',
    ready: '#create-listing-content',
    searchFields: 0,
  },
  {
    name: 'listing edit',
    url: `/listing-edit.html?id=${IDS.own}`,
    ready: '#edit-listing-content',
    searchFields: 0,
  },
];

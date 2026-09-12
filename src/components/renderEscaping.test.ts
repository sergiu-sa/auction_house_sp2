import { describe, it, expect } from 'vitest';
import type { Listing } from '../types/api';
import { createCollectionCard } from './CollectionCard';
import { createQuickCard } from './QuickCard';
import { createProductCard } from './ProductCard';
import { renderFeaturedWin } from './FeaturedWin';
import { renderBreadcrumb, BREADCRUMB_PRESETS } from './Breadcrumb';
import { renderHeader } from './Navbar';
import { renderAvatar } from './Avatar';
import { renderErrorPanel } from './ErrorPanel';
import { mountNextPageCell } from './NextPageCell';
import {
  renderCatalogFilterBar,
  syncCatalogFilterBar,
} from './filters/CatalogFilterBar';
import type { CatalogFilterState } from '../utils/catalogState';

// Hostile listing catches escaping failures before production.
// Payload breaks out of attributes AND injects scripts to exercise both contexts.
const PAYLOAD =
  'Lot" onerror="window.__XSS=1" data-pwned="1"><script>window.__XSS=1</script>';

// A URL-shaped payload, for the sinks that take media[].url rather than a title.
const URL_PAYLOAD =
  'https://example.invalid/a.jpg" onload="window.__XSS=1" data-pwned="1';

function hostileListing(): Listing {
  return {
    id: 'abcdef01-2345-6789-abcd-ef0123456789',
    title: PAYLOAD,
    description: PAYLOAD,
    media: [
      { url: URL_PAYLOAD, alt: PAYLOAD },
      { url: URL_PAYLOAD, alt: PAYLOAD },
    ],
    tags: [PAYLOAD],
    created: '2026-08-01T00:00:00.000Z',
    updated: '2026-08-01T00:00:00.000Z',
    endsAt: '2099-01-01T00:00:00.000Z',
    _count: { bids: 3 },
    bids: [
      {
        id: 'bid-1',
        amount: 120,
        created: '2026-08-02T00:00:00.000Z',
        bidder: {
          name: PAYLOAD,
          email: 'a@stud.noroff.no',
          avatar: { url: URL_PAYLOAD },
        },
      },
    ],
    seller: {
      name: PAYLOAD,
      email: 'seller@stud.noroff.no',
      bio: PAYLOAD,
      avatar: { url: URL_PAYLOAD, alt: PAYLOAD },
      _count: { listings: 2, wins: 1 },
    },
  };
}

/**
 * Parse the markup and assert nothing the payload carried survived as structure.
 *
 * This used to end by dispatching `error` and `load` at every element and checking a global the
 * payloads set, on the stated grounds that it "actively tries to fire anything the payload could
 * have attached". **That assertion could not fail.** jsdom compiles an inline `onerror` from
 * `innerHTML` into a real function — `typeof img.onerror === 'function'` — but never runs its body
 * without `runScripts: 'dangerously'`, which this suite does not set. Measured 2026-09-10.
 *
 * So the handler check is structural now: no element may carry *any* `on*` attribute. That is
 * strictly wider than the old one, and it does not depend on the payload naming a global or
 * carrying `data-pwned` — a case written with its own payload used to pass over a sink that was
 * deliberately left unescaped.
 */
function assertInert(markup: string): void {
  const host = document.createElement('div');
  host.innerHTML = markup;

  expect(host.querySelector('[data-pwned]')).toBeNull();
  expect(host.querySelector('script')).toBeNull();
  expect(host.querySelector('iframe')).toBeNull();

  const handlers = Array.from(host.querySelectorAll('*')).flatMap((el) =>
    Array.from(el.attributes)
      .filter((attr) => attr.name.startsWith('on'))
      .map((attr) => `<${el.tagName.toLowerCase()} ${attr.name}>`)
  );
  expect(handlers).toEqual([]);
}

describe('components are inert against a hostile listing', () => {
  it('Avatar, with a hostile picture url and name', () => {
    // Every identity surface routes through this now, so it is the one sink for all of them.
    assertInert(
      renderAvatar({
        url: '" onerror="globalThis.__XSS = 1" data-x="',
        name: '"><script>globalThis.__XSS = 1</script>',
        sizeClass: 'h-10 w-10',
        textClass: 'text-sm',
        borderStyle: 'border: 2px solid #475569',
      })
    );
  });

  it('Avatar, with no picture at all', () => {
    assertInert(
      renderAvatar({
        url: undefined,
        name: '"><img src=x onerror="globalThis.__XSS = 1">',
        sizeClass: 'h-10 w-10',
        textClass: 'text-sm',
      })
    );
  });

  it('Avatar, with a hostile alt', () => {
    // The one field the first pass of these tests missed:
    //  `alt` is caller-supplied, but two of the five call sites hand it a seller or winner name straight from the API.
    assertInert(
      renderAvatar({
        url: 'https://example.test/a.jpg',
        name: 'Seller',
        sizeClass: 'h-10 w-10',
        textClass: 'text-sm',
        alt: '" onerror="globalThis.__XSS = 1" data-x="',
      })
    );
  });

  it('CollectionCard, grid variant', () => {
    assertInert(createCollectionCard(hostileListing(), 'grid'));
  });

  it('CollectionCard, list variant', () => {
    assertInert(createCollectionCard(hostileListing(), 'list'));
  });

  it('QuickCard', () => {
    assertInert(createQuickCard(hostileListing()));
  });

  it('ProductCard', () => {
    assertInert(createProductCard(hostileListing()));
  });

  it('FeaturedWin', () => {
    assertInert(
      renderFeaturedWin({
        lotNumber: '789',
        title: PAYLOAD,
        finalPrice: 500,
        bidCount: 3,
        description: PAYLOAD,
        winner: { username: PAYLOAD, avatar: URL_PAYLOAD, verified: false },
        isUserWin: false,
        isEnded: true,
      })
    );
  });

  it('Breadcrumb, carrying a listing title', () => {
    assertInert(
      renderBreadcrumb({ items: BREADCRUMB_PRESETS.listingDetail(PAYLOAD) })
    );
  });

  it('CatalogFilterBar, as rendered', () => {
    assertInert(renderCatalogFilterBar());
  });

  /**
   * The bar's markup carries no API data, so the static render above can only ever pass.
   * Its one route for user data is the search term arriving through `syncCatalogFilterBar`, which reaches the field as a `value` property rather than markup;
   *   assert that, so a rewrite of the setter into an `innerHTML` write is caught here.
   */
  it('CatalogFilterBar, syncing a hostile search term', () => {
    document.body.innerHTML = renderCatalogFilterBar();
    const state: CatalogFilterState = {
      page: 1,
      itemsPerPage: 23,
      viewMode: 'grid',
      category: 'all',
      sort: 'created',
      sortOrder: 'desc',
      activeOnly: false,
      search: PAYLOAD,
    };

    syncCatalogFilterBar(state, { ...state, search: '' });

    const field = document.getElementById(
      'catalog-search-input'
    ) as HTMLInputElement;
    expect(field.value).toBe(PAYLOAD);
    assertInert(document.body.innerHTML);
  });

  /**
   * The cell renders no listing data, its only interpolations are page numbers and the container id it was handed.
   * Asserted anyway, because the container id reaches an `id` and a `for` attribute, and a component that grows a data-carrying field later should fail here.
   */
  it('NextPageCell, mounted mid-catalog', () => {
    document.body.innerHTML = '<div id="grid"></div>';
    mountNextPageCell({
      containerId: 'grid',
      currentPage: 2,
      totalPages: 140,
      cardCount: 23,
      onPageChange: () => {},
    });
    assertInert(document.getElementById('grid')!.innerHTML);
  });

  it('NextPageCell, on the last page', () => {
    document.body.innerHTML = '<div id="grid"></div>';
    mountNextPageCell({
      containerId: 'grid',
      currentPage: 140,
      totalPages: 140,
      cardCount: 23,
      onPageChange: () => {},
    });
    assertInert(document.getElementById('grid')!.innerHTML);
  });

  it('Navbar, carrying a stored user name and avatar', async () => {
    localStorage.clear();
    // Has to be JWT-shaped:
    //  isAuthenticated clears a malformed token, and renderHeader would then draw the logged-out navbar, which carries no user data for assertInert to inspect.
    localStorage.setItem('token', 'header.payload.signature');
    localStorage.setItem('tokenTimestamp', String(Date.now()));
    localStorage.setItem(
      'user',
      JSON.stringify({
        name: PAYLOAD,
        email: 'user@stud.noroff.no',
        credits: 1000,
        avatar: { url: URL_PAYLOAD },
      })
    );
    document.body.innerHTML = '<div id="header"></div>';
    document.body.removeAttribute('data-page-type');

    renderHeader();

    const markup = document.getElementById('header')!.innerHTML;
    // The logged-out navbar carries no user data at all, so assertInert would pass on it either way.
    // Prove the hostile name reached the markup before asserting it landed inert.
    expect(markup).toContain('Lot&quot;');
    assertInert(markup);
    localStorage.clear();
  });

  // PAYLOAD and URL_PAYLOAD, not a payload written for this case.
  // Every other case here uses them, and a case that invents its own is how the gap in the old
  // `assertInert` was found: it depended on the payload carrying `data-pwned`.
  it('ErrorPanel, with a hostile message', () => {
    // Server-controlled text:
    // the message is whatever came back in the API's `errors[]`, landing in innerHTML on four pages.
    assertInert(renderErrorPanel({ message: PAYLOAD }));
  });

  it('ErrorPanel, with a hostile action label and destination', () => {
    assertInert(
      renderErrorPanel({
        message: PAYLOAD,
        action: { label: PAYLOAD, href: URL_PAYLOAD },
      })
    );
  });
});

// The other half of the contract:
//  escaping must not make ordinary listings render entity text.
// A title with an ampersand is the common case.
describe('components render ordinary punctuation unchanged', () => {
  const benign = (): Listing => ({
    ...hostileListing(),
    title: "Tom & Jerry cel — Don't Look Now",
    description: 'Widths < 40cm & > 20cm',
    media: [{ url: 'https://example.invalid/a.jpg', alt: 'Ceramic vase' }],
    tags: ['art & design'],
    seller: { name: 'someseller', email: 'seller@stud.noroff.no' },
  });

  it('shows an ampersand in a title as one character, not an entity', () => {
    const host = document.createElement('div');
    host.innerHTML = createCollectionCard(benign(), 'grid');

    expect(host.textContent).toContain("Tom & Jerry cel — Don't Look Now");
    expect(host.textContent).not.toContain('&amp;');
  });

  it('keeps a media alt readable in the attribute', () => {
    const host = document.createElement('div');
    host.innerHTML = createCollectionCard(benign(), 'grid');

    expect(host.querySelector('img')!.getAttribute('alt')).toBe('Ceramic vase');
  });

  it('keeps the description readable', () => {
    const host = document.createElement('div');
    host.innerHTML = createProductCard(benign());

    expect(host.textContent).toContain('Widths < 40cm & > 20cm');
  });

  // srcset is built from the image URL, so it carries the query string's ampersands.
  // Escaped they read as &amp; in the raw attribute, which looks broken and is not;
  //  the parser hands the browser the original URL back.
  // Do not "fix" this by dropping the escaping.
  it('leaves a multi-URL srcset usable after escaping', () => {
    const url = 'https://images.unsplash.com/photo-123?q=80&fm=jpg';
    const host = document.createElement('div');
    host.innerHTML = createCollectionCard(
      { ...benign(), media: [{ url, alt: 'Vase' }] },
      'grid'
    );

    const img = host.querySelector('img')!;
    expect(img.getAttribute('src')).toBe(url);

    const srcset = img.getAttribute('srcset');
    if (srcset) {
      expect(srcset).toContain('&fm=jpg');
      expect(srcset).not.toContain('&amp;');
    }
  });
});

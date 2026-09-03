import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Listing } from '../types/api';
import { createCollectionCard } from './CollectionCard';
import { createQuickCard } from './QuickCard';
import { createProductCard } from './ProductCard';
import { renderFeaturedWin } from './FeaturedWin';
import { renderBreadcrumb, BREADCRUMB_PRESETS } from './Breadcrumb';
import { renderHeader } from './Navbar';

/**
 * The tripwire for the escaping work: every component that renders user-controlled data is fed a hostile listing and the resulting DOM is inspected.
 * A sink added later without escaping fails here rather than in production.
 */

// Breaks out of a quoted attribute AND injects a script in text context, so one string exercises both contexts wherever it lands.
const PAYLOAD =
  'Lot" onerror="window.__XSS=1" data-pwned="1"><script>window.__XSS=1</script>';

// A URL-shaped payload, for the sinks that take media[].url rather than a title.
const URL_PAYLOAD =
  'https://example.invalid/a.jpg" onload="window.__XSS=1" data-pwned="1';

declare global {
  var __XSS: number | undefined;
}

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
 * Parse the markup, then actively try to fire anything the payload could have attached.
 * Checking the attribute list alone would miss a handler bound under a name the assertion did not think to look for.
 */
function assertInert(markup: string): void {
  const host = document.createElement('div');
  host.innerHTML = markup;

  expect(host.querySelector('[data-pwned]')).toBeNull();
  expect(host.querySelector('script')).toBeNull();
  expect(host.querySelector('iframe')).toBeNull();

  for (const el of Array.from(host.querySelectorAll('*'))) {
    el.dispatchEvent(new Event('error'));
    el.dispatchEvent(new Event('load'));
  }

  expect(globalThis.__XSS).toBeUndefined();
}

describe('components are inert against a hostile listing', () => {
  beforeEach(() => {
    globalThis.__XSS = undefined;
  });

  afterEach(() => {
    globalThis.__XSS = undefined;
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
    document.body.setAttribute('data-page-type', 'browse');

    renderHeader();

    const markup = document.getElementById('header')!.innerHTML;
    // The logged-out navbar carries no user data at all, so assertInert would pass on it either way.
    // Prove the hostile name reached the markup before asserting it landed inert.
    expect(markup).toContain('Lot&quot;');
    assertInert(markup);
    localStorage.clear();
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

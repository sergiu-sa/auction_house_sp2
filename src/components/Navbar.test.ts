import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHeader } from './Navbar';
import { invalidateProfileCache } from '../utils/profileCache';

// Guards the mobile menu: closed = display:none (so it can't create horizontal
// page overflow), and the hamburger opens it / the backdrop closes it.
describe('mobile menu', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '<div id="header"></div>';
    document.body.setAttribute('data-page-type', 'browse');
  });

  it('is fully hidden (out of layout) when closed', async () => {
    renderHeader();

    const drawer = document.getElementById('mobile-menu-drawer');
    const overlay = document.getElementById('mobile-menu-overlay');

    expect(drawer).not.toBeNull();
    expect(overlay).not.toBeNull();
    expect(drawer!.classList.contains('hidden')).toBe(true);
    expect(overlay!.classList.contains('hidden')).toBe(true);
    // No off-canvas transform left behind that could push the page.
    expect(drawer!.classList.contains('translate-x-full')).toBe(false);
  });

  it('opens on hamburger click and closes via the backdrop', async () => {
    renderHeader();

    const btn = document.getElementById('mobile-menu-btn')!;
    const drawer = document.getElementById('mobile-menu-drawer')!;
    const overlay = document.getElementById('mobile-menu-overlay')!;

    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(drawer.classList.contains('hidden')).toBe(false);
    expect(overlay.classList.contains('hidden')).toBe(false);
    expect(btn.getAttribute('aria-expanded')).toBe('true');

    overlay.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(drawer.classList.contains('hidden')).toBe(true);
    expect(overlay.classList.contains('hidden')).toBe(true);
    expect(btn.getAttribute('aria-expanded')).toBe('false');
  });
});

/**
 * renderHeader() rewrites the whole of #header, and ProfilePage calls it a second time after a profile save.
 * The listeners it binds on `document` have no owner to remove them, so binding them per render leaked one of each per call, attached to a detached navbar.
 *
 * Counted, not inspected: an inspection is what let the leak stand for two phases.
 *
 * Each test re-imports the module, because the bind-once guards are module state;
 *  without the reset an earlier test has already tripped them and the counts sit at zero whether or not the leak exists, which is a test that passes either way.
 */
describe('document-level listeners across repeated renders', () => {
  let addSpy: ReturnType<typeof vi.spyOn>;
  let counts: Record<string, number>;

  async function freshNavbar(): Promise<typeof import('./Navbar')> {
    vi.resetModules();
    return import('./Navbar');
  }

  function countAddEventListener(): void {
    counts = {};
    const original = document.addEventListener.bind(document);
    addSpy = vi
      .spyOn(document, 'addEventListener')
      .mockImplementation((type: string, ...rest: unknown[]) => {
        counts[type] = (counts[type] || 0) + 1;
        return (original as (...a: unknown[]) => void)(type, ...rest);
      });
  }

  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '<div id="header"></div>';

    // A signed-in navbar is what binds the profile-menu pair;
    //  the guest variant has no profile menu at all.
    // The token has to be JWT-shaped or isAuthenticated() clears it.
    localStorage.setItem('token', 'header.payload.signature');
    localStorage.setItem('tokenTimestamp', String(Date.now()));
    localStorage.setItem(
      'user',
      JSON.stringify({
        name: 'tester',
        email: 'tester@stud.noroff.no',
        credits: 1000,
      })
    );

    // Unstubbed, the profile fetch reaches the network, 401s, and handleUnauthorized() clears auth;
    //   so renders 2+ would draw the guest navbar and bind nothing, and the count would sit flat whether or not the leak existed.
    // That happened while measuring it.
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              data: {
                name: 'tester',
                email: 'tester@stud.noroff.no',
                credits: 1000,
              },
              meta: {},
            }),
            { status: 200, headers: { 'content-type': 'application/json' } }
          )
      )
    );
  });

  afterEach(() => {
    addSpy?.mockRestore();
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('binds click and keydown once, however many times the header renders', async () => {
    document.body.setAttribute('data-page-type', 'user-content');
    const { renderHeader: render } = await freshNavbar();
    countAddEventListener();

    render();
    // Guards the fixture, not the code: a guest navbar binds nothing and would pass.
    expect(document.getElementById('profile-menu-btn')).not.toBeNull();
    expect(counts.click).toBe(1);
    expect(counts.keydown).toBe(1);

    render();
    render();

    expect(document.getElementById('profile-menu-btn')).not.toBeNull();
    expect(counts.click).toBe(1);
    expect(counts.keydown).toBe(1);
  });

  it('still closes the dropdown after a re-render, on Escape and on an outside click', async () => {
    document.body.setAttribute('data-page-type', 'user-content');
    const { renderHeader: render } = await freshNavbar();

    render();
    // The handlers must act on the current navbar, not the one they were bound alongside.
    render();

    const btn = document.getElementById('profile-menu-btn')!;
    const menu = document.getElementById('profile-dropdown-menu')!;

    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(menu.classList.contains('hidden')).toBe(false);
    expect(btn.getAttribute('aria-expanded')).toBe('true');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(menu.classList.contains('hidden')).toBe(true);
    expect(btn.getAttribute('aria-expanded')).toBe('false');

    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(menu.classList.contains('hidden')).toBe(false);

    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(menu.classList.contains('hidden')).toBe(true);
    expect(btn.getAttribute('aria-expanded')).toBe('false');
  });
});

/**
 * The one routing decision `renderHeader` still makes.
 *
 * It used to pick between three variants and `isBrowsePage`/`isCatalogPage` were unit-tested;
 *  those went with the search-carrying variant, and this replaces that coverage rather than leaving the surviving branch to the visual project, which `playwright.config.ts` keeps out of CI.
 *
 * It matters beyond the markup: `body[data-page-type='auth'] #header` reserves 101px against a non-auth header measured at 191px, so an auth page rendering the main navbar would ship exactly the first-paint shift that reservation exists to prevent.
 *
 * Asserted on what each variant uniquely renders, not on a count of navs, both render one.
 */
/** The banner's own sentence.
 * "Browsing as Guest" is one letter off the auth navbar's "Browse as Guest" link, so matching on that would pass on the wrong element. */
const GUEST_BANNER = 'You can explore auctions, but you need an account';

describe('which navbar a page gets', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '<div id="header"></div>';
    // Removed, not set:
    //  every test below supplies its own, and leaving the last one's value on <body> makes the following describe depend on happening to overwrite it.
    document.body.removeAttribute('data-page-type');
  });

  it('gives the auth pages the minimal navbar, with no nav links', () => {
    document.body.setAttribute('data-page-type', 'auth');
    renderHeader();

    const header = document.getElementById('header')!;
    expect(header.textContent).toContain('Browse as Guest');
    expect(header.querySelector('a[href="/collection.html"]')).toBeNull();
    expect(header.querySelector('#mobile-menu-drawer')).toBeNull();
  });

  /**
   * The other half of the same branch, and it was asserted nowhere.
   *
   * Mutation-checked: dropping `&& !isAuthPage` from the banner's condition left all 445 unit and 140 smoke tests green.
   * A guest on login.html would then get the banner inside a header reserved at 101px, shipping the first-paint shift that reservation exists to prevent.
   */
  it('suppresses the guest banner on an auth page, logged out', () => {
    document.body.setAttribute('data-page-type', 'auth');
    renderHeader();

    expect(document.getElementById('header')!.textContent).not.toContain(
      GUEST_BANNER
    );
  });

  it('still shows it to a guest anywhere else, so the check above cannot pass vacuously', () => {
    document.body.setAttribute('data-page-type', 'browse');
    renderHeader();

    expect(document.getElementById('header')!.textContent).toContain(
      GUEST_BANNER
    );
  });

  it('gives every other page type the same main navbar', () => {
    for (const pageType of ['browse', 'user-content']) {
      document.body.setAttribute('data-page-type', pageType);
      document.body.innerHTML = '<div id="header"></div>';
      renderHeader();

      const header = document.getElementById('header')!;
      expect(
        header.querySelector('a[href="/collection.html"]'),
        pageType
      ).not.toBeNull();
      expect(
        header.querySelector('#mobile-menu-drawer'),
        pageType
      ).not.toBeNull();
      expect(header.textContent, pageType).not.toContain('Browse as Guest');
    }
  });

  it('renders no search field on any of them', () => {
    for (const pageType of ['auth', 'browse', 'user-content']) {
      document.body.setAttribute('data-page-type', pageType);
      document.body.innerHTML = '<div id="header"></div>';
      renderHeader();

      // A positive anchor first.
      // A count of zero is satisfied just as well by a header that rendered nothing at all — an early return, a renamed #header, a throw before the innerHTML write;
      //   and the test would report "no search field" when the truth is "no navbar".
      expect(
        document.querySelectorAll('#header nav').length,
        pageType
      ).toBeGreaterThan(0);

      expect(
        document.querySelectorAll('#header input[type="search"]').length,
        pageType
      ).toBe(0);
    }
  });
});

/**
 * The header used to await the profile fetch, and all eight pages awaited the header, so every
 * signed-in page load sat behind one round trip before starting any request of its own.
 *
 * These pin the two halves of the fix: the markup does not wait, and the figure still updates.
 */
describe('the profile fetch does not block the navbar', () => {
  beforeEach(() => {
    localStorage.clear();
    // The 30s cache is module state and survives between tests, so a warm entry from an earlier one is served without fetch being called at all.
    invalidateProfileCache();
    document.body.innerHTML = '<div id="header"></div>';
    document.body.setAttribute('data-page-type', 'browse');
    localStorage.setItem('token', 'header.payload.signature');
    localStorage.setItem('tokenTimestamp', String(Date.now()));
    localStorage.setItem(
      'user',
      JSON.stringify({
        name: 'tester',
        email: 'tester@stud.noroff.no',
        credits: 649,
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('renders the credit figure from storage while the request is still in flight', () => {
    // Never resolves. If renderHeader awaits it, there is no markup to find.
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>(() => {}))
    );

    renderHeader();

    const credits = document.getElementById('navbar-credits');
    expect(credits).not.toBeNull();
    expect(credits!.textContent).toBe('649');
  });

  it('repaints the figure when the server disagrees with storage', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              data: {
                name: 'tester',
                email: 'tester@stud.noroff.no',
                credits: 968,
              },
              meta: {},
            }),
            { status: 200, headers: { 'content-type': 'application/json' } }
          )
      )
    );

    renderHeader();
    expect(document.getElementById('navbar-credits')!.textContent).toBe('649');

    // Let the background refresh settle.
    await vi.waitFor(() => {
      expect(document.getElementById('navbar-credits')!.textContent).toBe(
        '968'
      );
    });

    // Both figures move, and each keeps its own accessible name.
    expect(
      document.getElementById('navbar-credits')!.getAttribute('aria-label')
    ).toBe('968 credits');
  });

  it('leaves the stored figure alone when the refresh fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('offline');
      })
    );

    renderHeader();
    expect(document.getElementById('navbar-credits')!.textContent).toBe('649');

    await new Promise((r) => setTimeout(r, 0));
    expect(document.getElementById('navbar-credits')!.textContent).toBe('649');
  });
});

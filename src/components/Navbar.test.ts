import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHeader, isBrowsePage } from './Navbar';
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

  it('binds the clearAllFilters listener once on a browse page', async () => {
    document.body.setAttribute('data-page-type', 'browse');
    const { renderHeader: render } = await freshNavbar();
    countAddEventListener();

    render();
    expect(counts.clearAllFilters).toBe(1);

    render();
    expect(counts.clearAllFilters).toBe(1);
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

// Which paths hold a catalog listener decides whether a header search filters in place or navigates to /index.html?q=.
describe('isBrowsePage', () => {
  it('matches both URLs Home is served from', () => {
    expect(isBrowsePage('/')).toBe(true);
    expect(isBrowsePage('/index.html')).toBe(true);
  });

  it('matches the catalog', () => {
    expect(isBrowsePage('/collection.html')).toBe(true);
  });

  it('does not match the other pages, which have no catalog to filter', () => {
    for (const path of [
      '/listing.html',
      '/listing-create.html',
      '/listing-edit.html',
      '/profile.html',
      '/login.html',
      '/register.html',
    ]) {
      expect(isBrowsePage(path)).toBe(false);
    }
  });

  it('matches under a deploy-preview subpath, since the check is on the suffix', () => {
    expect(isBrowsePage('/deploy-preview/index.html')).toBe(true);
    expect(isBrowsePage('/deploy-preview/')).toBe(false);
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

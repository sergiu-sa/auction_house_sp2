import { describe, it, expect, beforeEach } from 'vitest';
import { renderHeader } from './Navbar';

// Guards the mobile menu: closed = display:none (so it can't create horizontal
// page overflow), and the hamburger opens it / the backdrop closes it.
describe('mobile menu', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '<div id="header"></div>';
    document.body.setAttribute('data-page-type', 'browse');
  });

  it('is fully hidden (out of layout) when closed', async () => {
    await renderHeader();

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
    await renderHeader();

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

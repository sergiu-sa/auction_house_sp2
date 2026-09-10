import { describe, it, expect, vi } from 'vitest';
import { renderErrorPanel, mountErrorPanel } from './ErrorPanel';

describe('renderErrorPanel', () => {
  it('escapes the message, which is the only part a server ever writes', () => {
    const html = renderErrorPanel({
      message: '<img src=x onerror="window.__x=1">',
      action: { label: 'Reload', onClick: () => {} },
    });

    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
  });

  /**
   * Parsed rather than pattern-matched:
   *  the property is that a quote in the value survives as part of the value instead of closing the attribute and starting a new one.
   * A regex over the string tests the author's idea of the markup; the parser tests the browser's.
   */
  it('escapes an action label and an action href too', () => {
    const href = '/index.html?a="b onerror="window.__x=1';
    const host = document.createElement('div');
    host.innerHTML = renderErrorPanel({
      message: 'nope',
      action: { label: 'Go "home"', href },
    });

    const link = host.querySelector('a');
    expect(link?.getAttribute('href')).toBe(href);
    expect(link?.textContent?.trim()).toBe('Go "home"');
    expect(link?.hasAttribute('onerror')).toBe(false);
  });

  it('renders a destination as a link and a handler as a button', () => {
    expect(
      renderErrorPanel({ message: 'x', action: { label: 'Home', href: '/' } })
    ).toContain('<a');
    expect(
      renderErrorPanel({
        message: 'x',
        action: { label: 'Retry', onClick: () => {} },
      })
    ).toContain('<button');
  });

  it('omits the action entirely when there is nowhere to go', () => {
    const html = renderErrorPanel({ message: 'x' });
    expect(html).not.toContain('<a');
    expect(html).not.toContain('<button');
  });

  /** The panel drops into a card grid on Collection, where a plain child would take one cell. */
  it('spans the row only when asked to', () => {
    expect(renderErrorPanel({ message: 'x', fullWidth: true })).toContain(
      'col-span-full'
    );
    expect(renderErrorPanel({ message: 'x' })).not.toContain('col-span-full');
  });

  /**
   * The heading level belongs to the container, not the panel:
   * `h1` where it replaces the whole of `main`, `h3` inside a page that still has its own `h1`.
   * Getting this wrong is an outline defect axe reports as `heading-order`.
   */
  it('takes its heading level from the caller, defaulting to h3', () => {
    expect(renderErrorPanel({ message: 'x' })).toContain('<h3');
    expect(renderErrorPanel({ message: 'x', as: 'h1' })).toContain('<h1');
  });
});

describe('mountErrorPanel', () => {
  it('wires the handler to the button it just created', () => {
    const host = document.createElement('div');
    const onClick = vi.fn();

    mountErrorPanel(host, {
      message: 'x',
      action: { label: 'Retry', onClick },
    });
    host.querySelector<HTMLButtonElement>('[data-error-action]')?.click();

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does nothing when the container is missing', () => {
    expect(() => mountErrorPanel(null, { message: 'x' })).not.toThrow();
  });
});

import { describe, it, expect } from 'vitest';
import { escapeHtml } from './escapeHtml';

describe('escapeHtml', () => {
  it('escapes the five HTML-significant characters', () => {
    expect(escapeHtml('&')).toBe('&amp;');
    expect(escapeHtml('<')).toBe('&lt;');
    expect(escapeHtml('>')).toBe('&gt;');
    expect(escapeHtml('"')).toBe('&quot;');
    expect(escapeHtml("'")).toBe('&#39;');
  });

  // The ampersand has to go first, or every entity this function emits gets re-escaped on the way out.
  it('does not re-escape the entities it just produced', () => {
    expect(escapeHtml('<')).not.toContain('&amp;lt;');
    expect(escapeHtml('a < b & c > d')).toBe('a &lt; b &amp; c &gt; d');
  });

  it('leaves text with no significant characters untouched', () => {
    expect(escapeHtml('Vintage Blue Ceramic Vase')).toBe(
      'Vintage Blue Ceramic Vase'
    );
    expect(escapeHtml('')).toBe('');
  });

  it('stringifies non-string input exactly as a template literal would', () => {
    expect(escapeHtml(42)).toBe('42');
    expect(escapeHtml(null)).toBe('null');
    expect(escapeHtml(undefined)).toBe('undefined');
  });

  it('escapes every occurrence, not just the first', () => {
    expect(escapeHtml('""')).toBe('&quot;&quot;');
    expect(escapeHtml('<<>>')).toBe('&lt;&lt;&gt;&gt;');
  });
});

// Each payload is parsed as real HTML in the context it targets, then the result is inspected.
// Asserting on the escaped string alone would pass for an escaper that is subtly wrong about which characters matter where.
describe('escapeHtml against attack payloads', () => {
  const parse = (markup: string): HTMLElement => {
    const host = document.createElement('div');
    host.innerHTML = markup;
    return host;
  };

  it('stops the attribute break-out that F-003 demonstrated', () => {
    const payload = 'Ordinary Lot" onerror="window.__XSS=1" data-x="';

    const host = parse(`<img src="x.jpg" alt="${escapeHtml(payload)}" />`);
    const img = host.querySelector('img')!;

    expect(img.getAttribute('alt')).toBe(payload);
    expect(img.hasAttribute('onerror')).toBe(false);
    expect(img.hasAttribute('data-x')).toBe(false);
    expect(typeof img.onerror).not.toBe('function');
  });

  it('stops a break-out through a user-supplied media URL', () => {
    const payload = 'https://example.invalid/a.jpg" onload="window.__XSS=1';

    const host = parse(`<img src="${escapeHtml(payload)}" alt="Lot" />`);
    const img = host.querySelector('img')!;

    expect(img.getAttribute('src')).toBe(payload);
    expect(img.hasAttribute('onload')).toBe(false);
  });

  it('stops a single-quoted attribute break-out', () => {
    const payload = "x' onerror='window.__XSS=1";

    const host = parse(`<img src='${escapeHtml(payload)}' alt='Lot' />`);
    const img = host.querySelector('img')!;

    expect(img.getAttribute('src')).toBe(payload);
    expect(img.hasAttribute('onerror')).toBe(false);
  });

  it('keeps a </textarea> payload inside the textarea', () => {
    const payload = 'x</textarea><img src=y onerror="window.__XSS=1">';

    const host = parse(`<textarea>${escapeHtml(payload)}</textarea>`);

    expect(host.querySelector('img')).toBeNull();
    expect(host.querySelector('textarea')!.value).toBe(payload);
  });

  it('renders script tags and event-handler markup as text', () => {
    const host = parse(
      `<h3>${escapeHtml('<script>window.__XSS=1</script>')}</h3>` +
        `<p>${escapeHtml('<img src=x onerror=window.__XSS=1>')}</p>`
    );

    expect(host.querySelector('script')).toBeNull();
    expect(host.querySelector('img')).toBeNull();
    expect(host.querySelector('h3')!.textContent).toBe(
      '<script>window.__XSS=1</script>'
    );
  });

  // A javascript: URL is not neutralised by entity-escaping.
  // No sink in this app puts user data anywhere the scheme is up for grabs, so this records the limit rather than claiming a defence.
  it('does not neutralise a javascript: scheme, only the quotes around it', () => {
    const host = parse(
      `<a href="${escapeHtml('javascript:window.__XSS=1')}">x</a>`
    );

    expect(host.querySelector('a')!.getAttribute('href')).toBe(
      'javascript:window.__XSS=1'
    );
  });
});

// The failure mode on the other side:
//  over-escaping shows up as literal entity text in a listing title, which is a visible bug on every card.
describe('escapeHtml round-trips ordinary punctuation', () => {
  const titles = [
    'Tom & Jerry animation cel',
    "Don't Look Now — first edition",
    'The Official "Elijah Wood Wig Collection"',
    'Widths < 40cm & > 20cm',
    'Already escaped &amp; text',
  ];

  it.each(titles)('renders %s unchanged in text context', (title) => {
    const host = document.createElement('div');
    host.innerHTML = `<h3>${escapeHtml(title)}</h3>`;

    expect(host.querySelector('h3')!.textContent).toBe(title);
  });

  it.each(titles)('renders %s unchanged in attribute context', (title) => {
    const host = document.createElement('div');
    host.innerHTML = `<img src="x.jpg" alt="${escapeHtml(title)}" />`;

    expect(host.querySelector('img')!.getAttribute('alt')).toBe(title);
  });
});

import { describe, expect, it, vi } from 'vitest';
import {
  LISTING_PLACEHOLDER,
  initIdentityFallbacks,
  initLotImageFallbacks,
  lotImageSource,
  setLotImageSource,
} from './listingImage';

function img(
  src: string,
  state: 'pending' | 'failed' = 'pending'
): HTMLImageElement {
  const el = document.createElement('img');
  el.setAttribute('src', src);
  Object.defineProperty(el, 'complete', {
    value: state === 'failed',
    configurable: true,
  });
  Object.defineProperty(el, 'naturalWidth', { value: 0, configurable: true });
  return el;
}

describe('lotImageSource', () => {
  it('uses the lot photograph when there is one', () => {
    expect(
      lotImageSource([{ url: 'https://x.test/a.jpg', alt: 'A bag' }], 'Bag')
    ).toEqual({
      src: 'https://x.test/a.jpg',
      alt: 'A bag',
    });
  });

  it('names the lot when the media entry carries no alt of its own', () => {
    expect(lotImageSource([{ url: 'https://x.test/a.jpg' }], 'Bag').alt).toBe(
      'Bag'
    );
  });

  it('falls back to the placeholder when media is missing or empty', () => {
    for (const media of [undefined, []]) {
      expect(lotImageSource(media, 'Bag').src).toBe(LISTING_PLACEHOLDER);
    }
  });

  it('keeps the lot title as the alt on the placeholder', () => {
    // Every card wraps this image in a link that has no other content, so an empty alt would leave the link with no accessible name.
    expect(lotImageSource([], 'Bag').alt).toBe('Bag');
  });

  it('ignores a media entry whose url is an empty string', () => {
    expect(lotImageSource([{ url: '' }], 'Bag').src).toBe(LISTING_PLACEHOLDER);
  });
});

describe('initLotImageFallbacks', () => {
  it('swaps a failed lot image to the placeholder', () => {
    const root = document.createElement('div');
    const el = img('https://x.test/dead.jpg');
    el.setAttribute('data-lot-image', '');
    root.append(el);

    initLotImageFallbacks(root);
    el.dispatchEvent(new Event('error'));

    expect(el.getAttribute('src')).toBe(LISTING_PLACEHOLDER);
  });

  it('drops srcset, so the browser cannot pick a candidate over the placeholder', () => {
    const root = document.createElement('div');
    const el = img('https://x.test/dead.jpg');
    el.setAttribute('data-lot-image', '');
    el.setAttribute('srcset', 'https://x.test/dead.jpg?w=400 400w');
    root.append(el);

    initLotImageFallbacks(root);
    el.dispatchEvent(new Event('error'));

    expect(el.hasAttribute('srcset')).toBe(false);
  });

  it('does not loop if the placeholder itself fails', () => {
    const root = document.createElement('div');
    const el = img('https://x.test/dead.jpg');
    el.setAttribute('data-lot-image', '');
    root.append(el);

    initLotImageFallbacks(root);
    el.dispatchEvent(new Event('error'));
    el.dispatchEvent(new Event('error'));

    expect(el.getAttribute('src')).toBe(LISTING_PLACEHOLDER);
  });

  it('catches an image that already failed before the listener was attached', () => {
    const root = document.createElement('div');
    const el = img('https://x.test/dead.jpg', 'failed');
    el.setAttribute('data-lot-image', '');
    root.append(el);

    initLotImageFallbacks(root);

    expect(el.getAttribute('src')).toBe(LISTING_PLACEHOLDER);
  });

  it('leaves unmarked images alone', () => {
    const root = document.createElement('div');
    const el = img('https://x.test/dead.jpg');
    root.append(el);

    initLotImageFallbacks(root);
    el.dispatchEvent(new Event('error'));

    expect(el.getAttribute('src')).toBe('https://x.test/dead.jpg');
  });
});

describe('setLotImageSource', () => {
  it('re-arms the fallback, so a second dead URL still degrades', () => {
    // The gallery swaps `src` on every thumbnail click.
    // onImageError latches after one failure, so without re-arming the second dead image renders as alt-text-on-grey.
    const root = document.createElement('div');
    const el = img('https://x.test/dead-one.jpg');
    el.setAttribute('data-lot-image', '');
    root.append(el);

    initLotImageFallbacks(root);
    el.dispatchEvent(new Event('error'));
    expect(el.getAttribute('src')).toBe(LISTING_PLACEHOLDER);

    setLotImageSource(el, 'https://x.test/dead-two.jpg', 'Second view');
    expect(el.getAttribute('src')).toBe('https://x.test/dead-two.jpg');

    el.dispatchEvent(new Event('error'));
    expect(el.getAttribute('src')).toBe(LISTING_PLACEHOLDER);
  });

  it('keeps exactly one live listener however often it is called', () => {
    // ProductShowcase re-points its three tiles every 15 seconds.
    // A `{ once: true }` listener on  an image that loads fine is never fired and so never removed, so arming on every pass would accumulate one listener per tile per refresh for as long as the page is open.
    const el = img('https://x.test/a.jpg');
    const add = vi.spyOn(el, 'addEventListener');

    for (let i = 0; i < 20; i++) {
      setLotImageSource(el, `https://x.test/${i}.jpg`, 'A lot');
    }

    expect(add.mock.calls.filter(([type]) => type === 'error')).toHaveLength(1);
  });

  it('arms again once the waiting listener has been spent', () => {
    const el = img('https://x.test/a.jpg');
    setLotImageSource(el, 'https://x.test/dead-one.jpg', 'One');
    el.dispatchEvent(new Event('error'));

    const add = vi.spyOn(el, 'addEventListener');
    setLotImageSource(el, 'https://x.test/dead-two.jpg', 'Two');

    expect(add.mock.calls.filter(([type]) => type === 'error')).toHaveLength(1);
    el.dispatchEvent(new Event('error'));
    expect(el.getAttribute('src')).toBe(LISTING_PLACEHOLDER);
  });

  it('writes the alt it is given', () => {
    const el = img('https://x.test/a.jpg');
    setLotImageSource(el, 'https://x.test/b.jpg', 'Second view');
    expect(el.getAttribute('alt')).toBe('Second view');
  });
});

describe('initIdentityFallbacks', () => {
  function avatar(): {
    wrap: HTMLElement;
    el: HTMLImageElement;
    letter: HTMLElement;
  } {
    const wrap = document.createElement('div');
    const el = img('https://x.test/avatar.jpg');
    el.setAttribute('data-identity-image', '');
    const letter = document.createElement('div');
    letter.setAttribute('data-identity-fallback', '');
    letter.style.display = 'none';
    wrap.append(el, letter);
    return { wrap, el, letter };
  }

  it('hides a failed avatar and reveals the initial-letter box behind it', () => {
    const { wrap, el, letter } = avatar();

    initIdentityFallbacks(wrap);
    el.dispatchEvent(new Event('error'));

    expect(el.style.display).toBe('none');
    expect(letter.style.display).toBe('flex');
  });

  it('leaves both alone while the avatar is loading', () => {
    const { wrap, el, letter } = avatar();

    initIdentityFallbacks(wrap);

    expect(el.style.display).toBe('');
    expect(letter.style.display).toBe('none');
  });

  it('does nothing when there is no substitute to reveal', () => {
    const wrap = document.createElement('div');
    const el = img('https://x.test/avatar.jpg');
    el.setAttribute('data-identity-image', '');
    wrap.append(el);

    initIdentityFallbacks(wrap);
    expect(() => el.dispatchEvent(new Event('error'))).not.toThrow();
    expect(el.style.display).toBe('none');
  });
});

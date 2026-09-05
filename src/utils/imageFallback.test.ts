import { describe, expect, it, vi } from 'vitest';
import { initImageFallbacks, onImageError } from './imageFallback';

/** jsdom never loads images, so both states have to be described rather than provoked. */
function makeImage(
  state: 'pending' | 'failed' | 'loaded',
  src = 'https://example.test/lot.jpg'
): HTMLImageElement {
  const img = document.createElement('img');
  if (src) img.setAttribute('src', src);
  Object.defineProperty(img, 'complete', {
    value: state !== 'pending',
    configurable: true,
  });
  Object.defineProperty(img, 'naturalWidth', {
    value: state === 'loaded' ? 120 : 0,
    configurable: true,
  });
  return img;
}

describe('onImageError', () => {
  it('runs the fallback when the image errors after the listener is attached', () => {
    const img = makeImage('pending');
    const fallback = vi.fn();

    onImageError(img, fallback);
    expect(fallback).not.toHaveBeenCalled();

    img.dispatchEvent(new Event('error'));
    expect(fallback).toHaveBeenCalledTimes(1);
  });

  it('runs the fallback for an image that already failed before we attached', () => {
    // The reason this helper exists:
    //  a cached 404 errors during the innerHTML assignment, so the listener arrives after the only event it was ever going to see.
    const img = makeImage('failed');
    const fallback = vi.fn();

    onImageError(img, fallback);

    expect(fallback).toHaveBeenCalledTimes(1);
  });

  it('leaves an image that has no src yet alone', () => {
    // `complete` is true and `naturalWidth` is 0 for a src-less image, which looks exactly like a failure.
    // A component that renders markup first and sets src afterwards must not get a broken-image fallback painted on mount.
    const img = makeImage('failed', '');
    const fallback = vi.fn();

    onImageError(img, fallback);

    expect(fallback).not.toHaveBeenCalled();
  });

  it('still reacts when that image later fails for real', () => {
    const img = makeImage('failed', '');
    const fallback = vi.fn();

    onImageError(img, fallback);
    img.dispatchEvent(new Event('error'));

    expect(fallback).toHaveBeenCalledTimes(1);
  });

  it('leaves a successfully loaded image alone', () => {
    const img = makeImage('loaded');
    const fallback = vi.fn();

    onImageError(img, fallback);

    expect(fallback).not.toHaveBeenCalled();
  });

  it('runs the fallback once, even if both paths fire', () => {
    const img = makeImage('failed');
    const fallback = vi.fn();

    onImageError(img, fallback);
    img.dispatchEvent(new Event('error'));

    expect(fallback).toHaveBeenCalledTimes(1);
  });
});

describe('onImageError, where the browser has decode()', () => {
  /** jsdom has no `decode`, so the three states it distinguishes have to be supplied. */
  function decodable(
    outcome: 'decodes' | 'rejects',
    src = 'https://example.test/lot.jpg'
  ): HTMLImageElement {
    const img = makeImage('failed', src);
    // Exactly the state that produced the false positive: fetch settled, dimensions not yet known.
    Object.defineProperty(img, 'decode', {
      value: () =>
        outcome === 'decodes'
          ? Promise.resolve()
          : Promise.reject(new Error('EncodingError')),
      configurable: true,
    });
    return img;
  }

  it('leaves a good image alone even while it reads as complete with no width', async () => {
    // `complete` turns true when the fetch settles, before the dimensions are known.
    // Treating that  as failure replaced a working photograph with the placeholder on one home card in ten.
    const img = decodable('decodes');
    const fallback = vi.fn();

    onImageError(img, fallback);
    await Promise.resolve();
    await Promise.resolve();

    expect(fallback).not.toHaveBeenCalled();
  });

  it('still catches an image that really did fail before we attached', async () => {
    const img = decodable('rejects');
    const fallback = vi.fn();

    onImageError(img, fallback);
    await Promise.resolve();
    await Promise.resolve();

    expect(fallback).toHaveBeenCalledTimes(1);
  });

  it('does not probe an image that has not settled yet', async () => {
    // The error listener already covers anything still loading.
    // Probing them all left a pending promise on roughly thirty lazy images per home load, for no case they could answer.
    const img = makeImage('pending');
    let decoded = false;
    Object.defineProperty(img, 'decode', {
      value: () => {
        decoded = true;
        return Promise.resolve();
      },
      configurable: true,
    });

    onImageError(img, vi.fn());
    await Promise.resolve();

    expect(decoded).toBe(false);
  });

  it('ignores a rejection for a src the element has already moved off', async () => {
    // The gallery swaps `src` on a thumbnail click, which aborts the pending decode.
    // That rejection describes the image that was abandoned, not the one now loading.
    const img = decodable('rejects');
    const fallback = vi.fn();

    onImageError(img, fallback);
    img.setAttribute('src', 'https://example.test/other.jpg');
    await Promise.resolve();
    await Promise.resolve();

    expect(fallback).not.toHaveBeenCalled();
  });
});

describe('initImageFallbacks', () => {
  it('wires only the images marked for it, and passes each one to the callback', () => {
    const root = document.createElement('div');
    const marked = makeImage('pending');
    marked.setAttribute('data-fallback', '');
    const plain = makeImage('pending');
    root.append(marked, plain);

    const seen: HTMLImageElement[] = [];
    initImageFallbacks(root, (img) => seen.push(img));

    marked.dispatchEvent(new Event('error'));
    plain.dispatchEvent(new Event('error'));

    expect(seen).toEqual([marked]);
  });

  it('handles a container with no images at all', () => {
    const root = document.createElement('div');
    expect(() => initImageFallbacks(root, vi.fn())).not.toThrow();
  });
});

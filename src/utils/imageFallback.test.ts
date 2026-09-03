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

/**
 * Owns what fallback images show when a URL is dead.
 * Source chosen at render time; fallback runs after markup is in DOM.
 */

import { onImageError } from './imageFallback';

export const LISTING_PLACEHOLDER = '/images/placeholder.svg';

interface MediaLike {
  url?: string;
  alt?: string;
}

// Alt stays the title even on placeholder so the card link is accessible.
export function lotImageSource(
  media: MediaLike[] | undefined,
  title: string
): { src: string; alt: string } {
  const first = media?.[0];
  if (!first?.url) return { src: LISTING_PLACEHOLDER, alt: title };
  return { src: first.url, alt: first.alt || title };
}

function showPlaceholder(img: HTMLImageElement): void {
  // Clear srcset; it outranks src and would re-pick the dead URL.
  img.removeAttribute('srcset');
  img.setAttribute('src', LISTING_PLACEHOLDER);
}

// Track images with armed fallback listeners to avoid leaking listeners on re-pointed tiles.
const waiting = new WeakSet<HTMLImageElement>();

function armPlaceholder(img: HTMLImageElement): void {
  if (waiting.has(img)) return;
  waiting.add(img);
  onImageError(img, () => {
    waiting.delete(img);
    showPlaceholder(img);
  });
}

/** Wire every `<img data-lot-image>` inside `root` to degrade to the placeholder. */
export function initLotImageFallbacks(root: ParentNode): void {
  root
    .querySelectorAll<HTMLImageElement>('img[data-lot-image]')
    .forEach(armPlaceholder);
}

// Re-arm fallback when changing src (listener is one-shot).
export function setLotImageSource(
  img: HTMLImageElement,
  url: string,
  alt: string
): void {
  img.removeAttribute('srcset');
  img.setAttribute('src', url);
  img.setAttribute('alt', alt);
  armPlaceholder(img);
}

// Wire identity images to show their [data-identity-fallback] substitute on error.
export function initIdentityFallbacks(root: ParentNode): void {
  root
    .querySelectorAll<HTMLImageElement>('img[data-identity-image]')
    .forEach((img) =>
      onImageError(img, () => {
        img.style.display = 'none';
        const substitute = img.parentElement?.querySelector(
          '[data-identity-fallback]'
        );
        if (substitute instanceof HTMLElement)
          substitute.style.display = 'flex';
      })
    );
}

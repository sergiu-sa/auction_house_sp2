/**
 * Attach an image error handler after the markup is already in the DOM.
 *
 * An inline `onerror=` is live from the moment the parser reads the tag, so it cannot miss the event.
 *  A listener added after an `innerHTML` write can:
 *   if the URL is already in cache as a failure, the image errors during the assignment and the listener arrives too late.
 * The page then shows a broken image where it used to show a fallback, with nothing logged.
 *
 * `complete` is true once the load has settled either way, and a failed image has no intrinsic width, together they say "already errored".
 *
 * This only fixes *when* the fallback runs. What each surface shows is still its own business, and is F-088's question, not this helper's.
 */
export function onImageError(
  img: HTMLImageElement,
  fallback: () => void
): void {
  let done = false;
  const run = (): void => {
    if (done) return;
    done = true;
    fallback();
  };

  img.addEventListener('error', run, { once: true });

  // `complete` is also true for an image with no src yet, and its naturalWidth is 0 too;
  //  so without the src check, a component that renders the markup first and assigns src afterwards would paint its broken-image fallback on mount, before any load had been attempted.
  const src = img.getAttribute('src');
  if (src && img.complete && img.naturalWidth === 0) run();
}

/** Wire every `<img data-fallback>` inside `root`, given a per-image fallback. */
export function initImageFallbacks(
  root: ParentNode,
  fallback: (img: HTMLImageElement) => void
): void {
  root
    .querySelectorAll<HTMLImageElement>('img[data-fallback]')
    .forEach((img) => onImageError(img, () => fallback(img)));
}

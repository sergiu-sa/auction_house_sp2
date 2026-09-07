/**
 * Attach an image error handler after the markup is already in the DOM.
 *
 * An inline `onerror=` is live from the moment the parser reads the tag, so it cannot miss the event.
 *  A listener added after an `innerHTML` write can:
 *   if the URL is already in cache as a failure, the image errors during the assignment and the listener arrives too late.
 * The page then shows a broken image where it used to show a fallback, with nothing logged.
 *
 * `decode()` settles for an image whatever state it is already in, which covers that case without having to guess from `complete` and `naturalWidth`.
 * Those two used to stand in for it and produced **false positives**:
 *   `complete` turns true when the fetch settles, which is before the dimensions are known, so a perfectly good image observed in that window looks identical to a failed one and had its fallback painted over it.
 * Reproduced on the home page, where one card in ten replaced a working photograph with the placeholder.
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

  // Without the src check, a component that renders its markup first and assigns src afterwards would decode nothing and paint its broken-image fallback on mount, before any load was attempted.
  const src = img.getAttribute('src');
  if (!src) return;

  // Only an image that has already settled can have errored before the listener existed, which is the whole case this covers.
  // Probing the rest would leave a pending promise on every lazy image on the page;
  //   about thirty on a signed-in home load, and another 24 per catalog repaint.
  if (!img.complete) return;

  if (typeof img.decode === 'function') {
    // Only if the element still points where it did when this ran:
    //   a gallery that swaps `src` aborts the pending decode, and that rejection says nothing about the new image.
    img.decode().catch(() => {
      if (img.getAttribute('src') === src) run();
    });
    return;
  }

  // jsdom implements no `decode`, and neither does anything older than the build target.
  if (img.complete && img.naturalWidth === 0) run();
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

/**
 * Probe whether an image URL resolves before rendering it.
 * Returns dimensions to rank by aspect ratio in the hero.
 */

export interface ImageProbe {
  url: string;
  ok: boolean;
  width: number;
  height: number;
  // Budget expired; unknown is not dead. Slow connections shouldn't disqualify good photos.
  timedOut: boolean;
}

/** Long enough for a slow host, short enough that the hero is not held up by a dead one. */
const PROBE_TIMEOUT_MS = 1500;

function probeImage(url: string, timeoutMs: number): Promise<ImageProbe> {
  return new Promise((resolve) => {
    if (!url) {
      resolve({ url, ok: false, width: 0, height: 0, timedOut: false });
      return;
    }

    const img = new Image();
    let settled = false;

    const finish = (ok: boolean, timedOut = false): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({
        url,
        ok,
        width: img.naturalWidth,
        height: img.naturalHeight,
        timedOut,
      });
    };

    // Timeout without cancelling; the page may still want this fetch.
    const timer = setTimeout(() => finish(false, true), timeoutMs);

    img.addEventListener('load', () => finish(true), { once: true });
    img.addEventListener('error', () => finish(false), { once: true });

    // Set before src; otherwise default policy misses the cache entry the img will hit.
    img.referrerPolicy = 'no-referrer';
    img.src = url;
  });
}

/** Probe a batch at once. Order of the results matches the order of the urls. */
export function probeImages(
  urls: string[],
  timeoutMs: number = PROBE_TIMEOUT_MS
): Promise<ImageProbe[]> {
  // Cap here; one slow host shouldn't consume the caller's entire budget.
  const capped = Math.min(timeoutMs, PROBE_TIMEOUT_MS);
  return Promise.all(urls.map((url) => probeImage(url, capped)));
}

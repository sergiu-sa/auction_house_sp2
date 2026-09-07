// Which resizing CDN a URL is served by, or null. Matched on hostname to avoid substring spoofs.
function resizableHost(url: string): 'unsplash' | 'pexels' | null {
  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return null;
  }
  if (hostname === 'images.unsplash.com') return 'unsplash';
  if (hostname === 'images.pexels.com') return 'pexels';
  return null;
}

// Generate srcset for CDNs that support width parameters.
function generateSrcset(baseUrl: string): string {
  const host = resizableHost(baseUrl);

  if (host === 'unsplash') {
    // Unsplash supports ?w= parameter
    const baseWithoutParams = baseUrl.split('?')[0];
    const existingParams = baseUrl.includes('?') ? baseUrl.split('?')[1] : '';
    const paramPrefix = existingParams ? '&' : '';
    return `
      ${baseWithoutParams}?w=400${paramPrefix}${existingParams} 400w,
      ${baseWithoutParams}?w=600${paramPrefix}${existingParams} 600w,
      ${baseWithoutParams}?w=800${paramPrefix}${existingParams} 800w,
      ${baseWithoutParams}?w=1200${paramPrefix}${existingParams} 1200w
    `.trim();
  }

  if (host === 'pexels') {
    // Split like the branch above rather than appending to the whole URL.
    // Pexels URLs in the live pool already carry `?w=1260&h=750&dpr=1`, so `${baseUrl}?w=400` produced a second `?`, the  intended width was swallowed into the previous parameter's value, and all four candidates served the byte-identical original while advertising 400w to 1200w.
    const [pexelsBase, pexelsParams] = baseUrl.split('?');
    const pexelsSuffix = pexelsParams ? `&${pexelsParams}` : '';
    return `
      ${pexelsBase}?w=400&h=400${pexelsSuffix} 400w,
      ${pexelsBase}?w=600&h=600${pexelsSuffix} 600w,
      ${pexelsBase}?w=800&h=800${pexelsSuffix} 800w,
      ${pexelsBase}?w=1200&h=1200${pexelsSuffix} 1200w
    `.trim();
  }

  // For other URLs, return empty string (will just use src)
  return '';
}

// 400px is the smallest srcset candidate; the probe reuses this fetch.
const PROBE_WIDTH = 400;

// CDN variant for cheap probing; resizable=true means dimensions are from the variant, not the original.
export function probeVariant(url: string): { url: string; resizable: boolean } {
  if (resizableHost(url) === null) {
    return { url, resizable: false };
  }

  const [base, params] = url.split('?');
  const suffix = params ? `&${params}` : '';
  return { url: `${base}?w=${PROBE_WIDTH}${suffix}`, resizable: true };
}

// Generate responsive image attributes. sizesOverride for layouts not in the preset (e.g., hero mosaic).
export function generateResponsiveImageAttrs(
  imageUrl: string,
  imageAlt: string,
  aspectRatio: 'square' | 'landscape' | 'compact',
  sizesOverride?: string
): {
  src: string;
  srcset?: string;
  alt: string;
  loading: 'lazy' | 'eager';
  decoding: 'async';
  width: number;
  height: number;
  sizes: string;
} {
  const dimensions = {
    square: { width: 600, height: 600 },
    landscape: { width: 600, height: 450 },
    compact: { width: 600, height: 400 },
  };

  const sizesMap = {
    square: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
    landscape: '(max-width: 768px) 100vw, 50vw',
    compact: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw',
  };

  const srcset = generateSrcset(imageUrl);

  return {
    src: imageUrl,
    ...(srcset && { srcset }), // Only include if srcset was generated
    alt: imageAlt,
    loading: 'lazy',
    decoding: 'async',
    width: dimensions[aspectRatio].width,
    height: dimensions[aspectRatio].height,
    sizes: sizesOverride ?? sizesMap[aspectRatio],
  };
}

/**
 * Image Optimization Utilities
 * Helper functions for responsive images and lazy loading
 */

/**
 * Generate srcset for responsive images
 * Creates multiple image widths for better performance
 *
 * @param baseUrl - The base image URL
 * @returns srcset string with multiple widths
 */
function generateSrcset(baseUrl: string): string {
  // For external images, I can't generate different sizes
  // But I can add srcset hints for browser to handle better
  // Most modern image CDNs (like Unsplash, Pexels) support width parameters

  // Detect common image CDN patterns
  if (baseUrl.includes('images.unsplash.com')) {
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

  if (baseUrl.includes('images.pexels.com')) {
    return `
      ${baseUrl}?w=400&h=400 400w,
      ${baseUrl}?w=600&h=600 600w,
      ${baseUrl}?w=800&h=800 800w,
      ${baseUrl}?w=1200&h=1200 1200w
    `.trim();
  }

  // For other URLs, return empty string (will just use src)
  return '';
}

/**
 * Generate responsive image attributes for external images
 * Since images come from external URLs (API), we use browser-native responsive image techniques
 *
 * @param imageUrl - The image URL
 * @param imageAlt - The alt text
 * @param aspectRatio - The aspect ratio class (e.g., 'aspect-square', 'h-48')
 * @returns Object with image attributes
 */
export function generateResponsiveImageAttrs(
  imageUrl: string,
  imageAlt: string,
  aspectRatio: 'square' | 'landscape' | 'compact'
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
  // Define dimensions based on aspect ratio for layout stability (CLS prevention)
  const dimensions = {
    square: { width: 600, height: 600 }, // 1:1 ratio for ProductCard, CollectionCard
    landscape: { width: 600, height: 450 }, // 4:3 ratio for listing detail
    compact: { width: 600, height: 400 }, // 3:2 ratio for QuickCard
  };

  // Define sizes attribute based on layout breakpoints for better responsive loading
  const sizesMap = {
    square: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
    landscape: '(max-width: 768px) 100vw, 50vw',
    compact: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw',
  };

  // Generate srcset for supported CDNs
  const srcset = generateSrcset(imageUrl);

  return {
    src: imageUrl,
    ...(srcset && { srcset }), // Only include if srcset was generated
    alt: imageAlt,
    loading: 'lazy',
    decoding: 'async',
    width: dimensions[aspectRatio].width,
    height: dimensions[aspectRatio].height,
    sizes: sizesMap[aspectRatio],
  };
}

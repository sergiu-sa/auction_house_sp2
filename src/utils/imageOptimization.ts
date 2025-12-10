/**
 * Image Optimization Utilities
 * Helper functions for responsive images and lazy loading
 */

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
  alt: string;
  loading: 'lazy';
  decoding: 'async';
  width?: number;
  height?: number;
  sizes?: string;
} {
  // Define dimensions based on aspect ratio for layout stability
  const dimensions = {
    square: { width: 600, height: 600 },      // 1:1 ratio for ProductCard, CollectionCard
    landscape: { width: 600, height: 450 },   // 4:3 ratio for listing detail
    compact: { width: 600, height: 400 },     // 3:2 ratio for QuickCard
  };

  // Define sizes attribute based on layout breakpoints
  const sizesMap = {
    square: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
    landscape: '(max-width: 768px) 100vw, 50vw',
    compact: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw',
  };

  return {
    src: imageUrl,
    alt: imageAlt,
    loading: 'lazy',
    decoding: 'async',
    width: dimensions[aspectRatio].width,
    height: dimensions[aspectRatio].height,
    sizes: sizesMap[aspectRatio],
  };
}


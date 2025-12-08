/**
 * Image optimization utilities
 * Provides lazy loading and responsive image handling
 */

/**
 * Create an optimized image element with lazy loading
 */
export function createOptimizedImage(
  src: string,
  alt: string,
  options: {
    className?: string;
    loading?: 'lazy' | 'eager';
    decoding?: 'async' | 'sync' | 'auto';
    fetchpriority?: 'high' | 'low' | 'auto';
  } = {}
): HTMLImageElement {
  const img = document.createElement('img');

  img.src = src;
  img.alt = alt;
  img.loading = options.loading || 'lazy';
  img.decoding = options.decoding || 'async';

  if (options.fetchpriority) {
    img.setAttribute('fetchpriority', options.fetchpriority);
  }

  if (options.className) {
    img.className = options.className;
  }

  return img;
}

/**
 * Add lazy loading to existing images
 * Useful for images rendered server-side or in static HTML
 */
export function enableLazyLoading(selector: string = 'img[data-lazy]'): void {
  const images = document.querySelectorAll<HTMLImageElement>(selector);

  if ('loading' in HTMLImageElement.prototype) {
    // Native lazy loading is supported
    images.forEach((img) => {
      const src = img.dataset.src;
      if (src) {
        img.src = src;
        img.loading = 'lazy';
        delete img.dataset.src;
      }
    });
  } else {
    // Fallback to Intersection Observer
    lazyLoadWithIntersectionObserver(images);
  }
}

/**
 * Lazy load images using Intersection Observer
 * Fallback for browsers that don't support native lazy loading
 */
function lazyLoadWithIntersectionObserver(images: NodeListOf<HTMLImageElement>): void {
  const imageObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          const src = img.dataset.src;

          if (src) {
            img.src = src;
            delete img.dataset.src;
            img.classList.remove('lazy');
            observer.unobserve(img);
          }
        }
      });
    },
    {
      rootMargin: '50px 0px', // Start loading 50px before entering viewport
      threshold: 0.01,
    }
  );

  images.forEach((img) => imageObserver.observe(img));
}

/**
 * Preload critical images
 * Use for above-the-fold or hero images
 */
export function preloadImage(src: string, priority: 'high' | 'low' = 'high'): void {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = src;
  link.setAttribute('fetchpriority', priority);
  document.head.appendChild(link);
}

/**
 * Create a placeholder for images while loading
 */
export function createImagePlaceholder(aspectRatio: string = '16/9'): HTMLDivElement {
  const placeholder = document.createElement('div');
  placeholder.className = 'animate-pulse bg-slate-200';
  placeholder.style.aspectRatio = aspectRatio;
  return placeholder;
}

/**
 * Load image with error handling and placeholder
 */
export function loadImageWithPlaceholder(
  container: HTMLElement,
  src: string,
  alt: string,
  options: {
    className?: string;
    aspectRatio?: string;
    onLoad?: () => void;
    onError?: () => void;
  } = {}
): void {
  // Create and add placeholder
  const placeholder = createImagePlaceholder(options.aspectRatio);
  container.appendChild(placeholder);

  // Create image
  const img = createOptimizedImage(src, alt, {
    className: options.className,
    loading: 'lazy',
  });

  // Handle load
  img.onload = () => {
    placeholder.remove();
    container.appendChild(img);
    options.onLoad?.();
  };

  // Handle error
  img.onerror = () => {
    placeholder.remove();

    // Show fallback
    const fallback = document.createElement('div');
    fallback.className = 'flex items-center justify-center bg-slate-100 text-slate-400';
    fallback.style.aspectRatio = options.aspectRatio || '16/9';
    fallback.innerHTML = '<i class="fa-solid fa-image text-4xl"></i>';
    container.appendChild(fallback);

    options.onError?.();
  };
}

/**
 * Optimize Font Awesome icons
 * Only load icons that are actually used on the page
 */
export function getUsedFontAwesomeIcons(): Set<string> {
  const icons = new Set<string>();
  const elements = document.querySelectorAll('[class*="fa-"]');

  elements.forEach((element) => {
    const classes = element.className.split(' ');
    classes.forEach((cls) => {
      if (cls.startsWith('fa-') && !['fa-solid', 'fa-regular', 'fa-brands'].includes(cls)) {
        icons.add(cls);
      }
    });
  });

  return icons;
}

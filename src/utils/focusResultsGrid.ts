import { prefersReducedMotion } from './motion';

/**
 * Move the reader to the top of a freshly-paged results grid.
 *
 * The re-render destroys whichever control was focused, so without this focus drops to <body>.
 * Landing clear of the sticky filter bar depends on both grids keeping their `scroll-margin-top`.
 */
export function focusResultsGrid(containerId: string): void {
  const grid = document.getElementById(containerId);
  if (!grid) return;

  grid.scrollIntoView({
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    block: 'start',
  });
  grid.setAttribute('tabindex', '-1');
  grid.focus({ preventScroll: true });
}

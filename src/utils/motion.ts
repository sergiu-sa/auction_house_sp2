/**
 * `scroll-behavior: auto` in CSS does not override an explicit `behavior: 'smooth'` passed to scrollIntoView, so any scripted scroll has to read the preference itself.
 */
export function prefersReducedMotion(): boolean {
  return (
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  );
}

/**
 * Screen-reader announcements for changes that have no visible text of their own.
 *
 * Both regions are mounted once, empty, at page load.
 * A live region only announces mutations that happen while it is already in the document;
 *   inserting a region that already contains its message is how announcements get missed, and that is what the toast used to do.
 */

const POLITE_ID = 'a11y-announcer-polite';
const ASSERTIVE_ID = 'a11y-announcer-assertive';

function ensureRegion(id: string, live: 'polite' | 'assertive'): HTMLElement {
  const existing = document.getElementById(id);
  if (existing) return existing;

  const el = document.createElement('div');
  el.id = id;
  el.setAttribute('role', live === 'assertive' ? 'alert' : 'status');
  el.setAttribute('aria-live', live);
  el.setAttribute('aria-atomic', 'true');
  el.className = 'sr-only';
  document.body.appendChild(el);
  return el;
}

/** Call once per page, before anything announces. */
export function mountAnnouncer(): void {
  ensureRegion(POLITE_ID, 'polite');
  ensureRegion(ASSERTIVE_ID, 'assertive');
}

/**
 * Announce `message`. Errors and refusals want 'assertive' so they interrupt.
 */
export function announce(
  message: string,
  urgency: 'polite' | 'assertive' = 'polite'
): void {
  const region = ensureRegion(
    urgency === 'assertive' ? ASSERTIVE_ID : POLITE_ID,
    urgency
  );

  // Assigning the same string twice is not a mutation, so an identical repeat message would be silent.
  // Clearing first, then setting on the next frame, makes it a change either way.
  region.textContent = '';
  window.setTimeout(() => {
    region.textContent = message;
  }, 50);
}

/**
 * Focus handling for overlays (the mobile drawer, the delete dialog).
 *
 * `aria-modal="true"` tells a screen reader that everything outside the overlay is inert.
 * Nothing in the browser enforces that, so without a trap the claim is false:
 *  the page behind stays in the tab order while the screen-reader cursor is confined.
 * This is what makes the attribute honest.
 */

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/** Rendered, focusable descendants in tab order. */
function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 || rect.height > 0;
    }
  );
}

export interface TrapOptions {
  /** Focused on open.
   * Defaults to the first focusable descendant. */
  initialFocus?: HTMLElement | null;
  /** Escape, or Tab leaving the container. */
  onClose: () => void;
}

/**
 * Confine Tab to `container` until the returned function is called.
 * The caller owns showing and hiding;
 *  this only handles focus and Escape.
 */
export function trapFocus(
  container: HTMLElement,
  { initialFocus, onClose }: TrapOptions
): () => void {
  const previouslyFocused = document.activeElement as HTMLElement | null;

  const target = initialFocus ?? getFocusable(container)[0] ?? container;
  // A container that is not naturally focusable still has to receive focus, or the announcement of the overlay never happens.
  if (target === container && !container.hasAttribute('tabindex')) {
    container.setAttribute('tabindex', '-1');
  }
  target.focus();

  function onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
      return;
    }

    if (event.key !== 'Tab') return;

    const focusable = getFocusable(container);
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    // Wrap at both ends, and pull focus back in if it somehow escaped the container.
    if (event.shiftKey && (active === first || !container.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (
      !event.shiftKey &&
      (active === last || !container.contains(active))
    ) {
      event.preventDefault();
      first.focus();
    }
  }

  document.addEventListener('keydown', onKeydown, true);

  return function release(): void {
    document.removeEventListener('keydown', onKeydown, true);
    // Returning focus to the trigger is what stops a keyboard user restarting from the top.
    previouslyFocused?.focus();
  };
}

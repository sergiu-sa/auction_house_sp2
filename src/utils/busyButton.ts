/**
 * Put a submit button into its working state, and hand back the undo.
 *
 * Eight handlers wrote this by hand. Four captured the button's markup first; the other four
 * retyped its icon and label into the failure path, so changing a submit button's wording meant
 * finding its second copy inside the handler that restores it — and nothing failed if you didn't.
 *
 * Returning the restore rather than exposing a second function is what removes that: the caller
 * cannot restore the wrong markup, because it never names the markup at all.
 */

import { escapeHtml } from './escapeHtml';

/**
 * Disable `button`, swap its contents for a spinner and `label`, and return the function that
 * puts it back exactly as it was.
 *
 * The restore is for failure paths. A handler that navigates or re-renders on success has nothing
 * to put back, and should simply not call it.
 */
/**
 * The size class of the icon the spinner is standing in for, or none.
 *
 * A fixed size cannot work, and the reason is the import order `main.css` documents: `icons.css`
 * loads before `tailwindcss/utilities`, so `.fa-solid { line-height: 1 }` wins on an icon with no
 * size class and loses to one that has it. Measured across the eight buttons this serves —
 * stamping `text-base` grew login's by **4px** the instant it was clicked (50 to 54) and the
 * delete confirmation's by 1px, while inheriting shrank the bid button by 4px (60 to 56) and the
 * publish button by 4px. Matching whatever the resting icon wore holds all four at their height.
 */
function spinnerSize(button: HTMLButtonElement): string {
  const resting = button.querySelector('i')?.className ?? '';
  const size = resting.match(/\btext-(?:xs|sm|base|lg|xl|\[[^\]]+\])\b/)?.[0];
  return size ? ` ${size}` : '';
}

export function setButtonBusy(
  button: HTMLButtonElement,
  label: string
): () => void {
  const original = button.innerHTML;

  button.disabled = true;
  button.innerHTML = `
    <i class="fa-solid fa-spinner fa-spin${spinnerSize(button)}" aria-hidden="true"></i>
    <span>${escapeHtml(label)}</span>
  `;

  return () => {
    button.disabled = false;
    button.innerHTML = original;
  };
}

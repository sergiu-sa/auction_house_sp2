import { describe, it, expect } from 'vitest';
import { setButtonBusy } from './busyButton';

function button(markup: string): HTMLButtonElement {
  const el = document.createElement('button');
  el.innerHTML = markup;
  return el;
}

const ORIGINAL =
  '<i class="fa-solid fa-gavel text-base" aria-hidden="true"></i><span>Place Bid</span>';

describe('setButtonBusy', () => {
  it('disables the button and shows the label', () => {
    const el = button(ORIGINAL);

    setButtonBusy(el, 'Placing Bid...');

    expect(el.disabled).toBe(true);
    expect(el.textContent).toContain('Placing Bid...');
    expect(el.querySelector('.fa-spinner')).not.toBeNull();
  });

  /**
   * The reason the restore is returned rather than left to the caller. Four of the eight handlers
   * this replaced retyped the markup, so a label changed in the template and not in the handler
   * would silently come back wrong — and no test would have noticed.
   */
  it('puts back exactly what was there, without being told what that was', () => {
    const el = button(ORIGINAL);

    const restore = setButtonBusy(el, 'Placing Bid...');
    restore();

    expect(el.innerHTML).toBe(ORIGINAL);
    expect(el.disabled).toBe(false);
  });

  it('escapes the label, since the sink is innerHTML', () => {
    const el = button(ORIGINAL);

    setButtonBusy(el, '<img src=x onerror="globalThis.__x = 1">');

    expect(el.querySelector('img')).toBeNull();
    expect(el.textContent).toContain('<img');
  });

  /**
   * The reason the spinner's size is read from the button rather than fixed.
   *
   * Measured in a browser across the eight buttons this serves: a hardcoded `text-base` grew
   * login's by 4px the instant it was clicked, and inheriting shrank the bid button by 4px.
   * `.fa-solid { line-height: 1 }` wins on an unsized icon and loses to a sized one, so the only
   * size that cannot move the button is the one the resting icon already wore.
   */
  it('gives the spinner the size class of the icon it replaces', () => {
    const sized = button(
      '<i class="fa-solid fa-gavel text-base"></i><span>Place Bid</span>'
    );
    setButtonBusy(sized, 'Placing Bid...');
    expect(sized.querySelector('.fa-spinner')?.className).toContain(
      'text-base'
    );

    const unsized = button('<i class="fa-solid fa-gavel"></i><span>Go</span>');
    setButtonBusy(unsized, 'Going...');
    expect(unsized.querySelector('.fa-spinner')?.className).not.toMatch(
      /\btext-/
    );

    const iconless = button('Delete Forever');
    setButtonBusy(iconless, 'Deleting...');
    expect(iconless.querySelector('.fa-spinner')?.className).not.toMatch(
      /\btext-/
    );
  });

  it('leaves focus on the button it is swapping', () => {
    const el = button(ORIGINAL);
    document.body.append(el);
    el.focus();

    setButtonBusy(el, 'Saving...');

    // Only the children are replaced, so a keyboard user is not dropped to <body> mid-submit.
    expect(document.activeElement).toBe(el);
    el.remove();
  });
});

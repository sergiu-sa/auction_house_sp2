import type { Page } from '@playwright/test';

/**
 * Where the header's height can change: every width `main.css` switches its reservation at, and `md`, where the navbar's padding widens and its Log in button appears.
 * `tests/headerChanges.test.ts` fails if `main.css` gains a breakpoint this does not name.
 */
export const HEADER_CHANGES = [326, 355, 564, 640, 768, 1024];

/**
 * `#header`'s reserved height from `main.css`, and the height its contents actually take.
 *
 * The reservation is a `min-height`, which clamps getBoundingClientRect:
 *  an over-reserved header reads back as exactly the number in the file, so `real` is read with it zeroed.
 * Measured: a navbar shrunk to 55px still reports 91.
 * Read after `document.fonts.ready`: read early, the header measured 20px off in both directions, and `main.css` says where.
 */
export async function measureHeader(
  page: Page
): Promise<{ reserved: number; real: number }> {
  return page.evaluate(async () => {
    await document.fonts.ready;
    const header = document.getElementById('header')!;
    const reserved = parseFloat(getComputedStyle(header).minHeight);
    const inline = header.style.getPropertyValue('min-height');
    const priority = header.style.getPropertyPriority('min-height');
    // Important, or an `!important` reservation in main.css wins and `real` reads back clamped.
    header.style.setProperty('min-height', '0px', 'important');
    try {
      if (getComputedStyle(header).minHeight !== '0px') {
        throw new Error(
          '#header min-height did not zero, so real would read back clamped'
        );
      }
      return { reserved, real: header.getBoundingClientRect().height };
    } finally {
      header.style.setProperty('min-height', inline, priority);
    }
  });
}

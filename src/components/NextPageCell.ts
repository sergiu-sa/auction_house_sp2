/**
 * The catalog grid's last cell, as a next-page control.
 *
 * It replaces a lot rather than being appended as an extra:
 *  24 and 12 cells divide exactly by 1, 2, 3 and 4 columns, and 25 and 13 strand a lone tile at every breakpoint above 640px.
 * Nothing becomes unreachable because the page size drops with it;
 *  `itemsPerPage` is also the fetch limit, so page 1 is lots 1-23 and page 2 is lots 24-46.
 *
 * It is a <div>, not an <article>: the grids' card counts are asserted by counting articles.
 */

import { formatCount } from '../utils/formatCurrency';

export interface NextPageCellConfig {
  containerId: string;
  currentPage: number;
  totalPages: number;
  /** How many lots the caller just rendered. Zero means the empty state is on screen. */
  cardCount: number;
  /** The page size, which is also the fetch limit: 11 on Home, 23 on Collection. */
  itemsPerPage: number;
  /** The whole matching set, not the slice — what the range is clamped against. */
  totalCount: number;
  viewMode?: 'grid' | 'list';
  onPageChange: (page: number) => void;
}

function cellShell(inner: string): string {
  return `
    <div
      data-next-page-cell
      class="flex flex-col justify-between bg-white p-6"
      style="border: 3px solid var(--aucto-border-dark)"
    >${inner}</div>
  `;
}

/**
 * What the button leads to, under the button rather than inside it.
 *
 * The range is the same arithmetic Collection's #results-range uses, shifted one page forward.
 * Outside the button on purpose:
 *   the button's hover paints it slate-900, and a strip that had to invert with it would need a second set of colours for no gain.
 *
 * The bar restates the "N of M" line immediately above it, so it is aria-hidden;
 *  a progress bar that repeats adjacent text is noise in a screen reader.
 * Both its colours are opaque, which keeps the contrast question answerable: axe composites through `opacity`, so a translucent fill cannot be reasoned about from its colour classes.
 */
function nextPageFooter(
  currentPage: number,
  totalPages: number,
  itemsPerPage: number,
  totalCount: number
): string {
  const start = currentPage * itemsPerPage + 1;
  if (totalCount <= 0 || start > totalCount) return '';

  const end = Math.min(start + itemsPerPage - 1, totalCount);
  const travelled = Math.round((currentPage / totalPages) * 100);

  return `
    <div class="mt-4 border-t border-slate-200 pt-4">
      <p class="text-center text-[11px] font-bold uppercase tracking-[0.18em] text-slate-600">
        Lots ${formatCount(start)}–${formatCount(end)}
      </p>
      <div data-catalog-progress class="mt-3 h-1 w-full bg-slate-200" aria-hidden="true">
        <div class="h-full bg-slate-900" style="width: ${travelled}%"></div>
      </div>
    </div>
  `;
}

function nextPageInner(
  currentPage: number,
  totalPages: number,
  itemsPerPage: number,
  totalCount: number
): string {
  const next = currentPage + 1;
  return `
    <button
      data-next-page
      type="button"
      class="group flex flex-1 flex-col items-center justify-center gap-3 text-slate-900 transition-colors hover:bg-slate-900 hover:text-white focus-visible:bg-slate-900 focus-visible:text-white focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-aucto-red focus-visible:outline-offset-2"
      style="border: 2px dashed var(--aucto-border-mid)"
      aria-label="Next page, page ${next} of ${totalPages}"
    >
      <i class="fa-solid fa-arrow-right text-3xl" aria-hidden="true"></i>
      <span class="text-[15px] font-bold uppercase tracking-[0.18em]">Next page</span>
      <span class="text-sm text-slate-600 group-hover:text-slate-300 group-focus-visible:text-slate-300">${next} of ${totalPages}</span>
    </button>
    ${nextPageFooter(currentPage, totalPages, itemsPerPage, totalCount)}
  `;
}

function lastPageInner(totalPages: number): string {
  return `
    <div class="flex flex-1 flex-col items-center justify-center gap-3 py-6 text-center">
      <i class="fa-solid fa-flag-checkered text-3xl text-slate-400" aria-hidden="true"></i>
      <span class="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-900">End of catalog</span>
      <span class="text-sm text-slate-600">Page ${totalPages} of ${totalPages}</span>
    </div>
    <button
      data-first-page
      type="button"
      class="mt-4 w-full bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-900 hover:bg-slate-50"
      style="border: 2px solid var(--aucto-border-mid)"
    >
      Back to page 1
    </button>
  `;
}

export function mountNextPageCell(config: NextPageCellConfig): void {
  const {
    containerId,
    currentPage,
    totalPages,
    cardCount,
    itemsPerPage,
    totalCount,
    viewMode = 'grid',
    onPageChange,
  } = config;

  const container = document.getElementById(containerId);
  if (!container) return;

  // Both callers rewrite the container first, so this is belt and braces;
  //   but a second cell would put the row arithmetic out by one, which is not a property to leave to the call site.
  container.querySelector('[data-next-page-cell]')?.remove();

  // One page of results needs no control, matching renderPagination's own early return.
  if (totalPages <= 1) return;

  // The empty state is one full-width panel;
  //  a tile beside it would have nothing to sit next to.
  if (cardCount === 0) return;

  // List view is one wide row per lot, so there is no card-shaped box to match.
  if (viewMode === 'list') return;

  const isLastPage = currentPage >= totalPages;

  container.insertAdjacentHTML(
    'beforeend',
    cellShell(
      isLastPage
        ? lastPageInner(totalPages)
        : nextPageInner(currentPage, totalPages, itemsPerPage, totalCount)
    )
  );

  container
    .querySelector<HTMLButtonElement>('[data-next-page]')
    ?.addEventListener('click', () => onPageChange(currentPage + 1));

  container
    .querySelector<HTMLButtonElement>('[data-first-page]')
    ?.addEventListener('click', () => onPageChange(1));
}

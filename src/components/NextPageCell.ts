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

export interface NextPageCellConfig {
  containerId: string;
  currentPage: number;
  totalPages: number;
  /** How many lots the caller just rendered. 
   * Zero means the empty state is on screen. */
  cardCount: number;
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

function nextPageInner(currentPage: number, totalPages: number): string {
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
        : nextPageInner(currentPage, totalPages)
    )
  );

  container
    .querySelector<HTMLButtonElement>('[data-next-page]')
    ?.addEventListener('click', () => onPageChange(currentPage + 1));

  container
    .querySelector<HTMLButtonElement>('[data-first-page]')
    ?.addEventListener('click', () => onPageChange(1));
}

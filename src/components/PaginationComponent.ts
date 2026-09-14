/**
 * Pagination Component
 *
 * Two shapes, named rather than assembled from independent flags:
 *
 * - `numbered` — a window of page buttons. A map, and a map is only useful when the reader can
 *   hold the territory in their head. That is the profile's two or three pages.
 * - `positional` — first/prev, the page number as a field, next/last. The catalog runs to 142
 *   pages, where `121 122 124 125` name nothing: page 124 is not a category, it is 23 more lots.
 *
 * Two independent booleans would admit four combinations and two of them are meaningless, which
 * is the same reason `toSortPreset` takes its field and direction as a pair.
 */

import { clampPage } from '../utils/clampPage';

export type PaginationVariant = 'numbered' | 'positional';

export interface PaginationConfig {
  containerId: string;
  currentPage: number;
  totalPages: number;
  maxVisiblePages?: number;
  variant?: PaginationVariant;
  onPageChange: (page: number) => void;
}

const NUMBERED_BUTTON =
  'px-4 md:px-6 py-2 md:py-3 text-xs font-bold tracking-wide transition-colors';

/**
 * Narrower than the numbered variant below `md`, and only there: five controls have to share
 * 375px without wrapping, where the numbered variant has always been free to wrap. Changing the
 * numbered string would move the profile page's visual baseline for no reason.
 */
const POSITIONAL_BUTTON =
  'inline-flex items-center justify-center gap-2 px-3 sm:px-4 md:px-6 py-2 md:py-3 text-xs font-bold tracking-wide transition-colors';

interface ArrowSpec {
  page: number;
  label: string;
  word: string;
  icon: string;
  disabled: boolean;
  iconFirst: boolean;
  strong: boolean;
}

function arrowButton(spec: ArrowSpec): string {
  const tone = spec.disabled
    ? 'cursor-not-allowed bg-slate-200 text-slate-400'
    : spec.strong
      ? 'bg-slate-900 text-white hover:bg-slate-800'
      : 'bg-white text-slate-900 hover:bg-slate-50';

  // Tokens, not the literals the numbered variant carries: GO and the field sit in this same row
  // and already use them, so a token change would otherwise split one row's borders in two.
  // Disabled stays a literal because there is no token for it.
  const border = spec.disabled
    ? '#cbd5e1'
    : spec.strong
      ? 'var(--aucto-border-dark)'
      : 'var(--aucto-border-mid)';
  const glyph = `<i class="fa-solid ${spec.icon} text-xs" aria-hidden="true"></i>`;
  const word = `<span class="hidden sm:inline">${spec.word}</span>`;

  return `
    <button
      class="${POSITIONAL_BUTTON} ${tone}"
      style="border: 2px solid ${border}"
      ${spec.disabled ? 'disabled aria-disabled="true"' : ''}
      data-page="${spec.page}"
      aria-label="${spec.label}"
    >
      ${spec.iconFirst ? glyph + word : word + glyph}
    </button>
  `;
}

/**
 * The field is the page number itself, so the words around it label it on screen and it costs
 * almost no width.
 *
 * `type="text"` with `inputmode="numeric"`, not `type="number"`: a number input's spinners
 * measure about 12x8 CSS px, under the 24x24 floor in WCAG 2.2 SC 2.5.8, and it also increments
 * on mouse-wheel while focused — scrolling the page moved the reader to a page they never asked
 * for. `clampPage` is already the narrowing point, so nothing is lost by letting text arrive.
 */
function jumpForm(
  containerId: string,
  currentPage: number,
  totalPages: number
): string {
  return `
    <form data-page-jump class="inline-flex items-center gap-2 text-xs font-medium text-slate-600 md:text-sm">
      <label for="${containerId}-page-number" class="sr-only">Page number, of ${totalPages}</label>
      <span class="hidden sm:inline">Page</span>
      <input
        id="${containerId}-page-number"
        data-page-jump-input
        type="text"
        inputmode="numeric"
        autocomplete="off"
        value="${currentPage}"
        class="w-12 bg-white px-2 py-2 text-center text-sm font-bold leading-4 text-slate-900 focus:outline focus:outline-[3px] focus:outline-aucto-red focus:outline-offset-2 md:w-14 md:py-3"
        style="border: 2px solid var(--aucto-border-mid)"
      />
      <span class="whitespace-nowrap">of <span class="font-bold text-slate-900">${totalPages}</span></span>
      <button
        type="submit"
        data-page-jump-go
        class="${POSITIONAL_BUTTON} bg-white text-slate-900 hover:bg-slate-50"
        style="border: 2px solid var(--aucto-border-mid)"
      >
        GO
      </button>
    </form>
  `;
}

/**
 * First and last are rendered only above three pages. At three, FIRST is PREV and LAST is NEXT.
 * The threshold reads `totalPages` and never `currentPage`, so no control appears or disappears
 * while the reader moves through one result set.
 *
 * Right-aligned, not centred: the grid holds 24 boxes at every breakpoint — 23 lots and the
 * next-page cell — so 1, 2, 3 and 4 columns all divide it exactly and the cell is always the
 * bottom-right tile. Ending the row under that cell keeps the reader's eye travelling down the
 * same edge it just finished on.
 */
function positionalControls(
  containerId: string,
  currentPage: number,
  totalPages: number
): string {
  const atStart = currentPage <= 1;
  // `>=`, not `===`: a page past the end would otherwise leave the forward controls enabled
  // pointing further out still, so each click walked further past the last page.
  const atEnd = currentPage >= totalPages;
  const showEnds = totalPages > 3;

  return `
    <div class="flex w-full flex-wrap items-center justify-end gap-2" role="navigation" aria-label="Pagination">
      ${
        showEnds
          ? arrowButton({
              page: 1,
              label: 'First page',
              word: 'FIRST',
              icon: 'fa-angles-left',
              disabled: atStart,
              iconFirst: true,
              strong: false,
            })
          : ''
      }
      ${arrowButton({
        // Clamped, not `currentPage - 1`: from a page past the end that would point further out
        // still, and the click handler rejects anything above `totalPages` — an enabled control
        // that silently does nothing. From 9999 of 142, back means 142.
        page: Math.min(currentPage - 1, totalPages),
        label: 'Previous page',
        word: 'PREV',
        icon: 'fa-chevron-left',
        disabled: atStart,
        iconFirst: true,
        strong: false,
      })}
      ${jumpForm(containerId, currentPage, totalPages)}
      ${arrowButton({
        page: currentPage + 1,
        label: 'Next page',
        word: 'NEXT',
        icon: 'fa-chevron-right',
        disabled: atEnd,
        iconFirst: false,
        strong: true,
      })}
      ${
        showEnds
          ? arrowButton({
              page: totalPages,
              label: 'Last page',
              word: 'LAST',
              icon: 'fa-angles-right',
              disabled: atEnd,
              iconFirst: false,
              strong: false,
            })
          : ''
      }
    </div>
  `;
}

function numberedControls(
  currentPage: number,
  totalPages: number,
  maxVisiblePages: number
): string {
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  if (endPage - startPage < maxVisiblePages - 1) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  const isPrevDisabled = currentPage === 1;
  const isNextDisabled = currentPage >= totalPages;

  let html = `
    <div class="flex w-full flex-wrap items-center justify-between gap-4" role="navigation" aria-label="Pagination">
      <div class="whitespace-nowrap text-xs font-medium text-slate-600 md:text-sm">
        Page <span class="font-bold text-slate-900">${currentPage}</span> of <span class="font-bold text-slate-900">${totalPages}</span>
      </div>

      <div class="flex flex-wrap items-center gap-2">
  `;

  html += `
    <button
      class="inline-flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 text-xs font-bold tracking-wide transition-colors ${
        isPrevDisabled
          ? 'cursor-not-allowed bg-slate-200 text-slate-400'
          : 'bg-white text-slate-900 hover:bg-slate-50'
      }"
      style="border: 2px solid ${isPrevDisabled ? '#cbd5e1' : '#334155'}"
      ${isPrevDisabled ? 'disabled aria-disabled="true"' : ''}
      data-page="${Math.min(currentPage - 1, totalPages)}"
      aria-label="Previous page"
    >
      <i class="fa-solid fa-chevron-left text-xs" aria-hidden="true"></i>
      <span class="hidden sm:inline">PREV</span>
    </button>
  `;

  if (startPage > 1) {
    html += `
      <button
        class="${NUMBERED_BUTTON} bg-white text-slate-700 hover:bg-slate-50"
        style="border: 2px solid var(--aucto-border-mid)"
        data-page="1"
        aria-label="Go to page 1"
      >
        1
      </button>
    `;
    if (startPage > 2) {
      html += `<span class="px-2 text-slate-500" aria-hidden="true">...</span>`;
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    const isActive = i === currentPage;
    html += `
      <button
        class="${NUMBERED_BUTTON} ${
          isActive
            ? 'bg-slate-900 text-white'
            : 'bg-white text-slate-700 hover:bg-slate-50'
        }"
        style="border: 2px solid ${isActive ? '#1e293b' : '#334155'}"
        data-page="${i}"
        aria-label="Go to page ${i}"
        ${isActive ? 'aria-current="page"' : ''}
      >
        ${i}
      </button>
    `;
  }

  html += `
    <button
      class="inline-flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 text-xs font-bold tracking-wide transition-colors ${
        isNextDisabled
          ? 'cursor-not-allowed bg-slate-200 text-slate-400'
          : 'bg-slate-900 text-white hover:bg-slate-800'
      }"
      style="border: 2px solid ${isNextDisabled ? '#cbd5e1' : '#1e293b'}"
      ${isNextDisabled ? 'disabled aria-disabled="true"' : ''}
      data-page="${currentPage + 1}"
      aria-label="Next page"
    >
      <span class="hidden sm:inline">NEXT</span>
      <i class="fa-solid fa-chevron-right text-xs" aria-hidden="true"></i>
    </button>
  `;

  html += `
      </div>
    </div>
  `;

  return html;
}

export function renderPagination(config: PaginationConfig): void {
  const {
    containerId,
    currentPage,
    totalPages,
    maxVisiblePages = 5,
    variant = 'numbered',
    onPageChange,
  } = config;

  const container = document.getElementById(containerId);
  if (!container) return;

  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML =
    variant === 'positional'
      ? positionalControls(containerId, currentPage, totalPages)
      : numberedControls(currentPage, totalPages, maxVisiblePages);

  const jumpInput = container.querySelector<HTMLInputElement>(
    '[data-page-jump-input]'
  );

  const commitTypedPage = (): void => {
    if (!jumpInput) return;

    const page = clampPage(jumpInput.value, totalPages);

    // The field displays the current page, so a value left in it would disagree with the grid.
    // `page === currentPage` has to snap back too, and is reachable by clamping rather than by
    // typing: 9999 on the last page lands on the page already shown, and without this the field
    // keeps reading 9999 beside "of 140" because nothing refetches and nothing re-renders.
    if (page === null || page === currentPage) {
      jumpInput.value = String(currentPage);
      return;
    }

    onPageChange(page);
  };

  /**
   * A GO press delivers two events, and which two depends on the engine. Chromium focuses the
   * button, so `focusout` names it and the click then submits. macOS Safari, Firefox, iOS and
   * Android Chrome do not focus a button, but they still *clear* focus from the field, so
   * `focusout` fires naming `null` and the click then submits. Only Enter arrives as a bare
   * submit.
   *
   * So neither event can be the sole commit path, and `relatedTarget` cannot tell the engines
   * apart — reading it suppressed the duplicate in Chromium and moved it onto everything else.
   * The blur commits and leaves a token saying so; the submit behind it spends the token and
   * stays quiet.
   *
   * The token is scoped to the gesture, never to the render. The submit that follows spends it,
   * and returning focus to the field re-arms it, so a second GO press after a failed fetch finds
   * it already spent and commits again. A guard that outlived the gesture made the page that had
   * just failed unrequestable, which is the defect this shape exists to avoid.
   */
  let handledByBlur = false;

  container
    .querySelector<HTMLFormElement>('[data-page-jump]')
    ?.addEventListener('submit', (event) => {
      event.preventDefault();
      if (handledByBlur) {
        handledByBlur = false;
        return;
      }
      commitTypedPage();
    });

  // Every blur, GO included. On iOS the numeric keypad has no Return key, so blur has to commit
  // or the field is unreachable there — and a gesture abandoned after focus reached GO (tab to
  // it and away, or press and drag off) would otherwise leave the field naming a page the grid
  // is not on.
  jumpInput?.addEventListener('focusout', () => {
    handledByBlur = true;
    commitTypedPage();
  });

  jumpInput?.addEventListener('focusin', () => {
    handledByBlur = false;
  });

  container
    .querySelectorAll<HTMLButtonElement>('button[data-page]')
    .forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        if (button.disabled) return;

        const page = parseInt(button.getAttribute('data-page') || '1', 10);
        // Not deduped against the last page asked for: no caller re-renders the pager when a
        // fetch fails, so a guard that outlived the gesture would make the page that failed
        // unrequestable and the reader could never retry.
        if (page >= 1 && page <= totalPages && page !== currentPage) {
          onPageChange(page);
        }
      });
    });
}

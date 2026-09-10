/**
 * The panel a page shows when its data would not load.
 *
 * Four pages had written their own `showError`, and the four were the same markup either side of one difference that mattered.
 * Reload, Go Back, Go to Home, Back to Listings are real choices; the twenty-five lines of icon, heading and paragraph around them were not, and they had already drifted apart on the icon, its size, its colour and the padding.
 *
 * `Home.showErrorInSections` is deliberately not one of these.
 * It writes into a card grid and is shaped like the grid's empty state, not like a page failure.
 */

import { escapeHtml } from '../utils/escapeHtml';

/** Where the reader goes from here. A destination, or something to run. */
export type ErrorPanelAction =
  | { label: string; href: string }
  | { label: string; onClick: () => void };

export interface ErrorPanelOptions {
  /** Shown to the reader, so it is escaped. */
  message: string;
  /**
   * The heading's level, which is a property of where the panel lands rather than of the panel.
   * `h1` where it replaces the whole of `main`; `h3` inside a page that already has its own `h1`.
   */
  as?: 'h1' | 'h2' | 'h3';
  /** The panel is a grid child and has to span the row. */
  fullWidth?: boolean;
  /** Where the reader goes next. Omit it and the panel offers nothing. */
  action?: ErrorPanelAction;
}

const ACTION_CLASS =
  'bg-slate-900 text-white px-6 py-3 hover:bg-slate-800 transition-colors';
const ACTION_STYLE = 'border: 2px solid var(--aucto-border-dark)';

function renderAction(action: ErrorPanelAction | undefined): string {
  if (!action) return '';

  if ('href' in action) {
    return `
      <a
        href="${escapeHtml(action.href)}"
        class="inline-block ${ACTION_CLASS}"
        style="${ACTION_STYLE}"
      >${escapeHtml(action.label)}</a>`;
  }

  return `
      <button
        type="button"
        data-error-action
        class="${ACTION_CLASS}"
        style="${ACTION_STYLE}"
      >${escapeHtml(action.label)}</button>`;
}

export function renderErrorPanel({
  message,
  as = 'h3',
  fullWidth = false,
  action,
}: ErrorPanelOptions): string {
  return `
    <div class="${fullWidth ? 'col-span-full ' : ''}bg-white p-8 text-center" style="border: 3px solid var(--aucto-border-dark)">
      <i class="fa-solid fa-exclamation-circle text-6xl text-red-300 mb-4" aria-hidden="true"></i>
      <${as} class="font-serif font-bold text-xl text-slate-900 mb-2">Error</${as}>
      <p class="text-slate-600 mb-4">${escapeHtml(message)}</p>
      ${renderAction(action)}
    </div>
  `;
}

/**
 * Write the panel into `container` and wire its action.
 *
 * The handler is bound here rather than left to the caller because the button only exists once this has run.
 *
 */
export function mountErrorPanel(
  container: HTMLElement | null,
  options: ErrorPanelOptions
): void {
  if (!container) return;

  container.innerHTML = renderErrorPanel(options);

  const action = options.action;
  if (action && 'onClick' in action) {
    container
      .querySelector('[data-error-action]')
      ?.addEventListener('click', action.onClick);
  }
}

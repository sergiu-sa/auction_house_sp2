/**
 * The listing author's form, one template behind both listing-create.html and listing-edit.html.
 *
 * The two pages rendered this markup twice, and the copies had drifted:
 * 
 *  only one was responsive, the empty-preview icon had two sizes, and the same five fields carried different ids on each page, which is the only reason the preview wiring ever needed a `mediaInputId`.
 *
 * Everything this takes as an option is content or behaviour the two pages genuinely disagree about;
 *    what the heading says, whether the end date can be edited, whether a Danger Zone follows.
 * Presentation is not an option: both pages get the same classes, so the next divergence has to be written deliberately rather than by editing one copy.
 *
 * `columns` is the exception, and a deliberate one:
 *   the two pages were approved at different column ratios, so it stays per-page rather than silently moving either grid.
 *
 * Pair every render with `initListingFormPreview`,
 *  it arms the image fallbacks this markup declares with `data-fallback`.
 */

import { escapeHtml } from '../utils/escapeHtml';
import {
  renderAdditionalImage,
  renderEmptyMainPreview,
  renderMainPreviewImage,
} from './ListingFormPreview';
import type { MediaObject } from '../types/api';

/** The id every field carries on both pages. `name` is what the API reads. */
export const LISTING_FORM_ID = 'listing-form';

/** Named because the hint and the field's `aria-describedby` must not drift apart. */
const ENDS_AT_HINT_ID = 'endsAtHint';

export interface ListingFormOptions {
  /** Small caps heading above the rule. */
  heading: string;
  /** The explanatory panel. `body` is markup, so a caller can bold a warning into it. */
  banner: { icon: string; title: string; body: string };
  /**
   * The whole `lg:grid-cols-[…]` utility for the form/preview split, per-page by decision.
   *
   * The full class, not the ratio:
   *  Tailwind finds utilities by scanning source text, so a class assembled from a fragment here would never be generated.
   * Passing it whole keeps the literal in the calling page, where the scanner reads it.
   */
  columns: string;
  title: {
    value?: string;
    placeholder?: string;
    disabled?: boolean;
    note?: string;
  };
  description: { value?: string; placeholder?: string };
  media: { value?: string; placeholder?: string };
  tags: { value?: string; placeholder?: string };
  /** `readonly` drops `required`: a field nobody can fill cannot be a precondition. */
  endsAt: { value?: string; readonly?: boolean; hint?: string };
  submit: { icon: string; label: string };
  preview: {
    title: string;
    description: string;
    endDate: string;
    media?: MediaObject[];
  };
  /** Markup appended after the grid — the edit page's Danger Zone. */
  extra?: string;
}

// The background is separate so the read-only end date can swap it. Appending a second `bg-*`
// would leave the winner to the order Tailwind emits its palette in, not to this file.
const FIELD_BASE =
  'w-full px-4 py-3 border-2 border-slate-800 text-sm focus:outline focus:outline-[3px] focus:outline-aucto-red focus:outline-offset-2 focus:border-red-700';
const FIELD_CLASS = `${FIELD_BASE} bg-white`;
const FIELD_CLASS_READONLY = `${FIELD_BASE} bg-slate-50`;
const LABEL_CLASS =
  'block mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-600';

export function renderListingForm(options: ListingFormOptions): string {
  return `
    <div class="bg-white p-6 md:p-10" style="border: 3px solid var(--aucto-border-dark)">
      <div class="mb-8 md:mb-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div class="flex items-center gap-4">
          <div class="h-0.5 w-14 bg-aucto-red"></div>
          <h1 class="text-[12px] font-bold tracking-[0.18em] uppercase text-slate-500">
            ${escapeHtml(options.heading)}
          </h1>
        </div>

        <a
          href="/profile.html"
          class="text-[12px] font-bold uppercase tracking-[0.18em] text-slate-700 hover:text-slate-900 inline-flex items-center gap-2"
        >
          <i class="fa-solid fa-arrow-left text-xs" aria-hidden="true"></i>
          <span>Back to profile</span>
        </a>
      </div>

      <div class="mb-8 md:mb-10 bg-slate-50 border-2 border-slate-300 p-4 md:p-6">
        <div class="flex items-start gap-4">
          <i class="fa-solid ${escapeHtml(options.banner.icon)} text-xl md:text-2xl text-blue-600 flex-shrink-0" aria-hidden="true"></i>
          <div>
            <h2 class="text-base md:text-lg font-bold text-slate-900 mb-2">
              ${escapeHtml(options.banner.title)}
            </h2>
            <p class="text-sm text-slate-700 leading-relaxed">
              ${options.banner.body}
            </p>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 ${options.columns} gap-8 md:gap-12">
        <form id="${LISTING_FORM_ID}" class="space-y-6 md:space-y-8">
          ${renderTitleField(options.title)}
          ${renderDescriptionField(options.description)}
          ${renderMediaField(options.media)}
          ${renderTagsField(options.tags)}
          ${renderEndsAtField(options.endsAt)}

          <button
            type="submit"
            class="w-full bg-slate-900 text-white py-3 px-4 font-bold tracking-[0.18em] uppercase border-2 border-slate-900 hover:bg-slate-800 transition-colors inline-flex items-center justify-center gap-2"
          >
            <i class="fa-solid ${escapeHtml(options.submit.icon)} text-base" aria-hidden="true"></i>
            <span>${escapeHtml(options.submit.label)}</span>
          </button>
        </form>

        ${renderPreviewPane(options.preview)}
      </div>

      ${options.extra ?? ''}
    </div>
  `;
}

function renderTitleField(field: ListingFormOptions['title']): string {
  return `
          <div>
            <label for="title" class="${LABEL_CLASS}">
              Title *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value="${escapeHtml(field.value ?? '')}"
              placeholder="${escapeHtml(field.placeholder ?? '')}"
              class="${FIELD_CLASS}"
              required
              ${field.disabled ? 'disabled' : ''}
            />
            ${field.note ? `<p class="mt-2 text-xs text-red-600">${escapeHtml(field.note)}</p>` : ''}
          </div>`;
}

function renderDescriptionField(
  field: ListingFormOptions['description']
): string {
  return `
          <div>
            <label for="description" class="${LABEL_CLASS}">
              Description *
            </label>
            <textarea
              id="description"
              name="description"
              rows="6"
              placeholder="${escapeHtml(field.placeholder ?? '')}"
              class="${FIELD_CLASS} resize-none"
              required
            >${escapeHtml(field.value ?? '')}</textarea>
          </div>`;
}

/**
 * The one field that can be dragged taller, and the only one that needs to be.
 *
 * Auction image URLs are long and wrap, so four rows lose badly: the recorded three-image lot
 * already hides 40px of content at 1440 and 160px at 375, and eight images at 375 shows 104px of
 * 664px. The description beside it measured 3 lines in a 6-row box in every case and stays fixed.
 *
 * `resize-y`, not `resize`: the browser default is both axes, and this sits in a grid column that
 * a horizontal drag would push past — the overflow `layout.spec.ts` exists to catch.
 */
function renderMediaField(field: ListingFormOptions['media']): string {
  return `
          <div>
            <label for="media" class="${LABEL_CLASS}">
              Image URLs
            </label>
            <textarea
              id="media"
              name="media"
              rows="4"
              placeholder="${escapeHtml(field.placeholder ?? '')}"
              class="${FIELD_CLASS} resize-y"
            >${escapeHtml(field.value ?? '')}</textarea>
            <p class="mt-2 text-xs text-slate-500">
              Enter one image URL per line. Images will preview on the right.
            </p>
          </div>`;
}

function renderTagsField(field: ListingFormOptions['tags']): string {
  return `
          <div>
            <label for="tags" class="${LABEL_CLASS}">
              Tags (Optional)
            </label>
            <input
              type="text"
              id="tags"
              name="tags"
              value="${escapeHtml(field.value ?? '')}"
              placeholder="${escapeHtml(field.placeholder ?? '')}"
              class="${FIELD_CLASS}"
            />
            <p class="mt-2 text-xs text-slate-500">
              Separate tags with commas
            </p>
          </div>`;
}

function renderEndsAtField(field: ListingFormOptions['endsAt']): string {
  return `
          <div>
            <label for="endsAt" class="${LABEL_CLASS}">
              End date${field.readonly ? '' : ' *'}
            </label>
            <input
              type="datetime-local"
              id="endsAt"
              name="endsAt"
              value="${escapeHtml(field.value ?? '')}"
              class="${field.readonly ? FIELD_CLASS_READONLY : FIELD_CLASS}"
              ${field.readonly ? 'readonly' : 'required'}
              ${field.hint ? `aria-describedby="${ENDS_AT_HINT_ID}"` : ''}
            />
            ${field.hint ? `<p id="${ENDS_AT_HINT_ID}" class="mt-2 text-xs text-slate-500">${escapeHtml(field.hint)}</p>` : ''}
          </div>`;
}

function renderPreviewPane(preview: ListingFormOptions['preview']): string {
  const media = preview.media ?? [];
  const thumbs = media.slice(1, 4);

  return `
        <div class="space-y-6">
          <div class="mb-4">
            <div class="flex items-center gap-3 mb-4">
              <div class="h-0.5 w-10 bg-slate-400"></div>
              <span class="text-[11px] font-bold tracking-[0.18em] uppercase text-slate-500">
                Live Preview
              </span>
            </div>
          </div>

          <div
            class="relative h-64 md:h-80 bg-slate-200 overflow-hidden"
            style="border: 3px solid var(--aucto-border-dark)"
            id="mainPreview"
          >
            ${media[0]?.url ? renderMainPreviewImage(media[0].url) : renderEmptyMainPreview()}
          </div>

          <div class="bg-slate-50 border-2 border-slate-300 p-4">
            <h3 id="previewTitle" class="font-bold text-slate-900 mb-2 text-base md:text-lg break-words">
              ${escapeHtml(preview.title)}
            </h3>
            <p id="previewDescription" class="text-sm text-slate-700 break-words">
              ${escapeHtml(preview.description)}
            </p>
            <div class="mt-4 pt-4 border-t border-slate-300">
              <p class="text-xs font-bold uppercase tracking-wider text-slate-500">
                Ends
              </p>
              <p id="previewEndDate" class="text-sm text-slate-700 mt-1">
                ${escapeHtml(preview.endDate)}
              </p>
            </div>
          </div>

          <div id="additionalImages" class="grid grid-cols-3 gap-4${thumbs.length > 0 ? '' : ' hidden'}">
            ${thumbs.map((m, i) => renderAdditionalImage(m.url, i)).join('')}
          </div>
        </div>`;
}

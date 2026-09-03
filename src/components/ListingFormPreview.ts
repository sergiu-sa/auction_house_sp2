/**
 * Live preview wiring for the listing create / edit forms.
 *
 * Both pages render the same preview markup with these element IDs:
 *   #title, #description, #endDate (or #endsAt), #previewTitle,
 *   #previewDescription, #previewEndDate, #mainPreview, #additionalImages
 *
 * Only the media textarea ID differs: `media` on create, `imageUrls` on edit.
 * That one diff is passed via options.
 */

import { escapeHtml } from '../utils/escapeHtml';
import { initImageFallbacks } from '../utils/imageFallback';

export interface ListingFormPreviewOptions {
  /** ID of the textarea holding newline-separated image URLs. */
  mediaInputId: string;
  /** ID of the datetime-local input. Defaults to `endsAt`. */
  endDateInputId?: string;
}

const DEFAULT_TITLE = 'Your listing title';
const DEFAULT_DESCRIPTION = 'Your description will appear here…';
const DEFAULT_END_DATE = 'No end date set';

export function initListingFormPreview(
  options: ListingFormPreviewOptions
): void {
  const titleInput = document.getElementById(
    'title'
  ) as HTMLInputElement | null;
  const descriptionInput = document.getElementById(
    'description'
  ) as HTMLTextAreaElement | null;
  const mediaInput = document.getElementById(
    options.mediaInputId
  ) as HTMLTextAreaElement | null;
  const endDateInput = document.getElementById(
    options.endDateInputId ?? 'endsAt'
  ) as HTMLInputElement | null;

  const previewTitle = document.getElementById('previewTitle');
  const previewDescription = document.getElementById('previewDescription');
  const previewEndDate = document.getElementById('previewEndDate');
  const mainPreview = document.getElementById('mainPreview');
  const additionalImages = document.getElementById('additionalImages');

  if (titleInput && previewTitle) {
    titleInput.addEventListener('input', () => {
      previewTitle.textContent = titleInput.value || DEFAULT_TITLE;
    });
  }

  if (descriptionInput && previewDescription) {
    descriptionInput.addEventListener('input', () => {
      previewDescription.textContent =
        descriptionInput.value || DEFAULT_DESCRIPTION;
    });
  }

  if (endDateInput && previewEndDate) {
    endDateInput.addEventListener('input', () => {
      if (endDateInput.value) {
        const date = new Date(endDateInput.value);
        previewEndDate.textContent = date.toLocaleString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        });
      } else {
        previewEndDate.textContent = DEFAULT_END_DATE;
      }
    });
  }

  if (mediaInput && mainPreview && additionalImages) {
    const updateImagePreviews = (): void => {
      const urls = mediaInput.value
        .split('\n')
        .map((url) => url.trim())
        .filter((url) => url !== '');

      if (urls.length === 0) {
        mainPreview.innerHTML = renderEmptyMainPreview();
        hideAdditional(additionalImages);
        return;
      }

      mainPreview.innerHTML = renderMainPreviewImage(urls[0]);
      initImageFallbacks(mainPreview, (img) =>
        replaceWithBrokenImageNotice(img, 'main')
      );

      if (urls.length > 1) {
        showAdditional(additionalImages);
        additionalImages.innerHTML = urls
          .slice(1, 4)
          .map((url, index) => renderAdditionalImage(url, index))
          .join('');
        initImageFallbacks(additionalImages, (img) =>
          replaceWithBrokenImageNotice(img, 'thumb')
        );
      } else {
        hideAdditional(additionalImages);
      }
    };

    mediaInput.addEventListener('input', updateImagePreviews);
  }
}

function renderEmptyMainPreview(): string {
  return `
    <div class="w-full h-full flex items-center justify-center text-slate-600">
      <div class="text-center">
        <i class="fa-solid fa-image text-6xl mb-2 block text-slate-400" aria-hidden="true"></i>
        <p class="text-sm">No image added yet</p>
      </div>
    </div>
  `;
}

function renderMainPreviewImage(url: string): string {
  return `
    <img
      src="${escapeHtml(url)}"
      class="w-full h-full object-cover"
      alt="Preview"
      loading="lazy"
      decoding="async"
      referrerpolicy="no-referrer"
      data-fallback
    />
  `;
}

/**
 * The URL here is whatever the author has typed so far, so most keystrokes produce a broken image.
 * Built as DOM nodes rather than as an innerHTML string:
 *   the markup this replaced carried its own hand-escaped quotes inside an inline handler, which is the shape F-034 was filed for.
 */
function replaceWithBrokenImageNotice(
  img: HTMLImageElement,
  size: 'main' | 'thumb'
): void {
  const parent = img.parentElement;
  if (!parent) return;

  const box = document.createElement('div');
  box.className =
    size === 'main'
      ? 'w-full h-full flex flex-col items-center justify-center text-center text-slate-400'
      : 'w-full h-24 flex items-center justify-center bg-slate-200 text-slate-400';

  const icon = document.createElement('i');
  icon.className =
    size === 'main'
      ? 'fa-solid fa-circle-xmark text-6xl mb-2 block text-red-500'
      : 'fa-solid fa-circle-xmark text-red-500';
  icon.setAttribute('aria-hidden', 'true');
  box.append(icon);

  if (size === 'main') {
    const label = document.createElement('p');
    label.className = 'text-sm';
    label.textContent = 'Invalid image URL';
    box.append(label);
  }

  parent.replaceChildren(box);
}

function renderAdditionalImage(url: string, index: number): string {
  return `
    <div class="bg-white border-2 border-slate-900 overflow-hidden">
      <img
        src="${escapeHtml(url)}"
        class="w-full h-24 object-cover"
        alt="Additional preview ${index + 1}"
        loading="lazy"
        decoding="async"
        referrerpolicy="no-referrer"
        data-fallback
      />
    </div>
  `;
}

function showAdditional(el: HTMLElement): void {
  el.classList.remove('hidden');
  el.classList.add('grid', 'grid-cols-3', 'gap-4');
}

function hideAdditional(el: HTMLElement): void {
  el.classList.add('hidden');
  el.classList.remove('grid', 'grid-cols-3', 'gap-4');
}

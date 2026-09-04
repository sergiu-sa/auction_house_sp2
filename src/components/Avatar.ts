/**
 * A person's picture, with the initial-letter box that stands in when there isn't one.
 *
 * This was hand-written at five sites, each spelling the letter box out twice;
 *   once hidden behind the image and once for the no-picture branch, and the two copies are not interchangeable:
 *  the hidden one carries `items-center justify-center` *without* `flex`, because `initIdentityFallbacks` reveals it by setting `display: flex`.
 * Give the hidden copy `flex` and it shows through from the start;
 *  leave it off the visible copy and the letter sits top-left.
 * One of the five had already drifted on `aria-hidden` before this was extracted.
 *
 * The letter is `aria-hidden` in every case:
 *  each surface prints the name as adjacent text, so announcing a bare initial adds noise and never information.
 */

import { escapeHtml } from '../utils/escapeHtml';

export interface AvatarOptions {
  /** The picture's URL, if the profile has one. */
  url?: string;
  /** Used for the initial and, unless `alt` says otherwise, to describe the image. */
  name: string;
  /** Tailwind box size, e.g. `'h-10 w-10'`. Applies to the image and the letter alike. */
  sizeClass: string;
  /** Tailwind type size for the letter, e.g. `'text-sm'`. */
  textClass: string;
  /** Tailwind background for the letter box. */
  bgClass?: string;
  /** Inline border, which differs per surface and is not expressible in the palette's utilities. */
  borderStyle?: string;
  /**
   * `alt` for the image. Pass `''` where the surrounding control is already named — the navbar's
   * profile button names itself from the visible username, and a second name there would repeat it.
   */
  alt?: string;
  loading?: 'lazy' | 'eager';
}

export function renderAvatar({
  url,
  name,
  sizeClass,
  textClass,
  bgClass = 'bg-slate-900',
  borderStyle,
  alt,
  loading = 'lazy',
}: AvatarOptions): string {
  const border = borderStyle ? ` ${borderStyle}` : '';
  const letter = escapeHtml(name.charAt(0).toUpperCase());

  if (!url) {
    return `<div class="${sizeClass} ${bgClass} text-white flex items-center justify-center font-bold ${textClass}" style="${borderStyle ?? ''}" aria-hidden="true">${letter}</div>`;
  }

  return `<img
      src="${escapeHtml(url)}"
      alt="${escapeHtml(alt ?? `${name} avatar`)}"
      class="${sizeClass} object-cover"
      loading="${loading}"
      decoding="async"
      referrerpolicy="no-referrer"
      style="${borderStyle ?? ''}"
      data-identity-image
    />
    <div class="${sizeClass} ${bgClass} text-white items-center justify-center font-bold ${textClass}" style="display: none;${border}" aria-hidden="true" data-identity-fallback>${letter}</div>`;
}

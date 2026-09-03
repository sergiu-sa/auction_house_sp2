/**
 * The create and edit forms hold media and tags as text, one URL per line and comma-separated tags, so each field is serialised on render and parsed back on submit.
 * Both halves live here because both pages need the parse and the edit page needs the format, and a round trip that loses a value is invisible until someone re-saves a listing.
 */

import type { MediaObject } from '../types/api';

/** Media objects to the textarea's text: one URL per line. */
export function formatMediaUrls(media?: MediaObject[] | null): string {
  return media?.map((m) => m.url).join('\n') || '';
}

/** The textarea's text back to URLs, dropping blank lines and surrounding space. */
export function parseMediaUrls(value: string | null | undefined): string[] {
  return (value ?? '')
    .split('\n')
    .map((url) => url.trim())
    .filter((url) => url !== '');
}

/** Tags to the input's text. */
export function formatTags(tags?: string[] | null): string {
  return tags?.join(', ') || '';
}

/** The input's text back to tags, dropping empties and surrounding space. */
export function parseTags(value: string | null | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag !== '');
}

/**
 * A `Date` as the `value` (or `min`) a `datetime-local` input takes: `YYYY-MM-DDTHH:mm`.
 *
 * Local getters, not `toISOString()`: the input has no time zone, so a browser reads the string back as local wall-clock time.
 * Formatting it as UTC shifted the edit form by the viewer's offset.
 *
 */
export function toDateTimeLocal(date: Date): string {
  // An unparseable date used to reach here as `toISOString()`, which threw and left the caller showing its error state.
  // The local getters return NaN instead, which would put a literal "NaN-NaN-NaNTNaN:NaN" in front of the user, so refuse rather than format garbage.
  if (Number.isNaN(date.getTime())) return '';

  const pad = (n: number): string => String(n).padStart(2, '0');

  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

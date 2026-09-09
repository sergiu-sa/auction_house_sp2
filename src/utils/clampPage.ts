/**
 * Turn whatever was typed into a page that exists. `null` means nothing usable was typed.
 *
 * `parseInt` skips surrounding whitespace and returns NaN for an empty string, so the NaN check
 * covers a blank field; a separate guard for that one is unreachable.
 */
export function clampPage(raw: string, totalPages: number): number | null {
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) return null;

  return Math.min(Math.max(parsed, 1), totalPages);
}

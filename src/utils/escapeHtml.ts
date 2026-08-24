/**
 * Escape a value for interpolation into an HTML string.
 *
 * Every component here builds markup as a template string and assigns it to innerHTML, so anything a user can write;
 *  — listing titles, descriptions, media URLs, seller names, bios, tags — has to pass through this first.
 *
 * The double quote is not optional.
 * Most of the values above land inside a quoted attribute (alt=, src=, value=), where a bare `"` closes the attribute and everything after it parses as further attributes; including onerror.
 */
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(value: string | number | null | undefined): string {
  // String() rather than a `?? ''` default, so a null or undefined that reaches a sink renders exactly what the bare template literal used to render.
  return String(value).replace(/[&<>"']/g, (char) => HTML_ENTITIES[char]);
}

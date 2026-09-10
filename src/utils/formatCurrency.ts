/**
 * One implementation of "group a number for the reader".
 *
 * Three names, one grouping call, because the call sites mean different things and should say so:
 * `formatCredits` for money where the markup prints the unit itself, `formatCurrency` where the
 * whole phrase is wanted in one string, and `formatCount` for things that are counted rather than
 * spent — lots, bids, results.
 *
 * The locale is pinned. `toLocaleString()` with no argument follows the reader's machine, so the
 * same balance renders `1,002` here and `1 002` on a Norwegian one while every neighbouring figure
 * stays en-US. That is not hypothetical: the home hero printed two unpinned counters beside a
 * pinned credit figure until it was fixed.
 *
 * The filename predates `formatCount` and is left alone deliberately — renaming it would touch
 * twelve importers and change no behaviour.
 */
const GROUPED = new Intl.NumberFormat('en-US');

/** The figure alone: `1000` -> `"1,000"`. For markup that prints the unit itself. */
export function formatCredits(amount: number): string {
  return GROUPED.format(amount);
}

/**
 * A quantity of things rather than of credits: `3200` -> `"3,200"`.
 *
 * Identical output to `formatCredits` today. It exists so a call site says which it means, and so
 * a later change to how counts read — compact notation above a threshold, say — happens in one
 * place instead of ten.
 */
export function formatCount(value: number): string {
  return GROUPED.format(value);
}

/**
 * Format number as credits.
 * Example: 1000 -> "1,000 credits" or "1,000 cr"
 */
export function formatCurrency(amount: number, short: boolean = false): string {
  const formatted = formatCredits(amount);
  return short ? `${formatted} cr` : `${formatted} credits`;
}

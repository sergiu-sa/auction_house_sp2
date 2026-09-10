/**
 * One implementation of "group a credit amount".
 *
 * The number and the unit are separate calls on purpose.
 * Most surfaces print the word themselves, as a styled `<span>Credits</span>` beside the figure, or inside a longer sentence, and those sites want `formatCredits`. Only the ones that need the whole phrase in one string call `formatCurrency`.
 *
 * The locale is pinned.
 * `toLocaleString()` with no argument follows the reader's machine, so the same balance renders `1,002` here and `1 002` on a Norwegian one while every neighbouring figure stays en-US.
 */
/** The figure alone: `1000` -> `"1,000"`. For markup that prints the unit itself. */
export function formatCredits(amount: number): string {
  return new Intl.NumberFormat('en-US').format(amount);
}

/**
 * Format number as credits.
 * Example: 1000 -> "1,000 credits" or "1,000 cr"
 */
export function formatCurrency(amount: number, short: boolean = false): string {
  const formatted = formatCredits(amount);
  return short ? `${formatted} cr` : `${formatted} credits`;
}

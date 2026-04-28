/**
 * Format number as credits.
 * Example: 1000 -> "1,000 credits" or "1,000 cr"
 */
export function formatCurrency(amount: number, short: boolean = false): string {
  const formatted = new Intl.NumberFormat('en-US').format(amount);
  return short ? `${formatted} cr` : `${formatted} credits`;
}

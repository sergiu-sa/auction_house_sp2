/**
 * Format number as currency (credits)
 * Example: 1000 -> "1,000 credits" or "1,000 cr"
 */
export function formatCurrency(amount: number, short: boolean = false): string {
  const formatted = new Intl.NumberFormat('en-US').format(amount);
  return short ? `${formatted} cr` : `${formatted} credits`;
}

/**
 * Format number as currency with symbol
 * Example: 1000 -> "€1,000"
 */
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format large numbers with abbreviations
 * Example: 1500 -> "1.5K", 1000000 -> "1M"
 */
export function formatLargeNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toString();
}
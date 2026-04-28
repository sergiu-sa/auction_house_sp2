/**
 * Format date to readable string
 * Example: "Jan 15, 2024 at 2:30 PM"
 */
export function formatDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  return dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format date to short format
 * Example: "Jan 15, 2024"
 */
export function formatDateShort(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  return dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Get time remaining until a date
 * Returns object with days, hours, minutes, seconds
 */
export function getTimeRemaining(endDate: string | Date): {
  total: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
} {
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  const now = new Date();
  const total = end.getTime() - now.getTime();

  if (total <= 0) {
    return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  }

  const seconds = Math.floor((total / 1000) % 60);
  const minutes = Math.floor((total / 1000 / 60) % 60);
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const days = Math.floor(total / (1000 * 60 * 60 * 24));

  return { total, days, hours, minutes, seconds, expired: false };
}

/**
 * Format time remaining to readable string
 * Example: "2d 5h 30m" or "5h 30m" or "30m" or "Ended"
 */
export function formatTimeRemaining(endDate: string | Date): string {
  const remaining = getTimeRemaining(endDate);

  if (remaining.expired) {
    return 'Ended';
  }

  const parts: string[] = [];

  if (remaining.days > 0) {
    parts.push(`${remaining.days}d`);
  }
  if (remaining.hours > 0) {
    parts.push(`${remaining.hours}h`);
  }
  if (remaining.minutes > 0) {
    parts.push(`${remaining.minutes}m`);
  }

  // Show seconds only if less than 1 minute remaining
  if (parts.length === 0 && remaining.seconds > 0) {
    parts.push(`${remaining.seconds}s`);
  }

  return parts.join(' ') || 'Ending soon';
}

/**
 * Check if auction is still active
 */
export function isAuctionActive(endDate: string | Date): boolean {
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  return end > new Date();
}
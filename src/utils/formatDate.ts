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
 * Format date for datetime-local input
 * Example: "2024-01-15T14:30"
 */
export function formatDateForInput(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
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

/**
 * Get relative time string
 * Example: "2 hours ago", "Just now", "In 3 days"
 */
export function getRelativeTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - dateObj.getTime();
  const absDiff = Math.abs(diff);

  const seconds = Math.floor(absDiff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  const isFuture = diff < 0;
  const prefix = isFuture ? 'In ' : '';
  const suffix = isFuture ? '' : ' ago';

  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${prefix}${minutes} minute${minutes > 1 ? 's' : ''}${suffix}`;
  if (hours < 24) return `${prefix}${hours} hour${hours > 1 ? 's' : ''}${suffix}`;
  if (days < 30) return `${prefix}${days} day${days > 1 ? 's' : ''}${suffix}`;
  if (months < 12) return `${prefix}${months} month${months > 1 ? 's' : ''}${suffix}`;
  return `${prefix}${years} year${years > 1 ? 's' : ''}${suffix}`;
}
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  formatDate,
  formatDateShort,
  getTimeRemaining,
  formatTimeRemaining,
  formatTimeRemainingCompact,
  formatTimeAgo,
  isAuctionActive,
} from './formatDate';

describe('Date Formatting', () => {
  describe('formatDate', () => {
    it('should format date with time', () => {
      const date = new Date('2024-01-15T14:30:00');
      const formatted = formatDate(date);

      expect(formatted).toContain('Jan');
      expect(formatted).toContain('15');
      expect(formatted).toContain('2024');
      expect(formatted).toMatch(/\d{1,2}:\d{2}/); // Has time
    });

    it('should handle string dates', () => {
      const formatted = formatDate('2024-01-15T14:30:00');

      expect(formatted).toContain('Jan');
      expect(formatted).toContain('15');
      expect(formatted).toContain('2024');
    });

    it('should handle Date objects', () => {
      const date = new Date('2024-06-20T09:00:00');
      const formatted = formatDate(date);

      expect(formatted).toContain('Jun');
      expect(formatted).toContain('20');
      expect(formatted).toContain('2024');
    });
  });

  describe('formatDateShort', () => {
    it('should format date without time', () => {
      const date = new Date('2024-01-15T14:30:00');
      const formatted = formatDateShort(date);

      expect(formatted).toContain('Jan');
      expect(formatted).toContain('15');
      expect(formatted).toContain('2024');
      expect(formatted).not.toMatch(/\d{1,2}:\d{2}/); // No time
    });

    it('should handle string dates', () => {
      const formatted = formatDateShort('2024-12-25T00:00:00');

      expect(formatted).toContain('Dec');
      expect(formatted).toContain('25');
      expect(formatted).toContain('2024');
    });
  });
});

describe('Time Remaining Calculations', () => {
  beforeEach(() => {
    // Mock current date to make tests consistent
    vi.setSystemTime(new Date('2024-01-15T12:00:00'));
  });

  describe('getTimeRemaining', () => {
    it('should calculate remaining time correctly', () => {
      const endDate = new Date('2024-01-18T14:30:00'); // 3 days, 2.5 hours from now
      const remaining = getTimeRemaining(endDate);

      expect(remaining.expired).toBe(false);
      expect(remaining.days).toBe(3);
      expect(remaining.hours).toBe(2);
      expect(remaining.minutes).toBe(30);
    });

    it('should return zero values for expired auctions', () => {
      const endDate = new Date('2024-01-10T12:00:00'); // Past date
      const remaining = getTimeRemaining(endDate);

      expect(remaining.expired).toBe(true);
      expect(remaining.total).toBe(0);
      expect(remaining.days).toBe(0);
      expect(remaining.hours).toBe(0);
      expect(remaining.minutes).toBe(0);
      expect(remaining.seconds).toBe(0);
    });

    it('should handle hours and minutes correctly', () => {
      const endDate = new Date('2024-01-15T14:45:00'); // 2 hours 45 min from now
      const remaining = getTimeRemaining(endDate);

      expect(remaining.expired).toBe(false);
      expect(remaining.days).toBe(0);
      expect(remaining.hours).toBe(2);
      expect(remaining.minutes).toBe(45);
    });

    it('should handle string dates', () => {
      const remaining = getTimeRemaining('2024-01-16T12:00:00');

      expect(remaining.expired).toBe(false);
      expect(remaining.days).toBe(1);
    });
  });

  describe('formatTimeRemaining', () => {
    it('should format days, hours, and minutes', () => {
      const endDate = new Date('2024-01-18T14:30:00');
      const formatted = formatTimeRemaining(endDate);

      expect(formatted).toBe('3d 2h 30m');
    });

    it('should show "Ended" for expired auctions', () => {
      const endDate = new Date('2024-01-10T12:00:00');
      const formatted = formatTimeRemaining(endDate);

      expect(formatted).toBe('Ended');
    });

    it('should format hours and minutes only when no days', () => {
      const endDate = new Date('2024-01-15T15:45:00');
      const formatted = formatTimeRemaining(endDate);

      expect(formatted).toBe('3h 45m');
    });

    it('should show seconds when less than 1 minute remaining', () => {
      const endDate = new Date('2024-01-15T12:00:30');
      const formatted = formatTimeRemaining(endDate);

      expect(formatted).toBe('30s');
    });

    it('should show "Ending soon" for edge cases', () => {
      const endDate = new Date('2024-01-15T12:00:00');
      const formatted = formatTimeRemaining(endDate);

      expect(formatted).toMatch(/Ended|Ending soon|0s/);
    });
  });

  describe('isAuctionActive', () => {
    it('should return true for future dates', () => {
      const futureDate = new Date('2024-01-20T12:00:00');

      expect(isAuctionActive(futureDate)).toBe(true);
    });

    it('should return false for past dates', () => {
      const pastDate = new Date('2024-01-10T12:00:00');

      expect(isAuctionActive(pastDate)).toBe(false);
    });

    it('should handle string dates', () => {
      expect(isAuctionActive('2024-01-20T12:00:00')).toBe(true);
      expect(isAuctionActive('2024-01-10T12:00:00')).toBe(false);
    });
  });
});

describe('formatTimeAgo', () => {
  beforeEach(() => {
    vi.setSystemTime(new Date('2024-01-15T12:00:00'));
  });

  it('should show "just now" for dates less than a minute old', () => {
    expect(formatTimeAgo(new Date('2024-01-15T11:59:30'))).toBe('just now');
  });

  it('should format minutes ago', () => {
    expect(formatTimeAgo(new Date('2024-01-15T11:55:00'))).toBe('5m ago');
  });

  it('should format hours ago', () => {
    expect(formatTimeAgo(new Date('2024-01-15T09:00:00'))).toBe('3h ago');
  });

  it('should format days ago', () => {
    expect(formatTimeAgo(new Date('2024-01-13T12:00:00'))).toBe('2d ago');
  });

  it('should use the largest whole unit only', () => {
    expect(formatTimeAgo(new Date('2024-01-13T09:30:00'))).toBe('2d ago');
  });

  it('should handle string dates', () => {
    expect(formatTimeAgo('2024-01-15T10:00:00')).toBe('2h ago');
  });

  it('should show "just now" for future dates', () => {
    expect(formatTimeAgo(new Date('2024-01-15T12:05:00'))).toBe('just now');
  });
});

describe('formatTimeRemainingCompact', () => {
  beforeEach(() => {
    vi.setSystemTime(new Date('2024-01-15T12:00:00'));
  });

  it('should show only the largest unit when days remain', () => {
    expect(formatTimeRemainingCompact(new Date('2024-01-18T14:30:00'))).toBe('3d');
  });

  it('should show hours when less than a day remains', () => {
    expect(formatTimeRemainingCompact(new Date('2024-01-15T15:45:00'))).toBe('3h');
  });

  it('should show minutes when less than an hour remains', () => {
    expect(formatTimeRemainingCompact(new Date('2024-01-15T12:45:00'))).toBe('45m');
  });

  it('should show seconds when less than a minute remains', () => {
    expect(formatTimeRemainingCompact(new Date('2024-01-15T12:00:30'))).toBe('30s');
  });

  it('should show "Ended" for past dates', () => {
    expect(formatTimeRemainingCompact(new Date('2024-01-10T12:00:00'))).toBe('Ended');
  });

  it('should handle string dates', () => {
    expect(formatTimeRemainingCompact('2024-01-22T12:00:00')).toBe('7d');
  });
});

describe('unparseable dates', () => {
  beforeEach(() => {
    vi.setSystemTime(new Date('2024-01-15T12:00:00'));
  });

  it('should treat an unparseable date as expired', () => {
    expect(getTimeRemaining('not-a-date').expired).toBe(true);
  });

  it('should not leak NaN into the compact countdown', () => {
    expect(formatTimeRemainingCompact('not-a-date')).toBe('Ended');
  });

  it('should not leak NaN into the full countdown', () => {
    expect(formatTimeRemaining('not-a-date')).toBe('Ended');
  });
});

describe('formatTimeAgo beyond a month', () => {
  beforeEach(() => {
    vi.setSystemTime(new Date('2024-01-15T12:00:00'));
  });

  it('should still count days at the 30 day boundary', () => {
    expect(formatTimeAgo(new Date('2023-12-16T12:00:00'))).toBe('30d ago');
  });

  it('should fall back to a short date past 30 days', () => {
    expect(formatTimeAgo(new Date('2023-11-01T12:00:00'))).toBe('Nov 1, 2023');
  });
});

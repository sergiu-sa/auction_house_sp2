import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  formatDate,
  formatDateShort,
  getTimeRemaining,
  formatTimeRemaining,
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

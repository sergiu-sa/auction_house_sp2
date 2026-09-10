import { describe, it, expect } from 'vitest';
import { formatCount, formatCredits, formatCurrency } from './formatCurrency';

describe('Currency Formatting', () => {
  describe('formatCredits', () => {
    it('groups thousands, and prints no unit', () => {
      expect(formatCredits(1000)).toBe('1,000');
      expect(formatCredits(1002)).toBe('1,002');
      expect(formatCredits(999999999)).toBe('999,999,999');
    });

    it('leaves small numbers alone', () => {
      expect(formatCredits(0)).toBe('0');
      expect(formatCredits(52)).toBe('52');
      expect(formatCredits(999)).toBe('999');
    });

    // The locale is pinned rather than the reader's, so a figure printed beside one that formatCurrency produced cannot use a different separator.
    it('agrees with formatCurrency on the figure', () => {
      expect(formatCurrency(1002)).toBe(`${formatCredits(1002)} credits`);
      expect(formatCurrency(1002, true)).toBe(`${formatCredits(1002)} cr`);
    });
  });

  describe('formatCount', () => {
    it('groups a quantity the same way', () => {
      expect(formatCount(3200)).toBe('3,200');
      expect(formatCount(0)).toBe('0');
    });

    /**
     * Its own expectations, not parity with `formatCredits`.
     *
     * Pinning the two equal for every input would foreclose the reason this function exists —
     * that counts may one day read differently from credits — and it guards against nothing:
     * both delegate to the one module-level `Intl` instance, so a second one cannot drift in.
     */
    it("pins the locale, whatever the reader's machine is set to", () => {
      expect(formatCount(1000)).toBe('1,000');
      expect(formatCount(3200)).toBe('3,200');
      expect(formatCount(999999999)).toBe('999,999,999');
    });
  });

  describe('formatCurrency', () => {
    it('should format numbers with comma separators', () => {
      expect(formatCurrency(1000)).toBe('1,000 credits');
      expect(formatCurrency(1000000)).toBe('1,000,000 credits');
      expect(formatCurrency(500)).toBe('500 credits');
    });

    it('should format with short notation when requested', () => {
      expect(formatCurrency(1000, true)).toBe('1,000 cr');
      expect(formatCurrency(500, true)).toBe('500 cr');
    });

    it('should handle zero', () => {
      expect(formatCurrency(0)).toBe('0 credits');
      expect(formatCurrency(0, true)).toBe('0 cr');
    });

    it('should handle single digits', () => {
      expect(formatCurrency(5)).toBe('5 credits');
      expect(formatCurrency(5, true)).toBe('5 cr');
    });

    it('should handle large numbers', () => {
      expect(formatCurrency(999999999)).toBe('999,999,999 credits');
    });

    it('should use full format by default', () => {
      expect(formatCurrency(100)).toBe('100 credits');
      expect(formatCurrency(100, false)).toBe('100 credits');
    });
  });
});

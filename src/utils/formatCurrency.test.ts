import { describe, it, expect } from 'vitest';
import { formatCurrency } from './formatCurrency';

describe('Currency Formatting', () => {
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

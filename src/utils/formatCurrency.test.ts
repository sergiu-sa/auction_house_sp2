import { describe, it, expect } from 'vitest';
import { formatCurrency, formatPrice, formatLargeNumber } from './formatCurrency';

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

  describe('formatPrice', () => {
    it('should format as Euro currency', () => {
      const result = formatPrice(1000);

      expect(result).toContain('1,000');
      expect(result).toContain('€');
    });

    it('should not show decimal places', () => {
      const result = formatPrice(1000.99);

      expect(result).not.toContain('.99');
      expect(result).toContain('1,001');
    });

    it('should handle zero', () => {
      const result = formatPrice(0);

      expect(result).toContain('0');
      expect(result).toContain('€');
    });

    it('should handle large numbers', () => {
      const result = formatPrice(1234567);

      expect(result).toContain('1,234,567');
      expect(result).toContain('€');
    });

    it('should round decimal values', () => {
      expect(formatPrice(100.4)).toMatch(/€?100/);
      expect(formatPrice(100.6)).toMatch(/€?101/);
    });
  });

  describe('formatLargeNumber', () => {
    it('should abbreviate millions', () => {
      expect(formatLargeNumber(1000000)).toBe('1M');
      expect(formatLargeNumber(1500000)).toBe('1.5M');
      expect(formatLargeNumber(2000000)).toBe('2M');
      expect(formatLargeNumber(2300000)).toBe('2.3M');
    });

    it('should abbreviate thousands', () => {
      expect(formatLargeNumber(1000)).toBe('1K');
      expect(formatLargeNumber(1500)).toBe('1.5K');
      expect(formatLargeNumber(2000)).toBe('2K');
      expect(formatLargeNumber(5400)).toBe('5.4K');
    });

    it('should not abbreviate numbers under 1000', () => {
      expect(formatLargeNumber(999)).toBe('999');
      expect(formatLargeNumber(500)).toBe('500');
      expect(formatLargeNumber(0)).toBe('0');
      expect(formatLargeNumber(1)).toBe('1');
    });

    it('should remove trailing .0 decimals', () => {
      expect(formatLargeNumber(1000)).toBe('1K');
      expect(formatLargeNumber(2000000)).toBe('2M');
      expect(formatLargeNumber(3000)).toBe('3K');
    });

    it('should show one decimal place for non-round numbers', () => {
      expect(formatLargeNumber(1234)).toBe('1.2K');
      expect(formatLargeNumber(5678)).toBe('5.7K');
      expect(formatLargeNumber(1234567)).toBe('1.2M');
    });

    it('should handle edge cases', () => {
      expect(formatLargeNumber(999999)).toBe('1000K');
      expect(formatLargeNumber(1000000)).toBe('1M');
    });
  });
});

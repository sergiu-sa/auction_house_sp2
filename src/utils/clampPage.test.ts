import { describe, it, expect } from 'vitest';
import { clampPage } from './clampPage';

describe('clampPage', () => {
  it('accepts a page inside the range', () => {
    expect(clampPage('7', 140)).toBe(7);
  });

  it('clamps above the last page rather than erroring', () => {
    expect(clampPage('999', 140)).toBe(140);
  });

  it('clamps below the first page', () => {
    expect(clampPage('0', 140)).toBe(1);
    expect(clampPage('-4', 140)).toBe(1);
  });

  it('rejects what is not a number, with no error state to render', () => {
    expect(clampPage('', 140)).toBeNull();
    expect(clampPage('   ', 140)).toBeNull();
    expect(clampPage('abc', 140)).toBeNull();
  });

  it('truncates a decimal rather than rounding into a page that was not typed', () => {
    expect(clampPage('7.9', 140)).toBe(7);
  });
});

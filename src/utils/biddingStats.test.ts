import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import {
  calculateWinRate,
  countAuctionsBidOn,
  calculateActiveBidsValue,
  highestBid,
  isStillRunning,
} from './biddingStats';
import type { Bid } from '../types/api';

describe('biddingStats', () => {
  describe('calculateWinRate', () => {
    it('returns 0 when there are no attempted auctions', () => {
      expect(calculateWinRate(0, 0)).toBe(0);
      expect(calculateWinRate(0, 5)).toBe(0);
    });

    it('calculates the correct percentage', () => {
      expect(calculateWinRate(10, 5)).toBe(50);
      expect(calculateWinRate(4, 1)).toBe(25);
    });

    it('caps the win rate at 100%', () => {
      expect(calculateWinRate(5, 6)).toBe(100);
    });
  });

  describe('countAuctionsBidOn', () => {
    it('returns 0 for empty bids array', () => {
      expect(countAuctionsBidOn([])).toBe(0);
    });

    it('counts unique listing IDs', () => {
      const bids = [
        { listing: { id: 'listing-1' } },
        { listing: { id: 'listing-2' } },
        { listing: { id: 'listing-1' } },
      ] as Bid[];
      expect(countAuctionsBidOn(bids)).toBe(2);
    });

    it('ignores bids missing a listing ID', () => {
      const bids = [
        { listing: { id: 'listing-1' } },
        { listing: undefined },
        { listing: { id: '' } }, // Empty strings would not be added if falsy, but `id` is a string
      ] as Bid[];
      expect(countAuctionsBidOn(bids)).toBe(1); // '' is falsy so it doesn't get added by the condition
    });
  });

  describe('calculateActiveBidsValue', () => {
    beforeAll(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-08-26T12:00:00Z'));
    });

    afterAll(() => {
      vi.useRealTimers();
    });

    it('returns 0 for empty bids array', () => {
      expect(calculateActiveBidsValue([])).toBe(0);
    });

    it('sums only the bids for active listings', () => {
      const bids = [
        // Ended
        { amount: 100, listing: { endsAt: '2026-08-25T12:00:00Z' } },
        // Active
        { amount: 200, listing: { endsAt: '2026-08-27T12:00:00Z' } },
        // Active
        { amount: 300, listing: { endsAt: '2026-08-28T12:00:00Z' } },
        // Missing listing
        { amount: 400 },
      ] as Bid[];

      expect(calculateActiveBidsValue(bids)).toBe(500);
    });
  });
});

describe('highestBid', () => {
  const bid = (amount: number): Bid => ({
    id: `bid-${amount}`,
    amount,
    created: '2026-08-01T00:00:00.000Z',
  });

  it('returns 0 when there are no bids', () => {
    expect(highestBid([])).toBe(0);
    expect(highestBid(undefined)).toBe(0);
  });

  // The reason this is one function:
  //  four call sites each hand-rolled it, and reading the last bid rather than the largest is the exact defect that motivated extracting it.
  it('returns the largest amount, not the last one', () => {
    expect(highestBid([bid(50), bid(400), bid(120)])).toBe(400);
  });

  it('handles a single bid', () => {
    expect(highestBid([bid(75)])).toBe(75);
  });

  it('does not spread a large bid list onto the call stack', () => {
    const many = Array.from({ length: 200000 }, (_, i) => bid(i));
    expect(highestBid(many)).toBe(199999);
  });
});

describe('isStillRunning', () => {
  it('is true for a lot ending in the future', () => {
    expect(isStillRunning({ endsAt: '2099-01-01T00:00:00.000Z' })).toBe(true);
  });

  it('is false for a lot that has ended', () => {
    expect(isStillRunning({ endsAt: '2020-01-01T00:00:00.000Z' })).toBe(false);
  });

  it('is false for an unparseable date rather than throwing', () => {
    expect(isStillRunning({ endsAt: 'not-a-date' })).toBe(false);
  });
});

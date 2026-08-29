import type { Bid } from '../types/api';

/**
 * The winning amount on a lot, or 0 if nobody has bid.
 *
 * A reduce rather than `Math.max(...amounts)`:
 *  spreading a long bid list passes one argument per bid and blows the call stack on a popular lot.
 */
export function highestBid(bids: Bid[] | undefined): number {
  if (!bids || bids.length === 0) return 0;
  return bids.reduce((max, bid) => (bid.amount > max ? bid.amount : max), 0);
}

/** Whether a lot is still taking bids. An unparseable date compares false, so it reads as ended. */
export function isStillRunning(listing: { endsAt: string }): boolean {
  return new Date(listing.endsAt).getTime() > Date.now();
}

/**
 * Win rate = wins / unique auctions bid on.
 * Multiple bids on the same listing count as one attempt.
 */
export function calculateWinRate(
  attemptedAuctions: number,
  totalWins: number
): number {
  if (attemptedAuctions === 0) return 0;
  const rate = (totalWins / attemptedAuctions) * 100;
  return Math.min(rate, 100);
}

/**
 * Count the number of unique auctions the user has bid on.
 */
export function countAuctionsBidOn(bids: Bid[]): number {
  const ids = new Set<string>();
  for (const bid of bids) {
    if (bid.listing?.id) ids.add(bid.listing.id);
  }
  return ids.size;
}

/**
 * Sum of bids on auctions that haven't ended yet.
 */
export function calculateActiveBidsValue(bids: Bid[]): number {
  return bids
    .filter((bid) => bid.listing && isStillRunning(bid.listing))
    .reduce((total, bid) => total + bid.amount, 0);
}

/**
 * A room of bidders with their paddles up, the highest one red and carrying the Aucto "A".
 *
 * Drawn for the login and register showcase when it has no lots to show, so it must read as a picture rather than as a missing one.
 * No text, and hidden from assistive technology: it says nothing the page does not already say.
 *
 * The drawing is always as tall as its panel and centred on the red paddle, and the crowd runs far past both sides of the viewBox.
 * A narrow panel therefore crops the crowd rather than shrinking it, and a wide one shows more of it.
 * Fitting the width instead left a 218px-wide phone panel half empty above a strip of paddles.
 */

const RED = '#dc2629';
const SLATE_100 = '#f1f5f9';
const SLATE_200 = '#e2e8f0';
const SLATE_300 = '#cbd5e1';
const SLATE_400 = '#94a3b8';
const SLATE_700 = '#334155';
const SLATE_800 = '#1e293b';

interface PaddleColours {
  face: string;
  sleeve: string;
  cuff: string;
}

const FRONT: PaddleColours = {
  face: SLATE_800,
  sleeve: SLATE_700,
  cuff: SLATE_400,
};
const BACK: PaddleColours = {
  face: SLATE_300,
  sleeve: SLATE_200,
  cuff: SLATE_100,
};
const WINNER: PaddleColours = { face: RED, sleeve: SLATE_700, cuff: SLATE_400 };

// Paddle heights, left to right. Irregular on purpose: an even row reads as a pattern, not a room.
const FRONT_ROW = [360, 336, 384, 372, 334, 388, 176, 356, 384, 340, 370];
const BACK_ROW = [250, 286, 236, 262, 232, 300, 244, 276, 238, 290, 254];
const WINNER_INDEX = 6;

// Spacing puts the winner at x = 200, the middle of the viewBox, which is what stays in view when a panel is narrow.
const PITCH = 84;
const FRONT_START = 200 - PITCH * WINNER_INDEX;
const BACK_START = FRONT_START + 42;

function paddle(x: number, y: number, r: number, c: PaddleColours): string {
  // The sleeve runs past the bottom of the viewBox so it always meets the panel's edge.
  return `<rect x="${x - r * 0.5}" y="${y + r * 1.9}" width="${r}" height="${640 - y}" fill="${c.sleeve}"/><rect x="${x - r * 0.5}" y="${y + r * 1.9}" width="${r}" height="${r * 0.28}" fill="${c.cuff}"/><rect x="${x - r * 0.16}" y="${y}" width="${r * 0.32}" height="${r * 1.95}" fill="${c.face}"/><circle cx="${x}" cy="${y}" r="${r}" fill="${c.face}"/>`;
}

export function renderAuctionPaddles(): string {
  const back = BACK_ROW.map((y, i) =>
    paddle(BACK_START + PITCH * i, y, 26, BACK)
  ).join('');

  const front = FRONT_ROW.map((y, i) =>
    i === WINNER_INDEX ? '' : paddle(FRONT_START + PITCH * i, y, 36, FRONT)
  ).join('');

  const winnerY = FRONT_ROW[WINNER_INDEX];
  // The mark is icon_only_v2.svg's "A" and crossbar, scaled from its 128px box to sit inside the paddle.
  const winner = `${paddle(200, winnerY, 44, WINNER)}<g transform="translate(159.7 ${winnerY - 42}) scale(0.63)"><path d="M34 96 L64 28 L94 96 L82 96 L82 76 L46 76 L46 96 Z" fill="#f8fafc"/><rect x="46" y="60" width="36" height="10" fill="${RED}"/></g>`;

  // Height from the panel, width from the viewBox ratio, centred: the sides overflow and the panel clips them.
  return `<svg viewBox="0 0 400 520" preserveAspectRatio="xMidYMax meet" class="absolute bottom-0 left-1/2 h-full max-w-none -translate-x-1/2 overflow-visible" style="aspect-ratio: 400 / 520" aria-hidden="true" focusable="false">${back}${front}${winner}</svg>`;
}

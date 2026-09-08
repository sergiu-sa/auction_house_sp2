/**
 * The crop the placeholder has to survive. `slice` scales it to cover its box and discards the
 * overflow, so a box of ratio R shows only y 300 +/- 300/R and x 300 +/- 300*R.
 *
 * Two tests share this and neither is enough alone:
 *   placeholder.test.ts  asserts  artwork <= SAFE
 *   images.spec.ts       asserts  SAFE    <= the crop the live layout produces
 *
 * Set just inside the measured crop (y 229.1-370.9, x 161.9-438.1) so the second assertion has
 * room to fail before reality does.
 */
export const SAFE = { xMin: 164, xMax: 436, yMin: 231, yMax: 369 };

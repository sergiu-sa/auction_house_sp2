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
 *
 * ---------------------------------------------------------------------------------------------
 * Redrawing the placeholder? Everything below is the measured evidence behind that box.
 * It lives here because this is the file a redraw opens when a test fails.
 * ---------------------------------------------------------------------------------------------
 *
 * WHERE THE TWO SAFE ZONES COME FROM. `preserveAspectRatio="xMidYMid slice"` crops to the host
 * box's shape, so the zone has two halves and a mark must sit inside both. Sweep viewport widths
 * to find the extremes; sampling 375/768/1440 misses them.
 *   widest    hero mosaic main tile, 867x205, 4.23:1, reached at a 1023px viewport (one pixel
 *             under the `lg` grid). Keeps only y 229-371.
 *   narrowest hero side tile, 87x189, 0.46:1, taller than wide. Crops the sides, keeps x 162-438.
 *
 * WHERE THE MARKS SIT, measured with getBBox in the <img> font context:
 *   all marks   y 275.2-358.3,  x 227-373
 *   AUCTO       y 275.2-324.9,  x 227-373
 *   NO IMAGE    y 346.2-358.3,  x 252.2-347.8
 * Clearance: 46.1 above and 12.6 below the vertical band, 65.1 each side of the horizontal one.
 * The knockout panel (x 176 y 254 w 248 h 110) is the tight one: its bottom edge is y 364,
 * clearing by 6.9, and its sides clear by 14.1.
 *
 * Measure a new mark with getBBox, do not reason about it. The italic ascender the wordmark used
 * to carry ran 6 units taller than font metrics predict, and placeholder.test.ts's character-count
 * estimate over-states width by design rather than measuring. Two ways this has been got wrong:
 * recording only the vertical half nearly shipped a variant whose rules were cropped off the side
 * tile, and taking the band from breakpoint samples put y 200-400 in CLAUDE.md for a day.
 *
 * DOT PITCH scales with the box, landing 2.5-37.4px apart across the boxes in use: 2.5px on a
 * 57x57 detail-gallery thumbnail, 37.4px on that hero tile, 12-18px on the cards where almost all
 * of them appear. 26 units is a floor for the card boxes — pitches of 16 and 11 land 5-7px apart
 * there, where the dots stop reading as a pattern and read as speckle. Below about 3px they fall
 * under a pixel and average into an even tint, which is why the thumbnails look plain, not noisy.
 *
 * THE LABEL is #5a6a80 for 4.5:1 on the #F7F7F5 ground. It renders about 5px on a card, so the
 * large-text exception does not apply, and axe cannot see inside an <img> — placeholder.test.ts's
 * own contrast check is the only thing guarding it. A lighter slate was drawn and measured 4.44:1,
 * which is a fail. The drawing carries no border of its own; every host box already has one.
 *
 * THE WORDMARK'S FONT STACK is logo_v2.svg's verbatim, and the two match by falling *through* it
 * rather than honouring it. Measured inside the SVG document: 'Source Sans 3' renders AUCTO at
 * exactly the width a nonexistent family does (150.94 at 42px) while system-ui renders at the
 * width the file actually paints (146.02); the logo is 220.88 both ways at 68px. So both draw in
 * the OS UI face. Do not repoint the stack at public/fonts/source-sans-3-*.woff2 — an SVG loaded
 * through <img src> cannot reach @font-face, so it would not resolve and the match would break.
 */
export const SAFE = { xMin: 164, xMax: 436, yMin: 231, yMax: 369 };

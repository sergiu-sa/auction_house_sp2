import { describe, it, expect } from 'vitest';
import {
  formatMediaUrls,
  parseMediaUrls,
  formatTags,
  parseTags,
  toDateTimeLocal,
} from './listingForm';

describe('formatMediaUrls', () => {
  it('joins one URL per line', () => {
    expect(
      formatMediaUrls([
        { url: 'https://a.test/1.jpg' },
        { url: 'https://a.test/2.jpg' },
      ])
    ).toBe('https://a.test/1.jpg\nhttps://a.test/2.jpg');
  });

  it('is empty for no media, undefined and null alike', () => {
    expect(formatMediaUrls([])).toBe('');
    expect(formatMediaUrls(undefined)).toBe('');
    expect(formatMediaUrls(null)).toBe('');
  });

  it('keeps the url and drops the alt', () => {
    expect(
      formatMediaUrls([{ url: 'https://a.test/1.jpg', alt: 'a photo' }])
    ).toBe('https://a.test/1.jpg');
  });
});

describe('parseMediaUrls', () => {
  it('splits on newlines and trims', () => {
    expect(
      parseMediaUrls('  https://a.test/1.jpg \n https://a.test/2.jpg  ')
    ).toEqual(['https://a.test/1.jpg', 'https://a.test/2.jpg']);
  });

  it('drops blank lines rather than emitting empty URLs', () => {
    expect(parseMediaUrls('\n\nhttps://a.test/1.jpg\n   \n')).toEqual([
      'https://a.test/1.jpg',
    ]);
  });

  it('is empty for an empty field, undefined and null alike', () => {
    expect(parseMediaUrls('')).toEqual([]);
    expect(parseMediaUrls('   ')).toEqual([]);
    expect(parseMediaUrls(undefined)).toEqual([]);
    expect(parseMediaUrls(null)).toEqual([]);
  });
});

describe('formatTags', () => {
  it('joins with a comma and a space', () => {
    expect(formatTags(['vintage', 'tech'])).toBe('vintage, tech');
  });

  it('is empty for no tags, undefined and null alike', () => {
    expect(formatTags([])).toBe('');
    expect(formatTags(undefined)).toBe('');
    expect(formatTags(null)).toBe('');
  });
});

describe('parseTags', () => {
  it('splits on commas and trims', () => {
    expect(parseTags(' vintage ,tech,  collectible ')).toEqual([
      'vintage',
      'tech',
      'collectible',
    ]);
  });

  it('drops empty entries from trailing or doubled commas', () => {
    expect(parseTags('vintage,,tech,')).toEqual(['vintage', 'tech']);
  });

  it('is empty for an empty field, undefined and null alike', () => {
    expect(parseTags('')).toEqual([]);
    expect(parseTags('  ,  ')).toEqual([]);
    expect(parseTags(undefined)).toEqual([]);
    expect(parseTags(null)).toEqual([]);
  });
});

/**
 * The invariant that matters:
 *  what the edit form writes into a field must parse back to what the listing held, or re-saving an untouched form silently rewrites it.
 *
 * It holds for everything these two forms can produce, and there is one case where it does not.
 */
describe('format then parse', () => {
  it('round-trips media URLs', () => {
    const urls = ['https://a.test/1.jpg', 'https://a.test/2.jpg'];
    expect(
      parseMediaUrls(formatMediaUrls(urls.map((url) => ({ url }))))
    ).toEqual(urls);
  });

  it('round-trips tags', () => {
    const tags = ['vintage', 'tech', 'collectible'];
    expect(parseTags(formatTags(tags))).toEqual(tags);
  });

  // A comma is the delimiter, so a tag containing one cannot survive the trip.
  // Neither Aucto form can create such a tag, but another client on the shared API can, and then saving an untouched edit form splits it.
  // Asserting the real behaviour, not the wish.
  it('splits a tag that itself contains a comma', () => {
    expect(parseTags(formatTags(['vintage, rare']))).toEqual([
      'vintage',
      'rare',
    ]);
  });

  // Same delimiter problem at the edges, and this one the form can produce.
  it('drops space-only padding rather than preserving it', () => {
    expect(parseTags(formatTags([' spaced '])).length).toBe(1);
    expect(parseTags(formatTags([' spaced ']))[0]).toBe('spaced');
  });
});

describe('toDateTimeLocal', () => {
  it('renders the local wall-clock time, not UTC', () => {
    // Constructed from local components, so this assertion holds in any zone
    // which is the point: toISOString() would only match it in UTC.
    expect(toDateTimeLocal(new Date(2026, 8, 10, 18, 30))).toBe(
      '2026-09-10T18:30'
    );
  });

  it('round-trips through the value a browser parses back', () => {
    const local = new Date(2026, 8, 10, 18, 30);
    expect(new Date(toDateTimeLocal(local)).getTime()).toBe(local.getTime());
  });

  it('zero-pads month, day, hour and minute', () => {
    expect(toDateTimeLocal(new Date(2026, 0, 2, 3, 4))).toBe(
      '2026-01-02T03:04'
    );
  });

  // The input cannot represent an unparseable date, and formatting one from the local
  // getters would render a literal "NaN-NaN-NaNTNaN:NaN" into the field.
  it('is empty for a date that could not be parsed', () => {
    expect(toDateTimeLocal(new Date('not a date'))).toBe('');
    expect(toDateTimeLocal(new Date(NaN))).toBe('');
  });

  it('drops seconds, which the input does not carry', () => {
    expect(toDateTimeLocal(new Date(2026, 0, 2, 3, 4, 59))).toBe(
      '2026-01-02T03:04'
    );
  });
});

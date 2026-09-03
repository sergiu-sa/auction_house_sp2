import { describe, it, expect } from 'vitest';
import { generateResponsiveImageAttrs } from './imageOptimization';

const UNSPLASH =
  'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?q=80&w=1074&auto=format';
const PEXELS = 'https://images.pexels.com/photos/10160029/pexels-photo.jpeg';
const OTHER = 'https://example.com/lot.jpg';

describe('generateResponsiveImageAttrs', () => {
  it('carries the dimensions of the requested ratio', () => {
    expect(generateResponsiveImageAttrs(OTHER, 'a', 'square')).toMatchObject({
      width: 600,
      height: 600,
    });
    expect(generateResponsiveImageAttrs(OTHER, 'a', 'landscape')).toMatchObject(
      {
        width: 600,
        height: 450,
      }
    );
    expect(generateResponsiveImageAttrs(OTHER, 'a', 'compact')).toMatchObject({
      width: 600,
      height: 400,
    });
  });

  it('defaults to lazy loading and async decoding', () => {
    const attrs = generateResponsiveImageAttrs(OTHER, 'a', 'square');
    expect(attrs.loading).toBe('lazy');
    expect(attrs.decoding).toBe('async');
  });

  it('omits srcset for hosts that cannot resize', () => {
    expect(
      generateResponsiveImageAttrs(OTHER, 'a', 'square').srcset
    ).toBeUndefined();
  });

  // The width parameter goes first because the CDN honours the first `w` it sees;
  //   put it last and every candidate silently returns the original.
  it('puts its own width ahead of the original parameters on unsplash', () => {
    const { srcset } = generateResponsiveImageAttrs(UNSPLASH, 'a', 'square');
    expect(srcset).toBeDefined();
    expect(srcset).toContain('?w=400&q=80&w=1074');
    expect(srcset).toContain('400w');
    expect(srcset).toContain('1200w');
  });

  it('builds a pexels srcset', () => {
    const { srcset } = generateResponsiveImageAttrs(PEXELS, 'a', 'square');
    expect(srcset).toContain('?w=400&h=400 400w');
  });

  describe('sizes', () => {
    it('uses the preset for the ratio when nothing overrides it', () => {
      expect(generateResponsiveImageAttrs(OTHER, 'a', 'landscape').sizes).toBe(
        '(max-width: 768px) 100vw, 50vw'
      );
    });

    it('takes an override, so a layout the presets do not describe can state its own', () => {
      const sizes = '(max-width: 1023px) 40vw, (max-width: 1279px) 15vw, 200px';
      expect(
        generateResponsiveImageAttrs(OTHER, 'a', 'square', sizes).sizes
      ).toBe(sizes);
    });

    it('overriding sizes changes nothing else', () => {
      const preset = generateResponsiveImageAttrs(UNSPLASH, 'a', 'square');
      const overridden = generateResponsiveImageAttrs(
        UNSPLASH,
        'a',
        'square',
        '99vw'
      );
      expect({ ...overridden, sizes: preset.sizes }).toEqual(preset);
    });
  });

  it('passes src and alt through untouched — escaping is the caller’s job', () => {
    const hostile = 'https://x.test/a.jpg?a="onerror=1';
    const attrs = generateResponsiveImageAttrs(hostile, '"><script>', 'square');
    expect(attrs.src).toBe(hostile);
    expect(attrs.alt).toBe('"><script>');
  });
});

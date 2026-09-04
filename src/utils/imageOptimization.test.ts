import { describe, it, expect } from 'vitest';
import {
  generateResponsiveImageAttrs,
  probeVariant,
} from './imageOptimization';

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

  // Width must go first; CDN uses first `w` found.
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

describe('probeVariant', () => {
  it('asks the resizing CDNs for a small variant instead of the original', () => {
    // 41 of the 50 active lots with media are Unsplash-hosted, and their <img> loads a srcset
    //  candidate rather than the src — so probing the original would download it for nothing.
    expect(
      probeVariant('https://images.unsplash.com/photo-123?q=80&w=1038')
    ).toEqual({
      url: 'https://images.unsplash.com/photo-123?w=400&q=80&w=1038',
      resizable: true,
    });
  });

  it('handles a CDN url with no query of its own', () => {
    expect(probeVariant('https://images.pexels.com/photos/1.jpeg')).toEqual({
      url: 'https://images.pexels.com/photos/1.jpeg?w=400',
      resizable: true,
    });
  });

  it('leaves any other host alone, so the probe and the img share one fetch', () => {
    expect(probeVariant('https://example.test/lot.jpg')).toEqual({
      url: 'https://example.test/lot.jpg',
      resizable: false,
    });
  });

  it('passes an empty url straight through', () => {
    expect(probeVariant('')).toEqual({ url: '', resizable: false });
  });
});

describe('probeVariant host matching', () => {
  it('does not treat a foreign host as resizable because of its path', () => {
    // Callers read `resizable` as "the width you got back describes a variant, not the source",
    //  so a false positive lets any image through the hero's quality floor.
    expect(
      probeVariant('https://elsewhere.test/images.unsplash.com/photo-1.jpg')
    ).toEqual({
      url: 'https://elsewhere.test/images.unsplash.com/photo-1.jpg',
      resizable: false,
    });
  });

  it('does not match on a query string that merely mentions the host', () => {
    const url = 'https://elsewhere.test/pic.jpg?ref=images.pexels.com';
    expect(probeVariant(url)).toEqual({ url, resizable: false });
  });

  it('does not match a lookalike host', () => {
    const url = 'https://images.unsplash.com.evil.test/photo-1.jpg';
    expect(probeVariant(url)).toEqual({ url, resizable: false });
  });

  it('leaves a url it cannot parse alone', () => {
    expect(probeVariant('not-a-url')).toEqual({
      url: 'not-a-url',
      resizable: false,
    });
  });
});

describe('generateSrcset shares probeVariant host rule', () => {
  it('emits no srcset for a host that only mentions a CDN in its path', () => {
    // The two functions used to disagree:
    //  probeVariant refused this and generateSrcset still  fabricated four Unsplash candidates for it, into an attribute the browser loads from.
    const attrs = generateResponsiveImageAttrs(
      'https://elsewhere.test/images.unsplash.com/photo-1.jpg',
      'A lot',
      'square'
    );
    expect(attrs.srcset).toBeUndefined();
  });

  it('emits no srcset for a lookalike host', () => {
    const attrs = generateResponsiveImageAttrs(
      'https://images.unsplash.com.evil.test/photo-1.jpg',
      'A lot',
      'square'
    );
    expect(attrs.srcset).toBeUndefined();
  });

  it('still emits srcset for the real CDN', () => {
    const attrs = generateResponsiveImageAttrs(
      'https://images.unsplash.com/photo-1?q=80',
      'A lot',
      'square'
    );
    expect(attrs.srcset).toContain('400w');
  });
});

describe('generateSrcset with a query already on the url', () => {
  it('does not bury the width behind an existing pexels query', () => {
    // The live pool's pexels URLs carry ?w=1260&h=750&dpr=1.
    // Appending produced a second `?`, so `w=400` parsed as part of `dpr`'s value and every candidate served the 1260px original.
    const attrs = generateResponsiveImageAttrs(
      'https://images.pexels.com/photos/1/x.jpeg?auto=compress&w=1260&dpr=1',
      'A lot',
      'square'
    );
    const first = attrs.srcset!.split(',')[0].trim();
    expect(
      first.startsWith('https://images.pexels.com/photos/1/x.jpeg?w=400&h=400')
    ).toBe(true);
    expect(first).not.toContain('.jpeg?auto');
  });

  it('keeps the rest of the query so the CDN still gets its other options', () => {
    const attrs = generateResponsiveImageAttrs(
      'https://images.pexels.com/photos/1/x.jpeg?auto=compress',
      'A lot',
      'square'
    );
    expect(attrs.srcset).toContain('auto=compress');
  });

  it('agrees with the url probeVariant asks for, so the fetch is shared', () => {
    const url = 'https://images.pexels.com/photos/1/x.jpeg?auto=compress';
    const probed = probeVariant(url).url;
    const smallest = generateResponsiveImageAttrs(url, 'A lot', 'square')
      .srcset!.split(',')[0]
      .trim()
      .split(' ')[0];
    // Not identical, the srcset candidate also pins `h`, but both now start from a clean base.
    expect(
      smallest.startsWith('https://images.pexels.com/photos/1/x.jpeg?w=400')
    ).toBe(true);
    expect(
      probed.startsWith('https://images.pexels.com/photos/1/x.jpeg?w=400')
    ).toBe(true);
  });
});

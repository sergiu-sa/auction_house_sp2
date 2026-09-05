import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { probeImages } from './imageProbe';

/** `probeImage` is internal; a one-url batch is the same call through the exported entry point. */
async function probeImage(
  url: string,
  timeoutMs?: number
): Promise<{
  url: string;
  ok: boolean;
  width: number;
  height: number;
  timedOut: boolean;
}> {
  return (await probeImages([url], timeoutMs))[0];
}

/**
 * jsdom never loads images, so the element has to be stood in for.
 * `outcomes` decides what each url does when its src is assigned.
 */
const outcomes = new Map<
  string,
  { event: 'load' | 'error' | 'never'; width?: number; height?: number }
>();

class FakeImage {
  naturalWidth = 0;
  naturalHeight = 0;
  referrerPolicy = '';
  private listeners: Record<string, (() => void)[]> = {};

  addEventListener(type: string, fn: () => void): void {
    (this.listeners[type] ??= []).push(fn);
  }

  set src(value: string) {
    const outcome = outcomes.get(value) ?? { event: 'error' as const };
    if (outcome.event === 'never') return;
    this.naturalWidth = outcome.width ?? 0;
    this.naturalHeight = outcome.height ?? 0;
    // Asynchronous, like a real load, so a listener attached after `src` still sees it.
    queueMicrotask(() => this.listeners[outcome.event]?.forEach((fn) => fn()));
  }
}

beforeEach(() => {
  outcomes.clear();
  vi.stubGlobal('Image', FakeImage);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('probeImage', () => {
  it('reports an image that loads, with the size it decoded to', async () => {
    outcomes.set('https://x.test/a.jpg', {
      event: 'load',
      width: 1200,
      height: 800,
    });

    await expect(probeImage('https://x.test/a.jpg')).resolves.toEqual({
      url: 'https://x.test/a.jpg',
      ok: true,
      width: 1200,
      height: 800,
      timedOut: false,
    });
  });

  it('reports an image that errors', async () => {
    outcomes.set('https://x.test/dead.jpg', { event: 'error' });

    const result = await probeImage('https://x.test/dead.jpg');
    expect(result.ok).toBe(false);
  });

  it('treats an empty url as a failure without touching the network', async () => {
    await expect(probeImage('')).resolves.toEqual({
      url: '',
      ok: false,
      width: 0,
      height: 0,
      timedOut: false,
    });
  });

  it('gives up on a host that never answers', async () => {
    vi.useFakeTimers();
    outcomes.set('https://slow.test/a.jpg', { event: 'never' });

    const pending = probeImage('https://slow.test/a.jpg', 1500);
    await vi.advanceTimersByTimeAsync(1500);

    const result = await pending;
    expect(result.ok).toBe(false);
    // Said apart from a real failure, because a caller must not strike this lot off its list.
    expect(result.timedOut).toBe(true);
  });

  it('marks a host that answered with a failure as failed, not timed out', async () => {
    outcomes.set('https://x.test/dead.jpg', { event: 'error' });

    const result = await probeImage('https://x.test/dead.jpg');

    expect(result.ok).toBe(false);
    expect(result.timedOut).toBe(false);
  });

  it('requests with no referrer, so the probe and the real img share a cache entry', async () => {
    outcomes.set('https://x.test/a.jpg', {
      event: 'load',
      width: 10,
      height: 10,
    });
    const seen: string[] = [];
    class Recording extends FakeImage {
      set src(value: string) {
        seen.push(this.referrerPolicy);
        super.src = value;
      }
    }
    vi.stubGlobal('Image', Recording);

    await probeImage('https://x.test/a.jpg');

    expect(seen).toEqual(['no-referrer']);
  });
});

describe('probeImages', () => {
  it('keeps the results in the order the urls were given', async () => {
    outcomes.set('https://x.test/a.jpg', {
      event: 'load',
      width: 900,
      height: 600,
    });
    outcomes.set('https://x.test/b.jpg', { event: 'error' });
    outcomes.set('https://x.test/c.jpg', {
      event: 'load',
      width: 400,
      height: 400,
    });

    const results = await probeImages([
      'https://x.test/a.jpg',
      'https://x.test/b.jpg',
      'https://x.test/c.jpg',
    ]);

    expect(results.map((r) => r.ok)).toEqual([true, false, true]);
    expect(results.map((r) => r.width)).toEqual([900, 0, 400]);
  });
});

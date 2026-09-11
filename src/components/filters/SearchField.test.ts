import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  renderSearchField,
  initSearchField,
  setSearchFieldValue,
  cancelSearchFieldDebounce,
} from './SearchField';

/**
 * The debounce carries a `data-search-pending` mark so a repaint driven by state can tell a reader mid-word from a reader who has finished.
 * Getting that lifecycle wrong is not visible on screen:
 *  a mark left set silently stops the field ever being repainted again.
 */
describe('the search debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = renderSearchField({ id: 'search' });
    initSearchField('search', 300);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const field = (): HTMLInputElement =>
    document.getElementById('search') as HTMLInputElement;

  function type(value: string): void {
    field().value = value;
    field().dispatchEvent(new Event('input'));
  }

  it('marks the field while keystrokes are undispatched', () => {
    type('va');
    expect(field().dataset.searchPending).toBe('true');
  });

  it('clears the mark once the term is dispatched', () => {
    const seen: string[] = [];
    document.addEventListener('catalogSearchInput', ((e: CustomEvent) => {
      seen.push(e.detail.query);
    }) as EventListener);

    type('vase');
    vi.advanceTimersByTime(300);

    expect(seen).toEqual(['vase']);
    expect(field().dataset.searchPending).toBeUndefined();
  });

  it('dispatches once for a burst of keystrokes', () => {
    let count = 0;
    document.addEventListener('catalogSearchInput', () => {
      count += 1;
    });

    type('v');
    vi.advanceTimersByTime(100);
    type('va');
    vi.advanceTimersByTime(100);
    type('vase');
    vi.advanceTimersByTime(300);

    expect(count).toBe(1);
  });

  /**
   * An explicit reset makes a half-typed term stale.
   * Without the cancel the timer fires after the reset and puts the search straight back.
   */
  it('cancelling drops the pending term without dispatching it', () => {
    let count = 0;
    document.addEventListener('catalogSearchInput', () => {
      count += 1;
    });

    type('vase');
    cancelSearchFieldDebounce('search');
    setSearchFieldValue('search', '');
    vi.advanceTimersByTime(1000);

    expect(count).toBe(0);
    expect(field().value).toBe('');
    expect(field().dataset.searchPending).toBeUndefined();
  });

  it('survives cancelling when nothing is pending', () => {
    expect(() => cancelSearchFieldDebounce('search')).not.toThrow();
    expect(() => cancelSearchFieldDebounce('no-such-field')).not.toThrow();
  });
});

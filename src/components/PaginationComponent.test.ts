import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderPagination } from './PaginationComponent';

describe('the pager', () => {
  let onPageChange: ReturnType<typeof vi.fn<(page: number) => void>>;

  beforeEach(() => {
    document.body.innerHTML = `<div id="pager"></div>`;
    onPageChange = vi.fn();
  });

  /** Omitted, not defaulted: a default is only tested by a call that does not pass it. */
  const render = (
    currentPage: number,
    totalPages: number,
    variant?: 'numbered' | 'positional'
  ): void =>
    renderPagination({
      containerId: 'pager',
      currentPage,
      totalPages,
      ...(variant === undefined ? {} : { variant }),
      onPageChange,
    });

  const byLabel = (label: string): HTMLButtonElement | null =>
    document.querySelector(`[aria-label="${label}"]`);

  const input = (): HTMLInputElement =>
    document.querySelector('[data-page-jump-input]') as HTMLInputElement;

  const go = (): HTMLButtonElement =>
    document.querySelector('[data-page-jump-go]') as HTMLButtonElement;

  const submit = (): void => {
    document
      .querySelector<HTMLFormElement>('[data-page-jump]')!
      .dispatchEvent(new Event('submit', { cancelable: true }));
  };

  /** Focus leaving the field for anything but GO — a Tab away, or iOS dismissing the keypad. */
  const commit = (): void => {
    input().dispatchEvent(
      new FocusEvent('focusout', { relatedTarget: null, bubbles: true })
    );
  };

  /**
   * A GO press as Chromium delivers it: the mousedown moves focus to the button, so `focusout`
   * fires naming it, and the click then submits. Safari and Firefox on macOS do not focus a
   * button on click, so there they deliver the submit alone — `goPressSafari` below.
   */
  const goPressChromium = (): void => {
    input().dispatchEvent(
      new FocusEvent('focusout', { relatedTarget: go(), bubbles: true })
    );
    submit();
  };

  /**
   * And as Safari, Firefox, iOS and Android Chrome deliver it: the button takes no focus, but
   * the mousedown still *clears* focus from the field, so `focusout` fires naming `null` before
   * the same click submits. Modelling this as a bare submit was wrong, and hid a double request
   * on every engine but desktop Chromium.
   */
  const goPressSafari = (): void => {
    input().dispatchEvent(
      new FocusEvent('focusout', { relatedTarget: null, bubbles: true })
    );
    submit();
  };

  /** Focus returning to the field is what re-arms the gesture token. */
  const refocus = (): void => {
    input().dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
  };

  it('renders nothing when everything fits one page', () => {
    render(1, 1, 'positional');
    expect(document.getElementById('pager')!.innerHTML).toBe('');
  });

  /**
   * ProfilePage passes no variant. Leaving it omitted here is what keeps the default on a
   * tested path — if this ever drifts, the profile pager changes shape with no call site edited.
   */
  describe('the numbered variant, which is the default', () => {
    it('is what a caller gets when it asks for nothing', () => {
      render(3, 10);
      expect(input()).toBeNull();
      expect(byLabel('Go to page 3')).not.toBeNull();
      expect(document.getElementById('pager')!.textContent).toContain(
        'Page 3 of 10'
      );
    });

    it('pages by its numbered buttons', () => {
      render(2, 10);
      document
        .querySelector<HTMLButtonElement>('button[data-page="3"]')!
        .click();
      expect(onPageChange).toHaveBeenCalledWith(3);
    });

    it('does not fire for the page already shown', () => {
      render(3, 10);
      document
        .querySelector<HTMLButtonElement>('button[data-page="3"]')!
        .click();
      expect(onPageChange).not.toHaveBeenCalled();
    });

    it('marks the current page for assistive tech', () => {
      render(3, 10);
      expect(
        document.querySelector('[aria-current="page"]')!.textContent!.trim()
      ).toBe('3');
    });

    /** Same clamp as the positional variant: ProfilePage is a caller with no clamp of its own. */
    it('sends PREV to the last real page when asked from past the end', () => {
      render(9999, 10);
      const prev = byLabel('Previous page')!;
      expect(prev.getAttribute('data-page')).toBe('10');
      prev.click();
      expect(onPageChange).toHaveBeenCalledWith(10);
    });

    /** No jump field, and so no first/last pair either: five buttons, as a11y.spec.ts counts. */
    it('carries none of the positional controls', () => {
      render(2, 3);
      expect(input()).toBeNull();
      expect(byLabel('First page')).toBeNull();
      expect(byLabel('Last page')).toBeNull();
    });
  });

  describe('the positional variant', () => {
    /**
     * Not asserted on `data-page`: PREV and NEXT carry 122 and 124 themselves at this page, so
     * that selector matches whether or not a numbered window is there. The numbered buttons are
     * the ones labelled "Go to page N", and the count is what pins the rest out.
     */
    it('replaces the numbered window entirely', () => {
      render(123, 142, 'positional');
      expect(
        document.querySelectorAll('[aria-label^="Go to page"]')
      ).toHaveLength(0);
      expect(document.querySelector('[aria-current="page"]')).toBeNull();
      // FIRST, PREV, GO, NEXT, LAST — and nothing between them.
      expect(document.querySelectorAll('#pager button')).toHaveLength(5);
    });

    it('offers the two ends and the two neighbours', () => {
      render(123, 142, 'positional');
      expect(byLabel('First page')!.getAttribute('data-page')).toBe('1');
      expect(byLabel('Previous page')!.getAttribute('data-page')).toBe('122');
      expect(byLabel('Next page')!.getAttribute('data-page')).toBe('124');
      expect(byLabel('Last page')!.getAttribute('data-page')).toBe('142');
    });

    it('pages from each of them', () => {
      render(123, 142, 'positional');
      byLabel('First page')!.click();
      byLabel('Last page')!.click();
      expect(onPageChange).toHaveBeenNthCalledWith(1, 1);
      expect(onPageChange).toHaveBeenNthCalledWith(2, 142);
    });

    it('disables both backward controls on page 1', () => {
      render(1, 142, 'positional');
      expect(byLabel('First page')!.disabled).toBe(true);
      expect(byLabel('Previous page')!.disabled).toBe(true);
      expect(byLabel('Next page')!.disabled).toBe(false);
    });

    /**
     * Past the end as well as on it. `===` left NEXT enabled and pointing one further out, so
     * each click walked further past the last page — see c926178. LAST needs the same guard.
     */
    it('disables both forward controls on the last page and past it', () => {
      render(142, 142, 'positional');
      expect(byLabel('Next page')!.disabled, 'on the last page').toBe(true);
      expect(byLabel('Last page')!.disabled, 'on the last page').toBe(true);

      render(9999, 142, 'positional');
      expect(byLabel('Next page')!.disabled, 'past the end').toBe(true);
      expect(byLabel('Last page')!.disabled, 'past the end').toBe(true);
    });

    /**
     * At three pages FIRST is PREV and LAST is NEXT. Reachable in the recorded fixtures: the
     * active-only filter gives 53 lots, which is 3 pages of 23.
     */
    it('drops the two ends when they duplicate their neighbours', () => {
      render(2, 3, 'positional');
      expect(byLabel('First page')).toBeNull();
      expect(byLabel('Last page')).toBeNull();
      expect(byLabel('Previous page')).not.toBeNull();
      expect(byLabel('Next page')).not.toBeNull();
    });

    it('keeps them from four pages up', () => {
      render(2, 4, 'positional');
      expect(byLabel('First page')).not.toBeNull();
      expect(byLabel('Last page')).not.toBeNull();
    });

    /** The threshold reads totalPages, so nothing appears or vanishes while the reader pages. */
    it('does not change shape as the reader moves through a set', () => {
      const shape = (): string =>
        [...document.querySelectorAll('[aria-label]')]
          .map((el) => el.getAttribute('aria-label'))
          .join('|');

      render(1, 142, 'positional');
      const onFirst = shape();
      render(70, 142, 'positional');
      expect(shape()).toBe(onFirst);
    });

    describe('the page number field', () => {
      it('starts on the page being shown', () => {
        render(44, 140, 'positional');
        expect(input().value).toBe('44');
      });

      it('is named for assistive tech as well as on screen', () => {
        render(44, 140, 'positional');
        const label = document.querySelector(`label[for="${input().id}"]`);
        expect(label).not.toBeNull();
        expect(label!.textContent).toContain('140');
      });

      it('ties its id to the container, so two pagers cannot collide', () => {
        render(1, 140, 'positional');
        expect(input().id).toContain('pager');
      });

      it('snaps back when the field is cleared', () => {
        render(1, 140, 'positional');
        input().value = '';
        commit();
        expect(onPageChange).not.toHaveBeenCalled();
        expect(input().value).toBe('1');
      });

      it('jumps to a typed page', () => {
        render(1, 140, 'positional');
        input().value = '97';
        commit();
        expect(onPageChange).toHaveBeenCalledWith(97);
      });

      it('clamps past the end instead of erroring', () => {
        render(1, 140, 'positional');
        input().value = '9999';
        commit();
        expect(onPageChange).toHaveBeenCalledWith(140);
      });

      it('clamps below the first page', () => {
        render(5, 140, 'positional');
        input().value = '0';
        commit();
        expect(onPageChange).toHaveBeenCalledWith(1);
      });

      it('puts the current page back when nothing usable was typed', () => {
        render(44, 140, 'positional');
        input().value = 'abc';
        commit();
        expect(onPageChange).not.toHaveBeenCalled();
        expect(input().value).toBe('44');
      });

      it('does nothing when the typed page is the one already shown', () => {
        render(44, 140, 'positional');
        input().value = '44';
        commit();
        expect(onPageChange).not.toHaveBeenCalled();
        expect(input().value, 'and does not keep what was typed').toBe('44');
      });

      /**
       * Reachable by clamping rather than by typing, which is why asserting the call count alone
       * missed it: 9999 on the last page lands on the page already shown, nothing refetches and
       * nothing re-renders, so the field kept reading 9999 beside "of 140".
       */
      it('snaps back when a clamp lands on the page already shown', () => {
        render(140, 140, 'positional');
        input().value = '9999';
        commit();
        expect(onPageChange).not.toHaveBeenCalled();
        expect(input().value).toBe('140');
      });
    });

    /**
     * Chromium focuses a button on click, so one GO press delivers `focusout` *and* `submit`.
     * Deferring the blur commit to GO is what keeps that one request rather than two.
     */
    it('asks for a page once when GO takes focus, as in Chromium', () => {
      render(1, 140, 'positional');
      input().value = '7';
      goPressChromium();

      expect(onPageChange).toHaveBeenCalledTimes(1);
      expect(onPageChange).toHaveBeenCalledWith(7);
    });

    /**
     * macOS Safari and Firefox do not focus a button on click, so no blur happens and the submit
     * arrives alone. Hanging the commit off the blur left GO dead in both, and neither Playwright
     * project would have caught it: both run Desktop Chrome.
     */
    it('asks for a page when GO does not take focus, as in Safari', () => {
      render(1, 140, 'positional');
      input().value = '7';
      goPressSafari();

      expect(onPageChange).toHaveBeenCalledTimes(1);
      expect(onPageChange).toHaveBeenCalledWith(7);
    });

    it('swallows the form submit, so Enter cannot reload the page', () => {
      render(1, 140, 'positional');
      const event = new Event('submit', { cancelable: true });
      document
        .querySelector<HTMLFormElement>('[data-page-jump]')!
        .dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
    });

    /**
     * The field's half of the retry path. After a failed fetch nothing re-renders, so the field
     * still holds the typed page and no `change` can fire — a commit that hung off value-changed
     * events left GO inert from the second press onward.
     */
    it('asks again when GO is pressed twice on an unchanged field', () => {
      render(1, 140, 'positional');
      input().value = '7';
      goPressChromium();
      goPressChromium();

      expect(onPageChange).toHaveBeenCalledTimes(2);
      expect(onPageChange).toHaveBeenNthCalledWith(2, 7);
    });

    it('asks again on a second GO press where the button takes no focus', () => {
      render(1, 140, 'positional');
      input().value = '7';
      goPressSafari();
      goPressSafari();

      expect(onPageChange).toHaveBeenCalledTimes(2);
    });

    /**
     * Focus reaching GO without activating it — tab to it and tab away, or press and drag off.
     * Skipping the blur commit whenever focus went to GO assumed a submit always follows, and
     * left 57 sitting in the field beside "of 140" over page 1's lots.
     */
    it('commits a gesture abandoned after focus reaches GO', () => {
      render(1, 140, 'positional');
      input().value = '57';
      input().dispatchEvent(
        new FocusEvent('focusout', { relatedTarget: go(), bubbles: true })
      );

      expect(onPageChange).toHaveBeenCalledWith(57);
    });

    /**
     * An abandoned gesture leaves the token unspent, because no submit follows it. Focus
     * returning is what re-arms it — without that, the next Enter is swallowed by a token left
     * over from a gesture the reader gave up on.
     */
    it('commits Enter after an abandoned gesture left the token unspent', () => {
      render(1, 140, 'positional');
      input().value = '57';
      input().dispatchEvent(
        new FocusEvent('focusout', { relatedTarget: go(), bubbles: true })
      );
      refocus();
      input().value = '9';
      submit();

      expect(onPageChange).toHaveBeenNthCalledWith(1, 57);
      expect(onPageChange).toHaveBeenNthCalledWith(2, 9);
    });

    it('still allows a second, different jump', () => {
      render(1, 140, 'positional');
      input().value = '7';
      commit();
      input().value = '9';
      commit();
      expect(onPageChange).toHaveBeenNthCalledWith(1, 7);
      expect(onPageChange).toHaveBeenNthCalledWith(2, 9);
    });

    /**
     * The retry path. No caller re-renders the pager when a fetch fails — Home toasts and empties
     * the grid, Collection mounts an error panel, ProfilePage toasts — so the same button has to
     * keep working against a pager that never moved. A guard remembering the last page asked for
     * made the page that failed unrequestable for the life of that render.
     */
    it('asks again when the same control is pressed twice without a re-render', () => {
      render(2, 140, 'positional');
      const next = byLabel('Next page')!;
      next.click();
      next.click();
      expect(onPageChange).toHaveBeenCalledTimes(2);
      expect(onPageChange).toHaveBeenNthCalledWith(2, 3);
    });

    /**
     * `currentPage - 1` from 9999 points at 9998, which the click handler then rejects for being
     * above `totalPages` — an enabled control that does nothing. Reachable from a bookmarked URL.
     */
    it('sends PREV to the last real page when asked from past the end', () => {
      render(9999, 142, 'positional');
      const prev = byLabel('Previous page')!;
      expect(prev.disabled).toBe(false);
      expect(prev.getAttribute('data-page')).toBe('142');
      prev.click();
      expect(onPageChange).toHaveBeenCalledWith(142);
    });
  });
});

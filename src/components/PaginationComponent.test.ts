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
    editablePageNumber?: boolean
  ): void =>
    renderPagination({
      containerId: 'pager',
      currentPage,
      totalPages,
      ...(editablePageNumber === undefined ? {} : { editablePageNumber }),
      onPageChange,
    });

  const input = (): HTMLInputElement =>
    document.querySelector('[data-page-jump-input]') as HTMLInputElement;

  /**
   * `change`, not `submit`: a submit-only field cannot be committed on iOS, where the numeric
   * keypad has no Return key. `change` covers Enter, blur-after-edit and the spinner.
   */
  const commit = (): void => {
    document
      .querySelector<HTMLInputElement>('[data-page-jump-input]')!
      .dispatchEvent(new Event('change'));
  };

  it('renders nothing when everything fits one page', () => {
    render(1, 1, true);
    expect(document.getElementById('pager')!.innerHTML).toBe('');
  });

  /**
   * Opt-in: a jump field earns its place on a 140-page catalog and not on a profile's two pages.
   * Left on by default it would have appeared on the profile pager too.
   */
  it('leaves the page number as text unless asked', () => {
    render(3, 10);
    expect(input()).toBeNull();
    expect(document.getElementById('pager')!.textContent).toContain(
      'Page 3 of 10'
    );
  });

  describe('the editable page number', () => {
    it('starts on the page being shown', () => {
      render(44, 140, true);
      expect(input().value).toBe('44');
      expect(input().getAttribute('max')).toBe('140');
    });

    /** The words around it name it on screen; the label carries that for anything that cannot see. */
    it('is named for assistive tech as well as on screen', () => {
      render(44, 140, true);
      const label = document.querySelector(`label[for="${input().id}"]`);
      expect(label).not.toBeNull();
      expect(label!.textContent).toContain('140');
    });

    it('ties its id to the container, so two pagers cannot collide', () => {
      render(1, 140, true);
      expect(input().id).toContain('pager');
    });

    /** It cannot clamp what never reaches it: `max` alone makes the browser refuse the submit. */
    it('does its own validation so an out-of-range page still submits', () => {
      render(1, 140, true);
      expect(
        document.querySelector('[data-page-jump]')!.hasAttribute('novalidate')
      ).toBe(true);
    });

    /** The reachable case is a cleared field, not letters: a number input refuses those. */
    it('snaps back when the field is cleared', () => {
      render(1, 140, true);
      input().value = '';
      commit();
      expect(onPageChange).not.toHaveBeenCalled();
      expect(input().value).toBe('1');
    });

    /** Enter must not reload the page; the form exists only to prevent that. */
    it('swallows the form submit', () => {
      render(1, 140, true);
      const form = document.querySelector<HTMLFormElement>('[data-page-jump]')!;
      const event = new Event('submit', { cancelable: true });
      form.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
    });

    it('jumps to a typed page', () => {
      render(1, 140, true);
      input().value = '97';
      commit();
      expect(onPageChange).toHaveBeenCalledWith(97);
    });

    it('clamps past the end instead of erroring', () => {
      render(1, 140, true);
      input().value = '9999';
      commit();
      expect(onPageChange).toHaveBeenCalledWith(140);
    });

    it('clamps below the first page', () => {
      render(5, 140, true);
      input().value = '0';
      commit();
      expect(onPageChange).toHaveBeenCalledWith(1);
    });

    /** The field shows the current page, so a rejected entry left in it would lie. */
    it('puts the current page back when nothing usable was typed', () => {
      render(44, 140, true);
      input().value = 'abc';
      commit();
      expect(onPageChange).not.toHaveBeenCalled();
      expect(input().value).toBe('44');
    });

    it('does nothing when the typed page is the one already shown', () => {
      render(44, 140, true);
      input().value = '44';
      commit();
      expect(onPageChange).not.toHaveBeenCalled();
    });
  });

  it('still pages by its numbered buttons', () => {
    render(2, 10, true);
    document.querySelector<HTMLButtonElement>('button[data-page="3"]')!.click();
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  /**
   * NEXT has to be off for a page *past* the end as well as on it.
   *
   * `currentPage === totalPages` left it enabled and pointing one further out, so each click walked
   * further past the last page. The catalog now clamps before it renders, which makes this
   * unreachable from there — but `ProfilePage.ts:565` is a third caller with no clamp of its own,
   * and an out-of-range page is a legitimate state for any caller to hand a component.
   */
  it('disables NEXT on the last page and past it', () => {
    const next = (): HTMLButtonElement =>
      document.querySelector('[aria-label="Next page"]') as HTMLButtonElement;

    render(139, 140);
    expect(next().disabled, 'inside the set').toBe(false);

    render(140, 140);
    expect(next().disabled, 'on the last page').toBe(true);

    render(9999, 140);
    expect(next().disabled, 'past the last page').toBe(true);
  });

  it('does not fire for the page already shown', () => {
    render(3, 10, true);
    document.querySelector<HTMLButtonElement>('button[data-page="3"]')!.click();
    expect(onPageChange).not.toHaveBeenCalled();
  });
});

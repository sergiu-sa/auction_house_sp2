import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mountNextPageCell } from './NextPageCell';

describe('mountNextPageCell', () => {
  let onPageChange: ReturnType<typeof vi.fn<(page: number) => void>>;

  beforeEach(() => {
    document.body.innerHTML = `<div id="grid"></div>`;
    onPageChange = vi.fn();
  });

  const mount = (
    currentPage: number,
    totalPages: number,
    cardCount = 23
  ): void =>
    mountNextPageCell({
      containerId: 'grid',
      currentPage,
      totalPages,
      cardCount,
      onPageChange,
    });

  it('appends one cell without disturbing the cards already there', () => {
    document.getElementById('grid')!.innerHTML =
      '<article>a</article><article>b</article>';
    mount(1, 5);

    const grid = document.getElementById('grid')!;
    expect(grid.querySelectorAll('article')).toHaveLength(2);
    expect(grid.querySelectorAll('[data-next-page-cell]')).toHaveLength(1);
    expect(grid.lastElementChild!.hasAttribute('data-next-page-cell')).toBe(
      true
    );
  });

  it('is not an article, so card counts stay card counts', () => {
    mount(1, 5);
    expect(document.querySelectorAll('#grid article')).toHaveLength(0);
  });

  it('names the destination, not just the direction', () => {
    mount(2, 140);
    const button = document.querySelector('[data-next-page]')!;
    expect(button.getAttribute('aria-label')).toBe('Next page, page 3 of 140');
  });

  it('asks for the next page when clicked', () => {
    mount(2, 140);
    document.querySelector<HTMLButtonElement>('[data-next-page]')!.click();
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('renders nothing at all when everything fits one page', () => {
    mount(1, 1);
    expect(document.querySelector('[data-next-page-cell]')).toBeNull();
  });

  it('offers a way back instead of a way on, on the last page', () => {
    mount(140, 140);
    expect(document.querySelector('[data-next-page]')).toBeNull();

    const back =
      document.querySelector<HTMLButtonElement>('[data-first-page]')!;
    expect(back).not.toBeNull();
    back.click();
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it('stays out of list view, where a card-shaped cell has no card to match', () => {
    mountNextPageCell({
      containerId: 'grid',
      currentPage: 1,
      totalPages: 5,
      cardCount: 23,
      viewMode: 'list',
      onPageChange,
    });
    expect(document.querySelector('[data-next-page-cell]')).toBeNull();
  });

  it('stays away from the empty state, which is a full-width panel of its own', () => {
    mount(1, 5, 0);
    expect(document.querySelector('[data-next-page-cell]')).toBeNull();
  });

  /** The target was always large; without a border and a real hover it read as card content. */
  it('looks like a control, not a lot', () => {
    mount(1, 5);
    const button =
      document.querySelector<HTMLButtonElement>('[data-next-page]')!;
    expect(button.getAttribute('style')).toContain('dashed');
    expect(button.className).toContain('hover:bg-slate-900');
    expect(button.className).toContain('focus-visible:outline-aucto-red');
  });

  it('carries no form of its own; the pager owns jump-to-page', () => {
    mount(1, 140);
    expect(document.querySelector('#grid form')).toBeNull();
  });

  /** Re-render mounts again; two cells in one grid would break the row arithmetic. */
  it('does not stack a second cell when mounted twice', () => {
    mount(1, 5);
    mount(1, 5);
    expect(document.querySelectorAll('[data-next-page-cell]')).toHaveLength(1);
  });
});

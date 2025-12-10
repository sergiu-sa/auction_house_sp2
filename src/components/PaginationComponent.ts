/**
 * Pagination Component 
 */

export interface PaginationConfig {
  containerId: string;
  currentPage: number;
  totalPages: number;
  maxVisiblePages?: number;
  onPageChange: (page: number) => void;
}

export function renderPagination(config: PaginationConfig): void {
  const {
    containerId,
    currentPage,
    totalPages,
    maxVisiblePages = 5,
    onPageChange,
  } = config;

  const container = document.getElementById(containerId);
  if (!container) return;

  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  // Calculate visible page range
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  // Adjust if we're near the end
  if (endPage - startPage < maxVisiblePages - 1) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  const isPrevDisabled = currentPage === 1;
  const isNextDisabled = currentPage === totalPages;

  // Build HTML with inline styles for consistency
  let html = `
    <div class="flex items-center justify-between w-full gap-4 flex-wrap" role="navigation" aria-label="Pagination">
      <!-- Page Info -->
      <div class="text-xs md:text-sm text-slate-600 font-medium whitespace-nowrap">
        Page <span class="font-bold text-slate-900">${currentPage}</span> of <span class="font-bold text-slate-900">${totalPages}</span>
      </div>

      <!-- Navigation Buttons -->
      <div class="flex items-center gap-2 flex-wrap">
  `;

  // Previous Button
  html += `
    <button
      class="inline-flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 text-xs font-bold tracking-wide transition-colors ${
        isPrevDisabled
          ? 'cursor-not-allowed bg-slate-200 text-slate-400'
          : 'bg-white text-slate-900 hover:bg-slate-50'
      }"
      style="border: 2px solid ${isPrevDisabled ? '#cbd5e1' : '#334155'}"
      ${isPrevDisabled ? 'disabled aria-disabled="true"' : ''}
      data-page="${currentPage - 1}"
      aria-label="Previous page"
    >
      <i class="fa-solid fa-chevron-left text-xs"></i>
      <span class="hidden sm:inline">PREV</span>
    </button>
  `;

  // First page + ellipsis
  if (startPage > 1) {
    html += `
      <button
        class="px-4 md:px-6 py-2 md:py-3 text-xs font-bold tracking-wide bg-white text-slate-700 hover:bg-slate-50 transition-colors"
        style="border: 2px solid #334155"
        data-page="1"
        aria-label="Go to page 1"
      >
        1
      </button>
    `;
    if (startPage > 2) {
      html += `<span class="px-2 text-slate-500" aria-hidden="true">...</span>`;
    }
  }

  // Page number buttons
  for (let i = startPage; i <= endPage; i++) {
    const isActive = i === currentPage;
    html += `
      <button
        class="px-4 md:px-6 py-2 md:py-3 text-xs font-bold tracking-wide transition-colors ${
          isActive
            ? 'bg-slate-900 text-white'
            : 'bg-white text-slate-700 hover:bg-slate-50'
        }"
        style="border: 2px solid ${isActive ? '#1e293b' : '#334155'}"
        data-page="${i}"
        aria-label="Go to page ${i}"
        ${isActive ? 'aria-current="page"' : ''}
      >
        ${i}
      </button>
    `;
  }

  // Next Button
  html += `
    <button
      class="inline-flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 text-xs font-bold tracking-wide transition-colors ${
        isNextDisabled
          ? 'cursor-not-allowed bg-slate-200 text-slate-400'
          : 'bg-slate-900 text-white hover:bg-slate-800'
      }"
      style="border: 2px solid ${isNextDisabled ? '#cbd5e1' : '#1e293b'}"
      ${isNextDisabled ? 'disabled aria-disabled="true"' : ''}
      data-page="${currentPage + 1}"
      aria-label="Next page"
    >
      <span class="hidden sm:inline">NEXT</span>
      <i class="fa-solid fa-chevron-right text-xs"></i>
    </button>
  `;

  html += `
      </div>
    </div>
  `;

  container.innerHTML = html;

  // Attach event listeners
  const buttons = container.querySelectorAll<HTMLButtonElement>('button[data-page]');
  buttons.forEach((button) => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      if (button.disabled) return;

      const page = parseInt(button.getAttribute('data-page') || '1', 10);
      if (page >= 1 && page <= totalPages && page !== currentPage) {
        onPageChange(page);
      }
    });
  });
}

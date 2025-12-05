/**
 * Floating Action Button (FAB) component
 * Renders a fixed floating button for quick actions
 */

/**
 * Render FAB for creating new listings
 */
export function renderCreateListingFAB(): void {
  // Check if FAB already exists
  if (document.getElementById('fab-create-listing')) {
    return;
  }

  const fab = document.createElement('a');
  fab.id = 'fab-create-listing';
  fab.href = '/listing-create.html';
  fab.className =
    'fixed bottom-6 right-6 z-50 flex h-14 w-14 md:h-16 md:w-16 items-center justify-center bg-slate-900 text-white shadow-lg hover:bg-slate-800 transition-all hover:scale-110 active:scale-95';
  fab.style.border = '3px solid #1e293b';
  fab.title = 'Create new listing';
  fab.setAttribute('aria-label', 'Create new listing');

  fab.innerHTML = `
    <i class="fa-solid fa-plus text-xl md:text-2xl"></i>
  `;

  document.body.appendChild(fab);
}

/**
 * Remove FAB from page
 */
export function removeFAB(): void {
  const fab = document.getElementById('fab-create-listing');
  if (fab) {
    fab.remove();
  }
}

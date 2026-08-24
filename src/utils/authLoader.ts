/**
 * Authentication loading state utility
 * Provides functions to show/hide loading states during auth checks
 */

/**
 * Show a loading overlay for authentication checks
 */
export function showAuthLoader(
  message: string = 'Checking authentication...'
): void {
  // Remove existing loader if present
  removeAuthLoader();

  const loader = document.createElement('div');
  loader.id = 'auth-loader';
  loader.className =
    'fixed inset-0 bg-white/90 z-50 flex items-center justify-center';
  loader.innerHTML = `
    <div class="text-center">
      <i class="fa-solid fa-spinner fa-spin text-4xl text-slate-900 mb-4"></i>
      <p class="text-slate-600 font-medium">${message}</p>
    </div>
  `;

  document.body.appendChild(loader);
}

/**
 * Remove the authentication loading overlay
 */
export function removeAuthLoader(): void {
  const loader = document.getElementById('auth-loader');
  if (loader) {
    loader.remove();
  }
}

/**
 * Show a session expired notification
 */
export function showSessionExpiredMessage(): void {
  const notification = document.createElement('div');
  notification.className =
    'fixed top-4 right-4 bg-red-50 text-red-800 px-6 py-4 z-50 shadow-lg';
  notification.style.border = '2px solid #dc2626';
  notification.innerHTML = `
    <div class="flex items-center gap-3">
      <i class="fa-solid fa-exclamation-circle text-2xl"></i>
      <div>
        <p class="font-bold">Session Expired</p>
        <p class="text-sm">Please log in again to continue</p>
      </div>
    </div>
  `;

  document.body.appendChild(notification);

  // Auto remove after 3 seconds
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

/**
 * Check authentication with loading state
 * Wraps async auth check operations with loading UI
 */
export async function checkAuthWithLoader<T>(
  authCheck: () => Promise<T>,
  loadingMessage?: string
): Promise<T> {
  showAuthLoader(loadingMessage);

  try {
    const result = await authCheck();
    return result;
  } finally {
    removeAuthLoader();
  }
}

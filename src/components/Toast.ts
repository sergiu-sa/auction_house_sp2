import { announce } from '../utils/announce';

/**
 * Toast notification types
 */
type ToastType = 'success' | 'error' | 'info' | 'warning';

/**
 * Show a toast notification
 * @param message - Message to display
 * @param type - Toast type (success, error, info, warning)
 * @param duration - Duration in milliseconds (errors and warnings get 6000, the rest 3000)
 */
export function showToast(
  message: string,
  type: ToastType = 'info',
  duration: number = type === 'error' || type === 'warning' ? 6000 : 3000
): void {
  // Create toast container if it doesn't exist
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'fixed z-50 flex flex-col gap-2 top-4 right-4';
    document.body.appendChild(container);
  }

  // Create toast element
  const toast = document.createElement('div');
  toast.className = `
    flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg max-w-sm
    transform transition-all duration-300 ease-in-out
    ${getToastColors(type)}
  `;
  // No role/aria-live here on purpose.
  // A toast is created with its text already inside, and that is the one mutation a live region cannot announce.
  // The message goes through the region mounted at page load instead.
  // Not aria-hidden either — the close button below has to stay reachable.
  announce(
    message,
    type === 'error' || type === 'warning' ? 'assertive' : 'polite'
  );

  // Add icon
  const icon = document.createElement('i');
  icon.className = `${getToastIcon(type)} flex-shrink-0`;
  toast.appendChild(icon);

  // Add message
  const messageEl = document.createElement('span');
  messageEl.className = 'flex-1 text-sm font-medium';
  messageEl.textContent = message;
  toast.appendChild(messageEl);

  // Add close button
  const closeBtn = document.createElement('button');
  closeBtn.className = 'flex-shrink-0 transition-opacity hover:opacity-70';
  closeBtn.innerHTML =
    '<i class="fa-solid fa-times text-sm" aria-hidden="true"></i>';
  closeBtn.setAttribute('aria-label', 'Close notification');
  closeBtn.onclick = () => removeToast(toast);
  toast.appendChild(closeBtn);

  // Add toast to container
  container.appendChild(toast);

  // Trigger animation
  setTimeout(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(0)';
  }, 10);

  // Auto remove after duration
  setTimeout(() => {
    removeToast(toast);
  }, duration);
}

/**
 * Remove a toast notification
 */
function removeToast(toast: HTMLElement): void {
  toast.style.opacity = '0';
  toast.style.transform = 'translateX(100%)';

  setTimeout(() => {
    toast.remove();

    // Remove container if empty
    const container = document.getElementById('toast-container');
    if (container && container.children.length === 0) {
      container.remove();
    }
  }, 300);
}

/**
 * Get toast colors based on type
 */
function getToastColors(type: ToastType): string {
  switch (type) {
    case 'success':
      return 'bg-green-50 text-green-800 border-l-4 border-green-500';
    case 'error':
      return 'bg-red-50 text-red-800 border-l-4 border-red-500';
    case 'warning':
      return 'bg-yellow-50 text-yellow-800 border-l-4 border-yellow-500';
    case 'info':
    default:
      return 'bg-blue-50 text-blue-800 border-l-4 border-blue-500';
  }
}

/**
 * Get toast icon based on type
 */
function getToastIcon(type: ToastType): string {
  switch (type) {
    case 'success':
      return 'fa-solid fa-check-circle text-green-500';
    case 'error':
      return 'fa-solid fa-exclamation-circle text-red-500';
    case 'warning':
      return 'fa-solid fa-exclamation-triangle text-yellow-500';
    case 'info':
    default:
      return 'fa-solid fa-info-circle text-blue-500';
  }
}

/**
 * Convenience methods for different toast types
 */
export const toast = {
  success: (message: string, duration?: number): void =>
    showToast(message, 'success', duration),
  error: (message: string, duration?: number): void =>
    showToast(message, 'error', duration),
  info: (message: string, duration?: number): void =>
    showToast(message, 'info', duration),
  warning: (message: string, duration?: number): void =>
    showToast(message, 'warning', duration),
};

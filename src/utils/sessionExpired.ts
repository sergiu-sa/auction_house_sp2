/**
 * The toast shown when the API answers 401 and the client clears the session.
 *
 * `api/config.ts` is the only caller;
 *  it is not routed through Toast.ts because the redirect that follows tears the page down, and this has to survive being the last thing rendered.
 */
export function showSessionExpiredMessage(): void {
  const notification = document.createElement('div');
  notification.className =
    'fixed z-50 px-6 py-4 text-red-800 shadow-lg top-4 right-4 bg-red-50';
  notification.style.border = '2px solid #dc2626';
  notification.innerHTML = `
    <div class="flex items-center gap-3">
      <i class="fa-solid fa-exclamation-circle text-2xl" aria-hidden="true"></i>
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

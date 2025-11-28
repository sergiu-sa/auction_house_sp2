/**
 * Render the guest banner component
 * Displays an informational banner to non-authenticated users
 */
export function renderGuestBanner(): string {
  return `
    <div style="background-color: #f7f7f5; border-bottom: 2px solid #dc2629">
      <div class="mx-auto max-w-7xl px-6 md:px-8 py-3">
        <div class="flex items-start gap-3">
          <div class="flex-shrink-0 w-5 h-5 bg-red-600"></div>
          <div>
            <div class="text-sm font-bold text-slate-900 uppercase tracking-wide mb-1">
              Browsing as Guest
            </div>
            <div class="text-sm text-slate-600">
              You can explore auctions, but you need an account to place bids and create listings.
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

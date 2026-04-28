import { logError } from '../utils/logger';

export interface BreadcrumbItem {
  label: string;
  // Omit href to render as the current page (no link).
  href?: string;
}

export interface BreadcrumbConfig {
  items: BreadcrumbItem[];
  containerId?: string;
  className?: string;
}

export function renderBreadcrumb(config: BreadcrumbConfig): string {
  const { items, className = '' } = config;

  if (!items || items.length === 0) {
    return '';
  }

  return `
    <nav aria-label="Breadcrumb" class="mb-6 ${className}">
      <ol class="flex items-center text-xs font-bold tracking-[0.18em] uppercase">
        ${items
          .map((item, index) => {
            const isLast = index === items.length - 1;

            // Render item
            const itemHtml = item.href
              ? `<a href="${item.href}" class="text-slate-500 hover:text-slate-900 transition-colors">${item.label}</a>`
              : `<span class="text-slate-900">${item.label}</span>`;

            // Add separator unless it's the last item
            const separator = isLast
              ? ''
              : '<li class="mx-2 text-slate-400">/</li>';

            return `<li>${itemHtml}</li>${separator}`;
          })
          .join('')}
      </ol>
    </nav>
  `;
}

export function renderBreadcrumbInContainer(config: BreadcrumbConfig): void {
  const { containerId } = config;

  if (!containerId) {
    logError('Breadcrumb: containerId is required for renderBreadcrumbInContainer');
    return;
  }

  const container = document.getElementById(containerId);
  if (!container) {
    logError(`Breadcrumb: Container with id "${containerId}" not found`);
    return;
  }

  container.innerHTML = renderBreadcrumb(config);
}

export function updateLastBreadcrumbItem(containerId: string, newLabel: string): void {
  const container = document.getElementById(containerId);
  if (!container) return;

  const lastItem = container.querySelector('ol li:last-child span');
  if (lastItem) {
    lastItem.textContent = newLabel;
  }
}

export const BREADCRUMB_PRESETS = {
  home: (): BreadcrumbItem[] => [
    { label: 'Home', href: '/index.html' },
  ],

  catalog: (): BreadcrumbItem[] => [
    { label: 'Home', href: '/index.html' },
    { label: 'Catalog' },
  ],

  profile: (username?: string): BreadcrumbItem[] => [
    { label: 'Home', href: '/index.html' },
    { label: username || 'Profile' },
  ],

  profileSettings: (): BreadcrumbItem[] => [
    { label: 'Home', href: '/index.html' },
    { label: 'Profile', href: '/profile.html' },
    { label: 'Settings' },
  ],

  listingDetail: (listingTitle: string): BreadcrumbItem[] => [
    { label: 'Home', href: '/index.html' },
    { label: 'Catalog', href: '/collection.html' },
    { label: listingTitle },
  ],

  listingCreate: (): BreadcrumbItem[] => [
    { label: 'Home', href: '/index.html' },
    { label: 'Profile', href: '/profile.html' },
    { label: 'Create Listing' },
  ],

  listingEdit: (listingTitle?: string): BreadcrumbItem[] => [
    { label: 'Home', href: '/index.html' },
    { label: 'Profile', href: '/profile.html' },
    { label: listingTitle || 'Edit Listing' },
  ],
};

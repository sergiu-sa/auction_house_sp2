/**
 * CategoryFilters Component
 * Reusable category filter buttons that dispatch categoryFilterChange event
 */

export interface CategoryFiltersConfig {
  dataAttribute: string; // e.g., 'data-filter' or 'data-sticky-filter'
  activeCategory?: string;
  variant?: 'normal' | 'compact';
}

export interface Category {
  value: string;
  label: string;
  icon: string;
}

const CATEGORIES: Category[] = [
  { value: 'all', label: 'All Items', icon: 'fa-check' },
  { value: 'tech', label: 'Tech', icon: 'fa-microchip' },
  { value: 'fashion', label: 'Fashion', icon: 'fa-shirt' },
  { value: 'home', label: 'Home', icon: 'fa-house' },
  { value: 'art', label: 'Art', icon: 'fa-palette' },
];

/**
 * Generate HTML for category filter buttons
 */
export function renderCategoryFilters(config: CategoryFiltersConfig): string {
  const { dataAttribute, activeCategory = 'all', variant = 'normal' } = config;

  const buttonClasses =
    variant === 'compact'
      ? 'px-3 py-1.5 text-[10px] font-bold tracking-[0.18em] uppercase inline-flex items-center gap-1.5'
      : 'px-4 py-2 text-[11px] font-bold tracking-[0.18em] uppercase inline-flex items-center gap-2';

  const iconSize = variant === 'compact' ? 'text-xs' : 'text-xs';

  return `
    <div class="flex flex-wrap gap-2">
      ${CATEGORIES.map((category) => {
        const isActive = category.value === activeCategory;
        const bgClass = isActive ? 'bg-slate-900' : 'bg-white';
        const textClass = isActive
          ? 'text-white'
          : 'text-slate-700 hover:bg-slate-50';
        const borderColor = isActive ? '#1e293b' : '#334155';
        const showCheck = isActive && category.value === 'all';

        return `
          <button
            type="button"
            ${dataAttribute}="${category.value}"
            class="${bgClass} ${buttonClasses} ${textClass}"
            style="border: 2px solid ${borderColor}"
            aria-pressed="${isActive}"
          >
            <i class="fa-solid ${showCheck ? 'fa-check' : category.icon} ${iconSize}"></i>
            <span>${category.label}</span>
          </button>
        `;
      }).join('')}
    </div>
  `;
}

/**
 * Initialize category filter event listeners
 */
export function initCategoryFilters(dataAttribute: string): void {
  const filterButtons = document.querySelectorAll(`[${dataAttribute}]`);

  filterButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      // Update active state for all buttons with this data attribute
      filterButtons.forEach((b) => {
        b.classList.remove('bg-slate-900', 'text-white');
        b.classList.add('bg-white', 'text-slate-700');
        b.setAttribute('aria-pressed', 'false');

        // Reset icon
        const icon = b.querySelector('i');
        if (icon) {
          // Remove check icon and restore original icon
          icon.className = 'fa-solid text-xs';
          const value = b.getAttribute(dataAttribute);
          const category = CATEGORIES.find((c) => c.value === value);
          if (category) {
            icon.classList.add(category.icon);
          }
        }
      });

      // Set clicked button as active
      btn.classList.remove('bg-white', 'text-slate-700');
      btn.classList.add('bg-slate-900', 'text-white');
      btn.setAttribute('aria-pressed', 'true');

      // Update icon to check
      const icon = btn.querySelector('i');
      if (icon) {
        icon.className = 'fa-solid fa-check text-xs';
      }

      // Dispatch event
      const filterValue = btn.getAttribute(dataAttribute);
      document.dispatchEvent(
        new CustomEvent('categoryFilterChange', {
          detail: { category: filterValue },
        })
      );
    });
  });
}

/**
 * Set active category programmatically
 */
export function setActiveCategory(
  dataAttribute: string,
  category: string
): void {
  const filterButtons = document.querySelectorAll(`[${dataAttribute}]`);

  filterButtons.forEach((btn) => {
    const value = btn.getAttribute(dataAttribute);
    const isActive = value === category;

    if (isActive) {
      btn.classList.remove('bg-white', 'text-slate-700');
      btn.classList.add('bg-slate-900', 'text-white');
      btn.setAttribute('aria-pressed', 'true');

      const icon = btn.querySelector('i');
      if (icon) {
        icon.className = 'fa-solid fa-check text-xs';
      }
    } else {
      btn.classList.remove('bg-slate-900', 'text-white');
      btn.classList.add('bg-white', 'text-slate-700');
      btn.setAttribute('aria-pressed', 'false');

      const icon = btn.querySelector('i');
      if (icon) {
        icon.className = 'fa-solid text-xs';
        const cat = CATEGORIES.find((c) => c.value === value);
        if (cat) {
          icon.classList.add(cat.icon);
        }
      }
    }
  });
}

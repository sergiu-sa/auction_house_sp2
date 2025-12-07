/**
 * ActiveOnlyCheckbox Component
 * Reusable active-only checkbox that dispatches activeOnlyChange event
 */

export interface ActiveOnlyCheckboxConfig {
  id: string;
  checked?: boolean;
  label?: string;
  variant?: 'normal' | 'compact';
}

/**
 * Generate HTML for active-only checkbox
 */
export function renderActiveOnlyCheckbox(config: ActiveOnlyCheckboxConfig): string {
  const {
    id,
    checked = false,
    label = 'Active only',
    variant = 'normal',
  } = config;

  const labelSize = variant === 'compact' ? 'text-xs' : 'text-sm';

  return `
    <label class="inline-flex items-center gap-2 text-slate-700 cursor-pointer">
      <input
        type="checkbox"
        id="${id}"
        class="h-4 w-4 cursor-pointer"
        style="accent-color: #1e293b"
        ${checked ? 'checked' : ''}
      />
      <span class="${labelSize}">${label}</span>
    </label>
  `;
}

/**
 * Initialize active-only checkbox event listener
 */
export function initActiveOnlyCheckbox(id: string): void {
  const checkbox = document.getElementById(id) as HTMLInputElement;
  if (!checkbox) return;

  checkbox.addEventListener('change', () => {
    document.dispatchEvent(
      new CustomEvent('activeOnlyChange', {
        detail: { activeOnly: checkbox.checked },
      })
    );
  });
}

/**
 * Get checkbox state
 */
export function getActiveOnlyState(id: string): boolean {
  const checkbox = document.getElementById(id) as HTMLInputElement;
  return checkbox ? checkbox.checked : false;
}

/**
 * Set checkbox state
 */
export function setActiveOnlyState(id: string, checked: boolean): void {
  const checkbox = document.getElementById(id) as HTMLInputElement;
  if (checkbox) {
    checkbox.checked = checked;
  }
}

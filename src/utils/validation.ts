/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate Noroff student email
 * Email must end with @stud.noroff.no
 */
export function isValidNoroffEmail(email: string): boolean {
  return isValidEmail(email) && email.endsWith('@stud.noroff.no');
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate image URL (checks for common image extensions)
 */
export function isValidImageUrl(url: string): boolean {
  if (!isValidUrl(url)) return false;

  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
  const urlLower = url.toLowerCase();

  return imageExtensions.some((ext) => urlLower.includes(ext));
}

/**
 * Validate password strength
 * At least 8 characters
 */
export function isValidPassword(password: string): boolean {
  return password.length >= 8;
}

/**
 * Validate bid amount
 * Must be a positive number greater than current highest bid
 */
export function isValidBidAmount(
  amount: number,
  currentHighestBid: number = 0
): boolean {
  return amount > 0 && amount > currentHighestBid;
}

/**
 * Validate date is in the future
 */
export function isValidFutureDate(date: string | Date): boolean {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj > new Date();
}

/**
 * Validate listing title
 * At least 3 characters, max 100
 */
export function isValidTitle(title: string): boolean {
  return title.length >= 3 && title.length <= 100;
}

/**
 * Validate listing description
 * Max 500 characters (optional)
 */
export function isValidDescription(description: string): boolean {
  return description.length <= 500;
}

/**
 * Display error message in a form field
 */
export function showFieldError(
  fieldId: string,
  message: string,
  errorElementId?: string
): void {
  const field = document.getElementById(fieldId);
  const errorElement = document.getElementById(
    errorElementId || `${fieldId}-error`
  );

  if (field) {
    field.classList.add('border-red-500');
    field.setAttribute('aria-invalid', 'true');
  }

  if (errorElement) {
    errorElement.textContent = message;
    errorElement.classList.remove('hidden');
  }
}

/**
 * Clear error message from a form field
 */
export function clearFieldError(
  fieldId: string,
  errorElementId?: string
): void {
  const field = document.getElementById(fieldId);
  const errorElement = document.getElementById(
    errorElementId || `${fieldId}-error`
  );

  if (field) {
    field.classList.remove('border-red-500');
    field.setAttribute('aria-invalid', 'false');
  }

  if (errorElement) {
    errorElement.textContent = '';
    errorElement.classList.add('hidden');
  }
}

/**
 * Clear all errors in a form
 */
export function clearFormErrors(formId: string): void {
  const form = document.getElementById(formId);
  if (!form) return;

  // Remove error classes from inputs
  const inputs = form.querySelectorAll('input, textarea, select');
  inputs.forEach((input) => {
    input.classList.remove('border-red-500');
    input.setAttribute('aria-invalid', 'false');
  });

  // Hide all error messages
  const errorElements = form.querySelectorAll('[id$="-error"]');
  errorElements.forEach((el) => {
    el.textContent = '';
    el.classList.add('hidden');
  });
}

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

/**
 * Three base64url segments separated by dots — shape only, nothing is decoded or verified.
 * Enough to spot a junk value another localhost:5173 project left in `token`, which would otherwise read as a logged-in session.
 */
export function isValidJwtShape(token: string): boolean {
  if (!token) return false;
  return /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(token);
}

/** Letters, numbers and underscores only, at least two characters — the Noroff API's own rule. */
export function isValidUsername(name: string): boolean {
  if (name.length < 2) return false;
  return /^[a-zA-Z0-9_]+$/.test(name);
}

export function evaluatePasswordStrength(password: string): {
  strength: number;
  message: string;
  colorClass: string;
} {
  if (!password) {
    return { strength: 0, message: '', colorClass: '' };
  }

  let strength = 0;
  let message = '';
  let colorClass = '';

  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
  if (/\d/.test(password)) strength++;
  if (/[^a-zA-Z0-9]/.test(password)) strength++;

  if (strength <= 2) {
    message = 'Weak';
    colorClass = 'text-red-600';
  } else if (strength === 3) {
    message = 'Fair';
    colorClass = 'text-yellow-600';
  } else if (strength === 4) {
    message = 'Good';
    colorClass = 'text-blue-600';
  } else {
    message = 'Strong';
    colorClass = 'text-green-600';
  }

  return { strength, message, colorClass };
}

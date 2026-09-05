import { login } from '../api/auth';
import { redirectIfAuthenticated } from '../utils/auth';
import {
  isValidEmail,
  showFieldError,
  clearFieldError,
  clearFormErrors,
  safeRedirectPath,
} from '../utils/validation';
import { toast } from '../components/Toast';
import { renderHeader } from '../components/Navbar';
import { renderFooter } from '../components/Footer';
import { ApiErrorClass } from '../api/config';
import { initProductShowcase } from '../components/ProductShowcase';
import { logError } from '../utils/logger';

export function initLoginPage(): void {
  // Returns true once it has started the navigation.
  // Stop there: a signed-in visitor should not pay for a navbar and a profile refresh on a page they are being sent away from.
  if (redirectIfAuthenticated()) return;

  // Render header and footer
  renderHeader();
  renderFooter();

  // Get form element
  const form = document.getElementById('login-form') as HTMLFormElement;
  if (!form) {
    logError('Login form not found');
    return;
  }

  // Handle form submission
  form.addEventListener('submit', handleLoginSubmit);

  // Continue-as-guest button
  const guestBtn = document.getElementById('guest-continue-btn');
  if (guestBtn) {
    guestBtn.addEventListener('click', () => {
      window.location.href = '/index.html';
    });
  }

  // Real-time validation
  const emailInput = document.getElementById('email') as HTMLInputElement;
  if (emailInput) {
    emailInput.addEventListener('blur', () => validateEmailField(emailInput));
    emailInput.addEventListener('input', () => clearFieldError('email'));
  }

  const passwordInput = document.getElementById('password') as HTMLInputElement;
  if (passwordInput) {
    passwordInput.addEventListener('input', () => clearFieldError('password'));
  }

  // Initialize product showcase animations
  initProductShowcase({
    pageName: 'login',
    featuredDescriptionLength: 60,
    showFeaturedBid: true,
    tileATitleMaxLength: 25,
    tileBTitleMaxLength: 25,
    showTileABidAndTime: true,
    showTileBDescription: true,
    tileBDescriptionLength: 40,
  });
}

function validateEmailField(input: HTMLInputElement): boolean {
  const email = input.value.trim();

  if (!email) {
    showFieldError('email', 'Email is required');
    return false;
  }

  if (!isValidEmail(email)) {
    showFieldError('email', 'Please enter a valid email address');
    return false;
  }

  clearFieldError('email');
  return true;
}

async function handleLoginSubmit(e: Event): Promise<void> {
  e.preventDefault();

  const form = e.target as HTMLFormElement;
  const formData = new FormData(form);

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  // Clear previous errors
  clearFormErrors('login-form');

  // Validate
  let isValid = true;

  if (!email) {
    showFieldError('email', 'Email is required');
    isValid = false;
  } else if (!isValidEmail(email)) {
    showFieldError('email', 'Please enter a valid email address');
    isValid = false;
  }

  if (!password) {
    showFieldError('password', 'Password is required');
    isValid = false;
  }

  if (!isValid) return;

  // Get submit button
  const submitBtn = form.querySelector(
    'button[type="submit"]'
  ) as HTMLButtonElement;
  if (!submitBtn) return;

  // Disable button and show loading state
  const originalBtnText = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML =
    '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Logging in...';

  try {
    // Call login API
    await login({ email, password });

    // Show success message
    toast.success('Login successful! Redirecting...');

    // Redirect after short delay
    setTimeout(() => {
      const urlParams = new URLSearchParams(window.location.search);
      window.location.href = safeRedirectPath(
        urlParams.get('redirect'),
        '/index.html'
      );
    }, 1000);
  } catch (error) {
    logError('Login failed', error);

    // Handle API errors
    if (error instanceof ApiErrorClass) {
      const errorMessage = error.errors[0]?.message || 'Login failed';

      // Check for specific errors
      if (errorMessage.toLowerCase().includes('password')) {
        showFieldError('password', 'Incorrect password');
      } else if (
        errorMessage.toLowerCase().includes('email') ||
        errorMessage.toLowerCase().includes('user')
      ) {
        showFieldError('email', 'No account found with this email');
      } else {
        toast.error(errorMessage);
      }
    } else {
      toast.error('An error occurred during login. Please try again.');
    }

    // Reset button
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnText;
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLoginPage);
} else {
  initLoginPage();
}

import { register } from '../api/auth';
import { redirectIfAuthenticated } from '../utils/auth';
import {
  isValidNoroffEmail,
  isValidPassword,
  isValidUsername,
  evaluatePasswordStrength,
  showFieldError,
  clearFieldError,
  clearFormErrors,
} from '../utils/validation';
import { toast } from '../components/Toast';
import { renderHeader } from '../components/Navbar';
import { renderFooter } from '../components/Footer';
import { ApiErrorClass } from '../api/config';
import { initProductShowcase } from '../components/ProductShowcase';
import { logError } from '../utils/logger';

export function initRegisterPage(): void {
  // Returns true once it has started the navigation.
  // Stop there: a signed-in visitor should not pay for a navbar and a profile refresh on a page they are being sent away from.
  if (redirectIfAuthenticated()) return;

  // Render header and footer
  renderHeader();
  renderFooter();

  // Get form element
  const form = document.getElementById('register-form') as HTMLFormElement;
  if (!form) {
    logError('Register form not found');
    return;
  }

  // Handle form submission
  form.addEventListener('submit', handleRegisterSubmit);

  // Continue-as-guest button
  const guestBtn = document.getElementById('guest-continue-btn');
  if (guestBtn) {
    guestBtn.addEventListener('click', () => {
      window.location.href = '/index.html';
    });
  }

  // Real-time validation
  const nameInput = document.getElementById('name') as HTMLInputElement;
  if (nameInput) {
    nameInput.addEventListener('blur', () => validateNameField(nameInput));
    nameInput.addEventListener('input', () => clearFieldError('name'));
  }

  const emailInput = document.getElementById('email') as HTMLInputElement;
  if (emailInput) {
    emailInput.addEventListener('blur', () => validateEmailField(emailInput));
    emailInput.addEventListener('input', () => clearFieldError('email'));
  }

  const passwordInput = document.getElementById('password') as HTMLInputElement;
  if (passwordInput) {
    passwordInput.addEventListener('blur', () =>
      validatePasswordField(passwordInput)
    );
    passwordInput.addEventListener('input', () => {
      clearFieldError('password');
      updatePasswordStrength(passwordInput.value);
    });
  }

  const confirmPasswordInput = document.getElementById(
    'confirm-password'
  ) as HTMLInputElement;
  if (confirmPasswordInput && passwordInput) {
    confirmPasswordInput.addEventListener('blur', () =>
      validateConfirmPasswordField(passwordInput, confirmPasswordInput)
    );
    confirmPasswordInput.addEventListener('input', () =>
      clearFieldError('confirm-password')
    );
  }

  // Initialize product showcase animations
  initShowcase();
}

async function initShowcase(): Promise<void> {
  animateStarterCreditsCounter();
  simulateActiveUsersCounter();

  await initProductShowcase({
    pageName: 'register',
    fallbackImages: {
      featured:
        'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=900&h=600&fit=crop',
      tileA:
        'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=400&fit=crop',
      tileB:
        'https://images.unsplash.com/photo-1556656793-08538906a9f8?w=600&h=400&fit=crop',
    },
    featuredDescriptionLength: 80,
    showFeaturedBid: false,
    tileATitleMaxLength: 30,
    tileBTitleMaxLength: 30,
    showTileABidAndTime: false,
    showTileBDescription: false,
    tileBDescriptionLength: 0,
  });
}

function animateStarterCreditsCounter(): void {
  const starterCredits = document.getElementById('starter-credits');
  if (!starterCredits) return;

  let credits = 800;
  const targetCredits = 1000;
  const interval = setInterval(() => {
    credits += 10;
    starterCredits.textContent = credits.toString();
    if (credits >= targetCredits) {
      clearInterval(interval);
    }
  }, 50);
}

function simulateActiveUsersCounter(): void {
  const activeUsers = document.getElementById('active-users');
  if (!activeUsers) return;

  let users = 2744;
  setInterval(() => {
    const change =
      Math.random() > 0.5
        ? Math.floor(Math.random() * 5)
        : -Math.floor(Math.random() * 3);
    users = Math.max(2700, Math.min(2800, users + change));
    activeUsers.textContent = users.toLocaleString();
  }, 4000);
}

function validateNameField(input: HTMLInputElement): boolean {
  const name = input.value.trim();

  if (!name) {
    showFieldError('name', 'Name is required');
    return false;
  }

  if (name.length < 2) {
    showFieldError('name', 'Name must be at least 2 characters');
    return false;
  }

  if (!isValidUsername(name)) {
    showFieldError(
      'name',
      'Name can only contain letters, numbers, and underscores'
    );
    return false;
  }

  clearFieldError('name');
  return true;
}

function validateEmailField(input: HTMLInputElement): boolean {
  const email = input.value.trim();

  if (!email) {
    showFieldError('email', 'Email is required');
    return false;
  }

  if (!isValidNoroffEmail(email)) {
    showFieldError('email', 'Email must be a valid @stud.noroff.no address');
    return false;
  }

  clearFieldError('email');
  return true;
}

function validatePasswordField(input: HTMLInputElement): boolean {
  const password = input.value;

  if (!password) {
    showFieldError('password', 'Password is required');
    return false;
  }

  if (!isValidPassword(password)) {
    showFieldError('password', 'Password must be at least 8 characters');
    return false;
  }

  clearFieldError('password');
  return true;
}

function validateConfirmPasswordField(
  passwordInput: HTMLInputElement,
  confirmInput: HTMLInputElement
): boolean {
  const password = passwordInput.value;
  const confirmPassword = confirmInput.value;

  if (!confirmPassword) {
    showFieldError('confirm-password', 'Please confirm your password');
    return false;
  }

  if (password !== confirmPassword) {
    showFieldError('confirm-password', 'Passwords do not match');
    return false;
  }

  clearFieldError('confirm-password');
  return true;
}

function updatePasswordStrength(password: string): void {
  const strengthIndicator = document.getElementById('password-strength');
  if (!strengthIndicator) return;

  const evaluation = evaluatePasswordStrength(password);

  if (!password) {
    strengthIndicator.className = 'hidden';
    return;
  }

  strengthIndicator.className = `text-sm ${evaluation.colorClass}`;
  strengthIndicator.textContent = `Password strength: ${evaluation.message}`;
}

async function handleRegisterSubmit(e: Event): Promise<void> {
  e.preventDefault();

  const form = e.target as HTMLFormElement;
  const formData = new FormData(form);

  const name = (formData.get('name') as string).trim();
  const email = (formData.get('email') as string).trim();
  const password = formData.get('password') as string;

  clearFormErrors('register-form');

  const nameInput = document.getElementById('name') as HTMLInputElement;
  const emailInput = document.getElementById('email') as HTMLInputElement;
  const passwordInput = document.getElementById('password') as HTMLInputElement;
  const confirmPasswordInput = document.getElementById(
    'confirm-password'
  ) as HTMLInputElement;

  let isValid = true;

  if (!validateNameField(nameInput)) isValid = false;
  if (!validateEmailField(emailInput)) isValid = false;
  if (!validatePasswordField(passwordInput)) isValid = false;
  if (!validateConfirmPasswordField(passwordInput, confirmPasswordInput))
    isValid = false;

  if (!isValid) return;

  const submitBtn = form.querySelector(
    'button[type="submit"]'
  ) as HTMLButtonElement;
  if (!submitBtn) return;

  const originalBtnText = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML =
    '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Creating Account...';

  try {
    await register({ name, email, password });

    toast.success('Account created successfully! Redirecting to login...');

    // Redirect to login after short delay
    setTimeout(() => {
      window.location.href = '/login.html';
    }, 2000);
  } catch (error) {
    logError('Registration failed', error);

    // Handle API errors
    if (error instanceof ApiErrorClass) {
      const errorMessage = error.errors[0]?.message || 'Registration failed';

      // Check for specific errors
      if (
        errorMessage.toLowerCase().includes('email') ||
        errorMessage.toLowerCase().includes('exist')
      ) {
        showFieldError('email', 'This email is already registered');
      } else if (
        errorMessage.toLowerCase().includes('name') ||
        errorMessage.toLowerCase().includes('username')
      ) {
        showFieldError('name', 'This username is already taken');
      } else {
        toast.error(errorMessage);
      }
    } else {
      toast.error('An error occurred during registration. Please try again.');
    }

    // Reset button
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnText;
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initRegisterPage);
} else {
  initRegisterPage();
}

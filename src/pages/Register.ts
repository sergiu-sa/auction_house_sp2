import { register } from '../api/auth';
import { redirectIfAuthenticated } from '../utils/auth';
import {
  isValidNoroffEmail,
  isValidPassword,
  showFieldError,
  clearFieldError,
  clearFormErrors,
} from '../utils/validation';
import { formatTimeRemaining } from '../utils/formatDate';
import { toast } from '../components/Toast';
import { renderHeader } from '../components/Navbar';
import { renderFooter } from '../components/Footer';
import { ApiErrorClass } from '../api/config';
import { getListings } from '../api/listings';
import { logError } from '../utils/logger';
import type { Listing } from '../types/api';


export async function initRegisterPage(): Promise<void> {
  // Render header and footer
  await renderHeader();
  renderFooter();


  redirectIfAuthenticated();

  // Get form element
  const form = document.getElementById('register-form') as HTMLFormElement;
  if (!form) {
    logError('Register form not found');
    return;
  }

  // Handle form submission
  form.addEventListener('submit', handleRegisterSubmit);

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
    passwordInput.addEventListener('blur', () => validatePasswordField(passwordInput));
    passwordInput.addEventListener('input', () => {
      clearFieldError('password');
      updatePasswordStrength(passwordInput.value);
    });
  }

  const confirmPasswordInput = document.getElementById('confirm-password') as HTMLInputElement;
  if (confirmPasswordInput && passwordInput) {
    confirmPasswordInput.addEventListener('blur', () =>
      validateConfirmPasswordField(passwordInput, confirmPasswordInput)
    );
    confirmPasswordInput.addEventListener('input', () => clearFieldError('confirm-password'));
  }

  // Initialize product showcase animations
  initProductShowcase();
}

async function initProductShowcase(): Promise<void> {
  // Animate starter credits counter
  const starterCredits = document.getElementById('starter-credits');
  if (starterCredits) {
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

  // Simulate active users count
  const activeUsers = document.getElementById('active-users');
  if (activeUsers) {
    let users = 2744;
    setInterval(() => {
      // Random increment/decrement
      const change = Math.random() > 0.5 ? Math.floor(Math.random() * 5) : -Math.floor(Math.random() * 3);
      users = Math.max(2700, Math.min(2800, users + change));
      activeUsers.textContent = users.toLocaleString();
    }, 4000);
  }

  // Fetch and display real listings
  await loadDynamicListings();

  // Refresh listings every 15 seconds
  setInterval(() => {
    loadDynamicListings();
  }, 15000);
}

async function loadDynamicListings(): Promise<void> {
  try {
    // Fetch latest listings with bids
    const response = await getListings({
      limit: 3,
      _bids: true,
      sort: 'created',
      sortOrder: 'desc',
    });

    if (response.data && response.data.length > 0) {
      updateProductShowcase(response.data);
    }
  } catch (error) {
    logError('Failed to load dynamic listings on register page', error);
    // Silently fail - keep existing content
  }
}


function updateProductShowcase(listings: Listing[]): void {
  // Update featured listing (main tile)
  if (listings[0]) {
    updateFeaturedListing(listings[0]);
  }

  // Update small tiles
  if (listings[1]) {
    updateSmallTile(listings[1], 'tile-a');
  }
  if (listings[2]) {
    updateSmallTile(listings[2], 'tile-b');
  }
}


function updateFeaturedListing(listing: Listing): void {
  const article = document.querySelector('[data-tile="featured"]') as HTMLElement;
  if (!article) return;

  // Update image
  const img = article.querySelector('img') as HTMLImageElement;
  if (img && listing.media && listing.media.length > 0) {
    img.src = listing.media[0].url;
    img.alt = listing.media[0].alt || listing.title;
    img.onerror = () => {
      img.src = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=900&h=600&fit=crop';
    };
  }

  // Update title
  const titleElement = article.querySelector('.font-serif') as HTMLElement;
  if (titleElement) {
    titleElement.textContent = listing.title;
  }

  // Update description
  const descElement = article.querySelector('.text-xs.text-slate-600') as HTMLElement;
  if (descElement && listing.description) {
    descElement.textContent = listing.description.substring(0, 80) + '...';
  }
}


function updateSmallTile(listing: Listing, tileId: string): void {
  const article = document.querySelector(`[data-tile="${tileId}"]`) as HTMLElement;
  if (!article) return;


  const img = article.querySelector('img') as HTMLImageElement;
  if (img && listing.media && listing.media.length > 0) {
    img.src = listing.media[0].url;
    img.alt = listing.media[0].alt || listing.title;
    img.onerror = () => {
      if (tileId === 'tile-a') {
        img.src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=400&fit=crop';
      } else {
        img.src = 'https://images.unsplash.com/photo-1556656793-08538906a9f8?w=600&h=400&fit=crop';
      }
    };
  }

  // Update title
  const titleElement = article.querySelector('.text-xs.font-semibold') as HTMLElement;
  if (titleElement) {
    titleElement.textContent = listing.title.substring(0, 30) + (listing.title.length > 30 ? '...' : '');
  }

  // Update bid count and time remaining
  const metaElement = article.querySelector('.text-\\[11px\\].text-slate-600') as HTMLElement;
  if (metaElement && listing.bids && listing.endsAt) {
    const bidCount = listing.bids.length;
    const timeLeft = formatTimeRemaining(listing.endsAt);
    metaElement.textContent = `${bidCount} ${bidCount === 1 ? 'bid' : 'bids'} • ${timeLeft}`;
  }
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


  if (!/^[a-zA-Z0-9_]+$/.test(name)) {
    showFieldError('name', 'Name can only contain letters, numbers, and underscores');
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

  if (!password) {
    strengthIndicator.className = 'hidden';
    return;
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

  strengthIndicator.className = `text-sm ${colorClass}`;
  strengthIndicator.textContent = `Password strength: ${message}`;
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
  const confirmPasswordInput = document.getElementById('confirm-password') as HTMLInputElement;

  let isValid = true;

  if (!validateNameField(nameInput)) isValid = false;
  if (!validateEmailField(emailInput)) isValid = false;
  if (!validatePasswordField(passwordInput)) isValid = false;
  if (!validateConfirmPasswordField(passwordInput, confirmPasswordInput)) isValid = false;

  if (!isValid) return;


  const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement;
  if (!submitBtn) return;


  const originalBtnText = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating Account...';

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
      if (errorMessage.toLowerCase().includes('email') || errorMessage.toLowerCase().includes('exist')) {
        showFieldError('email', 'This email is already registered');
      } else if (errorMessage.toLowerCase().includes('name') || errorMessage.toLowerCase().includes('username')) {
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
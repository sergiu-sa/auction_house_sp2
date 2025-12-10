import { login } from '../api/auth';
import { redirectIfAuthenticated } from '../utils/auth';
import { isValidEmail, showFieldError, clearFieldError, clearFormErrors } from '../utils/validation';
import { formatTimeRemaining } from '../utils/formatDate';
import { toast } from '../components/Toast';
import { renderHeader } from '../components/navbar';
import { renderFooter } from '../components/Footer';
import { ApiErrorClass } from '../api/config';
import { getListings } from '../api/listings';
import type { Listing } from '../types/api';

/**
 * Initialize login page
 */
export async function initLoginPage(): Promise<void> {
  // Render header and footer
  await renderHeader();
  renderFooter();

  // Redirect if already authenticated
  redirectIfAuthenticated();

  // Get form element
  const form = document.getElementById('login-form') as HTMLFormElement;
  if (!form) {
    console.error('Login form not found');
    return;
  }

  // Handle form submission
  form.addEventListener('submit', handleLoginSubmit);

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
  initProductShowcase();
}

/**
 * Initialize product showcase with live data from API
 */
async function initProductShowcase(): Promise<void> {
  // Fetch and display real listings
  await loadDynamicListings();

  // Refresh listings every 15 seconds
  setInterval(() => {
    loadDynamicListings();
  }, 15000);
}

/**
 * Load dynamic listings from API and update showcase
 */
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
    console.error('Failed to load dynamic listings:', error);
    // Silently fail - keep existing content
  }
}

/**
 * Update product showcase with real listings
 */
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

/**
 * Update the featured listing showcase
 */
function updateFeaturedListing(listing: Listing): void {
  const article = document.querySelector('[data-tile="featured"]') as HTMLElement;
  if (!article) return;

  // Update image
  const img = article.querySelector('img') as HTMLImageElement;
  if (img && listing.media && listing.media.length > 0) {
    img.src = listing.media[0].url;
    img.alt = listing.media[0].alt || listing.title;
    img.onerror = () => {
      img.src = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=900&h=600&fit=crop';
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
    descElement.textContent = listing.description.substring(0, 60) + '...';
  }

  // Update current bid
  const bidElement = article.querySelector('#featured-bid') as HTMLElement;
  if (bidElement && listing.bids && listing.bids.length > 0) {
    const highestBid = Math.max(...listing.bids.map(bid => bid.amount));
    bidElement.textContent = highestBid.toString();
  }
}

/**
 * Update a small tile with listing data
 */
function updateSmallTile(listing: Listing, tileId: string): void {
  const article = document.querySelector(`[data-tile="${tileId}"]`) as HTMLElement;
  if (!article) return;

  // Update image
  const img = article.querySelector('img') as HTMLImageElement;
  if (img && listing.media && listing.media.length > 0) {
    img.src = listing.media[0].url;
    img.alt = listing.media[0].alt || listing.title;
    img.onerror = () => {
      if (tileId === 'tile-a') {
        img.src = 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600&h=400&fit=crop';
      } else {
        img.src = 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=600&h=400&fit=crop';
      }
    };
  }

  // Update title
  const titleElement = article.querySelector('.text-xs.font-semibold') as HTMLElement;
  if (titleElement) {
    titleElement.textContent = listing.title.substring(0, 25) + (listing.title.length > 25 ? '...' : '');
  }

  // For tile-a: Update bid count and time remaining
  if (tileId === 'tile-a') {
    const watchBids = article.querySelector('#watch-bids') as HTMLElement;
    const watchTime = article.querySelector('#watch-time') as HTMLElement;

    if (watchBids && listing.bids) {
      watchBids.textContent = listing.bids.length.toString();
    }

    if (watchTime && listing.endsAt) {
      const timeLeft = formatTimeRemaining(listing.endsAt);
      watchTime.textContent = timeLeft;
    }
  }

  // For tile-b: Update description text
  if (tileId === 'tile-b') {
    const descElement = article.querySelector('.text-\\[11px\\].text-slate-600') as HTMLElement;
    if (descElement && listing.description) {
      descElement.textContent = listing.description.substring(0, 40) + '...';
    }
  }
}


/**
 * Validate email field
 */
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

/**
 * Handle login form submission
 */
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
  const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement;
  if (!submitBtn) return;

  // Disable button and show loading state
  const originalBtnText = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Logging in...';

  try {
    // Call login API
    await login({ email, password });

    // Show success message
    toast.success('Login successful! Redirecting...');

    // Redirect after short delay
    setTimeout(() => {
      const urlParams = new URLSearchParams(window.location.search);
      const redirect = urlParams.get('redirect') || '/index.html';
      window.location.href = redirect;
    }, 1000);

  } catch (error) {
    console.error('Login error:', error);

    // Handle API errors
    if (error instanceof ApiErrorClass) {
      const errorMessage = error.errors[0]?.message || 'Login failed';
      
      // Check for specific errors
      if (errorMessage.toLowerCase().includes('password')) {
        showFieldError('password', 'Incorrect password');
      } else if (errorMessage.toLowerCase().includes('email') || errorMessage.toLowerCase().includes('user')) {
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
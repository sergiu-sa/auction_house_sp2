/**
 * Newsletter subscription component for guest users
 * Displays a newsletter signup form in the footer
 */

/**
 * Render the newsletter component
 * @returns HTML string for the newsletter section
 */
export function renderNewsletter(): string {
  return `
    <div class="mb-20 bg-slate-800 p-10 lg:p-12" style="border: 3px solid #334155">
      <div class="mb-6 flex items-center gap-4">
        <div class="h-0.5 w-12 bg-red-700"></div>
        <span class="text-xs font-bold tracking-widest text-slate-400 uppercase">
          Never Miss
        </span>
      </div>
      <h3 class="mb-6 text-4xl font-bold text-white">
        Get notified of new premium lots
      </h3>
      <p class="mb-8 max-w-2xl text-sm leading-relaxed text-slate-300">
        Join 8,921 collectors receiving weekly curated auction alerts.
      </p>
      <form id="newsletter-form" novalidate>
        <div class="mb-4">
          <label for="newsletter-email" class="sr-only">Email address</label>
          <input
            type="email"
            id="newsletter-email"
            name="email"
            placeholder="your.email@stud.noroff.no"
            required
            class="w-full bg-slate-50 px-6 py-4 text-sm font-normal text-slate-900 transition-colors placeholder:text-slate-400 focus:outline-none"
            style="border: 2px solid #334155"
            aria-describedby="newsletter-error"
          />
          <div id="newsletter-error" class="mt-2 text-sm text-red-400 hidden" role="alert"></div>
        </div>
        <button
          type="submit"
          class="w-full bg-slate-900 py-4 text-sm font-bold tracking-wide text-white transition-colors hover:bg-slate-800 inline-flex items-center justify-center gap-2"
          style="border: 3px solid #1e293b"
        >
          <i class="fa-solid fa-bell text-sm"></i>
          Subscribe to Alerts
        </button>
      </form>
      <p class="mt-4 text-xs text-slate-500">
        Unsubscribe anytime. We respect your privacy.
      </p>
    </div>
  `;
}

/**
 * Initialize newsletter form functionality
 * Handles form submission and validation
 */
export function initNewsletter(): void {
  const form = document.getElementById('newsletter-form') as HTMLFormElement;
  const emailInput = document.getElementById('newsletter-email') as HTMLInputElement;
  const errorDiv = document.getElementById('newsletter-error');

  if (!form || !emailInput || !errorDiv) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Clear previous errors
    errorDiv.textContent = '';
    errorDiv.classList.add('hidden');
    emailInput.classList.remove('ring-2', 'ring-red-600');

    const email = emailInput.value.trim();

    // Validate email
    if (!email) {
      showError('Please enter your email address');
      return;
    }

    if (!isValidEmail(email)) {
      showError('Please enter a valid email address');
      return;
    }

    // Disable button during submission
    const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement;
    const originalBtnContent = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
      <i class="fa-solid fa-spinner fa-spin text-sm"></i>
      Subscribing...
    `;

    try {
      // In a real application, would send this to  API
      // For now, just simulate a successful subscription
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Success state
      submitBtn.innerHTML = `
        <i class="fa-solid fa-check text-sm"></i>
        Subscribed!
      `;
      submitBtn.classList.remove('bg-slate-900', 'hover:bg-slate-800');
      submitBtn.classList.add('bg-green-600');

      emailInput.value = '';

      // Show success message
      showSuccess('Thank you for subscribing! Check your email to confirm.');

      // Reset button after 3 seconds
      setTimeout(() => {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnContent;
        submitBtn.classList.remove('bg-green-600');
        submitBtn.classList.add('bg-slate-900', 'hover:bg-slate-800');
      }, 3000);

    } catch (error) {
      // Error state
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnContent;
      showError('Something went wrong. Please try again.');
    }
  });

  /**
   * Display error message
   */
  function showError(message: string): void {
    if (!errorDiv || !emailInput) return;
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
    emailInput.classList.add('ring-2', 'ring-red-600');
    emailInput.focus();
  }

  /**
   * Display success message
   */
  function showSuccess(message: string): void {
    if (!errorDiv) return;
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden', 'text-red-400');
    errorDiv.classList.add('text-green-400');

    setTimeout(() => {
      errorDiv.classList.add('hidden');
      errorDiv.classList.remove('text-green-400');
      errorDiv.classList.add('text-red-400');
    }, 5000);
  }

  /**
   * Validate email format
   */
  function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

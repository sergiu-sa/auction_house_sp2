import { renderHeader } from '../components/navbar';
import { renderFooter } from '../components/Footer';
import { getCurrentUser } from '../utils/auth';

/**
 * Initialize profile page
 */
export function initProfilePage(): void {
  // Render header and footer
  renderHeader();
  renderFooter();

  // Get current user
  const user = getCurrentUser();

  if (!user) {
    showError('You must be logged in to view this page');
    return;
  }

  // Load profile data
  loadProfileData();
}

/**
 * Load profile data from API
 */
async function loadProfileData(): Promise<void> {
  const container = document.getElementById('profile-content');
  if (!container) return;

  const user = getCurrentUser();
  if (!user) return;

  // Show loading state
  container.innerHTML = `
    <div class="flex items-center justify-center py-20">
      <div class="text-center">
        <i class="fa-solid fa-spinner fa-spin text-4xl text-slate-400 mb-4"></i>
        <p class="text-slate-600">Loading profile...</p>
      </div>
    </div>
  `;

  try {
    // TODO: Implement API call to fetch full profile data
    // const profileData = await getProfile(user.name);
    // renderProfile(profileData);

    // Placeholder for now
    container.innerHTML = `
      <div class="space-y-6">
        <!-- Profile Header -->
        <section class="bg-white p-8" style="border: 3px solid #1e293b">
          <div class="flex items-center gap-6">
            ${
              user.avatar?.url
                ? `<img src="${user.avatar.url}" alt="${user.name}" class="h-24 w-24 object-cover" style="border: 2px solid #1e293b" />`
                : `<div class="h-24 w-24 bg-slate-900 text-white flex items-center justify-center font-bold text-3xl" style="border: 2px solid #1e293b">${user.name.charAt(0).toUpperCase()}</div>`
            }
            <div class="flex-1">
              <h2 class="text-3xl font-bold text-slate-900 mb-2">${user.name}</h2>
              <p class="text-slate-600 mb-4">${user.email}</p>
              <div class="flex items-center gap-4">
                <div class="bg-slate-50 px-4 py-2" style="border: 2px solid #334155">
                  <span class="text-xs font-bold tracking-wide uppercase text-slate-500">Credits</span>
                  <div class="text-xl font-bold text-slate-900">${new Intl.NumberFormat('en-US').format(user.credits || 0)}</div>
                </div>
              </div>
            </div>
            <button
              class="bg-slate-900 text-white px-6 py-3 hover:bg-slate-800 transition-colors"
              style="border: 2px solid #1e293b"
              onclick="alert('Edit profile functionality will be implemented')"
            >
              <i class="fa-solid fa-edit mr-2"></i>
              Edit Profile
            </button>
          </div>
        </section>

        <!-- My Listings -->
        <section>
          <h2 class="mb-4 text-2xl font-bold text-slate-900">My Listings</h2>
          <div class="bg-white p-8 text-center" style="border: 3px solid #1e293b">
            <i class="fa-solid fa-box text-6xl text-slate-300 mb-4"></i>
            <p class="text-slate-600 mb-4">Your listings will appear here</p>
            <a
              href="/listing-create.html"
              class="inline-flex items-center gap-2 bg-slate-900 text-white px-6 py-3 hover:bg-slate-800 transition-colors"
              style="border: 2px solid #1e293b"
            >
              <i class="fa-solid fa-plus"></i>
              Create New Listing
            </a>
          </div>
        </section>

        <!-- My Bids -->
        <section>
          <h2 class="mb-4 text-2xl font-bold text-slate-900">My Bids</h2>
          <div class="bg-white p-8 text-center" style="border: 3px solid #1e293b">
            <i class="fa-solid fa-gavel text-6xl text-slate-300 mb-4"></i>
            <p class="text-slate-600">Your bids will appear here</p>
          </div>
        </section>

        <!-- Wins -->
        <section>
          <h2 class="mb-4 text-2xl font-bold text-slate-900">Wins</h2>
          <div class="bg-white p-8 text-center" style="border: 3px solid #1e293b">
            <i class="fa-solid fa-trophy text-6xl text-slate-300 mb-4"></i>
            <p class="text-slate-600">Your won items will appear here</p>
          </div>
        </section>
      </div>
    `;
  } catch (error) {
    console.error('Error loading profile:', error);
    showError('Failed to load profile data');
  }
}

/**
 * Show error message
 */
function showError(message: string): void {
  const container = document.getElementById('profile-content');
  if (!container) return;

  container.innerHTML = `
    <div class="bg-white p-8 text-center" style="border: 3px solid #1e293b">
      <i class="fa-solid fa-exclamation-circle text-6xl text-red-300 mb-4"></i>
      <h3 class="font-serif font-bold text-xl text-slate-900 mb-2">Error</h3>
      <p class="text-slate-600 mb-4">${message}</p>
      <a
        href="/login.html"
        class="inline-block bg-slate-900 text-white px-6 py-3 hover:bg-slate-800 transition-colors"
        style="border: 2px solid #1e293b"
      >
        Go to Login
      </a>
    </div>
  `;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initProfilePage);
} else {
  initProfilePage();
}

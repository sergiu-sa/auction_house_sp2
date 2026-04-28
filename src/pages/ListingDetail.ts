import { renderHeader } from '../components/Navbar';
import { renderFooter } from '../components/Footer';
import { renderBreadcrumbInContainer, BREADCRUMB_PRESETS } from '../components/Breadcrumb';
import { getListing } from '../api/listings';
import { placeBid } from '../api/bids';
import { isLoggedIn, getCurrentUser } from '../utils/auth';
import { formatTimeRemaining, formatDate, formatDateShort, isAuctionActive, getTimeRemaining } from '../utils/formatDate';
import { isValidBidAmount } from '../utils/validation';
import { showToast } from '../components/Toast';
import {
  updatePageTitle,
  updatePageDescription,
  updateOgImage,
  updateCanonicalUrl,
  addStructuredData,
  generateListingStructuredData,
} from '../utils/seo';
import { APP_BASE_URL } from '../utils/constants';
import { logError } from '../utils/logger';
import { getErrorMessage } from '../utils/errorHandling';
import { isWatched, toggleWatched } from '../utils/storage';
import type { Listing } from '../types/api';
import { generateResponsiveImageAttrs } from '../utils/imageOptimization';

// Current listing data
let currentListing: Listing | null = null;
let countdownInterval: number | null = null;

async function init() {
  // Render header and footer
  await renderHeader();
  renderFooter();

  // Get listing ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  const listingId = urlParams.get('id');

  if (!listingId) {
    showError('No listing ID provided');
    return;
  }

  try {
    // Fetch listing data
    const response = await getListing(listingId);
    currentListing = response.data;

    // Update SEO meta tags dynamically
    updateDynamicSEO(currentListing);

    // Render all sections
    renderBreadcrumb(currentListing);
    renderListingHeader(currentListing);
    renderMediaGallery(currentListing);
    renderListingDetails(currentListing);
    renderBidPanel(currentListing);
    renderTags(currentListing);
    renderBidHistory(currentListing);
    renderSellerProfile(currentListing);
    renderListingMeta(currentListing);
    initQuickActions(currentListing);

    // Start countdown timer
    if (isAuctionActive(currentListing.endsAt)) {
      startCountdown(currentListing.endsAt);
    }
  } catch (error) {
    logError('Failed to load listing', error, { listingId });
    showError('Failed to load listing. Please try again later.');
  }

  // Cleanup countdown interval when user navigates away
  window.addEventListener('beforeunload', () => {
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
  });
}

function updateDynamicSEO(listing: Listing) {
  // Update page title
  const title = `${listing.title} - Auction Listing | Aucto`;
  updatePageTitle(title);

  // Update description
  const description = listing.description
    ? `${listing.description.substring(0, 155)}...`
    : `Bid on ${listing.title} on Aucto. View details, bid history, and place your bid before the auction ends.`;
  updatePageDescription(description);

  // Update OG image
  if (listing.media && listing.media.length > 0) {
    updateOgImage(listing.media[0].url);
  }

  // Update canonical URL
  updateCanonicalUrl(`${APP_BASE_URL}/listing.html?id=${listing.id}`);

  // Add structured data
  addStructuredData(generateListingStructuredData(listing));
}

function showError(message: string) {
  const main = document.querySelector('main');
  if (main) {
    main.innerHTML = `
      <div class="bg-warm-white py-16">
        <div class="mx-auto max-w-7xl px-6 md:px-8">
          <div class="bg-white p-8 text-center" style="border: 3px solid #1e293b">
            <i class="fa-solid fa-exclamation-triangle text-4xl text-red-700 mb-4"></i>
            <h1 class="text-2xl font-bold text-slate-900 mb-2">Error</h1>
            <p class="text-slate-600">${message}</p>
            <a href="/index.html" class="inline-block mt-6 bg-slate-900 px-6 py-3 text-sm font-bold tracking-[0.18em] uppercase text-white hover:bg-slate-800">
              Back to Listings
            </a>
          </div>
        </div>
      </div>
    `;
  }
}

function renderBreadcrumb(listing: Listing) {
  renderBreadcrumbInContainer({
    containerId: 'breadcrumb-nav',
    items: BREADCRUMB_PRESETS.listingDetail(listing.title),
  });
}

function renderListingHeader(listing: Listing) {
  const header = document.getElementById('listing-header');
  if (!header) return;

  const isActive = isAuctionActive(listing.endsAt);

  header.innerHTML = `
    <div class="mb-4 flex items-start justify-between gap-4">
      <div class="space-y-2 flex-1">
        <div class="text-xs font-bold tracking-[0.18em] text-slate-500 uppercase">
          Listing ID: ${listing.id.substring(0, 8)}
          ${listing.tags && listing.tags.length > 0 ? ` · ${listing.tags[0]}` : ''}
        </div>
        <h1 class="text-4xl md:text-5xl font-bold leading-tight text-slate-900">
          ${listing.title}
        </h1>
      </div>
      <div class="hidden text-right md:block">
        <div class="mb-2 text-xs font-bold tracking-[0.18em] text-slate-500 uppercase">
          Status
        </div>
        ${isActive ? `
          <div class="flex items-center justify-end gap-1.5">
            <i class="fa-solid fa-hourglass-end text-${getTimeRemaining(listing.endsAt).days === 0 && getTimeRemaining(listing.endsAt).hours < 3 ? 'red' : 'green'}-700"></i>
            <span class="text-xs font-bold tracking-[0.18em] text-${getTimeRemaining(listing.endsAt).days === 0 && getTimeRemaining(listing.endsAt).hours < 3 ? 'red' : 'green'}-700 uppercase">
              ${getTimeRemaining(listing.endsAt).days === 0 && getTimeRemaining(listing.endsAt).hours < 3 ? 'Ending Soon' : 'Active'}
            </span>
          </div>
        ` : `
          <div class="flex items-center justify-end gap-1.5">
            <i class="fa-solid fa-circle-xmark text-slate-500"></i>
            <span class="text-xs font-bold tracking-[0.18em] text-slate-500 uppercase">
              Ended
            </span>
          </div>
        `}
      </div>
    </div>

    <p class="max-w-2xl text-sm md:text-base leading-relaxed text-slate-600">
      ${listing.description || 'No description provided.'}
    </p>
  `;
}

function renderMediaGallery(listing: Listing) {
  const gallery = document.getElementById('media-gallery');
  if (!gallery) return;

  const media = listing.media && listing.media.length > 0
    ? listing.media
    : [{ url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=900&h=675&fit=crop', alt: 'No image available' }];

  const mainImage = media[0];
  const thumbnails = media.slice(0, 4);

  // Generate responsive attributes for main image
  const mainImgAttrs = generateResponsiveImageAttrs(
    mainImage.url,
    mainImage.alt || listing.title,
    'landscape'
  );

  gallery.innerHTML = `
    <!-- Main image -->
    <div class="aspect-[4/3] bg-slate-100 mb-4 md:mb-6" style="border: 3px solid #1e293b">
      <img
        id="main-image"
        src="${mainImgAttrs.src}"
        alt="${mainImgAttrs.alt}"
        width="${mainImgAttrs.width}"
        height="${mainImgAttrs.height}"
        sizes="${mainImgAttrs.sizes}"
        loading="eager"
        decoding="${mainImgAttrs.decoding}"
        class="h-full w-full object-cover"
      />
    </div>

    <!-- Thumbnails -->
    <div class="grid grid-cols-4 gap-3">
      ${thumbnails.map((img, index) => {
        const thumbAttrs = generateResponsiveImageAttrs(img.url, img.alt || `View ${index + 1}`, 'square');
        return `
        <button
          class="aspect-square bg-slate-100 thumbnail-btn ${index === 0 ? 'opacity-100' : 'opacity-75'} hover:opacity-100 transition"
          style="border: ${index === 0 ? '3px' : '2px'} solid ${index === 0 ? '#1e293b' : '#475569'}"
          data-image-url="${img.url}"
          data-image-alt="${img.alt || listing.title}"
          data-index="${index}"
        >
          <img
            src="${thumbAttrs.src}"
            alt="${thumbAttrs.alt}"
            width="${thumbAttrs.width}"
            height="${thumbAttrs.height}"
            loading="lazy"
            decoding="${thumbAttrs.decoding}"
            class="h-full w-full object-cover"
          />
        </button>
      `;
      }).join('')}
      ${media.length > 4 ? `
        <button
          class="aspect-square bg-slate-100 opacity-75 hover:opacity-100 transition"
          style="border: 2px solid #475569"
        >
          <span class="flex h-full w-full items-center justify-center text-xs font-bold tracking-[0.18em] text-slate-500 uppercase">
            +${media.length - 4} more
          </span>
        </button>
      ` : ''}
    </div>
  `;

  // Add thumbnail click handlers
  initGallery();
}

function initGallery() {
  const thumbnails = document.querySelectorAll('.thumbnail-btn');
  const mainImage = document.getElementById('main-image') as HTMLImageElement;

  thumbnails.forEach((btn) => {
    btn.addEventListener('click', () => {
      const imageUrl = btn.getAttribute('data-image-url');
      const imageAlt = btn.getAttribute('data-image-alt');

      if (mainImage && imageUrl) {
        mainImage.src = imageUrl;
        mainImage.alt = imageAlt || '';

        // Update active state
        thumbnails.forEach((t) => {
          t.classList.remove('opacity-100');
          t.classList.add('opacity-75');
          t.setAttribute('style', 'border: 2px solid #475569');
        });
        btn.classList.remove('opacity-75');
        btn.classList.add('opacity-100');
        btn.setAttribute('style', 'border: 3px solid #1e293b');
      }
    });
  });
}

function renderListingDetails(listing: Listing) {
  const details = document.getElementById('listing-details');
  if (!details) return;

  details.innerHTML = `
    <h3 class="mb-4 text-xs font-bold tracking-[0.18em] uppercase text-slate-500">
      Details
    </h3>
    <div class="flex flex-wrap gap-6 text-xs text-slate-600 mb-6 pb-6" style="border-bottom: 2px solid #e2e8f0">
      ${listing.tags && listing.tags.length > 0 ? `
        <div>
          <div class="mb-1 font-bold tracking-[0.18em] uppercase text-slate-500 inline-flex items-center gap-1">
            <i class="fa-solid fa-layer-group text-xs"></i>
            <span>Category</span>
          </div>
          <div class="text-sm">${listing.tags.slice(0, 2).join(' · ')}</div>
        </div>
      ` : ''}
      <div>
        <div class="mb-1 font-bold tracking-[0.18em] uppercase text-slate-500 inline-flex items-center gap-1">
          <i class="fa-solid fa-calendar text-xs"></i>
          <span>Created</span>
        </div>
        <div class="text-sm">${formatDateShort(listing.created)}</div>
      </div>
      <div>
        <div class="mb-1 font-bold tracking-[0.18em] uppercase text-slate-500 inline-flex items-center gap-1">
          <i class="fa-solid fa-clock text-xs"></i>
          <span>Ends</span>
        </div>
        <div class="text-sm">${formatDateShort(listing.endsAt)}</div>
      </div>
    </div>

    <div class="flex-grow">
      <h3 class="mb-3 text-xs font-bold tracking-[0.18em] uppercase text-slate-500">
        Description
      </h3>
      <div class="text-sm leading-relaxed text-slate-700 line-clamp-6">
        <p>${listing.description || 'No description provided for this listing.'}</p>
      </div>
    </div>
  `;
}

function renderBidPanel(listing: Listing) {
  const panel = document.getElementById('bid-panel');
  if (!panel) return;

  const isActive = isAuctionActive(listing.endsAt);
  const user = getCurrentUser();
  const userLoggedIn = isLoggedIn();

  const highestBid = listing.bids && listing.bids.length > 0
    ? Math.max(...listing.bids.map(b => b.amount))
    : 0;
  const minimumBid = highestBid + 1;

  // Check if user is the highest bidder
  const isUserHighestBidder = listing.bids && listing.bids.length > 0 && user
    ? listing.bids.find(b => b.amount === highestBid)?.bidder?.name === user.name
    : false;

  panel.innerHTML = `
    <div class="mb-10">
      <div class="mb-3 text-xs font-bold tracking-[0.18em] uppercase text-slate-500">
        Current ${highestBid > 0 ? 'Bid' : 'Starting Price'}
      </div>
      <div class="text-4xl font-bold text-slate-900">${new Intl.NumberFormat('en-US').format(highestBid)}</div>
      <div class="text-xs text-slate-500 mt-2">Credits</div>
      ${isUserHighestBidder ? `
        <div class="mt-4 inline-flex items-center gap-2 bg-green-50 px-3 py-2 text-xs font-bold text-green-700" style="border: 2px solid #15803d">
          <i class="fa-solid fa-check-circle"></i>
          <span>You're the highest bidder</span>
        </div>
      ` : ''}
    </div>

    <div class="mb-10 pb-6" style="border-bottom: 2px solid #e2e8f0">
      <div class="mb-3 text-xs font-bold tracking-[0.18em] uppercase text-slate-500 inline-flex items-center gap-1">
        <i class="fa-solid fa-clock text-xs ${isActive ? 'text-red-700' : 'text-slate-500'}"></i>
        <span>Time Remaining</span>
      </div>
      <div id="countdown-display" class="text-2xl font-bold ${isActive ? 'text-red-700' : 'text-slate-500'}">
        ${formatTimeRemaining(listing.endsAt)}
      </div>
    </div>

    ${isActive && userLoggedIn ? `
      <form id="bid-form" class="space-y-6 pt-6">
        <div>
          <label for="bid-amount" class="mb-3 block text-xs font-bold tracking-[0.18em] uppercase text-slate-500">
            Your Bid
          </label>
          <input
            id="bid-amount"
            type="number"
            min="${minimumBid}"
            value="${minimumBid}"
            step="1"
            class="w-full bg-slate-50 px-4 py-4 text-lg font-bold text-slate-900 focus:outline-none"
            style="border: 2px solid #334155"
            required
          />
          <div class="mt-3 text-xs text-slate-500">
            Minimum bid: ${new Intl.NumberFormat('en-US').format(minimumBid)} credits
          </div>
          ${user && user.credits !== undefined ? `
            <div class="mt-2 text-xs text-slate-600">
              Your credits: ${new Intl.NumberFormat('en-US').format(user.credits)}
            </div>
          ` : ''}
        </div>

        <button
          type="submit"
          id="place-bid-btn"
          class="w-full bg-slate-900 px-6 py-4 text-sm font-bold tracking-[0.18em] uppercase text-white hover:bg-slate-800 transition-colors inline-flex items-center justify-center gap-2 mt-2"
          style="border: 2px solid #1e293b"
        >
          <i class="fa-solid fa-gavel text-base"></i>
          <span>Place Bid</span>
        </button>

        <div class="text-xs text-slate-500 text-center pt-2">
          By bidding, you agree to purchase if you win
        </div>
      </form>
    ` : !userLoggedIn ? `
      <div class="space-y-4 pt-6">
        <a
          href="/login.html?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}"
          class="w-full bg-slate-900 px-6 py-4 text-sm font-bold tracking-[0.18em] uppercase text-white hover:bg-slate-800 transition-colors inline-flex items-center justify-center gap-2"
          style="border: 2px solid #1e293b"
        >
          <i class="fa-solid fa-right-to-bracket text-base"></i>
          <span>Login to Bid</span>
        </a>
        <div class="text-xs text-slate-500 text-center pt-2">
          You must be logged in to place a bid
        </div>
      </div>
    ` : `
      <div class="bg-slate-100 px-6 py-10 text-center mt-6" style="border: 2px solid #334155">
        <i class="fa-solid fa-circle-xmark text-3xl text-slate-500 mb-4"></i>
        <p class="text-sm font-bold text-slate-700">This auction has ended</p>
      </div>
    `}
  `;

  // Initialize bid form
  if (isActive && userLoggedIn) {
    initBidForm();
  }
}

function initBidForm() {
  const form = document.getElementById('bid-form') as HTMLFormElement;
  if (!form || !currentListing) return;

  const listingId = currentListing.id;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!currentListing) {
      showToast('Listing data not available', 'error');
      return;
    }

    const bidInput = document.getElementById('bid-amount') as HTMLInputElement;
    const bidAmount = parseInt(bidInput.value);
    const submitBtn = document.getElementById('place-bid-btn') as HTMLButtonElement;
    const user = getCurrentUser();

    // Validation
    const currentBids = currentListing.bids || [];
    const highestBid = currentBids.length > 0
      ? Math.max(...currentBids.map(b => b.amount))
      : 0;

    if (!isValidBidAmount(bidAmount, highestBid)) {
      if (!bidAmount || bidAmount <= 0) {
        showToast('Please enter a valid bid amount', 'error');
      } else {
        showToast(`Bid must be higher than current bid (${new Intl.NumberFormat('en-US').format(highestBid)} credits)`, 'error');
      }
      return;
    }

    // Check if user has enough credits
    if (user && user.credits !== undefined && bidAmount > user.credits) {
      showToast('Insufficient credits', 'error');
      return;
    }

    // Disable button
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
      <i class="fa-solid fa-spinner fa-spin text-base"></i>
      <span>Placing Bid...</span>
    `;

    try {
      await placeBid(listingId, { amount: bidAmount });
      showToast('Bid placed successfully!', 'success');

      // Reload listing data
      const response = await getListing(listingId);
      currentListing = response.data;

      // Re-render components
      renderBidPanel(currentListing);
      renderBidHistory(currentListing);
      renderListingMeta(currentListing);
    } catch (error: unknown) {
      logError('Error placing bid', error, { listingId });
      const errorMessage = getErrorMessage(error, 'Failed to place bid. Please try again.');
      showToast(errorMessage, 'error');

      // Re-enable button
      submitBtn.disabled = false;
      submitBtn.innerHTML = `
        <i class="fa-solid fa-gavel text-base"></i>
        <span>Place Bid</span>
      `;
    }
  });
}

function copyToClipboard(text: string) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      showToast('Link copied to clipboard!', 'success');
    }).catch(() => {
      showToast('Failed to copy link', 'error');
    });
  } else {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      showToast('Link copied to clipboard!', 'success');
    } catch (error) {
      showToast('Failed to copy link', 'error');
    }
    document.body.removeChild(textArea);
  }
}

function initQuickActions(listing: Listing) {
  const watchBtn = document.getElementById('watch-btn');
  const shareBtn = document.getElementById('share-btn');

  // Watch button functionality
  if (watchBtn) {
    const renderWatching = (): void => {
      watchBtn.innerHTML = `
        <i class="fa-solid fa-bookmark text-sm"></i>
        <span>Watching</span>
      `;
      watchBtn.classList.add('bg-slate-900', 'text-white');
      watchBtn.classList.remove('bg-white', 'text-slate-700');
      watchBtn.setAttribute('aria-pressed', 'true');
    };

    const renderUnwatched = (): void => {
      watchBtn.innerHTML = `
        <i class="fa-solid fa-bookmark text-sm"></i>
        <span>Watch</span>
      `;
      watchBtn.classList.remove('bg-slate-900', 'text-white');
      watchBtn.classList.add('bg-white', 'text-slate-700');
      watchBtn.setAttribute('aria-pressed', 'false');
    };

    if (isWatched(listing.id)) {
      renderWatching();
    } else {
      renderUnwatched();
    }

    watchBtn.addEventListener('click', () => {
      const nowWatched = toggleWatched(listing.id);
      if (nowWatched) {
        renderWatching();
        showToast('Added to watchlist', 'success');
      } else {
        renderUnwatched();
        showToast('Removed from watchlist', 'info');
      }
    });
  }

  // Share button functionality
  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      const shareUrl = window.location.href;
      const shareTitle = listing.title;
      const shareText = `Check out this auction: ${listing.title}`;

      // Check if Web Share API is available
      if (navigator.share) {
        try {
          await navigator.share({
            title: shareTitle,
            text: shareText,
            url: shareUrl,
          });
          showToast('Shared successfully!', 'success');
        } catch (error) {
          if ((error as Error).name !== 'AbortError') {
            // Fallback to clipboard
            copyToClipboard(shareUrl);
          }
        }
      } else {
        // Fallback to clipboard
        copyToClipboard(shareUrl);
      }
    });
  }
}

function renderTags(listing: Listing) {
  const tagsSection = document.getElementById('tags-section');
  if (!tagsSection) {
    logError('Tags section element not found');
    return;
  }

  // Check if tags exist and have items
  if (!listing.tags || listing.tags.length === 0) {
    // Show "No tags" message instead of hiding
    tagsSection.style.display = 'block';
    tagsSection.innerHTML = `
      <div class="mb-4 text-xs font-bold tracking-[0.18em] uppercase text-slate-500">
        Tags
      </div>
      <div class="text-sm text-slate-500">
        No tags for this listing
      </div>
    `;
    return;
  }

  // Show and render tags
  tagsSection.style.display = 'block';
  tagsSection.innerHTML = `
    <div class="mb-4 text-xs font-bold tracking-[0.18em] uppercase text-slate-500">
      Tags
    </div>
    <div class="flex flex-wrap gap-2">
      ${listing.tags.map(tag => `
        <span
          class="bg-slate-50 px-3 py-2 text-[11px] font-bold tracking-[0.18em] text-slate-700 uppercase"
          style="border: 2px solid #334155"
        >
          ${tag}
        </span>
      `).join('')}
    </div>
  `;
}

function renderBidHistory(listing: Listing) {
  const history = document.getElementById('bid-history');
  if (!history) return;

  const bids = listing.bids || [];
  const user = getCurrentUser();

  if (bids.length === 0) {
    history.innerHTML = `
      <div class="text-center py-8">
        <i class="fa-solid fa-gavel text-4xl text-slate-300 mb-3"></i>
        <p class="text-sm text-slate-500">No bids yet. Be the first to bid!</p>
      </div>
    `;
    return;
  }

  // Sort bids by amount (highest first)
  const sortedBids = [...bids].sort((a, b) => b.amount - a.amount);
  const highestBid = sortedBids[0].amount;

  history.innerHTML = `
    <div class="space-y-0 max-h-80 overflow-y-auto">
      ${sortedBids.map((bid, index) => {
        const isHighest = bid.amount === highestBid;
        const isUserBid = user && bid.bidder?.name === user.name;

        return `
          <div class="flex items-start justify-between gap-4 py-4 ${index < sortedBids.length - 1 ? 'border-b-2' : ''}" style="border-color: #e2e8f0">
            <div>
              <div class="text-base font-bold text-slate-900 mb-1">
                ${new Intl.NumberFormat('en-US').format(bid.amount)} Credits
              </div>
              <div class="text-xs text-slate-500">
                ${isUserBid ? '@you' : `@${bid.bidder?.name || 'Anonymous'}`} · ${formatTimeRemaining(bid.created)} ago
              </div>
            </div>
            ${isHighest ? `
              <div class="bg-green-700 px-3 py-1.5 text-[10px] font-bold tracking-[0.18em] text-white uppercase whitespace-nowrap" style="border: 2px solid #15803d">
                Leading
              </div>
            ` : `
              <div class="text-[10px] font-bold tracking-[0.18em] text-slate-400 uppercase whitespace-nowrap self-center">
                Outbid
              </div>
            `}
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderSellerProfile(listing: Listing) {
  const profile = document.getElementById('seller-profile');
  if (!profile) return;

  const seller = listing.seller;
  if (!seller) {
    profile.innerHTML = `
      <p class="text-sm text-slate-500">Seller information not available</p>
    `;
    return;
  }

  // Generate avatar image attributes if avatar exists
  const avatarAttrs = seller.avatar?.url
    ? generateResponsiveImageAttrs(seller.avatar.url, seller.name, 'square')
    : null;

  profile.innerHTML = `
    <div class="mb-6 flex items-center gap-4 pb-6" style="border-bottom: 2px solid #e2e8f0">
      <div class="h-16 w-16 bg-slate-100 flex-shrink-0" style="border: 2px solid #1e293b">
        ${avatarAttrs ? `
          <img
            src="${avatarAttrs.src}"
            alt="${avatarAttrs.alt}"
            width="64"
            height="64"
            loading="lazy"
            decoding="${avatarAttrs.decoding}"
            class="h-full w-full object-cover"
          />
        ` : `
          <div class="h-full w-full bg-slate-900 text-white flex items-center justify-center text-2xl font-bold">
            ${seller.name.charAt(0).toUpperCase()}
          </div>
        `}
      </div>
      <div>
        <div class="text-base font-bold text-slate-900 mb-1 inline-flex items-center gap-1.5">
          <i class="fa-solid fa-user text-sm"></i>
          <a href="/profile.html?user=${seller.name}" class="hover:text-slate-700 transition-colors">@${seller.name}</a>
        </div>
        ${seller._count ? `
          <div class="text-xs text-slate-500 inline-flex items-center gap-1">
            <i class="fa-solid fa-circle-check text-xs"></i>
            <span>${seller._count.listings || 0} listings · ${seller._count.wins || 0} wins</span>
          </div>
        ` : ''}
      </div>
    </div>

    ${seller.bio ? `
      <p class="text-sm leading-relaxed text-slate-600 mb-6 pb-6" style="border-bottom: 2px solid #e2e8f0">
        ${seller.bio}
      </p>
    ` : ''}

    <div class="pt-6" style="border-top: 2px solid #e2e8f0">
      <a
        href="/profile.html?user=${seller.name}"
        class="inline-flex items-center gap-2 text-sm font-bold text-slate-900 hover:text-slate-700 transition-colors"
      >
        <i class="fa-solid fa-arrow-right text-xs"></i>
        <span>View Seller Profile</span>
      </a>
    </div>
  `;
}

function renderListingMeta(listing: Listing) {
  const meta = document.getElementById('listing-meta');
  if (!meta) return;

  const bidCount = listing._count?.bids || listing.bids?.length || 0;
  const uniqueBidders = listing.bids
    ? new Set(listing.bids.map(b => b.bidder?.name).filter(Boolean)).size
    : 0;

  meta.innerHTML = `
    <dl class="space-y-0">
      <div class="flex justify-between gap-4 py-4" style="border-bottom: 2px solid #e2e8f0">
        <dt class="text-xs font-bold tracking-[0.18em] uppercase text-slate-500">
          Listing ID
        </dt>
        <dd class="text-sm font-mono text-slate-900">${listing.id.substring(0, 12)}...</dd>
      </div>
      <div class="flex justify-between gap-4 py-4" style="border-bottom: 2px solid #e2e8f0">
        <dt class="text-xs font-bold tracking-[0.18em] uppercase text-slate-500">
          Created
        </dt>
        <dd class="text-sm text-slate-900 text-right">${formatDate(listing.created)}</dd>
      </div>
      <div class="flex justify-between gap-4 py-4" style="border-bottom: 2px solid #e2e8f0">
        <dt class="text-xs font-bold tracking-[0.18em] uppercase text-slate-500">
          Ends
        </dt>
        <dd class="text-sm font-bold text-slate-900 text-right">
          ${formatDate(listing.endsAt)}
        </dd>
      </div>
      <div class="flex justify-between gap-4 py-4" style="border-bottom: 2px solid #e2e8f0">
        <dt class="text-xs font-bold tracking-[0.18em] uppercase text-slate-500">
          Total Bids
        </dt>
        <dd class="text-sm text-slate-900 text-right">${bidCount} bid${bidCount !== 1 ? 's' : ''}<br/>${uniqueBidders} bidder${uniqueBidders !== 1 ? 's' : ''}</dd>
      </div>
      <div class="flex justify-between gap-4 py-4">
        <dt class="text-xs font-bold tracking-[0.18em] uppercase text-slate-500">
          Status
        </dt>
        <dd class="text-sm text-slate-900">
          ${isAuctionActive(listing.endsAt) ? '<span class="text-green-700 font-bold">Active</span>' : '<span class="text-slate-500">Ended</span>'}
        </dd>
      </div>
    </dl>

    <div class="mt-0 pt-6 text-xs text-slate-500 leading-relaxed" style="border-top: 2px solid #e2e8f0">
      <p>
        All bids are binding. By placing a bid you agree to the platform
        terms and conditions and confirm you have sufficient credits at
        the time of auction close.
      </p>
    </div>
  `;
}

function startCountdown(endDate: string) {
  const updateCountdown = () => {
    const countdownDisplay = document.getElementById('countdown-display');
    if (!countdownDisplay) return;

    const timeRemaining = formatTimeRemaining(endDate);
    countdownDisplay.textContent = timeRemaining;

    // Check if auction has ended
    if (timeRemaining === 'Ended' && currentListing) {
      if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
      }
      // Refresh the page to show ended state
      renderBidPanel(currentListing);
    }
  };

  // Update immediately
  updateCountdown();

  // Update every second
  countdownInterval = window.setInterval(updateCountdown, 1000);
}

// Initialize on page load
init();

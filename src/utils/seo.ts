/**
 * SEO utilities for dynamic meta tags
 */

import { APP_BASE_URL, APP_META } from './constants';

/**
 * Update page title
 */
export function updatePageTitle(title: string): void {
  document.title = title;

  // Also update og:title and twitter:title
  updateMetaTag('property', 'og:title', title);
  updateMetaTag('property', 'twitter:title', title);
  updateMetaTag('name', 'title', title);
}

/**
 * Update page description
 */
export function updatePageDescription(description: string): void {
  updateMetaTag('name', 'description', description);
  updateMetaTag('property', 'og:description', description);
  updateMetaTag('property', 'twitter:description', description);
}

/**
 * Update Open Graph image
 */
export function updateOgImage(imageUrl: string): void {
  updateMetaTag('property', 'og:image', imageUrl);
  updateMetaTag('property', 'twitter:image', imageUrl);
}

/**
 * Update canonical URL
 */
export function updateCanonicalUrl(url: string): void {
  let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');

  if (!link) {
    link = document.createElement('link');
    link.rel = 'canonical';
    document.head.appendChild(link);
  }

  link.href = url;

  // Also update og:url and twitter:url
  updateMetaTag('property', 'og:url', url);
  updateMetaTag('property', 'twitter:url', url);
}

/**
 * Update a meta tag by attribute type and name
 */
function updateMetaTag(attrType: 'name' | 'property', attrValue: string, content: string): void {
  let meta = document.querySelector<HTMLMetaElement>(`meta[${attrType}="${attrValue}"]`);

  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute(attrType, attrValue);
    document.head.appendChild(meta);
  }

  meta.content = content;
}

/**
 * Add structured data (JSON-LD) to the page
 */
export function addStructuredData(data: object): void {
  // Remove existing structured data if any
  const existing = document.querySelector('script[type="application/ld+json"]');
  if (existing) {
    existing.remove();
  }

  // Create new script tag
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
}

/**
 * Generate structured data for a listing
 */
export function generateListingStructuredData(listing: {
  id: string;
  title: string;
  description?: string;
  media?: { url: string; alt?: string }[];
  _count?: { bids: number };
  endsAt: string;
  seller?: { name: string };
}): object {
  const listingUrl = `${APP_BASE_URL}/listing.html?id=${listing.id}`;
  const imageUrl = listing.media && listing.media.length > 0
    ? listing.media[0].url
    : `${APP_BASE_URL}/images/logo_v2.svg`;

  return {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: listing.title,
    description: listing.description || 'View this auction listing on Aucto',
    image: imageUrl,
    url: listingUrl,
    offers: {
      '@type': 'Offer',
      availability: 'https://schema.org/InStock',
      priceValidUntil: listing.endsAt,
      url: listingUrl,
    },
    aggregateRating: listing._count?.bids ? {
      '@type': 'AggregateRating',
      ratingCount: listing._count.bids,
    } : undefined,
    seller: listing.seller ? {
      '@type': 'Person',
      name: listing.seller.name,
    } : undefined,
  };
}

/**
 * Generate structured data for the organization
 */
export function generateOrganizationStructuredData(): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: APP_META.name,
    url: APP_BASE_URL,
    logo: `${APP_BASE_URL}/images/logo_v2.svg`,
    description: APP_META.description,
    sameAs: [],
  };
}

/**
 * Generate structured data for website
 */
export function generateWebsiteStructuredData(): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: APP_META.name,
    url: APP_BASE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${APP_BASE_URL}/collection.html?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

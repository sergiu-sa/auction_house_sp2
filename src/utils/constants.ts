/**
 * Application-wide constants
 */

/**
 * Base URL for the application
 * Used for canonical URLs, Open Graph tags, and structured data
 */
export const APP_BASE_URL = 'https://auctohouse.netlify.app';

/**
 * Application metadata
 */
export const APP_META = {
  name: 'Aucto',
  description:
    'A minimal, brutalist auction platform where design follows function. Browse live auctions and place bids on unique items.',
  keywords:
    'online auction, bidding platform, buy and sell, auction house, brutalist design, live auctions, unique items, student marketplace',
  author: 'Aucto',
  themeColor: '#1e293b',
} as const;

/**
 * Social media metadata
 */
export const SOCIAL_META = {
  ogType: 'website',
  twitterCard: 'summary_large_image',
  locale: 'en_US',
} as const;

/**
 * API related constants
 */
export const API_CONSTANTS = {
  sessionExpiredMessage: 'Your session has expired. Please log in again.',
  defaultErrorMessage: 'An error occurred. Please try again later.',
} as const;

import { describe, it, expect } from 'vitest';
import {
  isValidEmail,
  isValidNoroffEmail,
  isValidUrl,
  isValidImageUrl,
  isValidPassword,
  isValidBidAmount,
  isValidFutureDate,
  isValidTitle,
  isValidDescription,
} from './validation';

describe('Email Validation', () => {
  describe('isValidEmail', () => {
    it('should accept valid email formats', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
      expect(isValidEmail('test+tag@example.com')).toBe(true);
    });

    it('should reject invalid email formats', () => {
      expect(isValidEmail('notanemail')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
      expect(isValidEmail('test @example.com')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });
  });

  describe('isValidNoroffEmail', () => {
    it('should accept valid Noroff student emails', () => {
      expect(isValidNoroffEmail('student@stud.noroff.no')).toBe(true);
      expect(isValidNoroffEmail('john.doe@stud.noroff.no')).toBe(true);
    });

    it('should reject non-Noroff emails', () => {
      expect(isValidNoroffEmail('student@gmail.com')).toBe(false);
      expect(isValidNoroffEmail('teacher@noroff.no')).toBe(false);
      expect(isValidNoroffEmail('test@stud.noroff.com')).toBe(false);
    });

    it('should reject invalid email formats', () => {
      expect(isValidNoroffEmail('notanemail')).toBe(false);
      expect(isValidNoroffEmail('')).toBe(false);
    });
  });
});

describe('URL Validation', () => {
  describe('isValidUrl', () => {
    it('should accept valid URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://example.com')).toBe(true);
      expect(isValidUrl('https://example.com/path/to/page')).toBe(true);
      expect(isValidUrl('https://sub.domain.example.com')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(isValidUrl('not-a-url')).toBe(false);
      expect(isValidUrl('ftp://example.com')).toBe(true); // FTP is valid URL
      expect(isValidUrl('')).toBe(false);
      expect(isValidUrl('example.com')).toBe(false); // Missing protocol
    });
  });

  describe('isValidImageUrl', () => {
    it('should accept valid image URLs', () => {
      expect(isValidImageUrl('https://example.com/image.jpg')).toBe(true);
      expect(isValidImageUrl('https://example.com/image.jpeg')).toBe(true);
      expect(isValidImageUrl('https://example.com/image.png')).toBe(true);
      expect(isValidImageUrl('https://example.com/image.gif')).toBe(true);
      expect(isValidImageUrl('https://example.com/image.webp')).toBe(true);
      expect(isValidImageUrl('https://example.com/image.svg')).toBe(true);
    });

    it('should accept URLs with uppercase extensions', () => {
      expect(isValidImageUrl('https://example.com/IMAGE.JPG')).toBe(true);
      expect(isValidImageUrl('https://example.com/photo.PNG')).toBe(true);
    });

    it('should reject non-image URLs', () => {
      expect(isValidImageUrl('https://example.com/document.pdf')).toBe(false);
      expect(isValidImageUrl('https://example.com/video.mp4')).toBe(false);
      expect(isValidImageUrl('https://example.com')).toBe(false);
    });

    it('should reject invalid URLs', () => {
      expect(isValidImageUrl('not-a-url.jpg')).toBe(false);
      expect(isValidImageUrl('')).toBe(false);
    });
  });
});

describe('Password Validation', () => {
  describe('isValidPassword', () => {
    it('should accept passwords with 8 or more characters', () => {
      expect(isValidPassword('password123')).toBe(true);
      expect(isValidPassword('12345678')).toBe(true);
      expect(isValidPassword('VeryLongPassword123!')).toBe(true);
    });

    it('should reject passwords shorter than 8 characters', () => {
      expect(isValidPassword('pass')).toBe(false);
      expect(isValidPassword('1234567')).toBe(false);
      expect(isValidPassword('')).toBe(false);
    });

    it('should accept exactly 8 characters', () => {
      expect(isValidPassword('pass1234')).toBe(true);
    });
  });
});

describe('Bid Validation', () => {
  describe('isValidBidAmount', () => {
    it('should accept bids higher than current highest bid', () => {
      expect(isValidBidAmount(100, 50)).toBe(true);
      expect(isValidBidAmount(1000, 999)).toBe(true);
      expect(isValidBidAmount(1, 0)).toBe(true);
    });

    it('should reject bids equal to or lower than current highest bid', () => {
      expect(isValidBidAmount(50, 50)).toBe(false);
      expect(isValidBidAmount(50, 100)).toBe(false);
      expect(isValidBidAmount(0, 0)).toBe(false);
    });

    it('should reject negative bids', () => {
      expect(isValidBidAmount(-10, 0)).toBe(false);
      expect(isValidBidAmount(-100, 50)).toBe(false);
    });

    it('should accept first bid (no current highest)', () => {
      expect(isValidBidAmount(100)).toBe(true);
      expect(isValidBidAmount(1, 0)).toBe(true);
    });

    it('should reject zero or negative amounts', () => {
      expect(isValidBidAmount(0)).toBe(false);
      expect(isValidBidAmount(-50)).toBe(false);
    });
  });
});

describe('Date Validation', () => {
  describe('isValidFutureDate', () => {
    it('should accept future dates', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      expect(isValidFutureDate(tomorrow)).toBe(true);
      expect(isValidFutureDate(tomorrow.toISOString())).toBe(true);
    });

    it('should accept dates far in the future', () => {
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);

      expect(isValidFutureDate(nextYear)).toBe(true);
    });

    it('should reject past dates', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      expect(isValidFutureDate(yesterday)).toBe(false);
      expect(isValidFutureDate(yesterday.toISOString())).toBe(false);
    });

    it('should reject current time (might be flaky due to timing)', () => {
      const now = new Date();
      // Current time is technically not in the future
      expect(isValidFutureDate(now)).toBe(false);
    });
  });
});

describe('Listing Field Validation', () => {
  describe('isValidTitle', () => {
    it('should accept titles between 3 and 100 characters', () => {
      expect(isValidTitle('ABC')).toBe(true);
      expect(isValidTitle('Valid Auction Title')).toBe(true);
      expect(isValidTitle('A'.repeat(100))).toBe(true);
    });

    it('should reject titles shorter than 3 characters', () => {
      expect(isValidTitle('AB')).toBe(false);
      expect(isValidTitle('A')).toBe(false);
      expect(isValidTitle('')).toBe(false);
    });

    it('should reject titles longer than 100 characters', () => {
      expect(isValidTitle('A'.repeat(101))).toBe(false);
      expect(isValidTitle('A'.repeat(200))).toBe(false);
    });

    it('should accept exactly 3 and 100 characters', () => {
      expect(isValidTitle('ABC')).toBe(true);
      expect(isValidTitle('A'.repeat(100))).toBe(true);
    });
  });

  describe('isValidDescription', () => {
    it('should accept descriptions up to 500 characters', () => {
      expect(isValidDescription('')).toBe(true);
      expect(isValidDescription('Short description')).toBe(true);
      expect(isValidDescription('A'.repeat(500))).toBe(true);
    });

    it('should reject descriptions longer than 500 characters', () => {
      expect(isValidDescription('A'.repeat(501))).toBe(false);
      expect(isValidDescription('A'.repeat(1000))).toBe(false);
    });

    it('should accept empty description (optional field)', () => {
      expect(isValidDescription('')).toBe(true);
    });
  });
});

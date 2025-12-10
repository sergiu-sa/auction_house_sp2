# Test Coverage Report

## Test Statistics

- **Total Test Files**: 3
- **Total Tests**: 76
- **Pass Rate**: 100% (76/76 passing)
- **Test Duration**: ~560ms

## Test Files

### 1. `validation.test.ts` (30 tests)

Tests for all validation functions:

- Email validation (@stud.noroff.no restriction)
- Password strength validation
- URL validation
- Bid amount validation
- Form validation helpers

### 2. `formatDate.test.ts` (29 tests)

Tests for date formatting utilities:

- Relative time formatting ("2 hours ago")
- Countdown timers
- Time remaining calculations
- Auction deadline formatting
- Edge cases (past dates, invalid dates)

### 3. `formatCurrency.test.ts` (17 tests)

Tests for currency and number formatting:

- Credit balance formatting
- Bid amount formatting
- Number abbreviations (1.2K, 5M)
- Locale-specific formatting
- Edge cases (0, negative, large numbers)

## Coverage Metrics

The test suite focuses on testing critical utility functions that handle:

- User input validation
- Data formatting for display
- Business logic calculations

### Covered Functions (100% coverage)

- `formatCurrency()` - Currency formatting
- `formatNumber()` - Number formatting  
- `formatDate()` - Date/time formatting
- `formatTimeRemaining()` - Countdown timers
- `getTimeUntil()` - Time calculations
- `isValidNoroffEmail()` - Email validation
- `isValidPassword()` - Password validation
- `isValidUrl()` - URL validation
- `validateBidAmount()` - Bid validation

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with UI
npm run test:ui

# Generate coverage report
npm run test:coverage
```

## Viewing Coverage Report

After running `npm run test:coverage`, open `coverage/index.html` in your browser to view the detailed HTML coverage report.

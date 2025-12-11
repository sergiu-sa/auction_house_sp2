# Aucto - Auction Platform

![Aucto Banner](https://img.shields.io/badge/Noroff-Semester_Project_2-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=fff) ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?logo=tailwindcss&logoColor=fff) ![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=fff)

This project is part of the Semester Project 2 for Front-end Development 2 at Noroff School of Technology and Digital Media.

---

## About

**Aucto** is a feature-rich online auction platform where users can list items for bidding, place bids on other users' listings, and manage their auction activities. The platform features a distinctive brutalist design aesthetic with bold typography, strong borders, and a focus on functionality.

### Key Highlights

- **Restricted Registration**: Only users with `@stud.noroff.no` email addresses can register
- **Credit System**: Users receive starter credits (1000) upon registration for bidding
- **Real-time Bidding**: Place bids on active listings with instant updates
- **Profile Management**: Customize avatar, banner, and bio
- **Responsive Design**: Optimized for all devices (mobile, tablet, desktop)
- **Accessibility**: Built with WCAG guidelines and universal design principles

### Project Resources

- **Live Site**: [https://auctohouse.netlify.app/](https://auctohouse.netlify.app/)
- **GitHub Repository**: [https://github.com/sergiu-sa/auction_house_sp2.git](https://github.com/sergiu-sa/auction_house_sp2.git)
- **Figma Design**: [View Design](https://www.figma.com/design/6b7xOMQl4yOkBZMJXQ9kNo/Auction-House?node-id=61-31591&t=eYdNBDJRg9wBBVGZ-1)
- **Project Board**: [GitHub Projects](https://github.com/users/sergiu-sa/projects/12)

---

## Built With

### Core Technologies

- **[Vite](https://vitejs.dev/)**
- **[TypeScript](https://www.typescriptlang.org/)**
- **[Tailwind CSS](https://tailwindcss.com/)**
- **[Noroff API v2](https://docs.noroff.dev/docs/v2)**

### Development Tools

- **ESLint** (v9.39.1) - Code linting and quality
- **Prettier** (v3.6.2) - Code formatting
- **PostCSS** (v8.5.6) - CSS processing
- **Vitest** (v4.0.13) - Unit testing framework

### Hosting & Deployment

- **[Netlify](https://www.netlify.com/)**

---

## Getting Started

### Prerequisites

- **Node.js** v18 or higher
- **npm** or **yarn** package manager
- **Git** for version control

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/sergiu-sa/auction_house_sp2.git
cd auction_house_sp2
```

2 **Install dependencies**

```bash
npm install
```

3 **Set up environment variables**

Create a `.env` file in the root directory (use `.env.example` as template):

```bash
VITE_API_BASE_URL=https://v2.api.noroff.dev
VITE_API_KEY=your_api_key_here
```

### Development

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
```

This creates an optimized production build in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

### Type Checking

```bash
npm run type-check
```

---

## 📁 Project Structure

```bash
auction_house_sp2/
├── public/                      # Static assets
│   └── images/                  # Image assets
│
├── src/                         # Source code
│   ├── api/                     # API client modules
│   │   ├── auth.ts              # Authentication endpoints
│   │   ├── bids.ts              # Bidding endpoints
│   │   ├── config.ts            # API configuration & client
│   │   ├── listings.ts          # Listing endpoints
│   │   └── profile.ts           # Profile endpoints
│   │
│   ├── components/              # Reusable UI components
│   │   ├── Breadcrumb.ts        # Navigation breadcrumbs
│   │   ├── CollectionCard.ts    # Listing card
│   │   ├── Footer.ts            # Footer component
│   │   ├── ProductCard.ts       # Featured product card
│   │   ├── QuickCard.ts         # Quick action cards
│   │   ├── Toast.ts             # Toast notifications
│   │   ├── featuredWin.ts       # Featured winner display
│   │   ├── filters/             # Filter components
│   │   │   ├── ActiveOnlyCheckbox.ts
│   │   │   ├── CategoryFilters.ts
│   │   │   └── SortDropdown.ts
│   │   ├── guestBanner.ts       # Guest user banner
│   │   ├── navbar.ts            # Navigation bar
│   │   ├── newsletter.ts        # Newsletter signup
│   │   ├── PaginationComponent.ts # Pagination
│   │   └── statsBar.ts          # Statistics display
│   │
│   ├── pages/                   # Page-level components
│   │   ├── collection.ts        # Browse all listings page
│   │   ├── home.ts              # Homepage
│   │   ├── listingCreate.ts     # Create listing page
│   │   ├── listingDetail.ts     # Single listing page
│   │   ├── listingEdit.ts       # Edit listing page
│   │   ├── login.ts             # Login page
│   │   ├── profilePage.ts       # User profile page
│   │   └── register.ts          # Registration page
│   │
│   ├── styles/                  # Stylesheets
│   │   └── main.css             # Main Tailwind CSS file
│   │
│   ├── types/                   # TypeScript type definitions
│   │   └── api.ts               # API response types
│   │
│   ├── utils/                   # Utility functions
│   │   ├── auth.ts              # Auth helpers & route guards
│   │   ├── authLoader.ts        # Auth loading states
│   │   ├── errorHandling.ts     # Error handling utilities
│   │   ├── formatDate.ts        # Date formatting
│   │   ├── imageOptimization.ts # Image loading optimization
│   │   ├── logger.ts            # Logging utility
│   │   ├── seo.ts               # SEO meta tag utilities
│   │   ├── storage.ts           # LocalStorage management
│   │   └── validation.ts        # Form validation
│   │
│   └── main.ts                  # Application entry point
│
├── index.html                   # Homepage
├── collection.html              # Browse listings page
├── login.html                   # Login page
├── register.html                # Registration page
├── profile.html                 # User profile page
├── listing.html                 # Single listing page
├── listing-create.html          # Create listing page
├── listing-edit.html            # Edit listing page
│
├── .env                         # Environment variables (not in repo)
├── .env.example                 # Environment variables template
├── .gitignore                   # Git ignore rules
├── netlify.toml                 # Netlify configuration
├── package.json                 # Project dependencies
├── tailwind.config.js           # Tailwind CSS configuration
├── tsconfig.json                # TypeScript configuration
├── vite.config.ts               # Vite configuration
└── README.md                    # Project documentation
```

---

## User Guide

### For Guest Users (Not Logged In)

 **You can**:

- Browse all active listings
- Search and filter listings
- View detailed listing information
- See bid history on listings

**You cannot**:

- Place bids
- Create listings
- Manage profile

### For Registered Users

#### Registration

1. Navigate to the [Register page](https://auctohouse.netlify.app/register.html)
2. Enter your full name
3. Use your `@stud.noroff.no` email address
4. Create a password (minimum 8 characters)
5. Receive 1000 starter credits automatically

#### Creating a Listing

1. Click **"Create Listing"** in the navigation
2. Fill in the listing details:
   - **Title**: Clear, descriptive title
   - **Description**: Detailed item description
   - **Images**: Add image URLs (one per line)
   - **Tags**: Optional categories (comma-separated)
   - **End Date**: Set auction deadline
3. Click **"Create Listing"** to publish

#### Placing a Bid

1. Browse to a listing detail page
2. Enter your bid amount (must exceed current highest bid)
3. Click **"Place Bid"**
4. Credits are held until auction ends or you're outbid

#### Managing Your Profile

1. Click your profile avatar in the navigation
2. Select **"My Profile"** from dropdown
3. Click **"Edit Profile"** to update:
   - Avatar image URL
   - Banner image URL
   - Bio/description

---

## Testing

### Test Coverage

- **76 tests** across 3 test suites
- **100% pass rate**
- **100% coverage** on tested utility functions

### Test Files

- `src/utils/validation.test.ts` - Email, URL, password, bid, and form validation (30 tests)
- `src/utils/formatDate.test.ts` - Date formatting and time calculations (29 tests)
- `src/utils/formatCurrency.test.ts` - Currency and number formatting (17 tests)

### Running Tests

```bash
# Run all tests
npm test

# Run in watch mode
npm run test:watch

# Run with UI
npm run test:ui

# Generate coverage report
npm run test:coverage
```

After running `npm run test:coverage`, open `coverage/index.html` in your browser for a detailed HTML report.

---

## API Documentation

This project integrates with the [Noroff API v2](https://docs.noroff.dev/docs/v2).

### API Endpoints Used

**Authentication**:

- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `POST /auth/create-api-key` - Create API key

**Auction Listings**:

- `GET /auction/listings` - Get all listings
- `GET /auction/listings/:id` - Get single listing
- `POST /auction/listings` - Create listing
- `PUT /auction/listings/:id` - Update listing
- `DELETE /auction/listings/:id` - Delete listing

**Bidding**:

- `POST /auction/listings/:id/bids` - Place bid on listing

**User Profiles**:

- `GET /auction/profiles/:name` - Get user profile
- `PUT /auction/profiles/:name` - Update profile
- `GET /auction/profiles/:name/listings` - Get user's listings
- `GET /auction/profiles/:name/bids` - Get user's bids

### API Features Implemented

- ✅ JWT token authentication
- ✅ API key authorization
- ✅ Error handling and user feedback
- ✅ Request retry on failure
- ✅ Session management
- ✅ Token expiration handling

---

## Browser Compatibility

**Tested and optimized for**:

- **Desktop**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Mobile**: iOS Safari 14+, Chrome Mobile 90+, Samsung Internet 15+

**Note**: Internet Explorer and legacy browsers are not supported.

---

## Author

**Sergiu D Sarbu**
Front-end Development Student, Noroff

## License

© 2024 Noroff School of Technology and Digital Media

This project is part of the Front-end Development 2 course curriculum.

---

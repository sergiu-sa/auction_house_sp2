# Auction House

A front-end application for an online auction platform built with Vite, vanilla TypeScript, and Tailwind CSS.

## Project Setup

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The application will start at `http://localhost:5173`

### Build

```bash
npm run build
```

### Type Checking

```bash
npm run type-check
```

### Preview Build

```bash
npm run preview
```

## Project Structure

``` bash
semester-project-2/
├── public/
│   ├── images/           # Static images
│   └── favicon.ic
│
├── src/
│   ├── api/
│   │   ├── auth.ts         # Login, register, logout
│   │   ├── listings.ts     # CRUD operations for listings
│   │   ├── bids.ts         # Place bids
│   │   ├── profile.ts      # Update profile, get user data
│   │   └── config.ts       # API base URL, headers
│   │
│   ├── components/
│   │   ├── Breadcrumb.ts
│   │   ├── ListingCard.ts  # Reusable listing card
│   │   ├── BidHistory.ts   # Bid history component
│   │   ├── Header.ts       # Header with navigation
│   │   ├── Footer.ts
│   │   └── SearchBar.ts
│   │
│   ├── utils/
│   │   ├── auth.ts         # Check login, get token, etc.
│   │   ├── storage.ts      # LocalStorage helpers
│   │   ├── validation.ts   # Form validation
│   │   ├── formatDate.ts   # Date formatting
│   │   └── formatCurrency.ts
│   │
│   ├── types/
│   │   ├── api.ts          # API response types
│   │   ├── listing.ts      # Listing interface
│   │   ├── user.ts         # User/Profile interface
│   │   └── bid.ts          # Bid interface
│   │
│   ├── pages/
│   │   ├── home.ts         # Home page logic
│   │   ├── login.ts        # Login page logic
│   │   ├── register.ts
│   │   ├── profile.ts
│   │   ├── listingDetail.ts
│   │   ├── createListing.ts
│   │   └── editListing.ts
│   │
│   ├── styles/
│   │   ├── main.css        # Tailwind imports + custom styles
│   │   └── components.css  # Component-specific styles
│   │
│   └── main.ts             # Global initialization
│
├── index.html              # Home/Feed page
├── login.html
├── register.html
├── profile.html
├── listing.html            # Single listing detail
├── create-listing.html
├── edit-listing.html
│
├── .env                    
├── .gitignore
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── vite.config.ts
└── README.md
└── 
```

## Technologies

- **Vite** - Build tool and dev server
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first CSS framework
- **Vanilla JavaScript** - No frameworks, pure JS

## Features

- User registration and authentication
- Browse auction listings
- Create and manage listings
- Place bids on listings
- User profile management
- Credit system

## API

This project integrates with the Noroff Auction API v2.

## License

Noroff School of Technology and Digital Media

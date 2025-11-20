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

```
src/
├── js/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login.ts
│   │   │   ├── register.ts
│   │   │   └── key.ts              # API key management
│   │   ├── listings/
│   │   │   ├── read.ts             # GET listings
│   │   │   ├── create.ts           # POST listing
│   │   │   ├── update.ts           # PUT listing
│   │   │   ├── delete.ts           # DELETE listing
│   │   │   └── search.ts           # Search functionality
│   │   ├── profiles/
│   │   │   ├── read.ts             # GET profile
│   │   │   └── update.ts           # PUT profile (avatar, banner, bio)
│   │   └── bids/
│   │       └── create.ts           # POST bid
│   │
│   ├── ui/
│   │   ├── auth/
│   │   │   ├── login.ts            # Login form handler
│   │   │   ├── register.ts         # Register form handler
│   │   │   └── logout.ts           # Logout functionality
│   │   ├── listings/
│   │   │   ├── displayListings.ts  # Render listings grid
│   │   │   ├── displaySingle.ts    # Render single listing
│   │   │   ├── createListing.ts    # Create form handler
│   │   │   ├── editListing.ts      # Edit form handler
│   │   │   ├── deleteListing.ts    # Delete functionality
│   │   │   └── placeBid.ts         # Bid form handler
│   │   ├── profile/
│   │   │   ├── displayProfile.ts   # Render profile
│   │   │   └── editProfile.ts      # Edit profile handler
│   │   ├── global/
│   │   │   ├── nav.ts              # Navbar (shows/hides based on auth)
│   │   │   ├── search.ts           # Search bar functionality
│   │   │   └── credits.ts          # Credits display (logged in only)
│   │   └── utils/
│   │       ├── storage.ts          # localStorage helpers
│   │       └── router.ts           # Simple routing
│   │
│   └── main.ts                     # Entry point
│
├── styles/
│   └── style.css                   # Tailwind + custom styles
│
├── pages/                          # HTML pages (from your design)
│   ├── index.html                  # Home/Feed
│   ├── login.html
│   ├── register.html
│   ├── profile.html
│   ├── listing.html                # Single listing detail
│   ├── create-listing.html
│   └── edit-listing.html
│
└── types/
    ├── auth.ts
    ├── listing.ts
    ├── profile.ts
    └── bid.ts
    
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

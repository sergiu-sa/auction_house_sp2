
# Auction House

A modern front-end application for an online auction platform built with Vite, vanilla TypeScript, and Tailwind CSS. This project is part of the Semester Project 2 for Front-end Development 2 at Noroff.

## About

AUCTO is an auction house platform where users can list items for auction, place bids, and manage their profiles. Built using vanilla TypeScript and modern web development practices, the application integrates with the Noroff Auction API v2.

## Project Resources

* [Figma Design File](https://www.figma.com/design/6b7xOMQl4yOkBZMJXQ9kNo/Auction-House?node-id=61-31591&t=eYdNBDJRg9wBBVGZ-1)
* [GitHub Repository](https://github.com/sergiu-sa/auction_house_sp2.git)
* [GitHub Project / Kanban Board](https://github.com/users/sergiu-sa/projects/12)
* [Live Deployment - AUCTO](https://auctohouse.netlify.app/)

---

## Project Setup

### Prerequisites

* Node.js v18+
* npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Starts at `http://localhost:5173`

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

---

## Project Structure

```bash
auction_house_sp2/
├── public/
│   └── images/
│
├── src/
│   ├── api/
│   │   ├── auth.ts
│   │   ├── listings.ts
│   │   ├── bids.ts
│   │   ├── profile.ts
│   │   └── config.ts
│   │
│   ├── components/
│   │   ├── cards/
│   │   ├── layout/
│   │   └── ui/
│   │
│   ├── pages/
│   │   ├── home.ts
│   │   ├── login.ts
│   │   ├── register.ts
│   │   ├── profile.ts
│   │   ├── collection.ts
│   │   ├── listing.ts
│   │   ├── create.ts
│   │   └── edit.ts
│   │
│   ├── utils/
│   │   ├── auth.ts
│   │   ├── storage.ts
│   │   ├── validation.ts
│   │   └── formatters.ts
│   │
│   ├── types/
│   │   ├── api.ts
│   │   ├── listing.ts
│   │   └── user.ts
│   │
│   ├── styles/
│   │   └── main.css
│   │
│   └── main.ts
│
├── index.html
├── login.html
├── register.html
├── profile.html
├── collection.html
├── listing.html
├── create.html
├── edit.html
│
├── .env
├── .gitignore
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── vite.config.ts
└── README.md
```

---

## Features

### User Authentication

* Register with @stud.noroff.no email
* Secure login/logout
* Route protection for authenticated features

### Profile Management

* Edit profile (avatar, banner, bio)
* View user credits
* Track created listings
* View bid history

### Listings

* Browse all listings 
* Search and filter functionality
* Create new listings with images, title, description, and deadline
* Edit and delete own listings
* View detailed listing information
* Responsive card layouts

### Bidding

* Place bids on other users listings
* View bid history
* Real-time bid tracking
* Credit-based bidding system;

### User Experience

* Responsive design (mobile and desktop)
* Sticky navigation with filters
* Toast notifications for user feedback
* Breadcrumb navigation
* Floating action buttons
* Smooth animations and transitions

---

## Technologies

* **Vite** - Build tool and dev server
* **TypeScript** - Type-safe JavaScript
* **Tailwind CSS** - Utility-first CSS framework
* **Noroff Auction API v2** - Backend API

---

## API

This project integrates with the [Noroff Auction API v2](https://docs.noroff.dev/docs/v2).

---

## Testing

### Automated Tests

This project includes comprehensive unit tests using Vitest.

**Test Coverage:**

* **76 tests** across 3 test suites
* **100% pass rate**

**Test Files:**

* `src/utils/validation.test.ts` - Email, URL, password, bid, and form validation (30 tests)
* `src/utils/formatDate.test.ts` - Date formatting and time calculations (29 tests)
* `src/utils/formatCurrency.test.ts` - Currency and number formatting (17 tests)

**Run Tests:**

```bash
# Run all tests
npm test

# Run in watch mode
npm run test:watch

# Run with UI
npm run test:ui

# Run with coverage
npm run test:coverage
```


---

## License

Noroff School of Technology and Digital Media

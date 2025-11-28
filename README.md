
# Auction House

A front-end application for an online auction platform built with Vite, vanilla TypeScript, and Tailwind CSS.
This repo is part of your semester project.

## Project Resources

* **Figma Design File:**
  [https://www.figma.com/design/6b7xOMQl4yOkBZMJXQ9kNo/Auction-House?node-id=61-31591&t=eYdNBDJRg9wBBVGZ-1](https://www.figma.com/design/6b7xOMQl4yOkBZMJXQ9kNo/Auction-House?node-id=61-31591&t=eYdNBDJRg9wBBVGZ-1)

* **GitHub Repository:**
  [https://github.com/sergiu-sa/auction_house_sp2.git](https://github.com/sergiu-sa/auction_house_sp2.git)

* **GitHub Project / Kanban Board:**
  [https://github.com/users/sergiu-sa/projects/12](https://github.com/users/sergiu-sa/projects/12)

* **Deployment (Netlify):**
  [https://auctohouse.netlify.app/](https://auctohouse.netlify.app/)

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

### Full Overview

```bash
auction_house_sp2
├── public/
│   ├── images/
│  
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
│   │   ├── Breadcrumb.ts
│   │   ├── ListingCard.ts
│   │   ├── BidHistory.ts
│   │   ├── Header.ts
│   │   ├── Footer.ts
│   │   └── SearchBar.ts
│   │
│   ├── utils/
│   │   ├── auth.ts
│   │   ├── storage.ts
│   │   ├── validation.ts
│   │   ├── formatDate.ts
│   │   └── formatCurrency.ts
│   │
│   ├── types/
│   │   ├── api.ts
│   │   ├── listing.ts
│   │   ├── user.ts
│   │   └── bid.ts
│   │
│   ├── pages/
│   │   ├── home.ts
│   │   ├── login.ts
│   │   ├── register.ts
│   │   ├── profile.ts
│   │   ├── listingDetail.ts
│   │   ├── createListing.ts
│   │   └── editListing.ts
│   │
│   ├── styles/
│   │   ├── main.css
│   │   └── components.css
│   │
│   └── main.ts
│
├── index.html
├── login.html
├── register.html
├── profile.html
├── listing.html
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
```

### Simple Overview

```bash
auction_house_sp2
├── public/
│   ├── images/
│   └── favicon.ico
│
├── src/
│   ├── api/               
│   ├── components/       
│   ├── utils/            
│   ├── types/            
│   ├── pages/            
│   ├── styles/           
│   └── main.ts            
│
├── index.html
├── login.html
├── register.html
├── profile.html
├── listing.html
├── create-listing.html
├── edit-listing.html
│
├── .env
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

---

## Technologies

* Vite
* TypeScript
* Tailwind CSS
* Vanilla JS

---

## API

This project consumes the **Noroff Auction API v2**.

---

## License

Noroff School of Technology and Digital Media

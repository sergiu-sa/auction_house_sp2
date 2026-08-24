# Aucto

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=fff) ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?logo=tailwindcss&logoColor=fff) ![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=fff) ![Vitest](https://img.shields.io/badge/Vitest-6E9F18?logo=vitest&logoColor=fff)

A minimal, brutalist online auction platform. Browse live lots, place bids, list items, manage your collection — built around the idea that the products themselves should drive the visual hierarchy, with the interface staying out of the way.

**Live**: [auctohouse.netlify.app](https://auctohouse.netlify.app/) · **Stack**: vanilla TypeScript + Tailwind v3 + Vite (multi-page app) → Netlify

![Aucto homepage](screenshots/home.png)

---

## Why I built this

I wanted a project where design served function rather than decoration. Auction items have strong visual identity on their own, the temptation is to wrap them in chrome, but in practice that just dilutes them. Aucto leans into the content: bento-style grids, a neutral palette, 3px borders, Cormorant headings against Source Sans 3 body, and zero radii except on a single Toast component. The result is a tool-like, mechanical interface that supports browsing without competing with the lots.

The other goal was to ship a real-world front-end without leaning on a framework. No React, no router, no SPA. Each HTML file is its own Vite entry, each page module owns its own DOM mounting, and navigation is just real navigation. It's a constraint that forces you to think hard about what state actually needs to persist and what abstractions actually carry their weight.

## Engineering decisions

**Multi-page app, no router.** Eight HTML files, eight Vite entries declared in `vite.config.ts`. Page modules in `src/pages/<Name>.ts` orchestrate their page, importing `renderHeader` / `renderFooter` from shared components. Auction listings are content, not application state — there's nothing here that wouldn't be served better by a fresh page load.

**Single API client, centralised auth.** Every network call goes through `apiClient<T>` in `src/api/config.ts`. It injects the API key and bearer token from localStorage, parses JSON, throws a typed `ApiErrorClass` on non-2xx responses, and handles 401 in one place — clearing auth, showing a toast, and redirecting to login with the original URL preserved. Domain modules (`auth.ts`, `bids.ts`, `listings.ts`, `profile.ts`) are thin wrappers over `api.get/post/put/delete`. Pages never call `fetch` directly.

**Storage as the auth contract.** `src/utils/storage.ts` owns every localStorage key the app uses (`token`, `tokenTimestamp`, `user`, `watchedListings`). Pages and components access auth state and the watchlist exclusively through its exported helpers. Token expiry is checked client-side at 7 days; the server's actual lifetime is independent and a real 401 still wins.

**Componentisation drove the refactor.** Filter logic originally lived in three places — the navbar, the sticky filter bar, and the catalog page script. Cross-component drift was inevitable. Extracting `CategoryFilters`, `SortDropdown`, `ActiveOnlyCheckbox`, and `SearchField` into self-contained components that dispatch CustomEvents (`categoryFilterChange`, `sortChange`, etc.) collapsed three implementations into one and made the catalog state synchronisation trivial. The auth-page product showcases (`ProductShowcase`) and the listing-form preview widgets (`ListingFormPreview`) followed the same pattern.

**Iterative, not waterfall.** I built a high-fidelity Figma prototype but treated it as a starting point. Reproducing layouts in code against real API data exposed limitations the static mockups couldn't predict — descriptions were often shorter than expected, leaving awkward space; the bento layout on the listing-detail page was a direct response. The brand identity, including the logo, evolved alongside the implementation rather than being locked first.

## Features

- **Browse without an account.** Listings, search, filters, listing detail, bid history.
- **Restricted registration** to `@stud.noroff.no` emails (the platform is built against the Noroff student API). New users get 1000 starter credits.
- **Live bidding** with client-side validation (must exceed current highest bid).
- **Listing management.** Create, edit, delete your own auctions. Live preview while you type.
- **Persistent watchlist** stored in localStorage, surfaced both on the listing-detail page and via the heart icon on each catalog card.
- **Profile management.** Avatar, banner, bio.
- **Accessibility groundwork.** Skip-to-content link, aria-live toasts, semantic landmarks, keyboard focus rings on every input, alt text on images.
- **SEO.** Per-page title/description/canonical, Open Graph + Twitter cards, JSON-LD structured data for listings (Product schema), homepage (WebSite + Organization), sitemap, robots.

### Listing Detail Page

![Listing detail](screenshots/listing-detail.png)

### Profile Page

![Profile](screenshots/profile.png)

---

## Stack

| Layer    | Choice                                           | Why                                                                                            |
| -------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| Language | TypeScript (strict)                              | `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`. Build runs `tsc` before Vite.  |
| Bundler  | Vite v7                                          | Multi-page entries via `rollupOptions.input`; ES2020 target, no legacy polyfills.              |
| Styling  | Tailwind v3                                      | Custom palette (`aucto.*`, `warm-white`), 3px border utility, Cormorant + Source Sans 3 fonts. |
| API      | [Noroff API v2](https://docs.noroff.dev/docs/v2) | JWT auth + API-key authorisation.                                                              |
| Testing  | Vitest + jsdom                                   | 53 unit tests across the three pure utility modules.                                           |
| Linting  | ESLint v9 (flat config) + Prettier               | `npm run lint` enforced in CI.                                                                 |
| CI       | GitHub Actions                                   | Type-check + lint + test + build on every PR and push to `main`.                               |
| Hosting  | Netlify                                          | Catch-all 404 redirect, security headers, asset caching.                                       |

---

## Getting started

```bash
git clone https://github.com/sergiu-sa/auction_house_sp2.git
cd auction_house_sp2
npm install
cp .env.example .env   # then fill in VITE_API_KEY (see .env.example)
npm run dev            # http://localhost:5173
```

### Scripts

| Command                                    | What it does                                |
| ------------------------------------------ | ------------------------------------------- |
| `npm run dev`                              | Vite dev server with HMR.                   |
| `npm run build`                            | `tsc` (typecheck) + `vite build` → `dist/`. |
| `npm run preview`                          | Serve the production build locally.         |
| `npm run type-check`                       | TypeScript only, no emit.                   |
| `npm run lint` / `npm run lint:fix`        | ESLint v9 flat config across `src/`.        |
| `npm run format` / `npm run format:check`  | Prettier write / dry-run.                   |
| `npm test`                                 | One-shot Vitest run.                        |
| `npm run test:watch` / `:ui` / `:coverage` | Watch mode / UI / coverage report.          |

`.env` (gitignored) needs `VITE_API_BASE_URL` and `VITE_API_KEY`. See `.env.example`.

---

## Project structure

```bash
src/
├── api/                # Single typed fetch wrapper + domain modules
│   ├── auth.ts         # /auth endpoints (register, login, create-api-key)
│   ├── bids.ts         # /auction/listings/:id/bids
│   ├── config.ts       # apiClient<T>, ApiErrorClass, handleUnauthorized
│   ├── listings.ts     # /auction/listings CRUD
│   └── profile.ts      # /auction/profiles
│
├── components/         # renderX / initX functions returning HTML strings
│   ├── Breadcrumb.ts
│   ├── CollectionCard.ts ProductCard.ts QuickCard.ts
│   ├── Navbar.ts Footer.ts
│   ├── Newsletter.ts StatsBar.ts FeaturedWin.ts
│   ├── ProductShowcase.ts        # auth-page tile polling
│   ├── ListingFormPreview.ts     # live preview for create/edit
│   ├── PaginationComponent.ts Toast.ts GuestBanner.ts
│   └── filters/                  # SearchField, CategoryFilters, SortDropdown, …
│
├── pages/              # One module per HTML entry
│   ├── Home.ts Collection.ts ListingDetail.ts
│   ├── ListingCreate.ts ListingEdit.ts
│   ├── Login.ts Register.ts ProfilePage.ts
│
├── styles/main.css     # Tailwind imports + design-token CSS variables
├── types/api.ts        # Noroff response types
└── utils/              # Pure helpers (auth guards, storage, validation, dates,
                        # logger, SEO, error handling, image optimisation, …)
```

---

## Testing

The test suite covers the three pure utility modules — the parts of the codebase where bugs would silently corrupt user-visible behaviour:

- `src/utils/validation.test.ts` — 30 tests (email format, Noroff-domain check, URL/image-URL, password, bid amounts, future-date guard, listing title/description bounds).
- `src/utils/formatDate.test.ts` — 17 tests (auction time-remaining strings, "Ended" boundary, formatting variants).
- `src/utils/formatCurrency.test.ts` — 6 tests (credits formatting, both verbose and short notation).

**53 tests, 100% pass rate.**

**Pages and components are intentionally untested** — they're DOM-driven orchestration with no logic worth asserting. Coverage thresholds explicitly exclude `src/pages/**`, `src/types/**`, and `src/main.ts`. Any logic worth testing belongs in `src/utils/` and is tested next to its source.

```bash
npm test                 # one-shot run
npm run test:watch       # watch mode
npm run test:coverage    # v8 coverage → coverage/index.html
```

---

## Deployment

Netlify, configured in `netlify.toml`:

- Build command `npm run build`, publish `dist/`.
- Catch-all `[[redirects]]` rule serves the branded `/404.html` on unknown URLs.
- Security headers: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, immutable cache for `/*.js`, `/*.css`, `/images/*`, `/*.svg`.
- HTML responses set to `must-revalidate` so deploys land instantly.

CI (`.github/workflows/ci.yml`) runs type-check, lint, test, and build on every PR and push to `main`. Production deploys are triggered by Netlify on merges to `main`.

---

## Browser support

ES2020 target. Tested on Chrome 90+, Firefox 88+, Safari 14+, Edge 90+. iOS Safari 14+, Chrome Mobile 90+, Samsung Internet 15+. No IE.

---

## Author

**Sergiu Sarbu** · [GitHub](https://github.com/sergiu-sa)

## License

MIT © 2026 Sergiu Sarbu. See [LICENSE](LICENSE).

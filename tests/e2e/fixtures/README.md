# Smoke-suite fixtures

Recorded from the live Noroff API on 2026-08-22 and replayed by `tests/e2e/support/mock.ts`. They are the reason the smoke suite can answer "did we break the app?" without a shared third-party API in the loop.

Two things were changed from the raw recordings:

- **Emails redacted** to `redacted@stud.noroff.no`. No tokens or passwords were ever present in these responses.
- **Third-party usernames pseudonymised** to `Seller01`…`Seller104`. The raw responses carry 104 real Noroff student names; this repo is public, and the tests do not care what the sellers are called. `Oltenks` — the account the suite authenticates as — is kept,  because the profile routes answer as them.

## Recorded

| File | Shape |
| --- | --- |
| `listings-page.json` | 50 items, `_seller` + `_bids`, totalCount 3199. Only **2** are active at the frozen clock — that is F-001, not a fixture bug. |
| `listings-ending-soon.json` | 4 items, `_active`, sorted `endsAt` asc, totalCount 52 |
| `listings-stats.json` | 1 item + `meta.totalCount` 52 |
| `listings-search-hit.json` | 12 items from `/search?q=vintage`, totalCount 116 |
| `listings-empty.json` | 0 items — the empty-state path |
| `listing-single.json` | one active listing, highest bid 1000, seller is not the test user |
| `listing-404.json` | `errors: [{message: "No listing with such ID"}]` |
| `profile.json`, `profile-listings.json`, `profile-bids.json`, `profile-wins.json` | the test user's profile surfaces |

## Derived

These could not be recorded: a bid is a live write to a shared pool, and the account's own lots have all ended. Shapes follow `src/types/api.ts`.

| File | Derived from | Why it exists |
| --- | --- | --- |
| `listing-lowbid.json` | `listing-single.json`, bids capped at 100 | The recorded listing's highest bid is 1000, so the minimum bid (1001) is above the profile's 968 credits and the happy-path bid is unreachable. |
| `listing-own.json` | `profile-listings.json[0]` | `listing-edit.html` calls `requireOwnership(seller.name)`, so it needs a single-listing response the test user owns. |
| `bid-created.json` | `Bid` in `src/types/api.ts` | The `POST /bids` response. The app awaits it and re-fetches the listing, so only its shape matters. |
| `error-500.json` | — | The listings-endpoint failure path. |

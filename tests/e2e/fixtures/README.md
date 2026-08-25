# Smoke-suite fixtures

Recorded from the live Noroff API on 2026-08-22 (`listings-active.json`: 2026-08-24) and replayed by `tests/e2e/support/mock.ts`. They are the reason the smoke suite can answer "did we break the app?" without a shared third-party API in the loop.

Two things were changed from the raw recordings:

- **Emails redacted** to `redacted@stud.noroff.no`. No tokens or passwords were ever present in these responses.
- **Third-party usernames pseudonymised** to `Seller01`…`Seller104`. The raw responses carry 104 real Noroff student names; this repo is public, and the tests do not care what the sellers are called. `Oltenks` — the account the suite authenticates as — is kept,  because the profile routes answer as them.

## Recorded

| File | Shape |
| --- | --- |
| `listings-page.json` | 50 items, `_seller` + `_bids`, totalCount 3199. Only **2** are active at the frozen clock — that is F-001, not a fixture bug. |
| `listings-ending-soon.json` | 4 items, `_active`, sorted `endsAt` asc, totalCount 52 |
| `listings-active.json` | **the whole active pool** — 53 items, `_seller` + `_bids`, `created` desc, totalCount 53, `pageCount` 1. Recorded 2026-08-24; every lot in it was also active at the frozen clock. This is what makes the active surfaces assertable: 47 lots carry bids, 128 bids in total. |
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

## Pagination

`mock.ts` slices these fixtures by `page`/`limit` and rewrites `meta`, rather than returning a
fixture whole. The app asks the API for a page now, so a mock that ignored `page` would make page 2
identical to page 1 and the pagination assertions would pass against a broken query layer.

Two consequences worth knowing: a fixture holds fewer rows than its own `totalCount` (50 of 3,199),
so pages past the recorded rows come back short — tests stay near the front. And `_tag` can only be
counted over what was recorded, so a tagged request reports the filtered row count as `totalCount`
instead of the fixture's.

## Re-recording, and knowing when to

```bash
npm run fixtures:check     # compare live API shapes with these files, write nothing
npm run fixtures:record    # re-record all five listings fixtures
node scripts/record-fixtures.mjs --only=listings-active
```

`fixtures:check` is the maintenance tool. It fetches each recordable fixture's request and
compares **field names and types** — not values, which drift constantly on a shared pool — and
reports anything added, removed or retyped. A differing `totalCount` is normal and is not a
reason to re-record.

Re-record when the API's *shape* changes, or when the app starts asking a different question.
Not on a schedule: these files are frozen on purpose, and re-recording for its own sake means
re-deriving every exact count the suite asserts.

Two things the recorder cannot do. It only covers the five listings fixtures — the profile and
single-listing ones need a signed-in token, and the derived ones describe states the live pool
cannot produce. And re-recording moves the `endsAt` values, so `FROZEN_AT` in
`tests/e2e/support/mock.ts` has to move with them; the script says so when it finishes.

Usernames stay stable across re-records: the recorder rebuilds the alias map by matching listing
and bid ids that appear in both the live response and the existing files, so a seller keeps the
same `SellerNN`. New accounts get the next free number.

# Halls app

A Cloudflare Worker (`server/`) with a React front end (`app/`, `components/`), built with vinext exactly as the OSS OS apps are.

## Screens

- **Rooms**: every room type from every operator, filtered by operator, city, rent and availability. A room opens at the side with each length of stay, its dates, weekly and total rent, fees and cashback, and a **Book** button for each.
- **Bookings**: every booking requested, its status, and **Prepare with A3** once the booking workflow is connected.

## Where the data comes from

| Setting | What it is |
| :-- | :-- |
| `HALLS_A3_TOKEN` (secret) | An A3 service-account key with access to the project and dataset |
| `HALLS_A3_PROJECT` | `org/project` in A3, today `ubio/student-accommodation-iq` |
| `HALLS_A3_DATASET` | The dataset of room stock. Empty shows the fictional sample |
| `HALLS_A3_BOOKING_WORKFLOW` | The workflow that prepares a booking. Empty leaves bookings queued |

Rooms are read from `GET https://api.athree.dev/{project}/datasets/{dataset}/items`, page by page, and kept for five minutes. Each item's `details` is one room page's rows in the A3 `RoomStockOption` shape (`{ stock: [...] }`).

A booking is prepared with `POST https://api.athree.dev/{project}/{workflow}?site={site}`, where the site is the operator's host with dots as dashes (`unitestudents-com`). The call waits for the run (up to five minutes) and its output is kept on the booking. The input always carries `stopBeforeSubmit: true`.

## Rules that must hold

- Halls never submits or pays for a booking. A3 fills the operator's form and stops; a person finishes it with the student.
- The A3 key stays on the server. `/api/me` says which connections exist, never their values, and A3's host is fixed in `server/a3.ts`.
- A booking copies the room as offered when it was requested, so a later price change never rewrites it.
- A booking moves between statuses only with a version check, so two people cannot prepare it twice.
- Only the person who requested a booking, or an administrator, can cancel it; nobody can cancel one A3 is working on.

## Running and checking

See the [repository README](../../README.md). Tests run the real migrations in `node:sqlite` (`tests/fixture.ts`) and every A3 call through `fakeFetch`; no test reaches A3.

## Deploying

Production is Worker `ubio-halls`, D1 `ubio-halls`, origin `https://halls.ubio.dev`, in UBIO's Automation Cloud Cloudflare account (the same account and `ubio.dev` zone as the OSS OS apps). The account is not in the config, so give it on the command line:

```sh
CLOUDFLARE_ACCOUNT_ID=<Automation Cloud account id> npm run deploy
```

That builds, applies remote migrations and deploys. Secrets are set once with `wrangler secret put`: `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` (a Google OAuth web client whose redirect URI is `https://halls.ubio.dev/auth/callback`), `HALLS_A3_TOKEN`, and `HALLS_ADMINS` (comma-separated addresses that may cancel anybody's booking). Until the Google client is set, the site shows its sign-in page with Google sign-in unavailable.

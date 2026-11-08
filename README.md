# StudyFlow

A responsive student planner with daily study blocks, a weekly view, a focus timer, practice-question demos, subject grades, and optional accounts.

Live app: https://studyflow.apencilgod181.workers.dev

## Run and check

Node.js 24 or later is recommended for the built-in SQLite test adapter.

```sh
npm start
npm run check
npm test
npm run build
```

`npm start` serves the front end at http://127.0.0.1:5173 without dependencies. Guest assignments and grades work locally. The local server does not provide the account API. To run the backend locally with Wrangler installed, run `wrangler d1 execute studyflow-accounts --local --file=schema.sql`, then `wrangler dev`. HTTPS is required for secure production session cookies.

## Features

- Daily time budget allocates up to 40-minute blocks ordered by due date and priority. Checking a task completes the whole assignment.
- Assignments and tests with time estimates, priorities, due dates, completion tracking, and a weekly view.
- Optional 25-minute focus timer with pause, resume, finish, and refresh recovery. Timers stay on the device.
- Practice-question prototype creates sentence-based recall prompts locally. No AI service is connected, and notes remain in memory.
- Subject grades with earned/possible points, assessment dates, editable results, weights, history, and weighted percentage averages. These are personal estimates, not official school grades.
- Email/password sign-up and login; Google Identity Services sign-up/login; session logout and permanent account deletion.
- Signed-in assignments, grades, completion progress, and daily budget sync to Cloudflare D1. Guest records stay separate until explicitly imported from the account page.
- Autosave with 30-second background refresh and refresh on tab focus/reconnection. Offline changes are cached per account. Optimistic revisions stop stale devices from overwriting newer plans. Conflicts require an explicit choice in My account, including after a refresh.

## Account security and recovery

Passwords are salted and hashed using Web Crypto PBKDF2-SHA-512 (100,000 iterations, compatible with Workers' per-call iteration ceiling). Passwords must contain 12–128 characters. Session tokens are random, stored hashed in D1, expire after 30 days, and use Secure, HttpOnly, SameSite cookies. Writes check the request origin; account-bound requests also check the expected account ID. Authentication attempts have short-lived rate limits keyed by hashes of IP/email, without request logging.

No email delivery service is connected. Email ownership is not verified for password accounts. Sign-up displays a private recovery code once; save it to reset the password. Reset rotates the recovery code and revokes old sessions. Google accounts use Google's verified identity; existing password accounts are not silently linked by matching email.

Google JWT signatures are verified against Google's public keys, with checks for issuer, audience, expiry, and a same-browser nonce. The public Google client ID is in `wrangler.jsonc`. Its authorized JavaScript origins include the production Cloudflare origin. No Google client secret is used or stored.

Signed-in account names, emails, assignments, grades, and planning settings are stored in D1. They are isolated by authenticated user ID. Notes are never uploaded. Deleting the account removes its cloud plan and sessions. Logging out returns to the separate guest workspace.

## Deploy

`node build-worker.mjs` packages the frontend and `backend.mjs` into `cloudflare/worker.mjs`. Edit source files, then rebuild; do not edit the generated Worker directly.

`wrangler.jsonc` declares the existing D1 database and public Google client ID. With Wrangler installed and signed into the intended account:

```sh
wrangler d1 execute studyflow-accounts --remote --file=schema.sql
wrangler deploy
```

The schema is idempotent. GitHub updates do not automatically deploy. Account functionality lives on the Cloudflare origin. The separate private Sites publication is a static preview and directs account actions to the Cloudflare app.

## Tests

`npm test` covers planner behavior, per-account browser caching, guest separation, grade averages, cross-device synchronization, conflict persistence across reloads, API user isolation, password hashing, recovery, session revocation, Google JWT checks, request validation, account deletion, and CSRF protection.

`node live-check.mjs` is an explicit production smoke test. It creates a uniquely named synthetic account, verifies persistence after login in a fresh session, checks conflicts and logout, then deletes its account and cloud data in a `finally` block. It does not touch real accounts.

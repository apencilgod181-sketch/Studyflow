# StudyFlow

A calm, responsive study planner built with semantic HTML, CSS, and vanilla JavaScript. No installation, dependencies, accounts, analytics, external fonts, or APIs are required.

## Run

From this directory, run `npm start` and open http://127.0.0.1:5173. Run `npm run check` for the JavaScript syntax check. You can also open `dist/index.html` directly; a local server gives browser storage a consistent origin.

## Features

- Responsive dashboard with example assignments, completion controls, and progress.
- Daily time budget allocates up to 40-minute blocks by due date and then priority. Longer tasks retain their full estimate; completing a checkbox completes the entire assignment.
- Add assignments and tests with subject, due date, time estimate, and priority. Assignments and available time persist in localStorage.
- Monday–Sunday weekly view with previous/next week navigation and carry-forward assignments.
- Optional 25-minute timer with pause, resume, finish, and refresh recovery using wall-clock timestamps.
- Practice prototype creates local sentence-based cloze questions. The interface explicitly states that no AI is connected. Notes remain in memory only. The question-generation handler is the future AI integration point; no requests are currently made.

Data belongs to the browser origin and device. Clearing browser data removes the plan; private browsing or blocked storage may limit persistence. Stored data is validated and rendered as escaped text. Storage failures are surfaced in the interface.

## Validation

Run `node check.mjs` to check assignment creation, completion, local persistence, planning budgets, timer controls, practice prompts, and HTML escaping.

## Cloudflare deployment

Live site: https://studyflow.apencilgod181.workers.dev

`node build-worker.mjs` packages the three static files into `cloudflare/worker.mjs`. The checked-in `wrangler.jsonc` configures the Worker. With Wrangler installed and signed into the intended Cloudflare account, run `wrangler deploy` to rebuild and publish. Deployment is manual; GitHub changes do not automatically deploy. No secrets or personal student data are included in this repository.

# Plains → Peaks — 15-day trip site

Vite + React + TypeScript site for a 15-day Pune → Braj → Delhi → Garhwal → Kumaon journey. Page sections live in `src/guide/`, shared pieces in `src/components/`.

## Run locally / share on your network

```bash
npm install
npm run dev -- --host    # http://localhost:5173 + a Network: link for colleagues
npm run build && npm run preview -- --host   # production build
```

Colleagues on the same network open the printed `Network:` link (allow Node through your firewall if prompted). `npm run preview` serves the production build's static files; Cloudflare-specific behaviour (headers, SPA fallback) is checked with `npm run deploy:check` and in PR previews.

## Photos

`python tools/fetch_photos.py` downloads freely licensed photos from Wikimedia Commons into `public/assets/img/`
and regenerates `src/data/photos.js` (captions + attribution shown in the footer). Edit the `WANTED` list to change them;
a query of the form `File:Exact name.jpg` pins a specific Commons file.

## Hosting

| Where                                                                                                 | What                               | Source             |
| ----------------------------------------------------------------------------------------------------- | ---------------------------------- | ------------------ |
| **Cloudflare** — https://plains-to-peaks.vipulsingh161.workers.dev (Workers static assets, free plan) | The React app                      | `main`             |
| **Vercel** — https://plains-to-peaks.vercel.app/                                                      | The original HTML/JS site (frozen) | `feature/starting` |

Do not deploy `main` to Vercel; `vercel.json` is kept only for the legacy site.

## Deploy to Cloudflare

Configuration lives in `cloudflare.config.ts` (read by the [`cf` CLI](https://developers.cloudflare.com/cf/), beta) and
security headers in `public/_headers`. Builds are written to `.cloudflare/output/`.

- **Check:** `npm run deploy:check` builds and validates the deploy without uploading anything.
- **Deploy from your machine:** `npx cf auth login` once, then `npm run deploy`.
- **CI** (`.github/workflows/cloudflare.yml`): every pull request is type-checked, linted, built and validated, and PRs from
  this repo get a preview URL (see the job summary). Every push to `main` deploys to production. Needs the repository
  secrets `CLOUDFLARE_API_TOKEN` (template "Edit Cloudflare Workers") and `CLOUDFLARE_ACCOUNT_ID`.

Never run `cf init` here — `cloudflare.config.ts` already exists, and auto-configuration would rewrite project files.

## Install & offline (PWA)

The site is an installable PWA (`vite-plugin-pwa`, settings in `pwa.config.ts`). The service worker is only generated in
production builds, so test it with `npm run build && npm run preview`, not `npm run dev`. Only the app shell is precached;
photos seen online are cached as you browse, and the **Going off-grid?** tile (Plan section) saves all of them (~28 MB) at once.

Icons are generated from `public/assets/favicon.svg` with `npm run icons` (config: `pwa-assets.config.ts`) and committed.

When a new version is deployed, open pages show a **"A new version of the guide is available — Reload / Later"** toast (checked hourly and whenever the tab becomes visible). First-time visitors see a short **"Ready to work offline."** instead.

## URLs

Each section has its own URL: `/route`, `/days`, `/places` (or `/places/<place>`, e.g. `/places/auli`), `/food`, `/plan`. The address bar
follows your scrolling, links can be shared, and old `/#plan`-style links redirect. `/board/…` is reserved for the trip board (Epic 3).
Routing lives in `src/routing/` (no router library).

## Editing content

- `src/data/itinerary.js` — the 15 days
- `src/data/places.js` — destination guides (culture, food, geography, shopping, activities, tips)
- `src/data/planning.js` — seasons, budget, packing list, latest alerts, sources

# Plains → Peaks — 15-day trip site

Vite + React + TypeScript site (migration in progress: the legacy ES modules in js/ still render the page) for a 15-day Pune → Braj → Delhi → Garhwal → Kumaon journey.

## Run locally / share on your network

```bash
npm install
npm run dev -- --host    # http://localhost:5173 + a Network: link for colleagues
npm run build && npm run preview -- --host   # production build
```

Colleagues on the same network open the printed `Network:` link (allow Node through your firewall if prompted).

## Photos

`python tools/fetch_photos.py` downloads freely licensed photos from Wikimedia Commons into `public/assets/img/`
and regenerates `src/data/photos.js` (captions + attribution shown in the footer). Edit the `WANTED` list to change them;
a query of the form `File:Exact name.jpg` pins a specific Commons file.

## Deploy to Vercel

- **CLI:** `npm i -g vercel` then run `vercel` in this folder (settings come from vercel.json: Vite, `npm run build`, output `dist`). `vercel --prod` to publish.
- **Git:** push this folder to GitHub, then "Add New Project" on vercel.com and import the repo — no settings needed.

## Editing content

- `src/data/itinerary.js` — the 15 days
- `src/data/places.js` — destination guides (culture, food, geography, shopping, activities, tips)
- `src/data/planning.js` — seasons, budget, packing list, latest alerts, sources

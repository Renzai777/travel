# Plains → Peaks — 15-day trip site

Static site (HTML + CSS + ES modules, no build step) for a 15-day Pune → Braj → Delhi → Garhwal → Kumaon journey.

## Run locally / share on your network
```bash
python tools/serve.py          # port 8765; prints the http://<your-ip>:8765 link to share
python tools/serve.py 9000     # or pick another port
```
Colleagues on the same network open the printed `Network:` link. If they can't connect, allow Python
through Windows Defender Firewall (Private/Domain network) when prompted.
(ES modules need a server; opening index.html directly via file:// will not work.)

## Photos
`python tools/fetch_photos.py` downloads freely licensed photos from Wikimedia Commons into `assets/img/`
and regenerates `js/photos.js` (captions + attribution shown in the footer). Edit the `WANTED` list to change them;
a query of the form `File:Exact name.jpg` pins a specific Commons file.

## Deploy to Vercel
- **CLI:** `npm i -g vercel` then run `vercel` in this folder (Framework preset: *Other*, no build command, output dir `.`). `vercel --prod` to publish.
- **Git:** push this folder to GitHub, then "Add New Project" on vercel.com and import the repo — no settings needed.

## Editing content
- `js/itinerary.js` — the 15 days
- `js/places.js` — destination guides (culture, food, geography, shopping, activities, tips)
- `js/planning.js` — seasons, budget, packing list, latest alerts, sources

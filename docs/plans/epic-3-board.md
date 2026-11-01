# Epic 3 — Trip board (single user, offline-first)

**Final plan.** Drafted by Claude; reviewed twice by codex (risk review, then a decision round informed by web research). One branch and one PR per
story; agy (Gemini) implements from per-story briefs, and Claude verifies. Real-time collaboration (Durable Objects, presence, chat) is **Epic 4**:
Epic 3 is built so that Epic 4 only adds a sync provider to the same Y.Doc.

## Technology decisions (researched 2026-11-02)

| Choice                    | Decision                                                                                | Why                                                                                                                                                                                                                                                                                                    |
| ------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Canvas                    | **Excalidraw 0.18.1** (current stable; Oct 2026 npm builds are `0.18.0-<sha>` canaries) | MIT and free. tldraw SDK 4 needs a production license key, and its free hobby tier shows a watermark                                                                                                                                                                                                   |
| CRDT                      | **Yjs 13.6**                                                                            | Most mature ecosystem; Cloudflare's **y-partyserver 2.2.0** (hibernation-safe, `onLoad`/`onSave`) gives Epic 4 a direct path. Loro is faster in its own benchmarks, but nothing here is CPU-bound and it lacks a Workers server                                                                        |
| Excalidraw ↔ Yjs          | **Our own binding** around Excalidraw's **`reconcileElements`**                         | `y-excalidraw` is stale (peer excalidraw ^0.17, last release 2024-12). The merge rule is verified from `packages/excalidraw/data/reconcile.ts`: local wins while editing/resizing/creating, else higher `version`, tie → lower `versionNonce`; then ordered by fractional index + `syncInvalidIndices` |
| Local storage             | **y-indexeddb 9**                                                                       | Offline persistence plus same-device cross-tab updates                                                                                                                                                                                                                                                 |
| Routing                   | **Our History-API router** (`src/routing/`), extended                                   | One lazy route family; a router library adds little. Revisit in Epic 4 if board screens nest                                                                                                                                                                                                           |
| Sync engines (not chosen) | Zero (no offline writes), Electric (Postgres read path), Jazz/LiveStore (own backends)  | Yjs + Cloudflare fits offline-first + free hosting best                                                                                                                                                                                                                                                |
| Server data               | **No D1 in Epic 3**                                                                     | Nothing in Epic 3 reads server-side board metadata; title and recents stay on the device. D1 arrives with sharing in Epic 4                                                                                                                                                                            |

## Architecture

```
/board          → BoardsHome: "New board" + recent boards on this device     ┐ lazy "board" chunk(s): precached
/board/<id>     → BoardPage: Excalidraw + Y.Doc (y-indexeddb), offline-first  ┘ (so they match the shell after a deploy)
/api/*          → Worker (from E3-S4): R2 image uploads; rate-limited
everything else → static assets / SPA fallback (guide unchanged)
```

- **Board id** = `nanoid(12)` made in the browser (~71 bits): boards can be created offline. The id is a capability; there's never a listing endpoint.
- **Routing:** `routes.ts` gains `{ kind: "boards" }` (`/board`) and `{ kind: "board"; id }` (`/board/<12-char id>`; anything else under `/board/` →
  `/board`). `App` chooses Guide vs `React.lazy(BoardApp)` via a tiny location store (`useSyncExternalStore` over `popstate` + `navigate()`).
  The guide's routing hook runs only on guide routes.

## Binding algorithm (codex, round 2; to implement in E3-S1)

1. **Doc:** `Y.Doc` with `Y.Map("elements")` (element id → the **whole element as plain JSON**, keeping `version`, `versionNonce`, `isDeleted`, `index`),
   `Y.Map("meta")` (title) and `Y.Map("files")` (file id → `BinaryFileData`). A unique `LOCAL` transaction origin. `IndexeddbPersistence("board:<id>")`;
   show the scene only after `synced`.
2. **Local → doc:** in `onChange(elements, appState, files)`, diff against the last written snapshot and queue **every** changed element (edits, deletions,
   reorders, and changes whose `version` didn't grow), new files and title changes. Write in `doc.transact(…, LOCAL)`, batched about every 100 ms.
   **Flush** pending writes on `pagehide`, on `visibilitychange` → hidden, and on unmount. On unmount, remove listeners and destroy the provider and doc
   (StrictMode-safe).
3. **Doc → local:** observe the maps (`observeDeep`), **ignore origin `LOCAL`**, build the remote element array from the map values (never rely on
   Y.Map order), `reconcileElements(localScene, remote, appState)`, then `updateScene({ elements, captureUpdate: CaptureUpdateAction.NEVER })`.
   Set a flag while applying, so the resulting `onChange` doesn't write back (no echo).
4. **Undo/redo:** Excalidraw's own history. Undo/redo changes the scene, so they flow to Yjs through `onChange` like any edit. Remote updates use
   `CaptureUpdateAction.NEVER`, so they never enter local undo history.
5. **Tombstones:** deletions stay as `isDeleted: true`. No garbage collection in Epic 3 (it could resurrect elements without per-replica state).
6. **Files:** `BinaryFileData` lives in the `files` map (so in IndexedDB), restored with the elements, and works offline. S4 adds the R2 upload and
   stores the server reference next to the local copy.

- **Verify before coding** in the installed package and its `.d.ts`: `reconcileElements`, `syncInvalidIndices`, `CaptureUpdateAction`,
  `restoreElements`, `getSceneVersion`, `convertToExcalidrawElements`, `BinaryFileData`, and the `updateScene` option name.

## PWA (codex, round 2)

- **Precache the board's hashed JS/CSS chunks** (raise `maximumFileSizeToCacheInBytes` after measuring them), so a new app version always has the chunks
  its shell references, even offline right after a deploy. Precache size is measured and reported in the S1 PR.
- **Fonts:** copy `node_modules/@excalidraw/excalidraw/dist/prod/fonts` → `public/assets/excalidraw/fonts/` (at build), and set
  `window.EXCALIDRAW_ASSET_PATH = "/assets/excalidraw/"` (verify the actual request URLs in the browser). **Exclude them from precache**
  (many subsets, incl. CJK) and add a **CacheFirst** runtime route for `/assets/excalidraw/fonts/` (bounded, 1 year). Fonts a board used once are then available offline.
- `navigateFallbackDenylist: [/^\/api\//]` (once the Worker exists).

## CSP changes (verified in the browser per story)

- S1: `font-src 'self' https://fonts.gstatic.com`; `img-src 'self' data: blob:`; `worker-src 'self' blob:` **only if** Excalidraw actually needs it.
- S3: `frame-src https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://www.google.com` (exact hosts), added to the existing policy.

## Stories

### E3-S1 Saved board — `feat/E3-S1-saved-board`

Routes + location store, `BoardsHome` (new board + recents from localStorage), lazy `BoardPage` (Excalidraw + its CSS inside the lazy module;
loading state), the binding above with y-indexeddb, title (in `meta` + recents), self-hosted fonts, CSP, PWA precache/runtime rules.
"Back to guide" link. No guide nav link yet (S2).
Acceptance:

- [ ] Guide **entry bundle unchanged** (board code only in lazy chunks); precache size reported
- [ ] Draw → reload → identical scene: elements, **order**, deletions, **images (files)**, title. An edit made just before closing the tab (inside the 100 ms window) survives
- [ ] Undo/redo work and persist; **two tabs on one device converge**, including concurrent edits to the same element, a reorder, and a delete
- [ ] Offline: create a board, draw, reload offline; **offline right after a deploy** (new version waiting) still opens an existing board
- [ ] Corrupt/unavailable IndexedDB → visible error with a way out (no endless blank canvas)
- [ ] 0 CSP errors; fonts self-hosted (no requests to CDNs); StrictMode: no duplicate providers or listeners
- [ ] Perf: 1,000 elements, drag a selection of 50 in Chrome desktop: no frame over 50 ms in the trace (measured)

### E3-S2 Board entry points — `feat/E3-S2-board-entry`

"Trip board" link in the guide nav and on the Plan section; polished `/board` home (recent boards with title and last opened, rename, remove
from this device); empty-state copy.

### E3-S3 Videos and maps — `feat/E3-S3-embeds`

`validateEmbeddable` allowlist (YouTube incl. nocookie, Vimeo, Google Maps) + CSP `frame-src`. Offline → `renderEmbeddable` placeholder.
Acceptance: YouTube link → playable; other hosts rejected; offline placeholder; 0 CSP errors.

### E3-S4 Links and images on the server — `feat/E3-S4-images-r2`

**Worker entry appears here:** `worker/index.ts`, `assets.runWorkerFirst: ["/api/*"]`, bindings `UPLOADS` (R2) and `API_LIMIT`
(`rateLimit`, keyed by client IP; separate limits for uploads and reads).

- `POST /api/boards/:id/files`: ≤ 5 MB enforced **before buffering**; PNG/JPEG/WebP/GIF verified by magic bytes; key `boards/<id>/<sha256>`; idempotent
- `GET /api/boards/:id/files/:sha256`: key built from the validated path parts only (no path escape); `immutable` cache
- Client: upload queue (retries with bounded backoff; offline adds upload when back online); the local copy stays for offline use
- Element links open in a new tab (`noopener noreferrer`)
  Acceptance: API negative cases (bad type, oversize, bad id or hash, unknown route/method, 429); the image survives reload offline and uploads once online.

### E3-S5 Start from the itinerary — `feat/E3-S5-itinerary-seed`

On an empty board: "Start from the 15-day itinerary" inserts 15 day cards (`convertToExcalidrawElements`), colour-coded by region, in a 5×3 grid,
then zooms to fit. One undo step.

## Free-tier budget

Workers 100k requests/day (static assets are free and unlimited); R2 10 GB, 1M class-A ops/month, free egress; no D1 or Durable Objects until Epic 4.

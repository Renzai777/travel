# Epic 3 (v4): folders become free-flow canvas boards

> Replaces the remaining stories (S3–S10) of [epic-3-workspace.md](epic-3-workspace.md). S1 (workspace) and S2 (folders) are done and stay as they are.
> Planned with codex on 2026-11-02; every Excalidraw API below was checked against the published `@excalidraw/excalidraw@0.18.1` package types/source.

## Why the change

The user pictures the workspace "like Miro: everything lives on a free-flow canvas". Trip planning is spatial: a video next to the restaurant link,
an arrow to the day it belongs to, a sticky note saying "book this". So the canvas becomes the main surface, and folders become the boards.

## Decisions

| Topic               | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Why                                                                                                                                                                                                                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Board granularity   | **One canvas per folder.** Subfolders are sub-boards; the left sidebar stays as navigation. **All files** stays a list/overview (later: search results), not a board.                                                                                                                                                                                                                                                                                                    | Small, fast scenes (Excalidraw slows with thousands of elements; every live video is an iframe). Each board syncs as its own Yjs doc, so one big board never bloats the rest. Matches how people plan: per day, per place, per theme.                                               |
| Engine              | **Excalidraw 0.18.1** (MIT), lazy-loaded                                                                                                                                                                                                                                                                                                                                                                                                                                 | tldraw needs a production licence or shows a watermark. Excalidraw has drawing, arrows, frames, undo, zoom, touch, dark mode.                                                                                                                                                       |
| Cards (video, link) | Excalidraw **embeddable elements** drawn by our own React via **`renderEmbeddable(element, appState)`**                                                                                                                                                                                                                                                                                                                                                                  | Verified in 0.18.1: Excalidraw positions/zooms/rotates the container itself, so our cards move, resize and select exactly like native shapes. It falls back to an `<iframe src=link>` only when we return `null`, so we always return a card (never an iframe of an arbitrary URL). |
| Sticky notes        | Native rectangle with a bound text label (`convertToExcalidrawElements`), 4 colours                                                                                                                                                                                                                                                                                                                                                                                      | Native text editing (double-click), resize, undo, all for free.                                                                                                                                                                                                                     |
| Storage             | `board:<wsId>:<folderId>` Yjs doc per folder (the existing `boardDocName`), y-indexeddb + the existing BroadcastChannel tab sync                                                                                                                                                                                                                                                                                                                                         | Same doc names Epic 4 will attach to y-partyserver Durable Objects, no rewrite.                                                                                                                                                                                                     |
| Merge rule          | **Element-level last-writer-wins.** `Y.Map<elementId, element>`: edits to _different_ elements always merge; two people changing the _same_ element at the same moment → one whole version wins, picked deterministically by Yjs, identically on every replica (the same trade-off as Excalidraw's own collaboration and Miro). Remote values are applied through **`reconcileElements`** with **`updateScene({ elements, captureUpdate: CaptureUpdateAction.NEVER })`** | Converges everywhere, simple, and remote edits never enter local undo. Finer-grained (per-property) merging isn't worth the complexity for a trip board.                                                                                                                            |

Verified exports in 0.18.1: `reconcileElements`, `CaptureUpdateAction`, `convertToExcalidrawElements`, `viewportCoordsToSceneCoords`,
`sceneCoordsToViewportCoords`; props `onPaste(data, event) → boolean` (return `false` = we handled it), `validateEmbeddable`, `renderEmbeddable`,
`UIOptions`, `renderTopRightUI`, `onLinkOpen`, `onPointerUpdate`/`isCollaborating` (Epic 4 cursors); API `updateScene`, `scrollToContent`,
`getAppState`, `addFiles`, `onScrollChange`. Embeddables are only interactive after the user clicks into them ("click to interact" hint, built in),
which is what we want: dragging a card never starts a video by accident.

## UX spec

### Layout

- Desktop: the folder sidebar on the left (collapsible to icons), the **canvas fills the rest of the screen height**. Breadcrumb + folder name sit in
  a slim bar above the canvas. "People" moves into a compact avatar row in that bar.
- **Focus mode** (button + `F`): hides the sidebar and bars, canvas full screen; `Esc` exits.
- No permanent right panel. Card details (title, URL, open link) appear in a small popover on the selected card.
- All files: list of folders and (later) every item, with search and filters.

### Empty board

"Start planning _Food_" with three big actions: **Add a note**, **Paste a link** (focuses the canvas and explains ⌘/Ctrl+V), **Start drawing**.
Hint: "Paste a YouTube or Vimeo link to add a video you can play right here."

### Toolbar

- Keep from Excalidraw: select, hand, pen (free draw), text, rectangle, ellipse, arrow, line, frame, eraser, undo/redo, zoom ±, zoom to fit.
- Hide: open/save/export/clear canvas, the library, Excalidraw's collaboration and welcome screens, image tool (until S8).
- Add ours (top-right, `renderTopRightUI`): **Note** (with colour picker), **Link/Video** (opens a small "paste a URL" field), **Fit**, **Focus**.

### Paste / drop

| Input                 | Result                                                                                                                                                                                                                                                                                  |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| YouTube / Vimeo URL   | **Video card** (16:9): provider badge, title (URL until the Worker story adds real titles), big ▶. Click into it → ▶ → privacy player (`youtube-nocookie.com` / Vimeo `dnt=1`) plays inside the card. Offline: "Needs a connection to play". Nothing loads from YouTube/Vimeo before ▶. |
| Any other http(s) URL | **Link card**: domain, title (= the URL until edited; editable in the card popover), "Open ↗" (`target="_blank"`, `rel="noopener noreferrer"`). No server fetch, no remote favicon.                                                                                                     |
| Text containing URLs  | Each URL becomes its own card (up to 10, laid out in a row); if there is also other text, it becomes a note next to them.                                                                                                                                                               |
| Plain text            | Short → sticky note; long/multi-line → text block of readable width.                                                                                                                                                                                                                    |
| Image                 | Toast "Images arrive in a later update" (S8), never silently dropped.                                                                                                                                                                                                                   |
| Anything else         | Excalidraw's normal behaviour.                                                                                                                                                                                                                                                          |

New cards appear at the viewport centre (or the pointer), are selected, and repeated pastes are offset so they don't stack.

### Cards, notes, keyboard

- Select = click; move = drag; resize = handles (video keeps 16:9, min sizes); delete = `Del`; duplicate = `Ctrl+D`; undo/redo; arrows to nudge.
- Sticky notes: yellow, pink, green, blue (readable in light and dark), 16 px minimum text, double-click to edit.
- `N` = new note at centre, `L` = paste-link field, `Shift+1` = zoom to fit (Excalidraw's), `F` = focus mode. Our shortcuts are ignored while any
  text is being edited (Excalidraw text editor, inputs). Focus mode always shows a small floating "Exit focus" button; `Esc` exits only when nothing is
  being edited or selected.

### Phone

- Default to a **list view** of the board (reading order: sorted by `round(y / 240)` rows, then `x`, then element id, so the order is stable) with a
  **Canvas** toggle for spatial editing
  (full screen, sidebar hidden). Pinch zoom / two-finger pan are Excalidraw's; checked on Android Chrome and iOS Safari.

### Offline

Boards, notes and cards load from IndexedDB and stay editable offline; tabs sync. Videos show the offline message. Epic 4 adds live sync with friends.

## Data model

- `board:<wsId>:<folderId>` → `elements: Y.Map<elementId, ExcalidrawElement JSON>` (tombstones kept: `isDeleted: true`), later `files: Y.Map`
  (metadata only; bytes go to R2 in S8, never into Yjs).
- Card elements carry `customData: { kind: "video" | "link", provider?, videoId?, url, title }`; the element's `link` is the canonical URL.
- Local edits: write an element when its `version` differs from the stored one (Excalidraw bumps `version` on every change, including `isDeleted`;
  our own code changes `customData`/`link` only through Excalidraw's element-update helpers so the version bumps too). Batched ~100 ms, flushed on
  `pagehide`/hidden/unmount, with a transaction origin so our own Yjs observer ignores it (no feedback loop).
- Applying remote changes: the Yjs value is the truth for that element; a tombstone (`isDeleted: true`) is just another version, so a stale replica
  can't resurrect a deleted element once it has seen the newer version.
- Search index (S6): cards and notes are indexed from the board docs into the workspace; no second editable copy of card data.
- Tags (S9): stored in the workspace doc's `tags` map; assigned from the card popover; filters in All files.
- Limits: count non-deleted elements (labels included). At 500 a quiet banner suggests splitting into subfolders; at 1,000 new elements are refused
  with a toast ("This board is full, delete something or use a subfolder"). Deleting frees space immediately. Revisit after measuring.
- Deleting a folder (S9) trashes its board too.

## Security

- URLs parsed with `URL`: only `https:`/`http:` (http shown as such), no credentials, no `javascript:`/`data:`/`file:`. The same check runs on every
  path: paste, the Link/Video field, cards loaded from a stored or synced board, and again on click before opening. Text rendered as React text,
  never as HTML.
- Player iframe (only after ▶, never restored automatically after a reload): `allow="autoplay; encrypted-media; picture-in-picture; fullscreen"`,
  `referrerpolicy="strict-origin-when-cross-origin"` (YouTube refuses to play without a referrer), `sandbox="allow-scripts allow-same-origin
allow-presentation allow-popups"`.
- Video allowlist: `youtube.com`, `www.youtube.com`, `m.youtube.com`, `youtu.be` → `https://www.youtube-nocookie.com/embed/<id>`;
  `vimeo.com`, `player.vimeo.com` → `https://player.vimeo.com/video/<id>?dnt=1`. IDs validated by regex.
- `validateEmbeddable` accepts only links we turned into cards; `renderEmbeddable` always returns our card, so no arbitrary URL is ever iframed.
- CSP (`public/_headers`, Cloudflare): add `frame-src https://www.youtube-nocookie.com https://player.vimeo.com`; `font-src 'self'` for the
  self-hosted Excalidraw fonts; thumbnails (`img-src https://i.ytimg.com https://i.vimeocdn.com`) only when the Worker story enables them.
- No server-side fetching of arbitrary URLs, ever. oEmbed (titles/thumbnails) is YouTube/Vimeo only, in the Worker story.

## Performance / PWA

- Excalidraw is loaded only on board routes (`React.lazy`); the guide and workspace list never download it. Budget measured in S3 and written in the PR.
- Fonts self-hosted under `/excalidraw-assets/` (`window.EXCALIDRAW_ASSET_PATH`); Latin fonts precached, the large CJK font (Xiaolai) runtime-cached
  only. Board chunks precached so boards open offline.

## Stories (one branch + PR each, in order)

| ID      | Branch                        | Story                                | Highlights / acceptance                                                                                                                                                                                                                                                                            | Worker?        |
| ------- | ----------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| **S3**  | `feat/E3-S3-canvas`           | **Every folder is a canvas**         | Lazy Excalidraw board per folder, Yjs binding (merge rule above, no echo, remote edits NEVER-captured) with convergence unit tests, persists offline + syncs tabs, full-height board layout, trimmed toolbar, theme follows the site, fonts self-hosted, CSP `font-src 'self'`, simple empty state | no             |
| **S4**  | `feat/E3-S4-notes-focus`      | **Sticky notes and a roomier board** | Note tool (4 colours, `N`), "Start planning" empty state with actions, collapsible sidebar, focus mode with exit button, shortcuts, element limits UX                                                                                                                                              | no             |
| **S5**  | `feat/E3-S5-video-link-cards` | **Paste videos and links**           | `onPaste` routing, URL safety on every path, video card with click-to-play privacy player, link card + popover, "Link/Video" button, offline placeholder, CSP `frame-src`                                                                                                                          | no             |
| **S6**  | `feat/E3-S6-search-list`      | **Find anything**                    | All files = search (MiniSearch) over notes/cards/folders, phone list view per board, "show on canvas" focuses the card                                                                                                                                                                             | no             |
| **S7**  | `feat/E3-S7-worker`           | **Private trip key + real titles**   | Worker foundation: D1 registry (hashed key, rotate), auth, rate limits, security headers; allowlisted YouTube/Vimeo oEmbed → real titles + thumbnails on video cards                                                                                                                               | **yes (D1)**   |
| **S8**  | `feat/E3-S8-images`           | **Images and PDFs**                  | Paste/drop images onto the canvas, PDFs as cards; R2 (≤10 MB, 500 MB quota, no SVG, magic-byte check), offline queue                                                                                                                                                                               | **yes (R2)**   |
| **S9**  | `feat/E3-S9-organise`         | **Tags, trash, favourites, recent**  | Tags + filters, trash/restore folders (with their boards), purge, favourites, recent, activity                                                                                                                                                                                                     | R2 delete only |
| **S10** | `feat/E3-S10-comments`        | **Comments and reactions**           | Threads on cards/elements, reactions, offline                                                                                                                                                                                                                                                      | no             |
| **S11** | `feat/E3-S11-itinerary`       | **Start from the itinerary**         | One folder per day with a starter board (notes per stop) from `src/data/itinerary.js`                                                                                                                                                                                                              | no             |

Then **Epic 4**: live sync with friends (y-partyserver Durable Objects on the same doc names), live cursors and names (Excalidraw `collaborators`
from awareness), invites. The hero background video (R2, `docs/plans/background-video.md`) can follow S8, since R2 arrives there.

### S3 manual test (summary)

1. Open a workspace, create folders _Food_ and _Day 1_; each opens its own empty board.
2. Draw shapes, an arrow, type text; switch folders and back: each board keeps its own content.
3. Reload, then reload offline (DevTools → Offline): everything is still there.
4. Second tab on the same board: edits appear in the other tab.
5. The dark mode toggle restyles the canvas.
6. The guide pages don't download the canvas (Network tab, no Excalidraw chunk on `/`).

## Risks

1. **Concurrent edits to one element** resolve as element-level last-writer-wins (by design, see Decisions). Unit-test that two replicas converge for
   concurrent move/resize/delete orders (as done for the folder tree) and that deleted elements never come back.
2. **Feedback loops** between Excalidraw `onChange` and Yjs observers: transaction origins + "only write when version changed".
3. **Bundle/PWA size:** lazy routes, measure, CJK font runtime-only.
4. **Phones:** list view by default; canvas is opt-in.
5. **renderEmbeddable stays internal-ish:** it is a public prop in 0.18.1 types; pin the version and cover the card rendering with a test.

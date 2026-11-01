# Epic 3 — Shared trip workspace (library + boards), offline-first

**Plan v3.** The user clarified the goal (2026-11-02): a **collaborative trip workspace** where people **create folders and subfolders** to
organise **everything** (boards, videos, links, notes, images, PDFs), **tag** it, **watch videos inside the site**, **search and filter**, **comment and react**,
see **favorites, recents and activity**, and **drag and drop / bulk-edit**. One shared workspace per trip group, via a secret link, no login.
Review history: v1 (board-only) reviewed twice by codex; v2 (workspace) reviewed by codex, which found 22 issues (2 critical), all addressed in v3 ("v3 changes" at the end).
One branch and one PR per story; agy (Gemini) implements, Claude verifies.

## Technology decisions (researched 2026-11-02)

| Need               | Choice                                                                                                                      | Why                                                                                                                                                                                                                                                   |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shared state       | **Yjs 13.6**: one **workspace Y.Doc** (tree, items, tags, comments, activity) + **one Y.Doc per board**                     | Offline-first now, live in Epic 4 via Cloudflare **y-partyserver 2.2.0** (same docs, no rewrite). Boards are kept separate because Excalidraw scenes are large                                                                                        |
| Local storage      | **y-indexeddb 9**                                                                                                           | Offline + cross-tab updates on one device                                                                                                                                                                                                             |
| Canvas             | **Excalidraw 0.18.1** (MIT) + our binding around **`reconcileElements`**                                                    | See "Boards"; tldraw needs a production license / watermark                                                                                                                                                                                           |
| UI + drag and drop | **React Aria Components 1.22** (Adobe)                                                                                      | Accessible **Tree with drag and drop** (keyboard, screen reader, touch; `onItemDrop` moves into folders), GridList multi-select, Menu, Dialog, ComboBox (tags), SearchField. One library instead of dnd-kit (docs archived Feb 2026) or Pragmatic DnD |
| Ordering           | **fractional-indexing 4.0** keys + id tie-break                                                                             | Siblings order merges cleanly; Yjs has no native move                                                                                                                                                                                                 |
| Search             | **MiniSearch 7.2** (~7 kB, fuzzy, prefix, field boosts)                                                                     | Local, offline, rebuilt incrementally from the doc                                                                                                                                                                                                    |
| Notes              | **Tiptap 3.32** + `@tiptap/extension-collaboration` (Y.XmlFragment)                                                         | MIT core, Yjs-native rich text that becomes collaborative in Epic 4 for free                                                                                                                                                                          |
| Video              | Own **facade** (thumbnail → click → iframe), YouTube via **youtube-nocookie**, Vimeo with `dnt=1`; in-site **player panel** | Fast, private, no autoplay requests; `react-lite-youtube-embed` 3.7 is the fallback if ours grows                                                                                                                                                     |
| Video metadata     | **Worker `/api/oembed`, allowlisted providers only** (YouTube, Vimeo)                                                       | YouTube oEmbed isn't CORS-enabled. **No arbitrary server-side fetching** (Workers can't pin DNS, so general link previews would be an SSRF risk): ordinary links show their domain + a user-entered title                                             |
| Routing            | Our History-API router (`src/routing/`) extended                                                                            | Still small. Revisit if Epic 4 adds deeper nesting                                                                                                                                                                                                    |
| Server data        | **D1: a tiny workspace registry** (id, key hash, created, rotated, bytes used) + **R2** for files                           | Needed to check/revoke the workspace key and enforce storage quotas. Content stays in Yjs docs (device now, Durable Objects in Epic 4)                                                                                                                |

## URLs and access

`/w/new` → create → `/w/<wsId>#key=<secret>` · `/w/<wsId>/f/<folderId>` · `/w/<wsId>/i/<itemId>` · `/w/<wsId>/b/<boardId>` ·
`/w/<wsId>/search?q=&tag=&type=` · `/w` (workspaces on this device). The guide stays at `/`; `/board…` redirects to `/w`.

- **`wsId` locates; the key authorizes.** `wsId` = `nanoid(12)`; **key** = 32 random bytes (base64url), made in the browser so workspaces can be created
  offline. The key travels **only in the URL fragment** (`#key=…`, never sent to servers or in `Referer`). On open it's saved on the device (per `wsId`)
  and removed from the address bar. "Share" builds the full link.
- The Worker stores **only `sha256(key)`** (D1) and requires `Authorization: Bearer <key>` on every workspace API call (and on Epic 4 sync). The workspace
  registers itself when first online (queued offline). **Rotate key** = new key, old hash replaced, old links stop working for server features (Epic 3:
  files; Epic 4: sync). Link holders have full edit rights **by design** (documented in the UI share dialog); view-only links are a later option.
- **Doc ids:** `ws:<wsId>` (structure), `note:<wsId>:<id>`, `board:<wsId>:<id>`, `comments:<wsId>`. Every doc belongs to exactly one workspace, and
  Epic 4 authorizes sync per doc with that workspace's key.

## Workspace data model

**`ws:<wsId>` (structure doc, kept small):**

- `nodes: Y.Map<id, Y.Map>`: folders and items, one nested **Y.Map per node** (concurrent edits to different fields merge). Fields: `type`
  (`folder|board|video|link|note|image|pdf`), `parentId` (folder id or `"root"`), `order` (fractional key), `title`, `tags: Y.Map<tagId, true>` (set semantics),
  `createdBy` (memberId), `createdAt`, `updatedBy`, `updatedAt`, `trashedAt?`, `purged?`, plus type data (`url`, `provider`, `videoId`, `thumbUrl`, `fileSha`,
  `mime`, `size`). The content of notes, boards and comments lives in **separate docs**, so this one stays small.
- `tags: Y.Map<tagId, Y.Map{ name, color }>` · `members: Y.Map<memberId, Y.Map{ name, color, joinedAt }>` (nested Y.Maps: a concurrent rename and recolour both survive).
- `activity: Y.Map<eventId, Y.Map{ at, who, verb, nodeId, detail? }>`: each device appends its own events and **trims only its own** (newest 200),
  so trimming never races. The feed = all events sorted by `(at, eventId)`. Wall-clock skew only affects display order, not correctness.
- **Identity without login:** a per-device `memberId` (nanoid) + name + colour (localStorage), registered in `members`. One device is one member, so a member's
  own edits never conflict across devices. Favorites and recents are per device (localStorage keyed by `wsId`). `createdBy` is self-reported (not security).
- **Budgets (measured per PR):** `ws:` doc ≤ 1 MB and ≤ 150 ms to load from IndexedDB at 2,000 nodes; the tree stays non-virtualized up to 2,000 nodes
  (a documented limit; virtualization is tested before raising it).

**`comments:<wsId>`:** `comments: Y.Map<commentId, Y.Map{ target, parentId?, author, text, createdAt, editedAt?, deleted? }>`; `target` = `node:<id>` or
`board:<boardId>:<elementId>`; `parentId` for replies. Only the author's device edits or deletes it (UI rule); deletes are tombstones (text cleared).
`reactions: Y.Map<"<target>|<emoji>|<memberId>", true>`: one key per (target, emoji, member). Set/delete is safe because a member is one device.

### Folder tree rules (CRDT-safe, computed)

- **Move** = set `parentId` + `order` in one transaction. `order` uses `generateKeyBetween(prev, next)`; equal keys are ordered by node id.
  The UI never offers a move into self or a descendant.
- **Cycle repair is computed, never written:** when building the view, any cycle (from concurrent moves) is broken by moving the node with the
  **lexicographically greatest id** in that cycle under a virtual **"Recovered"** folder. This depends only on ids, so every device shows the same tree
  regardless of clocks or arrival order. A later normal move by the user resolves it for real.
- **Orphans** (missing or purged parent) also appear under "Recovered".

### Delete protocol

- **Trash:** `trashedAt` set (node and its subtree hidden; restorable). **Purge** (empty the trash, or 30 days after trashing): `purged: true` stays as a
  tiny permanent tombstone; the device deletes the node's local board/note IndexedDB databases; the Worker deletes its R2 files (idempotent,
  authorized, queued while offline). **Stale offline edits** to a purged node are ignored by the view, because `purged` always wins.

## Boards (carried over from v1, codex-reviewed)

- A board item has `boardId` → its own `Y.Doc` "board:<boardId>" with `elements` (id → whole element JSON incl. `version`, `versionNonce`,
  `isDeleted`, `index`), `files` (`BinaryFileData`).
- **Binding:** local `onChange` → diff the last snapshot → write every changed element/file in `transact(…, LOCAL)`, batched ~100 ms, **flushed on
  pagehide, hidden visibility and unmount**. Remote → `observeDeep` (ignore `LOCAL`) → `reconcileElements(local, remote, appState)` → `updateScene({ …,
captureUpdate: CaptureUpdateAction.NEVER })` with an apply flag (no echo, remote never enters undo). Tombstones kept. Verify the exact 0.18.1 exports first.
- **Library ↔ board:** drag a library item onto the canvas → an embeddable (video) or link card element that keeps `customData.nodeId`, so clicking it
  opens the item. Embeds: `validateEmbeddable` allowlist (YouTube incl. nocookie, Vimeo, Google Maps) and an offline placeholder via `renderEmbeddable`.
- PWA: **precache the board chunks** (raise `maximumFileSizeToCacheInBytes`); **runtime CacheFirst** for self-hosted Excalidraw fonts in
  `/assets/excalidraw/fonts/` (`EXCALIDRAW_ASSET_PATH = "/assets/excalidraw/"`).

## Worker (foundation story E3-S3)

`worker/index.ts`; `assets.runWorkerFirst: ["/api/*"]`; bindings `DB` (D1), `UPLOADS` (R2), `API_LIMIT` (rate limit; **verify the binding works on the free
plan first**). Every response sets `X-Content-Type-Options: nosniff`; JSON errors; no CORS (same-origin only).

- `PUT /api/w/:wsId` `{ keyHash }`: register (only if absent); `POST /api/w/:wsId/rotate` (auth) `{ newKeyHash }`.
- `GET /api/oembed?url=`: **only** `youtube.com`/`youtu.be`/`vimeo.com` URLs → the provider's oEmbed endpoint; returns `{ title, author, thumbUrl }` as plain strings; cached 1 day.
- `POST /api/w/:wsId/files` (auth): ≤ 10 MB, checked against `Content-Length` and while streaming; **PNG/JPEG/WebP/GIF/PDF only** by magic bytes (SVG
  and other active formats rejected); key `ws/<wsId>/<sha256>`; **quota 500 MB per workspace** (`bytes_used` in D1); idempotent.
- `GET /api/w/:wsId/files/:sha256` (auth via a short-lived signed URL the client gets from an authed call, because `<img>` can't send headers): `immutable`,
  `nosniff`; PDFs also get `Content-Security-Policy: sandbox; frame-ancestors 'self'` (the global `X-Frame-Options: DENY` doesn't apply to Worker responses);
  images `Content-Disposition: inline`.
- `DELETE /api/w/:wsId/files/:sha256` (auth, idempotent) for purge.
- **Rate budgets (per IP + wsId):** oEmbed 60/min, uploads 20/min and 100 MB/hour, file reads 600/min, registry writes 10/min → `429` with `Retry-After`.
- Service worker: `navigateFallbackDenylist: [/^\/api\//]`.

## CSP additions

`font-src 'self' https://fonts.gstatic.com` · `img-src 'self' data: blob: https://i.ytimg.com https://i.vimeocdn.com` (video thumbnails only) ·
`frame-src https://www.youtube-nocookie.com https://player.vimeo.com https://www.google.com 'self'` (videos, maps, our own PDFs) ·
`worker-src 'self' blob:` only if Excalidraw needs it. No third-party images beyond video thumbnails (link cards show text only). Each change lands in the
story that needs it and is verified in a real browser on the PR preview.

## Stories (Epic 3), in order

| #   | Branch                   | Story                                        | Highlights                                                                                                                                                                                                                                            |
| --- | ------------------------ | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1  | `feat/E3-S1-workspace`   | **Workspace foundation**                     | `/w/new`, `/w/<id>#key`, `ws:` doc + IndexedDB, doc-id contract, member name/colour, workspaces-on-this-device page, key handling (fragment → device), guide nav link                                                                                 |
| S2  | `feat/E3-S2-folders`     | **Folders and subfolders**                   | Create/rename folders; React Aria **Tree** with **drag and drop** (drop _on_ a folder = inside; _before/after_ = same parent, `generateKeyBetween`), multi-item drag, **keyboard DnD** and a "Move to…" dialog; computed cycle repair + "Recovered"   |
| S3  | `feat/E3-S3-worker`      | **Worker foundation**                        | Entry + router, D1 registry (register/rotate, key hash), auth middleware, rate limits (binding verified), security headers, API tests; registration queued offline                                                                                    |
| S4  | `feat/E3-S4-items-video` | **Items + in-site video**                    | Video items (allowlisted oEmbed, facade + **player panel**, youtube-nocookie / Vimeo `dnt=1`, "embedding disabled by owner" fallback opens the provider), link items (domain + title), note items (Tiptap in `note:` docs), item detail page          |
| S5  | `feat/E3-S5-tags-search` | **Tags, search, filters**                    | Tag CRUD + colours, assign via ComboBox, MiniSearch (titles, note text, URLs, tags), filters (tag, type, who, date) in the URL                                                                                                                        |
| S6  | `feat/E3-S6-boards`      | **Boards in folders**                        | Excalidraw board items (binding above), stable element ids + tombstones, embeds, **canvas drop adapter** (`application/x-trip-node` payload → `viewportCoordsToSceneCoords` → element with `customData.nodeId`) plus a keyboard "Add to board" action |
| S7  | `feat/E3-S7-files`       | **Images and PDFs**                          | Upload queue (offline → later), quota display, image viewer, sandboxed in-site PDF viewer, local copies for offline                                                                                                                                   |
| S8  | `feat/E3-S8-organise`    | **Trash, favorites, recent, activity, bulk** | Delete protocol (trash/restore/purge incl. boards and R2), stars, recents, activity feed, multi-select **bulk move/tag/trash**                                                                                                                        |
| S9  | `feat/E3-S9-comments`    | **Comments and reactions**                   | Threads with replies on items and board elements, edit/delete tombstones, emoji reactions, counts in the library                                                                                                                                      |
| S10 | `feat/E3-S10-itinerary`  | **Start from the itinerary**                 | New-workspace option: region/day folders, the 15 days as notes, a board with day cards                                                                                                                                                                |

## Epic 4 (updated): live collaboration

y-partyserver Durable Objects (SQLite) for **every doc** (`ws:`, `note:`, `board:`, `comments:`), each connection authorized with the workspace key
(hash checked against D1); `onLoad`/`onSave`; Yjs snapshot compaction; presence (who's here, avatars, cursors on
boards, "X is viewing this folder"); live activity; invite-link UX (copy/QR); D1 only if a server-side need appears (e.g. workspace titles for link
unfurls); chat if comments aren't enough. Then the background-video story (R2 + Worker `/media/*` with Range).

## Acceptance highlights (full lists go in each story brief)

- **Convergence:** concurrent edits to different fields of one node both survive; concurrent moves forming a cycle produce **the same tree on every device
  regardless of arrival order and with skewed clocks** (tested by applying the same updates in different orders); tag rename + recolour both survive.
- **Offline:** create a workspace, folders and items, tag, search, comment, trash/restore offline; reload offline; queued registration/uploads/purges run
  once online, exactly once.
- **Delete:** purge removes the subtree's board/note local data and R2 files; a stale offline edit to a purged item never brings it back.
- **Security:** missing/wrong/rotated key → 401 on every authed route; `/api/oembed` refuses non-allowlisted hosts, malformed URLs and redirects off the
  allowlist; uploads reject oversize (header and streamed), mislabeled, SVG and over-quota; file responses carry `nosniff` (+ sandbox for PDFs); 429s
  appear at the budgets.
- **Video:** plays inside the site via youtube-nocookie/Vimeo `dnt=1` only after a click (no third-party requests before that); offline shows the cached
  thumbnail + "needs a connection"; embedding blocked by the owner → a clear message + "Open on YouTube".
- **Accessibility:** tree, move dialog, keyboard DnD, player, comments and bulk actions work by keyboard and with a screen reader (React Aria announcements).
- **Budgets:** guide entry bundle unchanged; lazy workspace/board chunk sizes and the `ws:` doc size/load time reported in every PR; 0 CSP errors on the preview.

## Risks for review

1. Cycle repair: verify with randomized concurrent-move tests (property-based) that all replicas render identical trees.
2. Workspace doc growth (notes, comments, activity) vs load time; when to split notes into their own docs.
3. React Aria Tree DnD: cross-parent moves via `onItemDrop`/`onMove` with our fractional keys; large trees (virtualization).
4. Library → Excalidraw drag (HTML5 drop onto the canvas, converting to elements with `customData`).
5. Rate-limit binding availability/behaviour on the free plan (verify in S3 before relying on it).
6. Size of the precached lazy chunks (Excalidraw + Tiptap + React Aria).

## v3 changes (codex review of v2)

Access: the key is separate from `wsId`, lives only in the URL fragment, is stored hashed in D1, rotatable, and required on all workspace APIs. SSRF: arbitrary
link previews and the image proxy are removed; oEmbed is allowlisted. Cycle repair: computed only, from ids (clock- and order-independent). Data model: nested
Y.Maps for tags and members, a tag set per node, notes/boards/comments in separate docs, per-device activity trimming, comment maps with replies and tombstones,
per-member reaction keys. Deletion: trash → purge protocol across docs and R2. Uploads: no SVG, magic bytes, quota, sandboxed PDFs, signed read URLs. Sequencing:
S1 split (workspace / folders), a Worker foundation story before any API feature, boards before comments. Acceptance: convergence, security, video, offline and
budget criteria added.

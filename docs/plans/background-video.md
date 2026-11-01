# Design: background video in the hero (future story)

Reviewed by codex (2026-11-02); its corrections are folded in.

> **Finding (tested 2026-11-02):** Cloudflare Workers **static assets ignore `Range` requests**. `Range: bytes=0-1` returns `200` with the
> whole file (tested on 3 files; no `Content-Range` or `Accept-Ranges`). Safari needs `206` for video, so **videos can't be served as static assets.**
> They go in **R2** and are served by the Worker at `/media/*` with Range support (see Media).

Status: **designed, not scheduled.** The user wants a background video later. This doc records the decisions so that the
PWA, CSP, caching and hero work done now doesn't block it.

## Goal

A muted, looping video behind the hero copy (where the photo slideshow is today), without hurting load speed, data use,
accessibility or the offline app.

## Media

- Files: `hero-<version>.webm` (VP9/AV1) and `.mp4` (H.264 fallback), plus `hero-<version>-720.{webm,mp4}` for small screens, stored in
  an **R2 bucket** (free tier: 10 GB, no egress fees). They're served **same-origin** at `/media/<file>` by the Worker entrypoint (added in Epic 3),
  which reads R2 with `bucket.get(key, { range: request.headers, onlyIf: request.headers })` and returns `206` + `Content-Range` for range requests,
  `Accept-Ranges: bytes`, the right `Content-Type`, and the long cache header. `cloudflare.config.ts` routes `/media/*` to the Worker first
  (`assets.runWorkerFirst: ["/media/*"]`). Poster: `public/assets/img/hero-video-poster.jpg` (first frame, ≤ 150 KB).
  It lives under `/assets/img/` on purpose, so the existing `photos` runtime cache and "Save photos for offline" cover it.
- Budget: 10–20 s seamless loop, **no audio track**, ≤ 4 MB (WebM 1080p), ≤ 6 MB (MP4), ≤ 2 MB (720p).
  (Static assets' 25 MiB file limit no longer applies, because R2 objects can be far larger, but keep the budget for data use.)
- **Why `/media/`, not `/assets/`** (also needed for the Worker route): `public/_headers` gives `/assets/*` `Cache-Control: public, max-age=3600, must-revalidate`.
  Videos want `public, max-age=31536000, immutable` (versioned filenames). Cloudflare applies **every** matching rule and joins the same header
  with a comma, so videos under `/assets/` would get a combined, contradictory `Cache-Control`. A separate path avoids that.
- Alternative: an R2 public custom domain (Range is supported there) plus `media-src 'self' https://<host>`. Same-origin through the Worker is
  preferred (no CSP change, one origin for the offline logic). Avoid Cloudflare Stream/iframes for a decorative loop.

## Component (`src/guide/HeroMedia.tsx`, used by `Hero.tsx`)

- `<video muted loop playsInline preload="none" poster=… aria-hidden="true" disablePictureInPicture disableRemotePlayback>`, **no `autoPlay`
  attribute**: start it with `video.play()` and treat a rejected promise as "fallback" (autoplay policy rejections don't fire `error`/`stalled`).
- Sources, each with an explicit `type`, and a **codec pair per breakpoint** so no screen size ends up with an unplayable format:
  `720.webm` + `720.mp4` with `media="(max-width: 700px)"`, then full `webm` + `mp4`.
- **Decide before loading anything:** check the fallback conditions _before_ attaching sources, so a video that won't be shown downloads nothing.
- **LCP:** measure today's LCP element first (it may be the hero text or the first slide, not a poster). Attach the video sources after first paint
  (`requestIdleCallback`, falling back to `load`), and only `<link rel=preload>` the poster if it is the measured LCP resource.
- **Fallback to today's photo slideshow** (kept as is; with reduced motion it's the static first photo) when any of these hold: `prefers-reduced-motion`,
  `navigator.connection?.saveData` (optional signal, not available in every browser), offline (`!navigator.onLine` is only a hint, so also
  handle fetch/`error` failures), or `play()` rejects (autoplay blocked, iOS low-power mode). The video is shown only once it is **actually playing**.
- **Caption:** `.hero-caption` follows the active slide today. While the video plays, show a fixed caption for the video (and restore the slide
  caption on fallback).
- **Pause when not visible:** an IntersectionObserver on the hero, plus `visibilitychange`. This saves battery and data.
- **Accessibility (WCAG 2.2.2):** moving content longer than 5 s needs a pause control, so add a visible Pause/Play button.
  The **existing slideshow has the same gap** (auto-advances every 6.5 s with no pause), so fix both in this story.
- Contrast: keep `.hero-shade`; re-check text contrast against the brightest frame.

## PWA / offline

- Never precache videos (see the `globIgnores` note below).
- Runtime route `/media/*.{webm,mp4}` → **NetworkOnly** (don't fill the cache with large files). Offline, the component doesn't attach sources and
  shows the slideshow. The poster is under `/assets/img/`, so the existing `photos` CacheFirst route covers it. `globIgnores: ["**/media/**"]` is
  defensive (the glob already excludes mp4/webm).
- If "save the video offline" is ever wanted: a CacheFirst route with Workbox `RangeRequestsPlugin`, filled explicitly with a full (200)
  response, because browsers (Safari especially) request video with `Range` headers.
- Not part of "Save photos for offline" (it would add MBs for a decoration).

## CSP / headers

- Same-origin `/media/*` via the Worker: `media-src` falls back to `default-src 'self'`, so nothing to add.
- The Worker sets `Cache-Control: public, max-age=31536000, immutable` on `/media/*` (versioned filenames). `_headers` doesn't apply to Worker responses.
- **Depends on Epic 3** (Worker entrypoint + R2 binding, added in E3-S4). Schedule this story after E3-S4.

## Acceptance (when scheduled)

- [ ] LCP no worse than today (measure the LCP element before and after); no video bytes before first paint
- [ ] Reduced motion / Save-Data / offline / autoplay blocked → slideshow or poster, no errors
- [ ] Pause control works for both video and slideshow; video pauses when scrolled away or the tab is hidden
- [ ] `curl -H 'Range: bytes=0-1' /media/hero-…webm` → `206` with `Content-Range`; a full request → `200` with `Accept-Ranges: bytes`
- [ ] iOS Safari (real device): plays inline, muted, loops; autoplay rejection (low-power mode) → fallback
- [ ] Android Chrome with Data Saver / Save-Data → fallback where the signal exists
- [ ] PWA precache size unchanged; offline mode shows the fallback; 0 console/CSP errors

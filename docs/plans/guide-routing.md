# Guide routing: clean section URLs (`/plan`, `/places/auli`, …)

Branch `feat/guide-routing`. Requested by the user after seeing `/#main` in the address bar (2026-11-02). Reviewed by codex; changes folded in below ("Review changes").

## Findings (live site, headless Chrome)

- `#main` comes **only** from the "Skip to content" link (`index.html`, `href="#main"`), via Tab → Enter or a click.
- Nav links are hash anchors (`#plan` …). Scrolling to them lands correctly (`html { scroll-behavior: smooth; scroll-padding-top: 72px }`),
  but the URL **doesn't follow scrolling**, `/plan` opens at the top (no routing), and choosing a place doesn't change the URL (no shareable link).
- Cloudflare already serves `index.html` for any unknown path (SPA fallback), and the service worker's `navigateFallback` does the same offline.

## URL scheme

| Path                                                                                          | Meaning                                             |
| --------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `/`                                                                                           | top (hero)                                          |
| `/route`, `/days`, `/food`, `/plan`                                                           | scroll to that section                              |
| `/places`                                                                                     | Places section, current place                       |
| `/places/<placeId>`                                                                           | Places section with that place selected (shareable) |
| `/board`, `/board/…`                                                                          | **reserved** for Epic 3: never rewritten            |
| anything else                                                                                 | `replaceState` to `/`                               |
| Legacy hashes: `/#plan` etc. → `replaceState` to `/plan` and scroll; `/#main`, `/#top` → `/`. |

## Design (no router library; the History API is enough for one page with sections, and keeps the guide bundle small)

- `src/routing/routes.ts` (pure, unit-testable): `SECTIONS = ["route","days","places","food","plan"] as const`, `type Route =
{ kind: "top" } | { kind: "section"; section: Section } | { kind: "place"; place: string } | { kind: "unknown" }`,
  `parseLocation(pathname, hash): Route` (validates place ids against `PLACES`), `pathFor(route): string`.
- `src/routing/useGuideRouting.ts`: one hook used in `App`:
  - **initial:** parse → normalize the URL with `replaceState` (legacy hash, unknown, invalid place → `/places`) → if a place: `select(place)`;
    after first render **and `document.fonts.ready`**, scroll to the section with `behavior: "auto"` (no smooth animation on load).
  - **`navigate(route, { push: true })`:** `pushState`, then scroll smoothly (instant with reduced motion), select the place if any.
  - **`popstate`:** parse and scroll (auto), select the place.
  - **scroll spy:** an IntersectionObserver on `#top` + the 5 sections, `rootMargin: "-80px 0px -55% 0px"`. When the active section changes →
    `replaceState` (never push) to its path (Places: `/places/<id>` if a place was chosen by the user or the URL, else `/places`).
    **Suppressed while a programmatic scroll is running** (until `scrollend`, with a 1200 ms fallback), so a nav click doesn't flicker through
    intermediate sections.
  - `document.title`: `"Plan · Plains to Peaks"`, … ; the top keeps the current title.
- **Links stay real links** (`<a href="/plan">`, so middle-click / open in new tab / copy link work). A shared `onNavClick` handler only
  intercepts plain left-clicks (no modifier keys, `button === 0`), calls `preventDefault` and then `navigate`.
  Applies to: Topbar brand (`/`), the 5 nav links, the two hero CTAs (`/days`, `/places`).
- **Place selection** (explorer tabs, map stops, day "Open … guide" buttons) → `replaceState` to `/places/<id>`
  (tab-like, so it doesn't flood history); the map and day buttons still scroll to Places.
- **Skip link** moves from `index.html` into React (`App`, first child): `href="#main"` stays for no-JS semantics, but `onClick` →
  `preventDefault`, `main.focus({ preventScroll: true })`, `main.scrollIntoView()`. `<main id="main" tabIndex={-1}>` with
  `main:focus { outline: none }`. **The URL is never changed by the skip link.**
- Accessibility: after a nav click, move focus to the section's heading (`tabIndex={-1}` on the `h2`s, focus with `preventScroll: true`) so
  screen-reader and keyboard users land where they navigated.

## Acceptance

- [ ] Tab → Enter on the skip link: focus moves to main, **URL unchanged**
- [ ] Nav click → URL `/plan`, Plan heading under the top bar, focus on its heading; Back returns to the previous section and URL
- [ ] Scrolling updates the URL (`/days` … `/food`) **without adding history entries** (`history.length` unchanged)
- [ ] Direct loads: `/plan`, `/food`, `/places/auli` (Auli selected), `/#plan` → `/plan`; reload keeps the section; offline `/plan` works
- [ ] `/places/nope` → `/places`; `/random` → `/`
- [ ] Middle-click / Ctrl+click on a nav link opens a new tab at that URL (not intercepted)
- [ ] Reduced motion: instant scrolls; no regressions (DOM diff only in hrefs, 23 behavior checks)

## Review changes (codex)

1. **Initial alignment settles:** after the first scroll, a `ResizeObserver` on `<body>` re-aligns the target (instant) for up to 2.5 s while fonts and lazy
   photos change the layout, and stops at the first user input (wheel, touch, key, pointer).
2. **Spy suppression ends on arrival:** a programmatic scroll records its target. The spy (a rAF-throttled scroll listener over `#top` + 5 sections,
   not an IntersectionObserver, so arrival can be checked every frame) ignores positions until the target's top is within 8 px of the 72 px
   scroll padding, with a 3 s safety timeout. User input cancels it.
3. **`history.scrollRestoration = "manual"`:** reload, Back and Forward go to the URL's **section** (not a stale pixel position).
4. **StrictMode-safe:** the one-time initial navigation is guarded at module level; every listener/observer is removed in cleanup.
5. **Canonical URLs:** lowercase; trailing slash removed; `/places/` → `/places`; `/places/nope` → `/places`; extra segments → `/`;
   bad percent-encoding → `/`; query string preserved.
6. **Two place actions:** _choose_ (explorer tabs and lens): `replaceState('/places/<id>')`, no scroll. _Open_ (map stops, day "Open … guide"):
   `pushState('/places/<id>')` + scroll to Places.

- Router library: not now (History API + a parser). Revisit when planning Epic 3's `/board/:id`.

Extra acceptance: alignment correct after photos and fonts load (cold and cached); Back/Forward/reload for sections and `/places/:id`;
the spy covers `/route` and `/` (scrolling back to the hero); StrictMode in `npm run dev` gives no duplicate history entries; canonicalization cases
above; focus lands on the section heading after nav clicks, Back/Forward and direct loads; `/board/x` stays untouched.

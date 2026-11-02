import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ManifestTransform } from "workbox-build";
import type { VitePWAOptions } from "vite-plugin-pwa";
import { FONT_CSS_CACHE, FONT_FILE_CACHE, PHOTO_CACHE } from "./src/pwa/cacheNames";

/** Client build output (same as CF_ASSETS_DIR in vite.config.ts). */
const ASSETS_DIR = ".cloudflare/output/v0/workers/default/assets";
/** Lazy route chunks that must work offline: the workspace and the canvas board. */
const OFFLINE_ROOTS = [/^assets\/WorkspaceApp-[\w-]+\.js$/, /^assets\/Board-[\w-]+\.js$/];

/**
 * Precache only the JavaScript the app needs to render offline: the entry chunks plus everything they import statically (followed
 * through `import … from "./x.js"`). Excalidraw's rarely used dynamic extras (diagram import, ~60 languages, export font subsetting,
 * about 8 MB) are left out and cached at runtime the first time they are used instead.
 */
const precacheStaticGraphOnly: ManifestTransform = (entries) => {
  const keep = new Set<string>();
  const queue: string[] = [];
  const html = readFileSync(join(ASSETS_DIR, "index.html"), "utf8");
  for (const m of html.matchAll(/src="\/(assets\/[^"]+\.js)"/g)) queue.push(m[1]);
  for (const e of entries) if (OFFLINE_ROOTS.some((re) => re.test(e.url))) queue.push(e.url);
  while (queue.length > 0) {
    const url = queue.pop()!;
    if (keep.has(url) || !existsSync(join(ASSETS_DIR, url))) continue;
    keep.add(url);
    const code = readFileSync(join(ASSETS_DIR, url), "utf8");
    for (const m of code.matchAll(/(?:from|import)\s*"\.\/([^"]+\.js)"/g)) queue.push("assets/" + m[1]);
  }
  return {
    manifest: entries.filter((e) => !e.url.endsWith(".js") || e.url === "sw.js" || keep.has(e.url)),
    warnings: [],
  };
};

/**
 * PWA settings (docs/plans/epic-2-pwa.md). Only the app shell is precached; photos (28 MB) are handled at runtime in E2-S2.
 * The service worker is generated in production builds only (disabled in `vite dev`).
 */
export const pwaOptions: Partial<VitePWAOptions> = {
  registerType: "prompt",
  injectRegister: false,
  devOptions: { enabled: false },
  // The icons are already matched by workbox.globPatterns; including them again would list them twice.
  includeManifestIcons: false,
  manifest: {
    id: "/",
    name: "Plains to Peaks — 15 Days from Pune",
    short_name: "Plains → Peaks",
    description:
      "A 15-day journey from Pune through Mathura, Vrindavan, Delhi, Dehradun, Haridwar, Rishikesh, Devprayag, Auli, Kausani, Almora, Kainchi Dham and Nainital — culture, food, geography, shopping and activities.",
    lang: "en",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f6efe3",
    theme_color: "#f6efe3",
    categories: ["travel"],
    icons: [
      { src: "/assets/pwa-64x64.png", sizes: "64x64", type: "image/png" },
      { src: "/assets/pwa-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "/assets/pwa-512x512.png", sizes: "512x512", type: "image/png" },
      { src: "/assets/maskable-icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  },
  workbox: {
    // manifest.webmanifest is added by the plugin itself. The canvas fonts (self-hosted, ~0.5 MB without the CJK font) are precached so boards
    // render offline; so is the lazy canvas chunk (hence the raised size limit).
    globPatterns: ["**/*.{html,js,css,svg,png}", "excalidraw-assets/fonts/**/*.woff2", "assets/*.woff2"],
    maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
    manifestTransforms: [precacheStaticGraphOnly],
    // Photos are excluded from precache on purpose (28 MB); they are cached at runtime below, or all at once via "Save photos for offline".
    globIgnores: ["**/assets/img/**"],
    navigateFallback: "/index.html",
    cleanupOutdatedCaches: true,
    runtimeCaching: [
      {
        // Lazy chunks that are not precached (see precacheStaticGraphOnly). File names are content-hashed, so cache-first is safe.
        urlPattern: ({ url, sameOrigin }) => sameOrigin && /^\/assets\/.+\.js$/.test(url.pathname),
        handler: "CacheFirst",
        options: {
          cacheName: "lazy-chunks",
          cacheableResponse: { statuses: [200] },
          expiration: { maxEntries: 150, maxAgeSeconds: 60 * 60 * 24 * 60 },
        },
      },
      {
        // Same-origin photos: served from cache once seen (or saved via the offline tile).
        urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith("/assets/img/"),
        handler: "CacheFirst",
        options: {
          cacheName: PHOTO_CACHE,
          cacheableResponse: { statuses: [0, 200] },
          expiration: { maxEntries: 60 },
        },
      },
      {
        // CacheFirst (not StaleWhileRevalidate): our font list is fixed, and a background refresh on every load only
        // produced failed ERR_INTERNET_DISCONNECTED requests offline. Refreshed after 30 days.
        urlPattern: ({ url }) => url.origin === "https://fonts.googleapis.com",
        handler: "CacheFirst",
        options: {
          cacheName: FONT_CSS_CACHE,
          cacheableResponse: { statuses: [0, 200] },
          expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 * 24 * 30 },
        },
      },
      {
        urlPattern: ({ url }) => url.origin === "https://fonts.gstatic.com",
        handler: "CacheFirst",
        options: {
          cacheName: FONT_FILE_CACHE,
          cacheableResponse: { statuses: [0, 200] },
          expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
        },
      },
    ],
  },
};

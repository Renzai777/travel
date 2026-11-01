import type { VitePWAOptions } from "vite-plugin-pwa";
import { FONT_CSS_CACHE, FONT_FILE_CACHE, PHOTO_CACHE } from "./src/pwa/cacheNames";

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
    globPatterns: ["**/*.{html,js,css,svg,png}"], // manifest.webmanifest is added by the plugin itself
    // Photos are excluded from precache on purpose (28 MB); they are cached at runtime below, or all at once via "Save photos for offline".
    globIgnores: ["**/assets/img/**"],
    navigateFallback: "/index.html",
    cleanupOutdatedCaches: true,
    runtimeCaching: [
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
        urlPattern: ({ url }) => url.origin === "https://fonts.googleapis.com",
        handler: "StaleWhileRevalidate",
        options: { cacheName: FONT_CSS_CACHE, cacheableResponse: { statuses: [0, 200] } },
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

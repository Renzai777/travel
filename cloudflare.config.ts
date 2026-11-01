import { defineConfig } from "cf/config";

/**
 * Cloudflare deployment (free plan): an assets-only Worker serving the Vite build.
 * Static files come from Vite's client build (dist/ + public/); headers live in public/_headers.
 * Later epics add an entrypoint, Durable Objects, D1 and R2 here.
 */
export default defineConfig({
  worker: {
    name: "plains-to-peaks",
    compatibilityDate: "2026-10-15",
    // Per-version preview URLs, used by the PR preview step in .github/workflows/cloudflare.yml.
    previewUrls: true,
    assets: {
      // Unknown paths (e.g. future /board/:roomId routes) fall back to index.html.
      notFoundHandling: "single-page-application",
    },
  },
});

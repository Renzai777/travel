import { bindings, defineConfig } from "cf/config";

/**
 * Cloudflare deployment (free plan): static assets + a small API Worker (worker/).
 * Static files come from Vite's client build (dist/ + public/); headers live in public/_headers.
 * Later epics add Durable Objects, D1 and R2 here.
 */
export default defineConfig({
  worker: {
    name: "plains-to-peaks",
    compatibilityDate: "2026-10-15",
    entrypoint: "./worker/index.ts",
    // Per-version preview URLs, used by the PR preview step in .github/workflows/cloudflare.yml.
    previewUrls: true,
    assets: {
      // Only the API runs the Worker; everything else is a static file.
      runWorkerFirst: ["/api/*"],
      // Unknown paths (e.g. future /board/:roomId routes) fall back to index.html.
      notFoundHandling: "single-page-application",
    },
    // 60 oEmbed lookups per minute per IP; best effort.
    env: {
      OEMBED_LIMIT: bindings.rateLimit({ namespace: "1001", simple: { limit: 60, period: 60 } }),
    },
  },
});

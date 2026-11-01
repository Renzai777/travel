import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";
import { VitePWA } from "vite-plugin-pwa";
import { pwaOptions } from "./pwa.config";

// Where the Cloudflare plugin writes the client build (Build Output spec, v0).
const CF_ASSETS_DIR = ".cloudflare/output/v0/workers/default/assets";

export default defineConfig(({ isPreview }) => ({
  // `vite preview` with the Cloudflare plugin (2.0 beta) returns HTTP 500 locally, so preview
  // serves the built static files directly. Production behaviour (headers, SPA fallback) is
  // verified on Cloudflare via `npm run deploy:check` and PR preview deployments instead.
  // The PWA plugin follows the top-level build.outDir (dist/) by default, but the Cloudflare plugin writes the client
  // build to CF_ASSETS_DIR, so point the service worker (and its precache scan) there.
  plugins: isPreview ? [react()] : [react(), cloudflare(), VitePWA({ ...pwaOptions, outDir: CF_ASSETS_DIR })],
  server: {
    host: false,
  },
  build: isPreview ? { outDir: CF_ASSETS_DIR } : { sourcemap: false },
}));

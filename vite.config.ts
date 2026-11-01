import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";

// Where the Cloudflare plugin writes the client build (Build Output spec, v0).
const CF_ASSETS_DIR = ".cloudflare/output/v0/workers/default/assets";

export default defineConfig(({ isPreview }) => ({
  // `vite preview` with the Cloudflare plugin (2.0 beta) returns HTTP 500 locally, so preview
  // serves the built static files directly. Production behaviour (headers, SPA fallback) is
  // verified on Cloudflare via `npm run deploy:check` and PR preview deployments instead.
  plugins: isPreview ? [react()] : [react(), cloudflare()],
  server: {
    host: false,
  },
  build: isPreview ? { outDir: CF_ASSETS_DIR } : { sourcemap: false },
}));

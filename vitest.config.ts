import { defineConfig } from "vitest/config";

// Unit tests run without the app's Vite plugins (Cloudflare, PWA, React): pure logic only.
export default defineConfig({
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});

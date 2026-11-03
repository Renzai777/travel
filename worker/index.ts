import { handleApi } from "./api";

/** The rate-limit binding declared in cloudflare.config.ts. */
interface Env {
  OEMBED_LIMIT: { limit(options: { key: string }): Promise<{ success: boolean }> };
}

/** Runs only for /api/* (cloudflare.config.ts: assets.runWorkerFirst); every other path is served from static assets. */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return handleApi(request, {
      fetch: (input, init) => fetch(input, init),
      allow: async (key) => (await env.OEMBED_LIMIT.limit({ key })).success,
    });
  },
};

import { lookupVideo, videoFromQuery, type FetchLike } from "./oembed";

export interface ApiDeps {
  fetch: FetchLike;
  /** True when this caller may make another upstream request now. */
  allow: (key: string) => Promise<boolean>;
}

const BASE_HEADERS: Record<string, string> = {
  "content-type": "application/json; charset=utf-8",
  "x-content-type-options": "nosniff",
  "content-security-policy": "default-src 'none'; frame-ancestors 'none'",
  "cross-origin-resource-policy": "same-origin",
  "referrer-policy": "no-referrer",
};

export function jsonResponse(
  status: number,
  body: unknown,
  cacheControl: string,
  extra: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...BASE_HEADERS, "cache-control": cacheControl, ...extra },
  });
}

/** Everything under /api/* (the Worker sees nothing else). Only `GET|HEAD /api/oembed?url=…` exists. */
export async function handleApi(request: Request, deps: ApiDeps): Promise<Response> {
  const res = await route(request, deps);
  return request.method === "HEAD" ? new Response(null, { status: res.status, headers: res.headers }) : res;
}

async function route(request: Request, deps: ApiDeps): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname !== "/api/oembed") return jsonResponse(404, { error: "not_found" }, "no-store");
  if (request.method !== "GET" && request.method !== "HEAD") {
    return jsonResponse(405, { error: "method_not_allowed" }, "no-store", { allow: "GET, HEAD" });
  }
  const video = videoFromQuery(url.searchParams);
  if (!video) return jsonResponse(400, { error: "bad_request" }, "no-store");
  const caller = request.headers.get("cf-connecting-ip") ?? "unknown";
  if (!(await deps.allow(caller)))
    return jsonResponse(429, { error: "rate_limited" }, "no-store", { "retry-after": "60" });
  const result = await lookupVideo(video, deps.fetch);
  if (result.status === 200) return jsonResponse(200, result.body, "private, max-age=86400");
  if (result.status === 404) return jsonResponse(404, { error: "video_not_found" }, "private, max-age=3600");
  return jsonResponse(502, { error: "upstream_failed" }, "no-store");
}

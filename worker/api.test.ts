import { describe, expect, it, vi } from "vitest";
import { handleApi } from "./api";

function call(path: string, init?: RequestInit): Request {
  return new Request("https://app.test" + path, init);
}

describe("handleApi", () => {
  it("returns 404 JSON for unknown routes", async () => {
    const res = await handleApi(call("/api/nope"), {
      fetch: vi.fn(),
      allow: async () => true,
    });
    expect(res.status).toBe(404);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toEqual({ error: "not_found" });
  });

  it("returns 405 with allow header for non GET/HEAD methods", async () => {
    const res = await handleApi(
      call(`/api/oembed?url=${encodeURIComponent("https://www.youtube.com/watch?v=dQw4w9WgXcQ")}`, {
        method: "POST",
      }),
      {
        fetch: vi.fn(),
        allow: async () => true,
      },
    );
    expect(res.status).toBe(405);
    expect(res.headers.get("allow")).toBe("GET, HEAD");
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toEqual({ error: "method_not_allowed" });
  });

  it("returns 400 for missing or bad url parameter", async () => {
    const missing = await handleApi(call("/api/oembed"), {
      fetch: vi.fn(),
      allow: async () => true,
    });
    expect(missing.status).toBe(400);
    expect(missing.headers.get("cache-control")).toBe("no-store");
    expect(await missing.json()).toEqual({ error: "bad_request" });

    const bad = await handleApi(call(`/api/oembed?url=${encodeURIComponent("https://example.com/not-video")}`), {
      fetch: vi.fn(),
      allow: async () => true,
    });
    expect(bad.status).toBe(400);
    expect(await bad.json()).toEqual({ error: "bad_request" });
  });

  it("returns 429 when rate limited and never calls fetch", async () => {
    const fetchMock = vi.fn();
    const res = await handleApi(
      call(`/api/oembed?url=${encodeURIComponent("https://www.youtube.com/watch?v=dQw4w9WgXcQ")}`),
      {
        fetch: fetchMock,
        allow: async () => false,
      },
    );
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("60");
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toEqual({ error: "rate_limited" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 200 with security headers and video details on success", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ title: "Test Song", author_name: "Singer" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const res = await handleApi(
      call(`/api/oembed?url=${encodeURIComponent("https://www.youtube.com/watch?v=dQw4w9WgXcQ")}`),
      {
        fetch: fetchMock,
        allow: async () => true,
      },
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/json; charset=utf-8");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("content-security-policy")).toBe("default-src 'none'; frame-ancestors 'none'");
    expect(res.headers.get("cache-control")).toBe("private, max-age=86400");
    expect(await res.json()).toEqual({
      provider: "youtube",
      videoId: "dQw4w9WgXcQ",
      title: "Test Song",
      author: "Singer",
      thumbnail: "https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg",
    });
  });

  it("returns 404 video_not_found when upstream returns 404", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 404 }));
    const res = await handleApi(
      call(`/api/oembed?url=${encodeURIComponent("https://www.youtube.com/watch?v=dQw4w9WgXcQ")}`),
      {
        fetch: fetchMock,
        allow: async () => true,
      },
    );
    expect(res.status).toBe(404);
    expect(res.headers.get("cache-control")).toBe("private, max-age=3600");
    expect(await res.json()).toEqual({ error: "video_not_found" });
  });

  it("returns 502 upstream_failed on upstream failure", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 500 }));
    const res = await handleApi(
      call(`/api/oembed?url=${encodeURIComponent("https://www.youtube.com/watch?v=dQw4w9WgXcQ")}`),
      {
        fetch: fetchMock,
        allow: async () => true,
      },
    );
    expect(res.status).toBe(502);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toEqual({ error: "upstream_failed" });
  });

  it("returns identical status and headers but null body on HEAD", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ title: "Never Gonna Give You Up" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const res = await handleApi(
      call(`/api/oembed?url=${encodeURIComponent("https://www.youtube.com/watch?v=dQw4w9WgXcQ")}`, {
        method: "HEAD",
      }),
      {
        fetch: fetchMock,
        allow: async () => true,
      },
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/json; charset=utf-8");
    expect(res.headers.get("cache-control")).toBe("private, max-age=86400");
    expect(res.body).toBeNull();
  });

  it("fetches only canonical upstream URL when given SSRF/parameter attack query", async () => {
    const fetchCalls: string[] = [];
    const fetchMock = vi.fn().mockImplementation(async (input: string) => {
      fetchCalls.push(input);
      return new Response(JSON.stringify({ title: "Safe Title" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });
    const attackUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ&u=http://169.254.169.254/";
    const res = await handleApi(call(`/api/oembed?url=${encodeURIComponent(attackUrl)}`), {
      fetch: fetchMock,
      allow: async () => true,
    });
    expect(res.status).toBe(200);
    expect(fetchCalls).toEqual([
      "https://www.youtube.com/oembed?format=json&url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DdQw4w9WgXcQ",
    ]);
  });

  it("uses cf-connecting-ip as rate-limit key, falling back to unknown", async () => {
    const allowKeys: string[] = [];
    const allowMock = vi.fn().mockImplementation(async (key: string) => {
      allowKeys.push(key);
      return true;
    });
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ title: "Title" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    await handleApi(
      call(`/api/oembed?url=${encodeURIComponent("https://www.youtube.com/watch?v=dQw4w9WgXcQ")}`, {
        headers: { "cf-connecting-ip": "198.51.100.42" },
      }),
      {
        fetch: fetchMock,
        allow: allowMock,
      },
    );
    expect(allowKeys).toContain("198.51.100.42");

    await handleApi(call(`/api/oembed?url=${encodeURIComponent("https://www.youtube.com/watch?v=dQw4w9WgXcQ")}`), {
      fetch: fetchMock,
      allow: allowMock,
    });
    expect(allowKeys).toContain("unknown");
  });
});

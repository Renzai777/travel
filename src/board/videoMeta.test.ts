import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchVideoMeta, parseApiMeta } from "./videoMeta";

describe("parseApiMeta", () => {
  it("parses valid title and Vimeo-host thumbnail", () => {
    expect(
      parseApiMeta({
        title: " Hi ",
        thumbnail: "https://i.vimeocdn.com/video/1_640",
      }),
    ).toEqual({
      title: "Hi",
      thumbnail: "https://i.vimeocdn.com/video/1_640",
    });
  });

  it("cuts titles over 300 characters to 300", () => {
    const longTitle = "a".repeat(500);
    const parsed = parseApiMeta({ title: ` ${longTitle} ` });
    expect(parsed.title).toBe("a".repeat(300));
    expect(parsed.title?.length).toBe(300);
  });

  it("omits non-string or whitespace-only title", () => {
    expect(parseApiMeta({ title: 123 })).toEqual({});
    expect(parseApiMeta({ title: "   " })).toEqual({});
  });

  it("keeps Vimeo-host thumbnail and drops other hosts and http", () => {
    expect(
      parseApiMeta({
        title: "x",
        thumbnail: "https://evil.example/a.jpg",
      }),
    ).toEqual({
      title: "x",
    });

    expect(
      parseApiMeta({
        title: "x",
        thumbnail: "http://i.vimeocdn.com/video/1_640",
      }),
    ).toEqual({
      title: "x",
    });
  });

  it("handles null, strings, and empty objects", () => {
    expect(parseApiMeta(null)).toEqual({});
    expect(parseApiMeta("str")).toEqual({});
    expect(parseApiMeta({})).toEqual({});
  });
});

describe("fetchVideoMeta", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns found on 200 with JSON response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ title: "My Video", thumbnail: "https://i.vimeocdn.com/video/1_640" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const res = await fetchVideoMeta("https://vimeo.com/12345");
    expect(res).toEqual({
      kind: "found",
      meta: { title: "My Video", thumbnail: "https://i.vimeocdn.com/video/1_640" },
    });
  });

  it("returns missing on 404 or 400", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(null, { status: 404 }));
    expect(await fetchVideoMeta("https://vimeo.com/12345")).toEqual({ kind: "missing" });

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(null, { status: 400 }));
    expect(await fetchVideoMeta("https://vimeo.com/12345")).toEqual({ kind: "missing" });
  });

  it("returns retry on 500, non-json response, or fetch failure", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response("error", { status: 500 }));
    expect(await fetchVideoMeta("https://vimeo.com/12345")).toEqual({ kind: "retry" });

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("<html>ok</html>", {
        status: 200,
        headers: { "content-type": "text/html" },
      }),
    );
    expect(await fetchVideoMeta("https://vimeo.com/12345")).toEqual({ kind: "retry" });

    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("network"));
    expect(await fetchVideoMeta("https://vimeo.com/12345")).toEqual({ kind: "retry" });
  });
});

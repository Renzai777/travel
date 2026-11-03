import { describe, expect, it } from "vitest";
import { BODY_MAX, lookupVideo, sanitize, upstreamUrl, videoFromQuery, type FetchLike, type Video } from "./oembed";

describe("videoFromQuery", () => {
  it("parses valid YouTube and Vimeo URLs", () => {
    expect(videoFromQuery(new URLSearchParams("url=https://www.youtube.com/watch?v=dQw4w9WgXcQ"))).toEqual({
      provider: "youtube",
      videoId: "dQw4w9WgXcQ",
    });

    expect(
      videoFromQuery(new URLSearchParams(`url=${encodeURIComponent("https://youtu.be/dQw4w9WgXcQ?t=30")}`)),
    ).toEqual({
      provider: "youtube",
      videoId: "dQw4w9WgXcQ",
    });

    expect(videoFromQuery(new URLSearchParams(`url=${encodeURIComponent("https://vimeo.com/76979871")}`))).toEqual({
      provider: "vimeo",
      videoId: "76979871",
    });
  });

  it("returns null for non-video or unsafe URLs", () => {
    expect(videoFromQuery(new URLSearchParams("url=https://example.com"))).toBeNull();
    expect(videoFromQuery(new URLSearchParams("url=javascript:alert(1)"))).toBeNull();
    expect(videoFromQuery(new URLSearchParams("url=http://169.254.169.254/latest"))).toBeNull();
  });

  it("returns null for multiple or missing url parameters or overly long value", () => {
    expect(
      videoFromQuery(new URLSearchParams("url=https://vimeo.com/76979871&url=https://vimeo.com/76979872")),
    ).toBeNull();
    expect(videoFromQuery(new URLSearchParams(""))).toBeNull();
    expect(videoFromQuery(new URLSearchParams(`url=${"a".repeat(3000)}`))).toBeNull();
  });
});

describe("upstreamUrl", () => {
  it("formats canonical upstream oEmbed URLs for YouTube and Vimeo", () => {
    expect(upstreamUrl({ provider: "youtube", videoId: "dQw4w9WgXcQ" })).toBe(
      "https://www.youtube.com/oembed?format=json&url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DdQw4w9WgXcQ",
    );
    expect(upstreamUrl({ provider: "vimeo", videoId: "76979871" })).toBe(
      "https://vimeo.com/api/oembed.json?url=https%3A%2F%2Fvimeo.com%2F76979871&width=640",
    );
  });
});

describe("sanitize", () => {
  const ytVideo: Video = { provider: "youtube", videoId: "dQw4w9WgXcQ" };
  const vimeoVideo: Video = { provider: "vimeo", videoId: "76979871" };

  it("normalises titles with whitespace and control characters into one line", () => {
    const res = sanitize(ytVideo, { title: " Hello\n\t\x00World\r " });
    expect(res?.title).toBe("Hello World");
  });

  it("truncates titles over 300 characters to 300", () => {
    const res = sanitize(ytVideo, { title: "a".repeat(400) });
    expect(res?.title).toBe("a".repeat(300));
    expect(res?.title.length).toBe(300);
  });

  it("returns null for empty or non-string titles or arrays", () => {
    expect(sanitize(ytVideo, { title: "" })).toBeNull();
    expect(sanitize(ytVideo, { title: "   " })).toBeNull();
    expect(sanitize(ytVideo, { title: 12345 })).toBeNull();
    expect(sanitize(ytVideo, {})).toBeNull();
    expect(sanitize(ytVideo, [])).toBeNull();
    expect(sanitize(ytVideo, null)).toBeNull();
  });

  it("builds YouTube thumbnail from videoId and ignores upstream thumbnail_url", () => {
    const res = sanitize(ytVideo, {
      title: "Rickroll",
      thumbnail_url: "https://evil.example/pic.jpg",
    });
    expect(res?.thumbnail).toBe("https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg");
  });

  it("validates Vimeo thumbnail against allowed image host", () => {
    const ok = sanitize(vimeoVideo, {
      title: "Vimeo Video",
      thumbnail_url: "https://i.vimeocdn.com/video/123_640",
    });
    expect(ok?.thumbnail).toBe("https://i.vimeocdn.com/video/123_640");

    const evil = sanitize(vimeoVideo, {
      title: "Vimeo Video",
      thumbnail_url: "https://evil.example/x.jpg",
    });
    expect(evil?.thumbnail).toBeUndefined();

    const insecure = sanitize(vimeoVideo, {
      title: "Vimeo Video",
      thumbnail_url: "http://i.vimeocdn.com/x.jpg",
    });
    expect(insecure?.thumbnail).toBeUndefined();
  });

  it("trims author to 100 characters", () => {
    const res = sanitize(ytVideo, {
      title: "Title",
      author_name: "  Author Name  ",
    });
    expect(res?.author).toBe("Author Name");

    const longAuthor = sanitize(ytVideo, {
      title: "Title",
      author_name: "b".repeat(150),
    });
    expect(longAuthor?.author).toBe("b".repeat(100));
    expect(longAuthor?.author?.length).toBe(100);
  });
});

describe("lookupVideo", () => {
  const video: Video = { provider: "youtube", videoId: "dQw4w9WgXcQ" };

  it("returns 200 and fetches exactly once with manual redirect on valid response", async () => {
    const calls: { input: string; init: RequestInit }[] = [];
    const fakeFetch: FetchLike = async (input, init) => {
      calls.push({ input, init });
      return new Response(JSON.stringify({ title: "Valid Title" }), {
        status: 200,
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    };
    const res = await lookupVideo(video, fakeFetch);
    expect(res.status).toBe(200);
    expect(calls).toHaveLength(1);
    expect(calls[0].input).toBe(upstreamUrl(video));
    expect(calls[0].init.redirect).toBe("manual");
  });

  it("returns 404 on 404 or 401 response", async () => {
    expect(await lookupVideo(video, async () => new Response(null, { status: 404 }))).toEqual({
      status: 404,
    });
    expect(await lookupVideo(video, async () => new Response(null, { status: 401 }))).toEqual({
      status: 404,
    });
  });

  it("returns 502 without following 302 redirect", async () => {
    const calls: { input: string; init: RequestInit }[] = [];
    const res = await lookupVideo(video, async (input, init) => {
      calls.push({ input, init });
      return new Response(null, {
        status: 302,
        headers: { location: "http://127.0.0.1/" },
      });
    });
    expect(res).toEqual({ status: 502 });
    expect(calls).toHaveLength(1);
  });

  it("returns 502 on 500 or non-json content-type", async () => {
    expect(await lookupVideo(video, async () => new Response(null, { status: 500 }))).toEqual({
      status: 502,
    });
    expect(
      await lookupVideo(
        video,
        async () => new Response("<html></html>", { status: 200, headers: { "content-type": "text/html" } }),
      ),
    ).toEqual({ status: 502 });
  });

  it("returns 502 when response body exceeds BODY_MAX", async () => {
    const overSized = "a".repeat(BODY_MAX + 1);
    expect(
      await lookupVideo(
        video,
        async () =>
          new Response(overSized, {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
      ),
    ).toEqual({ status: 502 });
  });

  it("returns 502 on invalid JSON or missing title", async () => {
    expect(
      await lookupVideo(
        video,
        async () =>
          new Response("{bad json", {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
      ),
    ).toEqual({ status: 502 });

    expect(
      await lookupVideo(
        video,
        async () =>
          new Response(JSON.stringify({ author_name: "Author only" }), {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
      ),
    ).toEqual({ status: 502 });
  });

  it("returns 502 when fetch throws", async () => {
    expect(
      await lookupVideo(video, async () => {
        throw new Error("network abort");
      }),
    ).toEqual({ status: 502 });
  });
});

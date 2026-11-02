import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchVimeoMeta, parseVimeoOembed } from "./videoMeta";

describe("parseVimeoOembed", () => {
  it("parses valid title and thumbnail", () => {
    expect(
      parseVimeoOembed({
        title: " Hi ",
        thumbnail_url: "https://i.vimeocdn.com/video/1_640",
      }),
    ).toEqual({
      title: "Hi",
      thumbnail: "https://i.vimeocdn.com/video/1_640",
    });
  });

  it("omits invalid thumbnails", () => {
    expect(
      parseVimeoOembed({
        title: "x",
        thumbnail_url: "https://evil.example/a.jpg",
      }),
    ).toEqual({
      title: "x",
    });
  });

  it("handles null, strings, and empty objects", () => {
    expect(parseVimeoOembed(null)).toEqual({});
    expect(parseVimeoOembed("str")).toEqual({});
    expect(parseVimeoOembed({})).toEqual({});
  });

  it("cuts titles over 300 characters to 300", () => {
    const longTitle = "a".repeat(500);
    const parsed = parseVimeoOembed({ title: longTitle });
    expect(parsed.title).toBe("a".repeat(300));
    expect(parsed.title?.length).toBe(300);
  });
});

describe("fetchVimeoMeta", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null immediately for invalid video ids", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    expect(await fetchVimeoMeta("bad")).toBeNull();
    expect(await fetchVimeoMeta("1234")).toBeNull();
    expect(await fetchVimeoMeta("1234567890123")).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("fetches oEmbed data for valid video ids", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        title: "Sample Video",
        thumbnail_url: "https://i.vimeocdn.com/video/123_640",
      }),
    } as Response);

    const meta = await fetchVimeoMeta("76979871");
    expect(meta).toEqual({
      title: "Sample Video",
      thumbnail: "https://i.vimeocdn.com/video/123_640",
    });
  });

  it("returns null if fetch fails or response is not ok", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
    } as Response);
    expect(await fetchVimeoMeta("76979871")).toBeNull();

    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("network error"));
    expect(await fetchVimeoMeta("76979871")).toBeNull();
  });
});

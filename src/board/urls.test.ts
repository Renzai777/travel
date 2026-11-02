import { describe, expect, it } from "vitest";
import { extractUrls, parseCardUrl, parseSafeUrl, safeThumbnail, youtubeThumbnail } from "./urls";

describe("urls", () => {
  it("parseSafeUrl accepts valid http and https URLs and rejects dangerous or malformed ones", () => {
    expect(parseSafeUrl("https://example.com/path")).toEqual({
      url: "https://example.com/path",
      hostname: "example.com",
    });
    expect(parseSafeUrl("http://example.com")).toEqual({
      url: "http://example.com/",
      hostname: "example.com",
    });

    expect(parseSafeUrl("javascript:alert(1)")).toBeNull();
    expect(parseSafeUrl("data:text/html,x")).toBeNull();
    expect(parseSafeUrl("file:///etc/passwd")).toBeNull();
    expect(parseSafeUrl("ftp://x.com")).toBeNull();
    expect(parseSafeUrl("https://user:pw@example.com")).toBeNull();
    expect(parseSafeUrl("not a url")).toBeNull();
    expect(parseSafeUrl("")).toBeNull();
    expect(parseSafeUrl(`https://example.com/${"a".repeat(3000)}`)).toBeNull();
  });

  it("parseCardUrl identifies YouTube URLs across formats", () => {
    const urls = [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://youtu.be/dQw4w9WgXcQ",
      "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://www.youtube.com/shorts/dQw4w9WgXcQ",
    ];

    for (const u of urls) {
      const card = parseCardUrl(u);
      expect(card).not.toBeNull();
      expect(card?.kind).toBe("video");
      if (card && card.kind === "video") {
        expect(card.value.provider).toBe("youtube");
        expect(card.value.videoId).toBe("dQw4w9WgXcQ");
        expect(card.value.embedUrl).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
      }
    }
  });

  it("parseCardUrl parses YouTube start times into seconds", () => {
    const cardSec = parseCardUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=90");
    expect(cardSec?.kind).toBe("video");
    if (cardSec && cardSec.kind === "video") {
      expect(cardSec.value.embedUrl.endsWith("?start=90")).toBe(true);
    }

    const cardM = parseCardUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1m30s");
    expect(cardM?.kind).toBe("video");
    if (cardM && cardM.kind === "video") {
      expect(cardM.value.embedUrl.endsWith("?start=90")).toBe(true);
    }
  });

  it("never carries extraneous query parameters in the YouTube embed URL", () => {
    const card = parseCardUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL123&evil=1");
    expect(card?.kind).toBe("video");
    if (card && card.kind === "video") {
      expect(card.value.embedUrl).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
    }
  });

  it("treats lookalikes, bad ids, and non-video paths as plain links", () => {
    const evil = parseCardUrl("https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ");
    expect(evil).toEqual({
      kind: "link",
      value: { url: "https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ", hostname: "youtube.com.evil.example" },
    });

    const badId = parseCardUrl("https://www.youtube.com/watch?v=short");
    expect(badId).toEqual({
      kind: "link",
      value: { url: "https://www.youtube.com/watch?v=short", hostname: "www.youtube.com" },
    });

    const channel = parseCardUrl("https://www.youtube.com/channel/abc");
    expect(channel).toEqual({
      kind: "link",
      value: { url: "https://www.youtube.com/channel/abc", hostname: "www.youtube.com" },
    });
  });

  it("handles Vimeo video links and non-video paths", () => {
    const standard = parseCardUrl("https://vimeo.com/76979871");
    expect(standard?.kind).toBe("video");
    if (standard && standard.kind === "video") {
      expect(standard.value.provider).toBe("vimeo");
      expect(standard.value.videoId).toBe("76979871");
      expect(standard.value.embedUrl).toBe("https://player.vimeo.com/video/76979871?dnt=1");
    }

    const player = parseCardUrl("https://player.vimeo.com/video/76979871");
    expect(player?.kind).toBe("video");
    if (player && player.kind === "video") {
      expect(player.value.provider).toBe("vimeo");
      expect(player.value.videoId).toBe("76979871");
      expect(player.value.embedUrl).toBe("https://player.vimeo.com/video/76979871?dnt=1");
    }

    const channel = parseCardUrl("https://vimeo.com/channels/staffpicks");
    expect(channel?.kind).toBe("link");
  });

  it("parses other safe links as link cards", () => {
    const card = parseCardUrl("https://www.booking.com/hotel/in/x.html");
    expect(card).toEqual({
      kind: "link",
      value: { url: "https://www.booking.com/hotel/in/x.html", hostname: "www.booking.com" },
    });
  });

  it("extracts distinct URLs without trailing punctuation", () => {
    const urls = extractUrls("see https://a.com/x, and https://b.org/y). Also https://a.com/x");
    expect(urls).toEqual(["https://a.com/x", "https://b.org/y"]);
  });

  it("builds YouTube thumbnail URLs only for valid video IDs", () => {
    expect(youtubeThumbnail("dQw4w9WgXcQ")).toBe("https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg");
    expect(youtubeThumbnail("bad")).toBeNull();
  });

  it("validates untrusted thumbnails to allow only https i.vimeocdn.com images", () => {
    expect(safeThumbnail("https://i.vimeocdn.com/video/452001751-abc_640")).toBe(
      "https://i.vimeocdn.com/video/452001751-abc_640",
    );
    expect(safeThumbnail("http://i.vimeocdn.com/x")).toBeNull();
    expect(safeThumbnail("https://evil.example/x.jpg")).toBeNull();
    expect(safeThumbnail("javascript:alert(1)")).toBeNull();
    expect(safeThumbnail(42)).toBeNull();
  });
});

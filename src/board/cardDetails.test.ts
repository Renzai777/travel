import { describe, expect, it } from "vitest";
import {
  CARD_NOTES_MAX,
  CARD_TAGS_MAX,
  CARD_TITLE_MAX,
  cardData,
  cleanNotes,
  cleanTagIds,
  cleanTitle,
} from "./cardDetails";

describe("cardDetails", () => {
  it("cleanTagIds deduplicates and preserves valid ids", () => {
    expect(cleanTagIds(["a", "a", "b"])).toEqual(["a", "b"]);
  });

  it("cleanTagIds drops non-array, numbers, invalid characters, and strings longer than 40 chars", () => {
    expect(cleanTagIds(null)).toEqual([]);
    expect(cleanTagIds(123)).toEqual([]);
    expect(cleanTagIds("string")).toEqual([]);
    expect(
      cleanTagIds([
        123,
        "bad id!",
        "with spaces",
        "a".repeat(41), // 41 chars dropped
        "valid_id-123",
        null,
        undefined,
      ]),
    ).toEqual(["valid_id-123"]);
  });

  it("cleanTagIds caps at CARD_TAGS_MAX (20 ids → 12)", () => {
    const twentyIds = Array.from({ length: 20 }, (_, i) => `id_${i}`);
    const res = cleanTagIds(twentyIds);
    expect(res).toHaveLength(CARD_TAGS_MAX);
    expect(res).toHaveLength(12);
    expect(res).toEqual(twentyIds.slice(0, 12));
  });

  it("cleanNotes handles non-string and truncates to CARD_NOTES_MAX", () => {
    expect(cleanNotes(5)).toBe("");
    expect(cleanNotes(null)).toBe("");
    expect(cleanNotes(undefined)).toBe("");
    const longNote = "a".repeat(3000);
    const cleaned = cleanNotes(longNote);
    expect(cleaned).toHaveLength(CARD_NOTES_MAX);
    expect(cleaned).toHaveLength(2000);
    expect(cleaned).toBe("a".repeat(2000));
  });

  it("cleanTitle trims whitespace and handles non-string", () => {
    expect(cleanTitle("  hi  ")).toBe("hi");
    expect(cleanTitle(null)).toBe("");
    expect(cleanTitle(undefined)).toBe("");
    expect(cleanTitle(42)).toBe("");
    const longTitle = "  " + "x".repeat(500) + "  ";
    const cleaned = cleanTitle(longTitle);
    expect(cleaned).toHaveLength(CARD_TITLE_MAX);
    expect(cleaned).toHaveLength(300);
  });

  it("cardData parses valid card and returns defaults for missing fields", () => {
    expect(cardData({ customData: { kind: "video", title: "x" } })).toEqual({
      kind: "video",
      title: "x",
      tags: [],
      notes: "",
    });
  });

  it("cardData returns null for invalid kind or missing customData", () => {
    expect(cardData({ customData: { kind: "nope" } })).toBeNull();
    expect(cardData({})).toBeNull();
  });

  it("cardData drops untrusted thumbnails and keeps safe ones", () => {
    const evil = cardData({
      customData: { kind: "video", title: "x", thumbnail: "https://evil.example/a.jpg" },
    });
    expect(evil?.thumbnail).toBeUndefined();

    const good = cardData({
      customData: { kind: "video", title: "x", thumbnail: "https://i.vimeocdn.com/video/1.jpg" },
    });
    expect(good?.thumbnail).toBe("https://i.vimeocdn.com/video/1.jpg");
  });
});

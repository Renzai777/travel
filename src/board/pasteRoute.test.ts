import { describe, expect, it } from "vitest";
import { routePaste } from "./pasteRoute";

describe("pasteRoute", () => {
  it("delegates or flags images correctly based on element and image presence", () => {
    expect(routePaste({ text: "hello", hasElements: true, hasImage: false })).toEqual({ kind: "delegate" });
    expect(routePaste({ text: "https://youtu.be/dQw4w9WgXcQ", hasElements: true, hasImage: false })).toEqual({
      kind: "delegate",
    });
    expect(routePaste({ text: "hello", hasElements: false, hasImage: true })).toEqual({ kind: "image" });
    expect(routePaste({ text: "", hasElements: false, hasImage: false })).toEqual({ kind: "delegate" });
    expect(routePaste({ text: "   \n\t  ", hasElements: false, hasImage: false })).toEqual({ kind: "delegate" });
  });

  it("turns a single video URL into a video card without a note", () => {
    const decision = routePaste({
      text: "https://youtu.be/dQw4w9WgXcQ",
      hasElements: false,
      hasImage: false,
    });
    expect(decision.kind).toBe("cards");
    if (decision.kind === "cards") {
      expect(decision.cards).toHaveLength(1);
      expect(decision.cards[0].kind).toBe("video");
      expect(decision.note).toBeUndefined();
    }
  });

  it("extracts multiple URLs and retains non-URL text as a note", () => {
    const decision = routePaste({
      text: "Dinner ideas https://a.com/x and https://b.com/y",
      hasElements: false,
      hasImage: false,
    });
    expect(decision.kind).toBe("cards");
    if (decision.kind === "cards") {
      expect(decision.cards).toHaveLength(2);
      expect(decision.cards[0].kind).toBe("link");
      expect(decision.cards[1].kind).toBe("link");
      expect(decision.note).toBe("Dinner ideas and");
    }
  });

  it("caps pasted cards at MAX_CARDS_PER_PASTE (10)", () => {
    const urls = Array.from({ length: 12 }, (_, i) => `https://example${i}.com`);
    const decision = routePaste({
      text: urls.join(" "),
      hasElements: false,
      hasImage: false,
    });
    expect(decision.kind).toBe("cards");
    if (decision.kind === "cards") {
      expect(decision.cards).toHaveLength(10);
    }
  });

  it("turns plain text into notes with appropriate width flags", () => {
    const shortNote = routePaste({
      text: "Book the permit",
      hasElements: false,
      hasImage: false,
    });
    expect(shortNote).toEqual({ kind: "note", text: "Book the permit", wide: false });

    const sentence120 = "A".repeat(120);
    const longNote = routePaste({
      text: sentence120,
      hasElements: false,
      hasImage: false,
    });
    expect(longNote).toEqual({ kind: "note", text: sentence120, wide: true });

    const multilineNote = routePaste({
      text: "line1\nline2",
      hasElements: false,
      hasImage: false,
    });
    expect(multilineNote).toEqual({ kind: "note", text: "line1\nline2", wide: true });
  });

  it("treats invalid or unsafe schemes like javascript: as plain note text", () => {
    const decision = routePaste({
      text: "javascript:alert(1)",
      hasElements: false,
      hasImage: false,
    });
    expect(decision).toEqual({ kind: "note", text: "javascript:alert(1)", wide: false });
  });
});

import { describe, expect, it } from "vitest";
import { boardRecords, linkName, snippetOf, type LibraryRecord } from "./records";

describe("records", () => {
  it("parses a YouTube video card with thumbnail and autoTitle", () => {
    const elements = [
      {
        id: "el1",
        type: "embeddable",
        link: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        customData: {
          kind: "video",
          title: "",
          autoTitle: "Spiti road",
          tags: ["t1"],
          notes: "4:10 Kunzum",
        },
      },
    ];
    const recs = boardRecords("f1", elements);
    expect(recs).toHaveLength(1);
    expect(recs[0]).toMatchObject({
      id: "f1:el1",
      folderId: "f1",
      elementId: "el1",
      kind: "video",
      title: "Spiti road",
      autoTitle: "Spiti road",
      provider: "youtube",
      thumbnail: "https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg",
      host: "www.youtube.com",
      notes: "4:10 Kunzum",
      tagIds: ["t1"],
    });
  });

  it("user title wins over autoTitle", () => {
    const elements = [
      {
        id: "el2",
        type: "embeddable",
        link: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        customData: {
          kind: "video",
          title: "My Custom Title",
          autoTitle: "Spiti road",
          tags: [],
          notes: "",
        },
      },
    ];
    const recs = boardRecords("f1", elements);
    expect(recs[0].title).toBe("My Custom Title");
  });

  it("parses a link card with fallback title and no thumbnail", () => {
    const elements = [
      {
        id: "el3",
        type: "embeddable",
        link: "https://example.com/a",
        customData: { kind: "link", title: "" },
      },
    ];
    const recs = boardRecords("f1", elements);
    expect(recs).toHaveLength(1);
    expect(recs[0]).toMatchObject({
      kind: "link",
      title: "A · example.com",
      host: "example.com",
      url: "https://example.com/a",
    });
    expect(recs[0].thumbnail).toBeUndefined();
  });

  it("skips cards with unsafe links, deleted cards, and invalid kind", () => {
    const elements = [
      {
        id: "unsafe",
        type: "embeddable",
        link: "javascript:alert(1)",
        customData: { kind: "link", title: "evil" },
      },
      {
        id: "deleted",
        type: "embeddable",
        isDeleted: true,
        link: "https://example.com/del",
        customData: { kind: "link", title: "deleted" },
      },
      {
        id: "nope",
        type: "embeddable",
        link: "https://example.com/nope",
        customData: { kind: "nope" },
      },
    ];
    expect(boardRecords("f1", elements)).toEqual([]);
  });

  it("parses a sticky note with bound text element", () => {
    const elements = [
      {
        id: "note1",
        type: "rectangle",
        backgroundColor: "#ffec99",
        customData: { kind: "note" },
      },
      {
        id: "text1",
        type: "text",
        containerId: "note1",
        originalText: "Dhankar monastery\nopens at 7",
        text: "Dhankar\nmonastery...",
      },
    ];
    const recs = boardRecords("f1", elements);
    expect(recs).toHaveLength(1);
    expect(recs[0]).toMatchObject({
      kind: "note",
      title: "Dhankar monastery",
      text: "Dhankar monastery\nopens at 7",
      color: "#ffec99",
      host: "",
      url: "",
      tagIds: [],
    });
  });

  it("skips notes with no text or whose text element is deleted", () => {
    const emptyNote = [
      {
        id: "note1",
        type: "rectangle",
        customData: { kind: "note" },
      },
    ];
    expect(boardRecords("f1", emptyNote)).toEqual([]);

    const deletedText = [
      {
        id: "note2",
        type: "rectangle",
        customData: { kind: "note" },
      },
      {
        id: "text2",
        type: "text",
        containerId: "note2",
        isDeleted: true,
        originalText: "Deleted text",
      },
    ];
    expect(boardRecords("f1", deletedText)).toEqual([]);
  });

  it("drops invalid background color on notes", () => {
    const elements = [
      {
        id: "note1",
        type: "rectangle",
        backgroundColor: "red; x",
        customData: { kind: "note" },
      },
      {
        id: "text1",
        type: "text",
        containerId: "note1",
        text: "Some note text",
      },
    ];
    const recs = boardRecords("f1", elements);
    expect(recs[0].color).toBeUndefined();
  });

  it("ignores junk entries without throwing", () => {
    const junk = [null, "x", 5, [], {}, { id: 123 }, { isDeleted: true }];
    expect(() => boardRecords("f1", junk)).not.toThrow();
    expect(boardRecords("f1", junk)).toEqual([]);
  });

  it("does not list plain rectangles and free text", () => {
    const elements = [
      { id: "rect1", type: "rectangle" },
      { id: "freeText", type: "text", text: "Just floating text" },
    ];
    expect(boardRecords("f1", elements)).toEqual([]);
  });

  describe("snippetOf", () => {
    it("returns note text after the title line", () => {
      const noteRec: LibraryRecord = {
        id: "f1:n1",
        folderId: "f1",
        elementId: "n1",
        kind: "note",
        title: "A",
        autoTitle: "",
        notes: "",
        text: "A\nB  C",
        host: "",
        url: "",
        tagIds: [],
        updated: 0,
      };
      expect(snippetOf(noteRec)).toBe("B C");
    });

    it("truncates card notes longer than 140 chars ending with ellipsis", () => {
      const longNotes = "x".repeat(300);
      const cardRec: LibraryRecord = {
        id: "f1:c1",
        folderId: "f1",
        elementId: "c1",
        kind: "link",
        title: "Title",
        autoTitle: "",
        notes: longNotes,
        text: "",
        host: "example.com",
        url: "https://example.com",
        tagIds: [],
        updated: 0,
      };
      const snippet = snippetOf(cardRec);
      expect(snippet).toHaveLength(140);
      expect(snippet.endsWith("…")).toBe(true);
    });
  });

  describe("linkName", () => {
    it("generates readable titles from URLs", () => {
      expect(linkName("https://www.lonelyplanet.com/india/spiti-valley?x=1", "www.lonelyplanet.com")).toBe(
        "Spiti valley · lonelyplanet.com",
      );
      expect(linkName("https://example.com/", "example.com")).toBe("example.com");
      expect(linkName("https://x.com/posts/12345", "x.com")).toBe("x.com");
      expect(linkName("https://a.org/my_trip-plan.html", "a.org")).toBe("My trip plan · a.org");
      expect(linkName("https://a.org/caf%C3%A9-guide", "a.org")).toBe("Café guide · a.org");
      expect(linkName("https://a.org/%E0%A4%A", "a.org")).toBe("a.org");
    });
  });
});

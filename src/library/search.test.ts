import { describe, expect, it } from "vitest";
import type { LibraryFilters, LibraryNames } from "./search";
import { createLibrarySearch } from "./search";
import type { LibraryRecord } from "./records";

function rec(p: Partial<LibraryRecord> & { id: string }): LibraryRecord {
  return {
    folderId: "f1",
    elementId: p.id,
    kind: "video",
    title: "Default Title",
    autoTitle: "",
    notes: "",
    text: "",
    host: "",
    url: "",
    tagIds: [],
    updated: 0,
    ...p,
  };
}

describe("search", () => {
  const names: LibraryNames = {
    tag: new Map([["t1", "Spiti"]]),
    folder: new Map([
      ["f1", "Day 3 › Spiti"],
      ["f2", "Packing"],
    ]),
  };

  const noFilters: LibraryFilters = {
    kind: "all",
    tagId: null,
    folderIds: null,
  };

  const records: LibraryRecord[] = [
    rec({
      id: "r1",
      folderId: "f1",
      kind: "video",
      title: "Spiti road",
      autoTitle: "",
      notes: "4:10 Kunzum Pass",
      tagIds: ["t1"],
      updated: 100,
    }),
    rec({
      id: "r2",
      folderId: "f1",
      kind: "note",
      title: "Monastery visit",
      text: "Dhankar monastery opens early",
      updated: 200,
    }),
    rec({
      id: "r3",
      folderId: "f2",
      kind: "link",
      title: "Gear list",
      host: "example.com",
      url: "https://example.com/gear",
      notes: "Warm layers",
      updated: 300,
    }),
    rec({
      id: "r4",
      folderId: "f2",
      kind: "note",
      title: "Shoes",
      text: "Hiking boots",
      updated: 50,
    }),
    rec({
      id: "r5",
      folderId: "f1",
      kind: "video",
      title: "River crossing",
      autoTitle: "Chandra river",
      host: "youtube.com",
      updated: 150,
    }),
  ];

  it("empty query returns all records, newest updated first", () => {
    const search = createLibrarySearch(records, names);
    const results = search.search("", noFilters);
    expect(results.map((r) => r.id)).toEqual(["r3", "r2", "r5", "r1", "r4"]);
  });

  it("spit (prefix) finds the record titled Spiti road", () => {
    const search = createLibrarySearch(records, names);
    const results = search.search("spit", noFilters);
    expect(results.some((r) => r.id === "r1")).toBe(true);
    expect(results[0].id).toBe("r1");
  });

  it("kunzum finds a record by its notes", () => {
    const search = createLibrarySearch(records, names);
    const results = search.search("kunzum", noFilters);
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("r1");
  });

  it("dhankar finds a note by its text", () => {
    const search = createLibrarySearch(records, names);
    const results = search.search("dhankar", noFilters);
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("r2");
  });

  it("a tag name (Spiti) finds the tagged record", () => {
    const search = createLibrarySearch(records, names);
    const results = search.search("Spiti", noFilters);
    expect(results.some((r) => r.id === "r1")).toBe(true);
  });

  it("a host (example) finds the link", () => {
    const search = createLibrarySearch(records, names);
    const results = search.search("example", noFilters);
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("r3");
  });

  it("a folder name (packing) finds records in f2", () => {
    const search = createLibrarySearch(records, names);
    const results = search.search("packing", noFilters);
    const ids = results.map((r) => r.id);
    expect(ids).toContain("r3");
    expect(ids).toContain("r4");
  });

  it("typo monastary finds monastery (fuzzy)", () => {
    const search = createLibrarySearch(records, names);
    const results = search.search("monastary", noFilters);
    expect(results.some((r) => r.id === "r2")).toBe(true);
  });

  it("two words are AND-ed (spiti packing → no records unless both match)", () => {
    const search = createLibrarySearch(records, names);
    const results = search.search("spiti packing", noFilters);
    expect(results).toEqual([]);
  });

  it("kind filter note only returns notes", () => {
    const search = createLibrarySearch(records, names);
    const results = search.search("", { ...noFilters, kind: "note" });
    expect(results.map((r) => r.id)).toEqual(["r2", "r4"]);
  });

  it("tagId filter only returns tagged records", () => {
    const search = createLibrarySearch(records, names);
    const results = search.search("", { ...noFilters, tagId: "t1" });
    expect(results.map((r) => r.id)).toEqual(["r1"]);
  });

  it("folderIds filter restricts results to specified folders", () => {
    const search = createLibrarySearch(records, names);
    const results = search.search("", { ...noFilters, folderIds: new Set(["f2"]) });
    expect(results.map((r) => r.id)).toEqual(["r3", "r4"]);
  });

  it("duplicate record ids don't throw and the later one wins", () => {
    const duplicates = [
      rec({ id: "dup", title: "first", updated: 10 }),
      rec({ id: "dup", title: "second", updated: 20 }),
    ];
    const search = createLibrarySearch(duplicates, names);
    expect(search.size).toBe(1);
    const res = search.search("", noFilters);
    expect(res).toHaveLength(1);
    expect(res[0].title).toBe("second");
  });

  it("a query of only punctuation (!!) returns [] without throwing", () => {
    const search = createLibrarySearch(records, names);
    expect(() => search.search("!!", noFilters)).not.toThrow();
    expect(search.search("!!", noFilters)).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import { wsMaps } from "./schema";
import { cleanTagName, ensureTag, findTag, listTags, TAG_COLORS, TAG_LIMIT, TAG_NAME_MAX } from "./tags";

describe("tags", () => {
  it("ensureTag creates and returns an id, listTags shows it", () => {
    const doc = new Y.Doc();
    const id = ensureTag(doc, "mountains");
    expect(id).not.toBeNull();
    const tags = listTags(doc);
    expect(tags).toHaveLength(1);
    expect(tags[0]).toEqual({
      id,
      name: "mountains",
      color: TAG_COLORS[0],
    });
  });

  it("ensureTag(' spiti ') then ensureTag('SPITI') returns the same id (one tag)", () => {
    const doc = new Y.Doc();
    const id1 = ensureTag(doc, " spiti ");
    const id2 = ensureTag(doc, "SPITI");
    expect(id1).not.toBeNull();
    expect(id1).toBe(id2);
    expect(listTags(doc)).toHaveLength(1);
    expect(findTag(doc, "spiti")?.id).toBe(id1);
  });

  it("whitespace is collapsed ('a   b' → 'a b')", () => {
    const doc = new Y.Doc();
    expect(cleanTagName("a   b")).toBe("a b");
    const id = ensureTag(doc, "a   b");
    expect(id).not.toBeNull();
    expect(listTags(doc)[0].name).toBe("a b");
  });

  it("a 50-char name is cut to 30", () => {
    const doc = new Y.Doc();
    const longName = "a".repeat(50);
    const id = ensureTag(doc, longName);
    expect(id).not.toBeNull();
    const tag = listTags(doc)[0];
    expect(tag.name).toBe("a".repeat(TAG_NAME_MAX));
    expect(tag.name).toHaveLength(TAG_NAME_MAX);
  });

  it("'' and '   ' → null", () => {
    const doc = new Y.Doc();
    expect(ensureTag(doc, "")).toBeNull();
    expect(ensureTag(doc, "   ")).toBeNull();
    expect(listTags(doc)).toHaveLength(0);
  });

  it("colours rotate (first two tags get TAG_COLORS[0] and TAG_COLORS[1])", () => {
    const doc = new Y.Doc();
    const id1 = ensureTag(doc, "tag1");
    const id2 = ensureTag(doc, "tag2");
    const tags = listTags(doc);
    const t1 = tags.find((t) => t.id === id1);
    const t2 = tags.find((t) => t.id === id2);
    expect(t1?.color).toBe(TAG_COLORS[0]);
    expect(t2?.color).toBe(TAG_COLORS[1]);
  });

  it("listTags is sorted by name", () => {
    const doc = new Y.Doc();
    ensureTag(doc, "Zebra");
    ensureTag(doc, "apple");
    ensureTag(doc, "Banana");
    const names = listTags(doc).map((t) => t.name);
    expect(names).toEqual(["apple", "Banana", "Zebra"]);
  });

  it("a junk entry and an entry with no name are skipped", () => {
    const doc = new Y.Doc();
    wsMaps(doc).tags.set("x", "nope" as never);

    const noNameRec = new Y.Map<unknown>();
    noNameRec.set("color", TAG_COLORS[0]);
    wsMaps(doc).tags.set("y", noNameRec);

    const emptyNameRec = new Y.Map<unknown>();
    emptyNameRec.set("name", "   ");
    wsMaps(doc).tags.set("z", emptyNameRec);

    expect(listTags(doc)).toHaveLength(0);
  });

  it("an entry with an unknown colour gets TAG_COLORS[7]", () => {
    const doc = new Y.Doc();
    const rec = new Y.Map<unknown>();
    rec.set("name", "custom");
    rec.set("color", "#123456");
    wsMaps(doc).tags.set("custom-id", rec);

    const tags = listTags(doc);
    expect(tags).toHaveLength(1);
    expect(tags[0].color).toBe(TAG_COLORS[7]);
  });

  it("after TAG_LIMIT tags, ensureTag of a new name → null", () => {
    const doc = new Y.Doc();
    for (let i = 0; i < TAG_LIMIT; i++) {
      const res = ensureTag(doc, `tag_${i}`);
      expect(res).not.toBeNull();
    }
    expect(wsMaps(doc).tags.size).toBe(TAG_LIMIT);
    expect(ensureTag(doc, "overflow")).toBeNull();
    // existing tag lookup still returns its id
    expect(ensureTag(doc, "tag_0")).not.toBeNull();
  });
});

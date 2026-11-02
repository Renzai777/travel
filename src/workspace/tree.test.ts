import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import {
  ROOT,
  RECOVERED,
  buildFolderTree,
  createFolder,
  effectiveParents,
  moveNodes,
  readNodes,
  type RawNode,
} from "./tree";

const actor = { memberId: "tester000001" };
const raw = (id: string, parentId: string, order = "a0"): RawNode => ({
  id,
  type: "folder",
  parentId,
  order,
  title: id,
});
const mapOf = (...ns: RawNode[]) => new Map(ns.map((n) => [n.id, n]));
const shuffle = <T>(xs: T[], seed: number): T[] => {
  const a = [...xs];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) % 2 ** 31;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const sync = (from: Y.Doc, to: Y.Doc) => Y.applyUpdate(to, Y.encodeStateAsUpdate(from, Y.encodeStateVector(to)));

describe("effectiveParents", () => {
  it("sends orphans to Recovered", () => {
    const p = effectiveParents(mapOf(raw("aaaaaaaaaaaa", "missing00000")));
    expect(p.get("aaaaaaaaaaaa")).toBe(RECOVERED);
  });

  it("breaks a 2-cycle at the greatest id", () => {
    const p = effectiveParents(mapOf(raw("aaaaaaaaaaaa", "bbbbbbbbbbbb"), raw("bbbbbbbbbbbb", "aaaaaaaaaaaa")));
    expect(p.get("bbbbbbbbbbbb")).toBe(RECOVERED);
    expect(p.get("aaaaaaaaaaaa")).toBe("bbbbbbbbbbbb");
  });

  it("is independent of insertion order (randomized)", () => {
    for (let seed = 1; seed <= 200; seed++) {
      const ids = Array.from({ length: 12 }, (_, i) => `n${String(i).padStart(11, "0")}`);
      const nodes = ids.map((id, i) => raw(id, i === 0 ? ROOT : ids[(i * 7 + seed) % ids.length]));
      const expected = [...effectiveParents(mapOf(...nodes)).entries()].sort();
      for (let k = 0; k < 5; k++) {
        const got = [...effectiveParents(mapOf(...shuffle(nodes, seed * 31 + k))).entries()].sort();
        expect(got).toEqual(expected);
      }
      // no cycles remain: every node reaches ROOT or RECOVERED
      const p = new Map(expected);
      for (const id of ids) {
        let cur: string | undefined = id;
        let steps = 0;
        while (cur !== undefined && cur !== ROOT && cur !== RECOVERED && steps++ < 50) cur = p.get(cur);
        expect(cur === ROOT || cur === RECOVERED).toBe(true); // reached a root, no cycle left
      }
    }
  });
});

describe("concurrent moves across replicas", () => {
  it("A→B and B→A on two devices converge to the same tree regardless of sync order", () => {
    for (const order of ["ab", "ba"]) {
      const base = new Y.Doc();
      const a = createFolder(base, ROOT, "A", actor);
      const b = createFolder(base, ROOT, "B", actor);
      const d1 = new Y.Doc();
      const d2 = new Y.Doc();
      sync(base, d1);
      sync(base, d2);
      moveNodes(d1, [a], { kind: "into", parentId: b }, actor); // device 1: A into B
      moveNodes(d2, [b], { kind: "into", parentId: a }, actor); // device 2: B into A (concurrently)
      if (order === "ab") {
        sync(d1, d2);
        sync(d2, d1);
      } else {
        sync(d2, d1);
        sync(d1, d2);
      }
      const t1 = buildFolderTree(d1);
      const t2 = buildFolderTree(d2);
      expect([...t1.parentOf.entries()].sort()).toEqual([...t2.parentOf.entries()].sort());
      expect(t1.recovered.map((n) => n.id)).toEqual([a > b ? a : b]);
    }
  });

  it("refuses to move a folder into its own descendant", () => {
    const doc = new Y.Doc();
    const a = createFolder(doc, ROOT, "A", actor);
    const b = createFolder(doc, a, "B", actor);
    expect(moveNodes(doc, [a], { kind: "into", parentId: b }, actor)).toEqual([]);
    expect(readNodes(doc).get(a)?.parentId).toBe(ROOT);
  });

  it("orders before/after and keeps keys unique when two devices insert at the same place", () => {
    const base = new Y.Doc();
    const x = createFolder(base, ROOT, "X", actor);
    const y = createFolder(base, ROOT, "Y", actor);
    const d1 = new Y.Doc();
    const d2 = new Y.Doc();
    sync(base, d1);
    sync(base, d2);
    const p = createFolder(d1, ROOT, "P", actor);
    const q = createFolder(d2, ROOT, "Q", actor);
    moveNodes(d1, [p], { kind: "before", siblingId: y }, actor);
    moveNodes(d2, [q], { kind: "before", siblingId: y }, actor);
    sync(d1, d2);
    sync(d2, d1);
    const ids1 = buildFolderTree(d1).roots.map((n) => n.id);
    const ids2 = buildFolderTree(d2).roots.map((n) => n.id);
    expect(ids1).toEqual(ids2);
    expect(ids1[0]).toBe(x);
    expect(ids1[3]).toBe(y);
    // a later insert between the two same-key siblings still works
    const r = createFolder(d1, ROOT, "R", actor);
    expect(moveNodes(d1, [r], { kind: "after", siblingId: ids1[1] }, actor)).toEqual([r]);
  });
});

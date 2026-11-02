import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import { beats, liveCount, readElements, writeElements, type SyncElement } from "./sceneSync";

type El = SyncElement & { x: number };

const el = (id: string, version: number, versionNonce: number, x = 0, isDeleted = false): El => ({
  id,
  version,
  versionNonce,
  isDeleted,
  x,
});

/** What a canvas does on a remote change: keep the local copy if it beats the stored one, else take the stored one. */
function reconcile(local: El[], stored: El[]): El[] {
  const byId = new Map(local.map((e) => [e.id, e]));
  for (const s of stored) {
    const l = byId.get(s.id);
    if (!l || !beats(l, s)) byId.set(s.id, s);
  }
  return [...byId.values()];
}

function sync(a: Y.Doc, b: Y.Doc) {
  Y.applyUpdate(b, Y.encodeStateAsUpdate(a, Y.encodeStateVector(b)));
  Y.applyUpdate(a, Y.encodeStateAsUpdate(b, Y.encodeStateVector(a)));
}

const sorted = (doc: Y.Doc) => readElements<El>(doc).sort((p, q) => p.id.localeCompare(q.id));

describe("beats", () => {
  it("prefers the higher version, then the lower nonce", () => {
    expect(beats(el("a", 2, 9), el("a", 1, 1))).toBe(true);
    expect(beats(el("a", 1, 1), el("a", 2, 9))).toBe(false);
    expect(beats(el("a", 3, 1), el("a", 3, 2))).toBe(true);
    expect(beats(el("a", 3, 2), el("a", 3, 1))).toBe(false);
    expect(beats(el("a", 3, 2), el("a", 3, 2))).toBe(false);
  });
});

describe("writeElements", () => {
  it("writes only new or winning copies", () => {
    const doc = new Y.Doc();
    expect(writeElements(doc, [el("a", 1, 5), el("b", 1, 5)])).toBe(2);
    expect(writeElements(doc, [el("a", 1, 5), el("b", 1, 5)])).toBe(0); // unchanged
    expect(writeElements(doc, [el("a", 0, 1)])).toBe(0); // stale copy never overwrites
    expect(writeElements(doc, [el("a", 2, 7, 50)])).toBe(1);
    expect(readElements<El>(doc).find((e) => e.id === "a")?.x).toBe(50);
  });

  it("counts live elements, ignoring tombstones", () => {
    expect(liveCount([el("a", 1, 1), el("b", 2, 1, 0, true), el("c", 1, 1)])).toBe(2);
  });
});

describe("two replicas", () => {
  it("converge after concurrent edits to the same and to different elements", () => {
    for (let round = 0; round < 200; round++) {
      const a = new Y.Doc();
      const b = new Y.Doc();
      writeElements(a, [el("shared", 1, 10), el("other", 1, 10)]);
      sync(a, b);

      // Concurrent: both move "shared"; A deletes "other"; B adds "new".
      const va = 2 + (round % 3);
      const vb = 2 + ((round * 7) % 3);
      let sceneA = reconcile(sorted(a), []);
      let sceneB = reconcile(sorted(b), []);
      sceneA = sceneA.map((e) =>
        e.id === "shared" ? el("shared", va, round, 100) : e.id === "other" ? el("other", 2, 3, 0, true) : e,
      );
      sceneB = sceneB.map((e) => (e.id === "shared" ? el("shared", vb, 1000 - round, 200) : e));
      sceneB.push(el("new", 1, 4));
      writeElements(a, sceneA);
      writeElements(b, sceneB);

      // Deliver in a random order, then each canvas reconciles and writes back what it holds that beats the store.
      if (round % 2) sync(a, b);
      else sync(b, a);
      sceneA = reconcile(sceneA, sorted(a));
      sceneB = reconcile(sceneB, sorted(b));
      writeElements(a, sceneA);
      writeElements(b, sceneB);
      sync(a, b);
      sceneA = reconcile(sceneA, sorted(a));
      sceneB = reconcile(sceneB, sorted(b));

      expect(sorted(a)).toEqual(sorted(b));
      const byId = (s: El[]) => new Map(s.map((e) => [e.id, e]));
      expect(byId(sceneA)).toEqual(byId(sceneB));

      const winner = beats(el("shared", va, round), el("shared", vb, 1000 - round)) ? 100 : 200;
      expect(byId(sceneA).get("shared")?.x).toBe(winner);
      expect(byId(sceneA).get("other")?.isDeleted).toBe(true); // deletions never come back
      expect(byId(sceneA).has("new")).toBe(true);
    }
  });
});

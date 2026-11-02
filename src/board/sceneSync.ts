import * as Y from "yjs";

/**
 * Yjs storage for one canvas board (docs/plans/epic-3-canvas.md, "Data model").
 * `elements: Y.Map<elementId, element JSON>`; deleted elements stay as tombstones (`isDeleted: true`).
 *
 * Merge rule (the same one Excalidraw's `reconcileElements` uses): of two copies of an element, the higher `version` wins; on a tie, the
 * lower `versionNonce` wins. Every replica only ever writes a copy that beats the stored one, so the stored value can only move "up" and all
 * replicas converge on the winning copy. Edits to different elements always merge.
 *
 * This file has no Excalidraw import, so it can be unit-tested in Node.
 */

/** Transaction origin for writes coming from this tab's own canvas (its observer ignores them, so there is no feedback loop). */
export const LOCAL_ORIGIN = Symbol("board-local");

/** The fields of an Excalidraw element the sync layer needs. */
export type SyncElement = { id: string; version: number; versionNonce: number; isDeleted: boolean };

export const elementsMap = <E extends SyncElement>(doc: Y.Doc): Y.Map<E> => doc.getMap<E>("elements");

/** True when copy `a` beats copy `b` of the same element. */
export function beats(a: SyncElement, b: SyncElement): boolean {
  return a.version > b.version || (a.version === b.version && a.versionNonce < b.versionNonce);
}

/** Stores every element that is new or beats the stored copy, in one transaction. Returns how many were written. */
export function writeElements<E extends SyncElement>(
  doc: Y.Doc,
  elements: readonly E[],
  origin: unknown = LOCAL_ORIGIN,
): number {
  const map = elementsMap<E>(doc);
  const changed = elements.filter((el) => {
    const stored = map.get(el.id);
    return !stored || beats(el, stored);
  });
  if (changed.length > 0) {
    doc.transact(() => {
      for (const el of changed) map.set(el.id, toPlain(el));
    }, origin);
  }
  return changed.length;
}

/** All stored elements, tombstones included. */
export function readElements<E extends SyncElement>(doc: Y.Doc): E[] {
  return [...elementsMap<E>(doc).values()];
}

/** Number of elements that are not deleted (for the board size limits). */
export function liveCount(elements: readonly SyncElement[]): number {
  return elements.reduce((n, el) => (el.isDeleted ? n : n + 1), 0);
}

/** Excalidraw elements are frozen class-less objects; store a plain JSON copy (drops undefined values). */
function toPlain<E>(el: E): E {
  return JSON.parse(JSON.stringify(el)) as E;
}

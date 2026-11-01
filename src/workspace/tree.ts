import * as Y from "yjs";
import { generateKeyBetween, generateNKeysBetween } from "fractional-indexing";
import { newId } from "./ids";
import { wsMaps } from "./schema";

/** Parent id of top-level nodes. */
export const ROOT = "root";
/** Virtual folder (never stored) for nodes whose parent is missing, or whose move formed a cycle. */
export const RECOVERED = "__recovered";

export type NodeType = "folder" | "board" | "video" | "link" | "note" | "image" | "pdf";
export type RawNode = { id: string; type: NodeType; parentId: string; order: string; title: string };
export type FolderNode = { id: string; title: string; parentId: string; children: FolderNode[] };
export type FolderTree = {
  roots: FolderNode[];
  recovered: FolderNode[];
  byId: Map<string, FolderNode>;
  /** Effective parent of every live node after orphan handling and cycle repair. */
  parentOf: Map<string, string>;
};

const NODE_TYPES = new Set<string>(["folder", "board", "video", "link", "note", "image", "pdf"]);
const isValidKey = (k: unknown): k is string => {
  if (typeof k !== "string" || k === "") return false;
  try {
    generateKeyBetween(k, null);
    return true;
  } catch {
    return false;
  }
};

/** Live nodes (not trashed, not purged) read from the doc. Malformed fields get safe defaults. */
export function readNodes(doc: Y.Doc): Map<string, RawNode> {
  const out = new Map<string, RawNode>();
  wsMaps(doc).nodes.forEach((m, id) => {
    if (!(m instanceof Y.Map)) return;
    if (m.get("purged") === true || m.get("trashedAt")) return;
    const type = m.get("type");
    if (typeof type !== "string" || !NODE_TYPES.has(type)) return;
    const parentId = m.get("parentId");
    const order = m.get("order");
    out.set(id, {
      id,
      type: type as NodeType,
      parentId: typeof parentId === "string" ? parentId : ROOT,
      order: isValidKey(order) ? order : "",
      title: typeof m.get("title") === "string" && String(m.get("title")).trim() ? String(m.get("title")) : "Untitled",
    });
  });
  return out;
}

/**
 * Effective parents, computed identically on every device from ids only (no clocks, no arrival order):
 * 1. a node whose parent is missing or isn't a folder goes under RECOVERED;
 * 2. every cycle (only possible after concurrent moves) is broken at its lexicographically greatest id, which goes under RECOVERED.
 * Nothing is written back; a later normal move by the user resolves it for real.
 */
export function effectiveParents(nodes: Map<string, RawNode>): Map<string, string> {
  const parent = new Map<string, string>();
  for (const n of nodes.values()) {
    const p = n.parentId;
    parent.set(n.id, p === ROOT || nodes.get(p)?.type === "folder" ? p : RECOVERED);
  }
  const state = new Map<string, 1 | 2>(); // 1 = on the current path, 2 = done
  for (const start of [...parent.keys()].sort()) {
    if (state.get(start) === 2) continue;
    const path: string[] = [];
    let cur: string | undefined = start;
    while (cur !== undefined && cur !== ROOT && cur !== RECOVERED && state.get(cur) !== 2) {
      if (state.get(cur) === 1) {
        const cycle = path.slice(path.indexOf(cur));
        const loser = cycle.reduce((a, b) => (a > b ? a : b));
        parent.set(loser, RECOVERED);
        break;
      }
      state.set(cur, 1);
      path.push(cur);
      cur = parent.get(cur);
    }
    for (const p of path) state.set(p, 2);
  }
  return parent;
}

/** Sibling order: fractional key, then id (two devices may generate the same key concurrently). */
export const compareNodes = (a: RawNode, b: RawNode): number =>
  a.order === b.order ? (a.id < b.id ? -1 : a.id > b.id ? 1 : 0) : a.order < b.order ? -1 : 1;

/** Children of `parentId` (effective), sorted. */
export function childrenOf(nodes: Map<string, RawNode>, parentOf: Map<string, string>, parentId: string): RawNode[] {
  return [...nodes.values()].filter((n) => parentOf.get(n.id) === parentId).sort(compareNodes);
}

/** The folder tree for the sidebar / move dialog (folders only). */
export function buildFolderTree(doc: Y.Doc): FolderTree {
  const nodes = readNodes(doc);
  const parentOf = effectiveParents(nodes);
  const byId = new Map<string, FolderNode>();
  const build = (parentId: string): FolderNode[] =>
    childrenOf(nodes, parentOf, parentId)
      .filter((n) => n.type === "folder")
      .map((n) => {
        const node: FolderNode = { id: n.id, title: n.title, parentId, children: [] };
        byId.set(n.id, node);
        node.children = build(n.id);
        return node;
      });
  return { roots: build(ROOT), recovered: build(RECOVERED), byId, parentOf };
}

/** True if `ancestorId` is `id` itself or one of its (effective) ancestors. */
export function isSelfOrAncestor(parentOf: Map<string, string>, ancestorId: string, id: string): boolean {
  let cur: string | undefined = id;
  for (let guard = 0; cur !== undefined && guard < 10_000; guard++) {
    if (cur === ancestorId) return true;
    if (cur === ROOT || cur === RECOVERED) return false;
    cur = parentOf.get(cur);
  }
  return false;
}

/** Path from the root to `id` (inclusive), for breadcrumbs. */
export function pathTo(tree: FolderTree, id: string): FolderNode[] {
  const out: FolderNode[] = [];
  let cur = tree.byId.get(id);
  for (let guard = 0; cur && guard < 10_000; guard++) {
    out.unshift(cur);
    cur = tree.byId.get(cur.parentId);
  }
  return out;
}

/** n keys strictly after `prev` and before the first sibling key greater than `prev` (equal keys are skipped). */
function keysAfter(siblings: RawNode[], prev: string | null, n: number): string[] {
  const next = siblings.find((s) => s.order !== "" && (prev === null || s.order > prev))?.order ?? null;
  try {
    return generateNKeysBetween(prev, next, n);
  } catch {
    return generateNKeysBetween(prev, null, n);
  }
}

export type MoveTarget = { kind: "into"; parentId: string } | { kind: "before" | "after"; siblingId: string };

type Actor = { memberId: string };

const touch = (m: Y.Map<unknown>, actor: Actor): void => {
  m.set("updatedBy", actor.memberId);
  m.set("updatedAt", Date.now());
};

/** Create a folder at the end of `parentId`. Returns its id. */
export function createFolder(doc: Y.Doc, parentId: string, title: string, actor: Actor): string {
  const nodes = readNodes(doc);
  const parentOf = effectiveParents(nodes);
  const siblings = childrenOf(nodes, parentOf, parentId);
  const last = siblings.length ? siblings[siblings.length - 1].order || null : null;
  const [order] = keysAfter([], last, 1);
  const id = newId();
  doc.transact(() => {
    const m = new Y.Map<unknown>();
    wsMaps(doc).nodes.set(id, m);
    m.set("type", "folder");
    m.set("parentId", parentId);
    m.set("order", order);
    m.set("title", title.trim().slice(0, 120) || "New folder");
    m.set("createdBy", actor.memberId);
    m.set("createdAt", Date.now());
    touch(m, actor);
  });
  return id;
}

export function renameNode(doc: Y.Doc, id: string, title: string, actor: Actor): void {
  const m = wsMaps(doc).nodes.get(id);
  const clean = title.trim().slice(0, 120);
  if (!(m instanceof Y.Map) || !clean || m.get("title") === clean) return;
  doc.transact(() => {
    m.set("title", clean);
    touch(m, actor);
  });
}

/**
 * Move nodes (kept in their current visual order) into a folder (appended) or before/after a sibling.
 * Refuses moves that would put a folder inside itself or one of its descendants. Returns the ids actually moved.
 */
export function moveNodes(doc: Y.Doc, ids: string[], target: MoveTarget, actor: Actor): string[] {
  const nodes = readNodes(doc);
  const parentOf = effectiveParents(nodes);
  const parentId = target.kind === "into" ? target.parentId : parentOf.get(target.siblingId);
  if (parentId === undefined || parentId === RECOVERED) return [];
  if (parentId !== ROOT && nodes.get(parentId)?.type !== "folder") return [];
  const moving = ids
    .map((id) => nodes.get(id))
    .filter((n): n is RawNode => n !== undefined)
    .filter((n) => !(parentId !== ROOT && isSelfOrAncestor(parentOf, n.id, parentId)))
    .filter((n) => target.kind === "into" || n.id !== target.siblingId)
    .sort(compareNodes);
  if (moving.length === 0) return [];
  const movingIds = new Set(moving.map((n) => n.id));
  const siblings = childrenOf(nodes, parentOf, parentId).filter((n) => !movingIds.has(n.id));
  let prev: string | null;
  let rest: RawNode[];
  if (target.kind === "into") {
    prev = siblings.length ? siblings[siblings.length - 1].order || null : null;
    rest = [];
  } else {
    const i = siblings.findIndex((n) => n.id === target.siblingId);
    if (i < 0) return [];
    const at = target.kind === "before" ? i : i + 1;
    prev = at > 0 ? siblings[at - 1].order || null : null;
    rest = siblings.slice(at);
  }
  const keys = keysAfter(rest, prev, moving.length);
  doc.transact(() => {
    moving.forEach((n, k) => {
      const m = wsMaps(doc).nodes.get(n.id);
      if (!(m instanceof Y.Map)) return;
      m.set("parentId", parentId);
      m.set("order", keys[k]);
      touch(m, actor);
    });
  });
  return moving.map((n) => n.id);
}

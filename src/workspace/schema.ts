import * as Y from "yjs";

export const SCHEMA_VERSION = 1;

/** Top-level shared types of the `ws:` structure doc. */
export function wsMaps(doc: Y.Doc) {
  return {
    meta: doc.getMap<unknown>("meta"), // title, createdAt, createdBy, schemaVersion
    nodes: doc.getMap<Y.Map<unknown>>("nodes"), // used from E3-S2
    tags: doc.getMap<Y.Map<unknown>>("tags"),
    members: doc.getMap<Y.Map<unknown>>("members"),
    activity: doc.getMap<Y.Map<unknown>>("activity"),
  };
}

/** Initialise a new workspace (idempotent: only sets fields that are missing). */
export function initWorkspace(doc: Y.Doc, title: string, createdBy: string): void {
  const { meta } = wsMaps(doc);
  doc.transact(() => {
    if (!meta.has("schemaVersion")) meta.set("schemaVersion", SCHEMA_VERSION);
    if (!meta.has("createdAt")) meta.set("createdAt", Date.now());
    if (!meta.has("createdBy")) meta.set("createdBy", createdBy);
    if (!meta.has("title")) meta.set("title", title);
  });
}

export const getTitle = (doc: Y.Doc): string => {
  const t = wsMaps(doc).meta.get("title");
  return typeof t === "string" && t.trim() ? t : "Untitled trip";
};

export function setTitle(doc: Y.Doc, title: string): void {
  const clean = title.trim().slice(0, 80);
  if (clean) wsMaps(doc).meta.set("title", clean);
}

/** Register or update this device's member (a nested Y.Map, so a concurrent rename and recolour both survive). */
export function upsertMember(doc: Y.Doc, m: { id: string; name: string; color: string }): void {
  const { members } = wsMaps(doc);
  doc.transact(() => {
    let rec = members.get(m.id);
    if (!rec) {
      rec = new Y.Map<unknown>();
      members.set(m.id, rec);
      rec.set("joinedAt", Date.now());
    }
    if (rec.get("name") !== m.name) rec.set("name", m.name);
    if (rec.get("color") !== m.color) rec.set("color", m.color);
  });
}

export type MemberView = { id: string; name: string; color: string; joinedAt: number };
export function listMembers(doc: Y.Doc): MemberView[] {
  const out: MemberView[] = [];
  wsMaps(doc).members.forEach((rec, id) => {
    out.push({
      id,
      name: String(rec.get("name") ?? "Someone"),
      color: String(rec.get("color") ?? "#888888"),
      joinedAt: Number(rec.get("joinedAt") ?? 0),
    });
  });
  return out.sort((a, b) => a.joinedAt - b.joinedAt || a.id.localeCompare(b.id));
}

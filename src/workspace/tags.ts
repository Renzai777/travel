import * as Y from "yjs";
import { newId } from "./ids";
import { wsMaps } from "./schema";

export const TAG_NAME_MAX = 30;
export const TAG_LIMIT = 200;

/** Pastel chip colours (dark text stays readable on all of them, in both themes). */
export const TAG_COLORS = [
  "#ffd8a8",
  "#b2f2bb",
  "#a5d8ff",
  "#d0bfff",
  "#fcc2d7",
  "#ffec99",
  "#c3fae8",
  "#dee2e6",
] as const;

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export const cleanTagName = (name: string): string => name.replace(/\s+/g, " ").trim().slice(0, TAG_NAME_MAX);

/** All tags of a workspace, sorted by name (stored data is untrusted: bad entries are skipped). */
export function listTags(doc: Y.Doc): Tag[] {
  const out: Tag[] = [];
  wsMaps(doc).tags.forEach((rec, id) => {
    if (!(rec instanceof Y.Map)) return;
    const name = rec.get("name");
    const color = rec.get("color");
    if (typeof name !== "string" || !cleanTagName(name)) return;
    out.push({
      id,
      name: cleanTagName(name),
      color: typeof color === "string" && (TAG_COLORS as readonly string[]).includes(color) ? color : TAG_COLORS[7],
    });
  });
  return out.sort(
    (a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }) || a.id.localeCompare(b.id),
  );
}

/** The tag with this name (case-insensitive), or null. */
export function findTag(doc: Y.Doc, name: string): Tag | null {
  const want = cleanTagName(name).toLocaleLowerCase();
  return listTags(doc).find((t) => t.name.toLocaleLowerCase() === want) ?? null;
}

/** Returns the id of the tag called `name`, creating it (next colour in turn) when it doesn't exist. Null for an empty name or when full. */
export function ensureTag(doc: Y.Doc, name: string): string | null {
  const clean = cleanTagName(name);
  if (!clean) return null;
  const existing = findTag(doc, clean);
  if (existing) return existing.id;
  const { tags } = wsMaps(doc);
  if (tags.size >= TAG_LIMIT) return null;
  const id = newId();
  doc.transact(() => {
    const rec = new Y.Map<unknown>();
    rec.set("name", clean);
    rec.set("color", TAG_COLORS[tags.size % TAG_COLORS.length]);
    rec.set("createdAt", Date.now());
    tags.set(id, rec);
  });
  return id;
}

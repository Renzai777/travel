import MiniSearch from "minisearch";
import type { LibraryKind, LibraryRecord } from "./records";

export interface LibraryFilters {
  kind: LibraryKind | "all";
  tagId: string | null;
  /** Folders to include (a folder and its subfolders), or null for all. */
  folderIds: ReadonlySet<string> | null;
}

export interface LibraryNames {
  tag: ReadonlyMap<string, string>;
  folder: ReadonlyMap<string, string>;
}

type SearchDoc = {
  id: string;
  title: string;
  autoTitle: string;
  tags: string;
  notes: string;
  text: string;
  host: string;
  folder: string;
  section: string;
};

const recentFirst = (a: LibraryRecord, b: LibraryRecord) => b.updated - a.updated || a.id.localeCompare(b.id);

/** A MiniSearch index over the records (title, fetched title, tag names, notes, note text, host, folder path). */
export function createLibrarySearch(records: readonly LibraryRecord[], names: LibraryNames) {
  const byId = new Map<string, LibraryRecord>();
  for (const r of records) byId.set(r.id, r);
  const all = [...byId.values()];

  const index = new MiniSearch<SearchDoc>({
    fields: ["title", "autoTitle", "tags", "notes", "text", "host", "folder", "section"],
    storeFields: [],
    searchOptions: {
      boost: { title: 3, autoTitle: 2, tags: 2, folder: 1.5, section: 1.5 },
      prefix: true,
      fuzzy: (term) => (term.length > 3 ? 0.2 : false),
      combineWith: "AND",
    },
  });
  index.addAll(
    all.map((r) => ({
      id: r.id,
      title: r.title,
      autoTitle: r.autoTitle,
      tags: r.tagIds.map((t) => names.tag.get(t) ?? "").join(" "),
      notes: r.notes,
      text: r.text,
      host: r.host,
      folder: names.folder.get(r.folderId) ?? "",
      section: r.section,
    })),
  );

  return {
    size: all.length,
    /** Matching records, best match first; with an empty query, everything that passes the filters, most recently edited first. */
    search(query: string, filters: LibraryFilters): LibraryRecord[] {
      const pass = (r: LibraryRecord) =>
        (filters.kind === "all" || r.kind === filters.kind) &&
        (!filters.tagId || r.tagIds.includes(filters.tagId)) &&
        (!filters.folderIds || filters.folderIds.has(r.folderId));
      const q = query.trim();
      if (!q) return all.filter(pass).sort(recentFirst);
      return index
        .search(q)
        .map((hit) => byId.get(String(hit.id)))
        .filter((r): r is LibraryRecord => r !== undefined && pass(r));
    },
  };
}

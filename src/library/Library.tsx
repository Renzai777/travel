import { useMemo, useState, type MouseEvent } from "react";
import {
  Button,
  Input,
  ListBox,
  ListBoxItem,
  Popover,
  SearchField,
  Select,
  SelectValue,
  ToggleButton,
  ToggleButtonGroup,
} from "react-aria-components";
import type * as Y from "yjs";
import { appNavigate } from "../routing/location";
import { isSelfOrAncestor, pathTo, type FolderNode, type FolderTree } from "../workspace/tree";
import { useTags } from "../workspace/useTags";
import { focusPath } from "../workspace/wsRoutes";
import { snippetOf, type LibraryKind } from "./records";
import { createLibrarySearch } from "./search";
import { useBoardRecords } from "./useBoardRecords";
import "./library.css";

const PAGE = 60;
type KindFilter = LibraryKind | "all";
const KINDS: { id: KindFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "video", label: "Videos" },
  { id: "link", label: "Links" },
  { id: "note", label: "Notes" },
];

export interface LibraryProps {
  wsId: string;
  wsDoc: Y.Doc;
  tree: FolderTree;
}

export default function Library({ wsId, wsDoc, tree }: LibraryProps) {
  const tags = useTags(wsDoc);
  const folderIds = useMemo(() => [...tree.byId.keys()].sort(), [tree]);
  const { records, pending, failed } = useBoardRecords(wsId, folderIds);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<KindFilter>("all");
  const [tagId, setTagId] = useState<string | null>(null);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [shown, setShown] = useState(PAGE);

  const folderLabel = useMemo(
    () =>
      new Map(
        [...tree.byId.keys()].map((id) => [
          id,
          pathTo(tree, id)
            .map((n) => n.title)
            .join(" › "),
        ]),
      ),
    [tree],
  );
  const tagById = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags]);

  const activeFolder = folderId && tree.byId.has(folderId) ? folderId : null;
  const activeTag = tagId && tagById.has(tagId) ? tagId : null;

  const folderOptions = useMemo(() => {
    const out: { id: string; title: string; depth: number }[] = [];
    const walk = (nodes: readonly FolderNode[], depth: number) => {
      for (const node of nodes) {
        out.push({ id: node.id, title: node.title, depth });
        if (node.children.length > 0) walk(node.children, depth + 1);
      }
    };
    walk(tree.roots, 0);
    walk(tree.recovered, 0);
    return out;
  }, [tree]);

  const search = useMemo(
    () =>
      createLibrarySearch([...records.values()].flat(), {
        tag: new Map(tags.map((t) => [t.id, t.name])),
        folder: folderLabel,
      }),
    [records, tags, folderLabel],
  );

  const scope = useMemo(
    () =>
      activeFolder
        ? new Set([...tree.byId.keys()].filter((id) => isSelfOrAncestor(tree.parentOf, activeFolder, id)))
        : null,
    [activeFolder, tree],
  );

  const results = useMemo(
    () => search.search(query, { kind, tagId: activeTag, folderIds: scope }),
    [search, query, kind, activeTag, scope],
  );

  const clearAll = () => {
    setQuery("");
    setKind("all");
    setTagId(null);
    setFolderId(null);
    setShown(PAGE);
  };

  const go = (e: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    appNavigate(href);
  };

  return (
    <section className="lib" aria-labelledby="lib-heading">
      <div className="lib-head">
        <h3 id="lib-heading" className="ws-section-title">
          Everything in this trip
        </h3>
        <p className="lib-status" role="status">
          {pending > 0
            ? `Reading boards… ${folderIds.length - pending} of ${folderIds.length}`
            : `${search.size} items`}
          {failed > 0 ? ` · ${failed} board(s) couldn't be read` : ""}
        </p>
      </div>
      <SearchField
        className="lib-search"
        aria-label="Search the trip"
        value={query}
        onChange={(v) => {
          setQuery(v);
          setShown(PAGE);
        }}
      >
        <Input className="lib-search-input" placeholder="Search titles, tags, notes, places…" />
        <Button className="lib-search-clear" aria-label="Clear search">
          ×
        </Button>
      </SearchField>
      <div className="lib-filters">
        <ToggleButtonGroup
          className="lib-kinds"
          aria-label="Type"
          selectionMode="single"
          disallowEmptySelection
          selectedKeys={[kind]}
          onSelectionChange={(keys) => {
            const k = [...keys][0];
            if (k) {
              setKind(String(k) as KindFilter);
              setShown(PAGE);
            }
          }}
        >
          {KINDS.map((k) => (
            <ToggleButton key={k.id} id={k.id} className="lib-kind">
              {k.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        {tags.length > 0 && (
          <Select
            className="lib-select"
            aria-label="Tag"
            value={activeTag ?? "__any"}
            onChange={(k) => {
              setTagId(k === "__any" || k == null ? null : String(k));
              setShown(PAGE);
            }}
          >
            <Button className="lib-select-button">
              <SelectValue />
              <span aria-hidden="true">▾</span>
            </Button>
            <Popover className="react-aria-Popover lib-popover">
              <ListBox className="react-aria-ListBox lib-listbox">
                <ListBoxItem id="__any" className="react-aria-ListBoxItem lib-option">
                  Any tag
                </ListBoxItem>
                {tags.map((t) => (
                  <ListBoxItem key={t.id} id={t.id} textValue={t.name} className="react-aria-ListBoxItem lib-option">
                    <span className="lib-swatch" style={{ background: t.color }} aria-hidden="true" />
                    {t.name}
                  </ListBoxItem>
                ))}
              </ListBox>
            </Popover>
          </Select>
        )}
        {folderOptions.length > 0 && (
          <Select
            className="lib-select"
            aria-label="Folder"
            value={activeFolder ?? "__all"}
            onChange={(k) => {
              setFolderId(k === "__all" || k == null ? null : String(k));
              setShown(PAGE);
            }}
          >
            <Button className="lib-select-button">
              <SelectValue />
              <span aria-hidden="true">▾</span>
            </Button>
            <Popover className="react-aria-Popover lib-popover">
              <ListBox className="lib-listbox">
                <ListBoxItem id="__all" className="lib-option">
                  All folders
                </ListBoxItem>
                {folderOptions.map((f) => (
                  <ListBoxItem key={f.id} id={f.id} textValue={f.title} className="lib-option">
                    <span style={{ paddingInlineStart: `${f.depth * 0.9}rem` }}>{f.title}</span>
                  </ListBoxItem>
                ))}
              </ListBox>
            </Popover>
          </Select>
        )}
      </div>

      {search.size === 0 && pending === 0 && (
        <p className="ws-empty">
          Nothing collected yet. Open a folder and paste a YouTube or web link, or add a sticky note — it shows up here,
          searchable.
        </p>
      )}

      {search.size > 0 && results.length === 0 && (
        <>
          <p className="ws-empty">No matches{query.trim() ? ` for “${query.trim()}”` : ""}.</p>
          <button type="button" className="lib-more" onClick={clearAll}>
            Clear search and filters
          </button>
        </>
      )}

      {results.length > 0 && (
        <>
          <ul className="lib-results">
            {results.slice(0, shown).map((r) => {
              const href = focusPath(wsId, r.folderId, r.elementId);
              const kindLabel =
                r.kind === "video"
                  ? r.provider === "youtube"
                    ? "YouTube"
                    : "Vimeo"
                  : r.kind === "link"
                    ? r.host
                    : "Note";
              const snippet = snippetOf(r);
              const knownTags = r.tagIds
                .map((tid) => tagById.get(tid))
                .filter((t): t is (typeof tags)[number] => Boolean(t));

              return (
                <li key={r.id}>
                  <a className="lib-item" href={href} onClick={(e) => go(e, href)}>
                    <span
                      className={`lib-thumb lib-thumb-${r.kind}`}
                      style={r.kind === "note" && r.color ? { background: r.color } : undefined}
                      aria-hidden="true"
                    >
                      {r.thumbnail ? (
                        <img src={r.thumbnail} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" />
                      ) : r.kind === "video" ? (
                        "▶"
                      ) : r.kind === "link" ? (
                        "🔗"
                      ) : null}
                    </span>
                    <span className="lib-body">
                      <span className="lib-title">{r.title}</span>
                      <span className="lib-meta">
                        {kindLabel} · <span aria-hidden="true">📁</span> {folderLabel.get(r.folderId) ?? "Folder"}
                      </span>
                      {snippet && <span className="lib-snippet">{snippet}</span>}
                      {knownTags.length > 0 && (
                        <span className="lib-tags">
                          {knownTags.slice(0, 3).map((t) => (
                            <span key={t.id} className="board-tag board-tag-small" style={{ background: t.color }}>
                              {t.name}
                            </span>
                          ))}
                          {knownTags.length > 3 && (
                            <span className="board-tag board-tag-small board-tag-more">+{knownTags.length - 3}</span>
                          )}
                        </span>
                      )}
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
          {results.length > shown && (
            <button type="button" className="lib-more" onClick={() => setShown((n) => n + PAGE)}>
              Show more ({results.length - shown} left)
            </button>
          )}
        </>
      )}
    </section>
  );
}

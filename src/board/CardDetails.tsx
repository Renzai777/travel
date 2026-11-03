import type { ExcalidrawEmbeddableElement, NonDeleted } from "@excalidraw/excalidraw/element/types";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { useEffect, useId, useRef, useState, type Key, type RefObject } from "react";
import { ComboBox, Input, ListBox, ListBoxItem, Popover } from "react-aria-components";
import type * as Y from "yjs";
import { cleanTagName, ensureTag, type Tag } from "../workspace/tags";
import { CARD_TAGS_MAX } from "./cardDetails";
import { cardData, setCardDetails } from "./cards";
import { useBoardTags } from "./tagsContext";
import { parseCardUrl } from "./urls";

export interface CardDetailsProps {
  element: NonDeleted<ExcalidrawEmbeddableElement>;
  apiRef: RefObject<ExcalidrawImperativeAPI | null>;
  wsDoc: Y.Doc;
  onClose: () => void;
}

interface TagItem {
  id: string;
  name: string;
  color?: string;
}

export function CardDetails({ element, apiRef, wsDoc, onClose }: CardDetailsProps) {
  const data = cardData(element);
  const parsed = parseCardUrl(element.link ?? "");
  const tags = useBoardTags();

  const titleId = useId();
  const notesId = useId();

  const titleInputRef = useRef<HTMLInputElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const notesDraftRef = useRef(data?.notes ?? "");
  const lastSavedNotesRef = useRef(data?.notes ?? "");

  const [query, setQuery] = useState("");
  const [tagLimitError, setTagLimitError] = useState(false);

  useEffect(() => {
    if (data?.notes !== undefined) {
      lastSavedNotesRef.current = data.notes;
      if (notesRef.current && document.activeElement !== notesRef.current) {
        notesRef.current.value = data.notes;
        notesDraftRef.current = data.notes;
      }
    }
  }, [data?.notes]);

  useEffect(() => {
    if (data?.title !== undefined && titleInputRef.current && document.activeElement !== titleInputRef.current) {
      titleInputRef.current.value = data.title;
    }
  }, [data?.title]);

  useEffect(() => {
    const elId = element.id;
    const api = apiRef.current; // set once when Excalidraw mounts, before any card can be selected
    return () => {
      if (notesDraftRef.current !== lastSavedNotesRef.current && api) {
        setCardDetails(api, elId, { notes: notesDraftRef.current });
      }
    };
  }, [element.id, apiRef]);

  if (!data || !parsed) return null;

  const isVideo = parsed.kind === "video" && data.kind !== "link";
  const providerLabel = parsed.kind === "video" ? (parsed.value.provider === "youtube" ? "YouTube" : "Vimeo") : "";
  const fallback = isVideo ? (parsed.value.provider === "youtube" ? "YouTube video" : "Vimeo video") : parsed.value.url;
  const autoTitle = isVideo ? data.autoTitle : undefined;

  const assignedTags = data.tags.map((id) => tags.find((t) => t.id === id)).filter((t): t is Tag => Boolean(t));

  const cleanQuery = cleanTagName(query);
  const q = query.toLocaleLowerCase();
  const matchingTags = tags.filter((t) => !data.tags.includes(t.id) && t.name.toLocaleLowerCase().includes(q));
  const exactMatch =
    cleanQuery !== "" && tags.some((t) => t.name.toLocaleLowerCase() === cleanQuery.toLocaleLowerCase());

  const items: TagItem[] = matchingTags.map((t) => ({ id: t.id, name: t.name, color: t.color }));
  if (cleanQuery !== "" && !exactMatch) {
    items.push({ id: "__new__", name: `Create “${cleanQuery}”` });
  }

  const saveTags = (newIds: string[]) => {
    if (apiRef.current) {
      setCardDetails(apiRef.current, element.id, { tags: newIds });
    }
  };

  const pick = (key: Key | null) => {
    if (key === null) return;
    const id = key === "__new__" ? ensureTag(wsDoc, query) : String(key);
    setTagLimitError(!id);
    if (id && !data.tags.includes(id)) {
      saveTags([...data.tags, id]);
    }
    setQuery("");
  };

  const handleInputChange = (val: string) => {
    setQuery(val);
    if (tagLimitError) setTagLimitError(false);
  };

  const saveNotes = (val: string) => {
    if (val !== lastSavedNotesRef.current && apiRef.current) {
      lastSavedNotesRef.current = val;
      setCardDetails(apiRef.current, element.id, { notes: val });
    }
  };

  return (
    <aside
      className="board-details"
      aria-label="Card details"
      onKeyDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <header className="board-details-head">
        <span className="board-details-kind">{isVideo ? `${providerLabel} video` : parsed.value.hostname}</span>
        <button type="button" className="board-details-close" aria-label="Close details" onClick={onClose}>
          ×
        </button>
      </header>

      <label htmlFor={titleId}>Title</label>
      <input
        id={titleId}
        ref={titleInputRef}
        className="board-details-input"
        defaultValue={data.title}
        placeholder={autoTitle || fallback}
        maxLength={300}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.currentTarget.blur();
          } else if (e.key === "Escape") {
            e.currentTarget.value = data.title;
            e.currentTarget.blur();
          }
        }}
        onBlur={(e) => {
          const val = e.currentTarget.value.trim();
          if (val !== data.title && apiRef.current) {
            setCardDetails(apiRef.current, element.id, { title: val });
          }
        }}
      />

      <span className="board-details-label">Tags</span>
      {assignedTags.length > 0 && (
        <ul className="board-details-tags">
          {assignedTags.map((tag) => (
            <li key={tag.id}>
              <span className="board-tag" style={{ background: tag.color }}>
                {tag.name}
                <button
                  type="button"
                  aria-label={`Remove tag ${tag.name}`}
                  onClick={() => saveTags(data.tags.filter((t) => t !== tag.id))}
                >
                  ×
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {data.tags.length < CARD_TAGS_MAX && (
        <ComboBox
          aria-label="Add a tag"
          menuTrigger="focus"
          allowsEmptyCollection
          inputValue={query}
          onInputChange={handleInputChange}
          selectedKey={null}
          onSelectionChange={pick}
        >
          <Input className="board-details-input" placeholder="Add a tag…" />
          <Popover className="react-aria-Popover board-color-popover">
            <ListBox className="react-aria-ListBox" items={items}>
              {(it) => (
                <ListBoxItem id={it.id} textValue={it.name} className="react-aria-ListBoxItem board-tag-option">
                  {it.color && <span className="board-swatch" style={{ background: it.color }} aria-hidden="true" />}
                  {it.name}
                </ListBoxItem>
              )}
            </ListBox>
          </Popover>
        </ComboBox>
      )}

      {tagLimitError && (
        <p className="board-link-error" role="alert">
          You've reached the tag limit.
        </p>
      )}

      <label htmlFor={notesId}>Notes</label>
      <textarea
        id={notesId}
        ref={notesRef}
        className="board-details-notes"
        rows={5}
        defaultValue={data.notes}
        maxLength={2000}
        placeholder="What's worth remembering? e.g. the road at 4:10 is Kunzum Pass"
        onChange={(e) => {
          notesDraftRef.current = e.target.value;
        }}
        onBlur={(e) => {
          saveNotes(e.currentTarget.value);
        }}
      />

      <a className="board-card-open" href={parsed.value.url} target="_blank" rel="noopener noreferrer">
        Open ↗
      </a>
    </aside>
  );
}

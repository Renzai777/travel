import { cardData } from "../board/cardDetails";
import { parseCardUrl, youtubeThumbnail } from "../board/urls";

export const NOTE_TEXT_MAX = 2000;
const NOTE_TITLE_MAX = 80;

export type LibraryKind = "video" | "link" | "note";

/** One searchable thing on a board: a video card, a link card or a sticky note. Built from untrusted stored elements. */
export interface LibraryRecord {
  /** `${folderId}:${elementId}`, unique across the workspace. */
  id: string;
  folderId: string;
  elementId: string;
  kind: LibraryKind;
  /** The name the list shows. */
  title: string;
  /** Video title fetched from the provider (search only). */
  autoTitle: string;
  /** Card notes (cards) — "" for sticky notes. */
  notes: string;
  /** Sticky-note text — "" for cards. */
  text: string;
  /** Link host ("" for notes). */
  host: string;
  /** Validated card URL ("" for notes). */
  url: string;
  provider?: "youtube" | "vimeo";
  thumbnail?: string;
  tagIds: string[];
  /** Sticky-note fill colour (a #rrggbb value). */
  color?: string;
  /** Last edit time (ms), for "recent first". */
  updated: number;
}

type Raw = Record<string, unknown>;
const isRaw = (v: unknown): v is Raw => typeof v === "object" && v !== null && !Array.isArray(v);

/** "https://www.lonelyplanet.com/india/spiti-valley?x=1" → "Spiti valley · lonelyplanet.com" (a readable name for an untitled link). */
export function linkName(url: string, hostname: string): string {
  const host = hostname.replace(/^www\./, "");
  let last: string;
  try {
    const segments = new URL(url).pathname.split("/").filter(Boolean);
    last = decodeURIComponent(segments[segments.length - 1] ?? "");
  } catch {
    last = "";
  }
  const words = last
    .replace(/\.(html?|php|aspx?)$/i, "")
    .replace(/[-_+]+/g, " ")
    .trim();
  if (!words || /^\d+$/.test(words) || words.length > 80) return host;
  return `${words.charAt(0).toUpperCase()}${words.slice(1)} · ${host}`;
}

/** Every video/link card and every sticky note (with its text) on one board. Deleted and malformed elements are skipped. */
export function boardRecords(folderId: string, elements: readonly unknown[]): LibraryRecord[] {
  const live = new Map<string, Raw>();
  for (const el of elements) {
    if (isRaw(el) && typeof el.id === "string" && el.id && el.isDeleted !== true) live.set(el.id, el);
  }

  // Text bound to a container (a sticky note's label): containerId → text.
  const textOf = new Map<string, string>();
  for (const el of live.values()) {
    if (el.type !== "text" || typeof el.containerId !== "string") continue;
    const raw = typeof el.originalText === "string" ? el.originalText : typeof el.text === "string" ? el.text : "";
    if (raw.trim()) textOf.set(el.containerId, raw.slice(0, NOTE_TEXT_MAX));
  }

  const out: LibraryRecord[] = [];
  for (const [elementId, el] of live) {
    const base = {
      id: `${folderId}:${elementId}`,
      folderId,
      elementId,
      updated: typeof el.updated === "number" && Number.isFinite(el.updated) ? el.updated : 0,
    };

    if (el.type === "embeddable") {
      const data = cardData(el);
      const parsed = typeof el.link === "string" ? parseCardUrl(el.link) : null;
      if (!data || !parsed) continue;
      const video = parsed.kind === "video" && data.kind !== "link" ? parsed.value : null; // same rule as CardView
      const fallback = video
        ? video.provider === "youtube"
          ? "YouTube video"
          : "Vimeo video"
        : linkName(parsed.value.url, parsed.value.hostname);
      const thumbnail = video
        ? ((video.provider === "youtube"
            ? youtubeThumbnail(video.videoId)?.replace("/hqdefault.jpg", "/mqdefault.jpg")
            : data.thumbnail) ?? undefined)
        : undefined;
      out.push({
        ...base,
        kind: video ? "video" : "link",
        title: (video ? data.title || data.autoTitle : data.title) || fallback,
        autoTitle: data.autoTitle ?? "",
        notes: data.notes,
        text: "",
        host: parsed.value.hostname,
        url: parsed.value.url,
        ...(video ? { provider: video.provider } : {}),
        ...(thumbnail ? { thumbnail } : {}),
        tagIds: data.tags,
      });
      continue;
    }

    const custom = isRaw(el.customData) ? el.customData : null;
    if (el.type === "rectangle" && custom?.kind === "note") {
      const text = textOf.get(elementId) ?? "";
      if (!text.trim()) continue; // empty notes aren't worth listing
      const firstLine = text.split("\n").find((l) => l.trim()) ?? "";
      const color =
        typeof el.backgroundColor === "string" && /^#[0-9a-fA-F]{6}$/.test(el.backgroundColor)
          ? el.backgroundColor
          : undefined;
      out.push({
        ...base,
        kind: "note",
        title: firstLine.trim().slice(0, NOTE_TITLE_MAX),
        autoTitle: "",
        notes: "",
        text,
        host: "",
        url: "",
        tagIds: [],
        ...(color ? { color } : {}),
      });
    }
  }
  return out;
}

/** A short preview line for the list: the card's notes, or the note text after its first line. */
export function snippetOf(r: LibraryRecord, max = 140): string {
  const source = r.kind === "note" ? r.text.trim().slice(r.title.length) : r.notes;
  const flat = source.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

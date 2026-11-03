import { safeThumbnail } from "./urls";

export const CARD_TITLE_MAX = 300;
export const CARD_NOTES_MAX = 2000;
export const CARD_TAGS_MAX = 12;

export interface CardData {
  kind: "video" | "link";
  title: string;
  thumbnail?: string;
  autoTitle?: string;
  tags: string[];
  notes: string;
}

/** Card data stored in `customData`. Treated as untrusted: the URL always comes from `element.link`, re-checked on render. */
export function cardData(element: { customData?: unknown }): CardData | null {
  const d = element.customData as Partial<CardData> | undefined;
  if (!d || (d.kind !== "video" && d.kind !== "link")) return null;
  const data: CardData = {
    kind: d.kind,
    title: typeof d.title === "string" ? d.title.slice(0, 300) : "",
    tags: cleanTagIds(d.tags),
    notes: cleanNotes(d.notes),
  };
  if (typeof d.thumbnail === "string") {
    const thumb = safeThumbnail(d.thumbnail);
    if (thumb) data.thumbnail = thumb;
  }
  if (typeof d.autoTitle === "string") {
    data.autoTitle = d.autoTitle.slice(0, 300);
  }
  return data;
}

/** Tag ids stored on a card (untrusted): strings in the id format, no duplicates, at most CARD_TAGS_MAX. */
export function cleanTagIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const v of value) {
    if (typeof v === "string" && /^[A-Za-z0-9_-]{1,40}$/.test(v) && !out.includes(v)) out.push(v);
    if (out.length >= CARD_TAGS_MAX) break;
  }
  return out;
}

export const cleanNotes = (value: unknown): string => (typeof value === "string" ? value.slice(0, CARD_NOTES_MAX) : "");
export const cleanTitle = (value: unknown): string =>
  typeof value === "string" ? value.trim().slice(0, CARD_TITLE_MAX) : "";

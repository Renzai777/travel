export const CARD_TITLE_MAX = 300;
export const CARD_NOTES_MAX = 2000;
export const CARD_TAGS_MAX = 12;

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

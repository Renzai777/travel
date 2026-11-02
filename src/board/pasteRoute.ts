import { extractUrls, parseCardUrl, type CardUrl } from "./urls";

export const MAX_CARDS_PER_PASTE = 10;
const MAX_NOTE_LENGTH = 5000;
const SHORT_NOTE_LENGTH = 80;

export type PasteDecision =
  | { kind: "delegate" }
  | { kind: "image" }
  | { kind: "cards"; cards: CardUrl[]; note?: string }
  | { kind: "note"; text: string; wide: boolean };

/** What a paste on the board turns into. Excalidraw's own copied shapes always keep Excalidraw's behaviour. */
export function routePaste(input: { text?: string; hasElements: boolean; hasImage: boolean }): PasteDecision {
  if (input.hasElements) return { kind: "delegate" };
  if (input.hasImage) return { kind: "image" };
  const text = (input.text ?? "").trim();
  if (!text) return { kind: "delegate" };

  const urls = extractUrls(text);
  const cards = urls
    .map((u) => parseCardUrl(u))
    .filter((c): c is CardUrl => c !== null)
    .slice(0, MAX_CARDS_PER_PASTE);
  if (cards.length > 0) {
    let rest = text;
    for (const u of urls) rest = rest.split(u).join(" ");
    rest = rest
      .replace(/[ \t]+/g, " ")
      .replace(/\n\s*\n+/g, "\n")
      .trim();
    const note = /[\p{L}\p{N}]/u.test(rest) ? rest.slice(0, MAX_NOTE_LENGTH) : undefined;
    return { kind: "cards", cards, note };
  }

  const clipped = text.slice(0, MAX_NOTE_LENGTH);
  return { kind: "note", text: clipped, wide: clipped.length > SHORT_NOTE_LENGTH || clipped.includes("\n") };
}

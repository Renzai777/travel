export const SECTION_NAME_MAX = 80;
export const UNTITLED_SECTION = "Untitled section";

export interface Section {
  id: string;
  name: string;
  x: number;
  y: number;
}

/** A section (frame) name from user input or stored data: one line, trimmed, at most SECTION_NAME_MAX characters. */
export const cleanSectionName = (value: unknown): string =>
  typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, SECTION_NAME_MAX) : "";

type Raw = Record<string, unknown>;
const isRaw = (v: unknown): v is Raw => typeof v === "object" && v !== null && !Array.isArray(v);
const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);

/** The live sections (frames) of a board, top to bottom, then left to right (untrusted elements; junk is skipped). */
export function listSections(elements: readonly unknown[]): Section[] {
  const out: Section[] = [];
  for (const el of elements) {
    if (!isRaw(el) || el.type !== "frame" || el.isDeleted === true || typeof el.id !== "string" || !el.id) continue;
    out.push({ id: el.id, name: cleanSectionName(el.name) || UNTITLED_SECTION, x: num(el.x), y: num(el.y) });
  }
  // Rows: sections whose tops are within 40px count as one row, read left to right.
  return out.sort((a, b) => (Math.abs(a.y - b.y) < 40 ? a.x - b.x : a.y - b.y) || a.id.localeCompare(b.id));
}

/** Changes whenever the list (ids, names or order) changes; used to avoid re-rendering on every canvas change. */
export const sectionsKey = (sections: readonly Section[]): string =>
  sections.map((s) => `${s.id}\u0000${s.name}`).join("\u0001");

/** frame id → section name, for the live frames among `elements`. */
export function sectionNames(elements: readonly unknown[]): Map<string, string> {
  return new Map(listSections(elements).map((s) => [s.id, s.name]));
}

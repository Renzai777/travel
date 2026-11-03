import { CaptureUpdateAction, convertToExcalidrawElements, newElementWith } from "@excalidraw/excalidraw";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { NOTE_COLORS } from "./notes";
import { freeSpot, NOTE_HEIGHT, NOTE_WIDTH } from "./notePlacement";
import { liveCount } from "./sceneSync";
import { safeThumbnail, type CardUrl } from "./urls";

export const VIDEO_WIDTH = 384;
export const VIDEO_HEIGHT = 260; // 16:9 player + a title bar
export const LINK_WIDTH = 300;
export const LINK_HEIGHT = 128;
const GAP = 24;
const WIDE_NOTE_WIDTH = 360;

export interface CardData {
  kind: "video" | "link";
  title: string;
  thumbnail?: string;
  autoTitle?: string;
}

/** Card data stored in `customData`. Treated as untrusted: the URL always comes from `element.link`, re-checked on render. */
export function cardData(element: Pick<ExcalidrawElement, "customData">): CardData | null {
  const d = element.customData as Partial<CardData> | undefined;
  if (!d || (d.kind !== "video" && d.kind !== "link")) return null;
  const data: CardData = { kind: d.kind, title: typeof d.title === "string" ? d.title.slice(0, 300) : "" };
  if (typeof d.thumbnail === "string") {
    const thumb = safeThumbnail(d.thumbnail);
    if (thumb) data.thumbnail = thumb;
  }
  if (typeof d.autoTitle === "string") {
    data.autoTitle = d.autoTitle.slice(0, 300);
  }
  return data;
}

function cardSkeleton(card: CardUrl, x: number, y: number) {
  const video = card.kind === "video";
  // Built as a rectangle (Excalidraw's skeleton helper doesn't take embeddables) and retyped in addPasted.
  return {
    type: "rectangle" as const,
    x,
    y,
    width: video ? VIDEO_WIDTH : LINK_WIDTH,
    height: video ? VIDEO_HEIGHT : LINK_HEIGHT,
    link: card.value.url,
    strokeColor: "transparent",
    backgroundColor: "transparent",
    roundness: { type: 3 as const },
    customData: { kind: card.kind, title: "" } satisfies CardData,
  };
}

function noteSkeleton(text: string, x: number, y: number, wide: boolean) {
  return {
    type: "rectangle" as const,
    x,
    y,
    width: wide ? WIDE_NOTE_WIDTH : NOTE_WIDTH,
    height: NOTE_HEIGHT,
    backgroundColor: NOTE_COLORS[0].fill,
    fillStyle: "solid" as const,
    strokeColor: "transparent",
    strokeWidth: 1,
    roughness: 0,
    roundness: { type: 3 as const },
    customData: { kind: "note" },
    label: { text, fontSize: 20, strokeColor: "#1e1e1e" },
  };
}

/**
 * Adds pasted things at the centre of the view: cards in a row, then (optionally) a note with the rest of the text.
 * Everything new is selected and undoable. Returns false (with a toast) when the board would go over its limit.
 */
export function addPasted(
  api: ExcalidrawImperativeAPI,
  cards: readonly CardUrl[],
  note: { text: string; wide: boolean } | undefined,
  limit: number,
): boolean {
  const existing = api.getSceneElements();
  const adding = cards.length + (note ? 2 : 0); // a note is a rectangle + its text
  if (liveCount(existing) + adding > limit) {
    api.setToast({ message: "This board is full. Delete something first, or use a subfolder board.", closable: true });
    return false;
  }
  const s = api.getAppState();
  const itemCount = cards.length + (note ? 1 : 0);
  const rowWidth =
    cards.reduce((sum, c) => sum + (c.kind === "video" ? VIDEO_WIDTH : LINK_WIDTH), 0) +
    (note ? (note.wide ? WIDE_NOTE_WIDTH : NOTE_WIDTH) : 0) +
    Math.max(0, itemCount - 1) * GAP;
  const itemHeights = [
    ...cards.map((c) => (c.kind === "video" ? VIDEO_HEIGHT : LINK_HEIGHT)),
    ...(note ? [NOTE_HEIGHT] : []),
  ];
  const rowHeight = itemHeights.length > 0 ? Math.max(...itemHeights) : 0;
  const start = freeSpot(
    { scrollX: s.scrollX, scrollY: s.scrollY, width: s.width, height: s.height, zoom: s.zoom.value },
    existing,
    rowWidth,
    rowHeight,
  );

  let x = start.x;
  const skeletons = [];
  for (const card of cards) {
    skeletons.push(cardSkeleton(card, x, start.y));
    x += (card.kind === "video" ? VIDEO_WIDTH : LINK_WIDTH) + GAP;
  }
  if (note) skeletons.push(noteSkeleton(note.text, x, start.y, note.wide));

  const created = convertToExcalidrawElements(skeletons).map((el) =>
    cardData(el) ? ({ ...el, type: "embeddable" } as unknown as typeof el) : el,
  );
  api.setActiveTool({ type: "selection" });
  api.updateScene({
    elements: [...api.getSceneElementsIncludingDeleted(), ...created],
    appState: {
      selectedElementIds: Object.fromEntries(
        created.filter((el) => !("containerId" in el && el.containerId)).map((el) => [el.id, true]),
      ),
    },
    captureUpdate: CaptureUpdateAction.IMMEDIATELY,
  });
  return true;
}

/** Renames a card. `newElementWith` bumps the version, so the change is saved and synced like any other edit. */
export function setCardTitle(api: ExcalidrawImperativeAPI, id: string, title: string): void {
  const clean = title.trim().slice(0, 300);
  api.updateScene({
    elements: api.getSceneElementsIncludingDeleted().map((el) => {
      const data = el.id === id ? cardData(el) : null;
      return data ? newElementWith(el, { customData: { ...el.customData, ...data, title: clean } }) : el;
    }),
    captureUpdate: CaptureUpdateAction.IMMEDIATELY,
  });
}

/** Stores fetched video details on a card (synced like any edit). The user's own title (`title`) is never overwritten. */
export function setCardMeta(
  api: ExcalidrawImperativeAPI,
  id: string,
  meta: { thumbnail?: string; autoTitle?: string },
): void {
  api.updateScene({
    elements: api.getSceneElementsIncludingDeleted().map((el) => {
      const data = el.id === id ? cardData(el) : null;
      return data ? newElementWith(el, { customData: { ...el.customData, ...meta, metaFetched: true } }) : el;
    }),
    captureUpdate: CaptureUpdateAction.NEVER, // not an undo step
  });
}

export function metaFetched(element: Pick<ExcalidrawElement, "customData">): boolean {
  return element.customData?.metaFetched === true;
}

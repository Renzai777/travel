import {
  CaptureUpdateAction,
  convertToExcalidrawElements,
  getCommonBounds,
  newElementWith,
} from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { freeSpot } from "./notePlacement";
import { liveCount } from "./sceneSync";
import { cleanSectionName, UNTITLED_SECTION } from "./sections";

const PADDING = 40;
const EMPTY_WIDTH = 960;
const EMPTY_HEIGHT = 600;

/**
 * Adds a named section (an Excalidraw frame), the same way Excalidraw's own "Wrap selection in frame" does: around the selected things
 * (they, and the text inside selected notes, become its children), or — with nothing selected — an empty one in free space.
 * One undo step; the new section is selected. Returns false (with a toast) when the board is full.
 */
export function addSection(api: ExcalidrawImperativeAPI, rawName: string, limit: number): boolean {
  const live = api.getSceneElements();
  if (liveCount(live) + 1 > limit) {
    api.setToast({ message: "This board is full. Delete something first, or use a subfolder board.", closable: true });
    return false;
  }
  const state = api.getAppState();
  const selected = new Set(Object.keys(state.selectedElementIds));
  const children = live.filter(
    (el) =>
      el.type !== "frame" &&
      el.type !== "magicframe" &&
      (selected.has(el.id) || (el.type === "text" && el.containerId !== null && selected.has(el.containerId))),
  );

  let box: { x: number; y: number; width: number; height: number };
  if (children.length > 0) {
    const [x1, y1, x2, y2] = getCommonBounds(children);
    box = { x: x1 - PADDING, y: y1 - PADDING, width: x2 - x1 + PADDING * 2, height: y2 - y1 + PADDING * 2 };
  } else {
    const spot = freeSpot(
      {
        scrollX: state.scrollX,
        scrollY: state.scrollY,
        width: state.width,
        height: state.height,
        zoom: state.zoom.value,
      },
      live,
      EMPTY_WIDTH,
      EMPTY_HEIGHT,
    );
    box = { x: spot.x, y: spot.y, width: EMPTY_WIDTH, height: EMPTY_HEIGHT };
  }

  const [created] = convertToExcalidrawElements([
    { type: "frame", children: [], name: cleanSectionName(rawName) || UNTITLED_SECTION, ...box },
  ]);
  const frame = { ...created, ...box }; // the skeleton helper treats a 0 coordinate as "unset"; a fresh element, safe to spread
  const childIds = new Set(children.map((el) => el.id));

  api.setActiveTool({ type: "selection" });
  api.updateScene({
    elements: [
      ...api
        .getSceneElementsIncludingDeleted()
        .map((el) => (childIds.has(el.id) ? newElementWith(el, { frameId: frame.id }) : el)),
      frame,
    ],
    appState: { selectedElementIds: { [frame.id]: true } },
    captureUpdate: CaptureUpdateAction.IMMEDIATELY,
  });
  return true;
}

/** Scrolls so the whole section fits on screen, and selects it. */
export function jumpToSection(api: ExcalidrawImperativeAPI, id: string): void {
  const frame = api.getSceneElements().find((el) => el.id === id && el.type === "frame");
  if (!frame) return;
  api.scrollToContent(frame, { fitToViewport: true, viewportZoomFactor: 0.7, maxZoom: 1.5, animate: true });
  api.updateScene({ appState: { selectedElementIds: { [frame.id]: true } }, captureUpdate: CaptureUpdateAction.NEVER });
}

/** Renames a section (one undo step; synced like any edit). Empty names are ignored. */
export function renameSection(api: ExcalidrawImperativeAPI, id: string, rawName: string): void {
  const name = cleanSectionName(rawName);
  if (!name) return;
  api.updateScene({
    elements: api
      .getSceneElementsIncludingDeleted()
      .map((el) => (el.id === id && el.type === "frame" && el.name !== name ? newElementWith(el, { name }) : el)),
    captureUpdate: CaptureUpdateAction.IMMEDIATELY,
  });
}

import { CaptureUpdateAction, convertToExcalidrawElements } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { NOTE_HEIGHT, NOTE_WIDTH, notePosition } from "./notePlacement";

/** Sticky-note colours: Excalidraw's own pastel palette, so they invert to readable dark tones in dark mode. */
export const NOTE_COLORS = [
  { id: "yellow", label: "Yellow", fill: "#ffec99" },
  { id: "pink", label: "Pink", fill: "#fcc2d7" },
  { id: "green", label: "Green", fill: "#b2f2bb" },
  { id: "blue", label: "Blue", fill: "#a5d8ff" },
] as const;

export type NoteColorId = (typeof NOTE_COLORS)[number]["id"];

/**
 * Adds a sticky note (a native rectangle that Excalidraw treats as a text container) at the centre of the view, selects it
 * and opens its text editor, so typing starts straight away. Undoable like any other edit.
 */
export function addNote(api: ExcalidrawImperativeAPI, colorId: NoteColorId, container: HTMLElement | null): void {
  const fill = NOTE_COLORS.find((c) => c.id === colorId)?.fill ?? NOTE_COLORS[0].fill;
  const appState = api.getAppState();
  const elements = api.getSceneElements();
  const { x, y } = notePosition(
    {
      scrollX: appState.scrollX,
      scrollY: appState.scrollY,
      width: appState.width,
      height: appState.height,
      zoom: appState.zoom.value,
    },
    elements,
  );

  const [note] = convertToExcalidrawElements([
    {
      type: "rectangle",
      x,
      y,
      width: NOTE_WIDTH,
      height: NOTE_HEIGHT,
      backgroundColor: fill,
      fillStyle: "solid",
      strokeColor: "transparent",
      strokeWidth: 1,
      roughness: 0,
      roundness: { type: 3 },
      customData: { kind: "note" },
    },
  ]);

  api.setActiveTool({ type: "selection" });
  api.updateScene({
    elements: [...api.getSceneElementsIncludingDeleted(), note],
    appState: { selectedElementIds: { [note.id]: true } },
    captureUpdate: CaptureUpdateAction.IMMEDIATELY,
  });

  // Enter on a single selected text container opens Excalidraw's text editor for it (the same as a double-click).
  requestAnimationFrame(() => {
    const target = container?.querySelector<HTMLElement>(".excalidraw") ?? container;
    target?.focus();
    target?.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", code: "Enter", bubbles: true, cancelable: true }),
    );
  });
}

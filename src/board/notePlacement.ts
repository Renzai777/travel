import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";

export const NOTE_WIDTH = 220;
export const NOTE_HEIGHT = 160;
const STACK_OFFSET = 24;

/** Where a new note goes: centred in the viewport, nudged down-right past notes already sitting exactly there. */
export function notePosition(
  view: { scrollX: number; scrollY: number; width: number; height: number; zoom: number },
  taken: readonly Pick<ExcalidrawElement, "x" | "y" | "isDeleted">[],
): { x: number; y: number } {
  const x0 = Math.round(view.width / 2 / view.zoom - view.scrollX - NOTE_WIDTH / 2);
  const y0 = Math.round(view.height / 2 / view.zoom - view.scrollY - NOTE_HEIGHT / 2);
  const occupied = (x: number, y: number) =>
    taken.some((el) => !el.isDeleted && Math.abs(el.x - x) < 2 && Math.abs(el.y - y) < 2);
  let step = 0;
  while (step < 50 && occupied(x0 + step * STACK_OFFSET, y0 + step * STACK_OFFSET)) step++;
  return { x: x0 + step * STACK_OFFSET, y: y0 + step * STACK_OFFSET };
}

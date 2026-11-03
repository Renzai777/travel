import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";

export const NOTE_WIDTH = 220;
export const NOTE_HEIGHT = 160;
const GAP = 24;
const MAX_RINGS = 12;

export interface View {
  scrollX: number;
  scrollY: number;
  width: number;
  height: number;
  zoom: number;
}

type Box = Pick<ExcalidrawElement, "x" | "y" | "width" | "height" | "isDeleted">;

/**
 * Top-left corner for a new `width`×`height` block: centred in the view if that space is free, otherwise the nearest free spot in
 * rings around the centre (half a block apart, closest first, then top-to-bottom, left-to-right), keeping a small gap to everything
 * already on the board. Falls back to the centre when the area is completely full.
 */
export function freeSpot(view: View, taken: readonly Box[], width: number, height: number): { x: number; y: number } {
  const cx = Math.round(view.width / 2 / view.zoom - view.scrollX - width / 2);
  const cy = Math.round(view.height / 2 / view.zoom - view.scrollY - height / 2);
  const live = taken.filter((el) => !el.isDeleted);
  const free = (x: number, y: number) =>
    live.every((el) => {
      // Elements can have negative width/height (lines drawn leftwards): normalise.
      const left = Math.min(el.x, el.x + el.width);
      const top = Math.min(el.y, el.y + el.height);
      const right = Math.max(el.x, el.x + el.width);
      const bottom = Math.max(el.y, el.y + el.height);
      return x + width + GAP <= left || x >= right + GAP || y + height + GAP <= top || y >= bottom + GAP;
    });

  const stepX = Math.round((width + GAP) / 2);
  const stepY = Math.round((height + GAP) / 2);
  for (let r = 0; r <= MAX_RINGS; r++) {
    const ring: { dx: number; dy: number }[] = [];
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) === r) ring.push({ dx, dy });
      }
    }
    ring.sort((a, b) => a.dx * a.dx + a.dy * a.dy - (b.dx * b.dx + b.dy * b.dy) || a.dy - b.dy || a.dx - b.dx);
    for (const { dx, dy } of ring) {
      const x = cx + dx * stepX;
      const y = cy + dy * stepY;
      if (free(x, y)) return { x, y };
    }
  }
  return { x: cx, y: cy };
}

import { describe, expect, it } from "vitest";
import { freeSpot, type View } from "./notePlacement";

function overlaps(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
): boolean {
  const aLeft = Math.min(a.x, a.x + a.width);
  const aRight = Math.max(a.x, a.x + a.width);
  const aTop = Math.min(a.y, a.y + a.height);
  const aBottom = Math.max(a.y, a.y + a.height);

  const bLeft = Math.min(b.x, b.x + b.width);
  const bRight = Math.max(b.x, b.x + b.width);
  const bTop = Math.min(b.y, b.y + b.height);
  const bBottom = Math.max(b.y, b.y + b.height);

  return aLeft < bRight && aRight > bLeft && aTop < bBottom && aBottom > bTop;
}

const view: View = { scrollX: 0, scrollY: 0, width: 1000, height: 600, zoom: 1 };

describe("freeSpot", () => {
  it("places in the centre of the view when nothing is taken", () => {
    expect(freeSpot(view, [], 200, 100)).toEqual({ x: 400, y: 250 });
  });

  it("takes scroll and zoom into account", () => {
    expect(freeSpot({ scrollX: -1000, scrollY: 200, width: 1000, height: 600, zoom: 2 }, [], 200, 100)).toEqual({
      x: 250 + 1000 - 100,
      y: 150 - 200 - 50,
    });
  });

  it("ignores deleted elements at the centre", () => {
    expect(freeSpot(view, [{ x: 400, y: 250, width: 200, height: 100, isDeleted: true }], 200, 100)).toEqual({
      x: 400,
      y: 250,
    });
  });

  it("finds a non-overlapping spot when an element covers the centre spot", () => {
    const centerEl = { x: 400, y: 250, width: 200, height: 100, isDeleted: false };
    const spot = freeSpot(view, [centerEl], 200, 100);
    expect(spot).not.toEqual({ x: 400, y: 250 });
    expect(overlaps({ ...spot, width: 200, height: 100 }, centerEl)).toBe(false);
  });

  it("places 6 blocks one after another without any overlaps", () => {
    const taken: { x: number; y: number; width: number; height: number; isDeleted: boolean }[] = [];
    for (let i = 0; i < 6; i++) {
      const pos = freeSpot(view, taken, 200, 100);
      taken.push({ ...pos, width: 200, height: 100, isDeleted: false });
    }
    expect(taken).toHaveLength(6);
    for (let i = 0; i < taken.length; i++) {
      for (let j = i + 1; j < taken.length; j++) {
        expect(overlaps(taken[i], taken[j])).toBe(false);
      }
    }
  });

  it("handles an element with negative width covering the centre", () => {
    const negativeWidthEl = { x: 600, y: 250, width: -200, height: 100, isDeleted: false };
    const spot = freeSpot(view, [negativeWidthEl], 200, 100);
    expect(spot).not.toEqual({ x: 400, y: 250 });
  });
});

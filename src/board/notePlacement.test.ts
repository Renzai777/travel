import { describe, expect, it } from "vitest";
import { NOTE_HEIGHT, NOTE_WIDTH, notePosition } from "./notePlacement";

const view = { scrollX: 0, scrollY: 0, width: 1000, height: 600, zoom: 1 };

describe("notePosition", () => {
  it("centres the note in the viewport, taking scroll and zoom into account", () => {
    expect(notePosition(view, [])).toEqual({ x: 500 - NOTE_WIDTH / 2, y: 300 - NOTE_HEIGHT / 2 });
    expect(notePosition({ ...view, scrollX: -1000, scrollY: 200, zoom: 2 }, [])).toEqual({
      x: 250 + 1000 - NOTE_WIDTH / 2,
      y: 150 - 200 - NOTE_HEIGHT / 2,
    });
  });

  it("offsets repeated notes so they never stack exactly", () => {
    const first = notePosition(view, []);
    const second = notePosition(view, [{ ...first, isDeleted: false }]);
    const third = notePosition(view, [
      { ...first, isDeleted: false },
      { ...second, isDeleted: false },
    ]);
    expect(second).toEqual({ x: first.x + 24, y: first.y + 24 });
    expect(third).toEqual({ x: first.x + 48, y: first.y + 48 });
  });

  it("ignores deleted elements", () => {
    const first = notePosition(view, []);
    expect(notePosition(view, [{ ...first, isDeleted: true }])).toEqual(first);
  });
});

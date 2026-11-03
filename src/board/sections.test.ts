import { describe, expect, it } from "vitest";
import {
  cleanSectionName,
  listSections,
  sectionNames,
  sectionsKey,
  SECTION_NAME_MAX,
  UNTITLED_SECTION,
} from "./sections";

describe("sections", () => {
  describe("cleanSectionName", () => {
    it("cleans and collapses whitespace, trimming edges", () => {
      expect(cleanSectionName("  Day 3 \n – Spiti ")).toBe("Day 3 – Spiti");
    });

    it("caps 100 chars at 80", () => {
      const longName = "a".repeat(100);
      const cleaned = cleanSectionName(longName);
      expect(cleaned).toHaveLength(SECTION_NAME_MAX);
      expect(cleaned).toHaveLength(80);
      expect(cleaned).toBe("a".repeat(80));
    });

    it("returns empty string for non-string values (5, null, undefined)", () => {
      expect(cleanSectionName(5)).toBe("");
      expect(cleanSectionName(null)).toBe("");
      expect(cleanSectionName(undefined)).toBe("");
      expect(cleanSectionName({})).toBe("");
    });
  });

  describe("listSections", () => {
    it("filters frames only, skipping rectangles, text, and junk", () => {
      const elements = [
        null,
        "x",
        [],
        5,
        { id: "rect1", type: "rectangle", x: 0, y: 0 },
        { id: "text1", type: "text", text: "hello", x: 0, y: 0 },
        { id: "f1", type: "frame", name: "Valid Frame", x: 10, y: 20 },
      ];
      const sections = listSections(elements);
      expect(sections).toEqual([{ id: "f1", name: "Valid Frame", x: 10, y: 20 }]);
    });

    it("skips deleted frames", () => {
      const elements = [
        { id: "f1", type: "frame", name: "Active", isDeleted: false, x: 0, y: 0 },
        { id: "f2", type: "frame", name: "Deleted", isDeleted: true, x: 10, y: 10 },
      ];
      expect(listSections(elements)).toEqual([{ id: "f1", name: "Active", x: 0, y: 0 }]);
    });

    it("falls back to Untitled section for empty or non-string names", () => {
      const elements = [
        { id: "f1", type: "frame", name: "", x: 0, y: 0 },
        { id: "f2", type: "frame", name: "   ", x: 100, y: 0 },
        { id: "f3", type: "frame", name: null, x: 200, y: 0 },
        { id: "f4", type: "frame", x: 300, y: 0 },
      ];
      const sections = listSections(elements);
      expect(sections.map((s) => s.name)).toEqual([
        UNTITLED_SECTION,
        UNTITLED_SECTION,
        UNTITLED_SECTION,
        UNTITLED_SECTION,
      ]);
    });

    it("orders frames by row (tops within 40px left-to-right), then top-to-bottom", () => {
      const elements = [
        { id: "y0-x500", type: "frame", name: "A", x: 500, y: 0 },
        { id: "y10-x0", type: "frame", name: "B", x: 0, y: 10 },
        { id: "y400-x0", type: "frame", name: "C", x: 0, y: 400 },
      ];
      const sections = listSections(elements);
      expect(sections.map((s) => s.id)).toEqual(["y10-x0", "y0-x500", "y400-x0"]);
    });
  });

  describe("sectionsKey", () => {
    it("is equal for equal lists", () => {
      const a = [
        { id: "1", name: "First", x: 0, y: 0 },
        { id: "2", name: "Second", x: 10, y: 10 },
      ];
      const b = [
        { id: "1", name: "First", x: 0, y: 0 },
        { id: "2", name: "Second", x: 10, y: 10 },
      ];
      expect(sectionsKey(a)).toBe(sectionsKey(b));
    });

    it("changes when a name changes", () => {
      const a = [{ id: "1", name: "Original", x: 0, y: 0 }];
      const b = [{ id: "1", name: "Renamed", x: 0, y: 0 }];
      expect(sectionsKey(a)).not.toBe(sectionsKey(b));
    });

    it("changes when the order changes", () => {
      const a = [
        { id: "1", name: "One", x: 0, y: 0 },
        { id: "2", name: "Two", x: 10, y: 10 },
      ];
      const b = [
        { id: "2", name: "Two", x: 10, y: 10 },
        { id: "1", name: "One", x: 0, y: 0 },
      ];
      expect(sectionsKey(a)).not.toBe(sectionsKey(b));
    });
  });

  describe("sectionNames", () => {
    it("maps frame ids to cleaned names", () => {
      const elements = [
        { id: "f1", type: "frame", name: "Day 3 – Spiti", x: 0, y: 0 },
        { id: "f2", type: "frame", name: "Packing", x: 10, y: 0 },
        { id: "f3", type: "frame", name: "", x: 20, y: 0 },
      ];
      const names = sectionNames(elements);
      expect(names.get("f1")).toBe("Day 3 – Spiti");
      expect(names.get("f2")).toBe("Packing");
      expect(names.get("f3")).toBe(UNTITLED_SECTION);
      expect(names.get("unknown")).toBeUndefined();
    });
  });
});

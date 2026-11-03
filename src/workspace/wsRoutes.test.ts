import { describe, expect, it } from "vitest";
import { focusFromSearch, focusPath, parseWsPath } from "./wsRoutes";

describe("wsRoutes", () => {
  it("focusPath constructs URL with ?focus=", () => {
    expect(focusPath("aaaaaaaaaaaa", "bbbbbbbbbbbb", "el_1")).toBe("/w/aaaaaaaaaaaa/f/bbbbbbbbbbbb?focus=el_1");
  });

  it("focusFromSearch validates element id", () => {
    expect(focusFromSearch("?focus=el_1")).toBe("el_1");
    expect(focusFromSearch("")).toBeNull();
    expect(focusFromSearch("?focus=")).toBeNull();
    expect(focusFromSearch("?focus=a%20b")).toBeNull();
    expect(focusFromSearch("?focus=<script>")).toBeNull();
    const id65 = "a".repeat(65);
    expect(focusFromSearch(`?focus=${id65}`)).toBeNull();
  });

  it("parseWsPath parses workspace route with folderId", () => {
    expect(parseWsPath("/w/aaaaaaaaaaaa/f/bbbbbbbbbbbb")).toEqual({
      kind: "workspace",
      wsId: "aaaaaaaaaaaa",
      folderId: "bbbbbbbbbbbb",
    });
  });
});

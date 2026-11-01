import { PLACES, placeById } from "../data/places";

export const SECTIONS = ["route", "days", "places", "food", "plan"] as const;
export type Section = (typeof SECTIONS)[number];
/** Element ids the scroll spy watches, in page order. */
export const SPY_IDS = ["top", ...SECTIONS] as const;
export type SpyId = (typeof SPY_IDS)[number];

export type Route =
  | { kind: "top" }
  | { kind: "section"; section: Section }
  | { kind: "place"; place: string }
  | { kind: "reserved" } // /w/… and /board/…: owned by the workspace app, never rewritten by the guide
  | { kind: "unknown" };

const RESERVED_PREFIXES = ["/board", "/w"];
const isSection = (s: string): s is Section => (SECTIONS as readonly string[]).includes(s);
const isPlace = (id: string): boolean => PLACES.some((p) => p.id === id);

/** Parse a location into a route. Legacy hashes (/#plan) are understood; bad input never throws. */
export function parseLocation(pathname: string, hash = ""): Route {
  const h = hash.replace(/^#/, "").toLowerCase();
  if ((pathname === "/" || pathname === "") && h)
    return isSection(h) ? { kind: "section", section: h } : { kind: "top" };
  if (RESERVED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return { kind: "reserved" };
  let segments: string[];
  try {
    segments = pathname
      .split("/")
      .filter(Boolean)
      .map((s) => decodeURIComponent(s).toLowerCase());
  } catch {
    return { kind: "unknown" }; // malformed percent-encoding
  }
  if (segments.length === 0) return { kind: "top" };
  const [first, second, ...rest] = segments;
  if (rest.length > 0 || !isSection(first)) return { kind: "unknown" };
  if (second === undefined) return { kind: "section", section: first };
  if (first !== "places") return { kind: "unknown" };
  return isPlace(second) ? { kind: "place", place: second } : { kind: "section", section: "places" };
}

/** Canonical path for a route (reserved/unknown → "/"; callers never navigate to those). */
export function pathFor(route: Route): string {
  if (route.kind === "section") return `/${route.section}`;
  if (route.kind === "place") return `/places/${encodeURIComponent(route.place)}`;
  return "/";
}

/** Which element a route scrolls to. */
export function targetFor(route: Route): SpyId {
  if (route.kind === "section") return route.section;
  if (route.kind === "place") return "places";
  return "top";
}

const SITE = "Plains to Peaks";
const BASE_TITLE = "Plains to Peaks — 15 Days from Pune";
const LABELS: Record<Section, string> = {
  route: "Route",
  days: "Day by day",
  places: "Places",
  food: "Food",
  plan: "Plan",
};

export function titleFor(route: Route): string {
  if (route.kind === "section") return `${LABELS[route.section]} · ${SITE}`;
  if (route.kind === "place") return `${placeById(route.place)?.name ?? "Places"} · Places · ${SITE}`;
  return BASE_TITLE;
}

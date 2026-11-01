import { isId } from "./ids";

export type WsRoute =
  { kind: "home" } | { kind: "new" } | { kind: "workspace"; wsId: string } | { kind: "redirect"; to: string };

/** /w → home, /w/new → new, /w/<id>[/…] → workspace (deeper views arrive in later stories), /board… and anything else → /w. */
export function parseWsPath(pathname: string): WsRoute {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] === "board") return { kind: "redirect", to: "/w" };
  if (parts.length === 1) return { kind: "home" };
  if (parts[1] === "new" && parts.length === 2) return { kind: "new" };
  if (isId(parts[1])) return { kind: "workspace", wsId: parts[1] };
  return { kind: "redirect", to: "/w" };
}

/** Read and validate `#key=…` from a hash. */
export function keyFromHash(hash: string): string | null {
  const m = /(?:^#|&)key=([A-Za-z0-9_-]{43})(?:&|$)/.exec(hash);
  return m ? m[1] : null;
}

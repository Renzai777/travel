import { nanoid } from "nanoid";

/** 12-char URL-safe id (~71 bits): workspace, node, member and event ids. Made in the browser so everything works offline. */
export const newId = (): string => nanoid(12);
export const isId = (s: string): boolean => /^[A-Za-z0-9_-]{12}$/.test(s);

/** Workspace access key: 32 random bytes, base64url. Travels only in the URL fragment (#key=…), never to servers. */
export function newKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
export const isKey = (s: string): boolean => /^[A-Za-z0-9_-]{43}$/.test(s);

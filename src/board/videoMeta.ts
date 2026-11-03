import { safeThumbnail } from "./urls";

export interface VideoMeta {
  title?: string;
  thumbnail?: string;
}

/** found: details to store; missing: the video is private/removed (don't ask again); retry: offline, rate-limited or the API is down. */
export type MetaResult = { kind: "found"; meta: VideoMeta } | { kind: "missing" } | { kind: "retry" };

/** Our API's answer, re-checked (only fields we use; Vimeo thumbnails only from its image host — YouTube's are built from the id). */
export function parseApiMeta(json: unknown): VideoMeta {
  if (typeof json !== "object" || json === null) return {};
  const { title, thumbnail } = json as { title?: unknown; thumbnail?: unknown };
  const meta: VideoMeta = {};
  if (typeof title === "string" && title.trim()) meta.title = title.trim().slice(0, 300);
  const thumb = safeThumbnail(thumbnail);
  if (thumb) meta.thumbnail = thumb;
  return meta;
}

// At most 3 lookups at a time across all cards (a board can hold many videos; the API is rate-limited).
const MAX_ACTIVE = 3;
let active = 0;
const waiting: (() => void)[] = [];

async function inSlot<T>(run: () => Promise<T>): Promise<T> {
  if (active >= MAX_ACTIVE) await new Promise<void>((resolve) => waiting.push(resolve));
  active++;
  try {
    return await run();
  } finally {
    active--;
    waiting.shift()?.();
  }
}

/** Title (and Vimeo thumbnail) for a video card, from the app's own /api/oembed. */
export function fetchVideoMeta(url: string, signal?: AbortSignal): Promise<MetaResult> {
  return inSlot(async (): Promise<MetaResult> => {
    if (signal?.aborted) return { kind: "retry" };
    try {
      const res = await fetch(`/api/oembed?url=${encodeURIComponent(url)}`, {
        signal,
        credentials: "same-origin",
        headers: { accept: "application/json" },
      });
      if (res.status === 404 || res.status === 400) return { kind: "missing" };
      if (!res.ok || !(res.headers.get("content-type") ?? "").includes("application/json")) return { kind: "retry" };
      return { kind: "found", meta: parseApiMeta(await res.json()) };
    } catch {
      return { kind: "retry" };
    }
  });
}

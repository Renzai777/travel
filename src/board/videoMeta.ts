import { safeThumbnail } from "./urls";

export interface VideoMeta {
  title?: string;
  thumbnail?: string;
}

/** Picks the fields we use out of a Vimeo oEmbed answer, validating each (the answer is untrusted). */
export function parseVimeoOembed(json: unknown): VideoMeta {
  if (typeof json !== "object" || json === null) return {};
  const { title, thumbnail_url } = json as { title?: unknown; thumbnail_url?: unknown };
  const meta: VideoMeta = {};
  if (typeof title === "string" && title.trim()) meta.title = title.trim().slice(0, 300);
  const thumb = safeThumbnail(thumbnail_url);
  if (thumb) meta.thumbnail = thumb;
  return meta;
}

/** Title + thumbnail for a Vimeo video, straight from Vimeo's oEmbed (it allows browser requests). Null when offline or on any error. */
export async function fetchVimeoMeta(videoId: string, signal?: AbortSignal): Promise<VideoMeta | null> {
  if (!/^\d{5,12}$/.test(videoId)) return null;
  const page = encodeURIComponent(`https://vimeo.com/${videoId}`);
  try {
    const res = await fetch(`https://vimeo.com/api/oembed.json?url=${page}&width=640`, {
      signal,
      credentials: "omit",
      referrerPolicy: "no-referrer",
    });
    if (!res.ok) return null;
    return parseVimeoOembed(await res.json());
  } catch {
    return null;
  }
}

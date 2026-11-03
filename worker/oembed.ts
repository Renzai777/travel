import { parseCardUrl, safeThumbnail } from "../src/board/urls";

export const TITLE_MAX = 300;
export const AUTHOR_MAX = 100;
export const BODY_MAX = 64 * 1024;
const TIMEOUT_MS = 4000;
const URL_PARAM_MAX = 2048;

export type Provider = "youtube" | "vimeo";
export interface Video {
  provider: Provider;
  videoId: string;
}
export interface OembedResult extends Video {
  title: string;
  author?: string;
  thumbnail?: string;
}
export type FetchLike = (input: string, init: RequestInit) => Promise<Response>;
export type Lookup = { status: 200; body: OembedResult } | { status: 404 } | { status: 502 };

/** `?url=` → the video it names (exactly one `url` parameter, a YouTube/Vimeo link that passes the app's own URL rules), or null. */
export function videoFromQuery(search: URLSearchParams): Video | null {
  const values = search.getAll("url");
  if (values.length !== 1 || values[0].length > URL_PARAM_MAX) return null;
  const card = parseCardUrl(values[0]);
  return card?.kind === "video" ? { provider: card.value.provider, videoId: card.value.videoId } : null;
}

/** The only URLs the Worker ever fetches: built from the validated id, nothing else from the request. */
export function upstreamUrl({ provider, videoId }: Video): string {
  return provider === "youtube"
    ? `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}`
    : `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(`https://vimeo.com/${videoId}`)}&width=640`;
}

const oneLine = (value: unknown, max: number): string | undefined => {
  if (typeof value !== "string") return undefined;
  const clean = value
    .replace(/[\s\p{Cc}]+/gu, " ")
    .trim()
    .slice(0, max);
  return clean || undefined;
};

/** Picks and validates the fields we use from an (untrusted) oEmbed answer. Null when there is no usable title. */
export function sanitize(video: Video, json: unknown): OembedResult | null {
  if (typeof json !== "object" || json === null || Array.isArray(json)) return null;
  const j = json as Record<string, unknown>;
  const title = oneLine(j.title, TITLE_MAX);
  if (!title) return null;
  const out: OembedResult = { ...video, title };
  const author = oneLine(j.author_name, AUTHOR_MAX);
  if (author) out.author = author;
  const thumbnail =
    video.provider === "youtube"
      ? `https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg`
      : safeThumbnail(j.thumbnail_url);
  if (thumbnail) out.thumbnail = thumbnail;
  return out;
}

/** Reads at most `max` bytes of a body (streamed, so a lying Content-Length can't get around it). Null when it's bigger. */
export async function readCapped(res: Response, max: number): Promise<string | null> {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const all = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    all.set(c, offset);
    offset += c.byteLength;
  }
  return new TextDecoder().decode(all);
}

/** Asks the provider's oEmbed endpoint. Redirects are never followed; anything unexpected is a 502. */
export async function lookupVideo(video: Video, fetchImpl: FetchLike): Promise<Lookup> {
  let res: Response;
  try {
    res = await fetchImpl(upstreamUrl(video), {
      method: "GET",
      redirect: "manual",
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    return { status: 502 };
  }
  if (res.status === 400 || res.status === 401 || res.status === 403 || res.status === 404) return { status: 404 }; // private, removed, embedding off
  if (res.status !== 200 || !/^application\/json\b/i.test(res.headers.get("content-type") ?? ""))
    return { status: 502 };
  let text: string | null;
  try {
    text = await readCapped(res, BODY_MAX);
  } catch {
    return { status: 502 };
  }
  if (text === null) return { status: 502 };
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { status: 502 };
  }
  const body = sanitize(video, json);
  return body ? { status: 200, body } : { status: 502 };
}

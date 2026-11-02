/** URL safety for cards. Every path (paste, the Link field, stored or synced cards, Open) goes through these functions. */

export interface SafeUrl {
  url: string;
  hostname: string;
}

export interface VideoUrl extends SafeUrl {
  provider: "youtube" | "vimeo";
  videoId: string;
  /** Privacy player URL built only from the validated id (and start time); nothing else from the pasted URL. */
  embedUrl: string;
}

export type CardUrl = { kind: "video"; value: VideoUrl } | { kind: "link"; value: SafeUrl };

const MAX_URL_LENGTH = 2048;
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const VIMEO_ID = /^\d{5,12}$/;
const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be"]);
const VIMEO_HOSTS = new Set(["vimeo.com", "www.vimeo.com", "player.vimeo.com"]);

/** Only http(s), no user:password@, no javascript:/data:/file: and friends. Returns the normalised URL. */
export function parseSafeUrl(input: string): SafeUrl | null {
  const value = input.trim();
  if (!value || value.length > MAX_URL_LENGTH) return null;
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  if (parsed.username || parsed.password || !parsed.hostname) return null;
  return { url: parsed.href, hostname: parsed.hostname.toLowerCase() };
}

/** "90", "1m30s", "1h2m3s" → seconds. */
function parseStart(raw: string | null): number | undefined {
  if (!raw) return undefined;
  if (/^\d+$/.test(raw)) return Number(raw);
  const m = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(raw);
  if (!m || !(m[1] || m[2] || m[3])) return undefined;
  return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
}

function youtube(url: URL): { id: string; start?: number } | null {
  const host = url.hostname.toLowerCase();
  if (!YOUTUBE_HOSTS.has(host)) return null;
  const parts = url.pathname.split("/").filter(Boolean);
  let id: string | null = null;
  if (host === "youtu.be") id = parts.length === 1 ? parts[0] : null;
  else if (url.pathname === "/watch") id = url.searchParams.get("v");
  else if (parts.length === 2 && ["shorts", "embed", "live"].includes(parts[0])) id = parts[1];
  if (!id || !YOUTUBE_ID.test(id)) return null;
  return { id, start: parseStart(url.searchParams.get("t") ?? url.searchParams.get("start")) };
}

function vimeo(url: URL): string | null {
  const host = url.hostname.toLowerCase();
  if (!VIMEO_HOSTS.has(host)) return null;
  const parts = url.pathname.split("/").filter(Boolean);
  const id = host === "player.vimeo.com" ? (parts[0] === "video" ? parts[1] : undefined) : parts[0];
  return id && VIMEO_ID.test(id) ? id : null;
}

/** A pasted or stored URL → a video card (YouTube/Vimeo) or a link card, or null when it isn't safe. */
export function parseCardUrl(input: string): CardUrl | null {
  const safe = parseSafeUrl(input);
  if (!safe) return null;
  const url = new URL(safe.url);

  const yt = youtube(url);
  if (yt) {
    const embed = new URL(`https://www.youtube-nocookie.com/embed/${yt.id}`);
    if (yt.start) embed.searchParams.set("start", String(yt.start));
    return { kind: "video", value: { ...safe, provider: "youtube", videoId: yt.id, embedUrl: embed.href } };
  }

  const vm = vimeo(url);
  if (vm) {
    return {
      kind: "video",
      value: { ...safe, provider: "vimeo", videoId: vm, embedUrl: `https://player.vimeo.com/video/${vm}?dnt=1` },
    };
  }

  return { kind: "link", value: safe };
}

/** Every distinct http(s) URL in a piece of text, in order, without trailing punctuation. */
export function extractUrls(text: string): string[] {
  const matches = text.match(/https?:\/\/[^\s<>"'`]+/gi) ?? [];
  return [...new Set(matches.map((m) => m.replace(/[),.!?;:\]]+$/, "")))];
}

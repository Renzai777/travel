import { PHOTO_CACHE } from "./cacheNames";

/** Total size of public/assets/img in bytes (update when the photo set changes). */
export const PHOTO_BYTES = 28_442_683;

export type SaveResult = { saved: number; failed: string[] };

const absolute = (src: string): string => new URL(src, window.location.origin).href;

/** The Cache API and service workers are both needed for photos to be available offline. */
export function offlineSupported(): boolean {
  return "caches" in window && "serviceWorker" in navigator;
}

/** How many of the given photos are already in the photo cache. */
export async function countSavedPhotos(srcs: string[]): Promise<number> {
  const cache = await caches.open(PHOTO_CACHE);
  const hits = await Promise.all([...new Set(srcs.map(absolute))].map((url) => cache.match(url)));
  return hits.filter(Boolean).length;
}

/** Download every photo into the photo cache (skipping ones already saved), `concurrency` at a time. */
export async function savePhotosForOffline(
  srcs: string[],
  onProgress: (done: number, total: number) => void,
  concurrency = 4,
): Promise<SaveResult> {
  const cache = await caches.open(PHOTO_CACHE);
  const urls = [...new Set(srcs.map(absolute))];
  const failed: string[] = [];
  let saved = 0;
  let done = 0;
  let next = 0;

  const worker = async (): Promise<void> => {
    while (next < urls.length) {
      const url = urls[next++];
      try {
        if (!(await cache.match(url))) {
          const response = await fetch(url);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          await cache.put(url, response);
        }
        saved++;
      } catch {
        failed.push(url);
      }
      done++;
      onProgress(done, urls.length);
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, urls.length) }, worker));
  return { saved, failed };
}

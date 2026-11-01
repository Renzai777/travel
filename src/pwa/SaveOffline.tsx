import { useEffect, useState } from "react";
import { PHOTOS } from "../data/photos";
import { PHOTO_BYTES, countSavedPhotos, offlineSupported, savePhotosForOffline } from "./savePhotos";

type Status = "checking" | "unsupported" | "idle" | "saving" | "done" | "partial";

const srcs = PHOTOS.map((p) => p.src);
const total = srcs.length;
const size = Math.round(PHOTO_BYTES / 1_000_000);

export function SaveOffline() {
  const [status, setStatus] = useState<Status>("checking");
  const [done, setDone] = useState(0);
  const [savedBefore, setSavedBefore] = useState(0);
  const [failedCount, setFailedCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        if (!offlineSupported()) {
          if (!cancelled) setStatus("unsupported");
          return;
        }
        // On a first visit the worker may still be registering, so wait for it briefly (never resolves without one, e.g. in dev).
        const registration =
          (await navigator.serviceWorker.getRegistration()) ??
          (await Promise.race([
            navigator.serviceWorker.ready,
            new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), 4000)),
          ]));
        if (!registration) {
          if (!cancelled) setStatus("unsupported");
          return;
        }
        const n = await countSavedPhotos(srcs);
        if (!cancelled) {
          setSavedBefore(n);
          setStatus(n === total ? "done" : "idle");
        }
      } catch {
        if (!cancelled) setStatus("unsupported");
      }
    }

    void check();

    return () => {
      cancelled = true;
    };
  }, []);

  const save = async () => {
    setStatus("saving");
    setDone(0);
    try {
      await navigator.storage?.persist?.();
    } catch {
      /* best effort */
    }
    try {
      const r = await savePhotosForOffline(srcs, (d) => setDone(d));
      setFailedCount(r.failed.length);
      setStatus(r.failed.length ? "partial" : "done");
    } catch {
      // e.g. storage full or the Cache API unavailable: nothing is known to be saved
      setFailedCount(total);
      setStatus("partial");
    }
  };

  let message = "";
  switch (status) {
    case "checking":
      message = "Checking what's saved on this device…";
      break;
    case "unsupported":
      message = "Offline photos need the installed or production site in a browser with service-worker support.";
      break;
    case "idle":
      message = `Save all ${total} photos (about ${size} MB) so the guide works with no signal.${
        savedBefore > 0 ? ` ${savedBefore} already saved.` : ""
      }`;
      break;
    case "saving":
      message = `Saving photos… ${done} / ${total}`;
      break;
    case "done":
      message = `All ${total} photos are saved on this device.`;
      break;
    case "partial":
      message = `${total - failedCount} of ${total} photos saved — ${failedCount} failed. Check your connection and try again.`;
      break;
  }

  const isSaving = status === "saving";
  const button =
    status === "idle" || status === "partial" || isSaving ? (
      <button type="button" className="btn btn-primary" onClick={save} disabled={isSaving}>
        {isSaving ? "Saving…" : status === "idle" ? "Save photos for offline" : "Try again"}
      </button>
    ) : null;

  return (
    <article className="tile tile-offline" aria-labelledby="offline-heading">
      <h3 id="offline-heading">
        Going off-grid? <small>Keep the guide and its photos on this device</small>
      </h3>
      <p className="offline-status" aria-live="polite">
        {message}
      </p>
      {status === "saving" ? <progress max={total} value={done} aria-label="Photos saved" /> : null}
      {button}
    </article>
  );
}

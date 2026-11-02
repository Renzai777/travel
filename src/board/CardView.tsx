import type { ExcalidrawEmbeddableElement, NonDeleted } from "@excalidraw/excalidraw/element/types";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { useEffect, useRef, useState, useSyncExternalStore, type RefObject } from "react";
import { cardData, metaFetched, setCardMeta, setCardTitle } from "./cards";
import { parseCardUrl, youtubeThumbnail } from "./urls";
import { fetchVimeoMeta } from "./videoMeta";

function subscribeOnline(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

function useOnline() {
  return useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
}

export function CardView({
  element,
  apiRef,
}: {
  element: NonDeleted<ExcalidrawEmbeddableElement>;
  apiRef: RefObject<ExcalidrawImperativeAPI | null>;
}) {
  const online = useOnline();
  const [playing, setPlaying] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const cancelNextBlur = useRef(false);
  const renameCommitted = useRef(false);

  // URL from element.link, re-validated on every render (stored/synced data is untrusted).
  const parsed = parseCardUrl(element.link ?? "");
  const data = cardData(element);

  const vimeoId = parsed?.kind === "video" && parsed.value.provider === "vimeo" ? parsed.value.videoId : null;
  const needsMeta = vimeoId !== null && !metaFetched(element);
  useEffect(() => {
    if (!vimeoId || !needsMeta || !navigator.onLine) return;
    const ctrl = new AbortController();
    void fetchVimeoMeta(vimeoId, ctrl.signal).then((meta) => {
      if (meta && apiRef.current)
        setCardMeta(apiRef.current, element.id, { thumbnail: meta.thumbnail, autoTitle: meta.title });
    });
    return () => ctrl.abort();
  }, [vimeoId, needsMeta, element.id, apiRef]);

  if (parsed === null) {
    return <div className="board-card board-card-blocked">This link can't be shown.</div>;
  }

  const isVideo = parsed.kind === "video" && data?.kind !== "link";
  const fallback = isVideo ? (parsed.value.provider === "youtube" ? "YouTube video" : "Vimeo video") : parsed.value.url;
  const title = isVideo ? data?.title || data?.autoTitle || fallback : data?.title || fallback;
  const thumb =
    parsed.kind === "video"
      ? parsed.value.provider === "youtube"
        ? youtubeThumbnail(parsed.value.videoId)
        : (data?.thumbnail ?? null)
      : null;

  const startRename = () => {
    renameCommitted.current = false;
    cancelNextBlur.current = false;
    setRenaming(true);
  };

  const commitRename = (value: string) => {
    if (cancelNextBlur.current) {
      cancelNextBlur.current = false;
      setRenaming(false);
      return;
    }
    if (renameCommitted.current) return;
    renameCommitted.current = true;
    if (apiRef.current) {
      setCardTitle(apiRef.current, element.id, value);
    }
    setRenaming(false);
  };

  const renameInput = (
    <input
      className="board-card-input"
      aria-label="Card title"
      defaultValue={data?.title ?? ""}
      maxLength={300}
      autoFocus
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter") {
          commitRename(e.currentTarget.value);
        } else if (e.key === "Escape") {
          cancelNextBlur.current = true;
          setRenaming(false);
        }
      }}
      onBlur={(e) => {
        commitRename(e.currentTarget.value);
      }}
    />
  );

  const renameButton = data !== null && (
    <button
      type="button"
      className="board-card-rename"
      aria-label="Rename card"
      onClick={() => {
        if (renaming) {
          setRenaming(false);
        } else {
          startRename();
        }
      }}
    >
      ✎
    </button>
  );

  const openLink = (
    <a className="board-card-open" href={parsed.value.url} target="_blank" rel="noopener noreferrer">
      Open ↗
    </a>
  );

  if (isVideo) {
    const embedUrl = new URL(parsed.value.embedUrl);
    embedUrl.searchParams.set("autoplay", "1");
    const src = embedUrl.href;
    const providerLabel = parsed.value.provider === "youtube" ? "YouTube" : "Vimeo";

    return (
      <div className="board-card board-card-video">
        <div className="board-card-stage">
          {playing ? (
            <iframe
              className="board-card-frame"
              src={src}
              title={title}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              referrerPolicy="strict-origin-when-cross-origin"
              sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
              allowFullScreen
            />
          ) : (
            <>
              {thumb && (
                <img
                  className="board-card-thumb"
                  src={thumb}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  draggable={false}
                  onError={(e) => {
                    e.currentTarget.hidden = true;
                  }}
                />
              )}
              <span className="board-card-badge">{providerLabel}</span>
              {online ? (
                <button
                  type="button"
                  className="board-card-play"
                  aria-label={`Play ${title}`}
                  onClick={() => setPlaying(true)}
                >
                  ▶
                </button>
              ) : (
                <p className="board-card-offline">Needs a connection to play</p>
              )}
            </>
          )}
        </div>
        <div className="board-card-bar">
          {renaming ? renameInput : <span className="board-card-title">{title}</span>}
          {openLink}
          {renameButton}
        </div>
      </div>
    );
  }

  return (
    <div className="board-card board-card-link">
      <span className="board-card-host">{parsed.value.hostname}</span>
      {renaming ? renameInput : <span className="board-card-title">{title}</span>}
      <div className="board-card-bar">
        {openLink}
        {renameButton}
      </div>
    </div>
  );
}

import { CaptureUpdateAction } from "@excalidraw/excalidraw";
import type { ExcalidrawEmbeddableElement, NonDeleted } from "@excalidraw/excalidraw/element/types";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { useEffect, useState, useSyncExternalStore, type RefObject } from "react";
import { cardData, metaFetched, setCardMeta } from "./cards";
import { useBoardTags } from "./tagsContext";
import { parseCardUrl, youtubeThumbnail } from "./urls";
import { fetchVideoMeta } from "./videoMeta";

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
  const tags = useBoardTags();

  // URL from element.link, re-validated on every render (stored/synced data is untrusted).
  const parsed = parseCardUrl(element.link ?? "");
  const data = cardData(element);

  const videoUrl = parsed?.kind === "video" ? parsed.value.url : null;
  const needsMeta = videoUrl !== null && !metaFetched(element);
  useEffect(() => {
    if (!videoUrl || !needsMeta || !navigator.onLine) return;
    const ctrl = new AbortController();
    void fetchVideoMeta(videoUrl, ctrl.signal).then((result) => {
      const api = apiRef.current;
      if (!api || ctrl.signal.aborted) return;
      if (result.kind === "found")
        setCardMeta(api, element.id, { thumbnail: result.meta.thumbnail, autoTitle: result.meta.title });
      else if (result.kind === "missing") setCardMeta(api, element.id, {});
    });
    return () => ctrl.abort();
  }, [videoUrl, needsMeta, element.id, apiRef]);

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

  const editButton = data !== null && (
    <button
      type="button"
      className="board-card-rename"
      aria-label="Edit details"
      title="Title, tags and notes"
      onClick={() => {
        apiRef.current?.updateScene({
          appState: { selectedElementIds: { [element.id]: true } },
          captureUpdate: CaptureUpdateAction.NEVER,
        });
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

  const notesIcon = Boolean(data?.notes) && (
    <span className="board-card-has-notes" title="Has notes" aria-label="Has notes">
      📝
    </span>
  );

  const knownTags = (data?.tags ?? [])
    .map((id) => tags.find((t) => t.id === id))
    .filter((t): t is (typeof tags)[number] => Boolean(t));

  const tagsNode = knownTags.length > 0 && (
    <div className="board-card-tags">
      {knownTags.slice(0, 3).map((t) => (
        <span key={t.id} className="board-tag board-tag-small" style={{ background: t.color }}>
          {t.name}
        </span>
      ))}
      {knownTags.length > 3 && (
        <span className="board-tag board-tag-small board-tag-more">+{knownTags.length - 3}</span>
      )}
    </div>
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
              {tagsNode}
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
          <span className="board-card-title">{title}</span>
          {notesIcon}
          {openLink}
          {editButton}
        </div>
      </div>
    );
  }

  return (
    <div className="board-card board-card-link">
      <span className="board-card-host">{parsed.value.hostname}</span>
      <span className="board-card-title">{title}</span>
      {tagsNode}
      <div className="board-card-bar">
        {notesIcon}
        {openLink}
        {editButton}
      </div>
    </div>
  );
}

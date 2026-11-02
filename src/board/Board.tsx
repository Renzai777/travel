import "@excalidraw/excalidraw/index.css";
import { CaptureUpdateAction, Excalidraw, MainMenu, reconcileElements } from "@excalidraw/excalidraw";
import type { OrderedExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type { RemoteExcalidrawElement } from "@excalidraw/excalidraw/data/reconcile";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { useCallback, useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import { boardDocName } from "../workspace/docNames";
import { openDoc, type OpenDoc } from "../workspace/openDoc";
import { LOCAL_ORIGIN, elementsMap, liveCount, readElements, writeElements } from "./sceneSync";
import { useSiteTheme } from "./useSiteTheme";
import "./board.css";

// Self-hosted fonts (copied from the package at build time, see vite.config.ts). Must be set before Excalidraw loads a font.
window.EXCALIDRAW_ASSET_PATH = "/excalidraw-assets/";

/** How long local edits are batched before they are written to the board doc. */
const WRITE_DELAY_MS = 100;
const WARN_AT = 500;
const LIMIT = 1000;

export interface BoardProps {
  wsId: string;
  folderId: string;
  title: string;
}

/** One free-flow Excalidraw canvas per folder, stored in its own Yjs doc (`board:<wsId>:<folderId>`), offline-first and synced across tabs. */
export default function Board({ wsId, folderId, title }: BoardProps) {
  const [handle, setHandle] = useState<OpenDoc | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let mounted = true;
    const h = openDoc(boardDocName(wsId, folderId));
    h.synced.then(
      () => mounted && setHandle(h),
      () => mounted && setFailed(true),
    );
    return () => {
      mounted = false;
      h.destroy();
    };
  }, [wsId, folderId]);

  if (failed) {
    return (
      <div className="board-message" role="alert">
        This browser couldn't open its local storage, so the board can't be shown.
      </div>
    );
  }
  if (!handle) {
    return (
      <div className="board-message" role="status">
        Opening the {title} board…
      </div>
    );
  }
  return <BoardCanvas key={folderId} doc={handle.doc} title={title} />;
}

function BoardCanvas({ doc, title }: { doc: Y.Doc; title: string }) {
  const theme = useSiteTheme();
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const [initialElements] = useState(() => readElements<OrderedExcalidrawElement>(doc));
  const [count, setCount] = useState(() => liveCount(initialElements));
  const limitToastShown = useRef(false);

  // Local → Yjs: batched writes of every element that changed (Excalidraw bumps `version` on every edit, deletions included).
  const timer = useRef<number | null>(null);
  const flush = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    const api = apiRef.current;
    if (api) writeElements(doc, api.getSceneElementsIncludingDeleted());
  }, [doc]);

  const onChange = (elements: readonly OrderedExcalidrawElement[]) => {
    const live = liveCount(elements);
    if (live !== count) setCount(live);
    // Soft limit: never throw work away, but say clearly once that the board is full.
    if (live > LIMIT && !limitToastShown.current) {
      limitToastShown.current = true;
      apiRef.current?.setToast({
        message: "This board is full. Delete something, or move things into a subfolder board.",
        closable: true,
        duration: 6000,
      });
    } else if (live <= LIMIT) {
      limitToastShown.current = false;
    }
    if (timer.current === null) timer.current = window.setTimeout(flush, WRITE_DELAY_MS);
  };

  // Yjs → canvas: changes from other tabs (and, in Epic 4, other people). Our own writes are skipped by origin.
  useEffect(() => {
    const map = elementsMap<OrderedExcalidrawElement>(doc);
    const onRemote = (event: Y.YMapEvent<OrderedExcalidrawElement>) => {
      if (event.transaction.origin === LOCAL_ORIGIN) return;
      const api = apiRef.current;
      if (!api) return;
      const remote = [...event.keysChanged]
        .map((id) => map.get(id))
        .filter((el): el is OrderedExcalidrawElement => Boolean(el)) as unknown as RemoteExcalidrawElement[];
      const merged = reconcileElements(api.getSceneElementsIncludingDeleted(), remote, api.getAppState());
      api.updateScene({ elements: merged, captureUpdate: CaptureUpdateAction.NEVER }); // never in local undo
      writeElements(doc, merged); // local copies that beat the stored ones are written back, so every tab converges
    };
    map.observe(onRemote);

    const flushNow = flush;
    const onHidden = () => document.visibilityState === "hidden" && flushNow();
    window.addEventListener("pagehide", flushNow);
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      map.unobserve(onRemote);
      window.removeEventListener("pagehide", flushNow);
      document.removeEventListener("visibilitychange", onHidden);
      flushNow();
    };
  }, [doc, flush]);

  return (
    <div className="board" data-theme={theme}>
      <Excalidraw
        excalidrawAPI={(api) => {
          apiRef.current = api;
        }}
        initialData={{
          elements: initialElements,
          // Excalidraw renders dark mode by inverting the canvas, so the stored background stays white in both themes.
          appState: { theme },
          scrollToContent: true,
        }}
        theme={theme}
        onChange={onChange}
        name={title}
        UIOptions={{
          canvasActions: {
            loadScene: false,
            saveToActiveFile: false,
            export: false,
            saveAsImage: false,
            clearCanvas: false,
            toggleTheme: null,
            changeViewBackgroundColor: true,
          },
          tools: { image: false },
        }}
      >
        <MainMenu>
          <MainMenu.DefaultItems.ChangeCanvasBackground />
          <MainMenu.DefaultItems.Help />
        </MainMenu>
      </Excalidraw>
      {count === 0 && (
        <div className="board-empty" aria-hidden="true">
          <p className="board-empty-title">The {title} board</p>
          <p>Pick a tool above to draw, write or add shapes. Double-click anywhere to type.</p>
        </div>
      )}
      {count >= WARN_AT && (
        <p className="board-warning" role="status">
          This board is getting big ({count} items). Subfolders keep things quick.
        </p>
      )}
    </div>
  );
}

import "@excalidraw/excalidraw/index.css";
import { CaptureUpdateAction, Excalidraw, MainMenu, reconcileElements } from "@excalidraw/excalidraw";
import type { OrderedExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type { RemoteExcalidrawElement } from "@excalidraw/excalidraw/data/reconcile";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { useCallback, useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import { setFocusMode, toggleFocusMode, useBoardLayout } from "../workspace/boardLayout";
import { boardDocName } from "../workspace/docNames";
import { openDoc, type OpenDoc } from "../workspace/openDoc";
import { addNote, NOTE_COLORS, type NoteColorId } from "./notes";
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

/** True when the key press belongs to a text field (sidebar inputs, dialogs, Excalidraw's own text editor). */
function isTyping(el: HTMLElement): boolean {
  return (
    el.isContentEditable ||
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    el instanceof HTMLSelectElement
  );
}

function BoardCanvas({ doc, title }: { doc: Y.Doc; title: string }) {
  const theme = useSiteTheme();
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const [initialElements] = useState(() => readElements<OrderedExcalidrawElement>(doc));
  const [count, setCount] = useState(() => liveCount(initialElements));
  const limitToastShown = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [noteColor, setNoteColor] = useState<NoteColorId>("yellow");
  const [toolPicked, setToolPicked] = useState(false);
  const { focus } = useBoardLayout();
  const full = count >= LIMIT;

  const newNote = useCallback((color: NoteColorId) => {
    const api = apiRef.current;
    if (!api) return;
    if (liveCount(api.getSceneElements()) >= LIMIT) {
      api.setToast({
        message: "This board is full. Delete something first, or use a subfolder board.",
        closable: true,
      });
      return;
    }
    setNoteColor(color);
    addNote(api, color, containerRef.current);
  }, []);

  const startDrawing = () => {
    apiRef.current?.setActiveTool({ type: "freedraw" });
    setToolPicked(true);
  };

  const fitToContent = () => {
    const api = apiRef.current;
    if (api) api.scrollToContent(undefined, { fitToViewport: true, viewportZoomFactor: 0.9, animate: true });
  };

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

  const onChange = (elements: readonly OrderedExcalidrawElement[], appState: { activeTool: { type: string } }) => {
    if (!toolPicked && appState.activeTool.type !== "selection") setToolPicked(true);
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

  // The shortcut handler reads the latest values without re-subscribing.
  const noteColorRef = useRef(noteColor);
  const focusRef = useRef(focus);
  useEffect(() => {
    noteColorRef.current = noteColor;
    focusRef.current = focus;
  });

  // Our shortcuts: N = new note, Shift+F = focus mode, Esc = leave focus mode. Ignored while typing anywhere, and only
  // when the board (or nothing in particular) has the keyboard, so typing in the sidebar never adds notes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
      const target = e.target instanceof HTMLElement ? e.target : null;
      const inBoard = !target || target === document.body || Boolean(containerRef.current?.contains(target));
      if (!inBoard || (target && isTyping(target))) return;
      const api = apiRef.current;
      if (!api || api.getAppState().editingTextElement) return;

      if (e.key === "n" || e.key === "N") {
        if (e.shiftKey) return;
        e.preventDefault();
        newNote(noteColorRef.current);
      } else if ((e.key === "F" || e.key === "f") && e.shiftKey) {
        e.preventDefault();
        toggleFocusMode();
      } else if (e.key === "Escape" && focusRef.current) {
        const { selectedElementIds, openMenu, openPopup, openDialog } = api.getAppState();
        if (Object.keys(selectedElementIds).length > 0 || openMenu || openPopup || openDialog) return; // Esc closes those first
        setFocusMode(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [newNote]);

  const renderTopRightUI = (isMobile: boolean) => (
    <div className="board-tools" role="toolbar" aria-label="Board">
      <button
        type="button"
        className="board-tool board-tool-note"
        onClick={() => newNote(noteColor)}
        disabled={full}
        title={full ? "This board is full" : "Add a sticky note (N)"}
      >
        <span
          className="board-swatch"
          style={{ background: NOTE_COLORS.find((c) => c.id === noteColor)?.fill }}
          aria-hidden="true"
        />
        Note
      </button>
      {!isMobile && (
        <span className="board-swatches" role="group" aria-label="Note colour">
          {NOTE_COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              className="board-swatch-button"
              aria-label={`${c.label} note`}
              aria-pressed={c.id === noteColor}
              title={`${c.label} note`}
              disabled={full}
              onClick={() => newNote(c.id)}
            >
              <span className="board-swatch" style={{ background: c.fill }} aria-hidden="true" />
            </button>
          ))}
        </span>
      )}
      {!isMobile && (
        <button
          type="button"
          className="board-tool"
          onClick={fitToContent}
          title="Show everything on the board (Shift+1)"
        >
          Fit
        </button>
      )}
      <button
        type="button"
        className={focus ? "board-tool board-tool-exit" : "board-tool"}
        onClick={toggleFocusMode}
        aria-pressed={focus}
        title={focus ? "Exit focus mode (Esc)" : "Focus: hide everything but the board (Shift+F)"}
      >
        {focus ? "Exit focus" : "Focus"}
      </button>
    </div>
  );

  return (
    <div className="board" data-theme={theme} ref={containerRef}>
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
        renderTopRightUI={renderTopRightUI}
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
      {count === 0 && !toolPicked && (
        <div className="board-empty">
          <div className="board-empty-card">
            <h3 className="board-empty-title">Start planning {title}</h3>
            <div className="board-empty-actions">
              <button type="button" className="board-empty-action" onClick={() => newNote(noteColor)}>
                <span className="board-swatch" style={{ background: NOTE_COLORS[0].fill }} aria-hidden="true" />
                Add a note
              </button>
              <button type="button" className="board-empty-action" onClick={startDrawing}>
                <span aria-hidden="true">✎</span>
                Start drawing
              </button>
            </div>
            <p className="board-empty-hint">Or double-click anywhere on the board to type. Press N for a new note.</p>
          </div>
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

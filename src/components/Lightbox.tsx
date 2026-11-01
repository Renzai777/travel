import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { LightboxContext } from "./lightboxContext";
import type { Photo } from "../types/photo";

export function LightboxProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ list: Photo[]; index: number }>({
    list: [],
    index: 0,
  });
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Stable identity: every Zoomable consumes this context, so it must not change on lightbox navigation.
  const open = useCallback((list: Photo[], index: number) => {
    const nextIndex = list.length > 0 ? ((index % list.length) + list.length) % list.length : 0;
    setState({ list, index: nextIndex });
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }, []);
  const contextValue = useMemo(() => ({ open }), [open]);

  const handlePrev = () => {
    setState((prev) => {
      if (prev.list.length === 0) return prev;
      const nextIndex = (prev.index - 1 + prev.list.length) % prev.list.length;
      return { ...prev, index: nextIndex };
    });
  };

  const handleNext = () => {
    setState((prev) => {
      if (prev.list.length === 0) return prev;
      const nextIndex = (prev.index + 1) % prev.list.length;
      return { ...prev, index: nextIndex };
    });
  };

  const handleClose = () => {
    dialogRef.current?.close();
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) {
      dialogRef.current?.close();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDialogElement>) => {
    if (e.key === "ArrowLeft") {
      handlePrev();
    } else if (e.key === "ArrowRight") {
      handleNext();
    }
  };

  const currentPhoto = state.list.length > 0 ? state.list[state.index] : undefined;

  return (
    <LightboxContext.Provider value={contextValue}>
      {children}
      <dialog
        ref={dialogRef}
        className="lightbox"
        id="lightbox"
        aria-label="Photo viewer"
        onClick={handleBackdropClick}
        onKeyDown={handleKeyDown}
      >
        <figure>
          <img id="lightboxImg" src={currentPhoto?.src} alt={currentPhoto ? currentPhoto.caption : ""} />
          <figcaption id="lightboxCap">
            {currentPhoto ? (
              <>
                <b>{currentPhoto.caption}</b>
                {` — ${currentPhoto.credit}, ${currentPhoto.license} · `}
                <a href={currentPhoto.source} target="_blank" rel="noopener noreferrer">
                  source
                </a>
              </>
            ) : null}
          </figcaption>
        </figure>
        <button type="button" className="lb-btn lb-prev" id="lbPrev" aria-label="Previous photo" onClick={handlePrev}>
          ←
        </button>
        <button type="button" className="lb-btn lb-next" id="lbNext" aria-label="Next photo" onClick={handleNext}>
          →
        </button>
        <button type="button" className="lb-btn lb-close" id="lbClose" aria-label="Close" onClick={handleClose}>
          ✕
        </button>
      </dialog>
    </LightboxContext.Provider>
  );
}

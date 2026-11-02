import { useEffect, useRef } from "react";

export type InlineRenameProps = {
  initialValue: string;
  label: string;
  onCommit: (name: string) => void;
  onCancel: () => void;
};

const SHIELDED_EVENTS = [
  "keydown",
  "keyup",
  "keypress",
  "pointerdown",
  "pointerup",
  "mousedown",
  "mouseup",
  "click",
  "dblclick",
  "touchstart",
  "touchend",
  "dragstart",
] as const;

/**
 * Inline name editor used inside a tree row. Tree rows handle keys and pointer events themselves (capture phase), so
 * while this input is mounted a window capture listener stops those events from reaching React Aria. Enter or blur
 * saves, Escape cancels.
 */
export function InlineRename({ initialValue, label, onCommit, onCancel }: InlineRenameProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const callbacks = useRef({ onCommit, onCancel });
  const finished = useRef(false);

  useEffect(() => {
    callbacks.current = { onCommit, onCancel };
  });

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    const finish = (save: boolean) => {
      if (finished.current) return;
      finished.current = true;
      const clean = input.value.trim();
      if (save && clean.length >= 1 && clean.length <= 120 && clean !== initialValue) {
        callbacks.current.onCommit(clean);
      } else {
        callbacks.current.onCancel();
      }
    };

    const shield = (e: Event) => {
      if (e.target !== input) return;
      e.stopPropagation();
      if (e.type === "keydown") {
        const key = (e as KeyboardEvent).key;
        if (key === "Enter") {
          e.preventDefault();
          finish(true);
        } else if (key === "Escape") {
          e.preventDefault();
          finish(false);
        }
      }
    };
    const onBlur = () => finish(true);

    SHIELDED_EVENTS.forEach((type) => window.addEventListener(type, shield, true));
    input.addEventListener("blur", onBlur);
    // Focus after the double click has finished being handled by the row.
    const frame = requestAnimationFrame(() => {
      input.focus();
      input.select();
    });

    return () => {
      cancelAnimationFrame(frame);
      SHIELDED_EVENTS.forEach((type) => window.removeEventListener(type, shield, true));
      input.removeEventListener("blur", onBlur);
    };
  }, [initialValue]);

  return (
    <input
      ref={inputRef}
      className="ws-inline-rename"
      aria-label={label}
      defaultValue={initialValue}
      maxLength={120}
      spellCheck={false}
      autoComplete="off"
    />
  );
}

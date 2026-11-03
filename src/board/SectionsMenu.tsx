import { useId, useRef, useState } from "react";
import { Button, Dialog, DialogTrigger, Heading, Popover } from "react-aria-components";
import type { Section } from "./sections";

export interface SectionsMenuProps {
  sections: readonly Section[];
  selectedCount: number; // things selected on the board right now (frames excluded)
  disabled: boolean; // board full
  onAdd: (name: string) => boolean;
  onJump: (id: string) => void;
  onRename: (id: string, name: string) => void;
}

export function SectionsMenu({ sections, selectedCount, disabled, onAdd, onJump, onRename }: SectionsMenuProps) {
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<{ id: string; draft: string } | null>(null);
  const inputId = useId();
  const isSavingRef = useRef(false);
  const isCancelingRef = useRef(false);

  const startEdit = (s: Section) => {
    isSavingRef.current = false;
    isCancelingRef.current = false;
    setEditing({ id: s.id, draft: s.name });
  };

  const saveEdit = (id: string, draft: string) => {
    onRename(id, draft);
    setEditing(null);
  };

  return (
    <DialogTrigger
      onOpenChange={(open) => {
        if (!open) {
          setEditing(null);
          setName("");
        }
      }}
    >
      <Button className="board-tool" aria-label="Sections">
        <span aria-hidden="true">▤</span>
        <span className="board-tool-label">Sections</span>
        {sections.length > 0 && (
          <span className="board-tool-count" aria-hidden="true">
            {sections.length}
          </span>
        )}
      </Button>
      <Popover className="react-aria-Popover board-color-popover" placement="bottom end">
        <Dialog className="board-link-dialog board-sections" aria-label="Sections">
          {({ close }) => (
            <>
              <Heading slot="title" className="board-sections-title">
                Sections
              </Heading>
              {sections.length === 0 ? (
                <p className="board-sections-empty">
                  Group part of the board under a name, like “Day 3 – Spiti”, and jump to it from here.
                </p>
              ) : (
                <ul className="board-sections-list" onKeyDown={(e) => e.stopPropagation()}>
                  {sections.map((s) => (
                    <li key={s.id} className="board-sections-row">
                      {editing?.id === s.id ? (
                        <input
                          className="board-sections-input"
                          aria-label="Section name"
                          autoFocus
                          maxLength={80}
                          value={editing.draft}
                          onChange={(e) => setEditing({ id: s.id, draft: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              isSavingRef.current = true;
                              saveEdit(s.id, editing.draft);
                            } else if (e.key === "Escape") {
                              e.stopPropagation();
                              isCancelingRef.current = true;
                              setEditing(null);
                            }
                          }}
                          onBlur={() => {
                            if (isCancelingRef.current) {
                              isCancelingRef.current = false;
                              return;
                            }
                            if (isSavingRef.current) {
                              isSavingRef.current = false;
                              return;
                            }
                            saveEdit(s.id, editing.draft);
                          }}
                        />
                      ) : (
                        <>
                          <button
                            type="button"
                            className="board-sections-jump"
                            onClick={() => {
                              onJump(s.id);
                              close();
                            }}
                          >
                            {s.name}
                          </button>
                          <button
                            type="button"
                            className="board-sections-edit"
                            aria-label={`Rename ${s.name}`}
                            title="Rename"
                            onClick={() => startEdit(s)}
                          >
                            ✎
                          </button>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <form
                className="board-link-form"
                onKeyDown={(e) => e.stopPropagation()}
                onSubmit={(e) => {
                  e.preventDefault();
                  if (onAdd(name)) {
                    setName("");
                    close();
                  }
                }}
              >
                <label htmlFor={inputId}>New section</label>
                <div className="board-link-row">
                  <input
                    id={inputId}
                    name="name"
                    autoComplete="off"
                    maxLength={80}
                    placeholder="Day 3 – Spiti"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <button type="submit" className="board-empty-action" disabled={disabled}>
                    Add
                  </button>
                </div>
                <p className="board-sections-hint">
                  {selectedCount > 0
                    ? `Wraps the ${selectedCount} selected item${selectedCount === 1 ? "" : "s"}.`
                    : "Tip: select things first to wrap them in the section."}
                </p>
              </form>
            </>
          )}
        </Dialog>
      </Popover>
    </DialogTrigger>
  );
}

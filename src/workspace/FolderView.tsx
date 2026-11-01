import { useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { Button } from "react-aria-components";
import type * as Y from "yjs";
import { appNavigate } from "../routing/location";
import type { Member } from "./device";
import { MoveDialog } from "./MoveDialog";
import { ROOT, createFolder, pathTo, renameNode, type FolderTree } from "./tree";
import { folderPath } from "./wsRoutes";

export interface FolderViewProps {
  doc: Y.Doc;
  wsId: string;
  tree: FolderTree;
  folderId: string | null;
  member: Member | null;
}

export function FolderView({ doc, wsId, tree, folderId, member }: FolderViewProps) {
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const cancelBlurRef = useRef(false);

  const currentFolder = folderId ? tree.byId.get(folderId) : null;
  const headingTitle = currentFolder ? currentFolder.title : "All files";
  const children = folderId ? (currentFolder?.children ?? []) : tree.roots;
  const path = folderId ? pathTo(tree, folderId) : [];

  const handleNavClick = (e: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    appNavigate(href);
  };

  const handleCreateFolder = () => {
    const actor = { memberId: member?.id ?? "unknown" };
    createFolder(doc, folderId ?? ROOT, "New folder", actor);
  };

  const startRename = () => {
    if (!folderId || !currentFolder) return;
    setDraftTitle(currentFolder.title);
    setIsEditing(true);
  };

  const commitTitle = () => {
    if (cancelBlurRef.current) {
      cancelBlurRef.current = false;
      setIsEditing(false);
      return;
    }
    if (folderId && draftTitle.trim()) {
      renameNode(doc, folderId, draftTitle.trim(), { memberId: member?.id ?? "unknown" });
    }
    setIsEditing(false);
  };

  const handleTitleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      commitTitle();
    } else if (e.key === "Escape") {
      cancelBlurRef.current = true;
      setIsEditing(false);
    }
  };

  return (
    <div className="ws-folder-view">
      <nav aria-label="Breadcrumb" className="ws-breadcrumb">
        {folderId === null ? (
          <span aria-current="page">All files</span>
        ) : (
          <>
            <a href={folderPath(wsId, null)} onClick={(e) => handleNavClick(e, folderPath(wsId, null))}>
              All files
            </a>
            {path.slice(0, -1).map((node) => (
              <span key={node.id} className="ws-breadcrumb-item">
                <span className="ws-breadcrumb-sep" aria-hidden="true">
                  ›
                </span>
                <a href={folderPath(wsId, node.id)} onClick={(e) => handleNavClick(e, folderPath(wsId, node.id))}>
                  {node.title}
                </a>
              </span>
            ))}
            <span className="ws-breadcrumb-sep" aria-hidden="true">
              ›
            </span>
            <span aria-current="page">{headingTitle}</span>
          </>
        )}
      </nav>

      <div className="ws-folder-view-header">
        <div className="ws-folder-view-title-area">
          {isEditing && folderId ? (
            <input
              autoFocus
              className="ws-title-input"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={handleTitleKeyDown}
              aria-label="Folder title"
            />
          ) : (
            <h2 className="ws-folder-heading">{headingTitle}</h2>
          )}
        </div>

        <div className="ws-folder-view-actions">
          <Button className="ws-button ws-button-primary" onPress={handleCreateFolder}>
            New folder
          </Button>
          {folderId !== null && (
            <>
              <Button className="ws-button ws-button-secondary" onPress={startRename}>
                Rename
              </Button>
              <Button className="ws-button ws-button-secondary" onPress={() => setIsMoveDialogOpen(true)}>
                Move to…
              </Button>
            </>
          )}
        </div>
      </div>

      {children.length === 0 ? (
        <p className="ws-empty">
          No folders here yet. Create one to start organising — videos, links, notes and boards arrive in the next
          updates.
        </p>
      ) : (
        <div className="ws-folder-grid">
          {children.map((child) => (
            <a
              key={child.id}
              href={folderPath(wsId, child.id)}
              className="ws-folder-card"
              onClick={(e) => handleNavClick(e, folderPath(wsId, child.id))}
            >
              <div className="ws-folder-card-icon" aria-hidden="true">
                📁
              </div>
              <div className="ws-folder-card-body">
                <span className="ws-folder-card-title">{child.title}</span>
                <span className="ws-folder-card-count">
                  {child.children.length === 1 ? "1 folder" : `${child.children.length} folders`}
                </span>
              </div>
            </a>
          ))}
        </div>
      )}

      {folderId !== null && (
        <MoveDialog
          isOpen={isMoveDialogOpen}
          onOpenChange={setIsMoveDialogOpen}
          doc={doc}
          tree={tree}
          nodeIds={[folderId]}
          member={member}
        />
      )}
    </div>
  );
}

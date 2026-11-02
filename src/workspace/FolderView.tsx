import { lazy, Suspense, type MouseEvent } from "react";
import { appNavigate } from "../routing/location";
import { pathTo, type FolderTree } from "./tree";
import { folderPath } from "./wsRoutes";

const Board = lazy(() => import("../board/Board"));

export interface FolderViewProps {
  wsId: string;
  tree: FolderTree;
  folderId: string | null;
}

export function FolderView({ wsId, tree, folderId }: FolderViewProps) {
  const currentFolder = folderId ? tree.byId.get(folderId) : null;
  const headingTitle = currentFolder ? currentFolder.title : "All files";
  const children = folderId ? (currentFolder?.children ?? []) : tree.roots;
  const path = folderId ? pathTo(tree, folderId) : [];

  const handleNavClick = (e: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    appNavigate(href);
  };

  if (folderId === null) {
    return (
      <div className="ws-folder-view">
        <nav aria-label="Breadcrumb" className="ws-breadcrumb">
          <span aria-current="page">All files</span>
        </nav>

        <div className="ws-folder-view-header">
          <div className="ws-folder-view-title-area">
            <h2 className="ws-folder-heading">{headingTitle}</h2>
          </div>
        </div>

        {children.length === 0 ? (
          <p className="ws-empty">
            No folders yet. Use + in the sidebar to create one — every folder is its own canvas board.
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
      </div>
    );
  }

  return (
    <div className="ws-folder-view ws-folder-board">
      <div className="ws-board-bar">
        <nav aria-label="Breadcrumb" className="ws-breadcrumb">
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
        </nav>
        <h2 className="ws-folder-heading ws-board-heading">{headingTitle}</h2>
        {children.length > 0 && (
          <nav aria-label="Subfolders" className="ws-subfolder-chips">
            {children.map((child) => (
              <a
                key={child.id}
                href={folderPath(wsId, child.id)}
                className="ws-chip"
                onClick={(e) => handleNavClick(e, folderPath(wsId, child.id))}
              >
                📁 {child.title}
              </a>
            ))}
          </nav>
        )}
      </div>
      <div className="ws-board-slot">
        <Suspense
          fallback={
            <div className="board-message" role="status">
              Loading the canvas…
            </div>
          }
        >
          <Board key={folderId} wsId={wsId} folderId={folderId} title={headingTitle} />
        </Suspense>
      </div>
    </div>
  );
}

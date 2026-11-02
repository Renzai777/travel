import type { MouseEvent } from "react";
import { appNavigate } from "../routing/location";
import { pathTo, type FolderTree } from "./tree";
import { folderPath } from "./wsRoutes";

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
          <h2 className="ws-folder-heading">{headingTitle}</h2>
        </div>
      </div>

      {children.length === 0 ? (
        <p className="ws-empty">
          No folders here yet. Use + or the … menu in the sidebar to create one — videos, links, notes and boards arrive
          in the next updates.
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

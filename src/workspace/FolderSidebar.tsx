import { useCallback, useMemo, useRef, useState, type MouseEvent } from "react";
import {
  Button,
  Collection,
  DropIndicator,
  Menu,
  MenuItem,
  MenuTrigger,
  Popover,
  Tree,
  TreeItem,
  TreeItemContent,
  useDragAndDrop,
  type Key,
} from "react-aria-components";
import type * as Y from "yjs";
import { store } from "../lib/storage";
import { appNavigate } from "../routing/location";
import type { Member } from "./device";
import { MoveDialog } from "./MoveDialog";
import { NameDialog } from "./NameDialog";
import {
  ROOT,
  RECOVERED,
  createFolder,
  isSelfOrAncestor,
  moveNodes,
  pathTo,
  renameNode,
  type FolderNode,
  type FolderTree,
} from "./tree";
import { folderPath } from "./wsRoutes";

export interface FolderSidebarProps {
  doc: Y.Doc;
  wsId: string;
  tree: FolderTree;
  currentFolderId: string | null;
  member: Member | null;
}

export function FolderSidebar({ doc, wsId, tree, currentFolderId, member }: FolderSidebarProps) {
  const storageKey = `ws.expanded.${wsId}`;
  const actor = { memberId: member?.id ?? "unknown" };

  const [dialog, setDialog] = useState<
    | { kind: "new"; parentId: string }
    | { kind: "rename"; id: string; title: string }
    | { kind: "move"; id: string }
    | null
  >(null);

  const readExpanded = useCallback((): Set<string> => {
    try {
      const raw = store.get(storageKey);
      if (!raw) return new Set<string>();
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed)
        ? new Set<string>(parsed.filter((x): x is string => typeof x === "string"))
        : new Set<string>();
    } catch {
      return new Set<string>();
    }
  }, [storageKey]);

  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() => readExpanded());

  const updateExpanded = useCallback(
    (keys: Set<string>) => {
      setExpandedKeys(keys);
      store.set(storageKey, JSON.stringify([...keys]));
    },
    [storageKey],
  );

  const expandKey = useCallback(
    (key: string) => {
      setExpandedKeys((prev) => {
        if (prev.has(key)) return prev;
        const next = new Set(prev);
        next.add(key);
        store.set(storageKey, JSON.stringify([...next]));
        return next;
      });
    },
    [storageKey],
  );

  // When the current folder changes, expand its ancestors so it's visible. Done while rendering (React's "adjust state
  // when a prop changes" pattern) rather than in an effect; the user can still collapse them afterwards.
  const [expandedFor, setExpandedFor] = useState<string | null>(null);
  if (currentFolderId && currentFolderId !== expandedFor) {
    setExpandedFor(currentFolderId);
    const ancestorIds = pathTo(tree, currentFolderId)
      .slice(0, -1)
      .map((n) => n.id);
    if (ancestorIds.some((a) => !expandedKeys.has(a))) {
      const next = new Set(expandedKeys);
      ancestorIds.forEach((a) => next.add(a));
      setExpandedKeys(next);
      store.set(storageKey, JSON.stringify([...next]));
    }
  }

  // Drag and drop tracking
  const draggedKeysRef = useRef<Set<string>>(new Set());

  const { dragAndDropHooks } = useDragAndDrop({
    getItems(keys) {
      const list = [...keys].map(String);
      draggedKeysRef.current = new Set(list);
      return list.map((k) => ({
        "application/x-trip-node": k,
        "text/plain": tree.byId.get(k)?.title ?? "Folder",
      }));
    },
    onDragStart(e) {
      draggedKeysRef.current = new Set([...e.keys].map(String));
    },
    onDragEnd() {
      draggedKeysRef.current = new Set();
    },
    getDropOperation(target) {
      if (target.type !== "item") return "cancel";
      const targetId = String(target.key);
      if (target.dropPosition === "on") {
        for (const draggedId of draggedKeysRef.current) {
          if (isSelfOrAncestor(tree.parentOf, draggedId, targetId)) {
            return "cancel";
          }
        }
        return "move";
      } else {
        const parentId = tree.parentOf.get(targetId);
        if (!parentId || parentId === RECOVERED) return "cancel";
        for (const draggedId of draggedKeysRef.current) {
          if (isSelfOrAncestor(tree.parentOf, draggedId, parentId)) {
            return "cancel";
          }
        }
        return "move";
      }
    },
    onMove(e) {
      const targetKey = String(e.target.key);
      const moved = moveNodes(
        doc,
        [...e.keys].map(String),
        e.target.dropPosition === "on"
          ? { kind: "into", parentId: targetKey }
          : { kind: e.target.dropPosition, siblingId: targetKey },
        { memberId: member?.id ?? "unknown" },
      );
      if (e.target.dropPosition === "on" && moved.length > 0) {
        setExpandedKeys((prev) => {
          if (prev.has(targetKey)) return prev;
          const next = new Set(prev);
          next.add(targetKey);
          store.set(storageKey, JSON.stringify([...next]));
          return next;
        });
      }
    },
    renderDropIndicator(target) {
      return <DropIndicator target={target} className="ws-drop-indicator" />;
    },
  });

  const { dragAndDropHooks: recoveredDndHooks } = useDragAndDrop({
    getItems(keys) {
      const list = [...keys].map(String);
      draggedKeysRef.current = new Set(list);
      return list.map((k) => ({
        "application/x-trip-node": k,
        "text/plain": tree.byId.get(k)?.title ?? "Folder",
      }));
    },
    onDragStart(e) {
      draggedKeysRef.current = new Set([...e.keys].map(String));
    },
    onDragEnd() {
      draggedKeysRef.current = new Set();
    },
    getDropOperation: () => "cancel",
  });

  const selectedKeys = useMemo<Iterable<Key>>(() => {
    return currentFolderId ? [currentFolderId] : [];
  }, [currentFolderId]);

  const handleAllFilesClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    appNavigate(folderPath(wsId, null));
  };

  const renderTreeItem = (node: FolderNode) => (
    <TreeItem
      key={node.id}
      id={node.id}
      textValue={node.title}
      href={folderPath(wsId, node.id)}
      hasChildItems={node.children.length > 0}
      className="react-aria-TreeItem ws-tree-item"
    >
      <TreeItemContent>
        {({ isExpanded, hasChildItems }) => (
          <div className="ws-tree-row-content">
            <Button slot="drag" className="ws-drag-handle" aria-label={`Move ${node.title}`}>
              ⋮⋮
            </Button>
            {hasChildItems ? (
              <Button slot="chevron" className="ws-tree-chevron" aria-label={isExpanded ? "Collapse" : "Expand"}>
                <span className="ws-chevron-icon" aria-hidden="true">
                  ›
                </span>
              </Button>
            ) : (
              <span className="ws-tree-chevron-spacer" aria-hidden="true" />
            )}
            <span className="ws-folder-icon" aria-hidden="true">
              📁
            </span>
            <span className="ws-tree-title">{node.title}</span>
            <MenuTrigger>
              <Button className="ws-row-menu" aria-label={`Actions for ${node.title}`}>
                …
              </Button>
              <Popover className="react-aria-Popover">
                <Menu className="react-aria-Menu" aria-label={`Actions for ${node.title}`}>
                  <MenuItem
                    className="react-aria-MenuItem"
                    onAction={() => {
                      expandKey(node.id);
                      setDialog({ kind: "new", parentId: node.id });
                    }}
                  >
                    New subfolder
                  </MenuItem>
                  <MenuItem
                    className="react-aria-MenuItem"
                    onAction={() => setDialog({ kind: "rename", id: node.id, title: node.title })}
                  >
                    Rename
                  </MenuItem>
                  <MenuItem className="react-aria-MenuItem" onAction={() => setDialog({ kind: "move", id: node.id })}>
                    Move to…
                  </MenuItem>
                </Menu>
              </Popover>
            </MenuTrigger>
          </div>
        )}
      </TreeItemContent>
      <Collection items={node.children}>{(child) => renderTreeItem(child)}</Collection>
    </TreeItem>
  );

  return (
    <div className="ws-aside-section ws-folders-sidebar">
      <div className="ws-folders-header">
        <h3 className="ws-section-title">Folders</h3>
        <Button
          className="ws-sidebar-add"
          aria-label="New folder"
          onPress={() => setDialog({ kind: "new", parentId: ROOT })}
        >
          +
        </Button>
      </div>

      <nav aria-label="Root folder" className="ws-root-link-container">
        <a
          href={folderPath(wsId, null)}
          className={`ws-root-link ${currentFolderId === null ? "ws-selected" : ""}`}
          aria-current={currentFolderId === null ? "page" : undefined}
          onClick={handleAllFilesClick}
        >
          <span className="ws-folder-icon" aria-hidden="true">
            📁
          </span>
          <span className="ws-root-link-title">All files</span>
        </a>
      </nav>

      <Tree
        aria-label="Folders"
        items={tree.roots}
        selectionMode="single"
        selectedKeys={selectedKeys}
        disallowEmptySelection
        expandedKeys={expandedKeys}
        onExpandedChange={(keys) => updateExpanded(new Set([...keys].map(String)))}
        dragAndDropHooks={dragAndDropHooks}
        className="react-aria-Tree ws-folder-tree"
      >
        {(node) => renderTreeItem(node)}
      </Tree>

      {tree.recovered.length > 0 && (
        <div className="ws-recovered-section">
          <h4 className="ws-recovered-title">Recovered</h4>
          <p className="ws-recovered-hint">
            These folders were moved into each other on two devices at the same time. Move them where you want them.
          </p>
          <Tree
            aria-label="Recovered folders"
            items={tree.recovered}
            selectionMode="single"
            selectedKeys={selectedKeys}
            disallowEmptySelection
            expandedKeys={expandedKeys}
            onExpandedChange={(keys) => updateExpanded(new Set([...keys].map(String)))}
            dragAndDropHooks={recoveredDndHooks}
            className="react-aria-Tree ws-folder-tree ws-recovered-tree"
          >
            {(node) => renderTreeItem(node)}
          </Tree>
        </div>
      )}

      <NameDialog
        isOpen={dialog?.kind === "new" || dialog?.kind === "rename"}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
        title={dialog?.kind === "rename" ? "Rename folder" : "New folder"}
        submitLabel={dialog?.kind === "rename" ? "Save" : "Create"}
        initialValue={dialog?.kind === "rename" ? dialog.title : ""}
        onSubmit={(name) => {
          if (dialog?.kind === "new") {
            createFolder(doc, dialog.parentId, name, actor);
            if (dialog.parentId !== ROOT) {
              expandKey(dialog.parentId);
            }
          } else if (dialog?.kind === "rename") {
            renameNode(doc, dialog.id, name, actor);
          }
          setDialog(null);
        }}
      />

      <MoveDialog
        isOpen={dialog?.kind === "move"}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
        doc={doc}
        tree={tree}
        nodeIds={dialog?.kind === "move" ? [dialog.id] : []}
        member={member}
      />
    </div>
  );
}

import { useMemo, useState } from "react";
import {
  Button,
  Collection,
  Dialog,
  Heading,
  Modal,
  ModalOverlay,
  Tree,
  TreeItem,
  TreeItemContent,
  type Key,
  type Selection,
} from "react-aria-components";
import type * as Y from "yjs";
import type { Member } from "./device";
import { ROOT, isSelfOrAncestor, moveNodes, type FolderNode, type FolderTree } from "./tree";

export interface MoveDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  doc: Y.Doc;
  tree: FolderTree;
  nodeIds: string[];
  member: Member | null;
}

export function MoveDialog({ isOpen, onOpenChange, doc, tree, nodeIds, member }: MoveDialogProps) {
  return (
    <ModalOverlay isOpen={isOpen} onOpenChange={onOpenChange} isDismissable className="react-aria-ModalOverlay">
      <Modal className="react-aria-Modal ws-dialog ws-move-dialog" isDismissable>
        <Dialog aria-label="Move folders">
          {isOpen && (
            <MoveDialogContent
              onClose={() => onOpenChange(false)}
              doc={doc}
              tree={tree}
              nodeIds={nodeIds}
              member={member}
            />
          )}
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}

function MoveDialogContent({
  onClose,
  doc,
  tree,
  nodeIds,
  member,
}: {
  onClose: () => void;
  doc: Y.Doc;
  tree: FolderTree;
  nodeIds: string[];
  member: Member | null;
}) {
  const [selectedKeys, setSelectedKeys] = useState<Selection>(() => new Set());
  const [expandedKeys, setExpandedKeys] = useState<Iterable<Key>>(() => {
    const all = new Set<Key>([ROOT]);
    for (const id of tree.byId.keys()) all.add(id);
    return all;
  });

  const disabledKeys = useMemo(() => {
    const disabled = new Set<Key>();
    for (const movedId of nodeIds) {
      disabled.add(movedId);
      for (const id of tree.byId.keys()) {
        if (isSelfOrAncestor(tree.parentOf, movedId, id)) {
          disabled.add(id);
        }
      }
    }
    return disabled;
  }, [nodeIds, tree]);

  const moveRoots = useMemo<FolderNode[]>(
    () => [{ id: ROOT, title: "All files (top level)", parentId: "", children: tree.roots }],
    [tree.roots],
  );

  const selectedTargetId = useMemo(() => {
    if (selectedKeys === "all") return null;
    const first = [...selectedKeys][0];
    return first !== undefined ? String(first) : null;
  }, [selectedKeys]);

  const handleMove = () => {
    if (!selectedTargetId) return;
    moveNodes(doc, nodeIds, { kind: "into", parentId: selectedTargetId }, { memberId: member?.id ?? "unknown" });
    onClose();
  };

  const title = nodeIds.length === 1 ? (tree.byId.get(nodeIds[0])?.title ?? "folder") : null;
  const heading = nodeIds.length === 1 ? `Move “${title}” to…` : `Move ${nodeIds.length} folders to…`;

  const renderMoveItem = (node: FolderNode) => (
    <TreeItem
      key={node.id}
      id={node.id}
      textValue={node.title}
      hasChildItems={node.children.length > 0}
      className="react-aria-TreeItem ws-tree-item"
    >
      <TreeItemContent>
        {({ isExpanded, hasChildItems }) => (
          <div className="ws-tree-row-content">
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
          </div>
        )}
      </TreeItemContent>
      <Collection items={node.children}>{(child) => renderMoveItem(child)}</Collection>
    </TreeItem>
  );

  return (
    <>
      <Heading slot="title" className="ws-dialog-title">
        {heading}
      </Heading>
      <div className="ws-move-tree-container">
        <Tree
          aria-label="Target folder"
          items={moveRoots}
          selectionMode="single"
          selectedKeys={selectedKeys}
          onSelectionChange={(keys) => setSelectedKeys(keys)}
          disabledKeys={disabledKeys}
          expandedKeys={expandedKeys}
          onExpandedChange={(keys) => setExpandedKeys(keys)}
          className="react-aria-Tree ws-move-tree"
        >
          {(node) => renderMoveItem(node)}
        </Tree>
      </div>
      <div className="ws-dialog-actions">
        <Button className="ws-button ws-button-secondary" type="button" onPress={onClose}>
          Cancel
        </Button>
        <Button
          className="ws-button ws-button-primary"
          type="button"
          isDisabled={!selectedTargetId}
          onPress={handleMove}
        >
          Move here
        </Button>
      </div>
    </>
  );
}

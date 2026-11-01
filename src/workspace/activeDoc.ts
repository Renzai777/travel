import type * as Y from "yjs";

let currentDoc: Y.Doc | null = null;

export const setActiveDoc = (doc: Y.Doc | null): void => {
  currentDoc = doc;
};

export const getActiveDoc = (): Y.Doc | null => currentDoc;

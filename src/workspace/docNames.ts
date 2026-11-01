/** Doc-id contract (docs/plans/epic-3-workspace.md): every doc belongs to exactly one workspace. Also the IndexedDB database names. */
export const wsDocName = (wsId: string): string => `ws:${wsId}`;
export const noteDocName = (wsId: string, noteId: string): string => `note:${wsId}:${noteId}`;
export const boardDocName = (wsId: string, boardId: string): string => `board:${wsId}:${boardId}`;
export const commentsDocName = (wsId: string): string => `comments:${wsId}`;

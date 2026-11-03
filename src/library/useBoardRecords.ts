import { useEffect, useState, useSyncExternalStore } from "react";
import { BoardScanner, type ScanState } from "./boardScanner";

/** Live records of every folder board in the workspace (see BoardScanner). `folderIds` may change; only the difference is opened/closed. */
export function useBoardRecords(wsId: string, folderIds: readonly string[]): ScanState {
  const [scanner] = useState(() => new BoardScanner(wsId)); // the Library is remounted per workspace
  const key = folderIds.join("|"); // ids are [A-Za-z0-9_-], so "|" is a safe separator

  useEffect(() => {
    scanner.setFolders(key ? key.split("|") : []);
  }, [scanner, key]);

  useEffect(() => () => scanner.close(), [scanner]);

  return useSyncExternalStore(scanner.subscribe, scanner.getState, scanner.getState);
}

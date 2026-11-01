import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";
import { broadcastSync } from "./broadcastSync";

export type OpenDoc = { doc: Y.Doc; synced: Promise<void>; destroy: () => void };

/** Open a Y.Doc persisted in IndexedDB (database = `name`) and live-synced across tabs. Rejects if IndexedDB doesn't answer in 8 s. */
export function openDoc(name: string): OpenDoc {
  const doc = new Y.Doc();
  const persistence = new IndexeddbPersistence(name, doc);
  let stopBroadcast: () => void = () => {};
  const synced = new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("IndexedDB did not respond")), 8000);
    persistence.once("synced", () => {
      window.clearTimeout(timer);
      stopBroadcast = broadcastSync(doc, name); // after the local state is loaded, so the hello carries a real state vector
      resolve();
    });
  });
  return {
    doc,
    synced,
    destroy: () => {
      stopBroadcast();
      void persistence.destroy();
      doc.destroy();
    },
  };
}

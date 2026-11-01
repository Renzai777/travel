import * as Y from "yjs";

const ORIGIN = Symbol("broadcast-sync");

type Message =
  | { type: "update"; update: Uint8Array }
  | { type: "hello"; sv: Uint8Array }
  | { type: "state"; to: string; update: Uint8Array };

/**
 * Live sync between tabs of the same browser (y-indexeddb only persists; it does not notify other tabs).
 * On open, a tab says hello with its state vector; every other tab answers with what that tab is missing.
 */
export function broadcastSync(doc: Y.Doc, name: string): () => void {
  if (typeof BroadcastChannel === "undefined") return () => {};
  const channel = new BroadcastChannel(`yjs:${name}`);
  const tabId = crypto.randomUUID();
  const onUpdate = (update: Uint8Array, origin: unknown): void => {
    if (origin !== ORIGIN) channel.postMessage({ type: "update", update } satisfies Message);
  };
  channel.onmessage = (event: MessageEvent<Message & { from?: string }>) => {
    const msg = event.data;
    if (msg.type === "update") Y.applyUpdate(doc, msg.update, ORIGIN);
    else if (msg.type === "hello")
      channel.postMessage({ type: "state", to: msg.from ?? "", update: Y.encodeStateAsUpdate(doc, msg.sv) });
    else if (msg.type === "state" && msg.to === tabId) Y.applyUpdate(doc, msg.update, ORIGIN);
  };
  doc.on("update", onUpdate);
  channel.postMessage({ type: "hello", sv: Y.encodeStateVector(doc), from: tabId });
  return () => {
    doc.off("update", onUpdate);
    channel.close();
  };
}

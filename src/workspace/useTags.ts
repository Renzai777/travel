import { useSyncExternalStore } from "react";
import type * as Y from "yjs";
import { wsMaps } from "./schema";
import { listTags, type Tag } from "./tags";

const EMPTY: Tag[] = [];

interface TagStore {
  subscribe: (cb: () => void) => () => void;
  get: () => Tag[];
}

const stores = new WeakMap<Y.Doc, TagStore>();
const NO_DOC: TagStore = { subscribe: () => () => {}, get: () => EMPTY };

/** One cached snapshot per workspace doc, rebuilt only when a tag changes (useSyncExternalStore needs a stable value). */
function tagStore(doc: Y.Doc): TagStore {
  let store = stores.get(doc);
  if (!store) {
    let cache: Tag[] | null = null;
    store = {
      subscribe(cb) {
        const tags = wsMaps(doc).tags;
        const onChange = () => {
          cache = null;
          cb();
        };
        tags.observeDeep(onChange);
        return () => tags.unobserveDeep(onChange);
      },
      get: () => (cache ??= listTags(doc)),
    };
    stores.set(doc, store);
  }
  return store;
}

/** Live list of the workspace's tags (re-renders when any tag is added or changed, on this device or synced from another). */
export function useTags(doc: Y.Doc | null): Tag[] {
  const store = doc ? tagStore(doc) : NO_DOC;
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}

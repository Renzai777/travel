import { elementsMap, readElements } from "../board/sceneSync";
import { boardDocName } from "../workspace/docNames";
import { openDoc } from "../workspace/openDoc";
import { boardRecords, type LibraryRecord } from "./records";

const MAX_PARALLEL = 3; // board docs opened at the same time (IndexedDB + a BroadcastChannel each)
const REFRESH_MS = 250; // a board's records are rebuilt at most this often while it's being edited elsewhere

export interface ScanState {
  /** folderId → that board's records (boards still loading are missing). */
  records: ReadonlyMap<string, readonly LibraryRecord[]>;
  /** Boards not read yet. */
  pending: number;
  /** Boards whose storage couldn't be opened. */
  failed: number;
}

type Entry = { stop: () => void; failed: boolean };

/**
 * Opens every folder's board doc read-only (a few at a time), keeps each one's records up to date while it's open (edits from other tabs
 * included), and closes them on `close()`. Never writes to a board. Restartable: `setFolders` after `close` opens everything again.
 */
export class BoardScanner {
  private readonly wsId: string;
  private entries = new Map<string, Entry>();
  private queue: string[] = [];
  private active = 0;
  private records = new Map<string, readonly LibraryRecord[]>();
  private listeners = new Set<() => void>();
  private state: ScanState = { records: new Map(), pending: 0, failed: 0 };

  constructor(wsId: string) {
    this.wsId = wsId;
  }

  subscribe = (cb: () => void): (() => void) => {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  };

  getState = (): ScanState => this.state;

  /** Opens boards for new folders and closes boards of folders that are gone. */
  setFolders(folderIds: readonly string[]): void {
    const want = new Set(folderIds);
    for (const [id, entry] of this.entries) {
      if (!want.has(id)) {
        entry.stop();
        this.entries.delete(id);
        this.records.delete(id);
      }
    }
    this.queue = this.queue.filter((id) => want.has(id));
    for (const id of want) {
      if (!this.entries.has(id) && !this.queue.includes(id)) this.queue.push(id);
    }
    this.pump();
    this.emit();
  }

  /** Closes every board (on unmount). */
  close(): void {
    for (const entry of this.entries.values()) entry.stop();
    this.entries.clear();
    this.queue = [];
    this.records.clear();
    this.emit();
  }

  private pump(): void {
    while (this.active < MAX_PARALLEL && this.queue.length > 0) {
      const id = this.queue.shift();
      if (id !== undefined) this.open(id);
    }
  }

  private open(folderId: string): void {
    this.active++;
    const handle = openDoc(boardDocName(this.wsId, folderId));
    const entry: Entry = { stop: () => handle.destroy(), failed: false };
    this.entries.set(folderId, entry);
    const current = () => this.entries.get(folderId) === entry; // false once the folder is gone or the scanner closed

    handle.synced
      .then(
        () => {
          if (!current()) return;
          const map = elementsMap(handle.doc);
          let timer: number | null = null;
          const refresh = () => {
            timer = null;
            this.records.set(folderId, boardRecords(folderId, readElements(handle.doc)));
            this.emit();
          };
          const onChange = () => {
            if (timer === null) timer = window.setTimeout(refresh, REFRESH_MS);
          };
          map.observe(onChange);
          entry.stop = () => {
            map.unobserve(onChange);
            if (timer !== null) window.clearTimeout(timer);
            handle.destroy();
          };
          refresh();
        },
        () => {
          if (!current()) return;
          entry.failed = true;
          this.emit();
        },
      )
      .finally(() => {
        this.active--;
        this.pump();
      });
  }

  private emit(): void {
    let failed = 0;
    for (const e of this.entries.values()) if (e.failed) failed++;
    let loaded = 0;
    for (const id of this.entries.keys()) if (this.records.has(id)) loaded++;
    this.state = {
      records: new Map(this.records),
      pending: this.queue.length + this.entries.size - loaded - failed,
      failed,
    };
    for (const cb of this.listeners) cb();
  }
}

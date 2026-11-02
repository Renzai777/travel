import { useSyncExternalStore } from "react";

/** Page layout around a canvas board: focus mode (this tab only) and the collapsed sidebar (remembered on this device). */
export interface BoardLayout {
  focus: boolean;
  sidebarCollapsed: boolean;
}

const SIDEBAR_KEY = "ws:sidebarCollapsed";

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_KEY) === "1";
  } catch {
    return false;
  }
}

let state: BoardLayout = { focus: false, sidebarCollapsed: readCollapsed() };
const listeners = new Set<() => void>();

function set(next: Partial<BoardLayout>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useBoardLayout(): BoardLayout {
  return useSyncExternalStore(subscribe, () => state);
}

export function setFocusMode(focus: boolean) {
  if (state.focus !== focus) set({ focus });
}

export function toggleFocusMode() {
  set({ focus: !state.focus });
}

export function setSidebarCollapsed(sidebarCollapsed: boolean) {
  try {
    localStorage.setItem(SIDEBAR_KEY, sidebarCollapsed ? "1" : "0");
  } catch {
    // Storage blocked: the choice still applies until the page reloads.
  }
  set({ sidebarCollapsed });
}

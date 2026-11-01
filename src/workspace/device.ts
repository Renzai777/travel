import { store } from "../lib/storage";
import { newId } from "./ids";

export const MEMBER_COLORS = [
  "#c8501f",
  "#1f7f86",
  "#7a4fb5",
  "#2f7d32",
  "#b8860b",
  "#c2417a",
  "#3d5a6c",
  "#d9822b",
] as const;

export type Member = { id: string; name: string; color: string };
export type DeviceWorkspace = { id: string; key: string; title: string; lastOpened: number };

const MEMBER = "ws.member";
const LIST = "ws.list";

function read<T>(k: string, fallback: T): T {
  try {
    const raw = store.get(k);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function getMember(): Member | null {
  const m = read<Member | null>(MEMBER, null);
  return m && typeof m.id === "string" && typeof m.name === "string" ? m : null;
}

export function saveMember(name: string, color: string): Member {
  const existing = getMember();
  const m: Member = { id: existing?.id ?? newId(), name: name.trim().slice(0, 40), color };
  store.set(MEMBER, JSON.stringify(m));
  return m;
}

export const listDeviceWorkspaces = (): DeviceWorkspace[] =>
  read<DeviceWorkspace[]>(LIST, []).sort((a, b) => b.lastOpened - a.lastOpened);

export function upsertDeviceWorkspace(w: Partial<DeviceWorkspace> & { id: string }): void {
  const list = read<DeviceWorkspace[]>(LIST, []);
  const i = list.findIndex((x) => x.id === w.id);
  const next: DeviceWorkspace = {
    key: "",
    title: "Untitled trip",
    lastOpened: Date.now(),
    ...(i >= 0 ? list[i] : {}),
    ...w,
  } as DeviceWorkspace;
  if (i >= 0) list[i] = next;
  else list.push(next);
  store.set(LIST, JSON.stringify(list));
}

export function forgetDeviceWorkspace(id: string): void {
  store.set(LIST, JSON.stringify(read<DeviceWorkspace[]>(LIST, []).filter((x) => x.id !== id)));
}

export const deviceKeyFor = (id: string): string | null => listDeviceWorkspaces().find((w) => w.id === id)?.key || null;

/** Full share link for a workspace (key only in the fragment). */
export const shareLink = (id: string, key: string): string => `${window.location.origin}/w/${id}#key=${key}`;

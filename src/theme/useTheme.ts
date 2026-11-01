import { store } from "../lib/storage";

/** Apply the saved theme before React renders, so there is no light-mode flash. */
export function applySavedTheme(): void {
  const saved = store.get("theme");
  if (saved) document.documentElement.dataset.theme = saved;
}

export function useTheme(): { toggle: () => void } {
  const toggle = () => {
    const root = document.documentElement;
    const isDark = root.dataset.theme
      ? root.dataset.theme === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;
    const next = isDark ? "light" : "dark";
    root.dataset.theme = next;
    store.set("theme", next);
  };
  return { toggle };
}

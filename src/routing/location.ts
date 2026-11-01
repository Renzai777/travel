import { useSyncExternalStore } from "react";

const EVENT = "app:locationchange";

function subscribe(onChange: () => void): () => void {
  window.addEventListener("popstate", onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(EVENT, onChange);
  };
}

/** Current pathname, re-rendering on Back/Forward and on appNavigate(). */
export function usePathname(): string {
  return useSyncExternalStore(subscribe, () => window.location.pathname);
}

/** In-app navigation between the guide and the workspace (pushState + notify). Scrolls to the top. */
export function appNavigate(url: string, opts: { replace?: boolean } = {}): void {
  if (opts.replace) history.replaceState(null, "", url);
  else history.pushState(null, "", url);
  window.dispatchEvent(new Event(EVENT));
  window.scrollTo({ top: 0 });
}

/** True for paths owned by the workspace app (/w, /w/…) or redirected to it (/board, /board/…). */
export const isWorkspacePath = (pathname: string): boolean => /^\/(w|board)(\/|$)/.test(pathname);

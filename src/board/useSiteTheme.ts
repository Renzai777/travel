import { useSyncExternalStore } from "react";

export type SiteTheme = "light" | "dark";

/** The site's effective theme: `<html data-theme>` when the user picked one, otherwise the system preference. */
function read(): SiteTheme {
  const picked = document.documentElement.dataset.theme;
  if (picked === "dark" || picked === "light") return picked;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onChange);
  return () => {
    observer.disconnect();
    media.removeEventListener("change", onChange);
  };
}

export function useSiteTheme(): SiteTheme {
  return useSyncExternalStore(subscribe, read, () => "light");
}

import { registerSW } from "virtual:pwa-register";

/** Registers the service worker (production builds only). E2-S3 replaces this with an update toast. */
export function initServiceWorker(): void {
  if (!("serviceWorker" in navigator)) return;
  registerSW({
    immediate: true,
    onRegisterError(error: unknown) {
      console.error("Service worker registration failed:", error);
    },
  });
}

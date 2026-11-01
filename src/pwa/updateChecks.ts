const HOUR = 60 * 60 * 1000;
let started = false;

/**
 * Ask the browser to look for a new service worker every hour and whenever the tab becomes visible again.
 * Started once per page (guarded), so React StrictMode or re-renders can't create duplicate timers.
 */
export function startUpdateChecks(registration: ServiceWorkerRegistration): void {
  if (started) return;
  started = true;

  const check = (): void => {
    // Skip while offline or while an update is already being installed.
    if (!navigator.onLine || registration.installing) return;
    registration.update().catch(() => {
      /* network blip: try again at the next check */
    });
  };

  window.setInterval(check, HOUR);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") check();
  });
}

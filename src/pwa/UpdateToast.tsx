import { useEffect } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { startUpdateChecks } from "./updateChecks";

export function UpdateToast() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegisteredSW(_url, registration) {
      if (registration) startUpdateChecks(registration);
    },
    onRegisterError(error: unknown) {
      console.error("Service worker registration failed:", error);
    },
  });

  useEffect(() => {
    if (!offlineReady) return;
    const timer = window.setTimeout(() => {
      setOfflineReady(false);
    }, 4000);
    return () => {
      window.clearTimeout(timer);
    };
  }, [offlineReady, setOfflineReady]);

  if (!needRefresh && !offlineReady) {
    return null;
  }

  const isUpdate = needRefresh;
  const text = isUpdate ? "A new version of the guide is available." : "Ready to work offline.";

  return (
    <div className="update-toast" role="status" aria-live="polite">
      <p className="update-toast-text">{text}</p>
      <div className="update-toast-actions">
        {isUpdate ? (
          <>
            <button type="button" className="update-toast-primary" onClick={() => void updateServiceWorker(true)}>
              Reload
            </button>
            <button type="button" className="update-toast-secondary" onClick={() => setNeedRefresh(false)}>
              Later
            </button>
          </>
        ) : (
          <button type="button" className="update-toast-secondary" onClick={() => setOfflineReady(false)}>
            Got it
          </button>
        )}
      </div>
    </div>
  );
}

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { applySavedTheme } from "./theme/useTheme";
import { initServiceWorker } from "./pwa/registerSW";

applySavedTheme();

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

initServiceWorker();

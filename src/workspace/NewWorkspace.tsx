import { useCallback, useEffect, useRef, useState } from "react";
import { appNavigate } from "../routing/location";
import { getMember, upsertDeviceWorkspace } from "./device";
import { wsDocName } from "./docNames";
import { newId, newKey } from "./ids";
import { openDoc } from "./openDoc";
import { initWorkspace } from "./schema";

export function NewWorkspace() {
  const [error, setError] = useState<string | null>(null);
  const creatingRef = useRef(false);

  const create = useCallback(() => {
    setError(null);
    const id = newId();
    const key = newKey();
    const member = getMember();
    const h = openDoc(wsDocName(id));

    h.synced
      .then(() => {
        initWorkspace(h.doc, "Our trip", member?.id ?? "unknown");
        upsertDeviceWorkspace({ id, key, title: "Our trip" });
        h.destroy();
        appNavigate(`/w/${id}`, { replace: true });
      })
      .catch((err) => {
        h.destroy();
        setError(err instanceof Error ? err.message : "Failed to create workspace");
      });
  }, []);

  useEffect(() => {
    if (creatingRef.current) return;
    creatingRef.current = true;
    create();
  }, [create]);

  if (error) {
    return (
      <div className="ws-panel ws-error" role="alert">
        <p>{error}</p>
        <button
          className="ws-button ws-button-primary"
          type="button"
          onClick={() => {
            creatingRef.current = false;
            create();
          }}
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <p className="ws-loading" role="status">
      Creating your workspace…
    </p>
  );
}

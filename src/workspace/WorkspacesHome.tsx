import { useState, type FormEvent, type MouseEvent } from "react";
import {
  Button,
  Dialog,
  DialogTrigger,
  FieldError,
  Heading,
  Input,
  Label,
  Modal,
  ModalOverlay,
  TextField,
} from "react-aria-components";
import { appNavigate } from "../routing/location";
import { forgetDeviceWorkspace, listDeviceWorkspaces, upsertDeviceWorkspace, type DeviceWorkspace } from "./device";
import { isId, isKey } from "./ids";
import { keyFromHash } from "./wsRoutes";

function formatRelativeTime(timestamp: number): string {
  const diffSec = Math.round((timestamp - Date.now()) / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHour = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHour / 24);

  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (Math.abs(diffSec) < 60) return "just now";
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, "minute");
  if (Math.abs(diffHour) < 24) return rtf.format(diffHour, "hour");
  return rtf.format(diffDay, "day");
}

export function WorkspacesHome() {
  const [workspaces, setWorkspaces] = useState<DeviceWorkspace[]>(() => listDeviceWorkspaces());
  const [linkInput, setLinkInput] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);

  const handleOpenShared = (e: FormEvent) => {
    e.preventDefault();
    const val = linkInput.trim();
    if (!val) return;
    try {
      const url = new URL(val);
      if (url.origin !== window.location.origin) {
        setLinkError("That doesn't look like a Plains → Peaks workspace link.");
        return;
      }
      const parts = url.pathname.split("/").filter(Boolean);
      const wsId = parts[0] === "w" && parts[1] && isId(parts[1]) ? parts[1] : null;
      const key = keyFromHash(url.hash);
      if (!wsId || !key || !isKey(key)) {
        setLinkError("That doesn't look like a Plains → Peaks workspace link.");
        return;
      }
      setLinkError(null);
      upsertDeviceWorkspace({ id: wsId, key });
      appNavigate(`/w/${wsId}`);
    } catch {
      setLinkError("That doesn't look like a Plains → Peaks workspace link.");
    }
  };

  const handleLinkClick = (e: MouseEvent<HTMLAnchorElement>, to: string) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    appNavigate(to);
  };

  return (
    <div className="ws-home">
      <div className="ws-home-header">
        <div>
          <h2>Your trip workspaces</h2>
          <p className="ws-intro">
            Workspaces live on this device and can be shared with a secret link. Everyone with the link can view and
            edit. Live syncing between devices is coming in an upcoming update.
          </p>
        </div>
        <Button className="ws-button ws-button-primary" onPress={() => appNavigate("/w/new")}>
          New workspace
        </Button>
      </div>

      <div className="ws-panel ws-list-panel">
        {workspaces.length === 0 ? (
          <p className="ws-empty">No workspaces on this device yet.</p>
        ) : (
          <ul className="ws-list">
            {workspaces.map((w) => (
              <li key={w.id} className="ws-list-row">
                <a href={`/w/${w.id}`} className="ws-item-link" onClick={(e) => handleLinkClick(e, `/w/${w.id}`)}>
                  <span className="ws-item-title">{w.title || "Untitled trip"}</span>
                  <span className="ws-item-meta">Last opened {formatRelativeTime(w.lastOpened)}</span>
                </a>
                <DialogTrigger>
                  <Button className="ws-button ws-button-secondary ws-button-small">Remove from this device</Button>
                  <ModalOverlay className="react-aria-ModalOverlay" isDismissable>
                    <Modal className="react-aria-Modal ws-dialog" isDismissable>
                      <Dialog role="alertdialog">
                        {({ close }) => (
                          <>
                            <Heading slot="title" className="ws-dialog-title">
                              Remove workspace?
                            </Heading>
                            <p className="ws-dialog-intro">
                              This only removes it from this device. People with the link keep access.
                            </p>
                            <div className="ws-dialog-actions">
                              <Button className="ws-button ws-button-secondary" onPress={close}>
                                Cancel
                              </Button>
                              <Button
                                className="ws-button ws-button-danger"
                                onPress={() => {
                                  forgetDeviceWorkspace(w.id);
                                  setWorkspaces(listDeviceWorkspaces());
                                  close();
                                }}
                              >
                                Remove
                              </Button>
                            </div>
                          </>
                        )}
                      </Dialog>
                    </Modal>
                  </ModalOverlay>
                </DialogTrigger>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="ws-panel ws-join-panel">
        <h3>Open a shared link</h3>
        <form onSubmit={handleOpenShared} className="ws-share-form">
          <TextField
            isInvalid={Boolean(linkError)}
            className="ws-form-group"
            value={linkInput}
            onChange={(val) => {
              setLinkInput(val);
              if (linkError) setLinkError(null);
            }}
          >
            <Label className="ws-label">Paste a share link</Label>
            <div className="ws-form-row">
              <Input
                className="ws-input"
                placeholder={`${window.location.origin}/w/…#key=…`}
                aria-invalid={Boolean(linkError)}
              />
              <Button type="submit" className="ws-button ws-button-primary">
                Open
              </Button>
            </div>
            <FieldError className="ws-field-error">{linkError}</FieldError>
          </TextField>
        </form>
      </div>
    </div>
  );
}

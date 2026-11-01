import { useRef, useState } from "react";
import { Button, Dialog, DialogTrigger, Heading, Input, Modal, ModalOverlay, TextField } from "react-aria-components";
import { deviceKeyFor, shareLink } from "./device";

export interface ShareDialogProps {
  wsId: string;
  wsKey?: string;
}

export function ShareDialog({ wsId, wsKey }: ShareDialogProps) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const key = wsKey ?? deviceKeyFor(wsId) ?? "";
  const link = key ? shareLink(wsId, key) : "";

  const handleCopy = async () => {
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard API not available");
      }
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setCopyFailed(false);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyFailed(true);
      inputRef.current?.select();
    }
  };

  return (
    <DialogTrigger>
      <Button className="ws-button ws-button-primary">Share</Button>
      <ModalOverlay className="react-aria-ModalOverlay" isDismissable>
        <Modal className="react-aria-Modal ws-dialog" isDismissable>
          <Dialog role="dialog">
            {({ close }) => (
              <>
                <Heading slot="title" className="ws-dialog-title">
                  Share this workspace
                </Heading>
                <p className="ws-dialog-intro">
                  Anyone with this link can view and edit everything in this workspace. Only share it with your trip
                  group.
                </p>
                {/* Honest until Epic 4 (live sync): today each device keeps its own copy. */}
                <p className="ws-dialog-note" role="note">
                  <strong>Heads-up:</strong> live syncing between devices arrives in an upcoming update. Until then,
                  people who open this link start their own copy on their device.
                </p>
                <div className="ws-dialog-form">
                  <TextField isReadOnly className="ws-form-group" aria-label="Share link" value={link}>
                    <Input
                      ref={inputRef}
                      readOnly
                      className="ws-input ws-share-input"
                      value={link}
                      onFocus={(e) => e.currentTarget.select()}
                    />
                  </TextField>

                  <div className="ws-dialog-actions">
                    <Button className="ws-button ws-button-secondary" onPress={handleCopy}>
                      {copied ? "Copied ✓" : copyFailed ? "Press Ctrl+C to copy" : "Copy link"}
                    </Button>
                    <Button className="ws-button ws-button-primary" onPress={close}>
                      Done
                    </Button>
                  </div>
                </div>
              </>
            )}
          </Dialog>
        </Modal>
      </ModalOverlay>
    </DialogTrigger>
  );
}

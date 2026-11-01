import { useState, type FormEvent } from "react";
import {
  Button,
  Dialog,
  Heading,
  Input,
  Label,
  Modal,
  ModalOverlay,
  Radio,
  RadioGroup,
  TextField,
} from "react-aria-components";
import { MEMBER_COLORS, saveMember, type Member } from "./device";

export interface MemberDialogProps {
  isOpen: boolean;
  isDismissable?: boolean;
  initialMember?: Member | null;
  onOpenChange?: (isOpen: boolean) => void;
  onSaved?: (member: Member) => void;
}

export function MemberDialog({
  isOpen,
  isDismissable = false,
  initialMember = null,
  onOpenChange,
  onSaved,
}: MemberDialogProps) {
  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      isDismissable={isDismissable}
      isKeyboardDismissDisabled={!isDismissable}
      className="react-aria-ModalOverlay"
    >
      <Modal className="react-aria-Modal ws-dialog" isDismissable={isDismissable}>
        <Dialog aria-label="What should others call you?">
          {/* Mounted fresh on every opening, so the form starts from the current member without syncing state in an effect. */}
          <MemberForm
            initialMember={initialMember}
            isDismissable={isDismissable}
            onCancel={() => onOpenChange?.(false)}
            onSaved={(m) => {
              onSaved?.(m);
              onOpenChange?.(false);
            }}
          />
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}

function MemberForm({
  initialMember,
  isDismissable,
  onCancel,
  onSaved,
}: {
  initialMember: Member | null;
  isDismissable: boolean;
  onCancel: () => void;
  onSaved: (member: Member) => void;
}) {
  const [name, setName] = useState(initialMember?.name ?? "");
  const [color, setColor] = useState<string>(initialMember?.color ?? MEMBER_COLORS[0]);
  const isValid = name.trim().length >= 1 && name.trim().length <= 40 && Boolean(color);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    const m = saveMember(name.trim(), color);
    window.dispatchEvent(new Event("ws:memberchange"));
    onSaved(m);
  };

  return (
    <>
      <Heading slot="title" className="ws-dialog-title">
        What should others call you?
      </Heading>
      <form onSubmit={handleSubmit} className="ws-dialog-form">
        <TextField isRequired autoFocus className="ws-form-group" value={name} onChange={setName}>
          <Label className="ws-label">Your name</Label>
          <Input className="ws-input" maxLength={40} placeholder="e.g. Maya" />
        </TextField>

        <RadioGroup value={color} onChange={setColor} className="ws-form-group" aria-label="Colour">
          <Label className="ws-label">Colour</Label>
          <div className="ws-swatches">
            {MEMBER_COLORS.map((c, i) => (
              <Radio
                key={c}
                value={c}
                className="ws-swatch-radio"
                aria-label={`Colour ${i + 1}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </RadioGroup>

        <div className="ws-dialog-actions">
          {isDismissable && (
            <Button className="ws-button ws-button-secondary" type="button" onPress={onCancel}>
              Cancel
            </Button>
          )}
          <Button className="ws-button ws-button-primary" type="submit" isDisabled={!isValid}>
            Continue
          </Button>
        </div>
      </form>
    </>
  );
}

import { useState, type FormEvent } from "react";
import {
  Button,
  Dialog,
  FieldError,
  Heading,
  Input,
  Label,
  Modal,
  ModalOverlay,
  TextField,
} from "react-aria-components";

export type NameDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  title: string; // e.g. "New folder" / "Rename folder"
  label?: string; // field label
  submitLabel: string; // e.g. "Create" / "Save"
  initialValue?: string;
  onSubmit: (name: string) => void;
};

/** Small dialog asking for a name (new folder, rename). Outside the tree, so typing always works. */
export function NameDialog({
  isOpen,
  onOpenChange,
  title,
  label = "Folder name",
  submitLabel,
  initialValue = "",
  onSubmit,
}: NameDialogProps) {
  return (
    <ModalOverlay isOpen={isOpen} onOpenChange={onOpenChange} isDismissable className="react-aria-ModalOverlay">
      <Modal className="react-aria-Modal ws-dialog" isDismissable>
        <Dialog aria-label={title}>
          {/* Mounted fresh on each opening, so the field starts from initialValue. */}
          <NameForm
            title={title}
            label={label}
            submitLabel={submitLabel}
            initialValue={initialValue}
            onCancel={() => onOpenChange(false)}
            onSubmit={(name) => {
              onSubmit(name);
              onOpenChange(false);
            }}
          />
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}

function NameForm(props: {
  title: string;
  label: string;
  submitLabel: string;
  initialValue: string;
  onCancel: () => void;
  onSubmit: (name: string) => void;
}) {
  const [value, setValue] = useState(props.initialValue);
  const clean = value.trim();
  const isValid = clean.length >= 1 && clean.length <= 120;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (isValid) props.onSubmit(clean);
  };

  return (
    <>
      <Heading slot="title" className="ws-dialog-title">
        {props.title}
      </Heading>
      <form onSubmit={submit} className="ws-dialog-form">
        <TextField
          autoFocus
          isRequired
          className="ws-form-group"
          value={value}
          onChange={setValue}
          maxLength={120}
          isInvalid={value.length > 0 && !isValid}
        >
          <Label className="ws-label">{props.label}</Label>
          <Input className="ws-input" onFocus={(e) => e.currentTarget.select()} />
          <FieldError className="ws-field-error">Use 1–120 characters.</FieldError>
        </TextField>
        <div className="ws-dialog-actions">
          <Button type="button" className="ws-button ws-button-secondary" onPress={props.onCancel}>
            Cancel
          </Button>
          <Button type="submit" className="ws-button ws-button-primary" isDisabled={!isValid}>
            {props.submitLabel}
          </Button>
        </div>
      </form>
    </>
  );
}

"use client";

import { Button } from "./Button";
import { Modal } from "./Modal";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  pending?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

/** Small destructive-confirmation surface shared by booking and slot actions. */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Vazgeç",
  pending = false,
  error,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Modal
      dismissible={!pending}
      footer={
        <>
          <Button disabled={pending} onClick={onClose} type="button" variant="secondary">
            {cancelLabel}
          </Button>
          <Button loading={pending} onClick={onConfirm} type="button" variant="danger">
            {confirmLabel}
          </Button>
        </>
      }
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      open={open}
      size="sm"
      title={title}
    >
      <p className="text-sm leading-6 text-[color:var(--muted)]">{description}</p>
      {error ? (
        <p
          className="mt-3 rounded-lg border border-[color:var(--danger)] bg-[color:var(--danger-soft)] px-3 py-2 text-sm leading-5 text-[color:var(--danger-text)]"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </Modal>
  );
}

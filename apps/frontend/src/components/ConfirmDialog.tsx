interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  pending?: boolean;
  error?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Удалить",
  pending = false,
  error,
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="dialog-backdrop">
      <section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-dialog-title" aria-describedby="confirm-dialog-description">
        <p className="eyebrow">Подтверждение</p>
        <h2 id="confirm-dialog-title">{title}</h2>
        <p className="dialog-description" id="confirm-dialog-description">{description}</p>
        {error ? <p className="form-error">{error}</p> : null}
        <div className="dialog-actions">
          <button className="secondary-button" type="button" disabled={pending} onClick={onCancel}>Отмена</button>
          <button className="confirm-delete-button" type="button" disabled={pending} onClick={onConfirm}>
            {pending ? "Удаляем..." : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

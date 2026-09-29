import type { ComponentChildren } from 'preact';

interface Props {
  children: ComponentChildren;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

export function ConfirmDialog({ children, confirmLabel, onConfirm, onCancel, danger }: Props) {
  return (
    <div class="overlay" role="dialog" aria-modal="true" onClick={onCancel}>
      <div class="dialog" onClick={(e) => e.stopPropagation()}>
        <div class="dialog-body">{children}</div>
        <div class="row end">
          <button type="button" class="btn" onClick={onCancel}>Отмена</button>
          <button type="button" class={`btn ${danger ? 'danger' : 'primary'}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

import Spinner from './Spinner';

// "Are you sure?" box shown before anything is deleted.
export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Delete',
  loading = false,
  onConfirm,
  onCancel,
}) {
  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && !loading && onCancel()}
    >
      <div className="modal modal--small" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2 className="modal__title">{title}</h2>
        </div>

        <div className="modal__body">
          <p>{message}</p>

          <div className="modal__actions">
            <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={loading}>
              Cancel
            </button>
            <button type="button" className="btn btn--danger" onClick={onConfirm} disabled={loading}>
              {loading ? <Spinner /> : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
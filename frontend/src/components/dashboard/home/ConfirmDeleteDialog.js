export default function ConfirmDeleteDialog({ pendingDelete, deleting, onCancel, onConfirm }) {
  const itemType = pendingDelete.type === 'campaign' ? 'campaign' : 'character';
  const warningText = itemType === 'campaign'
    ? 'Players and campaign prep linked to this campaign may no longer be accessible.'
    : 'This character sheet and its character journal entries will be removed.';

  return (
    <div className="dashboard-modal-overlay" role="presentation">
      <section
        className="dashboard-modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-title"
      >
        <div className="dashboard-modal-header">
          <div>
            <p className="dashboard-eyebrow">Delete {itemType}</p>
            <h2 id="delete-title">Delete {pendingDelete.name}?</h2>
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="dashboard-close-button"
            aria-label="Close delete confirmation"
          >
            <span>×</span>
          </button>
        </div>

        <p className="dashboard-muted">This cannot be undone. {warningText}</p>

        <div className="dashboard-modal-actions">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="unified-dashboard-button"
          >
            <span>Cancel</span>
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="dashboard-danger-button"
          >
            <span>{deleting ? 'Deleting...' : `Delete ${itemType}`}</span>
          </button>
        </div>
      </section>
    </div>
  );
}

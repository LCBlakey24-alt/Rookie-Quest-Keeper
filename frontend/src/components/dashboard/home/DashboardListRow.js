export default function DashboardListRow({
  title,
  meta,
  onOpen,
  onSecondary,
  secondaryLabel,
  onDelete,
  deleteLabel,
}) {
  return (
    <div className="dashboard-list-row">
      <button type="button" onClick={onOpen} className="dashboard-list-open">
        <span>
          <strong>{title}</strong>
          <em>{meta}</em>
        </span>
        <span className="dashboard-arrow" aria-hidden="true">
          ›
        </span>
      </button>

      {secondaryLabel && (
        <button type="button" onClick={onSecondary} className="dashboard-small-button">
          <span>{secondaryLabel}</span>
        </button>
      )}

      <button
        type="button"
        onClick={onDelete}
        className="dashboard-danger-small"
        aria-label={deleteLabel}
      >
        <span>Delete</span>
      </button>
    </div>
  );
}

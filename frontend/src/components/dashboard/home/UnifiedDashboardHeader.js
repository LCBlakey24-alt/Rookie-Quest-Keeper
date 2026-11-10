export default function UnifiedDashboardHeader({
  username,
  refreshing,
  onRefresh,
  onLogout,
}) {
  return (
    <header className="unified-dashboard-header unified-dashboard-header--simple">
      <div className="dashboard-brand-row">
        <p className="dashboard-eyebrow">HOME / DASHBOARD</p>
        <h1>Your Adventure Hub</h1>
        <p className="dashboard-muted">Welcome back, <strong>{username || 'User'}</strong>. Your worlds, characters and creations in one place.</p>
      </div>

      <div className="dashboard-header-buttons">
        <DashboardButton onClick={onRefresh} disabled={refreshing}>
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </DashboardButton>
        {onLogout && <DashboardButton onClick={onLogout}>Logout</DashboardButton>}
      </div>
    </header>
  );
}

function DashboardButton({ children, onClick, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="unified-dashboard-button"
    >
      {children}
    </button>
  );
}

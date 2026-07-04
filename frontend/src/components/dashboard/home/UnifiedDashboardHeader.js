export default function UnifiedDashboardHeader({
  username,
  refreshing,
  onRefresh,
  onLogout,
}) {
  return (
    <header className="unified-dashboard-board unified-dashboard-header">
      <div className="dashboard-brand-row">
        <div>
          <p className="dashboard-eyebrow">Rookie Quest Keeper</p>
          <h1>Dashboard</h1>
          <p className="dashboard-muted">
            Welcome back, <strong>{username || 'User'}</strong>. Check site updates, account information, and app status here.
          </p>
        </div>
      </div>

      <div className="dashboard-header-buttons">
        <DashboardButton onClick={onRefresh} disabled={refreshing}>
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </DashboardButton>
        <DashboardButton onClick={onLogout}>Logout</DashboardButton>
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
      <span>{children}</span>
    </button>
  );
}

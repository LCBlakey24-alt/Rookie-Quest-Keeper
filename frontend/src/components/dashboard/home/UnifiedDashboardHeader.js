export default function UnifiedDashboardHeader({
  username,
  refreshing,
  onRefresh,
  onLogout,
}) {
  return (
    <header className="unified-dashboard-header unified-dashboard-header--simple">
      <div className="dashboard-brand-row">
        <p className="dashboard-eyebrow">Rookie Quest Keeper</p>
        <h1>Dashboard</h1>
        <p className="dashboard-muted">
          Welcome back, <strong>{username || 'User'}</strong>. Pick up where you left off.
        </p>
      </div>

      <div className="dashboard-header-buttons">
        <DashboardButton onClick={onRefresh} disabled={refreshing}>
          {refreshing ? 'Refreshing…' : 'Refresh'}
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
      {children}
    </button>
  );
}

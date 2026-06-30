import { BrandMiniLogo } from '@/components/ui/BrandLogo';

export default function UnifiedDashboardHeader({
  username,
  isAdmin,
  refreshing,
  onAdmin,
  onRefresh,
  onAccount,
  onLogout,
}) {
  return (
    <header className="unified-dashboard-board unified-dashboard-header">
      <div className="dashboard-brand-row">
        <div className="dashboard-logo-tile">
          <BrandMiniLogo size={44} />
        </div>

        <div>
          <p className="dashboard-eyebrow">Rookie Quest Keeper</p>
          <h1>Command Dashboard</h1>
          <p className="dashboard-muted">
            Welcome back, <strong>{username || 'Adventurer'}</strong>.
          </p>
        </div>
      </div>

      <div className="dashboard-header-buttons">
        {isAdmin && <DashboardButton onClick={onAdmin}>Admin</DashboardButton>}
        <DashboardButton onClick={onRefresh} disabled={refreshing}>
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </DashboardButton>
        <DashboardButton onClick={onAccount}>Account</DashboardButton>
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

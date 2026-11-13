import HexLoader from '@/components/guild-motif/HexLoader';

export default function PlayerDashboardLoading() {
  return (
    <main className="loading-screen player-dashboard-loading" role="status" aria-live="polite" aria-busy="true">
      <section className="loading-card" aria-label="Player dashboard is loading">
        <div className="loading-brand-mark" aria-hidden="true">PC</div>
        <HexLoader />
        <p className="loading-kicker">Player dashboard</p>
        <p className="loading-title">Opening player dashboard…</p>
        <p className="loading-tip">Loading your characters, campaigns, notes, and handouts.</p>
      </section>
    </main>
  );
}

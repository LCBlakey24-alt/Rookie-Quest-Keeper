import React from 'react';

export default function DashboardLoading({ slowLoad }) {
  return (
    <main className="loading-screen dashboard-loading" role="status" aria-live="polite" aria-busy="true">
      <section className="loading-card" aria-label="Command dashboard is loading">
        <div className="loading-brand-mark" aria-hidden="true">GM</div>
        <div className="loading-spinner" aria-hidden="true" />
        <p className="loading-kicker">Command dashboard</p>
        <h1 className="loading-title">Loading your command dashboard…</h1>
        <p className="loading-tip">
          {slowLoad
            ? 'This is taking longer than expected. We are still checking the server before giving you a retry option.'
            : 'Checking your characters, campaigns, and account settings.'}
        </p>
      </section>
    </main>
  );
}

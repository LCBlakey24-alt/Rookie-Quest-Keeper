import React from 'react';

const loadingSteps = ['Local campaign', 'GM tools', 'Tabletop'];

/** The loading state intentionally makes no request to a cloud API. */
export default function RouteLoadingScreen({ message = 'Opening Rookie Quest Keeper…' }) {
  return (
    <main className="loading-screen route-loading-screen rqk-desktop-loading" role="status" aria-live="polite" aria-busy="true">
      <section className="loading-card rqk-loading-guild-card" aria-label="Rookie Quest Keeper is loading">
        <img className="rqk-loading-logo" src="/brand/keeper-primary-logo.png" alt="Rookie Quest Keeper" />
        <p className="loading-kicker">The Guild Ledger</p>
        <h1 className="loading-title">{message}</h1>
        <p className="loading-tip">Your adventure stays on your laptop. Preparing the table, campaign and GM tools.</p>
        <div className="rqk-loading-activity" aria-hidden="true"><span /><span /><span /></div>
        <ul className="route-loading-steps" aria-label="Loading checklist">
          {loadingSteps.map(step => <li key={step}>{step}</li>)}
        </ul>
      </section>
    </main>
  );
}

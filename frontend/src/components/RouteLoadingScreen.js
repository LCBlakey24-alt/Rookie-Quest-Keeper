import React from 'react';

export default function RouteLoadingScreen() {
  return (
    <main className="loading-screen route-loading-screen" role="status" aria-live="polite" aria-busy="true">
      <section className="loading-card" aria-label="Rookie Quest Keeper is loading">
        <div className="loading-brand-mark" aria-hidden="true">RQK</div>
        <div className="loading-spinner" aria-hidden="true" />
        <p className="loading-kicker">Preparing your table</p>
        <p className="loading-title">Opening Rookie Quest Keeper…</p>
        <p className="loading-tip">Gathering character sheets, campaign notes, and your next quest hook.</p>
      </section>
    </main>
  );
}

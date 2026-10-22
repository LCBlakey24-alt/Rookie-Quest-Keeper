import React, { useEffect, useState } from 'react';
import './RouteLoadingScreen.css';

/**
 * The route fallback should explain what is happening without implying that
 * specific APIs have finished loading. A stalled chunk gives users a safe way
 * to retry instead of trapping them behind an indefinite spinner.
 */
export default function RouteLoadingScreen() {
  const [takingLonger, setTakingLonger] = useState(false);

  useEffect(() => {
    const handle = window.setTimeout(() => setTakingLonger(true), 10000);
    return () => window.clearTimeout(handle);
  }, []);

  return (
    <main className="loading-screen route-loading-screen" role="status" aria-live="polite" aria-busy="true">
      <section className="rqk-route-card" aria-label="Rookie Quest Keeper is loading">
        <span className="rqk-route-sigil" aria-hidden="true">RQK</span>
        <p className="rqk-route-eyebrow">Guild Ledger</p>
        <h1 className="rqk-route-heading">Opening Rookie Quest Keeper</h1>
        <p className="rqk-route-description">Preparing your workspace…</p>
        <div className="rqk-route-activity" aria-hidden="true"><span /></div>
        {takingLonger && (
          <div className="rqk-route-recovery">
            <p>This is taking longer than expected. Your saved campaigns have not been reset.</p>
            <button type="button" onClick={() => window.location.reload()}>Reload Keeper</button>
          </div>
        )}
      </section>
    </main>
  );
}

import React, { useEffect, useState } from 'react';
import { BrandMiniLogo } from '@/components/ui/BrandLogo';
import './RouteLoadingScreen.css';

/**
 * The shared route-level loading fallback. Loading movement is indeterminate:
 * no invented percentage, staged API claims, or delay before showing the route.
 */
export default function RouteLoadingScreen() {
  const [takingLonger, setTakingLonger] = useState(false);

  useEffect(() => {
    const handle = window.setTimeout(() => setTakingLonger(true), 10000);
    return () => window.clearTimeout(handle);
  }, []);

  return (
    <main className="loading-screen route-loading-screen" role="status" aria-live="polite" aria-busy="true">
      <section className="rqk-route-stage" aria-label="Rookie Quest Keeper is loading">
        <BrandMiniLogo className="rqk-route-logo" alt="" size={112} />

        <p className="rqk-route-eyebrow">ROOKIE QUEST</p>
        <h1 className="rqk-route-heading">KEEPER</h1>
        <div className="rqk-route-brand-rule" aria-hidden="true" />

        <p className="rqk-route-status-copy">Preparing your workspace…</p>
        <div className="rqk-route-activity" aria-hidden="true"><span /></div>
        <p className="rqk-route-description">Every great story begins at the table.</p>

        {takingLonger && (
          <div className="rqk-route-recovery" role="group" aria-label="Loading recovery">
            <p>This is taking longer than expected. Your saved campaigns have not been reset.</p>
            <button type="button" onClick={() => window.location.reload()}>Reload Keeper</button>
          </div>
        )}
      </section>
    </main>
  );
}

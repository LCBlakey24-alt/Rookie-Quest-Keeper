import React, { useEffect, useState } from 'react';
import { BrandMiniLogo } from '@/components/ui/BrandLogo';
import './RouteLoadingScreen.css';

/**
 * A calm Guild Ledger opening moment. The movement is decorative, never a
 * fabricated percentage or an assertion that campaign APIs have completed.
 * A stalled route still offers the original safe recovery action.
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
        <div className="rqk-route-emblem" aria-hidden="true">
          <span className="rqk-route-orbit rqk-route-orbit--outer" />
          <span className="rqk-route-orbit rqk-route-orbit--inner" />
          <BrandMiniLogo className="rqk-route-logo" alt="" size={118} />
        </div>

        <p className="rqk-route-eyebrow">THE GUILD LEDGER</p>
        <h1 className="rqk-route-heading">Opening Rookie Quest Keeper</h1>
        <p className="rqk-route-description">Every great story begins at the table.</p>

        <div className="rqk-route-activity" aria-hidden="true"><span /></div>
        <p className="rqk-route-status-copy">Preparing your workspace…</p>

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

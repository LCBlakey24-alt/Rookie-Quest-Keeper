import React, { useEffect, useState } from 'react';
import HexLoader from '@/components/guild-motif/HexLoader';
import './RouteLoadingScreen.css';

/**
 * The shared route-level loading fallback: the turning hexagon with the wheel
 * inside, the Rookie mark at its centre. Loading movement is indeterminate:
 * no invented percentage, staged API claims, or delay before showing the route.
 */
export default function RouteLoadingScreen({
  label = 'Rookie Quest Keeper is loading',
  status = 'Preparing your workspace…',
  description = 'Every great story begins at the table.',
}) {
  const [takingLonger, setTakingLonger] = useState(false);

  useEffect(() => {
    const handle = window.setTimeout(() => setTakingLonger(true), 10000);
    return () => window.clearTimeout(handle);
  }, []);

  return (
    <main className="loading-screen route-loading-screen" role="status" aria-live="polite" aria-busy="true">
      <section className="rqk-route-stage" aria-label={label}>
        <HexLoader size="lg" withLogo className="rqk-route-loader" />

        <p className="rqk-route-eyebrow">ROOKIE QUEST</p>
        <h1 className="rqk-route-heading">KEEPER</h1>

        <p className="rqk-route-status-copy">{status}</p>
        <p className="rqk-route-description">{description}</p>

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

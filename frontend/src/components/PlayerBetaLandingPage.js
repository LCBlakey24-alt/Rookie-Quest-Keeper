import React from 'react';
import { AlertTriangle, ArrowRight, Bug, MessageSquare, ShieldCheck, Sparkles } from 'lucide-react';
import { BrandMainLogo } from '@/components/ui/BrandLogo';
import '@/styles/playerBetaLanding.css';

export default function PlayerBetaLandingPage({ onEnter, entering = false, error = '' }) {
  return (
    <main className="player-beta-landing">
      <section className="player-beta-card" aria-labelledby="player-beta-title">
        <div className="player-beta-logo" aria-hidden="true">
          <BrandMainLogo height={92} />
        </div>

        <div className="player-beta-badge"><Sparkles size={14} /> Player Beta</div>
        <h1 id="player-beta-title">Help us build Rookie Quest Keeper at the table.</h1>
        <p className="player-beta-lead">
          This is an active beta. Things may be unfinished, awkward, or occasionally break — and that is exactly what we want testers to find.
        </p>

        <div className="player-beta-points">
          <div><ShieldCheck size={18} /><span>No sign-in or account setup needed.</span></div>
          <div><Bug size={18} /><span>Try character creation, sheets, campaign tools, notes, handouts, and live play.</span></div>
          <div><MessageSquare size={18} /><span>Report anything confusing, broken, missing, or worth improving.</span></div>
        </div>

        <div className="player-beta-note">
          <AlertTriangle size={18} />
          <div>
            <strong>Beta testers shape the next update.</strong>
            <p>Players and GMs are both welcome to test. Use the suggestion box inside Player Home to send ideas and problems straight into the RQK development backlog.</p>
          </div>
        </div>

        {error && <div className="player-beta-error" role="alert">{error}</div>}

        <button type="button" className="player-beta-enter" onClick={onEnter} disabled={entering}>
          <span>{entering ? 'Preparing your beta workspace…' : 'Enter Player Beta'}</span>
          {!entering && <ArrowRight size={19} aria-hidden="true" />}
        </button>

        <p className="player-beta-smallprint">
          Your beta account is created automatically for this browser so your characters, campaign membership, and feedback can persist without a login screen.
        </p>
      </section>
    </main>
  );
}

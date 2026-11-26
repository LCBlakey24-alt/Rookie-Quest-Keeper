import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, MessageSquareText } from 'lucide-react';
import './BetaNotice.css';

/**
 * Visible product status, not a temporary toast.
 * Keep it on both the public landing and signed-in home dashboard so visitors
 * know what to expect without mistaking the beta for a finished paid service.
 *
 * A signed-in member who has read it can fold it down to one line, so Home
 * opens on their own things. The status and the feedback button stay visible
 * either way, and the line opens back up to the full notice.
 */
const COMPACT_KEY = 'rqk.betaNotice.compact';
function loadCompact() {
  try { return window.localStorage.getItem(COMPACT_KEY) === '1'; } catch { return false; }
}
function saveCompact(value) {
  try { window.localStorage.setItem(COMPACT_KEY, value ? '1' : '0'); } catch { /* applies for this visit */ }
}

export default function BetaNotice({ audience = 'public' }) {
  const signedIn = audience === 'member';
  const [compact, setCompact] = useState(() => signedIn && loadCompact());
  const fold = (value) => { saveCompact(value); setCompact(value); };

  const openFeedback = () => {
    // Reuse the app's authenticated site-feedback modal. No second feedback
    // API or misleading external review destination.
    window.dispatchEvent(new Event('rook-feedback-open'));
  };

  if (signedIn && compact) {
    return (
      <section
        className="rqk-beta-notice rqk-beta-notice--member rqk-beta-notice--compact"
        aria-label="Beta testing notice"
        data-testid="beta-notice-home"
      >
        <span className="rqk-beta-notice__marker" aria-hidden="true" />
        <button
          type="button"
          className="rqk-beta-notice__expand"
          onClick={() => fold(false)}
          aria-expanded="false"
          data-testid="beta-notice-expand"
        >
          <span className="rqk-beta-notice__eyebrow">EARLY ACCESS · PUBLIC BETA</span>
          <ChevronDown size={16} aria-hidden="true" />
          <span className="rqk-beta-notice__sr">Show the full beta notice</span>
        </button>
        <div className="rqk-beta-notice__actions">
          <button type="button" className="rqk-beta-notice__action" onClick={openFeedback} data-testid="beta-notice-feedback">
            <MessageSquareText size={17} aria-hidden="true" />
            Share feedback
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      className={`rqk-beta-notice rqk-beta-notice--${signedIn ? 'member' : 'public'}`}
      aria-label="Beta testing notice"
      data-testid={`beta-notice-${signedIn ? 'home' : 'landing'}`}
    >
      <span className="rqk-beta-notice__marker" aria-hidden="true" />
      <div className="rqk-beta-notice__content">
        <p className="rqk-beta-notice__eyebrow">EARLY ACCESS · PUBLIC BETA</p>
        <h2>Keeper is growing with its community.</h2>
        <p>
          Rookie Quest Keeper is in active development and being tested during real tabletop play.
          Features may evolve, and occasional bugs or interruptions are possible.
          Honest feedback, issue reports and reviews are greatly appreciated — they help us
          improve the experience for everyone.
        </p>
      </div>
      <div className="rqk-beta-notice__actions">
        {signedIn ? (
          <button
            type="button"
            className="rqk-beta-notice__action"
            onClick={openFeedback}
            data-testid="beta-notice-feedback"
          >
            <MessageSquareText size={17} aria-hidden="true" />
            Share feedback
          </button>
        ) : null}
        {signedIn ? (
          <button type="button" className="rqk-beta-notice__action rqk-beta-notice__action--quiet" onClick={() => fold(true)} data-testid="beta-notice-fold">
            Got it
          </button>
        ) : (
          <Link to="/auth" className="rqk-beta-notice__action" data-testid="beta-notice-feedback-login">
            <MessageSquareText size={17} aria-hidden="true" />
            Sign in to give feedback
          </Link>
        )}
      </div>
    </section>
  );
}

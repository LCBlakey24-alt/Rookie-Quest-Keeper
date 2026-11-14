import React from 'react';
import { Link } from 'react-router-dom';
import { MessageSquareText } from 'lucide-react';
import './BetaNotice.css';

/**
 * Visible product status, not a temporary toast.
 * Keep it on both the public landing and signed-in home dashboard so visitors
 * know what to expect without mistaking the beta for a finished paid service.
 */
export default function BetaNotice({ audience = 'public' }) {
  const signedIn = audience === 'member';

  const openFeedback = () => {
    // Reuse the app's authenticated site-feedback modal. No second feedback
    // API or misleading external review destination.
    window.dispatchEvent(new Event('rook-feedback-open'));
  };

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
